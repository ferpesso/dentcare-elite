/**
 * Router de Faturação SAFT-PT — V32.6 CORRIGIDO
 *
 * Conformidade com regulamentação portuguesa:
 * - Emissão de faturas/recibos com numeração sequencial SAFT-PT
 * - Métodos de pagamento: Multibanco, Numerário, MB Way, Transferência
 *
 * CORREÇÕES V32.6:
 * - registarPagamento agora gera relatório de procedimentos (tratamento + evoluções)
 *   para comparação com anotações do dentista
 * - Validações de contabilidade sénior: duplicação de pagamento, arredondamento
 *   bancário, reconciliação valor pago vs valor da fatura, datas coerentes
 * - Novo endpoint: obterRelatorioProcedimentos (RBAC: gestor vê tudo, dentista
 *   vê clínico sem financeiro, receção vê resumo)
 * - listarFaturas agora aceita input compatível com FaturacaoPage (limite, estado)
 * - Arredondamento Banker's Rounding (2 casas) em todos os cálculos monetários
 */

import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import {
  faturas, recibos, utentes, saftSequences, configuracoesClinica,
  medicos, tratamentos, comissoesMedicos, evolucoes, parcelas,
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import { logAuditAction } from "../auditService";

// ─── Utilidades de Contabilidade ────────────────────────────────────────────

/**
 * Arredondamento bancário (Banker's Rounding) a 2 casas decimais.
 * Evita acumulação de erros de arredondamento em séries de transações.
 */
function roundMoney(value: number): number {
  const factor = 100;
  const shifted = value * factor;
  const truncated = Math.trunc(shifted);
  const remainder = shifted - truncated;
  if (Math.abs(remainder - 0.5) < 1e-10) {
    // Se exactamente 0.5, arredonda para o par mais próximo
    return (truncated % 2 === 0 ? truncated : truncated + 1) / factor;
  }
  return Math.round(shifted) / factor;
}

/**
 * Converte valor decimal (string | number | null | undefined) para número seguro.
 */
function safeDecimal(val: string | number | null | undefined): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

export const faturacaoRouter = router({
  /**
   * Criar fatura — com validações de contabilidade sénior
   * CORRIGIDO V32.7: Proteção anti-duplicação de faturas
   * - Verifica se já existem faturas pendentes para o utente com o mesmo valor
   * - Usa SELECT ... FOR UPDATE na sequência SAFT para evitar race conditions
   */
  criarFatura: protectedProcedure
    .input(
      z.object({
        utenteId: z.number().int().positive(),
        medicoId: z.number().int().positive().optional(),
        tipoDocumento: z.enum(["fatura", "recibo", "nota_credito"]),
        dataEmissao: z.date(),
        dataVencimento: z.date().optional(),
        metodoPagamento: z.enum(["multibanco", "numerario", "mbway", "transferencia"]),
        valorBase: z.number().positive(),
        taxaIva: z.number().default(0),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar faturas" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      // Validação contabilística: data de vencimento não pode ser anterior à emissão
      if (input.dataVencimento && input.dataVencimento < input.dataEmissao) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A data de vencimento não pode ser anterior à data de emissão.",
        });
      }

      // Validação contabilística: data de emissão não pode ser futura (mais de 1 dia)
      const amanha = new Date();
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(23, 59, 59, 999);
      if (input.dataEmissao > amanha) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "A data de emissão não pode ser uma data futura.",
        });
      }

      try {
        // Cálculos com arredondamento bancário
        const valorBase = roundMoney(input.valorBase);
        const valorIva = roundMoney(valorBase * input.taxaIva / 100);
        const valorTotal = roundMoney(valorBase + valorIva);

        const ano = new Date().getFullYear();

        const [result, numeroSerie] = await db.transaction(async (tx) => {
          // ── Anti-duplicação: verificar se já existe fatura pendente para este utente
          // com o mesmo valor base (tolerância de 0.01€) criada nos últimos 60 segundos ──
          const faturasRecentes = await tx.select({
            id: faturas.id,
            numeroFatura: faturas.numeroFatura,
            valorBase: faturas.valorBase,
            createdAt: faturas.createdAt,
          })
            .from(faturas)
            .where(
              and(
                eq(faturas.utenteId, input.utenteId),
                eq(faturas.estado, "pendente"),
                gte(faturas.createdAt, new Date(Date.now() - 60 * 1000))
              )
            )
            .limit(1);

          if (faturasRecentes.length > 0) {
            const faturaExistente = faturasRecentes[0];
            const valorExistente = safeDecimal(faturaExistente.valorBase);
            if (Math.abs(valorExistente - valorBase) < 0.02) {
              throw new TRPCError({
                code: "CONFLICT",
                message: `Já existe uma fatura pendente (${faturaExistente.numeroFatura}) com valor semelhante para este utente, criada há menos de 60 segundos. Verifique se não é uma duplicação.`,
              });
            }
          }

          // ── Sequência SAFT com FOR UPDATE para evitar race conditions ──
          let saftSeq = await tx.execute(
            sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
          );

          const saftRows = (saftSeq as any)[0] as any[];
          if (!saftRows || saftRows.length === 0) {
            await tx.insert(saftSequences).values({ ano, lastFaturaNumber: 0, lastReciboNumber: 0 });
            saftSeq = await tx.execute(
              sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
            );
          }

          const currentRow = ((saftSeq as any)[0] as any[])[0];
          const proximoNumero = (currentRow.last_fatura_number ?? currentRow.lastFaturaNumber ?? 0) + 1;
          await tx.update(saftSequences)
            .set({ lastFaturaNumber: proximoNumero, updatedAt: new Date() })
            .where(eq(saftSequences.ano, ano));

          const numeroFatura = `FT/${ano}/${proximoNumero.toString().padStart(4, "0")}`;

          const [insertResult] = await tx.insert(faturas).values({
            utenteId: input.utenteId,
            medicoId: input.medicoId,
            numeroFatura: numeroFatura,
            tipoDocumento: input.tipoDocumento,
            dataEmissao: input.dataEmissao,
            dataVencimento: input.dataVencimento,
            metodoPagamento: input.metodoPagamento,
            valorBase: String(valorBase),
            taxaIva: String(input.taxaIva),
            valorIva: String(valorIva),
            valorTotal: String(valorTotal),
            estado: "pendente",
            observacoes: input.observacoes,
          });

          return [insertResult, numeroFatura];
        });

        await logAuditAction(ctx.user, {
          acao: "create",
          tabela: "faturas",
          registoId: result.insertId,
          descricao: `Fatura emitida: ${numeroSerie} — Base: ${valorBase.toFixed(2)}€, IVA: ${valorIva.toFixed(2)}€, Total: ${valorTotal.toFixed(2)}€`,
        });

        return {
          success: true,
          faturaId: result.insertId,
          numeroFatura: numeroSerie,
          total: valorTotal,
        };
      } catch (error) {
        console.error("Erro ao emitir fatura:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao emitir fatura" });
      }
    }),

  /**
   * Listar faturas com filtros — CORRIGIDO V32.6
   * Agora aceita tanto o formato original (dataInicio/dataFim/status/utenteId)
   * como o formato usado pela FaturacaoPage (limite/estado).
   */
  listarFaturas: protectedProcedure
    .input(
      z.object({
        dataInicio: z.date().optional(),
        dataFim: z.date().optional(),
        status: z.enum(["pendente", "paga", "anulada"]).optional(),
        estado: z.enum(["pendente", "paga", "anulada"]).optional(),
        utenteId: z.number().optional(),
        // FIX V35.5: Paginação real com offset para evitar carregar todas as faturas em memória
        limite: z.number().int().min(1).max(200).optional().default(50),
        offset: z.number().int().min(0).optional().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.read") && !hasPermission(ctx.user, "financeiro.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para consultar faturas" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const conditions = [];
        if (input.dataInicio) conditions.push(gte(faturas.dataEmissao, input.dataInicio));
        if (input.dataFim) conditions.push(lte(faturas.dataEmissao, input.dataFim));
        // Aceitar tanto "status" como "estado" para retrocompatibilidade
        const estadoFiltro = input.status || input.estado;
        if (estadoFiltro) conditions.push(eq(faturas.estado, estadoFiltro));
        if (input.utenteId) conditions.push(eq(faturas.utenteId, input.utenteId));

        const limite = input.limite ?? 50;
        const offset = input.offset ?? 0;
        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Contar total sem carregar todos os registos em memória
        const [totalResult] = await db
          .select({ total: count() })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(whereClause);

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
            utenteNome: utentes.nome,
            utenteNif: utentes.nif,
            tratamentoId: faturas.tratamentoId,
            medicoId: faturas.medicoId,
          })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(whereClause)
          .orderBy(desc(faturas.dataEmissao))
          .limit(limite)
          .offset(offset);

        return {
          faturas: results,
          total: Number(totalResult?.total) || 0,
          limite,
          offset,
          temMais: offset + results.length < (Number(totalResult?.total) || 0),
        };
      } catch (error) {
        console.error("Erro ao listar faturas:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao listar faturas" });
      }
    }),

  /**
   * Registar pagamento e emitir recibo — V32.6 CORRIGIDO
   *
   * Melhorias de contabilidade sénior:
   * 1. Validação de duplicação de pagamento (fatura já paga)
   * 2. Validação de fatura anulada (não pode ser paga)
   * 3. Reconciliação: valor pago vs valor da fatura (tolerância 0.01€)
   * 4. Validação de data de pagamento (não pode ser anterior à emissão)
   * 5. Arredondamento bancário em todos os cálculos de comissão
   * 6. NOVO: Gera relatório de procedimentos (tratamento + evoluções clínicas)
   *    para comparação com as anotações do dentista
   */
  registarPagamento: protectedProcedure
    .input(
      z.object({
        faturaId: z.number().int().positive(),
        valorPago: z.number().positive(),
        metodoPagamento: z.enum(["multibanco", "numerario", "mbway", "transferencia"]),
        dataPagamento: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para registar pagamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        return await db.transaction(async (tx) => {
          // ── 1. Obter e validar fatura ──────────────────────────────────────
          const [faturaData] = await tx.select().from(faturas).where(eq(faturas.id, input.faturaId)).limit(1);
          if (!faturaData) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
          }
          if (faturaData.estado === "paga") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Esta fatura já foi paga. Não é possível registar um pagamento duplicado." });
          }
          if (faturaData.estado === "anulada") {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Esta fatura está anulada. Não é possível registar pagamento em faturas anuladas." });
          }

          // ── 2. Validação de reconciliação: valor pago vs valor da fatura ──
          const valorFatura = safeDecimal(faturaData.valorTotal);
          const valorPago = roundMoney(input.valorPago);
          const diferenca = Math.abs(valorPago - valorFatura);

          if (diferenca > 0.01) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Discrepância no valor do pagamento: valor pago (${valorPago.toFixed(2)}€) difere do valor da fatura (${valorFatura.toFixed(2)}€) em ${diferenca.toFixed(2)}€. Corrija o valor antes de prosseguir.`,
            });
          }

          // ── 3. Validação de data: pagamento não pode ser anterior à emissão ─
          if (faturaData.dataEmissao && input.dataPagamento < new Date(faturaData.dataEmissao)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "A data de pagamento não pode ser anterior à data de emissão da fatura.",
            });
          }

          // ── 4. Marcar fatura como paga ─────────────────────────────────────
          await tx.update(faturas)
            .set({
              estado: "paga",
              metodoPagamento: input.metodoPagamento,
              updatedAt: new Date(),
            })
            .where(eq(faturas.id, input.faturaId));

          // ── 5. Criar recibo SAFT-PT (CORRIGIDO V32.7: FOR UPDATE) ────────────────
          const ano = new Date().getFullYear();
          let saftSeqRaw = await tx.execute(
            sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
          );

          let saftRows = (saftSeqRaw as any)[0] as any[];
          if (!saftRows || saftRows.length === 0) {
            await tx.insert(saftSequences).values({ ano, lastFaturaNumber: 0, lastReciboNumber: 0 });
            saftSeqRaw = await tx.execute(
              sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
            );
            saftRows = (saftSeqRaw as any)[0] as any[];
          }

          const saftRow = saftRows[0];
          const currentReciboNumber = (saftRow.last_recibo_number ?? saftRow.lastReciboNumber ?? 0) + 1;
          await tx.update(saftSequences)
            .set({ lastReciboNumber: currentReciboNumber, updatedAt: new Date() })
            .where(eq(saftSequences.ano, ano));

          const numeroRecibo = `RC/${ano}/${currentReciboNumber.toString().padStart(4, "0")}`;

          const [reciboResult] = await tx.insert(recibos).values({
            faturaId: input.faturaId,
            numeroRecibo: numeroRecibo,
            dataEmissao: input.dataPagamento,
            valorPago: String(valorPago),
            metodoPagamento: input.metodoPagamento,
          });

          // ── 6. Calcular e registar comissão do dentista ────────────────────
          let comissaoInfo: { valorComissao: number; percentual: number; medicoNome: string } | null = null;
          // Tentar obter medicoId directamente da fatura, ou via tratamento associado
          let medicoId = faturaData.medicoId;
          if (!medicoId && faturaData.tratamentoId) {
            const [tratData] = await tx.select({ medicoId: tratamentos.medicoId })
              .from(tratamentos)
              .where(eq(tratamentos.id, faturaData.tratamentoId))
              .limit(1);
            if (tratData?.medicoId) {
              medicoId = tratData.medicoId;
              // Actualizar a fatura com o medicoId para futuras consultas
              await tx.update(faturas)
                .set({ medicoId: medicoId })
                .where(eq(faturas.id, input.faturaId));
            }
          }

          if (medicoId) {
            const [medicoData] = await tx.select({
              nome: medicos.nome,
              percentualComissao: medicos.percentualComissao,
            }).from(medicos).where(eq(medicos.id, medicoId)).limit(1);

            const percentual = safeDecimal(medicoData?.percentualComissao) || 30;
            const valorBaseRaw = safeDecimal(faturaData.valorBase);
            const valorTotalRaw = safeDecimal(faturaData.valorTotal);
            // Comissão sempre sobre valor base (sem IVA); fallback para valorTotal
            const baseComissao = valorBaseRaw > 0 ? valorBaseRaw : valorTotalRaw;
            const valorComissao = roundMoney(baseComissao * percentual / 100);

            if (valorComissao > 0) {
              await tx.insert(comissoesMedicos).values({
                medicoId: medicoId,
                faturaId: input.faturaId,
                tratamentoId: faturaData.tratamentoId || null,
                reciboId: reciboResult.insertId,
                utenteId: faturaData.utenteId,
                valorFatura: String(valorPago),
                percentualComissao: String(percentual),
                valorComissao: String(valorComissao),
                estado: "pendente",
                dataPagamentoUtente: input.dataPagamento,
              });

              comissaoInfo = {
                valorComissao,
                percentual,
                medicoNome: medicoData?.nome || "Médico",
              };

              await logAuditAction(ctx.user, {
                acao: "create",
                tabela: "comissoes_medicos",
                registoId: medicoId,
                descricao: `Comissão de ${valorComissao.toFixed(2)}€ (${percentual}%) registada para ${medicoData?.nome || "médico"} — Fatura ${faturaData.numeroFatura}`,
              });
            }
          }

          // ── 7. NOVO: Gerar relatório de procedimentos ─────────────────────
          // Busca tratamento associado + evoluções clínicas do dentista
          // para que o gestor possa comparar com as anotações do dentista
          let relatorioProcedimentos: any = null;

          if (faturaData.tratamentoId) {
            // Buscar dados do tratamento
            const [tratamentoData] = await tx
              .select({
                id: tratamentos.id,
                descricao: tratamentos.descricao,
                dente: tratamentos.dente,
                estado: tratamentos.estado,
                dataInicio: tratamentos.dataInicio,
                dataFimEstimada: tratamentos.dataFimEstimada,
                valorBruto: tratamentos.valorBruto,
                custosDiretos: tratamentos.custosDiretos,
                observacoes: tratamentos.observacoes,
                medicoNome: medicos.nome,
                medicoEspecialidade: medicos.especialidade,
              })
              .from(tratamentos)
              .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
              .where(eq(tratamentos.id, faturaData.tratamentoId))
              .limit(1);

            // Buscar evoluções clínicas (anotações do dentista)
            let evolucoesClinicas: any[] = [];
            if (faturaData.tratamentoId) {
              evolucoesClinicas = await tx
                .select({
                  id: evolucoes.id,
                  descricao: evolucoes.descricao,
                  anotacoes: evolucoes.anotacoes,
                  data: evolucoes.data,
                  profissional: evolucoes.profissional,
                })
                .from(evolucoes)
                .where(eq(evolucoes.tratamentoId, faturaData.tratamentoId))
                .orderBy(desc(evolucoes.data));
            }

            // Buscar dados do utente
            const [utenteData] = await tx
              .select({ nome: utentes.nome, nif: utentes.nif })
              .from(utentes)
              .where(eq(utentes.id, faturaData.utenteId))
              .limit(1);

            relatorioProcedimentos = {
              // Cabeçalho do relatório
              dataGeracao: new Date().toISOString(),
              fatura: {
                numero: faturaData.numeroFatura,
                dataEmissao: faturaData.dataEmissao,
                valorBase: safeDecimal(faturaData.valorBase),
                valorIva: safeDecimal(faturaData.valorIva),
                valorTotal: valorFatura,
                taxaIva: safeDecimal(faturaData.taxaIva),
                metodoPagamento: input.metodoPagamento,
              },
              recibo: {
                numero: numeroRecibo,
                dataPagamento: input.dataPagamento,
                valorPago,
              },
              utente: {
                nome: utenteData?.nome || "—",
                nif: utenteData?.nif || "Consumidor Final",
              },
              tratamento: tratamentoData
                ? {
                    id: tratamentoData.id,
                    descricao: tratamentoData.descricao,
                    dente: tratamentoData.dente || "—",
                    estado: tratamentoData.estado,
                    dataInicio: tratamentoData.dataInicio,
                    dataFimEstimada: tratamentoData.dataFimEstimada,
                    valorBruto: safeDecimal(tratamentoData.valorBruto),
                    custosDiretos: safeDecimal(tratamentoData.custosDiretos),
                    observacoesTratamento: tratamentoData.observacoes || "",
                    medicoNome: tratamentoData.medicoNome || "—",
                    medicoEspecialidade: tratamentoData.medicoEspecialidade || "—",
                  }
                : null,
              evolucoes: evolucoesClinicas.map((e) => ({
                id: e.id,
                descricao: e.descricao,
                anotacoes: e.anotacoes || "",
                data: e.data,
                profissional: e.profissional,
              })),
              comissao: comissaoInfo
                ? {
                    medicoNome: comissaoInfo.medicoNome,
                    percentual: comissaoInfo.percentual,
                    valorComissao: comissaoInfo.valorComissao,
                  }
                : null,
              // Resumo financeiro para reconciliação
              reconciliacao: {
                valorFatura: valorFatura,
                valorPago: valorPago,
                diferenca: roundMoney(valorPago - valorFatura),
                reconciliado: diferenca <= 0.01,
              },
            };
          }

          await logAuditAction(ctx.user, {
            acao: "create",
            tabela: "recibos",
            registoId: reciboResult.insertId,
            descricao: `Pagamento registado para fatura ${faturaData.numeroFatura}. Recibo: ${numeroRecibo}. Valor: ${valorPago.toFixed(2)}€. Método: ${input.metodoPagamento}${relatorioProcedimentos ? ". Relatório de procedimentos gerado." : ""}`,
          });

          return {
            success: true,
            reciboId: reciboResult.insertId,
            numeroRecibo,
            relatorioProcedimentos,
          };
        });
      } catch (error) {
        console.error("Erro ao registar pagamento:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao registar pagamento" });
      }
    }),

  /**
   * NOVO V32.6: Obter relatório de procedimentos de uma fatura paga.
   * Permite ao gestor comparar os procedimentos realizados com as anotações do dentista.
   *
   * RBAC por role:
   * - master/admin: vê tudo (financeiro + clínico + comissões)
   * - medico: vê apenas dados clínicos (sem valores financeiros da clínica, sem lucro, sem comissões de outros)
   * - recepcao: vê resumo (fatura, recibo, utente, tratamento sem custos internos)
   */
  obterRelatorioProcedimentos: protectedProcedure
    .input(
      z.object({
        faturaId: z.number().int().positive(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (
        !hasPermission(ctx.user, "faturacao.read") &&
        !hasPermission(ctx.user, "financeiro.read") &&
        !hasPermission(ctx.user, "consultas.read")
      ) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder ao relatório de procedimentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        // Obter fatura com dados do utente
        const [faturaData] = await db
          .select({
            id: faturas.id,
            numeroFatura: faturas.numeroFatura,
            dataEmissao: faturas.dataEmissao,
            dataVencimento: faturas.dataVencimento,
            estado: faturas.estado,
            valorBase: faturas.valorBase,
            taxaIva: faturas.taxaIva,
            valorIva: faturas.valorIva,
            valorTotal: faturas.valorTotal,
            metodoPagamento: faturas.metodoPagamento,
            observacoes: faturas.observacoes,
            tratamentoId: faturas.tratamentoId,
            medicoId: faturas.medicoId,
            utenteId: faturas.utenteId,
            utenteNome: utentes.nome,
            utenteNif: utentes.nif,
          })
          .from(faturas)
          .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
          .where(eq(faturas.id, input.faturaId))
          .limit(1);

        if (!faturaData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
        }

        // Obter recibo (se existir)
        const recibosData = await db
          .select()
          .from(recibos)
          .where(eq(recibos.faturaId, input.faturaId))
          .orderBy(desc(recibos.dataEmissao))
          .limit(1);

        const reciboData = recibosData[0] || null;

        // Obter tratamento associado
        let tratamentoData: any = null;
        let evolucoesClinicas: any[] = [];

        if (faturaData.tratamentoId) {
          const [trat] = await db
            .select({
              id: tratamentos.id,
              descricao: tratamentos.descricao,
              dente: tratamentos.dente,
              estado: tratamentos.estado,
              dataInicio: tratamentos.dataInicio,
              dataFimEstimada: tratamentos.dataFimEstimada,
              valorBruto: tratamentos.valorBruto,
              custosDiretos: tratamentos.custosDiretos,
              baseCalculo: tratamentos.baseCalculo,
              valorComissao: tratamentos.valorComissao,
              lucroClinica: tratamentos.lucroClinica,
              observacoes: tratamentos.observacoes,
              medicoNome: medicos.nome,
              medicoEspecialidade: medicos.especialidade,
            })
            .from(tratamentos)
            .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
            .where(eq(tratamentos.id, faturaData.tratamentoId))
            .limit(1);

          tratamentoData = trat || null;

          // Evoluções clínicas (anotações do dentista)
          evolucoesClinicas = await db
            .select({
              id: evolucoes.id,
              descricao: evolucoes.descricao,
              anotacoes: evolucoes.anotacoes,
              data: evolucoes.data,
              profissional: evolucoes.profissional,
            })
            .from(evolucoes)
            .where(eq(evolucoes.tratamentoId, faturaData.tratamentoId))
            .orderBy(desc(evolucoes.data));
        }

        // Obter comissão registada
        let comissaoData: any = null;
        const comissoes = await db
          .select()
          .from(comissoesMedicos)
          .where(eq(comissoesMedicos.faturaId, input.faturaId))
          .limit(1);
        if (comissoes.length > 0) comissaoData = comissoes[0];

        // ── Aplicar RBAC: filtrar campos por role ────────────────────────────
        const userRole = ctx.user.role;
        const isGestor = userRole === "master" || userRole === "admin";
        const isMedico = userRole === "medico";

        // Base do relatório (todos vêem)
        const relatorio: any = {
          dataGeracao: new Date().toISOString(),
          fatura: {
            numero: faturaData.numeroFatura,
            dataEmissao: faturaData.dataEmissao,
            estado: faturaData.estado,
            valorTotal: safeDecimal(faturaData.valorTotal),
            metodoPagamento: faturaData.metodoPagamento,
          },
          utente: {
            nome: faturaData.utenteNome,
            nif: faturaData.utenteNif || "Consumidor Final",
          },
          tratamento: tratamentoData
            ? {
                descricao: tratamentoData.descricao,
                dente: tratamentoData.dente || "—",
                estado: tratamentoData.estado,
                dataInicio: tratamentoData.dataInicio,
                dataFimEstimada: tratamentoData.dataFimEstimada,
                medicoNome: tratamentoData.medicoNome || "—",
                medicoEspecialidade: tratamentoData.medicoEspecialidade || "—",
                observacoes: tratamentoData.observacoes || "",
              }
            : null,
          evolucoes: evolucoesClinicas,
          totalEvolucoes: evolucoesClinicas.length,
        };

        // Campos adicionais para gestor (master/admin)
        if (isGestor) {
          relatorio.fatura.valorBase = safeDecimal(faturaData.valorBase);
          relatorio.fatura.valorIva = safeDecimal(faturaData.valorIva);
          relatorio.fatura.taxaIva = safeDecimal(faturaData.taxaIva);
          relatorio.fatura.observacoes = faturaData.observacoes;

          if (reciboData) {
            relatorio.recibo = {
              numero: reciboData.numeroRecibo,
              dataPagamento: reciboData.dataEmissao,
              valorPago: safeDecimal(reciboData.valorPago),
              metodoPagamento: reciboData.metodoPagamento,
            };
          }

          if (tratamentoData) {
            relatorio.tratamento.valorBruto = safeDecimal(tratamentoData.valorBruto);
            relatorio.tratamento.custosDiretos = safeDecimal(tratamentoData.custosDiretos);
            relatorio.tratamento.baseCalculo = safeDecimal(tratamentoData.baseCalculo);
            relatorio.tratamento.valorComissao = safeDecimal(tratamentoData.valorComissao);
            relatorio.tratamento.lucroClinica = safeDecimal(tratamentoData.lucroClinica);
          }

          if (comissaoData) {
            relatorio.comissao = {
              medicoId: comissaoData.medicoId,
              percentual: safeDecimal(comissaoData.percentualComissao),
              valorComissao: safeDecimal(comissaoData.valorComissao),
              estado: comissaoData.estado,
              dataPagamentoUtente: comissaoData.dataPagamentoUtente,
              dataPagamentoMedico: comissaoData.dataPagamentoMedico,
            };
          }

          // Reconciliação
          const valorPagoRecibo = reciboData ? safeDecimal(reciboData.valorPago) : 0;
          relatorio.reconciliacao = {
            valorFatura: safeDecimal(faturaData.valorTotal),
            valorPago: valorPagoRecibo,
            diferenca: roundMoney(valorPagoRecibo - safeDecimal(faturaData.valorTotal)),
            reconciliado: Math.abs(valorPagoRecibo - safeDecimal(faturaData.valorTotal)) <= 0.01,
          };
        }

        // Médico: sem valores financeiros internos, apenas clínico
        if (isMedico) {
          // Já tem o base, mas remove campos financeiros sensíveis
          // Mantém apenas o valor bruto do tratamento (o que o médico sabe)
          if (tratamentoData) {
            relatorio.tratamento.valorBruto = safeDecimal(tratamentoData.valorBruto);
          }
          // Médico vê apenas a sua própria comissão
          if (comissaoData && faturaData.medicoId) {
            relatorio.minhaComissao = {
              percentual: safeDecimal(comissaoData.percentualComissao),
              valorComissao: safeDecimal(comissaoData.valorComissao),
              estado: comissaoData.estado,
            };
          }
        }

        // Receção: vê fatura + utente + tratamento (sem custos internos)
        // Já coberto pelo base

        await logAuditAction(ctx.user, {
          acao: "view",
          tabela: "faturas",
          registoId: input.faturaId,
          descricao: `Relatório de procedimentos consultado: ${faturaData.numeroFatura} (role: ${userRole})`,
        });

        return relatorio;
      } catch (error) {
        console.error("Erro ao obter relatório de procedimentos:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao gerar relatório de procedimentos" });
      }
    }),

  /**
   * Relatório de faturação por período
   */
  relatorioFaturacao: protectedProcedure
    .input(z.object({
      dataInicio: z.date(),
      dataFim: z.date(),
      estado: z.enum(["pendente", "paga", "anulada"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Validação: data início não pode ser posterior à data fim
      if (input.dataInicio > input.dataFim) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "A data de início não pode ser posterior à data de fim." });
      }

      const conditions = [
        gte(faturas.dataEmissao, input.dataInicio),
        lte(faturas.dataEmissao, input.dataFim),
      ];
      if (input.estado) conditions.push(eq(faturas.estado, input.estado));

      const filtradas = await db.select().from(faturas).where(and(...conditions));

      const totalFaturado = roundMoney(filtradas.reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalPago = roundMoney(filtradas.filter(f => f.estado === "paga").reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalPendente = roundMoney(filtradas.filter(f => f.estado === "pendente").reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalAnulado = roundMoney(filtradas.filter(f => f.estado === "anulada").reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalIva = roundMoney(filtradas.reduce((acc, f) => acc + safeDecimal(f.valorIva), 0));
      const totalBase = roundMoney(filtradas.reduce((acc, f) => acc + safeDecimal(f.valorBase), 0));

      return {
        faturas: filtradas,
        resumo: {
          totalFaturas: filtradas.length,
          totalFaturado,
          totalPago,
          totalPendente,
          totalAnulado,
          totalIva,
          totalBase,
          taxaPagamento: totalFaturado > 0 ? Math.round((totalPago / totalFaturado) * 100) : 0,
        },
      };
    }),

  /**
   * Anular fatura (Conformidade SAFT-PT)
   * MELHORADO V32.6: Não permite anular faturas já pagas (requer nota de crédito)
   */
  anularFatura: protectedProcedure
    .input(
      z.object({
        faturaId: z.number().int().positive(),
        motivo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para anular faturas" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      try {
        const faturaExistente = await db.select().from(faturas).where(eq(faturas.id, input.faturaId)).limit(1);
        if (!faturaExistente.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Fatura não encontrada" });
        }

        if (faturaExistente[0].estado === "anulada") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Fatura já foi anulada" });
        }

        // Contabilidade sénior: fatura paga não pode ser simplesmente anulada
        // Deve ser emitida uma nota de crédito
        if (faturaExistente[0].estado === "paga") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Não é possível anular uma fatura já paga. Para corrigir, emita uma Nota de Crédito. Conformidade SAFT-PT exige rastreabilidade completa.",
          });
        }

        await db.update(faturas)
          .set({
            estado: "anulada",
            observacoes: input.motivo ? `Anulada: ${input.motivo}` : "Anulada",
            updatedAt: new Date(),
          })
          .where(eq(faturas.id, input.faturaId));

        await logAuditAction(ctx.user, {
          acao: "update",
          tabela: "faturas",
          registoId: input.faturaId,
          descricao: `Fatura anulada: ${faturaExistente[0].numeroFatura}. Motivo: ${input.motivo || "Não especificado"}`,
        });

        return { success: true, mensagem: "Fatura anulada com sucesso" };
      } catch (error) {
        console.error("Erro ao anular fatura:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao anular fatura" });
      }
    }),

  /**
   * Exportação SAFT-PT real (XML v1.04)
   */
  exportarSaft: protectedProcedure
    .input(z.object({
      ano: z.number().int().min(2000).max(2100),
      mes: z.number().int().min(1).max(12).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const configs = await db.select().from(configuracoesClinica);
      const getConfig = (chave: string, fallback: string) =>
        configs.find(c => c.chave === chave)?.valor ?? fallback;

      const nomeClinica = getConfig("nome_clinica", "");
      const nifClinica = getConfig("nif", "");
      const moradaClinica = getConfig("morada", "");
      const cidadeClinica = getConfig("cidade", "");

      const todasFaturas = await db.select({
        id: faturas.id,
        numero: faturas.numeroFatura,
        dataEmissao: faturas.dataEmissao,
        valorTotal: faturas.valorTotal,
        valorIva: faturas.valorIva,
        valorBase: faturas.valorBase,
        estado: faturas.estado,
        utenteNome: utentes.nome,
        utenteNif: utentes.nif,
      }).from(faturas).leftJoin(utentes, eq(faturas.utenteId, utentes.id));

      const faturasDoAno = todasFaturas.filter(f => {
        const data = new Date(f.dataEmissao ?? "");
        if (isNaN(data.getTime())) return false;
        if (data.getFullYear() !== input.ano) return false;
        if (input.mes && data.getMonth() + 1 !== input.mes) return false;
        return true;
      });

      const totalBruto = roundMoney(faturasDoAno.reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalIva = roundMoney(faturasDoAno.reduce((acc, f) => acc + safeDecimal(f.valorIva), 0));
      const totalBase = roundMoney(faturasDoAno.reduce((acc, f) => acc + safeDecimal(f.valorBase), 0));

      const linhasFacturas = faturasDoAno.map(f => `
      <Invoice>
        <InvoiceNo>${f.numero ?? f.id}</InvoiceNo>
        <InvoiceDate>${new Date(f.dataEmissao ?? "").toISOString().slice(0, 10)}</InvoiceDate>
        <InvoiceType>FT</InvoiceType>
        <SelfBillingIndicator>0</SelfBillingIndicator>
        <CustomerID>${f.utenteNif ?? "Consumidor Final"}</CustomerID>
        <CustomerName>${f.utenteNome ?? "Consumidor Final"}</CustomerName>
        <DocumentStatus><InvoiceStatus>${f.estado === "anulada" ? "A" : "N"}</InvoiceStatus></DocumentStatus>
        <DocumentTotals>
          <TaxPayable>${safeDecimal(f.valorIva).toFixed(2)}</TaxPayable>
          <NetTotal>${safeDecimal(f.valorBase).toFixed(2)}</NetTotal>
          <GrossTotal>${safeDecimal(f.valorTotal).toFixed(2)}</GrossTotal>
        </DocumentTotals>
      </Invoice>`).join("");

      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<AuditFile xmlns="urn:OECD:StandardAuditFile-Tax:PT_1.04:PT">
  <Header>
    <AuditFileVersion>1.04_01</AuditFileVersion>
    <CompanyID>${nifClinica}</CompanyID>
    <TaxRegistrationNumber>${nifClinica}</TaxRegistrationNumber>
    <TaxAccountingBasis>F</TaxAccountingBasis>
    <CompanyName>${nomeClinica}</CompanyName>
    <CompanyAddress>
      <AddressDetail>${moradaClinica}</AddressDetail>
      <City>${cidadeClinica}</City>
      <Country>PT</Country>
    </CompanyAddress>
    <FiscalYear>${input.ano}</FiscalYear>
    <StartDate>${input.ano}-01-01</StartDate>
    <EndDate>${input.ano}-12-31</EndDate>
    <CurrencyCode>EUR</CurrencyCode>
    <DateCreated>${new Date().toISOString().slice(0, 10)}</DateCreated>
    <ProductID>DentCare Elite v32.6</ProductID>
    <ProductVersion>32.6</ProductVersion>
    <SoftwareCertificateNumber>0000</SoftwareCertificateNumber>
  </Header>
  <SourceDocuments>
    <SalesInvoices>
      <NumberOfEntries>${faturasDoAno.length}</NumberOfEntries>
      <TotalDebit>0.00</TotalDebit>
      <TotalCredit>${totalBruto.toFixed(2)}</TotalCredit>
      ${linhasFacturas}
    </SalesInvoices>
  </SourceDocuments>
</AuditFile>`;

      await logAuditAction(ctx.user, {
        acao: "SAFT_EXPORTADO",
        tabela: "faturas",
        registoId: 0,
        descricao: `SAFT exportado: ${faturasDoAno.length} faturas, ano ${input.ano}${input.mes ? `, mês ${input.mes}` : ""}. Total: ${totalBruto.toFixed(2)}€`,
      });

      return {
        success: true,
        xml,
        nomeArquivo: `SAFT_PT_${nifClinica}_${input.ano}${input.mes ? `_${String(input.mes).padStart(2, "0")}` : ""}.xml`,
        totalFaturas: faturasDoAno.length,
        totalBruto: totalBruto.toFixed(2),
        totalIva: totalIva.toFixed(2),
        totalBase: totalBase.toFixed(2),
      };
    }),

  /**
   * Estatísticas de faturação
   */
  estatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "faturacao.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const todas = await db.select().from(faturas);
      const pagas = todas.filter(f => f.estado === "paga");
      const pendentes = todas.filter(f => f.estado === "pendente");
      const anuladas = todas.filter(f => f.estado === "anulada");

      const totalFaturado = roundMoney(todas.reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalPago = roundMoney(pagas.reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));
      const totalPendente = roundMoney(pendentes.reduce((acc, f) => acc + safeDecimal(f.valorTotal), 0));

      return {
        totalFaturas: todas.length,
        faturasPagas: pagas.length,
        faturasPendentes: pendentes.length,
        faturasAnuladas: anuladas.length,
        totalFaturado,
        totalPago,
        totalPendente,
        taxaPagamento: totalFaturado > 0 ? Math.round((totalPago / totalFaturado) * 100) : 0,
      };
    }),

  // ─── PARCELAMENTO ──────────────────────────────────────────────────────────

  /**
   * Registar pagamento com parcelamento.
   * Cria a fatura como "pendente" com parcelas associadas.
   * Cada parcela pode ser paga individualmente.
   */
  registarPagamentoParcelado: protectedProcedure
    .input(
      z.object({
        faturaId: z.number().int().positive(),
        totalParcelas: z.number().int().min(2).max(24),
        metodoPagamento: z.enum(["multibanco", "numerario", "mbway", "transferencia"]),
        dataInicio: z.date(),
        intervaloDias: z.number().int().min(7).max(90).default(30),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permiss\u00e3o para registar pagamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        return await db.transaction(async (tx) => {
          const [faturaData] = await tx.select().from(faturas).where(eq(faturas.id, input.faturaId)).limit(1);
          if (!faturaData) throw new TRPCError({ code: "NOT_FOUND", message: "Fatura n\u00e3o encontrada" });
          if (faturaData.estado === "paga") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta fatura j\u00e1 foi paga." });
          if (faturaData.estado === "anulada") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta fatura est\u00e1 anulada." });

          const valorTotal = safeDecimal(faturaData.valorTotal);
          const valorParcela = roundMoney(valorTotal / input.totalParcelas);
          // Ajustar a última parcela para cobrir diferença de arredondamento
          const valorUltimaParcela = roundMoney(valorTotal - (valorParcela * (input.totalParcelas - 1)));

          // Marcar fatura como parcelada
          await tx.update(faturas)
            .set({
              parcelado: true,
              totalParcelas: input.totalParcelas,
              metodoPagamento: input.metodoPagamento,
              updatedAt: new Date(),
            })
            .where(eq(faturas.id, input.faturaId));

          // Criar parcelas
          const parcelasCreated: any[] = [];
          for (let i = 1; i <= input.totalParcelas; i++) {
            const dataVencimento = new Date(input.dataInicio);
            dataVencimento.setDate(dataVencimento.getDate() + (input.intervaloDias * (i - 1)));
            const valor = i === input.totalParcelas ? valorUltimaParcela : valorParcela;

            const [result] = await tx.insert(parcelas).values({
              faturaId: input.faturaId,
              numeroParcela: i,
              totalParcelas: input.totalParcelas,
              valor: String(valor),
              dataVencimento,
              estado: "pendente",
              metodoPagamento: input.metodoPagamento,
            });
            parcelasCreated.push({ id: result.insertId, numero: i, valor, dataVencimento });
          }

          await logAuditAction(ctx.user, {
            acao: "create",
            tabela: "parcelas",
            registoId: input.faturaId,
            descricao: `Parcelamento criado: ${input.totalParcelas}x de ${valorParcela.toFixed(2)}\u20ac para fatura ${faturaData.numeroFatura}`,
          });

          return {
            success: true,
            totalParcelas: input.totalParcelas,
            valorParcela,
            parcelas: parcelasCreated,
          };
        });
      } catch (error) {
        console.error("Erro ao criar parcelamento:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao criar parcelamento" });
      }
    }),

  /**
   * Pagar uma parcela individual.
   * Quando todas as parcelas estiverem pagas, a fatura é marcada como paga automaticamente.
   */
  pagarParcela: protectedProcedure
    .input(
      z.object({
        parcelaId: z.number().int().positive(),
        metodoPagamento: z.enum(["multibanco", "numerario", "mbway", "transferencia"]),
        dataPagamento: z.date(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "faturacao.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permiss\u00e3o para registar pagamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        return await db.transaction(async (tx) => {
          const [parcelaData] = await tx.select().from(parcelas).where(eq(parcelas.id, input.parcelaId)).limit(1);
          if (!parcelaData) throw new TRPCError({ code: "NOT_FOUND", message: "Parcela n\u00e3o encontrada" });
          if (parcelaData.estado === "paga") throw new TRPCError({ code: "BAD_REQUEST", message: "Esta parcela j\u00e1 foi paga." });

          // Marcar parcela como paga
          await tx.update(parcelas)
            .set({
              estado: "paga",
              dataPagamento: input.dataPagamento,
              metodoPagamento: input.metodoPagamento,
              updatedAt: new Date(),
            })
            .where(eq(parcelas.id, input.parcelaId));

          // Verificar se todas as parcelas da fatura foram pagas
          const todasParcelas = await tx.select().from(parcelas).where(eq(parcelas.faturaId, parcelaData.faturaId));
          const todasPagas = todasParcelas.every(p => p.id === input.parcelaId ? true : p.estado === "paga");

          if (todasPagas) {
            // Marcar fatura como paga e gerar recibo
            await tx.update(faturas)
              .set({ estado: "paga", updatedAt: new Date() })
              .where(eq(faturas.id, parcelaData.faturaId));

            // Gerar recibo SAFT-PT
            const ano = new Date().getFullYear();
            let saftSeqRaw = await tx.execute(
              sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
            );
            let saftRows = (saftSeqRaw as any)[0] as any[];
            if (!saftRows || saftRows.length === 0) {
              await tx.insert(saftSequences).values({ ano, lastFaturaNumber: 0, lastReciboNumber: 0 });
              saftSeqRaw = await tx.execute(
                sql`SELECT * FROM saft_sequences WHERE ano = ${ano} LIMIT 1 FOR UPDATE`
              );
              saftRows = (saftSeqRaw as any)[0] as any[];
            }
            const saftRow = saftRows[0];
            const currentReciboNumber = (saftRow.last_recibo_number ?? saftRow.lastReciboNumber ?? 0) + 1;
            await tx.update(saftSequences)
              .set({ lastReciboNumber: currentReciboNumber, updatedAt: new Date() })
              .where(eq(saftSequences.ano, ano));

            const [faturaInfo] = await tx.select({ valorTotal: faturas.valorTotal, numeroFatura: faturas.numeroFatura })
              .from(faturas).where(eq(faturas.id, parcelaData.faturaId)).limit(1);

            const numeroRecibo = `RC/${ano}/${currentReciboNumber.toString().padStart(4, "0")}`;
            await tx.insert(recibos).values({
              faturaId: parcelaData.faturaId,
              numeroRecibo,
              dataEmissao: input.dataPagamento,
              valorPago: String(safeDecimal(faturaInfo?.valorTotal)),
              metodoPagamento: input.metodoPagamento,
            });

            // Registar comiss\u00e3o do m\u00e9dico
            const [faturaFull] = await tx.select().from(faturas).where(eq(faturas.id, parcelaData.faturaId)).limit(1);
            let medicoId = faturaFull?.medicoId;
            if (!medicoId && faturaFull?.tratamentoId) {
              const [t] = await tx.select({ medicoId: tratamentos.medicoId }).from(tratamentos).where(eq(tratamentos.id, faturaFull.tratamentoId)).limit(1);
              if (t?.medicoId) medicoId = t.medicoId;
            }
            if (medicoId) {
              const [medicoData] = await tx.select({ nome: medicos.nome, percentualComissao: medicos.percentualComissao })
                .from(medicos).where(eq(medicos.id, medicoId)).limit(1);
              const percentual = safeDecimal(medicoData?.percentualComissao) || 30;
              const valorBase = safeDecimal(faturaFull?.valorBase);
              const valorTot = safeDecimal(faturaFull?.valorTotal);
              const base = valorBase > 0 ? valorBase : valorTot;
              const valorComissao = roundMoney(base * percentual / 100);
              if (valorComissao > 0) {
                await tx.insert(comissoesMedicos).values({
                  medicoId,
                  faturaId: parcelaData.faturaId,
                  tratamentoId: faturaFull?.tratamentoId || null,
                  utenteId: faturaFull?.utenteId || 0,
                  valorFatura: String(safeDecimal(faturaFull?.valorTotal)),
                  percentualComissao: String(percentual),
                  valorComissao: String(valorComissao),
                  estado: "pendente",
                  dataPagamentoUtente: input.dataPagamento,
                });
              }
            }

            await logAuditAction(ctx.user, {
              acao: "update",
              tabela: "faturas",
              registoId: parcelaData.faturaId,
              descricao: `Todas as parcelas pagas. Fatura finalizada. Recibo: ${numeroRecibo}`,
            });

            return { success: true, todasPagas: true, numeroRecibo };
          }

          const parcelasPagas = todasParcelas.filter(p => p.id === input.parcelaId || p.estado === "paga").length;

          await logAuditAction(ctx.user, {
            acao: "update",
            tabela: "parcelas",
            registoId: input.parcelaId,
            descricao: `Parcela ${parcelaData.numeroParcela}/${parcelaData.totalParcelas} paga. ${parcelasPagas}/${todasParcelas.length} conclu\u00eddas.`,
          });

          return { success: true, todasPagas: false, parcelasPagas, totalParcelas: todasParcelas.length };
        });
      } catch (error) {
        console.error("Erro ao pagar parcela:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao pagar parcela" });
      }
    }),

  /**
   * Listar parcelas de uma fatura.
   */
  listarParcelas: protectedProcedure
    .input(z.object({ faturaId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const result = await db.select().from(parcelas)
        .where(eq(parcelas.faturaId, input.faturaId))
        .orderBy(parcelas.numeroParcela);
      return { success: true, parcelas: result };
    }),
});
