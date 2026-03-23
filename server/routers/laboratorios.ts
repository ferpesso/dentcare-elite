/**
 * Router de Laboratórios — Gestão de Laboratórios e Envios
 * DentCare Elite V32 — Módulo de Controlo de Laboratórios Externos
 *
 * Funcionalidades:
 * - CRUD completo de laboratórios
 * - Gestão de envios com workflow de estados
 * - Notificações persistentes no dashboard
 * - Histórico de alterações de estado
 * - Integração com utentes, médicos e tratamentos
 */

import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { logCreate, logUpdate, logDelete } from "../auditService";
import { getDb } from "../db";
import {
  laboratorios,
  enviosLaboratorio,
  utentes,
  medicos,
  tratamentos,
} from "../../drizzle/schema";
import { eq, desc, and, sql, count, sum, gte, lte, or, like, inArray } from "drizzle-orm";

// ─── Schemas de Validação ────────────────────────────────────────────────────

const laboratorioCreateSchema = z.object({
  nome: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  nif: z.string().optional(),
  contacto: z.string().optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  telefone: z.string().optional(),
  morada: z.string().optional(),
  cidade: z.string().optional(),
  codigoPostal: z.string().optional(),
  website: z.string().optional(),
  especialidades: z.array(z.string()).optional(),
  tabelaPrecos: z.array(z.object({
    servico: z.string(),
    preco: z.number(),
    prazo: z.number().optional(),
  })).optional(),
  prazoMedioEntrega: z.number().optional(),
  observacoes: z.string().optional(),
});

const laboratorioUpdateSchema = laboratorioCreateSchema.partial().extend({
  id: z.number(),
  ativo: z.boolean().optional(),
  avaliacao: z.number().min(0).max(5).optional(),
});

const envioCreateSchema = z.object({
  laboratorioId: z.number(),
  utenteId: z.number(),
  medicoId: z.number().optional(),
  tratamentoId: z.number().optional(),
  tipoTrabalho: z.string().min(1, "Tipo de trabalho é obrigatório"),
  descricao: z.string().min(1, "Descrição é obrigatória"),
  dente: z.string().optional(),
  cor: z.string().optional(),
  material: z.string().optional(),
  prioridade: z.enum(["normal", "urgente", "muito_urgente"]).default("normal"),
  dataPrevistaDevolucao: z.string().optional(), // ISO date string
  valorOrcado: z.number().optional(),
  observacoes: z.string().optional(),
});

const envioUpdateEstadoSchema = z.object({
  id: z.number(),
  estado: z.enum([
    "criado", "enviado", "recebido_lab", "em_producao",
    "pronto", "devolvido", "em_prova", "ajuste", "concluido", "cancelado",
  ]),
  observacao: z.string().optional(),
  valorFinal: z.number().optional(),
});

// ─── Router ──────────────────────────────────────────────────────────────────

