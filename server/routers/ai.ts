/**
 * ai.ts — Router tRPC para IA Preditiva
 * DentCare Elite V31 — Data Science & AI
 *
 * Endpoints para predições, análises e insights
 * CORRECÇÃO: Todos os endpoints agora requerem autenticação (protectedProcedure)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import {
  predictNoShowProbability,
  projectFinancialForecast,
  analyzeTrendingTreatments,
  generateAutoInsights,
} from "../ai/predictiveEngine";

export const aiRouter = router({
  /**
   * Prever probabilidade de no-show para uma consulta
   */
  predictNoShow: protectedProcedure
    .input(z.object({ consultaId: z.number() }))
    .query(async ({ input }) => {
      return await predictNoShowProbability(input.consultaId);
    }),

  /**
   * Projetar receita para os próximos N dias
   */
  projectFinancialForecast: protectedProcedure
    .input(z.object({ daysAhead: z.number().default(30) }))
    .query(async ({ input }) => {
      return await projectFinancialForecast(input.daysAhead);
    }),

  /**
   * Analisar tendências de tratamentos
   */
  analyzeTrends: protectedProcedure
    .query(async () => {
      return await analyzeTrendingTreatments();
    }),

  /**
   * Gerar insights automáticos
   */
  generateInsights: protectedProcedure
    .query(async () => {
      return await generateAutoInsights();
    }),
});
