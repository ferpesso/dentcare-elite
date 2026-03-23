/**
 * OrtodontiaAvancada.tsx — Módulo de Ortodontia Premium
 * DentCare Elite V35 — Redesign Premium
 *
 * Funcionalidades:
 * - Timeline visual de tratamento com barra de progressão por fases
 * - Tracking de alinhadores com contagem e previsão de conclusão
 * - Cefalometria simplificada com métricas pré-definidas
 * - Comparação antes/depois
 * - Quick-actions com presets (avançar fase, registar ativação, agendar controlo)
 * - Resumo financeiro integrado
 */
import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  Target, Calendar, Clock, User, ChevronDown, ChevronRight,
  CheckCircle, Circle, Play, Pause, SkipForward, CalendarPlus,
  Edit2, Loader2, TrendingUp, AlertTriangle, Sparkles,
  BarChart3, Activity, Zap, Eye, Layers, Hash,
  ArrowRight, Timer, Award, RefreshCw, Plus,
  FileText, NotebookPen, Euro, Package, X,
  ChevronUp, Milestone, Ruler, Camera, Ban,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface FaseOrtodontia {
  id: string;
  nome: string;
  descricao: string;
  icon: React.ComponentType<any>;
  duracaoEstimadaMeses: number;
  estado: "concluido" | "em_progresso" | "pendente";
  dataInicio?: string;
  dataConclusao?: string;
}

interface AlinhadoresData {
  totalAlinhadores: number;
  alinhadorActual: number;
  diasPorAlinhador: number;
  dataInicio: string;
  ultimaTroca: string;
  proximaTroca: string;
}

interface MetricaCefalometrica {
  nome: string;
  sigla: string;
  valorNormal: string;
  valorPaciente: string;
  unidade: string;
  estado: "normal" | "alterado" | "critico";
}

// ─── Presets de Fases ───────────────────────────────────────────────────────
const FASES_PRESET_BRACKETS: FaseOrtodontia[] = [
  { id: "1", nome: "Documentação Inicial", descricao: "Modelos, fotografias, radiografias, cefalometria", icon: FileText, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "2", nome: "Planeamento", descricao: "Análise cefalométrica, plano de tratamento, setup", icon: Target, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "3", nome: "Colagem de Brackets", descricao: "Colagem directa ou indirecta de brackets", icon: Zap, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "4", nome: "Alinhamento e Nivelamento", descricao: "Arcos leves NiTi para alinhamento inicial", icon: Layers, duracaoEstimadaMeses: 4, estado: "pendente" },
  { id: "5", nome: "Correcção de Mordida", descricao: "Arcos de aço, elásticos intermaxilares", icon: Activity, duracaoEstimadaMeses: 6, estado: "pendente" },
  { id: "6", nome: "Finalização", descricao: "Detalhamento, ajustes finos, dobras de finalização", icon: Award, duracaoEstimadaMeses: 3, estado: "pendente" },
  { id: "7", nome: "Remoção e Contenção", descricao: "Remoção dos brackets, contenção fixa/removível", icon: CheckCircle, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "8", nome: "Acompanhamento", descricao: "Controlo pós-tratamento, estabilidade", icon: Eye, duracaoEstimadaMeses: 12, estado: "pendente" },
];

const FASES_PRESET_ALINHADORES: FaseOrtodontia[] = [
  { id: "1", nome: "Documentação e Scan", descricao: "Scan intraoral, fotografias, radiografias", icon: Camera, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "2", nome: "Planeamento Digital", descricao: "ClinCheck/simulação 3D, aprovação do plano", icon: Target, duracaoEstimadaMeses: 1, estado: "pendente" },
  { id: "3", nome: "Entrega dos Alinhadores", descricao: "Entrega do primeiro set, instruções ao paciente", icon: Package, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "4", nome: "Fase Activa", descricao: "Trocas de alinhadores conforme protocolo", icon: Activity, duracaoEstimadaMeses: 8, estado: "pendente" },
  { id: "5", nome: "Refinamento", descricao: "Novos alinhadores de refinamento se necessário", icon: Edit2, duracaoEstimadaMeses: 3, estado: "pendente" },
  { id: "6", nome: "Contenção", descricao: "Contenção fixa e/ou removível", icon: CheckCircle, duracaoEstimadaMeses: 0.5, estado: "pendente" },
  { id: "7", nome: "Acompanhamento", descricao: "Controlo pós-tratamento", icon: Eye, duracaoEstimadaMeses: 12, estado: "pendente" },
];

