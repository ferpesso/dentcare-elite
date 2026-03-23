/**
 * FaturacaoPage.tsx — Faturação Avançada e Business Intelligence
 * DentCare Elite V35 — Análise Financeira Profissional
 *
 * CORREÇÕES V32.6:
 * - Endpoint corrigido: agora chama financeiro.listarFaturas (novo endpoint no backend)
 * - formatMoeda com fallback seguro para valores string/null/undefined
 * - obterResumoCompleto agora recebe strings de data simples ("YYYY-MM-DD")
 * - Tabela de faturas mostra valorTotal, data, método de pagamento, NIF
 * - Exportar SAFT chama faturacao.exportarSaft (endpoint correto)
 * - Guards de nulidade em todos os .toFixed() para evitar crash
 */
import * as React from "react";
import { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { useConfig } from "../contexts/ConfigContext";
import { useLocation } from "wouter";
import {
  Euro, TrendingUp, TrendingDown, BarChart3, PieChart,
  Calendar, Filter, Search, Download, Plus, Edit2,
  Trash2, Eye, EyeOff, CheckCircle, AlertCircle,
  Clock, DollarSign, Percent, Users, Target,
  ArrowUp, ArrowDown, Zap, Award, Shield,
  FileText, Settings, RefreshCw, ChevronDown, X, Loader2
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface RentabilidadeMedico {
  medico: string;
  especialidade: string;
  faturacao: number;
  custos: number;
  lucro: number;
  comissao: number;
  percentualComissao: number;
  consultas: number;
  ticketMedio: number;
}

interface AnaliseIVA {
  periodo: string;
  ivaFaturado: number;
  ivaRecuperavel: number;
  saldoIVA: number;
}

// ─── Helper: formatar valor monetário com segurança ──────────────────────────
function fmtNum(valor: number | string | null | undefined): string {
  if (valor === null || valor === undefined) return "0.00";
  const n = typeof valor === "string" ? parseFloat(valor) : valor;
  return isNaN(n) ? "0.00" : n.toFixed(2);
}

/**
 * Converte valor que pode vir como string decimal da BD para número.
 * Essencial porque MySQL/Drizzle retorna decimals como string.
 */
function toNum(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = typeof val === "number" ? val : parseFloat(String(val));
  return isNaN(n) ? 0 : n;
}

// ─── Componente: Card de Métrica Financeira ───────────────────────────────────
function CardMetricaFinanceira({
  titulo,
  valor,
  icone: Icon,
  cor,
  subtitulo,
  variacao,
}: {
  titulo: string;
  valor: string;
  icone: React.ComponentType<any>;
  cor: string;
  subtitulo?: string;
  variacao?: { valor: number; positivo: boolean };
}) {
  return (
    <div className="card-premium p-5 border border-[var(--border-lighter)] hover:border-white/[0.12] transition-colors group">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${cor} bg-opacity-10 border border-current border-opacity-20 flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${cor}`} />
        </div>
        {variacao && (
          <div className={`flex items-center gap-0.5 text-xs font-semibold ${variacao.positivo ? "text-emerald-400" : "text-red-400"}`}>
            {variacao.positivo ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
            {variacao.valor}%
          </div>
        )}
      </div>
      <p className="text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest mb-1">{titulo}</p>
      <p className={`text-2xl font-black ${cor}`}>{valor}</p>
      {subtitulo && <p className="text-[var(--text-secondary)] text-xs mt-2">{subtitulo}</p>}
    </div>
  );
}

// ─── Componente: Tabela de Rentabilidade por Médico ────────────────────────────
function TabelaRentabilidade({ dados, simboloMoeda }: { dados: RentabilidadeMedico[], simboloMoeda: string }) {
  const [ordenacao, setOrdenacao] = useState<"faturacao" | "lucro" | "comissao">("faturacao");

  const dadosOrdenados = useMemo(() => {
    return [...dados].sort((a, b) => {
      if (ordenacao === "faturacao") return (b.faturacao ?? 0) - (a.faturacao ?? 0);
      if (ordenacao === "lucro") return (b.lucro ?? 0) - (a.lucro ?? 0);
      return (b.comissao ?? 0) - (a.comissao ?? 0);
    });
  }, [dados, ordenacao]);

  if (dados.length === 0) {
    return (
      <div className="card-premium border border-[var(--border-lighter)] overflow-hidden">
        <div className="p-5 border-b border-[var(--border-lighter)]">
          <h2 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
            <Users className="w-4 h-4 text-[#00E5FF]" />
            Rentabilidade por Médico
          </h2>
        </div>
        <div className="p-10 text-center text-[var(--text-tertiary)] text-sm">
          Sem dados de rentabilidade para o período selecionado.
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium border border-[var(--border-lighter)] overflow-hidden">
      <div className="p-5 border-b border-[var(--border-lighter)] flex items-center justify-between">
        <h2 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
          <Users className="w-4 h-4 text-[#00E5FF]" />
          Rentabilidade por Médico
        </h2>
        <div className="flex gap-1">
          {(["faturacao", "lucro", "comissao"] as const).map(ord => (
            <button
              key={ord}
              onClick={() => setOrdenacao(ord)}
              className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                ordenacao === ord
                  ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                  : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)] text-[var(--text-tertiary)]"
              }`}
            >
              {ord === "faturacao" ? "Faturação" : ord === "lucro" ? "Lucro" : "Comissão"}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-lighter)]">
              <th className="px-5 py-3 text-left text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Médico</th>
              <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Faturação</th>
              <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Custos</th>
              <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Lucro</th>
              <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Comissão</th>
              <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Ticket Médio</th>
              <th className="px-5 py-3 text-center text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Consultas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-lightest)]">
            {dadosOrdenados.map((r, i) => (
              <tr key={i} className="hover:bg-[var(--bg-surface)] transition-colors group">
                <td className="px-5 py-4">
                  <div>
                    <p className="text-[var(--text-primary)] font-bold">{r.medico ?? "—"}</p>
                    <p className="text-[var(--text-secondary)] text-xs">{r.especialidade ?? "—"}</p>
                  </div>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-[var(--text-primary)] font-black">{simboloMoeda}{fmtNum(r.faturacao)}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-[var(--text-secondary)]">{simboloMoeda}{fmtNum(r.custos)}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-emerald-400 font-black">{simboloMoeda}{fmtNum(r.lucro)}</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-[#00E5FF] font-black">{simboloMoeda}{fmtNum(r.comissao)}</p>
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold">{r.percentualComissao ?? 0}%</p>
                </td>
                <td className="px-5 py-4 text-right">
                  <p className="text-[var(--text-primary)] font-bold">{simboloMoeda}{fmtNum(r.ticketMedio)}</p>
                </td>
                <td className="px-5 py-4 text-center">
                  <span className="px-2 py-1 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 text-[10px] font-black">
                    {r.consultas ?? 0}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Componente: Análise de IVA ────────────────────────────────────────────────
function AnaliseIVAComponent({ dados, simboloMoeda }: { dados: AnaliseIVA[], simboloMoeda: string }) {
  const dadosValidos = dados.filter(d =>
    d && (d.ivaFaturado != null || d.ivaRecuperavel != null || d.saldoIVA != null)
  );

  if (dadosValidos.length === 0) {
    return (
      <div className="card-premium p-6 border border-[var(--border-lighter)]">
        <h2 className="text-[var(--text-primary)] font-bold text-sm mb-4 flex items-center gap-2">
          <Percent className="w-4 h-4 text-amber-400" />
          Análise de IVA
        </h2>
        <div className="p-6 text-center text-[var(--text-tertiary)] text-sm">
          Sem dados de IVA para o período selecionado.
        </div>
      </div>
    );
  }

  return (
    <div className="card-premium p-6 border border-[var(--border-lighter)]">
      <h2 className="text-[var(--text-primary)] font-bold text-sm mb-4 flex items-center gap-2">
        <Percent className="w-4 h-4 text-amber-400" />
        Análise de IVA
      </h2>
      <div className="space-y-3">
        {dadosValidos.map((d, i) => (
          <div key={i} className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)] hover:border-white/[0.12] transition-colors">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[var(--text-primary)] font-bold text-sm">{d.periodo}</p>
              <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-full ${
                (d.saldoIVA ?? 0) > 0
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border border-red-500/30"
              }`}>
                {(d.saldoIVA ?? 0) > 0 ? "A Receber" : "A Pagar"}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 text-[10px]">
              <div>
                <span className="text-[var(--text-tertiary)] font-black uppercase tracking-widest">IVA Faturado</span>
                <p className="text-[var(--text-primary)] font-black">{simboloMoeda}{fmtNum(d.ivaFaturado)}</p>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] font-black uppercase tracking-widest">IVA Recuperável</span>
                <p className="text-[var(--text-primary)] font-black">{simboloMoeda}{fmtNum(d.ivaRecuperavel)}</p>
              </div>
              <div>
                <span className="text-[var(--text-tertiary)] font-black uppercase tracking-widest">Saldo</span>
                <p className={`font-black ${(d.saldoIVA ?? 0) > 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {simboloMoeda}{fmtNum(Math.abs(d.saldoIVA ?? 0))}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function FaturacaoPage() {
  const { simboloMoeda, formatMoeda } = useConfig();
  const [, navigate] = useLocation();
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [exportandoSaft, setExportandoSaft] = useState(false);

  /**
   * CORRIGIDO V32.6: Chama financeiro.listarFaturas (novo endpoint no backend)
   * com input { limite, estado } — compatível com o que a FaturacaoPage espera.
   */
  const faturasQ = trpc.financeiro.listarFaturas.useQuery({
    limite: 100,
    estado: filtroEstado !== "todos" ? filtroEstado as "pendente" | "paga" | "anulada" : undefined,
  });

  /**
   * CORRIGIDO V32.6: Exportar SAFT agora chama faturacao.exportarSaft
   * com { ano, mes } em vez de { startDate, endDate }.
   */
  const exportarSaftMutation = trpc.faturacao.exportarSaft.useMutation();

  const handleExportSAFT = async () => {
    setExportandoSaft(true);
    try {
      const startD = new Date(startDate);
      const res = await exportarSaftMutation.mutateAsync({
        ano: startD.getFullYear(),
        mes: startD.getMonth() + 1,
      });
      if (res?.xml) {
        // Download do XML como ficheiro
        const blob = new Blob([res.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = res.nomeArquivo || `SAFT_PT_${startD.getFullYear()}.xml`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err: any) {
      alert(parseApiError(err, "Erro ao exportar SAFT"));
    } finally {
      setExportandoSaft(false);
    }
  };

  /**
   * CORRIGIDO V32.6: obterResumoCompleto agora aceita strings simples "YYYY-MM-DD"
   * (o backend converte internamente para Date com parseDateInput/parseDateEndInput)
   */
  const resumoQ = trpc.financeiro.obterResumoCompleto.useQuery({ startDate, endDate });
  const rentabilidadeQ = trpc.financeiro.obterRentabilidadeMedicos.useQuery({ startDate, endDate });
  const ivaQ = trpc.financeiro.obterAnaliseIVA.useQuery({ startDate, endDate });

  const faturas = (faturasQ.data as any)?.faturas ?? [];
  const resumo = (resumoQ.data as any) ?? { totalFaturado: 0, totalRecebido: 0, totalPendente: 0 };
  const rentabilidade: RentabilidadeMedico[] = Array.isArray(rentabilidadeQ.data) ? rentabilidadeQ.data as any : [];
  const ivaRaw = ivaQ.data as any;

  const ivaAnalise: AnaliseIVA[] = ivaRaw
    ? [{
        periodo: "Período Selecionado",
        ivaFaturado: ivaRaw.ivaFaturado ?? 0,
        ivaRecuperavel: ivaRaw.ivaRecuperavel ?? 0,
        saldoIVA: (ivaRaw.ivaRecuperavel ?? 0) - (ivaRaw.ivaFaturado ?? 0),
      }]
    : [];

  /**
   * formatMoeda seguro: converte string decimal para número antes de formatar.
   * O MySQL/Drizzle retorna campos decimal como string, e o formatMoeda original
   * pode não lidar com isso correctamente.
   */
  const fmtMoeda = (val: any): string => {
    const n = toNum(val);
    try {
      return formatMoeda(n);
    } catch {
      return `${simboloMoeda}${n.toFixed(2)}`;
    }
  };

  // Calcular totais a partir das faturas carregadas (para KPIs adicionais)
  const totalFaturasCount = faturas.length;
  const totalPagasCount = faturas.filter((f: any) => f.estado === "paga").length;
  const totalPendentesCount = faturas.filter((f: any) => f.estado === "pendente").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="page-header-title">Faturação e BI</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">Análise financeira e inteligência de negócio</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-[#00E5FF]" />
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none" />
            <span className="text-[var(--text-primary)]/20">—</span>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent text-xs text-[var(--text-primary)] focus:outline-none" />
          </div>
          <button
            onClick={() => { faturasQ.refetch(); resumoQ.refetch(); rentabilidadeQ.refetch(); ivaQ.refetch(); }}
            className="btn-secondary py-2 px-3 text-xs flex items-center gap-1"
            title="Atualizar dados"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={handleExportSAFT} disabled={exportandoSaft} className="btn-secondary py-2 px-4 text-xs flex items-center gap-2">
            {exportandoSaft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            Exportar SAF-T
          </button>
        </div>
      </div>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CardMetricaFinanceira
          titulo="Total Faturado"
          valor={fmtMoeda(resumo.totalFaturado)}
          icone={FileText}
          cor="text-[#00E5FF]"
          subtitulo={`${totalFaturasCount} faturas emitidas`}
        />
        <CardMetricaFinanceira
          titulo="Total Recebido"
          valor={fmtMoeda(resumo.totalRecebido)}
          icone={CheckCircle}
          cor="text-emerald-400"
          subtitulo={`${totalPagasCount} pagamentos confirmados`}
        />
        <CardMetricaFinanceira
          titulo="Pendente"
          valor={fmtMoeda(resumo.totalPendente)}
          icone={Clock}
          cor="text-amber-400"
          subtitulo={`${totalPendentesCount} faturas aguardando pagamento`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TabelaRentabilidade dados={rentabilidade} simboloMoeda={simboloMoeda} />

          {/* Tabela de Faturas — CORRIGIDA V32.6 */}
          <div className="card-premium border border-[var(--border-lighter)] overflow-hidden">
            <div className="p-5 border-b border-[var(--border-lighter)] flex items-center justify-between">
              <h2 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                Últimas Faturas
                {faturasQ.isLoading && <Loader2 className="w-3 h-3 animate-spin text-[#00E5FF]" />}
              </h2>
              <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)} className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] focus:outline-none">
                <option value="todos">Todos os Estados</option>
                <option value="paga">Pagas</option>
                <option value="pendente">Pendentes</option>
                <option value="anulada">Anuladas</option>
              </select>
            </div>

            {faturasQ.isError && (
              <div className="p-4 bg-red-500/10 border-b border-red-500/20 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Erro ao carregar faturas: {parseApiError(faturasQ.error)}
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border-lighter)]">
                    <th className="px-5 py-3 text-left text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Nº Fatura</th>
                    <th className="px-5 py-3 text-left text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Utente</th>
                    <th className="px-5 py-3 text-left text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Data</th>
                    <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Base</th>
                    <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">IVA</th>
                    <th className="px-5 py-3 text-right text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Total</th>
                    <th className="px-5 py-3 text-center text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Estado</th>
                    <th className="px-5 py-3 text-center text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">Método</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-lightest)]">
                  {faturas.length === 0 && !faturasQ.isLoading && (
                    <tr>
                      <td colSpan={8} className="px-5 py-10 text-center text-[var(--text-tertiary)] text-sm">
                        Nenhuma fatura encontrada para os filtros selecionados.
                      </td>
                    </tr>
                  )}
                  {faturas.map((f: any) => {
                    const dataEmissao = f.dataEmissao ? new Date(f.dataEmissao).toLocaleDateString("pt-PT") : "—";
                    const metodo = f.metodoPagamento
                      ? f.metodoPagamento === "numerario" ? "Numerário"
                        : f.metodoPagamento === "multibanco" ? "Multibanco"
                        : f.metodoPagamento === "mbway" ? "MB WAY"
                        : f.metodoPagamento === "transferencia" ? "Transferência"
                        : f.metodoPagamento
                      : "—";

                    return (
                      <tr key={f.id} className="hover:bg-[var(--bg-surface)] transition-colors">
                        <td className="px-5 py-4">
                          <p className="text-[var(--text-primary)] font-medium">{f.numeroFatura || "—"}</p>
                          {f.utenteNif && <p className="text-[var(--text-tertiary)] text-[10px]">NIF: {f.utenteNif}</p>}
                        </td>
                        <td className="px-5 py-4">
                          {f.utenteId ? (
                            <button
                              onClick={() => navigate(`/utentes?utenteId=${f.utenteId}&tab=pagamentos`)}
                              className="text-[#00E5FF] hover:text-[#00E5FF] hover:underline font-medium transition-colors text-left"
                              title="Ver ficha do utente"
                            >
                              {f.utenteNome || "—"}
                            </button>
                          ) : (
                            <span className="text-[var(--text-secondary)]">{f.utenteNome || "—"}</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[var(--text-secondary)] text-xs">{dataEmissao}</td>
                        <td className="px-5 py-4 text-right text-[var(--text-secondary)]">{simboloMoeda}{fmtNum(f.valorBase)}</td>
                        <td className="px-5 py-4 text-right text-[var(--text-tertiary)] text-xs">{simboloMoeda}{fmtNum(f.valorIva)}</td>
                        <td className="px-5 py-4 text-right">
                          <p className={`font-black ${
                            f.estado === "paga" ? "text-emerald-400" :
                            f.estado === "anulada" ? "text-red-400 line-through" :
                            "text-[var(--text-primary)]"
                          }`}>
                            {simboloMoeda}{fmtNum(f.valorTotal)}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase border ${
                            f.estado === "paga"
                              ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                              : f.estado === "pendente"
                              ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
                              : "bg-red-500/20 text-red-300 border-red-500/30"
                          }`}>
                            {f.estado === "paga" ? "Paga" : f.estado === "pendente" ? "Pendente" : "Anulada"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-center text-[var(--text-secondary)] text-xs">{metodo}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <AnaliseIVAComponent dados={ivaAnalise} simboloMoeda={simboloMoeda} />
          <div className="card-premium p-6 border border-[var(--border-lighter)]">
            <h2 className="text-[var(--text-primary)] font-bold text-sm mb-4 flex items-center gap-2">
              <Target className="w-4 h-4 text-[#00E5FF]" />
              Resumo Rápido
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Taxa de Cobrança</span>
                  <span className="text-[var(--text-primary)] font-bold">
                    {toNum(resumo.totalFaturado) > 0
                      ? Math.round((toNum(resumo.totalRecebido) / toNum(resumo.totalFaturado)) * 100)
                      : 0}%
                  </span>
                </div>
                <div className="h-1.5 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-500"
                    style={{
                      width: `${toNum(resumo.totalFaturado) > 0
                        ? Math.min(100, Math.round((toNum(resumo.totalRecebido) / toNum(resumo.totalFaturado)) * 100))
                        : 0}%`
                    }}
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-[var(--text-secondary)]">Faturas Pendentes</span>
                  <span className="text-amber-400 font-bold">{totalPendentesCount}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
