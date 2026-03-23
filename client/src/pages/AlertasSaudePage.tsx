/**
 * AlertasSaudePage.tsx — Alertas de Saúde dos Utentes
 * DentCare Elite V35 — Monitorização Proactiva Avançada
 * UPGRADE V32.3: Moeda dinâmica via ConfigContext (useConfig)
 *
 * Funcionalidades:
 * - Alertas por tipo e prioridade com filtros avançados
 * - Acções directas (resolver, enviar WhatsApp, agendar)
 * - Estatísticas de alertas por categoria
 * - Resolução em massa
 * - Pesquisa por nome de utente
 * - Ordenação por prioridade/data
 * - Painel de resumo com KPIs
 */
import React, { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import {
  Heart, Calendar, Bell, CheckCircle, Filter,
  Activity, ShieldAlert, Receipt, TrendingDown,
  MessageCircle, Search, X, AlertTriangle,
  Users, BarChart2, CheckCircle2, Clock,
  ChevronDown, Zap, RefreshCw, Trash2,
  Phone, ArrowUpDown, Info, ExternalLink,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoAlerta = "consulta_atraso" | "aniversario" | "tratamento_pendente" | "pagamento_atraso" | "inativo";
type Prioridade = "critica" | "alta" | "media" | "baixa";
type Ordenacao = "prioridade" | "nome" | "tipo";

interface Alerta {
  id: string;
  utenteId: number;
  utenteNome: string;
  telefone?: string;
  tipo: TipoAlerta;
  prioridade: Prioridade;
  descricao: string;
  acao?: string;
  resolvido: boolean;
  diasAtraso?: number;
}

// ─── Configurações ────────────────────────────────────────────────────────────
const TIPO_CONFIG: Record<TipoAlerta, {
  label: string;
  icon: React.ComponentType<any>;
  cor: string;
  bg: string;
  border: string;
  descricaoBase: string;
}> = {
  consulta_atraso:    { label: "Consulta em Atraso",    icon: Calendar,     cor: "text-red-400",    bg: "bg-red-500/10",    border: "border-red-500/20",    descricaoBase: "Sem consulta há" },
  aniversario:        { label: "Aniversário Próximo",   icon: Bell,         cor: "text-pink-400",   bg: "bg-pink-500/10",   border: "border-pink-500/20",   descricaoBase: "Aniversário em" },
  tratamento_pendente:{ label: "Tratamento Pendente",   icon: Activity,     cor: "text-amber-400",  bg: "bg-amber-500/10",  border: "border-amber-500/20",  descricaoBase: "Tratamento pendente há" },
  pagamento_atraso:   { label: "Pagamento em Atraso",   icon: Receipt,      cor: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", descricaoBase: "Fatura em atraso" },
  inativo:            { label: "Utente Inativo",       icon: TrendingDown, cor: "text-violet-400", bg: "bg-violet-500/10", border: "border-violet-500/20", descricaoBase: "Sem atividade há" },
};

const PRIORIDADE_CONFIG: Record<Prioridade, {
  label: string; cor: string; bg: string; border: string; ordem: number;
}> = {
  critica: { label: "Crítica", cor: "text-red-300",     bg: "bg-red-500/20",     border: "border-red-500/30",     ordem: 0 },
  alta:    { label: "Alta",    cor: "text-orange-300",  bg: "bg-orange-500/20",  border: "border-orange-500/30",  ordem: 1 },
  media:   { label: "Média",   cor: "text-amber-300",   bg: "bg-amber-500/20",   border: "border-amber-500/30",   ordem: 2 },
  baixa:   { label: "Baixa",   cor: "text-emerald-300", bg: "bg-emerald-500/20", border: "border-emerald-500/30", ordem: 3 },
};

// ─── Gerador de Alertas ───────────────────────────────────────────────────────
function gerarAlertasDoUtente(utente: any, index: number): Alerta[] {
  const formatMoeda = (v: number) => `€${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
  const alertas: Alerta[] = [];
  const mesesSemConsulta = [8, 3, 12, 1, 7, 4, 9, 2, 6, 5][index % 10];

  if (mesesSemConsulta > 6) {
    alertas.push({
      id: `consulta_${utente.id}`,
      utenteId: utente.id,
      utenteNome: utente.nome,
      telefone: utente.telemovel,
      tipo: "consulta_atraso",
      prioridade: mesesSemConsulta > 12 ? "critica" : mesesSemConsulta > 9 ? "alta" : "media",
      descricao: `Sem consulta há ${mesesSemConsulta} meses`,
      acao: "Agendar consulta de rotina",
      resolvido: false,
      diasAtraso: mesesSemConsulta * 30,
    });
  }

  if (index % 5 === 0) {
    const dias = 3 + (index % 4);
    alertas.push({
      id: `aniversario_${utente.id}`,
      utenteId: utente.id,
      utenteNome: utente.nome,
      telefone: utente.telemovel,
      tipo: "aniversario",
      prioridade: dias <= 1 ? "alta" : "baixa",
      descricao: `Aniversário em ${dias} dia${dias > 1 ? "s" : ""}`,
      acao: "Enviar mensagem de parabéns",
      resolvido: false,
      diasAtraso: dias,
    });
  }

  if (index % 4 === 1) {
    alertas.push({
      id: `tratamento_${utente.id}`,
      utenteId: utente.id,
      utenteNome: utente.nome,
      telefone: utente.telemovel,
      tipo: "tratamento_pendente",
      prioridade: "alta",
      descricao: "Tratamento de canal pendente há 45 dias",
      acao: "Contactar utente para agendar",
      resolvido: false,
      diasAtraso: 45,
    });
  }

  if (index % 6 === 2) {
    alertas.push({
      id: `pagamento_${utente.id}`,
      utenteId: utente.id,
      utenteNome: utente.nome,
      telefone: utente.telemovel,
      tipo: "pagamento_atraso",
      prioridade: "alta",
      descricao: `Fatura de ${formatMoeda(150)} em atraso há 30 dias`,
      acao: "Enviar lembrete de pagamento",
      resolvido: false,
      diasAtraso: 30,
    });
  }

  if (mesesSemConsulta > 10 && index % 3 === 0) {
    alertas.push({
      id: `inativo_${utente.id}`,
      utenteId: utente.id,
      utenteNome: utente.nome,
      telefone: utente.telemovel,
      tipo: "inativo",
      prioridade: "media",
      descricao: `Sem qualquer atividade há ${mesesSemConsulta} meses`,
      acao: "Campanha de reactivação",
      resolvido: false,
      diasAtraso: mesesSemConsulta * 30,
    });
  }

  return alertas;
}

// ─── Componente: Badge de Prioridade ─────────────────────────────────────────
function PrioridadeBadge({ prioridade }: { prioridade: Prioridade }) {
  const c = PRIORIDADE_CONFIG[prioridade];
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.bg} ${c.cor} ${c.border}`}>
      {c.label}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════
export function AlertasSaudePage() {
  const [, navigate] = useLocation();
  const { simboloMoeda } = useConfig();
  const formatMoeda = (v: number) => `${simboloMoeda}${v.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`;
  const [filtroTipo, setFiltroTipo] = useState<TipoAlerta | "todos">("todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<Prioridade | "todos">("todos");
  const [pesquisa, setPesquisa] = useState("");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("prioridade");
  const [resolvidos, setResolvidos] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"alertas" | "estatisticas">("alertas");
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());

  const alertasSaudeQuery = trpc.dashboard.obterAlertasSaude.useQuery({ limite: 200 });

  const todosAlertas = useMemo<Alerta[]>(() => {
    return ((alertasSaudeQuery.data as any)?.alertas ?? []) as Alerta[];
  }, [alertasSaudeQuery.data]);

  const alertasFiltrados = useMemo(() => {
    let lista = todosAlertas.filter(a => {
      if (resolvidos.has(a.id)) return false;
      if (filtroTipo !== "todos" && a.tipo !== filtroTipo) return false;
      if (filtroPrioridade !== "todos" && a.prioridade !== filtroPrioridade) return false;
      if (pesquisa && !a.utenteNome.toLowerCase().includes(pesquisa.toLowerCase())) return false;
      return true;
    });

    // Ordenação
    if (ordenacao === "prioridade") {
      lista = lista.sort((a, b) => PRIORIDADE_CONFIG[a.prioridade].ordem - PRIORIDADE_CONFIG[b.prioridade].ordem);
    } else if (ordenacao === "nome") {
      lista = lista.sort((a, b) => a.utenteNome.localeCompare(b.utenteNome));
    } else if (ordenacao === "tipo") {
      lista = lista.sort((a, b) => a.tipo.localeCompare(b.tipo));
    }

    return lista;
  }, [todosAlertas, filtroTipo, filtroPrioridade, pesquisa, ordenacao, resolvidos]);

  const resolverAlerta = (id: string) => {
    setResolvidos(prev => new Set([...prev, id]));
    setSelecionados(prev => { const n = new Set(prev); n.delete(id); return n; });
  };

  const resolverSelecionados = () => {
    setResolvidos(prev => new Set([...prev, ...selecionados]));
    setSelecionados(new Set());
  };

  const toggleSeleccionar = (id: string) => {
    setSelecionados(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const totalAtivos = todosAlertas.filter(a => !resolvidos.has(a.id)).length;
  const totalCriticos = todosAlertas.filter(a => a.prioridade === "critica" && !resolvidos.has(a.id)).length;
  const totalResolvidos = resolvidos.size;

  const TABS = [
    { id: "alertas",      label: "Alertas",      icon: ShieldAlert },
    { id: "estatisticas", label: "Estatísticas", icon: BarChart2 },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">Alertas de Saúde</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            Monitorização proactiva dos utentes da clínica
          </p>
        </div>
        <div className="flex items-center gap-2">
          {totalCriticos > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-red-300 text-xs font-semibold">{totalCriticos} crítico{totalCriticos !== 1 ? "s" : ""}</span>
            </div>
          )}
          <button
            onClick={() => alertasSaudeQuery.refetch()}
            className="w-8 h-8 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${alertasSaudeQuery.isFetching ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card-premium p-4 border border-red-500/20">
          <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-2">
            <ShieldAlert className="w-3.5 h-3.5 text-red-400" />
          </div>
          <p className="section-label mb-0.5">Alertas Activos</p>
          <p className="text-xl font-black text-red-400">{totalAtivos}</p>
        </div>
        <div className="card-premium p-4 border border-orange-500/20">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
          </div>
          <p className="section-label mb-0.5">Críticos</p>
          <p className="text-xl font-black text-orange-400">{totalCriticos}</p>
        </div>
        <div className="card-premium p-4 border border-emerald-500/20">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="section-label mb-0.5">Resolvidos</p>
          <p className="text-xl font-black text-emerald-400">{totalResolvidos}</p>
        </div>
        <div className="card-premium p-4 border border-[#00E5FF]/20">
          <div className="w-8 h-8 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mb-2">
            <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
          </div>
          <p className="section-label mb-0.5">Utentes Afectados</p>
          <p className="text-xl font-black text-[#00E5FF]">
            {new Set(todosAlertas.filter(a => !resolvidos.has(a.id)).map(a => a.utenteId)).size}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl w-fit">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab: Alertas ── */}
      {tab === "alertas" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="space-y-3">
            {/* Pesquisa e ordenação */}
            <div className="flex gap-3 flex-wrap">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Pesquisar utente..."
                  value={pesquisa}
                  onChange={e => setPesquisa(e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
                />
                {pesquisa && (
                  <button onClick={() => setPesquisa("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <select
                value={ordenacao}
                onChange={e => setOrdenacao(e.target.value as Ordenacao)}
                className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50"
              >
                <option value="prioridade">Por prioridade</option>
                <option value="nome">Por nome</option>
                <option value="tipo">Por tipo</option>
              </select>
            </div>

            {/* Filtro por tipo */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFiltroTipo("todos")}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${filtroTipo === "todos" ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30" : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"}`}
              >
                Todos ({totalAtivos})
              </button>
              {(Object.entries(TIPO_CONFIG) as [TipoAlerta, typeof TIPO_CONFIG[TipoAlerta]][]).map(([tipo, conf]) => {
                const count = todosAlertas.filter(a => a.tipo === tipo && !resolvidos.has(a.id)).length;
                if (count === 0) return null;
                return (
                  <button
                    key={tipo}
                    onClick={() => setFiltroTipo(filtroTipo === tipo ? "todos" : tipo)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                      filtroTipo === tipo
                        ? `${conf.bg} ${conf.cor} border ${conf.border}`
                        : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    <conf.icon className="w-3 h-3" />
                    {conf.label} ({count})
                  </button>
                );
              })}
            </div>

            {/* Filtro por prioridade */}
            <div className="flex gap-2 flex-wrap items-center">
              <span className="text-[var(--text-muted)] text-xs">Prioridade:</span>
              {(["todos", "critica", "alta", "media", "baixa"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setFiltroPrioridade(p)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                    filtroPrioridade === p
                      ? p === "todos"
                        ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                        : `${PRIORIDADE_CONFIG[p as Prioridade].bg} ${PRIORIDADE_CONFIG[p as Prioridade].cor} border ${PRIORIDADE_CONFIG[p as Prioridade].border}`
                      : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)] text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                  }`}
                >
                  {p === "todos" ? "Todas" : PRIORIDADE_CONFIG[p as Prioridade].label}
                </button>
              ))}
            </div>
          </div>

          {/* Acções em massa */}
          {selecionados.size > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
              <span className="text-[#00E5FF] text-xs font-medium flex-1">
                {selecionados.size} alerta{selecionados.size !== 1 ? "s" : ""} selecionado{selecionados.size !== 1 ? "s" : ""}
              </span>
              <button
                onClick={resolverSelecionados}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-medium hover:bg-emerald-500/30 transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Resolver todos
              </button>
              <button
                onClick={() => setSelecionados(new Set())}
                className="w-6 h-6 rounded-lg bg-[var(--bg-overlay)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Lista de Alertas */}
          {alertasSaudeQuery.isLoading ? (
            <div className="card-premium p-6 space-y-3">
              {[1, 2, 3, 4].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--bg-overlay)] animate-pulse" />)}
            </div>
          ) : alertasFiltrados.length === 0 ? (
            <div className="card-premium p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-4">
                <Heart className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">
                {filtroTipo !== "todos" || filtroPrioridade !== "todos" || pesquisa
                  ? "Sem alertas com estes filtros"
                  : "Sem alertas activos"
                }
              </p>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                {filtroTipo !== "todos" || filtroPrioridade !== "todos" || pesquisa
                  ? "Tente remover os filtros"
                  : "Todos os utentes estão em dia"
                }
              </p>
            </div>
          ) : (
            <div className="card-premium overflow-hidden">
              <div className="p-3 border-b border-[var(--border-lighter)] flex items-center gap-2">
                <span className="text-[var(--text-muted)] text-xs">{alertasFiltrados.length} alerta{alertasFiltrados.length !== 1 ? "s" : ""}</span>
                <button
                  onClick={() => {
                    const ids = new Set(alertasFiltrados.map(a => a.id));
                    setSelecionados(prev => prev.size === ids.size ? new Set() : ids);
                  }}
                  className="ml-auto text-xs text-[#00E5FF] hover:text-[#00E5FF] transition-colors"
                >
                  {selecionados.size === alertasFiltrados.length ? "Desseleccionar todos" : "Seleccionar todos"}
                </button>
              </div>
              <div className="divide-y divide-[var(--border-lightest)]">
                {alertasFiltrados.map(a => {
                  const tipoConf = TIPO_CONFIG[a.tipo];
                  const TipoIcon = tipoConf.icon;
                  const isSelected = selecionados.has(a.id);

                  return (
                    <div
                      key={a.id}
                      className={`flex items-center gap-3 p-4 hover:bg-[var(--bg-surface)] transition-colors group ${isSelected ? "bg-[#00E5FF]/5" : ""}`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSeleccionar(a.id)}
                        className="w-4 h-4 rounded border-white/20 bg-[var(--bg-overlay)] accent-[#00E5FF] shrink-0"
                      />

                      {/* Ícone do tipo */}
                      <div className={`w-9 h-9 rounded-xl ${tipoConf.bg} border ${tipoConf.border} flex items-center justify-center shrink-0`}>
                        <TipoIcon className={`w-4 h-4 ${tipoConf.cor}`} />
                      </div>

                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-0.5">
                          <p className="text-[var(--text-primary)] text-sm font-medium">{a.utenteNome}</p>
                          <PrioridadeBadge prioridade={a.prioridade} />
                        </div>
                        <p className="text-[var(--text-muted)] text-xs">{a.descricao}</p>
                        {a.acao && (
                          <p className={`text-xs mt-0.5 font-medium ${tipoConf.cor}`}>→ {a.acao}</p>
                        )}
                      </div>

                      {/* Tipo badge (desktop) */}
                      <span className={`hidden lg:block text-[10px] font-medium ${tipoConf.cor} ${tipoConf.bg} border ${tipoConf.border} px-2 py-0.5 rounded-full shrink-0`}>
                        {tipoConf.label}
                      </span>

                      {/* Acções */}
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => resolverAlerta(a.id)}
                          title="Marcar como resolvido"
                          className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                        {a.telefone && (
                          <button
                            title="Enviar WhatsApp"
                            className="w-7 h-7 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          title="Agendar consulta"
                          onClick={() => navigate(`/agenda`)}
                          className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-violet-400 hover:bg-violet-500/20 transition-colors"
                        >
                          <Calendar className="w-3.5 h-3.5" />
                        </button>
                        <button
                          title="Ver ficha do utente"
                          onClick={() => navigate(`/utentes?utenteId=${a.utenteId}`)}
                          className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Estatísticas ── */}
      {tab === "estatisticas" && (
        <div className="space-y-4">
          {/* Por Tipo */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 className="w-4 h-4 text-[#00E5FF]" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Alertas por Tipo</h2>
            </div>
            <div className="space-y-3">
              {(Object.entries(TIPO_CONFIG) as [TipoAlerta, typeof TIPO_CONFIG[TipoAlerta]][]).map(([tipo, conf]) => {
                const count = todosAlertas.filter(a => a.tipo === tipo && !resolvidos.has(a.id)).length;
                const pct = totalAtivos > 0 ? (count / totalAtivos) * 100 : 0;
                return (
                  <div key={tipo}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-1.5">
                        <conf.icon className={`w-3.5 h-3.5 ${conf.cor}`} />
                        <span className="text-[var(--text-secondary)] text-xs">{conf.label}</span>
                      </div>
                      <span className={`text-xs font-bold ${conf.cor}`}>{count}</span>
                    </div>
                    <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-700`}
                        style={{
                          width: `${pct}%`,
                          background: conf.cor.replace("text-", "").replace("-400", ""),
                          backgroundColor: tipo === "consulta_atraso" ? "rgba(239,68,68,0.5)"
                            : tipo === "aniversario" ? "rgba(236,72,153,0.5)"
                            : tipo === "tratamento_pendente" ? "rgba(245,158,11,0.5)"
                            : tipo === "pagamento_atraso" ? "rgba(249,115,22,0.5)"
                            : "rgba(139,92,246,0.5)",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por Prioridade */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Alertas por Prioridade</h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(["critica", "alta", "media", "baixa"] as Prioridade[]).map(p => {
                const count = todosAlertas.filter(a => a.prioridade === p && !resolvidos.has(a.id)).length;
                const conf = PRIORIDADE_CONFIG[p];
                return (
                  <div key={p} className={`p-4 rounded-xl ${conf.bg} border ${conf.border} text-center`}>
                    <p className={`text-2xl font-black ${conf.cor}`}>{count}</p>
                    <p className={`text-xs font-semibold ${conf.cor} mt-0.5`}>{conf.label}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Progresso de resolução */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Taxa de Resolução</h2>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[var(--text-secondary)] text-xs">Resolvidos hoje</span>
                  <span className="text-emerald-400 text-xs font-bold">
                    {totalResolvidos}/{totalResolvidos + totalAtivos}
                  </span>
                </div>
                <div className="h-3 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                    style={{ width: `${totalResolvidos + totalAtivos > 0 ? (totalResolvidos / (totalResolvidos + totalAtivos)) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <p className="text-emerald-400 text-xl font-black">
                  {totalResolvidos + totalAtivos > 0
                    ? `${Math.round((totalResolvidos / (totalResolvidos + totalAtivos)) * 100)}%`
                    : "—"
                  }
                </p>
                <p className="text-[var(--text-muted)] text-[10px]">resolvidos</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Info className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="text-[var(--text-muted)] text-xs">
              Os alertas são gerados automaticamente com base nos dados dos utentes. A resolução é registada apenas durante a sessão actual.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
