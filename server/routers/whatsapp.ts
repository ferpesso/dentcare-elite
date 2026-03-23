/**
 * whatsapp.ts — Router tRPC para WhatsApp
 * DentCare Elite V32.1 — Mensagens Interativas
 *
 * UPGRADE: Novos endpoints para:
 * - Envio de mensagens com botões interativos
 * - Envio de listas interativas (menus, horários)
 * - Follow-up pós-consulta automático
 * - Pedido de avaliação/feedback
 * - Felicitação de aniversário
 * - Menu principal do chatbot
 * - Horários disponíveis para marcação
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  enviarMensagemWhatsApp,
  enviarLembrete,
  enviarConfirmacaoMarcacao,
  enviarCampanhaReativacao,
  enviarFollowupPosConsulta,
  enviarPedidoAvaliacao,
  enviarFelicitacaoAniversario,
  enviarMenuPrincipal,
  enviarHorariosDisponiveis,
  enviarListaServicos,
  parseWhatsAppResponse,
  healthCheckWhatsApp,
  validarWhatsApp,
  type AnyWhatsAppMessage,
} from "../whatsappService";
import { hasPermission } from "../rbac";

export const whatsappRouter = router({
  /**
   * Enviar mensagem de texto simples
   */
  enviarMensagem: protectedProcedure
    .input(
      z.object({
        telefone: z.string().min(9, "Número de telefone inválido"),
        mensagem: z.string().min(1).max(1000),
        tipo: z.enum(["reminder", "confirmation", "reactivation", "custom", "followup", "feedback", "birthday", "promotion"]),
        consultaId: z.number().optional(),
        utenteId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão para enviar mensagens WhatsApp");
      }

      try {
        const result = await enviarMensagemWhatsApp({
          to: input.telefone,
          body: input.mensagem,
          type: input.tipo,
          consultaId: input.consultaId,
          utenteId: input.utenteId,
          metadata: {
            sentBy: ctx.user.id,
            sentAt: new Date(),
          },
        });

        return {
          success: true,
          jobId: result.jobId,
          message: "Mensagem adicionada à fila com sucesso",
        };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending message:", error);
        throw new Error("Falha ao enviar mensagem WhatsApp");
      }
    }),

  /**
   * Enviar mensagem com botões interativos
   */
  enviarMensagemInterativa: protectedProcedure
    .input(
      z.object({
        telefone: z.string().min(9, "Número de telefone inválido"),
        mensagem: z.string().min(1).max(1000),
        header: z.string().optional(),
        footer: z.string().optional(),
        botoes: z.array(z.object({
          id: z.string(),
          title: z.string().max(20),
        })).min(1).max(3),
        consultaId: z.number().optional(),
        utenteId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão para enviar mensagens interativas");
      }

      try {
        const result = await enviarMensagemWhatsApp({
          to: input.telefone,
          body: input.mensagem,
          type: "interactive_buttons",
          header: input.header,
          footer: input.footer,
          buttons: input.botoes,
          consultaId: input.consultaId,
          utenteId: input.utenteId,
          metadata: { sentBy: ctx.user.id, sentAt: new Date() },
        } as any);

        return {
          success: true,
          jobId: result.jobId,
          message: "Mensagem interativa adicionada à fila com sucesso",
        };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending interactive message:", error);
        throw new Error("Falha ao enviar mensagem interativa");
      }
    }),

  /**
   * Enviar lembrete de consulta COM BOTÕES INTERATIVOS
   */
  enviarLembrete: protectedProcedure
    .input(
      z.object({
        consultaId: z.number(),
        utenteName: z.string(),
        consultaTime: z.string(),
        utenteTelefone: z.string(),
        medicoNome: z.string().optional(),
        tipoConsulta: z.string().optional(),
        consultaData: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão para enviar lembretes");
      }

      try {
        const result = await enviarLembrete(
          input.consultaId,
          input.utenteName,
          input.consultaTime,
          input.utenteTelefone,
          input.medicoNome,
          input.tipoConsulta,
          input.consultaData
        );

        return {
          success: true,
          jobId: result.jobId,
          message: "Lembrete interativo adicionado à fila com sucesso",
        };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending reminder:", error);
        throw new Error("Falha ao enviar lembrete");
      }
    }),

  /**
   * Enviar confirmação de marcação COM BOTÕES
   */
  enviarConfirmacao: protectedProcedure
    .input(
      z.object({
        consultaId: z.number(),
        utenteName: z.string(),
        data: z.string(),
        hora: z.string(),
        medicoNome: z.string(),
        utenteTelefone: z.string(),
        tipoConsulta: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarConfirmacaoMarcacao(
          input.consultaId,
          input.utenteName,
          input.data,
          input.hora,
          input.medicoNome,
          input.utenteTelefone,
          input.tipoConsulta
        );

        return { success: true, jobId: result.jobId, message: "Confirmação enviada" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending confirmation:", error);
        throw new Error("Falha ao enviar confirmação");
      }
    }),

  /**
   * Enviar campanha de reativação COM BOTÕES INTERATIVOS
   */
  enviarCampanhaReativacao: protectedProcedure
    .input(
      z.object({
        utenteName: z.string(),
        utenteTelefone: z.string(),
        ultimaConsultaDate: z.date(),
        specialtyName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão para enviar campanhas");
      }

      try {
        const result = await enviarCampanhaReativacao(
          input.utenteName,
          input.utenteTelefone,
          input.ultimaConsultaDate,
          input.specialtyName
        );

        return { success: true, jobId: result.jobId, message: "Campanha de reativação enviada" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending reactivation:", error);
        throw new Error("Falha ao enviar campanha de reativação");
      }
    }),

  /**
   * Enviar follow-up pós-consulta COM BOTÕES DE FEEDBACK
   */
  enviarFollowup: protectedProcedure
    .input(
      z.object({
        consultaId: z.number(),
        utenteName: z.string(),
        utenteTelefone: z.string(),
        tipoConsulta: z.string(),
        medicoNome: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarFollowupPosConsulta(
          input.consultaId,
          input.utenteName,
          input.utenteTelefone,
          input.tipoConsulta,
          input.medicoNome
        );

        return { success: true, jobId: result.jobId, message: "Follow-up enviado" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending followup:", error);
        throw new Error("Falha ao enviar follow-up");
      }
    }),

  /**
   * Enviar pedido de avaliação COM BOTÕES DE RATING
   */
  enviarPedidoAvaliacao: protectedProcedure
    .input(
      z.object({
        consultaId: z.number(),
        utenteName: z.string(),
        utenteTelefone: z.string(),
        clinicaNome: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarPedidoAvaliacao(
          input.consultaId,
          input.utenteName,
          input.utenteTelefone,
          input.clinicaNome
        );

        return { success: true, jobId: result.jobId, message: "Pedido de avaliação enviado" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending review request:", error);
        throw new Error("Falha ao enviar pedido de avaliação");
      }
    }),

  /**
   * Enviar felicitação de aniversário COM BOTÃO DE MARCAÇÃO
   */
  enviarAniversario: protectedProcedure
    .input(
      z.object({
        utenteName: z.string(),
        utenteTelefone: z.string(),
        utenteId: z.number(),
        desconto: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarFelicitacaoAniversario(
          input.utenteName,
          input.utenteTelefone,
          input.utenteId,
          input.desconto
        );

        return { success: true, jobId: result.jobId, message: "Felicitação de aniversário enviada" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending birthday:", error);
        throw new Error("Falha ao enviar felicitação");
      }
    }),

  /**
   * Enviar menu principal do chatbot
   */
  enviarMenu: protectedProcedure
    .input(
      z.object({
        utenteTelefone: z.string(),
        utenteName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarMenuPrincipal(input.utenteTelefone, input.utenteName);
        return { success: true, jobId: result.jobId, message: "Menu enviado" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending menu:", error);
        throw new Error("Falha ao enviar menu");
      }
    }),

  /**
   * Enviar horários disponíveis para marcação via WhatsApp
   */
  enviarHorarios: protectedProcedure
    .input(
      z.object({
        utenteTelefone: z.string(),
        utenteName: z.string(),
        slots: z.array(z.object({
          id: z.string(),
          data: z.string(),
          hora: z.string(),
          medico: z.string(),
        })),
        tipoConsulta: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "whatsapp.send")) {
        throw new Error("FORBIDDEN: Sem permissão");
      }

      try {
        const result = await enviarHorariosDisponiveis(
          input.utenteTelefone,
          input.utenteName,
          input.slots,
          input.tipoConsulta
        );
        return { success: true, jobId: result.jobId, message: "Horários enviados" };
      } catch (error) {
        console.error("[WhatsApp Router] Error sending slots:", error);
        throw new Error("Falha ao enviar horários");
      }
    }),

  /**
   * Parse de resposta WhatsApp (para debug/teste)
   */
  parseResposta: protectedProcedure
    .input(
      z.object({
        mensagem: z.string(),
        buttonPayload: z.string().optional(),
        listPayload: z.string().optional(),
      })
    )
    .query(({ input }) => {
      const parsed = parseWhatsAppResponse(
        input.mensagem,
        input.buttonPayload,
        input.listPayload
      );

      return {
        parsed,
        interpretacao: {
          confirmado: parsed.tipo === "confirmacao",
          cancelado: parsed.tipo === "cancelamento",
          remarcar: parsed.tipo === "remarcar",
          agendar: parsed.tipo === "agendar",
          feedback: parsed.tipo.startsWith("feedback_"),
          urgencia: parsed.tipo === "urgencia",
          menu: parsed.tipo === "menu",
          desconhecido: parsed.tipo === "outro",
        },
      };
    }),

  /**
   * Validar credenciais Twilio
   */
  validarCredenciais: protectedProcedure
    .input(z.object({
      accountSid: z.string().min(1),
      authToken: z.string().min(1),
      whatsappNumber: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new Error("FORBIDDEN: Sem permissão para validar credenciais WhatsApp");
      }
      return validarWhatsApp(input.accountSid, input.authToken, input.whatsappNumber);
    }),

  /**
   * Health check do serviço WhatsApp
   */
  healthCheck: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "whatsapp.read")) {
      throw new Error("FORBIDDEN: Sem permissão para verificar saúde do serviço");
    }

    try {
      const health = await healthCheckWhatsApp();

      return {
        status: health.twilio && health.redis && health.queue ? "healthy" : "degraded",
        services: {
          twilio: health.twilio ? "online" : "offline",
          redis: health.redis ? "online" : "offline",
          queue: health.queue ? "online" : "offline",
        },
        features: {
          interactiveButtons: health.interactiveSupport,
          interactiveLists: health.interactiveSupport,
          chatbot: true,
          followup: true,
          feedback: true,
        },
      };
    } catch (error) {
      console.error("[WhatsApp Router] Health check failed:", error);
      return {
        status: "unhealthy",
        services: { twilio: "offline", redis: "offline", queue: "offline" },
        features: {
          interactiveButtons: false,
          interactiveLists: false,
          chatbot: false,
          followup: false,
          feedback: false,
        },
      };
    }
  }),
});
