/**
 * ClinicHealthScoreWidget.tsx — Widget de Score de Saúde da Clínica
 * DentCare V35 — Dashboard Card Premium
 *
 * Funcionalidades:
 * - Gauge circular animado com score 0-100
 * - 5 dimensões com barras de progresso
 * - Indicador de tendência (subindo/descendo/estável)
 * - Recomendações inteligentes
 * - Classificação com cor (Excelente/Bom/Atenção/Crítico)
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Heart, TrendingUp, TrendingDown, Minus, Calendar,
  AlertTriangle, Euro, Users, Smile, ChevronDown,
  ChevronUp, RefreshCw, Sparkles, Activity,
} from "lucide-react";

// ─── Configuração ───────────────────────────────────────────────────────────

const CLASSIFICACAO_CONFIG: Record<string, { cor: string; bgCor: string; emoji: string }> = {
  excelente: { cor: "#10B981", bgCor: "bg-emerald-500/10", emoji: "Excelente" },
  bom: { cor: "#00E5FF", bgCor: "bg-[var(--accent-subtle)]", emoji: "Bom" },
  atencao: { cor: "#F59E0B", bgCor: "bg-amber-500/10", emoji: "Atenção" },
  critico: { cor: "#EF4444", bgCor: "bg-red-500/10", emoji: "Crítico" },
};

const DIMENSAO_ICONS: Record<string, React.ReactNode> = {
  ocupacao: <Calendar className="w-3.5 h-3.5" />,
  noShow: <AlertTriangle className="w-3.5 h-3.5" />,
  receita: <Euro className="w-3.5 h-3.5" />,
  retencao: <Users className="w-3.5 h-3.5" />,
  satisfacao: <Smile className="w-3.5 h-3.5" />,
};

const TENDENCIA_ICONS: Record<string, React.ReactNode> = {
  subindo: <TrendingUp className="w-4 h-4 text-emerald-400" />,
  descendo: <TrendingDown className="w-4 h-4 text-red-400" />,
  estavel: <Minus className="w-4 h-4 text-blue-400" />,
};

// ─── Gauge SVG Circular ─────────────────────────────────────────────────────

function CircularGauge({ score, cor, tamanho = 120 }: { score: number; cor: string; tamanho?: number }) {
  const raio = (tamanho - 16) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const progresso = (score / 100) * circunferencia;
  const centro = tamanho / 2;

  return (
    <div className="relative" style={{ width: tamanho, height: tamanho }}>
      <svg width={tamanho} height={tamanho} className="transform -rotate-90">
        {/* Fundo */}
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke="var(--border-lighter)"
          strokeWidth="8"
        />
        {/* Progresso */}
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia - progresso}
          className="transition-all duration-1000 ease-out"
        />
        {/* Glow */}
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={circunferencia - progresso}
          opacity="0.3"
          filter="blur(4px)"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      {/* Score central */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-black" style={{ color: cor }}>
          {score}
        </span>
        <span className="text-[10px] text-[var(--text-muted)] font-medium">/ 100</span>
      </div>
    </div>
  );
}

// ─── Barra de Progresso ─────────────────────────────────────────────────────

