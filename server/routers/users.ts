import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { users } from "../../drizzle/schema";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";

export const usersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    if (!hasPermission(ctx.user, "users.read")) throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const allUsers = await db.select().from(users);
    return { users: allUsers };
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.enum(["master", "admin", "medico", "recepcao", "user"]),
      password: z.string().min(6),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.create")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      
      // Nota: Em produção, a password deve ser hashed. Aqui usamos o campo password_hash.
      const [result] = await db.insert(users).values({
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash: input.password, // Simplificado para este ambiente
        openId: `local_${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      
      return { success: true, id: result.insertId };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      email: z.string().email().optional(),
      role: z.enum(["master", "admin", "medico", "recepcao", "user"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.update")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      
      const { id, ...data } = input;
      await db.update(users).set({ ...data, updatedAt: new Date() }).where(eq(users.id, id));
      
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "users.delete")) throw new TRPCError({ code: "FORBIDDEN" });
      if (ctx.user.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não pode eliminar o seu próprio utilizador" });
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),
});
