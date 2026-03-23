/**
 * Sidebar.tsx — Barra Lateral Glassmorphism Navy + Neon Blue
 * DentCare Elite V35 — Design System v3.0
 *
 * Design: Navy deep com glassmorphism, ícones HD com glow neon,
 * hierarquia tipográfica refinada e micro-interações premium
 */

import React, { useState, memo, useCallback } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, Wrench, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, LogOut, Bell, Activity, Share2, Zap,
  FlaskConical, Phone, Heart, Database,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAVIGATION, type NavCategory, type NavItem } from "../navigation";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, Wrench, Activity, Share2, Zap,
  FlaskConical, Phone, Heart, Database,
};

const BADGE_CLASSES: Record<string, string> = {
  IA: "badge-nav-ia",
  Elite: "badge-nav-elite",
  Pro: "badge-nav-pro",
  Novo: "badge-nav-novo",
  MCP: "badge-nav-ia",
  V35: "badge-nav-ia",
};

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
  "/migracao": "migracao",
};

// ============================================================
// NavItem — Item de Navegação com Glassmorphism
// ============================================================

interface NavItemProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
}

// FIX V35.5: Memoizado para evitar re-render de todos os itens quando apenas um muda
const SidebarNavItem = memo(function SidebarNavItem({ item, isCollapsed, isActive, onClick }: NavItemProps) {
  const { t } = useTranslation();
  const IconComponent = ICON_MAP[item.icon];
  const key = PATH_TO_KEY[item.path];
  const label = key ? t(`nav.items.${key}`, { defaultValue: item.label }) : item.label;

  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : undefined}
      className={`
        group relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
        text-nav-label transition-all duration-250 ease-smooth cursor-pointer
        glass-nav-item
        ${isActive
          ? "glass-nav-item active text-[#F0F6FF]"
          : "text-[#B8CCDF] hover:text-[#E8F4FF]"
        }
        ${isCollapsed ? "justify-center px-2" : ""}
      `}
    >
      {/* Indicador ativo — linha neon esquerda com glow */}
      {isActive && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-7 rounded-full"
          style={{
            background: 'linear-gradient(180deg, #00E5FF 0%, #B388FF 100%)',
            boxShadow: '0 0 10px rgba(0, 229, 255, 0.60), 0 0 20px rgba(179, 136, 255, 0.25)',
          }}
        />
      )}

      {/* Ícone com glow neon */}
      {IconComponent && (
        <IconComponent
          className="w-[18px] h-[18px] shrink-0 transition-all duration-250"
          style={isActive
            ? { filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.70))', color: '#00E5FF' }
            : { opacity: 0.7 }
          }
        />
      )}

      {/* Label e Badge */}
      {!isCollapsed && (
        <>
          <span className="flex-1 text-left truncate">{label}</span>
          {item.badge && (
            <span className={`${BADGE_CLASSES[item.badge] || BADGE_CLASSES.Novo} text-nav-badge`}>
              {item.badge}
            </span>
          )}
        </>
      )}

      {/* Tooltip glassmorphism para modo colapsado */}
      {isCollapsed && (
        <div className="
          absolute left-full ml-3 px-3 py-2
          rounded-lg whitespace-nowrap z-50
          opacity-0 group-hover:opacity-100 pointer-events-none
          transition-all duration-200
          text-[var(--text-primary)] text-xs font-semibold
        " style={{
          background: 'rgba(8, 15, 30, 0.92)',
          backdropFilter: 'blur(20px)',
          border: '1px solid rgba(0, 229, 255, 0.18)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5), 0 0 1px rgba(0, 229, 255, 0.12)',
        }}>
          {label}
        </div>
      )}
    </button>
  );
});

// ============================================================
// NavCategory — Categoria com Glassmorphism
// ============================================================

interface NavCategoryProps {
  category: NavCategory;
  isCollapsed: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
}

