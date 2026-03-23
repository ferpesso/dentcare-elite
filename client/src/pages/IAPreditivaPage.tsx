/**
 * IAPreditivaPage.tsx — IA Preditiva e Analytics Avançados
 * DentCare Elite V35 — Módulo de Inteligência Artificial Real
 * UPGRADE V35: Moeda dinâmica via ConfigContext (useConfig)
 * 
 * CORRIGIDO: Removidos dados MOCK/INSIGHTS_BASE. Agora utiliza exclusivamente 
 * os dados retornados pelo router iaPreditiva.obterPrevisoes (dados reais da BD).
 */
import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import { useLocation } from "wouter";
import {
  Brain, Calendar, Euro, Users, Target,
  AlertTriangle, CheckCircle, BarChart2, Lightbulb,
  Activity, Sparkles, Loader2, TrendingUp
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Periodo = "semana" | "mes" | "trimestre";
type TipoInsight = "positivo" | "negativo" | "neutro" | "alerta";

const INSIGHT_CORES: Record<TipoInsight, {
  bg: string; border: string; iconCor: string; tituloCor: string; icon: React.ComponentType<any>;
}> = {
  positivo: { bg: "bg-emerald-500/5",  border: "border-emerald-500/20", iconCor: "text-emerald-400", tituloCor: "text-emerald-300", icon: CheckCircle },
  negativo: { bg: "bg-red-500/5",      border: "border-red-500/20",     iconCor: "text-red-400",     tituloCor: "text-red-300",     icon: AlertTriangle },
  neutro:   { bg: "bg-[#00E5FF]/5",   border: "border-[#00E5FF]/20",  iconCor: "text-[#00E5FF]",  tituloCor: "text-[#00E5FF]",  icon: Lightbulb },
  alerta:   { bg: "bg-amber-500/5",    border: "border-amber-500/20",   iconCor: "text-amber-400",   tituloCor: "text-amber-300",   icon: AlertTriangle },
};

// ─── Componente Principal ──────────────────────────────────────────────────────
const MODULO_ROTAS: Record<string, string> = {
  Agenda: "/agenda",
  Marketing: "/marketing",
  Stocks: "/stocks",
  Financeiro: "/financeiro",
  Utentes: "/utentes",
  Faturação: "/faturacao",
};

export function IAPreditivaPage() {
  const { formatMoeda, simboloMoeda } = useConfig();
  const [, navigate] = useLocation();
  const [periodo, setPeriodo] = useState<Periodo>("mes");
  const [tab, setTab] = useState<"previsoes" | "tendencias" | "insights">("previsoes");

  // Integração com dados REAIS da Base de Dados via tRPC
  const previsoesQ = trpc.iaPreditiva.obterPrevisoes.useQuery({ periodo });
  const data = previsoesQ.data?.previsoes;
  const graficos = previsoesQ.data?.graficos;
  const insights = previsoesQ.data?.insights || [];

  if (previsoesQ.isLoading) {
    return (
      <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-10 h-10 text-[#00E5FF] animate-spin" />
        <p className="text-[var(--text-secondary)] font-medium">A IA está a processar os dados reais da clínica...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shadow-lg shadow-[#00E5FF]/5">
            <Brain className="w-8 h-8 text-[#00E5FF]" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-2">
              IA Preditiva
              <span className="px-2 py-0.5 rounded-md bg-[#00E5FF] text-[8px] font-black uppercase tracking-widest">Elite V35</span>
            </h1>
            <p className="text-[var(--text-secondary)] text-sm">Análise inteligente e previsões baseadas em dados reais.</p>
          </div>
        </div>

        <div className="flex items-center gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
          {["semana", "mes", "trimestre"].map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p as Periodo)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                periodo === p ? "bg-[#00E5FF] text-white shadow-lg shadow-[#00E5FF]/20" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* KPIs Preditivos - Baseados em dados REAIS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Receita Prevista", valor: formatMoeda(data?.receitaPrevista || 0), icon: Euro, color: "text-emerald-400", bg: "bg-emerald-500/10" },
          { label: "Consultas Previstas", valor: data?.consultasPrevistas || 0, icon: Calendar, color: "text-[#00E5FF]", bg: "bg-[#00E5FF]/10" },
          { label: "Novos Utentes", valor: data?.novosUtentesPrevistos || 0, icon: Users, color: "text-violet-400", bg: "bg-violet-500/10" },
          { label: "Ocupação Média", valor: `${data?.ocupacaoPrevista || 0}%`, icon: Activity, color: "text-amber-400", bg: "bg-amber-500/10" },
        ].map((kpi, i) => (
          <div key={i} className="card-premium p-6 border border-[var(--border-lighter)] hover:border-white/[0.12] transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`w-10 h-10 rounded-xl ${kpi.bg} ${kpi.color} flex items-center justify-center`}>
                <kpi.icon className="w-5 h-5" />
              </div>
              <Sparkles className="w-4 h-4 text-[var(--text-primary)]/5 group-hover:text-[#00E5FF]/30 transition-colors" />
            </div>
            <p className="text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest mb-1">{kpi.label}</p>
            <p className="text-2xl font-black text-[var(--text-primary)]">{kpi.valor}</p>
          </div>
        ))}
      </div>

      {/* Tabs de Detalhe */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl w-fit">
        <button onClick={() => setTab("previsoes")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "previsoes" ? "bg-[#00E5FF] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>Previsões</button>
        <button onClick={() => setTab("tendencias")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "tendencias" ? "bg-[#00E5FF] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>Tendências</button>
        <button onClick={() => setTab("insights")} className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "insights" ? "bg-[#00E5FF] text-white" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"}`}>Insights IA</button>
      </div>

      {tab === "previsoes" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="card-premium p-8 border border-[var(--border-lighter)]">
            <h3 className="text-[var(--text-primary)] font-black text-sm mb-8 uppercase tracking-widest flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#00E5FF]" />
              Ocupação por Dia da Semana
            </h3>
            <div className="space-y-6">
              {graficos?.ocupacaoDia?.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs italic text-center py-8">Sem dados de ocupação suficientes.</p>
              ) : (
                graficos?.ocupacaoDia?.map((d: any) => (
                  <div key={d.dia} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-[var(--text-primary)]">{d.dia}</span>
                      <span className="text-[#00E5FF]">{d.pct}%</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                      <div className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_10px_#00E5FF80] transition-all duration-1000" style={{ width: `${d.pct}%` }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card-premium p-8 border border-[var(--border-lighter)] bg-[#00E5FF]/[0.02]">
            <h3 className="text-[var(--text-primary)] font-black text-sm mb-8 uppercase tracking-widest flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00E5FF]" />
              Metas & Recomendações Reais
            </h3>
            <div className="space-y-4">
              {insights.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center opacity-40">
                  <CheckCircle className="w-8 h-8 mb-2 text-emerald-500" />
                  <p className="text-xs text-[var(--text-primary)] font-bold uppercase tracking-widest">Tudo em conformidade</p>
                  <p className="text-[var(--text-muted)] text-[10px]">A IA não detetou anomalias críticas nos dados atuais.</p>
                </div>
              ) : (
                insights.map((insight: any, i: number) => {
                  const config = INSIGHT_CORES[insight.tipo as TipoInsight] || INSIGHT_CORES.neutro;
                  return (
                    <div key={i} className={`p-4 rounded-2xl border ${config.border} ${config.bg} flex gap-4 animate-in fade-in duration-300`}>
                      <div className={`w-10 h-10 rounded-xl bg-[var(--bg-overlay)] flex items-center justify-center shrink-0 ${config.iconCor}`}>
                        <config.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`font-black text-[10px] uppercase tracking-widest ${config.tituloCor}`}>{insight.titulo}</h4>
                          <span className="text-[8px] px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[var(--text-tertiary)] font-bold">{insight.modulo}</span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs leading-relaxed">{insight.descricao}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "insights" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {insights.length === 0 ? (
            <div className="col-span-full py-20 text-center card-premium border-dashed border-[var(--border-light)]">
              <Sparkles className="w-10 h-10 mx-auto mb-4 text-[#00E5FF]/40" />
              <p className="text-[var(--text-primary)] font-black text-sm uppercase tracking-widest">IA a aguardar dados</p>
              <p className="text-[var(--text-muted)] text-xs">Os insights automáticos serão gerados assim que houver histórico de consultas e faturas.</p>
            </div>
          ) : (
            insights.map((insight: any, i: number) => {
              const config = INSIGHT_CORES[insight.tipo as TipoInsight] || INSIGHT_CORES.neutro;
              return (
                <div key={i} className={`card-premium p-6 border ${config.border} ${config.bg} group hover:scale-[1.02] transition-all`}>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[9px] font-black uppercase tracking-widest text-[var(--text-primary)]/40">{insight.modulo}</span>
                    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${
                      insight.impacto === 'alto' ? 'bg-red-500/20 border-red-500/30 text-red-400' : 'bg-[#00E5FF]/20 border-[#00E5FF]/30 text-[#00E5FF]'
                    }`}>Impacto {insight.impacto}</span>
                  </div>
                  <h4 className="text-[var(--text-primary)] font-bold mb-2 group-hover:text-[#00E5FF] transition-colors">{insight.titulo}</h4>
                  <p className="text-[var(--text-secondary)] text-xs mb-6 leading-relaxed">{insight.descricao}</p>
                  <button
                    className="w-full py-2 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] text-[10px] font-black uppercase tracking-widest transition-all"
                    onClick={() => { const rota = MODULO_ROTAS[insight.modulo]; if (rota) navigate(rota); }}
                  >
                    {insight.acao || `Ver ${insight.modulo}`}
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {tab === "tendencias" && (
        <div className="card-premium p-8 border border-[var(--border-lighter)] animate-in fade-in duration-500">
          <h3 className="text-[var(--text-primary)] font-black text-sm mb-8 uppercase tracking-widest flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
            Tendências de Faturação (Últimos 12 Meses)
          </h3>
          {/* Placeholder para gráfico de tendências */}
          <div className="h-64 bg-[var(--bg-overlay)] rounded-2xl flex items-center justify-center">
            <p className="text-[var(--text-muted)] text-xs">Gráfico de tendências em desenvolvimento.</p>
          </div>
        </div>
      )}
    </div>
  );
}
