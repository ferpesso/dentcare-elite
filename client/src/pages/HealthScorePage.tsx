/**
 * HealthScorePage.tsx — Página de Score de Saúde da Clínica
 * DentCare V35.6 — Dashboard Analítico com Dados Reais
 *
 * UPGRADE V35.6:
 * - Removidos todos os dados MOCK/exemplo
 * - Heatmap alimentado por endpoint real (últimos 90 dias de consultas)
 * - Funil alimentado por endpoint real (contagens reais da BD)
 * - Estado vazio apresentado quando não há dados
 */

import { ClinicHealthScoreWidget } from "../components/ClinicHealthScoreWidget";
import { WeeklyDigestViewer } from "../components/WeeklyDigestViewer";
import { AgendaHeatmap } from "../components/AgendaHeatmap";
import { PatientFunnelChart } from "../components/PatientFunnelChart";
import { trpc } from "../lib/trpc";
import { Heart, Activity, Calendar, Sparkles, TrendingUp, Loader2 } from "lucide-react";

export function HealthScorePage() {
  // Dados reais via tRPC
  const heatmapQuery = trpc.healthScore.obterHeatmap.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
  const funilQuery = trpc.healthScore.obterFunil.useQuery(undefined, {
    staleTime: 5 * 60 * 1000,
  });

  const heatmapDados = heatmapQuery.data?.dados ?? [];
  const funnelNovos = funilQuery.data?.novos ?? 0;
  const funnelConsulta = funilQuery.data?.comConsulta ?? 0;
  const funnelTratamento = funilQuery.data?.emTratamento ?? 0;
  const funnelFidelizados = funilQuery.data?.fidelizados ?? 0;

  return (
    <div className="space-y-6">
      {/* Header da Página */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
              <Heart className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">Score de Saúde da Clínica</h1>
              <p className="text-sm text-[var(--text-muted)]">
                Avaliação composta do negócio em 5 dimensões — atualizado em tempo real
              </p>
            </div>
          </div>
        </div>
        <span className="px-3 py-1.5 text-xs font-bold text-[#00E5FF] bg-[#00E5FF]/10 rounded-full border border-[#00E5FF]/20">
          V35
        </span>
      </div>

      {/* Grid Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna Esquerda */}
        <div className="space-y-6">
          {/* Score de Saúde */}
          <ClinicHealthScoreWidget />

          {/* Funil de Conversão */}
          {funilQuery.isLoading ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#00E5FF] animate-spin mr-2" />
              <span className="text-[var(--text-muted)] text-sm">A carregar funil...</span>
            </div>
          ) : (
            <PatientFunnelChart
              novos={funnelNovos}
              comConsulta={funnelConsulta}
              emTratamento={funnelTratamento}
              fidelizados={funnelFidelizados}
            />
          )}
        </div>

        {/* Coluna Direita */}
        <div className="space-y-6">
          {/* Resumo Semanal */}
          <WeeklyDigestViewer />

          {/* Heatmap de Ocupação */}
          {heatmapQuery.isLoading ? (
            <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[#00E5FF] animate-spin mr-2" />
              <span className="text-[var(--text-muted)] text-sm">A carregar mapa de ocupação...</span>
            </div>
          ) : (
            <AgendaHeatmap
              dados={heatmapDados}
              titulo="Mapa de Ocupação da Agenda"
            />
          )}
        </div>
      </div>

      {/* Dicas V35 */}
      <div className="bg-gradient-to-r from-[#00E5FF]/5 to-[#B388FF]/5 border border-[#00E5FF]/10 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Novidades V35</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-start gap-2">
            <Activity className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Score de Saúde</p>
              <p className="text-[11px] text-[var(--text-muted)]">Avaliação automática de 5 dimensões com recomendações inteligentes.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <TrendingUp className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">6 Novas MCP Tools</p>
              <p className="text-[11px] text-[var(--text-muted)]">Analytics avançado e automação inteligente via Assistente IA.</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-violet-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-[var(--text-primary)]">Ctrl+K Command Bar</p>
              <p className="text-[11px] text-[var(--text-muted)]">Pesquisa universal e ações rápidas com atalhos de teclado.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
