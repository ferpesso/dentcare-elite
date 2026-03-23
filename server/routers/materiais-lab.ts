/**
 * Router de Materiais de Laboratório — Gestão de Materiais e Guias de Remessa
 * DentCare Elite V32.8 — Módulo de Materiais Clínica ↔ Laboratório
 *
 * Funcionalidades:
 * - CRUD completo de materiais por envio
 * - Checklist de materiais enviados/recebidos
 * - Gestão de guias de remessa com numeração automática
 * - Actualização em lote do estado dos materiais
 * - Geração de PDF de guia de remessa
 * - Estatísticas de materiais por utente
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logCreate, logUpdate, logDelete } from "../auditService";
import { getDb } from "../db";
import {
  materiaisEnvioLab,
  guiasRemessaLab,
  enviosLaboratorio,
  laboratorios,
  utentes,
} from "../../drizzle/schema";
import { eq, desc, and, sql, inArray } from "drizzle-orm";

// ─── Schemas de Validação ────────────────────────────────────────────────────

const materialCreateSchema = z.object({
  envioId: z.number(),
  tipoMaterial: z.enum([
    "moldagem_alginato", "moldagem_silicone", "moldagem_digital",
    "modelo_gesso", "modelo_articulador",
    "registo_mordida", "registo_arco_facial",
    "provisorio", "dente_provisorio", "nucleo_espigao",
    "componente_implante", "scan_intraoral",
    "fotografias", "radiografias", "guia_cirurgica",
    "goteira", "placa_base", "rolos_cera",
    "prova_metal", "prova_ceramica", "prova_acrilico", "prova_zirconia",
    "trabalho_anterior", "outro",
  ]),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  quantidade: z.number().int().min(1).default(1),
  direcao: z.enum(["clinica_para_lab", "lab_para_clinica"]).default("clinica_para_lab"),
  observacoes: z.string().optional(),
});

const materialUpdateEstadoSchema = z.object({
  id: z.number(),
  estado: z.enum([
    "preparado", "enviado_lab", "recebido_lab", "em_uso",
    "devolvido_clinica", "recebido_clinica",
    "extraviado", "danificado", "descartado",
  ]),
  verificadoPor: z.string().optional(),
  observacoes: z.string().optional(),
});

const materialBatchUpdateSchema = z.object({
  ids: z.array(z.number()).min(1),
  estado: z.enum([
    "preparado", "enviado_lab", "recebido_lab", "em_uso",
    "devolvido_clinica", "recebido_clinica",
    "extraviado", "danificado", "descartado",
  ]),
  verificadoPor: z.string().optional(),
});

const guiaRemessaCreateSchema = z.object({
  envioId: z.number(),
  tipo: z.enum(["envio", "devolucao", "reenvio"]).default("envio"),
  transportadora: z.string().optional(),
  codigoRastreamento: z.string().optional(),
  materiaisIds: z.array(z.number()).optional(),
  observacoes: z.string().optional(),
  assinaturaEnvio: z.string().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const materiaisLabRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // MATERIAIS — CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listar materiais de um envio
   */
  listarPorEnvio: protectedProcedure
    .input(z.object({
      envioId: z.number(),
      direcao: z.enum(["clinica_para_lab", "lab_para_clinica"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [eq(materiaisEnvioLab.envioId, input.envioId)];
      if (input.direcao) conditions.push(eq(materiaisEnvioLab.direcao, input.direcao));

      const materiais = await db
        .select()
        .from(materiaisEnvioLab)
        .where(and(...conditions))
        .orderBy(desc(materiaisEnvioLab.createdAt));

      return {
        success: true,
        materiais,
        resumo: {
          total: materiais.length,
          enviados: materiais.filter(m => ["enviado_lab", "recebido_lab", "em_uso"].includes(m.estado)).length,
          recebidos: materiais.filter(m => ["devolvido_clinica", "recebido_clinica"].includes(m.estado)).length,
          pendentes: materiais.filter(m => m.estado === "preparado").length,
          problemas: materiais.filter(m => ["extraviado", "danificado"].includes(m.estado)).length,
        },
      };
    }),

  /**
   * Listar todos os materiais de um utente (todos os envios)
   */
  listarPorUtente: protectedProcedure
    .input(z.object({ utenteId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const materiais = await db
        .select({
          id: materiaisEnvioLab.id,
          envioId: materiaisEnvioLab.envioId,
          tipoMaterial: materiaisEnvioLab.tipoMaterial,
          descricao: materiaisEnvioLab.descricao,
          quantidade: materiaisEnvioLab.quantidade,
          estado: materiaisEnvioLab.estado,
          direcao: materiaisEnvioLab.direcao,
          dataEnvio: materiaisEnvioLab.dataEnvio,
          dataRececao: materiaisEnvioLab.dataRececao,
          observacoes: materiaisEnvioLab.observacoes,
          verificadoPor: materiaisEnvioLab.verificadoPor,
          createdAt: materiaisEnvioLab.createdAt,
          // Dados do envio
          tipoTrabalho: enviosLaboratorio.tipoTrabalho,
          envioEstado: enviosLaboratorio.estado,
          laboratorioNome: laboratorios.nome,
        })
        .from(materiaisEnvioLab)
        .innerJoin(enviosLaboratorio, eq(materiaisEnvioLab.envioId, enviosLaboratorio.id))
        .leftJoin(laboratorios, eq(enviosLaboratorio.laboratorioId, laboratorios.id))
        .where(eq(enviosLaboratorio.utenteId, input.utenteId))
        .orderBy(desc(materiaisEnvioLab.createdAt));

      // Resumo
      const emTransito = materiais.filter(m =>
        ["enviado_lab", "recebido_lab", "em_uso"].includes(m.estado) &&
        m.direcao === "clinica_para_lab"
      ).length;

      const aguardamDevolucao = materiais.filter(m =>
        m.direcao === "lab_para_clinica" &&
        !["recebido_clinica", "descartado"].includes(m.estado)
      ).length;

      return {
        success: true,
        materiais,
        resumo: {
          total: materiais.length,
          emTransito,
          aguardamDevolucao,
          problemas: materiais.filter(m => ["extraviado", "danificado"].includes(m.estado)).length,
        },
      };
    }),

  /**
   * Adicionar material a um envio
   */
  adicionar: protectedProcedure
    .input(materialCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Verificar se o envio existe
      const [envio] = await db.select({ id: enviosLaboratorio.id })
        .from(enviosLaboratorio)
        .where(eq(enviosLaboratorio.id, input.envioId))
        .limit(1);

      if (!envio) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });

      const result = await db.insert(materiaisEnvioLab).values({
        envioId: input.envioId,
        tipoMaterial: input.tipoMaterial,
        descricao: input.descricao,
        quantidade: input.quantidade,
        direcao: input.direcao,
        observacoes: input.observacoes || null,
      });

      const insertId = Number(result[0].insertId);

      await logCreate(ctx.user, "materiais_envio_lab", insertId, {
        envioId: input.envioId,
        tipoMaterial: input.tipoMaterial,
        descricao: input.descricao,
      }, `Material "${input.descricao}" adicionado ao envio #${input.envioId}`);

      return { success: true, id: insertId, message: "Material adicionado com sucesso." };
    }),

  /**
   * Adicionar vários materiais de uma vez (batch)
   */
  adicionarBatch: protectedProcedure
    .input(z.object({
      envioId: z.number(),
      materiais: z.array(z.object({
        tipoMaterial: materialCreateSchema.shape.tipoMaterial,
        descricao: z.string().min(1),
        quantidade: z.number().int().min(1).default(1),
        direcao: z.enum(["clinica_para_lab", "lab_para_clinica"]).default("clinica_para_lab"),
        observacoes: z.string().optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const values = input.materiais.map(m => ({
        envioId: input.envioId,
        tipoMaterial: m.tipoMaterial,
        descricao: m.descricao,
        quantidade: m.quantidade,
        direcao: m.direcao,
        observacoes: m.observacoes || null,
      }));

      await db.insert(materiaisEnvioLab).values(values);

      await logCreate(ctx.user, "materiais_envio_lab", input.envioId, {
        count: input.materiais.length,
      }, `${input.materiais.length} materiais adicionados ao envio #${input.envioId}`);

      return { success: true, message: `${input.materiais.length} materiais adicionados com sucesso.` };
    }),

  /**
   * Actualizar estado de um material
   */
  actualizarEstado: protectedProcedure
    .input(materialUpdateEstadoSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const updateData: Record<string, any> = {
        estado: input.estado,
        updatedAt: new Date(),
      };

      if (input.verificadoPor) updateData.verificadoPor = input.verificadoPor;
      if (input.observacoes !== undefined) updateData.observacoes = input.observacoes;

      // Actualizar datas automaticamente
      if (["enviado_lab", "devolvido_clinica"].includes(input.estado)) {
        updateData.dataEnvio = new Date();
      }
      if (["recebido_lab", "recebido_clinica"].includes(input.estado)) {
        updateData.dataRececao = new Date();
      }

      await db.update(materiaisEnvioLab).set(updateData).where(eq(materiaisEnvioLab.id, input.id));

      await logUpdate(ctx.user, "materiais_envio_lab", input.id,
        {}, { estado: input.estado },
        `Material #${input.id}: estado actualizado para "${input.estado}"`
      );

      return { success: true, message: `Estado actualizado para "${input.estado}".` };
    }),

  /**
   * Actualizar estado em lote (batch)
   */
  actualizarEstadoBatch: protectedProcedure
    .input(materialBatchUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const updateData: Record<string, any> = {
        estado: input.estado,
        updatedAt: new Date(),
      };

      if (input.verificadoPor) updateData.verificadoPor = input.verificadoPor;

      if (["enviado_lab", "devolvido_clinica"].includes(input.estado)) {
        updateData.dataEnvio = new Date();
      }
      if (["recebido_lab", "recebido_clinica"].includes(input.estado)) {
        updateData.dataRececao = new Date();
      }

      await db.update(materiaisEnvioLab)
        .set(updateData)
        .where(inArray(materiaisEnvioLab.id, input.ids));

      await logUpdate(ctx.user, "materiais_envio_lab", 0,
        {}, { estado: input.estado, ids: input.ids },
        `${input.ids.length} materiais actualizados para "${input.estado}"`
      );

      return { success: true, message: `${input.ids.length} materiais actualizados.` };
    }),

  /**
   * Remover material
   */
  remover: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.delete(materiaisEnvioLab).where(eq(materiaisEnvioLab.id, input.id));

      await logDelete(ctx.user, "materiais_envio_lab", input.id, {},
        `Material #${input.id} removido`
      );

      return { success: true, message: "Material removido com sucesso." };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // GUIAS DE REMESSA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listar guias de remessa de um envio
   */
  listarGuias: protectedProcedure
    .input(z.object({ envioId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const guias = await db
        .select()
        .from(guiasRemessaLab)
        .where(eq(guiasRemessaLab.envioId, input.envioId))
        .orderBy(desc(guiasRemessaLab.dataEmissao));

      return {
        success: true,
        guias: guias.map(g => ({
          ...g,
          materiaisIds: (() => { try { return g.materiaisIds ? JSON.parse(g.materiaisIds) : []; } catch { return []; } })(),
        })),
      };
    }),

  /**
   * Criar guia de remessa
   */
  criarGuia: protectedProcedure
    .input(guiaRemessaCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Gerar número de guia automático
      const [lastGuia] = await db
        .select({ id: guiasRemessaLab.id })
        .from(guiasRemessaLab)
        .orderBy(desc(guiasRemessaLab.id))
        .limit(1);

      const nextNum = (lastGuia?.id ?? 0) + 1;
      const prefixo = input.tipo === "envio" ? "GR-E" : input.tipo === "devolucao" ? "GR-D" : "GR-R";
      const ano = new Date().getFullYear();
      const numeroGuia = `${prefixo}-${ano}-${String(nextNum).padStart(5, "0")}`;

      const result = await db.insert(guiasRemessaLab).values({
        envioId: input.envioId,
        numeroGuia,
        tipo: input.tipo,
        transportadora: input.transportadora || null,
        codigoRastreamento: input.codigoRastreamento || null,
        materiaisIds: input.materiaisIds ? JSON.stringify(input.materiaisIds) : null,
        observacoes: input.observacoes || null,
        assinaturaEnvio: input.assinaturaEnvio || null,
        emitidoPor: ctx.user.id,
      });

      const insertId = Number(result[0].insertId);

      // Se houver materiais associados, actualizar o estado deles
      if (input.materiaisIds && input.materiaisIds.length > 0) {
        const novoEstado = input.tipo === "envio" || input.tipo === "reenvio"
          ? "enviado_lab" as const
          : "devolvido_clinica" as const;

        await db.update(materiaisEnvioLab)
          .set({
            estado: novoEstado,
            dataEnvio: new Date(),
            updatedAt: new Date(),
          })
          .where(inArray(materiaisEnvioLab.id, input.materiaisIds));
      }

      await logCreate(ctx.user, "guias_remessa_lab", insertId, {
        envioId: input.envioId,
        numeroGuia,
        tipo: input.tipo,
      }, `Guia de remessa "${numeroGuia}" criada para envio #${input.envioId}`);

      return { success: true, id: insertId, numeroGuia, message: `Guia de remessa ${numeroGuia} criada com sucesso.` };
    }),

  /**
   * Confirmar receção de guia de remessa
   */
  confirmarRececaoGuia: protectedProcedure
    .input(z.object({
      id: z.number(),
      assinaturaRececao: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [guia] = await db.select().from(guiasRemessaLab)
        .where(eq(guiasRemessaLab.id, input.id)).limit(1);

      if (!guia) throw new TRPCError({ code: "NOT_FOUND", message: "Guia não encontrada" });

      await db.update(guiasRemessaLab).set({
        assinaturaRececao: input.assinaturaRececao || ctx.user.name || "Confirmado",
        dataRececaoConfirmada: new Date(),
        updatedAt: new Date(),
      }).where(eq(guiasRemessaLab.id, input.id));

      // Actualizar materiais associados
      if (guia.materiaisIds) {
        let ids: number[] = [];
        try { ids = JSON.parse(guia.materiaisIds) as number[]; } catch { ids = []; }
        if (ids.length > 0) {
          const novoEstado = guia.tipo === "envio" || guia.tipo === "reenvio"
            ? "recebido_lab" as const
            : "recebido_clinica" as const;

          await db.update(materiaisEnvioLab)
            .set({
              estado: novoEstado,
              dataRececao: new Date(),
              verificadoPor: input.assinaturaRececao || ctx.user.name || "Sistema",
              updatedAt: new Date(),
            })
            .where(inArray(materiaisEnvioLab.id, ids));
        }
      }

      return { success: true, message: "Receção confirmada com sucesso." };
    }),

  /**
   * Obter dados para gerar PDF da guia de remessa
   */
  obterDadosGuia: protectedProcedure
    .input(z.object({ guiaId: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "laboratorios.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [guia] = await db
        .select({
          id: guiasRemessaLab.id,
          envioId: guiasRemessaLab.envioId,
          numeroGuia: guiasRemessaLab.numeroGuia,
          tipo: guiasRemessaLab.tipo,
          dataEmissao: guiasRemessaLab.dataEmissao,
          dataExpedicao: guiasRemessaLab.dataExpedicao,
          transportadora: guiasRemessaLab.transportadora,
          codigoRastreamento: guiasRemessaLab.codigoRastreamento,
          materiaisIds: guiasRemessaLab.materiaisIds,
          observacoes: guiasRemessaLab.observacoes,
          assinaturaEnvio: guiasRemessaLab.assinaturaEnvio,
          assinaturaRececao: guiasRemessaLab.assinaturaRececao,
          dataRececaoConfirmada: guiasRemessaLab.dataRececaoConfirmada,
          // Dados do envio
          tipoTrabalho: enviosLaboratorio.tipoTrabalho,
          descricaoEnvio: enviosLaboratorio.descricao,
          dente: enviosLaboratorio.dente,
          cor: enviosLaboratorio.cor,
          materialEnvio: enviosLaboratorio.material,
          // Dados do laboratório
          laboratorioNome: laboratorios.nome,
          laboratorioMorada: laboratorios.morada,
          laboratorioCidade: laboratorios.cidade,
          laboratorioTelefone: laboratorios.telefone,
          laboratorioEmail: laboratorios.email,
          // Dados do utente
          utenteNome: utentes.nome,
        })
        .from(guiasRemessaLab)
        .innerJoin(enviosLaboratorio, eq(guiasRemessaLab.envioId, enviosLaboratorio.id))
        .leftJoin(laboratorios, eq(enviosLaboratorio.laboratorioId, laboratorios.id))
        .leftJoin(utentes, eq(enviosLaboratorio.utenteId, utentes.id))
        .where(eq(guiasRemessaLab.id, input.guiaId))
        .limit(1);

      if (!guia) throw new TRPCError({ code: "NOT_FOUND", message: "Guia não encontrada" });

      // Buscar materiais
      let matIds: number[] = [];
      try { matIds = guia.materiaisIds ? JSON.parse(guia.materiaisIds) as number[] : []; } catch { matIds = []; }
      let materiais: any[] = [];
      if (matIds.length > 0) {
        materiais = await db.select().from(materiaisEnvioLab)
          .where(inArray(materiaisEnvioLab.id, matIds));
      }

      return {
        success: true,
        guia: {
          ...guia,
          materiaisIds: matIds,
        },
        materiais,
      };
    }),
});
