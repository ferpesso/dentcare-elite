/**
 * MarketingPage.tsx — WhatsApp Marketing Avançado
 * DentCare Elite V35 — Mensagens Interativas + Automações
 *
 * UPGRADE:
 * - Campanhas com botões interativos (CTA)
 * - Tab de Automações (follow-up, aniversários, reativação, avaliações)
 * - FIX: Estatísticas por tipo agora vêm da BD (antes hardcoded)
 * - FIX: Modal de campanha agora chama a API real (antes simulava)
 * - Novos templates: Follow-up com feedback, Avaliação, Aniversário com CTA
 */
import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { useLocation } from "wouter";
import {
  MessageCircle, Send, Check, Users, TrendingUp, Clock,
  Zap, AlertCircle, Search,
  BarChart2, Calendar, Star, Target,
  Bell, UserCheck, Gift, X, Play,
  CheckCircle2, Info, Sparkles, Phone,
  Bot, Heart, RefreshCw, ThumbsUp, Settings2,
  MousePointerClick, ListChecks, ExternalLink,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoMensagem = "reminder" | "confirmation" | "reactivation" | "promotion" | "birthday" | "followup";

interface Template {
  id: TipoMensagem;
  label: string;
  descricao: string;
  icone: React.ComponentType<any>;
  cor: string;
  bg: string;
  border: string;
  mensagem: string;
  variaveis: string[];
  interativa: boolean;
  botoes?: { id: string; title: string }[];
}

// ─── Templates de Mensagens (UPGRADE: com botões interativos) ────────────────
const TEMPLATES: Template[] = [
  {
    id: "reminder",
    label: "Lembrete de Consulta",
    descricao: "Enviado 24h antes — com botões de confirmação",
    icone: Bell,
    cor: "text-[#00E5FF]",
    bg: "bg-[#00E5FF]/10",
    border: "border-[#00E5FF]/20",
    mensagem: "Olá {nome}! 👋\n\nLembrete: Tem uma consulta marcada para *amanhã* às {hora} com o Dr(a). {medico}.\n\nPor favor, confirme a sua presença:",
    variaveis: ["{nome}", "{hora}", "{medico}"],
    interativa: true,
    botoes: [
      { id: "confirm", title: "✅ Confirmo" },
      { id: "cancel", title: "❌ Não posso" },
      { id: "reschedule", title: "🔄 Remarcar" },
    ],
  },
  {
    id: "confirmation",
    label: "Confirmação de Marcação",
    descricao: "Após agendar — com opções de gestão",
    icone: CheckCircle2,
    cor: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    mensagem: "Olá {nome}! ✅\n\nA sua consulta foi confirmada!\n\n📅 Data: *{data}*\n⏰ Hora: *{hora}*\n👨‍⚕️ Médico: *Dr(a). {medico}*\n\nAguardamos a sua visita! 🦷",
    variaveis: ["{nome}", "{data}", "{hora}", "{medico}"],
    interativa: true,
    botoes: [
      { id: "ok", title: "👍 Obrigado!" },
      { id: "reschedule", title: "🔄 Remarcar" },
      { id: "cancel", title: "❌ Cancelar" },
    ],
  },
  {
    id: "reactivation",
    label: "Reativação de Utente",
    descricao: "Para inativos +6 meses — com CTA de marcação",
    icone: UserCheck,
    cor: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    mensagem: "Olá {nome}! 😊\n\nSentimos a sua falta! Há algum tempo que não nos visita.\n\nA saúde oral é muito importante! 🦷\n\nQuer agendar uma consulta?",
    variaveis: ["{nome}"],
    interativa: true,
    botoes: [
      { id: "reactivate_yes", title: "✅ Sim, agendar!" },
      { id: "reactivate_later", title: "⏰ Mais tarde" },
      { id: "reactivate_no", title: "❌ Não, obrigado" },
    ],
  },
  {
    id: "promotion",
    label: "Promoção Especial",
    descricao: "Campanhas e ofertas com CTA",
    icone: Gift,
    cor: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    mensagem: "Olá {nome}! 🎉\n\n*Oferta especial este mês!*\n\n✨ {descricao_promocao}\n\n⏰ Válido até {data_fim}\n\nNão perca esta oportunidade!",
    variaveis: ["{nome}", "{descricao_promocao}", "{data_fim}"],
    interativa: true,
    botoes: [
      { id: "promo_book", title: "📅 Agendar" },
      { id: "promo_info", title: "ℹ️ Saber mais" },
    ],
  },
  {
    id: "birthday",
    label: "Feliz Aniversário",
    descricao: "Automático no aniversário — com desconto e CTA",
    icone: Star,
    cor: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    mensagem: "Olá {nome}! 🎂🎉\n\nA equipa deseja-lhe um *Feliz Aniversário*!\n\nComo presente, oferecemos *10% de desconto* na próxima consulta.\n\nCuide do seu sorriso! 😁❤️",
    variaveis: ["{nome}"],
    interativa: true,
    botoes: [
      { id: "birthday_book", title: "📅 Agendar consulta" },
      { id: "birthday_thanks", title: "🙏 Obrigado!" },
    ],
  },
  {
    id: "followup",
    label: "Follow-up Pós-Consulta",
    descricao: "2 dias após — com botões de feedback",
    icone: Target,
    cor: "text-cyan-400",
    bg: "bg-cyan-500/10",
    border: "border-cyan-500/20",
    mensagem: "Olá {nome}! 👋\n\nEsperamos que esteja a recuperar bem após a consulta de *{tipo_consulta}* com o Dr(a). *{medico}*.\n\nComo se está a sentir?",
    variaveis: ["{nome}", "{tipo_consulta}", "{medico}"],
    interativa: true,
    botoes: [
      { id: "followup_good", title: "😊 Estou bem!" },
      { id: "followup_doubt", title: "🤔 Tenho dúvidas" },
      { id: "followup_bad", title: "😟 Preciso ajuda" },
    ],
  },
];

// ─── Componente: Card de Estatística ─────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color, border, bg }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<any>; color: string; border: string; bg: string;
}) {
  return (
    <div className={`card-premium p-5 border ${border}`}>
      <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center mb-3`}>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className="section-label mb-1">{label}</p>
      <p className={`metric-value ${color}`}>{value}</p>
      {sub && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{sub}</p>}
    </div>
  );
}

// ─── Componente: Badge de Estado ─────────────────────────────────────────────
function EstadoBadge({ estado }: { estado: string }) {
  const cfg: Record<string, { label: string; cls: string }> = {
    enviada:      { label: "Enviada",       cls: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30" },
    entregue:     { label: "Entregue",      cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    lida:         { label: "Lida",          cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    falhou:       { label: "Falhou",        cls: "bg-red-500/20 text-red-300 border-red-500/30" },
    rascunho:     { label: "Rascunho",      cls: "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-light)]" },
    agendada:     { label: "Agendada",      cls: "bg-amber-500/20 text-amber-300 border-amber-500/30" },
    em_progresso: { label: "Em Progresso",  cls: "bg-blue-500/20 text-blue-300 border-blue-500/30" },
    concluida:    { label: "Concluída",     cls: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" },
    cancelada:    { label: "Cancelada",     cls: "bg-red-500/20 text-red-300 border-red-500/30" },
  };
  const c = cfg[estado] || { label: estado, cls: "bg-[var(--bg-surface)] text-[var(--text-muted)] border-[var(--border-light)]" };
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${c.cls}`}>
      {c.label}
    </span>
  );
}

