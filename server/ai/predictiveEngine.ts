/**
 * predictiveEngine.ts — Motor de IA Preditiva
 * DentCare Elite V31.1 — Data Science & AI
 *
 * CORREÇÕES v31.1:
 * - Removido acesso a consulta.tratamento (campo não existe no schema)
 * - Substituído por JOIN real com a tabela tratamentos via tratamentoId
 * - Adicionado import de catalogoTratamentos para obter preços
 *
 * Implementa modelos de predição para:
 * - No-Show (probabilidade de falta à consulta)
 * - Projeção Financeira (receita esperada)
 * - Análise de Tendências de Tratamentos
 */

import { getDb } from "../db";
import { consultas, tratamentos, catalogoTratamentos, configuracoesClinica } from "../../drizzle/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Obtém o preço de um tratamento pelo seu ID.
 * Usa o catalogoTratamentos como fonte de preços.
 * Devolve 50€ como fallback se não encontrar.
 */
async function obterPrecoPorTratamentoId(db: any, tratamentoId: number | null): Promise<number> {
  if (!tratamentoId) return 50;
  try {
    const [cat] = await db
      .select({ precoBase: catalogoTratamentos.precoBase })
      .from(catalogoTratamentos)
      .where(eq(catalogoTratamentos.id, tratamentoId))
      .limit(1);
    return cat?.precoBase ? Number(cat.precoBase) : 50;
  } catch {
    return 50;
  }
}

// ─── Predição de No-Show ──────────────────────────────────────────────────────

/**
 * Modelo de Predição de No-Show
 *
 * Fatores considerados:
 * - Taxa histórica de no-show do utente
 * - Dia da semana (segunda e sexta têm mais faltas)
 * - Hora da consulta (consultas à tarde têm mais faltas)
 * - Tipo de tratamento (alguns tratamentos têm mais faltas)
 * - Tempo desde a marcação (consultas marcadas há muito tempo têm mais faltas)
 */
export async function predictNoShowProbability(consultaId: number): Promise<{
  probabilidade: number;
  risco: "baixo" | "medio" | "alto";
  fatores: Record<string, number>;
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obter dados da consulta
    const [consulta] = await db
      .select()
      .from(consultas)
      .where(eq(consultas.id, consultaId))
      .limit(1);

    if (!consulta) {
      throw new Error(`Consulta ${consultaId} não encontrada`);
    }

    const fatores: Record<string, number> = {};

    // 1. Taxa histórica de no-show do utente
    const historicoUtente = await db
      .select({ estado: consultas.estado })
      .from(consultas)
      .where(eq(consultas.utenteId, consulta.utenteId));

    const noShowsUtente = historicoUtente.filter((c: any) => c.estado === "no-show").length;
    fatores.taxaNoShowHistorica = historicoUtente.length > 0
      ? noShowsUtente / historicoUtente.length
      : 0;

    // 2. Dia da semana (segunda=1 e sexta=5 têm mais faltas)
    const diaSemana = consulta.dataHoraInicio.getDay();
    fatores.diaSemana = diaSemana === 1 || diaSemana === 5 ? 0.15 : 0.05;

    // 3. Hora da consulta (consultas à tarde têm mais faltas)
    const hora = consulta.dataHoraInicio.getHours();
    fatores.horaConsulta = hora >= 17 ? 0.20 : hora < 9 ? 0.05 : 0.10;

    // 4. Tempo desde a marcação
    const diasDesdeMarc = Math.floor(
      (consulta.dataHoraInicio.getTime() - consulta.createdAt.getTime()) / (1000 * 60 * 60 * 24)
    );
    fatores.tempoDesdeMarc = diasDesdeMarc > 30 ? 0.20 : diasDesdeMarc > 14 ? 0.10 : 0.05;

    // 5. Tipo de tratamento — usa tratamentoId (campo real do schema)
    if (consulta.tratamentoId) {
      const consultasMesmoTratamento = await db
        .select({ estado: consultas.estado })
        .from(consultas)
        .where(eq(consultas.tratamentoId, consulta.tratamentoId));

      const noShowsTratamento = consultasMesmoTratamento.filter((c: any) => c.estado === "no-show").length;
      fatores.taxaNoShowTratamento = consultasMesmoTratamento.length > 0
        ? noShowsTratamento / consultasMesmoTratamento.length
        : 0;
    }

    // Calcular probabilidade ponderada
    const pesos: Record<string, number> = {
      taxaNoShowHistorica: 0.35,
      diaSemana: 0.15,
      horaConsulta: 0.15,
      tempoDesdeMarc: 0.20,
      taxaNoShowTratamento: 0.15,
    };

    let probabilidade = 0;
    for (const [fator, peso] of Object.entries(pesos)) {
      probabilidade += (fatores[fator] ?? 0) * peso;
    }

    probabilidade = Math.min(Math.max(probabilidade, 0), 1);

    let risco: "baixo" | "medio" | "alto";
    if (probabilidade < 0.2) risco = "baixo";
    else if (probabilidade < 0.5) risco = "medio";
    else risco = "alto";

    return {
      probabilidade: Math.round(probabilidade * 100) / 100,
      risco,
      fatores,
    };
  } catch (error) {
    console.error("Erro ao prever no-show:", error);
    throw error;
  }
}

