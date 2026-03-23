/**
 * OdontogramaAvancado.tsx — Odontograma Clínico Profissional Completo
 * DentCare Elite V35.6 — Clinical Pro Edition + Implantologia Integrada
 *
 * Melhorias V35.6 (Major Upgrade — Implantologia):
 * - Implante com workflow de 8 fases clínicas (avaliação → manutenção)
 * - Presets de marcas reais (Straumann, Nobel, Zimmer, Dentsply, Neodent, MIS, Osstem)
 * - Ficha técnica completa: conexão, torque, qualidade óssea, enxerto, membrana GBR
 * - Tab Implante/Prótese sempre acessível com opção de definir estado directamente
 * - Resumo de implantes com mapa visual e lista expandível
 * - Indicadores visuais melhorados no mapa principal (ícone de implante)
 * - Barra de progresso de osteointegração por implante
 */
import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ModalOrcamento } from "./ModalOrcamento";
import {
  Smile, Edit2, Save, X, CheckCircle, AlertTriangle,
  Zap, Crown, CircleDot, Scissors, Loader2,
  RotateCcw, Sparkles, ChevronDown, ChevronUp,
  Stethoscope, Calendar, Clock, Eye, Target,
  Layers, Hash, Activity, TrendingUp, RefreshCw,
  Trash2, Copy, ClipboardCheck, FileText, NotebookPen,
  Keyboard, ZoomIn, ArrowLeft, ArrowRight, Info,
  Printer, Download, Droplets, Heart, Shield,
  CircleAlert, Wrench, Settings2, BarChart3,
  Timer, Award, Package, Plus, Euro,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
type FaceId = "oclusal" | "mesial" | "distal" | "vestibular" | "lingual";
type EstadoFace = "saudavel" | "carie" | "restauracao" | "fratura" | "selante" | "desgaste";
type EstadoDente = "saudavel" | "carie" | "restauracao" | "extraido" | "tratado" | "ausente" | "coroa" | "implante" | "endodontia" | "protese" | "extracao_indicada";
type TipoDente = "molar" | "premolar" | "canino" | "incisivo_lateral" | "incisivo_central";
type TabDetalhe = "faces" | "perio" | "implante" | "notas" | "historico";
type GrauFurca = 0 | 1 | 2 | 3;
type TipoImplante = "convencional" | "zigomatico" | "curto" | "mini" | "pterigoideu";
type TipoProtese = "fixa" | "removivel" | "sobre_implante" | "total" | "parcial";
type MaterialProtese = "ceramica" | "metalica" | "metalocerâmica" | "zirconia" | "resina" | "acrilico";
type ConexaoImplante = "cone_morse" | "hex_interno" | "hex_externo" | "tri_channel" | "outro";
type QualidadeOssea = "D1" | "D2" | "D3" | "D4";

interface PerioFaceData {
  profundidadeSondagem: number;
  recessao: number;
  sangramentoSondagem: boolean;
  supuracao: boolean;
}

interface ImplanteData {
  tipo: TipoImplante;
  marca: string;
  modelo: string;
  comprimento: number;
  diametro: number;
  pilar: string;
  plataforma: string;
  conexao: ConexaoImplante;
  torqueInsercao: number;
  qualidadeOssea: QualidadeOssea;
  enxertoOsseo: boolean;
  tipoEnxerto: string;
  membranaGBR: boolean;
  dataColocacao: string;
  faseActual: number;
  observacoes: string;
}

interface ProteseData {
  tipo: TipoProtese;
  material: MaterialProtese;
  pilares: number[];
  dataInstalacao: string;
  observacoes: string;
}

interface DenteData {
  estado: EstadoDente;
  faces: Partial<Record<FaceId, EstadoFace>>;
  notas?: string;
  mobilidade?: number;
  placa?: boolean;
  sangramento?: boolean;
  perio?: Partial<Record<FaceId, PerioFaceData>>;
  furca?: GrauFurca;
  implante_detalhes?: ImplanteData;
  protese_detalhes?: ProteseData;
  sensibilidade?: boolean;
  supuracao?: boolean;
  nivelOsseo?: number;
}

interface PresetTratamento {
  id: string; nome: string; icon: React.ComponentType<any>; cor: string; bg: string; border: string;
  estadoDente: EstadoDente; descricao: string; faces?: Partial<Record<FaceId, EstadoFace>>;
}

// ─── Fases do Implante ──────────────────────────────────────────────────────
const FASES_IMPLANTE = [
  { id: 1, nome: "Avaliação e Planeamento", descricao: "CBCT, planeamento digital, guia cirúrgica", icon: FileText, dur: "2 sem" },
  { id: 2, nome: "Preparação Cirúrgica", descricao: "Enxerto ósseo, GBR, elevação de seio (se necessário)", icon: Shield, dur: "~16 sem" },
  { id: 3, nome: "Colocação do Implante", descricao: "Cirurgia de inserção do implante", icon: Target, dur: "1 sem" },
  { id: 4, nome: "Osteointegração", descricao: "Período de cicatrização e integração óssea", icon: Timer, dur: "12-24 sem" },
  { id: 5, nome: "Reabertura / 2.ª Fase", descricao: "Colocação do pilar de cicatrização", icon: Wrench, dur: "2-3 sem" },
  { id: 6, nome: "Impressão e Prótese", descricao: "Moldagem, provisório, prótese definitiva", icon: Crown, dur: "3-4 sem" },
  { id: 7, nome: "Cimentação / Aparafusamento", descricao: "Colocação da prótese definitiva", icon: CheckCircle, dur: "1 sem" },
  { id: 8, nome: "Manutenção", descricao: "Controlos periódicos, higienização", icon: Eye, dur: "contínuo" },
];

// ─── Marcas de Implantes ────────────────────────────────────────────────────
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

const DIAMETROS_IMPLANTE = [3.0, 3.3, 3.5, 3.75, 4.0, 4.1, 4.5, 4.8, 5.0, 5.5, 6.0, 6.5];
const COMPRIMENTOS_IMPLANTE = [6.0, 7.0, 8.0, 8.5, 9.0, 10.0, 11.0, 11.5, 12.0, 13.0, 14.0, 15.0, 16.0];

const CONEXAO_LABELS: Record<ConexaoImplante, string> = {
  cone_morse: "Cone Morse", hex_interno: "Hexágono Interno", hex_externo: "Hexágono Externo", tri_channel: "Tri-Channel", outro: "Outro",
};

const QUALIDADE_OSSEA_CONFIG: Record<QualidadeOssea, { label: string; descricao: string; cor: string }> = {
  D1: { label: "D1", descricao: "Cortical denso", cor: "text-emerald-400" },
  D2: { label: "D2", descricao: "Cortical espesso + trabecular denso", cor: "text-blue-400" },
  D3: { label: "D3", descricao: "Cortical fino + trabecular fino", cor: "text-amber-400" },
  D4: { label: "D4", descricao: "Trabecular fino", cor: "text-red-400" },
};

const ESTADOS_DENTE_CONFIG: Record<EstadoDente, {
  label: string; cor: string; bg: string; border: string; fill: string; glow: string; neon: string; gradient: [string, string]; emoji: string;
}> = {
  saudavel:          { label: "Saudável",           cor: "text-emerald-400",  bg: "bg-emerald-500/15", border: "border-emerald-500/30", fill: "#34D399", glow: "0 0 12px rgba(52,211,153,0.6)",  neon: "#34D399", gradient: ["#34D399", "#059669"], emoji: "✓" },
  carie:             { label: "Cárie",              cor: "text-red-400",      bg: "bg-red-500/15",     border: "border-red-500/30",     fill: "#F87171", glow: "0 0 12px rgba(248,113,113,0.6)", neon: "#F87171", gradient: ["#F87171", "#DC2626"], emoji: "!" },
  tratado:           { label: "Restaurado",         cor: "text-amber-400",    bg: "bg-amber-500/15",   border: "border-amber-500/30",   fill: "#FBBF24", glow: "0 0 12px rgba(251,191,36,0.6)",  neon: "#FBBF24", gradient: ["#FBBF24", "#D97706"], emoji: "R" },
  ausente:           { label: "Ausente",            cor: "text-slate-500",    bg: "bg-slate-500/10",   border: "border-slate-500/20",   fill: "#475569", glow: "none",                           neon: "#475569", gradient: ["#334155", "#1E293B"], emoji: "—" },
  coroa:             { label: "Coroa",              cor: "text-cyan-400",     bg: "bg-cyan-500/15",    border: "border-cyan-500/30",    fill: "#22D3EE", glow: "0 0 12px rgba(34,211,238,0.6)",  neon: "#22D3EE", gradient: ["#22D3EE", "#0891B2"], emoji: "C" },
  implante:          { label: "Implante",           cor: "text-blue-400",     bg: "bg-blue-500/15",    border: "border-blue-500/30",    fill: "#60A5FA", glow: "0 0 12px rgba(96,165,250,0.6)",  neon: "#60A5FA", gradient: ["#60A5FA", "#2563EB"], emoji: "I" },
  endodontia:        { label: "Endodontia",         cor: "text-orange-400",   bg: "bg-orange-500/15",  border: "border-orange-500/30",  fill: "#FB923C", glow: "0 0 12px rgba(251,146,60,0.6)",  neon: "#FB923C", gradient: ["#FB923C", "#EA580C"], emoji: "E" },
  protese:           { label: "Prótese",            cor: "text-violet-400",   bg: "bg-violet-500/15",  border: "border-violet-500/30",  fill: "#A78BFA", glow: "0 0 12px rgba(167,139,250,0.6)", neon: "#A78BFA", gradient: ["#A78BFA", "#7C3AED"], emoji: "P" },
  extracao_indicada: { label: "Extracção Indicada", cor: "text-pink-400",     bg: "bg-pink-500/15",    border: "border-pink-500/30",    fill: "#F472B6", glow: "0 0 12px rgba(244,114,182,0.6)", neon: "#F472B6", gradient: ["#F472B6", "#DB2777"], emoji: "✕" },
  restauracao:       { label: "Restauração",        cor: "text-blue-400",     bg: "bg-blue-500/15",    border: "border-blue-500/30",    fill: "#60A5FA", glow: "0 0 12px rgba(96,165,250,0.6)",  neon: "#60A5FA", gradient: ["#60A5FA", "#2563EB"], emoji: "R" },
  extraido:          { label: "Extraído",           cor: "text-slate-500",    bg: "bg-slate-500/10",   border: "border-slate-500/20",   fill: "#475569", glow: "none",                           neon: "#475569", gradient: ["#334155", "#1E293B"], emoji: "×" },
};

const ESTADOS_FACE_CONFIG: Record<EstadoFace, { label: string; fill: string; cor: string; glow: string }> = {
  saudavel:     { label: "Saudável",     fill: "#34D399", cor: "text-emerald-400", glow: "rgba(52,211,153,0.4)" },
  carie:        { label: "Cárie",        fill: "#F87171", cor: "text-red-400",     glow: "rgba(248,113,113,0.5)" },
  restauracao:  { label: "Restauração",  fill: "#60A5FA", cor: "text-blue-400",    glow: "rgba(96,165,250,0.4)" },
  fratura:      { label: "Fractura",     fill: "#FB923C", cor: "text-orange-400",  glow: "rgba(251,146,60,0.4)" },
  selante:      { label: "Selante",      fill: "#A78BFA", cor: "text-violet-400",  glow: "rgba(167,139,250,0.4)" },
  desgaste:     { label: "Desgaste",     fill: "#FBBF24", cor: "text-amber-400",   glow: "rgba(251,191,36,0.4)" },
};

const PRESETS_RAPIDOS: PresetTratamento[] = [
  { id: "restauracao_composta", nome: "Restauração Composta", icon: CircleDot, cor: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30", estadoDente: "tratado", descricao: "Restauração directa com resina composta", faces: { oclusal: "restauracao" } },
  { id: "carie_oclusal", nome: "Cárie Oclusal", icon: AlertTriangle, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", estadoDente: "carie", descricao: "Cárie na face oclusal", faces: { oclusal: "carie" } },
  { id: "carie_interproximal", nome: "Cárie Interproximal", icon: AlertTriangle, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", estadoDente: "carie", descricao: "Cárie entre dentes", faces: { mesial: "carie", distal: "carie" } },
  { id: "carie_mesial", nome: "Cárie Mesial", icon: AlertTriangle, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", estadoDente: "carie", descricao: "Cárie na face mesial", faces: { mesial: "carie" } },
  { id: "carie_distal", nome: "Cárie Distal", icon: AlertTriangle, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", estadoDente: "carie", descricao: "Cárie na face distal", faces: { distal: "carie" } },
  { id: "carie_vestibular", nome: "Cárie Vestibular", icon: AlertTriangle, cor: "text-red-400", bg: "bg-red-500/15", border: "border-red-500/30", estadoDente: "carie", descricao: "Cárie na face vestibular", faces: { vestibular: "carie" } },
  { id: "endodontia", nome: "Endodontia", icon: Zap, cor: "text-orange-400", bg: "bg-orange-500/15", border: "border-orange-500/30", estadoDente: "endodontia", descricao: "Tratamento de canal radicular" },
  { id: "coroa_ceramica", nome: "Coroa Cerâmica", icon: Crown, cor: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30", estadoDente: "coroa", descricao: "Coroa total em cerâmica" },
  { id: "implante", nome: "Implante", icon: Target, cor: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30", estadoDente: "implante", descricao: "Implante dentário osteointegrado" },
  { id: "extracao", nome: "Extracção", icon: Scissors, cor: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30", estadoDente: "extracao_indicada", descricao: "Extracção dentária indicada" },
  { id: "selante", nome: "Selante", icon: Layers, cor: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/30", estadoDente: "tratado", descricao: "Selante de fissuras", faces: { oclusal: "selante" } },
  { id: "protese", nome: "Prótese", icon: Sparkles, cor: "text-violet-400", bg: "bg-violet-500/15", border: "border-violet-500/30", estadoDente: "protese", descricao: "Prótese fixa ou removível" },
  { id: "limpar", nome: "Limpar / Saudável", icon: RotateCcw, cor: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", estadoDente: "saudavel", descricao: "Repor estado saudável" },
];

const FACES_LABELS: Record<FaceId, string> = { oclusal: "Oclusal", mesial: "Mesial", distal: "Distal", vestibular: "Vestibular", lingual: "Lingual/Palatina" };
const FACES_ABREV: Record<FaceId, string> = { oclusal: "O", mesial: "M", distal: "D", vestibular: "V", lingual: "L" };
const TIPO_IMPLANTE_LABELS: Record<TipoImplante, string> = { convencional: "Convencional", zigomatico: "Zigomático", curto: "Curto", mini: "Mini-implante", pterigoideu: "Pterigoideu" };
const TIPO_PROTESE_LABELS: Record<TipoProtese, string> = { fixa: "Fixa", removivel: "Removível", sobre_implante: "Sobre Implante", total: "Total", parcial: "Parcial" };
const MATERIAL_PROTESE_LABELS: Record<MaterialProtese, string> = { ceramica: "Cerâmica", metalica: "Metálica", "metalocerâmica": "Metalocerâmica", zirconia: "Zircónia", resina: "Resina", acrilico: "Acrílico" };

const dentesSuperiores = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
const dentesInferiores = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
const todosDentes = [...dentesSuperiores, ...dentesInferiores];

function getTipoDente(num: number): TipoDente {
  const d = num % 10;
  if (d === 1) return "incisivo_central";
  if (d === 2) return "incisivo_lateral";
  if (d === 3) return "canino";
  if (d === 4 || d === 5) return "premolar";
  return "molar";
}
function getNomeTipoDente(tipo: TipoDente): string {
  return { molar: "Molar", premolar: "Pré-molar", canino: "Canino", incisivo_lateral: "Incisivo Lateral", incisivo_central: "Incisivo Central" }[tipo];
}
function getQuadrante(num: number): string {
  return { 1: "Superior Direito", 2: "Superior Esquerdo", 3: "Inferior Esquerdo", 4: "Inferior Direito" }[Math.floor(num / 10)] || "";
}
function isMolarDente(num: number): boolean { return (num % 10) >= 6; }

// ─── Imagens 3D ─────────────────────────────────────────────────────────────
type TeethImageMap = Record<string, Partial<Record<EstadoDente | "saudavel", string>>>;
const LATERAL_IMAGES_BY_TYPE: TeethImageMap = {
  molar: { saudavel: "/teeth/lateral_molar_healthy.png", carie: "/teeth/lateral_molar_carie.png", restauracao: "/teeth/lateral_molar_restaurado.png", tratado: "/teeth/lateral_molar_restaurado.png", coroa: "/teeth/lateral_molar_coroa.png", endodontia: "/teeth/lateral_molar_endodontia.png", implante: "/teeth/lateral_implante.png", protese: "/teeth/lateral_protese.png", extracao_indicada: "/teeth/lateral_extracao.png", extraido: "/teeth/lateral_ausente.png", ausente: "/teeth/lateral_ausente.png" },
  premolar: { saudavel: "/teeth/lateral_premolar_healthy.png", carie: "/teeth/lateral_premolar_carie.png", restauracao: "/teeth/lateral_premolar_restaurado.png", tratado: "/teeth/lateral_premolar_restaurado.png", coroa: "/teeth/lateral_premolar_coroa.png", endodontia: "/teeth/lateral_premolar_endodontia.png", implante: "/teeth/lateral_implante.png", protese: "/teeth/lateral_protese.png", extracao_indicada: "/teeth/lateral_extracao.png", extraido: "/teeth/lateral_ausente.png", ausente: "/teeth/lateral_ausente.png" },
  canino: { saudavel: "/teeth/lateral_canine_healthy.png", carie: "/teeth/lateral_canine_carie.png", restauracao: "/teeth/lateral_canine_restaurado.png", tratado: "/teeth/lateral_canine_restaurado.png", coroa: "/teeth/lateral_canine_coroa.png", endodontia: "/teeth/lateral_canine_endodontia.png", implante: "/teeth/lateral_implante.png", protese: "/teeth/lateral_protese.png", extracao_indicada: "/teeth/lateral_extracao.png", extraido: "/teeth/lateral_ausente.png", ausente: "/teeth/lateral_ausente.png" },
  incisivo_central: { saudavel: "/teeth/lateral_incisor_central_healthy.png", carie: "/teeth/lateral_incisor_central_carie.png", restauracao: "/teeth/lateral_incisor_central_restaurado.png", tratado: "/teeth/lateral_incisor_central_restaurado.png", coroa: "/teeth/lateral_incisor_central_coroa.png", endodontia: "/teeth/lateral_incisor_central_endodontia.png", implante: "/teeth/lateral_implante.png", protese: "/teeth/lateral_protese.png", extracao_indicada: "/teeth/lateral_extracao.png", extraido: "/teeth/lateral_ausente.png", ausente: "/teeth/lateral_ausente.png" },
  incisivo_lateral: { saudavel: "/teeth/lateral_incisor_healthy.png", carie: "/teeth/lateral_incisor_carie.png", restauracao: "/teeth/lateral_incisor_restaurado.png", tratado: "/teeth/lateral_incisor_restaurado.png", coroa: "/teeth/lateral_incisor_coroa.png", endodontia: "/teeth/lateral_incisor_endodontia.png", implante: "/teeth/lateral_implante.png", protese: "/teeth/lateral_protese.png", extracao_indicada: "/teeth/lateral_extracao.png", extraido: "/teeth/lateral_ausente.png", ausente: "/teeth/lateral_ausente.png" },
};
function getLateralImage(tipo: string, estado: EstadoDente | "saudavel"): string {
  const m = LATERAL_IMAGES_BY_TYPE[tipo] || LATERAL_IMAGES_BY_TYPE.molar;
  return m[estado] || m.saudavel || "/teeth/lateral_molar_healthy.png";
}
const OCLUSAL_IMAGES: Record<string, string> = { molar: "/teeth/oclusal_molar_healthy.png", premolar: "/teeth/oclusal_premolar_healthy.png", canino: "/teeth/oclusal_canine_healthy.png", incisivo_central: "/teeth/oclusal_incisor_central_healthy.png", incisivo_lateral: "/teeth/oclusal_incisor_healthy.png" };
const OCLUSAL_ESTADO_IMAGES: Partial<Record<EstadoDente, string>> = { carie: "/teeth/oclusal_carie.png", restauracao: "/teeth/oclusal_restaurado.png", tratado: "/teeth/oclusal_restaurado.png", coroa: "/teeth/oclusal_coroa.png", implante: "/teeth/oclusal_implante.png", endodontia: "/teeth/oclusal_endodontia.png", protese: "/teeth/oclusal_protese.png", extracao_indicada: "/teeth/oclusal_extracao.png", extraido: "/teeth/oclusal_ausente.png", ausente: "/teeth/oclusal_ausente.png" };

// ─── Helpers ────────────────────────────────────────────────────────────────
function getCorSondagem(v: number): string { return v <= 3 ? "#34D399" : v <= 5 ? "#FBBF24" : v <= 7 ? "#FB923C" : "#F87171"; }
function getCorRecessao(v: number): string { return v === 0 ? "#34D399" : v <= 2 ? "#FBBF24" : v <= 4 ? "#FB923C" : "#F87171"; }
function getDefaultPerioFace(): PerioFaceData { return { profundidadeSondagem: 2, recessao: 0, sangramentoSondagem: false, supuracao: false }; }
function getDefaultImplanteData(): ImplanteData {
  return { tipo: "convencional", marca: "Straumann", modelo: "BLT", comprimento: 10, diametro: 4.0, pilar: "", plataforma: "RC", conexao: "cone_morse", torqueInsercao: 35, qualidadeOssea: "D2", enxertoOsseo: false, tipoEnxerto: "", membranaGBR: false, dataColocacao: "", faseActual: 1, observacoes: "" };
}

// ─── Mini Indicadores ───────────────────────────────────────────────────────
function MiniIndicadores({ data, isUpper }: { data: DenteData; isUpper: boolean }) {
  const indicators: { color: string; label: string }[] = [];
  if (data.placa) indicators.push({ color: "#FBBF24", label: "P" });
  if (data.sangramento) indicators.push({ color: "#EF4444", label: "S" });
  if (data.perio && Object.values(data.perio).some(p => p && (p.profundidadeSondagem > 3 || p.sangramentoSondagem))) indicators.push({ color: "#F472B6", label: "●" });
  if ((data.furca || 0) > 0) indicators.push({ color: "#A78BFA", label: "F" });
  if (data.sensibilidade) indicators.push({ color: "#22D3EE", label: "~" });
  if (data.supuracao) indicators.push({ color: "#FB923C", label: "⊕" });
  if (indicators.length === 0) return null;
  return (
    <div className="flex items-center justify-center gap-[2px]" style={{ transform: isUpper ? "scaleY(-1)" : "none" }}>
      {indicators.map((ind, i) => (
        <div key={i} className="w-[6px] h-[6px] rounded-full" title={ind.label} style={{ backgroundColor: ind.color, boxShadow: `0 0 4px ${ind.color}80` }} />
      ))}
    </div>
  );
}

// ─── Dente Lateral 3D ───────────────────────────────────────────────────────
function DenteLateral3D({ numero, data, selected, multiSelected, tipo, isUpper }: {
  numero: number; data: DenteData; selected: boolean; multiSelected: boolean; tipo: TipoDente; isUpper: boolean;
}) {
  const cfg = ESTADOS_DENTE_CONFIG[data.estado] || ESTADOS_DENTE_CONFIG.saudavel;
  const imgSrc = getLateralImage(tipo, data.estado);
  const width = tipo === "molar" ? 58 : tipo === "premolar" ? 48 : tipo === "canino" ? 40 : 36;
  const height = tipo === "molar" ? 72 : tipo === "premolar" ? 68 : tipo === "canino" ? 74 : 70;
  const isAbsent = data.estado === "ausente" || data.estado === "extraido";
  return (
    <div className="relative transition-all duration-300" style={{
      width, height, transform: isUpper ? "scaleY(-1)" : "none",
      filter: isAbsent ? "grayscale(1) opacity(0.12)" : selected ? `drop-shadow(0 0 10px ${cfg.neon}90) drop-shadow(0 0 20px ${cfg.neon}50)` : multiSelected ? "drop-shadow(0 0 8px rgba(168,85,247,0.6))" : data.estado !== "saudavel" ? `drop-shadow(0 0 8px ${cfg.neon}60)` : "drop-shadow(0 0 4px rgba(200,200,200,0.1))",
    }}>
      <img src={imgSrc} alt={`Dente ${numero}`} className="w-full h-full object-contain pointer-events-none select-none" draggable={false} loading="lazy" />
      {selected && <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ boxShadow: `inset 0 0 15px ${cfg.neon}50, 0 0 15px ${cfg.neon}40`, border: `1.5px solid ${cfg.neon}70`, animation: "neonPulse 2s ease-in-out infinite" }} />}
      {multiSelected && <div className="absolute inset-0 rounded-lg pointer-events-none" style={{ boxShadow: "inset 0 0 10px rgba(168,85,247,0.4), 0 0 10px rgba(168,85,247,0.3)", border: "1.5px solid rgba(168,85,247,0.5)" }} />}
      {data.estado === "implante" && (
        <div className="absolute -bottom-0.5 left-1/2 pointer-events-none" style={{ transform: isUpper ? "scaleY(-1) translateX(-50%)" : "translateX(-50%)" }}>
          <div className="w-4 h-4 rounded-full bg-blue-500/90 border border-blue-300/50 flex items-center justify-center" style={{ boxShadow: "0 0 8px rgba(96,165,250,0.7)" }}>
            <Target className="w-2.5 h-2.5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Vista Oclusal Interactiva ──────────────────────────────────────────────
function OclusaoInteractiva3D({ numero, data, selected, multiSelected, onFaceClick, tipo }: {
  numero: number; data: DenteData; selected: boolean; multiSelected: boolean; onFaceClick?: (face: FaceId) => void; tipo: TipoDente;
}) {
  const [hoveredFace, setHoveredFace] = useState<FaceId | null>(null);
  const cfg = ESTADOS_DENTE_CONFIG[data.estado] || ESTADOS_DENTE_CONFIG.saudavel;
  let imgSrc = OCLUSAL_IMAGES[tipo] || OCLUSAL_IMAGES.molar;
  if (data.estado !== "saudavel" && OCLUSAL_ESTADO_IMAGES[data.estado]) imgSrc = OCLUSAL_ESTADO_IMAGES[data.estado]!;
  const size = 56;
  const isAbsent = data.estado === "ausente" || data.estado === "extraido";
  const faceZones: { id: FaceId; path: string; labelX: number; labelY: number }[] = [
    { id: "vestibular", path: `M4,4 L${size-4},4 L${size-14},14 L14,14 Z`, labelX: size/2, labelY: 9 },
    { id: "lingual", path: `M14,${size-14} L${size-14},${size-14} L${size-4},${size-4} L4,${size-4} Z`, labelX: size/2, labelY: size-9 },
    { id: "mesial", path: `M4,4 L14,14 L14,${size-14} L4,${size-4} Z`, labelX: 9, labelY: size/2 },
    { id: "distal", path: `M${size-14},14 L${size-4},4 L${size-4},${size-4} L${size-14},${size-14} Z`, labelX: size-9, labelY: size/2 },
    { id: "oclusal", path: `M14,14 L${size-14},14 L${size-14},${size-14} L14,${size-14} Z`, labelX: size/2, labelY: size/2 },
  ];
  if (isAbsent) {
    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <rect x="4" y="4" width={size-8} height={size-8} rx="6" fill="none" stroke="#334155" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
          <text x={size/2} y={size/2+1} textAnchor="middle" dominantBaseline="middle" fill="#475569" fontSize="9" fontWeight="700" opacity="0.5">—</text>
        </svg>
      </div>
    );
  }
  return (
    <div className="relative group" style={{ width: size, height: size, filter: selected ? `drop-shadow(0 0 8px ${cfg.neon}80)` : multiSelected ? "drop-shadow(0 0 6px rgba(168,85,247,0.5))" : "none", transition: "all 0.2s ease" }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 z-10" style={{ filter: "none" }}>
        <defs><clipPath id={`clip-${numero}`}><rect x="2" y="2" width={size-4} height={size-4} rx="6" /></clipPath></defs>
        <image href={imgSrc} x="2" y="2" width={size-4} height={size-4} clipPath={`url(#clip-${numero})`} preserveAspectRatio="xMidYMid slice" />
        {faceZones.map(zone => {
          const faceEstado = data.faces[zone.id];
          const hasFaceState = faceEstado && faceEstado !== "saudavel";
          const faceConfig = hasFaceState ? ESTADOS_FACE_CONFIG[faceEstado!] : null;
          const isHovered = hoveredFace === zone.id;
          const hasBOP = data.perio?.[zone.id]?.sangramentoSondagem;
          const hasDeepPocket = (data.perio?.[zone.id]?.profundidadeSondagem || 0) > 3;
          return (
            <g key={zone.id}>
              <path d={zone.path}
                fill={hasFaceState ? `${faceConfig!.fill}${isHovered ? "70" : "40"}` : hasBOP ? `rgba(239,68,68,${isHovered ? "0.35" : "0.15"})` : hasDeepPocket ? `rgba(251,146,60,${isHovered ? "0.30" : "0.12"})` : isHovered ? "rgba(0,229,255,0.18)" : "transparent"}
                stroke={isHovered ? (hasFaceState ? faceConfig!.fill : hasBOP ? "#EF4444" : "#00E5FF") : hasFaceState ? `${faceConfig!.fill}60` : hasBOP ? "rgba(239,68,68,0.35)" : hasDeepPocket ? "rgba(251,146,60,0.25)" : "rgba(100,150,200,0.12)"}
                strokeWidth={isHovered ? "1.5" : "0.7"} className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setHoveredFace(zone.id)} onMouseLeave={() => setHoveredFace(null)}
                onClick={e => { e.stopPropagation(); onFaceClick?.(zone.id); }} />
              {(isHovered || hasFaceState || hasBOP) && (
                <text x={zone.labelX} y={zone.labelY} textAnchor="middle" dominantBaseline="middle"
                  fill={hasFaceState ? faceConfig!.fill : hasBOP ? "#EF4444" : isHovered ? "#00E5FF" : "#94A3B8"}
                  fontSize="7" fontWeight="800" className="pointer-events-none select-none" style={{ textShadow: "0 0 3px rgba(0,0,0,0.9)" }}>
                  {FACES_ABREV[zone.id]}
                </text>
              )}
            </g>
          );
        })}
        <rect x="2" y="2" width={size-4} height={size-4} rx="6" fill="none" stroke={selected ? `${cfg.neon}80` : multiSelected ? "rgba(168,85,247,0.5)" : "rgba(100,150,200,0.15)"} strokeWidth={selected ? "1.5" : "0.8"} />
      </svg>
      {hoveredFace && (
        <div className="absolute -top-9 left-1/2 -translate-x-1/2 z-50 px-2.5 py-1 rounded-lg bg-black/95 border border-[#00E5FF]/30 whitespace-nowrap pointer-events-none" style={{ backdropFilter: "blur(12px)", boxShadow: "0 4px 12px rgba(0,0,0,0.5)" }}>
          <span className="text-[8px] font-bold text-[#00E5FF]">
            {FACES_LABELS[hoveredFace]}
            {data.faces[hoveredFace] && data.faces[hoveredFace] !== "saudavel" && <span className="ml-1.5" style={{ color: ESTADOS_FACE_CONFIG[data.faces[hoveredFace]!]?.fill }}>— {ESTADOS_FACE_CONFIG[data.faces[hoveredFace]!]?.label}</span>}
            {data.perio?.[hoveredFace]?.sangramentoSondagem && <span className="ml-1.5 text-red-400">· BOP</span>}
            {(data.perio?.[hoveredFace]?.profundidadeSondagem || 0) > 3 && <span className="ml-1.5 text-orange-400">· {data.perio![hoveredFace]!.profundidadeSondagem}mm</span>}
          </span>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/95 border-b border-r border-[#00E5FF]/30 rotate-45" />
        </div>
      )}
    </div>
  );
}

// ─── Dente Completo ─────────────────────────────────────────────────────────
function Dente3D({ numero, data, selected, multiSelected, onClick, onFaceClick, isUpper }: {
  numero: number; data: DenteData; selected: boolean; multiSelected: boolean; onClick: () => void; onFaceClick?: (face: FaceId) => void; isUpper: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const tipo = getTipoDente(numero);
  const cfg = ESTADOS_DENTE_CONFIG[data.estado] || ESTADOS_DENTE_CONFIG.saudavel;
  const isAbsent = data.estado === "ausente" || data.estado === "extraido";
  return (
    <div className={`flex flex-col items-center cursor-pointer transition-all duration-200 relative ${selected ? "scale-110 z-20" : multiSelected ? "scale-105 z-10" : hovered ? "scale-105 z-10" : ""}`}
      onMouseEnter={() => setHovered(true)} onMouseLeave={() => setHovered(false)} onClick={onClick} style={{ gap: "2px" }}>
      {isUpper ? (
        <>
          <span className={`text-[10px] font-black tracking-wider transition-all duration-200 ${selected ? "text-[#00E5FF] scale-110" : multiSelected ? "text-violet-400" : isAbsent ? "text-slate-600" : data.estado !== "saudavel" ? cfg.cor : "text-slate-500"}`} style={selected ? { textShadow: `0 0 8px ${cfg.neon}80` } : {}}>{numero}</span>
          {data.estado !== "saudavel" && data.estado !== "ausente" && <div className="w-full flex justify-center -mt-0.5 mb-0.5"><div className="h-[3px] rounded-full transition-all" style={{ width: selected ? "80%" : "50%", backgroundColor: cfg.fill, boxShadow: `0 0 4px ${cfg.neon}60` }} /></div>}
          <MiniIndicadores data={data} isUpper={false} />
          <OclusaoInteractiva3D numero={numero} data={data} selected={selected} multiSelected={multiSelected} onFaceClick={onFaceClick} tipo={tipo} />
          <DenteLateral3D numero={numero} data={data} selected={selected} multiSelected={multiSelected} tipo={tipo} isUpper={true} />
        </>
      ) : (
        <>
          <DenteLateral3D numero={numero} data={data} selected={selected} multiSelected={multiSelected} tipo={tipo} isUpper={false} />
          <OclusaoInteractiva3D numero={numero} data={data} selected={selected} multiSelected={multiSelected} onFaceClick={onFaceClick} tipo={tipo} />
          <MiniIndicadores data={data} isUpper={false} />
          {data.estado !== "saudavel" && data.estado !== "ausente" && <div className="w-full flex justify-center -mb-0.5 mt-0.5"><div className="h-[3px] rounded-full transition-all" style={{ width: selected ? "80%" : "50%", backgroundColor: cfg.fill, boxShadow: `0 0 4px ${cfg.neon}60` }} /></div>}
          <span className={`text-[10px] font-black tracking-wider transition-all duration-200 ${selected ? "text-[#00E5FF] scale-110" : multiSelected ? "text-violet-400" : isAbsent ? "text-slate-600" : data.estado !== "saudavel" ? cfg.cor : "text-slate-500"}`} style={selected ? { textShadow: `0 0 8px ${cfg.neon}80` } : {}}>{numero}</span>
        </>
      )}
      {hovered && !selected && !isAbsent && <div className="absolute inset-0 -m-1 rounded-xl pointer-events-none" style={{ background: `radial-gradient(ellipse at center, ${cfg.neon}08 0%, transparent 70%)` }} />}
    </div>
  );
}

// ─── PerioFaceEditor ────────────────────────────────────────────────────────
function PerioFaceEditor({ face, data, onChange }: { face: FaceId; data: PerioFaceData; onChange: (d: PerioFaceData) => void }) {
  return (
    <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-[var(--text-primary)]">{FACES_LABELS[face]}</span>
        <div className="flex items-center gap-2">
          {data.sangramentoSondagem && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">BOP</span>}
          {data.supuracao && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">SUP</span>}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-[var(--text-muted)] font-semibold">Profundidade Sondagem</span>
          <span className="text-[11px] font-black" style={{ color: getCorSondagem(data.profundidadeSondagem) }}>{data.profundidadeSondagem}mm</span>
        </div>
        <div className="flex items-center gap-1">
          {[1,2,3,4,5,6,7,8,9,10,11,12].map(v => (
            <button key={v} onClick={() => onChange({ ...data, profundidadeSondagem: v })}
              className={`flex-1 h-5 rounded text-[7px] font-bold transition-all ${data.profundidadeSondagem === v ? "scale-110 ring-1 ring-white/30" : "hover:scale-105"}`}
              style={{ backgroundColor: data.profundidadeSondagem === v ? getCorSondagem(v) : `${getCorSondagem(v)}30`, color: data.profundidadeSondagem === v ? "#000" : getCorSondagem(v) }}>{v}</button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[9px] text-[var(--text-muted)] font-semibold">Recessão Gengival</span>
          <span className="text-[11px] font-black" style={{ color: getCorRecessao(data.recessao) }}>{data.recessao}mm</span>
        </div>
        <div className="flex items-center gap-1">
          {[0,1,2,3,4,5,6,7,8,9,10].map(v => (
            <button key={v} onClick={() => onChange({ ...data, recessao: v })}
              className={`flex-1 h-5 rounded text-[7px] font-bold transition-all ${data.recessao === v ? "scale-110 ring-1 ring-white/30" : "hover:scale-105"}`}
              style={{ backgroundColor: data.recessao === v ? getCorRecessao(v) : `${getCorRecessao(v)}30`, color: data.recessao === v ? "#000" : getCorRecessao(v) }}>{v}</button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={() => onChange({ ...data, sangramentoSondagem: !data.sangramentoSondagem })}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all ${data.sangramentoSondagem ? "bg-red-500/15 border-red-500/30 text-red-300" : "bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
          <Droplets className="w-3 h-3" /> BOP {data.sangramentoSondagem ? "✓" : ""}
        </button>
        <button onClick={() => onChange({ ...data, supuracao: !data.supuracao })}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg border text-[9px] font-bold transition-all ${data.supuracao ? "bg-orange-500/15 border-orange-500/30 text-orange-300" : "bg-[var(--bg-tertiary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
          <CircleAlert className="w-3 h-3" /> Supuração {data.supuracao ? "✓" : ""}
        </button>
      </div>
    </div>
  );
}

// ─── ImplanteEditorPro (V35.6 — REDESENHADO) ───────────────────────────────
function ImplanteEditorPro({ data, onChange }: { data: ImplanteData; onChange: (d: ImplanteData) => void }) {
  const marcaConfig = useMemo(() => MARCAS_IMPLANTES.find(m => m.marca === data.marca) || MARCAS_IMPLANTES[0], [data.marca]);
  const faseActual = FASES_IMPLANTE[data.faseActual - 1] || FASES_IMPLANTE[0];
  const progressoPercent = Math.round((data.faseActual / FASES_IMPLANTE.length) * 100);

  return (
    <div className="space-y-5">
      {/* Barra de Progresso */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/25">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><Target className="w-4 h-4 text-blue-400" /></div>
            <div>
              <p className="text-[var(--text-primary)] text-xs font-bold">Progresso do Implante</p>
              <p className="text-[var(--text-muted)] text-[9px]">Fase {data.faseActual} de {FASES_IMPLANTE.length} — {faseActual.nome}</p>
            </div>
          </div>
          <span className="text-blue-400 text-xl font-black">{progressoPercent}%</span>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700" style={{ width: `${progressoPercent}%`, boxShadow: "0 0 8px rgba(96,165,250,0.5)" }} />
        </div>
      </div>

      {/* Timeline de Fases */}
      <div>
        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2"><Timer className="w-3.5 h-3.5 text-blue-400" /> Fases do Tratamento</p>
        <div className="space-y-1.5">
          {FASES_IMPLANTE.map(fase => {
            const Icon = fase.icon;
            const isCompleted = fase.id < data.faseActual;
            const isCurrent = fase.id === data.faseActual;
            return (
              <button key={fase.id} onClick={() => onChange({ ...data, faseActual: fase.id })}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all hover:scale-[1.005] ${isCurrent ? "bg-blue-500/10 border-blue-500/30 shadow-sm shadow-blue-500/10" : isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] opacity-60 hover:opacity-80"}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isCurrent ? "bg-blue-500/20 border border-blue-500/30" : isCompleted ? "bg-emerald-500/15 border border-emerald-500/30" : "bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"}`}>
                  {isCompleted ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Icon className={`w-3.5 h-3.5 ${isCurrent ? "text-blue-400" : "text-[var(--text-muted)]"}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-[10px] font-bold ${isCurrent ? "text-blue-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>{fase.id}. {fase.nome}</p>
                  <p className="text-[var(--text-muted)] text-[8px] truncate">{fase.descricao}</p>
                </div>
                <span className={`text-[8px] font-bold shrink-0 ${isCurrent ? "text-blue-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>{fase.dur}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ficha Técnica */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/20">
        <div className="flex items-center gap-2 mb-4"><Settings2 className="w-4 h-4 text-blue-400" /><p className="text-[var(--text-primary)] text-xs font-bold">Ficha Técnica</p></div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Marca</label>
            <select value={data.marca} onChange={e => { const m = MARCAS_IMPLANTES.find(x => x.marca === e.target.value) || MARCAS_IMPLANTES[0]; onChange({ ...data, marca: e.target.value, modelo: m.modelos[0], plataforma: m.plataformas[0] }); }}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {MARCAS_IMPLANTES.map(m => <option key={m.marca} value={m.marca}>{m.marca}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Modelo</label>
            <select value={data.modelo} onChange={e => onChange({ ...data, modelo: e.target.value })}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {marcaConfig.modelos.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Tipo de Implante</label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(TIPO_IMPLANTE_LABELS) as [TipoImplante, string][]).map(([k, v]) => (
              <button key={k} onClick={() => onChange({ ...data, tipo: k })}
                className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${data.tipo === k ? "bg-blue-500/20 border-blue-500/40 text-blue-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>{v}</button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Diâmetro (mm)</label>
            <select value={data.diametro} onChange={e => onChange({ ...data, diametro: Number(e.target.value) })}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {DIAMETROS_IMPLANTE.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Comprimento (mm)</label>
            <select value={data.comprimento} onChange={e => onChange({ ...data, comprimento: Number(e.target.value) })}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {COMPRIMENTOS_IMPLANTE.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Plataforma</label>
            <select value={data.plataforma} onChange={e => onChange({ ...data, plataforma: e.target.value })}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {marcaConfig.plataformas.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Tipo de Conexão</label>
            <select value={data.conexao} onChange={e => onChange({ ...data, conexao: e.target.value as ConexaoImplante })}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none">
              {(Object.entries(CONEXAO_LABELS) as [ConexaoImplante, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Torque Inserção (Ncm)</label>
            <input type="number" value={data.torqueInsercao} onChange={e => onChange({ ...data, torqueInsercao: Number(e.target.value) })} min={10} max={70} step={5}
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] font-bold focus:border-blue-500/50 focus:outline-none" />
          </div>
        </div>
        <div className="mb-3">
          <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Pilar / Abutment</label>
          <input type="text" value={data.pilar} onChange={e => onChange({ ...data, pilar: e.target.value })} placeholder="Ex: Pilar multiunit, pilar cimentado, pilar angulado..."
            className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] placeholder-[var(--text-muted)] focus:border-blue-500/50 focus:outline-none" />
        </div>
        <div className="mb-3">
          <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Data de Colocação</label>
          <input type="date" value={data.dataColocacao} onChange={e => onChange({ ...data, dataColocacao: e.target.value })}
            className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] focus:border-blue-500/50 focus:outline-none" />
        </div>
      </div>

      {/* Qualidade Óssea */}
      <div>
        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Shield className="w-3.5 h-3.5 text-amber-400" /> Qualidade Óssea</p>
        <div className="grid grid-cols-2 gap-2">
          {(Object.entries(QUALIDADE_OSSEA_CONFIG) as [QualidadeOssea, typeof QUALIDADE_OSSEA_CONFIG[QualidadeOssea]][]).map(([k, cfg]) => (
            <button key={k} onClick={() => onChange({ ...data, qualidadeOssea: k })}
              className={`p-2.5 rounded-xl border text-left transition-all ${data.qualidadeOssea === k ? "bg-blue-500/15 border-blue-500/30 shadow-sm" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
              <span className={`text-[11px] font-black ${data.qualidadeOssea === k ? cfg.cor : "text-[var(--text-muted)]"}`}>{cfg.label}</span>
              <p className="text-[var(--text-muted)] text-[8px] mt-0.5">{cfg.descricao}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Enxerto e Membrana GBR */}
      <div>
        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2"><Package className="w-3.5 h-3.5 text-violet-400" /> Procedimentos Complementares</p>
        <div className="flex items-center gap-3 mb-3">
          <button onClick={() => onChange({ ...data, enxertoOsseo: !data.enxertoOsseo })}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${data.enxertoOsseo ? "bg-amber-500/15 border-amber-500/30 text-amber-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${data.enxertoOsseo ? "border-amber-400 bg-amber-500/30" : "border-[var(--border-secondary)]"}`}>{data.enxertoOsseo && <CheckCircle className="w-3 h-3 text-amber-400" />}</div>
            <span className="text-[10px] font-bold">Enxerto Ósseo</span>
          </button>
          <button onClick={() => onChange({ ...data, membranaGBR: !data.membranaGBR })}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${data.membranaGBR ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${data.membranaGBR ? "border-violet-400 bg-violet-500/30" : "border-[var(--border-secondary)]"}`}>{data.membranaGBR && <CheckCircle className="w-3 h-3 text-violet-400" />}</div>
            <span className="text-[10px] font-bold">Membrana GBR</span>
          </button>
        </div>
        {data.enxertoOsseo && (
          <div className="mb-3">
            <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Tipo de Enxerto</label>
            <input type="text" value={data.tipoEnxerto} onChange={e => onChange({ ...data, tipoEnxerto: e.target.value })} placeholder="Ex: Autógeno, xenoenxerto, aloenxerto, sintético..."
              className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] placeholder-[var(--text-muted)] focus:border-blue-500/50 focus:outline-none" />
          </div>
        )}
      </div>

      {/* Observações */}
      <div>
        <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Observações Clínicas</label>
        <textarea value={data.observacoes} onChange={e => onChange({ ...data, observacoes: e.target.value })} placeholder="Notas sobre o implante, complicações, follow-up..." rows={3}
          className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] placeholder-[var(--text-muted)] resize-none focus:border-blue-500/50 focus:outline-none" />
      </div>

      {/* Resumo Visual Compacto */}
      {(data.marca || data.diametro > 0) && (
        <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-cyan-500/5 border border-blue-500/15">
          <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase mb-3">Resumo da Ficha Técnica</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: "Marca", valor: data.marca }, { label: "Modelo", valor: data.modelo },
              { label: "Diâmetro", valor: `${data.diametro} mm` }, { label: "Comprimento", valor: `${data.comprimento} mm` },
              { label: "Plataforma", valor: data.plataforma }, { label: "Conexão", valor: CONEXAO_LABELS[data.conexao] },
              { label: "Torque", valor: `${data.torqueInsercao} Ncm` }, { label: "Osso", valor: QUALIDADE_OSSEA_CONFIG[data.qualidadeOssea]?.label || "—" },
            ].map(item => (
              <div key={item.label}>
                <p className="text-[var(--text-muted)] text-[8px] uppercase font-bold">{item.label}</p>
                <p className="text-[var(--text-primary)] text-[11px] font-bold mt-0.5">{item.valor || "—"}</p>
              </div>
            ))}
          </div>
          {(data.enxertoOsseo || data.membranaGBR) && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-blue-500/10">
              {data.enxertoOsseo && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Enxerto: {data.tipoEnxerto || "Sim"}</span>}
              {data.membranaGBR && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">Membrana GBR</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── ProteseEditor ──────────────────────────────────────────────────────────
function ProteseEditor({ data, onChange }: { data: ProteseData; onChange: (d: ProteseData) => void }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Tipo</label>
          <select value={data.tipo} onChange={e => onChange({ ...data, tipo: e.target.value as TipoProtese })}
            className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] focus:border-violet-500/50 focus:outline-none">
            {(Object.entries(TIPO_PROTESE_LABELS) as [TipoProtese, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Material</label>
          <select value={data.material} onChange={e => onChange({ ...data, material: e.target.value as MaterialProtese })}
            className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] focus:border-violet-500/50 focus:outline-none">
            {(Object.entries(MATERIAL_PROTESE_LABELS) as [MaterialProtese, string][]).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Data de Instalação</label>
        <input type="date" value={data.dataInstalacao} onChange={e => onChange({ ...data, dataInstalacao: e.target.value })}
          className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] focus:border-violet-500/50 focus:outline-none" />
      </div>
      <div>
        <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Observações</label>
        <textarea value={data.observacoes} onChange={e => onChange({ ...data, observacoes: e.target.value })} placeholder="Notas sobre a prótese..." rows={2}
          className="w-full p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[11px] placeholder-[var(--text-muted)] resize-none focus:border-violet-500/50 focus:outline-none" />
      </div>
    </div>
  );
}

// ─── PerioResumo ────────────────────────────────────────────────────────────
function PerioResumo({ data }: { data: DenteData }) {
  const faces: FaceId[] = ["vestibular", "mesial", "oclusal", "distal", "lingual"];
  const maxH = 32;
  return (
    <div className="flex items-end gap-[3px] h-10">
      {faces.map(face => {
        const ps = data.perio?.[face]?.profundidadeSondagem || 2;
        const h = Math.max(4, (ps / 12) * maxH);
        return (
          <div key={face} className="flex flex-col items-center gap-[1px]">
            <span className="text-[6px] font-bold" style={{ color: getCorSondagem(ps) }}>{ps}</span>
            <div className="w-[8px] rounded-t" style={{ height: h, backgroundColor: getCorSondagem(ps), opacity: 0.7, boxShadow: ps > 3 ? `0 0 4px ${getCorSondagem(ps)}60` : "none" }} />
            {data.perio?.[face]?.sangramentoSondagem && <div className="w-[4px] h-[4px] rounded-full bg-red-500" style={{ boxShadow: "0 0 3px rgba(239,68,68,0.6)" }} />}
            <span className="text-[5px] text-[var(--text-muted)] font-bold">{FACES_ABREV[face]}</span>
          </div>
        );
      })}
    </div>
  );
}

// ─── ImplantesResumo (V35.6 — NOVO) ────────────────────────────────────────
function ImplantesResumo({ dentesData, onSelectDente }: { dentesData: Record<string, DenteData>; onSelectDente: (n: number) => void }) {
  const implantes = useMemo(() => Object.entries(dentesData).filter(([_, d]) => d.estado === "implante").map(([key, d]) => ({ numero: Number(key), data: d })).sort((a, b) => a.numero - b.numero), [dentesData]);
  if (implantes.length === 0) return null;
  return (
    <div className="card-premium p-5 border border-blue-500/20 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center"><Target className="w-4 h-4 text-blue-400" /></div>
          <div>
            <h3 className="text-[var(--text-primary)] font-bold text-xs">Implantes Registados</h3>
            <p className="text-[var(--text-muted)] text-[9px]">{implantes.length} implante{implantes.length > 1 ? "s" : ""} no odontograma</p>
          </div>
        </div>
      </div>
      {/* Mapa Visual Mini */}
      <div className="mb-4">
        <div className="flex justify-center gap-1 flex-wrap mb-2">
          {dentesSuperiores.map(n => {
            const tem = dentesData[String(n)]?.estado === "implante";
            return <button key={n} onClick={() => tem && onSelectDente(n)} className={`w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-bold border transition-all ${tem ? "bg-blue-500/25 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30 cursor-pointer hover:scale-110" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]/40 cursor-default"}`}>{tem ? <Target className="w-3 h-3" /> : n}</button>;
          })}
        </div>
        <div className="flex items-center gap-3 my-1"><div className="flex-1 h-px bg-[var(--border-primary)]" /><span className="text-[var(--text-muted)] text-[7px] font-bold uppercase">Oclusal</span><div className="flex-1 h-px bg-[var(--border-primary)]" /></div>
        <div className="flex justify-center gap-1 flex-wrap">
          {dentesInferiores.map(n => {
            const tem = dentesData[String(n)]?.estado === "implante";
            return <button key={n} onClick={() => tem && onSelectDente(n)} className={`w-7 h-7 rounded-md flex items-center justify-center text-[8px] font-bold border transition-all ${tem ? "bg-blue-500/25 border-blue-500/40 text-blue-300 ring-1 ring-blue-500/30 cursor-pointer hover:scale-110" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]/40 cursor-default"}`}>{tem ? <Target className="w-3 h-3" /> : n}</button>;
          })}
        </div>
      </div>
      {/* Lista */}
      <div className="space-y-2">
        {implantes.map(({ numero, data }) => {
          const impl = data.implante_detalhes;
          const faseActual = impl ? FASES_IMPLANTE[impl.faseActual - 1] : null;
          const pp = impl ? Math.round((impl.faseActual / FASES_IMPLANTE.length) * 100) : 0;
          return (
            <button key={numero} onClick={() => onSelectDente(numero)} className="w-full flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-blue-500/30 transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-blue-500/15 border border-blue-500/30 flex items-center justify-center shrink-0"><span className="text-blue-400 text-sm font-black">{numero}</span></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-[var(--text-primary)] text-xs font-bold">Dente {numero}</p>
                  {impl?.marca && <span className="text-[8px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30">{impl.marca} {impl.modelo}</span>}
                </div>
                {impl ? (
                  <div className="flex items-center gap-2 text-[var(--text-muted)] text-[9px]">
                    <span>Ø{impl.diametro} × {impl.comprimento}mm</span><span>·</span><span>{CONEXAO_LABELS[impl.conexao]}</span>
                    {impl.dataColocacao && <><span>·</span><span className="flex items-center gap-0.5"><Calendar className="w-2.5 h-2.5" />{new Date(impl.dataColocacao).toLocaleDateString("pt-PT")}</span></>}
                  </div>
                ) : <p className="text-[var(--text-muted)] text-[9px] italic">Sem ficha técnica — clique para preencher</p>}
                {impl && (
                  <div className="mt-1.5">
                    <div className="h-1.5 rounded-full bg-[var(--bg-tertiary)] overflow-hidden"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-700" style={{ width: `${pp}%` }} /></div>
                    <p className="text-[var(--text-muted)] text-[8px] mt-0.5">Fase {impl.faseActual}/{FASES_IMPLANTE.length} — {faseActual?.nome || ""}</p>
                  </div>
                )}
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Props e Componente Principal ───────────────────────────────────────────
interface OdontogramaAvancadoProps {
  odontogramaData: Record<string, string>;
  odontogramaAvancadoData?: Record<string, Partial<DenteData>>;
  tratamentos: any[];
  imagens: any[];
  onSave: (dentes: Record<string, string>, dentesAvancado: Record<string, DenteData>) => void;
  onRefresh: () => void;
  isSaving?: boolean;
  // V35.7: Ligação ao módulo financeiro
  utenteId?: number;
  utenteNome?: string;
  medicoId?: number;
}

export function OdontogramaAvancado({ odontogramaData, odontogramaAvancadoData, tratamentos, imagens, onSave, onRefresh, isSaving = false, utenteId, utenteNome = "Utente", medicoId }: OdontogramaAvancadoProps) {
  const [dentesData, setDentesData] = useState<Record<string, DenteData>>(() => {
    const initial: Record<string, DenteData> = {};
    todosDentes.forEach(n => {
      const key = String(n);
      initial[key] = { estado: (odontogramaData[key] as EstadoDente) || "saudavel", faces: {}, notas: "", mobilidade: 0, placa: false, sangramento: false, perio: {}, furca: 0, sensibilidade: false, supuracao: false, nivelOsseo: 0 };
    });
    return initial;
  });

  const [denteSelecionado, setDenteSelecionado] = useState<number | null>(null);
  const [multiSelecao, setMultiSelecao] = useState<number[]>([]);
  const [modoMulti, setModoMulti] = useState(false);
  const [presetActivo, setPresetActivo] = useState<string | null>(null);
  const [showPresets, setShowPresets] = useState(true);
  const [faceSelecionada, setFaceSelecionada] = useState<FaceId | null>(null);
  const [modificado, setModificado] = useState(false);
  const [filtroEstado, setFiltroEstado] = useState<EstadoDente | "todos">("todos");
  const [showNotas, setShowNotas] = useState(false);
  const [notaTexto, setNotaTexto] = useState("");
  const [showAtalhos, setShowAtalhos] = useState(false);
  const [tabDetalhe, setTabDetalhe] = useState<TabDetalhe>("faces");
  const [showImplantesResumo, setShowImplantesResumo] = useState(false);
  const [showModalOrcamento, setShowModalOrcamento] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync com dados externos
  useEffect(() => {
    if (!odontogramaData) return;
    setDentesData(prev => {
      const updated = { ...prev };
      Object.keys(odontogramaData).forEach(key => {
        const novoEstado = odontogramaData[key] as EstadoDente;
        if (updated[key] && updated[key].estado !== novoEstado) updated[key] = { ...updated[key], estado: novoEstado };
      });
      todosDentes.forEach(n => {
        const key = String(n);
        if (!odontogramaData[key] && updated[key] && updated[key].estado !== "saudavel") updated[key] = { ...updated[key], estado: "saudavel" };
      });
      if (odontogramaAvancadoData) {
        Object.keys(odontogramaAvancadoData).forEach(key => {
          if (updated[key]) {
            const av = odontogramaAvancadoData[key];
            updated[key] = { ...updated[key],
              ...(av.notas !== undefined ? { notas: av.notas } : {}),
              ...(av.perio !== undefined ? { perio: av.perio as any } : {}),
              ...(av.furca !== undefined ? { furca: av.furca as any } : {}),
              ...(av.implante_detalhes !== undefined ? { implante_detalhes: av.implante_detalhes as any } : {}),
              ...(av.protese_detalhes !== undefined ? { protese_detalhes: av.protese_detalhes as any } : {}),
              ...(av.mobilidade !== undefined ? { mobilidade: av.mobilidade } : {}),
              ...(av.sensibilidade !== undefined ? { sensibilidade: av.sensibilidade } : {}),
              ...(av.supuracao !== undefined ? { supuracao: av.supuracao } : {}),
              ...(av.nivelOsseo !== undefined ? { nivelOsseo: av.nivelOsseo } : {}),
            };
          }
        });
      }
      return updated;
    });
    setModificado(false);
  }, [odontogramaData, odontogramaAvancadoData]);

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (showNotas) return;
      if (e.key === "Escape") {
        if (faceSelecionada) { setFaceSelecionada(null); return; }
        if (denteSelecionado) { setDenteSelecionado(null); return; }
        if (modoMulti) { setModoMulti(false); setMultiSelecao([]); return; }
        if (presetActivo) { setPresetActivo(null); return; }
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const idx = denteSelecionado ? todosDentes.indexOf(denteSelecionado) : -1;
        const novoIdx = e.key === "ArrowRight" ? (idx < todosDentes.length - 1 ? idx + 1 : 0) : (idx > 0 ? idx - 1 : todosDentes.length - 1);
        setDenteSelecionado(todosDentes[novoIdx]);
        setFaceSelecionada(null);
      }
      if (denteSelecionado && !e.ctrlKey && !e.metaKey) {
        if (e.key === "1") setTabDetalhe("faces");
        if (e.key === "2") setTabDetalhe("perio");
        if (e.key === "3") setTabDetalhe("implante");
        if (e.key === "4") setTabDetalhe("notas");
        if (e.key === "5") setTabDetalhe("historico");
      }
      if (e.key === "s" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); if (modificado) handleSave(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [denteSelecionado, faceSelecionada, modoMulti, presetActivo, showNotas, modificado]);

  // Stats
  const stats = useMemo(() => {
    const total = todosDentes.length;
    const estados: Record<string, number> = {};
    let comProblema = 0, ausentes = 0, comFacesAfectadas = 0, comBOP = 0, comBolsasProfundas = 0, implantes = 0, comFurca = 0;
    Object.values(dentesData).forEach(d => {
      estados[d.estado] = (estados[d.estado] || 0) + 1;
      if (d.estado !== "saudavel" && d.estado !== "tratado" && d.estado !== "restauracao") comProblema++;
      if (d.estado === "ausente" || d.estado === "extraido") ausentes++;
      if (d.estado === "implante") implantes++;
      if (Object.values(d.faces).some(f => f && f !== "saudavel")) comFacesAfectadas++;
      if (d.perio && Object.values(d.perio).some(p => p?.sangramentoSondagem)) comBOP++;
      if (d.perio && Object.values(d.perio).some(p => (p?.profundidadeSondagem || 0) > 3)) comBolsasProfundas++;
      if ((d.furca || 0) > 0) comFurca++;
    });
    const saudaveis = estados["saudavel"] || 0;
    const tratados = (estados["tratado"] || 0) + (estados["restauracao"] || 0);
    return { total, saudaveis, tratados, comProblema, ausentes, percentSaude: Math.round(((saudaveis + tratados) / total) * 100), estados, comFacesAfectadas, comBOP, comBolsasProfundas, implantes, comFurca };
  }, [dentesData]);

  // Handlers
  const handleDenteClick = useCallback((numero: number) => {
    if (modoMulti) { setMultiSelecao(prev => prev.includes(numero) ? prev.filter(n => n !== numero) : [...prev, numero]); return; }
    if (presetActivo) {
      const preset = PRESETS_RAPIDOS.find(p => p.id === presetActivo);
      if (preset) {
        setDentesData(prev => ({ ...prev, [String(numero)]: { ...prev[String(numero)], estado: preset.estadoDente, faces: preset.faces ? { ...prev[String(numero)].faces, ...preset.faces } : prev[String(numero)].faces, ...(preset.estadoDente === "implante" && !prev[String(numero)].implante_detalhes ? { implante_detalhes: getDefaultImplanteData() } : {}) } }));
        setModificado(true); return;
      }
    }
    setDenteSelecionado(prev => prev === numero ? null : numero);
    setFaceSelecionada(null);
    setTabDetalhe("faces");
  }, [modoMulti, presetActivo]);

  const handleFaceClick = useCallback((numero: number, face: FaceId) => {
    if (denteSelecionado === numero) { setFaceSelecionada(prev => prev === face ? null : face); }
    else { setDenteSelecionado(numero); setFaceSelecionada(face); setTabDetalhe("faces"); }
  }, [denteSelecionado]);

  const aplicarPresetAosDentes = useCallback((presetId: string) => {
    const preset = PRESETS_RAPIDOS.find(p => p.id === presetId);
    if (!preset) return;
    const dentesAlvo = modoMulti && multiSelecao.length > 0 ? multiSelecao : denteSelecionado ? [denteSelecionado] : [];
    if (dentesAlvo.length === 0) { setPresetActivo(presetActivo === presetId ? null : presetId); return; }
    setDentesData(prev => {
      const novo = { ...prev };
      dentesAlvo.forEach(n => {
        const key = String(n);
        novo[key] = { ...novo[key], estado: preset.estadoDente, faces: preset.faces ? { ...novo[key].faces, ...preset.faces } : (preset.estadoDente === "saudavel" ? {} : novo[key].faces), ...(preset.estadoDente === "implante" && !novo[key].implante_detalhes ? { implante_detalhes: getDefaultImplanteData() } : {}) };
      });
      return novo;
    });
    setModificado(true);
    if (modoMulti) setMultiSelecao([]);
  }, [modoMulti, multiSelecao, denteSelecionado, presetActivo]);

  const aplicarEstadoFace = useCallback((face: FaceId, estado: EstadoFace) => {
    if (!denteSelecionado) return;
    setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], faces: { ...prev[String(denteSelecionado)].faces, [face]: estado } } }));
    setModificado(true);
  }, [denteSelecionado]);

  const updatePerioFace = useCallback((face: FaceId, perioData: PerioFaceData) => {
    if (!denteSelecionado) return;
    setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], perio: { ...prev[String(denteSelecionado)].perio, [face]: perioData } } }));
    setModificado(true);
  }, [denteSelecionado]);

  const updateImplanteDetalhes = useCallback((implData: ImplanteData) => {
    if (!denteSelecionado) return;
    setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], implante_detalhes: implData } }));
    setModificado(true);
  }, [denteSelecionado]);

  const updateProteseDetalhes = useCallback((protData: ProteseData) => {
    if (!denteSelecionado) return;
    setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], protese_detalhes: protData } }));
    setModificado(true);
  }, [denteSelecionado]);

  const handleSave = useCallback(() => {
    const dentesSimples: Record<string, string> = {};
    Object.entries(dentesData).forEach(([key, data]) => { if (data.estado !== "saudavel") dentesSimples[key] = data.estado; });
    onSave(dentesSimples, dentesData);
    setModificado(false);
  }, [dentesData, onSave]);

  const guardarNota = useCallback(() => {
    if (!denteSelecionado) return;
    setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], notas: notaTexto } }));
    setShowNotas(false); setModificado(true);
  }, [denteSelecionado, notaTexto]);

  const tratsDenteSel = useMemo(() => !denteSelecionado ? [] : tratamentos.filter(t => t.dente && (t.dente === String(denteSelecionado) || t.dente.includes(String(denteSelecionado)))), [denteSelecionado, tratamentos]);
  const imgsDenteSel = useMemo(() => !denteSelecionado ? [] : imagens.filter(i => i.dentesRelacionados && i.dentesRelacionados.includes(String(denteSelecionado))), [denteSelecionado, imagens]);
  const denteSelData = denteSelecionado ? dentesData[String(denteSelecionado)] : null;

  const handleSelectDenteFromResumo = useCallback((numero: number) => {
    setDenteSelecionado(numero); setTabDetalhe("implante"); setFaceSelecionada(null);
  }, []);  // ─── Render ───────────────────────────────────────────────────────────────────────────────────
  return (
    <>
    <div ref={containerRef} className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <style>{`
        @keyframes scanline { 0% { transform: translateY(-10px); } 100% { transform: translateY(900px); } }
        @keyframes neonPulse { 0%, 100% { opacity: 0.7; } 50% { opacity: 1; } }
        @keyframes slideInDetail { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: translateY(0); } }
        .detail-panel-enter { animation: slideInDetail 0.35s ease-out; }
        .tab-active { background: linear-gradient(135deg, rgba(0,229,255,0.15), rgba(0,229,255,0.05)); border-color: rgba(0,229,255,0.4); color: #00E5FF; }
        .tab-implante-active { background: linear-gradient(135deg, rgba(96,165,250,0.15), rgba(96,165,250,0.05)); border-color: rgba(96,165,250,0.4); color: #60A5FA; }
      `}</style>

      {/* Action Bar */}
      <div className="sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-[#00E5FF]/5 to-blue-500/5 border border-[#00E5FF]/20 backdrop-blur-xl shadow-lg flex-wrap">
        <button onClick={() => { setModoMulti(!modoMulti); setMultiSelecao([]); setPresetActivo(null); }}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${modoMulti ? "bg-violet-500/20 text-violet-300 border-violet-500/30 shadow-sm shadow-violet-500/10" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
          <Copy className="w-3.5 h-3.5" /> {modoMulti ? `Multi (${multiSelecao.length})` : "Multi-Selecção"}
        </button>
        {stats.implantes > 0 && (
          <button onClick={() => setShowImplantesResumo(!showImplantesResumo)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${showImplantesResumo ? "bg-blue-500/20 text-blue-300 border-blue-500/30" : "bg-[var(--bg-secondary)] text-[var(--text-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
            <Target className="w-3.5 h-3.5" /> Implantes ({stats.implantes})
          </button>
        )}
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1 shrink-0" />
        <button onClick={handleSave} disabled={!modificado || isSaving}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all ${modificado ? "bg-emerald-500 hover:bg-emerald-600 text-white border-emerald-500/50 shadow-sm shadow-emerald-500/20" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>
          {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          {isSaving ? "A guardar..." : modificado ? "Guardar *" : "Guardado"}
        </button>
        {utenteId && (
          <button onClick={() => setShowModalOrcamento(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border transition-all bg-amber-500/10 text-amber-300 border-amber-500/30 hover:bg-amber-500/20">
            <Euro className="w-3.5 h-3.5" />
            Orçamento
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button onClick={() => setShowAtalhos(!showAtalhos)} className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all" title="Atalhos"><Keyboard className="w-3 h-3" /></button>
          <button onClick={() => setShowPresets(!showPresets)} className={`inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${showPresets ? "bg-[#00E5FF]/15 text-[#00E5FF] border-[#00E5FF]/30" : "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}><Sparkles className="w-3 h-3" /> Presets</button>
          <button onClick={() => { if (typeof window !== "undefined") window.print(); }} className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all" title="Imprimir"><Printer className="w-3 h-3" /></button>
          <button onClick={onRefresh} className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all"><RefreshCw className="w-3 h-3" /> Actualizar</button>
        </div>
      </div>

      {/* Atalhos */}
      {showAtalhos && (
        <div className="card-premium p-3 border border-[var(--border-primary)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 mb-2"><Keyboard className="w-3.5 h-3.5 text-[#00E5FF]" /><span className="text-[var(--text-primary)] text-[10px] font-bold">Atalhos de Teclado</span></div>
          <div className="flex flex-wrap gap-x-6 gap-y-1.5">
            {[{ keys: "← →", desc: "Navegar entre dentes" }, { keys: "Esc", desc: "Fechar selecção" }, { keys: "Ctrl+S", desc: "Guardar" }, { keys: "1-5", desc: "Alternar tabs" }].map(a => (
              <div key={a.keys} className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-primary)] text-[9px] font-mono font-bold text-[#00E5FF]">{a.keys}</kbd>
                <span className="text-[9px] text-[var(--text-muted)]">{a.desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Barra de Saúde */}
      <div className="card-premium p-5 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center"><Activity className="w-5 h-5 text-emerald-400" /></div>
            <div>
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Saúde Oral Geral</h3>
              <p className="text-[var(--text-muted)] text-[10px]">{stats.total} dentes · {stats.comFacesAfectadas} com faces afectadas · {stats.implantes} implantes</p>
            </div>
          </div>
          <div className="text-right">
            <span className={`text-2xl font-black ${stats.percentSaude >= 80 ? "text-emerald-400" : stats.percentSaude >= 50 ? "text-amber-400" : "text-red-400"}`} style={{ textShadow: stats.percentSaude >= 80 ? "0 0 12px rgba(52,211,153,0.4)" : stats.percentSaude >= 50 ? "0 0 12px rgba(251,191,36,0.4)" : "0 0 12px rgba(248,113,113,0.4)" }}>{stats.percentSaude}%</span>
            <p className="text-[var(--text-muted)] text-[10px]">índice de saúde</p>
          </div>
        </div>
        <div className="h-3 rounded-full bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden flex">
          {Object.entries(stats.estados).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).map(([estado, count]) => {
            const pct = (count / stats.total) * 100;
            const cfg = ESTADOS_DENTE_CONFIG[estado as EstadoDente];
            return <div key={estado} style={{ width: `${pct}%`, backgroundColor: cfg?.fill || "#64748B", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.15)" }} className="h-full transition-all duration-700 first:rounded-l-full last:rounded-r-full" title={`${cfg?.label}: ${count} (${Math.round(pct)}%)`} />;
          })}
        </div>
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {[
            { label: "Saudáveis", valor: stats.saudaveis, cor: "text-emerald-400", fill: "#34D399" },
            { label: "Restaurados", valor: stats.tratados, cor: "text-amber-400", fill: "#FBBF24" },
            { label: "Com Problema", valor: stats.comProblema, cor: "text-red-400", fill: "#F87171" },
            { label: "Ausentes", valor: stats.ausentes, cor: "text-slate-400", fill: "#64748B" },
            { label: "Implantes", valor: stats.implantes, cor: "text-blue-400", fill: "#60A5FA" },
            { label: "BOP", valor: stats.comBOP, cor: "text-red-400", fill: "#EF4444" },
            { label: "Bolsas >3mm", valor: stats.comBolsasProfundas, cor: "text-orange-400", fill: "#FB923C" },
            { label: "Furca", valor: stats.comFurca, cor: "text-violet-400", fill: "#A78BFA" },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.fill, boxShadow: `0 0 4px ${s.fill}60` }} />
              <span className="text-[10px] text-[var(--text-muted)]">{s.label}:</span>
              <span className={`text-[10px] font-bold ${s.cor}`}>{s.valor}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Resumo de Implantes */}
      {showImplantesResumo && <ImplantesResumo dentesData={dentesData} onSelectDente={handleSelectDenteFromResumo} />}

      {/* Presets */}
      {showPresets && (
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00E5FF]" />
              <span className="text-[var(--text-primary)] text-xs font-bold">Presets Rápidos</span>
              {presetActivo && <span className="text-[9px] text-amber-300 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">Modo pintura activo — clique nos dentes</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {PRESETS_RAPIDOS.map(preset => {
              const Icon = preset.icon;
              const isActive = presetActivo === preset.id;
              return (
                <button key={preset.id} onClick={() => aplicarPresetAosDentes(preset.id)}
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all ${isActive ? `${preset.bg} ${preset.border} shadow-sm scale-[1.02]` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
                  <div className={`w-8 h-8 rounded-lg ${preset.bg} border ${preset.border} flex items-center justify-center shrink-0`}><Icon className={`w-4 h-4 ${preset.cor}`} /></div>
                  <div className="min-w-0">
                    <p className={`text-[10px] font-bold truncate ${isActive ? preset.cor : "text-[var(--text-primary)]"}`}>{preset.nome}</p>
                    <p className="text-[9px] text-[var(--text-muted)] truncate">{preset.descricao}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Odontograma Principal */}
      <div className="card-premium p-6 border border-[var(--border-primary)] relative overflow-hidden">
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: `linear-gradient(rgba(0,229,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,255,0.4) 1px, transparent 1px)`, backgroundSize: "30px 30px" }} />
        <div className="absolute inset-0 overflow-hidden pointer-events-none"><div className="absolute w-full h-px bg-gradient-to-r from-transparent via-[#00E5FF]/15 to-transparent" style={{ animation: "scanline 5s linear infinite", top: 0 }} /></div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/30 flex items-center justify-center"><Smile className="w-4 h-4 text-[#00E5FF]" /></div>
              <div>
                <h3 className="text-[var(--text-primary)] font-bold text-sm">Odontograma Clínico Interactivo</h3>
                <p className="text-[var(--text-muted)] text-[9px]">Vista anatómica com periograma integrado — Clique nas faces para detalhar</p>
              </div>
            </div>
            <div className="flex items-center gap-1 bg-[var(--bg-secondary)]/80 backdrop-blur-sm border border-[var(--border-primary)] rounded-lg p-0.5">
              <button onClick={() => setFiltroEstado("todos")} className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${filtroEstado === "todos" ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>Todos</button>
              {(["carie", "restauracao", "tratado", "endodontia", "implante", "coroa", "protese", "extracao_indicada", "ausente", "extraido"] as EstadoDente[]).map(est => (
                <button key={est} onClick={() => setFiltroEstado(filtroEstado === est ? "todos" : est)}
                  className={`px-2 py-1 rounded-md text-[9px] font-bold transition-all ${filtroEstado === est ? `${ESTADOS_DENTE_CONFIG[est].bg} ${ESTADOS_DENTE_CONFIG[est].cor}` : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"}`}>{ESTADOS_DENTE_CONFIG[est].label}</button>
              ))}
            </div>
          </div>

          {/* Legenda */}
          <div className="flex flex-wrap gap-2 mb-5">
            {Object.entries(ESTADOS_DENTE_CONFIG).map(([key, { label, bg, cor, border, fill, glow }]) => (
              <button key={key} onClick={() => setFiltroEstado(filtroEstado === key ? "todos" : key as EstadoDente)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${bg} border ${border} transition-all hover:scale-105 cursor-pointer ${filtroEstado === key ? "ring-1 ring-offset-1 ring-offset-[var(--bg-primary)]" : ""}`}
                style={filtroEstado === key ? { ['--tw-ring-color' as any]: fill } as React.CSSProperties : undefined}>
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fill, boxShadow: glow }} />
                <span className={`text-[9px] font-semibold ${cor}`}>{label}</span>
                {stats.estados[key] ? <span className={`text-[8px] font-black ${cor} opacity-70`}>({stats.estados[key]})</span> : null}
              </button>
            ))}
          </div>

          {/* Arcada Superior */}
          <div className="mb-1">
            <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-[0.2em] mb-3 text-center flex items-center justify-center gap-2">
              <span className="w-16 h-px bg-gradient-to-r from-transparent to-[#00E5FF]/30" />
              <span className="flex items-center gap-1.5"><ChevronUp className="w-3 h-3 text-[#00E5FF]/50" /> Arcada Superior (Maxilar)</span>
              <span className="w-16 h-px bg-gradient-to-l from-transparent to-[#00E5FF]/30" />
            </p>
            <div className="flex justify-center items-end gap-[3px] flex-wrap">
              {dentesSuperiores.map((n, idx) => {
                const data = dentesData[String(n)] || { estado: "saudavel" as EstadoDente, faces: {} };
                const dimmed = filtroEstado !== "todos" && data.estado !== filtroEstado;
                const isMiddle = idx === 8;
                return (
                  <React.Fragment key={n}>
                    {isMiddle && <div className="w-px self-stretch mx-1 bg-gradient-to-b from-transparent via-[#00E5FF]/20 to-transparent" />}
                    <div className={`transition-all duration-300 ${dimmed ? "opacity-15 scale-95 pointer-events-none" : ""}`}>
                      <Dente3D numero={n} data={data} selected={denteSelecionado === n} multiSelected={multiSelecao.includes(n)} onClick={() => handleDenteClick(n)} onFaceClick={(face) => handleFaceClick(n, face)} isUpper={true} />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          </div>

          {/* Plano Oclusal */}
          <div className="flex items-center gap-3 my-4">
            <div className="flex-1 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.3) 15%, rgba(239,68,68,0.5) 30%, rgba(239,68,68,0.6) 50%, rgba(239,68,68,0.5) 70%, rgba(239,68,68,0.3) 85%, transparent 100%)", boxShadow: "0 0 8px rgba(239,68,68,0.2)" }} />
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00E5FF]/5 border border-[#00E5FF]/15 shrink-0">
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" style={{ animation: "neonPulse 2s ease-in-out infinite" }} />
              <span className="text-[#00E5FF]/60 text-[8px] font-bold uppercase tracking-[0.2em]">Plano Oclusal</span>
              <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]" style={{ animation: "neonPulse 2s ease-in-out infinite", animationDelay: "1s" }} />
            </div>
            <div className="flex-1 h-[2px] rounded-full" style={{ background: "linear-gradient(90deg, transparent 0%, rgba(239,68,68,0.3) 15%, rgba(239,68,68,0.5) 30%, rgba(239,68,68,0.6) 50%, rgba(239,68,68,0.5) 70%, rgba(239,68,68,0.3) 85%, transparent 100%)", boxShadow: "0 0 8px rgba(239,68,68,0.2)" }} />
          </div>

          {/* Arcada Inferior */}
          <div>
            <div className="flex justify-center items-start gap-[3px] flex-wrap">
              {dentesInferiores.map((n, idx) => {
                const data = dentesData[String(n)] || { estado: "saudavel" as EstadoDente, faces: {} };
                const dimmed = filtroEstado !== "todos" && data.estado !== filtroEstado;
                const isMiddle = idx === 8;
                return (
                  <React.Fragment key={n}>
                    {isMiddle && <div className="w-px self-stretch mx-1 bg-gradient-to-b from-transparent via-[#00E5FF]/20 to-transparent" />}
                    <div className={`transition-all duration-300 ${dimmed ? "opacity-15 scale-95 pointer-events-none" : ""}`}>
                      <Dente3D numero={n} data={data} selected={denteSelecionado === n} multiSelected={multiSelecao.includes(n)} onClick={() => handleDenteClick(n)} onFaceClick={(face) => handleFaceClick(n, face)} isUpper={false} />
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <p className="text-[var(--text-muted)] text-[9px] font-black uppercase tracking-[0.2em] mt-3 text-center flex items-center justify-center gap-2">
              <span className="w-16 h-px bg-gradient-to-r from-transparent to-[#00E5FF]/30" />
              <span className="flex items-center gap-1.5"><ChevronDown className="w-3 h-3 text-[#00E5FF]/50" /> Arcada Inferior (Mandíbula)</span>
              <span className="w-16 h-px bg-gradient-to-l from-transparent to-[#00E5FF]/30" />
            </p>
          </div>
        </div>
      </div>

      {/* ─── Painel de Detalhes do Dente Selecionado (COM TABS) ──────────────── */}
      {denteSelecionado && denteSelData && (
        <div className="card-premium border border-[#00E5FF]/20 detail-panel-enter">
          {/* Header do painel */}
          <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#00E5FF]/15 to-[#00E5FF]/5 border border-[#00E5FF]/30 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/10 to-transparent" />
                <span className="text-[#00E5FF] text-xl font-black relative z-10" style={{ textShadow: "0 0 12px rgba(0,229,255,0.5)" }}>{denteSelecionado}</span>
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-bold text-base">Dente {denteSelecionado}</h3>
                <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
                  {getNomeTipoDente(getTipoDente(denteSelecionado))} · {getQuadrante(denteSelecionado)}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${ESTADOS_DENTE_CONFIG[denteSelData.estado]?.bg} ${ESTADOS_DENTE_CONFIG[denteSelData.estado]?.cor} ${ESTADOS_DENTE_CONFIG[denteSelData.estado]?.border}`}
                    style={{ boxShadow: ESTADOS_DENTE_CONFIG[denteSelData.estado]?.glow }}>
                    {ESTADOS_DENTE_CONFIG[denteSelData.estado]?.label}
                  </span>
                  {denteSelData.placa && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">Placa</span>}
                  {denteSelData.sangramento && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-300 border border-red-500/30">Sangramento</span>}
                  {(denteSelData.mobilidade || 0) > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/30">Mob. {denteSelData.mobilidade}</span>}
                  {(denteSelData.furca || 0) > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/30">Furca {denteSelData.furca}</span>}
                  {denteSelData.sensibilidade && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">Sensibilidade</span>}
                  {denteSelData.supuracao && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500/15 text-orange-300 border border-orange-500/30">Supuração</span>}
                  {denteSelData.estado === "implante" && denteSelData.implante_detalhes && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 flex items-center gap-1">
                      <Target className="w-2.5 h-2.5" />
                      Fase {denteSelData.implante_detalhes.faseActual}/{FASES_IMPLANTE.length}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-black/30 border border-[var(--border-primary)]">
                <PerioResumo data={denteSelData} />
              </div>
              <div className="flex flex-col gap-1">
                <button onClick={() => { const lista = todosDentes; const idx = lista.indexOf(denteSelecionado); setDenteSelecionado(lista[idx > 0 ? idx - 1 : lista.length - 1]); setFaceSelecionada(null); }}
                  className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#00E5FF] transition-all border border-[var(--border-primary)]" title="Dente anterior">
                  <ArrowLeft className="w-3 h-3" />
                </button>
                <button onClick={() => { const lista = todosDentes; const idx = lista.indexOf(denteSelecionado); setDenteSelecionado(lista[idx < lista.length - 1 ? idx + 1 : 0]); setFaceSelecionada(null); }}
                  className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-muted)] hover:text-[#00E5FF] transition-all border border-[var(--border-primary)]" title="Dente seguinte">
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
              <button onClick={() => setDenteSelecionado(null)}
                className="w-8 h-8 rounded-lg bg-[var(--bg-tertiary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all border border-[var(--border-primary)]">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ─── Tabs de Navegação ─────────────────────────────────────────────── */}
          <div className="flex items-center gap-1 p-2 border-b border-[var(--border-primary)] bg-[var(--bg-secondary)]/50">
            {([
              { id: "faces" as TabDetalhe, label: "Faces & Estado", icon: Eye, key: "1" },
              { id: "perio" as TabDetalhe, label: "Periograma", icon: BarChart3, key: "2" },
              { id: "implante" as TabDetalhe, label: denteSelData.estado === "protese" ? "Prótese" : denteSelData.estado === "implante" ? "Implante" : "Implante / Prótese", icon: denteSelData.estado === "implante" ? Target : Settings2, key: "3" },
              { id: "notas" as TabDetalhe, label: "Notas", icon: NotebookPen, key: "4" },
              { id: "historico" as TabDetalhe, label: "Histórico", icon: Stethoscope, key: "5" },
            ]).map(tab => {
              const Icon = tab.icon;
              const isActive = tabDetalhe === tab.id;
              const isImplanteTab = tab.id === "implante";
              const hasImplanteData = denteSelData.estado === "implante" && denteSelData.implante_detalhes;
              return (
                <button key={tab.id} onClick={() => setTabDetalhe(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold border transition-all ${
                    isActive ? (isImplanteTab && denteSelData.estado === "implante" ? "tab-implante-active" : "tab-active") : "bg-transparent border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"
                  }`}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isImplanteTab && hasImplanteData && <div className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-0.5" style={{ boxShadow: "0 0 4px rgba(96,165,250,0.6)" }} />}
                  <kbd className="text-[7px] opacity-50 ml-0.5">{tab.key}</kbd>
                </button>
              );
            })}
          </div>

          <div className="p-5 space-y-5">

            {/* ═══ TAB: FACES & ESTADO ═══ */}
            {tabDetalhe === "faces" && (
              <>
                {/* Diagrama grande de 5 faces */}
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                    <Eye className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Faces do Dente — Vista Oclusal
                  </p>
                  <div className="flex items-start gap-5">
                    <div className="relative" style={{ width: 160, height: 160 }}>
                      <svg width="160" height="160" viewBox="0 0 160 160">
                        <rect x="5" y="5" width="150" height="150" rx="16" fill="rgba(0,0,0,0.3)" stroke="rgba(0,229,255,0.15)" strokeWidth="1" />
                        {/* Vestibular */}
                        <path d="M15,15 L145,15 L120,45 L40,45 Z"
                          fill={denteSelData.faces?.vestibular && denteSelData.faces.vestibular !== "saudavel" ? `${ESTADOS_FACE_CONFIG[denteSelData.faces.vestibular!]?.fill}50` : "rgba(52,211,153,0.1)"}
                          stroke={faceSelecionada === "vestibular" ? "#00E5FF" : denteSelData.faces?.vestibular && denteSelData.faces.vestibular !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.vestibular!]?.fill : "rgba(100,150,200,0.2)"}
                          strokeWidth={faceSelecionada === "vestibular" ? "2" : "1"} className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setFaceSelecionada(faceSelecionada === "vestibular" ? null : "vestibular")} />
                        <text x="80" y="30" textAnchor="middle" dominantBaseline="middle"
                          fill={denteSelData.faces.vestibular && denteSelData.faces.vestibular !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.vestibular!]?.fill : "#94A3B8"}
                          fontSize="10" fontWeight="700" className="pointer-events-none">V</text>
                        {/* Lingual */}
                        <path d="M40,115 L120,115 L145,145 L15,145 Z"
                          fill={denteSelData.faces.lingual && denteSelData.faces.lingual !== "saudavel" ? `${ESTADOS_FACE_CONFIG[denteSelData.faces.lingual!]?.fill}50` : "rgba(52,211,153,0.1)"}
                          stroke={faceSelecionada === "lingual" ? "#00E5FF" : denteSelData.faces.lingual && denteSelData.faces.lingual !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.lingual!]?.fill : "rgba(100,150,200,0.2)"}
                          strokeWidth={faceSelecionada === "lingual" ? "2" : "1"} className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setFaceSelecionada(faceSelecionada === "lingual" ? null : "lingual")} />
                        <text x="80" y="130" textAnchor="middle" dominantBaseline="middle"
                          fill={denteSelData.faces.lingual && denteSelData.faces.lingual !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.lingual!]?.fill : "#94A3B8"}
                          fontSize="10" fontWeight="700" className="pointer-events-none">L</text>
                        {/* Mesial */}
                        <path d="M15,15 L40,45 L40,115 L15,145 Z"
                          fill={denteSelData.faces.mesial && denteSelData.faces.mesial !== "saudavel" ? `${ESTADOS_FACE_CONFIG[denteSelData.faces.mesial!]?.fill}50` : "rgba(52,211,153,0.1)"}
                          stroke={faceSelecionada === "mesial" ? "#00E5FF" : denteSelData.faces.mesial && denteSelData.faces.mesial !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.mesial!]?.fill : "rgba(100,150,200,0.2)"}
                          strokeWidth={faceSelecionada === "mesial" ? "2" : "1"} className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setFaceSelecionada(faceSelecionada === "mesial" ? null : "mesial")} />
                        <text x="27" y="80" textAnchor="middle" dominantBaseline="middle"
                          fill={denteSelData.faces.mesial && denteSelData.faces.mesial !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.mesial!]?.fill : "#94A3B8"}
                          fontSize="10" fontWeight="700" className="pointer-events-none">M</text>
                        {/* Distal */}
                        <path d="M120,45 L145,15 L145,145 L120,115 Z"
                          fill={denteSelData.faces.distal && denteSelData.faces.distal !== "saudavel" ? `${ESTADOS_FACE_CONFIG[denteSelData.faces.distal!]?.fill}50` : "rgba(52,211,153,0.1)"}
                          stroke={faceSelecionada === "distal" ? "#00E5FF" : denteSelData.faces.distal && denteSelData.faces.distal !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.distal!]?.fill : "rgba(100,150,200,0.2)"}
                          strokeWidth={faceSelecionada === "distal" ? "2" : "1"} className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setFaceSelecionada(faceSelecionada === "distal" ? null : "distal")} />
                        <text x="133" y="80" textAnchor="middle" dominantBaseline="middle"
                          fill={denteSelData.faces.distal && denteSelData.faces.distal !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.distal!]?.fill : "#94A3B8"}
                          fontSize="10" fontWeight="700" className="pointer-events-none">D</text>
                        {/* Oclusal */}
                        <rect x="40" y="45" width="80" height="70" rx="6"
                          fill={denteSelData.faces.oclusal && denteSelData.faces.oclusal !== "saudavel" ? `${ESTADOS_FACE_CONFIG[denteSelData.faces.oclusal!]?.fill}50` : "rgba(52,211,153,0.1)"}
                          stroke={faceSelecionada === "oclusal" ? "#00E5FF" : denteSelData.faces.oclusal && denteSelData.faces.oclusal !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.oclusal!]?.fill : "rgba(100,150,200,0.2)"}
                          strokeWidth={faceSelecionada === "oclusal" ? "2" : "1"} className="cursor-pointer hover:opacity-80 transition-all"
                          onClick={() => setFaceSelecionada(faceSelecionada === "oclusal" ? null : "oclusal")} />
                        <text x="80" y="80" textAnchor="middle" dominantBaseline="middle"
                          fill={denteSelData.faces.oclusal && denteSelData.faces.oclusal !== "saudavel" ? ESTADOS_FACE_CONFIG[denteSelData.faces.oclusal!]?.fill : "#94A3B8"}
                          fontSize="10" fontWeight="700" className="pointer-events-none">O</text>
                      </svg>
                    </div>
                    <div className="flex-1 space-y-2">
                      {(["vestibular", "mesial", "oclusal", "distal", "lingual"] as FaceId[]).map(face => {
                        const faceEstado = denteSelData.faces[face] || "saudavel";
                        const faceConfig = ESTADOS_FACE_CONFIG[faceEstado];
                        return (
                          <div key={face} className={`flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer ${faceSelecionada === face ? "bg-[#00E5FF]/10 border-[#00E5FF]/30" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}
                            onClick={() => setFaceSelecionada(faceSelecionada === face ? null : face)}>
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: faceConfig.fill, boxShadow: `0 0 4px ${faceConfig.glow}` }} />
                            <span className="text-[10px] font-bold text-[var(--text-primary)] w-20">{FACES_LABELS[face]}</span>
                            <span className={`text-[10px] font-semibold ${faceConfig.cor}`}>{faceConfig.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Editor de face selecionada */}
                {faceSelecionada && (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                      <Edit2 className="w-3.5 h-3.5 text-[#00E5FF]" />
                      Estado da Face {FACES_LABELS[faceSelecionada]}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.entries(ESTADOS_FACE_CONFIG) as [EstadoFace, typeof ESTADOS_FACE_CONFIG[EstadoFace]][]).map(([key, cfg]) => {
                        const isActive = denteSelData.faces[faceSelecionada] === key || (!denteSelData.faces[faceSelecionada] && key === "saudavel");
                        return (
                          <button key={key} onClick={() => aplicarEstadoFace(faceSelecionada, key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${isActive ? "ring-2 ring-offset-1 ring-offset-[var(--bg-primary)] scale-105" : "hover:scale-105"}`}
                            style={{ backgroundColor: isActive ? `${cfg.fill}25` : "var(--bg-secondary)", borderColor: isActive ? `${cfg.fill}60` : "var(--border-primary)", color: cfg.fill, ['--tw-ring-color' as any]: cfg.fill } as React.CSSProperties}>
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill, boxShadow: `0 0 4px ${cfg.glow}` }} />
                            {cfg.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Estado do Dente */}
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    Estado Geral do Dente
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {(Object.entries(ESTADOS_DENTE_CONFIG) as [EstadoDente, typeof ESTADOS_DENTE_CONFIG[EstadoDente]][]).map(([key, cfg]) => {
                      const isActive = denteSelData.estado === key;
                      return (
                        <button key={key} onClick={() => {
                          setDentesData(prev => {
                            const updated = { ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], estado: key as EstadoDente } };
                            if (key === "implante" && !updated[String(denteSelecionado)].implante_detalhes) {
                              updated[String(denteSelecionado)].implante_detalhes = getDefaultImplanteData();
                            }
                            return updated;
                          });
                          setModificado(true);
                          if (key === "implante") setTabDetalhe("implante");
                        }}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${isActive ? `${cfg.bg} ${cfg.border} ${cfg.cor} ring-1 ring-offset-1 ring-offset-[var(--bg-primary)] scale-105` : `bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)] hover:scale-105`}`}
                          style={isActive ? { boxShadow: cfg.glow, ['--tw-ring-color' as any]: cfg.fill } as React.CSSProperties : undefined}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cfg.fill, boxShadow: isActive ? cfg.glow : "none" }} />
                          {cfg.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Indicadores Clínicos */}
                <div>
                  <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5 text-pink-400" />
                    Indicadores Clínicos
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { key: "placa", label: "Placa", cor: "amber", value: denteSelData.placa },
                      { key: "sangramento", label: "Sangramento", cor: "red", value: denteSelData.sangramento },
                      { key: "sensibilidade", label: "Sensibilidade", cor: "cyan", value: denteSelData.sensibilidade },
                      { key: "supuracao", label: "Supuração", cor: "orange", value: denteSelData.supuracao },
                    ].map(ind => (
                      <button key={ind.key} onClick={() => { setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], [ind.key]: !ind.value } })); setModificado(true); }}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-bold transition-all ${ind.value ? `bg-${ind.cor}-500/15 border-${ind.cor}-500/30 text-${ind.cor}-300` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center ${ind.value ? `border-${ind.cor}-400 bg-${ind.cor}-500/30` : "border-[var(--border-secondary)]"}`}>
                          {ind.value && <CheckCircle className={`w-3 h-3 text-${ind.cor}-400`} />}
                        </div>
                        {ind.label}
                      </button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Mobilidade (0-3)</label>
                      <div className="flex items-center gap-1">
                        {[0, 1, 2, 3].map(v => (
                          <button key={v} onClick={() => { setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], mobilidade: v } })); setModificado(true); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${denteSelData.mobilidade === v ? "bg-pink-500/15 border-pink-500/30 text-pink-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-[9px] text-[var(--text-muted)] font-bold uppercase mb-1 block">Furca (0-3)</label>
                      <div className="flex items-center gap-1">
                        {([0, 1, 2, 3] as GrauFurca[]).map(v => (
                          <button key={v} onClick={() => { setDentesData(prev => ({ ...prev, [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], furca: v } })); setModificado(true); }}
                            className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${denteSelData.furca === v ? "bg-violet-500/15 border-violet-500/30 text-violet-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>{v}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ═══ TAB: PERIOGRAMA ═══ */}
            {tabDetalhe === "perio" && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <BarChart3 className="w-3.5 h-3.5 text-pink-400" />
                  Periograma Detalhado — Dente {denteSelecionado}
                </p>
                <div className="space-y-3">
                  {(["vestibular", "mesial", "oclusal", "distal", "lingual"] as FaceId[]).map(face => (
                    <PerioFaceEditor key={face} face={face} data={denteSelData.perio?.[face] || getDefaultPerioFace()}
                      onChange={(pd) => updatePerioFace(face, pd)} />
                  ))}
                </div>
              </div>
            )}

            {/* ═══ TAB: IMPLANTE / PRÓTESE (V35.6 — REDESENHADA) ═══ */}
            {tabDetalhe === "implante" && (
              <div>
                {denteSelData.estado === "implante" ? (
                  <>
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Target className="w-3.5 h-3.5 text-blue-400" />
                      Implantologia — Dente {denteSelecionado}
                    </p>
                    <ImplanteEditorPro
                      data={denteSelData.implante_detalhes || getDefaultImplanteData()}
                      onChange={updateImplanteDetalhes}
                    />
                  </>
                ) : denteSelData.estado === "protese" ? (
                  <>
                    <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                      <Settings2 className="w-3.5 h-3.5 text-violet-400" />
                      Prótese — Dente {denteSelecionado}
                    </p>
                    <ProteseEditor
                      data={denteSelData.protese_detalhes || { tipo: "fixa", material: "ceramica", pilares: [], dataInstalacao: "", observacoes: "" }}
                      onChange={updateProteseDetalhes}
                    />
                  </>
                ) : (
                  /* Estado não é implante nem prótese — mostrar opções de conversão */
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500/10 to-violet-500/10 border border-blue-500/20 flex items-center justify-center mx-auto mb-4">
                      <Target className="w-8 h-8 text-blue-400/50" />
                    </div>
                    <h4 className="text-[var(--text-primary)] font-bold text-sm mb-2">Este dente não é um implante nem prótese</h4>
                    <p className="text-[var(--text-muted)] text-xs mb-6 max-w-md mx-auto">
                      O estado actual é <strong className={ESTADOS_DENTE_CONFIG[denteSelData.estado]?.cor}>{ESTADOS_DENTE_CONFIG[denteSelData.estado]?.label}</strong>.
                      Para registar um implante ou prótese, altere o estado do dente usando os botões abaixo.
                    </p>
                    <div className="flex items-center justify-center gap-3">
                      <button onClick={() => {
                        setDentesData(prev => ({
                          ...prev,
                          [String(denteSelecionado)]: {
                            ...prev[String(denteSelecionado)],
                            estado: "implante",
                            implante_detalhes: prev[String(denteSelecionado)].implante_detalhes || getDefaultImplanteData(),
                          },
                        }));
                        setModificado(true);
                      }}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-blue-500/20 to-cyan-500/10 border border-blue-500/30 text-blue-300 hover:scale-105 hover:shadow-lg hover:shadow-blue-500/10 transition-all">
                        <Target className="w-4 h-4" />
                        Definir como Implante
                      </button>
                      <button onClick={() => {
                        setDentesData(prev => ({
                          ...prev,
                          [String(denteSelecionado)]: {
                            ...prev[String(denteSelecionado)],
                            estado: "protese",
                            protese_detalhes: prev[String(denteSelecionado)].protese_detalhes || { tipo: "fixa", material: "ceramica", pilares: [], dataInstalacao: "", observacoes: "" },
                          },
                        }));
                        setModificado(true);
                      }}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-violet-500/20 to-purple-500/10 border border-violet-500/30 text-violet-300 hover:scale-105 hover:shadow-lg hover:shadow-violet-500/10 transition-all">
                        <Crown className="w-4 h-4" />
                        Definir como Prótese
                      </button>
                    </div>
                    <p className="text-[var(--text-muted)] text-[9px] mt-4">
                      Ao definir como implante, será criada automaticamente uma ficha técnica completa com workflow de 8 fases.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ═══ TAB: NOTAS ═══ */}
            {tabDetalhe === "notas" && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <NotebookPen className="w-3.5 h-3.5 text-emerald-400" />
                  Notas Clínicas — Dente {denteSelecionado}
                </p>
                <textarea
                  value={denteSelData.notas || ""}
                  onChange={e => {
                    setDentesData(prev => ({
                      ...prev,
                      [String(denteSelecionado)]: { ...prev[String(denteSelecionado)], notas: e.target.value },
                    }));
                    setModificado(true);
                  }}
                  placeholder="Notas clínicas detalhadas sobre este dente... (diagnóstico, plano de tratamento, observações)"
                  rows={6}
                  className="w-full p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm resize-none focus:border-emerald-500/50 focus:outline-none transition-colors"
                />
                <p className="text-[var(--text-muted)] text-[8px] mt-2">
                  As notas são guardadas automaticamente ao clicar em "Guardar" na barra de acções.
                </p>
              </div>
            )}

            {/* ═══ TAB: HISTÓRICO ═══ */}
            {tabDetalhe === "historico" && (
              <div>
                <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3 flex items-center gap-2">
                  <Stethoscope className="w-3.5 h-3.5 text-amber-400" />
                  Histórico Clínico — Dente {denteSelecionado}
                </p>

                {/* Tratamentos */}
                {tratsDenteSel.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase">Tratamentos ({tratsDenteSel.length})</p>
                    {tratsDenteSel.map((t: any) => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all">
                        <Stethoscope className="w-4 h-4 text-amber-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--text-primary)] text-xs font-semibold">{t.descricao}</p>
                          <p className="text-[var(--text-muted)] text-[10px]">{new Date(t.dataInicio).toLocaleDateString("pt-PT")} {t.medicoNome ? `· Dr(a). ${t.medicoNome}` : ""}</p>
                        </div>
                        <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${t.estado === "concluido" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : t.estado === "em_progresso" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>
                          {t.estado?.replace("_", " ")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 mb-4">
                    <p className="text-[var(--text-muted)] text-xs">Sem tratamentos registados para este dente.</p>
                  </div>
                )}

                {/* Imagens */}
                {imgsDenteSel.length > 0 && (
                  <div>
                    <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase mb-2">Imagens ({imgsDenteSel.length})</p>
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {imgsDenteSel.map((img: any) => (
                        <div key={img.id} className="w-20 h-20 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden shrink-0 hover:border-[#00E5FF]/50 transition-colors cursor-pointer">
                          {img.s3Url ? (
                            <img src={img.s3Url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Eye className="w-6 h-6 text-[var(--text-muted)]" /></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Modal de Notas (legacy, mantido para compatibilidade) ────────────── */}
      {showNotas && denteSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-2">
                <NotebookPen className="w-5 h-5 text-emerald-400" />
                <h3 className="text-[var(--text-primary)] font-bold">Notas — Dente {denteSelecionado}</h3>
              </div>
              <button onClick={() => setShowNotas(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <textarea value={notaTexto} onChange={e => setNotaTexto(e.target.value)}
                placeholder="Notas clínicas sobre este dente..."
                rows={4} className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-sm resize-none focus:border-emerald-500/50 focus:outline-none transition-colors"
                autoFocus />
              <div className="flex gap-3">
                <button onClick={() => setShowNotas(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
                <button onClick={guardarNota} className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20">
                  <Save className="w-4 h-4" /> Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
       )}
    </div>

    {/* ─── Modal de Orçamento Digital (V35.7) ─────────────────────────────── */}
    {showModalOrcamento && utenteId && (
      <ModalOrcamento
        utenteId={utenteId}
        utenteNome={utenteNome}
        medicoId={medicoId}
        tratamentosExistentes={tratamentos}
        dentesComProblema={
          Object.entries(dentesData)
            .filter(([, d]) => d.estado !== "saudavel" && d.estado !== "tratado" && d.estado !== "restauracao")
            .map(([num, d]) => ({
              numero: Number(num),
              estado: d.estado,
              descricao: d.notas ?? "",
            }))
        }
        onClose={() => setShowModalOrcamento(false)}
        onSuccess={() => { setShowModalOrcamento(false); onRefresh(); }}
      />
    )}
    </>
  );
}
export default OdontogramaAvancado;
