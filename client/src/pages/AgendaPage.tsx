/**
 * AgendaPage — Agenda Clínica Completa
 * DentCare Elite V36 — REDESIGN VISUAL: Glamour + Informação + Harmonia
 *
 * UPGRADE V36:
 * - REDESIGN: BlocoConsulta com glassmorphism, gradientes suaves e ícones de estado
 * - REDESIGN: Cores de estado harmonizadas com o design system (cyan/violet/emerald)
 * - REDESIGN: Header dos médicos com gradiente e contagem elegante
 * - REDESIGN: Vista Mês com cards mais ricos e hover premium
 * - REDESIGN: Vista Semana com blocos mais legíveis e cores consistentes
 * - NOVO: Duração da consulta visível nos blocos (ex: "30 min")
 * - NOVO: Ícone do tipo de consulta nos blocos
 * - NOVO: Badge de estado com label nos blocos grandes
 * - NOVO: Gradiente sutil no fundo dos blocos baseado na cor do médico
 * - NOVO: Hora de fim visível nos blocos completos
 * - MELHORIA: Tooltip redesenhado com mais informação
 * - MELHORIA: Cores dos estados mais suaves e integradas no tema escuro
 *
 * ANTERIORES V35:
 * - Cores fortes para estados (verde=confirmada, vermelho=cancelada)
 * - Ícones de estado de comunicação nos blocos
 * - Quick-actions WhatsApp no modal de detalhes
 * - Botão "Confirmar Todos" para enviar confirmações em lote
 * - Legenda de estados visual
 * - Auto-refresh a cada 30s
 * - Link direto para ficha do utente
 * - Indicador visual de estado no-show
 * - Feriados dinâmicos via API Nager.Date
 * - Vista Dia: colunas por dentista, drag & drop
 * - Vista Semana: estilo Google Calendar
 * - Vista Mês: calendário com feriados e contagem
 * - Filtro por médico com chips coloridos
 * - Check-in e estados intermédios (sala de espera, em consulta)
 */
import React, { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { ModalNovaConsulta } from "../components/ModalNovaConsulta";
import { ModalGestaoTiposConsulta } from "../components/ModalGestaoTiposConsulta";
import { PainelConfirmacaoLote } from "../components/PainelConfirmacaoLote";
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, useDroppable, useDraggable,
} from "@dnd-kit/core";
import {
  format, addDays, addWeeks, addMonths, subDays, subWeeks, subMonths,
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, isSameDay, isSameMonth,
  isToday, differenceInMinutes, getHours, getMinutes,
  setHours, setMinutes, startOfDay, endOfDay, addMinutes,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronLeft, ChevronRight, Plus, Clock, User,
  Calendar, X, Check, Loader2, Search, AlertCircle, Save,
  MessageCircle, Edit2, Trash2, CheckCircle2, XCircle,
  MoreVertical, Phone, ExternalLink, Filter, Users, Settings,
  Send, Bell, Heart, Star, RefreshCw, Megaphone, FileText, Eye,
  Flag, Building, GraduationCap, CalendarPlus, Globe, MapPin, Info,
  LogIn, Stethoscope, ClipboardCheck, UserCheck, Timer,
  AlertTriangle,
} from "lucide-react";
import { useLocation } from "wouter";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Consulta {
  id: number;
  utenteId: number;
  medicoId: number;
  dataHoraInicio: Date | string;
  dataHoraFim: Date | string;
  estado: string;
  tipoConsulta: string | null;
  tipoConsultaId?: number | null;
  observacoes: string | null;
  utenteNome: string;
  utenteTelemovel?: string;
  medicoNome: string;
  medicoCor?: string | null;
}

interface Feriado {
  date: string;
  nome: string;
  nomeEN: string;
  tipo: string;
  tipos: string[];
  global: boolean;
  countryCode: string;
  categoria: "feriado_nacional" | "feriado_bancario" | "feriado_escolar" | "opcional" | "comemorativo" | "personalizado";
  cor: string;
  icone: string;
}

interface MedicoAgenda {
  id: number;
  nome: string;
  especialidade?: string;
  corAgenda?: string | null;
  ativo: boolean;
}

// ─── Constantes ───────────────────────────────────────────────────────────────
const HORA_INICIO_PADRAO = 7;
const HORA_FIM_PADRAO    = 21;
const SLOT_HEIGHT = 120;
const MEIA_HORA_HEIGHT = SLOT_HEIGHT / 2;

// V36: Cores de estado redesenhadas — mais suaves, integradas no tema escuro cyberpunk
const ESTADO_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; label: string; glow?: string; icon: typeof Clock; gradientFrom: string; gradientTo: string }> = {
  agendada: {
    bg: "bg-sky-500/8", border: "border-l-sky-400", text: "text-sky-200",
    dot: "bg-sky-400", label: "Agendada", glow: "",
    icon: Clock, gradientFrom: "from-sky-500/10", gradientTo: "to-sky-600/5",
  },
  confirmada: {
    bg: "bg-emerald-500/10", border: "border-l-emerald-400", text: "text-emerald-200",
    dot: "bg-emerald-400", label: "Confirmada", glow: "ring-1 ring-emerald-400/30",
    icon: CheckCircle2, gradientFrom: "from-emerald-500/12", gradientTo: "to-emerald-600/5",
  },
  realizada: {
    bg: "bg-teal-500/8", border: "border-l-teal-400", text: "text-teal-200",
    dot: "bg-teal-400", label: "Realizada", glow: "",
    icon: ClipboardCheck, gradientFrom: "from-teal-500/10", gradientTo: "to-teal-600/5",
  },
  cancelada: {
    bg: "bg-rose-500/10", border: "border-l-rose-400", text: "text-rose-200",
    dot: "bg-rose-400", label: "Cancelada", glow: "ring-1 ring-rose-400/25",
    icon: XCircle, gradientFrom: "from-rose-500/12", gradientTo: "to-rose-600/5",
  },
  "no-show": {
    bg: "bg-amber-500/10", border: "border-l-amber-400", text: "text-amber-200",
    dot: "bg-amber-400", label: "Faltou", glow: "ring-1 ring-amber-400/20",
    icon: AlertTriangle, gradientFrom: "from-amber-500/12", gradientTo: "to-amber-600/5",
  },
  em_sala_espera: {
    bg: "bg-orange-500/10", border: "border-l-orange-400", text: "text-orange-200",
    dot: "bg-orange-400", label: "Sala de Espera", glow: "ring-1 ring-orange-400/30 animate-pulse",
    icon: Timer, gradientFrom: "from-orange-500/12", gradientTo: "to-orange-600/5",
  },
  em_consulta: {
    bg: "bg-violet-500/10", border: "border-l-violet-400", text: "text-violet-200",
    dot: "bg-violet-400", label: "Em Consulta", glow: "ring-1 ring-violet-400/30",
    icon: Stethoscope, gradientFrom: "from-violet-500/12", gradientTo: "to-violet-600/5",
  },
};

// ─── Paleta de cores para médicos (V36: mais vibrante e harmoniosa) ──────────
const CORES_MEDICOS = [
  { nome: "Azul",     classe: "bg-blue-500",    hex: "#3b82f6",  border: "border-l-blue-400",    bg: "bg-blue-500/12",    text: "text-blue-300",    headerGrad: "from-blue-500/20 to-blue-600/5" },
  { nome: "Violeta",  classe: "bg-violet-500",  hex: "#8b5cf6",  border: "border-l-violet-400",  bg: "bg-violet-500/12",  text: "text-violet-300",  headerGrad: "from-violet-500/20 to-violet-600/5" },
  { nome: "Esmeralda",classe: "bg-emerald-500", hex: "#10b981",  border: "border-l-emerald-400", bg: "bg-emerald-500/12", text: "text-emerald-300", headerGrad: "from-emerald-500/20 to-emerald-600/5" },
  { nome: "Âmbar",    classe: "bg-amber-500",   hex: "#f59e0b",  border: "border-l-amber-400",   bg: "bg-amber-500/12",   text: "text-amber-300",   headerGrad: "from-amber-500/20 to-amber-600/5" },
  { nome: "Rosa",     classe: "bg-pink-500",    hex: "#ec4899",  border: "border-l-pink-400",    bg: "bg-pink-500/12",    text: "text-pink-300",    headerGrad: "from-pink-500/20 to-pink-600/5" },
  { nome: "Ciano",    classe: "bg-cyan-500",    hex: "#06b6d4",  border: "border-l-cyan-400",    bg: "bg-cyan-500/12",    text: "text-cyan-300",    headerGrad: "from-cyan-500/20 to-cyan-600/5" },
  { nome: "Laranja",  classe: "bg-orange-500",  hex: "#f97316",  border: "border-l-orange-400",  bg: "bg-orange-500/12",  text: "text-orange-300",  headerGrad: "from-orange-500/20 to-orange-600/5" },
  { nome: "Lima",     classe: "bg-lime-500",    hex: "#84cc16",  border: "border-l-lime-400",    bg: "bg-lime-500/12",    text: "text-lime-300",    headerGrad: "from-lime-500/20 to-lime-600/5" },
  { nome: "Índigo",   classe: "bg-[#00E5FF]",   hex: "#00E5FF",  border: "border-l-[#00E5FF]",   bg: "bg-[#00E5FF]/12",   text: "text-[#00E5FF]",   headerGrad: "from-[#00E5FF]/20 to-cyan-600/5" },
  { nome: "Vermelho", classe: "bg-red-500",     hex: "#ef4444",  border: "border-l-red-400",     bg: "bg-red-500/12",     text: "text-red-300",     headerGrad: "from-red-500/20 to-red-600/5" },
];

