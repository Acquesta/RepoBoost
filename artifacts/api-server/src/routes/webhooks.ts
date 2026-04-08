import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, paymentsTable } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

const ABACATEPAY_API_KEY = process.env.ABACATEPAY_API_KEY;
const ABACATE_BASE = "https://api.abacatepay.com/v1";

router.post("/abacate", async (req: Request, res: Response) => {
  const rawBody = (req as any).rawBody as Buffer | undefined;

  let event: any;
  try {
    const rawBodyString = rawBody ? rawBody.toString() : "";
    if (rawBodyString) {
      event = JSON.parse(rawBodyString);
    } else if (req.body && Object.keys(req.body).length > 0) {
      event = req.body;
    } else {
      req.log.error("Empty webhook payload body from Abacate Pay");
      res.status(400).json({ error: "Empty webhook payload" });
      return;
    }
  } catch (err) {
    req.log.error({ err }, "Abacate Pay webhook parse failed");
    res.status(400).json({ error: "Invalid webhook payload" });
    return;
  }

  const eventType = event.event || event.type;
  if (eventType === "pix.paid") {
    const pixId = event.data?.id || event.id;

    if (!pixId) {
      res.status(400).json({ error: "Missing PIX ID" });
      return;
    }

    try {
      if (!ABACATEPAY_API_KEY) {
        throw new Error("Missing ABACATEPAY_API_KEY");
      }

      const checkRes = await fetch(`${ABACATE_BASE}/pixQrCode/check?id=${encodeURIComponent(pixId)}`, {
        headers: { Authorization: `Bearer ${ABACATEPAY_API_KEY}` },
      });

      const json = (await checkRes.json()) as any;
      
      if (!json.error && json.data?.status === "PAID") {
         const paymentRecords = await db.select().from(paymentsTable).where(eq(paymentsTable.pixId, pixId));
         const order = paymentRecords[0];

         if (order && order.status !== "PAID") {
            await db.transaction(async (tx) => {
               const updated = await tx.update(paymentsTable)
                  .set({ status: "PAID", updatedAt: new Date() })
                  .where(and(eq(paymentsTable.id, order.id), eq(paymentsTable.status, "PENDING")))
                  .returning({ id: paymentsTable.id });
               
               if (updated.length > 0) {
                  await tx.update(usersTable).set({ credits: sql`${usersTable.credits} + ${order.credits}` }).where(eq(usersTable.id, order.userId));
                  req.log.info({ pixId, userId: order.userId, credits: order.credits }, "Credits added after PIX payment (webhook)");
               }
            });
         }
      }
    } catch (err) {
      req.log.error({ err }, "Failed to verify or process Abacate Pay webhook");
      res.status(500).json({ error: "Internal error processing webhook" });
      return;
    }
  } else if (eventType === "pix.expired") {
    const pixId = event.data?.id || event.id;
    if (pixId) {
      try {
        await db.update(paymentsTable).set({ status: "EXPIRED", updatedAt: new Date() }).where(eq(paymentsTable.pixId, pixId));
      } catch (e) {}
    }
  }

  res.json({ success: true });
});


export default router;
