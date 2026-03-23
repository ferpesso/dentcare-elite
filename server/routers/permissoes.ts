/**
 * Router de Permissões — Gestão de Papéis e Permissões
 * DentCare Elite V31 — RBAC (Role-Based Access Control)
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { eq } from "drizzle-orm";

export const permissoesRouter = router({
  /**
   * Listar todas as permissões disponíveis
   */
  listar: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "users.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const permissoes = {
        utentes: [
          { chave: "utentes.read", label: "Ver utentes" },
          { chave: "utentes.create", label: "Criar utentes" },
          { chave: "utentes.update", label: "Editar utentes" },
          { chave: "utentes.delete", label: "Eliminar utentes" },
        ],
        consultas: [
          { chave: "consultas.read", label: "Ver consultas" },
          { chave: "consultas.create", label: "Criar consultas" },
          { chave: "consultas.update", label: "Editar consultas" },
          { chave: "consultas.delete", label: "Eliminar consultas" },
        ],
        financeiro: [
          { chave: "financeiro.read", label: "Ver dados financeiros" },
          { chave: "financeiro.update", label: "Editar dados financeiros" },
          { chave: "pagamentos.create", label: "Registar pagamentos" },
          { chave: "faturas.read", label: "Ver faturas" },
        ],
        stocks: [
          { chave: "stocks.read", label: "Ver stocks" },
          { chave: "stocks.create", label: "Criar produtos" },
          { chave: "stocks.update", label: "Editar stocks" },
          { chave: "stocks.delete", label: "Eliminar produtos" },
        ],
        whatsapp: [
          { chave: "whatsapp.read", label: "Ver histórico WhatsApp" },
          { chave: "whatsapp.send", label: "Enviar mensagens WhatsApp" },
        ],
        sistema: [
          { chave: "system.configure", label: "Configurar sistema" },
          { chave: "system.backup", label: "Fazer backups" },
          { chave: "auditlog.read", label: "Ver audit log" },
          { chave: "users.manage_roles", label: "Gerir papéis" },
        ],
      };

      return { success: true, permissoes };
    }),

  /**
   * Listar todos os papéis (roles)
   */
  listarRoles: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "users.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const roles = [
        {
          id: 1,
          nome: "master",
          descricao: "Acesso total ao sistema",
          permissoes: ["*"],
        },
        {
          id: 2,
          nome: "admin",
          descricao: "Gestor da clínica",
          permissoes: [
            "utentes.read", "utentes.create", "utentes.update",
            "consultas.read", "consultas.create", "consultas.update",
            "financeiro.read", "financeiro.update",
            "pagamentos.create", "faturas.read",
            "stocks.read", "stocks.update",
            "whatsapp.send", "whatsapp.read",
            "system.configure", "auditlog.read",
          ],
        },
        {
          id: 3,
          nome: "medico",
          descricao: "Médico/Dentista",
          permissoes: [
            "utentes.read", "utentes.update",
            "consultas.read", "consultas.update",
            "financeiro.read",
            "whatsapp.send",
          ],
        },
        {
          id: 4,
          nome: "recepcao",
          descricao: "Receção",
          permissoes: [
            "utentes.read", "utentes.create", "utentes.update",
            "consultas.read", "consultas.create", "consultas.update",
            "pagamentos.create", "faturas.read",
            "whatsapp.send", "whatsapp.read",
          ],
        },
      ];

      return { success: true, roles };
    }),

  /**
   * Obter permissões de um papel específico
   */
  obterPermissoesRole: protectedProcedure
    .input(z.object({ roleId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const rolesMap: Record<number, string[]> = {
        1: ["*"],
        2: [
          "utentes.read", "utentes.create", "utentes.update",
          "consultas.read", "consultas.create", "consultas.update",
          "financeiro.read", "financeiro.update",
          "pagamentos.create", "faturas.read",
          "stocks.read", "stocks.update",
          "whatsapp.send", "whatsapp.read",
          "system.configure", "auditlog.read",
        ],
        3: [
          "utentes.read", "utentes.update",
          "consultas.read", "consultas.update",
          "financeiro.read",
          "whatsapp.send",
        ],
        4: [
          "utentes.read", "utentes.create", "utentes.update",
          "consultas.read", "consultas.create", "consultas.update",
          "pagamentos.create", "faturas.read",
          "whatsapp.send", "whatsapp.read",
        ],
      };

      const permissoes = rolesMap[input.roleId] || [];
      return { success: true, permissoes };
    }),

  /**
   * Listar utilizadores com seus papéis
   */
  listarUtilizadores: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "users.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const utilizadores = await db
        .select({
          id: users.id,
          nome: users.name,
          email: users.email,
          role: users.role,
          createdAt: users.createdAt,
          lastSignedIn: users.lastSignedIn,
        })
        .from(users);

      return {
        success: true,
        utilizadores: utilizadores.map((u) => ({
          ...u,
          activo: true,
          ultimoAcesso: u.lastSignedIn || u.createdAt,
        })),
      };
    }),

  /**
   * Obter utilizador por ID
   */
  obterUtilizador: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [utilizador] = await db
        .select()
        .from(users)
        .where(eq(users.id, input.id))
        .limit(1);

      if (!utilizador) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Utilizador não encontrado" });
      }

      return { success: true, utilizador };
    }),

  /**
   * Actualizar papel de utilizador
   */
  actualizarPapel: protectedProcedure
    .input(z.object({
      userId: z.number(),
      novoRole: z.enum(["master", "admin", "medico", "recepcao", "user"]),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.manage_roles")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      if (ctx.user.id === input.userId && input.novoRole !== "master") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Não pode remover o seu próprio papel de administrador",
        });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(users).set({ role: input.novoRole }).where(eq(users.id, input.userId));

      return { success: true, message: "Papel actualizado com sucesso" };
    }),
});
