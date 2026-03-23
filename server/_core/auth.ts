/**
 * Autenticação simples — DentCare
 * Login com username + senha
 * Primeiro acesso: cria conta de administrador
 * UPGRADE V35: Timeout de sessao dinamico + Whitelist de IP via configuracoes BD
 * FIX V35: Tokens 2FA e reset password devem usar Redis em producao com cluster
 */
import type { Express, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db';
import { users, configuracoesClinica } from '../../drizzle/schema';
import { eq, count } from 'drizzle-orm';
import { createClient } from 'redis';
import { promisify } from 'util';
import { verifyTwoFactorToken } from '../twoFactor';
import crypto from 'crypto';

// Armazenamento temporario de tokens 2FA pendentes (em memoria, expira em 5 min)
// AVISO PRODUCAO: Em cluster mode, estes tokens nao sao partilhados entre workers.
// Para producao com PM2 cluster, migrar para Redis.
const pending2FATokens = new Map<string, { userId: number; expiresAt: number }>();

function createPending2FAToken(userId: number): string {
  const token = crypto.randomBytes(32).toString('hex');
  pending2FATokens.set(token, { userId, expiresAt: Date.now() + 5 * 60 * 1000 });
  // Limpar tokens expirados
  for (const [k, v] of pending2FATokens.entries()) {
    if (v.expiresAt < Date.now()) pending2FATokens.delete(k);
  }
  return token;
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────
// Fallback em memoria garante proteccao mesmo sem Redis.
// AVISO: O fallback em memória NÃO é partilhado entre instâncias em cluster.
// Em produção com múltiplas instâncias, o Redis é obrigatório para rate limiting eficaz.

const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME_MS = 15 * 60 * 1000; // 15 minutos
const LOCKOUT_TIME_SECONDS = 15 * 60;

// ── Fallback em memória (activo quando Redis não está disponível) ──────────────
interface MemoryEntry { attempts: number; lockedUntil: number | null; firstAttempt: number; }
const memoryRateLimit = new Map<string, MemoryEntry>();

function memoryCheckRateLimit(ip: string): { allowed: boolean; remainingTime?: number } {
  const now = Date.now();
  const entry = memoryRateLimit.get(ip);
  if (!entry) return { allowed: true };
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { allowed: false, remainingTime: Math.ceil((entry.lockedUntil - now) / 60000) };
  }
  // Janela de 15 min expirou — limpar
  if (now - entry.firstAttempt > LOCKOUT_TIME_MS) {
    memoryRateLimit.delete(ip);
    return { allowed: true };
  }
  return { allowed: true };
}

function memoryRecordAttempt(ip: string, success: boolean): void {
  if (success) { memoryRateLimit.delete(ip); return; }
  const now = Date.now();
  const entry = memoryRateLimit.get(ip) ?? { attempts: 0, lockedUntil: null, firstAttempt: now };
  entry.attempts++;
  if (entry.attempts >= MAX_ATTEMPTS) {
    entry.lockedUntil = now + LOCKOUT_TIME_MS;
  }
  memoryRateLimit.set(ip, entry);
}

// Limpeza periódica do mapa de memória para evitar crescimento ilimitado
setInterval(() => {
  const now = Date.now();
  for (const [ip, entry] of memoryRateLimit.entries()) {
    if (entry.lockedUntil && now > entry.lockedUntil) memoryRateLimit.delete(ip);
    else if (!entry.lockedUntil && now - entry.firstAttempt > LOCKOUT_TIME_MS) memoryRateLimit.delete(ip);
  }
}, 5 * 60 * 1000); // A cada 5 minutos

// ── Redis (preferido em produção) ────────────────────────────────────────
// FIX V35: Só inicializar Redis se REDIS_URL estiver configurado
// Isto evita spam infinito de erros ECONNREFUSED nos logs
let redisClient: ReturnType<typeof createClient> | null = null;
let redisAvailable = false;

if (process.env.REDIS_URL) {
  redisClient = createClient({
    url: process.env.REDIS_URL,
  });

  let redisErrorLogged = false;
  redisClient.on('error', (err) => {
    if (!redisErrorLogged) {
      console.error('[Redis] Error:', err);
      redisErrorLogged = true;
    }
  });

  (async () => {
    try {
      await redisClient!.connect();
      redisAvailable = true;
      console.log('[Redis] Conectado com sucesso — rate limiting via Redis activo.');
    } catch (err) {
      console.warn('[Redis] Falha na conexão. Rate limiting via memória activo (fallback).');
    }
  })();
} else {
  console.log('[Auth] REDIS_URL não configurado. Rate limiting via memória activo.');
}

async function checkRateLimit(ip: string): Promise<{ allowed: boolean; remainingTime?: number }> {
  const key = `login_attempts:${ip}`;
  // Tentar Redis primeiro
  if (redisAvailable && redisClient && redisClient.isReady) {
    try {
      const attemptsVal = await redisClient.get(key);
      const attempts = parseInt(typeof attemptsVal === 'string' ? attemptsVal : '0');
      if (attempts >= MAX_ATTEMPTS) {
        const ttl = await redisClient.ttl(key);
        return { allowed: false, remainingTime: (typeof ttl === 'number' && ttl > 0) ? Math.ceil(ttl / 60) : undefined };
      }
      return { allowed: true };
    } catch (err) {
      console.warn('[Redis] Erro ao verificar rate limit, a usar fallback em memória:', err);
    }
  }
  // Fallback em memória
  return memoryCheckRateLimit(ip);
}

async function recordAttempt(ip: string, success: boolean): Promise<void> {
  const key = `login_attempts:${ip}`;
  // Tentar Redis primeiro
  if (redisAvailable && redisClient && redisClient.isReady) {
    try {
      if (success) {
        await redisClient.del(key);
        memoryRateLimit.delete(ip); // Limpar também o fallback
        return;
      }
      const attempts = await redisClient.incr(key);
      if (attempts === 1) {
        await redisClient.setEx(key, LOCKOUT_TIME_SECONDS, '1');
      } else if (Number(attempts) >= MAX_ATTEMPTS) {
        const ttl = await redisClient.ttl(key);
        if (ttl === -1) await redisClient.expire(key, LOCKOUT_TIME_SECONDS);
      }
      return;
    } catch (err) {
      console.warn('[Redis] Erro ao registar tentativa, a usar fallback em memória:', err);
    }
  }
  // Fallback em memória
  memoryRecordAttempt(ip, success);
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Devolve true se ainda não existe nenhum utilizador na BD */
async function isFirstSetup(): Promise<boolean> {
  try {
    const db = await getDb();
    if (!db) return true;
    const result = await db.select({ total: count() }).from(users);
    return (result[0]?.total ?? 0) === 0;
  } catch {
    // Se a BD não estiver disponível, assumir que é primeiro acesso
    return true;
  }
}

/** Guarda o id do utilizador na sessão Express */
function setSession(req: Request, userId: number): void {
  (req.session as any).userId = userId;
  (req.session as any).lastActivity = Date.now();
}

// ─── Helper: obter configuração da BD (com cache de 60s) ────────────────────────────

const configCache: { data: Record<string, string>; ts: number } = { data: {}, ts: 0 };
const CONFIG_CACHE_TTL = 60_000; // 60 segundos

async function getSecurityConfig(): Promise<Record<string, string>> {
  if (Date.now() - configCache.ts < CONFIG_CACHE_TTL && Object.keys(configCache.data).length > 0) {
    return configCache.data;
  }
  try {
    const db = await getDb();
    if (!db) return configCache.data;
    const rows = await db.select().from(configuracoesClinica);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.chave] = r.valor ?? '';
    configCache.data = map;
    configCache.ts = Date.now();
    return map;
  } catch {
    return configCache.data;
  }
}
// ─── Middleware de Whitelist de IP ────────────────────────────────────────────────
export async function ipWhitelistMiddleware(
  req: Request,
  res: Response,
  next: () => void
): Promise<void> {
  try {
    const cfg = await getSecurityConfig();
    const whitelistEnabled = cfg['seguranca_ip_whitelist'] === 'true';
    if (!whitelistEnabled) { next(); return; }

    const allowedIPs = (cfg['seguranca_ips_permitidos'] || '')
      .split(',')
      .map(ip => ip.trim())
      .filter(ip => ip.length > 0);

    if (allowedIPs.length === 0) { next(); return; } // Sem IPs = sem restrição

    const clientIP = req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 'unknown';
    // Normalizar IPv6 loopback
    const normalizedIP = clientIP === '::1' ? '127.0.0.1' : clientIP.replace(/^::ffff:/, '');

    if (allowedIPs.includes(normalizedIP) || allowedIPs.includes('127.0.0.1') && normalizedIP === '127.0.0.1') {
      next();
      return;
    }

    console.warn(`[Security] IP bloqueado pela whitelist: ${normalizedIP}`);
    res.status(403).json({ error: 'Acesso negado. O seu IP não está autorizado.' });
  } catch {
    // Em caso de erro, permitir acesso (fail-open para não bloquear o sistema)
    next();
  }
}

// ─── Middleware de autenticacao por sessao (com timeout dinamico) ───────────

export async function authMiddleware(
  req: Request,
  _res: Response,
  next: () => void
): Promise<void> {
  try {
    const userId = (req.session as any)?.userId;
    if (userId) {
      // ── Verificar timeout de sessão dinâmico ─────────────────────────
      const cfg = await getSecurityConfig();
      const timeoutMinutos = parseInt(cfg['seguranca_sessao_timeout'] || '60', 10);
      if (timeoutMinutos > 0) {
        const lastActivity = (req.session as any).lastActivity || 0;
        const agora = Date.now();
        if (lastActivity > 0 && (agora - lastActivity) > timeoutMinutos * 60 * 1000) {
          // Sessão expirada por inactividade
          console.log(`[Auth] Sessão expirada por inactividade (${timeoutMinutos}min) para userId: ${userId}`);
          req.session.destroy(() => {});
          next();
          return;
        }
        // Actualizar timestamp de última actividade
        (req.session as any).lastActivity = agora;
      }

      const db = await getDb();
      if (db) {
        const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
        if (result.length > 0) {
          // Guardar o utilizador completo internamente (necessário para RBAC e 2FA)
          // O passwordHash e twoFactorSecret nunca saem do servidor via API
          (req as any).user = result[0];
        }
      }
    }
  } catch {
    // Ignorar erros de BD no middleware — o utilizador simplesmente não fica autenticado
  }
  next();
}

// ─── Rotas ───────────────────────────────────────────────────────────────────

export function registerAuthRoutes(app: Express): void {

  // Verificar se é o primeiro acesso (sem utilizadores)
  app.get('/api/auth/setup-required', async (_req, res) => {
    try {
      const first = await isFirstSetup();
      res.json({ setupRequired: first });
    } catch {
      res.json({ setupRequired: false });
    }
  });

  // Criar conta de administrador (apenas no primeiro acesso)
  app.post('/api/auth/setup', async (req, res) => {
    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!username || !password) {
        res.status(400).json({ error: 'Nome de utilizador e senha são obrigatórios' });
        return;
      }
      if (username.trim().length < 3) {
        res.status(400).json({ error: 'O nome de utilizador deve ter pelo menos 3 caracteres' });
        return;
      }
      if (password.length < 6) {
        res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
        return;
      }

      const first = await isFirstSetup();
      if (!first) {
        res.status(403).json({ error: 'Já existe uma conta de administrador' });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: 'Base de dados indisponível. Verifique se o MySQL está a correr.' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const openId = `local:${username.trim().toLowerCase()}`;

      await db.insert(users).values({
        openId,
        username: username.trim(),
        name: username.trim(),
        passwordHash,
        loginMethod: 'local',
        role: 'master',
        lastSignedIn: new Date(),
      });

      const created = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
      if (created.length === 0) {
        res.status(500).json({ error: 'Erro ao criar utilizador' });
        return;
      }

      setSession(req, Number(created[0].id));
      res.json({ success: true, user: { id: created[0].id, name: created[0].name, role: created[0].role } });
    } catch (err: any) {
      console.error('[Auth] Setup error:', err);
      res.status(500).json({ error: 'Erro interno ao criar conta. Tente novamente mais tarde.' });
    }
  });

  // Login
  app.post('/api/auth/login', async (req, res) => {
    const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
    const limit = await checkRateLimit(ip);

    if (!limit.allowed) {
      res.status(429).json({ error: `Demasiadas tentativas. Tente novamente em ${limit.remainingTime} minutos.` });
      return;
    }

    try {
      const { username, password } = req.body as { username?: string; password?: string };

      if (!username || !password) {
        res.status(400).json({ error: 'Nome de utilizador e senha são obrigatórios' });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: 'Base de dados indisponível. Verifique se o MySQL está a correr.' });
        return;
      }

      // Procurar pelo username
      const result = await db.select().from(users)
        .where(eq(users.username, username.trim()))
        .limit(1);

      const user = result[0];

      if (!user || !user.passwordHash) {
        await recordAttempt(ip, false);
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) {
        await recordAttempt(ip, false);
        res.status(401).json({ error: 'Credenciais inválidas' });
        return;
      }

      // Sucesso na password
      await recordAttempt(ip, true);

      // ── Verificar se 2FA está ativo ─────────────────────────────────────
      if (user.twoFactorEnabled && user.twoFactorSecret) {
        // Criar token temporário e pedir código TOTP ao frontend
        const tempToken = createPending2FAToken(Number(user.id));
        console.log(`[Auth] 2FA requerido para: ${username}. ID: ${user.id}`);
        res.json({ success: false, requires2FA: true, tempToken });
        return;
      }

      // Actualizar lastSignedIn
      await db.update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      setSession(req, Number(user.id));
      console.log(`[Auth] Login bem-sucedido para: ${username}. ID: ${user.id}`);

      // Forçar o save da sessão antes de responder para garantir persistência no Windows
      req.session.save((err) => {
        if (err) {
          console.error('[Auth] Session save error:', err);
          res.status(500).json({ error: 'Erro ao guardar sessão' });
          return;
        }
        console.log(`[Auth] Sessão guardada com sucesso para ID: ${user.id}`);
        res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
      });
    } catch (err: any) {
      console.error('[Auth] Login error:', err);
      res.status(500).json({ error: 'Erro interno ao autenticar. Tente novamente mais tarde.' });
    }
  });

  // Verificar código 2FA após login com password
  app.post('/api/auth/login-2fa', async (req, res) => {
    try {
      const { tempToken, totpCode } = req.body as { tempToken?: string; totpCode?: string };

      if (!tempToken || !totpCode) {
        res.status(400).json({ error: 'Token temporário e código TOTP são obrigatórios' });
        return;
      }

      const pending = pending2FATokens.get(tempToken);
      if (!pending || pending.expiresAt < Date.now()) {
        pending2FATokens.delete(tempToken);
        res.status(401).json({ error: 'Token expirado ou inválido. Faça login novamente.' });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: 'Base de dados indisponível' });
        return;
      }

      const [user] = await db.select().from(users).where(eq(users.id, pending.userId)).limit(1);
      if (!user || !user.twoFactorSecret) {
        res.status(401).json({ error: 'Utilizador não encontrado' });
        return;
      }

      const isValid = verifyTwoFactorToken(user.twoFactorSecret, totpCode);
      if (!isValid) {
        res.status(401).json({ error: 'Código 2FA inválido' });
        return;
      }

      // Código válido: remover token pendente e criar sessão
      pending2FATokens.delete(tempToken);

      await db.update(users)
        .set({ lastSignedIn: new Date() })
        .where(eq(users.id, user.id));

      setSession(req, Number(user.id));
      console.log(`[Auth] Login 2FA bem-sucedido para ID: ${user.id}`);

      req.session.save((err) => {
        if (err) {
          res.status(500).json({ error: 'Erro ao guardar sessão' });
          return;
        }
        res.json({ success: true, user: { id: user.id, name: user.name, role: user.role } });
      });
    } catch (err: any) {
      console.error('[Auth] 2FA login error:', err);
      res.status(500).json({ error: 'Erro interno ao verificar código 2FA. Tente novamente.' });
    }
  });

  // ─── Recuperação de Password ───────────────────────────────────────────────
  // SEGURANÇA: Responde sempre com sucesso para não revelar se o email existe.
  // O token de reset é guardado em memória (TTL 30 min). Em produção com cluster,
  // migrar para Redis para partilha entre instâncias.
  const resetTokens = new Map<string, { userId: number; expiresAt: number }>();

  app.post('/api/auth/recuperar-password', async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email || !email.includes('@')) {
        // Responder sempre com sucesso (segurança anti-enumeração)
        res.json({ success: true });
        return;
      }

      const db = await getDb();
      if (db) {
        // Procurar utilizador pelo email
        const result = await db.select().from(users)
          .where(eq(users.email, email.trim().toLowerCase()))
          .limit(1);

        if (result.length > 0) {
          const user = result[0];
          // Gerar token seguro de reset
          const resetToken = crypto.randomBytes(32).toString('hex');
          resetTokens.set(resetToken, {
            userId: Number(user.id),
            expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutos
          });

          // Limpar tokens expirados
          for (const [k, v] of resetTokens.entries()) {
            if (v.expiresAt < Date.now()) resetTokens.delete(k);
          }

          // Registar no log de auditoria
          console.log(`[Auth] Pedido de reset de password para: ${email} (ID: ${user.id}). Token gerado.`);

          // NOTA: Para envio real de email, integrar com nodemailer + SMTP_HOST/SMTP_USER/.env
          // Exemplo de link: `${process.env.ALLOWED_ORIGIN}/reset-password?token=${resetToken}`
          // Por agora, o token é registado no log para uso em desenvolvimento.
          if (process.env.NODE_ENV === 'development') {
            console.log(`[Auth][DEV] Link de reset: /reset-password?token=${resetToken}`);
          }
        }
      }

      // Sempre responder com sucesso
      res.json({ success: true });
    } catch (err: any) {
      console.error('[Auth] Recuperar password error:', err);
      // Mesmo em erro, responder com sucesso (segurança)
      res.json({ success: true });
    }
  });

  // Validar token de reset e redefinir password
  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, novaSenha } = req.body as { token?: string; novaSenha?: string };

      if (!token || !novaSenha) {
        res.status(400).json({ error: 'Token e nova senha são obrigatórios' });
        return;
      }
      if (novaSenha.length < 6) {
        res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' });
        return;
      }

      const pending = resetTokens.get(token);
      if (!pending || pending.expiresAt < Date.now()) {
        resetTokens.delete(token);
        res.status(401).json({ error: 'Token inválido ou expirado. Solicite um novo link de recuperação.' });
        return;
      }

      const db = await getDb();
      if (!db) {
        res.status(500).json({ error: 'Base de dados indisponível' });
        return;
      }

      const passwordHash = await bcrypt.hash(novaSenha, 12);
      await db.update(users)
        .set({ passwordHash, lastSignedIn: new Date() })
        .where(eq(users.id, pending.userId));

      // Invalidar token após uso
      resetTokens.delete(token);

      console.log(`[Auth] Password redefinida com sucesso para ID: ${pending.userId}`);
      res.json({ success: true, message: 'Password redefinida com sucesso. Pode agora fazer login.' });
    } catch (err: any) {
      console.error('[Auth] Reset password error:', err);
      res.status(500).json({ error: 'Erro interno ao redefinir password. Tente novamente mais tarde.' });
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy(() => {});
    res.json({ success: true });
  });

  // Utilizador actual (usado pelo tRPC auth.me via sessão)
  app.get('/api/auth/me', async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;
      if (!userId) {
        res.status(401).json(null);
        return;
      }
      const db = await getDb();
      if (!db) {
        res.status(500).json(null);
        return;
      }
      const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (result.length === 0) {
        res.status(401).json(null);
        return;
      }
      // SEGURANCA: Nunca expor campos sensiveis ao cliente
      const { passwordHash, twoFactorSecret, ...safeUser } = result[0] as any;
      res.json(safeUser);
    } catch {
      res.status(500).json(null);
    }
  });
}
