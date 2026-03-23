/**
 * Router de Consultas - Gestão de Agenda
 * DentCare Elite V32.1 — CRUD Completo com Deteção de Conflitos + Tipos Padronizados
 *
 * MELHORIAS FASE 1:
 * - Deteção de conflitos de horário (mesmo médico / mesmo utente)
 * - CRUD para tipos de consulta padronizados com duração automática
 * - Cor por médico na agenda
 * - Endpoint verificarDisponibilidade para o frontend
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { consultas, utentes, medicos, configuracoesClinica, tiposConsulta } from "../../drizzle/schema";
import { eq, and, gte, lte, desc, sql, ne, or, lt, gt, asc } from "drizzle-orm";
import { logAuditAction } from "../auditService";
import { hasPermission } from "../rbac";

// ─── Helper: Validar horário de funcionamento ────────────────────────────────
async function validarHorarioConsulta(db: any, dataHoraInicio: Date, dataHoraFim: Date): Promise<void> {
  // Usar getUTCHours() para evitar problemas de fuso horário entre servidor e cliente
  const horaConsultaInicio = dataHoraInicio.getUTCHours();
  const minConsultaFim = dataHoraFim.getUTCHours() * 60 + dataHoraFim.getUTCMinutes();
  const horaConsultaFim = dataHoraFim.getUTCMinutes() === 0 ? dataHoraFim.getUTCHours() : dataHoraFim.getUTCHours() + 1;
  let horaInicio = 9;
  let horaFim = 18;
  try {
    const configRows = await db
      .select()
      .from(configuracoesClinica)
      .where(sql`${configuracoesClinica.chave} IN ('horario_abertura', 'horario_encerramento')`);
    for (const row of configRows) {
      if (row.chave === 'horario_abertura' && row.valor) horaInicio = parseInt(row.valor.split(':')[0]) || 9;
      if (row.chave === 'horario_encerramento' && row.valor) horaFim = parseInt(row.valor.split(':')[0]) || 18;
    }
  } catch (e) { /* usar valores padrão */ }
  const minFim = horaFim * 60;
  if (horaConsultaInicio < horaInicio || minConsultaFim > minFim) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `A clínica funciona entre as ${horaInicio}:00 e as ${horaFim}:00. Não é possível agendar neste horário.`
    });
  }
}

// ─── Helper: Detetar conflitos de horário ────────────────────────────────────
// Retorna lista de consultas que se sobrepõem ao intervalo dado para o médico e/ou utente
async function detetarConflitos(
  db: any,
  medicoId: number,
  utenteId: number,
  dataHoraInicio: Date,
  dataHoraFim: Date,
  excluirConsultaId?: number,
): Promise<{ medicoConflitos: any[]; utenteConflitos: any[] }> {
  // Sobreposição: A.inicio < B.fim AND A.fim > B.inicio
  const baseConditions = [
    lt(consultas.dataHoraInicio, dataHoraFim),
    gt(consultas.dataHoraFim, dataHoraInicio),
    // Excluir consultas canceladas e no-show
    sql`${consultas.estado} NOT IN ('cancelada', 'no-show')`,
  ];
  if (excluirConsultaId) {
    baseConditions.push(ne(consultas.id, excluirConsultaId));
  }

  // Conflitos do médico
  const medicoConflitos = await db
    .select({
      id: consultas.id,
      utenteNome: utentes.nome,
      dataHoraInicio: consultas.dataHoraInicio,
      dataHoraFim: consultas.dataHoraFim,
      tipoConsulta: consultas.tipoConsulta,
    })
    .from(consultas)
    .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
    .where(and(...baseConditions, eq(consultas.medicoId, medicoId)));

  // Conflitos do utente (com outro médico)
  const utenteConflitos = await db
    .select({
      id: consultas.id,
      medicoNome: medicos.nome,
      dataHoraInicio: consultas.dataHoraInicio,
      dataHoraFim: consultas.dataHoraFim,
      tipoConsulta: consultas.tipoConsulta,
    })
    .from(consultas)
    .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
    .where(and(...baseConditions, eq(consultas.utenteId, utenteId)));

  return { medicoConflitos, utenteConflitos };
}

