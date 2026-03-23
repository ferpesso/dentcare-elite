/**
 * TopBar.tsx — Barra Superior Nano Banana Cyberpunk
 * DentCare Elite V35 — Dual Neon Cyan + Violet
 *
 * Design: Glassmorphism profundo, breadcrumb com gradiente dual neon,
 * pesquisa glass com glow violet, tipografia Space Grotesk
 */

import React, { memo } from "react";
import { useLocation } from "wouter";
import { Search, ChevronRight, Command } from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAVIGATION } from "../navigation";
import { ThemeToggle } from "./ThemeToggle";
import { NotificationPanel } from "./NotificationPanel";
import { SmartNotificationCenter } from "./SmartNotificationCenter";
import { useConfig } from "../contexts/ConfigContext";

// Mapeamento de path para chave de tradução
const PATH_TO_KEY: Record<string, string> = {
  "/dashboard": "dashboard",
  "/agenda": "agenda",
  "/ligacoes": "ligacoes",
  "/utentes": "utentes",
  "/odontograma": "odontograma",
  "/imagiologia": "imagiologia",
  "/anamnese": "anamnese",
  "/financeiro": "financeiro",
  "/faturacao": "faturacao",
  "/stocks": "stocks",
  "/equipa": "equipa",
  "/laboratorios": "laboratorios",
  "/marketing": "marketing",
  "/redes-sociais": "redes-sociais",
  "/assistente-ia": "assistente-ia",
  "/ia-preditiva": "ia-preditiva",
  "/voice-briefing": "voice-briefing",
  "/alertas": "alertas",
  "/health-score": "health-score",
  "/configuracoes/conectores": "conectores",
  "/configuracoes/sistema": "sistema",
  "/configuracoes/whatsapp": "whatsapp",
  "/configuracoes/permissoes": "permissoes",
  "/configuracoes/termos": "termos",
};

const CATEGORY_ID_MAP: Record<string, string> = {
  "visao-geral": "visao-geral",
  "gestao-clinica": "gestao-clinica",
  "administrativo": "administrativo",
  "marketing-ia": "marketing-ia",
  "configuracoes": "configuracoes",
};

function resolvePageInfo(path: string): { titleKey: string; titleFallback: string; categoryId: string; categoryFallback: string } {
  for (const category of NAVIGATION) {
    for (const item of category.items) {
      if (item.path === path) {
        return {
          titleKey: PATH_TO_KEY[item.path] || "",
          titleFallback: item.label,
          categoryId: CATEGORY_ID_MAP[category.id] || "",
          categoryFallback: category.label,
        };
      }
    }
  }
  return { titleKey: "dashboard", titleFallback: "Dashboard", categoryId: "", categoryFallback: "__CLINIC__" };
}

// FIX V35.5: Memoizado para evitar re-renders quando o layout pai atualiza
export const TopBar = memo(function TopBar() {
  const [location] = useLocation();
  const { nomeClinica } = useConfig();
  const { t } = useTranslation();
  const pageInfo = resolvePageInfo(location);

  const title = pageInfo.titleKey
    ? t(`nav.items.${pageInfo.titleKey}`, { defaultValue: pageInfo.titleFallback })
    : pageInfo.titleFallback;

  const categoryRaw = pageInfo.categoryId
    ? t(`nav.categories.${pageInfo.categoryId}`, { defaultValue: pageInfo.categoryFallback })
    : pageInfo.categoryFallback;

  const category = categoryRaw === "__CLINIC__" ? nomeClinica : categoryRaw;

  return (
    <header
      className="h-[56px] flex items-center justify-between px-6 shrink-0 sticky top-0 z-30 transition-colors duration-300"
      style={{
        background: 'rgba(5, 10, 20, 0.88)',
        backdropFilter: 'blur(28px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(28px) saturate(1.2)',
        borderBottom: '1px solid rgba(0, 229, 255, 0.07)',
        boxShadow: '0 4px 28px rgba(0, 0, 0, 0.3), 0 1px 0 rgba(179, 136, 255, 0.04)',
      }}
    >
      {/* Breadcrumb — Dual Neon accent */}
      <div className="flex items-center gap-3">
        <span className="text-[var(--text-muted)] text-sm font-medium tracking-tight">{category}</span>
        <ChevronRight
          className="w-3.5 h-3.5 opacity-50"
          style={{ color: '#B388FF' }}
        />
        <span
          className="text-sm font-bold tracking-tight"
          style={{
            background: 'linear-gradient(135deg, #EEF4FF 0%, #00E5FF 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {title}
        </span>
      </div>

      {/* Ações — Pesquisa Glass, Tema, Notificações */}
      <div className="flex items-center gap-3">
        {/* Pesquisa Global — Glass Effect Violet */}
        <button
          className="flex items-center gap-3 px-4 py-2 rounded-xl text-sm transition-all duration-250 cursor-pointer group"
          style={{
            background: 'rgba(179, 136, 255, 0.04)',
            border: '1px solid rgba(179, 136, 255, 0.10)',
            backdropFilter: 'blur(8px)',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(179, 136, 255, 0.08)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(179, 136, 255, 0.20)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 0 14px rgba(179, 136, 255, 0.08)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(179, 136, 255, 0.04)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(179, 136, 255, 0.10)';
            (e.currentTarget as HTMLElement).style.boxShadow = 'none';
          }}
        >
          <Search className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#B388FF] transition-colors duration-200" />
          <span className="hidden md:block text-xs text-[var(--text-muted)] group-hover:text-[var(--text-secondary)] transition-colors duration-200">
            {t('nav.actions.search')}
          </span>
          <div className="hidden md:flex items-center gap-1">
            <kbd
              className="text-[10px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1 transition-all duration-200"
              style={{
                background: 'rgba(179, 136, 255, 0.07)',
                color: 'var(--text-muted)',
                border: '1px solid rgba(179, 136, 255, 0.14)',
              }}
            >
              <Command className="w-2.5 h-2.5" />K
            </kbd>
          </div>
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notificações */}
        <SmartNotificationCenter />
        <NotificationPanel />
      </div>
    </header>
  );
});
