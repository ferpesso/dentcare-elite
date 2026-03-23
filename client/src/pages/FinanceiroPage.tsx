import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  BarChart3, TrendingUp, TrendingDown, DollarSign, Plus, X, Check,
  Loader2, Download, Calendar, AlertCircle, CheckCircle2,
  Euro, FileText, Users, Clock, Target, ArrowUp, ArrowDown,
  Search, Filter, Pill, CreditCard, Receipt
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, Area, AreaChart } from "recharts";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { useConfig } from "../contexts/ConfigContext";
import { aplicarTimbrado, aplicarRodapeTimbrado, buildTimbradoConfig, type TimbradoConfig } from "../lib/pdfTimbrado";
import { parseApiError } from "../lib/parseApiError";

// ─── Helper: formatar valor monetário com segurança ──────────────────────────────────────────
function fmtEuro(valor: number | null | undefined): string {
  return Number(valor ?? 0).toFixed(2);
}

// ─── Função para exportar relatório mensal em PDF (V32.3: papel timbrado + moeda dinâmica) ─
function exportarRelatorioMensalPDF(mes: string, ano: number, dados: any, simboloMoeda = "€", nomeClinica = "Clínica", timbradoConfig?: TimbradoConfig) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Aplicar papel timbrado
  let yPos = 20;
  if (timbradoConfig) {
    yPos = aplicarTimbrado(doc, timbradoConfig);
  } else {
    // Cabeçalho legado (sem timbrado)
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

  // Título do relatório (apenas quando há timbrado)
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

  // KPIs principais — caixas coloridas
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

  // Métricas Operacionais
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

  // Tabela de movimentos recentes (se disponível)
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

  // Rodapé com timbrado
  if (timbradoConfig) {
    aplicarRodapeTimbrado(doc, timbradoConfig);
  } else {
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 170);
      doc.text(`Documento gerado automaticamente por ${nomeClinica} (DentCare Elite V35)`, 20, 285);
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Utente *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                <input 
                  type="text"
                  placeholder="Pesquisar utente..."
                  value={utenteSelecionado ? utenteSelecionado.nome : pesquisaUtente}
                  onChange={(e) => {
                    setPesquisaUtente(e.target.value);
                    if (form.utenteId) setForm({ ...form, utenteId: "" });
                    setMostrarResultados(true);
                  }}
                  onFocus={() => setMostrarResultados(true)}
                  className="input-premium w-full pl-9"
                />
                {form.utenteId && (
                  <button 
                    type="button"
                    onClick={() => {
                      setForm({ ...form, utenteId: "" });
                      setPesquisaUtente("");
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-red-400"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              
              {mostrarResultados && !form.utenteId && (
                <div className="absolute z-10 w-full mt-1 bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-xl shadow-xl max-h-48 overflow-y-auto">
                  {utentesFiltrados.length > 0 ? (
                    utentesFiltrados.map((u: any) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => {
                          setForm({ ...form, utenteId: u.id.toString() });
                          setMostrarResultados(false);
                          setPesquisaUtente(u.nome);
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm text-[var(--text-primary)] hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] transition-colors border-b border-[var(--border-light)] last:border-0"
                      >
                        <div className="font-bold">{u.nome}</div>
                        <div className="text-[10px] text-[var(--text-muted)]">{u.telemovel || "Sem telemóvel"}</div>
                      </button>
                    ))
                  ) : (
                    <div className="px-4 py-3 text-xs text-[var(--text-muted)] text-center">Nenhum utente encontrado</div>
                  )}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Médico *</label>
              <select value={form.medicoId} onChange={e => setForm({ ...form, medicoId: e.target.value })}
                className="input-premium w-full">
                <option value="">Selecione...</option>
                {dentistas.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.nome}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Descrição do Tratamento *</label>
            <textarea value={form.descricao} onChange={e => setForm({ ...form, descricao: e.target.value })}
              placeholder="Ex: Limpeza dentária, Restauração composta..."
              className="input-premium w-full h-20 resize-none py-3" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Dente(s)</label>
              <input type="text" value={form.dente} onChange={e => setForm({ ...form, dente: e.target.value })}
                placeholder="Ex: 11, 21" className="input-premium w-full" />
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Especialidade</label>
              <select value={form.especialidade} onChange={e => setForm({ ...form, especialidade: e.target.value })}
                className="input-premium w-full">
                <option value="Geral">Geral</option>
                <option value="Ortodontia">Ortodontia</option>
                <option value="Implantologia">Implantologia</option>
                <option value="Endodontia">Endodontia</option>
                <option value="Periodontologia">Periodontologia</option>
                <option value="Cirurgia Oral">Cirurgia Oral</option>
                <option value="Prostodontia">Prostodontia</option>
                <option value="Odontopediatria">Odontopediatria</option>
                <option value="Dentisteria">Dentisteria</option>
                <option value="Estética">Estética</option>
                <option value="Higiene Oral">Higiene Oral</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2">Valor ({sm})</label>
              <input type="number" step="0.01" value={form.valorBruto} onChange={e => setForm({ ...form, valorBruto: e.target.value })}
                onFocus={e => e.target.select()}
                placeholder="0.00" className="input-premium w-full font-bold text-[#00E5FF]" />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3.5 font-bold">Cancelar</button>
            <button type="submit" disabled={criarMutation.isPending}
              className="flex-[2] btn-primary py-3.5 font-bold flex items-center justify-center gap-2">
              {criarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Registar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export function FinanceiroPage() {
  const { simboloMoeda: sm, nomeClinica, timbradoConfig } = useConfig();
  const [, navigate] = useLocation();
  const [mes, setMes] = useState(new Date().getMonth() + 1);
  const [ano, setAno] = useState(new Date().getFullYear());
  const [mostrarModalTratamento, setMostrarModalTratamento] = useState(false);

  const statsQuery = trpc.financeiro.obterEstatisticasMensais.useQuery({ mes, ano });
  const movimentosQuery = trpc.financeiro.obterMovimentosRecentesSemData.useQuery({ limite: 50 });
  const stats = statsQuery.data?.stats ?? { receita: 0, comissoes: 0, custos: 0, lucro: 0 };
  const movimentos = movimentosQuery.data?.movimentos ?? [];

  const handleExportarPDF = () => {
    const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    exportarRelatorioMensalPDF(meses[mes - 1], ano, { ...stats, movimentosRecentes: movimentos }, sm, nomeClinica, timbradoConfig);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Gestão Financeira</h1>
          <p className="text-[var(--text-secondary)] text-sm">Controlo de receitas, comissões e faturação da clínica.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-[var(--bg-overlay)] p-1 rounded-xl border border-[var(--border-light)]">
            <select value={mes} onChange={e => setMes(parseInt(e.target.value))} className="bg-transparent text-[var(--text-primary)] text-xs font-bold px-3 py-2 outline-none">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => <option key={m} value={m}>{new Date(2000, m - 1).toLocaleString('pt-PT', { month: 'long' })}</option>)}
            </select>
            <select value={ano} onChange={e => setAno(parseInt(e.target.value))} className="bg-transparent text-[var(--text-primary)] text-xs font-bold px-3 py-2 outline-none border-l border-[var(--border-light)]">
              {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button onClick={handleExportarPDF} className="btn-secondary py-2.5 px-4 flex items-center gap-2 text-xs font-bold">
            <Download className="w-4 h-4" /> PDF
          </button>
          <button onClick={() => setMostrarModalTratamento(true)} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-xs font-bold">
            <Plus className="w-4 h-4" /> Registar Tratamento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-6 border-emerald-500/20 bg-emerald-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Receita</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{sm} {fmtEuro(stats.receita)}</h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-bold uppercase">Total Bruto Mensal</p>
        </div>

        <div className="card-premium p-6 border-blue-500/20 bg-blue-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Comissões</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{sm} {fmtEuro(stats.comissoes)}</h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-bold uppercase">A pagar aos médicos</p>
        </div>

        <div className="card-premium p-6 border-red-500/20 bg-red-500/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
              <TrendingDown className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">Custos</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{sm} {fmtEuro(stats.custos)}</h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-bold uppercase">Despesas e Materiais</p>
        </div>

        <div className="card-premium p-6 border-[#00E5FF]/20 bg-[#00E5FF]/[0.02]">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF]">
              <DollarSign className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-black text-[#00E5FF] uppercase tracking-widest">Lucro</span>
          </div>
          <h3 className="text-2xl font-black text-[var(--text-primary)]">{sm} {fmtEuro(stats.lucro)}</h3>
          <p className="text-[10px] text-[var(--text-tertiary)] mt-1 font-bold uppercase">Resultado Líquido</p>
        </div>
      </div>

      {/* Gráficos e Movimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="card-premium p-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#00E5FF]" /> Fluxo de Caixa
              </h3>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { dia: '01', valor: 450 }, { dia: '05', valor: 890 }, { dia: '10', valor: 1200 },
                  { dia: '15', valor: 980 }, { dia: '20', valor: 1500 }, { dia: '25', valor: 2100 },
                  { dia: '30', valor: 1850 }
                ]}>
                  <defs>
                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                  <XAxis dataKey="dia" stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis stroke="#ffffff30" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${sm}${v}`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #ffffff10', borderRadius: '12px' }}
                    itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                  />
                  <Area type="monotone" dataKey="valor" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card-premium overflow-hidden">
            <div className="p-6 border-b border-[var(--border-light)] flex items-center justify-between">
              <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                <Receipt className="w-4 h-4 text-[#00E5FF]" /> Movimentos Recentes
              </h3>
              <button className="text-[10px] font-black text-[#00E5FF] uppercase tracking-widest hover:text-[#00E5FF] transition-colors">Ver Todos</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[var(--bg-surface)]">
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Data</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Descrição</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest">Utente</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest text-right">Valor</th>
                    <th className="px-6 py-4 text-[10px] font-black text-[var(--text-tertiary)] uppercase tracking-widest text-center">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lightest)]">
                  {movimentos.length > 0 ? movimentos.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[var(--bg-surface)] transition-colors group">
                      <td className="px-6 py-4 text-xs text-[var(--text-secondary)]">{new Date(m.data).toLocaleDateString('pt-PT')}</td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-[var(--text-primary)]">{m.descricao}</div>
                        <div className="text-[10px] text-[var(--text-tertiary)] uppercase font-black">{m.tipo}</div>
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {m.utenteId ? (
                          <button
                            onClick={() => navigate(`/utentes?utenteId=${m.utenteId}&tab=pagamentos`)}
                            className="text-[#00E5FF] hover:text-[#00E5FF] hover:underline transition-colors text-left"
                            title="Ver ficha do utente"
                          >
                            {m.utente || "—"}
                          </button>
                        ) : (
                          <span className="text-[var(--text-secondary)]">{m.utente || "—"}</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-[var(--text-primary)] text-right">{sm} {fmtEuro(m.valor)}</td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <span className={`px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${
                            m.estado === 'paga' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 
                            m.estado === 'pendente' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 
                            'bg-[var(--bg-overlay)] text-[var(--text-tertiary)] border border-[var(--border-light)]'
                          }`}>
                            {m.estado}
                          </span>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-xs text-[var(--text-tertiary)]">Nenhum movimento registado este mês.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card-premium p-6">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00E5FF]" /> Metas do Mês
            </h3>
            <div className="space-y-6">
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-[var(--text-secondary)]">Faturação</span>
                  <span className="text-[var(--text-primary)]">75%</span>
                </div>
                <div className="h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                  <div className="h-full bg-[#00E5FF] rounded-full shadow-[0_0_10px_rgba(0,229,255,0.5)]" style={{ width: '75%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2">
                  <span className="text-[var(--text-secondary)]">Novos Utentes</span>
                  <span className="text-[var(--text-primary)]">40%</span>
                </div>
                <div className="h-2 bg-[var(--bg-overlay)] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-500 rounded-full shadow-[0_0_10px_rgba(16,185,129,0.5)]" style={{ width: '40%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="card-premium p-6">
            <h3 className="text-sm font-black text-[var(--text-primary)] uppercase tracking-widest mb-6 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#00E5FF]" /> Métodos de Pagamento
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Multibanco', valor: 65, cor: 'bg-[#00E5FF]' },
                { label: 'Numerário', valor: 20, cor: 'bg-emerald-500' },
                { label: 'MB Way', valor: 15, cor: 'bg-blue-500' }
              ].map(item => (
                <div key={item.label} className="flex items-center gap-4">
                  <div className={`w-2 h-2 rounded-full ${item.cor}`} />
                  <div className="flex-1 text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-widest">{item.label}</div>
                  <div className="text-[10px] font-black text-[var(--text-primary)]">{item.valor}%</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {mostrarModalTratamento && (
        <ModalRegistarTratamento 
          onClose={() => setMostrarModalTratamento(false)} 
          onSuccess={() => {
            statsQuery.refetch();
            movimentosQuery.refetch();
          }} 
        />
      )}
    </div>
  );
}
