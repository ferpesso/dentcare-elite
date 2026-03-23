/**
 * Router de IA — Inteligência Artificial Clínica
 * DentCare Elite V31 — OpenAI Integration
 *
 * Funcionalidades:
 * - Análise de imagens radiográficas (Vision)
 * - Sugestões clínicas baseadas em anamnese
 * - Geração de briefing de voz clínico
 * - Previsão de churn de utentes
 * - Resumo automático de consultas
 */
import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { utentes, consultas, tratamentos, anamneses, medicos } from "../../drizzle/schema";
import { eq, desc, gte, lte, and } from "drizzle-orm";
import OpenAI from "openai";

/**
 * V33: Suporte multi-provider — Groq (grátis) → OpenAI (pago)
 * A Groq API é compatível com o SDK da OpenAI, basta mudar a base URL.
 */
function getAIClient(): { client: OpenAI; provider: string; model: string } | null {
  // 1. Tentar Groq primeiro (grátis)
  if (process.env.GROQ_API_KEY) {
    return {
      client: new OpenAI({
        apiKey: process.env.GROQ_API_KEY,
        baseURL: "https://api.groq.com/openai/v1",
      }),
      provider: "groq",
      model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    };
  }
  // 2. Fallback para OpenAI (pago)
  if (process.env.OPENAI_API_KEY) {
    return {
      client: new OpenAI({ apiKey: process.env.OPENAI_API_KEY }),
      provider: "openai",
      model: "gpt-4.1-mini",
    };
  }
  return null;
}

// Manter compatibilidade com código existente
function getOpenAI() {
  const ai = getAIClient();
  return ai?.client || null;
}

