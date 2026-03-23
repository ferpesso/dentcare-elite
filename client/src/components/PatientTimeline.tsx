/**
 * PatientTimeline.tsx — Linha Temporal do Paciente
 * DentCare V35 — Visualização Cronológica Completa
 *
 * Funcionalidades:
 * - Timeline interativa com todos os eventos do paciente
 * - Consultas, tratamentos, pagamentos, comunicações
 * - Filtros por tipo de evento
 * - Cores e ícones por categoria
 * - Expansão de detalhes
 * - Design premium integrado com o tema
 */

import { useState, useMemo } from "react";
import {
  Calendar, Euro, Stethoscope, MessageCircle, FileText,
  ChevronDown, ChevronUp, Filter, Clock, CheckCircle,
  XCircle, AlertTriangle, Phone, Mail, Activity,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

export interface TimelineEvent {
  id: string;
  tipo: "consulta" | "tratamento" | "pagamento" | "comunicacao" | "documento" | "nota";
  titulo: string;
  descricao: string;
  data: Date | string;
  estado?: string;
  valor?: number;
  detalhes?: Record<string, string>;
  icone?: string;
}

interface PatientTimelineProps {
  eventos: TimelineEvent[];
  nomeUtente?: string;
  loading?: boolean;
}

// ─── Configuração de Tipos ──────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, {
  icon: React.ReactNode;
  cor: string;
  bgCor: string;
  borderCor: string;
  label: string;
}> = {
  consulta: {
    icon: <Calendar className="w-4 h-4" />,
    cor: "text-blue-400",
    bgCor: "bg-blue-500/10",
    borderCor: "border-blue-500/30",
    label: "Consulta",
  },
  tratamento: {
    icon: <Stethoscope className="w-4 h-4" />,
    cor: "text-emerald-400",
    bgCor: "bg-emerald-500/10",
    borderCor: "border-emerald-500/30",
    label: "Tratamento",
  },
  pagamento: {
    icon: <Euro className="w-4 h-4" />,
    cor: "text-amber-400",
    bgCor: "bg-amber-500/10",
    borderCor: "border-amber-500/30",
    label: "Pagamento",
  },
  comunicacao: {
    icon: <MessageCircle className="w-4 h-4" />,
    cor: "text-green-400",
    bgCor: "bg-green-500/10",
    borderCor: "border-green-500/30",
    label: "Comunicação",
  },
  documento: {
    icon: <FileText className="w-4 h-4" />,
    cor: "text-violet-400",
    bgCor: "bg-violet-500/10",
    borderCor: "border-violet-500/30",
    label: "Documento",
  },
  nota: {
    icon: <Activity className="w-4 h-4" />,
    cor: "text-gray-400",
    bgCor: "bg-gray-500/10",
    borderCor: "border-gray-500/30",
    label: "Nota",
  },
};

const ESTADO_ICONS: Record<string, React.ReactNode> = {
  realizada: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  agendada: <Clock className="w-3.5 h-3.5 text-blue-400" />,
  cancelada: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  "no-show": <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />,
  paga: <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />,
  pendente: <Clock className="w-3.5 h-3.5 text-amber-400" />,
};

// ─── Componente Principal ───────────────────────────────────────────────────

