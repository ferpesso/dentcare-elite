/**
 * comunicacoes.ts — Router tRPC para Comunicações
 * DentCare Elite V35 — Conectores + Comunicação Integrada
 *
 * Endpoints:
 * - Listar histórico de comunicações de um utente
 * - Registar nova comunicação (log)
 * - Obter estatísticas de comunicação do utente
 * - Obter templates de mensagens rápidas
 * - Listar comunicações recentes (para dashboard)
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { eq, desc, and, sql, count } from "drizzle-orm";
import { hasPermission } from "../rbac";
import {
  comunicacoesLog,
  utentes,
  templatesWhatsApp,
} from "../../drizzle/schema";

export const comunicacoesRouter = router({
  /**
   * Listar histórico de comunicações de um utente
   */
  listarPorUtente: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
      limite: z.number().int().min(1).max(200).default(50),
      offset: z.number().int().min(0).default(0),
      canal: z.string().optional(),
      tipo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar comunicações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const conditions = [eq(comunicacoesLog.utenteId, input.utenteId)];
        if (input.canal) conditions.push(eq(comunicacoesLog.canal, input.canal));
        if (input.tipo) conditions.push(eq(comunicacoesLog.tipo, input.tipo));

        const logs = await db
          .select({
            id: comunicacoesLog.id,
            canal: comunicacoesLog.canal,
            tipo: comunicacoesLog.tipo,
            direcao: comunicacoesLog.direcao,
            mensagem: comunicacoesLog.mensagem,
            estado: comunicacoesLog.estado,
            respostaUtente: comunicacoesLog.respostaUtente,
            enviadoPor: comunicacoesLog.enviadoPor,
            metadata: comunicacoesLog.metadata,
            createdAt: comunicacoesLog.createdAt,
            consultaId: comunicacoesLog.consultaId,
          })
          .from(comunicacoesLog)
          .where(and(...conditions))
          .orderBy(desc(comunicacoesLog.createdAt))
          .limit(input.limite)
          .offset(input.offset);

        // Contar total
        const [totalResult] = await db
          .select({ total: count() })
          .from(comunicacoesLog)
          .where(and(...conditions));

        return {
          comunicacoes: logs,
          total: totalResult?.total ?? 0,
        };
      } catch (error) {
        console.error("[Comunicações] Erro ao listar:", error);
        // Se a tabela não existe ainda, retornar vazio
        return { comunicacoes: [], total: 0 };
      }
    }),

  /**
   * Registar nova comunicação (log)
   */
  registar: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
      consultaId: z.number().int().positive().optional(),
      canal: z.enum(["whatsapp", "sms", "email", "telefone", "presencial"]),
      tipo: z.string().min(1),
      direcao: z.enum(["saida", "entrada"]).default("saida"),
      mensagem: z.string().optional(),
      estado: z.string().default("enviada"),
      metadata: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para registar comunicações" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const [result] = await db.insert(comunicacoesLog).values({
          utenteId: input.utenteId,
          consultaId: input.consultaId,
          canal: input.canal,
          tipo: input.tipo,
          direcao: input.direcao,
          mensagem: input.mensagem,
          estado: input.estado,
          enviadoPor: ctx.user.id,
          metadata: input.metadata,
        });

        return { success: true, id: result.insertId };
      } catch (error) {
        console.error("[Comunicações] Erro ao registar:", error);
        // Se a tabela não existe, criar silenciosamente
        try {
          await db.execute(sql`
            CREATE TABLE IF NOT EXISTS comunicacoes_log (
              id SERIAL PRIMARY KEY,
              utente_id BIGINT UNSIGNED NOT NULL,
              consulta_id BIGINT UNSIGNED,
              canal VARCHAR(50) NOT NULL,
              tipo VARCHAR(100) NOT NULL,
              direcao VARCHAR(20) NOT NULL DEFAULT 'saida',
              mensagem TEXT,
              estado VARCHAR(50) NOT NULL DEFAULT 'enviada',
              resposta_utente TEXT,
              enviado_por BIGINT UNSIGNED,
              metadata TEXT,
              created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
            )
          `);
          // Tentar novamente
          const [result] = await db.insert(comunicacoesLog).values({
            utenteId: input.utenteId,
            consultaId: input.consultaId,
            canal: input.canal,
            tipo: input.tipo,
            direcao: input.direcao,
            mensagem: input.mensagem,
            estado: input.estado,
            enviadoPor: ctx.user.id,
            metadata: input.metadata,
          });
          return { success: true, id: result.insertId };
        } catch (retryError) {
          console.error("[Comunicações] Erro ao criar tabela e registar:", retryError);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Falha ao registar comunicação" });
        }
      }
    }),

  /**
   * Estatísticas de comunicação de um utente
   */
  estatisticasUtente: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
    }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const stats = await db
          .select({
            canal: comunicacoesLog.canal,
            tipo: comunicacoesLog.tipo,
            total: count(),
          })
          .from(comunicacoesLog)
          .where(eq(comunicacoesLog.utenteId, input.utenteId))
          .groupBy(comunicacoesLog.canal, comunicacoesLog.tipo);

        const totalGeral = stats.reduce((acc, s) => acc + Number(s.total), 0);

        return {
          stats,
          totalGeral,
          porCanal: {
            whatsapp: stats.filter(s => s.canal === "whatsapp").reduce((acc, s) => acc + Number(s.total), 0),
            sms: stats.filter(s => s.canal === "sms").reduce((acc, s) => acc + Number(s.total), 0),
            email: stats.filter(s => s.canal === "email").reduce((acc, s) => acc + Number(s.total), 0),
            telefone: stats.filter(s => s.canal === "telefone").reduce((acc, s) => acc + Number(s.total), 0),
          },
        };
      } catch {
        return {
          stats: [],
          totalGeral: 0,
          porCanal: { whatsapp: 0, sms: 0, email: 0, telefone: 0 },
        };
      }
    }),

  /**
   * Obter templates de mensagens rápidas
   */
  listarTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const templates = await db
          .select()
          .from(templatesWhatsApp)
          .where(eq(templatesWhatsApp.ativo, true))
          .orderBy(templatesWhatsApp.categoria, templatesWhatsApp.nome);

        return { templates };
      } catch {
        // Templates padrão se a tabela não existir
        return {
          templates: [
            { id: 0, nome: "Lembrete de Consulta", template: "Olá {nome}, lembramos da sua consulta amanhã às {hora}. Confirme respondendo SIM ou ligue-nos.", categoria: "lembrete", ativo: true },
            { id: 0, nome: "Confirmação de Marcação", template: "Olá {nome}, a sua consulta está marcada para {data} às {hora} com Dr(a). {medico}. Até breve!", categoria: "confirmacao", ativo: true },
            { id: 0, nome: "Follow-up Pós-Consulta", template: "Olá {nome}, esperamos que esteja bem após a sua consulta. Se tiver alguma dúvida, não hesite em contactar-nos.", categoria: "followup", ativo: true },
            { id: 0, nome: "Pedido de Avaliação", template: "Olá {nome}, gostaríamos de saber a sua opinião sobre o atendimento. A sua avaliação é muito importante para nós!", categoria: "avaliacao", ativo: true },
            { id: 0, nome: "Aniversário", template: "Feliz aniversário, {nome}! 🎂 A equipa da {clinica} deseja-lhe um dia maravilhoso!", categoria: "aniversario", ativo: true },
            { id: 0, nome: "Reativação", template: "Olá {nome}, já passou algum tempo desde a sua última visita. Gostaríamos de o/a ver novamente! Agende já a sua consulta.", categoria: "reativacao", ativo: true },
          ],
        };
      }
    }),

  /**
   * Comunicações recentes (para dashboard/notificações)
   */
  recentes: protectedProcedure
    .input(z.object({
      limite: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      try {
        const recentes = await db
          .select({
            id: comunicacoesLog.id,
            canal: comunicacoesLog.canal,
            tipo: comunicacoesLog.tipo,
            direcao: comunicacoesLog.direcao,
            mensagem: comunicacoesLog.mensagem,
            estado: comunicacoesLog.estado,
            respostaUtente: comunicacoesLog.respostaUtente,
            createdAt: comunicacoesLog.createdAt,
            utenteId: comunicacoesLog.utenteId,
            utenteNome: utentes.nome,
          })
          .from(comunicacoesLog)
          .leftJoin(utentes, eq(comunicacoesLog.utenteId, utentes.id))
          .orderBy(desc(comunicacoesLog.createdAt))
          .limit(20);

        return { comunicacoes: recentes };
      } catch {
        return { comunicacoes: [] };
      }
    }),
});
