/**
 * clinicHealthScore.ts — Score de Saúde da Clínica
 * DentCare V35 — Algoritmo Composto de Avaliação do Negócio
 *
 * Calcula um score de 0-100 baseado em 5 dimensões:
 * - Ocupação da Agenda (25%)
 * - Taxa de No-Show (15%)
 * - Receita vs Meta (25%)
 * - Retenção de Pacientes (20%)
 * - Satisfação Estimada (15%)
 *
 * FIX V35.5:
 * - Meta de receita agora é lida dinamicamente da tabela configuracoesClinica
 *   (chave: "meta_receita_mensal"). Fallback para 15000 se não configurada.
 * - Slots estimados agora são lidos da configuração (chave: "slots_diarios").
 * - guardarHealthSnapshot() protegido contra duplicação: verifica se já existe
 *   snapshot para o dia atual antes de inserir.
 *
 * 100% gratuito — sem dependências externas pagas.
 */

import { getDb } from "../db";
import {
  consultas,
  faturas,
  utentes,
  configuracoesClinica,
  clinicHealthSnapshots,
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, ne } from "drizzle-orm";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface HealthScoreResult {
  scoreGeral: number;
  classificacao: "excelente" | "bom" | "atencao" | "critico";
  dimensoes: {
    ocupacao: { score: number; valor: number; meta: number; label: string };
    noShow: { score: number; valor: number; meta: number; label: string };
    receita: { score: number; valor: number; meta: number; label: string };
    retencao: { score: number; valor: number; meta: number; label: string };
    satisfacao: { score: number; valor: number; meta: number; label: string };
  };
  tendencia: "subindo" | "estavel" | "descendo";
  recomendacoes: Array<{
    area: string;
    sugestao: string;
    impacto: "alto" | "medio" | "baixo";
    icone: string;
  }>;
  ultimaAtualizacao: Date;
}

// ─── Pesos das Dimensões ────────────────────────────────────────────────────

const PESOS = {
  ocupacao: 0.25,
  noShow: 0.15,
  receita: 0.25,
  retencao: 0.20,
  satisfacao: 0.15,
};

// ─── Funções Auxiliares ─────────────────────────────────────────────────────

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function classificar(score: number): "excelente" | "bom" | "atencao" | "critico" {
  if (score >= 80) return "excelente";
  if (score >= 60) return "bom";
  if (score >= 40) return "atencao";
  return "critico";
}

/**
 * Ler configurações da clínica relevantes para o Health Score.
 * FIX V35.5: Meta de receita e slots diários agora são dinâmicos.
 */
async function lerConfiguracoesHealthScore(db: any): Promise<{
  metaReceitaMensal: number;
  slotsDiarios: number;
}> {
  const defaults = { metaReceitaMensal: 15000, slotsDiarios: 8 };
  try {
    const configs = await db
      .select({ chave: configuracoesClinica.chave, valor: configuracoesClinica.valor })
      .from(configuracoesClinica)
      .where(
        sql`${configuracoesClinica.chave} IN ('meta_receita_mensal', 'slots_diarios')`
      );

    for (const row of configs) {
      if (row.chave === "meta_receita_mensal" && row.valor) {
        const parsed = parseFloat(row.valor);
        if (!isNaN(parsed) && parsed > 0) defaults.metaReceitaMensal = parsed;
      }
      if (row.chave === "slots_diarios" && row.valor) {
        const parsed = parseInt(row.valor, 10);
        if (!isNaN(parsed) && parsed > 0) defaults.slotsDiarios = parsed;
      }
    }
  } catch (e) {
    console.warn("[HealthScore] Não foi possível ler configurações, usando valores padrão:", e);
  }
  return defaults;
}

// ─── Cálculo Principal ─────────────────────────────────────────────────────

