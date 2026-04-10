/**
 * DashboardPage.tsx — Dashboard Principal Glassmorphism
 * DentCare Elite V35 — Navy + Neon Blue Design System
 *
 * Funcionalidades preservadas:
 * - KPIs com variação percentual (dados reais)
 * - Estatísticas avançadas: receita anual, tratamentos, retenção
 * - Relatório executivo: Top Utentes + Especialidades + Gráfico receita SVG
 * - Alertas prioritários com contagem crítica
 * - Feed de atividades em tempo real
 * - Próximas consultas com atalhos de acção
 * - Atalhos rápidos para acções frequentes
 *
 * Design: Glassmorphism, ícones HD com glow neon, paleta Navy + Neon Blue
 */
import React, { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import i18n from "../i18n";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import { useLocation } from "wouter";
import { LabNotificacoesDashboard } from "../components/LabNotificacoesDashboard";
import {
  Calendar, Users, Euro, TrendingUp, Bell, Settings,
  Clock, CheckCircle, AlertTriangle, Zap, Plus,
  MessageCircle, Phone, Activity, BarChart3,
  ArrowUp, ArrowDown, RefreshCw,
  Stethoscope, FileText, Heart,
  ChevronRight, Download,
  Search, Star, Award, Target, Percent,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Widget {
  id: string;
  titulo: string;
  tipo: "kpi" | "grafico" | "lista" | "calendario";
  visivel: boolean;
  ordem: number;
}

interface AtividadeItem {
  id: string;
  tipo: "consulta" | "pagamento" | "utente" | "alerta" | "sistema";
  titulo: string;
  descricao: string;
  timestamp: Date;
  icone: React.ComponentType<any>;
  cor: string;
  acao?: { label: string; href: string };
}

// ─── Mapeamento de ícones por tabela/acção ────────────────────────────────────
const ICONE_MAP: Record<string, React.ComponentType<any>> = {
  Calendar, Users, Euro, AlertTriangle, Zap, Activity,
  Plus: Plus, Edit: Settings, X: AlertTriangle, DollarSign: Euro,
};
const COR_MAP: Record<string, string> = {
  emerald: "text-[#00E5A0]",
  blue: "text-[#00D4FF]",
  red: "text-[#FF3366]",
  amber: "text-[#FFB800]",
  purple: "text-[#A78BFA]",
  cyan: "text-[#00D4FF]",
};

// ─── Nano Banana Neon Color Palette para KPIs ─────────────────────────────────
const NEON_COLORS = {
  cyan:    { text: '#00E5FF', bg: 'rgba(0, 229, 255, 0.07)',  border: 'rgba(0, 229, 255, 0.22)', glow: 'rgba(0, 229, 255, 0.18)' },
  emerald: { text: '#00F5A0', bg: 'rgba(0, 245, 160, 0.07)',  border: 'rgba(0, 245, 160, 0.22)', glow: 'rgba(0, 245, 160, 0.18)' },
  amber:   { text: '#FFD000', bg: 'rgba(255, 208, 0, 0.07)',  border: 'rgba(255, 208, 0, 0.22)', glow: 'rgba(255, 208, 0, 0.18)' },
  rose:    { text: '#FF2D6B', bg: 'rgba(255, 45, 107, 0.07)', border: 'rgba(255, 45, 107, 0.22)', glow: 'rgba(255, 45, 107, 0.18)' },
  violet:  { text: '#B388FF', bg: 'rgba(179, 136, 255, 0.07)', border: 'rgba(179, 136, 255, 0.22)', glow: 'rgba(179, 136, 255, 0.18)' },
  teal:    { text: '#00E5FF', bg: 'rgba(0, 229, 255, 0.07)',  border: 'rgba(0, 229, 255, 0.22)', glow: 'rgba(0, 229, 255, 0.18)' },
};

// ─── Componente: Widget KPI — Glassmorphism ──────────────────────────────────
function WidgetKPI({
  titulo, valor, unidade, icone: Icon, neon, variacao, descricao, onClick,
}: {
  titulo: string; valor: string | number; unidade?: string;
  icone: React.ComponentType<any>; neon: typeof NEON_COLORS.cyan;
  variacao?: { percentual: number; positivo: boolean }; descricao?: string; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="relative group cursor-pointer rounded-2xl p-5 transition-all duration-300 hover:translate-y-[-2px]"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: `1px solid ${neon.border}`,
        boxShadow: `var(--shadow-sm), 0 0 0 0 ${neon.glow}`,
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-md), 0 0 20px ${neon.glow}`;
        (e.currentTarget as HTMLElement).style.borderColor = neon.text;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `var(--shadow-sm), 0 0 0 0 ${neon.glow}`;
        (e.currentTarget as HTMLElement).style.borderColor = neon.border;
      }}
    >
      {/* Linha neon superior */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: `linear-gradient(90deg, transparent, ${neon.text}30, transparent)`, pointerEvents: 'none' }} />

      <div className="flex items-start justify-between mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: neon.bg, border: `1px solid ${neon.border}`, backdropFilter: 'blur(8px)' }}>
          <Icon className="w-5 h-5" style={{ color: neon.text, filter: `drop-shadow(0 0 6px ${neon.glow})` }} />
        </div>
        {variacao && (
          <div className="flex items-center gap-0.5 text-xs font-bold" style={{ color: variacao.positivo ? '#00E5A0' : '#FF3366' }}>
            {variacao.positivo ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {Math.abs(variacao.percentual)}%
          </div>
        )}
      </div>
      <p className="section-label mb-1">{titulo}</p>
      <div className="flex items-baseline gap-1">
        <p className="text-2xl font-black" style={{ color: neon.text, filter: `drop-shadow(0 0 4px ${neon.glow})` }}>{valor}</p>
        {unidade && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{unidade}</span>}
      </div>
      {descricao && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>{descricao}</p>}
    </div>
  );
}

// ─── Componente: Atalho Rápido — Glassmorphism ──────────────────────────────
function AtalhoRapido({
  titulo, descricao, icone: Icon, neon, acao,
}: {
  titulo: string; descricao: string; icone: React.ComponentType<any>;
  neon: typeof NEON_COLORS.cyan; acao: () => void;
}) {
  return (
    <button
      onClick={acao}
      className="rounded-xl p-4 text-left transition-all duration-250 group hover:translate-y-[-1px]"
      style={{
        background: neon.bg,
        border: `1px solid ${neon.border}`,
        backdropFilter: 'blur(8px)',
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 0 16px ${neon.glow}`;
        (e.currentTarget as HTMLElement).style.borderColor = neon.text;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = 'none';
        (e.currentTarget as HTMLElement).style.borderColor = neon.border;
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <Icon className="w-5 h-5" style={{ color: neon.text, filter: `drop-shadow(0 0 4px ${neon.glow})` }} />
        <ChevronRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: neon.text }} />
      </div>
      <p className="text-sm font-semibold mb-0.5" style={{ color: neon.text }}>{titulo}</p>
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{descricao}</p>
    </button>
  );
}

