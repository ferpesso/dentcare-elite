/**
 * PatientFunnelChart.tsx — Funil de Conversão de Pacientes
 * DentCare V35 — Visualização de Funil SVG
 *
 * Funcionalidades:
 * - Funil visual com 4 etapas: Novo → Consulta → Tratamento → Fidelizado
 * - Taxas de conversão entre etapas
 * - Cores gradiente por etapa
 * - Animação de entrada
 * - Sem dependências externas (SVG puro)
 */

import { useMemo } from "react";
import { Users, Calendar, Stethoscope, Heart } from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface FunnelStage {
  label: string;
  valor: number;
  cor: string;
  corClara: string;
  icone: React.ReactNode;
}

interface PatientFunnelChartProps {
  novos: number;
  comConsulta: number;
  emTratamento: number;
  fidelizados: number;
}

// ─── Componente Principal ───────────────────────────────────────────────────

export function PatientFunnelChart({ novos, comConsulta, emTratamento, fidelizados }: PatientFunnelChartProps) {
  const etapas: FunnelStage[] = useMemo(() => [
    { label: "Novos Registos", valor: novos, cor: "#00E5FF", corClara: "#818CF8", icone: <Users className="w-4 h-4" /> },
    { label: "Com Consulta", valor: comConsulta, cor: "#3B82F6", corClara: "#60A5FA", icone: <Calendar className="w-4 h-4" /> },
    { label: "Em Tratamento", valor: emTratamento, cor: "#8B5CF6", corClara: "#A78BFA", icone: <Stethoscope className="w-4 h-4" /> },
    { label: "Fidelizados", valor: fidelizados, cor: "#10B981", corClara: "#34D399", icone: <Heart className="w-4 h-4" /> },
  ], [novos, comConsulta, emTratamento, fidelizados]);

  const maxValor = Math.max(1, ...etapas.map(e => e.valor));

  // Calcular taxas de conversão
  const taxas = etapas.slice(1).map((etapa, i) => {
    const anterior = etapas[i].valor;
    return anterior > 0 ? Math.round((etapa.valor / anterior) * 100) : 0;
  });

  const barHeight = 48;
  const barGap = 8;
  const maxWidth = 320;
  const svgHeight = (barHeight + barGap) * etapas.length + 20;

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500/20 to-[#B388FF]/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Funil de Conversão</h3>
          <p className="text-[10px] text-[var(--text-muted)]">Jornada do paciente na clínica</p>
        </div>
      </div>

      {/* Funil */}
      <div className="space-y-1">
        {etapas.map((etapa, i) => {
          const largura = maxValor > 0 ? Math.max(30, (etapa.valor / maxValor) * 100) : 30;
          const taxa = i > 0 ? taxas[i - 1] : null;

          return (
            <div key={etapa.label}>
              {/* Indicador de conversão */}
              {taxa !== null && (
                <div className="flex items-center justify-center py-1">
                  <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--bg-elevated)] rounded-full">
                    <svg width="8" height="8" viewBox="0 0 8 8" className="text-[var(--text-muted)]">
                      <path d="M4 0 L4 6 L2 4 M4 6 L6 4" stroke="currentColor" fill="none" strokeWidth="1.2" />
                    </svg>
                    <span className={`text-[10px] font-bold ${
                      taxa >= 70 ? "text-emerald-400" : taxa >= 40 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {taxa}%
                    </span>
                  </div>
                </div>
              )}

              {/* Barra do funil */}
              <div className="flex items-center gap-3">
                <div
                  className="flex items-center gap-2 py-2.5 px-3 rounded-xl transition-all duration-700 ease-out"
                  style={{
                    width: `${largura}%`,
                    background: `linear-gradient(135deg, ${etapa.cor}20, ${etapa.corClara}10)`,
                    border: `1px solid ${etapa.cor}30`,
                    minWidth: "140px",
                  }}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${etapa.cor}20` }}
                  >
                    <span style={{ color: etapa.cor }}>{etapa.icone}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{etapa.label}</p>
                    <p className="text-lg font-black" style={{ color: etapa.cor }}>{etapa.valor}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="mt-4 pt-3 border-t border-[var(--border-lightest)] flex items-center justify-between">
        <span className="text-[10px] text-[var(--text-muted)]">
          Taxa de conversão total
        </span>
        <span className={`text-sm font-bold ${
          novos > 0 && (fidelizados / novos) >= 0.3 ? "text-emerald-400" :
          novos > 0 && (fidelizados / novos) >= 0.15 ? "text-amber-400" : "text-red-400"
        }`}>
          {novos > 0 ? Math.round((fidelizados / novos) * 100) : 0}%
        </span>
      </div>
    </div>
  );
}