// ─── Componente: Badge Interativa ────────────────────────────────────────────
function InteractiveBadge() {
  return (
    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-300 border border-violet-500/30 flex items-center gap-1">
      <MousePointerClick className="w-2.5 h-2.5" />
      Interativa
    </span>
  );
}

// ─── Componente: Preview de Botões ───────────────────────────────────────────
function BotoesPreview({ botoes }: { botoes: { id: string; title: string }[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-2">
      {botoes.map(btn => (
        <span key={btn.id} className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
          {btn.title}
        </span>
      ))}
    </div>
  );
}

// ─── Componente: Modal de Campanha em Massa (FIX: agora chama API real) ──────
function ModalCampanha({
  template,
  utentes,
  onClose,
  onEnviar,
}: {
  template: Template;
  utentes: any[];
  onClose: () => void;
  onEnviar: (ids: number[], mensagem: string, interativa: boolean) => void;
}) {
  const [, navigate] = useLocation();
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [mensagem, setMensagem] = useState(template.mensagem);
  const [pesquisa, setPesquisa] = useState("");
  const [confirmar, setConfirmar] = useState(false);
  const [usarBotoes, setUsarBotoes] = useState(template.interativa);

  const filtrados = useMemo(() =>
    utentes.filter((u: any) => u.nome.toLowerCase().includes(pesquisa.toLowerCase()) && u.telemovel),
    [utentes, pesquisa]
  );

  const toggleTodos = () => {
    if (selecionados.size === filtrados.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtrados.map((u: any) => u.id)));
    }
  };

  const toggle = (id: number) => {
    const next = new Set(selecionados);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelecionados(next);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)]">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${template.bg} border ${template.border} flex items-center justify-center`}>
              <template.icone className={`w-4 h-4 ${template.cor}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-[var(--text-primary)] font-semibold text-sm">Campanha: {template.label}</h2>
                {template.interativa && <InteractiveBadge />}
              </div>
              <p className="text-[var(--text-tertiary)] text-xs">{template.descricao}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-[var(--bg-elevated)]">
          {/* Toggle Interativa */}
          {template.interativa && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-200">
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-violet-500" />
                <div>
                  <p className="text-violet-700 text-xs font-semibold">Mensagem Interativa</p>
                  <p className="text-violet-500 text-[10px]">Inclui botões de resposta rápida</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" checked={usarBotoes} onChange={e => setUsarBotoes(e.target.checked)} className="sr-only peer" />
                <div className="w-9 h-5 bg-[var(--bg-subtle)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--border-light)] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-violet-500"></div>
              </label>
            </div>
          )}

          {/* Preview de Botões */}
          {usarBotoes && template.botoes && (
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-light)]">
              <p className="text-[var(--text-secondary)] text-[10px] font-semibold mb-1.5">BOTÕES DE RESPOSTA RÁPIDA</p>
              <div className="flex flex-wrap gap-1.5">
                {template.botoes.map(btn => (
                  <span key={btn.id} className="text-xs px-3 py-1.5 rounded-lg bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] font-medium shadow-sm">
                    {btn.title}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Mensagem */}
          <div>
            <label className="text-[var(--text-primary)] font-semibold text-sm block mb-1.5">Mensagem da Campanha</label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              rows={5}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none font-mono"
            />
            {template.variaveis.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                <span className="text-[var(--text-muted)] text-[10px]">Variáveis:</span>
                {template.variaveis.map(v => (
                  <button key={v} onClick={() => setMensagem(m => m + v)}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-[#00E5FF]/5 border border-[#00E5FF]/20 text-[#00E5FF] hover:bg-[#00E5FF]/10 transition-colors font-mono">
                    {v}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Seleção de Utentes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[var(--text-primary)] font-semibold text-sm">Destinatários ({selecionados.size} selecionados)</label>
              <button onClick={toggleTodos} className="text-xs text-[#00E5FF] hover:text-[#00E5FF] transition-colors">
                {selecionados.size === filtrados.length ? "Desselecionar todos" : "Selecionar todos"}
              </button>
            </div>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Pesquisar utente..."
                value={pesquisa}
                onChange={e => setPesquisa(e.target.value)}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
              />
            </div>
            <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
              {filtrados.length === 0 ? (
                <p className="text-[var(--text-muted)] text-xs text-center py-4">Nenhum utente com telemóvel registado</p>
              ) : filtrados.map((u: any) => (
                <label key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-[var(--bg-surface)] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={selecionados.has(u.id)}
                    onChange={() => toggle(u.id)}
                    className="w-4 h-4 rounded border-[var(--border-light)] accent-[#00E5FF]"
                  />
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00E5FF]/10 to-[#B388FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#00E5FF] text-[10px] font-bold">{u.nome?.charAt(0)?.toUpperCase()}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-xs font-medium truncate">{u.nome}</p>
                    <p className="text-[var(--text-muted)] text-[10px] flex items-center gap-1">
                      <Phone className="w-2.5 h-2.5" />{u.telemovel}
                    </p>
                  </div>
                  {/* V35.5 — Botão Ver Ficha */}
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClose(); navigate(`/utentes?utenteId=${u.id}`); }}
                    title="Ver ficha do utente"
                    className="shrink-0 p-1 rounded-lg hover:bg-[#00E5FF]/10 text-[var(--text-muted)] hover:text-[#00E5FF] transition-colors"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </label>
              ))}
            </div>
          </div>

          {/* Aviso */}
          {selecionados.size > 0 && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-200">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-amber-700 text-xs">
                Serão enviadas <strong>{selecionados.size}</strong> mensagens{usarBotoes ? " interativas" : ""} via WhatsApp.
                Certifique-se de que o serviço Twilio está configurado.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[var(--border-lightest)] flex items-center gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors">
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!confirmar) { setConfirmar(true); return; }
              onEnviar(Array.from(selecionados), mensagem, usarBotoes);
              onClose();
            }}
            disabled={selecionados.size === 0}
            className={`flex-1 py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed
              ${confirmar ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "btn-primary"}`}
          >
            {confirmar
              ? <><Check className="w-4 h-4" />Confirmar Envio</>
              : <><Send className="w-4 h-4" />Enviar para {selecionados.size} utente{selecionados.size !== 1 ? "s" : ""}</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente: Card de Automação ───────────────────────────────────────────
function AutomacaoCard({
  titulo,
  descricao,
  icone: Icon,
  cor,
  bg,
  border,
  onExecutar,
  isLoading,
  resultado,
  children,
}: {
  titulo: string;
  descricao: string;
  icone: React.ComponentType<any>;
  cor: string;
  bg: string;
  border: string;
  onExecutar: () => void;
  isLoading: boolean;
  resultado?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`card-premium p-5 border ${border}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl ${bg} border ${border} flex items-center justify-center`}>
            <Icon className={`w-4 h-4 ${cor}`} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className={`text-sm font-semibold ${cor}`}>{titulo}</p>
              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-violet-500/10 border border-violet-500/20 text-violet-300 flex items-center gap-0.5">
                <Bot className="w-2.5 h-2.5" />Auto
              </span>
            </div>
            <p className="text-[var(--text-muted)] text-[10px]">{descricao}</p>
          </div>
        </div>
      </div>

      {children && <div className="mb-3">{children}</div>}

      {resultado && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <p className="text-emerald-300 text-[10px]">{resultado}</p>
        </div>
      )}

      <button
        onClick={onExecutar}
        disabled={isLoading}
        className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${bg} ${cor} border ${border} hover:opacity-80 transition-opacity disabled:opacity-40`}
      >
        {isLoading ? (
          <div className="w-3.5 h-3.5 border-2 border-current/30 border-t-current rounded-full animate-spin" />
        ) : (
          <Play className="w-3 h-3" />
        )}
        {isLoading ? "A processar..." : "Executar Agora"}
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════
export function MarketingPage() {
  const [tab, setTab] = useState<"enviar" | "campanhas" | "automacoes" | "historico" | "estatisticas">("enviar");
  const [form, setForm] = useState({ telefone: "", mensagem: "", tipo: "reminder" as TipoMensagem });
  const [templateActivo, setTemplateActivo] = useState<TipoMensagem>("reminder");
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [modalCampanha, setModalCampanha] = useState<Template | null>(null);
  const [pesquisaHistorico, setPesquisaHistorico] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<string>("todos");

  // Automações state
  const [reativacaoMeses, setReativacaoMeses] = useState(6);
  const [followupDias, setFollowupDias] = useState(2);
  const [avaliacaoDias, setAvaliacaoDias] = useState(5);
  const [resultadoReativacao, setResultadoReativacao] = useState("");
  const [resultadoFollowup, setResultadoFollowup] = useState("");
  const [resultadoAvaliacao, setResultadoAvaliacao] = useState("");
  const [resultadoAniversario, setResultadoAniversario] = useState("");

  // Queries
  const utentesQuery = trpc.utentes.list.useQuery();
  const utentes = (utentesQuery.data as any)?.utentes ?? [];
  const estatisticasQuery = trpc.marketing.obterEstatisticas.useQuery();
  const stats = (estatisticasQuery.data as any)?.estatisticas || {
    totalCampanhas: 0, enviadas: 0, entregues: 0, lidas: 0, respostas: 0,
    taxaEntrega: 0, taxaLeitura: 0, taxaResposta: 0,
  };
  const campanhasQuery = trpc.marketing.listarCampanhas.useQuery();
  const campanhas = (campanhasQuery.data as any)?.campanhas || [];

  // FIX: Estatísticas por tipo — agora vêm da BD
  const statsPorTipoQuery = trpc.marketing.obterEstatisticasPorTipo.useQuery();
  const statsPorTipo = (statsPorTipoQuery.data as any)?.estatisticasPorTipo || [];

  // Mutations
  const enviarMutation = trpc.whatsapp.enviarMensagem.useMutation({
    onSuccess: () => {
      setEnviado(true);
      setForm(f => ({ ...f, mensagem: "" }));
      setTimeout(() => setEnviado(false), 3000);
    },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  // FIX: Campanha agora chama a API real
  const criarCampanhaMutation = trpc.marketing.criarCampanha.useMutation();
  const executarCampanhaMutation = trpc.marketing.executarCampanha.useMutation({
    onSuccess: () => {
      campanhasQuery.refetch();
      estatisticasQuery.refetch();
      statsPorTipoQuery.refetch();
    },
  });

  // Automações mutations
  const reativacaoMutation = trpc.marketing.executarReativacaoAutomatica.useMutation({
    onSuccess: (data) => {
      setResultadoReativacao(`${data.enviadas} mensagens enviadas de ${data.totalAnalisados} utentes analisados.`);
      campanhasQuery.refetch();
    },
  });
  const followupMutation = trpc.marketing.executarFollowupAutomatico.useMutation({
    onSuccess: (data) => {
      setResultadoFollowup(`${data.enviadas} follow-ups enviados de ${data.totalConsultas} consultas.`);
    },
  });
  const avaliacaoMutation = trpc.marketing.executarAvaliacoesAutomaticas.useMutation({
    onSuccess: (data) => {
      setResultadoAvaliacao(`${data.enviadas} pedidos de avaliação enviados.`);
    },
  });
  const aniversarioMutation = trpc.marketing.executarAniversariosHoje.useMutation({
    onSuccess: (data) => {
      setResultadoAniversario(`${data.enviadas} felicitações enviadas de ${data.totalAniversariantes} aniversariantes.`);
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.telefone || !form.mensagem) { setErro("Telefone e mensagem são obrigatórios"); return; }
    setErro("");
    enviarMutation.mutate({ telefone: form.telefone, mensagem: form.mensagem, tipo: form.tipo as any });
  };

  const aplicarTemplate = (t: Template) => {
    setTemplateActivo(t.id);
    setForm(f => ({ ...f, tipo: t.id, mensagem: t.mensagem }));
  };

  // FIX: Handler real de envio de campanha
  const handleEnviarCampanha = async (ids: number[], mensagem: string, interativa: boolean) => {
    if (!modalCampanha) return;
    try {
      // 1. Criar campanha na BD
      const result = await criarCampanhaMutation.mutateAsync({
        nome: `Campanha ${modalCampanha.label} — ${new Date().toLocaleDateString("pt-PT")}`,
        descricao: modalCampanha.descricao,
        tipoTemplate: modalCampanha.id,
        mensagem,
        utentesIds: ids,
        interativa,
        botoes: interativa ? modalCampanha.botoes : undefined,
      });

      // 2. Executar campanha
      await executarCampanhaMutation.mutateAsync({
        campanhaId: result.campanhaId,
        utentesIds: ids,
        interativa,
        botoes: interativa ? modalCampanha.botoes : undefined,
      });
    } catch (e: any) {
      setErro(parseApiError(e, "Erro ao executar campanha"));
    }
  };

  const historicoFiltrado = useMemo(() => {
    return campanhas.filter((c: any) => {
      const matchPesquisa = c.nome?.toLowerCase().includes(pesquisaHistorico.toLowerCase());
      const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado;
      return matchPesquisa && matchEstado;
    });
  }, [campanhas, pesquisaHistorico, filtroEstado]);

  const TABS = [
    { id: "enviar",       label: "Enviar",       icon: Send },
    { id: "campanhas",    label: "Campanhas",    icon: Zap },
    { id: "automacoes",   label: "Automações",   icon: Bot },
    { id: "historico",    label: "Histórico",    icon: Clock },
    { id: "estatisticas", label: "Estatísticas", icon: BarChart2 },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">WhatsApp Marketing</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            Comunicação automatizada com botões interativos e chatbot inteligente
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <MousePointerClick className="w-3 h-3 text-violet-400" />
            <span className="text-violet-300 text-xs font-medium">Botões Interativos</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-medium">Serviço Ativo</span>
          </div>
        </div>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Enviadas (total)" value={stats.enviadas} sub={`${stats.totalCampanhas} campanhas`} icon={Send} color="text-[#00E5FF]" border="border-[#00E5FF]/20" bg="bg-[#00E5FF]/10" />
        <StatCard label="Taxa de Entrega" value={`${stats.taxaEntrega}%`} sub={`${stats.entregues} entregues`} icon={CheckCircle2} color="text-emerald-400" border="border-emerald-500/20" bg="bg-emerald-500/10" />
        <StatCard label="Taxa de Leitura" value={`${stats.taxaLeitura}%`} sub={`${stats.lidas} lidas`} icon={TrendingUp} color="text-violet-400" border="border-violet-500/20" bg="bg-violet-500/10" />
        <StatCard label="Taxa de Resposta" value={`${stats.taxaResposta}%`} sub={`${stats.respostas} respostas`} icon={MessageCircle} color="text-amber-400" border="border-amber-500/20" bg="bg-amber-500/10" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === id
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Enviar Mensagem ── */}
      {tab === "enviar" && (
        <div className="space-y-4">
          <div>
            <p className="section-label mb-2">Selecionar Template</p>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => aplicarTemplate(t)}
                  className={`p-3.5 rounded-xl border text-left transition-all ${
                    templateActivo === t.id
                      ? `${t.border} ${t.bg}`
                      : "border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:bg-[var(--bg-overlay)]"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <t.icone className={`w-3.5 h-3.5 ${t.cor}`} />
                    <p className={`text-xs font-semibold ${templateActivo === t.id ? t.cor : "text-[var(--text-primary)]"}`}>
                      {t.label}
                    </p>
                  </div>
                  <p className="text-[var(--text-muted)] text-[10px] leading-relaxed">{t.descricao}</p>
                  {t.interativa && t.botoes && (
                    <BotoesPreview botoes={t.botoes} />
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="card-premium p-6">
            <div className="flex items-center gap-2 mb-5">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Enviar Mensagem Individual</h2>
            </div>
            {enviado && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Check className="w-4 h-4 text-emerald-400" />
                <p className="text-emerald-300 text-sm">Mensagem adicionada à fila de envio!</p>
              </div>
            )}
            {erro && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                <p className="text-red-400 text-xs">{erro}</p>
              </div>
            )}
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="section-label block mb-1.5">Destinatário</label>
                <select
                  value={form.telefone}
                  onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50"
                >
                  <option value="">— Selecionar utente —</option>
                  {utentes.filter((u: any) => u.telemovel).map((u: any) => (
                    <option key={u.id} value={u.telemovel}>{u.nome} ({u.telemovel})</option>
                  ))}
                </select>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="section-label">Mensagem</label>
                  <span className="text-[var(--text-muted)] text-[10px]">{form.mensagem.length} caracteres</span>
                </div>
                <textarea
                  value={form.mensagem}
                  onChange={e => setForm(f => ({ ...f, mensagem: e.target.value }))}
                  rows={5}
                  placeholder="Escreva a sua mensagem..."
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={enviarMutation.isPending}
                className="btn-primary w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
              >
                {enviarMutation.isPending
                  ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : <Send className="w-4 h-4" />
                }
                Enviar via WhatsApp
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── Tab: Campanhas ── */}
      {tab === "campanhas" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
            <MousePointerClick className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
            <p className="text-violet-300 text-xs">
              As campanhas agora suportam <strong>botões interativos</strong>. Os utentes podem confirmar, cancelar ou remarcar consultas com um toque.
              Selecione um tipo de campanha, ative os botões e escolha os destinatários.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {TEMPLATES.map(t => (
              <div key={t.id} className={`card-premium p-5 border ${t.border}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl ${t.bg} border ${t.border} flex items-center justify-center`}>
                      <t.icone className={`w-4 h-4 ${t.cor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className={`text-sm font-semibold ${t.cor}`}>{t.label}</p>
                        {t.interativa && <InteractiveBadge />}
                      </div>
                      <p className="text-[var(--text-muted)] text-[10px]">{t.descricao}</p>
                    </div>
                  </div>
                </div>
                <p className="text-[var(--text-secondary)] text-xs leading-relaxed line-clamp-2 mb-2 font-mono bg-[var(--bg-surface)] rounded-lg p-2 border border-[var(--border-lightest)]">
                  {t.mensagem.split("\n")[0]}...
                </p>
                {t.interativa && t.botoes && (
                  <BotoesPreview botoes={t.botoes} />
                )}
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    {utentes.filter((u: any) => u.telemovel).length} disponíveis
                  </span>
                  <button
                    onClick={() => setModalCampanha(t)}
                    className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ${t.bg} ${t.cor} border ${t.border} hover:opacity-80 transition-opacity`}
                  >
                    <Play className="w-3 h-3" />
                    Lançar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Tab: Automações ── */}
      {tab === "automacoes" && (
        <div className="space-y-4">
          <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Bot className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-emerald-300 text-xs">
              As automações enviam mensagens <strong>interativas</strong> automaticamente com base em regras.
              Cada automação analisa a base de dados e envia mensagens personalizadas com botões de ação.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Reativação Automática */}
            <AutomacaoCard
              titulo="Reativação de Inativos"
              descricao="Envia mensagem com CTA para utentes sem consulta há meses"
              icone={UserCheck}
              cor="text-violet-400"
              bg="bg-violet-500/10"
              border="border-violet-500/20"
              onExecutar={() => reativacaoMutation.mutate({ mesesInatividade: reativacaoMeses })}
              isLoading={reativacaoMutation.isPending}
              resultado={resultadoReativacao}
            >
              <div className="flex items-center gap-2">
                <label className="text-[var(--text-muted)] text-[10px]">Inativos há:</label>
                <select
                  value={reativacaoMeses}
                  onChange={e => setReativacaoMeses(Number(e.target.value))}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  <option value={3}>3+ meses</option>
                  <option value={6}>6+ meses</option>
                  <option value={9}>9+ meses</option>
                  <option value={12}>12+ meses</option>
                </select>
              </div>
            </AutomacaoCard>

            {/* Follow-up Pós-Consulta */}
            <AutomacaoCard
              titulo="Follow-up Pós-Consulta"
              descricao="Pergunta como o utente se sente após a consulta"
              icone={Heart}
              cor="text-cyan-400"
              bg="bg-cyan-500/10"
              border="border-cyan-500/20"
              onExecutar={() => followupMutation.mutate({ diasAposConsulta: followupDias })}
              isLoading={followupMutation.isPending}
              resultado={resultadoFollowup}
            >
              <div className="flex items-center gap-2">
                <label className="text-[var(--text-muted)] text-[10px]">Dias após consulta:</label>
                <select
                  value={followupDias}
                  onChange={e => setFollowupDias(Number(e.target.value))}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  <option value={1}>1 dia</option>
                  <option value={2}>2 dias</option>
                  <option value={3}>3 dias</option>
                </select>
              </div>
            </AutomacaoCard>

            {/* Pedido de Avaliação */}
            <AutomacaoCard
              titulo="Pedido de Avaliação"
              descricao="Pede avaliação com estrelas após a consulta"
              icone={ThumbsUp}
              cor="text-amber-400"
              bg="bg-amber-500/10"
              border="border-amber-500/20"
              onExecutar={() => avaliacaoMutation.mutate({ diasAposConsulta: avaliacaoDias })}
              isLoading={avaliacaoMutation.isPending}
              resultado={resultadoAvaliacao}
            >
              <div className="flex items-center gap-2">
                <label className="text-[var(--text-muted)] text-[10px]">Dias após consulta:</label>
                <select
                  value={avaliacaoDias}
                  onChange={e => setAvaliacaoDias(Number(e.target.value))}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)]"
                >
                  <option value={3}>3 dias</option>
                  <option value={5}>5 dias</option>
                  <option value={7}>7 dias</option>
                </select>
              </div>
            </AutomacaoCard>

            {/* Aniversários */}
            <AutomacaoCard
              titulo="Felicitações de Aniversário"
              descricao="Envia parabéns com desconto e CTA de marcação"
              icone={Star}
              cor="text-pink-400"
              bg="bg-pink-500/10"
              border="border-pink-500/20"
              onExecutar={() => aniversarioMutation.mutate({})}
              isLoading={aniversarioMutation.isPending}
              resultado={resultadoAniversario}
            />
          </div>

          <div className="flex items-center gap-2 px-1">
            <Info className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="text-[var(--text-muted)] text-xs">
              Estas automações podem ser configuradas para executar automaticamente via cron diário.
              Contacte o administrador para ativar a execução automática.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {tab === "historico" && (
        <div className="space-y-4">
          <div className="flex gap-3 flex-wrap">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Pesquisar campanha..."
                value={pesquisaHistorico}
                onChange={e => setPesquisaHistorico(e.target.value)}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
              />
            </div>
            <select
              value={filtroEstado}
              onChange={e => setFiltroEstado(e.target.value)}
              className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50"
            >
              <option value="todos">Todos os estados</option>
              <option value="rascunho">Rascunho</option>
              <option value="agendada">Agendada</option>
              <option value="em_progresso">Em Progresso</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="card-premium overflow-hidden">
            {historicoFiltrado.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <MessageCircle className="w-8 h-8 text-[var(--text-muted)] mb-3" />
                <p className="text-[var(--text-secondary)] font-medium text-sm">Sem campanhas no histórico</p>
                <p className="text-[var(--text-muted)] text-xs mt-1">As campanhas enviadas aparecerão aqui</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-lightest)]">
                {historicoFiltrado.map((c: any) => {
                  const template = TEMPLATES.find(t => t.id === c.tipoTemplate);
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] transition-colors">
                      <div className={`w-9 h-9 rounded-xl ${template?.bg ?? "bg-[var(--bg-overlay)]"} border ${template?.border ?? "border-[var(--border-light)]"} flex items-center justify-center shrink-0`}>
                        {template ? <template.icone className={`w-4 h-4 ${template.cor}`} /> : <Zap className="w-4 h-4 text-[var(--text-muted)]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-[var(--text-primary)] text-sm font-medium truncate">{c.nome}</p>
                        </div>
                        <p className="text-[var(--text-muted)] text-xs">
                          {c.totalEnviadas || 0} enviadas · {c.totalUtentes || 0} destinatários
                          {c.createdAt && ` · ${new Date(c.createdAt).toLocaleDateString("pt-PT")}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <EstadoBadge estado={c.estado} />
                        <span className="text-[var(--text-muted)] text-[10px]">
                          {c.tipoTemplate || "custom"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Estatísticas ── */}
      {tab === "estatisticas" && (
        <div className="space-y-4">
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-5">
              <BarChart2 className="w-4 h-4 text-[#00E5FF]" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Desempenho das Mensagens</h2>
            </div>
            <div className="space-y-3">
              {[
                { label: "Enviadas",   value: stats.enviadas,   pct: 100,                  color: "bg-[#00E5FF]/50" },
                { label: "Entregues",  value: stats.entregues,  pct: stats.taxaEntrega,    color: "bg-emerald-500" },
                { label: "Lidas",      value: stats.lidas,      pct: stats.taxaLeitura,    color: "bg-violet-500" },
                { label: "Respostas",  value: stats.respostas,  pct: stats.taxaResposta,   color: "bg-amber-500" },
              ].map(({ label, value, pct, color }) => (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[var(--text-secondary)] text-xs">{label}</span>
                    <span className="text-[var(--text-primary)] text-xs font-semibold">
                      {value} <span className="text-[var(--text-muted)] font-normal">({Number(pct).toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="h-2 bg-[var(--bg-subtle)] rounded-full overflow-hidden">
                    <div className={`h-full ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* FIX: Estatísticas por Tipo — agora da BD, não hardcoded */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <Target className="w-4 h-4 text-violet-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Desempenho por Tipo de Campanha</h2>
            </div>
            <div className="space-y-2">
              {statsPorTipo.length === 0 ? (
                <div className="text-center py-6">
                  <ListChecks className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-2" />
                  <p className="text-[var(--text-muted)] text-xs">Sem dados por tipo ainda. Execute campanhas para ver estatísticas.</p>
                </div>
              ) : (
                statsPorTipo.map((s: any) => {
                  const template = TEMPLATES.find(t => t.id === s.tipo);
                  const bg = template?.bg || "bg-[var(--bg-surface)]";
                  const border = template?.border || "border-[var(--border-lightest)]";
                  const cor = template?.cor || "text-[var(--text-muted)]";
                  const Icon = template?.icone || Zap;
                  return (
                    <div key={s.tipo} className={`flex items-center gap-3 p-3 rounded-xl ${bg} border ${border}`}>
                      <Icon className={`w-4 h-4 ${cor} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold ${cor}`}>{template?.label || s.tipo}</p>
                        <p className="text-[var(--text-muted)] text-[10px]">{s.enviadas} enviadas · {s.totalCampanhas} campanhas</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[var(--text-primary)] text-xs font-bold">{s.taxaEntrega}%</p>
                        <p className="text-[var(--text-muted)] text-[10px]">entrega</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 px-1">
            <Info className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="text-[var(--text-muted)] text-xs">
              As estatísticas são calculadas a partir dos dados reais das campanhas na base de dados.
              Os dados de entrega e leitura dependem da integração com o Twilio WhatsApp Business API.
            </p>
          </div>
        </div>
      )}

      {/* Modal de Campanha (FIX: agora chama API real) */}
      {modalCampanha && (
        <ModalCampanha
          template={modalCampanha}
          utentes={utentes}
          onClose={() => setModalCampanha(null)}
          onEnviar={handleEnviarCampanha}
        />
      )}
    </div>
  );
}
