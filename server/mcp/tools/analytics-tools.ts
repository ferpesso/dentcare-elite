/**
 * Analytics MCP Tools — Ferramentas de Análise Avançada
 * DentCare V35 — 100% Gratuito
 *
 * 3 novas tools de analytics:
 * - analisar_tendencias: Análise de tendências de tratamentos e receita
 * - score_saude_clinica: Score composto de saúde do negócio (0-100)
 * - comparar_periodos: Comparação entre períodos com insights
 */

import type { MCPToolDefinition, MCPContext, MCPToolResult } from "../mcpServer";
import { getDb } from "../../db";
import { consultas, faturas, utentes, tratamentos } from "../../../drizzle/schema";
import { eq, and, gte, lte, sql, count, ne } from "drizzle-orm";
import { calcularHealthScore } from "../../services/clinicHealthScore";

// ─── Tool: Analisar Tendências ──────────────────────────────────────────────

const analisarTendencias: MCPToolDefinition = {
  name: "analisar_tendencias",
  description: "Analisa tendências de tratamentos, receita e pacientes nos últimos meses. Identifica padrões de crescimento ou declínio e sugere ações.",
  parameters: {
    type: "object",
    properties: {
      periodo_meses: {
        type: "string",
        description: "Número de meses a analisar (padrão: 6)",
        default: "6",
      },
      foco: {
        type: "string",
        description: "Área de foco da análise",
        enum: ["receita", "consultas", "pacientes", "tratamentos", "geral"],
        default: "geral",
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Base de dados indisponível" };

      const meses = parseInt(String(args.periodo_meses || "6"), 10);
      const agora = new Date();
      const tendencias: Array<{
        mes: string;
        consultas: number;
        receita: number;
        novosUtentes: number;
        noShows: number;
      }> = [];

      for (let i = meses - 1; i >= 0; i--) {
        const inicio = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
        const fim = new Date(agora.getFullYear(), agora.getMonth() - i + 1, 0, 23, 59, 59);
        const mesLabel = inicio.toLocaleDateString("pt-PT", { month: "short", year: "numeric" });

        const [consultasMes] = await db
          .select({ total: count() })
          .from(consultas)
          .where(and(gte(consultas.dataHoraInicio, inicio), lte(consultas.dataHoraInicio, fim)));

        const [receitaMes] = await db
          .select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` })
          .from(faturas)
          .where(and(gte(faturas.dataEmissao, inicio), lte(faturas.dataEmissao, fim), eq(faturas.estado, "paga")));

        const [novos] = await db
          .select({ total: count() })
          .from(utentes)
          .where(and(gte(utentes.createdAt, inicio), lte(utentes.createdAt, fim)));

        const [noShows] = await db
          .select({ total: count() })
          .from(consultas)
          .where(and(
            gte(consultas.dataHoraInicio, inicio),
            lte(consultas.dataHoraInicio, fim),
            eq(consultas.estado, "no-show")
          ));

        tendencias.push({
          mes: mesLabel,
          consultas: consultasMes?.total || 0,
          receita: Math.round(Number(receitaMes?.total || 0)),
          novosUtentes: novos?.total || 0,
          noShows: noShows?.total || 0,
        });
      }

      // Calcular variações
      const ultimoMes = tendencias[tendencias.length - 1];
      const penultimoMes = tendencias.length > 1 ? tendencias[tendencias.length - 2] : ultimoMes;
      const variacaoReceita = penultimoMes.receita > 0
        ? ((ultimoMes.receita - penultimoMes.receita) / penultimoMes.receita * 100).toFixed(1)
        : "0";
      const variacaoConsultas = penultimoMes.consultas > 0
        ? ((ultimoMes.consultas - penultimoMes.consultas) / penultimoMes.consultas * 100).toFixed(1)
        : "0";

      return {
        success: true,
        data: {
          tendencias,
          resumo: {
            periodoAnalisado: `${meses} meses`,
            variacaoReceita: `${variacaoReceita}%`,
            variacaoConsultas: `${variacaoConsultas}%`,
            totalReceitaPeriodo: tendencias.reduce((s, t) => s + t.receita, 0),
            totalConsultasPeriodo: tendencias.reduce((s, t) => s + t.consultas, 0),
            mediaNoShowMensal: (tendencias.reduce((s, t) => s + t.noShows, 0) / meses).toFixed(1),
          },
        },
        message: `Análise de tendências dos últimos ${meses} meses concluída. Receita variou ${variacaoReceita}% e consultas variaram ${variacaoConsultas}% no último mês.`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao analisar tendências: ${error.message}` };
    }
  },
  category: "analytics",
  requiresAuth: true,
};

// ─── Tool: Score de Saúde da Clínica ────────────────────────────────────────

const scoreSaudeClinica: MCPToolDefinition = {
  name: "score_saude_clinica",
  description: "Calcula o score de saúde da clínica (0-100) baseado em 5 dimensões: ocupação, no-show, receita, retenção e satisfação. Inclui recomendações de melhoria.",
  parameters: {
    type: "object",
    properties: {},
    required: [],
  },
  handler: async (_args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const score = await calcularHealthScore();
      return {
        success: true,
        data: score,
        message: `Score de saúde da clínica: ${score.scoreGeral}/100 (${score.classificacao}). Tendência: ${score.tendencia}. ${score.recomendacoes.length} recomendação(ões) gerada(s).`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao calcular score: ${error.message}` };
    }
  },
  category: "analytics",
  requiresAuth: true,
};

// ─── Tool: Comparar Períodos ────────────────────────────────────────────────

const compararPeriodos: MCPToolDefinition = {
  name: "comparar_periodos",
  description: "Compara métricas entre dois períodos (ex: este mês vs mês anterior, este trimestre vs anterior). Gera insights sobre evolução.",
  parameters: {
    type: "object",
    properties: {
      tipo_comparacao: {
        type: "string",
        description: "Tipo de comparação temporal",
        enum: ["mensal", "trimestral", "semestral", "anual"],
        default: "mensal",
      },
    },
    required: [],
  },
  handler: async (args: Record<string, unknown>, _context: MCPContext): Promise<MCPToolResult> => {
    try {
      const db = await getDb();
      if (!db) return { success: false, error: "Base de dados indisponível" };

      const tipo = String(args.tipo_comparacao || "mensal");
      const agora = new Date();
      let mesesAtras = 1;
      if (tipo === "trimestral") mesesAtras = 3;
      else if (tipo === "semestral") mesesAtras = 6;
      else if (tipo === "anual") mesesAtras = 12;

      // Período atual
      const inicioAtual = new Date(agora.getFullYear(), agora.getMonth() - mesesAtras + 1, 1);
      const fimAtual = agora;

      // Período anterior
      const inicioAnterior = new Date(inicioAtual.getFullYear(), inicioAtual.getMonth() - mesesAtras, 1);
      const fimAnterior = new Date(inicioAtual.getFullYear(), inicioAtual.getMonth(), 0, 23, 59, 59);

      // Métricas período atual
      const [consultasAtual] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioAtual), lte(consultas.dataHoraInicio, fimAtual)));
      const [receitaAtual] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
        .where(and(gte(faturas.dataEmissao, inicioAtual), lte(faturas.dataEmissao, fimAtual), eq(faturas.estado, "paga")));
      const [novosAtual] = await db.select({ total: count() }).from(utentes)
        .where(and(gte(utentes.createdAt, inicioAtual), lte(utentes.createdAt, fimAtual)));
      const [noShowAtual] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioAtual), lte(consultas.dataHoraInicio, fimAtual), eq(consultas.estado, "no-show")));

      // Métricas período anterior
      const [consultasAnterior] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioAnterior), lte(consultas.dataHoraInicio, fimAnterior)));
      const [receitaAnterior] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
        .where(and(gte(faturas.dataEmissao, inicioAnterior), lte(faturas.dataEmissao, fimAnterior), eq(faturas.estado, "paga")));
      const [novosAnterior] = await db.select({ total: count() }).from(utentes)
        .where(and(gte(utentes.createdAt, inicioAnterior), lte(utentes.createdAt, fimAnterior)));
      const [noShowAnterior] = await db.select({ total: count() }).from(consultas)
        .where(and(gte(consultas.dataHoraInicio, inicioAnterior), lte(consultas.dataHoraInicio, fimAnterior), eq(consultas.estado, "no-show")));

      const calcVariacao = (atual: number, anterior: number) =>
        anterior > 0 ? ((atual - anterior) / anterior * 100).toFixed(1) : "N/A";

      const cA = consultasAtual?.total || 0;
      const cB = consultasAnterior?.total || 0;
      const rA = Math.round(Number(receitaAtual?.total || 0));
      const rB = Math.round(Number(receitaAnterior?.total || 0));
      const nA = novosAtual?.total || 0;
      const nB = novosAnterior?.total || 0;
      const nsA = noShowAtual?.total || 0;
      const nsB = noShowAnterior?.total || 0;

      const insights: string[] = [];
      if (rA > rB) insights.push(`Receita cresceu ${calcVariacao(rA, rB)}% — excelente tendência.`);
      else if (rA < rB) insights.push(`Receita caiu ${calcVariacao(rA, rB)}% — atenção necessária.`);
      if (nsA < nsB) insights.push("Taxa de no-show melhorou — os lembretes estão a funcionar.");
      if (nA > nB) insights.push("Captação de novos pacientes aumentou — marketing eficaz.");

      return {
        success: true,
        data: {
          comparacao: tipo,
          periodoAtual: { inicio: inicioAtual.toISOString(), fim: fimAtual.toISOString() },
          periodoAnterior: { inicio: inicioAnterior.toISOString(), fim: fimAnterior.toISOString() },
          metricas: {
            consultas: { atual: cA, anterior: cB, variacao: `${calcVariacao(cA, cB)}%` },
            receita: { atual: rA, anterior: rB, variacao: `${calcVariacao(rA, rB)}%` },
            novosUtentes: { atual: nA, anterior: nB, variacao: `${calcVariacao(nA, nB)}%` },
            noShows: { atual: nsA, anterior: nsB, variacao: `${calcVariacao(nsA, nsB)}%` },
          },
          insights,
        },
        message: `Comparação ${tipo}: Receita ${calcVariacao(rA, rB)}%, Consultas ${calcVariacao(cA, cB)}%, Novos pacientes ${calcVariacao(nA, nB)}%.`,
      };
    } catch (error: any) {
      return { success: false, error: `Erro ao comparar períodos: ${error.message}` };
    }
  },
  category: "analytics",
  requiresAuth: true,
};

// ─── Exportação ─────────────────────────────────────────────────────────────

export const analyticsTools: MCPToolDefinition[] = [
  analisarTendencias,
  scoreSaudeClinica,
  compararPeriodos,
];
