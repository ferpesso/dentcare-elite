import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { eq, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import crypto from "crypto";
import bcrypt from "bcryptjs";

// Funcionários são utilizadores com role recepcao ou admin (não médicos)
const ROLES_FUNCIONARIO = ["recepcao", "admin"] as const;

export const funcionariosRouter = router({
  listar: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "users.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const results = await db.select({
        id: users.id,
        nome: users.name,
        email: users.email,
        role: users.role,
        username: users.username,
        createdAt: users.createdAt,
        lastSignedIn: users.lastSignedIn,
      }).from(users).where(inArray(users.role, ["recepcao", "admin"]));
      return { success: true, funcionarios: results };
    }),

  criar: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      role: z.enum(["recepcao", "admin"]).default("recepcao"),
      password: z.string().min(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.create")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const openId = `func_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const passwordHash = input.password
        ? await bcrypt.hash(input.password, 12)
        : null;
      const [result] = await db.insert(users).values({
        openId,
        name: input.nome,
        email: input.email ?? null,
        username: input.username ?? null,
        role: input.role,
        loginMethod: "password",
        passwordHash,
      });
      await logAuditAction(ctx.user, { acao: "create", tabela: "users", registoId: result.insertId, descricao: `Funcionário criado: ${input.nome} (${input.role})` });
      return { success: true, id: result.insertId };
    }),

  actualizar: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(2).optional(),
      email: z.string().email().optional(),
      username: z.string().min(3).optional(),
      role: z.enum(["recepcao", "admin"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.update")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, nome, ...rest } = input;
      const update: any = { ...rest, updatedAt: new Date() };
      if (nome) update.name = nome;
      await db.update(users).set(update).where(eq(users.id, id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "users", registoId: id, descricao: `Funcionário actualizado: ${id}` });
      return { success: true };
    }),

  eliminar: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.delete")) throw new TRPCError({ code: "FORBIDDEN" });
      // Não eliminar o próprio utilizador
      if (ctx.user.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode eliminar a sua própria conta" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.delete(users).where(eq(users.id, input.id));
      await logAuditAction(ctx.user, { acao: "delete", tabela: "users", registoId: input.id, descricao: `Funcionário eliminado: ${input.id}` });
      return { success: true };
    }),
});
