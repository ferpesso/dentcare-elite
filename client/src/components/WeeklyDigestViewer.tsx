/**
 * WeeklyDigestViewer.tsx — Visualizador de Resumo Semanal
 * DentCare V35 — Resumo Semanal Interativo
 *
 * Funcionalidades:
 * - Visualização inline do digest semanal
 * - KPIs com comparação visual
 * - Botão para abrir versão HTML completa
 * - Integração com o router healthScore
 */

import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  FileText, Calendar, Euro, Users, AlertTriangle,
  TrendingUp, TrendingDown, Minus, ExternalLink,
  ChevronDown, ChevronUp, Sparkles, BarChart3,
} from "lucide-react";

// ─── KPI Card Inline ────────────────────────────────────────────────────────

function KPICard({ label, valor, variacao, icone, cor }: {
  label: string;
  valor: string | number;
  variacao?: string;
  icone: React.ReactNode;
  cor: string;
}) {
  const varNum = variacao ? parseFloat(variacao) : 0;
  const varCor = varNum > 0 ? "text-emerald-400" : varNum < 0 ? "text-red-400" : "text-gray-400";
  const varIcon = varNum > 0 ? <TrendingUp className="w-3 h-3" /> : varNum < 0 ? <TrendingDown className="w-3 h-3" /> : <Minus className="w-3 h-3" />;

  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-lighter)] rounded-xl p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0`} style={{ backgroundColor: `${cor}15` }}>
        <span style={{ color: cor }}>{icone}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[var(--text-primary)]">{valor}</span>
          {variacao && (
            <span className={`flex items-center gap-0.5 text-[10px] font-medium ${varCor}`}>
              {varIcon} {variacao}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────

export function WeeklyDigestViewer() {
  const [expandido, setExpandido] = useState(false);
  const [mostrarHTML, setMostrarHTML] = useState(false);

  const { data, isLoading } = trpc.healthScore.obterWeeklyDigest.useQuery(undefined, {
    refetchInterval: 600000, // 10 minutos
  });

  if (isLoading) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5 animate-pulse">
        <div className="h-5 w-40 rounded bg-[var(--bg-elevated)] mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-16 rounded-xl bg-[var(--bg-elevated)]" />
          ))}
        </div>
      </div>
    );
  }

  if (!data?.success || !data.data) {
    return null;
  }

  const digest = data.data;
  const kpis = digest.kpis;

  const calcVar = (a: number, b: number) =>
    b > 0 ? ((a - b) / b * 100).toFixed(1) : "0";

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--accent-subtle)] to-[var(--accent-subtle-violet)] flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Resumo Semanal</h3>
              <p className="text-[10px] text-[var(--text-muted)]">{digest.periodo.inicio} — {digest.periodo.fim}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full" style={{ color: '#00E5FF', background: 'rgba(0,229,255,0.10)', border: '1px solid rgba(0,229,255,0.20)' }}>
            V35
          </span>
        </div>
      </div>

      {/* KPIs Grid */}
      <div className="px-5 pb-3 grid grid-cols-2 gap-2.5">
        <KPICard
          label="Receita"
          valor={`${kpis.receita}€`}
          variacao={calcVar(kpis.receita, kpis.receitaAnterior)}
          icone={<Euro className="w-4 h-4" />}
          cor="#10B981"
        />
        <KPICard
          label="Consultas"
          valor={kpis.consultas}
          variacao={calcVar(kpis.consultas, kpis.consultasAnterior)}
          icone={<Calendar className="w-4 h-4" />}
          cor="#00E5FF"
        />
        <KPICard
          label="Novos Pacientes"
          valor={kpis.novosUtentes}
          icone={<Users className="w-4 h-4" />}
          cor="#B388FF"
        />
        <KPICard
          label="No-Shows"
          valor={kpis.noShows}
          icone={<AlertTriangle className="w-4 h-4" />}
          cor={kpis.noShows > 2 ? "#EF4444" : "#10B981"}
        />
      </div>

      {/* Taxa de Realização */}
      <div className="mx-5 mb-3 p-3 bg-[var(--bg-elevated)] border border-[var(--border-lighter)] rounded-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">Taxa de Realização</span>
          <span className="text-xs font-bold text-[var(--text-primary)]">{kpis.taxaRealizacao}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-[var(--bg-subtle)] overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${kpis.taxaRealizacao}%`, background: 'linear-gradient(90deg, #00E5FF, #B388FF)' }}
          />
        </div>
      </div>

      {/* Expandir */}
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-subtle)] transition-colors border-t border-[var(--border-lightest)]"
      >
        {expandido ? (
          <><ChevronUp className="w-3.5 h-3.5" /> Menos detalhes</>
        ) : (
          <><ChevronDown className="w-3.5 h-3.5" /> Top pacientes e recomendações</>
        )}
      </button>

      {/* Detalhes expandidos */}
      {expandido && (
        <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-lightest)]">
          {/* Top Pacientes */}
          {digest.topPacientes && digest.topPacientes.length > 0 && (
            <div className="pt-3">
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                <BarChart3 className="w-3.5 h-3.5" style={{ color: '#00E5FF' }} />
                Top Pacientes da Semana
              </h4>
              <div className="space-y-1.5">
                {digest.topPacientes.map((p: any, i: number) => (
                  <div key={i} className="flex items-center justify-between py-1.5 px-3 bg-[var(--bg-elevated)] rounded-lg">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center" style={{ background: 'rgba(0,229,255,0.12)', color: '#00E5FF' }}>
                        {i + 1}
                      </span>
                      <span className="text-xs text-[var(--text-secondary)]">{p.nome}</span>
                    </div>
                    <span className="text-xs font-bold text-emerald-400">{p.receita}€</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recomendações */}
          {digest.recomendacoes && digest.recomendacoes.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5 mb-2">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                Recomendações para a Próxima Semana
              </h4>
              {digest.recomendacoes.map((r: string, i: number) => (
                <div key={i} className="flex items-start gap-2 py-1.5">
                  <span className="text-xs mt-0.5" style={{ color: '#00E5FF' }}>→</span>
                  <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{r}</p>
                </div>
              ))}
            </div>
          )}

          {/* Botão para ver HTML completo */}
          {data.html && (
            <button
              onClick={() => setMostrarHTML(!mostrarHTML)}
              className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-medium rounded-xl transition-colors"
              style={{ color: '#00E5FF', background: 'rgba(0,229,255,0.10)' }}
            >
              <ExternalLink className="w-3.5 h-3.5" />
              {mostrarHTML ? "Fechar versão email" : "Ver versão email"}
            </button>
          )}

          {/* Preview HTML */}
          {mostrarHTML && data.html && (
            <div className="mt-3 rounded-xl overflow-hidden border border-[var(--border-lighter)]">
              <iframe
                srcDoc={data.html}
                className="w-full h-[500px] bg-[#0A0A0F]"
                title="Weekly Digest Preview"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
