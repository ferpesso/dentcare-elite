/**
 * RelatoriosPage.tsx — Relatórios Executivos e de Retenção
 * DentCare Elite V35.5
 *
 * Funcionalidades:
 * - Dashboard Executivo: KPIs de consultas, faturação, utentes e equipa por período
 * - Relatório de Retenção: Utentes inativos com link direto para ficha
 * - Exportação CSV da lista de utentes inativos
 */
import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  FileBarChart, Calendar, Users, Euro, Stethoscope,
  UserCog, TrendingUp, TrendingDown, AlertCircle,
  RefreshCw, Download, Phone, ExternalLink, Loader2,
  BarChart3, Activity, Target, Clock, ChevronRight,
  Filter, Search, CheckCircle2, XCircle,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatarData(d: Date | string): string {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatarMoeda(valor: number): string {
  return new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR" }).format(valor);
}

function diasDesde(d: Date | string): number {
  const dt = typeof d === "string" ? new Date(d) : d;
  return Math.floor((Date.now() - dt.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KpiCard({ label, valor, icon: Icon, cor, sub }: {
  label: string;
  valor: string | number;
  icon: React.ComponentType<any>;
  cor: string;
  sub?: string;
}) {
  return (
    <div className="card-premium p-5 flex items-start gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${cor}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[var(--text-muted)] text-xs font-medium uppercase tracking-wide">{label}</p>
        <p className="text-[var(--text-primary)] text-2xl font-bold mt-0.5">{valor}</p>
        {sub && <p className="text-[var(--text-tertiary)] text-xs mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export default function RelatoriosPage() {
  const [, navigate] = useLocation();
  const [tabActiva, setTabActiva] = useState<"executivo" | "retencao">("executivo");

  // ─── Estado: Filtros do Dashboard Executivo ───────────────────────────────
  const hoje = new Date();
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
  const [dataInicio, setDataInicio] = useState<string>(inicioMes.toISOString().split("T")[0]);
  const [dataFim, setDataFim] = useState<string>(hoje.toISOString().split("T")[0]);

  // ─── Estado: Filtros de Retenção ──────────────────────────────────────────
  const [mesesInatividade, setMesesInatividade] = useState(6);
  const [pesquisaRetencao, setPesquisaRetencao] = useState("");

  // ─── Queries ──────────────────────────────────────────────────────────────
  const dashboardQuery = trpc.relatorios.dashboardExecutivo.useQuery(
    { dataInicio: new Date(dataInicio), dataFim: new Date(dataFim + "T23:59:59") },
    { enabled: !!dataInicio && !!dataFim }
  );

  const retencaoQuery = trpc.relatorios.relatorioRetencao.useQuery(
    { mesesInatividade },
    { enabled: tabActiva === "retencao" }
  );

  const kpis = dashboardQuery.data?.kpis;
  const listaInativos = retencaoQuery.data?.listaInativos ?? [];
  const totalInativos = retencaoQuery.data?.totalInativos ?? 0;

  // ─── Filtro de pesquisa na lista de inativos ──────────────────────────────
  const inativosFiltrados = useMemo(() =>
    listaInativos.filter((u: any) =>
      u.nome?.toLowerCase().includes(pesquisaRetencao.toLowerCase()) ||
      u.telemovel?.includes(pesquisaRetencao)
    ),
    [listaInativos, pesquisaRetencao]
  );

  // ─── Exportar CSV ─────────────────────────────────────────────────────────
  const exportarCSV = () => {
    const linhas = [
      ["Nome", "Telemóvel", "Última Consulta", "Dias Inativo"],
      ...listaInativos.map((u: any) => [
        u.nome,
        u.telemovel || "—",
        formatarData(u.ultimaConsulta),
        String(diasDesde(u.ultimaConsulta)),
      ]),
    ];
    const csv = linhas.map(l => l.map(c => `"${c}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `utentes_inativos_${mesesInatividade}meses_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ─── Atalhos de período ───────────────────────────────────────────────────
  const aplicarPeriodo = (tipo: "mes" | "trimestre" | "semestre" | "ano") => {
    const fim = new Date();
    const inicio = new Date();
    if (tipo === "mes") inicio.setMonth(inicio.getMonth() - 1);
    else if (tipo === "trimestre") inicio.setMonth(inicio.getMonth() - 3);
    else if (tipo === "semestre") inicio.setMonth(inicio.getMonth() - 6);
    else if (tipo === "ano") inicio.setFullYear(inicio.getFullYear() - 1);
    setDataInicio(inicio.toISOString().split("T")[0]);
    setDataFim(fim.toISOString().split("T")[0]);
  };

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header-title flex items-center gap-2">
            <FileBarChart className="w-6 h-6 text-[#00E5FF]" />
            Relatórios
          </h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            Análise executiva e retenção de utentes
          </p>
        </div>
        <span className="badge-premium text-[10px] px-2 py-0.5">V35.5</span>
      </div>

      {/* ─── Tabs ───────────────────────────────────────────────────────── */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] rounded-xl border border-[var(--border-light)] w-fit">
        {[
          { id: "executivo", label: "Dashboard Executivo", icon: BarChart3 },
          { id: "retencao", label: "Retenção de Utentes", icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTabActiva(id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tabActiva === id
                ? "bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30"
                : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: DASHBOARD EXECUTIVO
      ═══════════════════════════════════════════════════════════════════ */}
      {tabActiva === "executivo" && (
        <div className="space-y-5">
          {/* Filtros de Período */}
          <div className="card-premium p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div className="flex-1 min-w-[180px]">
                <label className="section-label mb-1.5 block">Data de Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div className="flex-1 min-w-[180px]">
                <label className="section-label mb-1.5 block">Data de Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                  className="input-premium w-full"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  { label: "Último Mês", tipo: "mes" as const },
                  { label: "Trimestre", tipo: "trimestre" as const },
                  { label: "Semestre", tipo: "semestre" as const },
                  { label: "Ano", tipo: "ano" as const },
                ].map(({ label, tipo }) => (
                  <button
                    key={tipo}
                    onClick={() => aplicarPeriodo(tipo)}
                    className="px-3 py-2 rounded-lg text-xs font-medium bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:border-[#00E5FF]/40 hover:text-[#00E5FF] transition-all"
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button
                onClick={() => dashboardQuery.refetch()}
                disabled={dashboardQuery.isFetching}
                className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                {dashboardQuery.isFetching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Atualizar
              </button>
            </div>
          </div>

          {/* KPIs */}
          {dashboardQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
            </div>
          ) : dashboardQuery.isError ? (
            <div className="card-premium p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">Erro ao carregar dados. Verifique as permissões.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                  label="Total de Consultas"
                  valor={kpis?.consultas.total ?? 0}
                  icon={Stethoscope}
                  cor="bg-[#00E5FF]/10 text-[#00E5FF]"
                  sub={`No período ${formatarData(dataInicio)} – ${formatarData(dataFim)}`}
                />
                <KpiCard
                  label="Faturação Bruta"
                  valor={formatarMoeda(kpis?.faturacao.totalBruto ?? 0)}
                  icon={Euro}
                  cor="bg-emerald-500/10 text-emerald-400"
                  sub="Total de faturas emitidas no período"
                />
                <KpiCard
                  label="Total de Utentes"
                  valor={kpis?.utentes.total ?? 0}
                  icon={Users}
                  cor="bg-violet-500/10 text-violet-400"
                  sub="Utentes registados na clínica"
                />
                <KpiCard
                  label="Equipa Médica"
                  valor={kpis?.equipa.total ?? 0}
                  icon={UserCog}
                  cor="bg-amber-500/10 text-amber-400"
                  sub="Médicos e especialistas ativos"
                />
              </div>

              {/* Resumo do Período */}
              <div className="card-premium p-5">
                <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00E5FF]" />
                  Resumo do Período
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
                    <p className="text-[var(--text-muted)] text-xs mb-1">Média por Consulta</p>
                    <p className="text-[var(--text-primary)] text-lg font-bold">
                      {kpis && kpis.consultas.total > 0
                        ? formatarMoeda(kpis.faturacao.totalBruto / kpis.consultas.total)
                        : "—"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
                    <p className="text-[var(--text-muted)] text-xs mb-1">Consultas por Médico</p>
                    <p className="text-[var(--text-primary)] text-lg font-bold">
                      {kpis && kpis.equipa.total > 0
                        ? (kpis.consultas.total / kpis.equipa.total).toFixed(1)
                        : "—"}
                    </p>
                  </div>
                  <div className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
                    <p className="text-[var(--text-muted)] text-xs mb-1">Período Analisado</p>
                    <p className="text-[var(--text-primary)] text-lg font-bold">
                      {Math.ceil((new Date(dataFim).getTime() - new Date(dataInicio).getTime()) / (1000 * 60 * 60 * 24))} dias
                    </p>
                  </div>
                </div>
              </div>

              {/* Acções Rápidas */}
              <div className="card-premium p-5">
                <h3 className="text-[var(--text-primary)] font-semibold mb-4 flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00E5FF]" />
                  Acções Rápidas
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <button
                    onClick={() => navigate("/financeiro")}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:border-[#00E5FF]/40 text-[var(--text-secondary)] hover:text-[#00E5FF] transition-all text-left"
                  >
                    <TrendingUp className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Ver Financeiro Detalhado</span>
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                  </button>
                  <button
                    onClick={() => navigate("/faturacao")}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:border-[#00E5FF]/40 text-[var(--text-secondary)] hover:text-[#00E5FF] transition-all text-left"
                  >
                    <Euro className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Ver Faturas e Recibos</span>
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                  </button>
                  <button
                    onClick={() => setTabActiva("retencao")}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:border-violet-400/40 text-[var(--text-secondary)] hover:text-violet-400 transition-all text-left"
                  >
                    <Users className="w-4 h-4 shrink-0" />
                    <span className="text-sm font-medium">Analisar Retenção</span>
                    <ChevronRight className="w-4 h-4 ml-auto shrink-0" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          TAB: RETENÇÃO DE UTENTES
      ═══════════════════════════════════════════════════════════════════ */}
      {tabActiva === "retencao" && (
        <div className="space-y-5">
          {/* Filtros */}
          <div className="card-premium p-4">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="section-label mb-1.5 block">Meses de Inatividade</label>
                <select
                  value={mesesInatividade}
                  onChange={e => setMesesInatividade(Number(e.target.value))}
                  className="input-premium"
                >
                  {[1, 2, 3, 6, 9, 12, 18, 24].map(m => (
                    <option key={m} value={m}>{m} {m === 1 ? "mês" : "meses"}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px] relative">
                <label className="section-label mb-1.5 block">Pesquisar Utente</label>
                <Search className="absolute left-3 bottom-2.5 w-4 h-4 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Nome ou telemóvel..."
                  value={pesquisaRetencao}
                  onChange={e => setPesquisaRetencao(e.target.value)}
                  className="input-premium w-full pl-9"
                />
              </div>
              <button
                onClick={() => retencaoQuery.refetch()}
                disabled={retencaoQuery.isFetching}
                className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2"
              >
                {retencaoQuery.isFetching
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <RefreshCw className="w-4 h-4" />}
                Atualizar
              </button>
              {listaInativos.length > 0 && (
                <button
                  onClick={exportarCSV}
                  className="btn-secondary px-4 py-2 rounded-xl text-sm flex items-center gap-2 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                >
                  <Download className="w-4 h-4" />
                  Exportar CSV
                </button>
              )}
            </div>
          </div>

          {/* Resumo */}
          {!retencaoQuery.isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <KpiCard
                label="Utentes Inativos"
                valor={totalInativos}
                icon={Users}
                cor="bg-red-500/10 text-red-400"
                sub={`Sem consultas há +${mesesInatividade} meses`}
              />
              <KpiCard
                label="Filtrados"
                valor={inativosFiltrados.length}
                icon={Filter}
                cor="bg-amber-500/10 text-amber-400"
                sub="Resultado da pesquisa atual"
              />
              <KpiCard
                label="Potencial de Reativação"
                valor={`${totalInativos > 0 ? Math.round((inativosFiltrados.length / totalInativos) * 100) : 0}%`}
                icon={TrendingUp}
                cor="bg-emerald-500/10 text-emerald-400"
                sub="Da lista filtrada"
              />
            </div>
          )}

          {/* Lista de Inativos */}
          {retencaoQuery.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
            </div>
          ) : retencaoQuery.isError ? (
            <div className="card-premium p-8 text-center">
              <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
              <p className="text-[var(--text-secondary)] text-sm">Erro ao carregar dados. Verifique as permissões.</p>
            </div>
          ) : inativosFiltrados.length === 0 ? (
            <div className="card-premium p-12 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-4" />
              <p className="text-[var(--text-primary)] font-semibold text-lg mb-1">
                {pesquisaRetencao ? "Nenhum resultado encontrado" : "Excelente retenção!"}
              </p>
              <p className="text-[var(--text-muted)] text-sm">
                {pesquisaRetencao
                  ? "Tente ajustar o filtro de pesquisa."
                  : `Não há utentes inativos há mais de ${mesesInatividade} meses.`}
              </p>
            </div>
          ) : (
            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-[var(--border-light)] flex items-center justify-between">
                <h3 className="text-[var(--text-primary)] font-semibold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Utentes Inativos — {inativosFiltrados.length} resultado{inativosFiltrados.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-[var(--text-muted)] text-xs">
                  Clique em <ExternalLink className="w-3 h-3 inline" /> para abrir a ficha
                </p>
              </div>
              <div className="divide-y divide-[var(--border-lightest)]">
                {inativosFiltrados.map((u: any) => {
                  const dias = diasDesde(u.ultimaConsulta);
                  const urgencia = dias > 365 ? "text-red-400" : dias > 180 ? "text-amber-400" : "text-[var(--text-muted)]";
                  return (
                    <div key={u.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] transition-colors">
                      <div className="w-10 h-10 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] flex items-center justify-center shrink-0">
                        <span className="text-[var(--text-muted)] text-sm font-bold">
                          {u.nome?.charAt(0)?.toUpperCase() ?? "?"}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{u.nome}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          {u.telemovel && (
                            <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                              <Phone className="w-3 h-3" />{u.telemovel}
                            </span>
                          )}
                          <span className={`text-xs flex items-center gap-1 ${urgencia}`}>
                            <Clock className="w-3 h-3" />
                            Última consulta: {formatarData(u.ultimaConsulta)} ({dias} dias)
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {u.telemovel && (
                          <a
                            href={`https://wa.me/351${u.telemovel.replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Contactar via WhatsApp"
                            className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                        <button
                          onClick={() => navigate(`/utentes?utenteId=${u.id}`)}
                          title="Ver ficha do utente"
                          className="p-2 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] hover:bg-[#00E5FF]/20 transition-all"
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
    </div>
  );
}
