/**
 * App Mobile Router — Gestão de Dispositivos e Notificações Push
 * DentCare Elite V31 — Persistência real na tabela dispositivos_moveis
 */import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { dispositivosMoveis } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";

const registarDispositivoSchema = z.object({
  deviceId: z.string().min(1),
  tipo: z.enum(["ios", "android", "web"]),
  pushToken: z.string().optional(),
});

export const appMobileRouter = router({
  /**
   * Registar ou atualizar um dispositivo móvel na BD
   */
  registarDispositivo: protectedProcedure
    .input(registarDispositivoSchema)
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Tentar encontrar dispositivo existente pelo deviceId
      const existente = await db
        .select()
        .from(dispositivosMoveis)
        .where(eq(dispositivosMoveis.deviceId, input.deviceId))
        .limit(1);

      if (existente.length > 0) {
        // Atualizar dispositivo existente
        await db
          .update(dispositivosMoveis)
          .set({
            usuarioId: ctx.user?.id ?? null,
            pushToken: input.pushToken ?? existente[0].pushToken,
            ultimoAcesso: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(dispositivosMoveis.id, existente[0].id));

        return {
          success: true,
          dispositivoId: existente[0].id,
          message: "Dispositivo atualizado com sucesso",
        };
      } else {
        // Inserir novo dispositivo
        const result = await db.insert(dispositivosMoveis).values({
          usuarioId: ctx.user?.id ?? null,
          deviceId: input.deviceId,
          tipo: input.tipo,
          pushToken: input.pushToken ?? null,
          ultimoAcesso: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        return {
          success: true,
          dispositivoId: Number(result[0].insertId),
          message: "Dispositivo registado com sucesso",
        };
      }
    }),

  /**
   * Simulação de envio de notificação push (em produção integraria com Firebase/OneSignal)
   */
  enviarNotificacaoPush: protectedProcedure
    .input(z.object({ usuarioId: z.number(), titulo: z.string(), mensagem: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Obter tokens do utilizador
      const dispositivos = await db
        .select({ pushToken: dispositivosMoveis.pushToken })
        .from(dispositivosMoveis)
        .where(and(
          eq(dispositivosMoveis.usuarioId, input.usuarioId),
          sql`${dispositivosMoveis.pushToken} IS NOT NULL`
        ));

      if (dispositivos.length === 0) {
        return { success: false, message: "Utilizador não tem dispositivos com push token registado" };
      }

      // Lógica de envio (Simulada para logs, em produção usaria serviço externo)
      console.log(`[PUSH] Enviando para ${dispositivos.length} dispositivos do user ${input.usuarioId}: ${input.titulo}`);
      
      return { 
        success: true, 
        message: `Notificação enviada para ${dispositivos.length} dispositivos`,
        tokens: dispositivos.length
      };
    }),
});

// Helper para usar and sem importar no topo (evitar conflitos se necessário)
import { and } from "drizzle-orm";
