/**
 * Router de Ligações — Gestão de Chamadas Pendentes
 * DentCare Elite V31 — Ligações, Confirmações e Follow-ups
 * FIX V35.5: Adicionado controlo de acesso RBAC + paginação real (limit/offset)
 *            Os contadores de pendentes/em_progresso agora são calculados via SQL
 *            em vez de filtrar em memória, evitando estrangulamentos de memória.
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { utentes, ligacoes } from "../../drizzle/schema";
import { eq, desc, and, gte, lte, sql, count } from "drizzle-orm";
import { logAuditAction } from "../auditService";
import { hasPermission } from "../rbac";

export const ligacoesRouter = router({
  /**
   * Listar ligações com paginação real (limit/offset)
   * FIX V35.5: Substituído filtro em memória por paginação no servidor.
   */
  listarPendentes: protectedProcedure
    .input(z.object({
      tipo: z.enum(["confirmacao", "seguimento", "cobranca", "agendamento", "urgencia"]).optional(),
      estado: z.enum(["pendente", "em_progresso", "concluida", "nao_atendeu", "cancelada"]).optional(),
      limite: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }).optional())
    .query(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [];
      if (input?.tipo) conditions.push(eq(ligacoes.tipoLigacao, input.tipo));
      if (input?.estado) conditions.push(eq(ligacoes.estado, input.estado));

      const limite = input?.limite ?? 50;
      const offset = input?.offset ?? 0;

      // Contagens via SQL (sem carregar todos os registos em memória)
      const [contagens] = await db.select({
        total: count(),
        pendentes: sql<number>`SUM(CASE WHEN ${ligacoes.estado} = 'pendente' THEN 1 ELSE 0 END)`,
        emProgresso: sql<number>`SUM(CASE WHEN ${ligacoes.estado} = 'em_progresso' THEN 1 ELSE 0 END)`,
      }).from(ligacoes).where(conditions.length > 0 ? and(...conditions) : undefined);

      // Listagem paginada
      const results = await db
        .select({
          id: ligacoes.id,
          utenteId: ligacoes.utenteId,
          utenteNome: utentes.nome,
          telemovel: utentes.telemovel,
          tipoLigacao: ligacoes.tipoLigacao,
          motivo: ligacoes.motivo,
          dataAgendada: ligacoes.dataAgendada,
          dataConcluida: ligacoes.dataConcluida,
          estado: ligacoes.estado,
          notas: ligacoes.notas,
          proximaLigacao: ligacoes.proximaLigacao,
        })
        .from(ligacoes)
        .innerJoin(utentes, eq(ligacoes.utenteId, utentes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(ligacoes.dataAgendada))
        .limit(limite)
        .offset(offset);

      return {
        ligacoes: results,
        total: Number(contagens?.total) || 0,
        pendentes: Number(contagens?.pendentes) || 0,
        emProgresso: Number(contagens?.emProgresso) || 0,
        limite,
        offset,
      };
    }),

  /**
   * Criar nova ligação pendente
   */
  criar: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
      tipoLigacao: z.enum(["confirmacao", "seguimento", "cobranca", "agendamento", "urgencia"]),
      motivo: z.string().min(5),
      notas: z.string().optional(),
      proximaLigacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [utente] = await db.select().from(utentes).where(eq(utentes.id, input.utenteId)).limit(1);
      if (!utente) throw new TRPCError({ code: "NOT_FOUND", message: "Utente não encontrado" });

      const [result] = await db.insert(ligacoes).values({
        utenteId: input.utenteId,
        tipoLigacao: input.tipoLigacao,
        motivo: input.motivo,
        estado: "pendente",
        notas: input.notas || "",
        proximaLigacao: input.proximaLigacao ? new Date(input.proximaLigacao) : null,
        dataAgendada: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "ligacoes",
        registoId: result.insertId,
        descricao: `Ligação criada para ${utente.nome}: ${input.tipoLigacao}`,
      });

      return { success: true, ligacaoId: result.insertId };
    }),

  /**
   * Actualizar estado da ligação
   */
  actualizarEstado: protectedProcedure
    .input(z.object({
      ligacaoId: z.number().int().positive(),
      novoEstado: z.enum(["pendente", "em_progresso", "concluida", "nao_atendeu", "cancelada"]),
      notas: z.string().optional(),
      proximaLigacao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const updateData: any = {
        estado: input.novoEstado,
        updatedAt: new Date(),
      };

      if (input.notas) updateData.notas = input.notas;
      if (input.novoEstado === "concluida") updateData.dataConcluida = new Date();
      if (input.proximaLigacao) updateData.proximaLigacao = new Date(input.proximaLigacao);

      await db.update(ligacoes)
        .set(updateData)
        .where(eq(ligacoes.id, input.ligacaoId));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "ligacoes",
        registoId: input.ligacaoId,
        descricao: `Ligação actualizada para: ${input.novoEstado}`,
      });

      return { success: true };
    }),

  /**
   * Obter ligação por ID
   */
  obterPorId: protectedProcedure
    .input(z.object({ ligacaoId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder a ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db
        .select({
          id: ligacoes.id,
          utenteId: ligacoes.utenteId,
          utenteNome: utentes.nome,
          telemovel: utentes.telemovel,
          tipoLigacao: ligacoes.tipoLigacao,
          motivo: ligacoes.motivo,
          dataAgendada: ligacoes.dataAgendada,
          dataConcluida: ligacoes.dataConcluida,
          estado: ligacoes.estado,
          notas: ligacoes.notas,
          proximaLigacao: ligacoes.proximaLigacao,
        })
        .from(ligacoes)
        .innerJoin(utentes, eq(ligacoes.utenteId, utentes.id))
        .where(eq(ligacoes.id, input.ligacaoId))
        .limit(1);

      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Ligação não encontrada" });
      return result;
    }),

  /**
   * Eliminar ligação
   */
  eliminar: protectedProcedure
    .input(z.object({ ligacaoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.delete")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para eliminar ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.delete(ligacoes).where(eq(ligacoes.id, input.ligacaoId));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "ligacoes",
        registoId: input.ligacaoId,
        descricao: `Ligação eliminada: ${input.ligacaoId}`,
      });

      return { success: true };
    }),

  /**
   * Estatísticas de ligações (calculadas via SQL, sem carregar em memória)
   */
  estatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para ver estatísticas de ligações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const hoje = new Date();
      const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      // Todas as estatísticas calculadas no servidor via SQL
      const stats = await db.select({
        totalLigacoes: sql<number>`COUNT(*)`,
        pendentes: sql<number>`SUM(CASE WHEN estado = 'pendente' THEN 1 ELSE 0 END)`,
        emProgresso: sql<number>`SUM(CASE WHEN estado = 'em_progresso' THEN 1 ELSE 0 END)`,
        concluidas: sql<number>`SUM(CASE WHEN estado = 'concluida' THEN 1 ELSE 0 END)`,
        confirmacao: sql<number>`SUM(CASE WHEN tipo_ligacao = 'confirmacao' THEN 1 ELSE 0 END)`,
        seguimento: sql<number>`SUM(CASE WHEN tipo_ligacao = 'seguimento' THEN 1 ELSE 0 END)`,
        cobranca: sql<number>`SUM(CASE WHEN tipo_ligacao = 'cobranca' THEN 1 ELSE 0 END)`,
        agendamento: sql<number>`SUM(CASE WHEN tipo_ligacao = 'agendamento' THEN 1 ELSE 0 END)`,
        urgencia: sql<number>`SUM(CASE WHEN tipo_ligacao = 'urgencia' THEN 1 ELSE 0 END)`,
      }).from(ligacoes);

      const result = stats[0] as any || {};
      const totalLigacoes = Number(result.totalLigacoes) || 0;
      const concluidas = Number(result.concluidas) || 0;

      const [ligacoesHojeResult] = await db
        .select({ count: count() })
        .from(ligacoes)
        .where(and(gte(ligacoes.dataAgendada, inicioHoje), lte(ligacoes.dataAgendada, fimHoje)));

      return {
        totalLigacoes,
        ligacoesHoje: Number(ligacoesHojeResult?.count) || 0,
        pendentes: Number(result.pendentes) || 0,
        emProgresso: Number(result.emProgresso) || 0,
        concluidas,
        taxaConclusao: totalLigacoes > 0 ? Math.round((concluidas / totalLigacoes) * 100) : 0,
        porTipo: {
          confirmacao: Number(result.confirmacao) || 0,
          seguimento: Number(result.seguimento) || 0,
          cobranca: Number(result.cobranca) || 0,
          agendamento: Number(result.agendamento) || 0,
          urgencia: Number(result.urgencia) || 0,
        },
      };
    }),
});
