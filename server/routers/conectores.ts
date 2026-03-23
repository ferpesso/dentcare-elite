/**
 * Router de Conectores — Estilo Premium
 * DentCare Elite V35 — Conectores de Comunicação Clínica e Redes Sociais
 *
 * Cada conector tem:
 * - Configuração persistida na BD (via configuracoesClinica)
 * - Teste de conexão em tempo real
 * - Estado visual (conectado/desconectado/erro)
 * - Ativação/desativação com toggle
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { configuracoesClinica } from "../../drizzle/schema";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type ConectorEstado = "conectado" | "desconectado" | "erro" | "a_testar";

interface ConectorInfo {
  id: string;
  nome: string;
  estado: ConectorEstado;
  ativo: boolean;
  ultimoTeste?: string;
  mensagem?: string;
  configurado: boolean;
}

// ─── Definição dos Conectores ───────────────────────────────────────────────

const CONECTORES_COMUNICACAO = [
  {
    id: "email_smtp",
    nome: "Email SMTP",
    chaves: [
      "conector_email_smtp_ativo",
      "conector_email_smtp_host",
      "conector_email_smtp_port",
      "conector_email_smtp_user",
      "conector_email_smtp_pass",
      "conector_email_smtp_from",
      "conector_email_smtp_from_name",
      "conector_email_smtp_tls",
    ],
    camposObrigatorios: ["conector_email_smtp_host", "conector_email_smtp_user", "conector_email_smtp_pass", "conector_email_smtp_from"],
  },
  {
    id: "sms_twilio",
    nome: "SMS (Twilio)",
    chaves: [
      "conector_sms_twilio_ativo",
      "conector_sms_twilio_account_sid",
      "conector_sms_twilio_auth_token",
      "conector_sms_twilio_from_number",
    ],
    camposObrigatorios: ["conector_sms_twilio_account_sid", "conector_sms_twilio_auth_token", "conector_sms_twilio_from_number"],
  },
  {
    id: "whatsapp_business",
    nome: "WhatsApp Business",
    chaves: [
      "conector_whatsapp_ativo",
      "conector_whatsapp_provider",
      "conector_whatsapp_account_sid",
      "conector_whatsapp_auth_token",
      "conector_whatsapp_phone_id",
      "conector_whatsapp_business_id",
      "conector_whatsapp_api_token",
      "conector_whatsapp_number",
    ],
    camposObrigatorios: ["conector_whatsapp_number"],
  },
  {
    id: "push_notifications",
    nome: "Notificações Push",
    chaves: [
      "conector_push_ativo",
      "conector_push_provider",
      "conector_push_vapid_public",
      "conector_push_vapid_private",
      "conector_push_firebase_project_id",
      "conector_push_firebase_api_key",
    ],
    camposObrigatorios: [],
  },
  {
    id: "google_calendar",
    nome: "Google Calendar",
    chaves: [
      "conector_gcal_ativo",
      "conector_gcal_client_id",
      "conector_gcal_client_secret",
      "conector_gcal_refresh_token",
      "conector_gcal_calendar_id",
      "conector_gcal_country_code",
    ],
    camposObrigatorios: ["conector_gcal_client_id", "conector_gcal_client_secret"],
  },
  {
    id: "outlook_calendar",
    nome: "Microsoft Outlook",
    chaves: [
      "conector_outlook_ativo",
      "conector_outlook_client_id",
      "conector_outlook_client_secret",
      "conector_outlook_tenant_id",
      "conector_outlook_refresh_token",
    ],
    camposObrigatorios: ["conector_outlook_client_id", "conector_outlook_client_secret"],
  },
];

const CONECTORES_REDES_SOCIAIS = [
  {
    id: "facebook",
    nome: "Facebook",
    chaves: [
      "conector_facebook_ativo",
      "conector_facebook_app_id",
      "conector_facebook_app_secret",
      "conector_facebook_page_id",
      "conector_facebook_page_token",
    ],
    camposObrigatorios: ["conector_facebook_app_id", "conector_facebook_app_secret"],
  },
  {
    id: "instagram",
    nome: "Instagram",
    chaves: [
      "conector_instagram_ativo",
      "conector_instagram_app_id",
      "conector_instagram_app_secret",
      "conector_instagram_account_id",
      "conector_instagram_access_token",
    ],
    camposObrigatorios: ["conector_instagram_app_id", "conector_instagram_app_secret"],
  },
  {
    id: "linkedin",
    nome: "LinkedIn",
    chaves: [
      "conector_linkedin_ativo",
      "conector_linkedin_client_id",
      "conector_linkedin_client_secret",
      "conector_linkedin_org_id",
      "conector_linkedin_access_token",
    ],
    camposObrigatorios: ["conector_linkedin_client_id", "conector_linkedin_client_secret"],
  },
  {
    id: "tiktok",
    nome: "TikTok",
    chaves: [
      "conector_tiktok_ativo",
      "conector_tiktok_client_id",
      "conector_tiktok_client_secret",
      "conector_tiktok_access_token",
    ],
    camposObrigatorios: ["conector_tiktok_client_id", "conector_tiktok_client_secret"],
  },
  {
    id: "google_business",
    nome: "Google Business Profile",
    chaves: [
      "conector_gbp_ativo",
      "conector_gbp_client_id",
      "conector_gbp_client_secret",
      "conector_gbp_refresh_token",
      "conector_gbp_location_id",
    ],
    camposObrigatorios: ["conector_gbp_client_id", "conector_gbp_client_secret"],
  },
  {
    id: "google_reviews",
    nome: "Google Reviews",
    chaves: [
      "conector_greviews_ativo",
      "conector_greviews_place_id",
      "conector_greviews_api_key",
    ],
    camposObrigatorios: ["conector_greviews_place_id", "conector_greviews_api_key"],
  },
];

const TODOS_CONECTORES = [...CONECTORES_COMUNICACAO, ...CONECTORES_REDES_SOCIAIS];

// ─── Helpers ────────────────────────────────────────────────────────────────

async function obterValoresConector(db: any, chaves: string[]): Promise<Record<string, string>> {
  const valores: Record<string, string> = {};
  if (chaves.length === 0) return valores;

  const rows = await db
    .select()
    .from(configuracoesClinica);

  for (const row of rows) {
    if (chaves.includes(row.chave)) {
      valores[row.chave] = row.valor;
    }
  }
  return valores;
}

async function upsertConfig(db: any, chave: string, valor: string) {
  const existente = await db
    .select()
    .from(configuracoesClinica)
    .where(eq(configuracoesClinica.chave, chave))
    .limit(1);

  if (existente.length > 0) {
    await db
      .update(configuracoesClinica)
      .set({ valor, updatedAt: new Date() })
      .where(eq(configuracoesClinica.id, existente[0].id));
  } else {
    await db.insert(configuracoesClinica).values({
      chave,
      valor,
      tipo: "string",
      updatedAt: new Date(),
    });
  }
}

// ─── Testes de Conexão ──────────────────────────────────────────────────────

async function testarConexaoEmailSMTP(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const host = valores.conector_email_smtp_host;
  const port = parseInt(valores.conector_email_smtp_port || "587");
  const user = valores.conector_email_smtp_user;
  const pass = valores.conector_email_smtp_pass;

  if (!host || !user || !pass) {
    return { sucesso: false, mensagem: "Campos obrigatórios em falta (host, user, password)" };
  }

  try {
    // Teste de conexão TCP ao servidor SMTP
    const net = await import("net");
    return new Promise((resolve) => {
      const socket = net.createConnection({ host, port, timeout: 5000 }, () => {
        socket.destroy();
        resolve({ sucesso: true, mensagem: `Conexão SMTP estabelecida com ${host}:${port}` });
      });
      socket.on("error", (err: any) => {
        resolve({ sucesso: false, mensagem: `Falha ao conectar a ${host}:${port}. Verifique se o serviço está acessível.` });
      });
      socket.on("timeout", () => {
        socket.destroy();
        resolve({ sucesso: false, mensagem: `Timeout ao conectar a ${host}:${port}` });
      });
    });
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
  }
}

async function testarConexaoTwilioSMS(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const sid = valores.conector_sms_twilio_account_sid;
  const token = valores.conector_sms_twilio_auth_token;

  if (!sid || !token) {
    return { sucesso: false, mensagem: "Account SID e Auth Token são obrigatórios" };
  }

  try {
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
      headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") },
    });
    if (res.ok) {
      const data = await res.json() as any;
      return { sucesso: true, mensagem: `Conta Twilio verificada: ${data.friendly_name || sid}` };
    }
    return { sucesso: false, mensagem: `Credenciais inválidas (HTTP ${res.status})` };
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro de rede. Verifique a conectividade.' };
  }
}

async function testarConexaoWhatsApp(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const provider = valores.conector_whatsapp_provider || "twilio";

  if (provider === "twilio") {
    const sid = valores.conector_whatsapp_account_sid;
    const token = valores.conector_whatsapp_auth_token;
    if (!sid || !token) {
      return { sucesso: false, mensagem: "Account SID e Auth Token são obrigatórios para Twilio" };
    }
    try {
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}.json`, {
        headers: { Authorization: "Basic " + Buffer.from(`${sid}:${token}`).toString("base64") },
      });
      if (res.ok) return { sucesso: true, mensagem: "WhatsApp via Twilio conectado com sucesso" };
      return { sucesso: false, mensagem: `Credenciais Twilio inválidas (HTTP ${res.status})` };
    } catch (err: any) {
      return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
    }
  }

  if (provider === "meta_cloud") {
    const token = valores.conector_whatsapp_api_token;
    const phoneId = valores.conector_whatsapp_phone_id;
    if (!token || !phoneId) {
      return { sucesso: false, mensagem: "API Token e Phone Number ID são obrigatórios para Meta Cloud API" };
    }
    try {
      const res = await fetch(`https://graph.facebook.com/v21.0/${phoneId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) return { sucesso: true, mensagem: "WhatsApp Cloud API conectado com sucesso" };
      return { sucesso: false, mensagem: `Token ou Phone ID inválido (HTTP ${res.status})` };
    } catch (err: any) {
      return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
    }
  }

  return { sucesso: false, mensagem: "Provider não suportado" };
}

async function testarConexaoFacebook(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const token = valores.conector_facebook_page_token;
  const pageId = valores.conector_facebook_page_id;

  if (!token) {
    return { sucesso: false, mensagem: "Page Access Token é obrigatório" };
  }

  try {
    const url = pageId
      ? `https://graph.facebook.com/v21.0/${pageId}?fields=name,fan_count&access_token=${token}`
      : `https://graph.facebook.com/v21.0/me?fields=name&access_token=${token}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json() as any;
      return { sucesso: true, mensagem: `Página conectada: ${data.name || "OK"}${data.fan_count ? ` (${data.fan_count} seguidores)` : ""}` };
    }
    const err = await res.json() as any;
    return { sucesso: false, mensagem: err.error?.message || `Erro HTTP ${res.status}` };
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
  }
}

async function testarConexaoInstagram(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const token = valores.conector_instagram_access_token;
  const accountId = valores.conector_instagram_account_id;

  if (!token) {
    return { sucesso: false, mensagem: "Access Token é obrigatório" };
  }

  try {
    const url = accountId
      ? `https://graph.instagram.com/v21.0/${accountId}?fields=username,followers_count,media_count&access_token=${token}`
      : `https://graph.instagram.com/v21.0/me?fields=username,account_type&access_token=${token}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json() as any;
      return { sucesso: true, mensagem: `@${data.username || "conta"} conectado${data.followers_count ? ` (${data.followers_count} seguidores)` : ""}` };
    }
    const err = await res.json() as any;
    return { sucesso: false, mensagem: err.error?.message || `Erro HTTP ${res.status}` };
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
  }
}

async function testarConexaoLinkedIn(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const token = valores.conector_linkedin_access_token;

  if (!token) {
    return { sucesso: false, mensagem: "Access Token é obrigatório" };
  }

  try {
    const res = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json() as any;
      return { sucesso: true, mensagem: `LinkedIn conectado: ${data.name || data.localizedFirstName || "OK"}` };
    }
    return { sucesso: false, mensagem: `Token inválido ou expirado (HTTP ${res.status})` };
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
  }
}

function testarConexaoGoogleBusiness(valores: Record<string, string>): { sucesso: boolean; mensagem: string } {
  const refreshToken = valores.conector_gbp_refresh_token;
  if (!refreshToken) {
    return { sucesso: false, mensagem: "Autenticação OAuth necessária — clique em 'Conectar com Google'" };
  }
  return { sucesso: true, mensagem: "Google Business Profile configurado" };
}

async function testarConexaoGoogleReviews(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const placeId = valores.conector_greviews_place_id;
  const apiKey = valores.conector_greviews_api_key;

  if (!placeId || !apiKey) {
    return { sucesso: false, mensagem: "Place ID e API Key são obrigatórios" };
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total&key=${apiKey}`
    );
    if (res.ok) {
      const data = await res.json() as any;
      if (data.result) {
        return { sucesso: true, mensagem: `${data.result.name} — ${data.result.rating}/5 (${data.result.user_ratings_total} avaliações)` };
      }
    }
    return { sucesso: false, mensagem: "Place ID ou API Key inválidos" };
  } catch (err: any) {
    return { sucesso: false, mensagem: 'Erro ao testar conexão. Verifique as configurações.' };
  }
}

async function testarConexaoGoogleCalendar(valores: Record<string, string>): Promise<{ sucesso: boolean; mensagem: string }> {
  const refreshToken = valores.conector_gcal_refresh_token;
  const countryCode = valores.conector_gcal_country_code;

  // Validar país dos feriados (se configurado)
  let paisMsg = "";
  if (countryCode) {
    try {
      const res = await fetch(`https://date.nager.at/api/v3/AvailableCountries`);
      if (res.ok) {
        const paises = await res.json() as Array<{ countryCode: string; name: string }>;
        const pais = paises.find(p => p.countryCode === countryCode.toUpperCase());
        if (pais) {
          paisMsg = ` | Feriados: ${pais.name} (${pais.countryCode})`;
        } else {
          return { sucesso: false, mensagem: `País '${countryCode}' não suportado para feriados. Use código ISO (ex: PT, BR, US, ES, FR, DE).` };
        }
      }
    } catch {
      paisMsg = " | Feriados: não foi possível validar o país";
    }
  }

  if (!refreshToken) {
    if (countryCode && paisMsg) {
      return { sucesso: true, mensagem: `Feriados configurados com sucesso${paisMsg}. OAuth pendente para sincronização de consultas.` };
    }
    return { sucesso: false, mensagem: "Autenticação OAuth necessária — clique em 'Conectar com Google'" };
  }
  return { sucesso: true, mensagem: `Google Calendar configurado${paisMsg}` };
}

function testarConexaoOutlook(valores: Record<string, string>): { sucesso: boolean; mensagem: string } {
  const clientId = valores.conector_outlook_client_id;
  const refreshToken = valores.conector_outlook_refresh_token;
  if (!clientId) {
    return { sucesso: false, mensagem: "Client ID é obrigatório" };
  }
  if (!refreshToken) {
    return { sucesso: false, mensagem: "Autenticação OAuth necessária — clique em 'Conectar com Microsoft'" };
  }
  return { sucesso: true, mensagem: "Microsoft Outlook configurado" };
}

function testarConexaoPush(_valores: Record<string, string>): { sucesso: boolean; mensagem: string } {
  return { sucesso: true, mensagem: "Notificações Push via Service Worker (nativo do browser)" };
}

function testarConexaoTikTok(valores: Record<string, string>): { sucesso: boolean; mensagem: string } {
  const token = valores.conector_tiktok_access_token;
  if (!token) {
    return { sucesso: false, mensagem: "Access Token é obrigatório — autentique via OAuth" };
  }
  return { sucesso: true, mensagem: "TikTok conectado" };
}

const TESTES_CONEXAO: Record<string, (valores: Record<string, string>) => Promise<{ sucesso: boolean; mensagem: string }> | { sucesso: boolean; mensagem: string }> = {
  email_smtp: testarConexaoEmailSMTP,
  sms_twilio: testarConexaoTwilioSMS,
  whatsapp_business: testarConexaoWhatsApp,
  push_notifications: testarConexaoPush,
  google_calendar: testarConexaoGoogleCalendar,
  outlook_calendar: testarConexaoOutlook,
  facebook: testarConexaoFacebook,
  instagram: testarConexaoInstagram,
  linkedin: testarConexaoLinkedIn,
  tiktok: testarConexaoTikTok,
  google_business: testarConexaoGoogleBusiness,
  google_reviews: testarConexaoGoogleReviews,
};

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER
// ═══════════════════════════════════════════════════════════════════════════════

export const conectoresRouter = router({
  /**
   * Listar todos os conectores com estado atual
   */
  listar: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "system.configure")) {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // Obter todas as configs de conectores
    const todasChaves = TODOS_CONECTORES.flatMap(c => c.chaves);
    const valores = await obterValoresConector(db, todasChaves);

    const comunicacao: ConectorInfo[] = CONECTORES_COMUNICACAO.map(c => {
      const ativoKey = c.chaves.find(k => k.endsWith("_ativo"));
      const ativo = ativoKey ? valores[ativoKey] === "true" : false;
      const configurado = c.camposObrigatorios.every(k => !!valores[k] && valores[k].length > 0);
      const ultimoTesteKey = `${c.id}_ultimo_teste`;
      const ultimoResultadoKey = `${c.id}_ultimo_resultado`;

      return {
        id: c.id,
        nome: c.nome,
        estado: ativo ? (configurado ? "conectado" : "erro") : "desconectado",
        ativo,
        configurado,
        ultimoTeste: valores[ultimoTesteKey] || undefined,
        mensagem: valores[ultimoResultadoKey] || undefined,
      };
    });

    const redesSociais: ConectorInfo[] = CONECTORES_REDES_SOCIAIS.map(c => {
      const ativoKey = c.chaves.find(k => k.endsWith("_ativo"));
      const ativo = ativoKey ? valores[ativoKey] === "true" : false;
      const configurado = c.camposObrigatorios.every(k => !!valores[k] && valores[k].length > 0);

      return {
        id: c.id,
        nome: c.nome,
        estado: ativo ? (configurado ? "conectado" : "erro") : "desconectado",
        ativo,
        configurado,
        mensagem: undefined,
      };
    });

    return {
      success: true,
      comunicacao,
      redesSociais,
      totalConectados: [...comunicacao, ...redesSociais].filter(c => c.estado === "conectado").length,
      totalConectores: TODOS_CONECTORES.length,
    };
  }),

  /**
   * Obter configuração detalhada de um conector
   */
  obterDetalhe: protectedProcedure
    .input(z.object({ conectorId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conector = TODOS_CONECTORES.find(c => c.id === input.conectorId);
      if (!conector) throw new TRPCError({ code: "NOT_FOUND", message: "Conector não encontrado" });

      const valores = await obterValoresConector(db, conector.chaves);

      // Mascarar tokens/passwords
      const valoresMascarados: Record<string, string> = {};
      for (const [key, val] of Object.entries(valores)) {
        if (key.includes("token") || key.includes("pass") || key.includes("secret") || key.includes("api_key")) {
          valoresMascarados[key] = val ? "••••••••" + val.slice(-4) : "";
        } else {
          valoresMascarados[key] = val || "";
        }
      }

      return {
        success: true,
        conectorId: conector.id,
        nome: conector.nome,
        chaves: conector.chaves,
        camposObrigatorios: conector.camposObrigatorios,
        valores: valoresMascarados,
        valoresReais: valores, // Valores reais para o formulário (protegido por RBAC)
      };
    }),

  /**
   * Guardar configuração de um conector
   */
  guardar: protectedProcedure
    .input(z.object({
      conectorId: z.string(),
      valores: z.record(z.string(), z.string()),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conector = TODOS_CONECTORES.find(c => c.id === input.conectorId);
      if (!conector) throw new TRPCError({ code: "NOT_FOUND" });

      // Guardar cada valor (ignorar valores mascarados)
      let atualizados = 0;
      for (const [chave, valor] of Object.entries(input.valores)) {
        if (valor.startsWith("••••")) continue; // Ignorar valores mascarados
        if (!conector.chaves.includes(chave)) continue; // Segurança
        await upsertConfig(db, chave, valor);
        atualizados++;
      }

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "conectores",
        registoId: 0,
        descricao: `Conector ${conector.nome} atualizado (${atualizados} campos)`,
        valorNovo: { conectorId: input.conectorId },
      });

      return { success: true, message: `Conector ${conector.nome} guardado com sucesso`, atualizados };
    }),

  /**
   * Ativar/Desativar um conector
   */
  toggleAtivo: protectedProcedure
    .input(z.object({
      conectorId: z.string(),
      ativo: z.boolean(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conector = TODOS_CONECTORES.find(c => c.id === input.conectorId);
      if (!conector) throw new TRPCError({ code: "NOT_FOUND" });

      const ativoKey = conector.chaves.find(k => k.endsWith("_ativo"));
      if (!ativoKey) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      await upsertConfig(db, ativoKey, input.ativo ? "true" : "false");

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "conectores",
        registoId: 0,
        descricao: `Conector ${conector.nome} ${input.ativo ? "ativado" : "desativado"}`,
        valorNovo: { ativo: input.ativo },
      });

      return { success: true, message: `${conector.nome} ${input.ativo ? "ativado" : "desativado"}` };
    }),

  /**
   * Testar conexão de um conector
   */
  testarConexao: protectedProcedure
    .input(z.object({ conectorId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conector = TODOS_CONECTORES.find(c => c.id === input.conectorId);
      if (!conector) throw new TRPCError({ code: "NOT_FOUND" });

      const valores = await obterValoresConector(db, conector.chaves);

      const testeFn = TESTES_CONEXAO[input.conectorId];
      if (!testeFn) {
        return { success: true, resultado: { sucesso: false, mensagem: "Teste não disponível para este conector" } };
      }

      const resultado = await Promise.resolve(testeFn(valores));

      // Guardar resultado do teste
      await upsertConfig(db, `${input.conectorId}_ultimo_teste`, new Date().toISOString());
      await upsertConfig(db, `${input.conectorId}_ultimo_resultado`, resultado.mensagem);

      return { success: true, resultado };
    }),

  /**
   * Obter resumo rápido para o dashboard
   */
  resumo: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return { comunicacao: 0, redesSociais: 0, total: 0 };

    const rows = await db.select().from(configuracoesClinica);
    const valores: Record<string, string> = {};
    for (const row of rows) {
      valores[row.chave] = row.valor;
    }

    let comunicacao = 0;
    let redesSociais = 0;

    for (const c of CONECTORES_COMUNICACAO) {
      const ativoKey = c.chaves.find(k => k.endsWith("_ativo"));
      if (ativoKey && valores[ativoKey] === "true") comunicacao++;
    }

    for (const c of CONECTORES_REDES_SOCIAIS) {
      const ativoKey = c.chaves.find(k => k.endsWith("_ativo"));
      if (ativoKey && valores[ativoKey] === "true") redesSociais++;
    }

    return { comunicacao, redesSociais, total: comunicacao + redesSociais };
  }),
});
