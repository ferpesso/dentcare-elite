/**
 * PlaceholderPage.tsx — Módulo Premium em Desenvolvimento
 * DentCare Elite V35 — Design System Premium
 */

import React from "react";
import { useLocation } from "wouter";
import { NAVIGATION } from "../navigation";
import {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, CalendarCheck, Wrench, Activity,
  Database, Zap, Shield,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, CalendarCheck, Wrench, Activity, Database,
};

const BADGE_CLASSES: Record<string, string> = {
  IA: "badge-ia",
  Elite: "badge-elite",
  Pro: "badge-pro",
  Novo: "badge-novo",
};

const FEATURES = [
  { icon: Database, label: "Dados em Tempo Real", desc: "Sincronizado com a base de dados", color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { icon: Shield, label: "Segurança RBAC", desc: "Acesso controlado por perfil", color: "text-emerald-400", bg: "bg-emerald-500/10" },
  { icon: Zap, label: "Exportação", desc: "PDF, Excel e relatórios", color: "text-amber-400", bg: "bg-amber-500/10" },
];

export function PlaceholderPage() {
  const [location] = useLocation();

  let pageInfo: { label: string; icon: string; description?: string; badge?: string; category: string } | null = null;

  for (const category of NAVIGATION) {
    for (const item of category.items) {
      if (item.path === location) {
        pageInfo = { ...item, category: category.label };
        break;
      }
    }
    if (pageInfo) break;
  }

  if (!pageInfo) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-muted)]">Página não encontrada</p>
      </div>
    );
  }

  const Icon = ICON_MAP[pageInfo.icon];

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="page-header-title">{pageInfo.label}</h1>
          {pageInfo.badge && (
            <span className={BADGE_CLASSES[pageInfo.badge] || "badge-novo"}>
              {pageInfo.badge}
            </span>
          )}
        </div>
        <p className="page-header-subtitle">{pageInfo.description}</p>
      </div>

      {/* ── Card Principal ── */}
      <div className="card-premium p-8 text-center relative overflow-hidden">
        {/* Orb decorativo */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-48 orb orb-neon-cyan opacity-20 -translate-y-1/2" />

        <div className="relative z-10">
          {/* Ícone */}
          <div className="
            w-16 h-16 rounded-2xl mx-auto mb-5
            bg-gradient-to-br from-[#00E5FF]/20 to-[#B388FF]/20
            border border-[#00E5FF]/20
            flex items-center justify-center
          ">
            {Icon && <Icon className="w-8 h-8 text-[#00E5FF]" />}
          </div>

          <h2 className="text-[var(--text-primary)] font-bold text-lg mb-2">
            Módulo {pageInfo.label}
          </h2>
          <p className="text-[var(--text-tertiary)] text-sm max-w-sm mx-auto mb-8 leading-relaxed">
            Este módulo está integrado e disponível. O conteúdo completo é carregado a partir do componente dedicado.
          </p>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
            {FEATURES.map(({ icon: FIcon, label, desc, color, bg }) => (
              <div key={label} className="bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl p-3">
                <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                  <FIcon className={`w-3.5 h-3.5 ${color}`} />
                </div>
                <p className="text-[var(--text-secondary)] text-xs font-semibold mb-0.5">{label}</p>
                <p className="text-[var(--text-muted)] text-[11px]">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Info da Categoria ── */}
      <div className="flex items-center gap-2 px-1">
        <div className="w-1 h-1 rounded-full bg-[#00E5FF]" />
        <p className="text-[var(--text-muted)] text-xs">{pageInfo.category}</p>
      </div>
    </div>
  );
}
