/**
 * Global Search — Busca Rápida em Todo o Sistema
 * DentCare Elite V35.5 — Atalho CMD/CTRL+K para pesquisa instantânea
 * V35.5: Adicionados atalhos de módulos e navegação rápida
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, X, ArrowRight, Users, Calendar, FileText, DollarSign, Loader2,
  BarChart3, Smile, ScanLine, ClipboardList, TrendingUp, Receipt,
  Package, UserCog, FlaskConical, MessageCircle, Share2, Zap, Brain,
  Mic, ShieldAlert, Heart, FileBarChart, Settings, Phone,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";

interface SearchResult {
  id: string;
  title: string;
  description?: string;
  category: "utente" | "consulta" | "fatura" | "modulo";
  icon: React.ReactNode;
  path: string;
}

// ─── Módulos do Sistema (para sugestões rápidas) ─────────────────────────────
const MODULOS_SISTEMA: SearchResult[] = [
  { id: "mod_dashboard",    title: "Dashboard",            description: "KPIs e métricas em tempo real",                   category: "modulo", icon: <BarChart3 className="w-4 h-4" />,      path: "/dashboard" },
  { id: "mod_agenda",       title: "Agenda",               description: "Gestão de consultas e horários",                  category: "modulo", icon: <Calendar className="w-4 h-4" />,       path: "/agenda" },
  { id: "mod_utentes",      title: "Utentes",              description: "Fichas e histórico clínico",                      category: "modulo", icon: <Users className="w-4 h-4" />,          path: "/utentes" },
  { id: "mod_odontograma",  title: "Odontograma",          description: "Mapa visual dentário",                            category: "modulo", icon: <Smile className="w-4 h-4" />,          path: "/odontograma" },
  { id: "mod_imagiologia",  title: "Imagiologia",          description: "Raio-X e análise por IA",                         category: "modulo", icon: <ScanLine className="w-4 h-4" />,       path: "/imagiologia" },
  { id: "mod_anamnese",     title: "Anamnese Digital",     description: "Formulários e assinatura digital",                category: "modulo", icon: <ClipboardList className="w-4 h-4" />,  path: "/anamnese" },
  { id: "mod_financeiro",   title: "Financeiro",           description: "Receitas, despesas e previsões",                  category: "modulo", icon: <TrendingUp className="w-4 h-4" />,     path: "/financeiro" },
  { id: "mod_faturacao",    title: "Faturação",            description: "Faturas, recibos e notas de crédito",             category: "modulo", icon: <Receipt className="w-4 h-4" />,        path: "/faturacao" },
  { id: "mod_stocks",       title: "Stocks",               description: "Inventário de materiais",                         category: "modulo", icon: <Package className="w-4 h-4" />,        path: "/stocks" },
  { id: "mod_equipa",       title: "Equipa",               description: "Médicos e funcionários",                          category: "modulo", icon: <UserCog className="w-4 h-4" />,        path: "/equipa" },
  { id: "mod_laboratorios", title: "Laboratórios",         description: "Gestão de laboratórios e envios",                 category: "modulo", icon: <FlaskConical className="w-4 h-4" />,   path: "/laboratorios" },
  { id: "mod_marketing",    title: "WhatsApp Marketing",   description: "Campanhas de reativação",                         category: "modulo", icon: <MessageCircle className="w-4 h-4" />,  path: "/marketing" },
  { id: "mod_redes",        title: "Redes Sociais",        description: "Facebook e Instagram",                            category: "modulo", icon: <Share2 className="w-4 h-4" />,         path: "/redes-sociais" },
  { id: "mod_ia",           title: "Assistente IA",        description: "Agente IA com ações reais",                       category: "modulo", icon: <Zap className="w-4 h-4" />,            path: "/assistente-ia" },
  { id: "mod_ia_pred",      title: "IA Preditiva",         description: "Insights e previsões inteligentes",               category: "modulo", icon: <Brain className="w-4 h-4" />,          path: "/ia-preditiva" },
  { id: "mod_voice",        title: "Voice Briefing",       description: "Assistente de voz clínico",                       category: "modulo", icon: <Mic className="w-4 h-4" />,            path: "/voice-briefing" },
  { id: "mod_alertas",      title: "Alertas de Saúde",     description: "Monitorização proativa do negócio",               category: "modulo", icon: <ShieldAlert className="w-4 h-4" />,    path: "/alertas" },
  { id: "mod_health",       title: "Score de Saúde",       description: "Score composto de saúde da clínica (0-100)",      category: "modulo", icon: <Heart className="w-4 h-4" />,          path: "/health-score" },
  { id: "mod_relatorios",   title: "Relatórios",           description: "Relatórios executivos e de retenção",             category: "modulo", icon: <FileBarChart className="w-4 h-4" />,   path: "/relatorios" },
  { id: "mod_ligacoes",     title: "Ligações Pendentes",   description: "Confirmações, seguimentos e cobranças",           category: "modulo", icon: <Phone className="w-4 h-4" />,          path: "/ligacoes" },
  { id: "mod_config",       title: "Configurações",        description: "Sistema, WhatsApp, permissões",                   category: "modulo", icon: <Settings className="w-4 h-4" />,       path: "/configuracoes/sistema" },
];

// ─── Cores por categoria ─────────────────────────────────────────────────────
const CATEGORY_COLORS: Record<string, string> = {
  utente:   "text-[#00E5FF] group-hover:text-[#00E5FF]",
  consulta: "text-violet-400 group-hover:text-violet-400",
  fatura:   "text-emerald-400 group-hover:text-emerald-400",
  modulo:   "text-amber-400 group-hover:text-amber-400",
};

const CATEGORY_LABELS: Record<string, string> = {
  utente:   "Utente",
  consulta: "Consulta",
  fatura:   "Fatura",
  modulo:   "Módulo",
};

export function GlobalSearch() {
  const { formatMoeda } = useConfig();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  // Atalho CMD+K / CTRL+K
  useEffect(() => {
    if (location === "/login") return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [location]);

  // Focar input quando modal abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Pesquisa real de utentes na BD
  const utentesQuery = trpc.utentes.list.useQuery(
    { search: query.trim() } as any,
    { enabled: isOpen && query.trim().length >= 2 && location !== "/login" }
  );

  // Pesquisa real de faturas na BD
  const faturasQuery = trpc.faturacao.listarFaturas.useQuery(
    { search: query.trim(), limite: 5 } as any,
    { enabled: isOpen && query.trim().length >= 2 && location !== "/login" }
  );

  // FIX V35: Não renderizar na página de login
  if (location === "/login") return null;

  const isLoading = (utentesQuery.isFetching || faturasQuery.isFetching) && query.trim().length >= 2;

  // Construir resultados combinados da BD
  const results: SearchResult[] = [];
  if (query.trim().length >= 2) {
    const utentesData = (utentesQuery.data as any)?.utentes ?? [];
    for (const u of utentesData.slice(0, 4)) {
      results.push({
        id: `utente_${u.id}`,
        title: u.nome,
        description: `Utente · ${u.telemovel ?? "—"}${u.email ? ` · ${u.email}` : ""}`,
        category: "utente",
        icon: <Users className="w-4 h-4" />,
        path: `/utentes?utenteId=${u.id}`,
      });
    }
    const faturasData = (faturasQuery.data as any)?.faturas ?? [];
    for (const f of faturasData.slice(0, 3)) {
      results.push({
        id: `fatura_${f.id}`,
        title: `Fatura ${f.numeroFatura}`,
        description: `${formatMoeda(Number(f.valorTotal))} · ${f.estado === "paga" ? "Paga" : f.estado === "pendente" ? "Pendente" : "Anulada"}`,
        category: "fatura",
        icon: <DollarSign className="w-4 h-4" />,
        path: `/faturacao`,
      });
    }
    // V35.5 — Módulos do sistema que correspondem à pesquisa
    const queryLower = query.trim().toLowerCase();
    const modulosFiltrados = MODULOS_SISTEMA.filter(m =>
      m.title.toLowerCase().includes(queryLower) ||
      (m.description?.toLowerCase().includes(queryLower))
    );
    for (const m of modulosFiltrados.slice(0, 3)) {
      results.push(m);
    }
  }

  const handleSelect = (path: string) => {
    setLocation(path);
    setIsOpen(false);
    setQuery("");
  };

  // V35.5 — Módulos sugeridos quando sem query (atalhos rápidos)
  const modulosSugeridos = MODULOS_SISTEMA.slice(0, 8);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-light)] text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] transition-colors text-sm"
      >
        <Search className="w-4 h-4" />
        <span>Pesquisar...</span>
        <kbd className="ml-auto text-xs bg-[var(--bg-overlay)] px-2 py-1 rounded">⌘K</kbd>
      </button>

      {/* Modal de Busca */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-20">
          {/* Overlay */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Caixa de Busca */}
          <div className="relative w-full max-w-lg mx-4 bg-[var(--bg-secondary)] border border-[var(--border-light)] rounded-xl shadow-2xl overflow-hidden">
            {/* Input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-lighter)]">
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin shrink-0" style={{ color: '#00E5FF' }} />
              ) : (
                <Search className="w-5 h-5 text-[var(--text-muted)] shrink-0" />
              )}
              <input
                ref={inputRef}
                type="text"
                placeholder="Pesquisar utentes, faturas, módulos... (mín. 2 caracteres)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 bg-transparent text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none text-sm"
                autoComplete="off"
              />
              {query && (
                <button
                  onClick={() => setQuery("")}
                  className="p-1 hover:bg-[var(--bg-subtle)] rounded transition-colors"
                >
                  <X className="w-4 h-4 text-[var(--text-muted)]" />
                </button>
              )}
            </div>

            {/* Resultados */}
            <div className="max-h-[480px] overflow-y-auto">
              {query.trim().length < 2 ? (
                // V35.5 — Atalhos de módulos quando sem query
                <div className="p-3">
                  <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-wider px-1 mb-2">
                    Acesso Rápido a Módulos
                  </p>
                  <div className="grid grid-cols-2 gap-1">
                    {modulosSugeridos.map((m) => (
                      <button
                        key={m.id}
                        onClick={() => handleSelect(m.path)}
                        className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg hover:bg-[var(--bg-subtle)] transition-colors text-left group"
                      >
                        <div className="text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors shrink-0">
                          {m.icon}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[var(--text-primary)] text-xs font-medium truncate">{m.title}</p>
                          <p className="text-[var(--text-muted)] text-[10px] truncate">{m.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                  <p className="text-[var(--text-muted)] text-[10px] text-center mt-3">
                    Escreva para pesquisar utentes, faturas e módulos
                  </p>
                </div>
              ) : results.length === 0 && !isLoading ? (
                <div className="p-6 text-center">
                  <p className="text-[var(--text-muted)] text-sm">
                    Sem resultados para "{query}"
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-[var(--border-lighter)]">
                  {results.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleSelect(result.path)}
                      className="w-full px-4 py-3 text-left hover:bg-[var(--bg-subtle)] transition-colors flex items-start gap-3 group"
                    >
                      <div className={`mt-0.5 transition-colors ${CATEGORY_COLORS[result.category] || "text-[var(--text-muted)]"}`}>
                        {result.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-[var(--text-primary)] font-medium text-sm truncate">
                            {result.title}
                          </p>
                          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--text-muted)] shrink-0">
                            {CATEGORY_LABELS[result.category]}
                          </span>
                        </div>
                        {result.description && (
                          <p className="text-[var(--text-muted)] text-xs mt-0.5 truncate">
                            {result.description}
                          </p>
                        )}
                      </div>
                      <ArrowRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors opacity-0 group-hover:opacity-100 shrink-0 mt-0.5" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer com Atalhos */}
            <div className="px-4 py-3 border-t border-[var(--border-lighter)] bg-[var(--bg-surface)] flex items-center justify-between text-xs text-[var(--text-muted)]">
              <div className="flex gap-3">
                <div className="flex gap-1 items-center">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[10px]">↑↓</kbd>
                  <span>Navegar</span>
                </div>
                <div className="flex gap-1 items-center">
                  <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[10px]">↵</kbd>
                  <span>Selecionar</span>
                </div>
              </div>
              <div className="flex gap-1 items-center">
                <kbd className="px-1.5 py-0.5 rounded bg-[var(--bg-overlay)] text-[10px]">ESC</kbd>
                <span>Fechar</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
