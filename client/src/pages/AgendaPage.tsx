/**
 * AgendaPage — Agenda Clínica Completa
 * DentCare Elite V35 — Conectores + Comunicação Integrada + Interatividade
 *
 * UPGRADE V35:
 * - NOVO: Cores fortes para estados (verde=confirmada, vermelho=cancelada)
 * - NOVO: Ícones de estado de comunicação nos blocos
 * - NOVO: Quick-actions WhatsApp no modal de detalhes (lembrete, confirmação via API)
 * - NOVO: Botão "Confirmar Todos" para enviar confirmações em lote
 * - NOVO: Legenda de estados visual
 * - NOVO: Auto-refresh a cada 30s para refletir confirmações/cancelamentos em tempo real
 * - NOVO: Link direto para ficha do utente a partir da agenda
 * - NOVO: Indicador visual de estado no-show
 *
 * UPGRADE V35.1 — GOOGLE CALENDAR + FERIADOS INTERNACIONAIS:
 * - NOVO: Feriados dinâmicos via API Nager.Date (100+ países)
 * - NOVO: País dos feriados configurado no Google Calendar conector
 * - NOVO: Feriados visíveis nas 3 vistas (Dia, Semana, Mês)
 * - NOVO: Categorização visual (nacional, bancário, comemorativo, etc.)
 * - NOVO: Banner de feriado na Vista Dia com alerta para recepcionistas
 * - NOVO: Badge de feriado no header da Vista Semana
 * - NOVO: Painel de próximos feriados com contagem de dias
 * - NOVO: Feriados personalizados da clínica
 * - NOVO: Suporte multi-ano automático
 * - REMOVIDO: Array hardcoded de feriados portugueses (substituído por API)
 *
 * ANTERIORES V32.8.1:
 * - Vista Dia: cada dentista cadastrado tem a sua coluna, nome em cima, horários abaixo
 * - Vista Semana: estilo Google Calendar, drag & drop entre slots
 * - Vista Mês: calendário com feriados internacionais e contagem de consultas
 * - Filtro por médico com chips coloridos
 * - Blocos de consulta com cor do médico e AUTO-AJUSTE de fontes
 * - Legenda de médicos
 *
 * CORREÇÕES V32.8.1:
 * - FIX: Interface MedicoAgenda corrigida (cor_agenda → corAgenda)
 * - FIX: Feriados com datas corretas (Carnaval 17/02, Corpo de Deus 04/06)
 * - FIX: Interface Feriado alinhada com dados reais (campo nome)
 * - MELHORIA: BlocoConsulta com auto-ajuste de fontes baseado na altura do bloco
 * - MELHORIA: Tooltip completo ao hover em blocos pequenos
 * - MELHORIA: Vista Mês com melhor legibilidade
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
  // V35.7: Check-in e estados intermédios
  LogIn, Stethoscope, ClipboardCheck, UserCheck, Timer,
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

// V34.1: Interface Feriado expandida com categorização e cores
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

// FIX V32.8.1: corAgenda em vez de cor_agenda (alinhado com o servidor)
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

const ESTADO_COLORS: Record<string, { bg: string; border: string; text: string; dot: string; label: string; glow?: string }> = {
  agendada:        { bg: "bg-[#00E5FF]/10",     border: "border-l-[#00E5FF]",    text: "text-cyan-900",    dot: "bg-[#00E5FF]",    label: "Agendada",         glow: "" },
  confirmada:      { bg: "bg-emerald-200",    border: "border-l-emerald-600",   text: "text-emerald-900",   dot: "bg-emerald-500",   label: "Confirmada",       glow: "ring-2 ring-emerald-400/50 shadow-emerald-500/20" },
  realizada:       { bg: "bg-teal-100",       border: "border-l-teal-600",      text: "text-teal-800",      dot: "bg-teal-500",      label: "Realizada",        glow: "" },
  cancelada:       { bg: "bg-red-200",        border: "border-l-red-600",       text: "text-red-900",       dot: "bg-red-500",       label: "Cancelada",        glow: "ring-2 ring-red-400/50 shadow-red-500/20" },
  "no-show":       { bg: "bg-amber-200",      border: "border-l-amber-600",     text: "text-amber-900",     dot: "bg-amber-500",     label: "Faltou",           glow: "ring-2 ring-amber-400/30" },
  // V35.7: Estados intermédios de check-in (guardados nas observações como __checkin__)
  em_sala_espera:  { bg: "bg-orange-100",     border: "border-l-orange-500",    text: "text-orange-900",    dot: "bg-orange-400",    label: "Sala de Espera",   glow: "ring-2 ring-orange-400/40 animate-pulse" },
  em_consulta:     { bg: "bg-violet-100",     border: "border-l-violet-600",    text: "text-violet-900",    dot: "bg-violet-500",    label: "Em Consulta",      glow: "ring-2 ring-violet-400/50" },
};

// ─── Paleta de cores para médicos ────────────────────────────────────────────
const CORES_MEDICOS = [
  { nome: "Azul",     classe: "bg-blue-500",    hex: "#3b82f6",  border: "border-l-blue-500",    bg: "bg-blue-500/15",    text: "text-blue-300" },
  { nome: "Violeta",  classe: "bg-violet-500",  hex: "#8b5cf6",  border: "border-l-violet-500",  bg: "bg-violet-500/15",  text: "text-violet-300" },
  { nome: "Esmeralda",classe: "bg-emerald-500", hex: "#10b981",  border: "border-l-emerald-500", bg: "bg-emerald-500/15", text: "text-emerald-300" },
  { nome: "Âmbar",    classe: "bg-amber-500",   hex: "#f59e0b",  border: "border-l-amber-500",   bg: "bg-amber-500/15",   text: "text-amber-300" },
  { nome: "Rosa",     classe: "bg-pink-500",    hex: "#ec4899",  border: "border-l-pink-500",    bg: "bg-pink-500/15",    text: "text-pink-300" },
  { nome: "Ciano",    classe: "bg-cyan-500",    hex: "#06b6d4",  border: "border-l-cyan-500",    bg: "bg-cyan-500/15",    text: "text-cyan-300" },
  { nome: "Laranja",  classe: "bg-orange-500",  hex: "#f97316",  border: "border-l-orange-500",  bg: "bg-orange-500/15",  text: "text-orange-300" },
  { nome: "Lima",     classe: "bg-lime-500",    hex: "#84cc16",  border: "border-l-lime-500",    bg: "bg-lime-500/15",    text: "text-lime-300" },
  { nome: "Índigo",   classe: "bg-[#00E5FF]",  hex: "#00E5FF",  border: "border-l-[#00E5FF]",  bg: "bg-[#00E5FF]/15",  text: "text-[#00E5FF]" },
  { nome: "Vermelho", classe: "bg-red-500",     hex: "#ef4444",  border: "border-l-red-500",     bg: "bg-red-500/15",     text: "text-red-300" },
];

function getCorMedico(medicoId: number, corAgenda?: string | null): typeof CORES_MEDICOS[0] {
  if (corAgenda) {
    const found = CORES_MEDICOS.find(c => c.nome.toLowerCase() === corAgenda.toLowerCase() || c.hex === corAgenda);
    if (found) return found;
  }
  return CORES_MEDICOS[medicoId % CORES_MEDICOS.length];
}

// ─── Helpers ───────────────────────────────────────────────────────────────────────────────────
const toDate = (d: Date | string): Date => typeof d === "string" ? new Date(d) : d;
const fmtHora = (d: Date | string) => format(toDate(d), "HH:mm");
const duracaoMin = (i: Date | string, f: Date | string) => differenceInMinutes(toDate(f), toDate(i));

// V35.7: Extrair estado de check-in das observações
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

  // V35.7: Check-in e estados intermédios
  const [checkinEstado, setCheckinEstadoLocal] = useState<"em_sala_espera" | "em_consulta" | null>(
    () => getCheckinEstado(consulta.observacoes)
  );
  const updateConsultaCheckin = trpc.consultas.update.useMutation({
    onSuccess: () => { onSuccess(); },
  });
  const handleCheckin = (novoCheckin: "em_sala_espera" | "em_consulta" | null) => {
    const novasObs = setCheckinObservacoes(consulta.observacoes, novoCheckin);
    setCheckinEstadoLocal(novoCheckin);
    updateConsultaCheckin.mutate({
      consultaId: consulta.id,
      observacoes: novasObs,
    });
  };
  
  const updateConsulta = trpc.consultas.update.useMutation({
    onSuccess: () => { onSuccess(); setEditando(false); },
  });

  const eliminar = trpc.consultas.delete.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
  });

  // V35: Quick-actions WhatsApp via API (com botões interativos)
  const enviarLembreteMutation = trpc.whatsapp.enviarLembrete.useMutation({
    onSuccess: () => { setWhatsappStatus("sent"); setTimeout(() => setWhatsappStatus("idle"), 3000); },
    onError: () => { setWhatsappStatus("error"); setTimeout(() => setWhatsappStatus("idle"), 3000); },
  });

  const enviarConfirmacaoMutation = trpc.whatsapp.enviarConfirmacao.useMutation({
    onSuccess: () => { setWhatsappStatus("sent"); setTimeout(() => setWhatsappStatus("idle"), 3000); },
    onError: () => { setWhatsappStatus("error"); setTimeout(() => setWhatsappStatus("idle"), 3000); },
  });

  const handleEnviarLembrete = () => {
    if (!consulta.utenteTelemovel) return;
    setWhatsappStatus("sending");
    const data = format(toDate(consulta.dataHoraInicio), "dd/MM/yyyy");
    const hora = format(toDate(consulta.dataHoraInicio), "HH:mm");
    enviarLembreteMutation.mutate({
      consultaId: consulta.id,
      utenteName: consulta.utenteNome,
      consultaTime: hora,
      utenteTelefone: consulta.utenteTelemovel,
      medicoNome: consulta.medicoNome,
      tipoConsulta: consulta.tipoConsulta || "Consulta",
      consultaData: data,
    });
  };

  const handleEnviarConfirmacao = () => {
    if (!consulta.utenteTelemovel) return;
    setWhatsappStatus("sending");
    const data = format(toDate(consulta.dataHoraInicio), "dd/MM/yyyy");
    const hora = format(toDate(consulta.dataHoraInicio), "HH:mm");
    enviarConfirmacaoMutation.mutate({
      consultaId: consulta.id,
      utenteName: consulta.utenteNome,
      data,
      hora,
      medicoNome: consulta.medicoNome,
      utenteTelefone: consulta.utenteTelemovel,
      tipoConsulta: consulta.tipoConsulta || "Consulta",
    });
  };

  // Fallback: abrir WhatsApp Web direto
  const enviarWhatsAppDireto = () => {
    if (!consulta.utenteTelemovel) return alert("Utente sem telemóvel registado");
    const msg = `Olá ${consulta.utenteNome}, confirmamos a sua consulta para o dia ${format(toDate(consulta.dataHoraInicio), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}. Até breve!`;
    let tel = consulta.utenteTelemovel.replace(/[\s\-\(\)]/g, '');
    if (!tel.startsWith('+') && !tel.startsWith('00') && tel.length === 9) tel = '351' + tel;
    else if (tel.startsWith('+')) tel = tel.slice(1);
    window.open(`https://wa.me/${tel}?text=${encodeURIComponent(msg)}`, '_blank');
  };

  const corMedico = getCorMedico(consulta.medicoId, consulta.medicoCor);
  // V35.7: usar estado efectivo (inclui check-in intermédio)
  const estadoEfetivoModal = getEstadoEfetivo({ ...consulta, observacoes: consulta.observacoes });
  const c = ESTADO_COLORS[estadoEfetivoModal] ?? ESTADO_COLORS.agendada;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-md overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl overflow-hidden my-auto">
        <div className={`flex items-center justify-between p-6 border-b border-[var(--border-light)] ${c.bg}`}>
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${c.dot} ${consulta.estado === "confirmada" ? "animate-none" : consulta.estado === "cancelada" ? "" : "animate-pulse"}`} />
            <div>
              <h2 className="text-[var(--text-primary)] font-bold text-lg">{consulta.utenteNome}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-xs font-bold uppercase tracking-widest ${c.text} ${consulta.estado === "confirmada" ? "bg-emerald-500/20 px-2 py-0.5 rounded-full" : consulta.estado === "cancelada" ? "bg-red-500/20 px-2 py-0.5 rounded-full line-through" : ""}`}>{c.label}</span>
                <span className="text-[var(--text-tertiary)] text-[10px]">•</span>
                <div className="flex items-center gap-1">
                  <div className={`w-2 h-2 rounded-full ${corMedico.classe}`} />
                  <span className="text-[var(--text-secondary)] text-[10px] font-bold">{consulta.medicoNome}</span>
                </div>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Data e Hora</p>
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                <Calendar className="w-4 h-4 text-[#00E5FF]" />
                {format(toDate(consulta.dataHoraInicio), "d 'de' MMM, HH:mm", { locale: ptBR })}
              </div>
            </div>
            <div className="space-y-1">
              <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Duração</p>
              <div className="flex items-center gap-2 text-[var(--text-primary)] font-medium">
                <Clock className="w-4 h-4 text-[#00E5FF]" />
                {duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim)} min
              </div>
            </div>
          </div>

          {/* V34: Comunicação WhatsApp via API (com botões interativos) */}
          <div className="space-y-2">
            <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider">Comunicação WhatsApp</p>
            {whatsappStatus === "sent" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-xs font-bold">Mensagem enviada com sucesso!</span>
              </div>
            )}
            {whatsappStatus === "error" && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-xs font-bold">Erro ao enviar. Tente o WhatsApp direto.</span>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleEnviarLembrete}
                disabled={!consulta.utenteTelemovel || whatsappStatus === "sending"}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold hover:bg-amber-500/20 transition-all disabled:opacity-40"
              >
                {whatsappStatus === "sending" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Bell className="w-3.5 h-3.5" />}
                Lembrete
              </button>
              <button
                onClick={handleEnviarConfirmacao}
                disabled={!consulta.utenteTelemovel || whatsappStatus === "sending"}
                className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold hover:bg-emerald-500/20 transition-all disabled:opacity-40"
              >
                {whatsappStatus === "sending" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Pedir Confirmação
              </button>
            </div>
            <button
              onClick={enviarWhatsAppDireto}
              disabled={!consulta.utenteTelemovel}
              className="w-full py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 hover:bg-emerald-500/20 transition-all disabled:opacity-40"
            >
              <MessageCircle className="w-4 h-4" />
              WhatsApp Direto
              <ExternalLink className="w-3 h-3 opacity-60" />
            </button>
          </div>

          {/* V35.7: Fluxo de Check-in e Estados Intermédios */}
          {(consulta.estado === "agendada" || consulta.estado === "confirmada") && (
            <div className="space-y-2">
              <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5">
                <LogIn className="w-3 h-3 text-orange-400" /> Fluxo de Check-in
              </p>
              <div className="grid grid-cols-3 gap-2">
                {/* Check-in: Sala de Espera */}
                <button
                  onClick={() => handleCheckin(checkinEstado === "em_sala_espera" ? null : "em_sala_espera")}
                  disabled={updateConsultaCheckin.isPending}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    checkinEstado === "em_sala_espera"
                      ? "bg-orange-400 text-white shadow-lg shadow-orange-400/30"
                      : "bg-orange-500/10 border border-orange-500/20 text-orange-400 hover:bg-orange-500/20"
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Sala Espera</span>
                </button>
                {/* Em Consulta */}
                <button
                  onClick={() => handleCheckin(checkinEstado === "em_consulta" ? null : "em_consulta")}
                  disabled={updateConsultaCheckin.isPending}
                  className={`flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold transition-all ${
                    checkinEstado === "em_consulta"
                      ? "bg-violet-500 text-white shadow-lg shadow-violet-500/30"
                      : "bg-violet-500/10 border border-violet-500/20 text-violet-400 hover:bg-violet-500/20"
                  }`}
                >
                  <Stethoscope className="w-4 h-4" />
                  <span>Em Consulta</span>
                </button>
                {/* Concluída */}
                <button
                  onClick={() => { handleCheckin(null); updateStatus.mutate({ consultaId: consulta.id, novoStatus: "realizada" }); }}
                  disabled={updateStatus.isPending}
                  className="flex flex-col items-center justify-center gap-1 py-2.5 rounded-xl text-xs font-bold bg-teal-500/10 border border-teal-500/20 text-teal-400 hover:bg-teal-500/20 transition-all"
                >
                  <ClipboardCheck className="w-4 h-4" />
                  <span>Concluída</span>
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
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${consulta.estado === "cancelada" ? "bg-red-500 text-white" : "bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20"}`}
              >
                <XCircle className="w-3.5 h-3.5" /> Cancelar
              </button>
              <button 
                onClick={() => updateStatus.mutate({ consultaId: consulta.id, novoStatus: "no-show" })}
                disabled={consulta.estado === "no-show"}
                className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold transition-all ${consulta.estado === "no-show" ? "bg-amber-500 text-white" : "bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20"}`}
              >
                <AlertCircle className="w-3.5 h-3.5" /> Faltou
              </button>
            </div>
          </div>

          {/* V34: Link para ficha do utente e comunicação */}
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
                  className="w-full py-2 rounded-xl bg-[#00E5FF] text-black text-xs font-bold"
                >
                  Guardar Alterações
                </button>
              </div>
            ) : (
              <div className="bg-[var(--bg-overlay)] rounded-xl p-4 space-y-2">
                <p className="text-[var(--text-primary)] text-sm font-medium">{consulta.tipoConsulta || "Consulta Geral"}</p>
                <p className="text-[var(--text-secondary)] text-xs italic">{consulta.observacoes || "Sem observações registadas."}</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-[var(--border-light)]">
            <button 
              onClick={() => confirm("Eliminar marcação permanentemente?") && eliminar.mutate({ consultaId: consulta.id })}
              className="text-red-500/50 hover:text-red-500 text-xs font-bold flex items-center gap-1 transition-colors"
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

/**
 * ColunaDrop — zona de drop única por coluna (médico ou dia)
 * PERFORMANCE FIX V32.4: Em vez de criar um SlotDrop por cada slot de 30min
 * (o que gerava centenas de componentes useDroppable), usamos UMA zona de drop
 * por coluna e calculamos o slot a partir da posição Y do rato no drop.
 * Resultado: de N_medicos * N_horas * 2 componentes para apenas N_medicos.
 */
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
    const horaOffset = Math.floor(totalMinutos / 30) * 30; // arredondar para 30min
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

// SlotDrop mantido apenas para a VistaSemana (7 dias × N_horas × 2 = ~200 slots, aceitável)
function SlotDrop({ id, className, style, onClick }: any) {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} onClick={onClick} className={className}
      style={{ ...style, backgroundColor: isOver ? "rgba(99,102,241,0.1)" : undefined }}
    />
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// BlocoConsulta — AUTO-AJUSTE de fontes e informações V32.8.1
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * O bloco adapta-se automaticamente ao tamanho disponível:
 * - Altura >= 90px: Layout completo (nome, hora, tipo, médico, estado)
 * - Altura 60-89px: Layout médio (nome, hora, tipo)
 * - Altura 40-59px: Layout compacto (nome + hora numa linha)
 * - Altura < 40px:  Layout mínimo (apenas hora + primeiro nome)
 * 
 * Tooltip sempre presente com informação completa ao hover.
 */
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
  
  // Calcular a altura real do bloco para determinar o nível de detalhe
  const alturaBloco = typeof style.height === "number" ? style.height : 60;
  
  // Determinar nível de layout baseado na altura
  const nivel = alturaBloco >= 90 ? "completo" : alturaBloco >= 60 ? "medio" : alturaBloco >= 40 ? "compacto" : "minimo";
  
  // Calcular tamanhos de fonte proporcionais ao bloco
  const fontNome = nivel === "completo" ? "text-[13px]" : nivel === "medio" ? "text-[12px]" : "text-[11px]";
  const fontHora = nivel === "completo" ? "text-[11px]" : nivel === "medio" ? "text-[10px]" : "text-[9px]";
  const fontDetalhe = nivel === "completo" ? "text-[11px]" : "text-[10px]";
  const iconSize = nivel === "completo" ? "w-3 h-3" : "w-2.5 h-2.5";
  
  // Padding proporcional
  const padding = nivel === "completo" ? "p-2.5" : nivel === "medio" ? "p-2" : "px-2 py-1";

  const s: React.CSSProperties = {
    ...style,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 100 : 10,
  };

  // Tooltip com informação completa
  const tooltipText = `${consulta.utenteNome}\n${fmtHora(consulta.dataHoraInicio)} - ${fmtHora(consulta.dataHoraFim)} (${duracaoMin(consulta.dataHoraInicio, consulta.dataHoraFim)} min)\n${consulta.tipoConsulta || "Consulta Geral"}\nDr(a). ${consulta.medicoNome}\nEstado: ${estadoCor.label}`;

  return (
    <div ref={setNodeRef} {...listeners} {...attributes}
      onClick={(e) => { e.stopPropagation(); onSelect(consulta); }}
      title={tooltipText}
      className={`absolute rounded-lg border-l-[3px] shadow-md cursor-grab active:cursor-grabbing overflow-hidden transition-all hover:shadow-lg hover:brightness-[0.97] hover:scale-[1.01] ${estadoCor.bg} ${corMedico.border} ${estadoCor.glow || ""}`}
      style={s}
    >
      <div className={`${padding} h-full flex flex-col`}>
        {/* ─── LAYOUT COMPLETO (>= 90px) ─── */}
        {nivel === "completo" && (
          <>
            <div className="flex items-start justify-between gap-1.5 mb-1">
              <span className={`font-bold ${fontNome} leading-snug truncate ${estadoCor.text}`}>
                {consulta.utenteNome}
              </span>
              <span className={`${fontHora} font-bold shrink-0 bg-black/10 px-1.5 py-0.5 rounded ${estadoCor.text}`}>
                {fmtHora(consulta.dataHoraInicio)}
              </span>
            </div>
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className={`${iconSize} ${estadoCor.text} opacity-70 shrink-0`} />
              <span className={`${fontDetalhe} font-medium truncate ${estadoCor.text} opacity-90`}>
                {consulta.tipoConsulta || "Consulta Geral"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-auto pt-1 border-t border-black/10">
              <div className="flex items-center gap-1.5 truncate">
                <User className={`${iconSize} ${estadoCor.text} opacity-70 shrink-0`} />
                <span className={`${fontDetalhe} font-semibold truncate ${estadoCor.text} opacity-90`}>
                  {consulta.medicoNome}
                </span>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {consulta.estado === "confirmada" && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                {consulta.estado === "cancelada" && <XCircle className="w-3 h-3 text-red-600" />}
                {consulta.estado === "no-show" && <AlertCircle className="w-3 h-3 text-amber-600" />}
                <div className={`w-2.5 h-2.5 rounded-full ${estadoCor.dot} shadow-sm`} title={estadoCor.label} />
              </div>
            </div>
          </>
        )}

        {/* ─── LAYOUT MÉDIO (60-89px) ─── */}
        {nivel === "medio" && (
          <>
            <div className="flex items-center justify-between gap-1.5 mb-0.5">
              <span className={`font-bold ${fontNome} leading-snug truncate ${estadoCor.text}`}>
                {consulta.utenteNome}
              </span>
              <span className={`${fontHora} font-bold shrink-0 bg-black/10 px-1.5 py-0.5 rounded ${estadoCor.text}`}>
                {fmtHora(consulta.dataHoraInicio)}
              </span>
            </div>
            <div className="flex items-center gap-1 mt-auto">
              <Clock className={`w-2.5 h-2.5 ${estadoCor.text} opacity-60 shrink-0`} />
              <span className={`${fontDetalhe} font-medium truncate ${estadoCor.text} opacity-80`}>
                {consulta.tipoConsulta || "Consulta Geral"}
              </span>
              <div className={`w-2 h-2 rounded-full ${estadoCor.dot} ml-auto shrink-0`} />
            </div>
          </>
        )}

        {/* ─── LAYOUT COMPACTO (40-59px) ─── */}
        {nivel === "compacto" && (
          <div className="flex items-center justify-between gap-1 h-full">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className={`w-2 h-2 rounded-full ${estadoCor.dot} shrink-0`} />
              <span className={`font-bold ${fontNome} truncate ${estadoCor.text}`}>
                {consulta.utenteNome.split(" ")[0]}
              </span>
            </div>
            <span className={`${fontHora} font-bold shrink-0 bg-black/10 px-1 py-0.5 rounded ${estadoCor.text}`}>
              {fmtHora(consulta.dataHoraInicio)}
            </span>
          </div>
        )}

        {/* ─── LAYOUT MÍNIMO (< 40px) ─── */}
        {nivel === "minimo" && (
          <div className="flex items-center gap-1 h-full overflow-hidden">
            <div className={`w-1.5 h-1.5 rounded-full ${estadoCor.dot} shrink-0`} />
            <span className={`font-bold text-[10px] truncate ${estadoCor.text}`}>
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
  return (
    <div className={`w-56 p-4 rounded-xl border-l-4 shadow-2xl ${corMedico.bg} ${corMedico.border} bg-[var(--bg-elevated)] backdrop-blur-sm`}>
      <div className="flex items-center justify-between mb-2">
        <p className={`font-bold text-sm ${corMedico.text}`}>{consulta.utenteNome}</p>
        <span className={`text-[10px] font-bold bg-[var(--bg-subtle)] px-1.5 py-0.5 rounded ${corMedico.text}`}>{fmtHora(consulta.dataHoraInicio)}</span>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Clock className={`w-3 h-3 ${corMedico.text} opacity-60`} />
          <p className="text-[var(--text-secondary)] text-[11px] font-medium">{consulta.tipoConsulta || "Consulta Geral"}</p>
        </div>
        <div className="flex items-center gap-2">
          <User className={`w-3 h-3 ${corMedico.text} opacity-60`} />
          <p className="text-[var(--text-tertiary)] text-[11px] font-semibold">{consulta.medicoNome}</p>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Filtro por Médico (Chips Coloridos)
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
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
          todosAtivos
            ? "bg-[var(--bg-subtle)] border-white/20 text-[var(--text-primary)]"
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
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${
              ativo
                ? `${cor.bg} border-current ${cor.text}`
                : "bg-[var(--bg-surface)] border-[var(--border-light)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)] opacity-50"
            }`}
          >
            <div className={`w-2.5 h-2.5 rounded-full ${cor.classe} ${ativo ? "" : "opacity-40"}`} />
            {m.nome.split(" ")[0]}
            {m.especialidade && <span className="opacity-60 font-normal">({m.especialidade})</span>}
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// VISTA DIA — Colunas por Dentista
// Cada dentista cadastrado tem a sua coluna com nome em cima e horários abaixo
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * VistaDia — PERFORMANCE FIX V32.4
 * Substituídos os SlotDrop individuais (N_medicos × N_horas × 2 componentes useDroppable)
 * por ColunaDrop: UMA zona de drop por médico. O slot é calculado pela posição Y do clique.
 * Redução: de ~300 para ~5 componentes droppable registados no DnD context.
 */
function VistaDia({ data, consultas, medicos, feriados, onNovaConsulta, onSelectConsulta, HORAS, SLOT_HEIGHT, minutosDesdeInicio }: any) {
  const HORA_INICIO = HORAS[0];
  const { top, visivel } = useLinhaViva(HORA_INICIO, HORAS[HORAS.length - 1], SLOT_HEIGHT);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && visivel) ref.current.scrollTop = Math.max(0, top - 200); }, []);
  const MEIA = SLOT_HEIGHT / 2;

  // V34.1: Verificar se o dia selecionado é feriado
  const feriadoDoDia = useMemo(() => {
    if (!feriados || !Array.isArray(feriados)) return null;
    const dataStr = format(data, "yyyy-MM-dd");
    return feriados.find((f: Feriado) => f.date === dataStr) || null;
  }, [feriados, data]);

  // FIX V32.5.1: Filtrar consultas para o dia selecionado (robusto com timezone)
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

  const MIN_COL_WIDTH = 200;

  // V34.1: Cores por categoria de feriado
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
      {/* V34.1: Banner de Feriado — Alerta para Recepcionistas */}
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

      {/* Header fixo com nomes dos dentistas */}
      <div className="flex border-b border-[var(--border-lighter)] shrink-0 bg-[var(--bg-surface)] sticky top-0 z-30">
        <div className="w-16 shrink-0 border-r border-[var(--border-lightest)]" />
        {medicosVisiveis.map((medico) => {
          const cor = getCorMedico(medico.id, medico.corAgenda);
          const consultasMedico = consultasDoDia.filter((c: any) => c.medicoId === medico.id);
          return (
            <div key={medico.id} className="flex-1 border-l border-[var(--border-lightest)] py-3 px-2 text-center" style={{ minWidth: MIN_COL_WIDTH }}>
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-9 h-9 rounded-full ${cor.classe} flex items-center justify-center shadow-lg`}>
                  <span className="text-[var(--text-primary)] text-sm font-bold">{medico.nome.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-xs font-bold truncate max-w-[160px]">{medico.nome}</p>
                  {medico.especialidade && (
                    <p className="text-[var(--text-tertiary)] text-[9px] font-medium truncate max-w-[160px]">{medico.especialidade}</p>
                  )}
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${cor.bg} ${cor.text}`}>
                  {consultasMedico.length} consulta{consultasMedico.length !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Corpo scrollável */}
      <div ref={ref} className="overflow-x-auto flex-1 relative">
        <div className="flex" style={{ minHeight: `${HORAS.length * SLOT_HEIGHT}px` }}>
          {/* Coluna das horas — sem droppable, apenas visual */}
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

          {/* Colunas dos dentistas — UMA ColunaDrop por médico (PERFORMANCE FIX) */}
          {medicosVisiveis.map((medico) => {
            const consultasMedico = consultasDoDia.filter((c: any) => c.medicoId === medico.id);
            return (
              <ColunaDrop
                key={medico.id}
                id={`dia|${medico.id}`}
                SLOT_HEIGHT={SLOT_HEIGHT}
                HORA_INICIO={HORA_INICIO}
                onClickAt={(hora, minuto) => onNovaConsulta(setMinutes(setHours(data, hora), minuto), medico.id)}
                className="flex-1 relative border-l border-[var(--border-lightest)] hover:bg-[#00E5FF]/[0.02] transition-colors"
                style={{ minWidth: MIN_COL_WIDTH, height: `${HORAS.length * SLOT_HEIGHT}px` }}
              >
                {/* Linhas de grade visual (sem droppable) */}
                {HORAS.map((hora: number, i: number) => (
                  <React.Fragment key={hora}>
                    <div className="absolute left-0 right-0 border-b border-[var(--border-lightest)] pointer-events-none" style={{ top: i * SLOT_HEIGHT, height: MEIA }} />
                    <div className="absolute left-0 right-0 border-b border-white/[0.02] pointer-events-none" style={{ top: i * SLOT_HEIGHT + MEIA, height: MEIA }} />
                  </React.Fragment>
                ))}

                {/* Linha de tempo ao vivo */}
                {visivel && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                    <div className="flex items-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] -ml-1.5 shrink-0" />
                      <div className="flex-1 h-px bg-red-500/60" />
                    </div>
                  </div>
                )}

                {/* Consultas deste médico — V32.8.1: sem prop compact, auto-ajuste interno */}
                {consultasMedico.map((c: any) => {
                  const t = (minutosDesdeInicio(c.dataHoraInicio) / 60) * SLOT_HEIGHT;
                  const h = Math.max(MEIA - 2, (duracaoMin(c.dataHoraInicio, c.dataHoraFim) / 60) * SLOT_HEIGHT - 4);
                  return (
                    <BlocoConsulta
                      key={c.id}
                      consulta={c}
                      onSelect={onSelectConsulta}
                      style={{ top: t + 2, height: h, left: 4, right: 4 }}
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
// VISTA SEMANA
// ═══════════════════════════════════════════════════════════════════════════════

function VistaSemana({ semanaInicio, consultas, feriados, onNovaConsulta, onSelectConsulta, HORAS, SLOT_HEIGHT, minutosDesdeInicio }: any) {
  const { top, visivel } = useLinhaViva(HORAS[0], HORAS[HORAS.length - 1], SLOT_HEIGHT);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { if (ref.current && visivel) ref.current.scrollTop = Math.max(0, top - 160); }, []);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(semanaInicio, i));
  const MEIA = SLOT_HEIGHT / 2;

  // V34.1: Helper para encontrar feriado de um dia
  const getFeriado = (d: Date): Feriado | null => {
    if (!feriados || !Array.isArray(feriados)) return null;
    const dataStr = format(d, "yyyy-MM-dd");
    return feriados.find((f: Feriado) => f.date === dataStr) || null;
  };

  // V34.1: Cores por categoria
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
      <div className="flex border-b border-[var(--border-lighter)] shrink-0 bg-[var(--bg-surface)] sticky top-0 z-30">
        <div className="w-14 shrink-0" />
        {dias.map(dia => {
          const feriado = getFeriado(dia);
          const cores = feriado ? (catColors[feriado.categoria] || catColors.comemorativo) : null;
          return (
            <div key={dia.toISOString()} className={`flex-1 text-center py-2 border-l border-[var(--border-lightest)] ${isToday(dia) ? "bg-[#00E5FF]/[0.06]" : ""} ${feriado ? cores!.bg : ""}`}>
              <p className="text-[var(--text-tertiary)] text-[10px] uppercase tracking-wider font-bold">{format(dia, "EEE", { locale: ptBR })}</p>
              <div className={`w-8 h-8 rounded-full mx-auto flex items-center justify-center mt-0.5 ${isToday(dia) ? "bg-[#00E5FF] text-black" : "text-[var(--text-primary)]"}`}>
                <span className="text-sm font-bold">{format(dia, "d")}</span>
              </div>
              {feriado && (
                <div className="mt-1" title={`${feriado.nome}${feriado.nomeEN && feriado.nomeEN !== feriado.nome ? " (" + feriado.nomeEN + ")" : ""}`}>
                  <span className={`text-[8px] font-bold ${cores!.text} leading-none px-1 py-0.5 rounded ${cores!.bg} inline-block max-w-full truncate`}>
                    {feriado.nome.length > 12 ? feriado.nome.substring(0, 12) + "…" : feriado.nome}
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
              <div key={dia.toISOString()} className={`flex-1 relative border-l border-[var(--border-lightest)] ${ehHoje ? "bg-[#00E5FF]/[0.015]" : ""} ${feriadoDia ? "bg-opacity-5" : ""}`}
                style={feriadoDia ? { backgroundColor: feriadoDia.categoria === "feriado_nacional" ? "rgba(239,68,68,0.02)" : feriadoDia.categoria === "comemorativo" ? "rgba(16,185,129,0.02)" : "rgba(245,158,11,0.02)" } : undefined}
              >
                {HORAS.map((hora: number, i: number) => (
                  <React.Fragment key={hora}>
                    <SlotDrop
                      id={`semana|${format(dia, "yyyy-MM-dd")}|${hora}|0`}
                      className="absolute left-0 right-0 border-t border-[var(--border-lightest)] cursor-pointer hover:bg-[#00E5FF]/[0.04] transition-colors"
                      style={{ top: i * SLOT_HEIGHT, height: MEIA }}
                      onClick={() => onNovaConsulta(setMinutes(setHours(dia, hora), 0))}
                    />
                    <SlotDrop
                      id={`semana|${format(dia, "yyyy-MM-dd")}|${hora}|30`}
                      className="absolute left-0 right-0 border-t border-white/[0.02] cursor-pointer hover:bg-[#00E5FF]/[0.04] transition-colors"
                      style={{ top: i * SLOT_HEIGHT + MEIA, height: MEIA }}
                      onClick={() => onNovaConsulta(setMinutes(setHours(dia, hora), 30))}
                    />
                  </React.Fragment>
                ))}
                {visivel && ehHoje && (
                  <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top }}>
                    <div className="flex items-center"><div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-1.5 shrink-0" /><div className="flex-1 h-px bg-red-500/80" /></div>
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
                      style={{ top: t + 1, height: h, left: 2, right: 2 }}
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
// VISTA MÊS — V32.8.1: Melhorada com melhor legibilidade
// ═══════════════════════════════════════════════════════════════════════════════

function VistaMes({ mesAtual, consultas, feriados, onNovaConsulta, onSelectConsulta }: any) {
  const inicio = startOfWeek(startOfMonth(mesAtual), { weekStartsOn: 1 });
  const fim = endOfWeek(endOfMonth(mesAtual), { weekStartsOn: 1 });
  const dias: Date[] = [];
  let cur = inicio;
  while (cur <= fim) { dias.push(cur); cur = addDays(cur, 1); }
  const getFeriado = (d: Date) => feriados.find((f: any) => f.date === format(d, "yyyy-MM-dd"));

  // V34.1: Cores por categoria
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
              className={`min-h-[110px] border-b border-r border-[var(--border-lightest)] p-2 cursor-pointer hover:bg-[var(--bg-surface)] transition-colors ${!doMes ? "opacity-25" : ""} ${hoje ? "bg-[#00E5FF]/[0.04]" : ""} ${feriado ? cores!.cellBg : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${hoje ? "bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/30" : "text-[var(--text-secondary)]"}`}>{format(dia, "d")}</div>
                {feriado && (
                  <span className={`text-[9px] font-bold ${cores!.text} ${cores!.bg} px-1.5 py-0.5 rounded border ${cores!.border}`}
                    title={`${feriado.nome}${feriado.nomeEN && feriado.nomeEN !== feriado.nome ? " (" + feriado.nomeEN + ")" : ""}`}>
                    {feriado.nome.length > 10 ? feriado.nome.substring(0, 10) + "…" : feriado.nome}
                  </span>
                )}
              </div>
              {cs.slice(0, 3).map((c: any) => {
                const corMedico = getCorMedico(c.medicoId, c.medicoCor);
                return (
                  <div
                    key={c.id}
                    onClick={(e) => { e.stopPropagation(); onSelectConsulta(c); }}
                    title={`${c.utenteNome} — ${fmtHora(c.dataHoraInicio)} — ${c.tipoConsulta || "Consulta"} — Dr(a). ${c.medicoNome}`}
                    className={`${corMedico.bg} ${corMedico.border} border-l-2 rounded px-1.5 py-1 mb-1 truncate hover:brightness-110 cursor-pointer transition-all`}
                  >
                    <span className={`text-[10px] font-bold ${corMedico.text} leading-tight`}>
                      {fmtHora(c.dataHoraInicio)} {c.utenteNome.split(" ")[0]}
                    </span>
                  </div>
                );
              })}
              {cs.length > 3 && (
                <p className="text-[var(--text-tertiary)] text-[10px] font-bold pl-1 mt-0.5">
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
  
  // Estado do filtro por médico
  const [medicosFiltrados, setMedicosFiltrados] = useState<Set<number>>(new Set());

  const mostrarToast = (texto: string, tipo: "ok" | "erro" = "ok") => {
    setToastMsg({ texto, tipo });
    setTimeout(() => setToastMsg(null), 3000);
  };

  const utils = trpc.useUtils();
  
  // FIX V32.5.1: Cache de 10 minutos para configurações (raramente mudam)
  const configQ = trpc.configuracoes.obterInfoClinica.useQuery(undefined, {
    staleTime: 1000 * 60 * 10,
    refetchOnWindowFocus: false,
  });
  const clinicaInfo = (configQ.data as any)?.clinica ?? {};
  
  // Carregar lista de médicos com cores
  // FIX V32.5.1: Cache de 5 minutos para médicos (raramente mudam)
  const medicosQ = trpc.consultas.listarMedicosAgenda.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });
  const medicosAgenda: MedicoAgenda[] = useMemo(() => {
    const raw = (medicosQ.data as any)?.medicos;
    if (!raw) return [];
    // FIX V32.5.1: Garantir que é array de objectos válidos
    const arr = Array.isArray(raw) ? raw : [];
    return arr.filter((m: any) => m && typeof m === 'object' && m.id && m.nome);
  }, [medicosQ.data]);

  // Médicos visíveis (filtrados ou todos)
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
    // V34: Auto-refresh a cada 30s para refletir confirmações/cancelamentos via WhatsApp em tempo real
    staleTime: 1000 * 15,
    refetchInterval: 1000 * 30,
    refetchOnWindowFocus: true,
  });

  // V34.1: Feriados dinâmicos do país configurado (via API Nager.Date)
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
      // PERFORMANCE FIX V32.4: ColunaDrop usa formato dia|medicoId
      // Calcular hora/minuto a partir do delta Y do drag (offset do rato no drop)
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

  // Merge dos dados do servidor com os overrides optimistas + FILTRO POR MÉDICO
  const consultasData = useMemo(() => {
    const raw = (consultasQ.data?.consultas ?? []).map((c: any) => {
      const override = overridesOptimistas[c.id];
      return override ? { ...c, ...override } : c;
    });
    
    // Aplicar filtro por médico
    if (medicosFiltrados.size === 0) return raw;
    return raw.filter((c: any) => medicosFiltrados.has(c.medicoId));
  }, [consultasQ.data, overridesOptimistas, medicosFiltrados]);

  // Handlers do filtro
  const handleToggleMedico = (id: number) => {
    setMedicosFiltrados(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleToggleTodos = () => {
    setMedicosFiltrados(new Set());
  };

  // Handler para abrir modal com médico pré-selecionado
  const handleNovaConsulta = (data: Date, medicoId?: number) => {
    setModalData({ data, medicoId });
  };

  // Handler para semana/mês (sem médico pré-selecionado)
  const handleNovaConsultaSemMedico = (data: Date) => {
    setModalData({ data });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-6 font-sans relative">
        {/* Toast de feedback */}
        {toastMsg && (
          <div className={`fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border backdrop-blur-sm transition-all animate-in slide-in-from-bottom-2 ${
            toastMsg.tipo === "ok"
              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
              : "bg-red-500/20 border-red-500/40 text-red-300"
          }`}>
            {toastMsg.tipo === "ok"
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            <span className="text-sm font-semibold">{toastMsg.texto}</span>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-header-title">Agenda Clínica</h1>
            <p className="page-header-subtitle">Gestão de consultas e disponibilidade médica</p>
          </div>
          <div className="flex bg-[var(--bg-overlay)] p-1 rounded-xl border border-[var(--border-light)]">
            {(["dia", "semana", "mes"] as const).map(v => (
              <button key={v} onClick={() => setVista(v)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${vista === v ? 'bg-[#00E5FF] text-black shadow-lg shadow-[#00E5FF]/20' : 'text-[var(--text-tertiary)] hover:text-[var(--text-primary)]'}`}>
                {v === "dia" ? "Dia" : v === "semana" ? "Semana" : "Mês"}
              </button>
            ))}
          </div>
        </div>

        {/* Barra de filtro por médico */}
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

        {/* V34: Painel de resumo de estados + Legenda */}
        <div className="card-premium p-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 flex-wrap">
              {Object.entries(ESTADO_COLORS).map(([key, val]) => {
                // V35.7: para estados intermédios, contar por check-in nas observações
                let count: number;
                if (key === "em_sala_espera" || key === "em_consulta") {
                  count = consultasData.filter((c: any) => getCheckinEstado(c.observacoes) === key && (c.estado === "agendada" || c.estado === "confirmada")).length;
                } else {
                  count = consultasData.filter((c: any) => c.estado === key).length;
                }
                if (count === 0 && (key === "em_sala_espera" || key === "em_consulta")) return null;
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${val.dot}`} />
                    <span className="text-[var(--text-secondary)] text-[11px] font-bold">{val.label}</span>
                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${val.bg} ${val.text}`}>{count}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-2 text-[var(--text-muted)] text-[10px]">
              <RefreshCw className={`w-3 h-3 ${consultasQ.isFetching ? "animate-spin text-cyan-400" : ""}`} />
              <span>Auto-refresh ativo (30s)</span>
            </div>
          </div>
        </div>

        {/* V34.1: Painel de Próximos Feriados — Alertas para Recepcionistas */}
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
                const catColors: Record<string, { bg: string; border: string; text: string; dot: string }> = {
                  feriado_nacional: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", dot: "bg-red-400" },
                  feriado_bancario: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", dot: "bg-amber-400" },
                  feriado_escolar: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", dot: "bg-blue-400" },
                  opcional: { bg: "bg-violet-500/10", border: "border-violet-500/20", text: "text-violet-400", dot: "bg-violet-400" },
                  comemorativo: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", dot: "bg-emerald-400" },
                  personalizado: { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400", dot: "bg-cyan-400" },
                };
                const cores = catColors[f.categoria] || catColors.comemorativo;
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

        <div className="card-premium p-0 overflow-hidden">
          <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
            <div className="flex items-center gap-4">
              <button onClick={() => {
                if (vista === "dia") setDataActual(subDays(dataActual, 1));
                if (vista === "semana") setDataActual(subWeeks(dataActual, 1));
                if (vista === "mes") setDataActual(subMonths(dataActual, 1));
              }} className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-primary)]"><ChevronLeft className="w-5 h-5" /></button>
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {vista === "dia" && format(dataActual, "d 'de' MMMM, yyyy", { locale: ptBR })}
                {vista === "semana" && `Semana de ${format(startOfWeek(dataActual, { weekStartsOn: 1 }), "d 'de' MMM", { locale: ptBR })} a ${format(endOfWeek(dataActual, { weekStartsOn: 1 }), "d 'de' MMM", { locale: ptBR })}`}
                {vista === "mes" && format(dataActual, "MMMM 'de' yyyy", { locale: ptBR })}
              </h2>
              <button onClick={() => {
                if (vista === "dia") setDataActual(addDays(dataActual, 1));
                if (vista === "semana") setDataActual(addWeeks(dataActual, 1));
                if (vista === "mes") setDataActual(addMonths(dataActual, 1));
              }} className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-primary)]"><ChevronRight className="w-5 h-5" /></button>
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
