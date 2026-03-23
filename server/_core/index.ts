import path from "path";
import fs from "fs";
import dotenv from "dotenv";

// Carregar .env de forma robusta e absoluta
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.warn("[WARNING] Erro ao carregar .env:", result.error.message);
  } else {
    console.log("[OK] Ficheiro .env carregado com sucesso de:", envPath);
  }
} else {
  console.warn("[WARNING] Ficheiro .env não encontrado em:", envPath);
  console.warn("[INFO] Usando variáveis de ambiente do sistema ou valores padrão.");
}
import { validateStartup } from "./startup-validation";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import cors from "cors";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes, authMiddleware, ipWhitelistMiddleware } from "./auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { setupNotificationCron } from "../notificationEngine";
import { setupWhatsAppWorker } from "../whatsappService";
import { initializeDatabase } from "../db-init";
import { handleWhatsAppWebhook } from "../webhooks/whatsapp";
import { registerMCPRoutes } from "../mcp/mcpServer";
import { registerAllMCPTools } from "../mcp/registerTools";
import { registerExportRoutes } from "../services/exportRoutes";
import { registerTTSRoutes } from "../routers/tts";
import { createClient } from "redis";
import { RedisStore } from "connect-redis";

// FIX V35: Logging estruturado para producao
function logStartup(msg: string) {
  const ts = new Date().toISOString();
  console.log(`[${ts}] ${msg}`);
}

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  validateStartup();
  const app = express();
  const server = createServer(app);

  // FIX: isProd definido no topo para uso em toda a função
  const isProd = process.env.NODE_ENV === "production";

  app.set("trust proxy", 1);
  
  // Headers de Segurança
  // FIX: CSP ativado em produção, desativado apenas em desenvolvimento
  app.use(helmet({
    contentSecurityPolicy: isProd ? {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "blob:"],
        connectSrc: ["'self'", process.env.ALLOWED_ORIGIN || ""].filter(Boolean),
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: [],
      },
    } : false,
    crossOriginEmbedderPolicy: false,
  }));

  // FIX: CORS restrito ao domínio do frontend em produção
  // Em produção, definir ALLOWED_ORIGIN no .env (ex: https://app.dentcare.pt)
  const allowedOrigin = process.env.ALLOWED_ORIGIN || "http://localhost:5173";
  app.use(cors({
    origin: isProd ? allowedOrigin : true,
    credentials: true,
  }));

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Sessão de Produção
  // Nota: JWT_SECRET é validado e gerado automaticamente em startup-validation.ts
  // Se chegou aqui, significa que a validação passou com sucesso (com ou sem fallback)
  if (!ENV.cookieSecret) {
    console.warn("[WARNING] cookieSecret não definido. Usando valor padrão.");
  }

  // Configurar session store: Redis (se disponível) ou MemoryStore (fallback)
  // IMPORTANTE: Redis é obrigatório em produção com cluster mode (PM2 instances: 'max')
  // para garantir que as sessões são partilhadas entre todos os workers.
  let sessionStore: session.Store | undefined = undefined;
  if (process.env.REDIS_URL) {
    try {
      const redisSessionClient = createClient({ url: process.env.REDIS_URL });
      let sessionRedisErrorLogged = false;
      redisSessionClient.on('error', (err) => {
        if (!sessionRedisErrorLogged) {
          console.error('[Session/Redis] Erro:', err);
          sessionRedisErrorLogged = true;
        }
      });
      await redisSessionClient.connect();
      sessionStore = new RedisStore({ client: redisSessionClient as any, prefix: 'dentcare:sess:' });
      console.log('[Session] Redis session store activo — compatível com cluster mode.');
    } catch (err) {
      console.warn('[Session] Redis indisponível. A usar MemoryStore (não recomendado em produção com cluster).');
    }
  } else {
    console.warn('[Session] REDIS_URL não configurado. A usar MemoryStore. Configure REDIS_URL para produção com cluster.');
  }

  app.use(session({
    store: sessionStore,
    secret: ENV.cookieSecret || "dentcare-session-secret",
    resave: false, // Melhor performance e evita race conditions
    saveUninitialized: false, // Conformidade RGPD: não criar sessão sem necessidade
    name: 'dentcare.sid',
    cookie: {
      secure: 'auto', // Funciona em HTTP local e HTTPS via proxy
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 dias
    }
  }));

  // FIX: Webhook do WhatsApp registado ANTES do authMiddleware (Twilio não envia sessão)
  app.post("/api/webhooks/whatsapp", express.urlencoded({ extended: false }), async (req, res) => {
    const authToken = process.env.TWILIO_AUTH_TOKEN || "";
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    await handleWhatsAppWebhook(req, res, db, authToken);
  });

  // Whitelist de IP (antes de tudo, excepto webhooks)
  app.use(ipWhitelistMiddleware);

  // Middleware que popula req.user a partir da sessao (com timeout dinamico)
  app.use(authMiddleware);

  // Rotas de autenticação
  registerAuthRoutes(app);

  // Rotas de exportacao CSV/XLSX
  registerExportRoutes(app);
  // V35.7: Rotas de TTS (Text-to-Speech) com OpenAI
  registerTTSRoutes(app);

  // V33: Registar tools MCP e rotas do servidor MCP
  registerAllMCPTools();
  registerMCPRoutes(app);

  // V35: Servir ficheiros de uploads (comprovativos, etc.)
  app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

  // API tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Health check endpoint (para Railway, Render, Fly.io, etc.)
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString(), version: "35.0.0" });
  });

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Inicializar base de dados antes de iniciar o servidor
  await initializeDatabase();

  server.listen(port, () => {
    logStartup(`DentCare Elite V35 running on http://localhost:${port}/`);
    
    // Iniciar serviços de background
    setupWhatsAppWorker();
    setupNotificationCron();
    console.log("[OK] Serviços de background (WhatsApp/Notificações) iniciados");
  });
}

startServer().catch(err => {
  console.error("[CRITICAL] Falha ao iniciar o servidor:");
  console.error(err);
  process.exit(1);
});

// FIX V35: Graceful shutdown para producao (PM2 cluster, Docker, etc.)
function gracefulShutdown(signal: string) {
  console.log(`\n[${signal}] A encerrar servidor graciosamente...`);
  // Dar tempo para pedidos em curso terminarem
  setTimeout(() => {
    console.log("[OK] Servidor encerrado.");
    process.exit(0);
  }, 5000);
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Capturar erros nao tratados em producao
process.on("unhandledRejection", (reason, promise) => {
  console.error("[CRITICAL] Unhandled Rejection:", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[CRITICAL] Uncaught Exception:", error);
  process.exit(1);
});
