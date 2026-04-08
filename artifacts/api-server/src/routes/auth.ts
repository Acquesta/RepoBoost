import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import axios from "axios";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
const APP_URL = process.env.APP_URL || "http://localhost:80";
const CALLBACK_URL = `${APP_URL}/api/auth/github/callback`;

router.get("/github", (req: Request, res: Response) => {
  if (!GITHUB_CLIENT_ID) {
    res.status(500).json({ error: "GitHub OAuth not configured" });
    return;
  }
  const state = crypto.randomBytes(16).toString("hex");
  (req.session as any).oauthState = state;
  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: CALLBACK_URL,
    scope: "read:user user:email public_repo",
    state,
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params.toString()}`);
});

router.get("/github/callback", async (req: Request, res: Response) => {
  const { code, state } = req.query as { code: string; state?: string };
  if (!code) {
    res.redirect("/?error=no_code");
    return;
  }

  const storedState = (req.session as any).oauthState;
  if (!state || state !== storedState) {
    req.log.warn({ state, storedState }, "Invalid or missing OAuth state parameter");
    res.redirect("/?error=auth_failed");
    return;
  }
  delete (req.session as any).oauthState;

  try {
    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: CALLBACK_URL,
      },
      { headers: { Accept: "application/json" } }
    );

    const { access_token } = tokenRes.data;
    if (!access_token) {
      res.redirect("/?error=no_token");
      return;
    }

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const githubUser = userRes.data;
    let emailValue = githubUser.email;

    if (!emailValue) {
      try {
        const emailsRes = await axios.get("https://api.github.com/user/emails", {
          headers: { Authorization: `Bearer ${access_token}` },
        });
        const primaryEmail = emailsRes.data.find((e: { primary: boolean; email: string }) => e.primary);
        if (primaryEmail) emailValue = primaryEmail.email;
      } catch {
        // ignore email fetch failure
      }
    }

    const existingUsers = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.githubId, String(githubUser.id)));

    let userId: number;
    if (existingUsers.length > 0) {
      await db
        .update(usersTable)
        .set({
          username: githubUser.login,
          email: emailValue,
          avatarUrl: githubUser.avatar_url,
          accessToken: access_token,
          updatedAt: new Date(),
        })
        .where(eq(usersTable.githubId, String(githubUser.id)));
      userId = existingUsers[0].id;
    } else {
      const inserted = await db
        .insert(usersTable)
        .values({
          githubId: String(githubUser.id),
          username: githubUser.login,
          email: emailValue,
          avatarUrl: githubUser.avatar_url,
          accessToken: access_token,
          credits: 1,
        })
        .returning({ id: usersTable.id });
      userId = inserted[0].id;
    }

    (req.session as any).userId = userId;
    res.redirect("/dashboard");
  } catch (err) {
    req.log.error({ err }, "GitHub OAuth callback error");
    res.redirect("/?error=auth_failed");
  }
});

router.get("/me", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (users.length === 0) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  const user = users[0];
  res.json({
    id: user.id,
    githubId: user.githubId,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
    credits: user.credits,
    createdAt: user.createdAt,
  });
});

router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => {
    res.json({ success: true, message: "Logged out" });
  });
});

export default router;
