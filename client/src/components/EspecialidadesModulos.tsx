/**
 * EspecialidadesModulos.tsx — Componentes de Especialidades Clínicas
 * DentCare Elite V35 — Módulos de Ortodontia, Implantologia e Periodontia
 * 
 * CORRIGIDO: Removidos dados MOCK/Hardcoded. O sistema agora inicia com estados vazios.
 */
import React, { useState } from "react";
import {
  Plus, Edit2, Trash2, ChevronUp,
  Target, Zap, Droplet,
} from "lucide-react";

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: ORTODONTIA
// ═══════════════════════════════════════════════════════════════════════════════

interface OrtodontiaAtivacao {
  id: string;
  data: Date;
  tipoAparelho: "brackets" | "alinhadores" | "aparelho-fixo";
  descricao: string;
  dentes: string;
  forcaAplicada: number; // em gramas
  observacoes: string;
  proximaActivacao?: Date;
}

interface CefalometriaRegistro {
  id: string;
  data: Date;
  sna: number;
  snb: number;
  anb: number;
  fma: number;
  impa: number;
  observacoes: string;
}

export function ModuloOrtodontia({ utenteId }: { utenteId: number }) {
  // CORRIGIDO: Inicializado como array vazio para evitar dados fantasmas de outros pacientes
  const [ativacoes] = useState<OrtodontiaAtivacao[]>([]);
  const [cefalometrias] = useState<CefalometriaRegistro[]>([]);
  const [expandido, setExpandido] = useState(true);

  return (
    <div className="card-premium p-6 border border-[var(--border-lighter)]">
      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setExpandido(!expandido)}>
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-[#00E5FF]" />
          <h2 className="text-[var(--text-primary)] font-semibold text-sm">Ortodontia</h2>
        </div>
        <ChevronUp className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${!expandido ? "rotate-180" : ""}`} />
      </div>

      {expandido && (
        <div className="space-y-6">
          {/* Ativações */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-secondary)] text-xs font-semibold uppercase">Ativações</h3>
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-xs hover:bg-[#00E5FF]/30 transition-colors">
                <Plus className="w-3 h-3" />
                Nova
              </button>
            </div>
            <div className="space-y-2">
              {ativacoes.length === 0 ? (
                <p className="text-[var(--text-muted)] text-[10px] italic p-3 text-center bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-lightest)]">
                  Nenhuma ativação registada para este utente.
                </p>
              ) : (
                ativacoes.map(a => (
                  <div key={a.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-white/[0.12] transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-[var(--text-primary)] text-xs font-semibold">{a.descricao}</p>
                        <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                          {new Date(a.data).toLocaleDateString("pt-PT")} • {a.tipoAparelho}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button className="w-6 h-6 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#00E5FF] transition-colors">
                          <Edit2 className="w-3 h-3" />
                        </button>
                        <button className="w-6 h-6 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-[10px]">
                      <div>
                        <span className="text-[var(--text-muted)]">Dentes:</span>
                        <p className="text-[var(--text-primary)] font-semibold">{a.dentes}</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Força:</span>
                        <p className="text-[var(--text-primary)] font-semibold">{a.forcaAplicada}g</p>
                      </div>
                      <div>
                        <span className="text-[var(--text-muted)]">Próxima:</span>
                        <p className="text-[#00E5FF] font-semibold">
                          {a.proximaActivacao ? new Date(a.proximaActivacao).toLocaleDateString("pt-PT") : "—"}
                        </p>
                      </div>
                    </div>
                    {a.observacoes && <p className="text-[var(--text-muted)] text-[10px] mt-2 italic">{a.observacoes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cefalometria */}
          <div className="pt-4 border-t border-[var(--border-lighter)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-secondary)] text-xs font-semibold uppercase">Cefalometria</h3>
              <button className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF] text-xs hover:bg-[#00E5FF]/30 transition-colors">
                <Plus className="w-3 h-3" />
                Novo Traçado
              </button>
            </div>
            <div className="space-y-2">
              {cefalometrias.length === 0 ? (
                <p className="text-[var(--text-muted)] text-[10px] italic p-3 text-center bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-lightest)]">
                  Nenhum traçado cefalométrico disponível.
                </p>
              ) : (
                cefalometrias.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                    <p className="text-[var(--text-muted)] text-[10px] mb-2">
                      {new Date(c.data).toLocaleDateString("pt-PT")}
                    </p>
                    <div className="grid grid-cols-5 gap-2 text-[10px]">
                      {[
                        { label: "SNA", valor: c.sna, normal: "82°" },
                        { label: "SNB", valor: c.snb, normal: "80°" },
                        { label: "ANB", valor: c.anb, normal: "2°" },
                        { label: "FMA", valor: c.fma, normal: "25°" },
                        { label: "IMPA", valor: c.impa, normal: "90°" },
                      ].map(({ label, valor, normal }) => (
                        <div key={label} className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)] text-center">
                          <p className="text-[var(--text-muted)] text-[9px]">{label}</p>
                          <p className="text-[var(--text-primary)] font-bold">{valor}°</p>
                          <p className="text-[var(--text-muted)] text-[9px]">{normal}</p>
                        </div>
                      ))}
                    </div>
                    {c.observacoes && <p className="text-[var(--text-muted)] text-[10px] mt-2 italic">{c.observacoes}</p>}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: IMPLANTOLOGIA
// ═══════════════════════════════════════════════════════════════════════════════

interface Implante {
  id: string;
  dente: number;
  marca: string;
  diametro: number;
  comprimento: number;
  dataInsercao: Date;
  torqueInsercao: number; // em Ncm
  estadoIntegracao: "planejamento" | "inserido" | "integrando" | "integrado" | "carregado";
  coroa?: { material: string; data: Date };
  observacoes: string;
}

export function ModuloImplantologia({ utenteId }: { utenteId: number }) {
  // CORRIGIDO: Inicializado como array vazio
  const [implantes] = useState<Implante[]>([]);
  const [expandido, setExpandido] = useState(true);

  const getEtiquetaImplante = (estado: string) => {
    switch (estado) {
      case "planejamento":
        return { label: "Planeamento", bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-300" };
      case "inserido":
        return { label: "Inserido", bg: "bg-[#00E5FF]/20", border: "border-[#00E5FF]/30", text: "text-[#00E5FF]" };
      case "integrando":
        return { label: "Inserido", bg: "bg-[#00E5FF]/20", border: "border-[#00E5FF]/30", text: "text-[#00E5FF]" };   case "integrado":
        return { label: "Integrado", bg: "bg-emerald-500/20", border: "border-emerald-500/30", text: "text-emerald-300" };
      case "carregado":
        return { label: "Carregado", bg: "bg-violet-500/20", border: "border-violet-500/30", text: "text-violet-300" };
      default:
        return { label: "—", bg: "bg-[var(--bg-overlay)]", border: "border-[var(--border-light)]", text: "text-[var(--text-muted)]" };
    }
  };

  return (
    <div className="card-premium p-6 border border-[var(--border-lighter)]">
      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setExpandido(!expandido)}>
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-emerald-400" />
          <h2 className="text-[var(--text-primary)] font-semibold text-sm">Implantologia</h2>
        </div>
        <ChevronUp className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${!expandido ? "rotate-180" : ""}`} />
      </div>

      {expandido && (
        <div className="space-y-3">
          {implantes.length === 0 ? (
            <p className="text-[var(--text-muted)] text-[10px] italic p-3 text-center bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-lightest)]">
              Nenhum implante registado para este utente.
            </p>
          ) : (
            implantes.map(i => {
              const etiqueta = getEtiquetaImplante(i.estadoIntegracao);
              return (
                <div key={i.id} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-white/[0.12] transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[var(--text-primary)] font-bold text-sm">#{i.dente}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${etiqueta.bg} border ${etiqueta.border} ${etiqueta.text}`}>
                          {etiqueta.label}
                        </span>
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs">{i.marca}</p>
                    </div>
                    <div className="flex gap-1">
                      <button className="w-6 h-6 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 transition-colors">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button className="w-6 h-6 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 mb-3 text-[10px]">
                    <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                      <span className="text-[var(--text-muted)]">Ø</span>
                      <p className="text-[var(--text-primary)] font-bold">{i.diametro}mm</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                      <span className="text-[var(--text-muted)]">L</span>
                      <p className="text-[var(--text-primary)] font-bold">{i.comprimento}mm</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                      <span className="text-[var(--text-muted)]">Torque</span>
                      <p className="text-[var(--text-primary)] font-bold">{i.torqueInsercao}Ncm</p>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                      <span className="text-[var(--text-muted)]">Data</span>
                      <p className="text-[var(--text-primary)] font-bold text-[9px]">
                        {new Date(i.dataInsercao).toLocaleDateString("pt-PT", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>

                  {i.coroa && (
                    <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 mb-2">
                      <p className="text-[10px] text-violet-300">
                        <span className="font-semibold">Coroa:</span> {i.coroa.material} — {new Date(i.coroa.data).toLocaleDateString("pt-PT")}
                      </p>
                    </div>
                  )}

                  {i.observacoes && <p className="text-[var(--text-muted)] text-[10px] italic">{i.observacoes}</p>}
                </div>
              );
            })
          )}
          <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-light)] hover:border-white/[0.15] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium">
            <Plus className="w-3.5 h-3.5" />
            Novo Implante
          </button>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MÓDULO: PERIODONTIA
// ═══════════════════════════════════════════════════════════════════════════════

interface PeriodontogramaRegistro {
  id: string;
  data: Date;
  dentes: Record<number, { ps: number; sangramento: boolean; placa: number }>;
  diagnostico: string;
  recomendacoes: string;
}

export function ModuloPeriodontia({ utenteId }: { utenteId: number }) {
  // CORRIGIDO: Inicializado como array vazio
  const [registros] = useState<PeriodontogramaRegistro[]>([]);
  const [expandido, setExpandido] = useState(true);

  const calcularMedia = (registros: PeriodontogramaRegistro[], campo: "ps" | "placa") => {
    if (!registros || registros.length === 0) return "0.0";
    const valores: number[] = [];
    registros.forEach(r => {
      Object.values(r.dentes).forEach(d => {
        valores.push(campo === "ps" ? d.ps : d.placa);
      });
    });
    if (valores.length === 0) return "0.0";
    return (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(1);
  };

  return (
    <div className="card-premium p-6 border border-[var(--border-lighter)]">
      <div className="flex items-center justify-between mb-4 cursor-pointer" onClick={() => setExpandido(!expandido)}>
        <div className="flex items-center gap-2">
          <Droplet className="w-5 h-5 text-red-400" />
          <h2 className="text-[var(--text-primary)] font-semibold text-sm">Periodontia</h2>
        </div>
        <ChevronUp className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${!expandido ? "rotate-180" : ""}`} />
      </div>

      {expandido && (
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-2">
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center">
              <p className="text-[var(--text-muted)] text-[10px] mb-1">PS Média</p>
              <p className="text-[var(--text-primary)] text-lg font-bold">{calcularMedia(registros, "ps")}mm</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center">
              <p className="text-[var(--text-muted)] text-[10px] mb-1">Sangramento</p>
              <p className="text-red-400 text-lg font-bold">
                {registros.length > 0 && registros[0]?.dentes ? Object.values(registros[0].dentes).filter(d => d.sangramento).length : 0}
              </p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] text-center">
              <p className="text-[var(--text-muted)] text-[10px] mb-1">Índice Placa</p>
              <p className="text-amber-400 text-lg font-bold">{calcularMedia(registros, "placa")}</p>
            </div>
          </div>

          {/* Registos */}
          <div className="space-y-2">
            {registros.length === 0 ? (
              <p className="text-[var(--text-muted)] text-[10px] italic p-3 text-center bg-[var(--bg-surface)] rounded-xl border border-dashed border-[var(--border-lightest)]">
                Nenhum periodontograma registado.
              </p>
            ) : (
              registros.map(r => (
                <div key={r.id} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-[var(--text-muted)] text-[10px]">
                      {new Date(r.data).toLocaleDateString("pt-PT")}
                    </p>
                    <div className="flex gap-1">
                      <button className="w-5 h-5 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-colors">
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    </div>
                  </div>

                  {/* Grid de Dentes */}
                  <div className="grid grid-cols-4 gap-1 mb-2">
                    {Object.entries(r.dentes).map(([dente, dados]) => (
                      <div key={dente} className={`p-2 rounded-lg text-center text-[9px] border ${
                        dados.sangramento
                          ? "bg-red-500/20 border-red-500/30"
                          : "bg-[var(--bg-surface)] border-[var(--border-lighter)]"
                      }`}>
                        <p className="text-[var(--text-muted)] font-semibold">#{dente}</p>
                        <p className="text-[var(--text-primary)] font-bold">{dados.ps}mm</p>
                        <p className="text-[var(--text-muted)] text-[8px]">
                          {dados.sangramento ? "🩸" : "✓"}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-1 text-[10px]">
                    <p className="text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Diagnóstico:</span> {r.diagnostico}
                    </p>
                    <p className="text-[var(--text-secondary)]">
                      <span className="text-[var(--text-muted)]">Recomendações:</span> {r.recomendacoes}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          <button className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-dashed border-[var(--border-light)] hover:border-white/[0.15] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-xs font-medium">
            <Plus className="w-3.5 h-3.5" />
            Novo Periodontograma
          </button>
        </div>
      )}
    </div>
  );
}
