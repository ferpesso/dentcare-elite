/**
 * Router de Dentistas — Gestão de Médicos e Relatório de Comissões
 * DentCare Elite V32.8 CORRIGIDO
 * 
 * CORREÇÕES V32.8:
 * - obterFichaDentista: LEFT JOIN nas comissões para não perder dados quando não há comissões
 * - obterFichaDentista: Resumo financeiro robusto — combina faturas + tratamentos + comissões
 * - obterFichaDentista: Inclui faturas na resposta e nova tab "Faturas" no frontend
 * - obterFichaDentista: Cálculo de comissões pendentes/pagas mesmo sem tabela comissoes_medicos
 * - obterFichaDentista: Limite de registos aumentado para 500
 * - LEFT JOIN em utentes nas comissões para evitar perda de dados com utentes removidos
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { medicos, comissoesMedicos, faturas, tratamentos, consultas, utentes, pagamentosComissoes } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, sum, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";

/** Converte decimal (string | number | null) para número seguro */
function safeNum(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

export const dentistasRouter = router({
  listar: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      // FIX V32.5.1: Filtrar apenas médicos ativos
      const results = await db.select().from(medicos).where(eq(medicos.ativo, true));
      return { success: true, dentistas: results };
    }),

  obterPorId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const medico = await db.select().from(medicos).where(eq(medicos.id, input.id)).limit(1);
      if (!medico.length) throw new TRPCError({ code: "NOT_FOUND" });
      return { success: true, dentista: medico[0] };
    }),

  criar: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      cedulaProfissional: z.string().min(1),
      especialidade: z.string().optional(),
      telemovel: z.string().optional(),
      email: z.string().email().optional(),
      percentualComissao: z.number().min(0).max(100).optional(),
      tipoRemuneracao: z.enum(["percentual", "percentual_diaria"]).optional(),
      valorDiaria: z.number().min(0).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "medicos.create")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await db.insert(medicos).values({
        nome: input.nome,
        cedulaProfissional: input.cedulaProfissional,
        especialidade: input.especialidade ?? null,
        telemovel: input.telemovel ?? null,
        email: input.email ?? null,
        percentualComissao: String(input.percentualComissao ?? 30),
        tipoRemuneracao: input.tipoRemuneracao ?? "percentual",
        valorDiaria: String(input.valorDiaria ?? 0),
      });
      await logAuditAction(ctx.user, { acao: "create", tabela: "medicos", registoId: result.insertId, descricao: `Médico criado: ${input.nome}` });
      return { success: true, id: result.insertId };
    }),

  actualizar: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(2).optional(),
      cedulaProfissional: z.string().optional(),
      especialidade: z.string().optional(),
      telemovel: z.string().optional(),
      email: z.string().email().optional(),
      percentualComissao: z.number().min(0).max(100).optional(),
      tipoRemuneracao: z.enum(["percentual", "percentual_diaria"]).optional(),
      valorDiaria: z.number().min(0).optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "medicos.update")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, percentualComissao, valorDiaria, tipoRemuneracao, ...rest } = input;
      const update: any = { ...rest, updatedAt: new Date() };
      if (percentualComissao !== undefined) update.percentualComissao = String(percentualComissao);
      if (tipoRemuneracao !== undefined) update.tipoRemuneracao = tipoRemuneracao;
      if (valorDiaria !== undefined) update.valorDiaria = String(valorDiaria);
      await db.update(medicos).set(update).where(eq(medicos.id, id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "medicos", registoId: id, descricao: `Médico actualizado: ${id}` });
      return { success: true };
    }),

  desactivar: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "medicos.delete")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(medicos).set({ ativo: false, updatedAt: new Date() }).where(eq(medicos.id, input.id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "medicos", registoId: input.id, descricao: `Médico desactivado: ${input.id}` });
      return { success: true };
    }),

  /**
   * V32.8 CORRIGIDO: Ficha completa do dentista com resumo financeiro robusto
   * 
   * Correções principais:
   * - LEFT JOIN nas comissões para não perder dados
   * - Busca faturas directas + via tratamento de forma robusta
   * - Resumo financeiro combina TODAS as fontes de dados
   * - Inclui faturas na resposta para nova tab "Faturas"
   */
  obterFichaDentista: protectedProcedure
    .input(z.object({ medicoId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // 1. Dados do médico
      const [medico] = await db.select().from(medicos).where(eq(medicos.id, input.medicoId)).limit(1);
      if (!medico) throw new TRPCError({ code: "NOT_FOUND", message: "Dentista não encontrado" });

      // 2. Tratamentos do médico (LEFT JOIN para não perder tratamentos sem utente)
      let tratamentosMedico: any[] = [];
      try {
        tratamentosMedico = await db.select({
          id: tratamentos.id,
          descricao: tratamentos.descricao,
          estado: tratamentos.estado,
          valorBruto: tratamentos.valorBruto,
          valorComissao: tratamentos.valorComissao,
          lucroClinica: tratamentos.lucroClinica,
          dataInicio: tratamentos.dataInicio,
          utenteNome: utentes.nome,
        })
          .from(tratamentos)
          .leftJoin(utentes, eq(tratamentos.utenteId, utentes.id))
          .where(eq(tratamentos.medicoId, input.medicoId))
          .orderBy(desc(tratamentos.dataInicio))
          .limit(200);
      } catch (e) {
        console.error("[obterFichaDentista] Erro ao buscar tratamentos:", e);
        tratamentosMedico = [];
      }

      // 3. Consultas do médico (LEFT JOIN para não perder consultas sem utente)
      let consultasMedico: any[] = [];
      try {
        consultasMedico = await db.select({
          id: consultas.id,
          dataHoraInicio: consultas.dataHoraInicio,
          dataHoraFim: consultas.dataHoraFim,
          estado: consultas.estado,
          tipoConsulta: consultas.tipoConsulta,
          utenteNome: utentes.nome,
        })
          .from(consultas)
          .leftJoin(utentes, eq(consultas.utenteId, utentes.id))
          .where(eq(consultas.medicoId, input.medicoId))
          .orderBy(desc(consultas.dataHoraInicio))
          .limit(200);
      } catch (e) {
        console.error("[obterFichaDentista] Erro ao buscar consultas:", e);
        consultasMedico = [];
      }

      // 4. Comissões registadas (LEFT JOIN em utentes e faturas para robustez)
      let comissoesRegistadas: any[] = [];
      try {
        comissoesRegistadas = await db.select({
          id: comissoesMedicos.id,
          faturaId: comissoesMedicos.faturaId,
          tratamentoId: comissoesMedicos.tratamentoId,
          valorFatura: comissoesMedicos.valorFatura,
          percentualComissao: comissoesMedicos.percentualComissao,
          valorComissao: comissoesMedicos.valorComissao,
          estado: comissoesMedicos.estado,
          dataPagamentoUtente: comissoesMedicos.dataPagamentoUtente,
          dataPagamentoMedico: comissoesMedicos.dataPagamentoMedico,
          utenteNome: utentes.nome,
          numeroFatura: faturas.numeroFatura,
        })
          .from(comissoesMedicos)
          .leftJoin(utentes, eq(comissoesMedicos.utenteId, utentes.id))
          .leftJoin(faturas, eq(comissoesMedicos.faturaId, faturas.id))
          .where(eq(comissoesMedicos.medicoId, input.medicoId))
          .orderBy(desc(comissoesMedicos.dataPagamentoUtente));
      } catch (e) {
        // Tabela pode ainda não existir — silenciar
        console.warn("[obterFichaDentista] Tabela comissoes_medicos não acessível:", (e as any)?.message || e);
        comissoesRegistadas = [];
      }

      // 5. Faturas associadas ao médico (directamente OU via tratamento)
      let faturasMedico: any[] = [];
      try {
        // 5a. Faturas com medicoId directo
        const faturasDirect = await db.select({
          id: faturas.id,
          numeroFatura: faturas.numeroFatura,
          valorTotal: faturas.valorTotal,
          valorBase: faturas.valorBase,
          valorIva: faturas.valorIva,
          estado: faturas.estado,
          dataEmissao: faturas.dataEmissao,
          dataVencimento: faturas.dataVencimento,
          tratamentoId: faturas.tratamentoId,
          metodoPagamento: faturas.metodoPagamento,
          utenteNome: utentes.nome,
        })
          .from(faturas)
          .leftJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(eq(faturas.medicoId, input.medicoId))
          .orderBy(desc(faturas.dataEmissao))
          .limit(500);

        // 5b. Faturas via tratamento (quando fatura.medicoId é null mas tratamento.medicoId corresponde)
        const tratamentoIds = tratamentosMedico.map(t => t.id).filter(Boolean);
        let faturasViaTratamento: any[] = [];
        if (tratamentoIds.length > 0) {
          const directIds = new Set(faturasDirect.map(f => f.id));
          try {
            const faturasFromTratamentos = await db.select({
              id: faturas.id,
              numeroFatura: faturas.numeroFatura,
              valorTotal: faturas.valorTotal,
              valorBase: faturas.valorBase,
              valorIva: faturas.valorIva,
              estado: faturas.estado,
              dataEmissao: faturas.dataEmissao,
              dataVencimento: faturas.dataVencimento,
              tratamentoId: faturas.tratamentoId,
              metodoPagamento: faturas.metodoPagamento,
              utenteNome: utentes.nome,
            })
              .from(faturas)
              .leftJoin(utentes, eq(faturas.utenteId, utentes.id))
              .innerJoin(tratamentos, eq(faturas.tratamentoId, tratamentos.id))
              .where(eq(tratamentos.medicoId, input.medicoId))
              .orderBy(desc(faturas.dataEmissao))
              .limit(500);
            // Evitar duplicados
            faturasViaTratamento = faturasFromTratamentos.filter(f => !directIds.has(f.id));
          } catch (e) {
            // Silenciar — pode não haver faturas via tratamento
          }
        }

        faturasMedico = [...faturasDirect, ...faturasViaTratamento]
          .sort((a, b) => {
            const dateA = a.dataEmissao ? new Date(a.dataEmissao).getTime() : 0;
            const dateB = b.dataEmissao ? new Date(b.dataEmissao).getTime() : 0;
            return dateB - dateA;
          });
      } catch (e) {
        console.error("[obterFichaDentista] Erro ao buscar faturas:", e);
        faturasMedico = [];
      }

      // 6. Resumo financeiro ROBUSTO — combina faturas + tratamentos + comissões
      const percentComissao = safeNum(medico.percentualComissao) / 100;
      const faturasValidas = faturasMedico.filter((f) => f.estado !== "anulada");
      const faturasAnuladas = faturasMedico.filter((f) => f.estado === "anulada");
      const faturasPagas = faturasMedico.filter((f) => f.estado === "paga");
      const faturasPendentes = faturasMedico.filter((f) => f.estado === "pendente");

      const comissoesValidas = comissoesRegistadas.filter((c) => c.estado !== "anulada");
      const comissoesPendentesRegistadas = comissoesValidas
        .filter((c) => c.estado === "pendente")
        .reduce((acc, c) => acc + safeNum(c.valorComissao), 0);
      const comissoesPagasRegistadas = comissoesValidas
        .filter((c) => c.estado === "paga")
        .reduce((acc, c) => acc + safeNum(c.valorComissao), 0);

      let totalFaturado: number;
      let totalBaseFaturada: number;
      let totalComissao: number;
      let comissaoPendenteFinal: number;
      let lucroClinicaFinal: number;

      if (faturasValidas.length > 0) {
        // Caminho principal: calcular com base nas faturas reais associadas ao médico
        totalFaturado = faturasValidas.reduce((acc, f) => acc + safeNum(f.valorTotal), 0);
        totalBaseFaturada = faturasValidas.reduce((acc, f) => acc + safeNum(f.valorBase), 0);

        // Calcular comissão: usar comissões registadas + estimar para faturas sem comissão
        const faturasComComissao = new Set(comissoesValidas.map((c) => Number(c.faturaId)).filter(Boolean));
        const comissaoCalculadaEmFalta = faturasValidas
          .filter((f) => !faturasComComissao.has(Number(f.id)))
          .reduce((acc, f) => acc + (safeNum(f.valorBase) * percentComissao), 0);

        totalComissao = comissoesValidas.reduce((acc, c) => acc + safeNum(c.valorComissao), 0)
          + comissaoCalculadaEmFalta;
        comissaoPendenteFinal = comissoesPendentesRegistadas + comissaoCalculadaEmFalta;
        lucroClinicaFinal = totalBaseFaturada - totalComissao;
      } else if (tratamentosMedico.length > 0) {
        // Fallback: calcular com base nos tratamentos do médico
        const tratamentosComValor = tratamentosMedico.filter(t => safeNum(t.valorBruto) > 0);
        totalFaturado = tratamentosComValor.reduce((acc, t) => acc + safeNum(t.valorBruto), 0);
        totalBaseFaturada = totalFaturado;
        totalComissao = tratamentosComValor.reduce((acc, t) => acc + safeNum(t.valorComissao), 0);
        
        // Se há comissões registadas, usar esses valores; senão, estimar
        if (comissoesValidas.length > 0) {
          comissaoPendenteFinal = comissoesPendentesRegistadas;
        } else {
          comissaoPendenteFinal = totalComissao;
        }
        lucroClinicaFinal = totalBaseFaturada - totalComissao;
      } else {
        // Sem faturas nem tratamentos — usar apenas comissões se existirem
        totalFaturado = 0;
        totalBaseFaturada = 0;
        totalComissao = comissoesValidas.reduce((acc, c) => acc + safeNum(c.valorComissao), 0);
        comissaoPendenteFinal = comissoesPendentesRegistadas;
        lucroClinicaFinal = 0;
      }

      const totalConsultas = consultasMedico.length;
      const consultasRealizadas = consultasMedico.filter(c => c.estado === "realizada").length;
      const tratamentosConcluidos = tratamentosMedico.filter(t => t.estado === "concluido").length;

      return {
        medico,
        tratamentos: tratamentosMedico,
        faturas: faturasMedico,
        consultas: consultasMedico,
        comissoes: comissoesValidas,
        resumo: {
          totalFaturado,
          totalBaseFaturada,
          totalComissaoTratamentos: totalComissao,
          totalLucroClinica: lucroClinicaFinal,
          comissoesPendentes: comissaoPendenteFinal,
          comissoesPagas: comissoesPagasRegistadas,
          totalConsultas,
          consultasRealizadas,
          tratamentosConcluidos,
          totalTratamentos: tratamentosMedico.length,
          totalFaturas: faturasValidas.length,
          totalFaturasAnuladas: faturasAnuladas.length,
          totalFaturasPagas: faturasPagas.length,
          totalFaturasPendentes: faturasPendentes.length,
        },
      };
    }),

  /**
   * NOVO V32.4: Relatório de comissões de um médico (com filtro por período)
   */
  obterRelatorioComissoes: protectedProcedure
    .input(z.object({
      medicoId: z.number().int().positive(),
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
      estado: z.enum(["todos", "pendente", "paga", "anulada"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const conditions: any[] = [eq(comissoesMedicos.medicoId, input.medicoId)];
        if (input.dataInicio) conditions.push(gte(comissoesMedicos.dataPagamentoUtente, new Date(input.dataInicio)));
        if (input.dataFim) conditions.push(lte(comissoesMedicos.dataPagamentoUtente, new Date(input.dataFim)));
        if (input.estado && input.estado !== "todos") conditions.push(eq(comissoesMedicos.estado, input.estado));

        const comissoesResult = await db.select({
          id: comissoesMedicos.id,
          faturaId: comissoesMedicos.faturaId,
          tratamentoId: comissoesMedicos.tratamentoId,
          valorFatura: comissoesMedicos.valorFatura,
          percentualComissao: comissoesMedicos.percentualComissao,
          valorComissao: comissoesMedicos.valorComissao,
          estado: comissoesMedicos.estado,
          dataPagamentoUtente: comissoesMedicos.dataPagamentoUtente,
          dataPagamentoMedico: comissoesMedicos.dataPagamentoMedico,
          utenteNome: utentes.nome,
          numeroFatura: faturas.numeroFatura,
        })
          .from(comissoesMedicos)
          .leftJoin(utentes, eq(comissoesMedicos.utenteId, utentes.id))
          .leftJoin(faturas, eq(comissoesMedicos.faturaId, faturas.id))
          .where(and(...conditions))
          .orderBy(desc(comissoesMedicos.dataPagamentoUtente));

        const totalPendente = comissoesResult
          .filter(c => c.estado === "pendente")
          .reduce((acc, c) => acc + safeNum(c.valorComissao), 0);
        const totalPago = comissoesResult
          .filter(c => c.estado === "paga")
          .reduce((acc, c) => acc + safeNum(c.valorComissao), 0);
        const totalGeral = comissoesResult
          .reduce((acc, c) => acc + safeNum(c.valorComissao), 0);

        return {
          comissoes: comissoesResult,
          resumo: {
            totalPendente,
            totalPago,
            totalGeral,
            totalRegistos: comissoesResult.length,
          },
        };
      } catch (e) {
        // Tabela pode ainda não existir
        return {
          comissoes: [],
          resumo: { totalPendente: 0, totalPago: 0, totalGeral: 0, totalRegistos: 0 },
        };
      }
    }),

  /**
   * NOVO V32.4: Marcar comissão como paga ao médico
   */
  marcarComissaoPaga: protectedProcedure
    .input(z.object({
      comissaoId: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.update") && !hasPermission(ctx.user, "comissoes.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir comissões" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(comissoesMedicos).set({
        estado: "paga",
        dataPagamentoMedico: new Date(),
        updatedAt: new Date(),
      }).where(eq(comissoesMedicos.id, input.comissaoId));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "comissoes_medicos",
        registoId: input.comissaoId,
        descricao: `Comissão ${input.comissaoId} marcada como paga ao médico`,
      });

      return { success: true };
    }),

  /**
   * NOVO V32.4: Marcar múltiplas comissões como pagas
   */
  marcarComissoesPagas: protectedProcedure
    .input(z.object({
      medicoId: z.number().int().positive(),
      comissaoIds: z.array(z.number().int().positive()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.update") && !hasPermission(ctx.user, "comissoes.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir comissões" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Se comissaoIds fornecidos, marcar apenas esses; senão, marcar todas as pendentes do médico
      if (input.comissaoIds && input.comissaoIds.length > 0) {
        for (const id of input.comissaoIds) {
          await db.update(comissoesMedicos).set({
            estado: "paga",
            dataPagamentoMedico: new Date(),
            updatedAt: new Date(),
          }).where(and(eq(comissoesMedicos.id, id), eq(comissoesMedicos.medicoId, input.medicoId)));
        }
      } else {
        await db.update(comissoesMedicos).set({
          estado: "paga",
          dataPagamentoMedico: new Date(),
          updatedAt: new Date(),
        }).where(and(eq(comissoesMedicos.medicoId, input.medicoId), eq(comissoesMedicos.estado, "pendente")));
      }

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "comissoes_medicos",
        registoId: input.medicoId,
        descricao: `Comissões do médico ${input.medicoId} marcadas como pagas`,
      });

      return { success: true };
    }),

  /**
   * V35: Registar pagamento agrupado de comissões com comprovativo
   */
  registarPagamentoComissoes: protectedProcedure
    .input(z.object({
      medicoId: z.number().int().positive(),
      comissaoIds: z.array(z.number().int().positive()).min(1),
      metodoPagamento: z.enum(["transferencia", "numerario", "cheque", "mbway", "outro"]),
      referencia: z.string().optional(),
      dataPagamento: z.string(),
      observacoes: z.string().optional(),
      comprovativoUrl: z.string().optional(),
      comprovativoNome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.update") && !hasPermission(ctx.user, "comissoes.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para gerir comissões" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Buscar as comissões selecionadas e calcular o total
      const comissoesSelecionadas = await db.select()
        .from(comissoesMedicos)
        .where(and(
          eq(comissoesMedicos.medicoId, input.medicoId),
          eq(comissoesMedicos.estado, "pendente"),
          inArray(comissoesMedicos.id, input.comissaoIds)
        ));

      if (comissoesSelecionadas.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhuma comissão pendente encontrada com os IDs fornecidos" });
      }

      const valorTotal = comissoesSelecionadas.reduce((acc, c) => acc + safeNum(c.valorComissao), 0);

      // Criar o registo de pagamento
      const [pagamento] = await db.insert(pagamentosComissoes).values({
        medicoId: input.medicoId,
        valorTotal: String(valorTotal),
        metodoPagamento: input.metodoPagamento,
        referencia: input.referencia ?? null,
        dataPagamento: new Date(input.dataPagamento),
        observacoes: input.observacoes ?? null,
        comprovativoUrl: input.comprovativoUrl ?? null,
        comprovativoNome: input.comprovativoNome ?? null,
        createdBy: ctx.user.id,
      });

      const pagamentoId = pagamento.insertId;

      // Atualizar todas as comissões selecionadas
      for (const id of input.comissaoIds) {
        await db.update(comissoesMedicos).set({
          estado: "paga",
          dataPagamentoMedico: new Date(input.dataPagamento),
          pagamentoComissaoId: pagamentoId,
          updatedAt: new Date(),
        }).where(and(eq(comissoesMedicos.id, id), eq(comissoesMedicos.medicoId, input.medicoId)));
      }

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "pagamentos_comissoes",
        registoId: pagamentoId,
        descricao: `Pagamento de comissões #${pagamentoId} registado para médico ${input.medicoId} — ${comissoesSelecionadas.length} comissões, total: ${valorTotal.toFixed(2)}€`,
      });

      return { success: true, pagamentoId, valorTotal, comissoesCount: comissoesSelecionadas.length };
    }),

  /**
   * V35: Listar pagamentos de comissões de um médico (histórico de comprovativos)
   */
  listarPagamentosComissoes: protectedProcedure
    .input(z.object({ medicoId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const pagamentos = await db.select()
          .from(pagamentosComissoes)
          .where(eq(pagamentosComissoes.medicoId, input.medicoId))
          .orderBy(desc(pagamentosComissoes.dataPagamento));

        // Para cada pagamento, buscar as comissões associadas
        const pagamentosComDetalhes = await Promise.all(
          pagamentos.map(async (p) => {
            const comissoesAssociadas = await db.select({
              id: comissoesMedicos.id,
              faturaId: comissoesMedicos.faturaId,
              valorFatura: comissoesMedicos.valorFatura,
              valorComissao: comissoesMedicos.valorComissao,
              percentualComissao: comissoesMedicos.percentualComissao,
              utenteNome: utentes.nome,
              numeroFatura: faturas.numeroFatura,
            })
              .from(comissoesMedicos)
              .leftJoin(utentes, eq(comissoesMedicos.utenteId, utentes.id))
              .leftJoin(faturas, eq(comissoesMedicos.faturaId, faturas.id))
              .where(eq(comissoesMedicos.pagamentoComissaoId, p.id));

            return { ...p, comissoes: comissoesAssociadas };
          })
        );

        return { pagamentos: pagamentosComDetalhes };
      } catch (e) {
        console.error("[listarPagamentosComissoes] Erro:", e);
        return { pagamentos: [] };
      }
    }),

  /**
   * V35: Upload de comprovativo de pagamento (base64)
   */
  uploadComprovativo: protectedProcedure
    .input(z.object({
      pagamentoId: z.number().int().positive(),
      fileBase64: z.string(),
      fileName: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "financeiro.update") && !hasPermission(ctx.user, "comissoes.update")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Guardar o ficheiro localmente
      const fs = await import("fs");
      const path = await import("path");
      const uploadsDir = path.join(process.cwd(), "uploads", "comprovativos");
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

      const ext = path.extname(input.fileName) || ".pdf";
      const safeFileName = `comprovativo_${input.pagamentoId}_${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, safeFileName);

      // Remover prefixo data:... se existir
      const base64Data = input.fileBase64.replace(/^data:[^;]+;base64,/, "");
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));

      const fileUrl = `/uploads/comprovativos/${safeFileName}`;

      await db.update(pagamentosComissoes).set({
        comprovativoUrl: fileUrl,
        comprovativoNome: input.fileName,
        updatedAt: new Date(),
      }).where(eq(pagamentosComissoes.id, input.pagamentoId));

      return { success: true, url: fileUrl };
    }),
});
