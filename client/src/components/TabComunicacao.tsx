/**
 * TabComunicacao.tsx — Tab de Comunicação Direta com o Utente
 *DentCare Elite V35 — Conectores + Comunicação Integrada
 *
 * Funcionalidades:
 * - Envio rápido de WhatsApp (mensagem livre, templates, confirmação, lembrete)
 * - Envio de SMS e Email (quando conectores ativos)
 * - Histórico de comunicações (timeline)
 * - Quick-actions: Lembrete, Confirmação, Follow-up, Pedido de Avaliação, Aniversário
 * - Painel de templates WhatsApp pré-definidos
 * - Estado de entrega visual (enviado, entregue, lido)
 */
import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  MessageCircle, Send, Phone, Mail, Clock, CheckCircle, XCircle,
  AlertCircle, Calendar, Star, Heart, Gift, Zap, RefreshCw,
  ChevronDown, ChevronUp, Loader2, X, Bell, MessageSquare,
  FileText, ArrowRight, Sparkles, Shield, ExternalLink,
  Copy, Check, Users, TrendingUp, Megaphone,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface Props {
  utente: any;
  consultas: any[];
  onRefresh: () => void;
}

interface TemplateMsg {
  id: string;
  nome: string;
  categoria: "lembrete" | "confirmacao" | "followup" | "marketing" | "aniversario" | "avaliacao" | "geral";
  mensagem: string;
  icon: React.ComponentType<any>;
  cor: string;
  corBg: string;
  corBorder: string;
}

// ─── Templates de Mensagens ──────────────────────────────────────────────────
const TEMPLATES: TemplateMsg[] = [
  {
    id: "lembrete_consulta",
    nome: "Lembrete de Consulta",
    categoria: "lembrete",
    mensagem: "Olá {nome}! 👋\n\nRelembramos a sua consulta agendada para {data} às {hora}.\n\nPor favor, confirme a sua presença respondendo *CONFIRMO* ou *CANCELO*.\n\nAté breve! 😊🦷",
    icon: Bell,
    cor: "text-amber-400",
    corBg: "bg-amber-500/10",
    corBorder: "border-amber-500/20",
  },
  {
    id: "confirmacao_marcacao",
    nome: "Confirmação de Marcação",
    categoria: "confirmacao",
    mensagem: "Olá {nome}! ✅\n\nA sua consulta foi agendada com sucesso:\n\n📅 Data: {data}\n🕐 Hora: {hora}\n👨‍⚕️ Médico: {medico}\n\nPara confirmar, responda *CONFIRMO*.\nPara cancelar, responda *CANCELO*.\nPara remarcar, responda *REMARCAR*.\n\nAté breve! 🦷",
    icon: CheckCircle,
    cor: "text-emerald-400",
    corBg: "bg-emerald-500/10",
    corBorder: "border-emerald-500/20",
  },
  {
    id: "followup_pos",
    nome: "Follow-up Pós-Consulta",
    categoria: "followup",
    mensagem: "Olá {nome}! 😊\n\nEsperamos que esteja a recuperar bem após a sua consulta.\n\nSe tiver alguma dúvida ou desconforto, não hesite em contactar-nos.\n\nComo se está a sentir?\n👍 Bem\n😐 Mais ou menos\n👎 Mal\n\nEstamos aqui para ajudar! ❤️",
    icon: Heart,
    cor: "text-pink-400",
    corBg: "bg-pink-500/10",
    corBorder: "border-pink-500/20",
  },
  {
    id: "pedido_avaliacao",
    nome: "Pedido de Avaliação",
    categoria: "avaliacao",
    mensagem: "Olá {nome}! ⭐\n\nA sua opinião é muito importante para nós!\n\nComo avalia a sua última experiência na nossa clínica?\n\n⭐⭐⭐⭐⭐ Excelente\n⭐⭐⭐⭐ Bom\n⭐⭐⭐ Razoável\n\nObrigado pelo seu feedback! 🙏",
    icon: Star,
    cor: "text-yellow-400",
    corBg: "bg-yellow-500/10",
    corBorder: "border-yellow-500/20",
  },
  {
    id: "aniversario",
    nome: "Felicitação de Aniversário",
    categoria: "aniversario",
    mensagem: "Feliz Aniversário, {nome}! 🎂🎉\n\nToda a equipa da clínica deseja-lhe um dia muito especial!\n\nComo presente, oferecemos-lhe um desconto especial na sua próxima consulta.\n\nAgende já respondendo *AGENDAR*! 🦷✨",
    icon: Gift,
    cor: "text-violet-400",
    corBg: "bg-violet-500/10",
    corBorder: "border-violet-500/20",
  },
  {
    id: "reativacao",
    nome: "Reativação de Utente",
    categoria: "marketing",
    mensagem: "Olá {nome}! 👋\n\nSentimos a sua falta! Já passou algum tempo desde a sua última visita.\n\nA saúde oral é fundamental — agende já a sua consulta de rotina!\n\nResponda *AGENDAR* para ver os horários disponíveis. 📅\n\nEstamos à sua espera! 😊🦷",
    icon: RefreshCw,
    cor: "text-[#00E5FF]",
    corBg: "bg-[#00E5FF]/10",
    corBorder: "border-[#00E5FF]/20",
  },
  {
    id: "mensagem_livre",
    nome: "Mensagem Personalizada",
    categoria: "geral",
    mensagem: "",
    icon: MessageCircle,
    cor: "text-cyan-400",
    corBg: "bg-cyan-500/10",
    corBorder: "border-cyan-500/20",
  },
];

