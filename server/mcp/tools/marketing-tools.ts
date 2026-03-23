/**
 * MCP Tools — Marketing e Redes Sociais
 * DentCare V33
 *
 * Conectores que permitem à IA publicar, agendar e analisar
 * conteúdo nas redes sociais da clínica.
 *
 * Reutiliza: socialPublisher.ts, social-hub.ts (router)
 */

import type { MCPToolDefinition, MCPToolResult, MCPContext } from "../mcpServer";
import { publicarNaRedeSocial } from "../../services/socialPublisher";
import { getDb } from "../../db";
import { contasSocialMedia, postagensSocial } from "../../../drizzle/schema";
import { eq, desc, gte, sql } from "drizzle-orm";
import { decryptApiKey } from "../../services/iaService";
import { invocarIA, getBestAvailableConfig } from "../../services/iaService";

// ─── Helper: Obter conta social ativa ────────────────────────────────────────

async function obterContaSocial(plataforma: string): Promise<{
  tokenAcesso: string;
  idPlataforma: string;
} | null> {
  const db = await getDb();
  if (!db) return null;

  const [conta] = await db
    .select()
    .from(contasSocialMedia)
    .where(eq(contasSocialMedia.plataforma, plataforma as any))
    .limit(1);

  if (!conta || !conta.tokenAcesso) return null;

  try {
    const tokenAcesso = decryptApiKey(conta.tokenAcesso);
    return { tokenAcesso, idPlataforma: conta.idPlataforma || "" };
  } catch {
    return null;
  }
}

// ─── Tools de Marketing ──────────────────────────────────────────────────────

const publicarInstagram: MCPToolDefinition = {
  name: "publicar_instagram",
  description: "Publica um post com imagem no Instagram da clínica via Meta Graph API. Requer texto (caption) e URL de imagem pública.",
  parameters: {
    type: "object",
    properties: {
      conteudo: {
        type: "string",
        description: "Texto/caption do post. Pode incluir hashtags e emojis relevantes para clínica dentária.",
      },
      imagemUrl: {
        type: "string",
        description: "URL pública da imagem a publicar. O Instagram requer sempre uma imagem.",
      },
    },
    required: ["conteudo", "imagemUrl"],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const conta = await obterContaSocial("instagram");
    if (!conta) {
      return { success: false, error: "Conta de Instagram não conectada. Configure no Social Hub." };
    }

    const resultado = await publicarNaRedeSocial({
      plataforma: "instagram",
      tokenAcesso: conta.tokenAcesso,
      idPlataforma: conta.idPlataforma,
      conteudo: args.conteudo as string,
      imagens: [args.imagemUrl as string],
    });

    if (resultado.sucesso) {
      // Registar na BD
      const db = await getDb();
      if (db) {
        // Buscar contaId do Instagram
        const [contaIG] = await db.select({ id: contasSocialMedia.id }).from(contasSocialMedia)
          .where(eq(contasSocialMedia.plataforma, "instagram")).limit(1);
        if (contaIG) {
          await db.insert(postagensSocial).values({
            contaId: contaIG.id,
            conteudo: args.conteudo as string,
            imagens: JSON.stringify([args.imagemUrl]),
            estado: "publicada",
            dataPublicacao: new Date(),
            idPublicacao: resultado.idExterno || null,
            criadoPor: BigInt(_context.userId || 0) as any,
          });
        }
      }
    }

    return {
      success: resultado.sucesso,
      data: { idExterno: resultado.idExterno },
      message: resultado.sucesso
        ? "Post publicado com sucesso no Instagram!"
        : undefined,
      error: resultado.erro,
    };
  },
};

const publicarFacebook: MCPToolDefinition = {
  name: "publicar_facebook",
  description: "Publica um post na Página de Facebook da clínica. Suporta texto com ou sem imagem.",
  parameters: {
    type: "object",
    properties: {
      conteudo: {
        type: "string",
        description: "Texto do post para o Facebook.",
      },
      imagemUrl: {
        type: "string",
        description: "URL pública da imagem (opcional). Se omitido, publica apenas texto.",
      },
    },
    required: ["conteudo"],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const conta = await obterContaSocial("facebook");
    if (!conta) {
      return { success: false, error: "Conta de Facebook não conectada. Configure no Social Hub." };
    }

    const imagens = args.imagemUrl ? [args.imagemUrl as string] : undefined;

    const resultado = await publicarNaRedeSocial({
      plataforma: "facebook",
      tokenAcesso: conta.tokenAcesso,
      idPlataforma: conta.idPlataforma,
      conteudo: args.conteudo as string,
      imagens,
    });

    if (resultado.sucesso) {
      const db = await getDb();
      if (db) {
        const [contaFB] = await db.select({ id: contasSocialMedia.id }).from(contasSocialMedia)
          .where(eq(contasSocialMedia.plataforma, "facebook")).limit(1);
        if (contaFB) {
          await db.insert(postagensSocial).values({
            contaId: contaFB.id,
            conteudo: args.conteudo as string,
            imagens: imagens ? JSON.stringify(imagens) : null,
            estado: "publicada",
            dataPublicacao: new Date(),
            idPublicacao: resultado.idExterno || null,
            criadoPor: BigInt(_context.userId || 0) as any,
          });
        }
      }
    }

    return {
      success: resultado.sucesso,
      data: { idExterno: resultado.idExterno },
      message: resultado.sucesso ? "Post publicado com sucesso no Facebook!" : undefined,
      error: resultado.erro,
    };
  },
};

