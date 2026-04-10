/**
 * Sidebar.tsx — Barra Lateral Glassmorphism Navy + Neon Blue
 * DentCare Elite V35 → V41 — Design System v3.0
 *
 * V41: Suporte a sub-itens (children) na navegação para deep-linking direto.
 * Design: Navy deep com glassmorphism, ícones HD com glow neon,
 * hierarquia tipográfica refinada e micro-interações premium
 */

import React, { useState, memo } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, Wrench, ChevronLeft, ChevronRight,
  ChevronDown, ChevronUp, LogOut, Bell, Activity, Share2, Zap,
  FlaskConical, Phone, Heart, Database, Megaphone, Globe, Shield,
  ArrowDownCircle, ArrowUpCircle, List, Send, FileBarChart,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { NAVIGATION, type NavCategory, type NavItem } from "../navigation";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  LayoutDashboard, HeartPulse, Building2, Sparkles, Settings,
  BarChart3, CalendarDays, Users, Smile, ScanLine, ClipboardList,
  TrendingUp, Receipt, Package, UserCog, MessageCircle, Brain,
  Mic, ShieldAlert, Lock, FileCheck, Wrench, Activity, Share2, Zap,
  FlaskConical, Phone, Heart, Database, Megaphone, Globe, Shield,
  ArrowDownCircle, ArrowUpCircle, List, Send, FileBarChart,
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
  "/configuracoes/configurador-clinico": "configurador-clinico",
};

/**
 * V41: Verifica se um path (possivelmente com query params) corresponde à localização atual.
 * Suporta deep-linking: /financeiro?tab=recebimentos
 */
function isPathActive(itemPath: string, currentLocation: string): boolean {
  // Para paths com query params, verificar se o path base + query correspondem
  const [itemBase, itemQuery] = itemPath.split("?");
  const currentFull = currentLocation + (typeof window !== "undefined" ? window.location.search : "");
  const [currentBase, currentQuery] = currentFull.split("?");

  if (itemQuery) {
    // Path com query: verificar base E query
    return currentBase === itemBase && currentFull.includes(itemQuery);
  }
  // Path simples: correspondência exata
  return currentBase === itemBase;
}

// ============================================================
// NavItem — Item de Navegação com Glassmorphism
// ============================================================

interface NavItemProps {
  item: NavItem;
  isCollapsed: boolean;
  isActive: boolean;
  onClick: () => void;
  isChild?: boolean;
}

