import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { CreateCheckoutSessionBody } from "@workspace/api-zod";

const router: IRouter = Router();

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const APP_URL = process.env.APP_URL || "http://localhost:80";

const CREDIT_PACKAGES: Record<string, { name: string; credits: number; priceInCents: number }> = {
  pack_10: { name: "10 Créditos", credits: 10, priceInCents: 3000 },
  pack_25: { name: "25 Créditos", credits: 25, priceInCents: 6500 },
  pack_50: { name: "50 Créditos", credits: 50, priceInCents: 11000 },
};

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

  if (!STRIPE_SECRET_KEY) {
    res.status(500).json({ error: "Stripe not configured", message: "Payment system not set up" });
    return;
  }

  try {
    const stripeRes = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${STRIPE_SECRET_KEY}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        "line_items[0][price_data][currency]": "brl",
        "line_items[0][price_data][product_data][name]": pkg.name,
        "line_items[0][price_data][unit_amount]": String(pkg.priceInCents),
        "line_items[0][quantity]": "1",
        mode: "payment",
        success_url: `${APP_URL}/dashboard?payment=success`,
        cancel_url: `${APP_URL}/dashboard?payment=cancelled`,
        "metadata[userId]": String(userId),
        "metadata[packageId]": packageId,
        "metadata[credits]": String(pkg.credits),
      }),
    });

    const session = (await stripeRes.json()) as any;
    if (!session.url) {
      throw new Error("No checkout URL returned from Stripe");
    }

    res.json({ checkoutUrl: session.url });
  } catch (err) {
    req.log.error({ err }, "Stripe checkout error");
    res.status(500).json({ error: "Payment Error", message: "Failed to create checkout session" });
  }
});

export default router;
