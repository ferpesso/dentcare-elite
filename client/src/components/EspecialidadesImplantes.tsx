/**
 * EspecialidadesImplantes.tsx — Módulo de Especialidades com foco em Implantologia
 * DentCare Elite V35 — Redesign Premium
 *
 * Funcionalidades:
 * - Grid de especialidades com contadores e valores
 * - Módulo de Implantologia completo com workflow de fases
 * - Ficha técnica do implante com presets de marcas/modelos
 * - Mapa visual de implantes no odontograma
 * - Barra de progressão por implante (osteointegração → prótese)
 * - Quick-actions com presets pré-selecionados
 */
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  Sparkles, Plus, Filter, RefreshCw, X, ChevronDown,
  Stethoscope, Calendar, Clock, User, Edit2, Trash2,
  CheckCircle, AlertTriangle, Target, Zap, Crown,
  Package, Award, Eye, Activity, TrendingUp,
  FileText, Hash, Layers, Timer, ArrowRight,
  Milestone, Settings, Wrench, Shield, Heart,
  Smile, CircleDot, BarChart3, Loader2, SkipForward,
  Ban, Play,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface ImplanteData {
  id: string;
  dente: number;
  marca: string;
  modelo: string;
  diametro: string;
  comprimento: string;
  plataforma: string;
  conexao: string;
  torqueInsercao: string;
  dataColocacao: string;
  faseActual: number;
  notas: string;
  ossoDisponivel: string;
  enxerto: boolean;
  tipoEnxerto: string;
  membranaGBR: boolean;
}

interface FaseImplante {
  id: number;
  nome: string;
  descricao: string;
  icon: React.ComponentType<any>;
  duracaoSemanas: number;
}