function getCorMedico(medicoId: number, corAgenda?: string | null): typeof CORES_MEDICOS[0] {
  if (corAgenda) {
    const found = CORES_MEDICOS.find(c => c.nome.toLowerCase() === corAgenda.toLowerCase() || c.hex === corAgenda);
    if (found) return found;
  }
  return CORES_MEDICOS[medicoId % CORES_MEDICOS.length];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
const toDate = (d: Date | string): Date => typeof d === "string" ? new Date(d) : d;
const fmtHora = (d: Date | string) => format(toDate(d), "HH:mm");
const duracaoMin = (i: Date | string, f: Date | string) => differenceInMinutes(toDate(f), toDate(i));

const CHECKIN_TAG = "__checkin__:";
function getCheckinEstado(observacoes: string | null): "em_sala_espera" | "em_consulta" | null {
  if (!observacoes) return null;
  const match = observacoes.match(/__checkin__:(em_sala_espera|em_consulta)/);
  return match ? (match[1] as any) : null;
}
function getEstadoEfetivo(consulta: Consulta): string {
  const checkin = getCheckinEstado(consulta.observacoes);
  if (checkin && (consulta.estado === "agendada" || consulta.estado === "confirmada")) return checkin;
  return consulta.estado;
}
function setCheckinObservacoes(observacoes: string | null, checkin: string | null): string {
  const base = (observacoes || "").replace(/__checkin__:(em_sala_espera|em_consulta)\n?/g, "").trim();
  if (!checkin) return base;
  return checkin ? `${CHECKIN_TAG}${checkin}\n${base}`.trim() : base;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Modal: Detalhes da Consulta
// ═══════════════════════════════════════════════════════════════════════════════
function ModalDetalhesConsulta({ consulta, onClose, onSuccess }: {
  consulta: Consulta; onClose: () => void; onSuccess: () => void;
}) {
  const [, navigate] = useLocation();
  const [editando, setEditando] = useState(false);
  const [whatsappStatus, setWhatsappStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({
    tipoConsulta: consulta.tipoConsulta || "",
    observacoes: consulta.observacoes || "",
    estado: consulta.estado
  });
  
  const tiposQ = trpc.consultas.listarTipos.useQuery();
  const tipos = (tiposQ.data as any)?.tipos ?? [];
  
  const updateStatus = trpc.consultas.updateStatus.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  const [checkinEstado, setCheckinEstadoLocal] = useState<"em_sala_espera" | "em_consulta" | null>(
    () => getCheckinEstado(consulta.observacoes)
  );
  const updateConsultaCheckin = trpc.consultas.update.useMutation({
    onSuccess: () => { onSuccess(); },
  });
  const handleCheckin = (novoCheckin: "em_sala_espera" | "em_consulta" | null) => {
    const novasObs = setCheckinObservacoes(consulta.observacoes, novoCheckin);
    setCheckinEstadoLocal(novoCheckin);
    updateConsultaCheckin.mutate({ consultaId: consulta.id, observacoes: novasObs });
  };

  const updateConsulta = trpc.consultas.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });
  const eliminar = trpc.consultas.delete.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  // V35: WhatsApp API
  const enviarWhatsApp = trpc.whatsapp.enviarMensagem.useMutation({
    onSuccess: () => setWhatsappStatus("sent"),
    onError: () => setWhatsappStatus("error"),
  });
  const handleEnviarLembrete = () => {
    if (!consulta.utenteTelemovel) return;
    setWhatsappStatus("sending");
    enviarWhatsApp.mutate({
      para: consulta.utenteTelemovel,
      mensagem: `Olá ${consulta.utenteNome.split(" ")[0]}! Lembramos da sua consulta amanhã às ${fmtHora(consulta.dataHoraInicio)} com ${consulta.medicoNome}. Confirma a presença?`,
      tipo: "lembrete",
      utenteId: consulta.utenteId,
    });
  };

  const estadoEfetivo = getEstadoEfetivo(consulta);
  const estadoCor = ESTADO_COLORS[estadoEfetivo] ?? ESTADO_COLORS.agendada;
  const corMedico = getCorMedico(consulta.medicoId, consulta.medicoCor);
  const EstadoIcon = estadoCor.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-md bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header com gradiente do médico */}
        <div className={`bg-gradient-to-r ${corMedico.headerGrad} p-6 border-b border-[var(--border-light)]`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${corMedico.classe} flex items-center justify-center shadow-lg`}>
                <span className="text-white text-lg font-black">{consulta.utenteNome.charAt(0)}</span>
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-bold text-lg leading-tight">{consulta.utenteNome}</h3>
                <p className="text-[var(--text-secondary)] text-sm">{consulta.tipoConsulta || "Consulta Geral"}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-5 h-5 text-[var(--text-tertiary)]" />
            </button>
          </div>
          
          {/* Info bar */}
          <div className="flex items-center gap-4 mt-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Clock className={`w-3.5 h-3.5 ${corMedico.text}`} />
              <span className="text-[var(--text-primary)] text-sm font-semibold">
                {fmtHora(consulta.dataHoraInicio)} - {fmtHora(consulta.dataHoraFim)}
              </span>
              <span className="text-[var(--text-muted)] text-xs">({duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim)} min)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Stethoscope className={`w-3.5 h-3.5 ${corMedico.text}`} />
              <span className="text-[var(--text-secondary)] text-sm">{consulta.medicoNome}</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${estadoCor.bg} border border-white/5`}>
              <EstadoIcon className={`w-3 h-3 ${estadoCor.text}`} />
              <span className={`text-xs font-bold ${estadoCor.text}`}>{estadoCor.label}</span>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto">
          {/* Check-in */}
          {(consulta.estado === "agendada" || consulta.estado === "confirmada") && (
            <div className="space-y-2">
              <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Check-in do Utente</p>
              <div className="grid grid-cols-3 gap-2">
                <button onClick={() => handleCheckin(checkinEstado === "em_sala_espera" ? null : "em_sala_espera")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    checkinEstado === "em_sala_espera"
                      ? "bg-orange-500 text-white shadow-lg shadow-orange-500/30"
                      : "bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                  }`}>
                  <LogIn className="w-3.5 h-3.5" /> Sala Espera
                </button>
                <button onClick={() => handleCheckin(checkinEstado === "em_consulta" ? null : "em_consulta")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    checkinEstado === "em_consulta"
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                      : "bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20"
                  }`}>
                  <Stethoscope className="w-3.5 h-3.5" /> Em Consulta
                </button>
                <button onClick={() => updateStatus.mutate({ consultaId: consulta.id, novoStatus: "realizada" })}
                  className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-all">
                  <ClipboardCheck className="w-3.5 h-3.5" /> Concluída
                </button>
              </div>
              {checkinEstado && (
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
                  checkinEstado === "em_sala_espera" ? "bg-orange-500/10 text-orange-400" : "bg-violet-500/10 text-violet-400"
                }`}>
                  <Timer className="w-3.5 h-3.5" />
                  {checkinEstado === "em_sala_espera" ? "Utente na sala de espera" : "Consulta em curso"}
                </div>
              )}
            </div>
          )}

          {/* Ações de Estado */}
          <div className="space-y-2">
            <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Alterar Estado</p>
            <div className="grid grid-cols-3 gap-2">
              <button 
                onClick={() => updateStatus.mutate({ consultaId: consulta.id, novoStatus: "confirmada" })}
                disabled={consulta.estado === "confirmada"}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${consulta.estado === "confirmada" ? "bg-emerald-500 text-white" : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"}`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Confirmar
              </button>
              <button 
                onClick={() => updateStatus.mutate({ consultaId: consulta.id, novoStatus: "cancelada" })}
                disabled={consulta.estado === "cancelada"}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${consulta.estado === "cancelada" ? "bg-rose-500 text-white" : "bg-rose-500/10 border border-rose-500/20 text-rose-400 hover:bg-rose-500/20"}`}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button 
                onClick={() => updateStatus.mutate({ consultaId: consulta.id, novoStatus: "no-show" })}
                disabled={consulta.estado === "no-show"}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${consulta.estado === "no-show" ? "bg-amber-500 text-white" : "bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"}`}
              >
                <AlertTriangle className="w-3.5 h-3.5" /> Faltou
              </button>
            </div>
          </div>

          {/* Links rápidos */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { onClose(); navigate(`/utentes?utenteId=${consulta.utenteId}`); }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs font-bold hover:bg-[#00E5FF]/20 transition-all"
            >
              <Eye className="w-3.5 h-3.5" /> Ver Ficha
            </button>
            <button
              onClick={() => { onClose(); navigate(`/utentes?utenteId=${consulta.utenteId}&tab=comunicacao`); }}
              className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold hover:bg-violet-500/20 transition-all"
            >
              <Megaphone className="w-3.5 h-3.5" /> Comunicação
            </button>
          </div>

          {/* WhatsApp */}
          {consulta.utenteTelemovel && (
            <button
              onClick={handleEnviarLembrete}
              disabled={whatsappStatus === "sending" || whatsappStatus === "sent"}
              className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                whatsappStatus === "sent" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/20" :
                whatsappStatus === "error" ? "bg-rose-500/20 text-rose-400 border border-rose-500/20" :
                "bg-green-500/10 border border-green-500/20 text-green-400 hover:bg-green-500/20"
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              {whatsappStatus === "sending" ? "A enviar..." : whatsappStatus === "sent" ? "Lembrete enviado!" : whatsappStatus === "error" ? "Falha no envio" : "Enviar Lembrete WhatsApp"}
            </button>
          )}

          {/* Detalhes clínicos */}
          <div className="space-y-3 pt-4 border-t border-[var(--border-light)]">
            <div className="flex items-center justify-between">
              <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Detalhes Clínicos</p>
              <button onClick={() => setEditando(!editando)} className="text-[#00E5FF] text-xs font-bold hover:underline flex items-center gap-1">
                <Edit2 className="w-3 h-3" /> {editando ? "Cancelar" : "Editar"}
              </button>
            </div>
            
            {editando ? (
              <div className="space-y-3">
                <select
                  className="input-premium w-full appearance-none"
                  value={form.tipoConsulta}
                  onChange={e => setForm(f => ({ ...f, tipoConsulta: e.target.value }))}
                >
                  <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Selecionar tipo...</option>
                  {tipos.map((t: any) => (
                    <option key={t.id} value={t.nome} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{t.nome} ({t.duracaoPadrao} min)</option>
                  ))}
                </select>
                <textarea 
                  className="input-premium w-full resize-none" 
                  rows={3}
                  value={form.observacoes} 
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  placeholder="Observações..."
                />
                <button 
                  onClick={() => updateConsulta.mutate({ consultaId: consulta.id, tipoConsulta: form.tipoConsulta, observacoes: form.observacoes })}
                  className="w-full py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-bold hover:bg-[#00E5FF]/90 transition-colors"
                >
                  Guardar Alterações
                </button>
              </div>
            ) : (
              <div className="bg-[var(--bg-overlay)] rounded-xl p-4 space-y-2">
                <p className="text-[var(--text-primary)] text-sm font-medium">{consulta.tipoConsulta || "Consulta Geral"}</p>
                <p className="text-[var(--text-secondary)] text-xs italic">{consulta.observacoes?.replace(/__checkin__:(em_sala_espera|em_consulta)\n?/g, "").trim() || "Sem observações registadas."}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
            <button 
              onClick={() => confirm("Eliminar marcação permanentemente?") && eliminar.mutate({ consultaId: consulta.id })}
              className="text-rose-500/50 hover:text-rose-500 text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" /> Eliminar Registro
            </button>
            <button onClick={onClose} className="text-[var(--text-tertiary)] text-xs font-bold hover:text-[var(--text-primary)] transition-colors">
              Fechar Detalhes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componentes de Apoio ─────────────────────────────────────────────────────

function ColunaDrop({ id, children, className, style, onClickAt, SLOT_HEIGHT, HORA_INICIO }: {
  id: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClickAt: (hora: number, minuto: number) => void;
  SLOT_HEIGHT: number;
  HORA_INICIO: number;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top + e.currentTarget.scrollTop;
    const totalMinutos = (y / SLOT_HEIGHT) * 60;
    const horaOffset = Math.floor(totalMinutos / 30) * 30;
    const hora = HORA_INICIO + Math.floor(horaOffset / 60);
    const minuto = horaOffset % 60;
    onClickAt(hora, minuto);
  };

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      className={className}
      style={{
        ...style,
        backgroundColor: isOver ? "rgba(99,102,241,0.07)" : undefined,
        cursor: "pointer",
      }}
    >
      {children}
    </div>
  );
}

function useLinhaViva(horaInicio: number, horaFim: number, slotHeight: number) {
  const [agora, setAgora] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setAgora(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);
  const h = getHours(agora);
  const m = getMinutes(agora);
  const visivel = h >= horaInicio && h <= horaFim;
  const top = ((h - horaInicio) * 60 + m) * (slotHeight / 60);
  return { top, visivel };
}

function SlotDrop({ id, className, style, onClick }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} onClick={onClick} className={className}
      style={{ ...style, backgroundColor: isOver ? "rgba(99,102,241,0.1)" : undefined }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BlocoConsulta V36 — REDESIGN GLAMOUR
// Glassmorphism, gradientes, ícones de estado, duração visível, hora de fim
// ═══════════════════════════════════════════════════════════════════════════════
function BlocoConsulta({ consulta, style, onSelect }: {
  consulta: Consulta;
  style: React.CSSProperties;
  onSelect: (c: Consulta) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `consulta-${consulta.id}`,
    data: consulta,
  });
  
  const corMedico = getCorMedico(consulta.medicoId, consulta.medicoCor);
  const estadoEfetivo = getEstadoEfetivo(consulta);
  const estadoCor = ESTADO_COLORS[estadoEfetivo] ?? ESTADO_COLORS.agendada;
  const EstadoIcon = estadoCor.icon;
  const duracao = duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim);
  
  const alturaBloco = typeof style.height === "number" ? style.height : 60;
  const nivel = alturaBloco >= 100 ? "completo" : alturaBloco >= 65 ? "medio" : alturaBloco >= 40 ? "compacto" : "minimo";

  const s: React.CSSProperties = {
    ...style,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 10,
  };

  const tooltipText = `${consulta.utenteNome}\n${fmtHora(consulta.dataHoraInicio)} - ${fmtHora(consulta.dataHoraFim)} (${duracao} min)\n${consulta.tipoConsulta || "Consulta Geral"}\nDr(a). ${consulta.medicoNome}\nEstado: ${estadoCor.label}`;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(consulta); }}
      title={tooltipText}
      className={`absolute rounded-xl border-l-[3px] shadow-lg cursor-grab active:cursor-grabbing overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.015] hover:z-20 backdrop-blur-sm ${corMedico.border} ${estadoCor.glow || ""}`}
      style={{
        ...s,
        background: `linear-gradient(135deg, ${corMedico.hex}12 0%, ${corMedico.hex}06 50%, transparent 100%)`,
        borderColor: `${corMedico.hex}20`,
        borderWidth: "1px",
        borderLeftWidth: "3px",
        borderLeftColor: corMedico.hex,
      }}
    >
      <div className="h-full flex flex-col relative">
        {/* ─── LAYOUT COMPLETO (>= 100px) ─── */}
        {nivel === "completo" && (
          <div className="p-2.5 flex flex-col h-full">
            {/* Linha 1: Nome + Badge hora */}
            <div className="flex items-start justify-between gap-1.5 mb-1.5">
              <span className="font-bold text-[13px] leading-snug truncate text-[var(--text-primary)]">
                {consulta.utenteNome}
              </span>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-[var(--text-primary)]"
                  style={{ backgroundColor: `${corMedico.hex}25` }}>
                  {fmtHora(consulta.dataHoraInicio)}
                </span>
              </div>
            </div>
            
            {/* Linha 2: Tipo de consulta + duração */}
            <div className="flex items-center gap-2 mb-1.5">
              <div className="flex items-center gap-1 min-w-0">
                <Stethoscope className="w-3 h-3 text-[var(--text-tertiary)] shrink-0" />
                <span className="text-[11px] font-semibold truncate text-[var(--text-secondary)]">
                  {consulta.tipoConsulta || "Consulta Geral"}
                </span>
              </div>
              <span className="text-[9px] font-bold text-[var(--text-muted)] shrink-0 bg-white/5 px-1.5 py-0.5 rounded">
                {duracao}min
              </span>
            </div>

            {/* Linha 3: Médico + Estado (fundo) */}
            <div className="flex items-center justify-between mt-auto pt-1.5 border-t border-white/5">
              <div className="flex items-center gap-1.5 min-w-0">
                <div className={`w-5 h-5 rounded-md ${corMedico.classe} flex items-center justify-center shrink-0`}>
                  <span className="text-white text-[8px] font-black">{consulta.medicoNome.charAt(0)}</span>
                </div>
                <span className="text-[10px] font-semibold truncate text-[var(--text-secondary)]">
                  {consulta.medicoNome.split(" ").slice(0, 2).join(" ")}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md ${estadoCor.bg}`}>
                  <EstadoIcon className={`w-2.5 h-2.5 ${estadoCor.text}`} />
                  <span className={`text-[8px] font-bold ${estadoCor.text} uppercase tracking-wider`}>{estadoCor.label}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── LAYOUT MÉDIO (65-99px) ─── */}
        {nivel === "medio" && (
          <div className="p-2 flex flex-col h-full">
            <div className="flex items-center justify-between gap-1.5 mb-1">
              <span className="font-bold text-[12px] leading-snug truncate text-[var(--text-primary)]">
                {consulta.utenteNome}
              </span>
              <span className="text-[10px] font-black shrink-0 px-1.5 py-0.5 rounded-md text-[var(--text-primary)]"
                style={{ backgroundColor: `${corMedico.hex}25` }}>
                {fmtHora(consulta.dataHoraInicio)}
              </span>
            </div>
            <div className="flex items-center justify-between mt-auto">
              <div className="flex items-center gap-1.5 min-w-0">
                <Stethoscope className="w-2.5 h-2.5 text-[var(--text-muted)] shrink-0" />
                <span className="text-[10px] font-medium truncate text-[var(--text-tertiary)]">
                  {consulta.tipoConsulta || "Consulta Geral"}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-[8px] font-bold text-[var(--text-muted)]">{duracao}m</span>
                <div className={`w-2.5 h-2.5 rounded-full ${estadoCor.dot}`} />
              </div>
            </div>
          </div>
        )}

        {/* ─── LAYOUT COMPACTO (40-64px) ─── */}
        {nivel === "compacto" && (
          <div className="px-2 py-1 flex items-center justify-between gap-1 h-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-2 h-2 rounded-full ${estadoCor.dot} shrink-0`} />
              <span className="font-bold text-[11px] truncate text-[var(--text-primary)]">
                {consulta.utenteNome.split(" ")[0]}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded text-[var(--text-primary)]"
                style={{ backgroundColor: `${corMedico.hex}20` }}>
                {fmtHora(consulta.dataHoraInicio)}
              </span>
            </div>
          </div>
        )}

        {/* ─── LAYOUT MÍNIMO (< 40px) ─── */}
        {nivel === "minimo" && (
          <div className="flex items-center gap-1 h-full px-1.5 overflow-hidden">
            <div className={`w-1.5 h-1.5 rounded-full ${estadoCor.dot} shrink-0`} />
            <span className="font-bold text-[10px] truncate text-[var(--text-primary)]">
              {fmtHora(consulta.dataHoraInicio)} {consulta.utenteNome.split(" ")[0]}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DragOverlayBloco({ consulta }: { consulta: Consulta }) {
  const corMedico = getCorMedico(consulta.medicoId, consulta.medicoCor);
  const estadoEfetivo = getEstadoEfetivo(consulta);
  const estadoCor = ESTADO_COLORS[estadoEfetivo] ?? ESTADO_COLORS.agendada;
  const EstadoIcon = estadoCor.icon;
  const duracao = duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim);

  return (
    <div className="w-60 rounded-xl border border-white/10 shadow-2xl backdrop-blur-md overflow-hidden"
      style={{ background: `linear-gradient(135deg, ${corMedico.hex}20 0%, rgba(8,15,30,0.95) 100%)` }}>
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="font-bold text-sm text-[var(--text-primary)]">{consulta.utenteNome}</p>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-md text-[var(--text-primary)]"
            style={{ backgroundColor: `${corMedico.hex}30` }}>
            {fmtHora(consulta.dataHoraInicio)}
          </span>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Stethoscope className={`w-3 h-3 ${corMedico.text}`} />
            <p className="text-[var(--text-secondary)] text-[11px] font-medium">{consulta.tipoConsulta || "Consulta Geral"}</p>
            <span className="text-[9px] font-bold text-[var(--text-muted)] ml-auto">{duracao}min</span>
          </div>
          <div className="flex items-center gap-2">
            <User className={`w-3 h-3 ${corMedico.text}`} />
            <p className="text-[var(--text-tertiary)] text-[11px] font-semibold">{consulta.medicoNome}</p>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <EstadoIcon className={`w-3 h-3 ${estadoCor.text}`} />
            <span className={`text-[10px] font-bold ${estadoCor.text}`}>{estadoCor.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filtro por Médico (Chips Coloridos) — V36: mais elegante
// ═══════════════════════════════════════════════════════════════════════════════
function FiltroMedicos({ medicos, medicosFiltrados, onToggle, onToggleTodos }: {
  medicos: MedicoAgenda[];
  medicosFiltrados: Set<number>;
  onToggle: (id: number) => void;
  onToggleTodos: () => void;
}) {
  const todosAtivos = medicosFiltrados.size === 0;
  
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1.5 mr-1">
        <Filter className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
        <span className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Médicos:</span>
      </div>
      
      <button
        onClick={onToggleTodos}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
          todosAtivos
            ? "bg-[var(--bg-subtle)] border-[var(--accent-border)] text-[var(--text-primary)] shadow-sm"
            : "bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)]"
        }`}
      >
        <Users className="w-3 h-3" />
        Todos
      </button>
      
      {medicos.map(m => {
        const cor = getCorMedico(m.id, m.corAgenda);
        const ativo = todosAtivos || medicosFiltrados.has(m.id);
        return (
          <button
            key={m.id}
            onClick={() => onToggle(m.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all border ${
              ativo
                ? `${cor.bg} border-current ${cor.text} shadow-sm`
                : "bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] opacity-50"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${cor.classe} ${ativo ? "shadow-sm" : "opacity-40"}`} />
            {m.nome.split(" ")[0]}
            {m.especialidade && <span className="opacity-60 font-normal">({m.especialidade})</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA DIA V36 — Headers com gradiente, colunas mais elegantes
// ═══════════════════════════════════════════════════════════════════════════════
function VistaDia({ data, consultas, medicos, feriados, onNovaConsulta, onSelectConsulta, HORAS, SLOT_HEIGHT, minutosDesdeInicio }: any) {
  const HORA_INICIO = HORAS[0];
  const { top, visivel } = useLinhaViva(HORA_INICIO, HORAS[HORAS.length - 1], SLOT_HEIGHT);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && visivel) ref.current.scrollTop = Math.max(0, top - 200); }, []);
  const MEIA = SLOT_HEIGHT / 2;

  const feriadoDoDia = useMemo(() => {
    if (!feriados || !Array.isArray(feriados)) return null;
    const dataStr = format(data, "yyyy-MM-dd");
    return feriados.find((f: Feriado) => f.date === dataStr) || null;
  }, [feriados, data]);

  const consultasDoDia = useMemo(() => {
    if (!consultas || !Array.isArray(consultas)) return [];
    const dataRef = new Date(data);
    const refYear = dataRef.getFullYear();
    const refMonth = dataRef.getMonth();
    const refDate = dataRef.getDate();
    return consultas.filter((c: any) => {
      if (!c || !c.dataHoraInicio) return false;
      try {
        const dataConsulta = new Date(c.dataHoraInicio);
        if (isNaN(dataConsulta.getTime())) return false;
        return dataConsulta.getFullYear() === refYear &&
               dataConsulta.getMonth() === refMonth &&
               dataConsulta.getDate() === refDate;
      } catch { return false; }
    });
  }, [consultas, data]);

  const medicosVisiveis: MedicoAgenda[] = medicos.length > 0 ? medicos : [];

  if (medicosVisiveis.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-16 h-16 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
          <Users className="w-8 h-8 text-[#00E5FF]" />
        </div>
        <div className="text-center">
          <p className="text-[var(--text-primary)] font-bold text-lg">Nenhum médico cadastrado</p>
          <p className="text-[var(--text-tertiary)] text-sm mt-1">Cadastre médicos na secção Equipa para visualizar a agenda.</p>
        </div>
      </div>
    );
  }

  const MIN_COL_WIDTH = 220;

  const feriadoCatColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
    feriado_nacional: { bg: "bg-red-500/10", border: "border-red-500/30", text: "text-red-400", icon: "text-red-400" },
    feriado_bancario: { bg: "bg-amber-500/10", border: "border-amber-500/30", text: "text-amber-400", icon: "text-amber-400" },
    feriado_escolar: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", icon: "text-blue-400" },
    opcional: { bg: "bg-violet-500/10", border: "border-violet-500/30", text: "text-violet-400", icon: "text-violet-400" },
    comemorativo: { bg: "bg-emerald-500/10", border: "border-emerald-500/30", text: "text-emerald-400", icon: "text-emerald-400" },
    personalizado: { bg: "bg-cyan-500/10", border: "border-cyan-500/30", text: "text-cyan-400", icon: "text-cyan-400" },
  };

  return (
    <div className="flex flex-col">
      {/* Banner de Feriado */}
      {feriadoDoDia && (() => {
        const cores = feriadoCatColors[feriadoDoDia.categoria] || feriadoCatColors.comemorativo;
        const FeriadoIcon = feriadoDoDia.categoria === "feriado_nacional" ? Flag
          : feriadoDoDia.categoria === "feriado_bancario" ? Building
          : feriadoDoDia.categoria === "feriado_escolar" ? GraduationCap
          : feriadoDoDia.categoria === "personalizado" ? CalendarPlus
          : feriadoDoDia.categoria === "opcional" ? Star
          : Heart;
        const tipoLabel = feriadoDoDia.categoria === "feriado_nacional" ? "Feriado Nacional"
          : feriadoDoDia.categoria === "feriado_bancario" ? "Feriado Bancário"
          : feriadoDoDia.categoria === "feriado_escolar" ? "Feriado Escolar"
          : feriadoDoDia.categoria === "opcional" ? "Dia Opcional"
          : feriadoDoDia.categoria === "comemorativo" ? "Data Comemorativa"
          : "Feriado Personalizado";
        return (
          <div className={`flex items-center gap-3 px-6 py-3 ${cores.bg} border-b ${cores.border}`}>
            <div className={`w-8 h-8 rounded-xl ${cores.bg} border ${cores.border} flex items-center justify-center`}>
              <FeriadoIcon className={`w-4 h-4 ${cores.icon}`} />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className={`text-sm font-bold ${cores.text}`}>{feriadoDoDia.nome}</span>
                <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${cores.bg} border ${cores.border} ${cores.text}`}>
                  {tipoLabel}
                </span>
              </div>
              {feriadoDoDia.nomeEN && feriadoDoDia.nomeEN !== feriadoDoDia.nome && (
                <span className="text-[10px] text-[var(--text-muted)]">{feriadoDoDia.nomeEN}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <AlertCircle className={`w-4 h-4 ${cores.icon}`} />
              <span className={`text-[10px] font-bold ${cores.text}`}>
                {feriadoDoDia.categoria === "feriado_nacional" ? "Atenção: Clínica pode estar encerrada" : "Verifique o horário de funcionamento"}
              </span>
            </div>
          </div>
        );
      })()}

      {/* V36: Header dos médicos com gradiente e design premium */}
      <div className="flex border-b border-[var(--border-lighter)] shrink-0 bg-[var(--bg-surface)] sticky top-0 z-30">
        <div className="w-16 shrink-0 border-r border-[var(--border-lightest)]" />
        {medicosVisiveis.map((medico) => {
          const cor = getCorMedico(medico.id, medico.corAgenda);
          const consultasMedico = consultasDoDia.filter((c: any) => c.medicoId === medico.id);
          const confirmadas = consultasMedico.filter((c: any) => c.estado === "confirmada").length;
          return (
            <div key={medico.id}
              className={`flex-1 border-l border-[var(--border-lightest)] py-4 px-3 bg-gradient-to-b ${cor.headerGrad}`}
              style={{ minWidth: MIN_COL_WIDTH }}>
              <div className="flex flex-col items-center gap-2">
                <div className={`w-10 h-10 rounded-xl ${cor.classe} flex items-center justify-center shadow-lg`}
                  style={{ boxShadow: `0 4px 16px ${cor.hex}30` }}>
                  <span className="text-white text-sm font-black">{medico.nome.charAt(0)}</span>
                </div>
                <div className="text-center">
                  <p className="text-[var(--text-primary)] text-xs font-bold truncate max-w-[180px]">{medico.nome}</p>
                  {medico.especialidade && (
                    <p className="text-[var(--text-muted)] text-[9px] font-medium truncate max-w-[180px]">{medico.especialidade}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2.5 py-0.5 rounded-lg ${cor.bg} ${cor.text} border border-white/5`}>
                    {consultasMedico.length} consulta{consultasMedico.length !== 1 ? "s" : ""}
                  </span>
                  {confirmadas > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10">
                      {confirmadas} conf.
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Corpo scrollável */}
      <div ref={ref} className="overflow-x-auto flex-1 relative">
        <div className="flex" style={{ minHeight: `${HORAS.length * SLOT_HEIGHT}px` }}>
          <div className="w-16 shrink-0 relative border-r border-[var(--border-lightest)] pointer-events-none">
            {HORAS.map((hora: number, i: number) => (
              <React.Fragment key={hora}>
                <div className="absolute right-0 pr-2 flex items-center" style={{ top: i * SLOT_HEIGHT, height: MEIA }}>
                  <span className="text-[var(--text-tertiary)] text-[10px] font-bold">{String(hora).padStart(2, "0")}:00</span>
                </div>
                <div className="absolute right-0 pr-2 flex items-center" style={{ top: i * SLOT_HEIGHT + MEIA, height: MEIA }}>
                  <span className="text-[var(--text-tertiary)] text-[9px] opacity-40">{String(hora).padStart(2, "0")}:30</span>
                </div>
              </React.Fragment>
            ))}
          </div>

          {medicosVisiveis.map((medico) => {
            const consultasMedico = consultasDoDia.filter((c: any) => c.medicoId === medico.id);
            return (
              <ColunaDrop
                key={medico.id}
                id={`dia|${medico.id}`}
                SLOT_HEIGHT={SLOT_HEIGHT}
                HORA_INICIO={HORA_INICIO}
                onClickAt={(hora, minuto) => onNovaConsulta(setMinutes(setHours(data, hora), minuto), medico.id)}
                className="flex-1 relative border-l border-[var(--border-lightest)] hover:bg-[var(--accent-subtle)] transition-colors"
                style={{ minWidth: MIN_COL_WIDTH, height: `${HORAS.length * SLOT_HEIGHT}px` }}
              >
                {HORAS.map((hora: number, i: number) => (
                  <React.Fragment key={hora}>
                    <div className="absolute left-0 right-0 border-b border-[var(--border-lightest)] pointer-events-none" style={{ top: i * SLOT_HEIGHT, height: MEIA }} />
                    <div className="absolute left-0 right-0 border-b border-white/[0.02] pointer-events-none" style={{ top: i * SLOT_HEIGHT + MEIA, height: MEIA }} />
                  </React.Fragment>
                ))}

                {visivel && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] -ml-1.5 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500/80 to-rose-500/0" />
                    </div>
                  </div>
                )}

                {consultasMedico.map((c: any) => {
                  const t = (minutosDesdeInicio(c.dataHoraInicio) / 60) * SLOT_HEIGHT;
                  const h = Math.max(MEIA - 2, (duracaoMin(c.dataHoraInicio, c.dataHoraFim) / 60) * SLOT_HEIGHT - 4);
                  return (
                    <BlocoConsulta
                      key={c.id}
                      consulta={c}
                      onSelect={onSelectConsulta}
                      style={{ top: t + 2, height: h, left: 6, right: 6 }}
                    />
                  );
                })}
              </ColunaDrop>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA SEMANA V36 — Blocos mais legíveis, cores consistentes
// ═══════════════════════════════════════════════════════════════════════════════
function VistaSemana({ semanaInicio, consultas, feriados, onNovaConsulta, onSelectConsulta, HORAS, SLOT_HEIGHT, minutosDesdeInicio }: any) {
  const { top, visivel } = useLinhaViva(HORAS[0], HORAS[HORAS.length - 1], SLOT_HEIGHT);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && visivel) ref.current.scrollTop = Math.max(0, top - 160); }, []);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));
  const MEIA = SLOT_HEIGHT / 2;

  const getFeriado = (d: Date): Feriado | null => {
    if (!feriados || !Array.isArray(feriados)) return null;
    const dataStr = format(d, "yyyy-MM-dd");
    return feriados.find((f: Feriado) => f.date === dataStr) || null;
  };

  const catColors: Record<string, { bg: string; text: string; dot: string }> = {
    feriado_nacional: { bg: "bg-red-500/10", text: "text-red-400", dot: "bg-red-400" },
    feriado_bancario: { bg: "bg-amber-500/10", text: "text-amber-400", dot: "bg-amber-400" },
    feriado_escolar: { bg: "bg-blue-500/10", text: "text-blue-400", dot: "bg-blue-400" },
    opcional: { bg: "bg-violet-500/10", text: "text-violet-400", dot: "bg-violet-400" },
    comemorativo: { bg: "bg-emerald-500/10", text: "text-emerald-400", dot: "bg-emerald-400" },
    personalizado: { bg: "bg-cyan-500/10", text: "text-cyan-400", dot: "bg-cyan-400" },
  };

  return (
    <div className="flex flex-col">
      {/* V36: Header da semana com design premium */}
      <div className="flex border-b border-[var(--border-lighter)] shrink-0 bg-[var(--bg-surface)] sticky top-0 z-30">
        <div className="w-14 shrink-0" />
        {dias.map(dia => {
          const feriado = getFeriado(dia);
          const cores = feriado ? (catColors[feriado.categoria] || catColors.comemorativo) : null;
          const consultasDia = consultas.filter((c: any) => isSameDay(toDate(c.dataHoraInicio), dia));
          return (
            <div key={dia.toISOString()} className={`flex-1 text-center py-3 border-l border-[var(--border-lightest)] transition-colors ${isToday(dia) ? "bg-[#00E5FF]/[0.06]" : ""} ${feriado ? cores!.bg : ""}`}>
              <p className="text-[var(--text-muted)] text-[10px] uppercase tracking-wider font-bold">{format(dia, "EEE", { locale: ptBR })}</p>
              <div className={`w-9 h-9 rounded-xl mx-auto flex items-center justify-center mt-1 transition-all ${isToday(dia) ? "bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30" : "text-[var(--text-primary)]"}`}>
                <span className="text-sm font-black">{format(dia, "d")}</span>
              </div>
              {/* Contagem de consultas */}
              {consultasDia.length > 0 && (
                <span className="text-[8px] font-bold text-[var(--text-muted)] mt-1 inline-block">
                  {consultasDia.length} marc.
                </span>
              )}
              {feriado && (
                <div className="mt-1" title={`${feriado.nome}${feriado.nomeEN && feriado.nomeEN !== feriado.nome ? " (" + feriado.nomeEN + ")" : ""}`}>
                  <span className={`text-[8px] font-bold ${cores!.text} leading-none px-1.5 py-0.5 rounded-md ${cores!.bg} inline-block max-w-full truncate`}>
                    {feriado.nome.length > 12 ? feriado.nome.substring(0, 12) + "..." : feriado.nome}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div ref={ref} className="flex-1 relative">
        <div className="flex" style={{ minHeight: `${HORAS.length * SLOT_HEIGHT}px` }}>
          <div className="w-14 shrink-0 relative">
            {HORAS.map((hora: number, i: number) => (
              <React.Fragment key={hora}>
                <div className="absolute right-0 pr-2" style={{ top: i * SLOT_HEIGHT - 7 }}>
                  <span className="text-[var(--text-tertiary)] text-[10px] font-bold">{String(hora).padStart(2, "0")}:00</span>
                </div>
                <div className="absolute right-0 pr-2" style={{ top: i * SLOT_HEIGHT + MEIA - 7 }}>
                  <span className="text-[var(--text-tertiary)] text-[9px] opacity-40">{String(hora).padStart(2, "0")}:30</span>
                </div>
              </React.Fragment>
            ))}
          </div>
          {dias.map(dia => {
            const cs = consultas.filter((c: any) => isSameDay(toDate(c.dataHoraInicio), dia));
            const ehHoje = isToday(dia);
            const feriadoDia = getFeriado(dia);
            const coresDia = feriadoDia ? (catColors[feriadoDia.categoria] || catColors.comemorativo) : null;
            return (
              <div key={dia.toISOString()} className={`flex-1 relative border-l border-[var(--border-lightest)] ${ehHoje ? "bg-[#00E5FF]/[0.015]" : ""}`}
                style={feriadoDia ? { backgroundColor: feriadoDia.categoria === "feriado_nacional" ? "rgba(239,68,68,0.02)" : feriadoDia.categoria === "comemorativo" ? "rgba(16,185,129,0.02)" : "rgba(245,158,11,0.02)" } : undefined}
              >
                {HORAS.map((hora: number, i: number) => (
                  <React.Fragment key={hora}>
                    <SlotDrop
                      id={`semana|${format(dia, "yyyy-MM-dd")}|${hora}|0`}
                      className="absolute left-0 right-0 border-t border-[var(--border-lightest)] cursor-pointer hover:bg-[var(--accent-subtle)] transition-colors"
                      style={{ top: i * SLOT_HEIGHT, height: MEIA }}
                      onClick={() => onNovaConsulta(setMinutes(setHours(dia, hora), 0))}
                    />
                    <SlotDrop
                      id={`semana|${format(dia, "yyyy-MM-dd")}|${hora}|30`}
                      className="absolute left-0 right-0 border-t border-white/[0.02] cursor-pointer hover:bg-[var(--accent-subtle)] transition-colors"
                      style={{ top: i * SLOT_HEIGHT + MEIA, height: MEIA }}
                      onClick={() => onNovaConsulta(setMinutes(setHours(dia, hora), 30))}
                    />
                  </React.Fragment>
                ))}
                {visivel && ehHoje && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.8)] -ml-1.5 shrink-0" />
                      <div className="flex-1 h-[1.5px] bg-gradient-to-r from-rose-500/80 to-rose-500/0" />
                    </div>
                  </div>
                )}
                {cs.map((c: any) => {
                  const t = (minutosDesdeInicio(c.dataHoraInicio) / 60) * SLOT_HEIGHT;
                  const h = Math.max(MEIA - 2, (duracaoMin(c.dataHoraInicio, c.dataHoraFim) / 60) * SLOT_HEIGHT - 3);
                  return (
                    <BlocoConsulta
                      key={c.id}
                      consulta={c}
                      onSelect={onSelectConsulta}
                      style={{ top: t + 1, height: h, left: 3, right: 3 }}
                    />
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA MÊS V36 — Cards premium com mais informação e hover elegante
// ═══════════════════════════════════════════════════════════════════════════════
function VistaMes({ mesAtual, consultas, feriados, onNovaConsulta, onSelectConsulta }: any) {
  const inicio = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 1 });
  const fim = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 1 });
  const dias: Date[] = [];
  let cur = inicio;
  while (cur <= fim) { dias.push(cur); cur = addDays(cur, 1); }
  const getFeriado = (d: Date) => feriados.find((f: any) => f.date === format(d, "yyyy-MM-dd"));

  const catColors: Record<string, { bg: string; border: string; text: string; cellBg: string }> = {
    feriado_nacional: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", cellBg: "bg-red-500/[0.04]" },
    feriado_bancario: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", cellBg: "bg-amber-500/[0.04]" },
    feriado_escolar: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", cellBg: "bg-blue-500/[0.04]" },
    opcional: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", cellBg: "bg-violet-500/[0.04]" },
    comemorativo: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", cellBg: "bg-emerald-500/[0.04]" },
    personalizado: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", cellBg: "bg-cyan-500/[0.04]" },
  };

  return (
    <div>
      <div className="grid grid-cols-7 border-b border-[var(--border-lighter)]">
        {["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"].map(d => (
          <div key={d} className="text-center py-2.5"><span className="text-[var(--text-tertiary)] text-xs font-bold uppercase tracking-wider">{d}</span></div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {dias.map(dia => {
          const feriado = getFeriado(dia);
          const cores = feriado ? (catColors[feriado.categoria] || catColors.comemorativo) : null;
          const cs = consultas.filter((c: any) => isSameDay(toDate(c.dataHoraInicio), dia));
          const doMes = isSameMonth(dia, mesAtual);
          const hoje = isToday(dia);
          return (
            <div key={dia.toISOString()} onClick={() => onNovaConsulta(setHours(dia, 9))}
              className={`min-h-[120px] border-b border-r border-[var(--border-lightest)] p-2 cursor-pointer hover:bg-[var(--bg-overlay)] transition-all group ${!doMes ? "opacity-20" : ""} ${hoje ? "bg-[#00E5FF]/[0.04]" : ""} ${feriado ? cores!.cellBg : ""}`}>
              <div className="flex items-center justify-between mb-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black transition-all ${hoje ? "bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30" : "text-[var(--text-secondary)] group-hover:bg-white/5"}`}>{format(dia, "d")}</div>
                <div className="flex items-center gap-1">
                  {cs.length > 0 && (
                    <span className="text-[8px] font-bold text-[var(--text-muted)] bg-white/5 px-1.5 py-0.5 rounded">
                      {cs.length}
                    </span>
                  )}
                  {feriado && (
                    <span className={`text-[8px] font-bold ${cores!.text} ${cores!.bg} px-1.5 py-0.5 rounded border ${cores!.border}`}
                      title={`${feriado.nome}${feriado.nomeEN && feriado.nomeEN !== feriado.nome ? " (" + feriado.nomeEN + ")" : ""}`}>
                      {feriado.nome.length > 8 ? feriado.nome.substring(0, 8) + "..." : feriado.nome}
                    </span>
                  )}
                </div>
              </div>
              {/* V36: Cards de consulta mais ricos na vista mês */}
              {cs.slice(0, 3).map((c: any) => {
                const corMedico = getCorMedico(c.medicoId, c.medicoCor);
                const estadoEfetivo = getEstadoEfetivo(c);
                const estadoCor = ESTADO_COLORS[estadoEfetivo] ?? ESTADO_COLORS.agendada;
                return (
                  <div
                    key={c.id}
                    onClick={(e) => { e.stopPropagation(); onSelectConsulta(c); }}
                    title={`${c.utenteNome} - ${fmtHora(c.dataHoraInicio)} - ${c.tipoConsulta || "Consulta"} - Dr(a). ${c.medicoNome} - ${estadoCor.label}`}
                    className="rounded-lg px-2 py-1.5 mb-1 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-md border border-white/5"
                    style={{
                      background: `linear-gradient(135deg, ${corMedico.hex}15 0%, transparent 100%)`,
                      borderLeftWidth: "2px",
                      borderLeftColor: corMedico.hex,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-black text-[var(--text-primary)] leading-tight"
                        style={{ color: corMedico.hex }}>
                        {fmtHora(c.dataHoraInicio)}
                      </span>
                      <span className="text-[10px] font-bold text-[var(--text-primary)] leading-tight truncate">
                        {c.utenteNome.split(" ")[0]}
                      </span>
                      <div className={`w-1.5 h-1.5 rounded-full ${estadoCor.dot} ml-auto shrink-0`} />
                    </div>
                  </div>
                );
              })}
              {cs.length > 3 && (
                <p className="text-[var(--text-muted)] text-[9px] font-bold pl-1 mt-0.5">
                  +{cs.length - 3} mais
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export function AgendaPage() {
  const [dataActual, setDataActual] = useState(new Date());
  const [vista, setVista] = useState<"dia" | "semana" | "mes">("dia");
  const [modalData, setModalData] = useState<{ data: Date; medicoId?: number } | null>(null);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState<Consulta | null>(null);
  const [modalGestaoTipos, setModalGestaoTipos] = useState(false);
  const [modalConfirmacaoLote, setModalConfirmacaoLote] = useState(false);
  const [dragging, setDragging] = useState<Consulta | null>(null);
  const [overridesOptimistas, setOverridesOptimistas] = useState<Record<number, { dataHoraInicio: string; dataHoraFim: string }>>({});
  const [toastMsg, setToastMsg] = useState<{ texto: string; tipo: "ok" | "erro" } | null>(null);
  const [medicosFiltrados, setMedicosFiltrados] = useState<Set<number>>(new Set());

  const mostrarToast = (texto: string, tipo: "ok" | "erro" = "ok") => {
    setToastMsg({ texto, tipo });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const utils = trpc.useUtils();
  
  const configQ = trpc.configuracoes.obterInfoClinica.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
  const clinicaInfo = (configQ.data as any)?.clinica ?? {};
  
  const medicosQ = trpc.consultas.listarMedicosAgenda.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const medicosAgenda: MedicoAgenda[] = useMemo(() => {
    const raw = (medicosQ.data as any)?.medicos;
    if (!raw) return [];
    const arr = Array.isArray(raw) ? raw : [];
    return arr.filter((m: any) => m && typeof m === 'object' && m.id && m.nome);
  }, [medicosQ.data]);

  const medicosVisiveis = useMemo(() => {
    if (medicosFiltrados.size === 0) return medicosAgenda;
    return medicosAgenda.filter(m => medicosFiltrados.has(m.id));
  }, [medicosAgenda, medicosFiltrados]);
  
  const parseHora = (horaStr: string | undefined): number => {
    if (!horaStr) return HORA_INICIO_PADRAO;
    const [h] = String(horaStr).split(":");
    const parsed = parseInt(h);
    return isNaN(parsed) ? HORA_INICIO_PADRAO : parsed;
  };
  
  const HORA_INICIO = parseHora(clinicaInfo.horarioAbertura || "08:00");
  const HORA_FIM = parseHora(clinicaInfo.horarioEncerramento || "20:00");
  const HORAS = Array.from({ length: Math.max(1, HORA_FIM - HORA_INICIO + 1) }, (_, i) => HORA_INICIO + i);
  const SLOTS_30MIN = HORAS.flatMap(h => [{ hora: h, minuto: 0 }, { hora: h, minuto: 30 }]);
  
  const minutosDesdeInicio = (d: Date | string) => {
    const date = toDate(d);
    return (getHours(date) - HORA_INICIO) * 60 + getMinutes(date);
  };
  
  const mesKey = `${dataActual.getFullYear()}-${dataActual.getMonth()}`;
  const consultasQ = trpc.consultas.list.useQuery({
    dataInicio: startOfMonth(dataActual) as any,
    dataFim: endOfMonth(dataActual) as any,
  }, {
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  const anoAtual = dataActual.getFullYear();
  const feriadosQ = trpc.feriados.listar.useQuery(
    { ano: anoAtual, anoFim: anoAtual },
    { staleTime: 1000 * 60 * 60, refetchOnWindowFocus: false }
  );
  const proximosFeriadosQ = trpc.feriados.proximos.useQuery(
    { limite: 5 },
    { staleTime: 1000 * 60 * 30, refetchOnWindowFocus: false }
  );
  const paisAtualQ = trpc.feriados.paisAtual.useQuery(undefined, {
    staleTime: 1000 * 60 * 60,
    refetchOnWindowFocus: false,
  });

  const feriados: Feriado[] = useMemo(() => {
    if (!feriadosQ.data?.feriados) return [];
    return feriadosQ.data.feriados;
  }, [feriadosQ.data]);

  const proximosFeriados = useMemo(() => {
    if (!proximosFeriadosQ.data?.proximos) return [];
    return proximosFeriadosQ.data.proximos;
  }, [proximosFeriadosQ.data]);

  const paisNome = paisAtualQ.data?.paisNome || "";
  const paisCodigo = paisAtualQ.data?.countryCode || ""; 

  const updateConsultaData = trpc.consultas.update.useMutation({
    onSuccess: (_data, variables: any) => {
      if (variables?.consultaId) {
        setOverridesOptimistas(prev => {
          const next = { ...prev };
          delete next[variables.consultaId];
          return next;
        });
      }
      consultasQ.refetch();
      mostrarToast("Consulta reagendada com sucesso", "ok");
    },
    onError: (err: any, variables: any) => {
      if (variables?.consultaId) {
        setOverridesOptimistas(prev => {
          const next = { ...prev };
          delete next[variables.consultaId];
          return next;
        });
      }
      consultasQ.refetch();
      mostrarToast(parseApiError(err, "Erro ao reagendar consulta"), "erro");
    },
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setDragging(null);
    if (!over) return;
    const consulta = active.data.current as Consulta;
    const overId = String(over.id);
    const duracao = Math.max(30, duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim));

    let novaData: Date | null = null;

    if (overId.startsWith("dia|")) {
      const deltaY = event.delta?.y ?? 0;
      const consultaInicio = toDate(consulta.dataHoraInicio);
      const minutosBase = (getHours(consultaInicio) - HORA_INICIO) * 60 + getMinutes(consultaInicio);
      const minutosMovimento = Math.round((deltaY / SLOT_HEIGHT) * 60 / 30) * 30;
      const minutosTotal = Math.max(0, minutosBase + minutosMovimento);
      const hora = HORA_INICIO + Math.floor(minutosTotal / 60);
      const minuto = minutosTotal % 60;
      novaData = setHours(setMinutes(dataActual, minuto), hora);
    }
    else if (overId.startsWith("semana|")) {
      const [, dataStr, horaStr, minutoStr] = overId.split("|");
      const diaBase = new Date(dataStr + "T00:00:00");
      novaData = setHours(setMinutes(diaBase, parseInt(minutoStr)), parseInt(horaStr));
    }

    if (!novaData) return;

    const novaFim = addMinutes(novaData, duracao);

    setOverridesOptimistas(prev => ({
      ...prev,
      [consulta.id]: {
        dataHoraInicio: novaData!.toISOString(),
        dataHoraFim: novaFim.toISOString(),
      },
    }));

    updateConsultaData.mutate({
      consultaId: consulta.id,
      dataHoraInicio: novaData.toISOString(),
      dataHoraFim: novaFim.toISOString(),
    });
  };

  const handleDragStart = (event: DragStartEvent) => {
    setDragging(event.active.data.current as Consulta);
  };

  const consultasData = useMemo(() => {
    const raw = (consultasQ.data?.consultas ?? []).map((c: any) => {
      const override = overridesOptimistas[c.id];
      return override ? { ...c, ...override } : c;
    });
    if (medicosFiltrados.size === 0) return raw;
    return raw.filter((c: any) => medicosFiltrados.has(c.medicoId));
  }, [consultasQ.data, overridesOptimistas, medicosFiltrados]);

  const handleToggleMedico = (id: number) => {
    setMedicosFiltrados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleTodos = () => {
    setMedicosFiltrados(new Set());
  };

  const handleNovaConsulta = (data: Date, medicoId?: number) => {
    setModalData({ data, medicoId });
  };

  const handleNovaConsultaSemMedico = (data: Date) => {
    setModalData({ data });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6 font-sans relative">
        {/* Toast */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-sm transition-all animate-in slide-in-from-bottom-2 ${
            toastMsg.tipo === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-rose-500/20 border-rose-500/40 text-rose-300"
          }`}>
            {toastMsg.tipo === "ok"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            <span className="text-sm font-semibold">{toastMsg.texto}</span>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Agenda</h1>
            <p className="page-header-subtitle">Gestão de consultas e disponibilidade médica</p>
          </div>
          <div className="flex bg-[var(--bg-overlay)] p-1 rounded-xl border border-[var(--border-light)]">
            {(["dia", "semana", "mes"] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-5 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${vista === v ? 'bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-white/5'}`}>
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Filtro médicos */}
        {medicosAgenda.length > 0 && (
          <div className="card-premium p-4">
            <FiltroMedicos
              medicos={medicosAgenda}
              medicosFiltrados={medicosFiltrados}
              onToggle={handleToggleMedico}
              onToggleTodos={handleToggleTodos}
            />
          </div>
        )}

        {/* Legenda de estados */}
        <div className="card-premium p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {Object.entries(ESTADO_COLORS).map(([key, val]) => {
                let count: number;
                if (key === "em_sala_espera" || key === "em_consulta") {
                  count = consultasData.filter((c: any) => getCheckinEstado(c.observacoes) === key && (c.estado === "agendada" || c.estado === "confirmada")).length;
                } else {
                  count = consultasData.filter((c: any) => c.estado === key).length;
                }
                if (count === 0 && (key === "em_sala_espera" || key === "em_consulta")) return null;
                const EstIcon = val.icon;
                return (
                  <div key={key} className="flex items-center gap-1.5">
                    <EstIcon className={`w-3 h-3 ${val.text}`} />
                    <span className="text-[var(--text-secondary)] text-[11px] font-bold">{val.label}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-md ${val.bg} ${val.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px]">
              <RefreshCw className={`w-3 h-3 ${consultasQ.isFetching ? "animate-spin text-cyan-400" : ""}`} />
              <span>Auto-refresh (30s)</span>
            </div>
          </div>
        </div>

        {/* Próximos feriados */}
        {proximosFeriados.length > 0 && (
          <div className="card-premium p-4">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
              </div>
              <span className="text-xs font-bold text-[var(--text-primary)]">Próximos Feriados</span>
              {paisNome && <span className="text-[9px] text-[var(--text-muted)] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.06]">{paisNome}</span>}
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              {proximosFeriados.map((f: any) => {
                const fCatColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
                  feriado_nacional: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
                  feriado_bancario: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
                  feriado_escolar: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
                  opcional: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", dot: "bg-violet-400" },
                  comemorativo: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
                  personalizado: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", dot: "bg-cyan-400" },
                };
                const cores = fCatColors[f.categoria] || fCatColors.comemorativo;
                const CatIcon = f.categoria === "feriado_nacional" ? Flag
                  : f.categoria === "feriado_bancario" ? Building
                  : f.categoria === "feriado_escolar" ? GraduationCap
                  : f.categoria === "personalizado" ? CalendarPlus
                  : f.categoria === "opcional" ? Star
                  : Heart;
                return (
                  <div key={f.date} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${cores.bg} border ${cores.border} transition-all hover:scale-[1.02]`}>
                    <CatIcon className={`w-3.5 h-3.5 ${cores.text}`} />
                    <div className="flex flex-col">
                      <span className={`text-[10px] font-bold ${cores.text} leading-tight`}>{f.nome}</span>
                      <span className="text-[9px] text-[var(--text-muted)] leading-tight">
                        {format(new Date(f.date + "T00:00:00"), "d MMM", { locale: ptBR })}
                        {f.ehHoje ? " — HOJE" : f.ehAmanha ? " — Amanhã" : ` — ${f.diasAte}d`}
                      </span>
                    </div>
                    {(f.ehHoje || f.ehAmanha) && (
                      <div className="relative">
                        <div className={`w-2 h-2 rounded-full ${cores.dot}`} />
                        <div className={`absolute inset-0 w-2 h-2 rounded-full ${cores.dot} animate-ping opacity-60`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Card principal da agenda */}
        <div className="card-premium p-0 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-4">
              <button onClick={() => {
                if (vista === "dia") setDataActual(subDays(dataActual, 1));
                if (vista === "semana") setDataActual(subWeeks(dataActual, 1));
                if (vista === "mes") setDataActual(subMonths(dataActual, 1));
              }} className="p-2 rounded-xl hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] transition-colors"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {vista === "dia" && format(dataActual, "d 'de' MMMM, yyyy", { locale: ptBR })}
                {vista === "semana" && `Semana de ${format(startOfWeek(dataActual, { weekStartsOn: 1 }), "d 'de' MMM", { locale: ptBR })} a ${format(endOfWeek(dataActual, { weekStartsOn: 1 }), "d 'de' MMM", { locale: ptBR })}`}
                {vista === "mes" && format(dataActual, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <button onClick={() => {
                if (vista === "dia") setDataActual(addDays(dataActual, 1));
                if (vista === "semana") setDataActual(addWeeks(dataActual, 1));
                if (vista === "mes") setDataActual(addMonths(dataActual, 1));
              }} className="p-2 rounded-xl hover:bg-[var(--bg-overlay)] text-[var(--text-primary)] transition-colors"><ChevronRight className="w-5 h-5" /></button>
              <button onClick={() => setDataActual(new Date())} className="text-xs font-bold text-[#00E5FF] hover:underline ml-2">Hoje</button>
              <button onClick={() => setModalGestaoTipos(true)} className="text-xs font-bold text-violet-400 hover:underline ml-4 flex items-center gap-1">
                <Settings className="w-3 h-3" /> Tipos de Consulta
              </button>
              <button onClick={() => consultasQ.refetch()} className="text-xs font-bold text-cyan-400 hover:underline ml-3 flex items-center gap-1">
                <RefreshCw className={`w-3 h-3 ${consultasQ.isFetching ? "animate-spin" : ""}`} /> Atualizar
              </button>
              {paisNome && (
                <span className="text-[10px] font-medium text-[var(--text-muted)] ml-3 flex items-center gap-1 bg-white/[0.04] px-2 py-1 rounded-lg border border-white/[0.06]">
                  <Globe className="w-3 h-3" /> Feriados: {paisNome}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {updateConsultaData.isPending && (
                <div className="flex items-center gap-1.5 text-[#00E5FF] text-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>A guardar...</span>
                </div>
              )}
              <span className="text-[var(--text-tertiary)] text-xs font-bold">
                {consultasData.length} consulta{consultasData.length !== 1 ? "s" : ""}
              </span>
              <button onClick={() => setModalConfirmacaoLote(true)} className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center gap-2 hover:bg-emerald-500/20 transition-all">
                <Send className="w-3.5 h-3.5" /> Confirmar Amanhã
              </button>
              <button onClick={() => handleNovaConsulta(dataActual)} className="btn-primary px-5 py-2 flex items-center gap-2">
                <Plus className="w-4 h-4" /> Nova Marcação
              </button>
            </div>
          </div>

          <div className="relative">
            {(consultasQ.isLoading || medicosQ.isLoading) ? (
              <div className="flex items-center justify-center py-40">
                <div className="flex flex-col items-center gap-3">
                  <Loader2 className="w-10 h-10 animate-spin text-[#00E5FF]" />
                  <span className="text-[var(--text-tertiary)] text-xs font-medium">
                    {medicosQ.isLoading ? 'A carregar médicos...' : 'A carregar consultas...'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {vista === "dia" && (
                  <VistaDia
                    data={dataActual}
                    consultas={consultasData}
                    medicos={medicosVisiveis}
                    feriados={feriados}
                    onNovaConsulta={handleNovaConsulta}
                    onSelectConsulta={setConsultaSeleccionada}
                    HORAS={HORAS}
                    SLOT_HEIGHT={SLOT_HEIGHT}
                    minutosDesdeInicio={minutosDesdeInicio}
                  />
                )}
                {vista === "semana" && <VistaSemana semanaInicio={startOfWeek(dataActual, { weekStartsOn: 1 })} consultas={consultasData} feriados={feriados} onNovaConsulta={handleNovaConsultaSemMedico} onSelectConsulta={setConsultaSeleccionada} HORAS={HORAS} SLOT_HEIGHT={SLOT_HEIGHT} minutosDesdeInicio={minutosDesdeInicio} />}
                {vista === "mes" && <VistaMes mesAtual={dataActual} consultas={consultasData} feriados={feriados} onNovaConsulta={handleNovaConsultaSemMedico} onSelectConsulta={setConsultaSeleccionada} />}
              </>
            )}
          </div>
        </div>
      </div>

      <DragOverlay>{dragging && <DragOverlayBloco consulta={dragging} />}</DragOverlay>

      {modalData && (
        <ModalNovaConsulta
          dataHora={modalData.data}
          medicoIdPreSelecionado={modalData.medicoId}
          onClose={() => setModalData(null)}
          onSuccess={() => { utils.consultas.list.invalidate(); consultasQ.refetch(); }}
        />
      )}

      {consultaSeleccionada && (
        <ModalDetalhesConsulta consulta={consultaSeleccionada} onClose={() => setConsultaSeleccionada(null)} onSuccess={() => { utils.consultas.list.invalidate(); consultasQ.refetch(); }} />
      )}

      {modalGestaoTipos && (
        <ModalGestaoTiposConsulta onClose={() => setModalGestaoTipos(false)} />
      )}

      {modalConfirmacaoLote && (
        <PainelConfirmacaoLote
          onClose={() => setModalConfirmacaoLote(false)}
          onSuccess={() => { utils.consultas.list.invalidate(); consultasQ.refetch(); }}
        />
      )}
    </DndContext>
  );
}