const agendarPublicacao: MCPToolDefinition = {
  name: "agendar_publicacao",
  description: "Agenda uma publicação para uma data e hora específicas numa rede social. O post será publicado automaticamente na hora agendada.",
  parameters: {
    type: "object",
    properties: {
      plataforma: {
        type: "string",
        description: "Rede social alvo.",
        enum: ["instagram", "facebook", "linkedin"],
      },
      conteudo: {
        type: "string",
        description: "Texto do post a agendar.",
      },
      imagemUrl: {
        type: "string",
        description: "URL pública da imagem (obrigatório para Instagram).",
      },
      dataHora: {
        type: "string",
        description: "Data e hora para publicação no formato ISO 8601 (ex: 2026-03-20T18:00:00).",
      },
    },
    required: ["plataforma", "conteudo", "dataHora"],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const dataAgendada = new Date(args.dataHora as string);
    if (isNaN(dataAgendada.getTime())) {
      return { success: false, error: "Data/hora inválida. Use formato ISO 8601." };
    }

    if (dataAgendada <= new Date()) {
      return { success: false, error: "A data de agendamento deve ser no futuro." };
    }

    const imagens = args.imagemUrl ? JSON.stringify([args.imagemUrl]) : null;

    // Buscar contaId da plataforma
    const [conta] = await db.select({ id: contasSocialMedia.id }).from(contasSocialMedia)
      .where(eq(contasSocialMedia.plataforma, args.plataforma as any)).limit(1);

    if (!conta) {
      return { success: false, error: `Conta de ${args.plataforma} não conectada. Configure no Social Hub.` };
    }

    await db.insert(postagensSocial).values({
      contaId: conta.id,
      conteudo: args.conteudo as string,
      imagens,
      estado: "agendada",
      dataAgendamento: dataAgendada,
      criadoPor: BigInt(_context.userId || 0) as any,
    });

    return {
      success: true,
      message: `Post agendado para ${dataAgendada.toLocaleString("pt-PT")} no ${args.plataforma}.`,
      data: { plataforma: args.plataforma, dataAgendamento: dataAgendada.toISOString() },
    };
  },
};

const obterMetricasSociais: MCPToolDefinition = {
  name: "obter_metricas_sociais",
  description: "Obtém métricas e estatísticas das publicações nas redes sociais da clínica. Mostra engagement, alcance e os posts com melhor desempenho.",
  parameters: {
    type: "object",
    properties: {
      plataforma: {
        type: "string",
        description: "Filtrar por plataforma específica (opcional).",
        enum: ["instagram", "facebook", "linkedin", "todas"],
      },
      periodo: {
        type: "string",
        description: "Período de análise.",
        enum: ["7dias", "30dias", "90dias"],
        default: "30dias",
      },
    },
    required: [],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const db = await getDb();
    if (!db) return { success: false, error: "Base de dados indisponível" };

    const dias = args.periodo === "7dias" ? 7 : args.periodo === "90dias" ? 90 : 30;
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - dias);

    let query = db
      .select()
      .from(postagensSocial)
      .where(gte(postagensSocial.createdAt, dataInicio))
      .orderBy(desc(postagensSocial.createdAt))
      .limit(50);

    const posts = await query;

    // Agregar métricas
    const metricas = {
      totalPosts: posts.length,
      porPlataforma: {} as Record<string, number>,
      porEstado: {} as Record<string, number>,
      engajamentoTotal: 0,
      melhorPost: null as any,
    };

    let melhorEngajamento = 0;

    posts.forEach(post => {
      metricas.porEstado[post.estado] = (metricas.porEstado[post.estado] || 0) + 1;

      if (post.engajamento) {
        try {
          const eng = JSON.parse(post.engajamento);
          const total = (eng.likes || 0) + (eng.comments || 0) + (eng.shares || 0);
          metricas.engajamentoTotal += total;
          if (total > melhorEngajamento) {
            melhorEngajamento = total;
            metricas.melhorPost = {
              contaId: post.contaId,
              conteudo: post.conteudo?.substring(0, 100),
              engajamento: eng,
            };
          }
        } catch {}
      }
    });

    return {
      success: true,
      data: metricas,
      message: `Métricas dos últimos ${dias} dias: ${metricas.totalPosts} posts, engagement total: ${metricas.engajamentoTotal}.`,
    };
  },
};

