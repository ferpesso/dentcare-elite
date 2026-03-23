/**
 * SmartCommandBar.tsx — Barra de Comandos Inteligente (Ctrl+K)
 * DentCare V35 — Spotlight/Cmd+K para Clínicas Dentárias
 *
 * Funcionalidades:
 * - Pesquisa universal: utentes, consultas, páginas, ações
 * - Comandos rápidos por linguagem natural
 * - Atalhos de teclado para ações frequentes
 * - Histórico de comandos recentes
 * - Navegação por teclado (setas + Enter)
 * - 100% gratuito — sem APIs externas
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import {
  Search, X, ArrowRight, Calendar, Users, Euro, BarChart3,
  MessageCircle, Brain, Mic, Settings, FileText, Package,
  Zap, Clock, Star, Hash, Command, CornerDownLeft,
  ArrowUp, ArrowDown, Sparkles, Activity, Heart,
  Receipt, UserCog, FlaskConical, Share2, ShieldAlert, Database,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

interface CommandItem {
  id: string;
  label: string;
  sublabel?: string;
  icon: React.ReactNode;
  category: "navegacao" | "acao" | "utente" | "recente" | "ia";
  action: () => void;
  keywords?: string[];
  badge?: string;
}

// ─── Ícones por Categoria ───────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  recente: "Recentes",
  navegacao: "Navegação",
  acao: "Ações Rápidas",
  utente: "Utentes",
  ia: "Assistente IA",
};

// ─── Componente Principal ───────────────────────────────────────────────────

export function SmartCommandBar() {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState("");
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [recentes, setRecentes] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listaRef = useRef<HTMLDivElement>(null);
  const [, setLocation] = useLocation();

  // Carregar recentes do localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("dentcare_cmd_recentes");
      if (saved) setRecentes(JSON.parse(saved));
    } catch {}
  }, []);

  // Guardar recente
  const guardarRecente = useCallback((label: string) => {
    setRecentes(prev => {
      const novos = [label, ...prev.filter(r => r !== label)].slice(0, 5);
      localStorage.setItem("dentcare_cmd_recentes", JSON.stringify(novos));
      return novos;
    });
  }, []);

  // Atalho global Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setAberto(prev => !prev);
      }
      if (e.key === "Escape") {
        setAberto(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus no input ao abrir
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setIndiceAtivo(0);
    }
  }, [aberto]);

  // Navegar para uma rota
  const navegar = useCallback((path: string, label: string) => {
    guardarRecente(label);
    setAberto(false);
    setLocation(path);
  }, [setLocation, guardarRecente]);

  // ── Itens de Comando ────────────────────────────────────────────────────

  const comandos: CommandItem[] = useMemo(() => {
    const items: CommandItem[] = [];

    // Recentes
    recentes.forEach((r, i) => {
      const navItem = TODAS_PAGINAS.find(p => p.label === r);
      if (navItem) {
        items.push({
          id: `recente-${i}`,
          label: r,
          sublabel: "Visitado recentemente",
          icon: <Clock className="w-4 h-4" />,
          category: "recente",
          action: () => navegar(navItem.path, r),
        });
      }
    });

    // Navegação
    TODAS_PAGINAS.forEach(p => {
      items.push({
        id: `nav-${p.path}`,
        label: p.label,
        sublabel: p.description,
        icon: p.icon,
        category: "navegacao",
        action: () => navegar(p.path, p.label),
        keywords: p.keywords,
        badge: p.badge,
      });
    });

    // Ações Rápidas
    items.push(
      {
        id: "acao-nova-consulta",
        label: "Nova Consulta",
        sublabel: "Agendar uma nova consulta",
        icon: <Calendar className="w-4 h-4 text-[#00E5FF]" />,
        category: "acao",
        action: () => navegar("/agenda", "Agenda"),
        keywords: ["agendar", "marcar", "consulta", "nova"],
      },
      {
        id: "acao-novo-utente",
        label: "Novo Utente",
        sublabel: "Registar um novo paciente",
        icon: <Users className="w-4 h-4 text-emerald-400" />,
        category: "acao",
        action: () => navegar("/utentes", "Utentes"),
        keywords: ["paciente", "registar", "novo", "utente"],
      },
      {
        id: "acao-nova-fatura",
        label: "Nova Fatura",
        sublabel: "Emitir uma nova fatura",
        icon: <Receipt className="w-4 h-4 text-amber-400" />,
        category: "acao",
        action: () => navegar("/faturacao", "Faturação"),
        keywords: ["fatura", "emitir", "recibo", "cobrar"],
      },
      {
        id: "acao-ia",
        label: "Perguntar à IA",
        sublabel: "Abrir o assistente IA com MCP tools",
        icon: <Sparkles className="w-4 h-4 text-violet-400" />,
        category: "ia",
        action: () => navegar("/assistente-ia", "Assistente IA"),
        keywords: ["ia", "inteligencia", "assistente", "ajuda", "perguntar"],
        badge: "IA",
      },
      {
        id: "acao-relatorio",
        label: "Gerar Relatório Semanal",
        sublabel: "Resumo completo da semana com KPIs",
        icon: <FileText className="w-4 h-4 text-blue-400" />,
        category: "acao",
        action: () => navegar("/dashboard", "Dashboard"),
        keywords: ["relatorio", "semanal", "resumo", "kpi"],
      },
      {
        id: "acao-health",
        label: "Score de Saúde da Clínica",
        sublabel: "Ver o score composto de saúde do negócio",
        icon: <Heart className="w-4 h-4 text-rose-400" />,
        category: "acao",
        action: () => navegar("/dashboard", "Dashboard"),
        keywords: ["saude", "score", "health", "clinica", "negocio"],
        badge: "V35",
      },
    );

    return items;
  }, [recentes, navegar]);

  // ── Filtrar resultados ──────────────────────────────────────────────────

  const resultados = useMemo(() => {
    if (!query.trim()) {
      // Mostrar recentes + ações populares
      return comandos.filter(c =>
        c.category === "recente" || c.category === "acao" || c.category === "ia"
      ).slice(0, 10);
    }

    const q = query.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return comandos.filter(c => {
      const label = c.label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const sublabel = (c.sublabel || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const keywords = (c.keywords || []).join(" ").toLowerCase();
      return label.includes(q) || sublabel.includes(q) || keywords.includes(q);
    }).slice(0, 12);
  }, [query, comandos]);

  // Reset índice quando resultados mudam
  useEffect(() => {
    setIndiceAtivo(0);
  }, [resultados.length]);

  // ── Navegação por teclado ───────────────────────────────────────────────

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIndiceAtivo(prev => Math.min(prev + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIndiceAtivo(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && resultados[indiceAtivo]) {
      e.preventDefault();
      resultados[indiceAtivo].action();
    }
  };

  // Scroll automático para item ativo
  useEffect(() => {
    const el = listaRef.current?.children[indiceAtivo] as HTMLElement;
    el?.scrollIntoView({ block: "nearest" });
  }, [indiceAtivo]);

  if (!aberto) return null;

  // ── Agrupar por categoria ───────────────────────────────────────────────

  const grupos: Record<string, CommandItem[]> = {};
  resultados.forEach(r => {
    if (!grupos[r.category]) grupos[r.category] = [];
    grupos[r.category].push(r);
  });

  let indiceGlobal = -1;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm"
        onClick={() => setAberto(false)}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-[10000] flex items-start justify-center pt-[15vh]">
        <div className="w-full max-w-xl bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200">
          {/* Input */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-lighter)]">
            <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pesquisar páginas, ações, utentes..."
              className="flex-1 bg-transparent text-[var(--text-primary)] text-sm placeholder:text-[var(--text-muted)] outline-none"
            />
            <div className="flex items-center gap-1.5 shrink-0">
              <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">ESC</kbd>
            </div>
          </div>

          {/* Resultados */}
          <div ref={listaRef} className="max-h-[400px] overflow-y-auto py-2">
            {resultados.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Search className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-40" />
                <p className="text-[var(--text-muted)] text-sm">Sem resultados para "{query}"</p>
                <p className="text-[var(--text-tertiary)] text-xs mt-1">Tente pesquisar por "agenda", "utentes" ou "fatura"</p>
              </div>
            ) : (
              Object.entries(grupos).map(([cat, items]) => (
                <div key={cat}>
                  <p className="px-4 py-1.5 text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                    {CATEGORY_LABELS[cat] || cat}
                  </p>
                  {items.map(item => {
                    indiceGlobal++;
                    const idx = indiceGlobal;
                    return (
                      <button
                        key={item.id}
                        onClick={item.action}
                        onMouseEnter={() => setIndiceAtivo(idx)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          idx === indiceAtivo
                            ? "bg-[#00E5FF]/10 text-[var(--text-primary)]"
                            : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                        }`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          idx === indiceAtivo ? "bg-[#00E5FF]/20" : "bg-[var(--bg-subtle)]"
                        }`}>
                          {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.label}</p>
                          {item.sublabel && (
                            <p className="text-[var(--text-muted)] text-xs truncate">{item.sublabel}</p>
                          )}
                        </div>
                        {item.badge && (
                          <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#00E5FF]/15 text-[#00E5FF] border border-[#00E5FF]/20">
                            {item.badge}
                          </span>
                        )}
                        {idx === indiceAtivo && (
                          <CornerDownLeft className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* Footer com atalhos */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-[var(--border-lightest)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-3 text-[10px] text-[var(--text-muted)]">
              <span className="flex items-center gap-1">
                <ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> navegar
              </span>
              <span className="flex items-center gap-1">
                <CornerDownLeft className="w-3 h-3" /> selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1 py-0.5 bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded text-[9px]">ESC</kbd> fechar
              </span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-[var(--text-muted)]">
              <Command className="w-3 h-3" />
              <span>DentCare V35</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Dados de Navegação ─────────────────────────────────────────────────────

const TODAS_PAGINAS = [
  { label: "Dashboard", path: "/dashboard", icon: <BarChart3 className="w-4 h-4 text-[#00E5FF]" />, description: "KPIs e métricas em tempo real", keywords: ["inicio", "home", "metricas", "kpi"], badge: undefined },
  { label: "Agenda", path: "/agenda", icon: <Calendar className="w-4 h-4 text-blue-400" />, description: "Gestão de consultas e horários", keywords: ["consultas", "horarios", "marcar", "agendar"] },
  { label: "Utentes", path: "/utentes", icon: <Users className="w-4 h-4 text-emerald-400" />, description: "Fichas e histórico clínico", keywords: ["pacientes", "fichas", "historico"] },
  { label: "Financeiro", path: "/financeiro", icon: <Euro className="w-4 h-4 text-amber-400" />, description: "Receitas, despesas e previsões", keywords: ["receita", "despesa", "dinheiro", "lucro"] },
  { label: "Faturação", path: "/faturacao", icon: <Receipt className="w-4 h-4 text-orange-400" />, description: "Faturas, recibos e notas de crédito", keywords: ["fatura", "recibo", "nota", "credito"] },
  { label: "Stocks", path: "/stocks", icon: <Package className="w-4 h-4 text-cyan-400" />, description: "Inventário de materiais", keywords: ["inventario", "materiais", "stock", "material"] },
  { label: "Equipa", path: "/equipa", icon: <UserCog className="w-4 h-4 text-violet-400" />, description: "Médicos e funcionários", keywords: ["medicos", "funcionarios", "equipa", "pessoal"] },
  { label: "Laboratórios", path: "/laboratorios", icon: <FlaskConical className="w-4 h-4 text-pink-400" />, description: "Gestão de laboratórios e envios", keywords: ["laboratorio", "envio", "protese"], badge: "Novo" },
  { label: "Odontograma", path: "/odontograma", icon: <Hash className="w-4 h-4 text-teal-400" />, description: "Mapa visual dentário", keywords: ["dentes", "mapa", "dental", "odonto"] },
  { label: "Imagiologia", path: "/imagiologia", icon: <Activity className="w-4 h-4 text-sky-400" />, description: "Raio-X e análise por IA", keywords: ["raio", "radiografia", "imagem", "scan"] },
  { label: "WhatsApp Marketing", path: "/marketing", icon: <MessageCircle className="w-4 h-4 text-green-400" />, description: "Campanhas de reativação", keywords: ["whatsapp", "campanha", "sms", "mensagem"] },
  { label: "Redes Sociais", path: "/redes-sociais", icon: <Share2 className="w-4 h-4 text-blue-400" />, description: "Facebook e Instagram", keywords: ["facebook", "instagram", "social", "post"] },
  { label: "Assistente IA", path: "/assistente-ia", icon: <Sparkles className="w-4 h-4 text-violet-400" />, description: "Agente IA com ações reais", keywords: ["ia", "inteligencia", "assistente", "mcp", "groq"], badge: "MCP" },
  { label: "IA Preditiva", path: "/ia-preditiva", icon: <Brain className="w-4 h-4 text-purple-400" />, description: "Insights e previsões", keywords: ["preditiva", "previsao", "insight", "tendencia"] },
  { label: "Voice Briefing", path: "/voice-briefing", icon: <Mic className="w-4 h-4 text-rose-400" />, description: "Assistente de voz clínico", keywords: ["voz", "briefing", "audio", "falar"] },
  { label: "Alertas de Saúde", path: "/alertas", icon: <ShieldAlert className="w-4 h-4 text-red-400" />, description: "Monitorização proativa", keywords: ["alerta", "aviso", "critico", "urgente"] },
  { label: "Configurações", path: "/configuracoes/sistema", icon: <Settings className="w-4 h-4 text-gray-400" />, description: "Sistema, agenda, notificações", keywords: ["configurar", "definicoes", "sistema", "opcoes"] },
  { label: "Migração de Dados", path: "/migracao", icon: <Database className="w-4 h-4 text-cyan-400" />, description: "Importar dados de outros sistemas", keywords: ["migracao", "importar", "saft", "csv", "dados"], badge: "Novo" },
];
