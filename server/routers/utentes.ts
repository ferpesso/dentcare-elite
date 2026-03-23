/**
 * Router de Utentes — CRUD Completo
 * DentCare Elite V31 — Gestão de Pacientes
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { utentes, consultas, faturas } from "../../drizzle/schema";
import { TRPCError } from "@trpc/server";
import { eq, like, or, desc, and, count, sql } from "drizzle-orm";
import { logAuditAction } from "../auditService";
import { hasPermission } from "../rbac";

export const utentesRouter = router({
  list: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      ativo: z.boolean().optional(),
      // FIX V35.5: Paginação real no servidor (limit/offset)
      limite: z.number().int().min(1).max(200).optional().default(50),
      offset: z.number().int().min(0).optional().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const conditions = [];
      if (input?.ativo !== undefined) conditions.push(eq(utentes.ativo, input.ativo));
      if (input?.search && input.search.trim()) {
        const s = `%${input.search.trim()}%`;
        conditions.push(or(like(utentes.nome, s), like(utentes.telemovel, s), like(utentes.email, s), like(utentes.nif, s)));
      }
      const limite = input?.limite ?? 50;
      const offset = input?.offset ?? 0;
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      // Contar total sem carregar todos os registos em memória
      const [totalResult] = await db
        .select({ total: count() })
        .from(utentes)
        .where(whereClause);
      // Listagem paginada
      const results = await db
        .select()
        .from(utentes)
        .where(whereClause)
        .orderBy(desc(utentes.createdAt))
        .limit(limite)
        .offset(offset);
      return {
        utentes: results,
        total: Number(totalResult?.total) || 0,
        limite,
        offset,
        temMais: offset + results.length < (Number(totalResult?.total) || 0),
      };
    }),

  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder a utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [utente] = await db.select().from(utentes).where(eq(utentes.id, input.id)).limit(1);
      if (!utente) throw new TRPCError({ code: "NOT_FOUND", message: "Utente não encontrado" });
      return utente;
    }),

  create: protectedProcedure
    .input(z.object({
      nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
      telemovel: z.string().min(9, "Telemovel inválido"),
      email: z.string().email("Email inválido").optional().or(z.literal("")),
      nif: z.string().optional(),
      dataNascimento: z.string().optional(),
      genero: z.enum(["masculino", "feminino", "outro"]).optional(),
      morada: z.string().optional(),
      localidade: z.string().optional(),
      cidade: z.string().optional(),
      codigoPostal: z.string().optional(),
      pais: z.string().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      if (input.nif && input.nif.trim()) {
        const [existente] = await db.select({ id: utentes.id }).from(utentes).where(eq(utentes.nif, input.nif.trim())).limit(1);
        if (existente) throw new TRPCError({ code: "CONFLICT", message: "Já existe um utente com este NIF" });
      }
      if (input.email && input.email.trim()) {
        const [existente] = await db.select({ id: utentes.id }).from(utentes).where(eq(utentes.email, input.email.trim())).limit(1);
        if (existente) throw new TRPCError({ code: "CONFLICT", message: "Já existe um utente com este email" });
      }
      const [result] = await db.insert(utentes).values({
        nome: input.nome.trim(),
        telemovel: input.telemovel.trim(),
        email: input.email?.trim() || null,
        nif: input.nif?.trim() || null,
        dataNascimento: input.dataNascimento ? new Date(input.dataNascimento) : null,
        genero: input.genero || null,
        morada: input.morada?.trim() || null,
        localidade: input.localidade?.trim() || null,
        cidade: input.cidade?.trim() || null,
        codigoPostal: input.codigoPostal?.trim() || null,
        pais: input.pais?.trim() || "Portugal",
        observacoes: input.observacoes?.trim() || null,
        ativo: true,
      });
      await logAuditAction(ctx.user, { acao: "create", tabela: "utentes", registoId: result.insertId, descricao: `Utente criado: ${input.nome}` });
      return { success: true, utenteId: result.insertId, mensagem: "Utente criado com sucesso" };
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(2).optional(),
      telemovel: z.string().min(9).optional(),
      email: z.string().email().optional().or(z.literal("")),
      nif: z.string().optional(),
      dataNascimento: z.string().optional(),
      genero: z.enum(["masculino", "feminino", "outro"]).optional(),
      morada: z.string().optional(),
      localidade: z.string().optional(),
      cidade: z.string().optional(),
      codigoPostal: z.string().optional(),
      pais: z.string().optional(),
      observacoes: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para actualizar utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, dataNascimento, ...rest } = input;
      const update: any = { ...rest, updatedAt: new Date() };
      if (dataNascimento) update.dataNascimento = new Date(dataNascimento);
      if (rest.email === "") update.email = null;
      await db.update(utentes).set(update).where(eq(utentes.id, id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "utentes", registoId: id, descricao: `Utente actualizado: ${id}` });
      return { success: true, mensagem: "Utente actualizado com sucesso" };
    }),

  desactivar: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.delete")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para desactivar utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(utentes).set({ ativo: false, updatedAt: new Date() }).where(eq(utentes.id, input.id));
      await logAuditAction(ctx.user, { acao: "delete", tabela: "utentes", registoId: input.id, descricao: `Utente desactivado: ${input.id}` });
      return { success: true, mensagem: "Utente desactivado com sucesso" };
    }),

  reactivar: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para reactivar utentes" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(utentes).set({ ativo: true, updatedAt: new Date() }).where(eq(utentes.id, input.id));
      return { success: true, mensagem: "Utente reactivado com sucesso" };
    }),

  estatisticas: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "utentes.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para aceder a estatísticas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const consultasUtente = await db.select({ id: consultas.id, estado: consultas.estado }).from(consultas).where(eq(consultas.utenteId, input.id));
      const faturasUtente = await db.select({ id: faturas.id, valorTotal: faturas.valorTotal, estado: faturas.estado }).from(faturas).where(eq(faturas.utenteId, input.id));
      const totalConsultas = consultasUtente.length;
      const consultasRealizadas = consultasUtente.filter(c => c.estado === "realizada").length;
      const totalFaturado = faturasUtente.reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
      const totalPago = faturasUtente.filter(f => f.estado === "paga").reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
      return { totalConsultas, consultasRealizadas, totalFaturado, totalPago, divida: totalFaturado - totalPago, totalFaturas: faturasUtente.length };
    }),
});
