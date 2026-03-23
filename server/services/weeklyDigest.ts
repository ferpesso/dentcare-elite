/**
 * weeklyDigest.ts — Gerador de Resumo Semanal
 * DentCare V35 — 100% Gratuito
 *
 * Gera um resumo semanal em HTML elegante com:
 * - KPIs da semana com comparação
 * - Score de saúde da clínica
 * - Top pacientes por receita
 * - Alertas e recomendações
 * - Sugestões para a próxima semana
 */

import { getDb } from "../db";
import { consultas, faturas, utentes } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, count, ne, desc } from "drizzle-orm";
import { calcularHealthScore } from "./clinicHealthScore";

export interface WeeklyDigestData {
  periodo: { inicio: string; fim: string };
  kpis: {
    consultas: number;
    consultasAnterior: number;
    receita: number;
    receitaAnterior: number;
    novosUtentes: number;
    noShows: number;
    taxaRealizacao: number;
  };
  healthScore: number;
  healthClassificacao: string;
  topPacientes: Array<{ nome: string; receita: number; consultas: number }>;
  recomendacoes: string[];
  geradoEm: string;
}

export async function gerarWeeklyDigest(): Promise<WeeklyDigestData> {
  const db = await getDb();
  if (!db) throw new Error("Base de dados indisponível");

  const agora = new Date();
  const inicioSemana = new Date(agora);
  inicioSemana.setDate(agora.getDate() - agora.getDay() + 1);
  inicioSemana.setHours(0, 0, 0, 0);
  const fimSemana = new Date(inicioSemana);
  fimSemana.setDate(inicioSemana.getDate() + 6);
  fimSemana.setHours(23, 59, 59, 999);

  const inicioAnterior = new Date(inicioSemana);
  inicioAnterior.setDate(inicioAnterior.getDate() - 7);
  const fimAnterior = new Date(inicioSemana);
  fimAnterior.setDate(fimAnterior.getDate() - 1);
  fimAnterior.setHours(23, 59, 59, 999);

  // KPIs
  const [cE] = await db.select({ total: count() }).from(consultas)
    .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), ne(consultas.estado, "cancelada")));
  const [cA] = await db.select({ total: count() }).from(consultas)
    .where(and(gte(consultas.dataHoraInicio, inicioAnterior), lte(consultas.dataHoraInicio, fimAnterior), ne(consultas.estado, "cancelada")));
  const [rE] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
    .where(and(gte(faturas.dataEmissao, inicioSemana), lte(faturas.dataEmissao, fimSemana), eq(faturas.estado, "paga")));
  const [rA] = await db.select({ total: sql<string>`COALESCE(SUM(valor_total), 0)` }).from(faturas)
    .where(and(gte(faturas.dataEmissao, inicioAnterior), lte(faturas.dataEmissao, fimAnterior), eq(faturas.estado, "paga")));
  const [novos] = await db.select({ total: count() }).from(utentes)
    .where(and(gte(utentes.createdAt, inicioSemana), lte(utentes.createdAt, fimSemana)));
  const [noShows] = await db.select({ total: count() }).from(consultas)
    .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), eq(consultas.estado, "no-show")));
  const [realizadas] = await db.select({ total: count() }).from(consultas)
    .where(and(gte(consultas.dataHoraInicio, inicioSemana), lte(consultas.dataHoraInicio, fimSemana), eq(consultas.estado, "realizada")));

  const totalConsultas = cE?.total || 0;
  const totalRealizadas = realizadas?.total || 0;

  // Top pacientes
  const topPacientes = await db
    .select({
      nome: utentes.nome,
      receita: sql<string>`COALESCE(SUM(${faturas.valorTotal}), 0)`,
      totalConsultas: count(),
    })
    .from(faturas)
    .innerJoin(utentes, eq(faturas.utenteId, utentes.id))
    .where(and(gte(faturas.dataEmissao, inicioSemana), lte(faturas.dataEmissao, fimSemana), eq(faturas.estado, "paga")))
    .groupBy(utentes.id, utentes.nome)
    .orderBy(desc(sql`SUM(${faturas.valorTotal})`))
    .limit(5);

  // Health Score
  let healthScore = 0;
  let healthClassificacao = "N/A";
  try {
    const score = await calcularHealthScore();
    healthScore = score.scoreGeral;
    healthClassificacao = score.classificacao;
  } catch {}

  // Recomendações
  const recomendacoes: string[] = [];
  if ((noShows?.total || 0) > 2) recomendacoes.push("Ativar lembretes automáticos por WhatsApp para reduzir no-shows.");
  if (totalConsultas < 20) recomendacoes.push("Agenda com baixa ocupação — considere campanha de reativação.");
  if ((novos?.total || 0) === 0) recomendacoes.push("Nenhum paciente novo esta semana — invista em marketing digital.");

  return {
    periodo: {
      inicio: inicioSemana.toLocaleDateString("pt-PT"),
      fim: fimSemana.toLocaleDateString("pt-PT"),
    },
    kpis: {
      consultas: totalConsultas,
      consultasAnterior: cA?.total || 0,
      receita: Math.round(Number(rE?.total || 0)),
      receitaAnterior: Math.round(Number(rA?.total || 0)),
      novosUtentes: novos?.total || 0,
      noShows: noShows?.total || 0,
      taxaRealizacao: totalConsultas > 0 ? Math.round((totalRealizadas / totalConsultas) * 100) : 0,
    },
    healthScore,
    healthClassificacao,
    topPacientes: topPacientes.map(p => ({
      nome: p.nome,
      receita: Math.round(Number(p.receita)),
      consultas: p.totalConsultas,
    })),
    recomendacoes,
    geradoEm: agora.toISOString(),
  };
}

