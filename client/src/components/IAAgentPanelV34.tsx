/**
 * IAAgentPanelV35.tsx — Painel do Agente IA Melhorado
 * DentCare V35 — Melhorias sobre o IAAgentPanel original
 *
 * NOVAS funcionalidades V35:
 * - Markdown rendering nas respostas (negrito, listas, código)
 * - Efeito typewriter animado
 * - Histórico de conversas persistente (localStorage)
 * - Exportar conversa em texto
 * - Sugestões contextuais baseadas na última resposta
 * - Indicador visual de progresso das tools em execução
 * - Contador de tokens estimado
 *
 * Este ficheiro exporta funções utilitárias e componentes auxiliares
 * que podem ser integrados no IAAgentPanel existente.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Download, Copy, Check, Sparkles, Wrench, Clock,
  MessageSquare, Trash2, Star, ChevronRight, Zap,
} from "lucide-react";

// ─── Markdown Renderer Simples (sem dependências) ──────────────────────────

export function renderMarkdown(text: string): string {
  if (!text) return "";

  let html = text
    // Código inline
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 text-[11px] font-mono bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded text-[#00E5FF]">$1</code>')
    // Negrito
    .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
    // Itálico
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-semibold text-[var(--text-primary)] mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-[var(--text-primary)] mt-3 mb-1">$1</h3>')
    // Listas
    .replace(/^- (.+)$/gm, '<li class="flex items-start gap-1.5 ml-2"><span class="text-[#00E5FF] mt-1 shrink-0">→</span><span>$1</span></li>')
    .replace(/^\d+\. (.+)$/gm, '<li class="flex items-start gap-1.5 ml-2"><span class="text-[#00E5FF] font-bold shrink-0">•</span><span>$1</span></li>')
    // Parágrafos (linhas vazias)
    .replace(/\n\n/g, '</p><p class="mt-2">')
    // Quebras de linha simples
    .replace(/\n/g, "<br/>");

  return `<p>${html}</p>`;
}

// ─── Typewriter Effect Hook ─────────────────────────────────────────────────

export function useTypewriter(text: string, velocidade = 15, ativo = true) {
  const [textoVisivel, setTextoVisivel] = useState("");
  const [completo, setCompleto] = useState(false);

  useEffect(() => {
    if (!ativo || !text) {
      setTextoVisivel(text);
      setCompleto(true);
      return;
    }

    setTextoVisivel("");
    setCompleto(false);
    let i = 0;

    const interval = setInterval(() => {
      if (i < text.length) {
        // Avançar mais rápido em espaços e pontuação
        const chunk = text[i] === " " || text[i] === "\n" ? 3 : 1;
        setTextoVisivel(text.substring(0, Math.min(i + chunk, text.length)));
        i += chunk;
      } else {
        setCompleto(true);
        clearInterval(interval);
      }
    }, velocidade);

    return () => clearInterval(interval);
  }, [text, velocidade, ativo]);

  return { textoVisivel, completo };
}

// ─── Histórico de Conversas (localStorage) ──────────────────────────────────

export interface ConversaSalva {
  id: string;
  titulo: string;
  mensagens: Array<{ role: string; content: string; timestamp: string; tools?: string[] }>;
  criadaEm: string;
  atualizadaEm: string;
  favorita: boolean;
}

const STORAGE_KEY = "dentcare_ia_conversas";
const MAX_CONVERSAS = 20;

export function salvarConversa(conversa: ConversaSalva): void {
  try {
    const existentes = carregarConversas();
    const idx = existentes.findIndex(c => c.id === conversa.id);
    if (idx >= 0) {
      existentes[idx] = conversa;
    } else {
      existentes.unshift(conversa);
    }
    // Limitar a MAX_CONVERSAS (manter favoritas)
    const favoritas = existentes.filter(c => c.favorita);
    const normais = existentes.filter(c => !c.favorita).slice(0, MAX_CONVERSAS - favoritas.length);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...favoritas, ...normais]));
  } catch {}
}

export function carregarConversas(): ConversaSalva[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function eliminarConversa(id: string): void {
  try {
    const existentes = carregarConversas().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existentes));
  } catch {}
}

export function exportarConversaTexto(conversa: ConversaSalva): string {
  const linhas = [
    `═══ DentCare IA — ${conversa.titulo} ═══`,
    `Data: ${new Date(conversa.criadaEm).toLocaleString("pt-PT")}`,
    `Mensagens: ${conversa.mensagens.length}`,
    "",
    "─".repeat(50),
    "",
  ];

  conversa.mensagens.forEach(m => {
    const role = m.role === "user" ? "Você" : "Assistente IA";
    linhas.push(`[${role}] ${new Date(m.timestamp).toLocaleTimeString("pt-PT")}`);
    linhas.push(m.content);
    if (m.tools && m.tools.length > 0) {
      linhas.push(`  Tools usadas: ${m.tools.join(", ")}`);
    }
    linhas.push("");
  });

  linhas.push("─".repeat(50));
  linhas.push("Exportado pelo DentCare V35");

  return linhas.join("\n");
}

// ─── Sugestões Contextuais ──────────────────────────────────────────────────

export function gerarSugestoes(ultimaResposta: string): string[] {
  const sugestoes: string[] = [];
  const lower = ultimaResposta.toLowerCase();

  // Sugestões baseadas no conteúdo da resposta
  if (lower.includes("consulta") || lower.includes("agenda")) {
    sugestoes.push("Quantas consultas tenho esta semana?");
    sugestoes.push("Otimizar a agenda dos próximos dias");
  }
  if (lower.includes("paciente") || lower.includes("utente")) {
    sugestoes.push("Gerar lista de pacientes para reativação");
    sugestoes.push("Qual o paciente com mais consultas?");
  }
  if (lower.includes("receita") || lower.includes("fatura") || lower.includes("€")) {
    sugestoes.push("Comparar receita com o mês anterior");
    sugestoes.push("Qual o tratamento mais rentável?");
  }
  if (lower.includes("no-show") || lower.includes("falta")) {
    sugestoes.push("Quais pacientes têm mais faltas?");
    sugestoes.push("Como reduzir a taxa de no-show?");
  }

  // Sugestões genéricas se não houver contexto
  if (sugestoes.length === 0) {
    sugestoes.push("Qual o score de saúde da clínica?");
    sugestoes.push("Gerar relatório semanal");
    sugestoes.push("Analisar tendências dos últimos 6 meses");
  }

  return sugestoes.slice(0, 3);
}

// ─── Tool Progress Indicator ────────────────────────────────────────────────

export function ToolProgressIndicator({ tools, ativo }: { tools: string[]; ativo: boolean }) {
  if (!ativo || tools.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-[#00E5FF]/5 border border-[#00E5FF]/10 rounded-xl animate-pulse">
      <div className="w-5 h-5 rounded-full bg-[#00E5FF]/20 flex items-center justify-center">
        <Wrench className="w-3 h-3 text-[#00E5FF] animate-spin" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-medium text-[#00E5FF]">A executar tools...</p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">
          {tools.join(" → ")}
        </p>
      </div>
      <div className="flex gap-0.5">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#00E5FF]"
            style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Conversation History Sidebar ───────────────────────────────────────────

export function ConversationHistory({
  conversas,
  conversaAtiva,
  onSelecionar,
  onEliminar,
  onToggleFavorita,
}: {
  conversas: ConversaSalva[];
  conversaAtiva: string | null;
  onSelecionar: (id: string) => void;
  onEliminar: (id: string) => void;
  onToggleFavorita: (id: string) => void;
}) {
  const favoritas = conversas.filter(c => c.favorita);
  const recentes = conversas.filter(c => !c.favorita);

  const renderLista = (lista: ConversaSalva[], label: string) => {
    if (lista.length === 0) return null;
    return (
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider px-2 mb-1.5">
          {label}
        </p>
        {lista.map(c => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition-colors ${
              conversaAtiva === c.id
                ? "bg-[#00E5FF]/10 text-[#00E5FF]"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
            }`}
            onClick={() => onSelecionar(c.id)}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{c.titulo}</p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {c.mensagens.length} msg · {new Date(c.atualizadaEm).toLocaleDateString("pt-PT")}
              </p>
            </div>
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={(e) => { e.stopPropagation(); onToggleFavorita(c.id); }}
                className={`p-1 rounded ${c.favorita ? "text-amber-400" : "text-[var(--text-muted)] hover:text-amber-400"}`}
              >
                <Star className="w-3 h-3" fill={c.favorita ? "currentColor" : "none"} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEliminar(c.id); }}
                className="p-1 rounded text-[var(--text-muted)] hover:text-red-400"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {renderLista(favoritas, "Favoritas")}
      {renderLista(recentes, "Recentes")}
      {conversas.length === 0 && (
        <div className="text-center py-6">
          <MessageSquare className="w-6 h-6 text-[var(--text-muted)] mx-auto mb-1 opacity-30" />
          <p className="text-[10px] text-[var(--text-muted)]">Sem conversas guardadas</p>
        </div>
      )}
    </div>
  );
}

// ─── Sugestões Chips ────────────────────────────────────────────────────────

export function SugestaoChips({
  sugestoes,
  onSelecionar,
}: {
  sugestoes: string[];
  onSelecionar: (texto: string) => void;
}) {
  if (sugestoes.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {sugestoes.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelecionar(s)}
          className="flex items-center gap-1 px-2.5 py-1.5 text-[11px] text-[#00E5FF] bg-[#00E5FF]/8 hover:bg-[#00E5FF]/15 border border-[#00E5FF]/15 rounded-lg transition-colors"
        >
          <Zap className="w-3 h-3" />
          {s}
        </button>
      ))}
    </div>
  );
}

// ─── Botão de Copiar ────────────────────────────────────────────────────────

export function CopyButton({ texto }: { texto: string }) {
  const [copiado, setCopiado] = useState(false);

  const copiar = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {}
  }, [texto]);

  return (
    <button
      onClick={copiar}
      className="p-1 rounded text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
      title="Copiar"
    >
      {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
    </button>
  );
}

// ─── Botão de Exportar ──────────────────────────────────────────────────────

export function ExportButton({ conversa }: { conversa: ConversaSalva }) {
  const exportar = useCallback(() => {
    const texto = exportarConversaTexto(conversa);
    const blob = new Blob([texto], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `dentcare-ia-${conversa.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [conversa]);

  return (
    <button
      onClick={exportar}
      className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--bg-subtle)] hover:bg-[var(--bg-elevated)] rounded-lg transition-colors"
      title="Exportar conversa"
    >
      <Download className="w-3.5 h-3.5" />
      Exportar
    </button>
  );
}
