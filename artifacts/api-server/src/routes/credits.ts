import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { CreateCheckoutSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:80";

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

    pixOrderMap.set(pixId, { userId, credits: pkg.credits, paid: false });

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

const pixOrderMap = new Map<string, { userId: number; credits: number; paid: boolean }>();

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

  const order = pixOrderMap.get(pixId);

  if (order?.paid) {
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

    if (status === "PAID" && order && !order.paid) {
      order.paid = true;

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
    }

    res.json({ status });
  } catch (err) {
    req.log.error({ err }, "Abacate Pay status check error");
    res.status(500).json({ error: "Status Error", message: "Falha ao verificar pagamento" });
  }
});

export default router;