export async function calcularHealthScore(): Promise<HealthScoreResult> {
  const db = await getDb();
  if (!db) throw new Error("Base de dados indisponível");

  const agora = new Date();
  const inicioMes = new Date(agora.getFullYear(), agora.getMonth(), 1);
  const fimMes = new Date(agora.getFullYear(), agora.getMonth() + 1, 0, 23, 59, 59);
  const seisAtras = new Date(agora.getFullYear(), agora.getMonth() - 6, 1);

  // FIX V35.5: Ler configurações dinâmicas
  const { metaReceitaMensal, slotsDiarios } = await lerConfiguracoesHealthScore(db);
  // Slots estimados: slotsDiarios * 22 dias úteis/mês
  const slotsEstimados = slotsDiarios * 22;

  // ── 1. Ocupação da Agenda (25%) ─────────────────────────────────────────
  let scoreOcupacao = 50;
  let valorOcupacao = 0;
  const metaOcupacao = 80; // 80% de ocupação é o ideal

  try {
    const consultasMes = await db
      .select({ total: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioMes),
          lte(consultas.dataHoraInicio, fimMes),
          ne(consultas.estado, "cancelada")
        )
      );

    const totalConsultas = consultasMes[0]?.total || 0;
    valorOcupacao = Math.round((totalConsultas / slotsEstimados) * 100);
    scoreOcupacao = clamp(Math.round((valorOcupacao / metaOcupacao) * 100));
  } catch (e) {
    console.warn("[HealthScore] Erro ao calcular ocupação:", e);
  }

  // ── 2. Taxa de No-Show (15%) ────────────────────────────────────────────
  let scoreNoShow = 80;
  let valorNoShow = 0;
  const metaNoShow = 5; // Meta: máximo 5% de no-shows

  try {
    const consultasPassadas = await db
      .select({ total: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioMes),
          lte(consultas.dataHoraInicio, agora)
        )
      );

    const noShows = await db
      .select({ total: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioMes),
          lte(consultas.dataHoraInicio, agora),
          eq(consultas.estado, "no-show")
        )
      );

    const totalPassadas = consultasPassadas[0]?.total || 1;
    const totalNoShows = noShows[0]?.total || 0;
    valorNoShow = Math.round((totalNoShows / totalPassadas) * 100);
    scoreNoShow = clamp(Math.round(100 - (valorNoShow / 20) * 100));
  } catch (e) {
    console.warn("[HealthScore] Erro ao calcular no-show:", e);
  }

  // ── 3. Receita vs Meta (25%) ────────────────────────────────────────────
  // FIX V35.5: metaReceita agora é dinâmica (lida da configuração)
  let scoreReceita = 50;
  let valorReceita = 0;
  const metaReceita = metaReceitaMensal;

  try {
    const receitaMes = await db
      .select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` })
      .from(faturas)
      .where(
        and(
          gte(faturas.dataEmissao, inicioMes),
          lte(faturas.dataEmissao, fimMes),
          eq(faturas.estado, "paga")
        )
      );

    valorReceita = Math.round(Number(receitaMes[0]?.total || 0));
    scoreReceita = clamp(Math.round((valorReceita / metaReceita) * 100));
  } catch (e) {
    console.warn("[HealthScore] Erro ao calcular receita:", e);
  }

  // ── 4. Retenção de Pacientes (20%) ──────────────────────────────────────
  let scoreRetencao = 60;
  let valorRetencao = 0;
  const metaRetencao = 70;

  try {
    const pacientesAtivos = await db
      .select({ utenteId: consultas.utenteId })
      .from(consultas)
      .where(gte(consultas.dataHoraInicio, seisAtras))
      .groupBy(consultas.utenteId);

    const pacientesRetidos = await db
      .select({ utenteId: consultas.utenteId, total: count() })
      .from(consultas)
      .where(gte(consultas.dataHoraInicio, seisAtras))
      .groupBy(consultas.utenteId)
      .having(sql`count(*) > 1`);

    const totalAtivos = pacientesAtivos.length || 1;
    const totalRetidos = pacientesRetidos.length || 0;
    valorRetencao = Math.round((totalRetidos / totalAtivos) * 100);
    scoreRetencao = clamp(Math.round((valorRetencao / metaRetencao) * 100));
  } catch (e) {
    console.warn("[HealthScore] Erro ao calcular retenção:", e);
  }

  // ── 5. Satisfação Estimada (15%) ────────────────────────────────────────
  let scoreSatisfacao = 70;
  let valorSatisfacao = 70;
  const metaSatisfacao = 85;

  try {
    const cancelamentos = await db
      .select({ total: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioMes),
          lte(consultas.dataHoraInicio, fimMes),
          eq(consultas.estado, "cancelada")
        )
      );

    const totalMes = await db
      .select({ total: count() })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, inicioMes),
          lte(consultas.dataHoraInicio, fimMes)
        )
      );

    const totalCancelamentos = cancelamentos[0]?.total || 0;
    const totalConsultasMes = totalMes[0]?.total || 1;
    const taxaCancelamento = (totalCancelamentos / totalConsultasMes) * 100;
    valorSatisfacao = clamp(Math.round(100 - taxaCancelamento * 2 + (valorRetencao > 50 ? 10 : 0)));
    scoreSatisfacao = clamp(Math.round((valorSatisfacao / metaSatisfacao) * 100));
  } catch (e) {
    console.warn("[HealthScore] Erro ao calcular satisfação:", e);
  }

  // ── Score Geral Ponderado ───────────────────────────────────────────────
  const scoreGeral = Math.round(
    scoreOcupacao * PESOS.ocupacao +
    scoreNoShow * PESOS.noShow +
    scoreReceita * PESOS.receita +
    scoreRetencao * PESOS.retencao +
    scoreSatisfacao * PESOS.satisfacao
  );

  // ── Tendência (comparar com snapshot anterior) ──────────────────────────
  let tendencia: "subindo" | "estavel" | "descendo" = "estavel";
  try {
    const ultimoSnapshot = await db
      .select({ scoreGeral: clinicHealthSnapshots.scoreGeral })
      .from(clinicHealthSnapshots)
      .orderBy(sql`created_at DESC`)
      .limit(1);

    if (ultimoSnapshot.length > 0) {
      const diff = scoreGeral - Number(ultimoSnapshot[0].scoreGeral);
      if (diff > 3) tendencia = "subindo";
      else if (diff < -3) tendencia = "descendo";
    }
  } catch {}

  // ── Recomendações Inteligentes ──────────────────────────────────────────
  const recomendacoes: HealthScoreResult["recomendacoes"] = [];

  if (scoreOcupacao < 60) {
    recomendacoes.push({
      area: "Ocupação",
      sugestao: "A agenda tem muitos horários livres. Considere campanhas de reativação de pacientes inativos ou promoções em horários de baixa procura.",
      impacto: "alto",
      icone: "Calendar",
    });
  }

  if (scoreNoShow > 0 && valorNoShow > 10) {
    recomendacoes.push({
      area: "No-Show",
      sugestao: "A taxa de faltas está acima do ideal. Ative lembretes automáticos por WhatsApp 24h antes e considere uma política de confirmação obrigatória.",
      impacto: "alto",
      icone: "AlertTriangle",
    });
  }

  if (scoreReceita < 70) {
    recomendacoes.push({
      area: "Receita",
      sugestao: `A receita está abaixo da meta (${metaReceita.toLocaleString("pt-PT", { style: "currency", currency: "EUR" })}). Analise os tratamentos mais rentáveis e promova-os.`,
      impacto: "alto",
      icone: "TrendingUp",
    });
  }

  if (scoreRetencao < 60) {
    recomendacoes.push({
      area: "Retenção",
      sugestao: "Muitos pacientes não regressam. Implemente um programa de follow-up pós-tratamento e envie lembretes de check-up semestral.",
      impacto: "medio",
      icone: "Users",
    });
  }

  if (scoreSatisfacao < 70) {
    recomendacoes.push({
      area: "Satisfação",
      sugestao: "A taxa de cancelamento sugere insatisfação. Considere inquéritos de satisfação pós-consulta e melhore a comunicação com os pacientes.",
      impacto: "medio",
      icone: "Heart",
    });
  }

  if (recomendacoes.length === 0) {
    recomendacoes.push({
      area: "Geral",
      sugestao: "A clínica está a funcionar muito bem! Continue a monitorizar os indicadores e mantenha a qualidade do serviço.",
      impacto: "baixo",
      icone: "CheckCircle",
    });
  }

  return {
    scoreGeral,
    classificacao: classificar(scoreGeral),
    dimensoes: {
      ocupacao: { score: scoreOcupacao, valor: valorOcupacao, meta: metaOcupacao, label: "Ocupação da Agenda" },
      noShow: { score: scoreNoShow, valor: valorNoShow, meta: metaNoShow, label: "Taxa de No-Show" },
      receita: { score: scoreReceita, valor: valorReceita, meta: metaReceita, label: "Receita vs Meta" },
      retencao: { score: scoreRetencao, valor: valorRetencao, meta: metaRetencao, label: "Retenção de Pacientes" },
      satisfacao: { score: scoreSatisfacao, valor: valorSatisfacao, meta: metaSatisfacao, label: "Satisfação Estimada" },
    },
    tendencia,
    recomendacoes,
    ultimaAtualizacao: agora,
  };
}

/**
 * Guardar snapshot diário do health score.
 * FIX V35.5: Protegido contra duplicação — verifica se já existe snapshot
 * para o dia atual (data truncada a dia) antes de inserir.
 */
export async function guardarHealthSnapshot(): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;

    const hoje = new Date();
    const inicioDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 0, 0, 0);
    const fimDia = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59, 59);

    // Verificar se já existe snapshot para hoje
    const snapshotExistente = await db
      .select({ id: clinicHealthSnapshots.id })
      .from(clinicHealthSnapshots)
      .where(
        and(
          gte(clinicHealthSnapshots.data, inicioDia),
          lte(clinicHealthSnapshots.data, fimDia)
        )
      )
      .limit(1);

    if (snapshotExistente.length > 0) {
      console.log(`[HealthScore] Snapshot já existe para hoje (${hoje.toISOString().split("T")[0]}). A ignorar duplicação.`);
      return;
    }

    const score = await calcularHealthScore();

    await db.insert(clinicHealthSnapshots).values({
      data: hoje,
      scoreGeral: score.scoreGeral.toFixed(2),
      scoreOcupacao: score.dimensoes.ocupacao.score.toFixed(2),
      scoreNoShow: score.dimensoes.noShow.score.toFixed(2),
      scoreReceita: score.dimensoes.receita.score.toFixed(2),
      scoreRetencao: score.dimensoes.retencao.score.toFixed(2),
      scoreSatisfacao: score.dimensoes.satisfacao.score.toFixed(2),
      classificacao: score.classificacao,
      recomendacoes: JSON.stringify(score.recomendacoes),
      metricas: JSON.stringify(score.dimensoes),
    });

    console.log(`[HealthScore] Snapshot guardado: ${score.scoreGeral}/100 (${score.classificacao})`);
  } catch (error) {
    console.error("[HealthScore] Erro ao guardar snapshot:", error);
  }
}
