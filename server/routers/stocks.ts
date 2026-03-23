import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { getDb } from "../db";
import { stocks } from "../../drizzle/schema";
import { eq, and, like, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const stocksRouter = router({
  criar: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(255),
        descricao: z.string().optional(),
        quantidade: z.number().min(0),
        quantidadeMinima: z.number().min(0),
        unidade: z.string(),
        precoCusto: z.number().min(0),
        precoVenda: z.number().min(0).optional(),
        fornecedor: z.string().optional(),
        categoria: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "stocks.create")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await db.insert(stocks).values({
        nome: input.nome,
        descricao: input.descricao ?? null,
        quantidade: input.quantidade,
        quantidadeMinima: input.quantidadeMinima,
        unidade: input.unidade,
        precoCusto: String(input.precoCusto),
        precoVenda: String(input.precoVenda ?? 0),
        fornecedor: input.fornecedor ?? null,
        categoria: input.categoria,
      });
      await logAuditAction(ctx.user, { acao: "create", tabela: "stocks", registoId: result.insertId, descricao: `Stock criado: ${input.nome}` });
      return { success: true, id: result.insertId };
    }),

  listar: protectedProcedure
    .input(z.object({ categoria: z.string().optional(), search: z.string().optional() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "stocks.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const conditions = [];
      if (input.categoria) conditions.push(eq(stocks.categoria, input.categoria));
      if (input.search) conditions.push(like(stocks.nome, `%${input.search}%`));
      const results = await db.select().from(stocks).where(conditions.length > 0 ? and(...conditions) : undefined);
      return { stocks: results, total: results.length };
    }),

  actualizar: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        nome: z.string().min(1).max(255).optional(),
        descricao: z.string().optional(),
        quantidade: z.number().min(0).optional(),
        quantidadeMinima: z.number().min(0).optional(),
        unidade: z.string().optional(),
        precoCusto: z.number().min(0).optional(),
        precoVenda: z.number().min(0).optional(),
        fornecedor: z.string().optional(),
        categoria: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "stocks.update")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, precoCusto, precoVenda, ...rest } = input;
      const update: any = { ...rest, updatedAt: new Date() };
      if (precoCusto !== undefined) update.precoCusto = String(precoCusto);
      if (precoVenda !== undefined) update.precoVenda = String(precoVenda);
      await db.update(stocks).set(update).where(eq(stocks.id, id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "stocks", registoId: id, descricao: `Stock actualizado: ${id}` });
      return { success: true };
    }),

  ajustarQuantidade: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        delta: z.number(), // positivo = entrada, negativo = saída
        motivo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "stocks.update")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      // Verificar stock actual
      const [atual] = await db.select({ quantidade: stocks.quantidade, nome: stocks.nome }).from(stocks).where(eq(stocks.id, input.id)).limit(1);
      if (!atual) throw new TRPCError({ code: "NOT_FOUND", message: "Produto não encontrado" });
      const novaQtd = atual.quantidade + input.delta;
      if (novaQtd < 0) throw new TRPCError({ code: "BAD_REQUEST", message: "Stock insuficiente para esta saída" });
      await db.update(stocks).set({ quantidade: novaQtd, updatedAt: new Date() }).where(eq(stocks.id, input.id));
      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "stocks",
        registoId: input.id,
        descricao: `Ajuste de stock: ${atual.nome} (${input.delta > 0 ? "+" : ""}${input.delta}). Motivo: ${input.motivo ?? "—"}`,
      });
      return { success: true, novaQuantidade: novaQtd };
    }),

  eliminar: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "stocks.delete")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.delete(stocks).where(eq(stocks.id, input.id));
      await logAuditAction(ctx.user, { acao: "delete", tabela: "stocks", registoId: input.id, descricao: `Stock eliminado: ${input.id}` });
      return { success: true };
    }),

  /**
   * Alertas de stock crítico (abaixo do mínimo)
   */
  alertasCriticos: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "stocks.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const todos = await db.select().from(stocks);
      const criticos = todos.filter(s => s.quantidade <= s.quantidadeMinima);
      const emAlerta = todos.filter(s => s.quantidade > s.quantidadeMinima && s.quantidade <= s.quantidadeMinima * 1.5);
      return {
        criticos,
        emAlerta,
        totalCriticos: criticos.length,
        totalEmAlerta: emAlerta.length,
        totalOk: todos.length - criticos.length - emAlerta.length,
      };
    }),

  /**
   * Estatísticas de stocks
   */
  estatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "stocks.read")) throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const todos = await db.select().from(stocks);
      const valorTotalStock = todos.reduce((acc, s) => acc + (s.quantidade * parseFloat(s.precoCusto || "0")), 0);
      const categorias = [...new Set(todos.map(s => s.categoria))];
      const porCategoria = categorias.map(cat => ({
        categoria: cat,
        total: todos.filter(s => s.categoria === cat).length,
        valorTotal: todos.filter(s => s.categoria === cat).reduce((acc, s) => acc + (s.quantidade * parseFloat(s.precoCusto || "0")), 0),
      }));
      return {
        totalProdutos: todos.length,
        valorTotalStock,
        produtosCriticos: todos.filter(s => s.quantidade <= s.quantidadeMinima).length,
        produtosEmAlerta: todos.filter(s => s.quantidade > s.quantidadeMinima && s.quantidade <= s.quantidadeMinima * 1.5).length,
        porCategoria,
      };
    }),
});