function ProgressBar({ valor, cor }: { valor: number; cor: string }) {
  return (
    <div className="w-full h-1.5 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${Math.min(100, valor)}%`, backgroundColor: cor }}
      />
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────

export function ClinicHealthScoreWidget() {
  const [expandido, setExpandido] = useState(false);

  const { data, isLoading, refetch, isFetching } = trpc.healthScore.obterScore.useQuery(
    undefined,
    { refetchInterval: 300000 } // 5 minutos
  );

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6 animate-pulse">
        <div className="flex items-center gap-4">
          <div className="w-[120px] h-[120px] rounded-full bg-[var(--bg-elevated)]" />
          <div className="space-y-3 flex-1">
            <div className="h-5 w-40 rounded bg-[var(--bg-elevated)]" />
            <div className="h-3 w-28 rounded bg-[var(--bg-elevated)]" />
            <div className="h-3 w-full rounded bg-[var(--bg-elevated)]" />
          </div>
        </div>
      </div>
    );
  }

  if (!data || !data.success) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-6">
        <div className="flex items-center gap-2 text-[var(--text-muted)]">
          <Heart className="w-4 h-4" />
          <span className="text-sm">Score de saúde indisponível</span>
        </div>
      </div>
    );
  }

  const classificacao = CLASSIFICACAO_CONFIG[data.classificacao] || CLASSIFICACAO_CONFIG.bom;
  const dimensoes = data.dimensoes;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
              <Heart className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Score de Saúde</h3>
              <p className="text-[10px] text-[var(--text-muted)]">Avaliação composta do negócio</p>
            </div>
          </div>
          <button
            onClick={() => refetch()}
            className={`p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors ${
              isFetching ? "animate-spin" : ""
            }`}
            title="Atualizar"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Score Principal */}
      <div className="flex items-center gap-5 px-5 pb-4">
        <CircularGauge score={data.scoreGeral} cor={classificacao.cor} />

        <div className="flex-1 space-y-3">
          {/* Classificação */}
          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-1 text-xs font-bold rounded-lg ${classificacao.bgCor}`}
              style={{ color: classificacao.cor }}
            >
              {classificacao.emoji}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              {TENDENCIA_ICONS[data.tendencia]}
              {data.tendencia === "subindo" ? "A melhorar" : data.tendencia === "descendo" ? "A piorar" : "Estável"}
            </span>
          </div>

          {/* Mini barras das dimensões */}
          {Object.entries(dimensoes).slice(0, 3).map(([key, dim]: [string, any]) => (
            <div key={key} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                  {DIMENSAO_ICONS[key]}
                  {dim.label}
                </span>
                <span className="text-[10px] font-semibold text-[var(--text-secondary)]">{dim.score}%</span>
              </div>
              <ProgressBar valor={dim.score} cor={dim.score >= 70 ? "#10B981" : dim.score >= 40 ? "#F59E0B" : "#EF4444"} />
            </div>
          ))}
        </div>
      </div>

      {/* Expandir para ver tudo */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)] transition-colors border-t border-[var(--border-lightest)]"
      >
        {expandido ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" /> Menos detalhes
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" /> Ver detalhes e recomendações
          </>
        )}
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-lightest)]">
          {/* Todas as dimensões */}
          <div className="pt-4 space-y-3">
            <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5" style={{ color: '#00E5FF' }} />
              Dimensões
            </h4>
            {Object.entries(dimensoes).map(([key, dim]: [string, any]) => (
              <div key={key} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center shrink-0">
                  <span className="text-[var(--text-muted)]">{DIMENSAO_ICONS[key]}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-[var(--text-secondary)]">{dim.label}</span>
                    <span className="text-xs font-bold" style={{
                      color: dim.score >= 70 ? "#10B981" : dim.score >= 40 ? "#F59E0B" : "#EF4444"
                    }}>
                      {dim.score}%
                    </span>
                  </div>
                  <ProgressBar valor={dim.score} cor={dim.score >= 70 ? "#10B981" : dim.score >= 40 ? "#F59E0B" : "#EF4444"} />
                </div>
              </div>
            ))}
          </div>

          {/* Recomendações */}
          {data.recomendacoes && data.recomendacoes.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Recomendações
              </h4>
              {data.recomendacoes.map((rec: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border ${
                    rec.impacto === "alto"
                      ? "bg-amber-500/5 border-amber-500/15"
                      : rec.impacto === "medio"
                      ? "bg-blue-500/5 border-blue-500/15"
                      : "bg-gray-500/5 border-gray-500/15"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold uppercase tracking-wider ${
                      rec.impacto === "alto" ? "text-amber-400" : rec.impacto === "medio" ? "text-blue-400" : "text-gray-400"
                    }`}>
                      {rec.area} — Impacto {rec.impacto}
                    </span>
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                    {rec.sugestao}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
