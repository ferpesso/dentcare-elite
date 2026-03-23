/**
 * Router da Ficha do Utente
 * Fornece todos os dados necessários para a ficha completa:
 * - Dados pessoais (CRUD)
 * - Anamnese (criar/actualizar)
 * - Odontograma (guardar estado dos dentes com histórico clínico)
 * - Imagens/Radiografias (upload base64, listagem, eliminação)
 * - Consultas do utente
 * - Faturas do utente
 * - Tratamentos do utente (com relação a dentes específicos)
 */
import { protectedProcedure, router } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { TRPCError } from "@trpc/server";
import { hasPermission } from "../rbac";
import { eq, desc, and, like, sql } from "drizzle-orm";
import {
  utentes,
  consultas,
  medicos,
  faturas,
  tratamentos,
  anamneses,
  imagiologia,
} from "../../drizzle/schema";
import { storagePut } from "../storage";
import { logAuditAction } from "../auditService";

// ─── Obter ficha completa do utente ─────────────────────────────────────────
const obterFicha = protectedProcedure
  .input(z.object({ utenteId: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    
    const [utente] = await db.select().from(utentes).where(eq(utentes.id, input.utenteId)).limit(1);
    if (!utente) throw new TRPCError({ code: "NOT_FOUND", message: "Utente não encontrado" });

    // Log de acesso (RGPD Compliance)
    await logAuditAction(ctx.user, { 
      acao: "view", 
      tabela: "utentes", 
      registoId: input.utenteId, 
      descricao: `Acesso à ficha clínica completa do utente: ${utente.nome}` 
    });
    // Consultas
    const consultasUtente = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        dataHoraFim: consultas.dataHoraFim,
        estado: consultas.estado,
        tipoConsulta: consultas.tipoConsulta,
        observacoes: consultas.observacoes,
        medicoNome: medicos.nome,
        medicoEspecialidade: medicos.especialidade,
      })
      .from(consultas)
      .leftJoin(medicos, eq(consultas.medicoId, medicos.id))
      .where(eq(consultas.utenteId, input.utenteId))
      .orderBy(desc(consultas.dataHoraInicio));
    // Faturas
    const faturasUtente = await db
      .select()
      .from(faturas)
      .where(eq(faturas.utenteId, input.utenteId))
      .orderBy(desc(faturas.dataEmissao));
    // Tratamentos
    const tratamentosUtente = await db
      .select({
        id: tratamentos.id,
        descricao: tratamentos.descricao,
        estado: tratamentos.estado,
        dataInicio: tratamentos.dataInicio,
        dataFimEstimada: tratamentos.dataFimEstimada,
        valorBruto: tratamentos.valorBruto,
        observacoes: tratamentos.observacoes,
        medicoNome: medicos.nome,
      })
      .from(tratamentos)
      .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
      .where(eq(tratamentos.utenteId, input.utenteId))
      .orderBy(desc(tratamentos.dataInicio));
    // Anamnese mais recente
    const [anamneseAtual] = await db
      .select()
      .from(anamneses)
      .where(eq(anamneses.utenteId, input.utenteId))
      .orderBy(desc(anamneses.createdAt))
      .limit(1);
    // Imagens
    const imagens = await db
      .select()
      .from(imagiologia)
      .where(eq(imagiologia.utenteId, input.utenteId))
      .orderBy(desc(imagiologia.dataExame));
    // --- Dashboard Clínico (Resumo) ---
    const totalFaturado = faturasUtente.reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
    const totalPago = faturasUtente.filter(f => f.estado === "paga").reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
    const proximaConsulta = consultasUtente.find(c => new Date(c.dataHoraInicio) > new Date());
    const ultimoTratamento = tratamentosUtente[0] || null;

    return {
      utente,
      consultas: consultasUtente,
      faturas: faturasUtente,
      tratamentos: tratamentosUtente,
      anamnese: anamneseAtual ?? null,
      imagens,
      dashboard: {
        totalFaturado,
        totalPago,
        divida: totalFaturado - totalPago,
        proximaConsulta: proximaConsulta ? { data: proximaConsulta.dataHoraInicio, tipo: proximaConsulta.tipoConsulta } : null,
        ultimoTratamento: ultimoTratamento ? { descricao: ultimoTratamento.descricao, data: ultimoTratamento.dataInicio } : null,
        alertas: {
          alergias: anamneseAtual?.alergiasDetectadas || "Nenhuma registada",
          problemasSaude: anamneseAtual?.problemasSaude || "Nenhum registado",
        }
      }
    };
  });

