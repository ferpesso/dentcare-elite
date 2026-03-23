/**
 * Router de Health Score — Score de Saúde da Clínica
 * DentCare V35
 *
 * Endpoints tRPC para o score de saúde e weekly digest.
 * FIX V35.5: Adicionado controlo de acesso RBAC em todos os endpoints.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { calcularHealthScore, guardarHealthSnapshot } from "../services/clinicHealthScore";
import { gerarWeeklyDigest, gerarWeeklyDigestHTML } from "../services/weeklyDigest";
import { getDb } from "../db";
import { clinicHealthSnapshots, consultas, utentes, tratamentos } from "../../drizzle/schema";
import { desc, sql, gte, lte, eq, and, count } from "drizzle-orm";
import { hasPermission } from "../rbac";

export const healthScoreRouter = router({
  /**
   * Obter score de saúde atual da clínica
   */
  obterScore: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao Health Score" });
      }
      try {
        const score = await calcularHealthScore();
        return { success: true, ...score };
      } catch (error: any) {
        return {
          success: false,
          scoreGeral: 0,
          classificacao: "critico" as const,
          dimensoes: {
            ocupacao: { score: 0, valor: 0, meta: 80, label: "Ocupação da Agenda" },
            noShow: { score: 0, valor: 0, meta: 5, label: "Taxa de No-Show" },
            receita: { score: 0, valor: 0, meta: 15000, label: "Receita vs Meta" },
            retencao: { score: 0, valor: 0, meta: 70, label: "Retenção de Pacientes" },
            satisfacao: { score: 0, valor: 0, meta: 85, label: "Satisfação Estimada" },
          },
          tendencia: "estavel" as const,
          recomendacoes: [],
          ultimaAtualizacao: new Date(),
          error: 'Erro ao processar. Tente novamente.',
        };
      }
    }),

  /**
   * Obter histórico de scores (últimos 30 dias)
   */
  obterHistorico: protectedProcedure
    .input(z.object({ dias: z.number().min(7).max(365).optional().default(30) }).optional())
    .query(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao histórico do Health Score" });
      }
      try {
        const db = await getDb();
        if (!db) return { success: false, historico: [] };

        const dias = input?.dias || 30;
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - dias);

        const historico = await db
          .select()
          .from(clinicHealthSnapshots)
          .where(sql`${clinicHealthSnapshots.data} >= ${dataLimite}`)
          .orderBy(desc(clinicHealthSnapshots.data))
          .limit(dias);

        return { success: true, historico };
      } catch (error: any) {
        return { success: false, historico: [], error: 'Erro ao processar. Tente novamente.' };
      }
    }),

  /**
   * Forçar snapshot manual
   */
  guardarSnapshot: protectedProcedure
    .mutation(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.view_all")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para guardar snapshots do Health Score" });
      }
      try {
        await guardarHealthSnapshot();
        return { success: true, message: "Snapshot guardado com sucesso." };
      } catch (error: any) {
        return { success: false, error: 'Erro ao processar. Tente novamente.' };
      }
    }),

  /**
   * Obter weekly digest
   */
  obterWeeklyDigest: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao Weekly Digest" });
      }
      try {
        const data = await gerarWeeklyDigest();
        const html = gerarWeeklyDigestHTML(data);
        return { success: true, data, html };
      } catch (error: any) {
        return { success: false, error: 'Erro ao processar. Tente novamente.' };
      }
    }),

  /**
   * Heatmap de ocupação da agenda — dados reais das consultas
   * Devolve contagem de consultas agrupadas por dia da semana (0=Dom) e hora (8-19)
   * para os últimos 90 dias
   */
  obterHeatmap: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao Heatmap" });
      }
      try {
        const db = await getDb();
        if (!db) return { success: false, dados: [] };

        const noventaDiasAtras = new Date();
        noventaDiasAtras.setDate(noventaDiasAtras.getDate() - 90);

        // Buscar todas as consultas dos últimos 90 dias (excluindo canceladas)
        const rows = await db
          .select({ dataHoraInicio: consultas.dataHoraInicio })
          .from(consultas)
          .where(
            and(
              gte(consultas.dataHoraInicio, noventaDiasAtras),
              sql`${consultas.estado} != 'cancelada'`
            )
          );

        // Agrupar por dia da semana e hora
        const mapa = new Map<string, number>();
        for (const row of rows) {
          const d = new Date(row.dataHoraInicio);
          const dia = d.getDay(); // 0=Dom, 6=Sáb
          const hora = d.getHours(); // 0-23
          if (hora >= 8 && hora <= 19) {
            const key = `${dia}-${hora}`;
            mapa.set(key, (mapa.get(key) || 0) + 1);
          }
        }

        const dados = Array.from(mapa.entries()).map(([key, valor]) => {
          const [dia, hora] = key.split("-").map(Number);
          return { dia, hora, valor };
        });

        return { success: true, dados };
      } catch (error: any) {
        return { success: false, dados: [], error: 'Erro ao processar. Tente novamente.' };
      }
    }),

  /**
   * Funil de conversão de pacientes — dados reais
   * Devolve contagens reais: novos utentes, com consulta, em tratamento, fidelizados
   */
  obterFunil: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao Funil" });
      }
      try {
        const db = await getDb();
        if (!db) return { success: false, novos: 0, comConsulta: 0, emTratamento: 0, fidelizados: 0 };

        const trintaDiasAtras = new Date();
        trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        const umAnoAtras = new Date();
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);

        const [
          novosResult,
          comConsultaResult,
          emTratamentoResult,
          fidelizadosResult,
        ] = await Promise.all([
          // Novos utentes nos últimos 30 dias
          db.select({ total: count() }).from(utentes)
            .where(and(gte(utentes.createdAt, trintaDiasAtras), eq(utentes.ativo, true))),
          // Utentes com pelo menos uma consulta nos últimos 6 meses
          db.select({ total: count(sql`DISTINCT ${consultas.utenteId}`) }).from(consultas)
            .where(gte(consultas.dataHoraInicio, seisMesesAtras)),
          // Utentes com tratamento em progresso
          db.select({ total: count(sql`DISTINCT ${tratamentos.utenteId}`) }).from(tratamentos)
            .where(eq(tratamentos.estado, "em_progresso")),
          // Utentes fidelizados: com consulta há mais de 1 ano E nos últimos 6 meses
          db.select({ total: count(sql`DISTINCT ${consultas.utenteId}`) }).from(consultas)
            .where(
              and(
                gte(consultas.dataHoraInicio, seisMesesAtras),
                sql`${consultas.utenteId} IN (SELECT DISTINCT utente_id FROM consultas WHERE data_hora_inicio < ${umAnoAtras})`
              )
            ),
        ]);

        return {
          success: true,
          novos: Number(novosResult[0]?.total) || 0,
          comConsulta: Number(comConsultaResult[0]?.total) || 0,
          emTratamento: Number(emTratamentoResult[0]?.total) || 0,
          fidelizados: Number(fidelizadosResult[0]?.total) || 0,
        };
      } catch (error: any) {
        return { success: false, novos: 0, comConsulta: 0, emTratamento: 0, fidelizados: 0, error: 'Erro ao processar. Tente novamente.' };
      }
    }),
});
