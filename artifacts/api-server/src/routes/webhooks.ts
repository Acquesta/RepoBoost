import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

const router: IRouter = Router();

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

router.post("/stripe", async (req: Request, res: Response) => {
  const sig = req.headers["stripe-signature"] as string;
  const rawBody = (req as any).rawBody as Buffer;

  if (!STRIPE_WEBHOOK_SECRET || !rawBody) {
    res.status(400).json({ error: "Webhook not configured" });
    return;
  }

  let event: any;

  try {
    const crypto = await import("crypto");
    const parts = sig.split(",");
    const timestamp = parts.find((p) => p.startsWith("t="))?.split("=")[1];
    const v1Sig = parts.find((p) => p.startsWith("v1="))?.split("=")[1];
    const payload = `${timestamp}.${rawBody.toString()}`;
    const expected = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET).update(payload).digest("hex");

    if (expected !== v1Sig) {
      res.status(400).json({ error: "Invalid signature" });
      return;
    }

    event = JSON.parse(rawBody.toString());
  } catch (err) {
    req.log.error({ err }, "Webhook signature verification failed");
    res.status(400).json({ error: "Invalid webhook" });
    return;
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { userId, credits } = session.metadata || {};

    if (userId && credits) {
      try {
        await db
          .update(usersTable)
          .set({ credits: sql`${usersTable.credits} + ${parseInt(credits, 10)}`, updatedAt: new Date() })
          .where(eq(usersTable.id, parseInt(userId, 10)));

        req.log.info({ userId, credits }, "Credits added after payment");
      } catch (err) {
        req.log.error({ err }, "Failed to add credits after payment");
      }
    }
  }

  res.json({ success: true });
});

export default router;
