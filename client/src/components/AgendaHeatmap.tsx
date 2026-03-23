/**
 * AgendaHeatmap.tsx — Heatmap de Ocupação da Agenda
 * DentCare V35 — Visualização de Padrões de Ocupação
 *
 * Funcionalidades:
 * - Heatmap SVG 7x12 (dias x faixas horárias)
 * - Cores por intensidade de ocupação
 * - Tooltip com detalhes ao hover
 * - Legenda de cores
 * - Sem dependências externas (SVG puro)
 */

import { useState, useMemo } from "react";
import { Calendar } from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface HeatmapData {
  dia: number; // 0-6 (Dom-Sáb)
  hora: number; // 8-19
  valor: number; // número de consultas
}

interface AgendaHeatmapProps {
  dados: HeatmapData[];
  titulo?: string;
}

// ─── Configuração ───────────────────────────────────────────────────────────

const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const HORAS = Array.from({ length: 12 }, (_, i) => i + 8); // 08:00 - 19:00

const CORES = [
  "var(--bg-elevated)",   // 0 consultas
  "#00E5FF",              // 1
  "#00E5FF",              // 2
  "#00E5FF",              // 3
  "#B388FF",              // 4
  "#B388FF",              // 5+
];

function getColor(valor: number): string {
  if (valor === 0) return CORES[0];
  if (valor === 1) return CORES[1];
  if (valor === 2) return CORES[2];
  if (valor === 3) return CORES[3];
  if (valor === 4) return CORES[4];
  return CORES[5];
}

// ─── Componente Principal ───────────────────────────────────────────────────

export function AgendaHeatmap({ dados, titulo = "Mapa de Ocupação" }: AgendaHeatmapProps) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; dia: string; hora: string; valor: number } | null>(null);

  // Criar mapa de dados
  const mapa = useMemo(() => {
    const m = new Map<string, number>();
    dados.forEach(d => m.set(`${d.dia}-${d.hora}`, d.valor));
    return m;
  }, [dados]);

  // Calcular máximo para escala
  const maxValor = useMemo(() => Math.max(1, ...dados.map(d => d.valor)), [dados]);

  const cellSize = 28;
  const cellGap = 3;
  const labelWidth = 40;
  const labelHeight = 24;
  const svgWidth = labelWidth + (cellSize + cellGap) * HORAS.length;
  const svgHeight = labelHeight + (cellSize + cellGap) * DIAS.length;

  if (dados.length === 0) {
    return (
      <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5FF]/20 to-[#B388FF]/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{titulo}</h3>
            <p className="text-[10px] text-[var(--text-muted)]">Consultas por dia e hora</p>
          </div>
        </div>
        <p className="text-[var(--text-muted)] text-sm text-center py-6">
          Sem dados de consultas para apresentar
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5FF]/20 to-[#B388FF]/20 flex items-center justify-center">
            <Calendar className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">{titulo}</h3>
            <p className="text-[10px] text-[var(--text-muted)]">Consultas por dia e hora</p>
          </div>
        </div>
      </div>

      {/* Heatmap SVG */}
      <div className="relative overflow-x-auto">
        <svg width={svgWidth} height={svgHeight} className="block">
          {/* Labels das horas (topo) */}
          {HORAS.map((hora, hi) => (
            <text
              key={`h-${hora}`}
              x={labelWidth + hi * (cellSize + cellGap) + cellSize / 2}
              y={14}
              textAnchor="middle"
              className="fill-[var(--text-muted)]"
              fontSize="9"
              fontWeight="500"
            >
              {hora}h
            </text>
          ))}

          {/* Labels dos dias (esquerda) + células */}
          {DIAS.map((dia, di) => (
            <g key={`d-${di}`}>
              <text
                x={0}
                y={labelHeight + di * (cellSize + cellGap) + cellSize / 2 + 4}
                className="fill-[var(--text-muted)]"
                fontSize="10"
                fontWeight="500"
              >
                {dia}
              </text>

              {HORAS.map((hora, hi) => {
                const valor = mapa.get(`${di}-${hora}`) || 0;
                const x = labelWidth + hi * (cellSize + cellGap);
                const y = labelHeight + di * (cellSize + cellGap);

                return (
                  <g key={`c-${di}-${hora}`}>
                    <rect
                      x={x}
                      y={y}
                      width={cellSize}
                      height={cellSize}
                      rx={6}
                      fill={getColor(valor)}
                      opacity={valor === 0 ? 0.4 : 0.8 + (valor / maxValor) * 0.2}
                      className="cursor-pointer transition-opacity duration-150 hover:opacity-100"
                      onMouseEnter={(e) => {
                        const rect = (e.target as SVGRectElement).getBoundingClientRect();
                        setTooltip({
                          x: rect.left + rect.width / 2,
                          y: rect.top - 8,
                          dia,
                          hora: `${hora}:00`,
                          valor,
                        });
                      }}
                      onMouseLeave={() => setTooltip(null)}
                    />
                    {valor > 0 && (
                      <text
                        x={x + cellSize / 2}
                        y={y + cellSize / 2 + 4}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="700"
                        className="pointer-events-none"
                      >
                        {valor}
                      </text>
                    )}
                  </g>
                );
              })}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div
            className="fixed z-50 px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg shadow-lg pointer-events-none"
            style={{
              left: tooltip.x,
              top: tooltip.y,
              transform: "translate(-50%, -100%)",
            }}
          >
            <p className="text-xs font-semibold text-[var(--text-primary)]">
              {tooltip.dia} às {tooltip.hora}
            </p>
            <p className="text-[10px] text-[var(--text-muted)]">
              {tooltip.valor} consulta{tooltip.valor !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-2 mt-4">
        <span className="text-[10px] text-[var(--text-muted)]">Menos</span>
        {CORES.map((cor, i) => (
          <div
            key={i}
            className="w-4 h-4 rounded"
            style={{ backgroundColor: cor, opacity: i === 0 ? 0.4 : 0.8 }}
          />
        ))}
        <span className="text-[10px] text-[var(--text-muted)]">Mais</span>
      </div>
    </div>
  );
}
