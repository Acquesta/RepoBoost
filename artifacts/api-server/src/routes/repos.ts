import { Router, type IRouter, type Request, type Response } from "express";
import axios from "axios";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

router.get("/", async (req: Request, res: Response) => {
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

  try {
    const reposRes = await axios.get(
      "https://api.github.com/user/repos?type=public&per_page=100&sort=updated",
      { headers: { Authorization: `Bearer ${user.accessToken}` } }
    );

    const repos = reposRes.data.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description,
      language: r.language,
      stars: r.stargazers_count,
      updatedAt: r.updated_at,
      url: r.html_url,
      private: r.private,
    }));

    res.json({ repos });
  } catch (err) {
    req.log.error({ err }, "Error fetching GitHub repos");
    res.status(500).json({ error: "GitHub API Error", message: "Failed to fetch repositories" });
  }
});

export default router;