// ─── Componente: Gráfico de Barras SVG — Neon ──────────────────────────────
function GraficoBarrasSVG({
  dados, corBarra = "#00E5A0", corMeta = "#00D4FF", altura = 120, moedaSimbolo = "\u20AC",
}: {
  dados: { dia: string; receita: number; meta?: number }[];
  corBarra?: string; corMeta?: string; altura?: number; moedaSimbolo?: string;
}) {
  if (!dados || dados.length === 0) {
    return <p className="text-xs text-center py-4" style={{ color: 'var(--text-muted)' }}>Sem dados disponíveis</p>;
  }
  const maxVal = Math.max(...dados.map(d => Math.max(d.receita, d.meta ?? 0)), 1);
  // Mostrar label apenas a cada N dias para não sobrepor
  const labelStep = dados.length > 20 ? 5 : dados.length > 10 ? 3 : 1;
  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 400 ${altura + 30}`} className="w-full" style={{ minHeight: altura + 30 }}>
        <defs>
          <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={corBarra} stopOpacity="0.9" />
            <stop offset="100%" stopColor={corBarra} stopOpacity="0.4" />
          </linearGradient>
          <filter id="barGlow">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {dados.map((d, i) => {
          const colW = 400 / dados.length;
          // Largura máxima de 28px por barra para evitar borrões com poucos dados
          const barW = Math.min(colW * 0.65, 28);
          const x = i * colW;
          const barH = (d.receita / maxVal) * altura;
          const metaH = d.meta ? (d.meta / maxVal) * altura : 0;
          const barX = x + (colW - barW) / 2;
          return (
            <g key={i}>
              <rect x={barX} y={altura - barH} width={barW} height={barH} rx="4" fill="url(#barGradient)" filter="url(#barGlow)" />
              {d.meta && metaH > 0 && (
                <line x1={barX} y1={altura - metaH} x2={barX + barW} y2={altura - metaH} stroke={corMeta} strokeWidth="1.5" strokeDasharray="3,2" opacity="0.6" />
              )}
              {i % labelStep === 0 && (
                <text x={barX + barW / 2} y={altura + 16} textAnchor="middle" fontSize="8" fill="var(--text-tertiary, #7A94AD)">{d.dia}</text>
              )}
              {barH > 12 && (
                <text x={barX + barW / 2} y={altura - barH - 3} textAnchor="middle" fontSize="7" fill={corBarra} fontWeight="600">
                  {moedaSimbolo}{d.receita >= 1000 ? `${(d.receita / 1000).toFixed(1)}k` : d.receita.toFixed(0)}
                </text>
              )}
            </g>
          );
        })}
        <line x1="0" y1={altura} x2="400" y2={altura} stroke="rgba(0, 212, 255, 0.06)" strokeWidth="1" />
      </svg>
    </div>
  );
}

// ─── Componente: Barra de Progresso — Neon ──────────────────────────────────
function BarraProgresso({
  label, valor, total, cor, percentual,
}: {
  label: string; valor: number; total: number; cor: string; percentual?: number;
}) {
  const pct = percentual ?? (total > 0 ? Math.round((valor / total) * 100) : 0);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{valor} <span style={{ color: 'var(--text-muted)' }} className="font-normal">({pct}%)</span></span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
        <div className={`h-full ${cor} rounded-full transition-all duration-700`} style={{ width: `${pct}%`, boxShadow: '0 0 6px rgba(0, 212, 255, 0.15)' }} />
      </div>
    </div>
  );
}

// ─── Componente: Card de Estatística — Glassmorphism ────────────────────────
function StatCard({
  titulo, valor, icone: Icon, neon,
}: {
  titulo: string; valor: string | number; icone: React.ComponentType<any>; neon: typeof NEON_COLORS.cyan;
}) {
  return (
    <div className="rounded-xl p-4 flex items-center gap-3 transition-all duration-200"
      style={{
        background: neon.bg,
        border: `1px solid ${neon.border}`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ background: neon.bg, border: `1px solid ${neon.border}` }}
      >
        <Icon className="w-4 h-4" style={{ color: neon.text, filter: `drop-shadow(0 0 4px ${neon.glow})` }} />
      </div>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{titulo}</p>
        <p className="text-lg font-black leading-tight" style={{ color: neon.text }}>{valor}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════
export function DashboardPage() {
  const { simboloMoeda: sm, formatMoeda } = useConfig();
  const { t } = useTranslation();
  const [, navigate] = useLocation();
  const [tab, setTab] = useState<"visao-geral" | "relatorio" | "atividades" | "configurar">("visao-geral");
  const [widgets, setWidgets] = useState<Widget[]>([
    { id: "kpis",        titulo: "KPIs Principais",     tipo: "kpi",     visivel: true, ordem: 1 },
    { id: "stats",       titulo: "Estatísticas Avançadas", tipo: "kpi",  visivel: true, ordem: 2 },
    { id: "atalhos",     titulo: "Atalhos Rápidos",     tipo: "lista",   visivel: true, ordem: 3 },
    { id: "proximas",    titulo: "Próximas Consultas",  tipo: "lista",   visivel: true, ordem: 4 },
    { id: "alertas",     titulo: "Alertas",             tipo: "lista",   visivel: true, ordem: 5 },
    { id: "tendencias",  titulo: "Tendências",          tipo: "grafico", visivel: true, ordem: 6 },
  ]);
  const [filtroAtividades, setFiltroAtividades] = useState<"todos" | "consultas" | "pagamentos" | "alertas">("todos");
  const [pesquisaAtividades, setPesquisaAtividades] = useState("");

  const filtroParaEndpoint = (f: typeof filtroAtividades): "todas" | "utentes" | "tratamentos" | "financeiro" => {
    if (f === "consultas") return "tratamentos";
    if (f === "pagamentos") return "financeiro";
    if (f === "alertas") return "financeiro";
    return "todas";
  };

  // ── Queries ──────────────────────────────────────────────────────────────────
  const alertasQuery       = trpc.dashboard.obterAlertas.useQuery();
  const graficoReceitaQuery = trpc.dashboard.obterGraficoReceita.useQuery();
  const estatisticasQuery  = trpc.dashboard.obterEstatisticas.useQuery();
  const topUtentesQuery    = trpc.dashboard.obterTopUtentes.useQuery();
  const especialidadesQuery = trpc.dashboard.obterEspecialidades.useQuery();
  const atividadesQuery    = trpc.dashboard.obterAtividades.useQuery({
    limite: 50, offset: 0, filtro: filtroParaEndpoint(filtroAtividades),
  });
  const consultasQuery = trpc.consultas.listarConsultas.useQuery({
    dataInicio: new Date().toISOString(),
    dataFim: new Date(Date.now() + 86400000).toISOString(),
  } as any);
  const utentesQuery = trpc.utentes.list.useQuery();

  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

  const resumoQuery = trpc.financeiro.obterResumo.useQuery({
    startDate: inicioMes.toISOString(), endDate: hoje.toISOString(),
  } as any);
  const resumoMesAnteriorQuery = trpc.financeiro.obterResumo.useQuery({
    startDate: inicioMesAnterior.toISOString(), endDate: fimMesAnterior.toISOString(),
  } as any);

  // ── Dados derivados ───────────────────────────────────────────────────────────
  const consultas     = (consultasQuery.data as any)?.consultas ?? [];
  const utentes       = (utentesQuery.data as any)?.utentes ?? [];
  const resumo        = resumoQuery.data as any;
  const resumoMesAnterior = resumoMesAnteriorQuery.data as any;
  const stats         = (estatisticasQuery.data as any)?.stats ?? {};
  const topUtentes    = (topUtentesQuery.data as any)?.utentes ?? [];
  const especialidades = (especialidadesQuery.data as any)?.especialidades ?? [];
  const dadosReceita  = (graficoReceitaQuery.data as any)?.dados ?? [];

  const consultasHoje        = consultas.length;
  const consultasConfirmadas = consultas.filter((c: any) => c.estado === "confirmada").length;
  const consultasPendentes   = consultas.filter((c: any) => c.estado === "agendada").length;
  const consultasRealizadas  = consultas.filter((c: any) => c.estado === "realizada").length;
  const consultasCanceladas  = consultas.filter((c: any) => c.estado === "cancelada").length;
  const receitaMes           = Number(resumo?.totalFaturado ?? stats.receitaMes ?? 0);
  const receitaMesAnterior   = Number(resumoMesAnterior?.totalFaturado ?? 0);
  const variacaoReceita      = receitaMesAnterior > 0
    ? ((receitaMes - receitaMesAnterior) / receitaMesAnterior) * 100 : 0;
  const totalUtentes         = utentes.length || stats.utentesAtivos || 0;
  const utentesNovos         = utentes.filter((u: any) => {
    const d = new Date(u.dataRegistro);
    return d.getMonth() === hoje.getMonth() && d.getFullYear() === hoje.getFullYear();
  }).length;
  const receitaAno           = Number(stats.receitaAno ?? 0);
  const taxaRetencao         = Number(stats.taxaRetencao ?? 0);
  const tratamentosAndamento = Number(stats.tratamentosEmAndamento ?? 0);
  const pagamentosPendentes  = Number(stats.pagamentosPendentes ?? 0);

  // Atividades filtradas
  const atividadesFiltradas = useMemo(() => {
    const raw = (atividadesQuery.data as any)?.atividades ?? [];
    return raw
      .filter((a: any) => {
        if (!pesquisaAtividades) return true;
        const texto = `${a.descricao ?? ""} ${a.acao ?? ""} ${a.tabela ?? ""}`.toLowerCase();
        return texto.includes(pesquisaAtividades.toLowerCase());
      })
      .map((a: any) => ({
        id: String(a.id),
        tipo: (a.tabela === "faturas" || a.tabela === "recibos" ? "pagamento" :
               a.tabela === "consultas" ? "consulta" :
               a.tabela === "utentes" ? "utente" : "sistema") as AtividadeItem["tipo"],
        titulo: a.descricao ?? `${a.acao} em ${a.tabela}`,
        descricao: `${a.tabela} · por ${a.usuario ?? "sistema"}`,
        timestamp: new Date(a.data),
        icone: ICONE_MAP[a.icone ?? "Activity"] ?? Activity,
        cor: COR_MAP[a.cor ?? "blue"] ?? "text-[#00D4FF]",
      }));
  }, [atividadesQuery.data, pesquisaAtividades]);

  const toggleWidget = (id: string) => {
    setWidgets(prev => prev.map(w => w.id === id ? { ...w, visivel: !w.visivel } : w));
  };

  const TABS = [
    { id: "visao-geral", label: t('dashboard.tabs.overview'),   icon: BarChart3 },
    { id: "relatorio",   label: t('dashboard.tabs.report'),     icon: FileText },
    { id: "atividades",  label: t('dashboard.tabs.activities'), icon: Activity },
    { id: "configurar",  label: t('dashboard.tabs.configure'),  icon: Settings },
  ] as const;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">{t('dashboard.title')}</h1>
          <p className="page-header-subtitle">
            {t('dashboard.subtitle')} · {hoje.toLocaleDateString(i18n.language.replace('pt-PT', 'pt-PT').replace('pt-BR', 'pt-BR').replace('en-GB', 'en-GB').replace('en-US', 'en-US').replace('es-ES', 'es-ES').replace('fr-FR', 'fr-FR'), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => { consultasQuery.refetch(); estatisticasQuery.refetch(); }}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
            title="Actualizar dados"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              backdropFilter: 'blur(8px)',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.30)';
              (e.currentTarget as HTMLElement).style.color = '#00D4FF';
              (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(0, 212, 255, 0.10)';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-light)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
              (e.currentTarget as HTMLElement).style.boxShadow = 'none';
            }}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer"
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--border-light)',
              color: 'var(--text-muted)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <Bell className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Tabs — Glassmorphism ── */}
      <div className="flex gap-1 flex-wrap pb-1" style={{ borderBottom: '1px solid var(--border-lighter)' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
            style={tab === id ? {
              background: 'rgba(0, 212, 255, 0.10)',
              color: '#00D4FF',
              border: '1px solid rgba(0, 212, 255, 0.25)',
              backdropFilter: 'blur(8px)',
              boxShadow: '0 0 8px rgba(0, 212, 255, 0.08)',
            } : {
              background: 'transparent',
              color: 'var(--text-tertiary)',
              border: '1px solid transparent',
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Visão Geral
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "visao-geral" && (
        <div className="space-y-5">

          {/* KPIs Principais — Glassmorphism com Neon Glow */}
          {widgets.find(w => w.id === "kpis")?.visivel && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <WidgetKPI
                titulo={t('dashboard.metrics.consultationsToday')}
                valor={consultasHoje}
                icone={Calendar}
                neon={NEON_COLORS.cyan}
                variacao={{ percentual: Math.round(Math.abs(variacaoReceita)), positivo: variacaoReceita >= 0 }}
                descricao={`${consultasConfirmadas} ${t('dashboard.metrics.confirmed')} · ${consultasPendentes} ${t('dashboard.metrics.pending')}`}
                onClick={() => navigate("/agenda")}
              />
              <WidgetKPI
                titulo={t('dashboard.metrics.totalPatients')}
                valor={totalUtentes}
                icone={Users}
                neon={NEON_COLORS.violet}
                variacao={{ percentual: utentesNovos, positivo: true }}
                descricao={`${utentesNovos} ${t('dashboard.metrics.newThisMonth')}`}
                onClick={() => navigate("/utentes")}
              />
              <WidgetKPI
                titulo={t('dashboard.metrics.monthlyRevenue')}
                valor={`${sm}${receitaMes.toLocaleString(i18n.language, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
                icone={Euro}
                neon={NEON_COLORS.emerald}
                variacao={{ percentual: Math.round(Math.abs(variacaoReceita)), positivo: variacaoReceita >= 0 }}
                descricao={variacaoReceita >= 0 ? `+${variacaoReceita.toFixed(1)}% ${t('dashboard.metrics.vsLastMonth')}` : `${variacaoReceita.toFixed(1)}% ${t('dashboard.metrics.vsLastMonth')}`}
                onClick={() => navigate("/financeiro?tab=recebimentos")}
              />
              <WidgetKPI
                titulo={t('dashboard.metrics.retentionRate')}
                valor={`${taxaRetencao.toFixed(1)}%`}
                icone={Heart}
                neon={NEON_COLORS.rose}
                descricao={t('dashboard.metrics.patientsLast6Months')}
                 onClick={() => navigate("/utentes")}
              />
            </div>
          )}

          {/* Estatísticas Avançadas — Glassmorphism */}
          {widgets.find(w => w.id === "stats")?.visivel && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCard titulo={t('dashboard.metrics.annualRevenue')}     valor={`${sm}${(receitaAno/1000).toFixed(1)}k`}  icone={TrendingUp} neon={NEON_COLORS.emerald} />
              <StatCard titulo={t('dashboard.metrics.inTreatment')}        valor={tratamentosAndamento}                   icone={Stethoscope} neon={NEON_COLORS.cyan} />
              <StatCard titulo={t('dashboard.metrics.tomorrow')}           valor={stats.consultasAmanha ?? 0}             icone={Calendar}    neon={NEON_COLORS.violet} />
              <StatCard titulo={t('dashboard.metrics.pendingCollection')}  valor={`${sm}${(pagamentosPendentes/1000).toFixed(1)}k`} icone={AlertTriangle} neon={NEON_COLORS.amber} />
              <StatCard titulo={t('dashboard.metrics.confirmation')}       valor={`${consultasHoje > 0 ? Math.round((consultasConfirmadas/consultasHoje)*100) : 0}%`} icone={CheckCircle} neon={NEON_COLORS.teal} />
              <StatCard titulo={t('dashboard.metrics.criticalAlerts')}     valor={(alertasQuery.data as any)?.criticos ?? 0} icone={Zap} neon={NEON_COLORS.rose} />
            </div>
          )}

          {/* Notificações de Laboratório */}
          <LabNotificacoesDashboard />

          {/* Atalhos Rápidos — Glassmorphism */}
          {widgets.find(w => w.id === "atalhos")?.visivel && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('dashboard.shortcuts.title')}</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <AtalhoRapido titulo={t('dashboard.shortcuts.newConsultation')}  descricao={t('dashboard.shortcuts.scheduleConsultation')} icone={Plus}          neon={NEON_COLORS.cyan}    acao={() => navigate("/agenda")} />
                <AtalhoRapido titulo={t('dashboard.shortcuts.newPatient')}       descricao={t('dashboard.shortcuts.registerPatient')}      icone={Users}         neon={NEON_COLORS.violet}  acao={() => navigate("/utentes")} />
                <AtalhoRapido titulo={t('dashboard.shortcuts.sendWhatsapp')}     descricao={t('dashboard.shortcuts.massCampaigns')}         icone={MessageCircle} neon={NEON_COLORS.emerald} acao={() => navigate("/marketing")} />
                <AtalhoRapido titulo={t('dashboard.shortcuts.viewAlerts')}       descricao={t('dashboard.shortcuts.patientsAtRisk')}        icone={AlertTriangle} neon={NEON_COLORS.amber}   acao={() => navigate("/alertas")} />
                <AtalhoRapido titulo={t('dashboard.shortcuts.reports')}          descricao={t('dashboard.shortcuts.dataAnalysis')}          icone={BarChart3}     neon={NEON_COLORS.cyan}    acao={() => setTab("relatorio")} />
              </div>
            </div>
          )}

          {/* Próximas Consultas — Glassmorphism */}
          {widgets.find(w => w.id === "proximas")?.visivel && (
            <div className="card-premium overflow-hidden">
              <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-lighter)' }}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))' }} />
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('dashboard.sections.upcomingConsultations')}</h2>
                </div>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{consultasHoje} {t('dashboard.sections.total')}</span>
              </div>
              {consultas.length === 0 ? (
                <div className="p-8 flex flex-col items-center justify-center text-center">
                  <Calendar className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{t('dashboard.sections.noConsultationsToday')}</p>
                </div>
              ) : (
                <div style={{ borderColor: 'var(--border-lightest)' }}>
                  {consultas.slice(0, 6).map((c: any) => (
                    <div key={c.id} className="flex items-center gap-4 p-4 transition-colors group" style={{ borderBottom: '1px solid var(--border-lightest)' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.03)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                        style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.20)' }}>
                        <Calendar className="w-4 h-4" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{c.utenteNome ?? "—"}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap text-xs" style={{ color: 'var(--text-muted)' }}>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {c.medicoNome && (
                            <span className="flex items-center gap-1">
                              <Stethoscope className="w-3 h-3" />
                              {c.medicoNome}
                            </span>
                          )}
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold" style={
                            c.estado === "confirmada" ? { background: 'rgba(0, 229, 160, 0.10)', color: '#00E5A0', border: '1px solid rgba(0, 229, 160, 0.20)' } :
                            c.estado === "cancelada"  ? { background: 'rgba(255, 51, 102, 0.10)', color: '#FF6688', border: '1px solid rgba(255, 51, 102, 0.20)' } :
                            { background: 'rgba(0, 212, 255, 0.10)', color: '#00D4FF', border: '1px solid rgba(0, 212, 255, 0.20)' }
                          }>{c.estado}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'rgba(0, 212, 255, 0.08)', border: '1px solid rgba(0, 212, 255, 0.20)', color: '#00D4FF' }}>
                          <Phone className="w-3.5 h-3.5" />
                        </button>
                        <button className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors"
                          style={{ background: 'rgba(0, 229, 160, 0.08)', border: '1px solid rgba(0, 229, 160, 0.20)', color: '#00E5A0' }}>
                          <MessageCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Alertas Prioritários — Glassmorphism */}
          {widgets.find(w => w.id === "alertas")?.visivel && (
            <div className="card-premium overflow-hidden">
              <div className="p-5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-lighter)' }}>
                <AlertTriangle className="w-4 h-4" style={{ color: '#FFB800', filter: 'drop-shadow(0 0 4px rgba(255, 184, 0, 0.3))' }} />
                  <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('dashboard.sections.priorityAlerts')}</h2>
                {((alertasQuery.data as any)?.criticos ?? 0) > 0 && (
                  <span className="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(255, 51, 102, 0.10)', color: '#FF6688', border: '1px solid rgba(255, 51, 102, 0.20)' }}>
                    {(alertasQuery.data as any)?.criticos} críticos
                  </span>
                )}
              </div>
              <div>
                {((alertasQuery.data as any)?.alertas ?? []).length === 0 ? (
                  <div className="p-6 text-center">
                    <CheckCircle className="w-6 h-6 mx-auto mb-2" style={{ color: '#00E5A0' }} />
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem alertas activos</p>
                  </div>
                ) : (
                  ((alertasQuery.data as any)?.alertas ?? []).slice(0, 5).map((a: any) => {
                    const neon = a.prioridade === "critica" ? NEON_COLORS.rose : a.prioridade === "alta" ? NEON_COLORS.amber : NEON_COLORS.cyan;
                    return (
                      <div key={a.id} className="flex items-start gap-3 p-4 transition-colors group"
                        style={{ borderBottom: '1px solid var(--border-lightest)' }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                          style={{ background: neon.bg, border: `1px solid ${neon.border}` }}>
                          <AlertTriangle className="w-3.5 h-3.5" style={{ color: neon.text, filter: `drop-shadow(0 0 4px ${neon.glow})` }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium" style={{ color: neon.text }}>{a.utenteNome}</p>
                          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{a.descricao}</p>
                          <p className="text-[10px] mt-0.5 italic" style={{ color: 'var(--text-tertiary)' }}>{a.acao}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0"
                          style={{ background: neon.bg, color: neon.text, border: `1px solid ${neon.border}` }}>
                          {a.prioridade}
                        </span>
                      </div>
                    );
                  })
                )}
                {((alertasQuery.data as any)?.total ?? 0) > 5 && (
                  <div className="p-3 text-center">
                    <a href="/alertas" className="text-xs font-semibold hover:underline" style={{ color: '#00D4FF' }}>
                      Ver todos os {(alertasQuery.data as any)?.total} alertas →
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tendências — Glassmorphism */}
          {widgets.find(w => w.id === "tendencias")?.visivel && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Gráfico Receita */}
              <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" style={{ color: '#00E5A0', filter: 'drop-shadow(0 0 4px rgba(0, 229, 160, 0.3))' }} />
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('dashboard.sections.revenueLast30Days')}</h2>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#00E5A0' }}>
                    {sm}{dadosReceita.reduce((s: number, d: any) => s + Number(d.receita), 0).toLocaleString("pt-PT")}
                  </span>
                </div>
                {graficoReceitaQuery.isLoading ? (
                  <div className="h-32 flex items-center justify-center">
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>A carregar...</p>
                  </div>
                ) : (
                  <GraficoBarrasSVG dados={dadosReceita.slice(-14)} corBarra="#00E5A0" corMeta="#00D4FF" altura={100} moedaSimbolo={sm} />
                )}
                <div className="flex items-center gap-4 mt-3 pt-3" style={{ borderTop: '1px solid var(--border-lightest)' }}>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3 h-2 rounded" style={{ background: '#00E5A0', opacity: 0.85 }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Receita</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-3" style={{ borderTop: '1.5px dashed #00D4FF', opacity: 0.7 }} />
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Meta diária</span>
                  </div>
                </div>
              </div>

              {/* Consultas de Hoje por Estado */}
              <div className="card-premium p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))' }} />
                    <h2 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{t('dashboard.sections.consultationsByStatus')}</h2>
                  </div>
                  <span className="text-xs font-bold" style={{ color: '#00D4FF' }}>{consultasHoje} {t('dashboard.sections.total')}</span>
                </div>
                <div className="space-y-3">
                  <BarraProgresso label={t('dashboard.sections.statusConfirmed')} valor={consultasConfirmadas} total={consultasHoje} cor="bg-[#00E5A0]" />
                  <BarraProgresso label={t('dashboard.sections.statusPending')}   valor={consultasPendentes}   total={consultasHoje} cor="bg-[#FFB800]" />
                  <BarraProgresso label={t('dashboard.sections.statusCompleted')} valor={consultasRealizadas}  total={consultasHoje} cor="bg-[#00E5FF]" />
                  <BarraProgresso label={t('dashboard.sections.statusCanceled')}  valor={consultasCanceladas}  total={consultasHoje} cor="bg-[#FF3366]" />
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Relatório Executivo
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "relatorio" && (
        <div className="space-y-5">
          {/* Cabeçalho do Relatório — Glassmorphism com gradiente neon */}
          <div className="card-premium p-6 relative overflow-hidden"
            style={{ border: '1px solid rgba(0, 212, 255, 0.20)' }}>
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(0, 212, 255, 0.04) 0%, rgba(0, 229, 160, 0.03) 100%)', pointerEvents: 'none' }} />
            <div className="flex items-center justify-between flex-wrap gap-3 relative z-10">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 6px rgba(0, 212, 255, 0.4))' }} />
                  <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>Relatório Executivo</h2>
                </div>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Análise completa de desempenho · {hoje.toLocaleDateString("pt-PT", { month: "long", year: "numeric" })}
                </p>
              </div>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                style={{
                  background: 'rgba(0, 212, 255, 0.10)',
                  border: '1px solid rgba(0, 212, 255, 0.25)',
                  color: '#00D4FF',
                  backdropFilter: 'blur(8px)',
                }}
              >
                <Download className="w-3.5 h-3.5" />
                Exportar Relatório
              </button>
            </div>
          </div>

          {/* KPIs do Relatório */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card-premium p-5" style={{ border: '1px solid rgba(0, 229, 160, 0.20)' }}>
              <p className="section-label mb-2">Receita Mensal</p>
              <p className="text-3xl font-black" style={{ color: '#00E5A0', filter: 'drop-shadow(0 0 4px rgba(0, 229, 160, 0.2))' }}>{sm}{receitaMes.toLocaleString("pt-PT", { minimumFractionDigits: 0 })}</p>
              <p className="text-xs mt-1 flex items-center gap-1" style={{ color: variacaoReceita >= 0 ? '#00E5A0' : '#FF3366' }}>
                {variacaoReceita >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                {Math.abs(variacaoReceita).toFixed(1)}% vs mês anterior
              </p>
            </div>
            <div className="card-premium p-5" style={{ border: '1px solid rgba(0, 212, 255, 0.20)' }}>
              <p className="section-label mb-2">Receita Anual</p>
              <p className="text-3xl font-black" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.2))' }}>{sm}{receitaAno.toLocaleString("pt-PT", { minimumFractionDigits: 0 })}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Acumulado {hoje.getFullYear()}</p>
            </div>
            <div className="card-premium p-5" style={{ border: '1px solid rgba(0, 229, 255, 0.1)' }}>
              <p className="section-label mb-2">Utentes Activos</p>
              <p className="text-3xl font-black" style={{ color: '#00E5FF' }}>{totalUtentes}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{utentesNovos} novos este mês</p>
            </div>
            <div className="card-premium p-5" style={{ border: '1px solid rgba(255, 51, 102, 0.20)' }}>
              <p className="section-label mb-2">Taxa de Retenção</p>
              <p className="text-3xl font-black" style={{ color: '#FF3366', filter: 'drop-shadow(0 0 4px rgba(255, 51, 102, 0.2))' }}>{taxaRetencao.toFixed(1)}%</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Últimos 6 meses</p>
            </div>
          </div>

          {/* Gráfico de Receita Completo */}
          <div className="card-premium p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" style={{ color: '#00E5A0', filter: 'drop-shadow(0 0 4px rgba(0, 229, 160, 0.3))' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Evolução da Receita — Últimos 30 dias</h3>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-2 rounded" style={{ background: '#00E5A0', opacity: 0.85 }} />
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Receita</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3" style={{ borderTop: '2px dashed #00D4FF', opacity: 0.7 }} />                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{t('dashboard.sections.noData')}</span>
                </div>
              </div>
            </div>
            {graficoReceitaQuery.isLoading ? (
              <div className="h-40 flex items-center justify-center">
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>A carregar dados...</p>
              </div>
            ) : (
              <GraficoBarrasSVG dados={dadosReceita} corBarra="#00E5A0" corMeta="#00D4FF" altura={140} moedaSimbolo={sm} />
            )}
          </div>

          {/* Top Utentes + Especialidades */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top 5 Utentes por Receita */}
            <div className="card-premium overflow-hidden">
              <div className="p-5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-lighter)' }}>
                <Star className="w-4 h-4" style={{ color: '#FFB800', filter: 'drop-shadow(0 0 4px rgba(255, 184, 0, 0.3))' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Top 5 Utentes por Receita</h3>
              </div>
              {topUtentesQuery.isLoading ? (
                <div className="p-6 text-center"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>A carregar...</p></div>
              ) : topUtentes.length === 0 ? (
                <div className="p-6 text-center"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados disponíveis</p></div>
              ) : (
                <div>
                  {topUtentes.map((u: any, i: number) => {
                    const medalNeon = i === 0 ? NEON_COLORS.amber : i === 1 ? { text: '#94A3B8', bg: 'rgba(148, 163, 184, 0.10)', border: 'rgba(148, 163, 184, 0.25)', glow: 'rgba(148, 163, 184, 0.15)' } : i === 2 ? { text: '#FB923C', bg: 'rgba(251, 146, 60, 0.10)', border: 'rgba(251, 146, 60, 0.25)', glow: 'rgba(251, 146, 60, 0.15)' } : { text: 'var(--text-muted)', bg: 'var(--glass-bg-light)', border: 'var(--border-lighter)', glow: 'transparent' };
                    return (
                      <div key={u.id} className="flex items-center gap-3 p-4 transition-colors cursor-pointer"
                        style={{ borderBottom: '1px solid var(--border-lightest)' }}
                        onClick={() => navigate(`/utentes?utenteId=${u.id}`)}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0, 212, 255, 0.03)'}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
                      >
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                          style={{ background: medalNeon.bg, color: medalNeon.text, border: `1px solid ${medalNeon.border}` }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{u.nome}</p>
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{u.consultas ?? 0} consultas</p>
                        </div>
                        <p className="text-sm font-bold shrink-0" style={{ color: '#00E5A0' }}>
                          {sm}{Number(u.receita).toLocaleString("pt-PT", { minimumFractionDigits: 0 })}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Especialidades Mais Procuradas */}
            <div className="card-premium overflow-hidden">
              <div className="p-5 flex items-center gap-2" style={{ borderBottom: '1px solid var(--border-lighter)' }}>
                <Award className="w-4 h-4" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))' }} />
                <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Especialidades Mais Procuradas</h3>
              </div>
              {especialidadesQuery.isLoading ? (
                <div className="p-6 text-center"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>A carregar...</p></div>
              ) : especialidades.length === 0 ? (
                <div className="p-6 text-center"><p className="text-xs" style={{ color: 'var(--text-muted)' }}>Sem dados disponíveis</p></div>
              ) : (
                <div className="p-5 space-y-3">
                  {especialidades.map((e: any, i: number) => {
                    const cores = ["bg-[#00E5FF]", "bg-[#00E5FF]", "bg-[#00E5A0]", "bg-[#FFB800]", "bg-[#FF3366]"];
                    return (
                      <div key={i}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{e.nome}</span>
                          <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{e.total} <span style={{ color: 'var(--text-muted)' }} className="font-normal">({e.percentual}%)</span></span>
                        </div>
                        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-subtle)' }}>
                          <div className={`h-full ${cores[i % cores.length]} rounded-full transition-all duration-700`} style={{ width: `${e.percentual}%`, boxShadow: '0 0 6px rgba(0, 212, 255, 0.15)' }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Resumo de Operações — Glassmorphism */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4" style={{ color: '#00D4FF', filter: 'drop-shadow(0 0 4px rgba(0, 212, 255, 0.3))' }} />
              <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Resumo Operacional</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Consultas Hoje",       valor: consultasHoje,          sub: "agendadas",          neon: NEON_COLORS.cyan },
                { label: "Em Tratamento",         valor: tratamentosAndamento,   sub: "tratamentos activos", neon: NEON_COLORS.teal },
                { label: "Pendente Cobrar",       valor: `${sm}${(pagamentosPendentes/1000).toFixed(1)}k`, sub: "em dívida", neon: NEON_COLORS.amber },
                { label: "Alertas Activos",       valor: (alertasQuery.data as any)?.total ?? 0, sub: "requerem atenção", neon: NEON_COLORS.rose },
              ].map((item, i) => (
                <div key={i} className="text-center p-4 rounded-xl"
                  style={{ background: item.neon.bg, border: `1px solid ${item.neon.border}`, backdropFilter: 'blur(8px)' }}>
                  <p className="text-2xl font-black" style={{ color: item.neon.text }}>{item.valor}</p>
                  <p className="text-xs font-medium mt-1" style={{ color: 'var(--text-secondary)' }}>{item.label}</p>
                  <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Actividades
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "atividades" && (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Pesquisar atividades..."
                value={pesquisaAtividades}
                onChange={e => setPesquisaAtividades(e.target.value)}
                className="input-premium w-full pl-9 pr-4"
              />
            </div>
            <div className="flex gap-1">
              {(["todos", "consultas", "pagamentos", "alertas"] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFiltroAtividades(f)}
                  className="px-3 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                  style={filtroAtividades === f ? {
                    background: 'rgba(0, 212, 255, 0.10)',
                    color: '#00D4FF',
                    border: '1px solid rgba(0, 212, 255, 0.25)',
                    backdropFilter: 'blur(8px)',
                  } : {
                    background: 'var(--glass-bg-light)',
                    border: '1px solid var(--border-lighter)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  {f === "todos" ? "Todas" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {atividadesFiltradas.length === 0 ? (
              <div className="card-premium p-12 flex flex-col items-center justify-center text-center">
                <Activity className="w-8 h-8 mb-3" style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Sem atividades</p>
              </div>
            ) : (
              atividadesFiltradas.map((a: any) => {
                const Icon = a.icone;
                const tempoDecorrido = Math.floor((Date.now() - a.timestamp.getTime()) / 60000);
                const textoTempo = tempoDecorrido < 60
                  ? `há ${tempoDecorrido}m`
                  : tempoDecorrido < 1440
                  ? `há ${Math.floor(tempoDecorrido / 60)}h`
                  : `há ${Math.floor(tempoDecorrido / 1440)}d`;
                return (
                  <div key={a.id} className="card-premium p-4 transition-all group hover:translate-y-[-1px]"
                    style={{ border: '1px solid var(--border-lighter)' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 212, 255, 0.15)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-lighter)'}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                        style={{ background: 'rgba(0, 212, 255, 0.06)', border: '1px solid var(--border-light)' }}>
                        <Icon className={`w-4 h-4 ${a.cor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${a.cor}`}>{a.titulo}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{a.descricao}</p>
                        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>{textoTempo}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          Tab: Configurar
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "configurar" && (
        <div className="space-y-4">
          <div className="card-premium p-5">
            <h2 className="font-semibold text-sm mb-4" style={{ color: 'var(--text-primary)' }}>Widgets Visíveis</h2>
            <div className="space-y-2">
              {widgets.map(w => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-xl"
                  style={{ background: 'var(--glass-bg-light)', border: '1px solid var(--border-lightest)' }}>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{w.titulo}</p>
                  <button
                    onClick={() => toggleWidget(w.id)}
                    className="w-11 h-6 rounded-full transition-all relative cursor-pointer"
                    style={w.visivel ? {
                      background: 'linear-gradient(135deg, #00D4FF, #0099CC)',
                      boxShadow: '0 0 8px rgba(0, 212, 255, 0.30)',
                    } : {
                      background: 'rgba(0, 212, 255, 0.08)',
                    }}
                  >
                    <div className={`absolute top-0.5 w-5 h-5 rounded-full shadow transition-all ${w.visivel ? "left-5.5 translate-x-0.5" : "left-0.5"}`}
                      style={{ background: w.visivel ? '#060D1B' : 'var(--text-muted)' }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
