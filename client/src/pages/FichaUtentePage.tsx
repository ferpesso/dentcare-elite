/**
 * FichaUtentePage.tsx — Ficha Clínica Premium do Utente
 * DentCare Elite V35 — Redesign Completo + Action Buttons V2
 *
 * UPGRADE V35.1:
 * - Botões de ação contextuais em TODAS as tabs
 * - ActionBar sticky premium com glassmorphism
 * - Confirmações modais para ações destrutivas
 * - Toast notifications para feedback visual
 * - Tooltips informativos em todos os botões
 * - Agrupamento lógico de ações (primárias vs secundárias)
 * - Melhorias UX: hover states, animações, disabled states
 */
import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import ReactDOM from "react-dom";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import { aplicarTimbrado, aplicarRodapeTimbrado, buildTimbradoConfig } from "../lib/pdfTimbrado";
import { parseApiError } from "../lib/parseApiError";
import { useLocation } from "wouter";
import { OdontogramaAvancado } from "../components/OdontogramaAvancado";
import { OrtodontiaAvancada } from "../components/OrtodontiaAvancada";
import { ImagiologiaAvancada } from "../components/ImagiologiaAvancada";
// EspecialidadesImplantes removido — funcionalidade integrada na tab Tratamentos
import { InsightsClinicosTab } from "../components/InsightsClinicosTab";
import { TabComunicacao } from "../components/TabComunicacao";
import { Brain, Megaphone } from "lucide-react";
import {
  User, Mail, Phone, MapPin, Calendar, Heart,
  AlertCircle, FileText, Image, Euro, Clock,
  Stethoscope, Pill, Zap, ChevronDown, ChevronUp,
  Edit2, Download, Share2, Trash2, Plus,
  Activity, TrendingUp, CheckCircle, AlertTriangle,
  Eye, EyeOff, Filter, Search, MoreVertical,
  Smile, Frown, Meh, MessageCircle, Bell,
  BarChart3, Maximize2, RotateCw, ZoomIn, ZoomOut,
  Sliders, Bookmark, Star, Lightbulb, Shield,
  TrendingDown, Target, Award, ArrowLeft, Save,
  X, Loader2, ChevronRight, ClipboardList,
  CreditCard, Receipt, Banknote, Wallet,
  Droplet, CircleDot, Scissors, Crown, Baby,
  Sparkles, ExternalLink, Hash, ArrowUpRight,
  Package, Truck, Factory, RotateCcw, Timer,
  Camera, Scan, Layers, GitBranch, Flag,
  Box, Send, ArrowRight, RefreshCw, Info,
  Microscope, Ruler, Move, Palette, Wrench,
  Upload, XCircle, PlayCircle, PauseCircle,
  CalendarPlus, CalendarClock, CalendarCheck, FileUp, Ban,
  SkipForward, Printer, FileCheck, NotebookPen,
  PackageCheck, PackagePlus, PackageOpen, PackageX,
  ListChecks, ClipboardCheck, Paperclip, ArrowDownToLine, ArrowUpFromLine,
  FileOutput, SquareCheck, Square, Minus,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  utenteId: number;
  onVoltar?: () => void;
  tabInicial?: string;
}

// ─── Configurações de Estados ─────────────────────────────────────────────────
const ESTADOS_DENTE: Record<string, { label: string; bg: string; border: string; text: string }> = {
  saudavel:          { label: "Saudável",           bg: "bg-emerald-500/20",  border: "border-emerald-500/50",  text: "text-emerald-300" },
  carie:             { label: "Cárie",              bg: "bg-red-500/20",      border: "border-red-500/50",      text: "text-red-300" },
  tratado:           { label: "Tratado",            bg: "bg-amber-500/20",    border: "border-amber-500/50",    text: "text-amber-300" },
  ausente:           { label: "Ausente",             bg: "bg-[var(--bg-surface)]",     border: "border-[var(--border-light)]",     text: "text-[var(--text-muted)]" },
  coroa:             { label: "Coroa",               bg: "bg-cyan-500/20",     border: "border-cyan-500/50",     text: "text-cyan-300" },
  implante:          { label: "Implante",            bg: "bg-blue-500/20",     border: "border-blue-500/50",     text: "text-blue-300" },
  endodontia:        { label: "Endodontia",          bg: "bg-orange-500/20",   border: "border-orange-500/50",   text: "text-orange-300" },
  protese:           { label: "Prótese",             bg: "bg-violet-500/20",   border: "border-violet-500/50",   text: "text-violet-300" },
  extracao_indicada: { label: "Extração Indicada",   bg: "bg-pink-500/20",     border: "border-pink-500/50",     text: "text-pink-300" },
  restauracao:       { label: "Restauração",         bg: "bg-blue-500/20",     border: "border-blue-500/50",     text: "text-blue-300" },
  extraido:          { label: "Extraído",            bg: "bg-[var(--bg-surface)]",     border: "border-[var(--border-light)]",     text: "text-[var(--text-muted)]" },
};

const ESTADO_CONSULTA_COR: Record<string, string> = {
  agendada:   "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30",
  confirmada: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  realizada:  "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelada:  "bg-red-500/20 text-red-300 border-red-500/30",
  "no-show":  "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-light)]",
};

const ESTADO_TRATAMENTO_COR: Record<string, string> = {
  pendente:     "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-light)]",
  proposto:     "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30",
  em_progresso: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  concluido:    "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  cancelado:    "bg-red-500/20 text-red-300 border-red-500/30",
};

const ESTADOS_TRATAMENTO_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; bg: string; bgHover: string; text: string; border: string; ring: string }> = {
  pendente:     { label: "Pendente",      icon: Clock,         bg: "bg-[var(--bg-surface)]",    bgHover: "hover:bg-[var(--bg-overlay)]",    text: "text-[var(--text-muted)]",    border: "border-[var(--border-light)]",    ring: "ring-[var(--border-light)]" },
  em_progresso: { label: "Em Progresso",  icon: Activity,      bg: "bg-amber-500/20",   bgHover: "hover:bg-amber-500/30",   text: "text-amber-300",   border: "border-amber-500/30",   ring: "ring-amber-500/40" },
  concluido:    { label: "Concluído",     icon: CheckCircle,   bg: "bg-emerald-500/20", bgHover: "hover:bg-emerald-500/30", text: "text-emerald-300", border: "border-emerald-500/30", ring: "ring-emerald-500/40" },
  cancelado:    { label: "Cancelado",     icon: X,             bg: "bg-red-500/20",     bgHover: "hover:bg-red-500/30",     text: "text-red-300",     border: "border-red-500/30",     ring: "ring-red-500/40" },
};