// ─── Projeção Financeira ──────────────────────────────────────────────────────

/**
 * Modelo de Projeção Financeira
 *
 * Projeta a receita esperada para os próximos N dias com base em:
 * - Consultas agendadas e o seu tratamentoId
 * - Preço do tratamento no catalogoTratamentos
 * - Taxa de conversão histórica
 */
export async function projectFinancialForecast(daysAhead: number = 30): Promise<{
  receita_esperada: number;
  receita_confirmada: number;
  receita_potencial: number;
  confianca: number;
  detalhes: { data: string; receita: number; consultas: number }[];
}> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const hoje = new Date();
    const dataFim = new Date(hoje.getTime() + daysAhead * 24 * 60 * 60 * 1000);

    const consultasAgendadas = await db
      .select({
        id: consultas.id,
        dataHoraInicio: consultas.dataHoraInicio,
        tratamentoId: consultas.tratamentoId,
        estado: consultas.estado,
      })
      .from(consultas)
      .where(
        and(
          gte(consultas.dataHoraInicio, hoje),
          lte(consultas.dataHoraInicio, dataFim),
          eq(consultas.estado, "agendada")
        )
      );

    const consultasHistoricas = await db
      .select({ estado: consultas.estado })
      .from(consultas)
      .where(lte(consultas.createdAt, new Date(hoje.getTime() - 90 * 24 * 60 * 60 * 1000)));

    const consultasRealizadas = consultasHistoricas.filter((c: any) => c.estado === "realizada").length;
    const taxaConversao = consultasHistoricas.length > 0
      ? consultasRealizadas / consultasHistoricas.length
      : 0.8;

    let receitaConfirmada = 0;
    let receitaPotencial = 0;
    const receitaPorData: Record<string, { receita: number; consultas: number }> = {};

    for (const consulta of consultasAgendadas) {
      // Obter preço real do tratamento (ou 50€ como fallback)
      const valor = await obterPrecoPorTratamentoId(db, consulta.tratamentoId);
      receitaPotencial += valor;
      receitaConfirmada += valor * taxaConversao;

      const data = consulta.dataHoraInicio.toISOString().split("T")[0];
      if (!receitaPorData[data]) receitaPorData[data] = { receita: 0, consultas: 0 };
      receitaPorData[data].receita += valor * taxaConversao;
      receitaPorData[data].consultas += 1;
    }

    const detalhes = Object.entries(receitaPorData)
      .map(([data, info]) => ({
        data,
        receita: Math.round(info.receita * 100) / 100,
        consultas: info.consultas,
      }))
      .sort((a, b) => a.data.localeCompare(b.data));

    const confianca = Math.min(consultasHistoricas.length / 100, 1);

    return {
      receita_esperada: Math.round(receitaConfirmada * 100) / 100,
      receita_confirmada: Math.round(receitaConfirmada * 100) / 100,
      receita_potencial: Math.round(receitaPotencial * 100) / 100,
      confianca: Math.round(confianca * 100) / 100,
      detalhes,
    };
  } catch (error) {
    console.error("Erro ao projetar receita:", error);
    throw error;
  }
}

// ─── Análise de Tendências ────────────────────────────────────────────────────

/**
 * Análise de Tendências de Tratamentos
 *
 * Identifica os tratamentos mais frequentes nos últimos 90 dias.
 * Usa JOIN com catalogoTratamentos para obter nome e preço.
 */
