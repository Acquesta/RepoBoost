import { Router, type IRouter, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, generationsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import { GenerateContentBody } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import axios from "axios";

const router: IRouter = Router();

async function fetchRepoContent(accessToken: string, repoFullName: string): Promise<string> {
  const headers = { Authorization: `Bearer ${accessToken}` };

  let structure = "";
  let fileContents = "";

  try {
    const treeRes = await axios.get(
      `https://api.github.com/repos/${repoFullName}/git/trees/HEAD?recursive=1`,
      { headers }
    );
    const files: Array<{ path: string; type: string }> = treeRes.data.tree || [];
    const fileList = files.filter((f) => f.type === "blob").map((f) => f.path);
    structure = fileList.slice(0, 50).join("\n");

    const importantFiles = [
      "package.json", "requirements.txt", "setup.py", "Cargo.toml",
      "go.mod", "pom.xml", "build.gradle", "README.md", "readme.md",
      "main.py", "index.js", "index.ts", "main.go", "main.rs",
      "app.py", "server.py", "server.ts", "app.ts",
      "docker-compose.yml", "Dockerfile", ".env.example",
    ];

    const filesToFetch = fileList.filter((f) =>
      importantFiles.some((imp) => f === imp || f.endsWith(`/${imp}`))
    ).slice(0, 6);

    for (const filePath of filesToFetch) {
      try {
        const fileRes = await axios.get(
          `https://api.github.com/repos/${repoFullName}/contents/${filePath}`,
          { headers }
        );
        const content = fileRes.data.encoding === "base64"
          ? Buffer.from(fileRes.data.content, "base64").toString("utf-8").slice(0, 2000)
          : fileRes.data.content?.slice(0, 2000) || "";
        fileContents += `\n### ${filePath}\n\`\`\`\n${content}\n\`\`\`\n`;
      } catch {
        // ignore individual file errors
      }
    }
  } catch {
    // ignore tree fetch errors
  }

  return `File structure:\n${structure}\n\nKey file contents:${fileContents}`;
}

router.post("/", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const parsed = GenerateContentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Bad Request", message: "Invalid request body" });
    return;
  }

  const { repoFullName, repoName, repoDescription, repoUrl, repoLanguage } = parsed.data;

  const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  if (users.length === 0) {
    res.status(401).json({ error: "Unauthorized", message: "User not found" });
    return;
  }

  const user = users[0];

  if (user.credits <= 0) {
    res.status(402).json({ error: "Insufficient Credits", message: "Você não tem créditos suficientes. Compre um pacote para continuar." });
    return;
  }

  let repoContext = "";
  try {
    repoContext = await fetchRepoContent(user.accessToken, repoFullName);
  } catch (err) {
    req.log.warn({ err }, "Could not fetch repo content, proceeding with metadata only");
  }

  const prompt = `Você é um especialista em marketing técnico para desenvolvedores. Analise o repositório GitHub abaixo e gere:

1. Um README.md profissional e completo em Português (BR)
2. Uma lista de 4 posts para LinkedIn, variando o tom e a audiência

Repositório: ${repoFullName}
Nome: ${repoName}
Descrição: ${repoDescription || "Não informada"}
Linguagem principal: ${repoLanguage || "Não identificada"}
URL: ${repoUrl || `https://github.com/${repoFullName}`}

${repoContext}

Retorne APENAS um JSON válido com o seguinte formato (sem markdown, sem texto extra):
{
  "readme": "# Conteúdo completo do README.md aqui...",
  "linkedinPosts": [
    {
      "title": "Título do post",
      "content": "Conteúdo completo do post com até 1300 caracteres. Use emojis e formatação adequada para LinkedIn.",
      "tone": "Técnico",
      "targetAudience": "Desenvolvedores"
    },
    {
      "title": "Título do segundo post",
      "content": "Conteúdo do segundo post...",
      "tone": "Profissional",
      "targetAudience": "Recrutadores e CTOs"
    },
    {
      "title": "Título do terceiro post",
      "content": "Conteúdo do terceiro post...",
      "tone": "Motivacional",
      "targetAudience": "Comunidade tech"
    },
    {
      "title": "Título do quarto post",
      "content": "Conteúdo do quarto post...",
      "tone": "Educacional",
      "targetAudience": "Iniciantes em programação"
    }
  ]
}

O README deve incluir: badges, descrição clara, tecnologias usadas, como instalar/executar, features principais, estrutura de arquivos (se relevante), e contribuição.
Cada post do LinkedIn deve ser engajante, autêntico e mostrar o valor do projeto.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 8192,
      messages: [{ role: "user", content: prompt }],
    });

    const rawContent = completion.choices[0]?.message?.content || "";

    let parsed_content: { readme: string; linkedinPosts: any[] };
    try {
      const jsonMatch = rawContent.match(/\{[\s\S]*\}/);
      parsed_content = JSON.parse(jsonMatch ? jsonMatch[0] : rawContent);
    } catch {
      req.log.error({ rawContent }, "Failed to parse AI response as JSON");
      res.status(500).json({ error: "AI Error", message: "Failed to parse generated content" });
      return;
    }

    await db.update(usersTable).set({ credits: user.credits - 1, updatedAt: new Date() }).where(eq(usersTable.id, userId));

    const inserted = await db.insert(generationsTable).values({
      userId,
      repoName,
      repoFullName,
      repoDescription,
      repoLanguage,
      readme: parsed_content.readme,
      linkedinPosts: parsed_content.linkedinPosts,
    }).returning({ id: generationsTable.id });

    res.json({
      generationId: inserted[0].id,
      readme: parsed_content.readme,
      linkedinPosts: parsed_content.linkedinPosts,
      creditsRemaining: user.credits - 1,
    });
  } catch (err) {
    req.log.error({ err }, "AI generation error");
    res.status(500).json({ error: "AI Error", message: "Failed to generate content" });
  }
});

router.get("/list", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const generations = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.userId, userId))
    .orderBy(desc(generationsTable.createdAt));

  res.json({
    generations: generations.map((g) => ({
      id: g.id,
      repoName: g.repoName,
      repoFullName: g.repoFullName,
      readme: g.readme,
      linkedinPosts: g.linkedinPosts,
      createdAt: g.createdAt,
    })),
  });
});

router.get("/:id", async (req: Request, res: Response) => {
  const userId = (req.session as any)?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized", message: "Not logged in" });
    return;
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Bad Request", message: "Invalid ID" });
    return;
  }

  const generations = await db
    .select()
    .from(generationsTable)
    .where(eq(generationsTable.id, id));

  if (generations.length === 0 || generations[0].userId !== userId) {
    res.status(404).json({ error: "Not Found", message: "Generation not found" });
    return;
  }

  const g = generations[0];
  res.json({
    id: g.id,
    repoName: g.repoName,
    repoFullName: g.repoFullName,
    readme: g.readme,
    linkedinPosts: g.linkedinPosts,
    createdAt: g.createdAt,
  });
});

export default router;
