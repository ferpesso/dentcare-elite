/**
 * marketing.ts — Router tRPC de Marketing
 * DentCare Elite V32.1 — Campanhas Interativas
 *
 * UPGRADE: Adicionado suporte a:
 * - Campanhas com botões interativos (CTA de marcação, feedback, etc.)
 * - Campanhas de follow-up pós-consulta automáticas
 * - Campanhas de aniversário automáticas
 * - Campanhas de pedido de avaliação
 * - Estatísticas por tipo de campanha (FIX: antes era hardcoded)
 * - Agendamento de campanhas para data futura
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { getDb } from "../db";
import { campanhasMarketing, utentes, consultas, medicos, configuracoesClinica } from "../../drizzle/schema";
import { eq, desc, sql, and, gte, lte, lt } from "drizzle-orm";
import {
  enviarMensagemWhatsApp,
  enviarCampanhaReativacao,
  enviarFollowupPosConsulta,
  enviarPedidoAvaliacao,
  enviarFelicitacaoAniversario,
  type AnyWhatsAppMessage,
} from "../whatsappService";
import { subMonths, subDays, startOfDay, endOfDay, format } from "date-fns";

export const marketingRouter = router({
  // ─── Listar Campanhas ────────────────────────────────────────────────────────
  listarCampanhas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "whatsapp.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const campanhas = await db
        .select()
        .from(campanhasMarketing)
        .orderBy(desc(campanhasMarketing.createdAt));

      return { success: true, campanhas, total: campanhas.length };
    }),

  // ─── Criar Campanha ──────────────────────────────────────────────────────────
  criarCampanha: protectedProcedure
    .input(z.object({
      nome: z.string().min(1),
      descricao: z.string().optional(),
      tipoTemplate: z.string(),
      mensagem: z.string().min(1),
      utentesIds: z.array(z.number()).optional(),
      interativa: z.boolean().optional().default(false),
      botoes: z.array(z.object({
        id: z.string(),
        title: z.string().max(20),
      })).optional(),
      agendadaPara: z.date().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const estado = input.agendadaPara ? "agendada" : "rascunho";

      const [result] = await db.insert(campanhasMarketing).values({
        nome: input.nome,
        descricao: input.descricao || null,
        tipoTemplate: input.tipoTemplate,
        mensagem: input.mensagem,
        estado,
        totalUtentes: input.utentesIds?.length || 0,
        totalEnviadas: 0,
        totalEntregues: 0,
        totalLidas: 0,
        totalRespostas: 0,
        criadoPor: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "campanhas_marketing",
        registoId: result.insertId,
        descricao: `Campanha criada: ${input.nome}${input.interativa ? " (interativa)" : ""}`,
      });

      return { success: true, campanhaId: result.insertId };
    }),

  // ─── Executar Campanha ───────────────────────────────────────────────────────
  executarCampanha: protectedProcedure
    .input(z.object({
      campanhaId: z.number().int().positive(),
      utentesIds: z.array(z.number()).optional(),
      interativa: z.boolean().optional().default(false),
      botoes: z.array(z.object({
        id: z.string(),
        title: z.string().max(20),
      })).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Obter nome da clínica para o footer das mensagens
      const cfgRows = await db.select().from(configuracoesClinica).where(eq(configuracoesClinica.chave, "nome_clinica")).limit(1);
      const nomeClinica = cfgRows[0]?.valor || "Clínica";

      const [campanha] = await db.select().from(campanhasMarketing)
        .where(eq(campanhasMarketing.id, input.campanhaId)).limit(1);
      if (!campanha) throw new TRPCError({ code: "NOT_FOUND", message: "Campanha não encontrada" });
      if (campanha.estado === "concluida") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Campanha já foi concluída" });
      }

      await db.update(campanhasMarketing)
        .set({ estado: "em_progresso", updatedAt: new Date() })
        .where(eq(campanhasMarketing.id, input.campanhaId));

      // Obter utentes com telemovel
      let destinatarios: { id: number; nome: string; telemovel: string }[] = [];
      if (input.utentesIds && input.utentesIds.length > 0) {
        const rows = await db.select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel })
          .from(utentes);
        destinatarios = rows.filter(u => u.telemovel && input.utentesIds!.includes(u.id));
      } else {
        const rows = await db.select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel }).from(utentes);
        destinatarios = rows.filter(u => !!u.telemovel);
      }

      let enviadas = 0;
      const erros: string[] = [];

      for (const utente of destinatarios) {
        try {
          const mensagemPersonalizada = campanha.mensagem
            .replace(/\{nome\}/gi, utente.nome)
            .replace(/\{utente\}/gi, utente.nome);

          // Decidir tipo de mensagem: interativa ou texto simples
          if (input.interativa && input.botoes && input.botoes.length > 0) {
            await enviarMensagemWhatsApp({
              to: utente.telemovel,
              body: mensagemPersonalizada,
              type: "interactive_buttons",
              utenteId: utente.id,
              buttons: input.botoes,
              footer: `${nomeClinica} — A sua clínica digital`,
            } as any);
          } else {
            await enviarMensagemWhatsApp({
              to: utente.telemovel,
              body: mensagemPersonalizada,
              type: "custom",
              utenteId: utente.id,
            });
          }
          enviadas++;
        } catch (e: any) {
          erros.push(`${utente.nome}: ${e?.message ?? "erro desconhecido"}`);
        }
      }

      await db.update(campanhasMarketing)
        .set({
          estado: "concluida",
          totalEnviadas: enviadas,
          totalUtentes: destinatarios.length,
          updatedAt: new Date(),
        })
        .where(eq(campanhasMarketing.id, input.campanhaId));

      await logAuditAction(ctx.user, {
        acao: "CAMPANHA_EXECUTADA",
        tabela: "campanhas_marketing",
        registoId: input.campanhaId,
        descricao: `Campanha "${campanha.nome}" enviada: ${enviadas}/${destinatarios.length} mensagens${input.interativa ? " (interativa)" : ""}.`,
      });

      return {
        success: true,
        enviadas,
        totalDestinatarios: destinatarios.length,
        erros: erros.slice(0, 10),
        mensagem: `${enviadas} mensagens enviadas de ${destinatarios.length} destinatários.`,
      };
    }),

  // ─── Executar Campanha de Reativação Automática ──────────────────────────────
  executarReativacaoAutomatica: protectedProcedure
    .input(z.object({
      mesesInatividade: z.number().min(1).max(24).default(6),
      especialidade: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const dataLimite = subMonths(new Date(), input.mesesInatividade);

      // Buscar utentes cuja última consulta foi antes da data limite
      const todosUtentes = await db
        .select({
          id: utentes.id,
          nome: utentes.nome,
          telemovel: utentes.telemovel,
        })
        .from(utentes)
        .where(sql`${utentes.telemovel} IS NOT NULL AND ${utentes.telemovel} != ''`);

      let enviadas = 0;
      const erros: string[] = [];

      for (const utente of todosUtentes) {
        // Verificar última consulta
        const ultimaConsulta = await db
          .select({ dataHoraInicio: consultas.dataHoraInicio })
          .from(consultas)
          .where(eq(consultas.utenteId, utente.id))
          .orderBy(desc(consultas.dataHoraInicio))
          .limit(1);

        const ultimaData = ultimaConsulta[0]?.dataHoraInicio;
        if (!ultimaData || new Date(ultimaData) > dataLimite) continue;

        try {
          await enviarCampanhaReativacao(
            utente.nome,
            utente.telemovel,
            new Date(ultimaData),
            input.especialidade || "Consulta de Rotina"
          );
          enviadas++;
        } catch (e: any) {
          erros.push(`${utente.nome}: ${e?.message ?? "erro"}`);
        }
      }

      // Criar registo de campanha
      await db.insert(campanhasMarketing).values({
        nome: `Reativação Automática (${input.mesesInatividade}+ meses)`,
        descricao: `Campanha automática para utentes inativos há mais de ${input.mesesInatividade} meses`,
        tipoTemplate: "reactivation",
        mensagem: "Campanha de reativação com botões interativos",
        estado: "concluida",
        totalUtentes: todosUtentes.length,
        totalEnviadas: enviadas,
        totalEntregues: 0,
        totalLidas: 0,
        totalRespostas: 0,
        criadoPor: ctx.user.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "CAMPANHA_REATIVACAO",
        tabela: "campanhas_marketing",
        registoId: 0,
        descricao: `Reativação automática: ${enviadas} mensagens enviadas (${input.mesesInatividade}+ meses inatividade)`,
      });

      return { success: true, enviadas, totalAnalisados: todosUtentes.length, erros: erros.slice(0, 10) };
    }),

  // ─── Executar Follow-up Pós-Consulta Automático ──────────────────────────────
  executarFollowupAutomatico: protectedProcedure
    .input(z.object({
      diasAposConsulta: z.number().min(1).max(7).default(2),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const dataAlvo = subDays(new Date(), input.diasAposConsulta);
      const inicio = startOfDay(dataAlvo);
      const fim = endOfDay(dataAlvo);

      // Buscar consultas realizadas há X dias
      const consultasRealizadas = await db
        .select({
          id: consultas.id,
          tipoConsulta: consultas.tipoConsulta,
          utenteNome: utentes.nome,
          utenteTelemovel: utentes.telemovel,
          medicoNome: medicos.nome,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
        .where(
          and(
            eq(consultas.estado, "realizada"),
            gte(consultas.dataHoraInicio, inicio),
            lte(consultas.dataHoraInicio, fim)
          )
        );

      let enviadas = 0;
      const erros: string[] = [];

      for (const c of consultasRealizadas) {
        if (!c.utenteTelemovel) continue;
        try {
          await enviarFollowupPosConsulta(
            c.id,
            c.utenteNome,
            c.utenteTelemovel,
            c.tipoConsulta || "Consulta",
            c.medicoNome
          );
          enviadas++;
        } catch (e: any) {
          erros.push(`${c.utenteNome}: ${e?.message ?? "erro"}`);
        }
      }

      return { success: true, enviadas, totalConsultas: consultasRealizadas.length, erros: erros.slice(0, 10) };
    }),

  // ─── Executar Pedidos de Avaliação Automáticos ───────────────────────────────
  executarAvaliacoesAutomaticas: protectedProcedure
    .input(z.object({
      diasAposConsulta: z.number().min(3).max(14).default(5),
      clinicaNome: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const dataAlvo = subDays(new Date(), input.diasAposConsulta);
      const inicio = startOfDay(dataAlvo);
      const fim = endOfDay(dataAlvo);

      const consultasRealizadas = await db
        .select({
          id: consultas.id,
          utenteNome: utentes.nome,
          utenteTelemovel: utentes.telemovel,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .where(
          and(
            eq(consultas.estado, "realizada"),
            gte(consultas.dataHoraInicio, inicio),
            lte(consultas.dataHoraInicio, fim)
          )
        );

      let enviadas = 0;
      const erros: string[] = [];

      for (const c of consultasRealizadas) {
        if (!c.utenteTelemovel) continue;
        try {
          await enviarPedidoAvaliacao(c.id, c.utenteNome, c.utenteTelemovel, input.clinicaNome);
          enviadas++;
        } catch (e: any) {
          erros.push(`${c.utenteNome}: ${e?.message ?? "erro"}`);
        }
      }

      return { success: true, enviadas, totalConsultas: consultasRealizadas.length, erros: erros.slice(0, 10) };
    }),

  // ─── Executar Felicitações de Aniversário ────────────────────────────────────
  executarAniversariosHoje: protectedProcedure
    .input(z.object({
      desconto: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const hoje = new Date();
      const mes = hoje.getMonth() + 1;
      const dia = hoje.getDate();

      // Buscar utentes que fazem anos hoje
      const aniversariantes = await db
        .select({ id: utentes.id, nome: utentes.nome, telemovel: utentes.telemovel })
        .from(utentes)
        .where(
          sql`MONTH(${utentes.dataNascimento}) = ${mes} AND DAY(${utentes.dataNascimento}) = ${dia} AND ${utentes.telemovel} IS NOT NULL AND ${utentes.telemovel} != ''`
        );

      let enviadas = 0;
      const erros: string[] = [];

      for (const utente of aniversariantes) {
        try {
          await enviarFelicitacaoAniversario(
            utente.nome,
            utente.telemovel,
            utente.id,
            input.desconto
          );
          enviadas++;
        } catch (e: any) {
          erros.push(`${utente.nome}: ${e?.message ?? "erro"}`);
        }
      }

      return { success: true, enviadas, totalAniversariantes: aniversariantes.length, erros: erros.slice(0, 10) };
    }),

  // ─── Estatísticas Gerais ─────────────────────────────────────────────────────
  obterEstatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "whatsapp.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const stats = await db
        .select({
          totalCampanhas: sql<number>`count(*)`,
          enviadas: sql<number>`COALESCE(sum(${campanhasMarketing.totalEnviadas}), 0)`,
          entregues: sql<number>`COALESCE(sum(${campanhasMarketing.totalEntregues}), 0)`,
          lidas: sql<number>`COALESCE(sum(${campanhasMarketing.totalLidas}), 0)`,
          respostas: sql<number>`COALESCE(sum(${campanhasMarketing.totalRespostas}), 0)`,
        })
        .from(campanhasMarketing);

      const s = stats[0] || { totalCampanhas: 0, enviadas: 0, entregues: 0, lidas: 0, respostas: 0 };
      const enviadas = Number(s.enviadas) || 0;
      const entregues = Number(s.entregues) || 0;
      const lidas = Number(s.lidas) || 0;
      const respostas = Number(s.respostas) || 0;

      return {
        success: true,
        estatisticas: {
          totalCampanhas: Number(s.totalCampanhas) || 0,
          enviadas,
          entregues,
          lidas,
          respostas,
          taxaEntrega: enviadas > 0 ? Math.round((entregues / enviadas) * 100) : 0,
          taxaLeitura: entregues > 0 ? Math.round((lidas / entregues) * 100) : 0,
          taxaResposta: lidas > 0 ? Math.round((respostas / lidas) * 100) : 0,
        },
      };
    }),

  // ─── FIX: Estatísticas por Tipo de Campanha (antes era hardcoded!) ───────────
  obterEstatisticasPorTipo: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "whatsapp.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const statsPorTipo = await db
        .select({
          tipoTemplate: campanhasMarketing.tipoTemplate,
          totalCampanhas: sql<number>`count(*)`,
          enviadas: sql<number>`COALESCE(sum(${campanhasMarketing.totalEnviadas}), 0)`,
          entregues: sql<number>`COALESCE(sum(${campanhasMarketing.totalEntregues}), 0)`,
          lidas: sql<number>`COALESCE(sum(${campanhasMarketing.totalLidas}), 0)`,
          respostas: sql<number>`COALESCE(sum(${campanhasMarketing.totalRespostas}), 0)`,
        })
        .from(campanhasMarketing)
        .groupBy(campanhasMarketing.tipoTemplate);

      const resultado = statsPorTipo.map(s => {
        const enviadas = Number(s.enviadas) || 0;
        const entregues = Number(s.entregues) || 0;
        return {
          tipo: s.tipoTemplate,
          totalCampanhas: Number(s.totalCampanhas) || 0,
          enviadas,
          entregues,
          lidas: Number(s.lidas) || 0,
          respostas: Number(s.respostas) || 0,
          taxaEntrega: enviadas > 0 ? Math.round((entregues / enviadas) * 100) : 0,
        };
      });

      return { success: true, estatisticasPorTipo: resultado };
    }),
});