export const consultasRouter = router({
  // ═══════════════════════════════════════════════════════════════════════════
  // TIPOS DE CONSULTA — CRUD
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Listar tipos de consulta ativos
   */
  listarTipos: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const results = await db
        .select()
        .from(tiposConsulta)
        .where(eq(tiposConsulta.ativo, true))
        .orderBy(asc(tiposConsulta.ordem));
      return { tipos: results };
    }),

  /**
   * Criar tipo de consulta
   */
  criarTipo: protectedProcedure
    .input(z.object({
      nome: z.string().min(2),
      descricao: z.string().optional(),
      duracaoPadrao: z.number().int().min(5).max(480).default(30),
      cor: z.string().default("indigo"),
      icone: z.string().default("Stethoscope"),
      ordem: z.number().int().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar tipos de consulta" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const [result] = await db.insert(tiposConsulta).values({
        nome: input.nome,
        descricao: input.descricao ?? null,
        duracaoPadrao: input.duracaoPadrao,
        cor: input.cor,
        icone: input.icone,
        ordem: input.ordem,
      });
      await logAuditAction(ctx.user, { acao: "create", tabela: "tipos_consulta", registoId: result.insertId, descricao: `Tipo de consulta criado: ${input.nome}` });
      return { success: true, id: result.insertId };
    }),

  /**
   * Atualizar tipo de consulta
   */
  atualizarTipo: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      nome: z.string().min(2).optional(),
      descricao: z.string().optional(),
      duracaoPadrao: z.number().int().min(5).max(480).optional(),
      cor: z.string().optional(),
      icone: z.string().optional(),
      ordem: z.number().int().optional(),
      ativo: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar tipos de consulta" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { id, ...rest } = input;
      await db.update(tiposConsulta).set({ ...rest, updatedAt: new Date() }).where(eq(tiposConsulta.id, id));
      await logAuditAction(ctx.user, { acao: "update", tabela: "tipos_consulta", registoId: id, descricao: `Tipo de consulta atualizado: ${id}` });
      return { success: true };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // VERIFICAÇÃO DE DISPONIBILIDADE
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Verificar disponibilidade antes de marcar
   * Retorna conflitos encontrados (se houver)
   */
  verificarDisponibilidade: protectedProcedure
    .input(z.object({
      medicoId: z.number().int().positive(),
      utenteId: z.number().int().positive(),
      dataHoraInicio: z.union([z.date(), z.string()]).transform(v => new Date(v)),
      dataHoraFim: z.union([z.date(), z.string()]).transform(v => new Date(v)),
      excluirConsultaId: z.number().int().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { medicoConflitos, utenteConflitos } = await detetarConflitos(
        db, input.medicoId, input.utenteId, input.dataHoraInicio, input.dataHoraFim, input.excluirConsultaId
      );
      return {
        disponivel: medicoConflitos.length === 0 && utenteConflitos.length === 0,
        medicoConflitos,
        utenteConflitos,
      };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // COR DO MÉDICO NA AGENDA
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Atualizar cor do médico na agenda
   */
  atualizarCorMedico: protectedProcedure
    .input(z.object({
      medicoId: z.number().int().positive(),
      cor: z.string().min(1),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(medicos).set({
        corAgenda: input.cor,
        updatedAt: new Date(),
      }).where(eq(medicos.id, input.medicoId));
      return { success: true };
    }),

  /**
   * Listar médicos com cor (para o filtro da agenda)
   * FIX V32.5.1: Normalizar resultado — db.execute() pode retornar [rows, fields] ou rows diretamente
   */
  listarMedicosAgenda: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const medicosArr = await db
        .select({
          id: medicos.id,
          nome: medicos.nome,
          especialidade: medicos.especialidade,
          corAgenda: medicos.corAgenda,
          ativo: medicos.ativo,
        })
        .from(medicos)
        .where(eq(medicos.ativo, true))
        .orderBy(medicos.nome);
      return { medicos: medicosArr };
    }),

  // ═══════════════════════════════════════════════════════════════════════════
  // CONSULTAS — CRUD (com deteção de conflitos)
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Criar nova consulta (COM deteção de conflitos)
   */
  create: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
      medicoId: z.number().int().positive(),
      dataHoraInicio: z.union([z.date(), z.string()]).transform(v => new Date(v)),
      dataHoraFim: z.union([z.date(), z.string()]).transform(v => new Date(v)),
      tipoConsulta: z.string().optional(),
      tipoConsultaId: z.number().int().optional(),
      observacoes: z.string().optional(),
      forcarMarcacao: z.boolean().optional().default(false), // permite forçar mesmo com conflito
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar consultas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });

      // 1. Validar horário de funcionamento
      await validarHorarioConsulta(db, input.dataHoraInicio, input.dataHoraFim);

      // 2. Detetar conflitos (NOVO)
      if (!input.forcarMarcacao) {
        const { medicoConflitos, utenteConflitos } = await detetarConflitos(
          db, input.medicoId, input.utenteId, input.dataHoraInicio, input.dataHoraFim
        );
        if (medicoConflitos.length > 0) {
          const conflito = medicoConflitos[0];
          const horaI = new Date(conflito.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const horaF = new Date(conflito.dataHoraFim).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          throw new TRPCError({
            code: "CONFLICT",
            message: `Conflito de horário: o médico já tem consulta com ${conflito.utenteNome} das ${horaI} às ${horaF}. Deseja forçar a marcação?`,
          });
        }
        if (utenteConflitos.length > 0) {
          const conflito = utenteConflitos[0];
          const horaI = new Date(conflito.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const horaF = new Date(conflito.dataHoraFim).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          throw new TRPCError({
            code: "CONFLICT",
            message: `Conflito de horário: o utente já tem consulta com Dr(a). ${conflito.medicoNome} das ${horaI} às ${horaF}. Deseja forçar a marcação?`,
          });
        }
      }

      // 3. Criar a consulta
      const [result] = await db.insert(consultas).values({
        utenteId: input.utenteId,
        medicoId: input.medicoId,
        dataHoraInicio: input.dataHoraInicio,
        dataHoraFim: input.dataHoraFim,
        tipoConsulta: input.tipoConsulta,
        observacoes: input.observacoes,
        estado: "agendada",
      });

      // 4. Se tipoConsultaId foi enviado, guardar referência via SQL direto
      if (input.tipoConsultaId) {
        try {
          await db.execute(sql`UPDATE consultas SET tipo_consulta_id = ${input.tipoConsultaId} WHERE id = ${result.insertId}`);
        } catch (e) { /* campo pode não existir ainda */ }
      }

      await logAuditAction(ctx.user, {
        acao: "create", tabela: "consultas", registoId: result.insertId,
        descricao: `Consulta agendada para utente ${input.utenteId}${input.forcarMarcacao ? " (forçada — conflito ignorado)" : ""}`,
      });
      return { success: true, consultaId: result.insertId, mensagem: "Consulta agendada com sucesso" };
    }),

  /**
   * Listar consultas por período e filtros
   */
  list: protectedProcedure
    .input(z.object({
      dataInicio: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      dataFim: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      medicoId: z.number().int().optional(),
      utenteId: z.number().int().optional(),
      status: z.enum(["agendada", "confirmada", "cancelada", "realizada", "no-show"]).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar consultas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: "Base de dados indisponível" });
      // FIX V32.5.1: Removido logAuditAction da query de listagem (performance))
      // Cada visualização da agenda disparava uma escrita na BD, causando lentidão

      const conditions = [];
      if (input?.dataInicio) conditions.push(gte(consultas.dataHoraInicio, input.dataInicio));
      if (input?.dataFim) conditions.push(lte(consultas.dataHoraInicio, input.dataFim));
      if (input?.medicoId) conditions.push(eq(consultas.medicoId, input.medicoId));
      if (input?.utenteId) conditions.push(eq(consultas.utenteId, input.utenteId));
      if (input?.status) conditions.push(eq(consultas.estado, input.status));

      // MELHORADO: Incluir cor do médico no resultado
      const results = await db.execute(sql`
        SELECT
          c.id, c.utente_id AS utenteId, c.medico_id AS medicoId,
          c.data_hora_inicio AS dataHoraInicio, c.data_hora_fim AS dataHoraFim,
          c.estado, c.tipo_consulta AS tipoConsulta, c.observacoes,
          c.created_at AS createdAt,
          u.nome AS utenteNome, u.telemovel AS utenteTelemovel,
          m.nome AS medicoNome, m.cor_agenda AS medicoCor
        FROM consultas c
        INNER JOIN utentes u ON c.utente_id = u.id
        INNER JOIN medicos m ON c.medico_id = m.id
        WHERE 1=1
          ${input?.dataInicio ? sql`AND c.data_hora_inicio >= ${input.dataInicio}` : sql``}
          ${input?.dataFim ? sql`AND c.data_hora_inicio <= ${input.dataFim}` : sql``}
          ${input?.medicoId ? sql`AND c.medico_id = ${input.medicoId}` : sql``}
          ${input?.utenteId ? sql`AND c.utente_id = ${input.utenteId}` : sql``}
          ${input?.status ? sql`AND c.estado = ${input.status}` : sql``}
        ORDER BY c.data_hora_inicio ASC
      `);
      // FIX V32.5.1: Normalizar resultado do db.execute()
      const raw = results as any;
      const rows = Array.isArray(raw) && raw.length > 0 && Array.isArray(raw[0]) ? raw[0] : Array.isArray(raw) ? raw : [];
      const consultasArr = rows.filter((r: any) => r && typeof r === 'object' && 'id' in r);
      return { consultas: consultasArr, total: consultasArr.length };
    }),

  /**
   * Alias para compatibilidade com Dashboard antigo
   */
  listarConsultas: protectedProcedure
    .input(z.object({
      dataInicio: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      dataFim: z.union([z.date(), z.string()]).optional().transform(v => v ? new Date(v) : undefined),
      medicoId: z.number().int().optional(),
      utenteId: z.number().int().optional(),
      status: z.enum(["agendada", "confirmada", "cancelada", "realizada", "no-show"]).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar consultas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const conditions = [];
      if (input?.dataInicio) conditions.push(gte(consultas.dataHoraInicio, input.dataInicio));
      if (input?.dataFim) conditions.push(lte(consultas.dataHoraInicio, input.dataFim));
      if (input?.medicoId) conditions.push(eq(consultas.medicoId, input.medicoId));
      if (input?.utenteId) conditions.push(eq(consultas.utenteId, input.utenteId));
      if (input?.status) conditions.push(eq(consultas.estado, input.status));
      const results = await db
        .select({
          id: consultas.id,
          utenteId: consultas.utenteId,
          medicoId: consultas.medicoId,
          dataHoraInicio: consultas.dataHoraInicio,
          dataHoraFim: consultas.dataHoraFim,
          estado: consultas.estado,
          tipoConsulta: consultas.tipoConsulta,
          observacoes: consultas.observacoes,
          utenteNome: utentes.nome,
          utenteTelemovel: utentes.telemovel,
          medicoNome: medicos.nome,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(consultas.dataHoraInicio));
      return { consultas: results, total: results.length };
    }),

  /**
   * Atualizar status da consulta
   */
  updateStatus: protectedProcedure
    .input(z.object({
      consultaId: z.number().int().positive(),
      novoStatus: z.enum(["agendada", "confirmada", "realizada", "cancelada", "no-show"]),
      motivoCancelamento: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.update")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar estado de consultas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.update(consultas).set({
        estado: input.novoStatus,
        observacoes: input.motivoCancelamento ? sql`CONCAT(IFNULL(observacoes, ''), '\nMotivo Cancelamento: ', ${input.motivoCancelamento})` : undefined,
        updatedAt: new Date()
      }).where(eq(consultas.id, input.consultaId));
      await logAuditAction(ctx.user, { acao: "update", tabela: "consultas", registoId: input.consultaId, descricao: `Estado alterado para: ${input.novoStatus}` });
      return { success: true, consultaId: input.consultaId, novoStatus: input.novoStatus };
    }),

  /**
   * Reagendar consulta (drag & drop) — COM deteção de conflitos
   */
  reschedule: protectedProcedure
    .input(z.object({
      consultaId: z.number().int().positive(),
      novaDataHoraInicio: z.string(),
      novaDataHoraFim: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const novaDataInicio = new Date(input.novaDataHoraInicio);
      const novaDataFim = new Date(input.novaDataHoraFim);
      await validarHorarioConsulta(db, novaDataInicio, novaDataFim);

      // Obter dados da consulta para verificar conflitos
      const [consultaAtual] = await db.select({ medicoId: consultas.medicoId, utenteId: consultas.utenteId })
        .from(consultas).where(eq(consultas.id, input.consultaId)).limit(1);
      if (consultaAtual) {
        const { medicoConflitos, utenteConflitos } = await detetarConflitos(
          db, consultaAtual.medicoId, consultaAtual.utenteId, novaDataInicio, novaDataFim, input.consultaId
        );
        if (medicoConflitos.length > 0) {
          const c = medicoConflitos[0];
          const hI = new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const hF = new Date(c.dataHoraFim).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          throw new TRPCError({ code: "CONFLICT", message: `Conflito: o médico já tem consulta com ${c.utenteNome} das ${hI} às ${hF}.` });
        }
        if (utenteConflitos.length > 0) {
          const c = utenteConflitos[0];
          const hI = new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          const hF = new Date(c.dataHoraFim).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
          throw new TRPCError({ code: "CONFLICT", message: `Conflito: o utente já tem consulta com Dr(a). ${c.medicoNome} das ${hI} às ${hF}.` });
        }
      }

      await db.update(consultas).set({
        dataHoraInicio: novaDataInicio,
        dataHoraFim: novaDataFim,
        updatedAt: new Date(),
      }).where(eq(consultas.id, input.consultaId));
      return { success: true };
    }),

  /**
   * Actualizar consulta completa (tipo, observações, médico, etc.)
   */
  update: protectedProcedure
    .input(z.object({
      consultaId: z.number().int().positive(),
      tipoConsulta: z.string().optional(),
      observacoes: z.string().optional(),
      medicoId: z.number().int().optional(),
      dataHoraInicio: z.string().optional(),
      dataHoraFim: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const { consultaId, dataHoraInicio, dataHoraFim, ...rest } = input;
      const update: any = { ...rest, updatedAt: new Date() };

      if (dataHoraInicio && dataHoraFim) {
        const novaDataInicio = new Date(dataHoraInicio);
        const novaDataFim = new Date(dataHoraFim);
        await validarHorarioConsulta(db, novaDataInicio, novaDataFim);

        // Detetar conflitos no reagendamento
        const [consultaAtual] = await db.select({ medicoId: consultas.medicoId, utenteId: consultas.utenteId })
          .from(consultas).where(eq(consultas.id, consultaId)).limit(1);
        if (consultaAtual) {
          const mId = input.medicoId ?? consultaAtual.medicoId;
          const { medicoConflitos } = await detetarConflitos(db, mId, consultaAtual.utenteId, novaDataInicio, novaDataFim, consultaId);
          if (medicoConflitos.length > 0) {
            const c = medicoConflitos[0];
            const hI = new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
            const hF = new Date(c.dataHoraFim).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
            throw new TRPCError({ code: "CONFLICT", message: `Conflito: o médico já tem consulta com ${c.utenteNome} das ${hI} às ${hF}.` });
          }
        }

        update.dataHoraInicio = novaDataInicio;
        update.dataHoraFim = novaDataFim;
      }

      await db.update(consultas).set(update).where(eq(consultas.id, consultaId));
      await logAuditAction(ctx.user, { acao: "update", tabela: "consultas", registoId: consultaId, descricao: `Consulta actualizada: ${consultaId}` });
      return { success: true };
    }),

  /**
   * Eliminar consulta
   */
  delete: protectedProcedure
    .input(z.object({ consultaId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "consultas.delete")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para eliminar consultas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      await db.delete(consultas).where(eq(consultas.id, input.consultaId));
      await logAuditAction(ctx.user, { acao: "delete", tabela: "consultas", registoId: input.consultaId, descricao: `Consulta eliminada: ${input.consultaId}` });
      return { success: true };
    }),

  /**
   * Obter detalhes de uma consulta específica
   */
  getById: protectedProcedure
    .input(z.object({ consultaId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const result = await db
        .select({
          id: consultas.id,
          utenteId: consultas.utenteId,
          utenteNome: utentes.nome,
          utenteTelemovel: utentes.telemovel,
          medicoId: consultas.medicoId,
          medicoNome: medicos.nome,
          dataHoraInicio: consultas.dataHoraInicio,
          dataHoraFim: consultas.dataHoraFim,
          estado: consultas.estado,
          tipoConsulta: consultas.tipoConsulta,
          observacoes: consultas.observacoes,
          createdAt: consultas.createdAt,
          updatedAt: consultas.updatedAt,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
        .where(eq(consultas.id, input.consultaId))
        .limit(1);
      if (result.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Consulta não encontrada" });
      return result[0];
    }),

  /**
   * Estatísticas de consultas (para dashboard)
   */
  estatisticas: protectedProcedure
    .input(z.object({
      dataInicio: z.string().optional(),
      dataFim: z.string().optional(),
    }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0, 23, 59, 59);
      const consultasMes = await db
        .select({ id: consultas.id, estado: consultas.estado })
        .from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioMes), lte(consultas.dataHoraInicio, fimMes)));
      const total = consultasMes.length;
      const realizadas = consultasMes.filter(c => c.estado === "realizada").length;
      const agendadas = consultasMes.filter(c => c.estado === "agendada").length;
      const confirmadas = consultasMes.filter(c => c.estado === "confirmada").length;
      const canceladas = consultasMes.filter(c => c.estado === "cancelada").length;
      const noShow = consultasMes.filter(c => c.estado === "no-show").length;
      return { total, realizadas, agendadas, confirmadas, canceladas, noShow };
    }),
});