const METRICAS_CEFALOMETRICAS_PRESET: MetricaCefalometrica[] = [
  { nome: "Ângulo SNA", sigla: "SNA", valorNormal: "82° ± 2°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Ângulo SNB", sigla: "SNB", valorNormal: "80° ± 2°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Ângulo ANB", sigla: "ANB", valorNormal: "2° ± 2°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Ângulo do Plano Mandibular", sigla: "GoGn-SN", valorNormal: "32° ± 5°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Overjet", sigla: "OJ", valorNormal: "2-4 mm", valorPaciente: "", unidade: "mm", estado: "normal" },
  { nome: "Overbite", sigla: "OB", valorNormal: "2-4 mm", valorPaciente: "", unidade: "mm", estado: "normal" },
  { nome: "Inclinação Incisivo Superior", sigla: "U1-SN", valorNormal: "104° ± 6°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Inclinação Incisivo Inferior", sigla: "L1-GoGn", valorNormal: "93° ± 6°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Ângulo Nasolabial", sigla: "NLA", valorNormal: "90-110°", valorPaciente: "", unidade: "°", estado: "normal" },
  { nome: "Wits Appraisal", sigla: "Wits", valorNormal: "0 ± 2 mm", valorPaciente: "", unidade: "mm", estado: "normal" },
];

// ─── Componente Principal ───────────────────────────────────────────────────
interface OrtodontiaAvancadaProps {
  tratamentos: any[];
  consultas: any[];
  simboloMoeda: string;
  utenteId: number;
  onRefresh: () => void;
}

