import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Plus, X, Check,
  Loader2, Download, Calendar, AlertCircle, CheckCircle2,
  Euro, FileText, Users, Clock, Target, ArrowUp, ArrowDown,
  Search, Filter, Pill, CreditCard, Receipt, ArrowDownCircle, ArrowUpCircle, List, RefreshCw, ChevronRight,
  ExternalLink, FileBarChart, FlaskConical, Calculator
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useConfig } from "../contexts/ConfigContext";
import { aplicarTimbrado, aplicarRodapeTimbrado, buildTimbradoConfig, type TimbradoConfig } from "../lib/pdfTimbrado";
import { parseApiError } from "../lib/parseApiError";

// ─── Tipos ──────────────────────────────────────────────────────────────────
type TabFinanceiro = "resumo" | "recebimentos" | "despesas" | "movimentos";

const TABS_CONFIG: { id: TabFinanceiro; label: string; icon: React.ComponentType<any>; descricao: string }[] = [
  { id: "resumo", label: "Resumo Geral", icon: BarChart3, descricao: "Visão geral financeira" },
  { id: "recebimentos", label: "Recebimentos", icon: ArrowDownCircle, descricao: "Faturas pagas e pagamentos" },
  { id: "despesas", label: "Despesas", icon: ArrowUpCircle, descricao: "Custos, comissões e materiais" },
  { id: "movimentos", label: "Todos os Movimentos", icon: List, descricao: "Histórico completo" },
];

// ─── Helper: formatar valor monetário com segurança ──────────────────────────
function fmtEuro(valor: number | null | undefined): string {
  return Number(valor ?? 0).toFixed(2);
}

// ─── Função para exportar relatório mensal em PDF ───────────────────────────
function exportarRelatorioMensalPDF(mes: string, ano: number, dados: any, simboloMoeda = "€", nomeClinica = "Clínica", timbradoConfig?: TimbradoConfig) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  let yPos = 20;
  if (timbradoConfig) {
    yPos = aplicarTimbrado(doc, timbradoConfig);
  } else {
    doc.setFillColor(0, 229, 255);
    doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.text("RELATÓRIO FINANCEIRO", 20, 18);
    doc.setFontSize(11);
    doc.text(`${mes} de ${ano}`, 20, 27);
    doc.setFontSize(8);
    doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT")}`, 120, 27);
    yPos = 45;
  }

  if (timbradoConfig) {
    doc.setTextColor(25, 55, 109);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("RELATÓRIO FINANCEIRO", 12, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 130);
    doc.text(`${mes} de ${ano}  |  Gerado em: ${new Date().toLocaleDateString("pt-PT")} às ${new Date().toLocaleTimeString("pt-PT")}`, 12, yPos);
    yPos += 10;
  }

  doc.setTextColor(60, 60, 80);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Resumo Financeiro", 12, yPos);

  const kpis = [
    { label: "Receita Total", valor: dados.receita, cor: [34, 197, 94] as [number, number, number] },
    { label: "Comissões", valor: dados.comissoes, cor: [59, 130, 246] as [number, number, number] },
    { label: "Custos", valor: dados.custos, cor: [239, 68, 68] as [number, number, number] },
    { label: "Lucro Líquido", valor: dados.lucro, cor: [0, 229, 255] as [number, number, number] },
  ];

  let xPos = 12;
  yPos += 7;
  for (const kpi of kpis) {
    doc.setFillColor(kpi.cor[0], kpi.cor[1], kpi.cor[2]);
    doc.roundedRect(xPos, yPos, 43, 22, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.text(kpi.label, xPos + 4, yPos + 7);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(`${simboloMoeda} ${fmtEuro(kpi.valor)}`, xPos + 4, yPos + 17);
    xPos += 47;
  }

  yPos += 32;
  doc.setTextColor(60, 60, 80);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Métricas Operacionais", 20, yPos);

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80, 80, 100);

  const metricas = [
    { label: "Consultas Realizadas", valor: dados.consultasRealizadas || 0 },
    { label: "Tratamentos Realizados", valor: dados.tratamentosRealizados || 0 },
    { label: "Utentes Novos", valor: dados.utentesNovos || 0 },
  ];

  for (const m of metricas) {
    doc.setFillColor(245, 245, 250);
    doc.roundedRect(12, yPos, 183, 10, 2, 2, "F");
    doc.setTextColor(80, 80, 100);
    doc.text(m.label, 17, yPos + 7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60, 60, 80);
    doc.text(String(m.valor), 178, yPos + 7, { align: "right" });
    doc.setFont("helvetica", "normal");
    yPos += 14;
  }

  if (dados.movimentosRecentes && dados.movimentosRecentes.length > 0) {
    yPos += 10;
    doc.setTextColor(60, 60, 80);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Movimentos Recentes", 12, yPos);
    yPos += 5;

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Descrição", "Utente", "Valor", "Estado"]],
      body: dados.movimentosRecentes.slice(0, 15).map((m: any) => [
        m.data ? new Date(m.data).toLocaleDateString("pt-PT") : "—",
        m.descricao || "—",
        m.utente || "—",
        `${simboloMoeda} ${fmtEuro(m.valor)}`,
        m.estado || "—",
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [25, 55, 109], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 248, 252] },
      margin: { left: 12, right: 15 },
    });
  }

  if (timbradoConfig) {
    aplicarRodapeTimbrado(doc, timbradoConfig);
  } else {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text(`Documento gerado automaticamente por ${nomeClinica} (DentCare Elite V41)`, 20, 285);
      doc.text(`Página ${i} de ${pageCount}`, 180, 285);
    }
  }

  doc.save(`Relatorio_Financeiro_${mes}_${ano}.pdf`);
}

