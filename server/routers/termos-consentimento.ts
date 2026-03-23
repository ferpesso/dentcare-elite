/**
 * Router de Termos de Consentimento — Gestão de Documentos Legais
 * DentCare Elite V32.8 — CRUD Completo + Conformidade RGPD
 *
 * Funcionalidades:
 * - Listar todos os termos
 * - Criar novo termo
 * - Atualizar termo existente (com versionamento)
 * - Eliminar termo
 * - Ativar/Desativar termo
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logAuditAction } from "../auditService";
import { getDb } from "../db";
import { termosConsentimento as termosConsentimentoTable } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const termosConsentimentoRouter = router({
  /**
   * Listar todos os termos de consentimento
   */
  listarTermos: protectedProcedure
    .query(async ({ ctx }) => {
      // Qualquer utilizador autenticado pode ler os termos (necessário na anamnese)
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const termos = await db.select().from(termosConsentimentoTable).orderBy(desc(termosConsentimentoTable.createdAt));
      return { success: true, termos };
    }),

  /**
   * Criar um novo termo de consentimento
   */
  criarTermo: protectedProcedure
    .input(
      z.object({
        titulo: z.string().min(1, "O título é obrigatório"),
        conteudo: z.string().min(1, "O conteúdo é obrigatório"),
        obrigatorio: z.boolean().default(true),
        versao: z.number().int().positive().default(1),
        ativo: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas master e admin podem criar termos
      if (ctx.user.role !== "master" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o administrador pode criar termos de consentimento." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(termosConsentimentoTable).values({
        titulo: input.titulo,
        conteudo: input.conteudo,
        obrigatorio: input.obrigatorio,
        versao: input.versao,
        ativo: input.ativo,
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "termos_consentimento",
        registoId: result.insertId,
        descricao: `Termo de consentimento criado: ${input.titulo} (${input.obrigatorio ? 'Obrigatório' : 'Opcional'})`,
      });

      return { success: true, termoId: result.insertId };
    }),

  /**
   * Atualizar um termo de consentimento existente
   * Incrementa automaticamente a versão quando o conteúdo é alterado
   */
  atualizarTermo: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
        titulo: z.string().min(1, "O título é obrigatório").optional(),
        conteudo: z.string().min(1, "O conteúdo é obrigatório").optional(),
        obrigatorio: z.boolean().optional(),
        versao: z.number().int().positive().optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas master e admin podem editar termos
      if (ctx.user.role !== "master" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o administrador pode editar termos de consentimento." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const existingTermo = await db.select().from(termosConsentimentoTable).where(eq(termosConsentimentoTable.id, input.id)).limit(1);
      if (!existingTermo.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Termo de consentimento não encontrado" });
      }

      const updateData: Record<string, any> = { updatedAt: new Date() };
      if (input.titulo !== undefined) updateData.titulo = input.titulo;
      if (input.conteudo !== undefined) {
        updateData.conteudo = input.conteudo;
        // Auto-incrementar versão quando o conteúdo é alterado
        if (input.conteudo !== existingTermo[0].conteudo) {
          updateData.versao = existingTermo[0].versao + 1;
        }
      }
      if (input.obrigatorio !== undefined) updateData.obrigatorio = input.obrigatorio;
      if (input.versao !== undefined) updateData.versao = input.versao;
      if (input.ativo !== undefined) updateData.ativo = input.ativo;

      await db.update(termosConsentimentoTable).set(updateData).where(eq(termosConsentimentoTable.id, input.id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "termos_consentimento",
        registoId: input.id,
        descricao: `Termo de consentimento atualizado: ${input.titulo || existingTermo[0].titulo}${input.ativo !== undefined ? ` (${input.ativo ? 'Ativado' : 'Desativado'})` : ''}`,
      });

      return { success: true, mensagem: "Termo de consentimento atualizado com sucesso" };
    }),

  /**
   * Eliminar um termo de consentimento
   * Nota: Os registos de consentimento já dados pelos utentes são mantidos no histórico
   */
  eliminarTermo: protectedProcedure
    .input(
      z.object({
        id: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Apenas master pode eliminar termos
      if (ctx.user.role !== "master" && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o administrador pode eliminar termos de consentimento." });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const existingTermo = await db.select().from(termosConsentimentoTable).where(eq(termosConsentimentoTable.id, input.id)).limit(1);
      if (!existingTermo.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Termo de consentimento não encontrado" });
      }

      await db.delete(termosConsentimentoTable).where(eq(termosConsentimentoTable.id, input.id));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "termos_consentimento",
        registoId: input.id,
        descricao: `Termo de consentimento eliminado: ${existingTermo[0].titulo}`,
      });

      return { success: true, mensagem: "Termo de consentimento eliminado com sucesso" };
    }),
});
