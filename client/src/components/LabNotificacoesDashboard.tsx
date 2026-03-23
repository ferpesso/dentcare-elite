/**
 * LabNotificacoesDashboard.tsx — Widget de Notificações de Laboratório para o Dashboard
 * DentCare Elite V35 — Mostra envios ativos como cards persistentes no dashboard
 *
 * Funcionalidades:
 * - Cards de envios ativos com estado visual
 * - Indicador de atraso com animação
 * - Ação rápida para navegar aos detalhes
 * - Botão para remover/concluir notificação
 * - Contagem de ativos e atrasados
 */

import React from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  FlaskConical, Send, Package, Zap, CheckCircle, Truck,
  Eye, RotateCcw, XCircle, CircleDot, AlertTriangle,
  ChevronRight, Clock, User, Building2, X, ArrowRight,
} from "lucide-react";

// ─── Constantes ──────────────────────────────────────────────────────────────

const ESTADOS_CONFIG: Record<string, { label: string; cor: string; bg: string; border: string; icone: React.ComponentType<any> }> = {
  criado:        { label: "Criado",        cor: "text-slate-400",   bg: "bg-slate-400/10",   border: "border-slate-400/20",   icone: CircleDot },
  enviado:       { label: "Enviado",       cor: "text-blue-400",    bg: "bg-blue-400/10",    border: "border-blue-400/20",    icone: Send },
  recebido_lab:  { label: "Recebido Lab",  cor: "text-[#B388FF]",    bg: "bg-[#B388FF]/10",  border: "border-[#B388FF]/20",  icone: Package },
  em_producao:   { label: "Em Produção",   cor: "text-amber-400",   bg: "bg-amber-400/10",   border: "border-amber-400/20",   icone: Zap },
  pronto:        { label: "Pronto",        cor: "text-cyan-400",    bg: "bg-cyan-400/10",    border: "border-cyan-400/20",    icone: CheckCircle },
  devolvido:     { label: "Devolvido",     cor: "text-teal-400",    bg: "bg-teal-400/10",    border: "border-teal-400/20",    icone: Truck },
  em_prova:      { label: "Em Prova",      cor: "text-violet-400",  bg: "bg-violet-400/10",  border: "border-violet-400/20",  icone: Eye },
  ajuste:        { label: "Ajuste",        cor: "text-orange-400",  bg: "bg-orange-400/10",  border: "border-orange-400/20",  icone: RotateCcw },
  concluido:     { label: "Concluído",     cor: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20", icone: CheckCircle },
  cancelado:     { label: "Cancelado",     cor: "text-red-400",     bg: "bg-red-400/10",     border: "border-red-400/20",     icone: XCircle },
};

// ─── Componente ──────────────────────────────────────────────────────────────

export function LabNotificacoesDashboard() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data } = trpc.laboratorios.obterNotificacoes.useQuery(undefined, {
    refetchInterval: 30000,
    refetchOnWindowFocus: true,
  });

  const removerMut = trpc.laboratorios.removerNotificacao.useMutation({
    onSuccess: () => utils.laboratorios.obterNotificacoes.invalidate(),
  });

  const notificacoes = data?.notificacoes ?? [];
  const atrasados = notificacoes.filter((n: any) => n.alerta === "atrasado").length;

  if (notificacoes.length === 0) return null;

  return (
    <div className="card-premium border border-violet-500/20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 bg-violet-500/5 border-b border-violet-500/10">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <FlaskConical className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              Envios de Laboratório
              <span className="text-xs font-semibold bg-violet-500/20 text-violet-400 px-2 py-0.5 rounded-full">
                {notificacoes.length} ativo{notificacoes.length !== 1 ? "s" : ""}
              </span>
              {atrasados > 0 && (
                <span className="text-xs font-bold bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full animate-pulse">
                  {atrasados} atrasado{atrasados !== 1 ? "s" : ""}
                </span>
              )}
            </h3>
          </div>
        </div>
        <button
          onClick={() => navigate("/laboratorios")}
          className="flex items-center gap-1 text-xs text-violet-400 hover:text-violet-300 font-semibold transition-all cursor-pointer"
        >
          Ver todos <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Cards de envios */}
      <div className="p-4 space-y-2">
        {notificacoes.slice(0, 8).map((notif: any) => {
          const cfg = ESTADOS_CONFIG[notif.estado] || ESTADOS_CONFIG.criado;
          const Icon = cfg.icone;
          const isAtrasado = notif.alerta === "atrasado";
          const isAtencao = notif.alerta === "atencao";

          return (
            <div
              key={notif.id}
              onClick={() => navigate("/laboratorios")}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer group
                ${isAtrasado
                  ? "bg-red-500/5 border border-red-500/20 hover:bg-red-500/10"
                  : isAtencao
                    ? "bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10"
                    : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)] hover:bg-[var(--bg-subtle)]"
                }
              `}
            >
              {/* Ícone de estado */}
              <div className={`w-8 h-8 rounded-lg ${cfg.bg} border ${cfg.border} flex items-center justify-center shrink-0`}>
                <Icon className={`w-4 h-4 ${cfg.cor}`} />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[var(--text-primary)] truncate">{notif.tipoTrabalho}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${cfg.cor} ${cfg.bg}`}>
                    {cfg.label}
                  </span>
                  {isAtrasado && (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider text-red-400 bg-red-400/10 animate-pulse">
                      Atrasado
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-0.5 text-[10px] text-[var(--text-muted)]">
                  <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" /> {notif.utenteNome || "—"}</span>
                  <span className="flex items-center gap-0.5"><Building2 className="w-2.5 h-2.5" /> {notif.laboratorioNome || "—"}</span>
                  {notif.dataPrevistaDevolucao && (
                    <span className={`flex items-center gap-0.5 ${isAtrasado ? "text-red-400 font-semibold" : ""}`}>
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(notif.dataPrevistaDevolucao).toLocaleDateString("pt-PT")}
                    </span>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => { e.stopPropagation(); removerMut.mutate({ id: notif.id }); }}
                  title="Remover do dashboard"
                  className="p-1 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-[var(--text-muted)] hover:text-red-400 transition-all cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
          );
        })}

        {notificacoes.length > 8 && (
          <button
            onClick={() => navigate("/laboratorios")}
            className="w-full py-2 text-center text-xs text-violet-400 hover:text-violet-300 font-semibold transition-all cursor-pointer"
          >
            + {notificacoes.length - 8} mais envios ativos
          </button>
        )}
      </div>
    </div>
  );
}
