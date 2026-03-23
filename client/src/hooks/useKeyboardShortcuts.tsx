/**
 * useKeyboardShortcuts.ts — Sistema Global de Atalhos de Teclado
 * DentCare V35 — Produtividade Máxima
 *
 * Atalhos disponíveis:
 * - Ctrl+K: Command Bar (SmartCommandBar)
 * - Ctrl+N: Nova consulta (navega para agenda)
 * - Ctrl+P: Pesquisar paciente (navega para utentes)
 * - Ctrl+F: Financeiro
 * - Ctrl+Shift+A: Agenda
 * - Ctrl+Shift+I: Assistente IA
 * - ?: Mostrar overlay de ajuda
 *
 * O hook regista listeners globais e limpa ao desmontar.
 */

import { useEffect, useState, useCallback } from "react";
import { useLocation } from "wouter";

export interface ShortcutDefinition {
  tecla: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  descricao: string;
  categoria: string;
  acao: () => void;
}

export function useKeyboardShortcuts() {
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [, setLocation] = useLocation();

  const atalhos: ShortcutDefinition[] = [
    { tecla: "k", ctrl: true, descricao: "Abrir barra de comandos", categoria: "Geral", acao: () => {} }, // Gerido pelo SmartCommandBar
    { tecla: "n", ctrl: true, descricao: "Nova consulta", categoria: "Agenda", acao: () => setLocation("/agenda") },
    { tecla: "p", ctrl: true, descricao: "Pesquisar paciente", categoria: "Utentes", acao: () => setLocation("/utentes") },
    { tecla: "f", ctrl: true, shift: true, descricao: "Financeiro", categoria: "Navegação", acao: () => setLocation("/financeiro") },
    { tecla: "a", ctrl: true, shift: true, descricao: "Agenda", categoria: "Navegação", acao: () => setLocation("/agenda") },
    { tecla: "i", ctrl: true, shift: true, descricao: "Assistente IA", categoria: "IA", acao: () => setLocation("/assistente-ia") },
    { tecla: "d", ctrl: true, shift: true, descricao: "Dashboard", categoria: "Navegação", acao: () => setLocation("/dashboard") },
    { tecla: "?", descricao: "Mostrar atalhos", categoria: "Ajuda", acao: () => setMostrarAjuda(prev => !prev) },
  ];

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignorar se estiver a escrever num input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Exceção: Ctrl+K funciona sempre
        if (!(e.ctrlKey && e.key === "k")) return;
      }

      // Verificar "?" sem modificadores
      if (e.key === "?" && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setMostrarAjuda(prev => !prev);
        return;
      }

      // Verificar atalhos com Ctrl
      for (const atalho of atalhos) {
        if (atalho.tecla === "?") continue; // Já tratado acima
        if (atalho.tecla === "k") continue; // Gerido pelo SmartCommandBar

        const match =
          e.key.toLowerCase() === atalho.tecla.toLowerCase() &&
          !!e.ctrlKey === !!atalho.ctrl &&
          !!e.shiftKey === !!atalho.shift &&
          !!e.altKey === !!atalho.alt;

        if (match) {
          e.preventDefault();
          atalho.acao();
          return;
        }
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [atalhos]);

  return {
    atalhos,
    mostrarAjuda,
    setMostrarAjuda,
  };
}

// ─── Componente de Overlay de Ajuda ─────────────────────────────────────────

export function KeyboardShortcutsOverlay({
  atalhos,
  aberto,
  onFechar,
}: {
  atalhos: ShortcutDefinition[];
  aberto: boolean;
  onFechar: () => void;
}) {
  if (!aberto) return null;

  // Agrupar por categoria
  const grupos: Record<string, ShortcutDefinition[]> = {};
  atalhos.forEach(a => {
    if (!grupos[a.categoria]) grupos[a.categoria] = [];
    grupos[a.categoria].push(a);
  });

  return (
    <>
      <div className="fixed inset-0 z-[9998] bg-black/50 backdrop-blur-sm" onClick={onFechar} />
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border-lighter)]">
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Atalhos de Teclado</h2>
            <p className="text-[var(--text-muted)] text-xs mt-0.5">Navegue mais rápido com atalhos</p>
          </div>

          <div className="p-5 space-y-4 max-h-[400px] overflow-y-auto">
            {Object.entries(grupos).map(([cat, items]) => (
              <div key={cat}>
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider mb-2">{cat}</p>
                <div className="space-y-1.5">
                  {items.map((a, i) => (
                    <div key={i} className="flex items-center justify-between py-1.5">
                      <span className="text-xs text-[var(--text-secondary)]">{a.descricao}</span>
                      <div className="flex items-center gap-1">
                        {a.ctrl && <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">Ctrl</kbd>}
                        {a.shift && <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">Shift</kbd>}
                        {a.alt && <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">Alt</kbd>}
                        <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-[#00E5FF] bg-[#00E5FF]/10 border border-[#00E5FF]/20 rounded">
                          {a.tecla.toUpperCase()}
                        </kbd>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 border-t border-[var(--border-lightest)] bg-[var(--bg-elevated)]">
            <p className="text-[10px] text-[var(--text-muted)] text-center">
              Pressione <kbd className="px-1 py-0.5 text-[9px] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">?</kbd> ou <kbd className="px-1 py-0.5 text-[9px] bg-[var(--bg-subtle)] border border-[var(--border-lighter)] rounded">ESC</kbd> para fechar
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
