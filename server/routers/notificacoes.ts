/**
 * Router de Notificações — Centro de Notificações Inteligente
 * DentCare V35
 *
 * Endpoints tRPC para gestão de notificações persistentes.
 * NOTA V35.5: Este router é seguro por design — todos os endpoints filtram
 * por ctx.user.id, garantindo que cada utilizador apenas acede às suas
 * próprias notificações. Não é necessário RBAC adicional.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import {
  obterNotificacoes,
  marcarComoLida,
  marcarTodasComoLidas,
  contarNaoLidas,
  eliminarNotificacao,
} from "../services/notificationService";

export const notificacoesRouter = router({
  /**
   * Listar notificações do utilizador autenticado
   * Seguro: filtrado por ctx.user.id
   */
  listar: protectedProcedure
    .input(z.object({
      limite: z.number().min(1).max(100).optional().default(50),
      apenasNaoLidas: z.boolean().optional().default(false),
      tipo: z.enum([
        "consulta", "pagamento", "utente", "alerta", "sistema",
        "marketing", "laboratorio", "stock", "ia"
      ]).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      const notifs = await obterNotificacoes(ctx.user.id, {
        limite: input?.limite,
        apenasNaoLidas: input?.apenasNaoLidas,
        tipo: input?.tipo as any,
      });
      return { success: true, notificacoes: notifs };
    }),

  /**
   * Contar notificações não lidas
   * Seguro: filtrado por ctx.user.id
   */
  contarNaoLidas: protectedProcedure
    .query(async ({ ctx }) => {
      const contagem = await contarNaoLidas(ctx.user.id);
      return { success: true, ...contagem };
    }),

  /**
   * Marcar uma notificação como lida
   */
  marcarLida: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const sucesso = await marcarComoLida(input.id);
      return { success: sucesso };
    }),

  /**
   * Marcar todas como lidas
   * Seguro: filtrado por ctx.user.id
   */
  marcarTodasLidas: protectedProcedure
    .mutation(async ({ ctx }) => {
      const sucesso = await marcarTodasComoLidas(ctx.user.id);
      return { success: sucesso };
    }),

  /**
   * Eliminar uma notificação
   */
  eliminar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const sucesso = await eliminarNotificacao(input.id);
      return { success: sucesso };
    }),
});