export const laboratoriosRouter = router({

  // ═══════════════════════════════════════════════════════════════════════════
  // LABORATÓRIOS — CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listar todos os laboratórios
   */
  listar: protectedProcedure
    .input(z.object({
      pesquisa: z.string().optional(),
      apenasAtivos: z.boolean().default(true),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [];
      if (input?.apenasAtivos) conditions.push(eq(laboratorios.ativo, true));
      if (input?.pesquisa) {
        conditions.push(
          or(
            like(laboratorios.nome, `%${input.pesquisa}%`),
            like(laboratorios.cidade, `%${input.pesquisa}%`),
            like(laboratorios.email, `%${input.pesquisa}%`),
          )!
        );
      }

      const lista = await db
        .select()
        .from(laboratorios)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(laboratorios.createdAt));

      // Contar envios ativos por laboratório
      const enviosCounts = await db
        .select({
          laboratorioId: enviosLaboratorio.laboratorioId,
          total: count(),
          ativos: sql<number>`SUM(CASE WHEN ${enviosLaboratorio.estado} NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END)`,
        })
        .from(enviosLaboratorio)
        .groupBy(enviosLaboratorio.laboratorioId);

      const countMap = new Map(enviosCounts.map(e => [e.laboratorioId, { total: Number(e.total), ativos: Number(e.ativos) }]));

      return {
        success: true,
        laboratorios: lista.map(lab => ({
          ...lab,
          especialidades: (() => { try { return lab.especialidades ? JSON.parse(lab.especialidades) : []; } catch { return []; } })(),
          tabelaPrecos: (() => { try { return lab.tabelaPrecos ? JSON.parse(lab.tabelaPrecos) : []; } catch { return []; } })(),
          enviosTotal: countMap.get(lab.id)?.total ?? 0,
          enviosAtivos: countMap.get(lab.id)?.ativos ?? 0,
        })),
      };
    }),

  /**
   * Obter laboratório por ID
   */
  obter: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [lab] = await db.select().from(laboratorios).where(eq(laboratorios.id, input.id)).limit(1);
      if (!lab) throw new TRPCError({ code: "NOT_FOUND", message: "Laboratório não encontrado" });

      return {
        success: true,
        laboratorio: {
          ...lab,
          especialidades: (() => { try { return lab.especialidades ? JSON.parse(lab.especialidades) : []; } catch { return []; } })(),
          tabelaPrecos: (() => { try { return lab.tabelaPrecos ? JSON.parse(lab.tabelaPrecos) : []; } catch { return []; } })(),
        },
      };
    }),

  /**
   * Criar laboratório
   */
  criar: protectedProcedure
    .input(laboratorioCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const result = await db.insert(laboratorios).values({
        nome: input.nome,
        nif: input.nif || null,
        contacto: input.contacto || null,
        email: input.email || null,
        telefone: input.telefone || null,
        morada: input.morada || null,
        cidade: input.cidade || null,
        codigoPostal: input.codigoPostal || null,
        website: input.website || null,
        especialidades: input.especialidades ? JSON.stringify(input.especialidades) : null,
        tabelaPrecos: input.tabelaPrecos ? JSON.stringify(input.tabelaPrecos) : null,
        prazoMedioEntrega: input.prazoMedioEntrega ?? 7,
        observacoes: input.observacoes || null,
      });

      const insertId = Number(result[0].insertId);

      await logCreate(ctx.user, "laboratorios", insertId, { nome: input.nome }, `Laboratório "${input.nome}" criado`);

      return { success: true, id: insertId, message: `Laboratório "${input.nome}" criado com sucesso.` };
    }),

  /**
   * Atualizar laboratório
   */
  atualizar: protectedProcedure
    .input(laboratorioUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...data } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (data.nome !== undefined) updateData.nome = data.nome;
      if (data.nif !== undefined) updateData.nif = data.nif || null;
      if (data.contacto !== undefined) updateData.contacto = data.contacto || null;
      if (data.email !== undefined) updateData.email = data.email || null;
      if (data.telefone !== undefined) updateData.telefone = data.telefone || null;
      if (data.morada !== undefined) updateData.morada = data.morada || null;
      if (data.cidade !== undefined) updateData.cidade = data.cidade || null;
      if (data.codigoPostal !== undefined) updateData.codigoPostal = data.codigoPostal || null;
      if (data.website !== undefined) updateData.website = data.website || null;
      if (data.especialidades !== undefined) updateData.especialidades = JSON.stringify(data.especialidades);
      if (data.tabelaPrecos !== undefined) updateData.tabelaPrecos = JSON.stringify(data.tabelaPrecos);
      if (data.prazoMedioEntrega !== undefined) updateData.prazoMedioEntrega = data.prazoMedioEntrega;
      if (data.avaliacao !== undefined) updateData.avaliacao = String(data.avaliacao);
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes || null;
      if (data.ativo !== undefined) updateData.ativo = data.ativo;

      await db.update(laboratorios).set(updateData).where(eq(laboratorios.id, id));

      await logUpdate(ctx.user, "laboratorios", id, {}, updateData, `Laboratório #${id} atualizado`);

      return { success: true, message: "Laboratório atualizado com sucesso." };
    }),

  /**
   * Desativar laboratório (soft delete)
   */
  desativar: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(laboratorios).set({ ativo: false, updatedAt: new Date() }).where(eq(laboratorios.id, input.id));

      await logDelete(ctx.user, "laboratorios", input.id, {}, `Laboratório #${input.id} desativado`);

      return { success: true, message: "Laboratório desativado com sucesso." };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // ENVIOS — CRUD e Workflow
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listar envios (com filtros)
   */
  listarEnvios: protectedProcedure
    .input(z.object({
      laboratorioId: z.number().optional(),
      utenteId: z.number().optional(),
      estado: z.string().optional(),
      apenasAtivos: z.boolean().default(false),
      pesquisa: z.string().optional(),
      limite: z.number().default(50),
      offset: z.number().default(0),
    }).optional())
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const conditions = [];
      if (input?.laboratorioId) conditions.push(eq(enviosLaboratorio.laboratorioId, input.laboratorioId));
      if (input?.utenteId) conditions.push(eq(enviosLaboratorio.utenteId, input.utenteId));
      if (input?.estado) conditions.push(eq(enviosLaboratorio.estado, input.estado as any));
      if (input?.apenasAtivos) {
        conditions.push(
          sql`${enviosLaboratorio.estado} NOT IN ('concluido', 'cancelado')`
        );
      }

      const envios = await db
        .select({
          id: enviosLaboratorio.id,
          laboratorioId: enviosLaboratorio.laboratorioId,
          laboratorioNome: laboratorios.nome,
          utenteId: enviosLaboratorio.utenteId,
          utenteNome: utentes.nome,
          medicoId: enviosLaboratorio.medicoId,
          tratamentoId: enviosLaboratorio.tratamentoId,
          tipoTrabalho: enviosLaboratorio.tipoTrabalho,
          descricao: enviosLaboratorio.descricao,
          dente: enviosLaboratorio.dente,
          cor: enviosLaboratorio.cor,
          material: enviosLaboratorio.material,
          estado: enviosLaboratorio.estado,
          prioridade: enviosLaboratorio.prioridade,
          dataEnvio: enviosLaboratorio.dataEnvio,
          dataRecebidoLab: enviosLaboratorio.dataRecebidoLab,
          dataPrevistaDevolucao: enviosLaboratorio.dataPrevistaDevolucao,
          dataDevolucaoReal: enviosLaboratorio.dataDevolucaoReal,
          dataConclusao: enviosLaboratorio.dataConclusao,
          valorOrcado: enviosLaboratorio.valorOrcado,
          valorFinal: enviosLaboratorio.valorFinal,
          pago: enviosLaboratorio.pago,
          observacoes: enviosLaboratorio.observacoes,
          historicoEstados: enviosLaboratorio.historicoEstados,
          notificacaoAtiva: enviosLaboratorio.notificacaoAtiva,
          notificacaoLida: enviosLaboratorio.notificacaoLida,
          createdAt: enviosLaboratorio.createdAt,
          updatedAt: enviosLaboratorio.updatedAt,
        })
        .from(enviosLaboratorio)
        .leftJoin(laboratorios, eq(enviosLaboratorio.laboratorioId, laboratorios.id))
        .leftJoin(utentes, eq(enviosLaboratorio.utenteId, utentes.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(enviosLaboratorio.updatedAt))
        .limit(input?.limite ?? 50)
        .offset(input?.offset ?? 0);

      return {
        success: true,
        envios: envios.map(e => ({
          ...e,
          historicoEstados: (() => { try { return e.historicoEstados ? JSON.parse(e.historicoEstados) : []; } catch { return []; } })(),
        })),
      };
    }),

  /**
   * Obter envio por ID
   */
  obterEnvio: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [envio] = await db
        .select({
          id: enviosLaboratorio.id,
          laboratorioId: enviosLaboratorio.laboratorioId,
          laboratorioNome: laboratorios.nome,
          utenteId: enviosLaboratorio.utenteId,
          utenteNome: utentes.nome,
          medicoId: enviosLaboratorio.medicoId,
          tratamentoId: enviosLaboratorio.tratamentoId,
          tipoTrabalho: enviosLaboratorio.tipoTrabalho,
          descricao: enviosLaboratorio.descricao,
          dente: enviosLaboratorio.dente,
          cor: enviosLaboratorio.cor,
          material: enviosLaboratorio.material,
          estado: enviosLaboratorio.estado,
          prioridade: enviosLaboratorio.prioridade,
          dataEnvio: enviosLaboratorio.dataEnvio,
          dataRecebidoLab: enviosLaboratorio.dataRecebidoLab,
          dataPrevistaDevolucao: enviosLaboratorio.dataPrevistaDevolucao,
          dataDevolucaoReal: enviosLaboratorio.dataDevolucaoReal,
          dataConclusao: enviosLaboratorio.dataConclusao,
          valorOrcado: enviosLaboratorio.valorOrcado,
          valorFinal: enviosLaboratorio.valorFinal,
          pago: enviosLaboratorio.pago,
          observacoes: enviosLaboratorio.observacoes,
          historicoEstados: enviosLaboratorio.historicoEstados,
          notificacaoAtiva: enviosLaboratorio.notificacaoAtiva,
          notificacaoLida: enviosLaboratorio.notificacaoLida,
          criadoPor: enviosLaboratorio.criadoPor,
          createdAt: enviosLaboratorio.createdAt,
          updatedAt: enviosLaboratorio.updatedAt,
        })
        .from(enviosLaboratorio)
        .leftJoin(laboratorios, eq(enviosLaboratorio.laboratorioId, laboratorios.id))
        .leftJoin(utentes, eq(enviosLaboratorio.utenteId, utentes.id))
        .where(eq(enviosLaboratorio.id, input.id))
        .limit(1);

      if (!envio) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });

      return {
        success: true,
        envio: {
          ...envio,
          historicoEstados: (() => { try { return envio.historicoEstados ? JSON.parse(envio.historicoEstados) : []; } catch { return []; } })(),
        },
      };
    }),

  /**
   * Criar novo envio para laboratório
   */
  criarEnvio: protectedProcedure
    .input(envioCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const historicoInicial = [{
        estado: "criado",
        data: new Date().toISOString(),
        observacao: "Pedido criado",
        usuario: ctx.user.name || "Sistema",
      }];

      const result = await db.insert(enviosLaboratorio).values({
        laboratorioId: input.laboratorioId,
        utenteId: input.utenteId,
        medicoId: input.medicoId || null,
        tratamentoId: input.tratamentoId || null,
        tipoTrabalho: input.tipoTrabalho,
        descricao: input.descricao,
        dente: input.dente || null,
        cor: input.cor || null,
        material: input.material || null,
        prioridade: input.prioridade,
        dataPrevistaDevolucao: input.dataPrevistaDevolucao ? new Date(input.dataPrevistaDevolucao) : null,
        valorOrcado: input.valorOrcado ? String(input.valorOrcado) as any : null,
        observacoes: input.observacoes || null,
        historicoEstados: JSON.stringify(historicoInicial),
        criadoPor: ctx.user.id,
      });

      const insertId = Number(result[0].insertId);

      await logCreate(ctx.user, "envios_laboratorio", insertId, {
        tipoTrabalho: input.tipoTrabalho,
        laboratorioId: input.laboratorioId,
        utenteId: input.utenteId,
      }, `Envio "${input.tipoTrabalho}" criado para laboratório #${input.laboratorioId}`);

      return { success: true, id: insertId, message: "Envio criado com sucesso." };
    }),

  /**
   * Atualizar estado do envio (workflow)
   */
  atualizarEstado: protectedProcedure
    .input(envioUpdateEstadoSchema)
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      // Buscar envio atual
      const [envioAtual] = await db.select().from(enviosLaboratorio).where(eq(enviosLaboratorio.id, input.id)).limit(1);
      if (!envioAtual) throw new TRPCError({ code: "NOT_FOUND", message: "Envio não encontrado" });

      // Construir histórico
      let historico: any[] = [];
      try { historico = envioAtual.historicoEstados ? JSON.parse(envioAtual.historicoEstados) : []; } catch { historico = []; }
      historico.push({
        estado: input.estado,
        estadoAnterior: envioAtual.estado,
        data: new Date().toISOString(),
        observacao: input.observacao || `Estado alterado para "${input.estado}"`,
        usuario: ctx.user.name || "Sistema",
      });

      // Preparar dados de atualização
      const updateData: Record<string, any> = {
        estado: input.estado,
        historicoEstados: JSON.stringify(historico),
        updatedAt: new Date(),
        notificacaoLida: false, // Reset notificação ao mudar estado
      };

      // Atualizar datas conforme o estado
      if (input.estado === "enviado" && !envioAtual.dataEnvio) {
        updateData.dataEnvio = new Date();
      }
      if (input.estado === "recebido_lab" && !envioAtual.dataRecebidoLab) {
        updateData.dataRecebidoLab = new Date();
      }
      if (input.estado === "devolvido" && !envioAtual.dataDevolucaoReal) {
        updateData.dataDevolucaoReal = new Date();
      }
      if (input.estado === "concluido") {
        updateData.dataConclusao = new Date();
        updateData.notificacaoAtiva = false; // Remove da notificação ao concluir
      }
      if (input.estado === "cancelado") {
        updateData.notificacaoAtiva = false;
      }
      if (input.valorFinal !== undefined) {
        updateData.valorFinal = String(input.valorFinal);
      }

      await db.update(enviosLaboratorio).set(updateData).where(eq(enviosLaboratorio.id, input.id));

      await logUpdate(ctx.user, "envios_laboratorio", input.id,
        { estado: envioAtual.estado },
        { estado: input.estado },
        `Envio #${input.id}: ${envioAtual.estado} → ${input.estado}`
      );

      return { success: true, message: `Estado atualizado para "${input.estado}".` };
    }),

  /**
   * Atualizar envio (dados gerais)
   */
  atualizarEnvio: protectedProcedure
    .input(z.object({
      id: z.number(),
      tipoTrabalho: z.string().optional(),
      descricao: z.string().optional(),
      dente: z.string().optional(),
      cor: z.string().optional(),
      material: z.string().optional(),
      prioridade: z.enum(["normal", "urgente", "muito_urgente"]).optional(),
      dataPrevistaDevolucao: z.string().optional(),
      valorOrcado: z.number().optional(),
      valorFinal: z.number().optional(),
      pago: z.boolean().optional(),
      observacoes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const { id, ...data } = input;
      const updateData: Record<string, any> = { updatedAt: new Date() };

      if (data.tipoTrabalho !== undefined) updateData.tipoTrabalho = data.tipoTrabalho;
      if (data.descricao !== undefined) updateData.descricao = data.descricao;
      if (data.dente !== undefined) updateData.dente = data.dente || null;
      if (data.cor !== undefined) updateData.cor = data.cor || null;
      if (data.material !== undefined) updateData.material = data.material || null;
      if (data.prioridade !== undefined) updateData.prioridade = data.prioridade;
      if (data.dataPrevistaDevolucao !== undefined) updateData.dataPrevistaDevolucao = data.dataPrevistaDevolucao ? new Date(data.dataPrevistaDevolucao) : null;
      if (data.valorOrcado !== undefined) updateData.valorOrcado = String(data.valorOrcado);
      if (data.valorFinal !== undefined) updateData.valorFinal = String(data.valorFinal);
      if (data.pago !== undefined) updateData.pago = data.pago;
      if (data.observacoes !== undefined) updateData.observacoes = data.observacoes || null;

      await db.update(enviosLaboratorio).set(updateData).where(eq(enviosLaboratorio.id, id));

      return { success: true, message: "Envio atualizado com sucesso." };
    }),

  /**
   * Remover notificação do dashboard (marcar como lida/removida)
   */
  removerNotificacao: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(enviosLaboratorio).set({
        notificacaoAtiva: false,
        notificacaoLida: true,
        updatedAt: new Date(),
      }).where(eq(enviosLaboratorio.id, input.id));

      return { success: true };
    }),

  /**
   * Marcar notificação como lida
   */
  marcarNotificacaoLida: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      await db.update(enviosLaboratorio).set({
        notificacaoLida: true,
        updatedAt: new Date(),
      }).where(eq(enviosLaboratorio.id, input.id));

      return { success: true };
    }),

  /**
   * Obter notificações ativas de laboratório (para o dashboard)
   */
  obterNotificacoes: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const notificacoes = await db
        .select({
          id: enviosLaboratorio.id,
          laboratorioNome: laboratorios.nome,
          utenteNome: utentes.nome,
          tipoTrabalho: enviosLaboratorio.tipoTrabalho,
          estado: enviosLaboratorio.estado,
          prioridade: enviosLaboratorio.prioridade,
          dataPrevistaDevolucao: enviosLaboratorio.dataPrevistaDevolucao,
          notificacaoLida: enviosLaboratorio.notificacaoLida,
          updatedAt: enviosLaboratorio.updatedAt,
        })
        .from(enviosLaboratorio)
        .leftJoin(laboratorios, eq(enviosLaboratorio.laboratorioId, laboratorios.id))
        .leftJoin(utentes, eq(enviosLaboratorio.utenteId, utentes.id))
        .where(eq(enviosLaboratorio.notificacaoAtiva, true))
        .orderBy(desc(enviosLaboratorio.updatedAt));

      // Calcular alertas de atraso
      const agora = new Date();
      const notificacoesComAlerta = notificacoes.map(n => {
        let alerta: "normal" | "atencao" | "atrasado" = "normal";
        if (n.dataPrevistaDevolucao) {
          const prevista = new Date(n.dataPrevistaDevolucao);
          const diffDias = Math.ceil((prevista.getTime() - agora.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDias < 0) alerta = "atrasado";
          else if (diffDias <= 2) alerta = "atencao";
        }
        return { ...n, alerta };
      });

      return {
        success: true,
        notificacoes: notificacoesComAlerta,
        totalNaoLidas: notificacoesComAlerta.filter(n => !n.notificacaoLida).length,
      };
    }),

  /**
   * Obter estatísticas de laboratórios (para dashboard)
   */
  obterEstatisticas: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [stats] = await db
        .select({
          totalEnvios: count(),
          enviosAtivos: sql<number>`SUM(CASE WHEN ${enviosLaboratorio.estado} NOT IN ('concluido', 'cancelado') THEN 1 ELSE 0 END)`,
          enviosConcluidos: sql<number>`SUM(CASE WHEN ${enviosLaboratorio.estado} = 'concluido' THEN 1 ELSE 0 END)`,
          enviosAtrasados: sql<number>`SUM(CASE WHEN ${enviosLaboratorio.dataPrevistaDevolucao} < NOW() AND ${enviosLaboratorio.estado} NOT IN ('concluido', 'cancelado', 'devolvido') THEN 1 ELSE 0 END)`,
          valorTotalOrcado: sum(enviosLaboratorio.valorOrcado),
          valorTotalFinal: sum(enviosLaboratorio.valorFinal),
          totalPendentePagamento: sql<number>`SUM(CASE WHEN ${enviosLaboratorio.pago} = false AND ${enviosLaboratorio.estado} = 'concluido' THEN 1 ELSE 0 END)`,
        })
        .from(enviosLaboratorio);

      const totalLabs = await db.select({ count: count() }).from(laboratorios).where(eq(laboratorios.ativo, true));

      return {
        success: true,
        stats: {
          totalLaboratorios: Number(totalLabs[0]?.count) || 0,
          totalEnvios: Number(stats?.totalEnvios) || 0,
          enviosAtivos: Number(stats?.enviosAtivos) || 0,
          enviosConcluidos: Number(stats?.enviosConcluidos) || 0,
          enviosAtrasados: Number(stats?.enviosAtrasados) || 0,
          valorTotalOrcado: Number(stats?.valorTotalOrcado) || 0,
          valorTotalFinal: Number(stats?.valorTotalFinal) || 0,
          totalPendentePagamento: Number(stats?.totalPendentePagamento) || 0,
        },
      };
    }),
});