// ─── Actualizar dados do utente ─────────────────────────────────────────────
const actualizarDados = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    nome: z.string().optional(),
    telemovel: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    dataNascimento: z.string().optional(),
    nif: z.string().optional(),
    morada: z.string().optional(),
    localidade: z.string().optional(),
    cidade: z.string().optional(),
    codigoPostal: z.string().optional(),
    observacoes: z.string().optional(),
    genero: z.enum(["masculino", "feminino", "outro"]).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.update")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar utentes" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    
    const { utenteId, ...dados } = input;
    const update: any = { ...dados, updatedAt: new Date() };
    
    if (dados.dataNascimento) update.dataNascimento = new Date(dados.dataNascimento);
    if (dados.email === "") update.email = null;
    
    await db.update(utentes).set(update).where(eq(utentes.id, utenteId));
    
    await logAuditAction(ctx.user, { 
      acao: "update", 
      tabela: "utentes", 
      registoId: utenteId, 
      descricao: `Dados do utente atualizados via Ficha Clínica` 
    });

    return { success: true };
  });

// ─── Guardar Anamnese ──────────────────────────────────────────────────────
const guardarAnamnese = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    respostas: z.record(z.string(), z.any()),
    assinaturaDigital: z.string().optional(),
    termosAceites: z.string().optional(),
    alergiasDetectadas: z.string().optional(),
    problemasSaude: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.update")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar anamnese" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    const [existente] = await db
      .select({ id: anamneses.id })
      .from(anamneses)
      .where(eq(anamneses.utenteId, input.utenteId))
      .limit(1);

    const dataToSave = {
      utenteId: input.utenteId,
      respostas: JSON.stringify(input.respostas),
      assinaturaDigital: input.assinaturaDigital,
      termosAceites: input.termosAceites,
      alergiasDetectadas: input.alergiasDetectadas,
      problemasSaude: input.problemasSaude,
      dataAssinatura: input.assinaturaDigital ? new Date() : undefined,
      updatedAt: new Date(),
    };

    if (existente) {
      await db.update(anamneses).set(dataToSave).where(eq(anamneses.id, existente.id));
    } else {
      await db.insert(anamneses).values(dataToSave);
    }

    await logAuditAction(ctx.user, {
      acao: existente ? "update" : "create",
      tabela: "anamneses",
      registoId: input.utenteId,
      descricao: `Anamnese guardada com sucesso para utente ${input.utenteId}`,
    });

    return { success: true, message: "Anamnese guardada com sucesso" };
  });