// ─── Componente: Quick Action Button ─────────────────────────────────────────
function QuickAction({ icon: Icon, label, sublabel, onClick, cor, corBg, corBorder, loading, disabled }: {
  icon: React.ComponentType<any>; label: string; sublabel?: string;
  onClick: () => void; cor: string; corBg: string; corBorder: string;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`flex items-center gap-3 p-4 rounded-2xl border ${corBorder} ${corBg} hover:brightness-110 transition-all group text-left w-full ${disabled ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.01] active:scale-[0.99]"}`}
    >
      <div className={`w-10 h-10 rounded-xl ${corBg} border ${corBorder} flex items-center justify-center shrink-0`}>
        {loading ? <Loader2 className={`w-5 h-5 ${cor} animate-spin`} /> : <Icon className={`w-5 h-5 ${cor}`} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${cor}`}>{label}</p>
        {sublabel && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{sublabel}</p>}
      </div>
      <ArrowRight className={`w-4 h-4 ${cor} opacity-0 group-hover:opacity-100 transition-opacity`} />
    </button>
  );
}

// ─── Componente: Mensagem no Histórico ───────────────────────────────────────
function MensagemHistorico({ tipo, texto, data, estado, canal }: {
  tipo: "enviada" | "recebida"; texto: string; data: string;
  estado?: "enviado" | "entregue" | "lido" | "erro"; canal: "whatsapp" | "sms" | "email";
}) {
  const canalIcon = canal === "whatsapp" ? MessageCircle : canal === "sms" ? Phone : Mail;
  const CanalIcon = canalIcon;
  const estadoConfig: Record<string, { icon: React.ComponentType<any>; cor: string; label: string }> = {
    enviado: { icon: Check, cor: "text-[var(--text-muted)]", label: "Enviado" },
    entregue: { icon: CheckCircle, cor: "text-blue-400", label: "Entregue" },
    lido: { icon: CheckCircle, cor: "text-emerald-400", label: "Lido" },
    erro: { icon: XCircle, cor: "text-red-400", label: "Erro" },
  };
  const est = estado ? estadoConfig[estado] : null;
  const EstIcon = est?.icon || Check;

  return (
    <div className={`flex ${tipo === "enviada" ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[80%] rounded-2xl p-4 ${
        tipo === "enviada"
          ? "bg-[#00E5FF]/15 border border-[#00E5FF]/20 rounded-br-md"
          : "bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-bl-md"
      }`}>
        <div className="flex items-center gap-2 mb-2">
          <CanalIcon className={`w-3 h-3 ${tipo === "enviada" ? "text-[#00E5FF]" : "text-emerald-400"}`} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
            {canal === "whatsapp" ? "WhatsApp" : canal === "sms" ? "SMS" : "Email"}
          </span>
        </div>
        <p className="text-[var(--text-primary)] text-sm whitespace-pre-wrap">{texto}</p>
        <div className="flex items-center justify-end gap-2 mt-2">
          <span className="text-[var(--text-muted)] text-[10px]">{data}</span>
          {est && <EstIcon className={`w-3 h-3 ${est.cor}`} />}
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Modal de Envio de Mensagem ──────────────────────────────────
function ModalEnviarMensagem({ utente, template, consulta, onClose, onSuccess }: {
  utente: any; template: TemplateMsg; consulta?: any;
  onClose: () => void; onSuccess: () => void;
}) {
  const proximaConsulta = consulta;
  const dataFmt = proximaConsulta ? new Date(proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT") : "—";
  const horaFmt = proximaConsulta ? new Date(proximaConsulta.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) : "—";
  const medicoNome = proximaConsulta?.medicoNome || "—";

  const processarTemplate = (msg: string) => {
    return msg
      .replace(/\{nome\}/gi, utente.nome || "")
      .replace(/\{data\}/gi, dataFmt)
      .replace(/\{hora\}/gi, horaFmt)
      .replace(/\{medico\}/gi, medicoNome);
  };

  const [mensagem, setMensagem] = useState(template.mensagem ? processarTemplate(template.mensagem) : "");
  const [canal, setCanal] = useState<"whatsapp" | "sms" | "email">("whatsapp");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState(false);

  // Helper para extrair mensagem de erro user-friendly (usa utilitário global)
  const parseErro = (e: any): string => parseApiError(e, "Erro ao enviar mensagem");

  const enviarMutation = trpc.whatsapp.enviarMensagem.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const enviarLembreteMutation = trpc.whatsapp.enviarLembrete.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const enviarConfirmacaoMutation = trpc.whatsapp.enviarConfirmacao.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const enviarFollowupMutation = trpc.whatsapp.enviarFollowup.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const enviarAvaliacaoMutation = trpc.whatsapp.enviarPedidoAvaliacao.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const enviarAniversarioMutation = trpc.whatsapp.enviarAniversario.useMutation({
    onSuccess: () => {
      setSucesso(true);
      setTimeout(() => { onSuccess(); onClose(); }, 1500);
    },
    onError: (e: any) => { setErro(parseApiError(e, "Erro ao enviar mensagem")); setEnviando(false); },
  });

  const handleEnviar = () => {
    if (!mensagem.trim()) { setErro("A mensagem não pode estar vazia"); return; }
    if (!utente.telemovel) { setErro("O utente não tem telemóvel registado"); return; }

    // Validar que templates que precisam de consulta têm consulta associada
    const precisaConsulta = ["lembrete_consulta", "confirmacao_marcacao", "followup_pos", "pedido_avaliacao"];
    if (precisaConsulta.includes(template.id) && !proximaConsulta) {
      setErro("Não existe consulta agendada para este utente. Agende uma consulta primeiro.");
      return;
    }

    setErro("");
    setEnviando(true);

    const telefone = utente.telemovel;

    // Usar endpoints específicos para tipos especiais (com botões interativos)
    if (template.id === "lembrete_consulta" && proximaConsulta) {
      enviarLembreteMutation.mutate({
        consultaId: proximaConsulta.id,
        utenteName: utente.nome,
        consultaTime: horaFmt,
        utenteTelefone: telefone,
        medicoNome: medicoNome,
        tipoConsulta: proximaConsulta.tipoConsulta || "Consulta",
        consultaData: dataFmt,
      });
      return;
    }

    if (template.id === "confirmacao_marcacao" && proximaConsulta) {
      enviarConfirmacaoMutation.mutate({
        consultaId: proximaConsulta.id,
        utenteName: utente.nome,
        data: dataFmt,
        hora: horaFmt,
        medicoNome: medicoNome,
        utenteTelefone: telefone,
        tipoConsulta: proximaConsulta.tipoConsulta || "Consulta",
      });
      return;
    }

    if (template.id === "followup_pos" && proximaConsulta) {
      enviarFollowupMutation.mutate({
        consultaId: proximaConsulta.id,
        utenteName: utente.nome,
        utenteTelefone: telefone,
        tipoConsulta: proximaConsulta.tipoConsulta || "Consulta",
        medicoNome: medicoNome,
      });
      return;
    }

    if (template.id === "pedido_avaliacao" && proximaConsulta) {
      enviarAvaliacaoMutation.mutate({
        consultaId: proximaConsulta.id,
        utenteName: utente.nome,
        utenteTelefone: telefone,
      });
      return;
    }

    if (template.id === "aniversario") {
      enviarAniversarioMutation.mutate({
        utenteName: utente.nome,
        utenteTelefone: telefone,
        utenteId: utente.id,
      });
      return;
    }

    // Mensagem genérica
    enviarMutation.mutate({
      telefone,
      mensagem,
      tipo: template.categoria === "marketing" ? "promotion" as any : "custom" as any,
      utenteId: utente.id,
    });
  };

  const Icon = template.icon;

  if (sucesso) {
    return (
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-md shadow-2xl p-8 text-center animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-emerald-400" />
          </div>
          <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Mensagem Enviada!</h3>
          <p className="text-[var(--text-secondary)] text-sm">A mensagem foi adicionada à fila de envio com sucesso.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className={`flex items-center justify-between p-6 border-b border-[var(--border-primary)] bg-gradient-to-r ${template.corBg} shrink-0`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl ${template.corBg} border ${template.corBorder} flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${template.cor}`} />
            </div>
            <div>
              <h2 className="text-[var(--text-primary)] font-bold">{template.nome}</h2>
              <p className="text-[var(--text-muted)] text-xs">Para: {utente.nome} ({utente.telemovel || "sem telemóvel"})</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 overflow-y-auto">
          {erro && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm">{erro}</p>
            </div>
          )}

          {/* Canal de envio */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Canal de Envio</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "whatsapp" as const, label: "WhatsApp", icon: MessageCircle, cor: "emerald" },
                { id: "sms" as const, label: "SMS", icon: Phone, cor: "blue" },
                { id: "email" as const, label: "Email", icon: Mail, cor: "violet" },
              ].map(c => (
                <button
                  key={c.id}
                  onClick={() => setCanal(c.id)}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-bold transition-all ${
                    canal === c.id
                      ? `bg-${c.cor}-500/20 border-${c.cor}-500/30 text-${c.cor}-400`
                      : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"
                  }`}
                >
                  <c.icon className="w-4 h-4" />
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Consulta associada */}
          {proximaConsulta ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
              <Calendar className="w-4 h-4 text-[#00E5FF] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[var(--text-primary)] text-xs font-bold">Consulta: {dataFmt} às {horaFmt}</p>
                <p className="text-[var(--text-muted)] text-[10px]">Dr(a). {medicoNome} — {proximaConsulta.tipoConsulta || "Consulta Geral"}</p>
              </div>
            </div>
          ) : ["lembrete_consulta", "confirmacao_marcacao", "followup_pos", "pedido_avaliacao"].includes(template.id) ? (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-amber-400 text-xs font-bold">Sem consulta agendada</p>
                <p className="text-[var(--text-muted)] text-[10px]">Este tipo de mensagem requer uma consulta agendada. Agende uma consulta primeiro.</p>
              </div>
            </div>
          ) : null}

          {/* Mensagem */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Mensagem</label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Escreva a sua mensagem..."
              rows={6}
              className="input-premium w-full resize-none text-sm"
            />
            <p className="text-[var(--text-muted)] text-[10px] text-right">{mensagem.length} caracteres</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-[var(--border-primary)] shrink-0">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">
            Cancelar
          </button>
          <button
            onClick={handleEnviar}
            disabled={enviando || !mensagem.trim() || (["lembrete_consulta", "confirmacao_marcacao", "followup_pos", "pedido_avaliacao"].includes(template.id) && !proximaConsulta)}
            className={`flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 text-white transition-all ${
              canal === "whatsapp" ? "bg-emerald-500 hover:bg-emerald-600" :
              canal === "sms" ? "bg-blue-500 hover:bg-blue-600" :
              "bg-violet-500 hover:bg-violet-600"
            } ${enviando || !mensagem.trim() || (["lembrete_consulta", "confirmacao_marcacao", "followup_pos", "pedido_avaliacao"].includes(template.id) && !proximaConsulta) ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Enviar {canal === "whatsapp" ? "WhatsApp" : canal === "sms" ? "SMS" : "Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Histórico de Comunicações (V34) ─────────────────────────────────────────
function HistoricoComunicacoes({ utenteId }: { utenteId: number }) {
  const [expandido, setExpandido] = useState(false);
  const [filtroCanal, setFiltroCanal] = useState<string | undefined>(undefined);

  const historicoQ = trpc.comunicacoes.listarPorUtente.useQuery(
    { utenteId, limite: 50, canal: filtroCanal },
    { enabled: !!utenteId }
  );

  const comunicacoes = historicoQ?.data?.comunicacoes ?? [];
  const total = historicoQ?.data?.total ?? 0;

  const CANAL_ICONS: Record<string, { icon: React.ComponentType<any>; cor: string; label: string }> = {
    whatsapp: { icon: MessageCircle, cor: "text-emerald-400", label: "WhatsApp" },
    sms: { icon: Phone, cor: "text-blue-400", label: "SMS" },
    email: { icon: Mail, cor: "text-violet-400", label: "Email" },
    telefone: { icon: Phone, cor: "text-cyan-400", label: "Telefone" },
    presencial: { icon: Users, cor: "text-amber-400", label: "Presencial" },
  };

  const TIPO_LABELS: Record<string, string> = {
    lembrete: "Lembrete",
    confirmacao: "Confirmação",
    cancelamento: "Cancelamento",
    follow_up: "Follow-up",
    avaliacao: "Avaliação",
    aniversario: "Aniversário",
    campanha: "Campanha",
    manual: "Manual",
    reativacao: "Reativação",
  };

  const ESTADO_ICONS: Record<string, { icon: React.ComponentType<any>; cor: string }> = {
    enviada: { icon: Send, cor: "text-[var(--text-muted)]" },
    entregue: { icon: CheckCircle, cor: "text-blue-400" },
    lida: { icon: CheckCircle, cor: "text-emerald-400" },
    respondida: { icon: MessageSquare, cor: "text-[#00E5FF]" },
    erro: { icon: XCircle, cor: "text-red-400" },
  };

  return (
    <div className="card-premium border border-[var(--border-primary)] overflow-hidden">
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center justify-between w-full p-5 text-left"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Clock className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Histórico de Comunicações</h3>
            <p className="text-[var(--text-muted)] text-[10px]">{total} comunicações registadas</p>
          </div>
        </div>
        {expandido ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
      </button>

      {expandido && (
        <div className="px-5 pb-5 space-y-3">
          {/* Filtros de canal */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFiltroCanal(undefined)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                !filtroCanal ? "bg-[#00E5FF]/20 border border-[#00E5FF]/30 text-[#00E5FF]" : "bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >Todos</button>
            {Object.entries(CANAL_ICONS).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setFiltroCanal(key)}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all ${
                  filtroCanal === key ? `bg-${key === "whatsapp" ? "emerald" : key === "sms" ? "blue" : key === "email" ? "violet" : "cyan"}-500/20 border border-${key === "whatsapp" ? "emerald" : key === "sms" ? "blue" : key === "email" ? "violet" : "cyan"}-500/30 ${val.cor}` : "bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]"
                }`}
              >
                <val.icon className="w-3 h-3" />
                {val.label}
              </button>
            ))}
          </div>

          {/* Timeline */}
          {historicoQ?.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-[#00E5FF]" />
            </div>
          ) : comunicacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 gap-2">
              <MessageCircle className="w-10 h-10 text-[var(--text-muted)] opacity-30" />
              <p className="text-[var(--text-muted)] text-xs">Sem comunicações registadas</p>
              <p className="text-[var(--text-muted)] text-[10px]">As comunicações enviadas aparecerão aqui automaticamente.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
              {comunicacoes.map((com: any) => {
                const canal = CANAL_ICONS[com.canal] || CANAL_ICONS.whatsapp;
                const CanalIcon = canal.icon;
                const estado = ESTADO_ICONS[com.estado] || ESTADO_ICONS.enviada;
                const EstadoIcon = estado.icon;
                const dataFmt = com.createdAt ? new Date(com.createdAt).toLocaleString("pt-PT", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "";

                return (
                  <div key={com.id} className={`flex gap-3 p-3 rounded-xl border transition-all ${
                    com.direcao === "entrada"
                      ? "bg-emerald-500/5 border-emerald-500/10"
                      : "bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                  }`}>
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      com.direcao === "entrada" ? "bg-emerald-500/20" : "bg-[#00E5FF]/20"
                    }`}>
                      <CanalIcon className={`w-4 h-4 ${canal.cor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[9px] font-bold uppercase tracking-widest ${
                          com.direcao === "entrada" ? "text-emerald-400" : "text-[#00E5FF]"
                        }`}>
                          {com.direcao === "entrada" ? "Recebida" : "Enviada"}
                        </span>
                        <span className="text-[var(--text-muted)] text-[9px]">•</span>
                        <span className="text-[var(--text-muted)] text-[9px] font-bold">
                          {TIPO_LABELS[com.tipo] || com.tipo}
                        </span>
                        <span className="text-[var(--text-muted)] text-[9px]">•</span>
                        <span className="text-[var(--text-muted)] text-[9px]">{dataFmt}</span>
                      </div>
                      {com.mensagem && (
                        <p className="text-[var(--text-primary)] text-xs line-clamp-2">{com.mensagem}</p>
                      )}
                      {com.respostaUtente && (
                        <div className="mt-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                          <p className="text-emerald-400 text-[10px] font-bold mb-0.5">Resposta do utente:</p>
                          <p className="text-[var(--text-primary)] text-xs">{com.respostaUtente}</p>
                        </div>
                      )}
                    </div>
                    <div className="shrink-0 flex items-start">
                      <EstadoIcon className={`w-3.5 h-3.5 ${estado.cor}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL: TabComunicacao
// ═══════════════════════════════════════════════════════════════════════════════
export function TabComunicacao({ utente, consultas, onRefresh }: Props) {
  const [templateSelecionado, setTemplateSelecionado] = useState<TemplateMsg | null>(null);
  const [secaoAberta, setSecaoAberta] = useState<"acoes" | "templates" | "historico">("acoes");
  const [enviandoLote, setEnviandoLote] = useState<string | null>(null);

  // Próxima consulta agendada
  const proximaConsulta = useMemo(() => {
    const agora = new Date();
    return consultas
      .filter((c: any) => new Date(c.dataHoraInicio) > agora && (c.estado === "agendada" || c.estado === "confirmada"))
      .sort((a: any, b: any) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())[0] || null;
  }, [consultas]);

  // Última consulta realizada
  const ultimaConsulta = useMemo(() => {
    return consultas
      .filter((c: any) => c.estado === "realizada")
      .sort((a: any, b: any) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0] || null;
  }, [consultas]);

  // Estatísticas de comunicação
  const stats = useMemo(() => {
    const total = consultas.length;
    const confirmadas = consultas.filter((c: any) => c.estado === "confirmada").length;
    const canceladas = consultas.filter((c: any) => c.estado === "cancelada").length;
    const noShow = consultas.filter((c: any) => c.estado === "no-show").length;
    return { total, confirmadas, canceladas, noShow };
  }, [consultas]);

  const temTelemovel = !!utente.telemovel;
  const temEmail = !!utente.email;

  // Quick actions com endpoints específicos
  const enviarLembreteMutation = trpc.whatsapp.enviarLembrete.useMutation({
    onSuccess: () => { setEnviandoLote(null); onRefresh(); },
    onError: () => { setEnviandoLote(null); },
  });

  const handleQuickLembrete = () => {
    if (!proximaConsulta || !temTelemovel) return;
    setEnviandoLote("lembrete");
    const data = new Date(proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT");
    const hora = new Date(proximaConsulta.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    enviarLembreteMutation.mutate({
      consultaId: proximaConsulta.id,
      utenteName: utente.nome,
      consultaTime: hora,
      utenteTelefone: utente.telemovel,
      medicoNome: proximaConsulta.medicoNome || "—",
      tipoConsulta: proximaConsulta.tipoConsulta || "Consulta",
      consultaData: data,
    });
  };

  const enviarConfirmacaoMutation = trpc.whatsapp.enviarConfirmacao.useMutation({
    onSuccess: () => { setEnviandoLote(null); onRefresh(); },
    onError: () => { setEnviandoLote(null); },
  });

  const handleQuickConfirmacao = () => {
    if (!proximaConsulta || !temTelemovel) return;
    setEnviandoLote("confirmacao");
    const data = new Date(proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT");
    const hora = new Date(proximaConsulta.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
    enviarConfirmacaoMutation.mutate({
      consultaId: proximaConsulta.id,
      utenteName: utente.nome,
      data,
      hora,
      medicoNome: proximaConsulta.medicoNome || "—",
      utenteTelefone: utente.telemovel,
      tipoConsulta: proximaConsulta.tipoConsulta || "Consulta",
    });
  };

  return (
    <div className="space-y-6">
      {/* ── Alerta: Sem telemóvel ── */}
      {!temTelemovel && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <p className="text-amber-400 text-sm font-bold">Telemóvel não registado</p>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">Para enviar mensagens WhatsApp ou SMS, é necessário registar o telemóvel do utente.</p>
          </div>
        </div>
      )}

      {/* ── Header com info do utente e stats ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">WhatsApp</span>
          </div>
          <p className={`text-lg font-black ${temTelemovel ? "text-emerald-400" : "text-[var(--text-muted)]"}`}>
            {temTelemovel ? "Ativo" : "Inativo"}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{utente.telemovel || "Sem telemóvel"}</p>
        </div>

        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-[#00E5FF]" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Próxima</span>
          </div>
          <p className="text-lg font-black text-[var(--text-primary)]">
            {proximaConsulta ? new Date(proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT", { day: "2-digit", month: "short" }) : "—"}
          </p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">
            {proximaConsulta ? `${new Date(proximaConsulta.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })} — ${proximaConsulta.estado}` : "Sem consultas agendadas"}
          </p>
        </div>

        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <CheckCircle className="w-4 h-4 text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Confirmadas</span>
          </div>
          <p className="text-lg font-black text-emerald-400">{stats.confirmadas}</p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">de {stats.total} consultas</p>
        </div>

        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-400" />
            </div>
            <span className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">No-Show</span>
          </div>
          <p className="text-lg font-black text-red-400">{stats.noShow}</p>
          <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{stats.canceladas} canceladas</p>
        </div>
      </div>

      {/* ── Ações Rápidas (1 clique) ── */}
      <div className="card-premium border border-[var(--border-primary)] overflow-hidden">
        <button
          onClick={() => setSecaoAberta(secaoAberta === "acoes" ? "acoes" : "acoes")}
          className="flex items-center justify-between w-full p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center">
              <Zap className="w-4.5 h-4.5 text-[#00E5FF]" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Ações Rápidas</h3>
              <p className="text-[var(--text-muted)] text-[10px]">Envio com 1 clique — usa templates com botões interativos</p>
            </div>
          </div>
        </button>
        <div className="px-5 pb-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <QuickAction
              icon={Bell}
              label="Enviar Lembrete"
              sublabel={proximaConsulta ? `Consulta: ${new Date(proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT")}` : "Sem consulta agendada"}
              onClick={handleQuickLembrete}
              cor="text-amber-400"
              corBg="bg-amber-500/10"
              corBorder="border-amber-500/20"
              loading={enviandoLote === "lembrete"}
              disabled={!proximaConsulta || !temTelemovel}
            />
            <QuickAction
              icon={CheckCircle}
              label="Pedir Confirmação"
              sublabel={proximaConsulta ? `Com botões Confirmar/Cancelar/Remarcar` : "Sem consulta agendada"}
              onClick={handleQuickConfirmacao}
              cor="text-emerald-400"
              corBg="bg-emerald-500/10"
              corBorder="border-emerald-500/20"
              loading={enviandoLote === "confirmacao"}
              disabled={!proximaConsulta || !temTelemovel}
            />
            <QuickAction
              icon={Heart}
              label="Follow-up Pós-Consulta"
              sublabel={ultimaConsulta ? `Última: ${new Date(ultimaConsulta.dataHoraInicio).toLocaleDateString("pt-PT")}` : "Sem consultas realizadas"}
              onClick={() => setTemplateSelecionado(TEMPLATES.find(t => t.id === "followup_pos")!)}
              cor="text-pink-400"
              corBg="bg-pink-500/10"
              corBorder="border-pink-500/20"
              disabled={!ultimaConsulta || !temTelemovel}
            />
            <QuickAction
              icon={Star}
              label="Pedir Avaliação"
              sublabel="Enviar pedido de feedback com botões de rating"
              onClick={() => setTemplateSelecionado(TEMPLATES.find(t => t.id === "pedido_avaliacao")!)}
              cor="text-yellow-400"
              corBg="bg-yellow-500/10"
              corBorder="border-yellow-500/20"
              disabled={!ultimaConsulta || !temTelemovel}
            />
            <QuickAction
              icon={Gift}
              label="Felicitar Aniversário"
              sublabel={utente.dataNascimento ? `Nasc: ${new Date(utente.dataNascimento).toLocaleDateString("pt-PT")}` : "Data de nascimento não registada"}
              onClick={() => setTemplateSelecionado(TEMPLATES.find(t => t.id === "aniversario")!)}
              cor="text-violet-400"
              corBg="bg-violet-500/10"
              corBorder="border-violet-500/20"
              disabled={!temTelemovel}
            />
            <QuickAction
              icon={MessageCircle}
              label="Mensagem Personalizada"
              sublabel="Escrever e enviar mensagem livre"
              onClick={() => setTemplateSelecionado(TEMPLATES.find(t => t.id === "mensagem_livre")!)}
              cor="text-cyan-400"
              corBg="bg-cyan-500/10"
              corBorder="border-cyan-500/20"
              disabled={!temTelemovel}
            />
          </div>
        </div>
      </div>

      {/* ── Templates de Mensagem ── */}
      <div className="card-premium border border-[var(--border-primary)] overflow-hidden">
        <button
          onClick={() => setSecaoAberta(secaoAberta === "templates" ? "acoes" : "templates")}
          className="flex items-center justify-between w-full p-5 text-left"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
              <FileText className="w-4.5 h-4.5 text-violet-400" />
            </div>
            <div>
              <h3 className="text-[var(--text-primary)] font-bold text-sm">Templates de Mensagem</h3>
              <p className="text-[var(--text-muted)] text-[10px]">{TEMPLATES.length} templates disponíveis — personalizar antes de enviar</p>
            </div>
          </div>
          {secaoAberta === "templates" ? <ChevronUp className="w-4 h-4 text-[var(--text-muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--text-muted)]" />}
        </button>
        {secaoAberta === "templates" && (
          <div className="px-5 pb-5 space-y-2">
            {TEMPLATES.filter(t => t.id !== "mensagem_livre").map(template => {
              const Icon = template.icon;
              return (
                <button
                  key={template.id}
                  onClick={() => setTemplateSelecionado(template)}
                  disabled={!temTelemovel}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border ${template.corBorder} ${template.corBg} hover:brightness-110 transition-all text-left group ${!temTelemovel ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <div className={`w-9 h-9 rounded-lg ${template.corBg} border ${template.corBorder} flex items-center justify-center shrink-0`}>
                    <Icon className={`w-4 h-4 ${template.cor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-bold ${template.cor}`}>{template.nome}</p>
                    <p className="text-[var(--text-muted)] text-[10px] mt-0.5 line-clamp-1">{template.mensagem.substring(0, 80)}...</p>
                  </div>
                  <Send className={`w-4 h-4 ${template.cor} opacity-0 group-hover:opacity-100 transition-opacity shrink-0`} />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Histórico de Comunicações (V34) ── */}
      <HistoricoComunicacoes utenteId={utente.id} />

      {/* ── Contacto Direto ── */}
      <div className="card-premium border border-[var(--border-primary)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Phone className="w-4.5 h-4.5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Contacto Direto</h3>
            <p className="text-[var(--text-muted)] text-[10px]">Abrir conversa direta no WhatsApp ou ligar</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <a
            href={temTelemovel ? `https://wa.me/${(() => { let t = (utente.telemovel || "").replace(/[\s\-\(\)]/g, ""); if (!t.startsWith("+") && !t.startsWith("00") && t.length === 9) t = "351" + t; else if (t.startsWith("+")) t = t.slice(1); return t; })()}` : "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
              temTelemovel
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] cursor-not-allowed"
            }`}
          >
            <MessageCircle className="w-4 h-4" />
            WhatsApp Direto
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
          <a
            href={temTelemovel ? `tel:${utente.telemovel}` : "#"}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
              temTelemovel
                ? "bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500/20"
                : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] cursor-not-allowed"
            }`}
          >
            <Phone className="w-4 h-4" />
            Ligar
          </a>
          <a
            href={temEmail ? `mailto:${utente.email}` : "#"}
            className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-bold transition-all ${
              temEmail
                ? "bg-violet-500/10 border-violet-500/20 text-violet-400 hover:bg-violet-500/20"
                : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)] cursor-not-allowed"
            }`}
          >
            <Mail className="w-4 h-4" />
            Email
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* ── Modal de envio ── */}
      {templateSelecionado && (
        <ModalEnviarMensagem
          utente={utente}
          template={templateSelecionado}
          consulta={templateSelecionado.categoria === "followup" || templateSelecionado.categoria === "avaliacao" ? ultimaConsulta : proximaConsulta}
          onClose={() => setTemplateSelecionado(null)}
          onSuccess={() => { setTemplateSelecionado(null); onRefresh(); }}
        />
      )}
    </div>
  );
}