export function OrtodontiaAvancada({
  tratamentos, consultas, simboloMoeda, utenteId, onRefresh,
}: OrtodontiaAvancadaProps) {
  // Filtrar tratamentos ortodônticos
  const tratamentosOrto = useMemo(() => {
    return tratamentos.filter(t => {
      const desc = (t.descricao || "").toLowerCase();
      return desc.includes("ortod") || desc.includes("alinhador") || desc.includes("bracket") || desc.includes("invisalign") || desc.includes("aparelho");
    }).sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
  }, [tratamentos]);

  const [tratSelecionado, setTratSelecionado] = useState<number>(0);
  const [tipoTratamento, setTipoTratamento] = useState<"brackets" | "alinhadores">("alinhadores");
  const [fases, setFases] = useState<FaseOrtodontia[]>(FASES_PRESET_ALINHADORES.map(f => ({
    ...f,
    estado: "pendente" as const,
  })));
  const [showCefalometria, setShowCefalometria] = useState(false);
  const [metricas, setMetricas] = useState<MetricaCefalometrica[]>(METRICAS_CEFALOMETRICAS_PRESET);
  const [showNovaFase, setShowNovaFase] = useState(false);
  const [expandedTrat, setExpandedTrat] = useState<number | null>(tratamentosOrto[0]?.id || null);
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; estado: string; descricao: string } | null>(null);

  // ─── Mutation para actualizar estado do tratamento ─────────────────────────
  const actualizarMutation = trpc.tratamentos.actualizarTratamento.useMutation({
    onSuccess: () => {
      onRefresh();
      setToast({ msg: "Tratamento actualizado com sucesso", tipo: "success" });
      setConfirmAction(null);
      setTimeout(() => setToast(null), 3000);
    },
    onError: (e: any) => {
      setToast({ msg: parseApiError(e, "Erro ao actualizar tratamento"), tipo: "error" });
      setConfirmAction(null);
      setTimeout(() => setToast(null), 5000);
    },
  });

  const handleMudarEstado = useCallback((tratamentoId: number, novoEstado: string) => {
    actualizarMutation.mutate({ id: tratamentoId, estado: novoEstado as "pendente" | "proposto" | "em_progresso" | "concluido" | "cancelado" | "anulado" });
  }, [actualizarMutation]);

  const handleFinalizarTratamento = useCallback((t: any) => {
    setConfirmAction({ id: t.id, estado: "concluido", descricao: t.descricao });
  }, []);

  const handleCancelarTratamento = useCallback((t: any) => {
    setConfirmAction({ id: t.id, estado: "cancelado", descricao: t.descricao });
  }, []);

  const confirmarAccao = useCallback(() => {
    if (confirmAction) {
      handleMudarEstado(confirmAction.id, confirmAction.estado);
    }
  }, [confirmAction, handleMudarEstado]);

  // Alinhadores tracking — valores em branco, preenchidos pelo utilizador
  const [alinhadores, setAlinhadores] = useState<AlinhadoresData>({
    totalAlinhadores: 0,
    alinhadorActual: 0,
    diasPorAlinhador: 14,
    dataInicio: new Date().toISOString(),
    ultimaTroca: new Date().toISOString(),
    proximaTroca: new Date(Date.now() + 14 * 86400000).toISOString(),
  });

  // ─── Cálculos ─────────────────────────────────────────────────────────────
  const progressoFases = useMemo(() => {
    const concluidas = fases.filter(f => f.estado === "concluido").length;
    return Math.round((concluidas / fases.length) * 100);
  }, [fases]);

  const faseActual = useMemo(() => fases.find(f => f.estado === "em_progresso"), [fases]);

  const progressoAlinhadores = useMemo(() => {
    return Math.round((alinhadores.alinhadorActual / alinhadores.totalAlinhadores) * 100);
  }, [alinhadores]);

  const diasRestantes = useMemo(() => {
    const restantes = alinhadores.totalAlinhadores - alinhadores.alinhadorActual;
    return restantes * alinhadores.diasPorAlinhador;
  }, [alinhadores]);

  const previsaoConclusao = useMemo(() => {
    const data = new Date(Date.now() + diasRestantes * 86400000);
    return data.toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
  }, [diasRestantes]);

  const consultasOrto = useMemo(() => {
    return consultas.filter(c => {
      const tipo = (c.tipoConsulta || "").toLowerCase();
      return tipo.includes("ortod") || tipo.includes("controlo") || tipo.includes("alinhador");
    }).sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime());
  }, [consultas]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const avancarFase = useCallback(() => {
    setFases(prev => {
      const idx = prev.findIndex(f => f.estado === "em_progresso");
      if (idx === -1) return prev;
      const novo = [...prev];
      novo[idx] = { ...novo[idx], estado: "concluido", dataConclusao: new Date().toISOString() };
      if (idx + 1 < novo.length) {
        novo[idx + 1] = { ...novo[idx + 1], estado: "em_progresso", dataInicio: new Date().toISOString() };
      }
      return novo;
    });
  }, []);

  const trocarAlinhador = useCallback(() => {
    setAlinhadores(prev => ({
      ...prev,
      alinhadorActual: Math.min(prev.alinhadorActual + 1, prev.totalAlinhadores),
      ultimaTroca: new Date().toISOString(),
      proximaTroca: new Date(Date.now() + prev.diasPorAlinhador * 86400000).toISOString(),
    }));
  }, []);

  const aplicarPresetTipo = useCallback((tipo: "brackets" | "alinhadores") => {
    setTipoTratamento(tipo);
    const preset = tipo === "brackets" ? FASES_PRESET_BRACKETS : FASES_PRESET_ALINHADORES;
    setFases(preset.map(f => ({
      ...f,
      estado: "pendente" as const,
    })));
  }, []);

  const updateMetrica = useCallback((idx: number, valor: string) => {
    setMetricas(prev => {
      const novo = [...prev];
      novo[idx] = { ...novo[idx], valorPaciente: valor };
      // Auto-detectar estado
      const numVal = parseFloat(valor);
      if (!isNaN(numVal)) {
        const normal = novo[idx].valorNormal;
        const match = normal.match(/(\d+(?:\.\d+)?)/);
        if (match) {
          const ref = parseFloat(match[1]);
          const diff = Math.abs(numVal - ref);
          novo[idx].estado = diff <= 2 ? "normal" : diff <= 5 ? "alterado" : "critico";
        }
      }
      return novo;
    });
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Toast Notification ──────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl animate-in slide-in-from-top-2 fade-in duration-300 ${
          toast.tipo === "success" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-300" :
          toast.tipo === "error" ? "bg-red-500/20 border-red-500/30 text-red-300" :
          toast.tipo === "warning" ? "bg-amber-500/20 border-amber-500/30 text-amber-300" :
          "bg-[#00E5FF]/20 border-[#00E5FF]/30 text-[#00E5FF]"
        }`}>
          {toast.tipo === "success" ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          <span className="text-sm font-bold">{toast.msg}</span>
          <button onClick={() => setToast(null)} className="ml-2 opacity-60 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
        </div>
      )}

      {/* ─── Modal de Confirmação ────────────────────────────────────────────── */}
      {confirmAction && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                confirmAction.estado === "concluido" ? "bg-emerald-500/20 border border-emerald-500/30" :
                "bg-red-500/20 border border-red-500/30"
              }`}>
                {confirmAction.estado === "concluido" ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <Ban className="w-6 h-6 text-red-400" />}
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-bold text-lg">
                  {confirmAction.estado === "concluido" ? "Finalizar Tratamento" : "Cancelar Tratamento"}
                </h3>
                <p className="text-[var(--text-muted)] text-xs">Esta acção irá alterar o estado do tratamento</p>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] mb-5">
              <p className="text-[var(--text-primary)] text-sm font-semibold">{confirmAction.descricao}</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                Estado actual → <span className={`font-bold ${
                  confirmAction.estado === "concluido" ? "text-emerald-300" : "text-red-300"
                }`}>{confirmAction.estado === "concluido" ? "Concluído" : "Cancelado"}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">
                Voltar
              </button>
              <button onClick={confirmarAccao} disabled={actualizarMutation.isPending}
                className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                  confirmAction.estado === "concluido" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-red-500 hover:bg-red-600"
                } disabled:opacity-50`}>
                {actualizarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 
                  confirmAction.estado === "concluido" ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                {confirmAction.estado === "concluido" ? "Finalizar" : "Cancelar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-orange-500/5 to-amber-500/5 border border-orange-500/20 backdrop-blur-xl shadow-sm flex-wrap">
        <button onClick={avancarFase}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500/50 shadow-sm shadow-emerald-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <SkipForward className="w-3.5 h-3.5" /> Avançar Fase
        </button>
        {tipoTratamento === "alinhadores" && (
          <button onClick={trocarAlinhador}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border bg-[#00E5FF] hover:bg-[#00E5FF] text-white border-[#00E5FF]/50 shadow-sm shadow-[#00E5FF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
            <ArrowRight className="w-3.5 h-3.5" /> Trocar Alinhador
          </button>
        )}
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1 shrink-0" />
        <button onClick={() => setShowCefalometria(!showCefalometria)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showCefalometria ? "bg-violet-500/20 text-violet-300 border-violet-500/30" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)]"}`}>
          <Ruler className="w-3.5 h-3.5" /> Cefalometria
        </button>
        <div className="ml-auto flex items-center gap-2">
          <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-0.5">
            <button onClick={() => aplicarPresetTipo("alinhadores")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${tipoTratamento === "alinhadores" ? "bg-orange-500/20 text-orange-300" : "text-[var(--text-muted)]"}`}>
              Alinhadores
            </button>
            <button onClick={() => aplicarPresetTipo("brackets")}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all ${tipoTratamento === "brackets" ? "bg-orange-500/20 text-orange-300" : "text-[var(--text-muted)]"}`}>
              Brackets
            </button>
          </div>
          <button onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
        </div>
      </div>

      {/* ─── KPIs de Progressão ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center">
              <Target className="w-5 h-5 text-orange-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Progresso Geral</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{progressoFases}%</p>
            </div>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-700" style={{ width: `${progressoFases}%` }} />
          </div>
        </div>

        {tipoTratamento === "alinhadores" && (
          <div className="card-premium p-4 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/15 border border-[#00E5FF]/30 flex items-center justify-center">
                <Layers className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Alinhadores</p>
                <p className="text-[var(--text-primary)] text-xl font-black">
                  {alinhadores.totalAlinhadores === 0 ? "—" : `${alinhadores.alinhadorActual}/${alinhadores.totalAlinhadores}`}
                </p>
              </div>
            </div>
            <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
              <div className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-blue-500 transition-all duration-700" style={{ width: `${progressoAlinhadores}%` }} />
            </div>
          </div>
        )}

        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Timer className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Previsão Conclusão</p>
              <p className="text-[var(--text-primary)] text-sm font-black capitalize">
                {diasRestantes === 0 ? "—" : previsaoConclusao}
              </p>
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-[10px]">
            {diasRestantes === 0 ? "Configure as fases para calcular" : `~${diasRestantes} dias restantes`}
          </p>
        </div>

        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Consultas Orto</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{consultasOrto.length}</p>
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-[10px]">{consultasOrto.filter(c => new Date(c.dataHoraInicio) > new Date()).length} agendadas</p>
        </div>
      </div>

      {/* ─── Tracking de Alinhadores ─────────────────────────────────────────── */}
      {tipoTratamento === "alinhadores" && (
        <div className="card-premium p-5 border border-[#00E5FF]/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#00E5FF]" />
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Tracking de Alinhadores</h3>
            </div>
            <button onClick={trocarAlinhador}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/25 transition-all">
              <ArrowRight className="w-3.5 h-3.5" /> Registar Troca
            </button>
          </div>

          {/* Barra visual de alinhadores */}
          {alinhadores.totalAlinhadores === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 mb-4 rounded-xl bg-[var(--bg-secondary)] border border-dashed border-[var(--border-primary)]">
              <Layers className="w-8 h-8 text-[var(--text-muted)] mb-2 opacity-40" />
              <p className="text-[var(--text-muted)] text-xs font-medium">Sem alinhadores configurados</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">Configure o total de alinhadores para iniciar o tracking</p>
            </div>
          ) : (
            <div className="flex gap-0.5 mb-4 overflow-x-auto pb-2">
              {Array.from({ length: alinhadores.totalAlinhadores }, (_, i) => {
                const num = i + 1;
                const isCurrent = num === alinhadores.alinhadorActual;
                const isDone = num < alinhadores.alinhadorActual;
                return (
                  <div key={num} className={`flex-shrink-0 w-8 h-10 rounded-lg flex items-center justify-center text-[9px] font-bold border transition-all ${isCurrent ? "bg-[#00E5FF]/30 border-[#00E5FF]/50 text-[#00E5FF] ring-2 ring-[#00E5FF]/30 scale-110" : isDone ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}
                    title={`Alinhador ${num}${isCurrent ? " (actual)" : isDone ? " (concluído)" : ""}`}>
                    {isDone ? <CheckCircle className="w-3 h-3" /> : num}
                  </div>
                );
              })}
            </div>
          )}

          {/* Info cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase">Última Troca</p>
              <p className="text-[var(--text-primary)] text-xs font-bold mt-1">{new Date(alinhadores.ultimaTroca).toLocaleDateString("pt-PT")}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase">Próxima Troca</p>
              <p className="text-[#00E5FF] text-xs font-bold mt-1">{new Date(alinhadores.proximaTroca).toLocaleDateString("pt-PT")}</p>
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase">Dias/Alinhador</p>
              <p className="text-[var(--text-primary)] text-xs font-bold mt-1">{alinhadores.diasPorAlinhador} dias</p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Timeline de Fases ───────────────────────────────────────────────── */}
      <div className="card-premium p-5 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Milestone className="w-5 h-5 text-orange-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Fases do Tratamento</h3>
            <span className="text-[var(--text-muted)] text-[10px]">({fases.filter(f => f.estado === "concluido").length}/{fases.length} concluídas)</span>
          </div>
          <button onClick={avancarFase} disabled={!faseActual}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all disabled:opacity-40">
            <SkipForward className="w-3.5 h-3.5" /> Avançar
          </button>
        </div>

        {/* Progress bar geral */}
        <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden mb-6">
          <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all duration-700" style={{ width: `${progressoFases}%` }} />
        </div>

        {/* Timeline vertical */}
        <div className="space-y-0">
          {fases.map((fase, i) => {
            const Icon = fase.icon;
            const isCompleted = fase.estado === "concluido";
            const isCurrent = fase.estado === "em_progresso";
            const isLast = i === fases.length - 1;

            return (
              <div key={fase.id} className="flex gap-4">
                {/* Linha vertical + ícone */}
                <div className="flex flex-col items-center">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-all ${isCurrent ? "bg-orange-500/20 border-2 border-orange-500/50 shadow-lg shadow-orange-500/10" : isCompleted ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-[var(--bg-secondary)] border border-[var(--border-primary)]"}`}>
                    {isCompleted ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : isCurrent ? (
                      <Icon className="w-5 h-5 text-orange-400 animate-pulse" />
                    ) : (
                      <Icon className="w-5 h-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  {!isLast && (
                    <div className={`w-0.5 h-12 ${isCompleted ? "bg-emerald-500/30" : "bg-[var(--border-primary)]"}`} />
                  )}
                </div>

                {/* Conteúdo */}
                <div className={`flex-1 pb-4 ${!isLast ? "mb-0" : ""}`}>
                  <div className={`p-4 rounded-xl border transition-all ${isCurrent ? "bg-orange-500/5 border-orange-500/20" : isCompleted ? "bg-emerald-500/5 border-emerald-500/15" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] opacity-60"}`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className={`text-sm font-bold ${isCurrent ? "text-orange-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>
                        {fase.nome}
                      </h4>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-lg ${isCurrent ? "bg-orange-500/20 text-orange-300" : isCompleted ? "bg-emerald-500/15 text-emerald-300" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}>
                        {isCompleted ? "Concluído" : isCurrent ? "Em Curso" : "Pendente"}
                      </span>
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">{fase.descricao}</p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-muted)]">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> ~{fase.duracaoEstimadaMeses} meses</span>
                      {fase.dataInicio && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(fase.dataInicio).toLocaleDateString("pt-PT")}</span>}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Cefalometria ────────────────────────────────────────────────────── */}
      {showCefalometria && (
        <div className="card-premium p-5 border border-violet-500/20 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Ruler className="w-5 h-5 text-violet-400" />
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Análise Cefalométrica</h3>
              <span className="text-[var(--text-muted)] text-[10px]">— Preencha os valores medidos</span>
            </div>
            <button onClick={() => setShowCefalometria(false)}
              className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {metricas.map((m, idx) => (
              <div key={m.sigla} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${m.valorPaciente ? (m.estado === "normal" ? "bg-emerald-500/5 border-emerald-500/20" : m.estado === "alterado" ? "bg-amber-500/5 border-amber-500/20" : "bg-red-500/5 border-red-500/20") : "bg-[var(--bg-secondary)] border-[var(--border-primary)]"}`}>
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-xs font-black ${m.valorPaciente ? (m.estado === "normal" ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : m.estado === "alterado" ? "bg-amber-500/15 text-amber-400 border border-amber-500/30" : "bg-red-500/15 text-red-400 border border-red-500/30") : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border border-[var(--border-primary)]"}`}>
                  {m.sigla.slice(0, 3)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-xs font-semibold">{m.nome}</p>
                  <p className="text-[var(--text-muted)] text-[10px]">Normal: {m.valorNormal}</p>
                </div>
                <input
                  type="text"
                  value={m.valorPaciente}
                  onChange={e => updateMetrica(idx, e.target.value)}
                  placeholder={m.unidade}
                  className="w-16 px-2 py-1.5 rounded-lg bg-[var(--bg-primary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-xs text-center font-bold focus:border-violet-500/50 focus:outline-none transition-colors"
                />
              </div>
            ))}
          </div>

          {/* Resumo cefalométrico */}
          {metricas.some(m => m.valorPaciente) && (
            <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4 text-violet-400" />
                <p className="text-[var(--text-primary)] text-xs font-bold">Resumo</p>
              </div>
              <div className="flex items-center gap-4">
                {[
                  { label: "Normal", count: metricas.filter(m => m.valorPaciente && m.estado === "normal").length, cor: "text-emerald-400" },
                  { label: "Alterado", count: metricas.filter(m => m.valorPaciente && m.estado === "alterado").length, cor: "text-amber-400" },
                  { label: "Crítico", count: metricas.filter(m => m.valorPaciente && m.estado === "critico").length, cor: "text-red-400" },
                  { label: "Pendente", count: metricas.filter(m => !m.valorPaciente).length, cor: "text-[var(--text-muted)]" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-1.5">
                    <span className={`text-sm font-black ${s.cor}`}>{s.count}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{s.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── Tratamentos Ortodônticos Existentes ─────────────────────────────── */}
      {tratamentosOrto.length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-400" />
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Tratamentos Ortodônticos ({tratamentosOrto.length})</h3>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {tratamentosOrto.map(t => {
              const isExpanded = expandedTrat === t.id;
              const mesesDecorridos = Math.max(1, Math.round((Date.now() - new Date(t.dataInicio).getTime()) / (30 * 86400000)));
              return (
                <div key={t.id}>
                  <button onClick={() => setExpandedTrat(isExpanded ? null : t.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center shrink-0">
                      <Target className="w-5 h-5 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-bold">{t.descricao}</p>
                      <div className="flex items-center gap-3 text-[var(--text-muted)] text-[10px] mt-0.5">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(t.dataInicio).toLocaleDateString("pt-PT")}</span>
                        {t.medicoNome && <span className="flex items-center gap-1"><User className="w-3 h-3" />Dr(a). {t.medicoNome}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mesesDecorridos} meses</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${t.estado === "em_progresso" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : t.estado === "concluido" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>
                        {t.estado?.replace("_", " ")}
                      </span>
                      {t.valorBruto && parseFloat(t.valorBruto) > 0 && (
                        <span className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(t.valorBruto).toFixed(2)}</span>
                      )}
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-5 pb-5 space-y-4 border-t border-[var(--border-primary)] pt-4 animate-in fade-in duration-200">
                      {/* Acções do tratamento */}
                      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mr-2">Ac\u00e7\u00f5es:</span>
                        {(t.estado === "pendente" || t.estado === "proposto") && (
                          <button onClick={() => handleMudarEstado(t.id, "em_progresso")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-all">
                            <Play className="w-3 h-3" /> Iniciar
                          </button>
                        )}
                        {(t.estado === "em_progresso" || t.estado === "pendente" || t.estado === "proposto") && (
                          <button onClick={() => handleFinalizarTratamento(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all">
                            <CheckCircle className="w-3 h-3" /> Finalizar
                          </button>
                        )}
                        {t.estado !== "concluido" && t.estado !== "cancelado" && t.estado !== "anulado" && (
                          <button onClick={() => handleCancelarTratamento(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all">
                            <Ban className="w-3 h-3" /> Cancelar
                          </button>
                        )}
                        {t.estado === "concluido" && (
                          <button onClick={() => handleMudarEstado(t.id, "em_progresso")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all">
                            <RefreshCw className="w-3 h-3" /> Reabrir
                          </button>
                        )}
                        {actualizarMutation.isPending && (
                          <Loader2 className="w-4 h-4 text-orange-400 animate-spin ml-auto" />
                        )}
                      </div>
                      {/* Consultas de controlo */}
                      {consultasOrto.length > 0 && (
                        <div>
                          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3">Consultas de Controlo</p>
                          <div className="space-y-2">
                            {consultasOrto.slice(0, 5).map(c => (
                              <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${new Date(c.dataHoraInicio) > new Date() ? "bg-[#00E5FF]/15 border border-[#00E5FF]/30" : "bg-emerald-500/15 border border-emerald-500/30"}`}>
                                  <Calendar className={`w-4 h-4 ${new Date(c.dataHoraInicio) > new Date() ? "text-[#00E5FF]" : "text-emerald-400"}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[var(--text-primary)] text-xs font-semibold">{c.tipoConsulta || "Consulta"}</p>
                                  <p className="text-[var(--text-muted)] text-[10px]">{new Date(c.dataHoraInicio).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
                                </div>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${c.estado === "realizada" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30"}`}>
                                  {c.estado}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Info financeira */}
                      {t.valorBruto && parseFloat(t.valorBruto) > 0 && (
                        <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20">
                          <div className="flex items-center gap-2 mb-3"><Euro className="w-4 h-4 text-violet-400" /><p className="text-[var(--text-primary)] text-xs font-bold">Informação Financeira</p></div>
                          <div className="grid grid-cols-3 gap-4">
                            <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Valor Total</p><p className="text-[var(--text-primary)] text-lg font-black">{simboloMoeda}{parseFloat(t.valorBruto).toFixed(2)}</p></div>
                            <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Duração</p><p className="text-[var(--text-primary)] text-lg font-black">{mesesDecorridos} meses</p></div>
                            <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Mensal</p><p className="text-[var(--text-primary)] text-lg font-black">{simboloMoeda}{(parseFloat(t.valorBruto) / Math.max(mesesDecorridos, 1)).toFixed(2)}</p></div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {tratamentosOrto.length === 0 && (
        <div className="card-premium border border-[var(--border-primary)] p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-500/15 border border-orange-500/30 flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-orange-400" />
          </div>
          <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Sem Tratamentos Ortodônticos</h3>
          <p className="text-[var(--text-muted)] text-sm mb-4">Os tratamentos ortodônticos do utente aparecerão aqui com acompanhamento detalhado.</p>
          <p className="text-[var(--text-muted)] text-xs">As fases acima são um template que pode personalizar para cada paciente.</p>
        </div>
      )}
    </div>
  );
}

export default OrtodontiaAvancada;