// FIX V35.5: Memoizado para evitar re-render de todos os itens quando apenas um muda
const SidebarNavItem = memo(function SidebarNavItem({ item, isCollapsed, isActive, onClick, isChild }: NavItemProps) {
  const { t } = useTranslation();
  const IconComponent = ICON_MAP[item.icon];
  const basePath = item.path.split("?")[0];
  const key = PATH_TO_KEY[basePath];
  const label = key ? t(`nav.items.${key}`, { defaultValue: item.label }) : item.label;

  return (
    <button
      onClick={onClick}
      title={isCollapsed ? label : item.description || label}
      aria-label={label}
      aria-current={isActive ? "page" : undefined}
      className={`
        group relative w-full flex items-center gap-3 rounded-xl
        text-nav-label transition-all duration-250 ease-smooth cursor-pointer
        glass-nav-item
        ${isChild ? "px-3 py-2 ml-4 text-[11px]" : "px-3 py-2.5"}
        ${isActive
          ? "glass-nav-item active text-[#F0F6FF]"
          : isChild
            ? "text-[#8FABC4] hover:text-[#C8DFEF]"
            : "text-[#B8CCDF] hover:text-[#E8F4FF]"
        }
        ${isCollapsed ? "justify-center px-2" : ""}
      `}
    >
      {/* Indicador ativo — linha neon esquerda com glow */}
      {isActive && (
        <span className={`absolute left-0 top-1/2 -translate-y-1/2 ${isChild ? "w-[2px] h-5" : "w-[3px] h-7"} rounded-full`}
          style={{
            background: isChild
              ? 'linear-gradient(180deg, #00E5FF 0%, #00E5FF 100%)'
              : 'linear-gradient(180deg, #00E5FF 0%, #B388FF 100%)',
            boxShadow: isChild
              ? '0 0 6px rgba(0, 229, 255, 0.50)'
              : '0 0 10px rgba(0, 229, 255, 0.60), 0 0 20px rgba(179, 136, 255, 0.25)',
          }}
        />
      )}

      {/* Ícone com glow neon */}
      {IconComponent && (
        <IconComponent
          className={`${isChild ? "w-[14px] h-[14px]" : "w-[18px] h-[18px]"} shrink-0 transition-all duration-250`}
          style={isActive
            ? { filter: 'drop-shadow(0 0 6px rgba(0, 229, 255, 0.70))', color: '#00E5FF' }
            : { opacity: isChild ? 0.5 : 0.7 }
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
// V41: NavItemWithChildren — Item com sub-itens expansíveis
// ============================================================

interface NavItemWithChildrenProps {
  item: NavItem;
  isCollapsed: boolean;
  currentPath: string;
  onNavigate: (path: string) => void;
}

function SidebarNavItemWithChildren({ item, isCollapsed, currentPath, onNavigate }: NavItemWithChildrenProps) {
  const basePath = item.path.split("?")[0];
  const isParentActive = currentPath.startsWith(basePath);
  const [isExpanded, setIsExpanded] = useState(isParentActive);

  const handleParentClick = () => {
    if (isCollapsed) {
      // Em modo colapsado, navegar diretamente
      onNavigate(item.path);
    } else {
      // Em modo expandido, toggle dos sub-itens
      setIsExpanded(!isExpanded);
      // Se não está expandido, navegar também
      if (!isExpanded) {
        onNavigate(item.path);
      }
    }
  };

  return (
    <div>
      {/* Item pai */}
      <div className="relative">
        <SidebarNavItem
          item={item}
          isCollapsed={isCollapsed}
          isActive={isParentActive && !item.children?.some(c => isPathActive(c.path, currentPath))}
          onClick={handleParentClick}
        />
        {/* Seta de expansão */}
        {!isCollapsed && item.children && item.children.length > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-[#7A94AD] hover:text-[#00E5FF] transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        )}
      </div>

      {/* Sub-itens */}
      {!isCollapsed && isExpanded && item.children && (
        <div className="mt-0.5 space-y-0.5 relative">
          {/* Linha vertical de conexão */}
          <div
            className="absolute left-[18px] top-0 bottom-0 w-px"
            style={{ background: 'linear-gradient(180deg, rgba(0, 229, 255, 0.15) 0%, rgba(0, 229, 255, 0.05) 100%)' }}
          />
          {item.children.map((child) => (
            <SidebarNavItem
              key={child.path}
              item={child}
              isCollapsed={false}
              isActive={isPathActive(child.path, currentPath)}
              onClick={() => onNavigate(child.path)}
              isChild
            />
          ))}
        </div>
      )}
    </div>
  );
}

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
  const hasActiveItem = category.items.some((item) => {
    const basePath = item.path.split("?")[0];
    if (currentPath === basePath || currentPath.startsWith(basePath + "?")) return true;
    if (item.children) return item.children.some(c => isPathActive(c.path, currentPath));
    return false;
  });

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
        >
          <span className="text-[10px] font-bold tracking-[0.12em] uppercase opacity-80">
            {categoryLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {hasActiveItem && (
              <span className="w-1 h-1 rounded-full bg-[#00E5FF] shadow-[0_0_6px_#00E5FF]" />
            )}
            {isOpen ? (
              <ChevronDown className="w-3 h-3 opacity-40" />
            ) : (
              <ChevronRight className="w-3 h-3 opacity-40" />
            )}
          </div>
        </button>
      ) : (
        <div className="h-px w-8 mx-auto bg-white/5 mb-4" />
      )}

      {/* Itens da Categoria */}
      {isOpen && (
        <div className="space-y-1">
          {category.items.map((item) => (
            <SidebarNavItemWithChildren
              key={item.path}
              item={item}
              isCollapsed={isCollapsed}
              currentPath={currentPath}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Sidebar Principal
// ============================================================

export function Sidebar() {
  const [location, setLocation] = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleNavigate = (path: string) => {
    setLocation(path);
    // V41: Disparar evento customizado para componentes que precisam reagir a mudanças de tab via URL
    if (path.includes("?")) {
      window.dispatchEvent(new CustomEvent("app:navigate", { detail: { path } }));
    }
  };

  return (
    <aside
      className={`
        fixed left-0 top-0 h-screen z-40
        transition-all duration-300 ease-smooth
        flex flex-col
        ${isCollapsed ? "w-20" : "w-64"}
        glass-sidebar
      `}
    >
      {/* Logo Section */}
      <div className={`
        h-20 flex items-center px-6 mb-4
        ${isCollapsed ? "justify-center px-0" : "justify-between"}
      `}>
        {!isCollapsed && (
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#B388FF] p-[1px] shadow-[0_0_15px_rgba(0,229,255,0.3)]">
              <div className="w-full h-full rounded-[11px] bg-[#080F1E] flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-[#00E5FF]" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-black tracking-tight text-white leading-none">
                DentCare
              </span>
              <span className="text-[10px] font-bold text-[#00E5FF] tracking-[0.2em] uppercase mt-1">
                Elite V41
              </span>
            </div>
          </div>
        )}
        {isCollapsed && (
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#B388FF] p-[1px]">
            <div className="w-full h-full rounded-[11px] bg-[#080F1E] flex items-center justify-center">
              <HeartPulse className="w-6 h-6 text-[#00E5FF]" />
            </div>
          </div>
        )}
      </div>

      {/* Navigation Content */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 custom-scrollbar">
        {NAVIGATION.map((category) => (
          <SidebarCategory
            key={category.id}
            category={category}
            isCollapsed={isCollapsed}
            currentPath={location}
            onNavigate={handleNavigate}
          />
        ))}
      </nav>

      {/* Footer Section */}
      <div className="p-3 mt-auto border-t border-white/5 bg-white/[0.02]">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="
            w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
            text-[#7A94AD] hover:text-[#00E5FF] hover:bg-white/5
            transition-all duration-200 group
          "
        >
          {isCollapsed ? (
            <ChevronRight className="w-5 h-5 mx-auto" />
          ) : (
            <>
              <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center group-hover:bg-[#00E5FF]/10 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </div>
              <span className="text-sm font-medium">Recolher Menu</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