const gerarConteudoSocial: MCPToolDefinition = {
  name: "gerar_conteudo_social",
  description: "Gera conteúdo profissional para redes sociais da clínica dentária usando IA. Cria textos otimizados com hashtags e tom adequado para cada plataforma.",
  parameters: {
    type: "object",
    properties: {
      tema: {
        type: "string",
        description: "Tema ou assunto do post (ex: 'higiene oral infantil', 'branqueamento dentário', 'implantes').",
      },
      plataforma: {
        type: "string",
        description: "Plataforma alvo para otimizar o tom e formato.",
        enum: ["instagram", "facebook", "linkedin"],
      },
      tom: {
        type: "string",
        description: "Tom desejado para o conteúdo.",
        enum: ["profissional", "educativo", "descontraido", "promocional"],
        default: "profissional",
      },
      incluirHashtags: {
        type: "string",
        description: "Se deve incluir hashtags relevantes.",
        enum: ["sim", "nao"],
        default: "sim",
      },
    },
    required: ["tema", "plataforma"],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, _context): Promise<MCPToolResult> => {
    const config = getBestAvailableConfig();
    if (!config.ativo && !config.apiKey) {
      return { success: false, error: "Nenhum provider de IA configurado. Configure GROQ_API_KEY ou OPENAI_API_KEY." };
    }

    const prompt = `Gera um post para ${args.plataforma} sobre "${args.tema}" para uma clínica dentária em Portugal.
Tom: ${args.tom || "profissional"}.
${args.incluirHashtags !== "nao" ? "Inclui 5-8 hashtags relevantes em português." : "Não incluas hashtags."}
O texto deve ser adequado para ${args.plataforma}: ${
  args.plataforma === "instagram" ? "máximo 2200 caracteres, visual e apelativo" :
  args.plataforma === "facebook" ? "informativo e envolvente, pode ser mais longo" :
  "profissional e técnico, adequado para networking"
}.
Responde APENAS com o texto do post, sem explicações adicionais.`;

    try {
      const resultado = await invocarIA(prompt, config, "marketing");
      return {
        success: true,
        data: {
          conteudo: resultado.resposta,
          plataforma: args.plataforma,
          tema: args.tema,
          provider: resultado.provider,
          modelo: resultado.modelo,
        },
        message: `Conteúdo gerado com sucesso para ${args.plataforma} (via ${resultado.provider}).`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao gerar conteúdo: ${error.message}` };
    }
  },
};

const planearSemana: MCPToolDefinition = {
  name: "planear_semana_social",
  description: "Planeia e agenda automaticamente posts para a semana inteira nas redes sociais da clínica. A IA cria conteúdo variado e agenda nos melhores horários.",
  parameters: {
    type: "object",
    properties: {
      numeroPosts: {
        type: "string",
        description: "Número de posts a criar para a semana (padrão: 3).",
        default: "3",
      },
      plataformas: {
        type: "string",
        description: "Plataformas alvo separadas por vírgula (ex: 'instagram,facebook').",
        default: "instagram,facebook",
      },
      temas: {
        type: "string",
        description: "Temas sugeridos separados por vírgula (opcional). Se omitido, a IA escolhe temas relevantes.",
      },
    },
    required: [],
  },
  category: "marketing",
  requiresAuth: true,
  handler: async (args, context): Promise<MCPToolResult> => {
    const config = getBestAvailableConfig();
    const numPosts = parseInt(args.numeroPosts as string) || 3;
    const plataformas = ((args.plataformas as string) || "instagram,facebook").split(",").map(p => p.trim());

    const prompt = `Cria um plano de ${numPosts} posts para redes sociais de uma clínica dentária em Portugal para a próxima semana.
${args.temas ? `Temas sugeridos: ${args.temas}` : "Escolhe temas variados e relevantes para saúde oral."}
Para cada post, fornece:
1. Dia da semana e hora ideal (formato 24h)
2. Plataforma(s): ${plataformas.join(", ")}
3. Texto do post completo com hashtags
4. Sugestão de tipo de imagem

Responde em formato JSON array: [{"dia": "segunda", "hora": "18:00", "plataforma": "instagram", "texto": "...", "sugestaoImagem": "..."}]`;

    try {
      const resultado = await invocarIA(prompt, config, "marketing");

      // Tentar parsear o plano
      let plano: any[] = [];
      try {
        const jsonMatch = resultado.resposta.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          plano = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Se não conseguir parsear, devolver o texto raw
      }

      return {
        success: true,
        data: {
          plano: plano.length > 0 ? plano : resultado.resposta,
          numeroPosts: numPosts,
          plataformas,
          provider: resultado.provider,
        },
        message: `Plano semanal criado com ${numPosts} posts para ${plataformas.join(", ")}.`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao planear semana: ${error.message}` };
    }
  },
};

// ─── Exportar todas as tools de marketing ────────────────────────────────────

export const marketingTools: MCPToolDefinition[] = [
  publicarInstagram,
  publicarFacebook,
  agendarPublicacao,
  obterMetricasSociais,
  gerarConteudoSocial,
  planearSemana,
];
