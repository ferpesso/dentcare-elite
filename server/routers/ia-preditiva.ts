/**
 * Router de IA Preditiva — Analytics e Previsões Reais
 * DentCare Elite V31 — Inteligência de Negócio
 *
 * CORRIGIDO:
 * - slots_por_dia e meta_receita_diaria lidos das configuracoesClinica (BD real)
 * - novosUtentesPrevistos baseado em contagem real de novos utentes nos últimos 30 dias
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import { consultas, faturas, utentes, tratamentos, stocks, configuracoesClinica } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, sum, desc } from "drizzle-orm";
import {
  predictNoShowProbability,
  projectFinancialForecast,
  analyzeTrendingTreatments,
  generateAutoInsights,
} from "../ai/predictiveEngine";

export const iaPreditivaRouter = router({
  /**
   * Obter previsões e KPIs baseados em dados reais
   */
  obterPrevisoes: protectedProcedure
    .input(z.object({ periodo: z.enum(["semana", "mes", "trimestre"]) }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const hoje = new Date();
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      // 0. Carregar configurações da clínica (slots_por_dia e meta_receita_diaria)
      let slotsPorDia = 15;
      let metaReceitaDiaria = 500;
      try {
        const configRows = await db
          .select()
          .from(configuracoesClinica)
          .where(sql`${configuracoesClinica.chave} IN ('slots_por_dia', 'meta_receita_diaria')`);
        for (const row of configRows) {
          if (row.chave === "slots_por_dia" && row.valor) {
            slotsPorDia = parseInt(row.valor) || 15;
          }
          if (row.chave === "meta_receita_diaria" && row.valor) {
            metaReceitaDiaria = parseFloat(row.valor) || 500;
          }
        }
      } catch {
        // Usar valores padrão se configurações não estiverem disponíveis
      }

      // 1. Calcular média de receita diária dos últimos 30 dias
      const receitaRecente = await db
        .select({ total: sum(faturas.valorTotal) })
        .from(faturas)
        .where(and(eq(faturas.estado, "paga"), gte(faturas.dataEmissao, trintaDiasAtras)));
      
      const totalRecente = Number(receitaRecente[0]?.total) || 0;
      const mediaDiaria = totalRecente / 30;

      // 2. Calcular ocupação real por dia da semana
      const ocupacaoReal = await db
        .select({
          diaSemana: sql<number>`DAYOFWEEK(${consultas.dataHoraInicio})`,
          total: count(consultas.id),
        })
        .from(consultas)
        .where(gte(consultas.dataHoraInicio, trintaDiasAtras))
        .groupBy(sql`DAYOFWEEK(${consultas.dataHoraInicio})`);

      const diasSemana = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
      const ocupacaoFormatada = diasSemana.map((dia, i) => {
        const found = ocupacaoReal.find(o => o.diaSemana === i + 1);
        const total = Number(found?.total) || 0;
        return {
          dia,
          consultas: total,
          // Percentagem de ocupação baseada em slots reais da BD
          pct: Math.min(Math.round((total / slotsPorDia) * 100), 100),
        };
      });

      // 3. Tendência de receita (últimos 6 meses)
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
      
      const tendenciaMensal = await db
        .select({
          mes: sql<string>`DATE_FORMAT(${faturas.dataEmissao}, '%b')`,
          receita: sum(faturas.valorTotal),
          consultas: count(faturas.id),
        })
        .from(faturas)
        .where(and(eq(faturas.estado, "paga"), gte(faturas.dataEmissao, seisMesesAtras)))
        .groupBy(sql`DATE_FORMAT(${faturas.dataEmissao}, '%b')`)
        .orderBy(sql`MIN(${faturas.dataEmissao})`);

      // 4. Contagem real de novos utentes nos últimos 30 dias
      const novosUtentesRecentes = await db
        .select({ count: count() })
        .from(utentes)
        .where(and(eq(utentes.ativo, true), gte(utentes.createdAt, trintaDiasAtras)));
      
      const novosUtentes30Dias = Number(novosUtentesRecentes[0]?.count) || 0;

      // 5. Gerar Insights Reais
      const insights = [];
      
      // Insight de Ocupação
      const melhorDia = [...ocupacaoFormatada].sort((a, b) => b.consultas - a.consultas)[0];
      if (melhorDia && melhorDia.consultas > 0) {
        insights.push({
          tipo: "positivo",
          titulo: `Pico de Procura às ${melhorDia.dia}s`,
          descricao: `As ${melhorDia.dia}s têm a maior taxa de ocupação (${melhorDia.pct}%). Considere optimizar a escala neste dia.`,
          impacto: "alto",
          modulo: "Agenda",
        });
      }

      // Insight de Churn (Utentes sem consulta há > 6 meses)
      const seisMesesInativos = new Date();
      seisMesesInativos.setMonth(seisMesesInativos.getMonth() - 6);
      const inativos = await db
        .select({ count: count() })
        .from(utentes)
        .where(and(eq(utentes.ativo, true), sql`${utentes.id} NOT IN (SELECT utente_id FROM consultas WHERE data_hora_inicio > ${seisMesesInativos})`));
      
      const totalInativos = Number(inativos[0]?.count) || 0;
      if (totalInativos > 0) {
        insights.push({
          tipo: "alerta",
          titulo: "Utentes em Risco de Abandono",
          descricao: `Identificámos ${totalInativos} utentes sem consultas nos últimos 6 meses. Recomendamos uma campanha de reactivação.`,
          impacto: "alto",
          modulo: "Marketing",
        });
      }

      // Insight de Stocks
      const stocksBaixos = await db
        .select({ count: count() })
        .from(stocks)
        .where(and(eq(stocks.ativo, true), sql`${stocks.quantidade} <= ${stocks.quantidadeMinima}`));
      
      const totalBaixo = Number(stocksBaixos[0]?.count) || 0;
      if (totalBaixo > 0) {
        insights.push({
          tipo: "negativo",
          titulo: "Ruptura de Stock Iminente",
          descricao: `Existem ${totalBaixo} produtos com quantidade abaixo do nível crítico. Verifique o inventário.`,
          impacto: "alto",
          modulo: "Stocks",
        });
      }

      const mult = input.periodo === "semana" ? 7 : input.periodo === "mes" ? 30 : 90;
      
      // Calcular variação de receita baseada em tendência real
      let variacaoReceita = 0;
      if (tendenciaMensal.length >= 2) {
        const ultimoMes = Number(tendenciaMensal[tendenciaMensal.length - 1]?.receita) || 0;
        const mesAnterior = Number(tendenciaMensal[tendenciaMensal.length - 2]?.receita) || 0;
        if (mesAnterior > 0) {
          variacaoReceita = ((ultimoMes - mesAnterior) / mesAnterior) * 100;
        }
      }
      
      // Calcular ocupação média real
      const ocupacaoMedia = ocupacaoFormatada.reduce((acc, d) => acc + d.pct, 0) / 7;
      
      // Prever consultas baseado em ocupação média e slots reais da BD
      const consultasPrevistas = Math.round((ocupacaoMedia / 100) * slotsPorDia * mult);
      
      // Prever novos utentes: média diária dos últimos 30 dias × período
      const novosUtentesPrevistos = Math.round((novosUtentes30Dias / 30) * mult);
      
      // Calcular score de saúde da clínica baseado em métricas reais e meta configurada
      let scoreSaude = 50; // Base
      if (mediaDiaria > metaReceitaDiaria) scoreSaude += 15; // Receita acima da meta configurada
      if (ocupacaoMedia > 70) scoreSaude += 15; // Boa ocupação
      if (variacaoReceita > 0) scoreSaude += 10; // Tendência positiva
      if (totalInativos < 5) scoreSaude += 10; // Poucos utentes inativos

      return {
        success: true,
        previsoes: {
          receitaPrevista: mediaDiaria * mult,
          variacaoReceita: Number(variacaoReceita.toFixed(1)),
          ocupacaoMedia: Number(ocupacaoMedia.toFixed(1)),
          novosUtentesPrevistos,
          consultasPrevistas,
          ocupacaoPrevista: Math.round(ocupacaoMedia),
        },
        graficos: {
          ocupacaoDia: ocupacaoFormatada,
          tendenciaMensal: tendenciaMensal.map(t => ({
            mes: t.mes,
            receita: Number(t.receita) || 0,
            consultas: Number(t.consultas) || 0,
          })),
        },
        insights,
        scoreSaude: Math.min(100, scoreSaude),
      };
    }),

  /**
   * Prever probabilidade de no-show de uma consulta específica
   * Usa o predictiveEngine com fatores históricos reais
   */
  preverNoShow: protectedProcedure
    .input(z.object({ consultaId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      try {
        const resultado = await predictNoShowProbability(input.consultaId);
        return { success: true, ...resultado };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar pedido de IA. Tente novamente mais tarde." });
      }
    }),

  /**
   * Projeção financeira para os próximos N dias
   * Usa preços reais do catalogoTratamentos
   */
  projetarReceita: protectedProcedure
    .input(z.object({ diasAdiante: z.number().min(1).max(365).default(30) }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      try {
        const resultado = await projectFinancialForecast(input.diasAdiante);
        return { success: true, ...resultado };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar pedido de IA. Tente novamente mais tarde." });
      }
    }),

  /**
   * Análise de tendências dos tratamentos mais frequentes (90 dias)
   */
  analisarTendencias: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      try {
        const tendencias = await analyzeTrendingTreatments();
        return { success: true, tendencias };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar pedido de IA. Tente novamente mais tarde." });
      }
    }),

  /**
   * Gerar insights automáticos combinando todos os modelos preditivos
   */
  gerarInsights: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      try {
        const insights = await generateAutoInsights();
        return { success: true, insights };
      } catch (err: any) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar pedido de IA. Tente novamente mais tarde." });
      }
    }),
});
