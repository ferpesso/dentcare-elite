/**
 * Voice Briefing Router — Histórico de Briefings Diários
 * DentCare Elite V31 — Persistência real na tabela historico_briefing
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import { historicoBriefing } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const voiceBriefingRouter = router({
  /**
   * Listar histórico de briefings do utilizador autenticado
   */
  listarHistorico: protectedProcedure
    .input(z.object({ limite: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const historico = await db
        .select()
        .from(historicoBriefing)
        .where(eq(historicoBriefing.usuarioId, ctx.user.id))
        .orderBy(desc(historicoBriefing.createdAt))
        .limit(input?.limite ?? 10);

      return {
        success: true,
        historico: historico.map(h => ({
          id: h.id,
          data: h.createdAt,
          duracao: formatarDuracao(h.duracao),
          duracaoSegundos: h.duracao,
          secoes: (() => {
            try { return JSON.parse(h.secoes).length; } catch { return 0; }
          })(),
          secoesLista: (() => {
            try { return JSON.parse(h.secoes); } catch { return []; }
          })(),
          conteudoTextual: h.conteudoTextual,
          urlAudio: h.urlAudio,
        })),
      };
    }),

  /**
   * Alias de listarHistorico — mantido por compatibilidade com o frontend
   * O frontend usa trpc.voiceBriefing.obterHistorico em alguns componentes
   */
  obterHistorico: protectedProcedure
    .input(z.object({ limite: z.number().default(10) }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const historico = await db
        .select()
        .from(historicoBriefing)
        .where(eq(historicoBriefing.usuarioId, ctx.user.id))
        .orderBy(desc(historicoBriefing.createdAt))
        .limit(input?.limite ?? 10);

      return {
        success: true,
        historico: historico.map(h => ({
          id: h.id,
          data: h.createdAt,
          duracao: formatarDuracao(h.duracao),
          duracaoSegundos: h.duracao,
          secoes: (() => { try { return JSON.parse(h.secoes).length; } catch { return 0; } })(),
          secoesLista: (() => { try { return JSON.parse(h.secoes); } catch { return []; } })(),
          conteudoTextual: h.conteudoTextual,
          urlAudio: h.urlAudio,
        })),
      };
    }),

  /**
   * Registar um briefing concluído na BD
   */
  registarBriefing: protectedProcedure
    .input(z.object({
      secoes: z.array(z.string()),
      duracaoSegundos: z.number().min(0),
      conteudoTextual: z.string().optional(),
      urlAudio: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.insert(historicoBriefing).values({
        usuarioId: ctx.user.id,
        secoes: JSON.stringify(input.secoes),
        duracao: input.duracaoSegundos,
        conteudoTextual: input.conteudoTextual ?? null,
        urlAudio: input.urlAudio ?? null,
        createdAt: new Date(),
      });

      return { success: true };
    }),
});

function formatarDuracao(segundos: number): string {
  const m = Math.floor(segundos / 60);
  const s = segundos % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