/**
 * Gera o HTML do digest semanal (para email ou visualização)
 */
export function gerarWeeklyDigestHTML(data: WeeklyDigestData): string {
  const varReceita = data.kpis.receitaAnterior > 0
    ? ((data.kpis.receita - data.kpis.receitaAnterior) / data.kpis.receitaAnterior * 100).toFixed(1)
    : "0";
  const varConsultas = data.kpis.consultasAnterior > 0
    ? ((data.kpis.consultas - data.kpis.consultasAnterior) / data.kpis.consultasAnterior * 100).toFixed(1)
    : "0";

  const scoreColor = data.healthScore >= 80 ? "#10B981" : data.healthScore >= 60 ? "#6366F1" : data.healthScore >= 40 ? "#F59E0B" : "#EF4444";

  return `<!DOCTYPE html>
<html lang="pt">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>DentCare — Resumo Semanal</title></head>
<body style="margin:0;padding:0;background:#0A0A0F;font-family:'Inter',system-ui,sans-serif;color:#D1D1E0;">
<div style="max-width:600px;margin:0 auto;padding:24px;">
  <!-- Header -->
  <div style="text-align:center;padding:32px 0;border-bottom:1px solid rgba(255,255,255,0.08);">
    <h1 style="margin:0;font-size:28px;font-weight:800;background:linear-gradient(135deg,#6366F1,#8B5CF6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;">DentCare</h1>
    <p style="margin:8px 0 0;color:#808090;font-size:14px;">Resumo Semanal · ${data.periodo.inicio} — ${data.periodo.fim}</p>
  </div>

  <!-- Health Score -->
  <div style="text-align:center;padding:24px 0;">
    <p style="color:#808090;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 8px;">Score de Saúde</p>
    <div style="display:inline-block;width:80px;height:80px;border-radius:50%;border:4px solid ${scoreColor};line-height:72px;text-align:center;">
      <span style="font-size:28px;font-weight:900;color:${scoreColor};">${data.healthScore}</span>
    </div>
    <p style="color:${scoreColor};font-size:14px;font-weight:600;margin:8px 0 0;text-transform:capitalize;">${data.healthClassificacao}</p>
  </div>

  <!-- KPIs -->
  <div style="display:flex;flex-wrap:wrap;gap:12px;margin:16px 0;">
    <div style="flex:1;min-width:120px;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
      <p style="color:#808090;font-size:11px;margin:0;">Receita</p>
      <p style="color:#10B981;font-size:24px;font-weight:800;margin:4px 0;">${data.kpis.receita}€</p>
      <p style="color:${Number(varReceita) >= 0 ? '#10B981' : '#EF4444'};font-size:11px;margin:0;">${Number(varReceita) >= 0 ? '↑' : '↓'} ${varReceita}%</p>
    </div>
    <div style="flex:1;min-width:120px;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
      <p style="color:#808090;font-size:11px;margin:0;">Consultas</p>
      <p style="color:#6366F1;font-size:24px;font-weight:800;margin:4px 0;">${data.kpis.consultas}</p>
      <p style="color:${Number(varConsultas) >= 0 ? '#10B981' : '#EF4444'};font-size:11px;margin:0;">${Number(varConsultas) >= 0 ? '↑' : '↓'} ${varConsultas}%</p>
    </div>
    <div style="flex:1;min-width:120px;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
      <p style="color:#808090;font-size:11px;margin:0;">Novos Pacientes</p>
      <p style="color:#8B5CF6;font-size:24px;font-weight:800;margin:4px 0;">${data.kpis.novosUtentes}</p>
      <p style="color:#808090;font-size:11px;margin:0;">esta semana</p>
    </div>
    <div style="flex:1;min-width:120px;background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;">
      <p style="color:#808090;font-size:11px;margin:0;">No-Shows</p>
      <p style="color:${data.kpis.noShows > 2 ? '#EF4444' : '#10B981'};font-size:24px;font-weight:800;margin:4px 0;">${data.kpis.noShows}</p>
      <p style="color:#808090;font-size:11px;margin:0;">Taxa: ${data.kpis.consultas > 0 ? Math.round((data.kpis.noShows / data.kpis.consultas) * 100) : 0}%</p>
    </div>
  </div>

  <!-- Top Pacientes -->
  ${data.topPacientes.length > 0 ? `
  <div style="background:#111118;border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;margin:16px 0;">
    <h3 style="color:#FFFFFF;font-size:14px;margin:0 0 12px;">Top Pacientes da Semana</h3>
    ${data.topPacientes.map((p, i) => `
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);">
      <span style="color:#D1D1E0;font-size:13px;">${i + 1}. ${p.nome}</span>
      <span style="color:#10B981;font-size:13px;font-weight:600;">${p.receita}€</span>
    </div>`).join("")}
  </div>` : ""}

  <!-- Recomendações -->
  ${data.recomendacoes.length > 0 ? `
  <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:12px;padding:16px;margin:16px 0;">
    <h3 style="color:#6366F1;font-size:14px;margin:0 0 12px;">Recomendações</h3>
    ${data.recomendacoes.map(r => `<p style="color:#A1A1B5;font-size:13px;margin:4px 0;">→ ${r}</p>`).join("")}
  </div>` : ""}

  <!-- Footer -->
  <div style="text-align:center;padding:24px 0;border-top:1px solid rgba(255,255,255,0.04);margin-top:16px;">
    <p style="color:#808090;font-size:11px;margin:0;">Gerado automaticamente pelo DentCare V35</p>
    <p style="color:#4A4A5A;font-size:10px;margin:4px 0 0;">${new Date(data.geradoEm).toLocaleString("pt-PT")}</p>
  </div>
</div>
</body>
</html>`;
}