// ─── Guardar Odontograma (com estados de dentes + dados avançados V35.5) ────────
const guardarOdontograma = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    dentes: z.record(z.string(), z.enum(["saudavel", "carie", "restauracao", "extraido", "implante", "tratado", "ausente", "coroa", "endodontia", "protese", "extracao_indicada"])),
    // V35.5 — Dados avançados por dente (periograma, implantes, prótese, notas)
    dentesAvancado: z.record(z.string(), z.object({
      estado: z.string().optional(),
      faces: z.record(z.string(), z.string()).optional(),
      notas: z.string().optional(),
      mobilidade: z.number().optional(),
      placa: z.boolean().optional(),
      sangramento: z.boolean().optional(),
      perio: z.record(z.string(), z.object({
        profundidadeSondagem: z.number().optional(),
        recessao: z.number().optional(),
        sangramentoSondagem: z.boolean().optional(),
        supuracao: z.boolean().optional(),
      }).passthrough()).optional(),
      furca: z.number().optional(),
      implante_detalhes: z.object({
        tipo: z.string().optional(),
        marca: z.string().optional(),
        comprimento: z.number().optional(),
        diametro: z.number().optional(),
        pilar: z.string().optional(),
        dataColocacao: z.string().optional(),
        observacoes: z.string().optional(),
      }).passthrough().optional(),
      protese_detalhes: z.object({
        tipo: z.string().optional(),
        material: z.string().optional(),
        pilares: z.array(z.number()).optional(),
        dataInstalacao: z.string().optional(),
        observacoes: z.string().optional(),
      }).passthrough().optional(),
      sensibilidade: z.boolean().optional(),
      supuracao: z.boolean().optional(),
      nivelOsseo: z.number().optional(),
    }).passthrough()).optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.update")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar odontograma" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const [existente] = await db
      .select({ id: anamneses.id, respostas: anamneses.respostas })
      .from(anamneses)
      .where(eq(anamneses.utenteId, input.utenteId))
      .limit(1);
    if (existente) {
      // Merge odontograma nas respostas existentes
      let respostas: any = {};
      try { respostas = JSON.parse(existente.respostas); } catch {}
      respostas.__odontograma = input.dentes;
      // V35.5 — Persistir dados avançados (periograma, implantes, prótese, notas)
      if (input.dentesAvancado && Object.keys(input.dentesAvancado).length > 0) {
        respostas.__odontograma_avancado = input.dentesAvancado;
      }
      await db.update(anamneses).set({
        respostas: JSON.stringify(respostas),
        updatedAt: new Date(),
      }).where(eq(anamneses.id, existente.id));
    } else {
      const respostasNovas: any = { __odontograma: input.dentes };
      if (input.dentesAvancado && Object.keys(input.dentesAvancado).length > 0) {
        respostasNovas.__odontograma_avancado = input.dentesAvancado;
      }
      await db.insert(anamneses).values({
        utenteId: input.utenteId,
        respostas: JSON.stringify(respostasNovas),
        dataAssinatura: new Date(),
      });
    }
    // Registar no log de auditoria
    await logAuditAction(ctx.user, {
      acao: "update",
      tabela: "anamneses",
      registoId: input.utenteId,
      descricao: `Odontograma guardado: ${Object.keys(input.dentes).length} dentes, dados avançados: ${input.dentesAvancado ? Object.keys(input.dentesAvancado).length : 0} dentes`,
    });
    return { success: true };
  });

// ─── Obter histórico de tratamentos por dente ──────────────────────────────
const obterHistoricoDente = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    numeroDente: z.string(), // Ex: "11", "12", "21", etc.
  }))
  .query(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.read")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para ler histórico clínico" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    // Procurar tratamentos que mencionam este dente na descrição ou observações
    const tratamentosRelacionados = await db
      .select({
        id: tratamentos.id,
        descricao: tratamentos.descricao,
        estado: tratamentos.estado,
        dataInicio: tratamentos.dataInicio,
        dataFimEstimada: tratamentos.dataFimEstimada,
        valorBruto: tratamentos.valorBruto,
        observacoes: tratamentos.observacoes,
        medicoNome: medicos.nome,
      })
      .from(tratamentos)
      .leftJoin(medicos, eq(tratamentos.medicoId, medicos.id))
      .where(
        and(
          eq(tratamentos.utenteId, input.utenteId),
          // Procura o número do dente na descrição ou observações
        )
      )
      .orderBy(desc(tratamentos.dataInicio));
    // Filtrar apenas os que mencionam o dente
    const filtrados = tratamentosRelacionados.filter((t: any) => {
      const desc = (t.descricao ?? "").toLowerCase();
      const obs = (t.observacoes ?? "").toLowerCase();
      return desc.includes(input.numeroDente) || obs.includes(input.numeroDente);
    });
    // Procurar imagens relacionadas a este dente
    const imagensRelacionadas = await db
      .select()
      .from(imagiologia)
      .where(eq(imagiologia.utenteId, input.utenteId))
      .orderBy(desc(imagiologia.dataExame));
    const imagensFiltradas = imagensRelacionadas.filter((i: any) => {
      const dentes = (i.dentesRelacionados ?? "").split(",").map((d: string) => d.trim());
      return dentes.includes(input.numeroDente);
    });
    return {
      tratamentos: filtrados,
      imagens: imagensFiltradas,
    };
  });