function SidebarCategory({ category, isCollapsed, currentPath, onNavigate }: NavCategoryProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(true);
  const hasActiveItem = category.items.some((item) => currentPath === item.path);
  const CategoryIcon = ICON_MAP[category.icon];
  const categoryLabel = t(`nav.categories.${category.id}`, { defaultValue: category.label });

  return (
    <div className="mb-3">
      {/* Header da Categoria */}
      {!isCollapsed ? (
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            w-full flex items-center justify-between px-3 py-2 mb-1.5 rounded-lg
            transition-all duration-200 cursor-pointer
            ${hasActiveItem
              ? "text-[#B8CCDF]"
              : "text-[#7A94AD] hover:text-[#B8CCDF]"
            }
          `}
          style={hasActiveItem ? { background: 'rgba(0, 229, 255, 0.04)' } : {}}
        >
          <div className="flex items-center gap-2.5">
            {CategoryIcon && (
              <CategoryIcon
                className="w-4 h-4 shrink-0"
                style={hasActiveItem
                  ? { filter: 'drop-shadow(0 0 5px rgba(0, 229, 255, 0.40))', color: '#00E5FF' }
                  : { opacity: 0.6 }
                }
              />
            )}
            <span className="text-nav-category">
              {categoryLabel}
            </span>
          </div>
          {isOpen ? (
            <ChevronUp className="w-3 h-3 opacity-50 transition-transform duration-200" />
          ) : (
            <ChevronDown className="w-3 h-3 opacity-50 transition-transform duration-200" />
          )}
        </button>
      ) : (
        <div className="flex justify-center py-2 mb-2">
          <div className="w-6 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(0, 229, 255, 0.18), rgba(179, 136, 255, 0.12), transparent)' }} />
        </div>
      )}

      {/* Itens da Categoria */}
      {(isOpen || isCollapsed) && (
        <div className="space-y-0.5">
          {category.items.map((item) => (
            <SidebarNavItem
              key={item.path}
              item={item}
              isCollapsed={isCollapsed}
              isActive={currentPath === item.path}
              onClick={() => onNavigate(item.path)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sidebar Principal — Glassmorphism Navy
// ============================================================

// FIX V35.5: Memoizado para evitar re-renders quando o layout pai atualiza
export const Sidebar = memo(function Sidebar() {
  const [location, navigate] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { data: user } = trpc.auth.me.useQuery();
  const { nomeClinica } = useConfig();
  const { t } = useTranslation();
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => { navigate("/"); },
  });

  const sidebarWidth = isCollapsed ? "w-[72px]" : "w-[248px]";

  return (
    <aside
      className={`
        ${sidebarWidth} shrink-0 flex flex-col relative
        glass-sidebar
        transition-all duration-300 ease-smooth
        h-screen sticky top-0 overflow-hidden
      `}
    >
      {/* ── Orb decorativo de fundo ── */}
      <div className="absolute -top-20 -left-20 w-40 h-40 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(0, 229, 255, 0.10) 0%, rgba(179, 136, 255, 0.06) 50%, transparent 70%)', filter: 'blur(40px)' }}
      />

      {/* ── Logo e Branding ── */}
      <div className={`
        flex items-center h-[68px] px-4 shrink-0
        ${isCollapsed ? "justify-center" : "gap-3"}
      `} style={{ borderBottom: '1px solid rgba(0, 229, 255, 0.09)' }}>
        {!isCollapsed ? (
          <img
            src="/logos/icon.png"
            alt="DentCare"
            className="h-8 w-8 shrink-0 rounded-lg"
            style={{ filter: 'drop-shadow(0 0 10px rgba(0, 229, 255, 0.40))' }}
          />
        ) : (
          <img
            src="/logos/icon.png"
            alt="DentCare"
            className="w-9 h-9 rounded-xl shrink-0"
            style={{
              boxShadow: '0 0 20px rgba(0, 229, 255, 0.35), 0 4px 14px rgba(0, 0, 0, 0.4)',
            }}
          />
        )}

        {!isCollapsed && (
          <div className="min-w-0 flex-1">
            <p className="text-sidebar-brand text-[var(--text-primary)]" title={nomeClinica}>
              {nomeClinica.length > 16 ? nomeClinica.slice(0, 16) + '\u2026' : nomeClinica}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: '#00E5FF', boxShadow: '0 0 8px rgba(0, 229, 255, 0.65)' }}
              />
              <p className="text-sidebar-version text-[var(--text-muted)]">
                Elite V35
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Navegação Principal ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-4 px-2.5 scrollbar-premium">
        {NAVIGATION.map((category) => (
          <SidebarCategory
            key={category.id}
            category={category}
            isCollapsed={isCollapsed}
            currentPath={location}
            onNavigate={(path) => navigate(path)}
          />
        ))}
      </nav>

      {/* ── Rodapé ── */}
      <div className="shrink-0 p-2.5 space-y-1.5" style={{ borderTop: '1px solid rgba(0, 229, 255, 0.09)' }}>
        {/* Notificações */}
        <button
          title={t('nav.actions.notifications')}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-[#B8CCDF] hover:text-[#F0F6FF]
            text-nav-label transition-all duration-200 cursor-pointer
            glass-nav-item
            ${isCollapsed ? "justify-center px-2" : ""}
          `}
          style={{ background: 'transparent' }}
        >
          <Bell className="w-[18px] h-[18px] shrink-0" style={{ opacity: 0.7 }} />
          {!isCollapsed && <span>{t('nav.actions.notifications')}</span>}
        </button>

        {/* Perfil do Utilizador */}
        {user && (
          <div className={`
            flex items-center gap-3 px-3 py-3 rounded-xl
            transition-all duration-200
            ${isCollapsed ? "justify-center" : ""}
          `} style={{
            background: 'rgba(0, 229, 255, 0.04)',
            border: '1px solid rgba(0, 229, 255, 0.09)',
            backdropFilter: 'blur(8px)',
          }}>
            <div className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #00E5FF 0%, #B388FF 100%)',
                boxShadow: '0 0 14px rgba(0, 229, 255, 0.30)',
              }}
            >
              <span className="text-[#050A14] font-bold text-[11px]">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sidebar-user text-[#F0F6FF] truncate">
                  {user.name}
                </p>
                <p className="text-sidebar-role text-[#7A94AD] capitalize truncate mt-0.5">
                  {user.role}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Logout */}
        <button
          onClick={() => logoutMutation.mutate()}
          title={t('nav.actions.logout')}
          className={`
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-[#A8BFDA] hover:text-[#FF2D6B]
            text-nav-label transition-all duration-200 cursor-pointer
            ${isCollapsed ? "justify-center px-2" : ""}
          `}
          style={{ background: 'transparent' }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(255, 45, 107, 0.07)'; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <LogOut className="w-[18px] h-[18px] shrink-0" style={{ opacity: 0.7 }} />
          {!isCollapsed && <span>{t('nav.actions.logout')}</span>}
        </button>
      </div>

      {/* ── Botão de Colapso — Neon accent ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="
          absolute -right-3 top-[68px]
          w-6 h-6 rounded-full
          flex items-center justify-center
          transition-all duration-200 z-10 cursor-pointer
          hover:scale-110
        "
        style={{
          background: '#0C1526',
          border: '1px solid rgba(0, 229, 255, 0.22)',
          color: '#6A8BAD',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 4px rgba(0, 229, 255, 0.10)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 229, 255, 0.50)';
          (e.currentTarget as HTMLElement).style.color = '#00E5FF';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 14px rgba(0, 229, 255, 0.20), 0 0 10px rgba(0, 229, 255, 0.14)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(0, 229, 255, 0.22)';
          (e.currentTarget as HTMLElement).style.color = '#6A8BAD';
          (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.4), 0 0 4px rgba(0, 229, 255, 0.10)';
        }}
        title={isCollapsed ? t('nav.actions.expand') : t('nav.actions.collapse')}
      >
        {isCollapsed ? (
          <ChevronRight className="w-3 h-3" />
        ) : (
          <ChevronLeft className="w-3 h-3" />
        )}
      </button>
    </aside>
  );
});