export function PatientTimeline({ eventos, nomeUtente, loading }: PatientTimelineProps) {
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  // Filtrar e ordenar eventos
  const eventosFiltrados = useMemo(() => {
    let lista = [...eventos];
    if (filtroTipo) lista = lista.filter(e => e.tipo === filtroTipo);
    return lista.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  }, [eventos, filtroTipo]);

  // Agrupar por mês/ano
  const grupos = useMemo(() => {
    const map = new Map<string, TimelineEvent[]>();
    eventosFiltrados.forEach(e => {
      const d = new Date(e.data);
      const key = d.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    });
    return map;
  }, [eventosFiltrados]);

  const toggleExpand = (id: string) => {
    setExpandidos(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  };

  const formatarData = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleDateString("pt-PT", { day: "numeric", month: "short", year: "numeric" });
  };

  const formatarHora = (data: Date | string) => {
    const d = new Date(data);
    return d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
  };

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex gap-4">
            <div className="w-10 h-10 rounded-xl bg-[var(--bg-elevated)]" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-[var(--bg-elevated)]" />
              <div className="h-3 w-32 rounded bg-[var(--bg-elevated)]" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com filtros */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Linha Temporal {nomeUtente ? `— ${nomeUtente}` : ""}
          </h3>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">
            {eventosFiltrados.length} evento{eventosFiltrados.length !== 1 ? "s" : ""} registado{eventosFiltrados.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          {Object.entries(TIPO_CONFIG).map(([key, conf]) => (
            <button
              key={key}
              onClick={() => setFiltroTipo(filtroTipo === key ? null : key)}
              className={`px-2 py-1 text-[10px] font-medium rounded-full transition-colors ${
                filtroTipo === key
                  ? `${conf.bgCor} ${conf.cor}`
                  : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
              title={conf.label}
            >
              {conf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Timeline */}
      {eventosFiltrados.length === 0 ? (
        <div className="text-center py-12">
          <Clock className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
          <p className="text-[var(--text-muted)] text-sm">Sem eventos registados</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--border-lighter)]" />

          {Array.from(grupos.entries()).map(([mesAno, eventosDoMes]) => (
            <div key={mesAno} className="mb-6">
              {/* Label do mês */}
              <div className="relative flex items-center gap-3 mb-3">
                <div className="w-10 h-6 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-lighter)] flex items-center justify-center z-10">
                  <span className="text-[9px] font-bold text-[var(--text-muted)] uppercase">
                    {mesAno.split(" ")[0].substring(0, 3)}
                  </span>
                </div>
                <span className="text-xs font-medium text-[var(--text-tertiary)] capitalize">{mesAno}</span>
              </div>

              {/* Eventos do mês */}
              {eventosDoMes.map(evento => {
                const conf = TIPO_CONFIG[evento.tipo] || TIPO_CONFIG.nota;
                const expandido = expandidos.has(evento.id);

                return (
                  <div key={evento.id} className="relative flex gap-3 mb-2 ml-0">
                    {/* Dot na timeline */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 z-10 border ${conf.bgCor} ${conf.borderCor}`}>
                      <span className={conf.cor}>{conf.icon}</span>
                    </div>

                    {/* Card do evento */}
                    <div
                      className={`flex-1 bg-[var(--bg-elevated)] border border-[var(--border-lighter)] rounded-xl p-3 cursor-pointer transition-all duration-200 hover:border-[var(--border-primary)] ${
                        expandido ? "ring-1 ring-[#00E5FF]/20" : ""
                      }`}
                      onClick={() => evento.detalhes && toggleExpand(evento.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-semibold ${conf.cor}`}>{conf.label}</span>
                            {evento.estado && (
                              <span className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
                                {ESTADO_ICONS[evento.estado]}
                                {evento.estado}
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-[var(--text-primary)] mt-0.5 truncate">
                            {evento.titulo}
                          </p>
                          <p className="text-[var(--text-muted)] text-xs mt-0.5 line-clamp-1">
                            {evento.descricao}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                          {evento.valor !== undefined && (
                            <span className="text-sm font-bold text-emerald-400">
                              {evento.valor}€
                            </span>
                          )}
                          <div className="text-right">
                            <p className="text-[10px] text-[var(--text-muted)]">{formatarData(evento.data)}</p>
                            <p className="text-[10px] text-[var(--text-tertiary)]">{formatarHora(evento.data)}</p>
                          </div>
                          {evento.detalhes && (
                            expandido ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />
                          )}
                        </div>
                      </div>

                      {/* Detalhes expandidos */}
                      {expandido && evento.detalhes && (
                        <div className="mt-3 pt-3 border-t border-[var(--border-lightest)] grid grid-cols-2 gap-2">
                          {Object.entries(evento.detalhes).map(([key, value]) => (
                            <div key={key}>
                              <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider">{key}</p>
                              <p className="text-xs text-[var(--text-secondary)]">{value}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
