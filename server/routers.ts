import { router } from "./_core/trpc";
import { usersRouter } from "./routers/users";
import { systemRouter } from "./routers/system";
import { publicProcedure, protectedProcedure } from "./_core/trpc";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { generateTwoFactorSecret, verifyTwoFactorToken } from "./twoFactor";
import { getDb } from "./db";
import { users } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { consultasRouter } from "./routers/consultas";
import { financeiroRouter } from "./routers/financeiro";
import { faturacaoRouter } from "./routers/faturacao";
import { whatsappRouter } from "./routers/whatsapp";
import { stocksRouter } from "./routers/stocks";
import { configuracoesRouter } from "./routers/configuracoes";
import { dentistasRouter } from "./routers/dentistas";
import { funcionariosRouter } from "./routers/funcionarios";
// FIX v35.5: permissoesRouter removido — não utilizado pelo frontend (substituído por controloAcessoRouter)
import { controloAcessoRouter } from "./routers/controloAcesso";
import { iaRouter } from "./routers/ia";
import { utentesRouter } from "./routers/utentes";
import { relatoriosRouter } from "./routers/relatorios";
import { marketingRouter } from "./routers/marketing";
// FIX v35.5: especialidadesRouter removido — não utilizado pelo frontend
// FIX v35.5: appMobileRouter removido — não utilizado pelo frontend
import { fichaUtenteRouter } from "./routers/ficha-utente";
import { ligacoesRouter } from "./routers/ligacoes";
import { tratamentosRouter } from "./routers/tratamentos";
import { socialHubRouter } from "./routers/social-hub";
import { dashboardRouter } from "./routers/dashboard";
import { iaPreditivaRouter } from "./routers/ia-preditiva";
// FIX v35.5: presetsRouter removido — não utilizado pelo frontend
import { voiceBriefingRouter } from "./routers/voice-briefing";
import { termosConsentimentoRouter } from "./routers/termos-consentimento";
import { migracaoRouter } from "./routers/migracao";
import { aiRouter } from "./routers/ai";
import { imagiologiaRouter } from "./routers/imagiologia";
import { laboratoriosRouter } from "./routers/laboratorios";
import { materiaisLabRouter } from "./routers/materiais-lab";
import { iaAgentRouter } from "./routers/ia-agent";
import { notificacoesRouter } from "./routers/notificacoes";
import { healthScoreRouter } from "./routers/health-score";
import { conectoresRouter } from "./routers/conectores";
import { comunicacoesRouter } from "./routers/comunicacoes";
import { feriadosRouter } from "./routers/feriados";
import { ttsRouter } from "./routers/tts";

const authRouter = router({
  me: publicProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return null;
    return ctx.user;
  }),

  logout: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.res) {
      const cookieOpts = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, {
        ...cookieOpts,
        maxAge: -1,
      });
    }
    return { success: true };
  }),

  /**
   * FIX: enable2FA agora guarda o segredo na BD.
   * O 2FA só fica ativo após confirmação via verify2FA.
   */
  enable2FA: protectedProcedure.mutation(async ({ ctx }) => {
    const email = ctx.user.email ?? ctx.user.name ?? "user";
    const { secret, qrCodeUrl } = await generateTwoFactorSecret(email);
    const db = await getDb();
    if (db) {
      await db.update(users)
        .set({ twoFactorSecret: secret, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));
    }
    return {
      secret,
      qrCodeUrl,
      message: "Escaneie o QR Code e confirme com o código gerado pela aplicação.",
    };
  }),

  /**
   * FIX: verify2FA usa o segredo guardado na BD (não recebido do cliente).
   * Ativa o 2FA na BD após confirmação bem-sucedida.
   */
  verify2FA: protectedProcedure
    .input(z.object({
      token: z.string().length(6, "O código deve ter 6 dígitos"),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [userRow] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!userRow?.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Inicie o processo de ativação do 2FA primeiro." });
      }
      const isValid = verifyTwoFactorToken(userRow.twoFactorSecret, input.token);
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Código 2FA inválido. Tente novamente." });
      }
      await db.update(users)
        .set({ twoFactorEnabled: true, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));
      return { success: true, message: "2FA ativado com sucesso." };
    }),

  /**
   * FIX: disable2FA desativa o 2FA e limpa o segredo da BD.
   */
  disable2FA: protectedProcedure
    .input(z.object({ token: z.string().length(6) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [userRow] = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
      if (!userRow?.twoFactorSecret) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "2FA não está ativo." });
      }
      const isValid = verifyTwoFactorToken(userRow.twoFactorSecret, input.token);
      if (!isValid) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Código 2FA inválido." });
      }
      await db.update(users)
        .set({ twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() })
        .where(eq(users.id, ctx.user.id));
      return { success: true, message: "2FA desativado com sucesso." };
    }),
});



export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  users: usersRouter,
  consultas: consultasRouter,
  financeiro: financeiroRouter,
  faturacao: faturacaoRouter,
  utentes: utentesRouter,
  whatsapp: whatsappRouter,
  stocks: stocksRouter,
  configuracoes: configuracoesRouter,
  dentistas: dentistasRouter,
  funcionarios: funcionariosRouter,
  // FIX v35.5: permissoes removido — não utilizado pelo frontend
  controloAcesso: controloAcessoRouter,
  iaClinica: iaRouter, // Router com analisarImagem, sugestoesClinicas, gerarBriefing, resumirConsulta
  relatorios: relatoriosRouter,
  marketing: marketingRouter,
  // FIX v35.5: especialidades e appMobile removidos — não utilizados pelo frontend
  fichaUtente: fichaUtenteRouter,
  ligacoes: ligacoesRouter,
  tratamentos: tratamentosRouter,
  socialHub: socialHubRouter,
  dashboard: dashboardRouter,
  iaPreditiva: iaPreditivaRouter,
  // FIX v35.5: presets removido — não utilizado pelo frontend
  voiceBriefing: voiceBriefingRouter,
  termosConsentimento: termosConsentimentoRouter,
  migracao: migracaoRouter,
  ai: aiRouter, // AIInsightsDashboard usa trpc.ai.*
  imagiologia: imagiologiaRouter,
  laboratorios: laboratoriosRouter,
  materiaisLab: materiaisLabRouter,
  iaAgent: iaAgentRouter,
  notificacoes: notificacoesRouter,
  healthScore: healthScoreRouter,
  conectores: conectoresRouter,
  comunicacoes: comunicacoesRouter,
  feriados: feriadosRouter,
  tts: ttsRouter,
});

export type AppRouter = typeof appRouter;
