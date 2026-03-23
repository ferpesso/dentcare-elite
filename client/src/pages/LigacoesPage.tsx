import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Phone, PhoneOff, CheckCircle, Clock, AlertCircle, Plus, Filter, Search, ChevronDown, ChevronUp, MessageCircle, Calendar, User, MapPin, Zap, Trash2, Edit2, ExternalLink } from "lucide-react";

type TipoLigacao = "confirmacao" | "seguimento" | "cobranca" | "agendamento" | "urgencia";
type EstadoLigacao = "pendente" | "em_progresso" | "concluida" | "nao_atendeu" | "cancelada";

interface Ligacao {
  id: number;
  utenteId: number;
  utenteNome: string;
  telemovel: string;
  tipoLigacao: TipoLigacao;
  motivo: string;
  dataAgendada: Date;
  dataConcluida?: Date;
  estado: EstadoLigacao;
  notas: string;
  proximaLigacao?: Date;
}

export function LigacoesPage() {
  const [, navigate] = useLocation();
  const [filtroTipo, setFiltroTipo] = useState<TipoLigacao | "todos">("todos");
  const [filtroEstado, setFiltroEstado] = useState<EstadoLigacao | "todos">("pendente");
  const [pesquisa, setPesquisa] = useState("");
  const [expandido, setExpandido] = useState<number | null>(null);

  const ligacoesQuery = trpc.ligacoes.listarPendentes.useQuery({
    tipo: filtroTipo !== "todos" ? (filtroTipo as TipoLigacao) : undefined,
    estado: filtroEstado !== "todos" ? (filtroEstado as EstadoLigacao) : undefined,
  });

  const estatisticasQuery = trpc.ligacoes.estatisticas.useQuery();
  const atualizarEstado = trpc.ligacoes.actualizarEstado.useMutation({
    onSuccess: () => { ligacoesQuery.refetch(); estatisticasQuery.refetch(); },
  });

  const ligacoes = ((ligacoesQuery.data?.ligacoes ?? []) as any[]).map((ligacao: any) => ({
    ...ligacao,
    dataAgendada: new Date(ligacao.dataAgendada),
  })) as Ligacao[];
  const stats = estatisticasQuery.data;

  const ligacoesFiltradas = useMemo(() => {
    return ligacoes.filter(l =>
      l.utenteNome.toLowerCase().includes(pesquisa.toLowerCase()) ||
      l.telemovel.includes(pesquisa)
    );
  }, [ligacoes, pesquisa]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">Ligações Pendentes</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">Gestão de confirmações, seguimentos e cobranças</p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nova Ligação
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: "Total", valor: stats.totalLigacoes, icon: Phone, cor: "text-[#00E5FF]" },
            { label: "Pendentes", valor: stats.pendentes, icon: Clock, cor: "text-slate-400" },
            { label: "Em Progresso", valor: stats.emProgresso, icon: Phone, cor: "text-yellow-400" },
            { label: "Concluídas", valor: stats.concluidas, icon: CheckCircle, cor: "text-emerald-400" },
            { label: "Taxa", valor: `${stats.taxaConclusao}%`, icon: Zap, cor: "text-purple-400" },
          ].map(({ label, valor, icon: Icon, cor }) => (
            <div key={label} className="card-premium p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${cor}`} />
                <span className="text-[var(--text-muted)] text-xs">{label}</span>
              </div>
              <p className={`text-xl font-bold ${cor}`}>{valor}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        <div className="flex items-center gap-2 px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
          <Search className="w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={pesquisa}
            onChange={e => setPesquisa(e.target.value)}
            className="bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none w-48"
          />
        </div>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value as any)} className="px-3 py-2 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl text-sm text-[var(--text-primary)] focus:outline-none">
          <option value="todos">Todos os tipos</option>
          <option value="confirmacao">Confirmação</option>
          <option value="seguimento">Seguimento</option>
          <option value="cobranca">Cobrança</option>
        </select>
      </div>

      <div className="card-premium divide-y divide-[var(--border-lightest)]">
        {ligacoesFiltradas.length === 0 ? (
          <div className="p-8 text-center">
            <Phone className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3 opacity-50" />
            <p className="text-[var(--text-muted)]">Nenhuma ligação encontrada</p>
          </div>
        ) : (
          ligacoesFiltradas.map(ligacao => (
            <div key={ligacao.id} className="p-4 hover:bg-[var(--bg-surface)] transition-colors">
              <button onClick={() => setExpandido(expandido === ligacao.id ? null : ligacao.id)} className="w-full flex items-start gap-3 text-left">
                <div className="w-10 h-10 rounded-lg bg-[#00E5FF]/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="text-[var(--text-primary)] font-semibold">{ligacao.utenteNome}</p>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00E5FF]/10 text-[#00E5FF]">{ligacao.tipoLigacao}</span>
                  </div>
                  <p className="text-[var(--text-secondary)] text-xs mb-1">{ligacao.motivo}</p>
                  <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
                    <span>{ligacao.telemovel}</span>
                    <span>{new Date(ligacao.dataAgendada).toLocaleDateString("pt-PT")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {ligacao.estado === "pendente" && (
                    <button onClick={(e) => { e.stopPropagation(); atualizarEstado.mutate({ ligacaoId: ligacao.id, novoEstado: "em_progresso" }); }} className="p-2 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400">
                      <Phone className="w-4 h-4" />
                    </button>
                  )}
                  {expandido === ligacao.id ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
                </div>
              </button>
              {expandido === ligacao.id && (
                <div className="mt-4 pt-4 border-t border-[var(--border-lighter)] space-y-3">
                  <div>
                    <label className="text-[var(--text-muted)] text-xs font-semibold block mb-1">Notas</label>
                    <p className="text-[var(--text-secondary)] text-sm">{ligacao.notas || "Sem notas"}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => navigate(`/utentes?utenteId=${ligacao.utenteId}`)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-medium transition-colors"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver Ficha
                    </button>
                    <button className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors">
                      <MessageCircle className="w-3 h-3" />
                      WhatsApp
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