// ─── Modal Registar Tratamento (CORRIGIDO: usa tratamentos.criarTratamento) ──
function ModalRegistarTratamento({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { simboloMoeda: sm } = useConfig();
  const [form, setForm] = useState({
    utenteId: "",
    medicoId: "",
    descricao: "",
    valorBruto: "",
    dente: "",
    especialidade: "Geral",
  });
  const [pesquisaUtente, setPesquisaUtente] = useState("");
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  const utentesQuery = trpc.utentes.list.useQuery();
  const dentistasQuery = trpc.dentistas.listar.useQuery();
  const utentes = (utentesQuery.data as any)?.utentes ?? [];
  const dentistas = (dentistasQuery.data as any)?.dentistas ?? [];

  const utentesFiltrados = useMemo(() => {
    if (!pesquisaUtente) return utentes.slice(0, 10);
    return utentes.filter((u: any) => 
      u.nome.toLowerCase().includes(pesquisaUtente.toLowerCase()) ||
      u.telemovel?.includes(pesquisaUtente)
    ).slice(0, 10);
  }, [utentes, pesquisaUtente]);

  const utenteSelecionado = useMemo(() => {
    return utentes.find((u: any) => u.id === parseInt(form.utenteId));
  }, [utentes, form.utenteId]);

  // CORRIGIDO: Usar tratamentos.criarTratamento que é o endpoint funcional
  const criarMutation = trpc.tratamentos.criarTratamento.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.utenteId) { setErro("Selecione um utente"); return; }
    if (!form.medicoId) { setErro("Selecione um médico"); return; }
    if (!form.descricao) { setErro("Descreva o tratamento"); return; }
    setErro("");
    criarMutation.mutate({
      utenteId: parseInt(form.utenteId),
      medicoId: parseInt(form.medicoId),
      descricao: form.descricao,
      valor: parseFloat(form.valorBruto) || 0,
      dente: form.dente || "Geral",
      especialidade: form.especialidade,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col overflow-hidden my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center">
              <Pill className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <div>
              <h2 className="text-[var(--text-primary)] font-bold">Registar Tratamento</h2>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Com faturação automática</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto min-h-0">
          {sucesso && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-emerald-400 text-sm font-medium">Tratamento registado e fatura emitida com sucesso!</p>
            </div>
          )}

          {erro && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Utente</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-[var(--text-muted)]" />
              </div>
              <input
                type="text"
                value={pesquisaUtente}
                onChange={(e) => { setPesquisaUtente(e.target.value); setMostrarResultados(true); }}
                onFocus={() => setMostrarResultados(true)}
                placeholder="Pesquisar por nome ou telemóvel..."
                className="w-full pl-10 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all outline-none"
              />
              {mostrarResultados && utentesFiltrados.length > 0 && (
                <div className="absolute z-10 w-full mt-2 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl shadow-xl overflow-hidden animate-in slide-in-from-top-2 duration-200">
                  {utentesFiltrados.map((u: any) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setForm({ ...form, utenteId: String(u.id) }); setPesquisaUtente(u.nome); setMostrarResultados(false); }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)] transition-colors text-left border-b border-[var(--border-primary)] last:border-0"
                    >
                      <div className="w-8 h-8 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] text-xs font-bold">
                        {u.nome.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-[var(--text-primary)]">{u.nome}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{u.telemovel || "Sem telemóvel"}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {utenteSelecionado && (
              <div className="flex items-center gap-2 px-3 py-2 bg-[#00E5FF]/5 border border-[#00E5FF]/20 rounded-lg">
                <Check className="w-3 h-3 text-[#00E5FF]" />
                <span className="text-xs text-[#00E5FF] font-medium">Utente selecionado: {utenteSelecionado.nome}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Médico Responsável</label>
              <select
                value={form.medicoId}
                onChange={(e) => setForm({ ...form, medicoId: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none"
              >
                <option value="">Selecionar médico...</option>
                {dentistas.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Especialidade</label>
              <select
                value={form.especialidade}
                onChange={(e) => setForm({ ...form, especialidade: e.target.value })}
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none"
              >
                <option value="Geral">Clínica Geral</option>
                <option value="Implantologia">Implantologia</option>
                <option value="Ortodontia">Ortodontia</option>
                <option value="Endodontia">Endodontia</option>
                <option value="Estética">Estética Dental</option>
                <option value="Cirurgia">Cirurgia Oral</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Descrição do Tratamento</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Restauração estética no dente 24..."
              rows={3}
              className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Valor Bruto ({sm})</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                  <Euro className="w-4 h-4 text-[var(--text-muted)]" />
                </div>
                <input
                  type="number"
                  step="0.01"
                  value={form.valorBruto}
                  onChange={(e) => setForm({ ...form, valorBruto: e.target.value })}
                  placeholder="0.00"
                  className="w-full pl-10 pr-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Dente (Opcional)</label>
              <input
                type="text"
                value={form.dente}
                onChange={(e) => setForm({ ...form, dente: e.target.value })}
                placeholder="Ex: 24, 36, Superior..."
                className="w-full px-4 py-3 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none"
              />
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-[var(--border-primary)] bg-[var(--bg-secondary)]/50 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={criarMutation.isPending || sucesso}
            className="px-8 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white text-sm font-black shadow-lg shadow-[#00E5FF]/20 hover:shadow-[#00E5FF]/40 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {criarMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                A processar...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar e Faturar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ───────────────────────────────────────────────────
export default function FinanceiroPage() {
  const [, setLocation] = useLocation();
  const { simboloMoeda: sm, nomeClinica } = useConfig();
  const [activeTab, setActiveTab] = useState<TabFinanceiro>("resumo");
  const [showModalTratamento, setShowModalTratamento] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [pesquisa, setPesquisa] = useState("");

  // V41: Deep-linking via URLSearchParams
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab") as TabFinanceiro;
    if (tab && TABS_CONFIG.some(t => t.id === tab)) {
      setActiveTab(tab);
    }

    // Ouvir evento customizado de navegação da Sidebar
    const handleAppNavigate = (e: any) => {
      const newParams = new URLSearchParams(e.detail.path.split("?")[1]);
      const newTab = newParams.get("tab") as TabFinanceiro;
      if (newTab && TABS_CONFIG.some(t => t.id === newTab)) {
        setActiveTab(newTab);
      }
    };
    window.addEventListener("app:navigate", handleAppNavigate);
    return () => window.removeEventListener("app:navigate", handleAppNavigate);
  }, []);

  // Atualizar URL ao mudar tab
  const handleTabChange = (tab: TabFinanceiro) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.pushState({}, "", url.toString());
  };

  // Queries
  const statsQuery = trpc.financeiro.obterEstatisticasMensais.useQuery();
  const movimentosQuery = trpc.financeiro.obterMovimentosRecentesSemData.useQuery();
  const faturasQuery = trpc.financeiro.listarFaturas.useQuery({ 
    estado: filtroEstado === "todos" ? undefined : filtroEstado 
  });

  const stats = statsQuery.data || { receita: 0, comissoes: 0, custos: 0, lucro: 0 };
  const movimentos = movimentosQuery.data || [];
  const faturas = (faturasQuery.data as any)?.faturas || [];

  // Filtragem de movimentos
  const movimentosFiltrados = useMemo(() => {
    return movimentos.filter((m: any) => {
      const matchesPesquisa = !pesquisa || 
        m.descricao?.toLowerCase().includes(pesquisa.toLowerCase()) ||
        m.utente?.toLowerCase().includes(pesquisa.toLowerCase());
      const matchesTipo = filtroTipo === "todos" || m.tipo === filtroTipo;
      const matchesEstado = filtroEstado === "todos" || m.estado === filtroEstado;
      return matchesPesquisa && matchesTipo && matchesEstado;
    });
  }, [movimentos, pesquisa, filtroTipo, filtroEstado]);

  // Filtragem de faturas (para tab recebimentos)
  const faturasFiltradas = useMemo(() => {
    return faturas.filter((f: any) => {
      const matchesPesquisa = !pesquisa || 
        f.numero?.toLowerCase().includes(pesquisa.toLowerCase()) ||
        f.utenteNome?.toLowerCase().includes(pesquisa.toLowerCase());
      return matchesPesquisa;
    });
  }, [faturas, pesquisa]);

  const isLoading = statsQuery.isLoading || movimentosQuery.isLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#00E5FF]/10 border-t-[#00E5FF] animate-spin" />
          <BarChart3 className="absolute inset-0 m-auto w-6 h-6 text-[#00E5FF] animate-pulse" />
        </div>
        <p className="text-[var(--text-secondary)] font-medium animate-pulse">A carregar dados financeiros...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header com Breadcrumbs e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <span>Administrativo</span>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#00E5FF]">Gestão Financeira</span>
          </div>
          <h1 className="text-3xl font-black text-[var(--text-primary)] tracking-tight flex items-center gap-3">
            Financeiro
            <div className="px-2 py-0.5 rounded-md bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[10px] text-[#00E5FF] font-black uppercase">V41</div>
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => { statsQuery.refetch(); movimentosQuery.refetch(); faturasQuery.refetch(); }}
            className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[#00E5FF] hover:border-[#00E5FF]/30 transition-all"
            title="Atualizar dados"
          >
            <RefreshCw className={`w-5 h-5 ${statsQuery.isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => exportarRelatorioMensalPDF(
              new Date().toLocaleString('pt-PT', { month: 'long' }),
              new Date().getFullYear(),
              { ...stats, movimentosRecentes: movimentos },
              sm,
              nomeClinica
            )}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] font-bold hover:bg-[var(--bg-tertiary)] transition-all"
          >
            <Download className="w-4 h-4 text-[#00E5FF]" />
            Relatório PDF
          </button>
          <button
            onClick={() => setShowModalTratamento(true)}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white font-black shadow-lg shadow-[#00E5FF]/20 hover:shadow-[#00E5FF]/40 transition-all"
          >
            <Plus className="w-5 h-5" />
            Registar Tratamento
          </button>
        </div>
      </div>

      {/* Tabs de Navegação */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-secondary)]/50 border border-[var(--border-primary)] rounded-2xl w-fit">
        {TABS_CONFIG.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`
                flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300
                ${isActive 
                  ? "bg-[var(--bg-elevated)] text-[#00E5FF] shadow-lg border border-white/5" 
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-white/5"
                }
              `}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#00E5FF]" : "opacity-60"}`} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Conteúdo das Tabs */}
      <div className="space-y-8">
        {activeTab === "resumo" && (
          <>
            {/* KPIs Principais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <KPIFinanceiro
                label="Receita Mensal"
                valor={stats.receita}
                simbolo={sm}
                icon={TrendingUp}
                cor="#22C55E"
                onClick={() => handleTabChange("recebimentos")}
                subtexto="Total faturado este mês"
              />
              <KPIFinanceiro
                label="Comissões Médicas"
                valor={stats.comissoes}
                simbolo={sm}
                icon={Users}
                cor="#3B82F6"
                onClick={() => handleTabChange("despesas")}
                subtexto="A pagar aos profissionais"
              />
              <KPIFinanceiro
                label="Custos Operacionais"
                valor={stats.custos}
                simbolo={sm}
                icon={TrendingDown}
                cor="#EF4444"
                onClick={() => handleTabChange("despesas")}
                subtexto="Materiais e despesas fixas"
              />
              <KPIFinanceiro
                label="Lucro Líquido"
                valor={stats.lucro}
                simbolo={sm}
                icon={DollarSign}
                cor="#00E5FF"
                subtexto="Resultado após deduções"
              />
            </div>

            {/* Gráficos e Atalhos */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl p-8 shadow-xl">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-lg font-black text-[var(--text-primary)] tracking-tight">Fluxo de Caixa</h3>
                    <p className="text-xs text-[var(--text-muted)] font-medium">Comparativo de receita vs despesas</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#22C55E]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Receita</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-[#EF4444]" />
                      <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase">Despesas</span>
                    </div>
                  </div>
                </div>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={[
                      { name: 'Sem 1', receita: stats.receita * 0.2, despesas: stats.custos * 0.3 },
                      { name: 'Sem 2', receita: stats.receita * 0.45, despesas: stats.custos * 0.5 },
                      { name: 'Sem 3', receita: stats.receita * 0.7, despesas: stats.custos * 0.8 },
                      { name: 'Sem 4', receita: stats.receita, despesas: stats.custos + stats.comissoes },
                    ]}>
                      <defs>
                        <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#22C55E" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#22C55E" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorDespesa" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#EF4444" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#7A94AD', fontSize: 10}} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#7A94AD', fontSize: 10}} tickFormatter={(v) => `${sm}${v}`} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: '#080F1E', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px' }}
                        itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      />
                      <Area type="monotone" dataKey="receita" stroke="#22C55E" strokeWidth={3} fillOpacity={1} fill="url(#colorReceita)" />
                      <Area type="monotone" dataKey="despesas" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorDespesa)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl p-6 shadow-xl">
                  <h3 className="text-sm font-black text-[var(--text-primary)] tracking-widest uppercase mb-6">Atalhos Rápidos</h3>
                  <div className="space-y-3">
                    <AtalhoFinanceiro 
                      icon={Receipt} 
                      label="Faturação" 
                      desc="Emitir e gerir faturas" 
                      onClick={() => setLocation("/faturacao")} 
                    />
                    <AtalhoFinanceiro 
                      icon={FlaskConical} 
                      label="Laboratórios" 
                      desc="Custos de próteses" 
                      onClick={() => setLocation("/laboratorios")} 
                    />
                    <AtalhoFinanceiro 
                      icon={FileBarChart} 
                      label="Relatórios" 
                      desc="Análise detalhada" 
                      onClick={() => setLocation("/relatorios")} 
                    />
                    <AtalhoFinanceiro 
                      icon={Calculator} 
                      label="Simulador" 
                      desc="Cálculo de orçamentos" 
                      onClick={() => setLocation("/orcamentos")} 
                    />
                  </div>
                </div>

                <div className="bg-gradient-to-br from-[#00E5FF]/10 to-[#B388FF]/10 border border-[#00E5FF]/20 rounded-3xl p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/20 flex items-center justify-center">
                      <Target className="w-4 h-4 text-[#00E5FF]" />
                    </div>
                    <h3 className="text-sm font-black text-white tracking-tight">Meta Mensal</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-[var(--text-muted)] uppercase">
                      <span>Progresso</span>
                      <span className="text-[#00E5FF]">75%</span>
                    </div>
                    <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-[#00E5FF] to-[#B388FF] w-[75%] shadow-[0_0_10px_rgba(0,229,255,0.5)]" />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-2">Faltam {sm} 2,500 para atingir o objetivo.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab !== "resumo" && (
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl overflow-hidden shadow-xl">
            {/* Filtros e Pesquisa */}
            <div className="p-6 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1 max-w-md">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input
                    type="text"
                    value={pesquisa}
                    onChange={(e) => setPesquisa(e.target.value)}
                    placeholder="Pesquisar movimentos..."
                    className="w-full pl-10 pr-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm focus:border-[#00E5FF] outline-none transition-all"
                  />
                </div>
                <button className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] hover:text-[#00E5FF] transition-all">
                  <Filter className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center gap-3">
                <select
                  value={filtroEstado}
                  onChange={(e) => setFiltroEstado(e.target.value)}
                  className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold text-[var(--text-secondary)] outline-none focus:border-[#00E5FF]"
                >
                  <option value="todos">Todos os Estados</option>
                  <option value="paga">Pagas</option>
                  <option value="pendente">Pendentes</option>
                  <option value="cancelada">Canceladas</option>
                </select>
                {activeTab === "movimentos" && (
                  <select
                    value={filtroTipo}
                    onChange={(e) => setFiltroTipo(e.target.value)}
                    className="px-4 py-2.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl text-sm font-bold text-[var(--text-secondary)] outline-none focus:border-[#00E5FF]"
                  >
                    <option value="todos">Todos os Tipos</option>
                    <option value="Fatura">Receitas (Faturas)</option>
                    <option value="Tratamento">Despesas (Tratamentos)</option>
                  </select>
                )}
              </div>
            </div>

            {/* Tabela de Dados */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-secondary)]/50">
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Utente / Entidade</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Estado</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-primary)]">
                  {movimentosFiltrados.length > 0 ? (
                    movimentosFiltrados.map((m: any, idx: number) => (
                      <tr key={idx} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <div className="flex flex-col">
                            <span className="text-sm font-bold text-[var(--text-primary)]">
                              {m.data ? new Date(m.data).toLocaleDateString('pt-PT') : '—'}
                            </span>
                            <span className="text-[10px] text-[var(--text-muted)] font-medium">
                              {m.data ? new Date(m.data).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : ''}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.tipo === 'Fatura' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                              {m.tipo === 'Fatura' ? <ArrowDownCircle className="w-4 h-4" /> : <ArrowUpCircle className="w-4 h-4" />}
                            </div>
                            <span className="text-sm font-medium text-[var(--text-secondary)]">{m.descricao}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <button 
                            onClick={() => m.utenteId && setLocation(`/utentes?utenteId=${m.utenteId}`)}
                            className="text-sm font-bold text-[var(--text-primary)] hover:text-[#00E5FF] transition-colors flex items-center gap-2"
                          >
                            {m.utente || '—'}
                            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-sm font-black ${m.tipo === 'Fatura' ? 'text-emerald-400' : 'text-amber-400'}`}>
                            {m.tipo === 'Fatura' ? '+' : '-'}{sm} {fmtEuro(m.valor)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`
                            px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider
                            ${m.estado === 'paga' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                              m.estado === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                              'bg-red-500/10 text-red-400 border border-red-500/20'}
                          `}>
                            {m.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="p-2 rounded-lg hover:bg-white/5 text-[var(--text-muted)] hover:text-white transition-all">
                            <FileText className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3 opacity-40">
                          <Search className="w-12 h-12" />
                          <p className="text-sm font-medium">Nenhum movimento encontrado com os filtros atuais.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer da Tabela */}
            <div className="p-6 bg-[var(--bg-secondary)]/30 border-t border-[var(--border-primary)] flex items-center justify-between">
              <p className="text-xs text-[var(--text-muted)] font-medium">
                A mostrar <span className="text-[var(--text-primary)] font-bold">{movimentosFiltrados.length}</span> movimentos
              </p>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Receita:</span>
                  <span className="text-sm font-black text-emerald-400">{sm} {fmtEuro(movimentosFiltrados.filter((m:any) => m.tipo === 'Fatura').reduce((acc:number, m:any) => acc + (m.valor || 0), 0))}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Total Despesa:</span>
                  <span className="text-sm font-black text-amber-400">{sm} {fmtEuro(movimentosFiltrados.filter((m:any) => m.tipo === 'Tratamento').reduce((acc:number, m:any) => acc + (m.valor || 0), 0))}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showModalTratamento && (
        <ModalRegistarTratamento 
          onClose={() => setShowModalTratamento(false)} 
          onSuccess={() => { statsQuery.refetch(); movimentosQuery.refetch(); }} 
        />
      )}
    </div>
  );
}

// ─── Sub-componentes ────────────────────────────────────────────────────────

function KPIFinanceiro({ label, valor, simbolo, icon: Icon, cor, onClick, subtexto }: any) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`
        group relative flex flex-col p-6 rounded-3xl bg-[var(--bg-elevated)] border border-[var(--border-primary)] 
        shadow-xl transition-all duration-300 text-left overflow-hidden
        ${onClick ? "hover:border-[#00E5FF]/30 hover:translate-y-[-4px] cursor-pointer" : "cursor-default"}
      `}
    >
      {/* Glow de fundo */}
      <div 
        className="absolute -right-4 -top-4 w-24 h-24 rounded-full opacity-[0.03] group-hover:opacity-[0.08] transition-opacity duration-500"
        style={{ backgroundColor: cor }}
      />
      
      <div className="flex items-center justify-between mb-4">
        <div 
          className="w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300"
          style={{ backgroundColor: `${cor}15`, color: cor }}
        >
          <Icon className="w-5 h-5" />
        </div>
        {onClick && <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors" />}
      </div>

      <div className="space-y-1">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.15em]">{label}</p>
        <h3 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">
          <span className="text-sm font-bold mr-1 opacity-60">{simbolo}</span>
          {fmtEuro(valor)}
        </h3>
        {subtexto && <p className="text-[10px] text-[var(--text-muted)] font-medium">{subtexto}</p>}
      </div>
    </button>
  );
}

function AtalhoFinanceiro({ icon: Icon, label, desc, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 border border-transparent hover:border-white/5 transition-all group text-left"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--text-muted)] group-hover:text-[#00E5FF] group-hover:bg-[#00E5FF]/10 transition-all">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-bold text-[var(--text-primary)]">{label}</p>
        <p className="text-[10px] text-[var(--text-muted)] font-medium">{desc}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-all" />
    </button>
  );
}