export const iaRouter = router({
  /**
   * Análise de imagem radiográfica por IA
   */
  analisarImagem: protectedProcedure
    .input(z.object({
      imagemBase64: z.string().min(1),
      mimeType: z.string().default("image/jpeg"),
      contexto: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAI();
      if (!openai) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "API de IA não configurada" });

      try {
        const dataUrl = `data:${input.mimeType};base64,${input.imagemBase64}`;
        const ai = getAIClient();
      const modelToUse = ai?.model || "gpt-4.1-mini";
      const response = await openai.chat.completions.create({
          model: modelToUse,
          messages: [
            {
              role: "system",
              content: `És um assistente de radiologia dentária especializado. Analisa imagens radiográficas e fornece observações clínicas detalhadas em português europeu. 
              Identifica: cáries, problemas periodontais, lesões apicais, reabsorções, implantes, coroas, pontes, dentes inclusos, e outras anomalias.
              Fornece sempre um aviso de que a análise é auxiliar e não substitui o diagnóstico do médico dentista.`,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analisa esta imagem radiográfica dentária.${input.contexto ? ` Contexto adicional: ${input.contexto}` : ""} Fornece uma análise detalhada das observações clínicas visíveis.`,
                },
                {
                  type: "image_url",
                  image_url: { url: dataUrl, detail: "high" },
                },
              ],
            },
          ],
          max_tokens: 1000,
        });

        const analise = response.choices[0]?.message?.content ?? "Não foi possível analisar a imagem.";
        return { success: true, analise, modelo: modelToUse, provider: ai?.provider || "openai" };
      } catch (error: any) {
        console.error("Erro na análise de imagem:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Erro na análise de IA. Verifique a configuração do provider de IA." });
      }
    }),

  /**
   * Sugestões clínicas baseadas na anamnese do utente
   */
  sugestoesClinicas: protectedProcedure
    .input(z.object({
      utenteId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAI();
      if (!openai) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "API de IA não configurada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [utente] = await db.select().from(utentes).where(eq(utentes.id, input.utenteId)).limit(1);
      if (!utente) throw new TRPCError({ code: "NOT_FOUND", message: "Utente não encontrado" });

      const [anamnese] = await db.select().from(anamneses).where(eq(anamneses.utenteId, input.utenteId)).orderBy(desc(anamneses.createdAt)).limit(1);
      const tratamentosUtente = await db.select().from(tratamentos).where(eq(tratamentos.utenteId, input.utenteId)).orderBy(desc(tratamentos.dataInicio)).limit(10);

      let contexto = `Utente: ${utente.nome}, ${utente.genero || "género não especificado"}`;
      if (utente.dataNascimento) {
        const idade = Math.floor((Date.now() - new Date(utente.dataNascimento).getTime()) / (365.25 * 24 * 3600 * 1000));
        contexto += `, ${idade} anos`;
      }
      if (anamnese) {
        let respostas: any = {};
        try { respostas = JSON.parse(anamnese.respostas); } catch {}
        if (anamnese.alergiasDetectadas) contexto += `\nAlergias: ${anamnese.alergiasDetectadas}`;
        if (anamnese.problemasSaude) contexto += `\nProblemas de saúde: ${anamnese.problemasSaude}`;
      }
      if (tratamentosUtente.length > 0) {
        contexto += `\nTratamentos recentes: ${tratamentosUtente.map(t => t.descricao).join(", ")}`;
      }

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `És um assistente clínico dentário especializado. Com base nos dados do utente, fornece sugestões clínicas relevantes em português europeu. 
            Inclui: alertas de saúde, recomendações de tratamento preventivo, frequência de consultas sugerida, e cuidados especiais baseados no histórico.
            Sê conciso e prático. Sempre indica que as sugestões são auxiliares ao julgamento clínico do médico.`,
          },
          {
            role: "user",
            content: `Com base nestes dados do utente, fornece sugestões clínicas:\n\n${contexto}`,
          },
        ],
        max_tokens: 600,
      });

      const sugestoes = response.choices[0]?.message?.content ?? "Sem sugestões disponíveis.";
      return { success: true, sugestoes, utente: utente.nome };
    }),

  /**
   * Gerar briefing de voz clínico (resumo do dia)
   */
  gerarBriefing: protectedProcedure
    .input(z.object({
      data: z.string().optional(),
    }).optional())
    .mutation(async ({ input }) => {
      const openai = getOpenAI();
      if (!openai) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "API de IA não configurada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const hoje = input?.data ? new Date(input.data) : new Date();
      const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
      const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

      const consultasHoje = await db
        .select({
          id: consultas.id,
          estado: consultas.estado,
          tipoConsulta: consultas.tipoConsulta,
          dataHoraInicio: consultas.dataHoraInicio,
          utenteNome: utentes.nome,
          medicoNome: medicos.nome,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
        .where(and(gte(consultas.dataHoraInicio, inicioDia), lte(consultas.dataHoraInicio, fimDia)))
        .orderBy(consultas.dataHoraInicio);

      const dataFormatada = hoje.toLocaleDateString("pt-PT", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const resumoConsultas = consultasHoje.length > 0
        ? consultasHoje.map(c => `- ${c.dataHoraInicio instanceof Date ? c.dataHoraInicio.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "?"}: ${c.utenteNome} com ${c.medicoNome} (${c.tipoConsulta || "consulta"}) — ${c.estado}`).join("\n")
        : "Sem consultas agendadas para hoje.";

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: `És um assistente de gestão clínica. Gera um briefing profissional e conciso para o início do dia de trabalho numa clínica dentária, em português europeu. 
            O briefing deve ser natural, como se fosse lido em voz alta, com saudação, resumo do dia, destaques importantes e uma nota motivacional.`,
          },
          {
            role: "user",
            content: `Gera um briefing para ${dataFormatada}.\n\nConsultas do dia:\n${resumoConsultas}\n\nTotal: ${consultasHoje.length} consultas`,
          },
        ],
        max_tokens: 500,
      });

      const briefing = response.choices[0]?.message?.content ?? "Briefing não disponível.";
      return { success: true, briefing, data: dataFormatada, totalConsultas: consultasHoje.length };
    }),

  /**
   * Previsão de churn (utentes em risco de abandono)
   */
  previsaoChurn: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const openai = getOpenAI();

      // Calcular utentes sem consulta há mais de 6 meses
      const seiseMesesAtras = new Date();
      seiseMesesAtras.setMonth(seiseMesesAtras.getMonth() - 6);

      const todosUtentes = await db.select({ id: utentes.id, nome: utentes.nome }).from(utentes).where(eq(utentes.ativo, true));
      const consultasRecentes = await db
        .select({ utenteId: consultas.utenteId, dataHoraInicio: consultas.dataHoraInicio })
        .from(consultas)
        .where(gte(consultas.dataHoraInicio, seiseMesesAtras));

      const utentesComConsultaRecente = new Set(consultasRecentes.map(c => c.utenteId));
      const utentesEmRisco = todosUtentes.filter(u => !utentesComConsultaRecente.has(u.id));

      let analiseIA = null;
      if (openai && utentesEmRisco.length > 0) {
        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4.1-mini",
            messages: [
              {
                role: "system",
                content: "És um especialista em retenção de pacientes em clínicas dentárias. Fornece recomendações práticas em português europeu.",
              },
              {
                role: "user",
                content: `Temos ${utentesEmRisco.length} utentes sem consulta há mais de 6 meses. Sugere 3 estratégias concretas de reactivação para uma clínica dentária.`,
              },
            ],
            max_tokens: 400,
          });
          analiseIA = response.choices[0]?.message?.content;
        } catch {}
      }

      return {
        utentesEmRisco: utentesEmRisco.slice(0, 20),
        totalEmRisco: utentesEmRisco.length,
        totalAtivos: todosUtentes.length,
        percentualRisco: todosUtentes.length > 0 ? Math.round((utentesEmRisco.length / todosUtentes.length) * 100) : 0,
        estrategiasIA: analiseIA,
      };
    }),

  /**
   * Resumo automático de consulta
   */
  resumirConsulta: protectedProcedure
    .input(z.object({
      consultaId: z.number().int().positive(),
    }))
    .mutation(async ({ input }) => {
      const openai = getOpenAI();
      if (!openai) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "API de IA não configurada" });

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [consulta] = await db
        .select({
          id: consultas.id,
          tipoConsulta: consultas.tipoConsulta,
          observacoes: consultas.observacoes,
          estado: consultas.estado,
          dataHoraInicio: consultas.dataHoraInicio,
          utenteNome: utentes.nome,
          medicoNome: medicos.nome,
        })
        .from(consultas)
        .innerJoin(utentes, eq(consultas.utenteId, utentes.id))
        .innerJoin(medicos, eq(consultas.medicoId, medicos.id))
        .where(eq(consultas.id, input.consultaId))
        .limit(1);

      if (!consulta) throw new TRPCError({ code: "NOT_FOUND" });

      const response = await openai.chat.completions.create({
        model: "gpt-4.1-mini",
        messages: [
          {
            role: "system",
            content: "És um assistente clínico. Gera um resumo profissional e conciso de consulta dentária em português europeu, adequado para registo clínico.",
          },
          {
            role: "user",
            content: `Gera um resumo clínico para esta consulta:\nUtente: ${consulta.utenteNome}\nMédico: ${consulta.medicoNome}\nTipo: ${consulta.tipoConsulta || "Consulta geral"}\nObservações: ${consulta.observacoes || "Sem observações registadas"}\nEstado: ${consulta.estado}`,
          },
        ],
        max_tokens: 300,
      });

      const resumo = response.choices[0]?.message?.content ?? "Resumo não disponível.";
      return { success: true, resumo };
    }),

  /**
   * Listar provedores de IA disponíveis
   */
  listarProvedores: protectedProcedure
    .query(async () => {
      const temOpenAI = !!process.env.OPENAI_API_KEY;
      const temGroq = !!process.env.GROQ_API_KEY;
      const ai = getAIClient();
      return {
        success: true,
        provedores: [
          { id: 1, provider: "groq", modelo: "llama-3.3-70b-versatile", ativo: temGroq, descricao: "Groq (Llama 3.3 70B) — Gratuito, ultra-rápido, 14.400 req/dia", custo: "Gratuito" },
          { id: 2, provider: "openai", modelo: "gpt-4.1-mini", ativo: temOpenAI, descricao: "OpenAI GPT-4.1 Mini — Análise clínica, briefings, sugestões", custo: "Pago" },
          { id: 3, provider: "openai-vision", modelo: "gpt-4.1-mini", ativo: temOpenAI, descricao: "OpenAI Vision — Análise de radiografias e imagens clínicas", custo: "Pago" },
          { id: 4, provider: "ollama", modelo: "llama2", ativo: true, descricao: "Ollama (Local) — Gratuito, requer servidor local", custo: "Gratuito" },
        ],
        configurado: temGroq || temOpenAI,
        providerAtivo: ai?.provider || "nenhum",
        modeloAtivo: ai?.model || "nenhum",
      };
    }),
});
