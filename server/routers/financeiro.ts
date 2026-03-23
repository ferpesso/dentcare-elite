/**
 * Router de Gestão Financeira - Motor de Cálculo Automático
 * 
 * Fórmula Base: Valor Bruto - Custos Diretos = Base de Cálculo
 * Comissão = Base de Cálculo * % Comissão do Médico
 * Lucro Clínica = Base de Cálculo - Comissão
 * 
 * CORRIGIDO V32.6:
 * - NOVO endpoint listarFaturas para compatibilidade com FaturacaoPage
 * - obterResumoCompleto corrigido: .mapWith(Number) em totalRecebido/totalPendente
 * - Inputs de data agora aceitam tanto ISO datetime como date-only strings
 * - Arredondamento bancário em todos os cálculos monetários
 * - consultasRealizadas e utentesNovos calculados a partir da BD
 */
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { tratamentos, medicos, faturas, saftSequences, consultas, utentes } from "../../drizzle/schema";
import { sum, and, gte, lte, sql, eq, desc, isNull } from "drizzle-orm";

/**
 * Helper: converte string de data ("2026-03-01" ou ISO datetime) para Date válido.
 * Evita erros de z.string().datetime() quando o frontend envia apenas "YYYY-MM-DD".
 */
function parseDateInput(val: string): Date {
  if (val.includes("T")) return new Date(val);
  return new Date(val + "T00:00:00.000Z");
}
function parseDateEndInput(val: string): Date {
  if (val.includes("T")) return new Date(val);
  return new Date(val + "T23:59:59.999Z");
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}
function safeDecimal(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

export const financeiroRouter = router({
  obterRentabilidadeMedicos: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder à rentabilidade dos médicos." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        const result = await db.select({
            medicoId: medicos.id,
            medico: medicos.nome,
            especialidade: medicos.especialidade,
            percentualComissao: medicos.percentualComissao,
            faturacao: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            custos: sql<number>`COALESCE(sum(${tratamentos.custosDiretos}), 0)`.mapWith(Number),
            lucro: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
            comissao: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            consultas: sql<number>`count(${tratamentos.id})`.mapWith(Number),
          })
          .from(tratamentos)
          .innerJoin(medicos, eq(tratamentos.medicoId, medicos.id))
          .where(and(
            gte(tratamentos.dataInicio, startDate),
            lte(tratamentos.dataInicio, endDate),
            eq(tratamentos.estado, "concluido")
          ))
          .groupBy(medicos.id, medicos.nome, medicos.especialidade, medicos.percentualComissao);

        return result.map(r => ({
          ...r,
          faturacao: r.faturacao || 0,
          custos: r.custos || 0,
          lucro: r.lucro || 0,
          comissao: r.comissao || 0,
          consultas: r.consultas || 0,
          ticketMedio: (r.consultas || 0) > 0 ? roundMoney((r.faturacao || 0) / r.consultas) : 0,
        }));
      } catch (error) {
        console.error("Erro ao obter rentabilidade dos médicos:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular a rentabilidade dos médicos." });
      }
    }),

  obterAnaliseIVA: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder à análise de IVA." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        const result = await db.select({
            ivaFaturado: sql<number>`COALESCE(sum(${faturas.valorIva}), 0)`.mapWith(Number),
            ivaRecuperavel: sql<number>`COALESCE(sum(CASE WHEN ${faturas.tipoDocumento} = 'recibo' THEN ${faturas.valorIva} ELSE 0 END), 0)`.mapWith(Number),
          })
          .from(faturas)
          .where(and(
            gte(faturas.dataEmissao, startDate),
            lte(faturas.dataEmissao, endDate),
            eq(faturas.estado, "paga")
          ));

        const summary = result[0];

        return {
          ivaFaturado: summary?.ivaFaturado || 0,
          ivaRecuperavel: summary?.ivaRecuperavel || 0,
          saldoIVA: (summary?.ivaRecuperavel || 0) - (summary?.ivaFaturado || 0),
        };
      } catch (error) {
        console.error("Erro ao obter análise de IVA:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular a análise de IVA." });
      }
    }),

  /**
   * Registar um novo tratamento (fase de orçamento)
   * DEPRECATED: Usar tratamentos.criarTratamento para integridade clínica
   */
  registarTratamento: protectedProcedure
    .input(
      z.object({
        utenteId: z.number().int().positive(),
        medicoId: z.number().int().positive(),
        descricao: z.string().min(3),
        valorBruto: z.number().positive(),
        custosDiretos: z.number().nonnegative().default(0),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      throw new TRPCError({ 
        code: "BAD_REQUEST", 
        message: "Este método foi descontinuado. Por favor, utilize a interface de Tratamentos Clínicos para garantir a integridade dos dados e a emissão correcta de documentos fiscais." 
      });
    }),

  obterResumo: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao resumo financeiro." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        const result = await db.select({
            totalFaturado: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            totalComissoes: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            lucroTotal: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
          })
          .from(tratamentos)
          .where(and(
            gte(tratamentos.createdAt, startDate),
            lte(tratamentos.createdAt, endDate),
            eq(tratamentos.estado, "concluido")
          ));

        const summary = result[0];

        return {
          totalFaturado: summary?.totalFaturado || 0,
          totalComissoes: summary?.totalComissoes || 0,
          lucroTotal: summary?.lucroTotal || 0,
        };
      } catch (error) {
        console.error("Erro ao obter resumo financeiro:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular o resumo financeiro." });
      }
    }),

  /**
   * Relatório mensal completo
   * CORRIGIDO V32.6: consultasRealizadas e utentesNovos calculados a partir da BD
   */
  obterRelatorioMensal: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao relatório mensal." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        // 1. Resumo agregado de tratamentos
        const resumoResult = await db.select({
            receita: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            comissoes: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            custos: sql<number>`COALESCE(sum(${tratamentos.custosDiretos}), 0)`.mapWith(Number),
            lucro: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
            tratamentosRealizados: sql<number>`count(${tratamentos.id})`.mapWith(Number),
          })
          .from(tratamentos)
          .where(and(
            gte(tratamentos.createdAt, startDate),
            lte(tratamentos.createdAt, endDate),
          ));

        // 2. Consultas realizadas no período
        const consultasResult = await db.select({
            total: sql<number>`count(${consultas.id})`.mapWith(Number),
          })
          .from(consultas)
          .where(and(
            gte(consultas.dataHoraInicio, startDate),
            lte(consultas.dataHoraInicio, endDate),
            eq(consultas.estado, "realizada")
          ));

        // 3. Utentes novos no período
        const utentesResult = await db.select({
            total: sql<number>`count(${utentes.id})`.mapWith(Number),
          })
          .from(utentes)
          .where(and(
            gte(utentes.createdAt, startDate),
            lte(utentes.createdAt, endDate),
          ));

        // 4. Gráfico por semana do mês
        const graficoResult = await db.select({
            mes: sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`,
            receita: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            comissoes: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            lucro: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
          })
          .from(tratamentos)
          .where(and(
            gte(tratamentos.createdAt, startDate),
            lte(tratamentos.createdAt, endDate),
          ))
          .groupBy(sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`)
          .orderBy(sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`);

        const r = resumoResult[0];
        return {
          receita: r?.receita ?? 0,
          comissoes: r?.comissoes ?? 0,
          custos: r?.custos ?? 0,
          lucro: r?.lucro ?? 0,
          consultasRealizadas: consultasResult[0]?.total ?? 0,
          tratamentosRealizados: r?.tratamentosRealizados ?? 0,
          utentesNovos: utentesResult[0]?.total ?? 0,
          grafico: graficoResult,
        };
      } catch (error) {
        console.error("Erro ao obter relatório mensal:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter relatório mensal." });
      }
    }),

  /**
   * Evolução mensal dos últimos N meses (para gráfico de tendência)
   */
  obterEvolucaoMensal: protectedProcedure
    .input(
      z.object({
        meses: z.number().int().min(1).max(24).default(6),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder à evolução financeira." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const dataInicio = new Date();
        dataInicio.setMonth(dataInicio.getMonth() - input.meses);
        dataInicio.setDate(1);
        dataInicio.setHours(0, 0, 0, 0);

        const result = await db.select({
            mesRaw: sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`,
            receita: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            comissoes: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            custos: sql<number>`COALESCE(sum(${tratamentos.custosDiretos}), 0)`.mapWith(Number),
            lucro: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
            totalTratamentos: sql<number>`count(${tratamentos.id})`.mapWith(Number),
          })
          .from(tratamentos)
          .where(gte(tratamentos.createdAt, dataInicio))
          .groupBy(sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`)
          .orderBy(sql<string>`DATE_FORMAT(${tratamentos.createdAt}, '%Y-%m')`);

        // Formatar nomes dos meses em português
        const mesesPT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        const mesesFormatados = result.map(r => {
          const [ano, mesNum] = (r.mesRaw || "").split("-");
          const mesIdx = parseInt(mesNum || "1") - 1;
          return {
            mes: `${mesesPT[mesIdx] || mesNum} ${ano?.slice(2) || ""}`,
            receita: r.receita,
            comissoes: r.comissoes,
            custos: r.custos,
            lucro: r.lucro,
            totalTratamentos: r.totalTratamentos,
          };
        });

        return { meses: mesesFormatados };
      } catch (error) {
        console.error("Erro ao obter evolução mensal:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular a evolução mensal." });
      }
    }),

  /**
   * Movimentos recentes (tratamentos + faturas) para tabela de detalhe
   */
  obterMovimentosRecentes: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        limite: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder aos movimentos." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        // Tratamentos recentes com nome do utente e médico
        const tratamentosRecentes = await db.select({
            id: tratamentos.id,
            descricao: tratamentos.descricao,
            valorBruto: tratamentos.valorBruto,
            estado: tratamentos.estado,
            dataInicio: tratamentos.dataInicio,
            createdAt: tratamentos.createdAt,
            utenteNome: utentes.nome,
            medicoNome: medicos.nome,
          })
          .from(tratamentos)
          .innerJoin(utentes, eq(tratamentos.utenteId, utentes.id))
          .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
          .where(and(
            gte(tratamentos.createdAt, startDate),
            lte(tratamentos.createdAt, endDate),
          ))
          .orderBy(desc(tratamentos.createdAt))
          .limit(input.limite);

        // Faturas recentes com nome do utente
        // Excluir faturas geradas automaticamente por tratamentos (tratamentoId != null)
        const faturasRecentes = await db.select({
            id: faturas.id,
            numeroFatura: faturas.numeroFatura,
            valorTotal: faturas.valorTotal,
            valorBase: faturas.valorBase,
            taxaIva: faturas.taxaIva,
            estado: faturas.estado,
            dataEmissao: faturas.dataEmissao,
            utenteNome: utentes.nome,
            medicoNome: medicos.nome,
          })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .leftJoin(medicos, eq(faturas.medicoId, medicos.id))
          .where(and(
            gte(faturas.dataEmissao, startDate),
            lte(faturas.dataEmissao, endDate),
            isNull(faturas.tratamentoId),
          ))
          .orderBy(desc(faturas.dataEmissao))
          .limit(input.limite);

        return {
          tratamentos: tratamentosRecentes,
          faturas: faturasRecentes,
        };
      } catch (error) {
        console.error("Erro ao obter movimentos recentes:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter movimentos recentes." });
      }
    }),

  /**
   * NOVO V32.6: listarFaturas — endpoint para compatibilidade com FaturacaoPage
   * A FaturacaoPage chama trpc.financeiro.listarFaturas com { limite, estado }
   */
  listarFaturas: protectedProcedure
    .input(
      z.object({
        estado: z.enum(["pendente", "paga", "anulada"]).optional(),
        limite: z.number().int().min(1).max(500).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read") && !hasPermission(ctx.user, "faturacao.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder às faturas." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const conditions = [];
        if (input.estado) {
          conditions.push(eq(faturas.estado, input.estado));
        }

        const limite = input.limite || 200;

        const results = await db
          .select({
            id: faturas.id,
            numeroFatura: faturas.numeroFatura,
            tipoDocumento: faturas.tipoDocumento,
            dataEmissao: faturas.dataEmissao,
            dataVencimento: faturas.dataVencimento,
            estado: faturas.estado,
            valorBase: faturas.valorBase,
            taxaIva: faturas.taxaIva,
            valorIva: faturas.valorIva,
            valorTotal: faturas.valorTotal,
            metodoPagamento: faturas.metodoPagamento,
            observacoes: faturas.observacoes,
            utenteId: faturas.utenteId,
            utenteNome: utentes.nome,
            utenteNif: utentes.nif,
            tratamentoId: faturas.tratamentoId,
            medicoId: faturas.medicoId,
          })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(faturas.dataEmissao))
          .limit(limite);

        return { faturas: results, total: results.length };
      } catch (error) {
        console.error("Erro ao listar faturas:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao listar faturas." });
      }
    }),

  /**
   * Obter lista de faturas com filtros (endpoint original)
   */
  obterFaturas: protectedProcedure
    .input(
      z.object({
        estado: z.enum(["todos", "pendente", "paga", "anulada"]).default("todos"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder às faturas." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const conditions = [];
        if (input.estado !== "todos") {
          conditions.push(eq(faturas.estado, input.estado));
        }
        if (input.startDate) {
          conditions.push(gte(faturas.dataEmissao, parseDateInput(input.startDate)));
        }
        if (input.endDate) {
          conditions.push(lte(faturas.dataEmissao, parseDateEndInput(input.endDate)));
        }

        const result = await db.select().from(faturas)
          .where(conditions.length > 0 ? and(...conditions) : undefined)
          .orderBy(desc(faturas.dataEmissao));
        return result;
      } catch (error) {
        console.error("Erro ao obter faturas:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter faturas." });
      }
    }),

  /**
   * Estatísticas mensais — usado pelo FinanceiroPage
   */
  obterEstatisticasMensais: protectedProcedure
    .input(
      z.object({
        mes: z.number().int().min(1).max(12),
        ano: z.number().int().min(2020).max(2100),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder às estatísticas financeiras." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = new Date(input.ano, input.mes - 1, 1);
        const endDate = new Date(input.ano, input.mes, 0, 23, 59, 59, 999);

        // 1. Receita de faturas no período
        const faturasSummary = await db.select({
            totalFaturado: sql<number>`COALESCE(sum(${faturas.valorTotal}), 0)`.mapWith(Number),
            totalIva: sql<number>`COALESCE(sum(${faturas.valorIva}), 0)`.mapWith(Number),
            totalBase: sql<number>`COALESCE(sum(${faturas.valorBase}), 0)`.mapWith(Number),
          })
          .from(faturas)
          .where(and(
            gte(faturas.dataEmissao, startDate),
            lte(faturas.dataEmissao, endDate),
          ));

        // 2. Tratamentos no período
        const tratamentosSummary = await db.select({
            receita: sql<number>`COALESCE(sum(${tratamentos.valorBruto}), 0)`.mapWith(Number),
            comissoes: sql<number>`COALESCE(sum(${tratamentos.valorComissao}), 0)`.mapWith(Number),
            custos: sql<number>`COALESCE(sum(${tratamentos.custosDiretos}), 0)`.mapWith(Number),
            lucro: sql<number>`COALESCE(sum(${tratamentos.lucroClinica}), 0)`.mapWith(Number),
          })
          .from(tratamentos)
          .where(and(
            gte(tratamentos.createdAt, startDate),
            lte(tratamentos.createdAt, endDate),
          ));

        const f = faturasSummary[0];
        const t = tratamentosSummary[0];

        // Receita = max(faturas, tratamentos) para não duplicar
        const receita = Math.max(f?.totalFaturado ?? 0, t?.receita ?? 0);
        const comissoes = t?.comissoes ?? 0;
        const custos = t?.custos ?? 0;
        const lucro = receita > 0 ? roundMoney(receita - comissoes - custos) : t?.lucro ?? 0;

        return {
          stats: {
            receita: roundMoney(receita),
            comissoes: roundMoney(comissoes),
            custos: roundMoney(custos),
            lucro,
          },
        };
      } catch (error) {
        console.error("Erro ao obter estatísticas mensais:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular estatísticas mensais." });
      }
    }),

  /**
   * Wrapper obterMovimentosRecentes sem parâmetros de data obrigatórios
   * O FinanceiroPage chama com { limite: 50 } sem startDate/endDate
   */
  obterMovimentosRecentesSemData: protectedProcedure
    .input(
      z.object({
        limite: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder aos movimentos." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        // Faturas recentes (últimos 90 dias)
        const dataInicio = new Date();
        dataInicio.setDate(dataInicio.getDate() - 90);

        const faturasRecentes = await db.select({
            id: faturas.id,
            numeroFatura: faturas.numeroFatura,
            valorTotal: faturas.valorTotal,
            estado: faturas.estado,
            dataEmissao: faturas.dataEmissao,
            utenteId: faturas.utenteId,
            utenteNome: utentes.nome,
          })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(gte(faturas.dataEmissao, dataInicio))
          .orderBy(desc(faturas.dataEmissao))
          .limit(input.limite);

        // Tratamentos recentes
        const tratamentosRecentes = await db.select({
            id: tratamentos.id,
            descricao: tratamentos.descricao,
            valorBruto: tratamentos.valorBruto,
            estado: tratamentos.estado,
            dataInicio: tratamentos.dataInicio,
            utenteId: tratamentos.utenteId,
            utenteNome: utentes.nome,
            medicoNome: medicos.nome,
          })
          .from(tratamentos)
          .innerJoin(utentes, eq(tratamentos.utenteId, utentes.id))
          .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
          .where(gte(tratamentos.createdAt, dataInicio))
          .orderBy(desc(tratamentos.createdAt))
          .limit(input.limite);

        // Unificar em formato de movimentos
        const movimentos = [
          ...faturasRecentes.map(f => ({
            id: `fat-${f.id}`,
            data: f.dataEmissao,
            descricao: f.numeroFatura,
            tipo: 'Fatura' as const,
            utenteId: f.utenteId,
            utente: f.utenteNome,
            valor: safeDecimal(f.valorTotal),
            estado: f.estado,
          })),
          ...tratamentosRecentes.map(t => ({
            id: `trat-${t.id}`,
            data: t.dataInicio,
            descricao: t.descricao,
            tipo: 'Tratamento' as const,
            utenteId: t.utenteId,
            utente: t.utenteNome,
            valor: safeDecimal(t.valorBruto),
            estado: t.estado,
          })),
        ].sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
         .slice(0, input.limite);

        return { movimentos };
      } catch (error) {
        console.error("Erro ao obter movimentos recentes:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao obter movimentos recentes." });
      }
    }),

  /**
   * Resumo financeiro completo (com faturas e tratamentos)
   * CORRIGIDO V32.6: .mapWith(Number) em totalRecebido e totalPendente
   */
  obterResumoCompleto: protectedProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao resumo financeiro." });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const startDate = parseDateInput(input.startDate);
        const endDate = parseDateEndInput(input.endDate);

        const faturasSummary = await db.select({
            totalFaturado: sql<number>`COALESCE(sum(${faturas.valorTotal}), 0)`.mapWith(Number),
            totalRecebido: sql<number>`COALESCE(sum(CASE WHEN ${faturas.estado} = 'paga' THEN ${faturas.valorTotal} ELSE 0 END), 0)`.mapWith(Number),
            totalPendente: sql<number>`COALESCE(sum(CASE WHEN ${faturas.estado} = 'pendente' THEN ${faturas.valorTotal} ELSE 0 END), 0)`.mapWith(Number),
          })
          .from(faturas)
          .where(and(
            gte(faturas.dataEmissao, startDate),
            lte(faturas.dataEmissao, endDate)
          ));

        const summary = faturasSummary[0];

        return {
          totalFaturado: summary?.totalFaturado || 0,
          totalRecebido: summary?.totalRecebido || 0,
          totalPendente: summary?.totalPendente || 0,
        };
      } catch (error) {
        console.error("Erro ao obter resumo financeiro completo:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao calcular o resumo financeiro." });
      }
    }),
});
