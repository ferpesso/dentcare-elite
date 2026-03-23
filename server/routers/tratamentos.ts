/**
 * Router de Tratamentos — Gestão Clínica Avançada
 * DentCare Elite V31 — Tratamentos, Especialidades e Evolução Clínica
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";

// Importar schema Drizzle para persistência em BD
import { getDb } from "../db";
import { tratamentos as tratamentosTable, anamneses, evolucoes, medicos, faturas, saftSequences } from "../../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

// Especialidades disponíveis
const ESPECIALIDADES = [
  { id: 1, nome: "Implantologia", descricao: "Implantes dentários" },
  { id: 2, nome: "Ortodontia", descricao: "Correção de mordida e alinhamento" },
  { id: 3, nome: "Endodontia", descricao: "Tratamento de canal" },
  { id: 4, nome: "Periodontia", descricao: "Doenças da gengiva" },
  { id: 5, nome: "Prostodontia", descricao: "Próteses e coroas" },
  { id: 6, nome: "Estética", descricao: "Clareamento e restaurações estéticas" },
  { id: 7, nome: "Cirurgia Oral", descricao: "Extrações e cirurgias" },
  { id: 8, nome: "Pedodontia", descricao: "Odontologia pediátrica" },
];

export const tratamentosRouter = router({
  /**
   * Listar especialidades disponíveis
   */
  listarEspecialidades: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return { success: true, especialidades: ESPECIALIDADES };
    }),

  /**
   * Listar tratamentos de um utente
   */
  listarTratamentos: protectedProcedure
    .input(z.object({ utenteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      
      const tratamentos = await db.select().from(tratamentosTable).where(eq(tratamentosTable.utenteId, input.utenteId));
      return { success: true, tratamentos };
    }),

  /**
   * Criar novo tratamento
   */
  criarTratamento: protectedProcedure
    .input(
      z.object({
        utenteId: z.number(),
        medicoId: z.number().positive(), // CORRIGIDO: Agora é obrigatório
        dente: z.string(),
        descricao: z.string().min(1),
        especialidade: z.string(),
        estado: z.enum(["pendente", "proposto", "em_progresso", "concluido", "cancelado", "anulado"]).default("pendente"),
        valor: z.number().optional(),
        dataInicio: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.create")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        return await db.transaction(async (tx) => {
          // 1. Validar que o médico existe
          const medicoData = await tx.select({ 
            id: medicos.id, 
            percentualComissao: medicos.percentualComissao 
          })
            .from(medicos)
            .where(eq(medicos.id, input.medicoId))
            .limit(1);
          
          if (!medicoData.length) {
            throw new TRPCError({ code: "NOT_FOUND", message: "Médico/Dentista não encontrado" });
          }

          // 2. Calcular campos financeiros
          const valorBruto = input.valor || 0;
          const custosDiretos = 0;
          const baseCalculo = valorBruto - custosDiretos;
          const percentualComissao = medicoData[0].percentualComissao ? parseFloat(String(medicoData[0].percentualComissao)) : 30;
          const valorComissao = (baseCalculo * percentualComissao) / 100;
          const lucroClinica = baseCalculo - valorComissao;

          // 3. Inserir tratamento
          const [result] = await tx.insert(tratamentosTable).values({
            utenteId: input.utenteId,
            medicoId: input.medicoId,
            dente: input.dente,
            descricao: input.descricao,
            estado: input.estado,
            valorBruto: String(valorBruto),
            custosDiretos: String(custosDiretos),
            baseCalculo: String(baseCalculo),
            valorComissao: String(valorComissao),
            lucroClinica: String(lucroClinica),
            dataInicio: input.dataInicio || new Date(),
          });

          const tratamentoId = result.insertId;

          // 4. Criar fatura automaticamente (Integridade Transacional)
          // CORRIGIDO V32.7: FOR UPDATE na sequência SAFT + anti-duplicação
          if (valorBruto > 0) {
            const ano = new Date().getFullYear();
            
            // Verificar se já existe fatura para este tratamento (anti-duplicação)
            const faturaExistente = await tx.select({ id: faturas.id })
              .from(faturas)
              .where(eq(faturas.tratamentoId, tratamentoId))
              .limit(1);
            
            if (faturaExistente.length === 0) {
              // Sequência SAFT com FOR UPDATE para evitar race conditions
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

              const numeroFatura = `FT/${ano}/${proximoNumero.toString().padStart(4, '0')}`;
              // V32.8: IVA isento por defeito (0%) — a clínica pode alterar nas configurações
              const taxaIva = 0;
              const valorIva = Math.round(valorBruto * taxaIva) / 100;
              const valorTotal = Math.round((valorBruto + valorIva) * 100) / 100;

              await tx.insert(faturas).values({
                utenteId: input.utenteId,
                medicoId: input.medicoId,
                tratamentoId: tratamentoId,
                numeroFatura: numeroFatura,
                tipoDocumento: "fatura",
                dataEmissao: new Date(),
                dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                valorBase: String(valorBruto),
                taxaIva: String(taxaIva),
                valorIva: String(valorIva),
                valorTotal: String(valorTotal),
                estado: "pendente",
                observacoes: `Gerada automaticamente para tratamento: ${input.descricao}`,
              });
            }
          }

          await logAuditAction(ctx.user, {
            acao: "create",
            tabela: "tratamentos",
            registoId: tratamentoId,
            descricao: `Tratamento criado com faturação automática: ${input.descricao} (Dente ${input.dente})`,
          });

          return { success: true, tratamentoId };
        });
      } catch (error) {
        console.error("[Tratamentos] Erro na criação transacional:", error);
        if (error instanceof TRPCError) throw error;
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro ao processar tratamento e faturação" });
      }
    }),

  /**
   * Actualizar tratamento
   * CORRIGIDO: Permitir actualização de medicoId
   */
  actualizarTratamento: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        medicoId: z.number().optional(), // CORRIGIDO: Agora permite actualizar
        descricao: z.string().optional(),
        estado: z.enum(["pendente", "proposto", "em_progresso", "concluido", "cancelado", "anulado"]).optional(),
        valor: z.number().optional(),
        dataFim: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.update")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const update: any = { updatedAt: new Date() };
      if (input.descricao) update.descricao = input.descricao;
      if (input.medicoId) {
        // Validar que o médico existe
        const medicoExists = await db.select({ id: medicos.id })
          .from(medicos)
          .where(eq(medicos.id, input.medicoId))
          .limit(1);
        
        if (!medicoExists.length) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Médico/Dentista não encontrado" });
        }
        update.medicoId = input.medicoId;
      }
      if (input.estado) update.estado = input.estado;
      if (input.valor !== undefined) {
        update.valorBruto = String(input.valor);
        // Recalcular campos financeiros se valor foi alterado
        const baseCalculo = input.valor - 0; // custosDiretos = 0
        
        // CORRIGIDO: Obter percentual de comissão real do médico
        const tratamentoAtual = await db.select({ medicoId: tratamentosTable.medicoId })
          .from(tratamentosTable)
          .where(eq(tratamentosTable.id, input.id))
          .limit(1);
        
        const medicoId = input.medicoId || tratamentoAtual[0]?.medicoId;
        let percentualComissao = 30;
        
        if (medicoId) {
          const medicoData = await db.select({ percentualComissao: medicos.percentualComissao })
            .from(medicos)
            .where(eq(medicos.id, medicoId))
            .limit(1);
          if (medicoData[0]?.percentualComissao) {
            percentualComissao = parseFloat(String(medicoData[0].percentualComissao));
          }
        }

        update.baseCalculo = String(baseCalculo);
        update.valorComissao = String((baseCalculo * percentualComissao) / 100);
        update.lucroClinica = String(baseCalculo - (baseCalculo * percentualComissao) / 100);
      }
      if (input.dataFim) update.dataFimEstimada = input.dataFim;

      await db.update(tratamentosTable).set(update).where(eq(tratamentosTable.id, input.id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "tratamentos",
        registoId: input.id,
        descricao: `Tratamento actualizado: ${input.id}`,
      });

      return { success: true };
    }),

  /**
   * Adicionar evolução clínica
   */
  adicionarEvolucao: protectedProcedure
    .input(
      z.object({
        tratamentoId: z.number(),
        descricao: z.string().min(1),
        anotacoes: z.string().optional(),
        data: z.date().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.create")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [tratamento] = await db.select().from(tratamentosTable).where(eq(tratamentosTable.id, input.tratamentoId));
      if (!tratamento) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tratamento não encontrado" });
      }

      const [novaEvolucaoResult] = await db.insert(evolucoes).values({
        tratamentoId: input.tratamentoId,
        descricao: input.descricao,
        anotacoes: input.anotacoes,
        data: input.data || new Date(),
        profissional: ctx.user.name || "Profissional",
        criadoPor: ctx.user.id,
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "evolucoes_clinicas",
        
        registoId: novaEvolucaoResult.insertId,
        descricao: `Evolução clínica adicionada: ${input.descricao}`,
      });

      return { success: true };
    }),

  /**
   * Listar evolução clínica de um tratamento
   */
  listarEvolucoes: protectedProcedure
    .input(z.object({ tratamentoId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const evolucoesResult = await db.select().from(evolucoes).where(eq(evolucoes.tratamentoId, input.tratamentoId)).orderBy(desc(evolucoes.createdAt));
      return { success: true, evolucoes: evolucoesResult };

    }),

  /**
   * Obter estatísticas de tratamentos
   */
  obterEstatisticas: protectedProcedure
    .input(z.object({ utenteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const tratamentosResult = await db.select().from(tratamentosTable).where(eq(tratamentosTable.utenteId, input.utenteId));
      const abertos = tratamentosResult.filter((t) => t.estado === "pendente").length;
      const finalizados = tratamentosResult.filter((t) => t.estado === "concluido").length;
      const suspensos = tratamentosResult.filter((t) => t.estado === "cancelado").length;
      const valorTotal = tratamentosResult.reduce((acc, t) => acc + parseFloat(String(t.valorBruto) || "0"), 0);

      return {
        success: true,
        estatisticas: {
          totalTratamentos: tratamentosResult.length,
          abertos,
          finalizados,
          suspensos,
          valorTotal,
        },
      };
    }),

  /**
   * Eliminar tratamento
   */
  eliminarTratamento: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.delete")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(tratamentosTable).set({ estado: "anulado", updatedAt: new Date() }).where(eq(tratamentosTable.id, input.id));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "tratamentos",
        registoId: input.id,
        descricao: `Tratamento eliminado: ${input.id}`,
      });

      return { success: true, message: "Tratamento eliminado" };
    }),
});
