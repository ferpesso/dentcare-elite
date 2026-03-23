/**
 * IA Agent Panel — Painel do Assistente IA com MCP Tools
 * DentCare V33
 *
 * Interface de chat com o agente IA que pode executar ações reais:
 * - Publicar nas redes sociais
 * - Enviar WhatsApp a pacientes
 * - Gerir agenda e prever faltas
 * - Aceder a fichas clínicas
 * - Gerar relatórios financeiros
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  Bot,
  Send,
  Loader2,
  Sparkles,
  Wrench,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  Zap,
  Brain,
  MessageSquare,
  Settings,
  Activity,
  BarChart3,
  Calendar,
  Phone,
  Share2,
  Stethoscope,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Mensagem {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  toolsExecutadas?: Array<{
    nome: string;
    resultado: unknown;
    sucesso: boolean;
  }>;
  provider?: string;
  modelo?: string;
  iteracoes?: number;
}

// ─── Ícone por categoria de tool ─────────────────────────────────────────────

const toolCategoryIcons: Record<string, React.ReactNode> = {
  marketing: <Share2 className="w-3.5 h-3.5" />,
  whatsapp: <Phone className="w-3.5 h-3.5" />,
  agenda: <Calendar className="w-3.5 h-3.5" />,
  clinica: <Stethoscope className="w-3.5 h-3.5" />,
  financeiro: <BarChart3 className="w-3.5 h-3.5" />,
  analytics: <Activity className="w-3.5 h-3.5" />,
};

// ─── Sugestões rápidas ───────────────────────────────────────────────────────

const sugestoesRapidas = [
  { texto: "Gera um post para Instagram sobre higiene oral", icon: <Share2 className="w-4 h-4" /> },
  { texto: "Quais consultas estão agendadas para amanhã?", icon: <Calendar className="w-4 h-4" /> },
  { texto: "Envia confirmação de consultas para amanhã", icon: <Phone className="w-4 h-4" /> },
  { texto: "Mostra o relatório financeiro deste mês", icon: <BarChart3 className="w-4 h-4" /> },
  { texto: "Prevê faltas para amanhã", icon: <Activity className="w-4 h-4" /> },
  { texto: "Planeia posts para a semana", icon: <Sparkles className="w-4 h-4" /> },
];

// ─── Componente Principal ────────────────────────────────────────────────────

export default function IAAgentPanel() {
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [input, setInput] = useState("");
  const [aEnviar, setAEnviar] = useState(false);
  const [modoTools, setModoTools] = useState(true);
  const [mostrarEstado, setMostrarEstado] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // tRPC mutations e queries
  const enviarMensagem = trpc.iaAgent.enviarMensagem.useMutation();
  const { data: estadoIA } = trpc.iaAgent.obterEstado.useQuery(undefined, {
    refetchInterval: 30000,
  });
  const { data: toolsData } = trpc.iaAgent.listarTools.useQuery();

  // Auto-scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensagens]);

  // Enviar mensagem
  const handleEnviar = useCallback(async (textoOverride?: string) => {
    const texto = textoOverride || input.trim();
    if (!texto || aEnviar) return;

    const novaMensagem: Mensagem = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: texto,
      timestamp: new Date(),
    };

    setMensagens(prev => [...prev, novaMensagem]);
    setInput("");
    setAEnviar(true);

    try {
      // Preparar histórico (últimas 10 mensagens)
      const historico = mensagens.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      }));

      const resultado = await enviarMensagem.mutateAsync({
        mensagem: texto,
        historico,
        modoTools,
      });

      const respostaMsg: Mensagem = {
        id: `msg-${Date.now()}-resp`,
        role: "assistant",
        content: resultado.resposta,
        timestamp: new Date(),
        toolsExecutadas: resultado.toolsExecutadas,
        provider: resultado.provider,
        modelo: resultado.modelo,
        iteracoes: resultado.iteracoes,
      };

      setMensagens(prev => [...prev, respostaMsg]);
    } catch (error: any) {
      const erroMsg: Mensagem = {
        id: `msg-${Date.now()}-erro`,
        role: "assistant",
        content: `Desculpe, ocorreu um erro: ${parseApiError(error, "Erro ao processar pedido")}. Verifique se o provider de IA está configurado.`,
        timestamp: new Date(),
      };
      setMensagens(prev => [...prev, erroMsg]);
    } finally {
      setAEnviar(false);
      inputRef.current?.focus();
    }
  }, [input, aEnviar, mensagens, modoTools, enviarMensagem]);

  // Enter para enviar
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-base)] rounded-xl overflow-hidden border border-[var(--border-light)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-elevated)] border-b border-[var(--border-light)]">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--bg-elevated)] ${
              estadoIA?.provider?.statusConexao?.conectado ? "bg-green-500" : "bg-yellow-500"
            }`} />
          </div>
          <div>
            <h3 className="font-semibold text-[var(--text-primary)] text-sm">
              Assistente IA DentCare
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              {estadoIA?.provider?.nome === "groq" ? (
                <span className="flex items-center gap-1">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  Groq (Llama 3.3 70B) — Gratuito
                </span>
              ) : estadoIA?.provider?.nome === "openai" ? (
                "OpenAI GPT-4.1 Mini"
              ) : (
                "A configurar..."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle MCP Tools */}
          <button
            onClick={() => setModoTools(!modoTools)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              modoTools
                ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                : "bg-[var(--bg-overlay)] text-[var(--text-muted)]"
            }`}
            title={modoTools ? "Modo Agente (com ações reais)" : "Modo Chat (apenas conversa)"}
          >
            {modoTools ? <Wrench className="w-3.5 h-3.5" /> : <MessageSquare className="w-3.5 h-3.5" />}
            {modoTools ? "Agente" : "Chat"}
          </button>

          {/* Estado do sistema */}
          <button
            onClick={() => setMostrarEstado(!mostrarEstado)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] transition-colors"
          >
            <Settings className="w-4 h-4 text-[var(--text-muted)]" />
          </button>
        </div>
      </div>

      {/* Painel de estado (colapsável) */}
      {mostrarEstado && estadoIA && (
        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 text-xs">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">Provider</span>
              <p className="text-[var(--text-secondary)] mt-0.5">
                {estadoIA.provider.nome} ({estadoIA.provider.modelo})
              </p>
            </div>
            {estadoIA.groq.configurado && (
              <div>
                <span className="text-blue-600 dark:text-blue-400 font-medium">Uso Groq</span>
                <p className="text-[var(--text-secondary)] mt-0.5">
                  {estadoIA.groq.uso.today}/{estadoIA.groq.uso.maxDay} req/dia
                </p>
              </div>
            )}
            <div>
              <span className="text-blue-600 dark:text-blue-400 font-medium">MCP Tools</span>
              <p className="text-[var(--text-secondary)] mt-0.5">
                {estadoIA.mcp.stats.total} tools disponíveis
              </p>
            </div>
          </div>
          {toolsData && (
            <div className="mt-2 flex flex-wrap gap-1">
              {toolsData.tools.map(t => (
                <span
                  key={t.name}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--bg-elevated)] text-gray-600 dark:text-[var(--text-muted)] border border-[var(--border-light)]"
                  title={t.description}
                >
                  {toolCategoryIcons[t.category] || <Wrench className="w-3 h-3" />}
                  {t.name.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Área de mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {mensagens.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-4">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
              Assistente IA com Ações Reais
            </h3>
            <p className="text-sm text-[var(--text-muted)] max-w-md mb-6">
              Posso publicar nas redes sociais, enviar WhatsApp, gerir a agenda, aceder a fichas de pacientes e gerar relatórios. O que precisa?
            </p>

            {/* Sugestões rápidas */}
            <div className="grid grid-cols-2 gap-2 max-w-lg">
              {sugestoesRapidas.map((s, i) => (
                <button
                  key={i}
                  onClick={() => handleEnviar(s.texto)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-light)] hover:border-blue-300 dark:hover:border-blue-500 transition-colors text-left text-xs text-[var(--text-secondary)]"
                >
                  {s.icon}
                  {s.texto}
                </button>
              ))}
            </div>
          </div>
        )}

        {mensagens.map(msg => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-[var(--bg-elevated)] text-[var(--text-primary)] border border-[var(--border-light)] rounded-bl-md"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>

              {/* Tools executadas */}
              {msg.toolsExecutadas && msg.toolsExecutadas.length > 0 && (
                <ToolsExecutadasBadge tools={msg.toolsExecutadas} />
              )}

              {/* Metadata */}
              <div className={`flex items-center gap-2 mt-2 text-xs ${
                msg.role === "user" ? "text-blue-200" : "text-[var(--text-muted)]"
              }`}>
                <span>{msg.timestamp.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}</span>
                {msg.provider && (
                  <span className="flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    {msg.provider}
                  </span>
                )}
                {msg.iteracoes && msg.iteracoes > 1 && (
                  <span>{msg.iteracoes} iterações</span>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Indicador de escrita */}
        {aEnviar && (
          <div className="flex justify-start">
            <div className="bg-[var(--bg-elevated)] rounded-2xl rounded-bl-md px-4 py-3 border border-[var(--border-light)]">
              <div className="flex items-center gap-2 text-sm text-[var(--text-muted)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                {modoTools ? "A processar com MCP tools..." : "A pensar..."}
              </div>
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 bg-[var(--bg-elevated)] border-t border-[var(--border-light)]">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modoTools ? "Peça uma ação (ex: publica no Instagram...)" : "Escreva uma mensagem..."}
            className="flex-1 resize-none rounded-xl border border-[var(--border-primary)] bg-[var(--bg-base)] px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#00E5FF] dark:text-white max-h-32"
            rows={1}
            disabled={aEnviar}
          />
          <button
            onClick={() => handleEnviar()}
            disabled={!input.trim() || aEnviar}
            className="flex items-center justify-center w-10 h-10 rounded-xl btn-primary disabled:opacity-40 text-white transition-colors"
          >
            {aEnviar ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-componente: Badge de tools executadas ───────────────────────────────

function ToolsExecutadasBadge({
  tools,
}: {
  tools: Array<{ nome: string; resultado: unknown; sucesso: boolean }>;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className="mt-2 border-t border-[var(--border-lightest)] pt-2">
      <button
        onClick={() => setExpandido(!expandido)}
        className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700"
      >
        <Wrench className="w-3 h-3" />
        {tools.length} ação(ões) executada(s)
        {expandido ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
      </button>

      {expandido && (
        <div className="mt-2 space-y-1.5">
          {tools.map((tool, i) => (
            <div
              key={i}
              className="flex items-start gap-2 text-xs bg-[var(--bg-base)] rounded-lg px-3 py-2"
            >
              {tool.sucesso ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 flex-shrink-0" />
              ) : (
                <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
              )}
              <div>
                <span className="font-medium text-[var(--text-secondary)]">
                  {tool.nome.replace(/_/g, " ")}
                </span>
                {tool.resultado != null && (
                  <p className="text-[var(--text-muted)] mt-0.5 line-clamp-2">
                    {String(typeof tool.resultado === "string"
                      ? tool.resultado
                      : JSON.stringify(tool.resultado).substring(0, 150))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
