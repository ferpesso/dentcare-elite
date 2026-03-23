/**
 * LaboratoriosPage.tsx — Módulo de Gestão de Laboratórios e Envios
 * DentCare Elite V35 — Controlo Completo de Trabalhos Laboratoriais
 * UPGRADE V32.3: Moeda dinâmica via ConfigContext (useConfig)
 *
 * Funcionalidades:
 * - Cadastro completo de laboratórios (CRUD)
 * - Gestão de envios com workflow visual de estados
 * - Timeline de rastreamento por envio
 * - Tabela de preços por laboratório
 * - KPIs e estatísticas
 * - Filtros avançados
 */

import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import {
  FlaskConical, Plus, Search, Filter, ChevronRight, ChevronDown,
  Building2, Phone, Mail, Globe, MapPin, Star, Clock, Package,
  Send, CheckCircle, AlertTriangle, XCircle, Truck, Eye,
  Edit, Trash2, X, Save, ArrowRight, RotateCcw, CircleDot,
  TrendingUp, Euro, Calendar, User, Stethoscope, Palette,
  FileText, MoreVertical, Zap, Timer, ArrowUpDown,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────

type TabAtiva = "envios" | "laboratorios" | "estatisticas";
type ModalAtivo = null | "novoLab" | "editarLab" | "novoEnvio" | "detalhesEnvio" | "alterarEstado";

interface FormLab {
  nome: string;
  nif: string;
  contacto: string;
  email: string;
  telefone: string;
  morada: string;
  cidade: string;
  codigoPostal: string;
  website: string;
  especialidades: string[];
  prazoMedioEntrega: number;
  observacoes: string;
  tabelaPrecos: { servico: string; preco: number; prazo?: number }[];
}

interface FormEnvio {
  laboratorioId: number;
  utenteId: number;
  medicoId?: number;
  tipoTrabalho: string;
  descricao: string;
  dente: string;
  cor: string;
  material: string;
  prioridade: "normal" | "urgente" | "muito_urgente";
  dataPrevistaDevolucao: string;
  valorOrcado: string;
  observacoes: string;
}

// ─── Constantes ──────────────────────────────────────────────────────────────

const ESPECIALIDADES_LAB = [
  "Prótese Fixa", "Prótese Removível", "Ortodontia", "Implantes",
  "Cerâmica", "Zircónia", "Acrílicos", "Metal-Cerâmica",
  "Goteiras", "Facetas", "Coroas", "Pontes",
  "CAD/CAM", "Impressão 3D", "Fresagem Digital", "Placas Oclusais",
];

const MATERIAIS = [
  "Zircónia", "Zircónia Monolítica", "Metal-Cerâmica", "Cerâmica Pura (e.max)",
  "Dissilicato de Lítio", "Acrílico", "Cromo-Cobalto", "Titânio",
  "Resina", "Compósito", "Ouro", "PEEK", "PMMA", "Fibra de Vidro",
];

const TIPOS_TRABALHO = [
  "Coroa Unitária", "Ponte", "Faceta", "Inlay/Onlay",
  "Prótese Removível Parcial", "Prótese Total", "Prótese sobre Implante",
  "Goteira Oclusal", "Goteira de Branqueamento", "Goteira de Retenção",
  "Modelo de Estudo", "Modelo de Trabalho",
  "Provisório", "Infraestrutura", "Pilar Personalizado",
  "Barra sobre Implantes", "Placa de Mordida",
  "Reparação", "Rebase", "Acrescento", "Outro",
];

const ESTADOS_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icone: React.ComponentType<any> }> = {
  criado:        { label: "Criado",        cor: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/20",   icone: CircleDot },
  enviado:       { label: "Enviado",       cor: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    icone: Send },
  recebido_lab:  { label: "Recebido Lab",  cor: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/10",  border: "border-[#00E5FF]/20",  icone: Package },
  em_producao:   { label: "Em Produção",   cor: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   icone: Zap },
  pronto:        { label: "Pronto",        cor: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20",    icone: CheckCircle },
  devolvido:     { label: "Devolvido",     cor: "text-teal-400",    bg: "bg-teal-400/10",    border: "border-teal-400/20",    icone: Truck },
  em_prova:      { label: "Em Prova",      cor: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/20",  icone: Eye },
  ajuste:        { label: "Ajuste",        cor: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20",  icone: RotateCcw },
  concluido:     { label: "Concluído",     cor: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icone: CheckCircle },
  cancelado:     { label: "Cancelado",     cor: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icone: XCircle },
};

const PRIORIDADE_CONFIG: Record<string, { label: string; cor: string; bg: string }> = {
  normal:         { label: "Normal",         cor: "text-slate-400",  bg: "bg-slate-400/10" },
  urgente:        { label: "Urgente",        cor: "text-amber-400",  bg: "bg-amber-400/10" },
  muito_urgente:  { label: "Muito Urgente",  cor: "text-red-400",    bg: "bg-red-400/10" },
};

const WORKFLOW_ORDEM = ["criado", "enviado", "recebido_lab", "em_producao", "pronto", "devolvido", "em_prova", "concluido"];

const CORES_VITA = [
  "A1", "A2", "A3", "A3.5", "A4",
  "B1", "B2", "B3", "B4",
  "C1", "C2", "C3", "C4",
  "D2", "D3", "D4",
  "BL1", "BL2", "BL3", "BL4",
  "OM1", "OM2", "OM3",
];

function formLabVazio(): FormLab {
  return {
    nome: "", nif: "", contacto: "", email: "", telefone: "",
    morada: "", cidade: "", codigoPostal: "", website: "",
    especialidades: [], prazoMedioEntrega: 7, observacoes: "",
    tabelaPrecos: [],
  };
}

function formEnvioVazio(): FormEnvio {
  return {
    laboratorioId: 0, utenteId: 0, tipoTrabalho: "",
    descricao: "", dente: "", cor: "", material: "",
    prioridade: "normal", dataPrevistaDevolucao: "", valorOrcado: "", observacoes: "",
  };
}

// ─── Badge de Estado ─────────────────────────────────────────────────────────

function BadgeEstado({ estado }: { estado: string }) {
  const cfg = ESTADOS_CONFIG[estado] || ESTADOS_CONFIG.criado;
  const Icon = cfg.icone;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${cfg.cor} ${cfg.bg} border ${cfg.border}`}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function BadgePrioridade({ prioridade }: { prioridade: string }) {
  const cfg = PRIORIDADE_CONFIG[prioridade] || PRIORIDADE_CONFIG.normal;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg.cor} ${cfg.bg}`}>
      {cfg.label}
    </span>
  );
}

// ─── Componente: Widget KPI ──────────────────────────────────────────────────

function KPICard({ titulo, valor, icone: Icon, cor, bg, border, descricao }: {
  titulo: string; valor: string | number; icone: React.ComponentType<any>;
  cor: string; bg: string; border: string; descricao?: string;
}) {
  return (
    <div className={`card-premium p-5 border ${border} hover:scale-[1.02] transition-transform`}>
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${cor}`} />
        </div>
      </div>
      <p className="section-label mb-1">{titulo}</p>
      <p className={`text-2xl font-black ${cor}`}>{valor}</p>
      {descricao && <p className="text-[var(--text-muted)] text-xs mt-2">{descricao}</p>}
    </div>
  );
}

// ─── Timeline de Estados ─────────────────────────────────────────────────────

function TimelineEstados({ historico }: { historico: { estado: string; estadoAnterior?: string; data: string; observacao?: string; usuario?: string }[] }) {
  if (!historico || historico.length === 0) return <p className="text-[var(--text-muted)] text-xs">Sem histórico</p>;

  return (
    <div className="space-y-3">
      {historico.slice().reverse().map((item, i) => {
        const cfg = ESTADOS_CONFIG[item.estado] || ESTADOS_CONFIG.criado;
        const Icon = cfg.icone;
        const data = new Date(item.data);
        return (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.cor}`} />
              </div>
              {i < historico.length - 1 && <div className="w-px flex-1 bg-white/[0.08] mt-1" />}
            </div>
            <div className="flex-1 pb-3">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${cfg.cor}`}>{cfg.label}</span>
                <span className="text-[10px] text-[var(--text-muted)]">
                  {data.toLocaleDateString("pt-PT")} {data.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
              {item.observacao && <p className="text-xs text-[var(--text-tertiary)] mt-0.5">{item.observacao}</p>}
              {item.usuario && <p className="text-[10px] text-[var(--text-muted)] mt-0.5">por {item.usuario}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Barra de Progresso do Workflow ──────────────────────────────────────────

function WorkflowBar({ estadoAtual }: { estadoAtual: string }) {
  const idx = WORKFLOW_ORDEM.indexOf(estadoAtual);
  const progresso = idx >= 0 ? ((idx + 1) / WORKFLOW_ORDEM.length) * 100 : 0;
  const cfg = ESTADOS_CONFIG[estadoAtual] || ESTADOS_CONFIG.criado;

  if (estadoAtual === "cancelado" || estadoAtual === "ajuste") {
    return (
      <div className={`h-1.5 rounded-full ${cfg.bg}`}>
        <div className={`h-full rounded-full bg-current ${cfg.cor}`} style={{ width: "100%" }} />
      </div>
    );
  }

  return (
    <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-700 ${estadoAtual === "concluido" ? "bg-emerald-400" : "bg-[#00E5FF]"}`}
        style={{ width: `${progresso}%` }}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════

export function LaboratoriosPage() {
  const { formatMoeda, simboloMoeda } = useConfig();
  const [tab, setTab] = useState<TabAtiva>("envios");
  const [modal, setModal] = useState<ModalAtivo>(null);
  const [formLab, setFormLab] = useState<FormLab>(formLabVazio());
  const [formEnvio, setFormEnvio] = useState<FormEnvio>(formEnvioVazio());
  const [labEditId, setLabEditId] = useState<number | null>(null);
  const [envioSelecionado, setEnvioSelecionado] = useState<any>(null);
  const [novoEstado, setNovoEstado] = useState("");
  const [obsEstado, setObsEstado] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("");
  const [pesquisa, setPesquisa] = useState("");
  const [novoPrecoServico, setNovoPrecoServico] = useState("");
  const [novoPrecoValor, setNovoPrecoValor] = useState("");
  const [novoPrecoPrazo, setNovoPrecoPrazo] = useState("");

  const utils = trpc.useUtils();

  // ── Queries ──────────────────────────────────────────────────────────────
  const labsQuery = trpc.laboratorios.listar.useQuery({ pesquisa: pesquisa || undefined });
  const enviosQuery = trpc.laboratorios.listarEnvios.useQuery({
    estado: filtroEstado || undefined,
    apenasAtivos: filtroEstado === "" ? false : undefined,
  });
  const statsQuery = trpc.laboratorios.obterEstatisticas.useQuery();
  const utentesQuery = trpc.utentes.list.useQuery();
  const medicosQuery = trpc.dentistas.listar.useQuery();

  // ── Mutations ────────────────────────────────────────────────────────────
  const criarLabMut = trpc.laboratorios.criar.useMutation({
    onSuccess: () => { utils.laboratorios.listar.invalidate(); setModal(null); setFormLab(formLabVazio()); },
  });
  const atualizarLabMut = trpc.laboratorios.atualizar.useMutation({
    onSuccess: () => { utils.laboratorios.listar.invalidate(); setModal(null); setFormLab(formLabVazio()); setLabEditId(null); },
  });
  const desativarLabMut = trpc.laboratorios.desativar.useMutation({
    onSuccess: () => { utils.laboratorios.listar.invalidate(); },
  });
  const criarEnvioMut = trpc.laboratorios.criarEnvio.useMutation({
    onSuccess: () => {
      utils.laboratorios.listarEnvios.invalidate();
      utils.laboratorios.obterEstatisticas.invalidate();
      utils.laboratorios.obterNotificacoes.invalidate();
      setModal(null);
      setFormEnvio(formEnvioVazio());
    },
  });
  const atualizarEstadoMut = trpc.laboratorios.atualizarEstado.useMutation({
    onSuccess: () => {
      utils.laboratorios.listarEnvios.invalidate();
      utils.laboratorios.obterEstatisticas.invalidate();
      utils.laboratorios.obterNotificacoes.invalidate();
      setModal(null);
      setNovoEstado("");
      setObsEstado("");
    },
  });

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleCriarLab = () => {
    criarLabMut.mutate({
      ...formLab,
      email: formLab.email || undefined,
    });
  };

  const handleEditarLab = (lab: any) => {
    setFormLab({
      nome: lab.nome || "",
      nif: lab.nif || "",
      contacto: lab.contacto || "",
      email: lab.email || "",
      telefone: lab.telefone || "",
      morada: lab.morada || "",
      cidade: lab.cidade || "",
      codigoPostal: lab.codigoPostal || "",
      website: lab.website || "",
      especialidades: lab.especialidades || [],
      prazoMedioEntrega: lab.prazoMedioEntrega || 7,
      observacoes: lab.observacoes || "",
      tabelaPrecos: lab.tabelaPrecos || [],
    });
    setLabEditId(lab.id);
    setModal("editarLab");
  };

  const handleSalvarLab = () => {
    if (labEditId) {
      atualizarLabMut.mutate({ id: labEditId, ...formLab, email: formLab.email || undefined });
    }
  };

  const handleCriarEnvio = () => {
    criarEnvioMut.mutate({
      ...formEnvio,
      medicoId: formEnvio.medicoId || undefined,
      valorOrcado: formEnvio.valorOrcado ? parseFloat(formEnvio.valorOrcado) : undefined,
      dataPrevistaDevolucao: formEnvio.dataPrevistaDevolucao || undefined,
    });
  };

  const handleAlterarEstado = () => {
    if (!envioSelecionado || !novoEstado) return;
    atualizarEstadoMut.mutate({
      id: envioSelecionado.id,
      estado: novoEstado as any,
      observacao: obsEstado || undefined,
    });
  };

  const adicionarPreco = () => {
    if (!novoPrecoServico || !novoPrecoValor) return;
    setFormLab(prev => ({
      ...prev,
      tabelaPrecos: [...prev.tabelaPrecos, {
        servico: novoPrecoServico,
        preco: parseFloat(novoPrecoValor),
        prazo: novoPrecoPrazo ? parseInt(novoPrecoPrazo) : undefined,
      }],
    }));
    setNovoPrecoServico("");
    setNovoPrecoValor("");
    setNovoPrecoPrazo("");
  };

  const removerPreco = (idx: number) => {
    setFormLab(prev => ({
      ...prev,
      tabelaPrecos: prev.tabelaPrecos.filter((_, i) => i !== idx),
    }));
  };

  // ── Dados derivados ─────────────────────────────────────────────────────
  const labs = labsQuery.data?.laboratorios ?? [];
  const envios = enviosQuery.data?.envios ?? [];
  const stats = statsQuery.data?.stats;
  const utentesList = (utentesQuery.data as any)?.utentes ?? [];
  const medicosList = (medicosQuery.data as any)?.dentistas ?? [];

  // Próximos estados possíveis
  const proximosEstados = useMemo(() => {
    if (!envioSelecionado) return [];
    const atual = envioSelecionado.estado;
    const idx = WORKFLOW_ORDEM.indexOf(atual);
    const possiveis: string[] = [];

    if (idx >= 0 && idx < WORKFLOW_ORDEM.length - 1) {
      possiveis.push(WORKFLOW_ORDEM[idx + 1]);
    }
    if (atual !== "cancelado" && atual !== "concluido") {
      possiveis.push("ajuste");
      possiveis.push("cancelado");
    }
    if (atual === "ajuste") {
      possiveis.push("enviado");
    }

    return [...new Set(possiveis)];
  }, [envioSelecionado]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
              <FlaskConical className="w-5 h-5 text-violet-400" />
            </div>
            Laboratórios
          </h1>
          <p className="text-[var(--text-muted)] text-sm mt-1">Gestão de laboratórios externos e rastreamento de envios</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => { setFormEnvio(formEnvioVazio()); setModal("novoEnvio"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white text-sm font-semibold hover:from-[#00E5FF] hover:to-violet-500 transition-all shadow-lg shadow-[#00E5FF]/20 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Novo Envio
          </button>
          <button
            onClick={() => { setFormLab(formLabVazio()); setModal("novoLab"); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Laboratório
          </button>
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-lighter)] w-fit">
        {([
          { id: "envios" as TabAtiva, label: "Envios", icone: Send },
          { id: "laboratorios" as TabAtiva, label: "Laboratórios", icone: Building2 },
          { id: "estatisticas" as TabAtiva, label: "Estatísticas", icone: TrendingUp },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${
              tab === t.id
                ? "bg-white/[0.1] text-[var(--text-primary)] border border-[var(--border-light)]"
                : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <t.icone className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      {/* ═══ TAB: ENVIOS ═══ */}
      {tab === "envios" && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setFiltroEstado("")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${!filtroEstado ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30" : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-lighter)] hover:bg-[var(--bg-subtle)]"}`}>
              Todos
            </button>
            {Object.entries(ESTADOS_CONFIG).filter(([k]) => k !== "cancelado").map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setFiltroEstado(key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  filtroEstado === key
                    ? `${cfg.bg} ${cfg.cor} border ${cfg.border}`
                    : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-lighter)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Lista de Envios */}
          {envios.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <Send className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
              <p className="text-[var(--text-secondary)] font-semibold mb-1">Sem envios registados</p>
              <p className="text-[var(--text-muted)] text-sm">Crie o primeiro envio para um laboratório.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {envios.map((envio: any) => {
                const cfg = ESTADOS_CONFIG[envio.estado] || ESTADOS_CONFIG.criado;
                const isAtrasado = envio.dataPrevistaDevolucao && new Date(envio.dataPrevistaDevolucao) < new Date() && !["concluido", "cancelado", "devolvido"].includes(envio.estado);

                return (
                  <div
                    key={envio.id}
                    className={`card-premium p-4 border ${isAtrasado ? "border-red-500/30" : "border-[var(--border-lighter)]"} hover:border-white/[0.12] transition-all cursor-pointer group`}
                    onClick={() => { setEnvioSelecionado(envio); setModal("detalhesEnvio"); }}
                  >
                    <div className="flex items-start gap-4">
                      {/* Ícone de estado */}
                      <div className={`w-10 h-10 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0 mt-0.5`}>
                        <cfg.icone className={`w-5 h-5 ${cfg.cor}`} />
                      </div>

                      {/* Info principal */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-bold text-[var(--text-primary)]">{envio.tipoTrabalho}</span>
                          <BadgeEstado estado={envio.estado} />
                          <BadgePrioridade prioridade={envio.prioridade} />
                          {isAtrasado && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 animate-pulse">
                              <AlertTriangle className="w-3 h-3" /> Atrasado
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--text-muted)]">
                          <span className="flex items-center gap-1"><User className="w-3 h-3" /> {envio.utenteNome || "—"}</span>
                          <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {envio.laboratorioNome || "—"}</span>
                          {envio.dente && <span className="flex items-center gap-1"><Stethoscope className="w-3 h-3" /> Dente {envio.dente}</span>}
                          {envio.material && <span className="flex items-center gap-1"><Palette className="w-3 h-3" /> {envio.material}</span>}
                          {envio.dataPrevistaDevolucao && (
                            <span className={`flex items-center gap-1 ${isAtrasado ? "text-red-400 font-semibold" : ""}`}>
                              <Calendar className="w-3 h-3" /> Prev: {new Date(envio.dataPrevistaDevolucao).toLocaleDateString("pt-PT")}
                            </span>
                          )}
                          {envio.valorOrcado && (
                            <span className="flex items-center gap-1"><Euro className="w-3 h-3" /> {formatMoeda(Number(envio.valorOrcado))}</span>
                          )}
                        </div>

                        {/* Barra de progresso */}
                        <div className="mt-2">
                          <WorkflowBar estadoAtual={envio.estado} />
                        </div>
                      </div>

                      {/* Ação */}
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-2" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: LABORATÓRIOS ═══ */}
      {tab === "laboratorios" && (
        <div className="space-y-4">
          {/* Pesquisa */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Pesquisar laboratórios..."
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 transition-all"
            />
          </div>

          {/* Grid de Laboratórios */}
          {labs.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <Building2 className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-4 opacity-30" />
              <p className="text-[var(--text-secondary)] font-semibold mb-1">Sem laboratórios cadastrados</p>
              <p className="text-[var(--text-muted)] text-sm">Adicione o primeiro laboratório para começar.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {labs.map((lab: any) => (
                <div key={lab.id} className="card-premium p-5 border border-[var(--border-lighter)] hover:border-white/[0.12] transition-all group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                        <Building2 className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[var(--text-primary)]">{lab.nome}</p>
                        {lab.cidade && <p className="text-xs text-[var(--text-muted)] flex items-center gap-1"><MapPin className="w-3 h-3" /> {lab.cidade}</p>}
                      </div>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); handleEditarLab(lab); }} className="p-1.5 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] hover:text-[#00E5FF] transition-all cursor-pointer">
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); if (confirm("Desativar este laboratório?")) desativarLabMut.mutate({ id: lab.id }); }} className="p-1.5 rounded-lg hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="space-y-1.5 mb-3">
                    {lab.telefone && <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5"><Phone className="w-3 h-3" /> {lab.telefone}</p>}
                    {lab.email && <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5"><Mail className="w-3 h-3" /> {lab.email}</p>}
                    {lab.website && <p className="text-xs text-[var(--text-tertiary)] flex items-center gap-1.5"><Globe className="w-3 h-3" /> {lab.website}</p>}
                  </div>

                  {/* Especialidades */}
                  {lab.especialidades && lab.especialidades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mb-3">
                      {lab.especialidades.slice(0, 4).map((esp: string, i: number) => (
                        <span key={i} className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20">
                          {esp}
                        </span>
                      ))}
                      {lab.especialidades.length > 4 && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[var(--bg-overlay)] text-[var(--text-muted)]">
                          +{lab.especialidades.length - 4}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Rodapé */}
                  <div className="flex items-center justify-between pt-3 border-t border-[var(--border-lighter)]">
                    <div className="flex items-center gap-1">
                      <Star className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-400">{lab.avaliacao || "5.0"}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {lab.prazoMedioEntrega || 7}d</span>
                      <span className="flex items-center gap-1"><Send className="w-3 h-3" /> {lab.enviosAtivos || 0} ativos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══ TAB: ESTATÍSTICAS ═══ */}
      {tab === "estatisticas" && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard titulo="Laboratórios Ativos" valor={stats.totalLaboratorios} icone={Building2} cor="text-violet-400" bg="bg-violet-400/10" border="border-violet-400/20" />
            <KPICard titulo="Envios Ativos" valor={stats.enviosAtivos} icone={Send} cor="text-blue-400" bg="bg-blue-400/10" border="border-blue-400/20" />
            <KPICard titulo="Concluídos" valor={stats.enviosConcluidos} icone={CheckCircle} cor="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" />
            <KPICard titulo="Atrasados" valor={stats.enviosAtrasados} icone={AlertTriangle} cor="text-red-400" bg="bg-red-400/10" border="border-red-400/20" descricao="Passaram da data prevista" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard titulo="Total Envios" valor={stats.totalEnvios} icone={Package} cor="text-cyan-400" bg="bg-cyan-400/10" border="border-cyan-400/20" />
            <KPICard titulo="Valor Orçado" valor={formatMoeda(stats.valorTotalOrcado)} icone={Euro} cor="text-amber-400" bg="bg-amber-400/10" border="border-amber-400/20" />
            <KPICard titulo="Valor Final" valor={formatMoeda(stats.valorTotalFinal)} icone={TrendingUp} cor="text-emerald-400" bg="bg-emerald-400/10" border="border-emerald-400/20" />
            <KPICard titulo="Pendente Pagamento" valor={stats.totalPendentePagamento} icone={Timer} cor="text-orange-400" bg="bg-orange-400/10" border="border-orange-400/20" />
          </div>
        </div>
      )}

      {/* ═══ MODAIS ═══ */}

      {/* Modal: Novo/Editar Laboratório */}
      {(modal === "novoLab" || modal === "editarLab") && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-lighter)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {modal === "novoLab" ? "Novo Laboratório" : "Editar Laboratório"}
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Nome e NIF */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Nome *</label>
                  <input value={formLab.nome} onChange={e => setFormLab(p => ({ ...p, nome: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="Nome do laboratório" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">NIF</label>
                  <input value={formLab.nif} onChange={e => setFormLab(p => ({ ...p, nif: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="Contribuinte" />
                </div>
              </div>

              {/* Contactos */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Telefone</label>
                  <input value={formLab.telefone} onChange={e => setFormLab(p => ({ ...p, telefone: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="+351 ..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Email</label>
                  <input value={formLab.email} onChange={e => setFormLab(p => ({ ...p, email: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="email@lab.pt" />
                </div>
              </div>

              {/* Morada */}
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Morada</label>
                  <input value={formLab.morada} onChange={e => setFormLab(p => ({ ...p, morada: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Cidade</label>
                  <input value={formLab.cidade} onChange={e => setFormLab(p => ({ ...p, cidade: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
              </div>

              {/* Website e Prazo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Website</label>
                  <input value={formLab.website} onChange={e => setFormLab(p => ({ ...p, website: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Prazo Médio (dias)</label>
                  <input type="number" value={formLab.prazoMedioEntrega} onChange={e => setFormLab(p => ({ ...p, prazoMedioEntrega: parseInt(e.target.value) || 7 }))} onFocus={e => e.target.select()} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
              </div>

              {/* Especialidades */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Especialidades</label>
                <div className="flex flex-wrap gap-2">
                  {ESPECIALIDADES_LAB.map(esp => (
                    <button
                      key={esp}
                      type="button"
                      onClick={() => setFormLab(p => ({
                        ...p,
                        especialidades: p.especialidades.includes(esp)
                          ? p.especialidades.filter(e => e !== esp)
                          : [...p.especialidades, esp],
                      }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        formLab.especialidades.includes(esp)
                          ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                          : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-lighter)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      {esp}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tabela de Preços */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Tabela de Preços</label>
                {formLab.tabelaPrecos.length > 0 && (
                  <div className="space-y-1 mb-2">
                    {formLab.tabelaPrecos.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                        <span className="flex-1 text-xs text-[var(--text-secondary)]">{item.servico}</span>
                        <span className="text-xs font-semibold text-emerald-400">{formatMoeda(item.preco)}</span>
                        {item.prazo && <span className="text-[10px] text-[var(--text-muted)]">{item.prazo}d</span>}
                        <button onClick={() => removerPreco(idx)} className="p-1 rounded hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 cursor-pointer"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input value={novoPrecoServico} onChange={e => setNovoPrecoServico(e.target.value)} placeholder="Serviço" className="flex-1 px-3 py-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input value={novoPrecoValor} onChange={e => setNovoPrecoValor(e.target.value)} placeholder={simboloMoeda} type="number" onFocus={e => e.target.select()} className="w-20 px-3 py-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <input value={novoPrecoPrazo} onChange={e => setNovoPrecoPrazo(e.target.value)} placeholder="Dias" type="number" onFocus={e => e.target.select()} className="w-16 px-3 py-2 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-xs focus:outline-none focus:border-[#00E5FF]/50" />
                  <button onClick={adicionarPreco} className="px-3 py-2 rounded-lg bg-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold hover:bg-[#00E5FF]/30 transition-all cursor-pointer">
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Observações</label>
                <textarea value={formLab.observacoes} onChange={e => setFormLab(p => ({ ...p, observacoes: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-lighter)]">
              <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer">Cancelar</button>
              <button
                onClick={modal === "novoLab" ? handleCriarLab : handleSalvarLab}
                disabled={!formLab.nome || criarLabMut.isPending || atualizarLabMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white text-sm font-semibold hover:from-[#00E5FF] hover:to-violet-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                {modal === "novoLab" ? "Criar Laboratório" : "Guardar Alterações"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Novo Envio */}
      {modal === "novoEnvio" && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-lighter)]">
              <h2 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Send className="w-5 h-5 text-[#00E5FF]" /> Novo Envio para Laboratório
              </h2>
              <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-4">
              {/* Laboratório e Utente */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Laboratório *</label>
                  <select
                    value={formEnvio.laboratorioId}
                    onChange={e => setFormEnvio(p => ({ ...p, laboratorioId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value={0}>Selecionar laboratório...</option>
                    {labs.map((lab: any) => (
                      <option key={lab.id} value={lab.id}>{lab.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Utente *</label>
                  <select
                    value={formEnvio.utenteId}
                    onChange={e => setFormEnvio(p => ({ ...p, utenteId: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value={0}>Selecionar utente...</option>
                    {utentesList.map((u: any) => (
                      <option key={u.id} value={u.id}>{u.nome}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Médico e Tipo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Médico Responsável</label>
                  <select
                    value={formEnvio.medicoId || ""}
                    onChange={e => setFormEnvio(p => ({ ...p, medicoId: e.target.value ? parseInt(e.target.value) : undefined }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value="">Selecionar médico...</option>
                    {medicosList.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Tipo de Trabalho *</label>
                  <select
                    value={formEnvio.tipoTrabalho}
                    onChange={e => setFormEnvio(p => ({ ...p, tipoTrabalho: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value="">Selecionar tipo...</option>
                    {TIPOS_TRABALHO.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Dente, Cor, Material */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Dente(s)</label>
                  <input value={formEnvio.dente} onChange={e => setFormEnvio(p => ({ ...p, dente: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="Ex: 11, 21" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Cor / Escala</label>
                  <input value={formEnvio.cor} onChange={e => setFormEnvio(p => ({ ...p, cor: e.target.value }))} list="cores-vita-list" className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="Ex: A2, B1, BL2..." />
                  <datalist id="cores-vita-list">
                    {CORES_VITA.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Material</label>
                  <select
                    value={formEnvio.material}
                    onChange={e => setFormEnvio(p => ({ ...p, material: e.target.value }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value="">Selecionar...</option>
                    {MATERIAIS.map(m => (<option key={m} value={m}>{m}</option>))}
                  </select>
                </div>
              </div>

              {/* Prioridade, Data, Valor */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Prioridade</label>
                  <select
                    value={formEnvio.prioridade}
                    onChange={e => setFormEnvio(p => ({ ...p, prioridade: e.target.value as any }))}
                    className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value="normal">Normal</option>
                    <option value="urgente">Urgente</option>
                    <option value="muito_urgente">Muito Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Data Prevista Devolução</label>
                  <input type="date" value={formEnvio.dataPrevistaDevolucao} onChange={e => setFormEnvio(p => ({ ...p, dataPrevistaDevolucao: e.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Valor Orçado ({simboloMoeda})</label>
                  <input type="number" step="0.01" value={formEnvio.valorOrcado} onChange={e => setFormEnvio(p => ({ ...p, valorOrcado: e.target.value }))} onFocus={e => e.target.select()} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50" placeholder="0.00" />
                </div>
              </div>

              {/* Descrição */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Descrição do Trabalho *</label>
                <textarea value={formEnvio.descricao} onChange={e => setFormEnvio(p => ({ ...p, descricao: e.target.value }))} rows={3} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50 resize-none" placeholder="Descreva o trabalho a ser realizado..." />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Observações</label>
                <textarea value={formEnvio.observacoes} onChange={e => setFormEnvio(p => ({ ...p, observacoes: e.target.value }))} rows={2} className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50 resize-none" />
              </div>
            </div>

            <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-lighter)]">
              <button onClick={() => setModal(null)} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer">Cancelar</button>
              <button
                onClick={handleCriarEnvio}
                disabled={!formEnvio.laboratorioId || !formEnvio.utenteId || !formEnvio.tipoTrabalho || !formEnvio.descricao || criarEnvioMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white text-sm font-semibold hover:from-[#00E5FF] hover:to-violet-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                {criarEnvioMut.isPending ? "A criar..." : "Criar Envio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalhes do Envio */}
      {modal === "detalhesEnvio" && envioSelecionado && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setModal(null)}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-lighter)]">
              <div>
                <h2 className="text-lg font-bold text-[var(--text-primary)]">{envioSelecionado.tipoTrabalho}</h2>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">Envio #{envioSelecionado.id}</p>
              </div>
              <div className="flex items-center gap-2">
                <BadgeEstado estado={envioSelecionado.estado} />
                <button onClick={() => setModal(null)} className="p-2 rounded-lg hover:bg-[var(--bg-subtle)] text-[var(--text-muted)] cursor-pointer"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="p-5 space-y-5">
              {/* Barra de progresso */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-[var(--text-muted)]">Progresso</span>
                  <BadgePrioridade prioridade={envioSelecionado.prioridade} />
                </div>
                <WorkflowBar estadoAtual={envioSelecionado.estado} />
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Utente</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{envioSelecionado.utenteNome || "—"}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Laboratório</p>
                  <p className="text-sm font-semibold text-[var(--text-primary)]">{envioSelecionado.laboratorioNome || "—"}</p>
                </div>
                {envioSelecionado.dente && (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Dente(s)</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{envioSelecionado.dente}</p>
                  </div>
                )}
                {envioSelecionado.cor && (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Cor</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{envioSelecionado.cor}</p>
                  </div>
                )}
                {envioSelecionado.material && (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Material</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{envioSelecionado.material}</p>
                  </div>
                )}
                {envioSelecionado.dataPrevistaDevolucao && (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Previsão Devolução</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)]">{new Date(envioSelecionado.dataPrevistaDevolucao).toLocaleDateString("pt-PT")}</p>
                  </div>
                )}
                {envioSelecionado.valorOrcado && (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
                    <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Valor Orçado</p>
                    <p className="text-sm font-semibold text-emerald-400">{formatMoeda(Number(envioSelecionado.valorOrcado))}</p>
                  </div>
                )}
              </div>

              {/* Descrição */}
              {envioSelecionado.descricao && (
                <div>
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-1">Descrição</p>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl p-3">{envioSelecionado.descricao}</p>
                </div>
              )}

              {/* Timeline */}
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Histórico de Estados</p>
                <TimelineEstados historico={envioSelecionado.historicoEstados || []} />
              </div>

              {/* Ações */}
              {!["concluido", "cancelado"].includes(envioSelecionado.estado) && (
                <div className="pt-3 border-t border-[var(--border-lighter)]">
                  <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-3">Alterar Estado</p>
                  <div className="flex flex-wrap gap-2">
                    {proximosEstados.map(est => {
                      const cfg = ESTADOS_CONFIG[est];
                      if (!cfg) return null;
                      return (
                        <button
                          key={est}
                          onClick={() => { setNovoEstado(est); setModal("alterarEstado"); }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.cor} border ${cfg.border} hover:scale-105 transition-all cursor-pointer`}
                        >
                          <cfg.icone className="w-3.5 h-3.5" />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Alterar Estado */}
      {modal === "alterarEstado" && envioSelecionado && novoEstado && (
        <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => { setModal("detalhesEnvio"); setNovoEstado(""); }}>
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--border-lighter)]">
              <h3 className="text-base font-bold text-[var(--text-primary)]">Confirmar Alteração de Estado</h3>
              <div className="flex items-center gap-2 mt-2">
                <BadgeEstado estado={envioSelecionado.estado} />
                <ArrowRight className="w-4 h-4 text-[var(--text-muted)]" />
                <BadgeEstado estado={novoEstado} />
              </div>
            </div>
            <div className="p-5">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">Observação (opcional)</label>
              <textarea
                value={obsEstado}
                onChange={e => setObsEstado(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-[#00E5FF]/50 resize-none"
                placeholder="Adicione uma nota sobre esta alteração..."
              />
            </div>
            <div className="flex justify-end gap-3 p-5 border-t border-[var(--border-lighter)]">
              <button onClick={() => { setModal("detalhesEnvio"); setNovoEstado(""); }} className="px-4 py-2.5 rounded-xl text-sm font-semibold text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer">Cancelar</button>
              <button
                onClick={handleAlterarEstado}
                disabled={atualizarEstadoMut.isPending}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white text-sm font-semibold hover:from-[#00E5FF] hover:to-violet-500 transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                {atualizarEstadoMut.isPending ? "A atualizar..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