export async function analyzeTrendingTreatments(): Promise<{
  tratamento: string;
  frequencia: number;
  receita_total: number;
  taxa_sucesso: number;
  margem_lucro: number;
}[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const dataLimite = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

    const consultasRecentes = await db
      .select({
        tratamentoId: consultas.tratamentoId,
        estado: consultas.estado,
      })
      .from(consultas)
      .where(gte(consultas.createdAt, dataLimite));

    // Agrupar por tratamentoId
    const tratamentosMap: Record<number, {
      frequencia: number;
      realizadas: number;
      receitaTotal: number;
    }> = {};

    for (const c of consultasRecentes) {
      if (!c.tratamentoId) continue;
      if (!tratamentosMap[c.tratamentoId]) {
        tratamentosMap[c.tratamentoId] = { frequencia: 0, realizadas: 0, receitaTotal: 0 };
      }
      tratamentosMap[c.tratamentoId].frequencia += 1;
      if (c.estado === "realizada") tratamentosMap[c.tratamentoId].realizadas += 1;
    }

    // Obter nomes e preços do catalogoTratamentos
    const ids = Object.keys(tratamentosMap).map(Number);
    if (ids.length === 0) return [];

    const catalogo = await db
      .select({ id: catalogoTratamentos.id, nome: catalogoTratamentos.nome, precoBase: catalogoTratamentos.precoBase })
      .from(catalogoTratamentos)
      .where(inArray(catalogoTratamentos.id, ids));

    const catalogoMap: Record<number, { nome: string; preco: number }> = {};
    for (const c of catalogo) {
      catalogoMap[c.id] = { nome: c.nome, preco: Number(c.precoBase) || 50 };
    }

    // Calcular receita e montar resultado
    for (const [idStr, dados] of Object.entries(tratamentosMap)) {
      const id = Number(idStr);
      const preco = catalogoMap[id]?.preco ?? 50;
      dados.receitaTotal = dados.realizadas * preco;
    }

    return Object.entries(tratamentosMap)
      .map(([idStr, dados]) => {
        const id = Number(idStr);
        const nome = catalogoMap[id]?.nome ?? `Tratamento #${id}`;
        const preco = catalogoMap[id]?.preco ?? 50;
        const custo = preco * 0.4; // Estimativa de custo: 40% do preço
        return {
          tratamento: nome,
          frequencia: dados.frequencia,
          receita_total: Math.round(dados.receitaTotal * 100) / 100,
          taxa_sucesso: dados.frequencia > 0
            ? Math.round((dados.realizadas / dados.frequencia) * 100) / 100
            : 0,
          margem_lucro: preco > 0
            ? Math.round(((preco - custo) / preco) * 100) / 100
            : 0,
        };
      })
      .sort((a, b) => b.frequencia - a.frequencia);
  } catch (error) {
    console.error("Erro ao analisar tendências:", error);
    throw error;
  }
}

// ─── Insights Automáticos ─────────────────────────────────────────────────────

/**
 * Gerar Insights Automáticos
 *
 * Analisa os dados e gera recomendações acionáveis.
 */
export async function generateAutoInsights(): Promise<string[]> {
  try {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const insights: string[] = [];

    // V32.2: Obter símbolo de moeda dinâmico
    let moeda = '€';
    try {
      const cfgRows = await db.select().from(configuracoesClinica);
      const cfgMap: Record<string, string> = {};
      for (const r of cfgRows) cfgMap[r.chave] = r.valor ?? '';
      moeda = cfgMap['simbolo_moeda'] || '€';
    } catch { /* fallback */ }

    // 1. Análise de No-Show
    const consultasProximas = await db
      .select({ id: consultas.id })
      .from(consultas)
      .where(and(gte(consultas.dataHoraInicio, new Date()), eq(consultas.estado, "agendada")))
      .limit(10);

    let altoRisco = 0;
    for (const c of consultasProximas) {
      try {
        const pred = await predictNoShowProbability(c.id);
        if (pred.risco === "alto") altoRisco += 1;
      } catch {
        // Ignorar erros individuais de predição
      }
    }

    if (altoRisco > 0) {
      insights.push(
        `⚠️ ${altoRisco} consultas agendadas têm alto risco de no-show. Considere enviar lembretes.`
      );
    }

    // 2. Análise de Receita
    const forecast = await projectFinancialForecast(30);
    if (forecast.receita_esperada < 1000) {
      insights.push(
        `📊 Receita esperada para os próximos 30 dias: ${moeda}${forecast.receita_esperada}. Considere aumentar a agenda.`
      );
    } else {
      insights.push(
        `📈 Receita projetada para os próximos 30 dias: ${moeda}${forecast.receita_esperada} (confiança: ${Math.round(forecast.confianca * 100)}%).`
      );
    }

    // 3. Análise de Tendências
    const trends = await analyzeTrendingTreatments();
    if (trends.length > 0) {
      const top = trends[0];
      insights.push(
        `🏆 Tratamento mais popular: ${top.tratamento} (${top.frequencia} consultas, ${Math.round(top.margem_lucro * 100)}% margem).`
      );
    }

    // 4. Tratamentos com baixa adesão
    const lowAdherence = trends.filter((t) => t.taxa_sucesso < 0.7);
    if (lowAdherence.length > 0) {
      insights.push(
        `📉 "${lowAdherence[0].tratamento}" tem taxa de conclusão baixa (${Math.round(lowAdherence[0].taxa_sucesso * 100)}%). Revise o processo de acompanhamento.`
      );
    }

    return insights;
  } catch (error) {
    console.error("Erro ao gerar insights:", error);
    throw error;
  }
}
