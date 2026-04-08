import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, paymentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { CreateCheckoutSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;

const CREDIT_PACKAGES: Record<string, { name: string; credits: number; priceInCents: number }> = {
  pack_10: { name: "Starter — 10 Créditos RepoBoost", credits: 10, priceInCents: 3000 },
  pack_25: { name: "Pro — 25 Créditos RepoBoost", credits: 25, priceInCents: 6500 },
  pack_50: { name: "Agency — 50 Créditos RepoBoost", credits: 50, priceInCents: 11000 },
};

const ABACATE_BASE = "https://api.abacatepay.com/v1";

router.get("/", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const users = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, userId));
  if (users.length === 0) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  res.json({ credits: users[0].credits });
});

router.post("/checkout", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const parsed = CreateCheckoutSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid package" });
    return;
  }

  const { packageId } = parsed.data;
  const pkg = CREDIT_PACKAGES[packageId];
  if (!pkg) {
    res.status(400).json({ error: "Bad Request", message: "Unknown package" });
    return;
  }

  if (!ABACATEPAY_API_KEY) {
    res.status(500).json({ error: "Payment not configured", message: "Abacate Pay API key not set" });
    return;
  }

  try {
    const abacateRes = await fetch(`${ABACATE_BASE}/pixQrCode/create`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: pkg.priceInCents,
        expiresIn: 3600,
        description: pkg.name.slice(0, 37),
        metadata: {
          externalId: `user_${userId}_${packageId}_${Date.now()}`,
        },
      }),
    });

    const json = (await abacateRes.json()) as any;

    if (json.error || !json.data) {
      req.log.error({ json }, "Abacate Pay error");
      throw new Error(json.error || "Failed to create PIX");
    }

    const { id: pixId, brCode, brCodeBase64, expiresAt } = json.data;

    await db.insert(paymentsTable).values({
      pixId,
      userId,
      amount: pkg.priceInCents,
      credits: pkg.credits,
      status: "PENDING",
    });

    res.json({
      pixId,
      brCode,
      brCodeBase64,
      expiresAt,
      amount: pkg.priceInCents,
      credits: pkg.credits,
      packageName: pkg.name,
    });
  } catch (err) {
    req.log.error({ err }, "Abacate Pay checkout error");
    res.status(500).json({ error: "Payment Error", message: "Falha ao criar QR Code PIX" });
  }
});

router.get("/payment-status", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const { pixId } = req.query as { pixId?: string };
  if (!pixId) {
    res.status(400).json({ error: "Bad Request", message: "pixId is required" });
    return;
  }

  if (!ABACATEPAY_API_KEY) {
    res.status(500).json({ error: "Payment not configured" });
    return;
  }

  const paymentRecords = await db.select().from(paymentsTable).where(eq(paymentsTable.pixId, pixId));
  const order = paymentRecords[0];

  if (!order || order.userId !== userId) {
    res.status(404).json({ error: "Not Found", message: "Payment order not found" });
    return;
  }

  if (order.status === "PAID") {
    const users = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, userId));
    return res.json({ status: "PAID", creditsAdded: 0, newBalance: users[0]?.credits ?? 0 });
  }

  try {
    const checkRes = await fetch(`${ABACATE_BASE}/pixQrCode/check?id=${encodeURIComponent(pixId)}`, {
      headers: { Authorization: `Bearer ${ABACATEPAY_API_KEY}` },
    });

    const json = (await checkRes.json()) as any;

    if (json.error || !json.data) {
      throw new Error(json.error || "Failed to check PIX status");
    }

    const status: string = json.data.status;

    if (status === "PAID" && order.status !== "PAID") {
      const updatedOrder = await db.update(paymentsTable)
        .set({ status: "PAID", updatedAt: new Date() })
        .where(and(eq(paymentsTable.id, order.id), eq(paymentsTable.status, "PENDING")))
        .returning({ id: paymentsTable.id });

      if (updatedOrder.length > 0) {
        const updatedUsers = await db
          .update(usersTable)
          .set({ credits: sql`${usersTable.credits} + ${order.credits}` })
          .where(eq(usersTable.id, userId))
          .returning({ credits: usersTable.credits });

        return res.json({
          status: "PAID",
          creditsAdded: order.credits,
          newBalance: updatedUsers[0]?.credits ?? 0,
        });
      } else {
        const users = await db.select({ credits: usersTable.credits }).from(usersTable).where(eq(usersTable.id, userId));
        return res.json({ status: "PAID", creditsAdded: 0, newBalance: users[0]?.credits ?? 0 });
      }
    }

    if (status !== order.status) {
      await db.update(paymentsTable).set({ status, updatedAt: new Date() }).where(eq(paymentsTable.id, order.id));
    }

    res.json({ status });
  } catch (err) {
    req.log.error({ err }, "Abacate Pay status check error");
    res.status(500).json({ error: "Status Error", message: "Falha ao verificar pagamento" });
  }

  return res.status(200).end();
});

router.post("/simulate-payment", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const { pixId } = req.body;
  if (!pixId) {
    res.status(400).json({ error: "Bad Request", message: "pixId is required" });
    return;
  }

  if (!ABACATEPAY_API_KEY) {
    res.status(500).json({ error: "Payment not configured" });
    return;
  }

  try {
    const simulateRes = await fetch(`${ABACATE_BASE}/pixQrCode/simulate-payment?id=${encodeURIComponent(pixId)}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${ABACATEPAY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

    const json = (await simulateRes.json()) as any;

    if (json.error) {
      throw new Error(json.error || "Failed to simulate PIX");
    }

    res.json({ success: true });
  } catch (err) {
    req.log.error({ err }, "Abacate Pay simulation error");
    res.status(500).json({ error: "Simulation Error", message: "Falha ao simular pagamento" });
  }
});

export default router;