// ─── Adicionar tratamento com relação a dente ──────────────────────────────
// DEPRECATED: Usar financeiro.registarTratamento para garantir integridade fiscal
const adicionarTratamento = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    medicoId: z.number().int().positive(),
    descricao: z.string().min(1),
    numeroDente: z.string().optional(),
    valorBruto: z.number().optional(),
    observacoes: z.string().optional(),
    dataFimEstimada: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    // Redirecionar para a lógica centralizada no financeiroRouter
    // Isto evita duplicação de código e garante que a faturação SAFT-PT é sempre aplicada
    throw new TRPCError({ 
      code: "BAD_REQUEST", 
      message: "Utilize o endpoint financeiro.registarTratamento para garantir a conformidade fiscal." 
    });
  });

// ─── Actualizar estado do tratamento ───────────────────────────────────────
const actualizarTratamento = protectedProcedure
  .input(z.object({
    tratamentoId: z.number().int().positive(),
    estado: z.enum(["pendente", "proposto", "em_progresso", "concluido", "cancelado"]),
    observacoes: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.update")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para atualizar tratamentos" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    await db.update(tratamentos).set({
      estado: input.estado,
      observacoes: input.observacoes ?? undefined,
      updatedAt: new Date(),
    }).where(eq(tratamentos.id, input.tratamentoId));
    return { success: true };
  });

// ─── Upload de imagem/radiografia (S3 Proxy) ──────────────────────────────
const uploadImagem = protectedProcedure
  .input(z.object({
    utenteId: z.number().int().positive(),
    tipo: z.enum(["radiografia_periapical", "radiografia_panoramica", "radiografia_bitewing", "radiografia_cefalometrica", "fotografia_intraoral", "fotografia_extraoral", "tomografia_cbct", "outro"]),
    nomeOriginal: z.string(),
    mimeType: z.string(),
    tamanhoBytes: z.number().optional(),
    base64Data: z.string(), // data:image/jpeg;base64,...
    descricao: z.string().optional(),
    dentesRelacionados: z.string().optional(),
    dataExame: z.string().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

    // 1. Upload para o Storage Real (S3 Proxy)
    const buffer = Buffer.from(input.base64Data.split(",")[1] || input.base64Data, "base64");
    const s3Key = `clinica/${input.utenteId}/${Date.now()}_${input.nomeOriginal}`;
    
    const { url } = await storagePut(s3Key, buffer, input.mimeType);

    // 2. Guardar na BD
    const [result] = await db.insert(imagiologia).values({
      utenteId: input.utenteId,
      tipo: input.tipo,
      s3Url: url,
      s3Key,
      nomeOriginal: input.nomeOriginal,
      mimeType: input.mimeType,
      tamanhoBytes: input.tamanhoBytes ?? null,
      descricao: input.descricao ?? null,
      dentesRelacionados: input.dentesRelacionados ?? null,
      dataExame: input.dataExame ? new Date(input.dataExame) : new Date(),
    });

    await logAuditAction(ctx.user, { 
      acao: "create", 
      tabela: "imagiologia", 
      registoId: result.insertId, 
      descricao: `Upload de ${input.tipo}: ${input.nomeOriginal}` 
    });

    return { success: true, s3Key, url };
  });

// ─── Eliminar imagem ──────────────────────────────────────────────────────
const eliminarImagem = protectedProcedure
  .input(z.object({ imagemId: z.number().int().positive() }))
  .mutation(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.delete")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para eliminar imagens" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    await db.delete(imagiologia).where(eq(imagiologia.id, input.imagemId));
    return { success: true };
  });

// ─── Listar imagens do utente ─────────────────────────────────────────────
const listarImagens = protectedProcedure
  .input(z.object({ utenteId: z.number().int().positive() }))
  .query(async ({ input, ctx }) => {
    if (!hasPermission(ctx.user, "utentes.read")) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar imagens" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });
    const imagens = await db
      .select()
      .from(imagiologia)
      .where(eq(imagiologia.utenteId, input.utenteId))
      .orderBy(desc(imagiologia.dataExame));
    return { imagens };
  });

export const fichaUtenteRouter = router({
  obterFicha,
  actualizarDados,
  guardarAnamnese,
  guardarOdontograma,
  obterHistoricoDente,
  uploadImagem,
  eliminarImagem,
  listarImagens,
  adicionarTratamento,
  actualizarTratamento,
});
