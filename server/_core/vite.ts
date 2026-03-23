import express, { type Express } from "express";
import fs from "fs";
import { type Server } from "http";
import path from "path";

export async function setupVite(app: Express, server: Server) {
  // Dynamic imports para evitar bundling de vite em produção
  const { createServer: createViteServer } = await import("vite");
  const { nanoid } = await import("nanoid");
  const viteConfig = (await import("../../vite.config")).default;

  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: true as const,
  };
  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "../..",
        "client",
        "index.html"
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  // Tentar múltiplos caminhos para encontrar os ficheiros estáticos
  const possiblePaths = [
    // Caminho padrão relativo a import.meta.dirname
    path.resolve(import.meta.dirname, "../..", "dist", "public"),
    // Caminho alternativo
    path.resolve(import.meta.dirname, "public"),
    // Caminho a partir do diretório de trabalho atual (para Windows)
    path.resolve(process.cwd(), "dist", "public"),
    // Caminho relativo simples
    path.join(process.cwd(), "dist", "public"),
  ];

  let distPath = "";
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      distPath = p;
      console.log("[OK] Ficheiros estáticos a ser servidos de:", distPath);
      break;
    }
  }

  if (!distPath) {
    console.error("[ERROR] Não foi possível encontrar o diretório de ficheiros estáticos.");
    console.error("[DEBUG] Caminhos tentados:", possiblePaths);
    // Usar o primeiro caminho como fallback mesmo que não exista
    distPath = possiblePaths[0];
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  app.use("*", (_req, res) => {
    try {
      const indexPath = path.resolve(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error("[ERROR] index.html não encontrado em:", indexPath);
        res.status(404).send("index.html não encontrado");
      }
    } catch (err) {
      console.error("[ERROR] Erro ao servir index.html:", err);
      res.status(500).send("Erro ao carregar a página");
    }
  });
}