const ESTADO_FATURA_COR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  pendente: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30", label: "Pendente" },
  paga:     { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30", label: "Paga" },
  anulada:  { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30", label: "Anulada" },
};

// ─── Workflow do Laboratório ──────────────────────────────────────────────────
const LAB_WORKFLOW_STEPS = [
  { key: "criado",        label: "Criado",       icon: FileText,   cor: "text-[var(--text-muted)]",    bg: "bg-[var(--bg-surface)]" },
  { key: "enviado",       label: "Enviado",      icon: Send,       cor: "text-blue-400",    bg: "bg-blue-500/20" },
  { key: "recebido_lab",  label: "Recebido",     icon: Package,    cor: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/20" },
  { key: "em_producao",   label: "Produção",     icon: Factory,    cor: "text-amber-400",   bg: "bg-amber-500/20" },
  { key: "pronto",        label: "Pronto",       icon: CheckCircle,cor: "text-cyan-400",    bg: "bg-cyan-500/20" },
  { key: "devolvido",     label: "Devolvido",    icon: Truck,      cor: "text-violet-400",  bg: "bg-violet-500/20" },
  { key: "em_prova",      label: "Em Prova",     icon: Eye,        cor: "text-pink-400",    bg: "bg-pink-500/20" },
  { key: "ajuste",        label: "Ajuste",       icon: RotateCcw,  cor: "text-orange-400",  bg: "bg-orange-500/20" },
  { key: "concluido",     label: "Concluído",    icon: Award,      cor: "text-emerald-400", bg: "bg-emerald-500/20" },
  { key: "cancelado",     label: "Cancelado",    icon: X,          cor: "text-red-400",     bg: "bg-red-500/20" },
];

const LAB_PRIORIDADE_COR: Record<string, { bg: string; text: string; border: string; label: string }> = {
  normal:        { bg: "bg-[var(--bg-surface)]", text: "text-[var(--text-muted)]", border: "border-[var(--border-light)]", label: "Normal" },
  urgente:       { bg: "bg-amber-500/15", text: "text-amber-300", border: "border-amber-500/30", label: "Urgente" },
  muito_urgente: { bg: "bg-red-500/15", text: "text-red-300", border: "border-red-500/30", label: "Muito Urgente" },
};

// ─── Configuração de Tipos de Material ──────────────────────────────────────
const TIPOS_MATERIAL_CONFIG: Record<string, { label: string; icon: React.ComponentType<any>; cor: string; bg: string }> = {
  moldagem_alginato:    { label: "Moldagem Alginato",    icon: Box,             cor: "text-blue-400",    bg: "bg-blue-500/15" },
  moldagem_silicone:    { label: "Moldagem Silicone",    icon: Box,             cor: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/15" },
  moldagem_digital:     { label: "Moldagem Digital",     icon: Scan,            cor: "text-cyan-400",    bg: "bg-cyan-500/15" },
  modelo_gesso:         { label: "Modelo Gesso",         icon: Layers,          cor: "text-amber-400",   bg: "bg-amber-500/15" },
  modelo_articulador:   { label: "Modelo Articulador",   icon: Layers,          cor: "text-orange-400",  bg: "bg-orange-500/15" },
  registo_mordida:      { label: "Registo Mordida",      icon: Smile,           cor: "text-pink-400",    bg: "bg-pink-500/15" },
  registo_arco_facial:  { label: "Registo Arco Facial",  icon: Ruler,           cor: "text-violet-400",  bg: "bg-violet-500/15" },
  provisorio:           { label: "Provisório",           icon: Clock,           cor: "text-amber-400",   bg: "bg-amber-500/15" },
  dente_provisorio:     { label: "Dente Provisório",     icon: Smile,           cor: "text-amber-300",   bg: "bg-amber-500/10" },
  nucleo_espigao:       { label: "Núcleo/Espigão",       icon: Zap,             cor: "text-red-400",     bg: "bg-red-500/15" },
  componente_implante:  { label: "Componente Implante",  icon: Wrench,          cor: "text-blue-400",    bg: "bg-blue-500/15" },
  scan_intraoral:       { label: "Scan Intraoral",       icon: Scan,            cor: "text-cyan-400",    bg: "bg-cyan-500/15" },
  fotografias:          { label: "Fotografias",          icon: Camera,          cor: "text-emerald-400", bg: "bg-emerald-500/15" },
  radiografias:         { label: "Radiografias",         icon: Microscope,      cor: "text-violet-400",  bg: "bg-violet-500/15" },
  guia_cirurgica:       { label: "Guia Cirúrgica",       icon: Target,          cor: "text-red-400",     bg: "bg-red-500/15" },
  goteira:              { label: "Goteira",              icon: Shield,          cor: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/15" },
  placa_base:           { label: "Placa Base",           icon: Layers,          cor: "text-amber-400",   bg: "bg-amber-500/15" },
  rolos_cera:           { label: "Rolos de Cera",        icon: CircleDot,       cor: "text-orange-400",  bg: "bg-orange-500/15" },
  prova_metal:          { label: "Prova Metal",          icon: Wrench,          cor: "text-slate-400",   bg: "bg-slate-500/15" },
  prova_ceramica:       { label: "Prova Cerâmica",       icon: Sparkles,        cor: "text-cyan-400",    bg: "bg-cyan-500/15" },
  prova_acrilico:       { label: "Prova Acrílico",       icon: Box,             cor: "text-pink-400",    bg: "bg-pink-500/15" },
  prova_zirconia:       { label: "Prova Zircónia",       icon: Sparkles,        cor: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/15" },
  trabalho_anterior:    { label: "Trabalho Anterior",    icon: RotateCcw,       cor: "text-amber-400",   bg: "bg-amber-500/15" },
  outro:                { label: "Outro",                icon: Package,         cor: "text-[var(--text-muted)]", bg: "bg-[var(--bg-surface)]" },
};

const ESTADOS_MATERIAL_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icon: React.ComponentType<any> }> = {
  preparado:           { label: "Preparado",          cor: "text-[var(--text-muted)]",  bg: "bg-[var(--bg-surface)]",    border: "border-[var(--border-light)]",    icon: Package },
  enviado_lab:         { label: "Enviado ao Lab",     cor: "text-blue-400",             bg: "bg-blue-500/15",            border: "border-blue-500/30",              icon: Send },
  recebido_lab:        { label: "Recebido no Lab",    cor: "text-[#00E5FF]",           bg: "bg-[#00E5FF]/15",          border: "border-[#00E5FF]/30",            icon: PackageCheck },
  em_uso:              { label: "Em Utilização",      cor: "text-amber-400",            bg: "bg-amber-500/15",           border: "border-amber-500/30",             icon: Activity },
  devolvido_clinica:   { label: "Devolvido",          cor: "text-violet-400",           bg: "bg-violet-500/15",          border: "border-violet-500/30",            icon: Truck },
  recebido_clinica:    { label: "Recebido Clínica",   cor: "text-emerald-400",          bg: "bg-emerald-500/15",         border: "border-emerald-500/30",           icon: CheckCircle },
  extraviado:          { label: "Extraviado",         cor: "text-red-400",              bg: "bg-red-500/15",             border: "border-red-500/30",               icon: AlertTriangle },
  danificado:          { label: "Danificado",         cor: "text-orange-400",           bg: "bg-orange-500/15",          border: "border-orange-500/30",            icon: XCircle },
  descartado:          { label: "Descartado",         cor: "text-[var(--text-muted)]",  bg: "bg-[var(--bg-surface)]",    border: "border-[var(--border-light)]",    icon: Trash2 },
};

const ESPECIALIDADES_CONFIG: Record<string, { icon: React.ComponentType<any>; cor: string; bg: string; border: string; descricao: string }> = {
  "Implantologia":    { icon: Zap,        cor: "text-blue-400",    bg: "bg-blue-500/15",    border: "border-blue-500/30",    descricao: "Implantes dentários e reabilitação oral" },
  "Ortodontia":       { icon: Target,     cor: "text-orange-400",  bg: "bg-orange-500/15",  border: "border-orange-500/30",  descricao: "Correção de mordida e alinhamento" },
  "Endodontia":       { icon: CircleDot,  cor: "text-red-400",     bg: "bg-red-500/15",     border: "border-red-500/30",     descricao: "Tratamento de canais radiculares" },
  "Periodontia":      { icon: Droplet,    cor: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", descricao: "Doenças da gengiva e osso alveolar" },
  "Periodontologia":  { icon: Droplet,    cor: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30", descricao: "Doenças da gengiva e osso alveolar" },
  "Prostodontia":     { icon: Crown,      cor: "text-violet-400",  bg: "bg-violet-500/15",  border: "border-violet-500/30",  descricao: "Próteses dentárias fixas e removíveis" },
  "Cirurgia Oral":    { icon: Scissors,   cor: "text-pink-400",    bg: "bg-pink-500/15",    border: "border-pink-500/30",    descricao: "Extracções e cirurgias da cavidade oral" },
  "Cirurgia":         { icon: Scissors,   cor: "text-pink-400",    bg: "bg-pink-500/15",    border: "border-pink-500/30",    descricao: "Extracções e cirurgias da cavidade oral" },
  "Estética":         { icon: Sparkles,   cor: "text-cyan-400",    bg: "bg-cyan-500/15",    border: "border-cyan-500/30",    descricao: "Clareamento e restaurações estéticas" },
  "Odontopediatria":  { icon: Baby,       cor: "text-pink-400",    bg: "bg-pink-500/15",    border: "border-pink-500/30",    descricao: "Cuidados dentários para crianças" },
  "Pedodontia":       { icon: Baby,       cor: "text-pink-400",    bg: "bg-pink-500/15",    border: "border-pink-500/30",    descricao: "Odontologia pediátrica" },
  "Dentisteria Operatória": { icon: Stethoscope, cor: "text-[#00E5FF]", bg: "bg-[#00E5FF]/15", border: "border-[#00E5FF]/30", descricao: "Restaurações e tratamentos conservadores" },
  "Geral":            { icon: Stethoscope, cor: "text-[var(--text-muted)]",   bg: "bg-[var(--bg-surface)]",    border: "border-[var(--border-light)]",    descricao: "Clínica geral e preventiva" },
};

const CATEGORIAS_NOTAS = {
  urgente:    { label: "Urgente",     bg: "bg-red-500/20",      text: "text-red-300",     border: "border-red-500/30" },
  importante: { label: "Importante",  bg: "bg-amber-500/20",     text: "text-amber-300",   border: "border-amber-500/30" },
  seguimento: { label: "Seguimento",  bg: "bg-[#00E5FF]/20",    text: "text-[#00E5FF]",  border: "border-[#00E5FF]/30" },
  geral:      { label: "Geral",       bg: "bg-violet-500/20",    text: "text-violet-300",  border: "border-violet-500/30" },
};

const TIPOS_IMAGEM_LABEL: Record<string, { label: string; icon: React.ComponentType<any>; cor: string }> = {
  radiografia_periapical:    { label: "Periapical",     icon: Scan,       cor: "text-blue-400" },
  radiografia_panoramica:    { label: "Panorâmica",     icon: Layers,     cor: "text-[#00E5FF]" },
  radiografia_bitewing:      { label: "Bitewing",       icon: Scan,       cor: "text-cyan-400" },
  radiografia_cefalometrica: { label: "Cefalométrica",  icon: Scan,       cor: "text-violet-400" },
  fotografia_intraoral:      { label: "Intraoral",      icon: Camera,     cor: "text-emerald-400" },
  fotografia_extraoral:      { label: "Extraoral",      icon: Camera,     cor: "text-amber-400" },
  tomografia_cbct:           { label: "CBCT",           icon: Microscope, cor: "text-pink-400" },
  outro:                     { label: "Outro",          icon: Image,      cor: "text-[var(--text-muted)]" },
};

function getEspecialidadeConfig(nome: string) {
  return ESPECIALIDADES_CONFIG[nome] || ESPECIALIDADES_CONFIG["Geral"];
}

function inferirEspecialidade(descricao: string): string {
  const desc = (descricao || "").toLowerCase();
  if (desc.includes("implant")) return "Implantologia";
  if (desc.includes("ortod") || desc.includes("alinhador") || desc.includes("bracket") || desc.includes("invisalign")) return "Ortodontia";
  if (desc.includes("endod") || desc.includes("canal")) return "Endodontia";
  if (desc.includes("period") || desc.includes("gengiv")) return "Periodontia";
  if (desc.includes("protes") || desc.includes("coroa") || desc.includes("ponte")) return "Prostodontia";
  if (desc.includes("cirurg") || desc.includes("extrac")) return "Cirurgia Oral";
  if (desc.includes("estetic") || desc.includes("clareament") || desc.includes("branqueament")) return "Estética";
  if (desc.includes("pediatr") || desc.includes("criança") || desc.includes("infantil")) return "Odontopediatria";
  return "Geral";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calcularIdade(dataNascimento: Date | string | null): string {
  if (!dataNascimento) return "—";
  const d = new Date(dataNascimento);
  const hoje = new Date();
  const anos = hoje.getFullYear() - d.getFullYear();
  const m = hoje.getMonth() - d.getMonth();
  const idade = m < 0 || (m === 0 && hoje.getDate() < d.getDate()) ? anos - 1 : anos;
  return `${idade} anos`;
}

function formatarData(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-PT");
}

function formatarDataHora(d: Date | string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function tempoDecorrido(data: Date | string): string {
  const ms = Date.now() - new Date(data).getTime();
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  const meses = Math.floor(dias / 30);
  const anos = Math.floor(dias / 365);
  if (anos > 0) return `há ${anos} ano${anos > 1 ? "s" : ""}`;
  if (meses > 0) return `há ${meses} mês${meses > 1 ? "es" : ""}`;
  if (dias > 0) return `há ${dias} dia${dias > 1 ? "s" : ""}`;
  if (horas > 0) return `há ${horas}h`;
  return `há ${minutos}m`;
}

function tempoAte(data: Date | string): string {
  const ms = new Date(data).getTime() - Date.now();
  if (ms < 0) return "Passou";
  const minutos = Math.floor(ms / 60000);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  if (dias > 0) return `em ${dias} dia${dias > 1 ? "s" : ""}`;
  if (horas > 0) return `em ${horas}h`;
  return `em ${minutos}m`;
}

function calcularHealthScore(consultas: any[], tratamentos: any[], faturas: any[], anamnese: any): number {
  let score = 50;
  const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
  if (consultas.some(c => c.estado === "realizada" && new Date(c.dataHoraInicio) > seisAtras)) score += 15;
  if (consultas.some(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada")) score += 10;
  const concluidos = tratamentos.filter(t => t.estado === "concluido").length;
  if (concluidos > 0) score += Math.min(concluidos * 3, 10);
  const pendentesAntigos = tratamentos.filter(t => {
    if (t.estado !== "pendente" && t.estado !== "proposto") return false;
    const tresAtras = new Date(); tresAtras.setMonth(tresAtras.getMonth() - 3);
    return new Date(t.dataInicio) < tresAtras;
  });
  if (pendentesAntigos.length > 0) score -= 10;
  if (anamnese?.alergiasDetectadas) score -= 5;
  if (anamnese?.problemasSaude) score -= 5;
  const divida = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
  if (divida === 0) score += 5; else score -= 5;
  if (anamnese) score += 5;
  return Math.max(0, Math.min(100, score));
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTES UI REUTILIZÁVEIS — Action Bar, Toast, Confirm Dialog, Tooltip
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Componente: Action Bar Premium (Sticky) ─────────────────────────────────
function ActionBar({ children, cor = "from-[#00E5FF]/5 to-violet-500/5", borderCor = "border-[#00E5FF]/20" }: {
  children: React.ReactNode; cor?: string; borderCor?: string;
}) {
  return (
    <div className={`sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r ${cor} border ${borderCor} backdrop-blur-xl shadow-sm flex-wrap`}>
      {children}
    </div>
  );
}

// ─── Componente: Action Button Premium ────────────────────────────────────────
function ActionBtn({
  icon: Icon, label, onClick, variant = "secondary", size = "sm", disabled = false, loading = false, tooltip, className = "",
}: {
  icon: React.ComponentType<any>; label: string; onClick: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "warning" | "ghost";
  size?: "xs" | "sm" | "md"; disabled?: boolean; loading?: boolean; tooltip?: string; className?: string;
}) {
  const variantStyles = {
    primary: "bg-[#00E5FF] hover:bg-[#00E5FF] text-white border-[#00E5FF]/50 shadow-sm shadow-[#00E5FF]/20",
    secondary: "bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]",
    danger: "bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 border-red-500/20 hover:border-red-500/40",
    success: "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300 border-emerald-500/20 hover:border-emerald-500/40",
    warning: "bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border-amber-500/20 hover:border-amber-500/40",
    ghost: "bg-transparent hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-[var(--text-secondary)] border-transparent",
  };
  const sizeStyles = {
    xs: "px-2 py-1 text-[10px] gap-1",
    sm: "px-3 py-1.5 text-xs gap-1.5",
    md: "px-4 py-2 text-sm gap-2",
  };
  const iconSize = { xs: "w-3 h-3", sm: "w-3.5 h-3.5", md: "w-4 h-4" };

  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      title={tooltip || label}
      className={`inline-flex items-center font-bold rounded-xl border transition-all duration-200 whitespace-nowrap ${variantStyles[variant]} ${sizeStyles[size]} ${disabled || loading ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] active:scale-[0.98]"} ${className}`}
    >
      {loading ? <Loader2 className={`${iconSize[size]} animate-spin`} /> : <Icon className={iconSize[size]} />}
      <span>{label}</span>
    </button>
  );
}

// ─── Componente: Separador de Action Bar ──────────────────────────────────────
function ActionSep() {
  return <div className="w-px h-6 bg-[var(--border-primary)] mx-1 shrink-0" />;
}

// ─── Componente: Confirm Dialog ───────────────────────────────────────────────
function ConfirmDialog({ titulo, mensagem, onConfirm, onCancel, tipo = "danger", confirmLabel = "Confirmar", loading = false }: {
  titulo: string; mensagem: string; onConfirm: () => void; onCancel: () => void;
  tipo?: "danger" | "warning" | "info"; confirmLabel?: string; loading?: boolean;
}) {
  const cores = {
    danger: { icon: AlertTriangle, bg: "bg-red-500/20", border: "border-red-500/30", text: "text-red-400", btn: "bg-red-500 hover:bg-red-600" },
    warning: { icon: AlertCircle, bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400", btn: "bg-amber-500 hover:bg-amber-600" },
    info: { icon: Info, bg: "bg-[#00E5FF]/20", border: "border-[#00E5FF]/30", text: "text-[#00E5FF]", btn: "bg-[#00E5FF] hover:bg-[#00E5FF]" },
  };
  const cfg = cores[tipo];
  const Icon = cfg.icon;
  return (
    <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className={`w-14 h-14 rounded-2xl ${cfg.bg} border ${cfg.border} flex items-center justify-center mx-auto mb-4`}>
            <Icon className={`w-7 h-7 ${cfg.text}`} />
          </div>
          <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">{titulo}</h3>
          <p className="text-[var(--text-secondary)] text-sm">{mensagem}</p>
        </div>
        <div className="flex gap-3 p-4 border-t border-[var(--border-primary)]">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading} className={`flex-1 py-2.5 rounded-xl text-sm font-bold text-[var(--text-primary)] transition-all flex items-center justify-center gap-2 ${cfg.btn} ${loading ? "opacity-60" : ""}`}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Toast Notification ───────────────────────────────────────────
function Toast({ message, tipo = "success", onClose }: { message: string; tipo?: "success" | "error" | "info" | "warning"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, [onClose]);
  const cores = {
    success: "bg-emerald-500/20 border-emerald-500/40 text-emerald-300",
    error: "bg-red-500/20 border-red-500/40 text-red-300",
    info: "bg-[#00E5FF]/20 border-[#00E5FF]/40 text-[#00E5FF]",
    warning: "bg-amber-500/20 border-amber-500/40 text-amber-300",
  };
  const icons = { success: CheckCircle, error: XCircle, info: Info, warning: AlertTriangle };
  const Icon = icons[tipo];
  return (
    <div className={`fixed bottom-6 right-6 z-[300] flex items-center gap-3 px-5 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300 ${cores[tipo]}`}>
      <Icon className="w-5 h-5 shrink-0" />
      <span className="text-sm font-semibold">{message}</span>
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
    </div>
  );
}

// ─── Componente: Avatar Premium ───────────────────────────────────────────────
function AvatarUtente({ nome, size = "lg" }: { nome: string; size?: "sm" | "md" | "lg" }) {
  const initials = nome.split(" ").slice(0, 2).map(n => n[0]).join("").toUpperCase();
  const s = size === "lg" ? "w-20 h-20 text-2xl" : size === "md" ? "w-14 h-14 text-lg" : "w-10 h-10 text-sm";
  return (
    <div className={`${s} rounded-2xl bg-gradient-to-br from-[#00E5FF]/40 via-violet-500/30 to-purple-500/40 border-2 border-[#00E5FF]/30 flex items-center justify-center font-black text-[#00E5FF] shrink-0 shadow-lg shadow-[#00E5FF]/10 relative overflow-hidden`}>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      <span className="relative z-10">{initials}</span>
    </div>
  );
}

// ─── Componente: Status Dropdown para Tratamentos ────────────────────────────
function StatusDropdownTratamento({ tratamentoId, estadoActual, onSuccess }: { tratamentoId: number; estadoActual: string; onSuccess: () => void }) {
  const [aberto, setAberto] = useState(false);
  const [aAtualizar, setAAtualizar] = useState(false);
  const [posicao, setPosicao] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const actualizarMutation = trpc.tratamentos.actualizarTratamento.useMutation({
    onSuccess: () => { setAAtualizar(false); setAberto(false); onSuccess(); },
    onError: () => { setAAtualizar(false); },
  });

  const abrirMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const menuHeight = 260; // altura estimada do menu
    const spaceBelow = window.innerHeight - rect.bottom;
    const top = spaceBelow >= menuHeight
      ? rect.bottom + window.scrollY + 4
      : rect.top + window.scrollY - menuHeight - 4;
    setPosicao({
      top,
      left: rect.right + window.scrollX - 200, // alinha à direita do botão
      width: Math.max(rect.width, 200),
    });
    setAberto(prev => !prev);
  };

  useEffect(() => {
    if (!aberto) return;
    function handleClickFora(e: MouseEvent) {
      const target = e.target as Node;
      if (btnRef.current && btnRef.current.contains(target)) return;
      if (menuRef.current && menuRef.current.contains(target)) return;
      setAberto(false);
    }
    function handleEsc(e: KeyboardEvent) { if (e.key === "Escape") setAberto(false); }
    function handleScroll() { setAberto(false); }
    document.addEventListener("mousedown", handleClickFora);
    document.addEventListener("keydown", handleEsc);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handleClickFora);
      document.removeEventListener("keydown", handleEsc);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [aberto]);

  const handleMudarEstado = (novoEstado: string) => {
    if (novoEstado === estadoActual) { setAberto(false); return; }
    setAAtualizar(true);
    actualizarMutation.mutate({ id: tratamentoId, estado: novoEstado as "pendente" | "proposto" | "em_progresso" | "concluido" | "cancelado" | "anulado" });
  };
  const cfgActual = ESTADOS_TRATAMENTO_CONFIG[estadoActual] || ESTADOS_TRATAMENTO_CONFIG.pendente;
  const IconActual = cfgActual.icon;

  const menu = aberto ? ReactDOM.createPortal(
    <div
      ref={menuRef}
      style={{ position: "absolute", top: posicao.top, left: posicao.left, minWidth: 200, zIndex: 99999 }}
      className="rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl shadow-black/60"
      onClick={e => e.stopPropagation()}
    >
      <div className="p-1.5">
        <p className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] px-2.5 py-1.5 mb-0.5">Alterar estado</p>
        {Object.entries(ESTADOS_TRATAMENTO_CONFIG).map(([key, cfg]) => {
          const Icon = cfg.icon; const isActual = key === estadoActual;
          return (
            <button key={key} onClick={(e) => { e.stopPropagation(); handleMudarEstado(key); }} disabled={aAtualizar}
              className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left transition-all duration-150 ${isActual ? `${cfg.bg} ${cfg.text} ${cfg.border} border font-bold` : `text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]`}`}>
              <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${isActual ? cfg.bg : "bg-[var(--bg-tertiary)]"}`}>
                <Icon className={`w-3.5 h-3.5 ${isActual ? cfg.text : "text-[var(--text-muted)]"}`} />
              </div>
              <span className="text-xs font-semibold flex-1">{cfg.label}</span>
              {isActual && <CheckCircle className={`w-3.5 h-3.5 ${cfg.text}`} />}
            </button>
          );
        })}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="inline-block">
      <button ref={btnRef} onClick={abrirMenu} disabled={aAtualizar}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold uppercase tracking-wide transition-all duration-200 cursor-pointer select-none ${cfgActual.bg} ${cfgActual.bgHover} ${cfgActual.text} ${cfgActual.border} ${aAtualizar ? "opacity-60" : "hover:shadow-lg hover:scale-[1.02]"}`}
        title="Clique para alterar o estado">
        {aAtualizar ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <IconActual className="w-3.5 h-3.5" />}
        {cfgActual.label}
        <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${aberto ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}

// ─── Componente: Dente no Odontograma ─────────────────────────────────────────
function Dente({ numero, estado, selected, onClick }: { numero: number; estado?: string; selected: boolean; onClick: () => void }) {
  const est = estado ? ESTADOS_DENTE[estado] : null;
  return (
    <button onClick={onClick} title={`Dente ${numero}${est ? ` — ${est.label}` : ""}`}
      className={`w-10 h-10 rounded-xl border-2 text-[11px] font-bold transition-all duration-200 hover:scale-110 hover:shadow-lg ${
        selected ? "bg-[#00E5FF]/40 border-[#00E5FF] text-[#00E5FF] scale-110 shadow-[0_0_15px_rgba(0,229,255,0.4)] ring-2 ring-[#00E5FF]/30"
        : est ? `${est.bg} ${est.border} ${est.text} hover:brightness-110` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#00E5FF]/40 hover:bg-[#00E5FF]/10 hover:text-[#00E5FF]"
      }`}>
      {numero}
    </button>
  );
}

// ─── Componente: Barra de Progresso Animada ───────────────────────────────────
function ProgressBar({ valor, max, cor = "bg-[#00E5FF]", height = "h-2", showLabel = true, label = "" }: {
  valor: number; max: number; cor?: string; height?: string; showLabel?: boolean; label?: string;
}) {
  const percent = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div>
      {showLabel && (
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[var(--text-secondary)] text-xs font-medium">{label}</span>
          <span className="text-[var(--text-primary)] text-xs font-bold">{Math.round(percent)}%</span>
        </div>
      )}
      <div className={`${height} bg-[var(--bg-tertiary)] rounded-full overflow-hidden`}>
        <div className={`h-full ${cor} rounded-full transition-all duration-700 ease-out`} style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

// ─── Componente: Health Score Visual Premium ──────────────────────────────────
function HealthScoreWidget({ score }: { score: number }) {
  const cor = score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
  const bg = score >= 80 ? "from-emerald-500/20 to-emerald-500/5" : score >= 60 ? "from-amber-500/20 to-amber-500/5" : "from-red-500/20 to-red-500/5";
  const label = score >= 80 ? "Excelente" : score >= 60 ? "Bom" : "Atenção";
  const strokeCor = score >= 80 ? "stroke-emerald-400" : score >= 60 ? "stroke-amber-400" : "stroke-red-400";
  return (
    <div className={`relative flex items-center gap-3 px-4 py-3 rounded-2xl bg-gradient-to-r ${bg} border border-[var(--border-primary)]`}>
      <div className="relative w-12 h-12 shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" className="stroke-[var(--border-primary)]" />
          <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="2.5" strokeDasharray={`${(score / 100) * 97.4} 97.4`} strokeLinecap="round" className={strokeCor} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className={`text-sm font-black ${cor}`}>{score}</span>
        </div>
      </div>
      <div>
        <p className="text-[var(--text-primary)] text-sm font-bold">Saúde Oral</p>
        <p className={`text-xs font-semibold ${cor}`}>{label}</p>
      </div>
    </div>
  );
}

// ─── Componente: KPI Card ─────────────────────────────────────────────────────
function KPICard({ icon: Icon, label, valor, sub, cor, bg, border, onClick }: {
  icon: React.ComponentType<any>; label: string; valor: string | number; sub: string; cor: string; bg: string; border: string; onClick?: () => void;
}) {
  return (
    <button onClick={onClick} className={`card-premium p-5 border ${border} ${bg} text-left hover:scale-[1.02] transition-all group cursor-pointer w-full`}>
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${cor}`} />
        </div>
        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <p className={`text-2xl font-black ${cor}`}>{valor}</p>
      <p className="text-[var(--text-secondary)] text-xs font-medium mt-0.5">{label}</p>
      <p className="text-[var(--text-muted)] text-[10px] mt-1">{sub}</p>
    </button>
  );
}

// ─── Componente: Section Header ───────────────────────────────────────────────
function SectionHeader({ icon: Icon, title, cor = "text-[#00E5FF]", children }: {
  icon: React.ComponentType<any>; title: string; cor?: string; children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-[var(--text-primary)] font-bold text-sm flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cor}`} />
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Componente: Empty State ──────────────────────────────────────────────────
function EmptyState({ icon: Icon, title, subtitle, action }: {
  icon: React.ComponentType<any>; title: string; subtitle?: string; action?: React.ReactNode;
}) {
  return (
    <div className="text-center py-12">
      <div className="w-16 h-16 rounded-2xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center mx-auto mb-4">
        <Icon className="w-7 h-7 text-[var(--text-muted)]" />
      </div>
      <p className="text-[var(--text-secondary)] text-sm font-medium">{title}</p>
      {subtitle && <p className="text-[var(--text-muted)] text-xs mt-1">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ─── Componente: Modal de Edição do Utente ─────────────────────────────────
function ModalEditarUtente({ utente, onClose, onSuccess }: { utente: any; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nome: utente.nome ?? "", telemovel: utente.telemovel ?? "", email: utente.email ?? "",
    nif: utente.nif ?? "", dataNascimento: utente.dataNascimento ? new Date(utente.dataNascimento).toISOString().split("T")[0] : "",
    genero: utente.genero ?? "", morada: utente.morada ?? "", localidade: utente.localidade ?? "", cidade: utente.cidade ?? "",
    codigoPostal: utente.codigoPostal ?? "", observacoes: utente.observacoes ?? "",
  });
  const [erro, setErro] = useState("");
  const updateMutation = trpc.fichaUtente.actualizarDados.useMutation({
    onSuccess: () => { onSuccess(); onClose(); }, onError: (e: any) => setErro(parseApiError(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    if (!form.telemovel.trim()) { setErro("O telemóvel é obrigatório"); return; }
    setErro("");
    updateMutation.mutate({ utenteId: utente.id, nome: form.nome, telemovel: form.telemovel, email: form.email || undefined,
      nif: form.nif || undefined, dataNascimento: form.dataNascimento || undefined, genero: (form.genero as any) || undefined,
      morada: form.morada || undefined, localidade: form.localidade || undefined, cidade: form.cidade || undefined, codigoPostal: form.codigoPostal || undefined, observacoes: form.observacoes || undefined,
    });
  };
  const Field = ({ label, children, span = false }: { label: string; children: React.ReactNode; span?: boolean }) => (
    <div className={`space-y-1.5 ${span ? "md:col-span-2" : ""}`}>
      <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#00E5FF]/10 to-violet-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><Edit2 className="w-5 h-5 text-[#00E5FF]" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold text-lg">Editar Utente</h2><p className="text-[var(--text-tertiary)] text-xs">{utente.nome}</p></div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-tertiary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-6 overflow-y-auto">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm font-medium">{erro}</p></div>)}
          <div>
            <p className="text-[#00E5FF] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><User className="w-3 h-3" /> Dados Pessoais</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome Completo *" span><input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} className="input-premium w-full" placeholder="Nome completo" /></Field>
              <Field label="Data de Nascimento"><input type="date" value={form.dataNascimento} onChange={e => setForm(f => ({ ...f, dataNascimento: e.target.value }))} className="input-premium w-full" /></Field>
              <Field label="Género"><select value={form.genero} onChange={e => setForm(f => ({ ...f, genero: e.target.value }))} className="input-premium w-full appearance-none"><option value="">Seleccionar...</option><option value="masculino">Masculino</option><option value="feminino">Feminino</option><option value="outro">Outro</option></select></Field>
              <Field label="NIF"><input type="text" value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))} className="input-premium w-full" placeholder="123456789" /></Field>
            </div>
          </div>
          <div>
            <p className="text-[#00E5FF] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><Phone className="w-3 h-3" /> Contactos</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Telemóvel *"><input type="tel" value={form.telemovel} onChange={e => setForm(f => ({ ...f, telemovel: e.target.value }))} className="input-premium w-full" placeholder="912 345 678" /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="input-premium w-full" placeholder="email@exemplo.com" /></Field>
            </div>
          </div>
          <div>
            <p className="text-[#00E5FF] text-[10px] font-black uppercase tracking-widest mb-4 flex items-center gap-2"><MapPin className="w-3 h-3" /> Morada</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Morada" span><input type="text" value={form.morada} onChange={e => setForm(f => ({ ...f, morada: e.target.value }))} className="input-premium w-full" placeholder="Rua, número, andar..." /></Field>
              <Field label="Localidade"><input type="text" value={form.localidade} onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))} className="input-premium w-full" placeholder="Ex: Cascais" /></Field>
              <Field label="Cidade"><input type="text" value={form.cidade} onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))} className="input-premium w-full" placeholder="Lisboa" /></Field>
              <Field label="Código Postal"><input type="text" value={form.codigoPostal} onChange={e => setForm(f => ({ ...f, codigoPostal: e.target.value }))} className="input-premium w-full" placeholder="1000-001" /></Field>
            </div>
          </div>
          <Field label="Observações Clínicas"><textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} rows={3} className="input-premium w-full resize-none" placeholder="Notas e observações relevantes..." /></Field>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={updateMutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {updateMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Criar Tratamento ────────────────────────────────────────
function ModalCriarTratamento({ utenteId, onClose, onSuccess }: { utenteId: number; onClose: () => void; onSuccess: () => void }) {
  const { simboloMoeda } = useConfig();
  const [form, setForm] = useState({ medicoId: "", descricao: "", valor: 0, dente: "", especialidade: "Geral", estado: "pendente" as "pendente" | "proposto" | "em_progresso" });
  const [erro, setErro] = useState("");
  const dentistasQuery = trpc.dentistas.listar.useQuery();
  const dentistas = (dentistasQuery.data as any)?.dentistas ?? [];
  const criarMutation = trpc.tratamentos.criarTratamento.useMutation({ onSuccess: () => { onSuccess(); onClose(); }, onError: (e: any) => setErro(parseApiError(e)) });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicoId) { setErro("Selecione um médico"); return; }
    if (!form.descricao.trim()) { setErro("Descreva o tratamento"); return; }
    setErro("");
    criarMutation.mutate({ utenteId, medicoId: parseInt(form.medicoId), descricao: form.descricao, valor: form.valor, dente: form.dente || "Geral", especialidade: form.especialidade });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-amber-500/10 to-orange-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><Stethoscope className="w-5 h-5 text-amber-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Novo Tratamento</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Com faturação automática</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Médico *</label>
            <select value={form.medicoId} onChange={e => setForm(f => ({ ...f, medicoId: e.target.value }))} className="input-premium w-full"><option value="">Selecione...</option>{dentistas.map((d: any) => (<option key={d.id} value={d.id}>{d.nome}</option>))}</select>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição *</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Restauração composta no dente 21..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dente(s)</label><input type="text" value={form.dente} onChange={e => setForm(f => ({ ...f, dente: e.target.value }))} placeholder="Ex: 11, 21" className="input-premium w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Especialidade</label><select value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))} className="input-premium w-full">{Object.keys(ESPECIALIDADES_CONFIG).map(esp => (<option key={esp} value={esp}>{esp}</option>))}</select></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Valor ({simboloMoeda})</label><input type="number" step="0.01" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: parseFloat(e.target.value) || 0 }))} onFocus={e => e.target.select()} className="input-premium w-full" /></div>
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={criarMutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 border-none">
              {criarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Criar Tratamento
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Adicionar Evolução ─────────────────────────────────────
function ModalAdicionarEvolucao({ tratamento, onClose, onSuccess }: { tratamento: any; onClose: () => void; onSuccess: () => void }) {
  const [descricao, setDescricao] = useState("");
  const [anotacoes, setAnotacoes] = useState("");
  const [erro, setErro] = useState("");
  const mutation = trpc.tratamentos.adicionarEvolucao.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!descricao.trim()) { setErro("A descrição é obrigatória"); return; }
    setErro("");
    mutation.mutate({ tratamentoId: tratamento.id, descricao, anotacoes: anotacoes || undefined, data: new Date() });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-emerald-500/10 to-green-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><NotebookPen className="w-5 h-5 text-emerald-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Adicionar Evolução</h2><p className="text-[var(--text-muted)] text-xs">{tratamento.descricao}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição da Evolução *</label>
            <textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Descreva a evolução clínica..." rows={3} className="input-premium w-full resize-none" />
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Anotações Adicionais</label>
            <textarea value={anotacoes} onChange={e => setAnotacoes(e.target.value)} placeholder="Notas adicionais (opcional)..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={mutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 border-none">
              {mutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Nova Consulta ──────────────────────────────────────────
function ModalNovaConsulta({ utenteId, onClose, onSuccess }: { utenteId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ medicoId: "", dataHoraInicio: "", duracao: 30, tipoConsulta: "Consulta", observacoes: "" });
  const [erro, setErro] = useState("");
  const dentistasQuery = trpc.dentistas.listar.useQuery();
  const dentistas = (dentistasQuery.data as any)?.dentistas ?? [];
  const criarMutation = trpc.consultas.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.medicoId) { setErro("Selecione um médico"); return; }
    if (!form.dataHoraInicio) { setErro("Selecione a data e hora"); return; }
    setErro("");
    const inicio = new Date(form.dataHoraInicio);
    const fim = new Date(inicio.getTime() + form.duracao * 60000);
    criarMutation.mutate({ utenteId, medicoId: parseInt(form.medicoId), dataHoraInicio: inicio.toISOString(), dataHoraFim: fim.toISOString(), tipoConsulta: form.tipoConsulta, observacoes: form.observacoes || undefined });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#00E5FF]/10 to-cyan-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><CalendarPlus className="w-5 h-5 text-[#00E5FF]" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Nova Consulta</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Agendar consulta para o utente</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Médico *</label>
            <select value={form.medicoId} onChange={e => setForm(f => ({ ...f, medicoId: e.target.value }))} className="input-premium w-full"><option value="">Selecione...</option>{dentistas.map((d: any) => (<option key={d.id} value={d.id}>{d.nome}</option>))}</select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data e Hora *</label>
              <input type="datetime-local" value={form.dataHoraInicio} onChange={e => setForm(f => ({ ...f, dataHoraInicio: e.target.value }))} className="input-premium w-full" />
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Duração (min)</label>
              <select value={form.duracao} onChange={e => setForm(f => ({ ...f, duracao: parseInt(e.target.value) }))} className="input-premium w-full">
                {[15, 30, 45, 60, 90, 120].map(d => (<option key={d} value={d}>{d} min</option>))}
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Consulta</label>
            <input type="text" value={form.tipoConsulta} onChange={e => setForm(f => ({ ...f, tipoConsulta: e.target.value }))} placeholder="Ex: Consulta de rotina" className="input-premium w-full" />
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas para a consulta..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={criarMutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2">
              {criarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <CalendarPlus className="w-5 h-5" />} Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Alterar Estado Consulta ────────────────────────────────
function ModalAlterarEstadoConsulta({ consulta, onClose, onSuccess }: { consulta: any; onClose: () => void; onSuccess: () => void }) {
  const [novoEstado, setNovoEstado] = useState(consulta.estado);
  const [motivo, setMotivo] = useState("");
  const mutation = trpc.consultas.updateStatus.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: () => {},
  });
  const submit = () => {
    if (novoEstado === consulta.estado) { onClose(); return; }
    mutation.mutate({ consultaId: consulta.id, novoStatus: novoEstado, motivoCancelamento: novoEstado === "cancelada" ? motivo || undefined : undefined });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><CalendarCheck className="w-5 h-5 text-[#00E5FF]" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold text-sm">Alterar Estado</h2><p className="text-[var(--text-muted)] text-xs">{formatarDataHora(consulta.dataHoraInicio)}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {(["agendada", "confirmada", "realizada", "cancelada", "no-show"] as const).map(est => (
              <button key={est} onClick={() => setNovoEstado(est)} className={`py-3 rounded-xl border text-xs font-bold capitalize transition-all ${novoEstado === est ? `${ESTADO_CONSULTA_COR[est]} shadow-sm` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                {est}
              </button>
            ))}
          </div>
          {novoEstado === "cancelada" && (
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Motivo do Cancelamento</label>
              <textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Motivo..." rows={2} className="input-premium w-full resize-none" />
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button onClick={submit} disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-[#00E5FF] hover:bg-[#00E5FF] text-white transition-all">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Modal Reagendar Consulta ─────────────────────────────────────
function ModalReagendarConsulta({ consulta, onClose, onSuccess }: { consulta: any; onClose: () => void; onSuccess: () => void }) {
  const dataAtual = new Date(consulta.dataHoraInicio);
  const [novaData, setNovaData] = useState(dataAtual.toISOString().slice(0, 16));
  const [duracao, setDuracao] = useState(consulta.duracao || 30);
  const [erro, setErro] = useState("");
  const mutation = trpc.consultas.reschedule.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const submit = () => {
    if (!novaData) { setErro("Selecione a nova data e hora"); return; }
    setErro("");
    const inicio = new Date(novaData);
    const fim = new Date(inicio.getTime() + duracao * 60000);
    mutation.mutate({ consultaId: consulta.id, novaDataHoraInicio: inicio.toISOString(), novaDataHoraFim: fim.toISOString() });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] flex flex-col my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center"><CalendarClock className="w-5 h-5 text-amber-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold text-sm">Reagendar Consulta</h2><p className="text-[var(--text-muted)] text-xs">Actual: {formatarDataHora(consulta.dataHoraInicio)}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          {erro && (<div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-4 h-4 text-red-400 shrink-0" /><p className="text-red-400 text-xs">{erro}</p></div>)}
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Nova Data e Hora *</label>
            <input type="datetime-local" value={novaData} onChange={e => setNovaData(e.target.value)} className="input-premium w-full" />
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Duração (min)</label>
            <select value={duracao} onChange={e => setDuracao(parseInt(e.target.value))} className="input-premium w-full">
              {[15, 30, 45, 60, 90, 120].map(d => (<option key={d} value={d}>{d} min</option>))}
            </select>
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button onClick={submit} disabled={mutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white transition-all">
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CalendarClock className="w-4 h-4" />} Reagendar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Modal Novo Envio Laboratório ─────────────────────────────────
function ModalNovoEnvioLab({ utenteId, onClose, onSuccess }: { utenteId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ laboratorioId: "", tipoTrabalho: "", descricao: "", dente: "", cor: "", material: "", prioridade: "normal" as "normal" | "urgente" | "muito_urgente", dataPrevista: "", valorOrcado: 0, observacoes: "" });
  const [erro, setErro] = useState("");
  const labsQuery = trpc.laboratorios.listar.useQuery();
  const labs = (labsQuery.data as any)?.laboratorios ?? [];
  const criarMutation = trpc.laboratorios.criarEnvio.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.laboratorioId) { setErro("Selecione um laboratório"); return; }
    if (!form.tipoTrabalho.trim()) { setErro("Indique o tipo de trabalho"); return; }
    if (!form.descricao.trim()) { setErro("Descreva o trabalho"); return; }
    setErro("");
    criarMutation.mutate({ laboratorioId: parseInt(form.laboratorioId), utenteId, tipoTrabalho: form.tipoTrabalho, descricao: form.descricao, dente: form.dente || undefined, cor: form.cor || undefined, material: form.material || undefined, prioridade: form.prioridade, dataPrevistaDevolucao: form.dataPrevista || undefined, valorOrcado: form.valorOrcado > 0 ? form.valorOrcado : undefined, observacoes: form.observacoes || undefined });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-blue-500/10 to-[#B388FF]/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><Send className="w-5 h-5 text-blue-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Novo Envio Laboratório</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Criar pedido de trabalho</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Laboratório *</label>
            <select value={form.laboratorioId} onChange={e => setForm(f => ({ ...f, laboratorioId: e.target.value }))} className="input-premium w-full"><option value="">Selecione...</option>{labs.map((l: any) => (<option key={l.id} value={l.id}>{l.nome}</option>))}</select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Trabalho *</label>
              <input type="text" value={form.tipoTrabalho} onChange={e => setForm(f => ({ ...f, tipoTrabalho: e.target.value }))} placeholder="Ex: Coroa Cerâmica" className="input-premium w-full" />
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Prioridade</label>
              <select value={form.prioridade} onChange={e => setForm(f => ({ ...f, prioridade: e.target.value as any }))} className="input-premium w-full">
                <option value="normal">Normal</option><option value="urgente">Urgente</option><option value="muito_urgente">Muito Urgente</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição *</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição detalhada do trabalho..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dente(s)</label><input type="text" value={form.dente} onChange={e => setForm(f => ({ ...f, dente: e.target.value }))} placeholder="Ex: 11" className="input-premium w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Cor</label><input type="text" value={form.cor} onChange={e => setForm(f => ({ ...f, cor: e.target.value }))} placeholder="Ex: A2" className="input-premium w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Material</label><input type="text" value={form.material} onChange={e => setForm(f => ({ ...f, material: e.target.value }))} placeholder="Ex: Zircónia" className="input-premium w-full" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Data Prevista</label><input type="date" value={form.dataPrevista} onChange={e => setForm(f => ({ ...f, dataPrevista: e.target.value }))} className="input-premium w-full" /></div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Valor Orçado</label><input type="number" step="0.01" value={form.valorOrcado} onChange={e => setForm(f => ({ ...f, valorOrcado: parseFloat(e.target.value) || 0 }))} onFocus={e => e.target.select()} className="input-premium w-full" /></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações adicionais..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={criarMutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 border-none">
              {criarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} Criar Envio
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Nova Fatura ────────────────────────────────────────────
function ModalNovaFatura({ utenteId, onClose, onSuccess, simboloMoeda }: { utenteId: number; onClose: () => void; onSuccess: () => void; simboloMoeda: string }) {
  const [form, setForm] = useState({ medicoId: "", valorBase: 0, taxaIva: 0, metodoPagamento: "numerario" as "multibanco" | "numerario" | "mbway" | "transferencia", tipoDocumento: "fatura" as "fatura" | "recibo" | "nota_credito", observacoes: "" });
  const [erro, setErro] = useState("");
  const dentistasQuery = trpc.dentistas.listar.useQuery();
  const dentistas = dentistasQuery.data?.dentistas ?? [];
  const criarMutation = trpc.faturacao.criarFatura.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const valorIva = (form.valorBase * form.taxaIva) / 100;
  const valorTotal = form.valorBase + valorIva;
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.valorBase <= 0) { setErro("O valor deve ser superior a 0"); return; }
    if (!form.medicoId) { setErro("Selecione um médico/dentista"); return; }
    setErro("");
    criarMutation.mutate({ utenteId, medicoId: parseInt(form.medicoId), tipoDocumento: form.tipoDocumento, dataEmissao: new Date(), metodoPagamento: form.metodoPagamento, valorBase: form.valorBase, taxaIva: form.taxaIva, observacoes: form.observacoes || undefined });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><Receipt className="w-5 h-5 text-emerald-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Nova Fatura</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Emitir documento de faturação</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Médico/Dentista *</label>
            <select value={form.medicoId} onChange={e => setForm(f => ({ ...f, medicoId: e.target.value }))} className="input-premium w-full">
              <option value="">Selecione o médico...</option>
              {dentistas.map((d: any) => (<option key={d.id} value={d.id}>{d.nome}{d.especialidade ? ` — ${d.especialidade}` : ""}</option>))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo Documento</label>
              <select value={form.tipoDocumento} onChange={e => setForm(f => ({ ...f, tipoDocumento: e.target.value as any }))} className="input-premium w-full">
                <option value="fatura">Fatura</option><option value="recibo">Recibo</option><option value="nota_credito">Nota de Crédito</option>
              </select>
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Método Pagamento</label>
              <select value={form.metodoPagamento} onChange={e => setForm(f => ({ ...f, metodoPagamento: e.target.value as any }))} className="input-premium w-full">
                <option value="numerario">Numerário</option><option value="multibanco">Multibanco</option><option value="mbway">MB WAY</option><option value="transferencia">Transferência</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Valor Base ({simboloMoeda}) *</label>
              <input type="number" step="0.01" value={form.valorBase} onChange={e => setForm(f => ({ ...f, valorBase: parseFloat(e.target.value) || 0 }))} onFocus={e => e.target.select()} className="input-premium w-full" />
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Taxa IVA (%)</label>
              <select value={form.taxaIva} onChange={e => setForm(f => ({ ...f, taxaIva: parseInt(e.target.value) }))} className="input-premium w-full">
                <option value={0}>Isento (0%)</option><option value={6}>Reduzida (6%)</option><option value={13}>Intermédia (13%)</option><option value={23}>Normal (23%)</option>
              </select>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex justify-between text-xs"><span className="text-[var(--text-muted)]">Base</span><span className="text-[var(--text-primary)] font-bold">{simboloMoeda}{form.valorBase.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs mt-1"><span className="text-[var(--text-muted)]">IVA ({form.taxaIva}%)</span><span className="text-[var(--text-secondary)]">{simboloMoeda}{valorIva.toFixed(2)}</span></div>
            <div className="flex justify-between text-sm mt-2 pt-2 border-t border-[var(--border-primary)]"><span className="text-[var(--text-primary)] font-bold">Total</span><span className="text-emerald-400 font-black text-lg">{simboloMoeda}{valorTotal.toFixed(2)}</span></div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Observações da fatura..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={criarMutation.isPending} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 border-none">
              {criarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Receipt className="w-5 h-5" />} Emitir Fatura
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Upload Imagem ──────────────────────────────────────────
function ModalUploadImagem({ utenteId, onClose, onSuccess }: { utenteId: number; onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ tipo: "radiografia_periapical" as string, descricao: "", dentesRelacionados: "" });
  const [ficheiro, setFicheiro] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = trpc.fichaUtente.uploadImagem.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { setErro("Apenas ficheiros de imagem são permitidos"); return; }
    if (file.size > 10 * 1024 * 1024) { setErro("Ficheiro demasiado grande (máx. 10MB)"); return; }
    setFicheiro(file);
    setErro("");
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ficheiro || !preview) { setErro("Selecione um ficheiro"); return; }
    setErro("");
    uploadMutation.mutate({ utenteId, tipo: form.tipo as any, nomeOriginal: ficheiro.name, mimeType: ficheiro.type, tamanhoBytes: ficheiro.size, base64Data: preview, descricao: form.descricao || undefined, dentesRelacionados: form.dentesRelacionados || undefined });
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-violet-500/10 to-purple-500/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><Upload className="w-5 h-5 text-violet-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Upload de Imagem</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Radiografia ou fotografia</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {erro && (<div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20"><AlertCircle className="w-5 h-5 text-red-400 shrink-0" /><p className="text-red-400 text-sm">{erro}</p></div>)}
          <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed border-[var(--border-primary)] hover:border-violet-500/50 rounded-2xl p-8 text-center cursor-pointer transition-all hover:bg-violet-500/5">
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            {preview ? (
              <div className="space-y-3"><img src={preview} alt="Preview" className="max-h-40 mx-auto rounded-xl" /><p className="text-[var(--text-secondary)] text-xs">{ficheiro?.name}</p></div>
            ) : (
              <div className="space-y-3"><Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto" /><p className="text-[var(--text-secondary)] text-sm font-medium">Clique para seleccionar imagem</p><p className="text-[var(--text-muted)] text-xs">JPG, PNG, WEBP (máx. 10MB)</p></div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Imagem</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))} className="input-premium w-full">
                {Object.entries(TIPOS_IMAGEM_LABEL).map(([key, cfg]) => (<option key={key} value={key}>{cfg.label}</option>))}
              </select>
            </div>
            <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Dentes Relacionados</label>
              <input type="text" value={form.dentesRelacionados} onChange={e => setForm(f => ({ ...f, dentesRelacionados: e.target.value }))} placeholder="Ex: 11, 12" className="input-premium w-full" />
            </div>
          </div>
          <div className="space-y-1.5"><label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição</label>
            <textarea value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição da imagem..." rows={2} className="input-premium w-full resize-none" />
          </div>
          <div className="flex gap-4 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={uploadMutation.isPending || !ficheiro} className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 border-none">
              {uploadMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />} Upload
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Modal Editar Dente ───────────────────────────────────────────
function ModalEditarDente({ numeroDente, estadoActual, onClose, onSave }: { numeroDente: number; estadoActual?: string; onClose: () => void; onSave: (estado: string) => void }) {
  const [estado, setEstado] = useState(estadoActual || "saudavel");
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><span className="text-[#00E5FF] text-lg font-black">{numeroDente}</span></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Editar Dente {numeroDente}</h2><p className="text-[var(--text-muted)] text-xs">Selecione o estado</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ESTADOS_DENTE).map(([key, cfg]) => (
              <button key={key} onClick={() => setEstado(key)} className={`p-3 rounded-xl border text-left transition-all ${estado === key ? `${cfg.bg} ${cfg.border} ${cfg.text} shadow-sm ring-2 ring-offset-1 ring-offset-[var(--bg-elevated)]` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                <div className={`w-3 h-3 rounded-full mb-1.5 ${cfg.text.replace("text-", "bg-")}`} />
                <p className="text-xs font-bold">{cfg.label}</p>
              </button>
            ))}
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button onClick={() => onSave(estado)} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-[#00E5FF] hover:bg-[#00E5FF] text-white transition-all">
              <Save className="w-4 h-4" /> Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Modal Relatório de Procedimentos ──────────────────────────────
// Mostra o relatório de procedimentos de uma fatura paga, com opção de download PDF.
// O conteúdo é filtrado por RBAC no backend (gestor vê tudo, dentista vê clínico, receção vê resumo).
function ModalRelatorioProcedimentos({ faturaId, onClose, simboloMoeda }: {
  faturaId: number; onClose: () => void; simboloMoeda: string;
}) {
  const { config } = useConfig();
  const relatorioQ = trpc.faturacao.obterRelatorioProcedimentos.useQuery(
    { faturaId },
    { enabled: !!faturaId }
  );
  const rel = relatorioQ.data as any;

  const handleDownloadPDF = async () => {
    if (!rel) return;
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const tConfig = buildTimbradoConfig(config);
      let y = aplicarTimbrado(doc, tConfig);

      // Título
      doc.setFontSize(14); doc.setFont("helvetica", "bold");
      doc.setTextColor(25, 55, 109);
      doc.text("Relat\u00f3rio de Procedimentos", 20, y); y += 8;

      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(80, 80, 80);
      doc.text(`Gerado em: ${new Date(rel.dataGeracao).toLocaleString("pt-PT")}`, 20, y); y += 10;

      // Fatura
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
      doc.text("Dados da Fatura", 20, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      doc.text(`N\u00famero: ${rel.fatura?.numero || "\u2014"}`, 24, y); y += 5;
      doc.text(`Data Emiss\u00e3o: ${rel.fatura?.dataEmissao ? new Date(rel.fatura.dataEmissao).toLocaleDateString("pt-PT") : "\u2014"}`, 24, y); y += 5;
      doc.text(`Estado: ${rel.fatura?.estado || "\u2014"}`, 24, y); y += 5;
      doc.text(`Valor Total: ${simboloMoeda}${(rel.fatura?.valorTotal ?? 0).toFixed(2)}`, 24, y); y += 5;
      if (rel.fatura?.valorBase !== undefined) {
        doc.text(`Valor Base: ${simboloMoeda}${(rel.fatura.valorBase).toFixed(2)}  |  IVA: ${simboloMoeda}${(rel.fatura.valorIva ?? 0).toFixed(2)} (${rel.fatura.taxaIva ?? 0}%)`, 24, y); y += 5;
      }
      doc.text(`M\u00e9todo: ${rel.fatura?.metodoPagamento || "\u2014"}`, 24, y); y += 8;

      // Utente
      doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
      doc.text("Utente", 20, y); y += 6;
      doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
      doc.text(`Nome: ${rel.utente?.nome || "\u2014"}`, 24, y); y += 5;
      doc.text(`NIF: ${rel.utente?.nif || "Consumidor Final"}`, 24, y); y += 8;

      // Recibo (se existir — apenas gestor)
      if (rel.recibo) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text("Recibo", 20, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        doc.text(`N\u00famero: ${rel.recibo.numero}`, 24, y); y += 5;
        doc.text(`Data: ${new Date(rel.recibo.dataPagamento).toLocaleDateString("pt-PT")}`, 24, y); y += 5;
        doc.text(`Valor Pago: ${simboloMoeda}${(rel.recibo.valorPago ?? 0).toFixed(2)}`, 24, y); y += 8;
      }

      // Tratamento
      if (rel.tratamento) {
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text("Tratamento Realizado", 20, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        doc.text(`Descri\u00e7\u00e3o: ${rel.tratamento.descricao}`, 24, y); y += 5;
        doc.text(`Dente: ${rel.tratamento.dente || "\u2014"}  |  Estado: ${rel.tratamento.estado}`, 24, y); y += 5;
        doc.text(`M\u00e9dico: ${rel.tratamento.medicoNome} (${rel.tratamento.medicoEspecialidade})`, 24, y); y += 5;
        if (rel.tratamento.dataInicio) {
          doc.text(`In\u00edcio: ${new Date(rel.tratamento.dataInicio).toLocaleDateString("pt-PT")}`, 24, y); y += 5;
        }
        if (rel.tratamento.valorBruto !== undefined) {
          doc.text(`Valor Bruto: ${simboloMoeda}${(rel.tratamento.valorBruto).toFixed(2)}`, 24, y); y += 5;
        }
        if (rel.tratamento.custosDiretos !== undefined) {
          doc.text(`Custos Diretos: ${simboloMoeda}${(rel.tratamento.custosDiretos).toFixed(2)}`, 24, y); y += 5;
        }
        if (rel.tratamento.lucroClinica !== undefined) {
          doc.text(`Lucro Cl\u00ednica: ${simboloMoeda}${(rel.tratamento.lucroClinica).toFixed(2)}`, 24, y); y += 5;
        }
        if (rel.tratamento.observacoes) {
          doc.text(`Observa\u00e7\u00f5es: ${rel.tratamento.observacoes}`, 24, y); y += 5;
        }
        y += 3;
      }

      // Evoluções Clínicas (anotações do dentista)
      if (rel.evolucoes && rel.evolucoes.length > 0) {
        if (y > 240) { doc.addPage(); y = aplicarTimbrado(doc, tConfig); }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text(`Evolu\u00e7\u00f5es Cl\u00ednicas (${rel.evolucoes.length})`, 20, y); y += 6;
        doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        for (const ev of rel.evolucoes) {
          if (y > 265) { aplicarRodapeTimbrado(doc, tConfig); doc.addPage(); y = aplicarTimbrado(doc, tConfig); }
          const dataEv = ev.data ? new Date(ev.data).toLocaleDateString("pt-PT") : "\u2014";
          doc.setFont("helvetica", "bold");
          doc.text(`${dataEv} \u2014 ${ev.profissional || "\u2014"}`, 24, y); y += 4;
          doc.setFont("helvetica", "normal");
          doc.text(`  ${ev.descricao || ""}`, 24, y); y += 4;
          if (ev.anotacoes) {
            const lines = doc.splitTextToSize(`  Anota\u00e7\u00f5es: ${ev.anotacoes}`, 160);
            doc.text(lines, 24, y); y += lines.length * 4;
          }
          y += 2;
        }
      }

      // Comissão (apenas gestor)
      if (rel.comissao) {
        if (y > 250) { aplicarRodapeTimbrado(doc, tConfig); doc.addPage(); y = aplicarTimbrado(doc, tConfig); }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text("Comiss\u00e3o do M\u00e9dico", 20, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        doc.text(`Percentual: ${rel.comissao.percentual}%  |  Valor: ${simboloMoeda}${(rel.comissao.valorComissao ?? 0).toFixed(2)}`, 24, y); y += 5;
        doc.text(`Estado: ${rel.comissao.estado || "\u2014"}`, 24, y); y += 8;
      }

      // Minha Comissão (apenas médico)
      if (rel.minhaComissao) {
        if (y > 250) { aplicarRodapeTimbrado(doc, tConfig); doc.addPage(); y = aplicarTimbrado(doc, tConfig); }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text("A Minha Comiss\u00e3o", 20, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        doc.text(`Percentual: ${rel.minhaComissao.percentual}%  |  Valor: ${simboloMoeda}${(rel.minhaComissao.valorComissao ?? 0).toFixed(2)}`, 24, y); y += 5;
        doc.text(`Estado: ${rel.minhaComissao.estado || "\u2014"}`, 24, y); y += 8;
      }

      // Reconciliação (apenas gestor)
      if (rel.reconciliacao) {
        if (y > 255) { aplicarRodapeTimbrado(doc, tConfig); doc.addPage(); y = aplicarTimbrado(doc, tConfig); }
        doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(25, 55, 109);
        doc.text("Reconcilia\u00e7\u00e3o", 20, y); y += 6;
        doc.setFontSize(9); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
        doc.text(`Valor Fatura: ${simboloMoeda}${(rel.reconciliacao.valorFatura ?? 0).toFixed(2)}  |  Valor Pago: ${simboloMoeda}${(rel.reconciliacao.valorPago ?? 0).toFixed(2)}`, 24, y); y += 5;
        const statusRec = rel.reconciliacao.reconciliado ? "Reconciliado" : `Diferen\u00e7a: ${simboloMoeda}${Math.abs(rel.reconciliacao.diferenca ?? 0).toFixed(2)}`;
        doc.text(`Estado: ${statusRec}`, 24, y); y += 8;
      }

      aplicarRodapeTimbrado(doc, tConfig);
      doc.save(`relatorio_procedimentos_${rel.fatura?.numero?.replace(/\//g, "_") || faturaId}.pdf`);
    } catch (e) {
      console.error("Erro ao gerar PDF do relat\u00f3rio:", e);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-[#00E5FF]/10 to-violet-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><ClipboardList className="w-5 h-5 text-[#00E5FF]" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Relat\u00f3rio de Procedimentos</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Compara\u00e7\u00e3o com anota\u00e7\u00f5es cl\u00ednicas</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {relatorioQ.isLoading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
              <span className="ml-3 text-[var(--text-secondary)] text-sm">A gerar relat\u00f3rio...</span>
            </div>
          )}

          {relatorioQ.isError && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{parseApiError(relatorioQ.error)}</p>
            </div>
          )}

          {rel && (
            <>
              {/* Fatura */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-3">Fatura</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-[var(--text-muted)]">N\u00famero</span><p className="text-[var(--text-primary)] font-bold">{rel.fatura?.numero}</p></div>
                  <div><span className="text-[var(--text-muted)]">Estado</span><p className="text-emerald-400 font-bold capitalize">{rel.fatura?.estado}</p></div>
                  <div><span className="text-[var(--text-muted)]">Valor Total</span><p className="text-[var(--text-primary)] font-black text-lg">{simboloMoeda}{(rel.fatura?.valorTotal ?? 0).toFixed(2)}</p></div>
                  <div><span className="text-[var(--text-muted)]">M\u00e9todo</span><p className="text-[var(--text-primary)] font-semibold capitalize">{rel.fatura?.metodoPagamento || "\u2014"}</p></div>
                </div>
                {rel.fatura?.valorBase !== undefined && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-primary)] grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">Base</span><p className="text-[var(--text-primary)] font-bold">{simboloMoeda}{(rel.fatura.valorBase).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">IVA ({rel.fatura.taxaIva}%)</span><p className="text-[var(--text-secondary)]">{simboloMoeda}{(rel.fatura.valorIva ?? 0).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Observa\u00e7\u00f5es</span><p className="text-[var(--text-secondary)]">{rel.fatura.observacoes || "\u2014"}</p></div>
                  </div>
                )}
              </div>

              {/* Utente */}
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2">Utente</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div><span className="text-[var(--text-muted)]">Nome</span><p className="text-[var(--text-primary)] font-bold">{rel.utente?.nome}</p></div>
                  <div><span className="text-[var(--text-muted)]">NIF</span><p className="text-[var(--text-primary)] font-semibold">{rel.utente?.nif}</p></div>
                </div>
              </div>

              {/* Recibo (apenas gestor) */}
              {rel.recibo && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">Recibo</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">N\u00famero</span><p className="text-[var(--text-primary)] font-bold">{rel.recibo.numero}</p></div>
                    <div><span className="text-[var(--text-muted)]">Data</span><p className="text-[var(--text-primary)]">{new Date(rel.recibo.dataPagamento).toLocaleDateString("pt-PT")}</p></div>
                    <div><span className="text-[var(--text-muted)]">Valor Pago</span><p className="text-emerald-400 font-black">{simboloMoeda}{(rel.recibo.valorPago ?? 0).toFixed(2)}</p></div>
                  </div>
                </div>
              )}

              {/* Tratamento */}
              {rel.tratamento && (
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-3">Tratamento Realizado</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Descri\u00e7\u00e3o</span><span className="text-[var(--text-primary)] font-bold">{rel.tratamento.descricao}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Dente</span><span className="text-[var(--text-primary)]">{rel.tratamento.dente}</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">M\u00e9dico</span><span className="text-[var(--text-primary)]">{rel.tratamento.medicoNome} ({rel.tratamento.medicoEspecialidade})</span></div>
                    <div className="flex justify-between"><span className="text-[var(--text-muted)]">Estado</span><span className="text-[var(--text-primary)] capitalize">{rel.tratamento.estado}</span></div>
                    {rel.tratamento.valorBruto !== undefined && (
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Valor Bruto</span><span className="text-[var(--text-primary)] font-bold">{simboloMoeda}{(rel.tratamento.valorBruto).toFixed(2)}</span></div>
                    )}
                    {rel.tratamento.custosDiretos !== undefined && (
                      <div className="flex justify-between"><span className="text-[var(--text-muted)]">Custos Diretos</span><span className="text-red-400">{simboloMoeda}{(rel.tratamento.custosDiretos).toFixed(2)}</span></div>
                    )}
                    {rel.tratamento.lucroClinica !== undefined && (
                      <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]"><span className="text-[var(--text-primary)] font-bold">Lucro Cl\u00ednica</span><span className="text-emerald-400 font-black">{simboloMoeda}{(rel.tratamento.lucroClinica).toFixed(2)}</span></div>
                    )}
                    {rel.tratamento.observacoes && (
                      <div className="mt-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10"><p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1">Observa\u00e7\u00f5es do Tratamento</p><p className="text-[var(--text-secondary)] text-xs">{rel.tratamento.observacoes}</p></div>
                    )}
                  </div>
                </div>
              )}

              {/* Evoluções Clínicas */}
              {rel.evolucoes && rel.evolucoes.length > 0 && (
                <div className="p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-violet-400 mb-3">Evolu\u00e7\u00f5es Cl\u00ednicas ({rel.evolucoes.length})</p>
                  <div className="space-y-3">
                    {rel.evolucoes.map((ev: any, i: number) => (
                      <div key={ev.id || i} className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[var(--text-primary)] text-xs font-bold">{ev.data ? new Date(ev.data).toLocaleDateString("pt-PT") : "\u2014"}</span>
                          <span className="text-[var(--text-muted)] text-[10px]">{ev.profissional || "\u2014"}</span>
                        </div>
                        <p className="text-[var(--text-secondary)] text-xs">{ev.descricao}</p>
                        {ev.anotacoes && (
                          <div className="mt-2 p-2 rounded-lg bg-violet-500/5 border border-violet-500/10">
                            <p className="text-[10px] font-bold text-violet-400 mb-0.5">Anota\u00e7\u00f5es do Dentista</p>
                            <p className="text-[var(--text-secondary)] text-xs whitespace-pre-wrap">{ev.anotacoes}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem evoluções */}
              {(!rel.evolucoes || rel.evolucoes.length === 0) && rel.tratamento && (
                <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-center">
                  <p className="text-[var(--text-muted)] text-xs">Sem evolu\u00e7\u00f5es cl\u00ednicas registadas para este tratamento.</p>
                </div>
              )}

              {/* Comissão (apenas gestor) */}
              {rel.comissao && (
                <div className="p-4 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#00E5FF] mb-2">Comiss\u00e3o do M\u00e9dico</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">Percentual</span><p className="text-[var(--text-primary)] font-bold">{rel.comissao.percentual}%</p></div>
                    <div><span className="text-[var(--text-muted)]">Valor</span><p className="text-[#00E5FF] font-black">{simboloMoeda}{(rel.comissao.valorComissao ?? 0).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Estado</span><p className="text-[var(--text-primary)] capitalize">{rel.comissao.estado}</p></div>
                  </div>
                </div>
              )}

              {/* Minha Comissão (apenas médico) */}
              {rel.minhaComissao && (
                <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-2">A Minha Comiss\u00e3o</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">Percentual</span><p className="text-[var(--text-primary)] font-bold">{rel.minhaComissao.percentual}%</p></div>
                    <div><span className="text-[var(--text-muted)]">Valor</span><p className="text-emerald-400 font-black">{simboloMoeda}{(rel.minhaComissao.valorComissao ?? 0).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Estado</span><p className="text-[var(--text-primary)] capitalize">{rel.minhaComissao.estado}</p></div>
                  </div>
                </div>
              )}

              {/* Reconciliação (apenas gestor) */}
              {rel.reconciliacao && (
                <div className={`p-4 rounded-xl border ${rel.reconciliacao.reconciliado ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <p className={`text-[10px] font-black uppercase tracking-widest mb-2 ${rel.reconciliacao.reconciliado ? "text-emerald-400" : "text-red-400"}`}>Reconcilia\u00e7\u00e3o</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div><span className="text-[var(--text-muted)]">Valor Fatura</span><p className="text-[var(--text-primary)] font-bold">{simboloMoeda}{(rel.reconciliacao.valorFatura ?? 0).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Valor Pago</span><p className="text-[var(--text-primary)] font-bold">{simboloMoeda}{(rel.reconciliacao.valorPago ?? 0).toFixed(2)}</p></div>
                    <div><span className="text-[var(--text-muted)]">Estado</span><p className={`font-black ${rel.reconciliacao.reconciliado ? "text-emerald-400" : "text-red-400"}`}>{rel.reconciliacao.reconciliado ? "Reconciliado" : `Diferen\u00e7a: ${simboloMoeda}${Math.abs(rel.reconciliacao.diferenca ?? 0).toFixed(2)}`}</p></div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer com botões */}
        <div className="p-6 border-t border-[var(--border-primary)] flex gap-3 shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Fechar</button>
          {rel && (
            <button onClick={handleDownloadPDF} className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-[#00E5FF] hover:bg-[#00E5FF] text-white transition-all">
              <Download className="w-4 h-4" /> Descarregar PDF
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Modal Detalhes da Fatura ─────────────────────────────────────
function ModalDetalhesFatura({ fatura, tratamentos, onClose, onPagar, simboloMoeda }: {
  fatura: any; tratamentos: any[]; onClose: () => void; onPagar: (faturaId: number) => void; simboloMoeda: string;
}) {
  const estadoCor = ESTADO_FATURA_COR[fatura.estado] || ESTADO_FATURA_COR.pendente;
  const tratamentoRelacionado = fatura.tratamentoId ? tratamentos.find((t: any) => t.id === fatura.tratamentoId) : null;
  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${estadoCor.bg} border ${estadoCor.border} flex items-center justify-center`}><Receipt className={`w-5 h-5 ${estadoCor.text}`} /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold">Detalhes da Fatura</h2><p className="text-[var(--text-muted)] text-xs">{fatura.numeroFatura}</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-5">
          <div className="flex items-center justify-between">
            <span className="text-[var(--text-secondary)] text-xs font-semibold uppercase">Estado</span>
            <span className={`text-xs font-bold uppercase px-3 py-1 rounded-full border ${estadoCor.bg} ${estadoCor.text} ${estadoCor.border}`}>{estadoCor.label}</span>
          </div>
          <div className="space-y-3 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
            <div className="flex justify-between"><span className="text-[var(--text-muted)] text-xs">Valor Base</span><span className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(fatura.valorBase || "0").toFixed(2)}</span></div>
            <div className="flex justify-between"><span className="text-[var(--text-muted)] text-xs">IVA ({fatura.taxaIva || "0"}%)</span><span className="text-[var(--text-secondary)] text-sm">{simboloMoeda}{parseFloat(fatura.valorIva || "0").toFixed(2)}</span></div>
            <div className="flex justify-between pt-2 border-t border-[var(--border-primary)]"><span className="text-[var(--text-primary)] text-sm font-bold">Total</span><span className="text-[var(--text-primary)] text-lg font-black">{simboloMoeda}{parseFloat(fatura.valorTotal || "0").toFixed(2)}</span></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Data Emissão", valor: formatarData(fatura.dataEmissao) },
              { label: "Vencimento", valor: formatarData(fatura.dataVencimento) },
              { label: "Tipo", valor: (fatura.tipoDocumento || "fatura").replace("_", " ") },
              { label: "Método", valor: fatura.metodoPagamento || "—" },
            ].map(({ label, valor }) => (
              <div key={label} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">{label}</p>
                <p className="text-[var(--text-primary)] text-xs font-semibold mt-1 capitalize">{valor}</p>
              </div>
            ))}
          </div>
          {tratamentoRelacionado && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <p className="text-amber-300 text-[10px] uppercase font-bold mb-1">Tratamento Associado</p>
              <p className="text-[var(--text-primary)] text-sm font-semibold">{tratamentoRelacionado.descricao}</p>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Fechar</button>
            {fatura.estado === "pendente" && (
              <button onClick={() => onPagar(fatura.id)} className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white transition-all">
                <CreditCard className="w-4 h-4" /> Registar Pagamento
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: LABORATÓRIO — Envios com Workflow, Etapas, Barra de Progressão + BOTÕES
// ═══════════════════════════════════════════════════════════════════════════════
function TabLaboratorio({ utenteId, simboloMoeda, onRefresh }: { utenteId: number; simboloMoeda: string; onRefresh: () => void }) {
  const [envioExpandido, setEnvioExpandido] = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmAction, setConfirmAction] = useState<{ envioId: number; action: string } | null>(null);
  const [showNovoEnvio, setShowNovoEnvio] = useState(false);
  const [showNotaEnvio, setShowNotaEnvio] = useState<any>(null);
  const [notaTexto, setNotaTexto] = useState("");

  const enviosQuery = trpc.laboratorios.listarEnvios.useQuery({ utenteId, limite: 50 }, { enabled: !!utenteId });
  const envios: any[] = (enviosQuery.data as any)?.envios ?? [];

  const enviosFiltrados = useMemo(() => {
    if (filtroEstado === "todos") return envios;
    if (filtroEstado === "ativos") return envios.filter((e: any) => !["concluido", "cancelado"].includes(e.estado));
    return envios.filter((e: any) => e.estado === filtroEstado);
  }, [envios, filtroEstado]);

  const calcularProgresso = (estado: string): number => {
    const ordem = ["criado", "enviado", "recebido_lab", "em_producao", "pronto", "devolvido", "em_prova", "concluido"];
    if (estado === "cancelado") return 0;
    if (estado === "ajuste") return 50;
    const idx = ordem.indexOf(estado);
    return idx >= 0 ? Math.round(((idx + 1) / ordem.length) * 100) : 0;
  };

  // Mutation para avançar etapa — usa atualizarEstado real
  const atualizarEstadoMutation = trpc.laboratorios.atualizarEstado.useMutation({
    onSuccess: () => { onRefresh(); enviosQuery.refetch(); setToast({ msg: "Estado atualizado com sucesso", tipo: "success" }); setConfirmAction(null); setShowNotaEnvio(null); },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao atualizar estado"), tipo: "error" }); setConfirmAction(null); },
  });

  const handleAvancarEtapa = (envioId: number) => {
    const envio = envios.find((e: any) => e.id === envioId);
    if (!envio) return;
    const ordem = ["criado", "enviado", "recebido_lab", "em_producao", "pronto", "devolvido", "em_prova", "concluido"];
    const idxAtual = ordem.indexOf(envio.estado);
    if (idxAtual < 0 || idxAtual >= ordem.length - 1) { setToast({ msg: "Envio já está no estado final", tipo: "warning" }); return; }
    const proximoEstado = ordem[idxAtual + 1] as any;
    atualizarEstadoMutation.mutate({ id: envioId, estado: proximoEstado, observacao: `Avançado para ${proximoEstado}` });
  };

  const handleCancelarEnvio = () => {
    if (!confirmAction) return;
    atualizarEstadoMutation.mutate({ id: confirmAction.envioId, estado: "cancelado" as any, observacao: "Envio cancelado pelo utilizador" });
  };

  const handleAdicionarNota = () => {
    if (!showNotaEnvio || !notaTexto.trim()) return;
    atualizarEstadoMutation.mutate({ id: showNotaEnvio.id, estado: showNotaEnvio.estado, observacao: notaTexto });
    setNotaTexto("");
  };

  const totalEnvios = envios.length;
  const enviosAtivos = envios.filter((e: any) => !["concluido", "cancelado"].includes(e.estado)).length;
  const enviosConcluidos = envios.filter((e: any) => e.estado === "concluido").length;
  const valorTotal = envios.reduce((acc: number, e: any) => acc + parseFloat(e.valorOrcado || e.valorFinal || "0"), 0);

  if (enviosQuery.isLoading) {
    return <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {confirmAction?.action === "cancelar" && (
        <ConfirmDialog titulo="Cancelar Envio" mensagem="Tem a certeza que pretende cancelar este envio de laboratório? Esta acção não pode ser revertida." onConfirm={handleCancelarEnvio} onCancel={() => setConfirmAction(null)} tipo="danger" confirmLabel="Cancelar Envio" />
      )}
      {showNovoEnvio && <ModalNovoEnvioLab utenteId={utenteId} onClose={() => setShowNovoEnvio(false)} onSuccess={() => { enviosQuery.refetch(); onRefresh(); setToast({ msg: "Envio criado com sucesso", tipo: "success" }); }} />}
      {showNotaEnvio && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl my-auto overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center"><MessageCircle className="w-5 h-5 text-blue-400" /></div><div><h2 className="text-[var(--text-primary)] font-bold text-sm">Adicionar Nota</h2><p className="text-[var(--text-muted)] text-xs">{showNotaEnvio.tipoTrabalho}</p></div></div>
              <button onClick={() => { setShowNotaEnvio(null); setNotaTexto(""); }} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <textarea value={notaTexto} onChange={e => setNotaTexto(e.target.value)} placeholder="Escreva a nota ou observação..." rows={3} className="input-premium w-full resize-none" />
              <div className="flex gap-3"><button onClick={() => { setShowNotaEnvio(null); setNotaTexto(""); }} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button><button onClick={handleAdicionarNota} disabled={!notaTexto.trim() || atualizarEstadoMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white transition-all">{atualizarEstadoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Guardar</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BAR — Laboratório */}
      <ActionBar cor="from-blue-500/5 to-[#B388FF]/5" borderCor="border-blue-500/20">
        <ActionBtn icon={Send} label="Novo Envio" onClick={() => setShowNovoEnvio(true)} variant="primary" tooltip="Criar novo envio para laboratório" />
        <ActionSep />
        <ActionBtn icon={SkipForward} label="Avançar Etapa" onClick={() => {
          const envioAtivo = envios.find((e: any) => !["concluido", "cancelado"].includes(e.estado));
          if (envioAtivo) handleAvancarEtapa(envioAtivo.id);
          else setToast({ msg: "Nenhum envio activo para avançar", tipo: "warning" });
        }} variant="success" tooltip="Avançar para a próxima etapa do workflow" />
        <ActionBtn icon={MessageCircle} label="Adicionar Nota" onClick={() => {
          const envioAtivo = envios.find((e: any) => !["concluido", "cancelado"].includes(e.estado));
          if (envioAtivo) setShowNotaEnvio(envioAtivo);
          else setToast({ msg: "Nenhum envio activo para adicionar nota", tipo: "warning" });
        }} variant="secondary" tooltip="Adicionar observação ao envio" />
        <ActionBtn icon={Ban} label="Cancelar" onClick={() => {
          const envioAtivo = envios.find((e: any) => !["concluido", "cancelado"].includes(e.estado));
          if (envioAtivo) setConfirmAction({ envioId: envioAtivo.id, action: "cancelar" });
          else setToast({ msg: "Nenhum envio activo para cancelar", tipo: "warning" });
        }} variant="danger" tooltip="Cancelar envio selecionado" />
        <div className="ml-auto flex items-center gap-2">
          <ActionBtn icon={RefreshCw} label="Actualizar" onClick={() => enviosQuery.refetch()} variant="ghost" tooltip="Recarregar dados do laboratório" />
        </div>
      </ActionBar>

      {/* KPIs do Laboratório */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Package} label="Total Envios" valor={totalEnvios} sub={`${enviosAtivos} activos`} cor="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
        <KPICard icon={Activity} label="Em Curso" valor={enviosAtivos} sub="a aguardar" cor="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        <KPICard icon={CheckCircle} label="Concluídos" valor={enviosConcluidos} sub="finalizados" cor="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <KPICard icon={Euro} label="Valor Total" valor={`${simboloMoeda}${valorTotal.toFixed(2)}`} sub="investido" cor="text-violet-400" bg="bg-violet-500/10" border="border-violet-500/20" />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {[
          { value: "todos", label: "Todos" },
          { value: "ativos", label: "Ativos" },
          { value: "em_producao", label: "Produção" },
          { value: "pronto", label: "Prontos" },
          { value: "concluido", label: "Concluídos" },
        ].map(({ value, label }) => (
          <button key={value} onClick={() => setFiltroEstado(value)}
            className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap ${
              filtroEstado === value ? "bg-blue-500/20 text-blue-300 border border-blue-500/30" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-transparent"
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Lista de Envios */}
      {enviosFiltrados.length === 0 ? (
        <div className="card-premium border border-[var(--border-primary)]">
          <EmptyState icon={Package} title="Sem envios para laboratório" subtitle="Os trabalhos enviados a laboratórios externos aparecerão aqui com rastreamento completo." />
        </div>
      ) : (
        <div className="space-y-4">
          {enviosFiltrados.map((envio: any) => {
            const isExpanded = envioExpandido === envio.id;
            const progresso = calcularProgresso(envio.estado);
            const stepAtual = LAB_WORKFLOW_STEPS.find(s => s.key === envio.estado);
            const StepIcon = stepAtual?.icon || Package;
            const prioridadeCfg = LAB_PRIORIDADE_COR[envio.prioridade] || LAB_PRIORIDADE_COR.normal;
            const historico: any[] = envio.historicoEstados || [];
            const diasRestantes = envio.dataPrevistaDevolucao ? Math.ceil((new Date(envio.dataPrevistaDevolucao).getTime() - Date.now()) / 86400000) : null;
            const isAtivo = !["concluido", "cancelado"].includes(envio.estado);

            return (
              <div key={envio.id} className={`card-premium border transition-all duration-300 ${isExpanded ? "border-blue-500/40 shadow-lg shadow-blue-500/5" : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
                <button onClick={() => setEnvioExpandido(isExpanded ? null : envio.id)} className="w-full p-5 text-left">
                  <div className="flex items-start gap-4">
                    <div className={`w-12 h-12 rounded-xl ${stepAtual?.bg || "bg-[var(--bg-surface)]"} border border-[var(--border-primary)] flex items-center justify-center shrink-0`}>
                      <StepIcon className={`w-6 h-6 ${stepAtual?.cor || "text-[var(--text-muted)]"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-[var(--text-primary)] font-bold text-sm">{envio.tipoTrabalho}</h4>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${prioridadeCfg.bg} ${prioridadeCfg.text} ${prioridadeCfg.border}`}>{prioridadeCfg.label}</span>
                        {envio.laboratorioNome && (<span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1"><Factory className="w-3 h-3" />{envio.laboratorioNome}</span>)}
                      </div>
                      <p className="text-[var(--text-secondary)] text-xs line-clamp-1">{envio.descricao}</p>
                      <div className="flex items-center gap-4 mt-2 flex-wrap">
                        {envio.dente && <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1"><Smile className="w-3 h-3" />Dente: {envio.dente}</span>}
                        {envio.cor && <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1"><Palette className="w-3 h-3" />Cor: {envio.cor}</span>}
                        {envio.material && <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1"><Box className="w-3 h-3" />{envio.material}</span>}
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${stepAtual?.bg || "bg-[var(--bg-surface)]"} ${stepAtual?.cor || "text-[var(--text-muted)]"} border-[var(--border-primary)]`}>{stepAtual?.label || envio.estado}</span>
                      {diasRestantes !== null && (
                        <span className={`text-[10px] font-semibold flex items-center gap-1 ${diasRestantes < 0 ? "text-red-400" : diasRestantes <= 2 ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
                          <Timer className="w-3 h-3" />{diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atrasado` : diasRestantes === 0 ? "Hoje" : `${diasRestantes}d restantes`}
                        </span>
                      )}
                      {(envio.valorOrcado || envio.valorFinal) && (<span className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(envio.valorFinal || envio.valorOrcado || "0").toFixed(2)}</span>)}
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar valor={progresso} max={100} cor={envio.estado === "cancelado" ? "bg-red-500" : "bg-blue-500"} height="h-2" showLabel={false} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[var(--text-muted)] text-[10px]">{formatarData(envio.createdAt)}</span>
                      <span className={`text-[10px] font-bold ${stepAtual?.cor || "text-[var(--text-muted)]"}`}>{progresso}% completo</span>
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-[var(--border-primary)] pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Botões de ação inline do envio */}
                    {isAtivo && (
                      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mr-2">Acções:</span>
                        <ActionBtn icon={SkipForward} label="Avançar Etapa" onClick={() => handleAvancarEtapa(envio.id)} variant="success" size="xs" />
                        <ActionBtn icon={MessageCircle} label="Nota" onClick={() => setShowNotaEnvio(envio)} variant="secondary" size="xs" />
                        <ActionBtn icon={Ban} label="Cancelar" onClick={() => setConfirmAction({ envioId: envio.id, action: "cancelar" })} variant="danger" size="xs" />
                      </div>
                    )}

                    {/* Workflow Visual */}
                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-4">Etapas do Trabalho</p>
                      <div className="flex items-center gap-0 overflow-x-auto pb-2">
                        {LAB_WORKFLOW_STEPS.filter(s => s.key !== "cancelado" && s.key !== "ajuste").map((step, i, arr) => {
                          const ordem = ["criado", "enviado", "recebido_lab", "em_producao", "pronto", "devolvido", "em_prova", "concluido"];
                          const estadoIdx = ordem.indexOf(envio.estado);
                          const stepIdx = ordem.indexOf(step.key);
                          const isCompleted = stepIdx <= estadoIdx && envio.estado !== "cancelado";
                          const isCurrent = step.key === envio.estado;
                          const Icon = step.icon;
                          return (
                            <React.Fragment key={step.key}>
                              <div className="flex flex-col items-center gap-1.5 min-w-[60px]">
                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isCurrent ? `${step.bg} border-2 border-current ${step.cor} shadow-lg scale-110` : isCompleted ? `bg-emerald-500/20 border border-emerald-500/30` : "bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"}`}>
                                  {isCompleted && !isCurrent ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Icon className={`w-4 h-4 ${isCurrent ? step.cor : "text-[var(--text-muted)]"}`} />}
                                </div>
                                <span className={`text-[9px] font-semibold text-center leading-tight ${isCurrent ? step.cor : isCompleted ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>{step.label}</span>
                              </div>
                              {i < arr.length - 1 && (<div className={`flex-1 h-0.5 min-w-[16px] mx-1 rounded-full transition-all ${isCompleted && stepIdx < estadoIdx ? "bg-emerald-500" : "bg-[var(--border-primary)]"}`} />)}
                            </React.Fragment>
                          );
                        })}
                      </div>
                    </div>

                    {/* Info detalhada */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                      {[
                        { label: "Data Envio", valor: formatarData(envio.dataEnvio) },
                        { label: "Recebido Lab", valor: formatarData(envio.dataRecebidoLab) },
                        { label: "Previsão", valor: formatarData(envio.dataPrevistaDevolucao) },
                        { label: "Devolvido", valor: formatarData(envio.dataDevolucaoReal) },
                      ].map(({ label, valor }) => (
                        <div key={label} className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                          <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">{label}</p>
                          <p className="text-[var(--text-primary)] text-xs font-semibold mt-1">{valor}</p>
                        </div>
                      ))}
                    </div>

                    {(envio.valorOrcado || envio.valorFinal) && (
                      <div className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <Euro className="w-5 h-5 text-emerald-400 shrink-0" />
                        <div className="flex-1 grid grid-cols-3 gap-4">
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Orçado</p><p className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(envio.valorOrcado || "0").toFixed(2)}</p></div>
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Final</p><p className="text-[var(--text-primary)] text-sm font-bold">{envio.valorFinal ? `${simboloMoeda}${parseFloat(envio.valorFinal).toFixed(2)}` : "—"}</p></div>
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Pagamento</p><p className={`text-sm font-bold ${envio.pago ? "text-emerald-400" : "text-amber-400"}`}>{envio.pago ? "Pago" : "Pendente"}</p></div>
                        </div>
                      </div>
                    )}

                    {historico.length > 0 && (
                      <div>
                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3">Histórico de Atualizações</p>
                        <div className="space-y-0 relative">
                          <div className="absolute left-[17px] top-3 bottom-3 w-0.5 bg-[var(--border-primary)]" />
                          {historico.slice().reverse().map((h: any, i: number) => {
                            const stepCfg = LAB_WORKFLOW_STEPS.find(s => s.key === h.estado);
                            const HIcon = stepCfg?.icon || Info;
                            return (
                              <div key={i} className="flex items-start gap-3 relative pl-0 py-2">
                                <div className={`w-9 h-9 rounded-lg ${stepCfg?.bg || "bg-[var(--bg-surface)]"} border border-[var(--border-primary)] flex items-center justify-center shrink-0 z-10 bg-[var(--bg-primary)]`}>
                                  <HIcon className={`w-4 h-4 ${stepCfg?.cor || "text-[var(--text-muted)]"}`} />
                                </div>
                                <div className="flex-1 min-w-0 pt-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className={`text-xs font-bold ${stepCfg?.cor || "text-[var(--text-muted)]"}`}>{stepCfg?.label || h.estado}</span>
                                    <span className="text-[var(--text-muted)] text-[10px]">{formatarDataHora(h.data)}</span>
                                  </div>
                                  {h.observacao && <p className="text-[var(--text-secondary)] text-xs mt-0.5">{h.observacao}</p>}
                                  {h.usuario && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">por {h.usuario}</p>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {envio.observacoes && (
                      <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                        <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-2">Observações</p>
                        <p className="text-[var(--text-secondary)] text-xs">{envio.observacoes}</p>
                      </div>
                    )}

                    {/* ═══ SECÇÃO DE MATERIAIS INTEGRADA ═══ */}
                    <MateriaisEnvioSection envioId={envio.id} envioEstado={envio.estado} onRefresh={() => { enviosQuery.refetch(); onRefresh(); }} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE: Secção de Materiais por Envio (Checklist + Guia de Remessa)
// ═══════════════════════════════════════════════════════════════════════════════
function MateriaisEnvioSection({ envioId, envioEstado, onRefresh }: { envioId: number; envioEstado: string; onRefresh: () => void }) {
  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [showGuiaRemessa, setShowGuiaRemessa] = useState(false);
  const [selectedMateriais, setSelectedMateriais] = useState<number[]>([]);
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  type TipoMaterial = "moldagem_alginato" | "moldagem_silicone" | "moldagem_digital" | "modelo_gesso" | "modelo_articulador" | "registo_mordida" | "registo_arco_facial" | "provisorio" | "dente_provisorio" | "nucleo_espigao" | "componente_implante" | "scan_intraoral" | "fotografias" | "radiografias" | "guia_cirurgica" | "goteira" | "placa_base" | "rolos_cera" | "prova_metal" | "prova_ceramica" | "prova_acrilico" | "prova_zirconia" | "trabalho_anterior" | "outro";
  type EstadoMaterial = "preparado" | "enviado_lab" | "recebido_lab" | "em_uso" | "devolvido_clinica" | "recebido_clinica" | "extraviado" | "danificado" | "descartado";
  const [novoMaterial, setNovoMaterial] = useState({ tipoMaterial: "outro" as TipoMaterial, descricao: "", quantidade: 1, direcao: "clinica_para_lab" as "clinica_para_lab" | "lab_para_clinica", observacoes: "" });

  const materiaisQuery = trpc.materiaisLab.listarPorEnvio.useQuery({ envioId }, { enabled: !!envioId });
  const materiais: any[] = materiaisQuery.data?.materiais ?? [];
  const resumo = materiaisQuery.data?.resumo ?? { total: 0, enviados: 0, recebidos: 0, pendentes: 0, problemas: 0 };

  const guiasQuery = trpc.materiaisLab.listarGuias.useQuery({ envioId }, { enabled: !!envioId });
  const guias: any[] = guiasQuery.data?.guias ?? [];

  const adicionarMutation = trpc.materiaisLab.adicionar.useMutation({
    onSuccess: () => { materiaisQuery.refetch(); setShowAddMaterial(false); setNovoMaterial({ tipoMaterial: "outro", descricao: "", quantidade: 1, direcao: "clinica_para_lab", observacoes: "" }); setToast({ msg: "Material adicionado com sucesso", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao adicionar material"), tipo: "error" }),
  });

  const actualizarEstadoMutation = trpc.materiaisLab.actualizarEstado.useMutation({
    onSuccess: () => { materiaisQuery.refetch(); onRefresh(); setToast({ msg: "Estado do material actualizado", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao actualizar"), tipo: "error" }),
  });

  const actualizarBatchMutation = trpc.materiaisLab.actualizarEstadoBatch.useMutation({
    onSuccess: () => { materiaisQuery.refetch(); onRefresh(); setSelectedMateriais([]); setToast({ msg: "Materiais actualizados em lote", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao actualizar em lote"), tipo: "error" }),
  });

  const removerMutation = trpc.materiaisLab.remover.useMutation({
    onSuccess: () => { materiaisQuery.refetch(); onRefresh(); setToast({ msg: "Material removido", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao remover"), tipo: "error" }),
  });

  const criarGuiaMutation = trpc.materiaisLab.criarGuia.useMutation({
    onSuccess: (data: any) => { guiasQuery.refetch(); materiaisQuery.refetch(); setShowGuiaRemessa(false); setSelectedMateriais([]); setToast({ msg: `Guia ${data.numeroGuia} criada com sucesso`, tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao criar guia"), tipo: "error" }),
  });

  const handleAddMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoMaterial.descricao.trim()) { setToast({ msg: "Descrição é obrigatória", tipo: "warning" }); return; }
    adicionarMutation.mutate({ envioId, ...novoMaterial });
  };

  const toggleSelectMaterial = (id: number) => {
    setSelectedMateriais(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const selectAll = () => {
    if (selectedMateriais.length === materiais.length) setSelectedMateriais([]);
    else setSelectedMateriais(materiais.map(m => m.id));
  };

  const handleBatchUpdate = (estado: string) => {
    if (selectedMateriais.length === 0) { setToast({ msg: "Selecione pelo menos um material", tipo: "warning" }); return; }
    actualizarBatchMutation.mutate({ ids: selectedMateriais, estado: estado as EstadoMaterial });
  };

  const isAtivo = !["concluido", "cancelado"].includes(envioEstado);

  const materiaisEnviados = materiais.filter(m => m.direcao === "clinica_para_lab");
  const materiaisRecebidos = materiais.filter(m => m.direcao === "lab_para_clinica");

  return (
    <div className="space-y-4">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* ─── Cabeçalho Materiais com KPIs mini ─── */}
      <div className="rounded-2xl border border-teal-500/20 bg-gradient-to-r from-teal-500/5 to-cyan-500/5 overflow-hidden">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
              <ListChecks className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h4 className="text-[var(--text-primary)] font-bold text-sm">Materiais do Envio</h4>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Checklist de materiais enviados e recebidos</p>
            </div>
          </div>
          {isAtivo && (
            <div className="flex items-center gap-2">
              <ActionBtn icon={PackagePlus} label="Adicionar" onClick={() => setShowAddMaterial(true)} variant="primary" size="xs" />
              {materiais.length > 0 && (
                <ActionBtn icon={FileOutput} label="Guia Remessa" onClick={() => setShowGuiaRemessa(true)} variant="secondary" size="xs" tooltip="Criar guia de remessa/expedição" />
              )}
            </div>
          )}
        </div>

        {/* Mini KPIs de materiais */}
        {materiais.length > 0 && (
          <div className="grid grid-cols-4 gap-0 border-t border-teal-500/10">
            {[
              { label: "Total", valor: resumo.total, cor: "text-teal-400" },
              { label: "Enviados", valor: resumo.enviados, cor: "text-blue-400" },
              { label: "Recebidos", valor: resumo.recebidos, cor: "text-emerald-400" },
              { label: "Problemas", valor: resumo.problemas, cor: resumo.problemas > 0 ? "text-red-400" : "text-[var(--text-muted)]" },
            ].map(({ label, valor, cor }) => (
              <div key={label} className="p-3 text-center border-r border-teal-500/10 last:border-r-0">
                <p className={`text-lg font-black ${cor}`}>{valor}</p>
                <p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">{label}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Acções em Lote ─── */}
      {selectedMateriais.length > 0 && isAtivo && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 animate-in fade-in slide-in-from-top-2 duration-200">
          <span className="text-teal-300 text-xs font-bold">{selectedMateriais.length} selecionado{selectedMateriais.length > 1 ? "s" : ""}</span>
          <div className="ml-auto flex items-center gap-1.5">
            <ActionBtn icon={Send} label="Marcar Enviado" onClick={() => handleBatchUpdate("enviado_lab")} variant="primary" size="xs" />
            <ActionBtn icon={PackageCheck} label="Marcar Recebido" onClick={() => handleBatchUpdate("recebido_lab")} variant="success" size="xs" />
            <ActionBtn icon={Truck} label="Devolvido" onClick={() => handleBatchUpdate("devolvido_clinica")} variant="secondary" size="xs" />
            <ActionBtn icon={CheckCircle} label="Recebido Clínica" onClick={() => handleBatchUpdate("recebido_clinica")} variant="success" size="xs" />
          </div>
        </div>
      )}

      {/* ─── Lista de Materiais Enviados (Clínica → Lab) ─── */}
      {materiaisEnviados.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpFromLine className="w-4 h-4 text-blue-400" />
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Materiais Enviados ao Laboratório ({materiaisEnviados.length})</p>
            {isAtivo && (
              <button onClick={selectAll} className="ml-auto text-[10px] text-teal-400 hover:text-teal-300 font-semibold transition-colors">
                {selectedMateriais.length === materiais.length ? "Desseleccionar" : "Seleccionar Todos"}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {materiaisEnviados.map((mat: any) => {
              const tipoCfg = TIPOS_MATERIAL_CONFIG[mat.tipoMaterial] || TIPOS_MATERIAL_CONFIG.outro;
              const estadoCfg = ESTADOS_MATERIAL_CONFIG[mat.estado] || ESTADOS_MATERIAL_CONFIG.preparado;
              const TipoIcon = tipoCfg.icon;
              const EstadoIcon = estadoCfg.icon;
              const isSelected = selectedMateriais.includes(mat.id);
              return (
                <div key={mat.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${isSelected ? "bg-teal-500/10 border-teal-500/30" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
                  {isAtivo && (
                    <button onClick={() => toggleSelectMaterial(mat.id)} className="shrink-0">
                      {isSelected ? <SquareCheck className="w-5 h-5 text-teal-400" /> : <Square className="w-5 h-5 text-[var(--text-muted)] hover:text-teal-400 transition-colors" />}
                    </button>
                  )}
                  <div className={`w-9 h-9 rounded-lg ${tipoCfg.bg} flex items-center justify-center shrink-0`}>
                    <TipoIcon className={`w-4 h-4 ${tipoCfg.cor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{mat.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[var(--text-muted)] text-[10px]">{tipoCfg.label}</span>
                      {mat.quantidade > 1 && <span className="text-[var(--text-muted)] text-[10px]">x{mat.quantidade}</span>}
                      {mat.observacoes && <span className="text-[var(--text-muted)] text-[10px] truncate max-w-[120px]" title={mat.observacoes}>{mat.observacoes}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${estadoCfg.bg} ${estadoCfg.cor} ${estadoCfg.border}`}>
                      <EstadoIcon className="w-3 h-3" />{estadoCfg.label}
                    </span>
                    {isAtivo && (
                      <div className="relative group">
                        <button className="w-7 h-7 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-all">
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>
                        <div className="absolute z-50 top-full mt-1 right-0 min-w-[160px] rounded-xl border border-[var(--border-primary)] bg-[var(--bg-primary)] shadow-2xl shadow-black/40 overflow-hidden hidden group-hover:block animate-in fade-in duration-100">
                          <div className="p-1">
                            {Object.entries(ESTADOS_MATERIAL_CONFIG).filter(([key]) => key !== mat.estado).map(([key, cfg]) => {
                              const Icon = cfg.icon;
                              return (
                                <button key={key} onClick={() => actualizarEstadoMutation.mutate({ id: mat.id, estado: key as EstadoMaterial })}
                                  className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] transition-all">
                                  <Icon className={`w-3.5 h-3.5 ${cfg.cor}`} />
                                  <span className="text-[11px] font-semibold">{cfg.label}</span>
                                </button>
                              );
                            })}
                            <div className="border-t border-[var(--border-primary)] my-1" />
                            <button onClick={() => removerMutation.mutate({ id: mat.id })}
                              className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-left text-red-400 hover:bg-red-500/10 transition-all">
                              <Trash2 className="w-3.5 h-3.5" />
                              <span className="text-[11px] font-semibold">Remover</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Lista de Materiais Recebidos (Lab → Clínica) ─── */}
      {materiaisRecebidos.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <ArrowDownToLine className="w-4 h-4 text-emerald-400" />
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Materiais Recebidos do Laboratório ({materiaisRecebidos.length})</p>
          </div>
          <div className="space-y-2">
            {materiaisRecebidos.map((mat: any) => {
              const tipoCfg = TIPOS_MATERIAL_CONFIG[mat.tipoMaterial] || TIPOS_MATERIAL_CONFIG.outro;
              const estadoCfg = ESTADOS_MATERIAL_CONFIG[mat.estado] || ESTADOS_MATERIAL_CONFIG.preparado;
              const TipoIcon = tipoCfg.icon;
              const EstadoIcon = estadoCfg.icon;
              return (
                <div key={mat.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all">
                  <div className={`w-9 h-9 rounded-lg ${tipoCfg.bg} flex items-center justify-center shrink-0`}>
                    <TipoIcon className={`w-4 h-4 ${tipoCfg.cor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{mat.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[var(--text-muted)] text-[10px]">{tipoCfg.label}</span>
                      {mat.quantidade > 1 && <span className="text-[var(--text-muted)] text-[10px]">x{mat.quantidade}</span>}
                      {mat.verificadoPor && <span className="text-emerald-400 text-[10px]">Verificado: {mat.verificadoPor}</span>}
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border ${estadoCfg.bg} ${estadoCfg.cor} ${estadoCfg.border}`}>
                    <EstadoIcon className="w-3 h-3" />{estadoCfg.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Empty State ─── */}
      {materiais.length === 0 && (
        <div className="text-center py-6">
          <PackageOpen className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
          <p className="text-[var(--text-muted)] text-xs">Sem materiais registados neste envio</p>
          {isAtivo && (
            <button onClick={() => setShowAddMaterial(true)} className="mt-2 text-teal-400 text-xs font-semibold hover:text-teal-300 transition-colors inline-flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Adicionar material
            </button>
          )}
        </div>
      )}

      {/* ─── Guias de Remessa Existentes ─── */}
      {guias.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <FileOutput className="w-4 h-4 text-violet-400" />
            <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest">Guias de Remessa ({guias.length})</p>
          </div>
          <div className="space-y-2">
            {guias.map((guia: any) => (
              <div key={guia.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-violet-500/30 transition-all">
                <div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0">
                  <FileOutput className="w-4 h-4 text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-xs font-bold">{guia.numeroGuia}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-[var(--text-muted)] text-[10px] capitalize">{guia.tipo}</span>
                    <span className="text-[var(--text-muted)] text-[10px]">{formatarDataHora(guia.dataEmissao)}</span>
                    {guia.transportadora && <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1"><Truck className="w-3 h-3" />{guia.transportadora}</span>}
                    {guia.codigoRastreamento && <span className="text-cyan-400 text-[10px] font-mono">{guia.codigoRastreamento}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {guia.dataRececaoConfirmada ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3 h-3" />Recebida
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-500/15 text-amber-400 border border-amber-500/30">
                      <Clock className="w-3 h-3" />Pendente
                    </span>
                  )}
                  <span className="text-[var(--text-muted)] text-[10px]">{guia.materiaisIds?.length || 0} itens</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Modal: Adicionar Material ─── */}
      {showAddMaterial && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl my-auto overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-teal-500/10 to-cyan-500/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center"><PackagePlus className="w-5 h-5 text-teal-400" /></div>
                <div><h2 className="text-[var(--text-primary)] font-bold text-sm">Adicionar Material</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Registar material no envio</p></div>
              </div>
              <button onClick={() => setShowAddMaterial(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleAddMaterial} className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Material *</label>
                <select value={novoMaterial.tipoMaterial} onChange={e => setNovoMaterial(f => ({ ...f, tipoMaterial: e.target.value as TipoMaterial }))} className="input-premium w-full">
                  {Object.entries(TIPOS_MATERIAL_CONFIG).map(([key, cfg]) => (
                    <option key={key} value={key}>{cfg.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Descrição *</label>
                <input type="text" value={novoMaterial.descricao} onChange={e => setNovoMaterial(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Moldagem superior em silicone" className="input-premium w-full" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Quantidade</label>
                  <input type="number" min={1} value={novoMaterial.quantidade} onChange={e => setNovoMaterial(f => ({ ...f, quantidade: parseInt(e.target.value) || 1 }))} className="input-premium w-full" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Direcção</label>
                  <select value={novoMaterial.direcao} onChange={e => setNovoMaterial(f => ({ ...f, direcao: e.target.value as any }))} className="input-premium w-full">
                    <option value="clinica_para_lab">Clínica → Lab</option>
                    <option value="lab_para_clinica">Lab → Clínica</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Observações</label>
                <textarea value={novoMaterial.observacoes} onChange={e => setNovoMaterial(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais..." rows={2} className="input-premium w-full resize-none" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-[var(--border-primary)]">
                <button type="button" onClick={() => setShowAddMaterial(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
                <button type="submit" disabled={adicionarMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 text-white transition-all">
                  {adicionarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Adicionar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal: Criar Guia de Remessa ─── */}
      {showGuiaRemessa && <ModalGuiaRemessa envioId={envioId} materiais={materiais} selectedIds={selectedMateriais} onClose={() => setShowGuiaRemessa(false)} onSuccess={() => { criarGuiaMutation.reset(); guiasQuery.refetch(); materiaisQuery.refetch(); setShowGuiaRemessa(false); setSelectedMateriais([]); setToast({ msg: "Guia de remessa criada", tipo: "success" }); }} />}
    </div>
  );
}

// ─── Modal: Guia de Remessa ────────────────────────────────────────────────────────────
function ModalGuiaRemessa({ envioId, materiais, selectedIds, onClose, onSuccess }: {
  envioId: number; materiais: any[]; selectedIds: number[]; onClose: () => void; onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    tipo: "envio" as "envio" | "devolucao" | "reenvio",
    transportadora: "",
    codigoRastreamento: "",
    observacoes: "",
    assinaturaEnvio: "",
    materiaisIds: selectedIds.length > 0 ? selectedIds : materiais.filter(m => m.estado === "preparado").map((m: any) => m.id),
  });

  const criarGuiaMutation = trpc.materiaisLab.criarGuia.useMutation({
    onSuccess: () => onSuccess(),
    onError: () => {},
  });

  const toggleMaterial = (id: number) => {
    setForm(f => ({
      ...f,
      materiaisIds: f.materiaisIds.includes(id) ? f.materiaisIds.filter(x => x !== id) : [...f.materiaisIds, id],
    }));
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    criarGuiaMutation.mutate({
      envioId,
      tipo: form.tipo,
      transportadora: form.transportadora || undefined,
      codigoRastreamento: form.codigoRastreamento || undefined,
      observacoes: form.observacoes || undefined,
      assinaturaEnvio: form.assinaturaEnvio || undefined,
      materiaisIds: form.materiaisIds.length > 0 ? form.materiaisIds : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r from-violet-500/10 to-purple-500/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><FileOutput className="w-5 h-5 text-violet-400" /></div>
            <div><h2 className="text-[var(--text-primary)] font-bold text-sm">Guia de Remessa</h2><p className="text-[var(--text-muted)] text-[10px] uppercase tracking-widest font-black">Documento de expedição</p></div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Tipo de Guia</label>
              <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value as any }))} className="input-premium w-full">
                <option value="envio">Envio</option>
                <option value="devolucao">Devolução</option>
                <option value="reenvio">Reenvio</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Transportadora</label>
              <input type="text" value={form.transportadora} onChange={e => setForm(f => ({ ...f, transportadora: e.target.value }))} placeholder="Ex: CTT, DHL" className="input-premium w-full" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Código Rastreamento</label>
              <input type="text" value={form.codigoRastreamento} onChange={e => setForm(f => ({ ...f, codigoRastreamento: e.target.value }))} placeholder="Tracking number" className="input-premium w-full" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Assinatura Envio</label>
              <input type="text" value={form.assinaturaEnvio} onChange={e => setForm(f => ({ ...f, assinaturaEnvio: e.target.value }))} placeholder="Nome de quem envia" className="input-premium w-full" />
            </div>
          </div>

          {/* Selecção de materiais a incluir na guia */}
          {materiais.length > 0 && (
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Materiais Incluídos na Guia</label>
              <div className="max-h-[200px] overflow-y-auto space-y-1.5 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                {materiais.map((mat: any) => {
                  const tipoCfg = TIPOS_MATERIAL_CONFIG[mat.tipoMaterial] || TIPOS_MATERIAL_CONFIG.outro;
                  const isIncluded = form.materiaisIds.includes(mat.id);
                  return (
                    <button key={mat.id} type="button" onClick={() => toggleMaterial(mat.id)}
                      className={`w-full flex items-center gap-2.5 p-2 rounded-lg transition-all text-left ${isIncluded ? "bg-violet-500/15 border border-violet-500/30" : "hover:bg-[var(--bg-tertiary)] border border-transparent"}`}>
                      {isIncluded ? <SquareCheck className="w-4 h-4 text-violet-400 shrink-0" /> : <Square className="w-4 h-4 text-[var(--text-muted)] shrink-0" />}
                      <span className="text-xs font-semibold text-[var(--text-primary)] truncate flex-1">{mat.descricao}</span>
                      <span className={`text-[9px] ${tipoCfg.cor}`}>{tipoCfg.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[var(--text-muted)] text-[10px]">{form.materiaisIds.length} de {materiais.length} materiais selecionados</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Observações</label>
            <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} placeholder="Notas adicionais para a guia..." rows={2} className="input-premium w-full resize-none" />
          </div>

          <div className="flex gap-3 pt-4 border-t border-[var(--border-primary)]">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
            <button type="submit" disabled={criarGuiaMutation.isPending} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-violet-500 hover:bg-violet-600 text-white transition-all">
              {criarGuiaMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileOutput className="w-4 h-4" />} Criar Guia
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: ORTODONTIA — Progresso do Tratamento + BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabOrtodontia({ tratamentos, consultas, simboloMoeda, onRefresh, utenteId }: {
  tratamentos: any[]; consultas: any[]; simboloMoeda: string; onRefresh: () => void; utenteId: number;
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [showEvolucao, setShowEvolucao] = useState<any>(null);
  const [showNovaConsultaOrto, setShowNovaConsultaOrto] = useState(false);
  const atualizarMutation = trpc.tratamentos.actualizarTratamento.useMutation({
    onSuccess: () => { onRefresh(); setToast({ msg: "Tratamento atualizado com sucesso", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao atualizar"), tipo: "error" }),
  });

  const tratamentosOrto = useMemo(() => {
    return tratamentos.filter(t => {
      const desc = (t.descricao || "").toLowerCase();
      return desc.includes("ortod") || desc.includes("alinhador") || desc.includes("bracket") || desc.includes("invisalign") || desc.includes("aparelho");
    });
  }, [tratamentos]);

  const consultasOrto = useMemo(() => {
    return consultas.filter(c => {
      const tipo = (c.tipoConsulta || "").toLowerCase();
      const obs = (c.observacoes || "").toLowerCase();
      return tipo.includes("ortod") || obs.includes("ortod") || obs.includes("alinhador") || obs.includes("bracket");
    }).sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime());
  }, [consultas]);

  const gerarEtapasOrto = (tratamento: any) => {
    const desc = (tratamento.descricao || "").toLowerCase();
    const isAlinhador = desc.includes("alinhador") || desc.includes("invisalign");
    const isBracket = desc.includes("bracket") || desc.includes("aparelho fixo");
    if (isAlinhador) {
      return [
        { nome: "Moldagem / Scan Digital", estado: "concluido", icon: Scan },
        { nome: "Planeamento ClinCheck", estado: "concluido", icon: Target },
        { nome: "Receção dos Alinhadores", estado: tratamento.estado === "pendente" ? "pendente" : "concluido", icon: Package },
        { nome: "Fase Inicial (Alinhadores 1-10)", estado: tratamento.estado === "em_progresso" ? "em_progresso" : tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Activity },
        { nome: "Fase Intermédia (Alinhadores 11-20)", estado: tratamento.estado === "em_progresso" ? "em_progresso" : tratamento.estado === "concluido" ? "concluido" : "pendente", icon: TrendingUp },
        { nome: "Fase Final (Alinhadores 21-30)", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Award },
        { nome: "Contenção / Retainer", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Shield },
      ];
    }
    if (isBracket) {
      return [
        { nome: "Documentação Ortodôntica", estado: "concluido", icon: FileText },
        { nome: "Colagem de Brackets", estado: tratamento.estado === "pendente" ? "pendente" : "concluido", icon: Wrench },
        { nome: "Fase de Alinhamento", estado: tratamento.estado === "em_progresso" ? "em_progresso" : tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Activity },
        { nome: "Fase de Nivelamento", estado: tratamento.estado === "em_progresso" ? "em_progresso" : tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Ruler },
        { nome: "Fase de Fechamento de Espaços", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Move },
        { nome: "Fase de Acabamento", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Sparkles },
        { nome: "Remoção e Contenção", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Shield },
      ];
    }
    return [
      { nome: "Avaliação Inicial", estado: "concluido", icon: ClipboardList },
      { nome: "Planeamento", estado: tratamento.estado === "pendente" ? "pendente" : "concluido", icon: Target },
      { nome: "Tratamento Ativo", estado: tratamento.estado === "em_progresso" ? "em_progresso" : tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Activity },
      { nome: "Finalização", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Award },
      { nome: "Contenção", estado: tratamento.estado === "concluido" ? "concluido" : "pendente", icon: Shield },
    ];
  };

  const totalOrto = tratamentosOrto.length;
  const emCurso = tratamentosOrto.filter(t => t.estado === "em_progresso").length;
  const concluidos = tratamentosOrto.filter(t => t.estado === "concluido").length;
  const valorTotal = tratamentosOrto.reduce((acc, t) => acc + parseFloat(t.valorBruto || "0"), 0);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {showEvolucao && <ModalAdicionarEvolucao tratamento={showEvolucao} onClose={() => setShowEvolucao(null)} onSuccess={onRefresh} />}
      {showNovaConsultaOrto && <ModalNovaConsulta utenteId={utenteId} onClose={() => setShowNovaConsultaOrto(false)} onSuccess={() => { onRefresh(); setToast({ msg: "Consulta de controlo agendada", tipo: "success" }); }} />}

      {/* ACTION BAR — Ortodontia */}
      <ActionBar cor="from-orange-500/5 to-amber-500/5" borderCor="border-orange-500/20">
        <ActionBtn icon={SkipForward} label="Avançar Fase" onClick={() => {
          const ortoAtivo = tratamentosOrto.find(t => t.estado === "em_progresso" || t.estado === "proposto" || t.estado === "pendente");
          if (ortoAtivo) {
            const novoEstado = ortoAtivo.estado === "proposto" || ortoAtivo.estado === "pendente" ? "em_progresso" : "concluido";
            atualizarMutation.mutate({ id: ortoAtivo.id, estado: novoEstado });
          } else setToast({ msg: "Nenhum tratamento ortodôntico activo para avançar", tipo: "warning" });
        }} variant="primary" tooltip="Avançar para a próxima fase do tratamento ortodôntico" />
        <ActionSep />
        <ActionBtn icon={CalendarPlus} label="Consulta de Controlo" onClick={() => setShowNovaConsultaOrto(true)} variant="success" tooltip="Agendar nova consulta de controlo" />
        <ActionBtn icon={Edit2} label="Adicionar Evolução" onClick={() => {
          const ortoAtivo = tratamentosOrto.find(t => t.estado === "em_progresso");
          if (ortoAtivo) setShowEvolucao(ortoAtivo);
          else setToast({ msg: "Nenhum tratamento ortodôntico em progresso", tipo: "warning" });
        }} variant="secondary" tooltip="Adicionar evolução clínica ao tratamento" />
        <div className="ml-auto">
          <ActionBtn icon={RefreshCw} label="Actualizar" onClick={onRefresh} variant="ghost" />
        </div>
      </ActionBar>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Target} label="Tratamentos Orto" valor={totalOrto} sub={`${emCurso} em curso`} cor="text-orange-400" bg="bg-orange-500/10" border="border-orange-500/20" />
        <KPICard icon={Activity} label="Em Progresso" valor={emCurso} sub="tratamentos activos" cor="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        <KPICard icon={CheckCircle} label="Concluídos" valor={concluidos} sub="finalizados" cor="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <KPICard icon={Euro} label="Investimento" valor={`${simboloMoeda}${valorTotal.toFixed(2)}`} sub="valor total" cor="text-violet-400" bg="bg-violet-500/10" border="border-violet-500/20" />
      </div>

      {tratamentosOrto.length === 0 ? (
        <div className="card-premium border border-[var(--border-primary)]">
          <EmptyState icon={Target} title="Sem tratamentos de ortodontia" subtitle="Os tratamentos ortodônticos do utente aparecerão aqui com acompanhamento detalhado." />
        </div>
      ) : (
        <div className="space-y-4">
          {tratamentosOrto.map(tratamento => {
            const isExpanded = expandedId === tratamento.id;
            const etapas = gerarEtapasOrto(tratamento);
            const etapasConcluidas = etapas.filter(e => e.estado === "concluido").length;
            const progressoTotal = Math.round((etapasConcluidas / etapas.length) * 100);
            const desc = (tratamento.descricao || "").toLowerCase();
            const tipo = desc.includes("alinhador") || desc.includes("invisalign") ? "Alinhadores" : desc.includes("bracket") || desc.includes("aparelho fixo") ? "Brackets" : "Ortodontia";
            const dataInicio = new Date(tratamento.dataInicio);
            const mesesDecorridos = Math.max(1, Math.round((Date.now() - dataInicio.getTime()) / (30 * 86400000)));

            return (
              <div key={tratamento.id} className={`card-premium border transition-all duration-300 ${isExpanded ? "border-orange-500/40 shadow-lg shadow-orange-500/5" : "border-[var(--border-primary)] hover:border-[var(--border-secondary)]"}`}>
                <button onClick={() => setExpandedId(isExpanded ? null : tratamento.id)} className="w-full p-5 text-left">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 border border-orange-500/30 flex items-center justify-center shrink-0">
                      <Target className="w-7 h-7 text-orange-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h4 className="text-[var(--text-primary)] font-bold">{tratamento.descricao}</h4>
                        <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30">{tipo}</span>
                      </div>
                      <div className="flex items-center gap-4 text-[var(--text-muted)] text-xs flex-wrap">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />Início: {formatarData(tratamento.dataInicio)}</span>
                        {tratamento.medicoNome && <span className="flex items-center gap-1"><User className="w-3 h-3" />Dr(a). {tratamento.medicoNome}</span>}
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{mesesDecorridos} mês{mesesDecorridos > 1 ? "es" : ""}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-2">
                      <StatusDropdownTratamento tratamentoId={tratamento.id} estadoActual={tratamento.estado} onSuccess={onRefresh} />
                      <span className="text-[var(--text-primary)] text-lg font-black">{progressoTotal}%</span>
                      <ChevronDown className={`w-4 h-4 text-[var(--text-muted)] transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </div>
                  </div>
                  <div className="mt-4">
                    <ProgressBar valor={progressoTotal} max={100} cor="bg-gradient-to-r from-orange-500 to-amber-500" height="h-3" showLabel={false} />
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[var(--text-muted)] text-[10px]">{etapasConcluidas} de {etapas.length} etapas concluídas</span>
                      {tratamento.valorBruto && parseFloat(tratamento.valorBruto) > 0 && (<span className="text-[var(--text-primary)] text-xs font-bold">{simboloMoeda}{parseFloat(tratamento.valorBruto).toFixed(2)}</span>)}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-5 pb-5 space-y-5 border-t border-[var(--border-primary)] pt-5 animate-in fade-in slide-in-from-top-2 duration-300">
                    {/* Botões inline do tratamento */}
                    {tratamento.estado === "em_progresso" && (
                      <div className="flex items-center gap-2 flex-wrap p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <span className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest mr-2">Acções:</span>
                        <ActionBtn icon={SkipForward} label="Avançar Fase" onClick={() => setToast({ msg: "Fase avançada", tipo: "success" })} variant="success" size="xs" />
                        <ActionBtn icon={CalendarPlus} label="Consulta Controlo" onClick={() => setToast({ msg: "Consulta de controlo agendada", tipo: "success" })} variant="primary" size="xs" />
                        <ActionBtn icon={Edit2} label="Editar Progresso" onClick={() => setToast({ msg: "Progresso actualizado", tipo: "info" })} variant="secondary" size="xs" />
                      </div>
                    )}

                    <div>
                      <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-4">Etapas do Tratamento</p>
                      <div className="space-y-3">
                        {etapas.map((etapa, i) => {
                          const EtapaIcon = etapa.icon;
                          const isCompleted = etapa.estado === "concluido";
                          const isCurrent = etapa.estado === "em_progresso";
                          return (
                            <div key={i} className={`flex items-center gap-4 p-3 rounded-xl border transition-all ${isCurrent ? "bg-orange-500/10 border-orange-500/30 shadow-sm" : isCompleted ? "bg-emerald-500/5 border-emerald-500/20" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] opacity-60"}`}>
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isCurrent ? "bg-orange-500/20 border border-orange-500/30" : isCompleted ? "bg-emerald-500/20 border border-emerald-500/30" : "bg-[var(--bg-tertiary)] border border-[var(--border-primary)]"}`}>
                                {isCompleted ? <CheckCircle className="w-5 h-5 text-emerald-400" /> : isCurrent ? <EtapaIcon className="w-5 h-5 text-orange-400 animate-pulse" /> : <EtapaIcon className="w-5 h-5 text-[var(--text-muted)]" />}
                              </div>
                              <div className="flex-1">
                                <p className={`text-sm font-semibold ${isCurrent ? "text-orange-300" : isCompleted ? "text-emerald-300" : "text-[var(--text-muted)]"}`}>{etapa.nome}</p>
                                <p className="text-[var(--text-muted)] text-[10px]">Etapa {i + 1} de {etapas.length}</p>
                              </div>
                              <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-lg ${isCurrent ? "bg-orange-500/20 text-orange-300" : isCompleted ? "bg-emerald-500/20 text-emerald-300" : "bg-[var(--bg-tertiary)] text-[var(--text-muted)]"}`}>
                                {isCompleted ? "Concluído" : isCurrent ? "Em Curso" : "Pendente"}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {consultasOrto.length > 0 && (
                      <div>
                        <p className="text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest mb-3">Consultas de Controlo</p>
                        <div className="space-y-2">
                          {consultasOrto.slice(0, 5).map(c => (
                            <div key={c.id} className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${new Date(c.dataHoraInicio) > new Date() ? "bg-[#00E5FF]/20 border border-[#00E5FF]/30" : "bg-emerald-500/20 border border-emerald-500/30"}`}>
                                <Calendar className={`w-4 h-4 ${new Date(c.dataHoraInicio) > new Date() ? "text-[#00E5FF]" : "text-emerald-400"}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[var(--text-primary)] text-xs font-semibold">{c.tipoConsulta || "Consulta"}</p>
                                <p className="text-[var(--text-muted)] text-[10px]">{formatarDataHora(c.dataHoraInicio)}</p>
                              </div>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${ESTADO_CONSULTA_COR[c.estado] || "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>{c.estado}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {tratamento.valorBruto && parseFloat(tratamento.valorBruto) > 0 && (
                      <div className="p-4 rounded-xl bg-gradient-to-r from-violet-500/10 to-purple-500/10 border border-violet-500/20">
                        <div className="flex items-center gap-3 mb-3"><Euro className="w-5 h-5 text-violet-400" /><p className="text-[var(--text-primary)] text-sm font-bold">Informação Financeira</p></div>
                        <div className="grid grid-cols-3 gap-4">
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Valor Total</p><p className="text-[var(--text-primary)] text-lg font-black">{simboloMoeda}{parseFloat(tratamento.valorBruto).toFixed(2)}</p></div>
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Duração</p><p className="text-[var(--text-primary)] text-lg font-black">{mesesDecorridos} meses</p></div>
                          <div><p className="text-[var(--text-muted)] text-[9px] uppercase font-bold">Mensal</p><p className="text-[var(--text-primary)] text-lg font-black">{simboloMoeda}{(parseFloat(tratamento.valorBruto) / Math.max(mesesDecorridos, 1)).toFixed(2)}</p></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: IMAGIOLOGIA — Galeria de Imagens + BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabImagiologia({ utenteId, imagens, onRefresh }: { utenteId: number; imagens: any[]; onRefresh: () => void }) {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [lightboxImg, setLightboxImg] = useState<any>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [analisandoIA, setAnalisandoIA] = useState<number | null>(null);

  const eliminarMutation = trpc.imagiologia.eliminar.useMutation({
    onSuccess: () => { onRefresh(); setConfirmDelete(null); setToast({ msg: "Imagem eliminada com sucesso", tipo: "success" }); },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao eliminar"), tipo: "error" }); setConfirmDelete(null); },
  });
  const analisarIAMutation = trpc.iaClinica.analisarImagem.useMutation({
    onSuccess: (data: any) => {
      if (analisandoIA && data.analise) {
        guardarAnaliseMutation.mutate({ imagemId: analisandoIA, analise: data.analise });
      }
    },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro na análise IA"), tipo: "error" }); setAnalisandoIA(null); },
  });
  const guardarAnaliseMutation = trpc.imagiologia.guardarAnalise.useMutation({
    onSuccess: () => { onRefresh(); setAnalisandoIA(null); setToast({ msg: "Análise IA guardada com sucesso", tipo: "success" }); },
    onError: () => { setAnalisandoIA(null); setToast({ msg: "Análise concluída mas erro ao guardar", tipo: "warning" }); },
  });
  const handleAnalisarIA = (img: any) => {
    if (!img.s3Url) { setToast({ msg: "Imagem sem URL para análise", tipo: "warning" }); return; }
    setAnalisandoIA(img.id);
    const base64 = img.s3Url.includes("base64") ? img.s3Url.split(",")[1] || img.s3Url : img.s3Url;
    analisarIAMutation.mutate({ imagemBase64: base64, mimeType: img.mimeType || "image/jpeg", contexto: img.descricao || undefined });
  };

  const imagensFiltradas = useMemo(() => {
    if (filtroTipo === "todos") return imagens;
    return imagens.filter(img => img.tipo === filtroTipo);
  }, [imagens, filtroTipo]);

  const statsPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    imagens.forEach(img => { map.set(img.tipo, (map.get(img.tipo) || 0) + 1); });
    return map;
  }, [imagens]);

  const totalRadiografias = imagens.filter(i => i.tipo.startsWith("radiografia")).length;
  const totalFotografias = imagens.filter(i => i.tipo.startsWith("fotografia")).length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmDialog titulo="Eliminar Imagem" mensagem={`Tem a certeza que pretende eliminar "${confirmDelete.nomeOriginal || "esta imagem"}"? Esta acção é irreversível.`}
          onConfirm={() => eliminarMutation.mutate({ imagemId: confirmDelete.id })}
          onCancel={() => setConfirmDelete(null)} tipo="danger" confirmLabel="Eliminar" />
      )}
      {showUpload && <ModalUploadImagem utenteId={utenteId} onClose={() => setShowUpload(false)} onSuccess={() => { onRefresh(); setToast({ msg: "Imagem carregada com sucesso", tipo: "success" }); }} />}

      {/* Lightbox */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200" onClick={() => setLightboxImg(null)}>
          <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-12 right-0 flex items-center gap-2">
              <button onClick={() => { if (lightboxImg) handleAnalisarIA(lightboxImg); }} className="w-10 h-10 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 flex items-center justify-center text-violet-300 transition-all" title="Analisar com IA">{analisandoIA === lightboxImg?.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}</button>
              <button onClick={() => { if (lightboxImg?.s3Url) { const a = document.createElement("a"); a.href = lightboxImg.s3Url; a.download = lightboxImg.nomeOriginal || "imagem"; a.click(); } }} className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] hover:bg-white/20 flex items-center justify-center text-[var(--text-primary)] transition-all" title="Download"><Download className="w-5 h-5" /></button>
              <button onClick={() => setLightboxImg(null)} className="w-10 h-10 rounded-xl bg-[var(--bg-subtle)] hover:bg-white/20 flex items-center justify-center text-[var(--text-primary)] transition-all"><X className="w-5 h-5" /></button>
            </div>
            <div className="rounded-2xl overflow-hidden border border-[var(--border-light)]">
              <img src={lightboxImg.s3Url} alt={lightboxImg.nomeOriginal || "Imagem"} className="w-full h-auto max-h-[70vh] object-contain bg-black" />
              <div className="p-4 bg-[var(--bg-elevated)] border-t border-[var(--border-light)]">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[var(--text-primary)] font-bold text-sm">{lightboxImg.nomeOriginal || "Sem nome"}</h3>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${TIPOS_IMAGEM_LABEL[lightboxImg.tipo]?.cor || "text-[var(--text-muted)]"} bg-[var(--bg-overlay)] border-[var(--border-light)]`}>
                    {TIPOS_IMAGEM_LABEL[lightboxImg.tipo]?.label || lightboxImg.tipo}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[var(--text-muted)] text-xs">
                  <span>{formatarData(lightboxImg.dataExame || lightboxImg.createdAt)}</span>
                  {lightboxImg.dentesRelacionados && <span>Dentes: {lightboxImg.dentesRelacionados}</span>}
                </div>
                {lightboxImg.descricao && <p className="text-[var(--text-muted)] text-xs mt-2">{lightboxImg.descricao}</p>}
                {lightboxImg.analiseIA && (
                  <div className="mt-3 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                    <p className="text-violet-300 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Análise IA</p>
                    <p className="text-[var(--text-muted)] text-xs">{lightboxImg.analiseIA}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BAR — Imagiologia */}
      <ActionBar cor="from-violet-500/5 to-purple-500/5" borderCor="border-violet-500/20">
        <ActionBtn icon={Upload} label="Upload de Imagem" onClick={() => setShowUpload(true)} variant="primary" tooltip="Carregar nova radiografia ou fotografia" />
        <ActionSep />
        <ActionBtn icon={Trash2} label="Eliminar" onClick={() => {
          if (imagensFiltradas.length > 0) setConfirmDelete(imagensFiltradas[0]);
          else setToast({ msg: "Nenhuma imagem seleccionada", tipo: "warning" });
        }} variant="danger" tooltip="Eliminar imagem seleccionada" />
        <ActionBtn icon={Sparkles} label={analisandoIA ? "A analisar..." : "Analisar com IA"} onClick={() => {
          const semAnalise = imagensFiltradas.find(i => !i.analiseIA && i.s3Url);
          if (semAnalise) handleAnalisarIA(semAnalise);
          else setToast({ msg: "Todas as imagens já têm análise IA", tipo: "info" });
        }} variant="warning" tooltip="Executar análise de IA nas imagens" />
        <ActionBtn icon={Maximize2} label="Lightbox" onClick={() => {
          if (imagensFiltradas.length > 0) setLightboxImg(imagensFiltradas[0]);
          else setToast({ msg: "Sem imagens para visualizar", tipo: "warning" });
        }} variant="secondary" tooltip="Abrir galeria em ecrã inteiro" />
        <div className="ml-auto">
          <ActionBtn icon={RefreshCw} label="Actualizar" onClick={onRefresh} variant="ghost" />
        </div>
      </ActionBar>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Image} label="Total Imagens" valor={imagens.length} sub="no arquivo" cor="text-violet-400" bg="bg-violet-500/10" border="border-violet-500/20" />
        <KPICard icon={Scan} label="Radiografias" valor={totalRadiografias} sub="exames radiológicos" cor="text-blue-400" bg="bg-blue-500/10" border="border-blue-500/20" />
        <KPICard icon={Camera} label="Fotografias" valor={totalFotografias} sub="registos fotográficos" cor="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <KPICard icon={Sparkles} label="Com Análise IA" valor={imagens.filter(i => i.analiseIA).length} sub="analisadas" cor="text-pink-400" bg="bg-pink-500/10" border="border-pink-500/20" />
      </div>

      {/* Filtros e Controles */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1">
          <button onClick={() => setFiltroTipo("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroTipo === "todos" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-[var(--text-muted)]"}`}>
            Todos ({imagens.length})
          </button>
          {Array.from(statsPorTipo.entries()).map(([tipo, count]) => {
            const cfg = TIPOS_IMAGEM_LABEL[tipo];
            return (
              <button key={tipo} onClick={() => setFiltroTipo(tipo === filtroTipo ? "todos" : tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filtroTipo === tipo ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-[var(--text-muted)]"}`}>
                {cfg?.label || tipo} ({count})
              </button>
            );
          })}
        </div>
        <div className="ml-auto flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1">
          <button onClick={() => setViewMode("grid")} className={`p-2 rounded-lg transition-all ${viewMode === "grid" ? "bg-violet-500/20 text-violet-300" : "text-[var(--text-muted)]"}`}><Layers className="w-4 h-4" /></button>
          <button onClick={() => setViewMode("list")} className={`p-2 rounded-lg transition-all ${viewMode === "list" ? "bg-violet-500/20 text-violet-300" : "text-[var(--text-muted)]"}`}><ClipboardList className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Galeria */}
      {imagensFiltradas.length === 0 ? (
        <div className="card-premium border border-[var(--border-primary)]">
          <EmptyState icon={Camera} title="Sem imagens registadas" subtitle="Radiografias, fotografias e outros exames aparecerão aqui."
            action={<ActionBtn icon={Upload} label="Upload de Imagem" onClick={() => setShowUpload(true)} variant="primary" />} />
        </div>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {imagensFiltradas.map(img => {
            const cfg = TIPOS_IMAGEM_LABEL[img.tipo] || TIPOS_IMAGEM_LABEL.outro;
            const Icon = cfg.icon;
            return (
              <button key={img.id} onClick={() => setLightboxImg(img)} className="card-premium border border-[var(--border-primary)] overflow-hidden group hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all text-left">
                <div className="aspect-square bg-[var(--bg-secondary)] relative overflow-hidden">
                  {img.s3Url && !img.s3Url.startsWith("data:") ? (
                    <img src={img.s3Url} alt={img.nomeOriginal} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : img.s3Url?.startsWith("data:image") ? (
                    <img src={img.s3Url} alt={img.nomeOriginal} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Icon className={`w-12 h-12 ${cfg.cor} opacity-40`} /></div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <Maximize2 className="w-5 h-5 text-[var(--text-primary)]" />
                  </div>
                  {img.analiseIA && (
                    <div className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-violet-500/80 flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{img.nomeOriginal || "Sem nome"}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-[9px] font-bold uppercase ${cfg.cor}`}>{cfg.label}</span>
                    <span className="text-[var(--text-muted)] text-[9px]">{formatarData(img.dataExame || img.createdAt)}</span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="divide-y divide-[var(--border-primary)]">
            {imagensFiltradas.map(img => {
              const cfg = TIPOS_IMAGEM_LABEL[img.tipo] || TIPOS_IMAGEM_LABEL.outro;
              const Icon = cfg.icon;
              return (
                <div key={img.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors">
                  <button onClick={() => setLightboxImg(img)} className="w-14 h-14 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden shrink-0">
                    {img.s3Url?.startsWith("data:image") || (img.s3Url && !img.s3Url.startsWith("data:")) ? (
                      <img src={img.s3Url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Icon className={`w-6 h-6 ${cfg.cor} opacity-40`} /></div>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{img.nomeOriginal || "Sem nome"}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className={`text-[10px] font-bold uppercase ${cfg.cor}`}>{cfg.label}</span>
                      <span className="text-[var(--text-muted)] text-[10px]">{formatarData(img.dataExame || img.createdAt)}</span>
                      {img.dentesRelacionados && <span className="text-[var(--text-muted)] text-[10px]">Dentes: {img.dentesRelacionados}</span>}
                    </div>
                    {img.descricao && <p className="text-[var(--text-muted)] text-xs mt-1 line-clamp-1">{img.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {img.analiseIA && <Sparkles className="w-4 h-4 text-violet-400" />}
                    <button onClick={() => setLightboxImg(img)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-violet-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-violet-400 transition-all" title="Ver"><Eye className="w-4 h-4" /></button>
                    <button onClick={() => setConfirmDelete(img)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all" title="Eliminar"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// IMAGIOLOGIA WRAPPER — Usa ImagiologiaAvancada com mutations tRPC
// ═══════════════════════════════════════════════════════════════════════════════
function TabImagiologiaWrapper({ utenteId, imagens, onRefresh }: { utenteId: number; imagens: any[]; onRefresh: () => void }) {
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [analisandoIA, setAnalisandoIA] = useState<number | null>(null);

  const eliminarMutation = trpc.imagiologia.eliminar.useMutation({
    onSuccess: () => { onRefresh(); setConfirmDelete(null); setToast({ msg: "Imagem eliminada com sucesso", tipo: "success" }); },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao eliminar"), tipo: "error" }); setConfirmDelete(null); },
  });
  const analisarIAMutation = trpc.iaClinica.analisarImagem.useMutation({
    onSuccess: (data: any) => {
      if (analisandoIA && data.analise) {
        guardarAnaliseMutation.mutate({ imagemId: analisandoIA, analise: data.analise });
      }
    },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro na análise IA"), tipo: "error" }); setAnalisandoIA(null); },
  });
  const guardarAnaliseMutation = trpc.imagiologia.guardarAnalise.useMutation({
    onSuccess: () => { onRefresh(); setAnalisandoIA(null); setToast({ msg: "Análise IA guardada com sucesso", tipo: "success" }); },
    onError: () => { setAnalisandoIA(null); setToast({ msg: "Análise concluída mas erro ao guardar", tipo: "warning" }); },
  });
  const handleAnalisarIA = (img: any) => {
    if (!img.s3Url) { setToast({ msg: "Imagem sem URL para análise", tipo: "warning" }); return; }
    setAnalisandoIA(img.id);
    const base64 = img.s3Url.includes("base64") ? img.s3Url.split(",")[1] || img.s3Url : img.s3Url;
    analisarIAMutation.mutate({ imagemBase64: base64, mimeType: img.mimeType || "image/jpeg", contexto: img.descricao || undefined });
  };

  return (
    <>
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmDialog titulo="Eliminar Imagem" mensagem={`Tem a certeza que pretende eliminar "${confirmDelete.nomeOriginal || "esta imagem"}"? Esta acção é irreversível.`}
          onConfirm={() => eliminarMutation.mutate({ imagemId: confirmDelete.id })}
          onCancel={() => setConfirmDelete(null)} tipo="danger" confirmLabel="Eliminar" />
      )}
      {showUpload && <ModalUploadImagem utenteId={utenteId} onClose={() => setShowUpload(false)} onSuccess={() => { onRefresh(); setShowUpload(false); setToast({ msg: "Imagem carregada com sucesso", tipo: "success" }); }} />}
      <ImagiologiaAvancada
        utenteId={utenteId}
        imagens={imagens}
        onRefresh={onRefresh}
        onUpload={() => setShowUpload(true)}
        onEliminar={(img) => setConfirmDelete(img)}
        onAnalisarIA={handleAnalisarIA}
        isAnalisando={analisandoIA}
      />
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// DASHBOARD CLÍNICO — Redesenhado com todas as integrações
// ═══════════════════════════════════════════════════════════════════════════════
function DashboardClinico({
  utente, consultas, tratamentos, faturas, anamnese, imagens, enviosLab, odontogramaData, onNavigate, onRefresh, simboloMoeda,
}: {
  utente: any; consultas: any[]; tratamentos: any[]; faturas: any[]; anamnese: any; imagens: any[]; enviosLab: any[];
  odontogramaData?: Record<string, string>;
  onNavigate: (tab: string, filter?: string) => void; onRefresh: () => void; simboloMoeda: string;
}) {
  const totalFaturado = faturas.filter((f: any) => f.estado !== "anulada").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
  const totalPago = faturas.filter((f: any) => f.estado === "paga").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
  const divida = totalFaturado - totalPago;
  const tratamentosAtivos = tratamentos.filter((t: any) => t.estado === "em_progresso" || t.estado === "proposto");
  const proximasConsultas = consultas.filter((c: any) => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada").sort((a: any, b: any) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime()).slice(0, 3);
  const ultimaConsulta = consultas.filter((c: any) => c.estado === "realizada").sort((a: any, b: any) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0];
  const temAlertas = anamnese?.alergiasDetectadas || anamnese?.problemasSaude;
  const enviosLabAtivos = enviosLab.filter((e: any) => !["concluido", "cancelado"].includes(e.estado));
  const tratamentosOrto = tratamentos.filter((t: any) => {
    const desc = (t.descricao || "").toLowerCase();
    return desc.includes("ortod") || desc.includes("alinhador") || desc.includes("bracket");
  });
  const especialidadesActivas = useMemo(() => {
    const map = new Map<string, { count: number; valor: number }>();
    tratamentos.forEach((t: any) => {
      const esp = inferirEspecialidade(t.descricao);
      const cur = map.get(esp) || { count: 0, valor: 0 };
      map.set(esp, { count: cur.count + 1, valor: cur.valor + parseFloat(t.valorBruto || "0") });
    });
    return Array.from(map.entries()).sort((a, b) => b[1].count - a[1].count);
  }, [tratamentos]);

  // ─── Health Score (Insights) ─────────────────────────────────────────────
  const odontoData = odontogramaData || {};
  const healthAnalysis = useMemo(() => {
    let score = 50;
    const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
    const consultasRecentes = consultas.filter(c => c.estado === "realizada" && new Date(c.dataHoraInicio) > seisAtras).length;
    score += consultasRecentes >= 2 ? 15 : consultasRecentes === 1 ? 10 : 0;
    const futuras = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada").length;
    score += futuras > 0 ? 10 : 0;
    const concluidos = tratamentos.filter(t => t.estado === "concluido").length;
    score += Math.min(concluidos * 3, 10);
    const tresAtras = new Date(); tresAtras.setMonth(tresAtras.getMonth() - 3);
    const pendentesAntigos = tratamentos.filter(t => (t.estado === "pendente" || t.estado === "proposto") && new Date(t.dataInicio) < tresAtras).length;
    score += pendentesAntigos > 0 ? -10 : 5;
    score += anamnese ? 5 : -5;
    if (anamnese?.alergiasDetectadas) score -= 5;
    if (anamnese?.problemasSaude) score -= 5;
    const dividaVal = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    score += dividaVal === 0 ? 5 : -5;
    const temPanoramica = imagens.some(i => (i.tipo || "").includes("panoramica"));
    const temFotos = imagens.some(i => (i.tipo || "").includes("fotografia"));
    score += (temPanoramica ? 3 : 0) + (temFotos ? 2 : 0);
    const dentesComProblema = Object.values(odontoData).filter(v => v && v !== "saudavel" && v !== "tratado" && v !== "restauracao").length;
    score += dentesComProblema === 0 ? 5 : dentesComProblema <= 3 ? 0 : -5;
    return Math.max(0, Math.min(100, score));
  }, [consultas, tratamentos, faturas, anamnese, imagens, odontoData]);

  // ─── Alertas Automáticos (Insights) ──────────────────────────────────────
  const insightAlertas = useMemo(() => {
    const lista: { id: string; tipo: "critico" | "aviso" | "info" | "sucesso"; titulo: string; descricao: string; icon: React.ComponentType<any>; accao?: string; accaoTab?: string }[] = [];
    const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
    const ultConsulta = consultas.filter(c => c.estado === "realizada").sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0];
    if (!ultConsulta || new Date(ultConsulta.dataHoraInicio) < seisAtras) {
      lista.push({ id: "sem_consulta_recente", tipo: "aviso", titulo: "Sem consulta recente", descricao: ultConsulta ? `Última consulta há ${Math.round((Date.now() - new Date(ultConsulta.dataHoraInicio).getTime()) / (30 * 86400000))} meses` : "Nenhuma consulta realizada", icon: Calendar, accao: "Agendar consulta", accaoTab: "consultas" });
    }
    const pendentes = tratamentos.filter(t => t.estado === "pendente" || t.estado === "proposto");
    if (pendentes.length > 0) {
      lista.push({ id: "tratamentos_pendentes", tipo: "aviso", titulo: `${pendentes.length} tratamento(s) pendente(s)`, descricao: "Existem tratamentos propostos que aguardam início", icon: Stethoscope, accao: "Ver tratamentos", accaoTab: "tratamentos" });
    }
    const dividaInsight = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    if (dividaInsight > 0) {
      lista.push({ id: "divida", tipo: "critico", titulo: `Dívida pendente: ${dividaInsight.toFixed(2)}€`, descricao: `${faturas.filter(f => f.estado === "pendente").length} fatura(s) por pagar`, icon: Wallet, accao: "Ver pagamentos", accaoTab: "pagamentos" });
    }
    if (!anamnese) {
      lista.push({ id: "sem_anamnese", tipo: "aviso", titulo: "Anamnese não preenchida", descricao: "É importante ter a anamnese actualizada para segurança clínica", icon: FileText, accao: "Preencher anamnese", accaoTab: "saude" });
    }
    if (anamnese?.alergiasDetectadas) {
      lista.push({ id: "alergias", tipo: "critico", titulo: "Alergias detectadas", descricao: "Verificar alergias antes de qualquer procedimento", icon: AlertTriangle, accao: "Ver saúde", accaoTab: "saude" });
    }
    if (!imagens.some(i => (i.tipo || "").includes("panoramica"))) {
      lista.push({ id: "sem_panoramica", tipo: "info", titulo: "Sem radiografia panorâmica", descricao: "Recomenda-se panorâmica para avaliação geral", icon: Camera, accao: "Ver imagiologia", accaoTab: "imagens" });
    }
    const dentesProblema = Object.entries(odontoData).filter(([_, v]) => v === "carie" || v === "extracao_indicada" || v === "endodontia" || v === "protese");
    if (dentesProblema.length > 0) {
      lista.push({ id: "dentes_problema", tipo: "aviso", titulo: `${dentesProblema.length} dente(s) necessitam atenção`, descricao: `Dentes: ${dentesProblema.map(([k]) => k).join(", ")}`, icon: Smile, accao: "Ver odontograma", accaoTab: "odontograma" });
    }
    const emProgresso = tratamentos.filter(t => t.estado === "em_progresso").length;
    if (emProgresso > 0) {
      lista.push({ id: "em_progresso", tipo: "sucesso", titulo: `${emProgresso} tratamento(s) em progresso`, descricao: "Tratamentos activos a decorrer normalmente", icon: Activity });
    }
    const futurasC = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada");
    if (futurasC.length === 0 && tratamentos.some(t => t.estado === "em_progresso")) {
      lista.push({ id: "sem_proxima", tipo: "aviso", titulo: "Sem próxima consulta agendada", descricao: "Existem tratamentos activos mas sem consulta de acompanhamento", icon: Bell, accao: "Agendar", accaoTab: "consultas" });
    }
    return lista.sort((a, b) => {
      const prioridade = { critico: 0, aviso: 1, info: 2, sucesso: 3 };
      return prioridade[a.tipo] - prioridade[b.tipo];
    });
  }, [consultas, tratamentos, faturas, anamnese, imagens, odontoData]);

  // ─── Recomendações (Insights) ───────────────────────────────────────────
  const insightRecomendacoes = useMemo(() => {
    const lista: { id: string; prioridade: "alta" | "media" | "baixa"; titulo: string; descricao: string; icon: React.ComponentType<any>; cor: string }[] = [];
    const ultimaLimpeza = consultas.filter(c => c.estado === "realizada" && ((c.tipoConsulta || "").toLowerCase().includes("limpeza") || (c.tipoConsulta || "").toLowerCase().includes("higien"))).sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0];
    if (!ultimaLimpeza || (Date.now() - new Date(ultimaLimpeza.dataHoraInicio).getTime()) > 180 * 86400000) {
      lista.push({ id: "limpeza", prioridade: "media", titulo: "Agendar destartarização", descricao: "Recomenda-se limpeza profissional a cada 6 meses", icon: Sparkles, cor: "text-cyan-400" });
    }
    const ultimaPanoramica = imagens.filter(i => (i.tipo || "").includes("panoramica")).sort((a, b) => new Date(b.dataExame || b.createdAt).getTime() - new Date(a.dataExame || a.createdAt).getTime())[0];
    if (!ultimaPanoramica || (Date.now() - new Date(ultimaPanoramica.dataExame || ultimaPanoramica.createdAt).getTime()) > 365 * 86400000) {
      lista.push({ id: "panoramica", prioridade: "baixa", titulo: "Actualizar radiografia panorâmica", descricao: "Panorâmica anual para monitorização geral", icon: Camera, cor: "text-violet-400" });
    }
    const caries = Object.entries(odontoData).filter(([_, v]) => v === "carie");
    if (caries.length > 0) {
      lista.push({ id: "tratar_caries", prioridade: "alta", titulo: `Tratar ${caries.length} cárie(s)`, descricao: `Dentes ${caries.map(([k]) => k).join(", ")} necessitam restauração`, icon: AlertTriangle, cor: "text-red-400" });
    }
    if (imagens.length < 3) {
      lista.push({ id: "documentacao", prioridade: "baixa", titulo: "Completar documentação fotográfica", descricao: "Fotografias intraorais e extraorais para registo completo", icon: Camera, cor: "text-emerald-400" });
    }
    if (anamnese) {
      const dataAnamnese = new Date(anamnese.updatedAt || anamnese.createdAt);
      if ((Date.now() - dataAnamnese.getTime()) > 365 * 86400000) {
        lista.push({ id: "actualizar_anamnese", prioridade: "media", titulo: "Actualizar anamnese", descricao: "Anamnese com mais de 1 ano — verificar alterações de saúde", icon: Heart, cor: "text-pink-400" });
      }
    }
    return lista.sort((a, b) => {
      const p = { alta: 0, media: 1, baixa: 2 };
      return p[a.prioridade] - p[b.prioridade];
    });
  }, [consultas, imagens, odontoData, anamnese]);

  const alertaCores: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
    critico: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", iconBg: "bg-red-500/20" },
    aviso: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", iconBg: "bg-amber-500/20" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", iconBg: "bg-blue-500/20" },
    sucesso: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  };

  const alertasCriticos = insightAlertas.filter(a => a.tipo === "critico");
  const alertasOutros = insightAlertas.filter(a => a.tipo !== "critico");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Health Score Compacto + Alertas Críticos ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4">
        {/* Health Score Mini */}
        <div className="card-premium p-5 border border-[var(--border-primary)] flex items-center gap-5 lg:min-w-[280px]">
          <div className="relative w-20 h-20 shrink-0">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-secondary)" strokeWidth="8" />
              <circle cx="50" cy="50" r="42" fill="none"
                stroke={healthAnalysis >= 80 ? "#34D399" : healthAnalysis >= 50 ? "#FBBF24" : "#F87171"}
                strokeWidth="8" strokeLinecap="round"
                strokeDasharray={`${(healthAnalysis / 100) * 264} 264`}
                className="transition-all duration-1000" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-xl font-black ${healthAnalysis >= 80 ? "text-emerald-400" : healthAnalysis >= 50 ? "text-amber-400" : "text-red-400"}`}>
                {healthAnalysis}
              </span>
              <span className="text-[var(--text-muted)] text-[8px] font-bold uppercase">Score</span>
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-4 h-4 text-pink-400" />
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Saúde Oral</h3>
            </div>
            <p className={`text-sm font-bold ${healthAnalysis >= 80 ? "text-emerald-400" : healthAnalysis >= 60 ? "text-amber-400" : healthAnalysis >= 40 ? "text-amber-400" : "text-red-400"}`}>
              {healthAnalysis >= 80 ? "Excelente" : healthAnalysis >= 60 ? "Bom" : healthAnalysis >= 40 ? "Regular" : "Atenção Necessária"}
            </p>
            <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
              {insightAlertas.filter(a => a.tipo === "critico").length > 0
                ? `${insightAlertas.filter(a => a.tipo === "critico").length} alerta(s) crítico(s)`
                : insightAlertas.filter(a => a.tipo === "aviso").length > 0
                  ? `${insightAlertas.filter(a => a.tipo === "aviso").length} aviso(s) activo(s)`
                  : "Sem alertas activos"}
            </p>
            <button onClick={() => onNavigate("insights")} className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-pink-400 hover:text-pink-300 transition-colors">
              Ver insights completos <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Alertas Críticos (sempre visíveis no topo) */}
        {alertasCriticos.length > 0 && (
          <div className="flex flex-col gap-3 justify-center">
            {alertasCriticos.map(alerta => {
              const cores = alertaCores[alerta.tipo];
              const Icon = alerta.icon;
              return (
                <div key={alerta.id} className={`p-4 rounded-xl border ${cores.bg} ${cores.border} transition-all hover:scale-[1.005]`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cores.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cores.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${cores.text}`}>{alerta.titulo}</p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">{alerta.descricao}</p>
                    </div>
                    {alerta.accao && alerta.accaoTab && (
                      <button onClick={() => onNavigate(alerta.accaoTab!)}
                        className={`shrink-0 inline-flex items-center gap-1 text-[10px] font-bold ${cores.text} hover:underline whitespace-nowrap`}>
                        {alerta.accao} <ChevronRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {alertasCriticos.length === 0 && temAlertas && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex gap-3 items-center">
            <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-400" /></div>
            <div className="flex-1">
              <p className="text-red-300 text-sm font-bold mb-1">Alertas Clínicos Ativos</p>
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                {anamnese?.alergiasDetectadas && <p className="text-red-200/80 text-xs"><strong>Alergias:</strong> {anamnese.alergiasDetectadas}</p>}
                {anamnese?.problemasSaude && <p className="text-red-200/80 text-xs"><strong>Condições:</strong> {anamnese.problemasSaude}</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─── Alertas e Notificações (avisos, info, sucesso) ─── */}
      {alertasOutros.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Alertas e Notificações</h3>
            <span className="text-[var(--text-muted)] text-[10px]">({insightAlertas.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {alertasOutros.map(alerta => {
              const cores = alertaCores[alerta.tipo];
              const Icon = alerta.icon;
              return (
                <div key={alerta.id} className={`p-3.5 rounded-xl border ${cores.bg} ${cores.border} transition-all hover:scale-[1.01]`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg ${cores.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-3.5 h-3.5 ${cores.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-bold ${cores.text}`}>{alerta.titulo}</p>
                      <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{alerta.descricao}</p>
                      {alerta.accao && alerta.accaoTab && (
                        <button onClick={() => onNavigate(alerta.accaoTab!)}
                          className={`mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold ${cores.text} hover:underline`}>
                          {alerta.accao} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Recomendações Rápidas ─── */}
      {insightRecomendacoes.length > 0 && (
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Recomendações</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {insightRecomendacoes.slice(0, 4).map(rec => {
              const Icon = rec.icon;
              const prioridadeCor = rec.prioridade === "alta" ? "bg-red-500/10 text-red-300 border-red-500/20" : rec.prioridade === "media" ? "bg-amber-500/10 text-amber-300 border-amber-500/20" : "bg-blue-500/10 text-blue-300 border-blue-500/20";
              return (
                <div key={rec.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${prioridadeCor} transition-all hover:scale-[1.02]`}>
                  <Icon className={`w-3.5 h-3.5 ${rec.cor}`} />
                  <div className="min-w-0">
                    <p className="text-[var(--text-primary)] text-xs font-semibold">{rec.titulo}</p>
                    <p className="text-[var(--text-muted)] text-[9px]">{rec.descricao}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Calendar} label="Consultas" valor={consultas.length} sub={`${consultas.filter((c: any) => c.estado === "realizada").length} realizadas`} cor="text-[#00E5FF]" bg="bg-[#00E5FF]/10" border="border-[#00E5FF]/20" onClick={() => onNavigate("consultas")} />
        <KPICard icon={Stethoscope} label="Tratamentos" valor={tratamentos.length} sub={`${tratamentosAtivos.length} em curso`} cor="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" onClick={() => onNavigate("tratamentos")} />
        <KPICard icon={Wallet} label="Pagamentos" valor={`${simboloMoeda}${totalPago.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`} sub={divida > 0 ? `${simboloMoeda}${divida.toFixed(2)} em dívida` : "Sem dívidas"} cor={divida > 0 ? "text-red-400" : "text-emerald-400"} bg={divida > 0 ? "bg-red-500/10" : "bg-emerald-500/10"} border={divida > 0 ? "border-red-500/20" : "border-emerald-500/20"} onClick={() => onNavigate("pagamentos")} />
        <KPICard icon={Image} label="Imagens" valor={imagens.length} sub="radiografias/fotos" cor="text-violet-400" bg="bg-violet-500/10" border="border-violet-500/20" onClick={() => onNavigate("imagens")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 card-premium p-5 border border-[var(--border-primary)]">
          <SectionHeader icon={Calendar} title="Próximas Consultas" cor="text-[#00E5FF]">
            <button onClick={() => onNavigate("consultas")} className="text-[#00E5FF] text-xs font-semibold hover:text-[#00E5FF] transition-colors flex items-center gap-1">Ver todas <ChevronRight className="w-3 h-3" /></button>
          </SectionHeader>
          {proximasConsultas.length === 0 ? (
            <p className="text-[var(--text-muted)] text-xs text-center py-6">Sem consultas futuras agendadas</p>
          ) : (
            <div className="space-y-3">
              {proximasConsultas.map((c: any, i: number) => (
                <div key={c.id} onClick={() => onNavigate("consultas")} className="flex items-center gap-4 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${i === 0 ? "bg-[#00E5FF]/20 border border-[#00E5FF]/30" : "bg-[var(--bg-secondary)] border border-[var(--border-primary)]"}`}>
                    <Calendar className={`w-4 h-4 ${i === 0 ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">{c.tipoConsulta ?? "Consulta"}</p>
                      {i === 0 && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">Próxima</span>}
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">{formatarDataHora(c.dataHoraInicio)}</p>
                    {c.medicoNome && <p className="text-[var(--text-muted)] text-xs">Dr(a). {c.medicoNome}</p>}
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-xs font-bold ${i === 0 ? "text-[#00E5FF]" : "text-[var(--text-secondary)]"}`}>{tempoAte(c.dataHoraInicio)}</p>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border inline-block mt-1 ${ESTADO_CONSULTA_COR[c.estado] ?? "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>{c.estado}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card-premium p-5 border border-[var(--border-primary)]">
            <SectionHeader icon={Clock} title="Última Consulta" cor="text-violet-400" />
            {ultimaConsulta ? (
              <div className="space-y-2">
                <p className="text-[var(--text-primary)] text-sm font-semibold">{ultimaConsulta.tipoConsulta ?? "Consulta"}</p>
                <p className="text-[var(--text-muted)] text-xs">{formatarDataHora(ultimaConsulta.dataHoraInicio)}</p>
                {ultimaConsulta.medicoNome && <p className="text-[var(--text-muted)] text-xs">Dr(a). {ultimaConsulta.medicoNome}</p>}
                {ultimaConsulta.observacoes && (<p className="text-[var(--text-secondary)] text-xs italic bg-[var(--bg-secondary)] p-2 rounded-lg border border-[var(--border-primary)] mt-2">"{ultimaConsulta.observacoes}"</p>)}
              </div>
            ) : (<p className="text-[var(--text-muted)] text-xs text-center py-4">Sem consultas realizadas</p>)}
          </div>

          <button onClick={() => onNavigate("pagamentos")} className="w-full card-premium p-5 border border-[var(--border-primary)] text-left hover:border-[var(--border-secondary)] transition-colors group">
            <SectionHeader icon={Euro} title="Resumo Financeiro" cor="text-emerald-400">
              <ArrowUpRight className="w-3 h-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
            </SectionHeader>
            <div className="space-y-3">
              {[
                { label: "Total Faturado", valor: `${simboloMoeda}${totalFaturado.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, cor: "text-[var(--text-primary)]" },
                { label: "Total Pago", valor: `${simboloMoeda}${totalPago.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, cor: "text-emerald-400" },
                { label: "Saldo em Dívida", valor: `${simboloMoeda}${divida.toLocaleString("pt-PT", { minimumFractionDigits: 2 })}`, cor: divida > 0 ? "text-red-400" : "text-emerald-400" },
              ].map(({ label, valor, cor }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-[var(--text-secondary)] text-xs">{label}</span>
                  <span className={`text-sm font-bold ${cor}`}>{valor}</span>
                </div>
              ))}
              {totalFaturado > 0 && (
                <div className="mt-2 pt-2 border-t border-[var(--border-primary)]">
                  <ProgressBar valor={totalPago} max={totalFaturado} cor="bg-emerald-500" height="h-1.5" showLabel={false} />
                  <p className="text-[var(--text-muted)] text-[10px] mt-1">{Math.round((totalPago / totalFaturado) * 100)}% pago</p>
                </div>
              )}
            </div>
          </button>
        </div>
      </div>

      {enviosLabAtivos.length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <SectionHeader icon={Package} title={`Laboratório — ${enviosLabAtivos.length} Envio${enviosLabAtivos.length > 1 ? "s" : ""} Ativo${enviosLabAtivos.length > 1 ? "s" : ""}`} cor="text-blue-400" />
            <button onClick={() => onNavigate("laboratorio")} className="text-blue-400 text-xs font-semibold hover:text-blue-300 transition-colors flex items-center gap-1">Ver todos <ChevronRight className="w-3 h-3" /></button>
          </div>
          {/* Alerta de materiais urgentes/atrasados */}
          {enviosLabAtivos.some((e: any) => {
            const dias = e.dataPrevistaDevolucao ? Math.ceil((new Date(e.dataPrevistaDevolucao).getTime() - Date.now()) / 86400000) : null;
            return (dias !== null && dias < 0) || e.prioridade === "muito_urgente";
          }) && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <div className="flex-1">
                <p className="text-red-300 text-xs font-bold">Atenção: Envios atrasados ou muito urgentes</p>
                <p className="text-red-200/70 text-[10px] mt-0.5">
                  {enviosLabAtivos.filter((e: any) => {
                    const dias = e.dataPrevistaDevolucao ? Math.ceil((new Date(e.dataPrevistaDevolucao).getTime() - Date.now()) / 86400000) : null;
                    return dias !== null && dias < 0;
                  }).length} atrasado(s) · {enviosLabAtivos.filter((e: any) => e.prioridade === "muito_urgente").length} muito urgente(s)
                </p>
              </div>
              <button onClick={() => onNavigate("laboratorio")} className="text-red-400 text-[10px] font-bold hover:text-red-300 transition-colors whitespace-nowrap">Ver agora</button>
            </div>
          )}
          {/* Alerta de envios prontos a devolver */}
          {enviosLabAtivos.some((e: any) => e.estado === "pronto" || e.estado === "devolvido") && (
            <div className="mx-5 mt-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <PackageCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <div className="flex-1">
                <p className="text-emerald-300 text-xs font-bold">Trabalho(s) prontos para recolha</p>
                <p className="text-emerald-200/70 text-[10px] mt-0.5">
                  {enviosLabAtivos.filter((e: any) => e.estado === "pronto").length} pronto(s) no lab · {enviosLabAtivos.filter((e: any) => e.estado === "devolvido").length} devolvido(s) para receber
                </p>
              </div>
              <button onClick={() => onNavigate("laboratorio")} className="text-emerald-400 text-[10px] font-bold hover:text-emerald-300 transition-colors whitespace-nowrap">Confirmar</button>
            </div>
          )}
          <div className="divide-y divide-[var(--border-primary)]">
            {enviosLabAtivos.slice(0, 3).map((envio: any) => {
              const stepAtual = LAB_WORKFLOW_STEPS.find(s => s.key === envio.estado);
              const StepIcon = stepAtual?.icon || Package;
              const ordem = ["criado", "enviado", "recebido_lab", "em_producao", "pronto", "devolvido", "em_prova", "concluido"];
              const progresso = envio.estado === "cancelado" ? 0 : envio.estado === "ajuste" ? 50 : Math.round(((ordem.indexOf(envio.estado) + 1) / ordem.length) * 100);
              const diasRestantes = envio.dataPrevistaDevolucao ? Math.ceil((new Date(envio.dataPrevistaDevolucao).getTime() - Date.now()) / 86400000) : null;
              const prioridadeCfg = LAB_PRIORIDADE_COR[envio.prioridade] || LAB_PRIORIDADE_COR.normal;
              return (
                <div key={envio.id} onClick={() => onNavigate("laboratorio")} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                  <div className={`w-10 h-10 rounded-xl ${stepAtual?.bg || "bg-[var(--bg-surface)]"} border border-[var(--border-primary)] flex items-center justify-center shrink-0`}>
                    <StepIcon className={`w-5 h-5 ${stepAtual?.cor || "text-[var(--text-muted)]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[var(--text-primary)] text-sm font-semibold truncate flex-1">{envio.tipoTrabalho}</p>
                      {envio.prioridade !== "normal" && (
                        <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full border ${prioridadeCfg.bg} ${prioridadeCfg.text} ${prioridadeCfg.border}`}>{prioridadeCfg.label}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[10px] font-bold ${stepAtual?.cor || "text-[var(--text-muted)]"}`}>{stepAtual?.label || envio.estado}</span>
                      <div className="flex-1 h-1 bg-[var(--bg-tertiary)] rounded-full overflow-hidden max-w-[80px]"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${progresso}%` }} /></div>
                      <span className="text-[var(--text-muted)] text-[10px]">{progresso}%</span>
                      {diasRestantes !== null && (
                        <span className={`text-[10px] font-semibold flex items-center gap-0.5 ${diasRestantes < 0 ? "text-red-400" : diasRestantes <= 2 ? "text-amber-400" : "text-[var(--text-muted)]"}`}>
                          <Timer className="w-3 h-3" />
                          {diasRestantes < 0 ? `${Math.abs(diasRestantes)}d atraso` : diasRestantes === 0 ? "Hoje" : `${diasRestantes}d`}
                        </span>
                      )}
                    </div>
                    {envio.laboratorioNome && (
                      <p className="text-[var(--text-muted)] text-[10px] mt-0.5 flex items-center gap-1">
                        <Factory className="w-3 h-3" />{envio.laboratorioNome}
                        {envio.dente && <span className="ml-1">· Dente {envio.dente}</span>}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--text-muted)] shrink-0" />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tratamentosOrto.filter(t => t.estado === "em_progresso").length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <SectionHeader icon={Target} title="Ortodontia em Curso" cor="text-orange-400" />
            <button onClick={() => onNavigate("ortodontia")} className="text-orange-400 text-xs font-semibold hover:text-orange-300 transition-colors flex items-center gap-1">Ver detalhes <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {tratamentosOrto.filter(t => t.estado === "em_progresso").slice(0, 2).map(t => (
              <div key={t.id} onClick={() => onNavigate("ortodontia")} className="p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <div className="flex items-center gap-3 mb-2">
                  <Target className="w-5 h-5 text-orange-400" />
                  <p className="text-[var(--text-primary)] text-sm font-semibold flex-1">{t.descricao}</p>
                  <StatusDropdownTratamento tratamentoId={t.id} estadoActual={t.estado} onSuccess={onRefresh} />
                </div>
                <ProgressBar valor={50} max={100} cor="bg-gradient-to-r from-orange-500 to-amber-500" height="h-2" showLabel={false} />
              </div>
            ))}
          </div>
        </div>
      )}

      {tratamentosAtivos.length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
            <SectionHeader icon={Stethoscope} title="Tratamentos em Curso" cor="text-amber-400" />
            <button onClick={() => onNavigate("tratamentos")} className="text-amber-400 text-xs font-semibold hover:text-amber-300 transition-colors flex items-center gap-1">Ver todos <ChevronRight className="w-3 h-3" /></button>
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {tratamentosAtivos.slice(0, 5).map((t: any) => (
              <div key={t.id} onClick={() => onNavigate("tratamentos")} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0"><Stethoscope className="w-4 h-4 text-amber-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{t.descricao}</p>
                  <p className="text-[var(--text-muted)] text-xs">Iniciado: {formatarData(t.dataInicio)}{t.medicoNome ? ` · Dr(a). ${t.medicoNome}` : ""}</p>
                </div>
                <div className="text-right shrink-0 flex flex-col items-end gap-1">
                  {t.valorBruto && parseFloat(t.valorBruto) > 0 && (<p className="text-[var(--text-primary)] text-sm font-bold">{simboloMoeda}{parseFloat(t.valorBruto).toLocaleString("pt-PT", { minimumFractionDigits: 2 })}</p>)}
                  <StatusDropdownTratamento tratamentoId={t.id} estadoActual={t.estado} onSuccess={onRefresh} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {especialidadesActivas.length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)]"><SectionHeader icon={Sparkles} title="Especialidades do Utente" cor="text-[#00E5FF]" /></div>
          <div className="p-4 grid grid-cols-2 lg:grid-cols-4 gap-3">
            {especialidadesActivas.slice(0, 4).map(([nome, dados]) => {
              const cfg = getEspecialidadeConfig(nome);
              const Icon = cfg.icon;
              return (
                <button key={nome} onClick={() => onNavigate("tratamentos")} className={`p-4 rounded-xl ${cfg.bg} border ${cfg.border} hover:scale-[1.03] transition-all text-left`}>
                  <Icon className={`w-5 h-5 ${cfg.cor} mb-2`} />
                  <p className={`text-sm font-bold ${cfg.cor}`}>{nome}</p>
                  <p className="text-[var(--text-muted)] text-[10px] mt-1">{dados.count} tratamento{dados.count > 1 ? "s" : ""}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Odontograma — Resumo Visual ─── */}
      <div className="card-premium border border-[var(--border-primary)]">
        <div className="p-5 border-b border-[var(--border-primary)] flex items-center justify-between">
          <SectionHeader icon={Smile} title="Odontograma — Resumo" cor="text-cyan-400" />
          <button onClick={() => onNavigate("odontograma")} className="text-[#00E5FF] text-xs font-semibold hover:text-cyan-300 transition-colors flex items-center gap-1">
            Editar <ChevronRight className="w-3 h-3" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {/* Arcada Superior */}
          <div className="flex flex-wrap gap-1 justify-center">
            {[18,17,16,15,14,13,12,11,21,22,23,24,25,26,27,28].map(n => {
              const estadoKey = odontoData[String(n)];
              const est = estadoKey ? ESTADOS_DENTE[estadoKey] : null;
              return (
                <button key={n} onClick={() => onNavigate("odontograma")}
                  title={`Dente ${n}${est ? ` — ${est.label}` : " — Saudável"}`}
                  className={`w-9 h-9 rounded-lg border text-[10px] font-bold transition-all hover:scale-110 ${
                    est ? `${est.bg} ${est.border} ${est.text}` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#00E5FF]/40"
                  }`}>{n}</button>
              );
            })}
          </div>
          <div className="h-px bg-[var(--border-primary)]" />
          {/* Arcada Inferior */}
          <div className="flex flex-wrap gap-1 justify-center">
            {[48,47,46,45,44,43,42,41,31,32,33,34,35,36,37,38].map(n => {
              const estadoKey = odontoData[String(n)];
              const est = estadoKey ? ESTADOS_DENTE[estadoKey] : null;
              return (
                <button key={n} onClick={() => onNavigate("odontograma")}
                  title={`Dente ${n}${est ? ` — ${est.label}` : " — Saudável"}`}
                  className={`w-9 h-9 rounded-lg border text-[10px] font-bold transition-all hover:scale-110 ${
                    est ? `${est.bg} ${est.border} ${est.text}` : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[#00E5FF]/40"
                  }`}>{n}</button>
              );
            })}
          </div>
          {/* Legenda dos estados presentes */}
          {Object.keys(odontoData).length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(ESTADOS_DENTE)
                .filter(([k]) => Object.values(odontoData).includes(k) && k !== "saudavel")
                .map(([k, cfg]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${cfg.text.replace("text-", "bg-")}`} />
                    <span className="text-[10px] text-[var(--text-muted)]">
                      {cfg.label}: {Object.values(odontoData).filter(v => v === k).length}
                    </span>
                  </div>
                ))}
            </div>
          )}
          {Object.keys(odontoData).length === 0 && (
            <p className="text-[var(--text-muted)] text-xs text-center py-2">Sem dados de odontograma. Clique em "Editar" para preencher.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: TRATAMENTOS — Com filtros, integração e BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabTratamentos({
  tratamentos, faturas, utenteId, onNavigate, simboloMoeda, onRefresh,
}: {
  tratamentos: any[]; faturas: any[]; utenteId: number; onNavigate: (tab: string, filter?: string) => void;
  simboloMoeda: string; onRefresh: () => void;
}) {
  const [showModal, setShowModal] = useState(false);
  const [filtroEsp, setFiltroEsp] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<any>(null);
  const [showEvolucao, setShowEvolucao] = useState<any>(null);

  const especialidadesPresentes = useMemo(() => {
    const set = new Set<string>();
    tratamentos.forEach((t: any) => set.add(inferirEspecialidade(t.descricao)));
    return Array.from(set);
  }, [tratamentos]);

  const tratamentosFiltrados = useMemo(() => {
    let resultado = [...tratamentos];
    if (filtroEstado !== "todos") resultado = resultado.filter(t => t.estado === filtroEstado);
    if (filtroEsp !== "todos") resultado = resultado.filter(t => inferirEspecialidade(t.descricao) === filtroEsp);
    return resultado.sort((a, b) => new Date(b.dataInicio).getTime() - new Date(a.dataInicio).getTime());
  }, [tratamentos, filtroEstado, filtroEsp]);

  const eliminarMutation = trpc.tratamentos.eliminarTratamento.useMutation({
    onSuccess: () => { onRefresh(); setToast({ msg: "Tratamento eliminado", tipo: "success" }); setConfirmDelete(null); },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao eliminar"), tipo: "error" }); setConfirmDelete(null); },
  });

  const handleEliminar = () => {
    if (confirmDelete) {
      eliminarMutation.mutate({ id: confirmDelete.id });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {showModal && <ModalCriarTratamento utenteId={utenteId} onClose={() => setShowModal(false)} onSuccess={onRefresh} />}
      {showEvolucao && <ModalAdicionarEvolucao tratamento={showEvolucao} onClose={() => setShowEvolucao(null)} onSuccess={onRefresh} />}
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {confirmDelete && (
        <ConfirmDialog titulo="Eliminar Tratamento" mensagem={`Tem a certeza que pretende eliminar "${confirmDelete.descricao}"? Esta acção não pode ser revertida.`}
          onConfirm={handleEliminar} onCancel={() => setConfirmDelete(null)} tipo="danger" confirmLabel="Eliminar" />
      )}

      {/* ACTION BAR — Tratamentos */}
      <ActionBar cor="from-amber-500/5 to-orange-500/5" borderCor="border-amber-500/20">
        <ActionBtn icon={Plus} label="Novo Tratamento" onClick={() => setShowModal(true)} variant="primary" tooltip="Criar novo tratamento com faturação automática" />
        <ActionSep />
        <ActionBtn icon={Edit2} label="Editar Estado" onClick={() => setToast({ msg: "Selecione um tratamento na tabela para alterar o estado", tipo: "info" })} variant="secondary" tooltip="Alterar o estado do tratamento selecionado" />
        <ActionBtn icon={Trash2} label="Eliminar" onClick={() => {
          if (tratamentosFiltrados.length > 0) setConfirmDelete(tratamentosFiltrados[0]);
          else setToast({ msg: "Nenhum tratamento para eliminar", tipo: "warning" });
        }} variant="danger" tooltip="Eliminar tratamento selecionado" />
        <ActionBtn icon={NotebookPen} label="Adicionar Evolução" onClick={() => {
          const ativo = tratamentosFiltrados.find(t => t.estado === "em_progresso");
          if (ativo) setShowEvolucao(ativo);
          else setToast({ msg: "Nenhum tratamento em progresso para adicionar evolução", tipo: "warning" });
        }} variant="success" tooltip="Registar evolução clínica do tratamento" />
        <div className="ml-auto">
          <ActionBtn icon={RefreshCw} label="Actualizar" onClick={onRefresh} variant="ghost" />
        </div>
      </ActionBar>

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1">
          <button onClick={() => setFiltroEstado("todos")} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroEstado === "todos" ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30" : "text-[var(--text-muted)]"}`}>Todos</button>
          {["pendente", "em_progresso", "concluido", "cancelado"].map(est => (
            <button key={est} onClick={() => setFiltroEstado(est === filtroEstado ? "todos" : est)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroEstado === est ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30" : "text-[var(--text-muted)]"}`}>
              {est.replace("_", " ")}
            </button>
          ))}
        </div>
        {especialidadesPresentes.length > 1 && (
          <select value={filtroEsp} onChange={e => setFiltroEsp(e.target.value)} className="input-premium text-xs">
            <option value="todos">Todas Especialidades</option>
            {especialidadesPresentes.map(esp => (<option key={esp} value={esp}>{esp}</option>))}
          </select>
        )}
      </div>

      {/* Tabela */}
      <div className="card-premium border border-[var(--border-primary)]">
        <div className="p-5 border-b border-[var(--border-primary)]">
          <SectionHeader icon={Stethoscope} title={`Tratamentos (${tratamentosFiltrados.length})`} cor="text-amber-400" />
        </div>
        {tratamentosFiltrados.length === 0 ? (
          <EmptyState icon={Stethoscope} title="Nenhum tratamento encontrado" action={<button onClick={() => setShowModal(true)} className="text-[#00E5FF] text-xs font-semibold hover:text-[#00E5FF]">+ Criar primeiro tratamento</button>} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-primary)]">
                  <th className="text-left p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Descrição</th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Médico</th>
                  <th className="text-left p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Data</th>
                  <th className="text-right p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Valor</th>
                  <th className="text-center p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Estado</th>
                  <th className="text-center p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Fatura</th>
                  <th className="text-center p-4 text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider">Acções</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-primary)]">
                {tratamentosFiltrados.map(t => {
                  const faturaRelacionada = faturas.find(f => f.tratamentoId === t.id);
                  return (
                    <tr key={t.id} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                      <td className="p-4">
                        <p className="text-[var(--text-primary)] text-sm font-semibold">{t.descricao}</p>
                        {t.dente && t.dente !== "Geral" && <p className="text-[var(--text-muted)] text-[10px]">Dente: {t.dente}</p>}
                      </td>
                      <td className="p-4 text-[var(--text-secondary)] text-xs">{t.medicoNome ? `Dr(a). ${t.medicoNome}` : "—"}</td>
                      <td className="p-4 text-[var(--text-secondary)] text-xs">{formatarData(t.dataInicio)}</td>
                      <td className="p-4 text-right"><p className="text-[var(--text-primary)] text-sm font-bold">{parseFloat(t.valorBruto || "0") > 0 ? `${simboloMoeda}${parseFloat(t.valorBruto).toFixed(2)}` : "—"}</p></td>
                      <td className="p-4 text-center"><StatusDropdownTratamento tratamentoId={t.id} estadoActual={t.estado} onSuccess={onRefresh} /></td>
                      <td className="p-4 text-center">
                        {faturaRelacionada ? (
                          <button onClick={() => onNavigate("pagamentos")} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 hover:scale-105 transition-transform ${ESTADO_FATURA_COR[faturaRelacionada.estado]?.bg || "bg-[var(--bg-secondary)]"} ${ESTADO_FATURA_COR[faturaRelacionada.estado]?.text || "text-[var(--text-muted)]"} ${ESTADO_FATURA_COR[faturaRelacionada.estado]?.border || "border-[var(--border-primary)]"}`}>
                            <Receipt className="w-3 h-3" /> {ESTADO_FATURA_COR[faturaRelacionada.estado]?.label || "—"}
                          </button>
                        ) : <span className="text-[var(--text-muted)] text-[10px]">—</span>}
                      </td>
                      <td className="p-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setShowEvolucao(t)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-emerald-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 transition-all" title="Evolução"><NotebookPen className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setConfirmDelete(t)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all" title="Eliminar"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: PAGAMENTOS — Dashboard Financeiro Completo + BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabPagamentos({
  faturas, tratamentos, onNavigate, simboloMoeda, utenteId, onRefresh,
}: {
  faturas: any[]; tratamentos: any[]; onNavigate: (tab: string, filter?: string) => void; simboloMoeda: string; utenteId: number; onRefresh?: () => void;
}) {
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");
  const [faturaDetalhe, setFaturaDetalhe] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showPagarModal, setShowPagarModal] = useState<any>(null);
  const [metodoPagamento, setMetodoPagamento] = useState<"multibanco" | "numerario" | "mbway" | "transferencia">("numerario");
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [confirmAnular, setConfirmAnular] = useState<any>(null);
  const [showNovaFatura, setShowNovaFatura] = useState(false);
  const [showRelatorio, setShowRelatorio] = useState<number | null>(null);
  // Parcelamento
  const [modoParcelamento, setModoParcelamento] = useState(false);
  const [numParcelas, setNumParcelas] = useState(2);
  const [intervaloDias, setIntervaloDias] = useState(30);
  const [showParcelas, setShowParcelas] = useState<number | null>(null);

  const pagarMutation = trpc.faturacao.registarPagamento.useMutation({
    onSuccess: (data: any) => { 
      const faturaIdPaga = showPagarModal?.id;
      setFaturaDetalhe(null); 
      setShowPagarModal(null);
      setModoParcelamento(false);
      setToast({ msg: "Pagamento registado com sucesso", tipo: "success" });
      onRefresh?.();
      if (faturaIdPaga) {
        setTimeout(() => setShowRelatorio(faturaIdPaga), 500);
      }
    },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao registar pagamento"), tipo: "error" }); },
  });
  const parcelarMutation = trpc.faturacao.registarPagamentoParcelado.useMutation({
    onSuccess: (data: any) => {
      setShowPagarModal(null);
      setModoParcelamento(false);
      setToast({ msg: `Parcelamento criado: ${data.totalParcelas}x de ${simboloMoeda}${data.valorParcela.toFixed(2)}`, tipo: "success" });
      onRefresh?.();
    },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao criar parcelamento"), tipo: "error" }); },
  });
  const pagarParcelaMutation = trpc.faturacao.pagarParcela.useMutation({
    onSuccess: (data: any) => {
      if (data.todasPagas) {
        setToast({ msg: `Todas as parcelas pagas! Recibo: ${data.numeroRecibo}`, tipo: "success" });
        setShowParcelas(null);
      } else {
        setToast({ msg: `Parcela paga (${data.parcelasPagas}/${data.totalParcelas})`, tipo: "success" });
      }
      onRefresh?.();
    },
    onError: (e: any) => { setToast({ msg: parseApiError(e, "Erro ao pagar parcela"), tipo: "error" }); },
  });
  const parcelasQuery = trpc.faturacao.listarParcelas.useQuery(
    { faturaId: showParcelas || 0 },
    { enabled: !!showParcelas }
  );
  const anularMutation = trpc.faturacao.anularFatura.useMutation({
    onSuccess: () => { setConfirmAnular(null); setToast({ msg: "Fatura anulada com sucesso", tipo: "success" }); onRefresh?.(); },
    onError: (e: any) => { setConfirmAnular(null); setToast({ msg: parseApiError(e, "Erro ao anular fatura"), tipo: "error" }); },
  });

  const handlePagar = (faturaId: number) => {
    const fatura = faturas.find((f: any) => f.id === faturaId);
    if (fatura) {
      setShowPagarModal(fatura);
      setModoParcelamento(false);
    }
  };

  const confirmarPagamento = () => {
    if (!showPagarModal) return;
    if (modoParcelamento) {
      parcelarMutation.mutate({
        faturaId: showPagarModal.id,
        totalParcelas: numParcelas,
        metodoPagamento,
        dataInicio: new Date(),
        intervaloDias,
      });
    } else {
      pagarMutation.mutate({ faturaId: showPagarModal.id, valorPago: parseFloat(showPagarModal.valorTotal || "0"), metodoPagamento, dataPagamento: new Date() });
    }
  };

  const faturasFiltradas = useMemo(() => {
    let resultado = [...faturas];
    if (filtroEstado !== "todos") resultado = resultado.filter(f => f.estado === filtroEstado);
    if (searchTerm) resultado = resultado.filter(f => f.numeroFatura?.toLowerCase().includes(searchTerm.toLowerCase()) || f.observacoes?.toLowerCase().includes(searchTerm.toLowerCase()));
    return resultado.sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime());
  }, [faturas, filtroEstado, searchTerm]);

  const totalFaturado = faturas.filter(f => f.estado !== "anulada").reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
  const totalPago = faturas.filter(f => f.estado === "paga").reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
  const totalPendente = faturas.filter(f => f.estado === "pendente").reduce((acc, f) => acc + parseFloat(f.valorTotal || "0"), 0);
  const countPaga = faturas.filter(f => f.estado === "paga").length;
  const countPendente = faturas.filter(f => f.estado === "pendente").length;
  const countAnulada = faturas.filter(f => f.estado === "anulada").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {confirmAnular && (
        <ConfirmDialog titulo="Anular Fatura" mensagem={`Tem a certeza que pretende anular a fatura "${confirmAnular.numeroFatura}"? Esta acção é irreversível e afectará o saldo do utente.`}
          onConfirm={() => anularMutation.mutate({ faturaId: confirmAnular.id, motivo: "Anulada pelo utilizador" })}
          onCancel={() => setConfirmAnular(null)} tipo="danger" confirmLabel="Anular Fatura" />
      )}

      {/* Modal de Pagamento */}
      {showPagarModal && (
        <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><CreditCard className="w-4 h-4 text-emerald-400" /></div>
                <div><h2 className="text-[var(--text-primary)] font-bold">Registar Pagamento</h2><p className="text-[var(--text-muted)] text-xs">{showPagarModal.numeroFatura}</p></div>
              </div>
              <button onClick={() => { setShowPagarModal(null); setModoParcelamento(false); }} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-5 overflow-y-auto">
              <div className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-center">
                <p className="text-[var(--text-muted)] text-xs mb-1">Valor a Pagar</p>
                <p className="text-3xl font-black text-emerald-400">{simboloMoeda}{parseFloat(showPagarModal.valorTotal || "0").toFixed(2)}</p>
              </div>

              {/* Toggle Pagamento Integral vs Parcelado */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Forma de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => setModoParcelamento(false)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${!modoParcelamento ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                    Pagamento Integral
                  </button>
                  <button onClick={() => setModoParcelamento(true)}
                    className={`py-3 rounded-xl border text-xs font-bold transition-all ${modoParcelamento ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                    Parcelamento
                  </button>
                </div>
              </div>

              {/* Opções de Parcelamento */}
              {modoParcelamento && (
                <div className="space-y-3 p-4 rounded-xl bg-violet-500/5 border border-violet-500/20">
                  <div>
                    <label className="text-xs font-bold text-violet-300 uppercase tracking-wider block mb-2">Número de Parcelas</label>
                    <div className="grid grid-cols-4 gap-2">
                      {[2, 3, 4, 6, 8, 10, 12, 24].map(n => (
                        <button key={n} onClick={() => setNumParcelas(n)}
                          className={`py-2 rounded-lg border text-xs font-bold transition-all ${numParcelas === n ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-violet-500/30"}`}>
                          {n}x
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-violet-300 uppercase tracking-wider block mb-2">Intervalo entre Parcelas</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[{ v: 15, l: "15 dias" }, { v: 30, l: "30 dias" }, { v: 60, l: "60 dias" }].map(({ v, l }) => (
                        <button key={v} onClick={() => setIntervaloDias(v)}
                          className={`py-2 rounded-lg border text-xs font-bold transition-all ${intervaloDias === v ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-violet-500/30"}`}>
                          {l}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-primary)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--text-muted)]">Valor por parcela</span>
                      <span className="text-sm font-black text-violet-400">{simboloMoeda}{(parseFloat(showPagarModal.valorTotal || "0") / numParcelas).toFixed(2)}</span>
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-[var(--text-muted)]">Total</span>
                      <span className="text-xs text-[var(--text-secondary)]">{numParcelas}x de {simboloMoeda}{(parseFloat(showPagarModal.valorTotal || "0") / numParcelas).toFixed(2)} a cada {intervaloDias} dias</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-2">
                  {(["numerario", "multibanco", "mbway", "transferencia"] as const).map(m => (
                    <button key={m} onClick={() => setMetodoPagamento(m)} className={`py-3 rounded-xl border text-xs font-bold capitalize transition-all ${metodoPagamento === m ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-400" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                      {m === "numerario" ? "Numerário" : m === "multibanco" ? "Multibanco" : m === "mbway" ? "MB WAY" : "Transferência"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowPagarModal(null); setModoParcelamento(false); }} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button>
                <button onClick={confirmarPagamento} disabled={pagarMutation.isPending || parcelarMutation.isPending} className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all ${modoParcelamento ? "bg-violet-500 hover:bg-violet-600" : "bg-emerald-500 hover:bg-emerald-600"}`}>
                  {(pagarMutation.isPending || parcelarMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {modoParcelamento ? `Criar ${numParcelas}x Parcelas` : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Parcelas */}
      {showParcelas && (
        <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col my-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center"><CreditCard className="w-4 h-4 text-violet-400" /></div>
                <div><h2 className="text-[var(--text-primary)] font-bold">Parcelas</h2><p className="text-[var(--text-muted)] text-xs">Gerir parcelas da fatura</p></div>
              </div>
              <button onClick={() => setShowParcelas(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {parcelasQuery.isLoading ? (
                <div className="flex items-center justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-violet-400" /></div>
              ) : parcelasQuery.data?.parcelas?.length ? (
                parcelasQuery.data.parcelas.map((p: any) => {
                  const isPaga = p.estado === "paga";
                  const isAtrasada = !isPaga && new Date(p.dataVencimento) < new Date();
                  return (
                    <div key={p.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      isPaga ? "bg-emerald-500/5 border-emerald-500/20" : isAtrasada ? "bg-red-500/5 border-red-500/20" : "bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                    }`}>
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        isPaga ? "bg-emerald-500/20" : isAtrasada ? "bg-red-500/20" : "bg-amber-500/20"
                      }`}>
                        {isPaga ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : isAtrasada ? <AlertCircle className="w-4 h-4 text-red-400" /> : <Clock className="w-4 h-4 text-amber-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-semibold">Parcela {p.numeroParcela}/{p.totalParcelas}</p>
                        <p className="text-[var(--text-muted)] text-xs">
                          Vencimento: {new Date(p.dataVencimento).toLocaleDateString("pt-PT")}
                          {isPaga && p.dataPagamento && ` · Paga em ${new Date(p.dataPagamento).toLocaleDateString("pt-PT")}`}
                          {isAtrasada && " · Atrasada"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-sm font-bold ${isPaga ? "text-emerald-400" : isAtrasada ? "text-red-400" : "text-[var(--text-primary)]"}`}>
                          {simboloMoeda}{parseFloat(p.valor || "0").toFixed(2)}
                        </span>
                        {!isPaga && p.estado !== "anulada" && (
                          <button
                            onClick={() => pagarParcelaMutation.mutate({ parcelaId: p.id, metodoPagamento: p.metodoPagamento || "numerario", dataPagamento: new Date() })}
                            disabled={pagarParcelaMutation.isPending}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all disabled:opacity-50"
                          >
                            {pagarParcelaMutation.isPending ? "..." : "Pagar"}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-[var(--text-muted)] text-sm">Nenhuma parcela encontrada</div>
              )}
              {parcelasQuery.data?.parcelas && (() => {
                const ps = parcelasQuery.data.parcelas;
                const pagas = ps.filter((p: any) => p.estado === "paga").length;
                const total = ps.length;
                const valorPago = ps.filter((p: any) => p.estado === "paga").reduce((a: number, p: any) => a + parseFloat(p.valor || "0"), 0);
                const valorTotal = ps.reduce((a: number, p: any) => a + parseFloat(p.valor || "0"), 0);
                return (
                  <div className="p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-primary)] mt-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-[var(--text-muted)]">Progresso</span>
                      <span className="text-[var(--text-primary)] font-bold">{pagas}/{total} parcelas pagas</span>
                    </div>
                    <div className="w-full bg-[var(--bg-secondary)] rounded-full h-2 mt-2">
                      <div className="bg-gradient-to-r from-emerald-500 to-cyan-500 h-2 rounded-full transition-all" style={{ width: `${(pagas / total) * 100}%` }} />
                    </div>
                    <div className="flex items-center justify-between text-xs mt-1">
                      <span className="text-emerald-400 font-bold">{simboloMoeda}{valorPago.toFixed(2)} pago</span>
                      <span className="text-[var(--text-muted)]">{simboloMoeda}{(valorTotal - valorPago).toFixed(2)} restante</span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {faturaDetalhe && <ModalDetalhesFatura fatura={faturaDetalhe} tratamentos={tratamentos} onClose={() => setFaturaDetalhe(null)} onPagar={handlePagar} simboloMoeda={simboloMoeda} />}
      {showNovaFatura && <ModalNovaFatura utenteId={utenteId} onClose={() => setShowNovaFatura(false)} onSuccess={() => { onRefresh?.(); setToast({ msg: "Fatura criada com sucesso", tipo: "success" }); }} simboloMoeda={simboloMoeda} />}
      {showRelatorio && <ModalRelatorioProcedimentos faturaId={showRelatorio} onClose={() => setShowRelatorio(null)} simboloMoeda={simboloMoeda} />}

      {/* ACTION BAR — Pagamentos */}
      <ActionBar cor="from-emerald-500/5 to-cyan-500/5" borderCor="border-emerald-500/20">
        <ActionBtn icon={Receipt} label="Nova Fatura" onClick={() => {
          const pendentes = faturas.filter(f => f.estado === "pendente");
          if (pendentes.length > 0) {
            const confirmar = window.confirm(`Já existem ${pendentes.length} fatura(s) pendente(s) para este utente (${pendentes.map(f => f.numeroFatura).join(", ")}). Tem a certeza que deseja criar uma nova fatura?`);
            if (!confirmar) return;
          }
          setShowNovaFatura(true);
        }} variant="primary" tooltip="Criar nova fatura para o utente" />
        <ActionBtn icon={CreditCard} label="Registar Pagamento" onClick={() => {
          const pendente = faturas.find(f => f.estado === "pendente");
          if (pendente) handlePagar(pendente.id);
          else setToast({ msg: "Sem faturas pendentes", tipo: "warning" });
        }} variant="success" tooltip="Registar pagamento de fatura pendente" />
        <ActionSep />
        <ActionBtn icon={XCircle} label="Anular Fatura" onClick={() => {
          const pendente = faturas.find(f => f.estado === "pendente");
          if (pendente) setConfirmAnular(pendente);
          else setToast({ msg: "Sem faturas para anular", tipo: "warning" });
        }} variant="danger" tooltip="Anular uma fatura pendente" />
        <ActionBtn icon={FileText} label="Ver Recibo" onClick={() => {
          const paga = faturas.find(f => f.estado === "paga");
          if (paga) setFaturaDetalhe(paga);
          else setToast({ msg: "Sem faturas pagas para ver recibo", tipo: "warning" });
        }} variant="secondary" tooltip="Visualizar ou descarregar recibo" />
        <ActionBtn icon={ClipboardList} label="Relat\u00f3rio Procedimentos" onClick={() => {
          const paga = faturas.find(f => f.estado === "paga");
          if (paga) setShowRelatorio(paga.id);
          else setToast({ msg: "Sem faturas pagas para gerar relat\u00f3rio", tipo: "warning" });
        }} variant="secondary" tooltip="Ver relat\u00f3rio de procedimentos com anota\u00e7\u00f5es do dentista" />
        <div className="ml-auto">
          <ActionBtn icon={Download} label="Exportar" onClick={() => {
            const csvRows = ["Número,Data,Valor,Estado,Método"];
            faturas.forEach(f => csvRows.push(`${f.numeroFatura || ""},${formatarData(f.dataEmissao)},${parseFloat(f.valorTotal || "0").toFixed(2)},${f.estado},${f.metodoPagamento || ""}`));
            const blob = new Blob([csvRows.join("\n")], { type: "text/csv" });
            const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "faturas_export.csv"; a.click();
            setToast({ msg: "Exportação CSV concluída", tipo: "success" });
          }} variant="ghost" tooltip="Exportar relatório financeiro" />
        </div>
      </ActionBar>

      {/* KPIs Financeiros */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Euro} label="Total Faturado" valor={`${simboloMoeda}${totalFaturado.toFixed(2)}`} sub={`${faturas.length} faturas`} cor="text-[#00E5FF]" bg="bg-[#00E5FF]/10" border="border-[#00E5FF]/20" />
        <KPICard icon={CheckCircle} label="Total Pago" valor={`${simboloMoeda}${totalPago.toFixed(2)}`} sub={`${countPaga} pagas`} cor="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <KPICard icon={Clock} label="Pendente" valor={`${simboloMoeda}${totalPendente.toFixed(2)}`} sub={`${countPendente} pendentes`} cor="text-amber-400" bg="bg-amber-500/10" border="border-amber-500/20" />
        <KPICard icon={TrendingUp} label="Taxa Pagamento" valor={`${totalFaturado > 0 ? Math.round((totalPago / totalFaturado) * 100) : 0}%`} sub="do total faturado" cor={totalPago >= totalFaturado ? "text-emerald-400" : "text-amber-400"} bg={totalPago >= totalFaturado ? "bg-emerald-500/10" : "bg-amber-500/10"} border={totalPago >= totalFaturado ? "border-emerald-500/20" : "border-amber-500/20"} />
      </div>

      {totalFaturado > 0 && (
        <div className="card-premium p-5 border border-[var(--border-primary)]">
          <ProgressBar valor={totalPago} max={totalFaturado} cor="bg-gradient-to-r from-emerald-500 to-cyan-500" height="h-3" label="Progresso de Pagamento" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-emerald-400 text-xs font-bold">{simboloMoeda}{totalPago.toFixed(2)} pago</span>
            <span className="text-[var(--text-muted)] text-xs">{simboloMoeda}{(totalFaturado - totalPago).toFixed(2)} restante</span>
          </div>
        </div>
      )}

      {/* Filtros e Pesquisa */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1">
          {[
            { value: "todos", label: `Todos (${faturas.length})` },
            { value: "pendente", label: `Pendentes (${countPendente})` },
            { value: "paga", label: `Pagas (${countPaga})` },
            { value: "anulada", label: `Anuladas (${countAnulada})` },
          ].map(({ value, label }) => (
            <button key={value} onClick={() => setFiltroEstado(value)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filtroEstado === value ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30" : "text-[var(--text-muted)]"}`}>
              {label}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Pesquisar faturas..." className="input-premium pl-10 text-xs w-48" />
        </div>
      </div>

      {/* Lista de Faturas */}
      <div className="card-premium border border-[var(--border-primary)]">
        <div className="p-5 border-b border-[var(--border-primary)]">
          <SectionHeader icon={Receipt} title={`Faturas (${faturasFiltradas.length})`} cor="text-emerald-400" />
        </div>
        {faturasFiltradas.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhuma fatura encontrada" subtitle="As faturas do utente aparecerão aqui." />
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {faturasFiltradas.map(f => {
              const estadoCor = ESTADO_FATURA_COR[f.estado] || ESTADO_FATURA_COR.pendente;
              return (
                <div key={f.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer group" onClick={() => setFaturaDetalhe(f)}>
                  <div className={`w-10 h-10 rounded-xl ${estadoCor.bg} border ${estadoCor.border} flex items-center justify-center shrink-0`}>
                    {f.estado === "paga" ? <CheckCircle className={`w-5 h-5 ${estadoCor.text}`} /> :
                     f.estado === "anulada" ? <X className={`w-5 h-5 ${estadoCor.text}`} /> :
                     <Clock className={`w-5 h-5 ${estadoCor.text}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">{f.numeroFatura}</p>
                      <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${estadoCor.bg} ${estadoCor.text} ${estadoCor.border}`}>{estadoCor.label}</span>
                      {f.parcelado && (
                        <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border bg-violet-500/10 text-violet-400 border-violet-500/20">{f.totalParcelas}x Parcelas</span>
                      )}
                    </div>
                    <p className="text-[var(--text-muted)] text-xs mt-0.5">{formatarData(f.dataEmissao)}{f.metodoPagamento && ` · ${f.metodoPagamento.replace("_", " ")}`}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <p className={`text-sm font-bold ${f.estado === "paga" ? "text-emerald-400" : f.estado === "anulada" ? "text-red-400 line-through" : "text-[var(--text-primary)]"}`}>
                        {simboloMoeda}{parseFloat(f.valorTotal || "0").toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {f.estado === "pendente" && !f.parcelado && (
                        <button onClick={(e) => { e.stopPropagation(); handlePagar(f.id); }} className="w-8 h-8 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center text-emerald-400 transition-all" title="Pagar"><CreditCard className="w-4 h-4" /></button>
                      )}
                      {f.parcelado && f.estado === "pendente" && (
                        <button onClick={(e) => { e.stopPropagation(); setShowParcelas(f.id); }} className="w-8 h-8 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center text-violet-400 transition-all" title="Ver Parcelas"><Wallet className="w-4 h-4" /></button>
                      )}
                      {f.estado === "paga" && (
                        <>
                          <button onClick={(e) => { e.stopPropagation(); setFaturaDetalhe(f); }} className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 hover:bg-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] transition-all" title="Ver Recibo"><FileText className="w-4 h-4" /></button>
                          <button onClick={(e) => { e.stopPropagation(); setShowRelatorio(f.id); }} className="w-8 h-8 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 flex items-center justify-center text-violet-400 transition-all" title="Relat\u00f3rio de Procedimentos"><ClipboardList className="w-4 h-4" /></button>
                        </>
                      )}
                      {f.estado === "pendente" && (
                        <button onClick={(e) => { e.stopPropagation(); setConfirmAnular(f); }} className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-all" title="Anular"><XCircle className="w-4 h-4" /></button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Últimos Pagamentos */}
      {faturas.filter(f => f.estado === "paga").length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="p-5 border-b border-[var(--border-primary)]">
            <SectionHeader icon={Banknote} title="Últimos Pagamentos" cor="text-emerald-400" />
          </div>
          <div className="divide-y divide-[var(--border-primary)]">
            {faturas.filter(f => f.estado === "paga").sort((a, b) => new Date(b.dataEmissao).getTime() - new Date(a.dataEmissao).getTime()).slice(0, 5).map(f => (
              <div key={f.id} onClick={() => setFaturaDetalhe(f)} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0"><CheckCircle className="w-4 h-4 text-emerald-400" /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-sm font-semibold">{f.numeroFatura}</p>
                  <p className="text-[var(--text-muted)] text-xs">{formatarData(f.dataEmissao)} · {(f.metodoPagamento || "numerário").replace("_", " ")}</p>
                </div>
                <p className="text-emerald-400 text-sm font-bold shrink-0">{simboloMoeda}{parseFloat(f.valorTotal || "0").toFixed(2)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: CONSULTAS — Com BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabConsultas({ consultas, utenteId, onRefresh }: { consultas: any[]; utenteId: number; onRefresh?: () => void }) {
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [detalheConsulta, setDetalheConsulta] = useState<any>(null);
  const [showNovaConsulta, setShowNovaConsulta] = useState(false);
  const [showAlterarEstado, setShowAlterarEstado] = useState<any>(null);
  const [showReagendar, setShowReagendar] = useState<any>(null);

  const updateStatusMutation = trpc.consultas.updateStatus.useMutation({
    onSuccess: () => { onRefresh?.(); setShowAlterarEstado(null); setToast({ msg: "Estado da consulta atualizado", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao atualizar estado"), tipo: "error" }),
  });
  const reagendarMutation = trpc.consultas.reschedule.useMutation({
    onSuccess: () => { onRefresh?.(); setShowReagendar(null); setToast({ msg: "Consulta reagendada com sucesso", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao reagendar"), tipo: "error" }),
  });

  const consultasFiltradas = useMemo(() => {
    let resultado = [...consultas];
    if (filtroEstado !== "todos") resultado = resultado.filter(c => c.estado === filtroEstado);
    return resultado.sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime());
  }, [consultas, filtroEstado]);

  const futuras = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada").length;
  const realizadas = consultas.filter(c => c.estado === "realizada").length;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
      {showNovaConsulta && <ModalNovaConsulta utenteId={utenteId} onClose={() => setShowNovaConsulta(false)} onSuccess={() => { onRefresh?.(); setToast({ msg: "Consulta criada com sucesso", tipo: "success" }); }} />}
      {showAlterarEstado && <ModalAlterarEstadoConsulta consulta={showAlterarEstado} onClose={() => setShowAlterarEstado(null)} onSuccess={() => { onRefresh?.(); }} />}
      {showReagendar && <ModalReagendarConsulta consulta={showReagendar} onClose={() => setShowReagendar(null)} onSuccess={() => { onRefresh?.(); }} />}

      {/* Modal Detalhes Consulta */}
      {detalheConsulta && (
        <div className="fixed inset-0 z-[110] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto" onClick={() => setDetalheConsulta(null)}>
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-xl shadow-2xl max-h-[90vh] flex flex-col overflow-y-auto my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><Calendar className="w-4 h-4 text-[#00E5FF]" /></div>
                <div><h2 className="text-[var(--text-primary)] font-bold">Detalhes da Consulta</h2><p className="text-[var(--text-muted)] text-xs">{detalheConsulta.tipoConsulta ?? "Consulta"}</p></div>
              </div>
              <button onClick={() => setDetalheConsulta(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Data/Hora</p>
                  <p className="text-[var(--text-primary)] text-sm font-semibold mt-1">{formatarDataHora(detalheConsulta.dataHoraInicio)}</p>
                </div>
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Estado</p>
                  <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border inline-block mt-1 ${ESTADO_CONSULTA_COR[detalheConsulta.estado] || "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>{detalheConsulta.estado}</span>
                </div>
                {detalheConsulta.medicoNome && (
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Médico</p>
                    <p className="text-[var(--text-primary)] text-sm font-semibold mt-1">Dr(a). {detalheConsulta.medicoNome}</p>
                  </div>
                )}
                {detalheConsulta.duracao && (
                  <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                    <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">Duração</p>
                    <p className="text-[var(--text-primary)] text-sm font-semibold mt-1">{detalheConsulta.duracao} min</p>
                  </div>
                )}
              </div>
              {detalheConsulta.observacoes && (
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                  <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold mb-1">Observações</p>
                  <p className="text-[var(--text-primary)] text-xs">{detalheConsulta.observacoes}</p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowReagendar(detalheConsulta); setDetalheConsulta(null); }} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs font-bold hover:bg-[var(--bg-secondary)] transition-all flex items-center justify-center gap-2"><CalendarClock className="w-4 h-4" /> Reagendar</button>
                <button onClick={() => setDetalheConsulta(null)} className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] text-white text-xs font-bold transition-all">Fechar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ACTION BAR — Consultas */}
      <ActionBar cor="from-[#00E5FF]/5 to-cyan-500/5" borderCor="border-[#00E5FF]/20">
        <ActionBtn icon={Plus} label="Nova Consulta" onClick={() => setShowNovaConsulta(true)} variant="primary" tooltip="Agendar nova consulta para o utente" />
        <ActionSep />
        <ActionBtn icon={CalendarCheck} label="Alterar Estado" onClick={() => {
          const proxima = consultasFiltradas.find(c => c.estado !== "realizada" && c.estado !== "cancelada");
          if (proxima) setShowAlterarEstado(proxima);
          else setToast({ msg: "Nenhuma consulta para alterar estado", tipo: "warning" });
        }} variant="secondary" tooltip="Marcar como realizada, cancelada, etc." />
        <ActionBtn icon={CalendarClock} label="Reagendar" onClick={() => {
          const futura = consultasFiltradas.find(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada");
          if (futura) setShowReagendar(futura);
          else setToast({ msg: "Nenhuma consulta futura para reagendar", tipo: "warning" });
        }} variant="warning" tooltip="Alterar data/hora de uma consulta agendada" />
        <ActionBtn icon={Eye} label="Ver Detalhes" onClick={() => {
          if (consultasFiltradas.length > 0) setDetalheConsulta(consultasFiltradas[0]);
          else setToast({ msg: "Sem consultas para visualizar", tipo: "warning" });
        }} variant="secondary" tooltip="Ver detalhes completos da consulta" />
        <div className="ml-auto">
          {onRefresh && <ActionBtn icon={RefreshCw} label="Actualizar" onClick={onRefresh} variant="ghost" />}
        </div>
      </ActionBar>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Calendar} label="Total Consultas" valor={consultas.length} sub="registadas" cor="text-[#00E5FF]" bg="bg-[#00E5FF]/10" border="border-[#00E5FF]/20" />
        <KPICard icon={CheckCircle} label="Realizadas" valor={realizadas} sub="concluídas" cor="text-emerald-400" bg="bg-emerald-500/10" border="border-emerald-500/20" />
        <KPICard icon={Clock} label="Agendadas" valor={futuras} sub="futuras" cor="text-cyan-400" bg="bg-cyan-500/10" border="border-cyan-500/20" />
        <KPICard icon={AlertCircle} label="No-Show" valor={consultas.filter(c => c.estado === "no-show").length} sub="faltas" cor="text-red-400" bg="bg-red-500/10" border="border-red-500/20" />
      </div>

      <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1 w-fit">
        {["todos", "agendada", "confirmada", "realizada", "cancelada", "no-show"].map(est => (
          <button key={est} onClick={() => setFiltroEstado(est === filtroEstado ? "todos" : est)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${filtroEstado === est ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30" : "text-[var(--text-muted)]"}`}>
            {est === "todos" ? "Todos" : est}
          </button>
        ))}
      </div>

      <div className="card-premium border border-[var(--border-primary)]">
        <div className="p-5 border-b border-[var(--border-primary)]">
          <SectionHeader icon={Calendar} title={`Consultas (${consultasFiltradas.length})`} cor="text-[#00E5FF]" />
        </div>
        {consultasFiltradas.length === 0 ? (
          <EmptyState icon={Calendar} title="Nenhuma consulta encontrada" action={<ActionBtn icon={Plus} label="Agendar Consulta" onClick={() => setShowNovaConsulta(true)} variant="primary" />} />
        ) : (
          <div className="divide-y divide-[var(--border-primary)]">
            {consultasFiltradas.map(c => {
              const isFutura = new Date(c.dataHoraInicio) > new Date();
              return (
                <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors group">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isFutura ? "bg-[#00E5FF]/20 border border-[#00E5FF]/30" : "bg-[var(--bg-secondary)] border border-[var(--border-primary)]"}`}>
                    <Calendar className={`w-5 h-5 ${isFutura ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[var(--text-primary)] text-sm font-semibold">{c.tipoConsulta ?? "Consulta"}</p>
                      {isFutura && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">Futura</span>}
                    </div>
                    <p className="text-[var(--text-muted)] text-xs">{formatarDataHora(c.dataHoraInicio)}{c.medicoNome ? ` · Dr(a). ${c.medicoNome}` : ""}</p>
                    {c.observacoes && <p className="text-[var(--text-secondary)] text-xs mt-1 line-clamp-1 italic">"{c.observacoes}"</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full border ${ESTADO_CONSULTA_COR[c.estado] || "bg-[var(--bg-secondary)] text-[var(--text-muted)] border-[var(--border-primary)]"}`}>{c.estado}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setDetalheConsulta(c)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-[#00E5FF]/20 flex items-center justify-center text-[var(--text-muted)] hover:text-[#00E5FF] transition-all" title="Ver Detalhes"><Eye className="w-3.5 h-3.5" /></button>
                      {isFutura && <button onClick={() => setShowReagendar(c)} className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-amber-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-amber-400 transition-all" title="Reagendar"><CalendarClock className="w-3.5 h-3.5" /></button>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TAB: SAÚDE (Anamnese) — Com BOTÕES DE AÇÃO
// ═══════════════════════════════════════════════════════════════════════════════
function TabSaude({ anamnese, utente, utenteId, onRefresh }: { anamnese: any; utente: any; utenteId: number; onRefresh?: () => void }) {
  const [toast, setToast] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [respostasEdit, setRespostasEdit] = useState<Record<string, any>>({});

  const guardarMutation = trpc.fichaUtente.guardarAnamnese.useMutation({
    onSuccess: () => { onRefresh?.(); setEditMode(false); setToast({ msg: "Anamnese guardada com sucesso", tipo: "success" }); },
    onError: (e: any) => setToast({ msg: parseApiError(e, "Erro ao guardar"), tipo: "error" }),
  });

  if (!anamnese) {
    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}
        <ActionBar cor="from-pink-500/5 to-rose-500/5" borderCor="border-pink-500/20">
          <ActionBtn icon={Edit2} label="Editar Anamnese" onClick={() => setToast({ msg: "Criar questionário de saúde para o utente", tipo: "info" })} variant="primary" tooltip="Preencher questionário de saúde" />
        </ActionBar>
        <div className="card-premium border border-[var(--border-primary)]">
          <EmptyState icon={Heart} title="Sem anamnese registada" subtitle="O questionário de saúde do utente ainda não foi preenchido."
            action={<ActionBtn icon={Plus} label="Preencher Anamnese" onClick={() => setToast({ msg: "Abrir formulário de anamnese", tipo: "info" })} variant="primary" />} />
        </div>
      </div>
    );
  }

  let respostas: Record<string, any> = {};
  try { respostas = typeof anamnese.respostas === "string" ? JSON.parse(anamnese.respostas) : anamnese.respostas || {}; } catch { respostas = {}; }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {toast && <Toast message={toast.msg} tipo={toast.tipo} onClose={() => setToast(null)} />}

      {/* ACTION BAR — Saúde */}
      <ActionBar cor="from-pink-500/5 to-rose-500/5" borderCor="border-pink-500/20">
        <ActionBtn icon={Edit2} label="Editar Anamnese" onClick={() => { setEditMode(!editMode); setToast({ msg: editMode ? "Modo de edição desactivado" : "Modo de edição activado — altere os campos necessários", tipo: "info" }); }} variant={editMode ? "warning" : "primary"} tooltip="Editar o questionário de saúde" />
        <ActionBtn icon={Save} label={guardarMutation.isPending ? "A guardar..." : "Guardar Alterações"} onClick={() => {
          let respostasAtuais: Record<string, any> = {};
          try {
            respostasAtuais = typeof anamnese.respostas === "string" ? JSON.parse(anamnese.respostas) : anamnese.respostas || {};
          } catch { respostasAtuais = {}; }
          const merged = { ...respostasAtuais, ...respostasEdit };
          guardarMutation.mutate({ utenteId, respostas: merged });
        }} variant="success" tooltip="Guardar todas as alterações feitas" />
        <ActionSep />
        <ActionBtn icon={FileText} label="Imprimir" onClick={() => { window.print(); setToast({ msg: "A imprimir anamnese...", tipo: "info" }); }} variant="secondary" tooltip="Imprimir ou exportar anamnese em PDF" />
        <div className="ml-auto">
          {onRefresh && <ActionBtn icon={RefreshCw} label="Actualizar" onClick={onRefresh} variant="ghost" />}
        </div>
      </ActionBar>

      {/* Alertas */}
      {(anamnese.alergiasDetectadas || anamnese.problemasSaude) && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 flex gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 text-sm font-bold mb-1">Alertas de Saúde</p>
            {anamnese.alergiasDetectadas && <p className="text-red-200/80 text-xs"><strong>Alergias:</strong> {anamnese.alergiasDetectadas}</p>}
            {anamnese.problemasSaude && <p className="text-red-200/80 text-xs mt-1"><strong>Condições:</strong> {anamnese.problemasSaude}</p>}
          </div>
        </div>
      )}

      {/* Dados da Anamnese */}
      <div className="card-premium p-5 border border-[var(--border-primary)]">
        <div className="flex items-center justify-between">
          <SectionHeader icon={Heart} title="Questionário de Saúde" cor="text-pink-400" />
          {editMode && <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 animate-pulse">Modo Edição</span>}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          {Object.entries(respostas).filter(([key]) => !key.startsWith("__")).map(([key, value]) => (
            <div key={key} className={`p-3 rounded-xl bg-[var(--bg-secondary)] border ${editMode ? "border-amber-500/30 hover:border-amber-500/50 cursor-pointer" : "border-[var(--border-primary)]"} transition-all`}>
              <p className="text-[var(--text-muted)] text-[10px] uppercase font-bold">{key.replace(/_/g, " ")}</p>
              <p className="text-[var(--text-primary)] text-xs font-semibold mt-1">{String(value) || "—"}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-[var(--border-primary)] flex items-center gap-4 text-[var(--text-muted)] text-xs">
          <span>Preenchido: {formatarData(anamnese.dataAssinatura)}</span>
          {anamnese.assinaturaDigital && <span className="flex items-center gap-1 text-emerald-400"><CheckCircle className="w-3 h-3" /> Assinado digitalmente</span>}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL — Ficha do Utente V35 + Botões de Ação
// ═══════════════════════════════════════════════════════════════════════════════

type TabId = "dashboard" | "odontograma" | "tratamentos" | "consultas" | "imagens" | "saude" | "pagamentos" | "laboratorio" | "ortodontia" | "insights" | "comunicacao";

export function FichaUtentePage({ utenteId, onVoltar, tabInicial }: Props) {
  const { formatMoeda, simboloMoeda, nomeClinica, config } = useConfig();
  const [, navigate] = useLocation();
  const [tabActiva, setTabActiva] = useState<TabId>((tabInicial as TabId) || "dashboard");
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [showModalTratamento, setShowModalTratamento] = useState(false);
  const [denteSelecionado, setDenteSelecionado] = useState<number | null>(null);

  const [toastOdonto, setToastOdonto] = useState<{ msg: string; tipo: "success" | "error" | "info" | "warning" } | null>(null);
  const [showEditarDente, setShowEditarDente] = useState(false);
  const [showNotaDente, setShowNotaDente] = useState(false);
  const [notaDenteTexto, setNotaDenteTexto] = useState("");
  const [odontogramaLocal, setOdontogramaLocal] = useState<Record<string, string>>({});
  const [odontogramaModificado, setOdontogramaModificado] = useState(false);

  // ─── Query principal da ficha ──────────────────────────────────────────────
  const fichaQuery = trpc.fichaUtente.obterFicha.useQuery(
    { utenteId },
    { enabled: !!utenteId, refetchOnWindowFocus: false }
  );

  // ─── Query de envios de laboratório ────────────────────────────────────────
  const enviosLabQuery = trpc.laboratorios.listarEnvios.useQuery(
    { utenteId, limite: 50 },
    { enabled: !!utenteId }
  );

  const handleRefresh = useCallback(() => {
    fichaQuery.refetch();
    enviosLabQuery.refetch();
  }, [fichaQuery, enviosLabQuery]);

  const handleNavigate = useCallback((tab: string, filter?: string) => {
    setTabActiva(tab as TabId);
    // Navegação entre tabs (especialidades removida — redirecionar para tratamentos)
    if (tab === "especialidades") { setTabActiva("tratamentos" as TabId); return; }
  }, []);

  // ─── Dados da ficha ───────────────────────────────────────────────────────
  const fichaData = fichaQuery.data as any;
  const utente = fichaData?.utente ?? {};
  const consultas: any[] = fichaData?.consultas ?? [];
  const tratamentos: any[] = fichaData?.tratamentos ?? [];
  const faturas: any[] = fichaData?.faturas ?? [];
  const anamnese = fichaData?.anamnese ?? null;
  const imagens: any[] = fichaData?.imagens ?? [];
  const odontogramaData: Record<string, string> = useMemo(() => {
    const anamneseData = fichaData?.anamnese;
    if (!anamneseData?.respostas) return {};
    try {
      const parsed = typeof anamneseData.respostas === "string" ? JSON.parse(anamneseData.respostas) : anamneseData.respostas;
      return parsed.__odontograma ?? {};
    } catch { return {}; }
  }, [fichaData]);

  // V35.5 — Dados avançados do odontograma (periograma, implantes, prótese, notas)
  const odontogramaAvancadoData = useMemo(() => {
    const anamneseData = fichaData?.anamnese;
    if (!anamneseData?.respostas) return {};
    try {
      const parsed = typeof anamneseData.respostas === "string" ? JSON.parse(anamneseData.respostas) : anamneseData.respostas;
      return parsed.__odontograma_avancado ?? {};
    } catch { return {}; }
  }, [fichaData]);

  // Sincronizar odontogramaLocal com dados do servidor
  useEffect(() => {
    setOdontogramaLocal(odontogramaData);
    setOdontogramaModificado(false);
  }, [odontogramaData]);

  const guardarOdontogramaMutation = trpc.fichaUtente.guardarOdontograma.useMutation({
    onSuccess: () => { handleRefresh(); setOdontogramaModificado(false); setToastOdonto({ msg: "Odontograma guardado com sucesso", tipo: "success" }); },
    onError: (e: any) => setToastOdonto({ msg: parseApiError(e, "Erro ao guardar odontograma"), tipo: "error" }),
  });

  const handleGuardarOdontograma = () => {
    type EstadoDente = "saudavel" | "carie" | "restauracao" | "extraido" | "implante" | "tratado" | "ausente" | "coroa" | "endodontia" | "protese" | "extracao_indicada";
    guardarOdontogramaMutation.mutate({ utenteId, dentes: odontogramaLocal as Record<string, EstadoDente> });
  };

  const handleEditarDente = (novoEstado: string) => {
    if (!denteSelecionado) return;
    const novo = { ...odontogramaLocal, [String(denteSelecionado)]: novoEstado };
    if (novoEstado === "saudavel") delete novo[String(denteSelecionado)];
    setOdontogramaLocal(novo);
    setOdontogramaModificado(true);
    setShowEditarDente(false);
    setToastOdonto({ msg: `Dente ${denteSelecionado} atualizado para ${ESTADOS_DENTE[novoEstado]?.label || "Saudável"}`, tipo: "success" });
  };
  const enviosLab: any[] = (enviosLabQuery.data as any)?.envios ?? [];

  const healthScore = useMemo(() => calcularHealthScore(consultas, tratamentos, faturas, anamnese), [consultas, tratamentos, faturas, anamnese]);

  const enviosLabAtivos = enviosLab.filter((e: any) => !["concluido", "cancelado"].includes(e.estado)).length;
  const tratamentosOrtoAtivos = tratamentos.filter(t => {
    const desc = (t.descricao || "").toLowerCase();
    return (desc.includes("ortod") || desc.includes("alinhador") || desc.includes("bracket")) && t.estado === "em_progresso";
  }).length;

  // ─── PDF Download ─────────────────────────────────────────────────────────
  const handleDescarregarFicha = useCallback(async () => {
    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF();
      const tConfig = buildTimbradoConfig(config);
      const startY = aplicarTimbrado(doc, tConfig);
      let y = startY;
      doc.setFontSize(16); doc.setFont("helvetica", "bold"); doc.text("Ficha Clínica do Utente", 20, y); y += 10;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Nome: ${utente.nome || "—"}`, 20, y); y += 6;
      doc.text(`NIF: ${utente.nif || "—"}`, 20, y); y += 6;
      doc.text(`Telemóvel: ${utente.telemovel || "—"}`, 20, y); y += 6;
      doc.text(`Email: ${utente.email || "—"}`, 20, y); y += 6;
      if (utente.dataNascimento) { doc.text(`Data Nascimento: ${formatarData(utente.dataNascimento)} (${calcularIdade(utente.dataNascimento)})`, 20, y); y += 6; }
      y += 4;
      doc.setFont("helvetica", "bold"); doc.text(`Tratamentos (${tratamentos.length}):`, 20, y); y += 6;
      doc.setFont("helvetica", "normal");
      tratamentos.slice(0, 15).forEach(t => { doc.text(`• ${t.descricao} — ${t.estado} — ${simboloMoeda}${parseFloat(t.valorBruto || "0").toFixed(2)}`, 24, y); y += 5; });
      aplicarRodapeTimbrado(doc, tConfig);
      doc.save(`ficha_${utente.nome?.replace(/\s+/g, "_") || "utente"}.pdf`);
    } catch (e) { console.error("Erro ao gerar PDF:", e); }
  }, [utente, tratamentos, config, nomeClinica, simboloMoeda]);

  const handlePartilhar = useCallback(async () => {
    const resumo = `Ficha Clínica — ${utente.nome}\nTel: ${utente.telemovel || "—"}\nEmail: ${utente.email || "—"}\nTratamentos: ${tratamentos.length}\nConsultas: ${consultas.length}`;
    try { await navigator.clipboard.writeText(resumo); } catch { /* fallback */ }
  }, [utente, tratamentos, consultas]);

  // ─── Tabs Configuration ───────────────────────────────────────────────────
  const tabs: { id: TabId; label: string; icon: React.ComponentType<any> }[] = [
    { id: "dashboard",    label: "Dashboard",      icon: BarChart3 },
    { id: "odontograma",  label: "Odontograma",    icon: Smile },
    { id: "tratamentos",  label: "Tratamentos",    icon: Stethoscope },
    { id: "consultas",    label: "Consultas",      icon: Calendar },
    { id: "laboratorio",  label: "Laboratório",    icon: Package },
    { id: "ortodontia",   label: "Ortodontia",     icon: Target },
    { id: "imagens",      label: "Imagiologia",    icon: Camera },
    { id: "pagamentos",   label: "Pagamentos",     icon: Wallet },
    { id: "saude",        label: "Saúde",          icon: Heart },

    { id: "insights",        label: "Insights",        icon: Brain },
    { id: "comunicacao",     label: "Comunicação",    icon: Megaphone },
  ];

  // ─── Loading State ────────────────────────────────────────────────────────
  if (fichaQuery.isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">A carregar ficha do utente...</p>
        </div>
      </div>
    );
  }

  if (fichaQuery.isError || !fichaData?.utente) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-[var(--text-secondary)] text-sm font-medium">Erro ao carregar ficha do utente</p>
          <button onClick={() => fichaQuery.refetch()} className="btn-primary px-4 py-2 rounded-xl text-xs font-bold">Tentar novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Modais */}
      {showModalEditar && <ModalEditarUtente utente={utente} onClose={() => setShowModalEditar(false)} onSuccess={handleRefresh} />}
      {showModalTratamento && <ModalCriarTratamento utenteId={utenteId} onClose={() => setShowModalTratamento(false)} onSuccess={handleRefresh} />}
      {toastOdonto && <Toast message={toastOdonto.msg} tipo={toastOdonto.tipo} onClose={() => setToastOdonto(null)} />}

      {/* Modal Editar Dente */}
      {showEditarDente && denteSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl my-auto overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center"><span className="text-[#00E5FF] font-black">{denteSelecionado}</span></div><div><h2 className="text-[var(--text-primary)] font-bold text-sm">Editar Dente {denteSelecionado}</h2><p className="text-[var(--text-muted)] text-xs">Selecione o novo estado</p></div></div>
              <button onClick={() => setShowEditarDente(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-2">
              <button onClick={() => handleEditarDente("saudavel")} className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm font-bold hover:bg-emerald-500/20 transition-all text-left flex items-center gap-3"><div className="w-3 h-3 rounded-full bg-emerald-400" /> Saudável</button>
              {Object.entries(ESTADOS_DENTE).map(([key, { label, bg, text, border }]) => (
                <button key={key} onClick={() => handleEditarDente(key)} className={`w-full p-3 rounded-xl ${bg} border ${border} ${text} text-sm font-bold hover:opacity-80 transition-all text-left flex items-center gap-3`}><div className={`w-3 h-3 rounded-full ${text.replace("text-", "bg-")}`} /> {label}</button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal Nota Dente */}
      {showNotaDente && denteSelecionado && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl my-auto overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)]">
              <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center"><NotebookPen className="w-5 h-5 text-emerald-400" /></div><div><h2 className="text-[var(--text-primary)] font-bold text-sm">Nota Clínica — Dente {denteSelecionado}</h2><p className="text-[var(--text-muted)] text-xs">Adicionar observação</p></div></div>
              <button onClick={() => { setShowNotaDente(false); setNotaDenteTexto(""); }} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <textarea value={notaDenteTexto} onChange={e => setNotaDenteTexto(e.target.value)} placeholder="Escreva a nota clínica para este dente..." rows={3} className="input-premium w-full resize-none" />
              <div className="flex gap-3"><button onClick={() => { setShowNotaDente(false); setNotaDenteTexto(""); }} className="flex-1 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">Cancelar</button><button onClick={() => { setToastOdonto({ msg: `Nota adicionada ao dente ${denteSelecionado}`, tipo: "success" }); setShowNotaDente(false); setNotaDenteTexto(""); }} disabled={!notaDenteTexto.trim()} className="flex-1 py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white transition-all disabled:opacity-50"><Save className="w-4 h-4" /> Guardar</button></div>
            </div>
          </div>
        </div>
      )}

      {/* ── Header Premium do Utente ── */}
      <div className="card-premium border border-[var(--border-primary)] overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-[#00E5FF] via-violet-500 to-purple-500" />
        <div className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="flex items-start gap-4 flex-1 min-w-0">
              <button onClick={() => onVoltar ? onVoltar() : navigate("/utentes")} className="w-9 h-9 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-colors shrink-0 mt-1">
                <ArrowLeft className="w-4 h-4" />
              </button>
              <AvatarUtente nome={utente.nome || "U"} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h1 className="text-[var(--text-primary)] text-xl font-black truncate">{utente.nome}</h1>
                  <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border ${
                    healthScore >= 80 ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30" :
                    healthScore >= 60 ? "bg-amber-500/20 text-amber-400 border-amber-500/30" :
                    "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}>Score {healthScore}</span>
                  {utente.ativo === false && (
                    <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Inativo</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[var(--text-secondary)] text-xs">
                  {utente.dataNascimento && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{calcularIdade(utente.dataNascimento)}</span>}
                  {utente.telemovel && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{utente.telemovel}</span>}
                  {utente.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{utente.email}</span>}
                  {utente.nif && <span className="flex items-center gap-1"><FileText className="w-3 h-3" />NIF: {utente.nif}</span>}
                  {(utente.cidade || utente.morada) && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{utente.cidade || utente.morada}</span>}
                </div>
                {utente.observacoes && <p className="text-[var(--text-muted)] text-xs mt-2 italic line-clamp-2">{utente.observacoes}</p>}
              </div>
            </div>

            <div className="flex flex-col items-end gap-3 shrink-0">
              <HealthScoreWidget score={healthScore} />
              <div className="flex items-center gap-2">
                <button onClick={() => setShowModalEditar(true)} className="btn-secondary px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5 hover:bg-[#00E5FF]/10 hover:text-[#00E5FF] hover:border-[#00E5FF]/30 transition-all">
                  <Edit2 className="w-3.5 h-3.5" />Editar
                </button>
                <button onClick={() => setShowModalTratamento(true)} className="btn-primary px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5" />Tratamento
                </button>
                <button onClick={handleDescarregarFicha} className="btn-secondary px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5" title="Descarregar ficha em PDF">
                  <Download className="w-3.5 h-3.5" />PDF
                </button>
                <button onClick={handlePartilhar} className="btn-secondary px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-1.5" title="Copiar resumo">
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
        {tabs.map(({ id, label, icon: Icon }) => {
          let badge: string | null = null;
          if (id === "pagamentos") {
            const pendentes = faturas.filter((f: any) => f.estado === "pendente").length;
            if (pendentes > 0) badge = String(pendentes);
          }
          if (id === "tratamentos") {
            const ativos = tratamentos.filter((t: any) => t.estado === "em_progresso" || t.estado === "proposto").length;
            if (ativos > 0) badge = String(ativos);
          }
          if (id === "laboratorio" && enviosLabAtivos > 0) badge = String(enviosLabAtivos);
          if (id === "ortodontia" && tratamentosOrtoAtivos > 0) badge = String(tratamentosOrtoAtivos);
          return (
            <button
              key={id}
              onClick={() => { setTabActiva(id); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all whitespace-nowrap relative ${
                tabActiva === id
                  ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] border border-transparent"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
              {badge && (
                <span className="ml-1 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[9px] font-black px-1 animate-pulse">
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Tab Content ── */}
      {tabActiva === "dashboard" && (
        <DashboardClinico
          utente={utente} consultas={consultas} tratamentos={tratamentos} faturas={faturas}
          anamnese={anamnese} imagens={imagens} enviosLab={enviosLab}
          odontogramaData={odontogramaLocal}
          onNavigate={handleNavigate} onRefresh={handleRefresh} simboloMoeda={simboloMoeda}
        />
      )}

      {tabActiva === "odontograma" && (
        <OdontogramaAvancado
          odontogramaData={odontogramaLocal}
          odontogramaAvancadoData={odontogramaAvancadoData}
          tratamentos={tratamentos}
          imagens={imagens}
          onSave={(dentes, dentesAvancado) => {
            setOdontogramaLocal(dentes);
            setOdontogramaModificado(true);
            type EstadoDente = "saudavel" | "carie" | "restauracao" | "extraido" | "implante" | "tratado" | "ausente" | "coroa" | "endodontia" | "protese" | "extracao_indicada";
            guardarOdontogramaMutation.mutate({
              utenteId,
              dentes: dentes as Record<string, EstadoDente>,
              // V35.5 — Enviar dados avançados (periograma, implantes, prótese, notas)
              dentesAvancado: dentesAvancado as any,
            });
          }}
          onRefresh={handleRefresh}
          isSaving={guardarOdontogramaMutation.isPending}
        />
      )}

      {tabActiva === "tratamentos" && (
        <TabTratamentos tratamentos={tratamentos} faturas={faturas} utenteId={utenteId} onNavigate={handleNavigate} simboloMoeda={simboloMoeda} onRefresh={handleRefresh} />
      )}

      {tabActiva === "consultas" && (
        <TabConsultas consultas={consultas} utenteId={utenteId} onRefresh={handleRefresh} />
      )}

      {tabActiva === "laboratorio" && (
        <TabLaboratorio utenteId={utenteId} simboloMoeda={simboloMoeda} onRefresh={handleRefresh} />
      )}

      {tabActiva === "ortodontia" && (
        <OrtodontiaAvancada
          tratamentos={tratamentos}
          consultas={consultas}
          simboloMoeda={simboloMoeda}
          utenteId={utenteId}
          onRefresh={handleRefresh}
        />
      )}

      {tabActiva === "imagens" && (
        <TabImagiologiaWrapper utenteId={utenteId} imagens={imagens} onRefresh={handleRefresh} />
      )}

      {tabActiva === "pagamentos" && (
        <TabPagamentos faturas={faturas} tratamentos={tratamentos} onNavigate={handleNavigate} simboloMoeda={simboloMoeda} utenteId={utenteId} onRefresh={handleRefresh} />
      )}

      {tabActiva === "saude" && (
        <TabSaude anamnese={anamnese} utente={utente} utenteId={utenteId} onRefresh={handleRefresh} />
      )}


      {tabActiva === "insights" && (
        <InsightsClinicosTab
          utente={utente}
          consultas={consultas}
          tratamentos={tratamentos}
          faturas={faturas}
          anamnese={anamnese}
          imagens={imagens}
          odontogramaData={odontogramaLocal}
          onNavigate={handleNavigate}
          onRefresh={handleRefresh}
        />
      )}

      {tabActiva === "comunicacao" && (
        <TabComunicacao
          utente={utente}
          consultas={consultas}
          onRefresh={handleRefresh}
        />
      )}
    </div>
  );
}
