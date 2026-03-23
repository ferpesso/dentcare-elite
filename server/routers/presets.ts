/**
 * Router de Presets — Gestão Dinâmica de Catálogos
 * DentCare Elite V31 — Criar, Editar, Eliminar Tratamentos e Templates
 * 
 * Este router oferece CRUD completo para:
 * - Catálogo de Tratamentos com Preços (Editável)
 * - Templates de Evolução Clínica (Editável)
 * - Templates de Mensagens WhatsApp (Editável)
 * - Motivos de Consulta (Editável)
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { getDb } from "../db";
import { 
  catalogoTratamentos, 
  templatesEvolucao, 
  templatesWhatsApp, 
  motivosConsulta 
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { logAuditAction } from "../auditService";

// ============================================================
// ROUTER DE PRESETS COM CRUD COMPLETO
// ============================================================

export const presetsRouter = router({
  // ============================================================
  // CATÁLOGO DE TRATAMENTOS — LEITURA
  // ============================================================

  obterTratamentosComPrecos: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const tratamentos = await db
        .select()
        .from(catalogoTratamentos)
        .where(undefined)
        .orderBy(desc(catalogoTratamentos.createdAt));

      return { success: true, tratamentos };
    }),

  obterTratamentoPorId: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [tratamento] = await db
        .select()
        .from(catalogoTratamentos)
        .where(eq(catalogoTratamentos.id, input.id))
        .limit(1);

      if (!tratamento) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Tratamento não encontrado" });
      }

      return { success: true, tratamento };
    }),

  // ============================================================
  // CATÁLOGO DE TRATAMENTOS — ESCRITA
  // ============================================================

  criarTratamento: protectedProcedure
    .input(z.object({
      nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
      descricao: z.string().optional(),
      especialidade: z.string().min(2, "Especialidade obrigatória"),
      duracao: z.number().int().positive("Duração deve ser positiva"),
      precoBase: z.number().positive("Preço deve ser positivo"),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar tratamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(catalogoTratamentos).values({
        nome: input.nome.trim(),
        descricao: input.descricao?.trim() || null,
        especialidade: input.especialidade.trim(),
        duracao: input.duracao,
        precoBase: input.precoBase.toString(),
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "catalogo_tratamentos",
        registoId: result.insertId,
        descricao: `Tratamento criado: ${input.nome} (${input.precoBase})`,
      });

      return { success: true, tratamentoId: result.insertId, mensagem: "Tratamento criado com sucesso" };
    }),

  editarTratamento: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(3).optional(),
      descricao: z.string().optional(),
      especialidade: z.string().optional(),
      duracao: z.number().int().positive().optional(),
      precoBase: z.number().positive().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para editar tratamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...updates } = input;
      const updateData: any = { updatedAt: new Date() };

      if (updates.nome) updateData.nome = updates.nome.trim();
      if (updates.descricao !== undefined) updateData.descricao = updates.descricao?.trim() || null;
      if (updates.especialidade) updateData.especialidade = updates.especialidade.trim();
      if (updates.duracao) updateData.duracao = updates.duracao;
      if (updates.precoBase) updateData.precoBase = updates.precoBase.toString();
      if (updates.ativo !== undefined) updateData.ativo = updates.ativo;

      await db.update(catalogoTratamentos).set(updateData).where(eq(catalogoTratamentos.id, id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "catalogo_tratamentos",
        registoId: id,
        descricao: `Tratamento actualizado: ID ${id}`,
      });

      return { success: true, mensagem: "Tratamento actualizado com sucesso" };
    }),

  eliminarTratamento: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para eliminar tratamentos" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(catalogoTratamentos).set({ ativo: false, updatedAt: new Date() }).where(eq(catalogoTratamentos.id, input.id));

      await logAuditAction(ctx.user, {
        acao: "delete",
        tabela: "catalogo_tratamentos",
        registoId: input.id,
        descricao: `Tratamento desactivado: ID ${input.id}`,
      });

      return { success: true, mensagem: "Tratamento eliminado com sucesso" };
    }),

  // ============================================================
  // TEMPLATES DE EVOLUÇÃO CLÍNICA — LEITURA
  // ============================================================

  obterEvolucioesTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const evolucoes = await db
        .select()
        .from(templatesEvolucao)
        .where(undefined)
        .orderBy(desc(templatesEvolucao.createdAt));

      return { success: true, evolucoes };
    }),

  // ============================================================
  // TEMPLATES DE EVOLUÇÃO CLÍNICA — ESCRITA
  // ============================================================

  criarTemplateEvolucao: protectedProcedure
    .input(z.object({
      nome: z.string().min(3),
      template: z.string().min(10),
      categoria: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(templatesEvolucao).values({
        nome: input.nome.trim(),
        template: input.template.trim(),
        categoria: input.categoria.trim(),
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "templates_evolucao",
        registoId: result.insertId,
        descricao: `Template de evolução criado: ${input.nome}`,
      });

      return { success: true, templateId: result.insertId };
    }),

  editarTemplateEvolucao: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(3).optional(),
      template: z.string().min(10).optional(),
      categoria: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...updates } = input;
      const updateData: any = { updatedAt: new Date() };

      if (updates.nome) updateData.nome = updates.nome.trim();
      if (updates.template) updateData.template = updates.template.trim();
      if (updates.categoria) updateData.categoria = updates.categoria.trim();
      if (updates.ativo !== undefined) updateData.ativo = updates.ativo;

      await db.update(templatesEvolucao).set(updateData).where(eq(templatesEvolucao.id, id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "templates_evolucao",
        registoId: id,
        descricao: `Template de evolução actualizado: ID ${id}`,
      });

      return { success: true, mensagem: "Template actualizado com sucesso" };
    }),

  // ============================================================
  // TEMPLATES DE WHATSAPP — LEITURA
  // ============================================================

  obterMensagensWhatsAppTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "whatsapp.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const mensagens = await db
        .select()
        .from(templatesWhatsApp)
        .where(undefined)
        .orderBy(desc(templatesWhatsApp.createdAt));

      return { success: true, mensagens };
    }),

  // ============================================================
  // TEMPLATES DE WHATSAPP — ESCRITA
  // ============================================================

  criarTemplateWhatsApp: protectedProcedure
    .input(z.object({
      nome: z.string().min(3),
      template: z.string().min(10),
      categoria: z.string().min(2),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(templatesWhatsApp).values({
        nome: input.nome.trim(),
        template: input.template.trim(),
        categoria: input.categoria.trim(),
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "templates_whatsapp",
        registoId: result.insertId,
        descricao: `Template WhatsApp criado: ${input.nome}`,
      });

      return { success: true, templateId: result.insertId };
    }),

  editarTemplateWhatsApp: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(3).optional(),
      template: z.string().min(10).optional(),
      categoria: z.string().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...updates } = input;
      const updateData: any = { updatedAt: new Date() };

      if (updates.nome) updateData.nome = updates.nome.trim();
      if (updates.template) updateData.template = updates.template.trim();
      if (updates.categoria) updateData.categoria = updates.categoria.trim();
      if (updates.ativo !== undefined) updateData.ativo = updates.ativo;

      await db.update(templatesWhatsApp).set(updateData).where(eq(templatesWhatsApp.id, id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "templates_whatsapp",
        registoId: id,
        descricao: `Template WhatsApp actualizado: ID ${id}`,
      });

      return { success: true, mensagem: "Template actualizado com sucesso" };
    }),

  // ============================================================
  // MOTIVOS DE CONSULTA — LEITURA
  // ============================================================

  obterMotivosConsulta: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const motivos = await db
        .select()
        .from(motivosConsulta)
        .where(undefined)
        .orderBy(desc(motivosConsulta.createdAt));

      return { success: true, motivos };
    }),

  // ============================================================
  // MOTIVOS DE CONSULTA — ESCRITA
  // ============================================================

  criarMotivoConsulta: protectedProcedure
    .input(z.object({
      nome: z.string().min(3),
      duracao: z.number().int().positive(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(motivosConsulta).values({
        nome: input.nome.trim(),
        duracao: input.duracao,
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "motivos_consulta",
        registoId: result.insertId,
        descricao: `Motivo de consulta criado: ${input.nome}`,
      });

      return { success: true, motivoId: result.insertId };
    }),

  editarMotivoConsulta: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(3).optional(),
      duracao: z.number().int().positive().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...updates } = input;
      const updateData: any = { updatedAt: new Date() };

      if (updates.nome) updateData.nome = updates.nome.trim();
      if (updates.duracao) updateData.duracao = updates.duracao;
      if (updates.ativo !== undefined) updateData.ativo = updates.ativo;

      await db.update(motivosConsulta).set(updateData).where(eq(motivosConsulta.id, id));

      await logAuditAction(ctx.user, {
        acao: "update",
        tabela: "motivos_consulta",
        registoId: id,
        descricao: `Motivo de consulta actualizado: ID ${id}`,
      });

      return { success: true, mensagem: "Motivo actualizado com sucesso" };
    }),

  // ============================================================
  // UTILITÁRIOS
  // ============================================================

  processarTemplate: protectedProcedure
    .input(z.object({
      template: z.string(),
      variaveis: z.record(z.string(), z.any()),
    }))
    .query(async ({ input }) => {
      let resultado = input.template;
      for (const [chave, valor] of Object.entries(input.variaveis)) {
        resultado = resultado.replace(new RegExp(`{${chave}}`, "g"), String(valor));
      }
      return { success: true, resultado };
    }),

  autocompletar: protectedProcedure
    .input(z.object({
      campo: z.enum(["especialidade", "motivo", "dente", "regiao", "tratamento"]),
      termo: z.string().optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const sugestoes: Record<string, string[]> = {
        especialidade: [
          "Implantologia",
          "Ortodontia",
          "Endodontia",
          "Periodontologia",
          "Cirurgia Oral",
          "Dentisteria Operatória",
          "Prostodontia",
          "Odontopediatria",
          "Estética Dentária",
        ],
        motivo: [
          "Consulta de Rotina",
          "Limpeza Profissional",
          "Tratamento de Cárie",
          "Extração Dentária",
          "Colocação de Implante",
          "Tratamento de Canal",
          "Clareamento",
          "Consulta de Emergência",
        ],
        dente: [
          "11", "12", "13", "14", "15", "16", "17", "18",
          "21", "22", "23", "24", "25", "26", "27", "28",
          "31", "32", "33", "34", "35", "36", "37", "38",
          "41", "42", "43", "44", "45", "46", "47", "48",
        ],
        regiao: [
          "Anterior Superior",
          "Anterior Inferior",
          "Posterior Superior Direita",
          "Posterior Superior Esquerda",
          "Posterior Inferior Direita",
          "Posterior Inferior Esquerda",
          "Gengiva",
          "Palato",
        ],
        tratamento: [],
      };

      let resultado = sugestoes[input.campo] || [];

      if (input.termo) {
        resultado = resultado.filter((s) =>
          s.toLowerCase().includes(input.termo!.toLowerCase())
        );
      }

      return { success: true, sugestoes: resultado };
    }),
});