// ─── Configurações ──────────────────────────────────────────────────────────
const ESPECIALIDADES_CONFIG: Record<string, { icon: React.ComponentType<any>; cor: string; bg: string; border: string }> = {
  "Implantologia": { icon: Target, cor: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  "Endodontia": { icon: Zap, cor: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30" },
  "Periodontia": { icon: Heart, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30" },
  "Prostodontia": { icon: Crown, cor: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  "Cirurgia Oral": { icon: Wrench, cor: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30" },
  "Odontopediatria": { icon: Smile, cor: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  "Dentisteria": { icon: CircleDot, cor: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  "Geral": { icon: Stethoscope, cor: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/30" },
};

const FASES_IMPLANTE: FaseImplante[] = [
  { id: 1, nome: "Avaliação e Planeamento", descricao: "CBCT, planeamento digital, guia cirúrgica", icon: FileText, duracaoSemanas: 2 },
  { id: 2, nome: "Preparação Cirúrgica", descricao: "Enxerto ósseo, GBR, elevação de seio (se necessário)", icon: Shield, duracaoSemanas: 16 },
  { id: 3, nome: "Colocação do Implante", descricao: "Cirurgia de inserção do implante", icon: Target, duracaoSemanas: 1 },
  { id: 4, nome: "Osteointegração", descricao: "Período de cicatrização e integração óssea", icon: Timer, duracaoSemanas: 16 },
  { id: 5, nome: "Reabertura / 2ª Fase", descricao: "Colocação do pilar de cicatrização", icon: Wrench, duracaoSemanas: 3 },
  { id: 6, nome: "Impressão e Prótese", descricao: "Moldagem, provisório, prótese definitiva", icon: Crown, duracaoSemanas: 4 },
  { id: 7, nome: "Cimentação / Aparafusamento", descricao: "Colocação da prótese definitiva", icon: CheckCircle, duracaoSemanas: 1 },
  { id: 8, nome: "Manutenção", descricao: "Controlos periódicos, higienização", icon: Eye, duracaoSemanas: 52 },
];

const MARCAS_IMPLANTES = [
  { marca: "Straumann", modelos: ["BLT", "BLX", "TLX", "Tissue Level"], plataformas: ["RC", "NC", "WN"] },
  { marca: "Nobel Biocare", modelos: ["NobelActive", "NobelParallel CC", "NobelReplace CC", "Brånemark"], plataformas: ["NP", "RP", "WP"] },
  { marca: "Zimmer Biomet", modelos: ["T3", "TSV", "Trabecular Metal"], plataformas: ["3.5", "4.1", "5.7"] },
  { marca: "Dentsply Sirona", modelos: ["Astra EV", "Ankylos C/X", "XiVE"], plataformas: ["3.0", "3.5/4.0", "4.5/5.0"] },
  { marca: "Neodent", modelos: ["Grand Morse", "Helix", "Titamax"], plataformas: ["3.5", "4.0", "4.5"] },
  { marca: "MIS", modelos: ["C1", "V3", "Seven"], plataformas: ["NP", "SP", "WP"] },
  { marca: "Osstem", modelos: ["TS III", "TS IV", "MS"], plataformas: ["Mini", "Regular", "Wide"] },
  { marca: "Outro", modelos: ["Personalizado"], plataformas: ["Personalizado"] },
];

const DIAMETROS = ["3.0", "3.3", "3.5", "3.75", "4.0", "4.1", "4.5", "4.8", "5.0", "5.5", "6.0", "6.5"];
const COMPRIMENTOS = ["6.0", "7.0", "8.0", "8.5", "9.0", "10.0", "11.0", "11.5", "12.0", "13.0", "14.0", "15.0", "16.0"];
const CONEXOES = ["Cone Morse", "Hexágono Interno", "Hexágono Externo", "Tri-Channel", "Outro"];
const OSSO_TIPOS = ["D1 — Cortical denso", "D2 — Cortical espesso + trabecular denso", "D3 — Cortical fino + trabecular fino", "D4 — Trabecular fino"];

function inferirEspecialidade(descricao: string): string {
  const d = (descricao || "").toLowerCase();
  if (d.includes("implant")) return "Implantologia";
  if (d.includes("endod") || d.includes("canal")) return "Endodontia";
  if (d.includes("period") || d.includes("gengi") || d.includes("raspagem")) return "Periodontia";
  if (d.includes("protes") || d.includes("coroa") || d.includes("faceta") || d.includes("ponte")) return "Prostodontia";
  if (d.includes("cirug") || d.includes("extrac") || d.includes("siso")) return "Cirurgia Oral";
  if (d.includes("pediatr") || d.includes("criança") || d.includes("selante")) return "Odontopediatria";
  if (d.includes("restaur") || d.includes("carie") || d.includes("resina") || d.includes("compos")) return "Dentisteria";
  return "Geral";
}

// ─── Componente Principal ───────────────────────────────────────────────────
interface EspecialidadesImplantesProps {
  tratamentos: any[];
  faturas: any[];
  simboloMoeda: string;
  filtroInicial?: string;
  onRefresh: () => void;
  utenteId: number;
}

export function EspecialidadesImplantes({
  tratamentos, faturas, simboloMoeda, filtroInicial, onRefresh, utenteId,
}: EspecialidadesImplantesProps) {
  const [espSelecionada, setEspSelecionada] = useState(filtroInicial || "");
  const [showImplantologia, setShowImplantologia] = useState(false);
  const [showNovoImplante, setShowNovoImplante] = useState(false);
  const [implantes, setImplantes] = useState<ImplanteData[]>([]);
  const [implanteSel, setImplanteSel] = useState<string | null>(null);
  const [expandedImpl, setExpandedImpl] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ id: number; estado: string; descricao: string } | null>(null);
  const [expandedTrat, setExpandedTrat] = useState<number | null>(null);

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

  const handleIniciarTratamento = useCallback((t: any) => {
    handleMudarEstado(t.id, "em_progresso");
  }, [handleMudarEstado]);

  const confirmarAccao = useCallback(() => {
    if (confirmAction) {
      handleMudarEstado(confirmAction.id, confirmAction.estado);
    }
  }, [confirmAction, handleMudarEstado]);

  // Form state para novo implante
  const [formMarca, setFormMarca] = useState(MARCAS_IMPLANTES[0].marca);
  const [formModelo, setFormModelo] = useState(MARCAS_IMPLANTES[0].modelos[0]);
  const [formDente, setFormDente] = useState(0);
  const [formDiametro, setFormDiametro] = useState("4.0");
  const [formComprimento, setFormComprimento] = useState("10.0");
  const [formPlataforma, setFormPlataforma] = useState(MARCAS_IMPLANTES[0].plataformas[0]);
  const [formConexao, setFormConexao] = useState(CONEXOES[0]);
  const [formTorque, setFormTorque] = useState("35");
  const [formOsso, setFormOsso] = useState(OSSO_TIPOS[1]);
  const [formEnxerto, setFormEnxerto] = useState(false);
  const [formTipoEnxerto, setFormTipoEnxerto] = useState("");
  const [formMembrana, setFormMembrana] = useState(false);

  useEffect(() => { if (filtroInicial) setEspSelecionada(filtroInicial); }, [filtroInicial]);

  // ─── Agrupamento por especialidade ────────────────────────────────────────
  const especialidades = useMemo(() => {
    const map = new Map<string, any[]>();
    tratamentos.forEach(t => {
      const esp = inferirEspecialidade(t.descricao);
      const arr = map.get(esp) || [];
      arr.push(t);
      map.set(esp, arr);
    });
    return map;
  }, [tratamentos]);

  const marcaConfig = useMemo(() => {
    return MARCAS_IMPLANTES.find(m => m.marca === formMarca) || MARCAS_IMPLANTES[0];
  }, [formMarca]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const criarImplante = useCallback(() => {
    if (formDente <= 0) return;
    const novo: ImplanteData = {
      id: Date.now().toString(),
      dente: formDente,
      marca: formMarca,
      modelo: formModelo,
      diametro: formDiametro,
      comprimento: formComprimento,
      plataforma: formPlataforma,
      conexao: formConexao,
      torqueInsercao: formTorque,
      dataColocacao: new Date().toISOString(),
      faseActual: 1,
      notas: "",
      ossoDisponivel: formOsso,
      enxerto: formEnxerto,
      tipoEnxerto: formTipoEnxerto,
      membranaGBR: formMembrana,
    };
    setImplantes(prev => [...prev, novo]);
    setShowNovoImplante(false);
    // Reset form
    setFormDente(0);
  }, [formMarca, formModelo, formDente, formDiametro, formComprimento, formPlataforma, formConexao, formTorque, formOsso, formEnxerto, formTipoEnxerto, formMembrana]);

  const avancarFaseImplante = useCallback((implanteId: string) => {
    setImplantes(prev => prev.map(imp =>
      imp.id === implanteId ? { ...imp, faseActual: Math.min(imp.faseActual + 1, FASES_IMPLANTE.length) } : imp
    ));
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
      <div className="sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-[#00E5FF]/5 to-violet-500/5 border border-[#00E5FF]/20 backdrop-blur-xl shadow-sm flex-wrap">
        <button onClick={() => setShowImplantologia(!showImplantologia)}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showImplantologia ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-[#00E5FF] hover:bg-[#00E5FF] text-white border-[#00E5FF]/50"}`}>
          <Target className="w-3.5 h-3.5" /> Implantologia
        </button>
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1 shrink-0" />
        <button onClick={() => {
          if (espSelecionada) setEspSelecionada("");
        }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${espSelecionada ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)]"}`}>
          <Filter className="w-3.5 h-3.5" /> {espSelecionada ? `Filtro: ${espSelecionada}` : "Filtrar"}
        </button>
        <div className="ml-auto">
          <button onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
        </div>
      </div>

      {/* ─── Grid de Especialidades ──────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from(especialidades.entries()).map(([nome, trats]) => {
          const cfg = ESPECIALIDADES_CONFIG[nome] || ESPECIALIDADES_CONFIG["Geral"];
          const Icon = cfg.icon;
          const isSelected = espSelecionada === nome;
          const valor = trats.reduce((acc: number, t: any) => acc + parseFloat(t.valorBruto || "0"), 0);
          const emProgresso = trats.filter((t: any) => t.estado === "em_progresso").length;
          const concluidos = trats.filter((t: any) => t.estado === "concluido").length;
          const percentConcluido = trats.length > 0 ? Math.round((concluidos / trats.length) * 100) : 0;

          return (
            <button key={nome} onClick={() => setEspSelecionada(isSelected ? "" : nome)}
              className={`p-5 rounded-2xl border transition-all text-left ${isSelected ? `${cfg.bg} ${cfg.border} shadow-lg scale-[1.02]` : "card-premium border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
              <div className="flex items-center justify-between mb-3">
                <Icon className={`w-6 h-6 ${cfg.cor}`} />
                {emProgresso > 0 && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">{emProgresso} activo{emProgresso > 1 ? "s" : ""}</span>
                )}
              </div>
              <p className={`text-sm font-bold ${isSelected ? cfg.cor : "text-[var(--text-primary)]"}`}>{nome}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-1">{trats.length} tratamento{trats.length > 1 ? "s" : ""}</p>
              <p className="text-[var(--text-muted)] text-[10px]">{simboloMoeda}{valor.toFixed(2)}</p>
              {/* Mini progress */}
              <div className="mt-3 h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${percentConcluido}%`, backgroundColor: isSelected ? "currentColor" : "#34D399" }} />
              </div>
              <p className="text-[var(--text-muted)] text-[9px] mt-1">{percentConcluido}% concluído</p>
            </button>
          );
        })}
      </div>

      {/* ─── Tratamentos da Especialidade Selecionada ────────────────────────── */}
      {espSelecionada && especialidades.has(espSelecionada) && (
        <div className="card-premium border border-[var(--border-primary)] animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="p-5 border-b border-[var(--border-primary)]">
            <div className="flex items-center gap-2">
              {(() => { const cfg = ESPECIALIDADES_CONFIG[espSelecionada] || ESPECIALIDADES_CONFIG["Geral"]; const Icon = cfg.icon; return <Icon className={`w-5 h-5 ${cfg.cor}`} />; })()}
              <h3 className="text-[var(--text-primary)] font-bold text-sm">{espSelecionada}</h3>
              <span className="text-[var(--text-muted)] text-[10px]">({(especialidades.get(espSelecionada) || []).length} tratamentos)</span>
            </div>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {(especialidades.get(espSelecionada) || []).map((t: any) => {
              const cfg = ESPECIALIDADES_CONFIG[espSelecionada] || ESPECIALIDADES_CONFIG["Geral"];
              const isExpTrat = expandedTrat === t.id;
              const isConcluido = t.estado === "concluido";
              const isCancelado = t.estado === "cancelado" || t.estado === "anulado";
              const isEmProgresso = t.estado === "em_progresso";
              const isPendente = t.estado === "pendente" || t.estado === "proposto";
              return (
                <div key={t.id} className="group">
                  <button onClick={() => setExpandedTrat(isExpTrat ? null : t.id)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors text-left">
                    <div className={`w-9 h-9 rounded-xl ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                      {isConcluido ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Stethoscope className={`w-4 h-4 ${cfg.cor}`} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${isConcluido ? "text-emerald-300 line-through opacity-70" : "text-[var(--text-primary)]"}`}>{t.descricao}</p>
                      <p className="text-[var(--text-muted)] text-xs">{new Date(t.dataInicio).toLocaleDateString("pt-PT")}{t.medicoNome ? ` \u00b7 Dr(a). ${t.medicoNome}` : ""}</p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      {t.valorBruto && parseFloat(t.valorBruto) > 0 && <p className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(t.valorBruto).toFixed(2)}</p>}
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${isConcluido ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : isEmProgresso ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : isCancelado ? "bg-red-500/15 text-red-300 border-red-500/30" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>
                        {t.estado?.replace("_", " ")}
                      </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform shrink-0 ${isExpTrat ? "rotate-180" : ""}`} />
                  </button>
                  {/* ─── Painel expandido com acções ─── */}
                  {isExpTrat && (
                    <div className="px-4 pb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mr-2">Ac\u00e7\u00f5es:</span>
                        {/* Bot\u00e3o Iniciar - s\u00f3 se pendente/proposto */}
                        {isPendente && (
                          <button onClick={() => handleIniciarTratamento(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-blue-500/15 text-blue-300 border border-blue-500/30 hover:bg-blue-500/25 transition-all">
                            <Play className="w-3 h-3" /> Iniciar
                          </button>
                        )}
                        {/* Bot\u00e3o Finalizar - s\u00f3 se em_progresso ou pendente */}
                        {(isEmProgresso || isPendente) && (
                          <button onClick={() => handleFinalizarTratamento(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all">
                            <CheckCircle className="w-3 h-3" /> Finalizar
                          </button>
                        )}
                        {/* Bot\u00e3o Cancelar - s\u00f3 se n\u00e3o conclu\u00eddo/cancelado */}
                        {!isConcluido && !isCancelado && (
                          <button onClick={() => handleCancelarTratamento(t)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-red-500/15 text-red-300 border border-red-500/30 hover:bg-red-500/25 transition-all">
                            <Ban className="w-3 h-3" /> Cancelar
                          </button>
                        )}
                        {/* Bot\u00e3o Reabrir - se conclu\u00eddo */}
                        {isConcluido && (
                          <button onClick={() => handleMudarEstado(t.id, "em_progresso")}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-all">
                            <RefreshCw className="w-3 h-3" /> Reabrir
                          </button>
                        )}
                        {/* Indicador de loading */}
                        {actualizarMutation.isPending && (
                          <Loader2 className="w-4 h-4 text-[#00E5FF] animate-spin ml-auto" />
                        )}
                      </div>
                      {/* Detalhes do tratamento */}
                      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                          <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Estado</p>
                          <p className={`text-xs font-bold mt-0.5 ${isConcluido ? "text-emerald-300" : isEmProgresso ? "text-amber-300" : isCancelado ? "text-red-300" : "text-[var(--text-primary)]"}`}>
                            {t.estado?.replace("_", " ")}
                          </p>
                        </div>
                        <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                          <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">In\u00edcio</p>
                          <p className="text-[var(--text-primary)] text-xs font-bold mt-0.5">{new Date(t.dataInicio).toLocaleDateString("pt-PT")}</p>
                        </div>
                        {t.dente && (
                          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                            <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Dente</p>
                            <p className="text-[var(--text-primary)] text-xs font-bold mt-0.5">{t.dente}</p>
                          </div>
                        )}
                        {t.valorBruto && parseFloat(t.valorBruto) > 0 && (
                          <div className="p-2.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                            <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Valor</p>
                            <p className="text-[var(--text-primary)] text-xs font-bold mt-0.5">{simboloMoeda}{parseFloat(t.valorBruto).toFixed(2)}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MÓDULO DE IMPLANTOLOGIA */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showImplantologia && (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-400" />
              <h2 className="text-[var(--text-primary)] font-bold text-lg">Implantologia</h2>
              <span className="text-[var(--text-muted)] text-xs">({implantes.length} implantes)</span>
            </div>
            <button onClick={() => setShowNovoImplante(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white border border-blue-500/50 transition-all">
              <Plus className="w-3.5 h-3.5" /> Novo Implante
            </button>
          </div>

          {/* ─── Mapa Visual de Implantes ─────────────────────────────────────── */}
          {implantes.length > 0 && (
            <div className="card-premium p-5 border border-blue-500/20">
              <div className="flex items-center gap-2 mb-4">
                <Smile className="w-4 h-4 text-blue-400" />
                <h3 className="text-[var(--text-primary)] font-bold text-xs">Mapa de Implantes</h3>
              </div>
              <div className="flex justify-center gap-1 flex-wrap mb-3">
                {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28].map(n => {
                  const temImplante = implantes.some(i => i.dente === n);
                  return (
                    <div key={n} className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${temImplante ? "bg-blue-500/20 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                      {temImplante ? <Target className="w-3.5 h-3.5" /> : n}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center gap-4 my-2">
                <div className="flex-1 h-px bg-[var(--border-primary)]" />
                <span className="text-[var(--text-muted)] text-[8px] font-bold uppercase">Oclusal</span>
                <div className="flex-1 h-px bg-[var(--border-primary)]" />
              </div>
              <div className="flex justify-center gap-1 flex-wrap">
                {[48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(n => {
                  const temImplante = implantes.some(i => i.dente === n);
                  return (
                    <div key={n} className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border transition-all ${temImplante ? "bg-blue-500/20 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                      {temImplante ? <Target className="w-3.5 h-3.5" /> : n}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Lista de Implantes ───────────────────────────────────────────── */}
          {implantes.length === 0 ? (
            <div className="card-premium border border-[var(--border-primary)] p-12 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Sem Implantes Registados</h3>
              <p className="text-[var(--text-muted)] text-sm mb-4">Registe implantes com ficha técnica completa e acompanhe cada fase.</p>
              <button onClick={() => setShowNovoImplante(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-blue-500 hover:bg-blue-600 text-white transition-all">
                <Plus className="w-4 h-4" /> Registar Primeiro Implante
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {implantes.map(impl => {
                const isExpanded = expandedImpl === impl.id;
                const faseActual = FASES_IMPLANTE[impl.faseActual - 1];
                const progressoPercent = Math.round((impl.faseActual / FASES_IMPLANTE.length) * 100);

                return (
                  <div key={impl.id} className="card-premium border border-[var(--border-primary)] overflow-hidden">
                    <button onClick={() => setExpandedImpl(isExpanded ? null : impl.id)}
                      className="w-full p-5 text-left hover:bg-[var(--bg-secondary)] transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0">
                          <span className="text-blue-400 text-lg font-black">{impl.dente}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="text-[var(--text-primary)] font-bold">Dente {impl.dente}</h4>
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">{impl.marca} {impl.modelo}</span>
                          </div>
                          <div className="flex items-center gap-3 text-[var(--text-muted)] text-[10px] flex-wrap">
                            <span>Ø{impl.diametro} × {impl.comprimento}mm</span>
                            <span>{impl.conexao}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(impl.dataColocacao).toLocaleDateString("pt-PT")}</span>
                          </div>
                        </div>
                        <div className="text-right shrink-0 flex flex-col items-end gap-2">
                          <span className="text-[var(--text-primary)] text-lg font-black">{progressoPercent}%</span>
                          <span className="text-[10px] font-bold text-blue-300">{faseActual?.nome}</span>
                          <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mt-3 h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-700" style={{ width: `${progressoPercent}%` }} />
                      </div>
                      <p className="text-[var(--text-muted)] text-[9px] mt-1">Fase {impl.faseActual} de {FASES_IMPLANTE.length}</p>
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-5 border-t border-[var(--border-primary)] pt-5 animate-in fade-in duration-200">
                        {/* Quick actions */}
                        <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
                          <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mr-2">Acções:</span>
                          <button onClick={() => avancarFaseImplante(impl.id)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-all">
                            <ArrowRight className="w-3 h-3" /> Avançar Fase
                          </button>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/30 hover:bg-[#00E5FF]/25 transition-all">
                            <Calendar className="w-3 h-3" /> Agendar Controlo
                          </button>
                          <button className="inline-flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-bold rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 hover:bg-violet-500/25 transition-all">
                            <FileText className="w-3 h-3" /> Ficha Técnica
                          </button>
                        </div>

                        {/* Fases do implante */}
                        <div>
                          <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-4">Fases do Implante</p>
                          <div className="space-y-2">
                            {FASES_IMPLANTE.map(fase => {
                              const Icon = fase.icon;
                              const isCompleted = fase.id < impl.faseActual;
                              const isCurrent = fase.id === impl.faseActual;
                              return (
                                <div key={fase.id} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isCurrent ? "bg-blue-500/10 border-blue-500/30 shadow-sm" : isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] opacity-50"}`}>
                                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? "bg-blue-500/20 border border-blue-500/30" : isCompleted ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"}`}>
                                    {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Icon className={`w-4 h-4 ${isCurrent ? "text-blue-400 animate-pulse" : "text-[var(--text-muted)]"}`} />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-xs font-semibold ${isCurrent ? "text-blue-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>{fase.nome}</p>
                                    <p className="text-[var(--text-muted)] text-[9px]">{fase.descricao}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className={`text-[9px] font-bold ${isCurrent ? "text-blue-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>
                                      ~{fase.duracaoSemanas}sem
                                    </span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Ficha Técnica */}
                        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
                          <div className="flex items-center gap-2 mb-3"><Settings className="w-4 h-4 text-blue-400" /><p className="text-[var(--text-primary)] text-xs font-bold">Ficha Técnica</p></div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {[
                              { label: "Marca", valor: impl.marca },
                              { label: "Modelo", valor: impl.modelo },
                              { label: "Diâmetro", valor: `${impl.diametro} mm` },
                              { label: "Comprimento", valor: `${impl.comprimento} mm` },
                              { label: "Plataforma", valor: impl.plataforma },
                              { label: "Conexão", valor: impl.conexao },
                              { label: "Torque", valor: `${impl.torqueInsercao} Ncm` },
                              { label: "Osso", valor: impl.ossoDisponivel.split(" — ")[0] },
                            ].map(item => (
                              <div key={item.label}>
                                <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">{item.label}</p>
                                <p className="text-[var(--text-primary)] text-xs font-bold mt-0.5">{item.valor}</p>
                              </div>
                            ))}
                          </div>
                          {(impl.enxerto || impl.membranaGBR) && (
                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-500/10">
                              {impl.enxerto && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Enxerto: {impl.tipoEnxerto || "Sim"}</span>}
                              {impl.membranaGBR && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">Membrana GBR</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MODAL: NOVO IMPLANTE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showNovoImplante && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-400" />
                <h3 className="text-[var(--text-primary)] font-bold text-lg">Novo Implante</h3>
              </div>
              <button onClick={() => setShowNovoImplante(false)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[70vh] overflow-y-auto">
              {/* Dente */}
              <div>
                <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Posição do Dente *</label>
                <div className="flex flex-wrap gap-1">
                  {[18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28, 48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38].map(n => (
                    <button key={n} onClick={() => setFormDente(n)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-bold border transition-all ${formDente === n ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Marca e Modelo */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Marca</label>
                  <select value={formMarca} onChange={e => { setFormMarca(e.target.value); const m = MARCAS_IMPLANTES.find(x => x.marca === e.target.value); if (m) { setFormModelo(m.modelos[0]); setFormPlataforma(m.plataformas[0]); } }}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {MARCAS_IMPLANTES.map(m => <option key={m.marca} value={m.marca}>{m.marca}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Modelo</label>
                  <select value={formModelo} onChange={e => setFormModelo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {marcaConfig.modelos.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Dimensões */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Diâmetro (mm)</label>
                  <select value={formDiametro} onChange={e => setFormDiametro(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {DIAMETROS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Comprimento (mm)</label>
                  <select value={formComprimento} onChange={e => setFormComprimento(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {COMPRIMENTOS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Plataforma</label>
                  <select value={formPlataforma} onChange={e => setFormPlataforma(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {marcaConfig.plataformas.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              {/* Conexão e Torque */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Tipo de Conexão</label>
                  <select value={formConexao} onChange={e => setFormConexao(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none">
                    {CONEXOES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Torque de Inserção (Ncm)</label>
                  <input type="number" value={formTorque} onChange={e => setFormTorque(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm font-bold focus:border-blue-500/50 focus:outline-none" />
                </div>
              </div>

              {/* Osso */}
              <div>
                <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Qualidade Óssea</label>
                <div className="grid grid-cols-2 gap-2">
                  {OSSO_TIPOS.map(tipo => (
                    <button key={tipo} onClick={() => setFormOsso(tipo)}
                      className={`p-2.5 rounded-xl border text-left text-[10px] font-bold transition-all ${formOsso === tipo ? "bg-blue-500/15 border-blue-500/30 text-blue-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                      {tipo}
                    </button>
                  ))}
                </div>
              </div>

              {/* Enxerto e Membrana */}
              <div className="flex items-center gap-4">
                <button onClick={() => setFormEnxerto(!formEnxerto)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${formEnxerto ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formEnxerto ? "border-amber-400 bg-amber-500/30" : "border-[var(--border-secondary)]"}`}>
                    {formEnxerto && <CheckCircle className="w-3 h-3 text-amber-400" />}
                  </div>
                  <span className="text-[10px] font-bold">Enxerto Ósseo</span>
                </button>
                <button onClick={() => setFormMembrana(!formMembrana)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${formMembrana ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${formMembrana ? "border-violet-400 bg-violet-500/30" : "border-[var(--border-secondary)]"}`}>
                    {formMembrana && <CheckCircle className="w-3 h-3 text-violet-400" />}
                  </div>
                  <span className="text-[10px] font-bold">Membrana GBR</span>
                </button>
              </div>

              {formEnxerto && (
                <div>
                  <label className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest block mb-2">Tipo de Enxerto</label>
                  <div className="flex flex-wrap gap-2">
                    {["Autógeno", "Alógeno", "Xenógeno (Bio-Oss)", "Aloplástico", "Combinado"].map(tipo => (
                      <button key={tipo} onClick={() => setFormTipoEnxerto(tipo)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${formTipoEnxerto === tipo ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                        {tipo}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 p-5 border-t border-[var(--border-primary)]">
              <button onClick={() => setShowNovoImplante(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">
                Cancelar
              </button>
              <button onClick={criarImplante} disabled={formDente <= 0}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                <Target className="w-4 h-4" /> Registar Implante
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default EspecialidadesImplantes;
