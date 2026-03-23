/**
 * Validação de Startup — DentCare
 * Garante que variáveis críticas estão configuradas corretamente
 * UPGRADE V35: Em produção, exige configuração explícita; em dev, gera fallbacks
 */
import crypto from "crypto";

export function validateStartup(): void {
  const errors: string[] = [];
  const warnings: string[] = [];

  const isProd = process.env.NODE_ENV === "production";

  // 1. JWT_SECRET
  let jwtSecret = process.env.JWT_SECRET?.trim();
  if (!jwtSecret) {
    if (isProd) {
      errors.push("JWT_SECRET nao configurado. Obrigatorio em producao.");
    } else {
      jwtSecret = crypto.randomBytes(48).toString("hex");
      process.env.JWT_SECRET = jwtSecret;
      warnings.push("JWT_SECRET nao configurado. Gerado automaticamente (apenas dev).");
    }
  } else if (jwtSecret.length < 32) {
    if (isProd) {
      errors.push(`JWT_SECRET muito fraco (${jwtSecret.length} chars). Minimo 32 em producao.`);
    } else {
      jwtSecret = crypto.randomBytes(48).toString("hex");
      process.env.JWT_SECRET = jwtSecret;
      warnings.push(`JWT_SECRET muito fraco. Gerado novo automaticamente (apenas dev).`);
    }
  }

  // 2. ENCRYPTION_KEY
  let encryptionKey = process.env.ENCRYPTION_KEY?.trim();
  if (!encryptionKey) {
    if (isProd) {
      errors.push("ENCRYPTION_KEY nao configurado. Obrigatorio em producao.");
    } else {
      encryptionKey = crypto.randomBytes(32).toString("hex");
      process.env.ENCRYPTION_KEY = encryptionKey;
      warnings.push("ENCRYPTION_KEY nao configurado. Gerado automaticamente (apenas dev).");
    }
  } else if (encryptionKey.length < 32) {
    if (isProd) {
      errors.push(`ENCRYPTION_KEY muito fraco (${encryptionKey.length} chars). Minimo 32 em producao.`);
    } else {
      encryptionKey = crypto.randomBytes(32).toString("hex");
      process.env.ENCRYPTION_KEY = encryptionKey;
      warnings.push(`ENCRYPTION_KEY muito fraco. Gerado novo automaticamente (apenas dev).`);
    }
  }

  // 3. DATABASE_URL
  let databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    if (isProd) {
      errors.push("DATABASE_URL nao configurado. Obrigatorio em producao.");
    } else {
      databaseUrl = "mysql://root:password@localhost:3306/dentcare";
      process.env.DATABASE_URL = databaseUrl;
      warnings.push("DATABASE_URL nao configurado. Usando valor padrao (MySQL local).");
    }
  }

  // 4. NODE_ENV — com fallback para 'production'
  let nodeEnv = process.env.NODE_ENV;
  if (!nodeEnv || !["production", "development"].includes(nodeEnv)) {
    nodeEnv = "production";
    process.env.NODE_ENV = nodeEnv;
    warnings.push("NODE_ENV inválido ou não configurado. Definido para 'production'.");
  }

  // 5. SESSION_SECRET
  let sessionSecret = process.env.SESSION_SECRET?.trim();
  if (!sessionSecret) {
    if (isProd) {
      errors.push("SESSION_SECRET nao configurado. Obrigatorio em producao.");
    } else {
      sessionSecret = crypto.randomBytes(48).toString("hex");
      process.env.SESSION_SECRET = sessionSecret;
      warnings.push("SESSION_SECRET nao configurado. Gerado automaticamente (apenas dev).");
    }
  }

  // 6. ALLOWED_ORIGIN (apenas aviso em producao)
  if (isProd && !process.env.ALLOWED_ORIGIN) {
    warnings.push("ALLOWED_ORIGIN nao configurado. CORS sera restritivo em producao.");
  }

  // Exibir erros críticos (se houver)
  if (errors.length > 0) {
    console.error("\n" + "=".repeat(60));
    console.error("ERRO CRITICO: Configuracao Invalida");
    console.error("=".repeat(60));
    errors.forEach((err, i) => {
      console.error(`${i + 1}. ${err}`);
    });
    console.error("=".repeat(60) + "\n");
    process.exit(1);
  }

  // Exibir avisos de segurança (se houver)
  if (warnings.length > 0) {
    console.warn("\n[AVISOS DE SEGURANÇA]");
    warnings.forEach((warn) => {
      console.warn(`  ⚠️  ${warn}`);
    });
    console.warn("\n  💡 Dica: Configure o ficheiro .env para valores permanentes em produção.\n");
  }

  console.log("[OK] Validacao de startup concluida\n");
}
