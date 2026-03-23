/**
 * SmartNotificationCenter.tsx — Centro de Notificações Inteligente
 * DentCare V35 — Notificações em Tempo Real
 *
 * Funcionalidades:
 * - Badge animado com contagem de não lidas
 * - Painel dropdown com notificações agrupadas por prioridade
 * - Ações rápidas diretamente nas notificações
 * - Marcar como lida/todas lidas
 * - Filtros por tipo e prioridade
 * - Animações suaves
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "../lib/trpc";
import {
  Bell, X, Check, CheckCheck, Trash2, Calendar, Euro,
  Users, AlertTriangle, Settings, MessageCircle, Package,
  Brain, ChevronRight, Filter, Sparkles,
} from "lucide-react";

// ─── Ícones e Cores por Tipo ────────────────────────────────────────────────

const TIPO_CONFIG: Record<string, { icon: React.ReactNode; cor: string; label: string }> = {
  consulta: { icon: <Calendar className="w-4 h-4" />, cor: "text-blue-400", label: "Consulta" },
  pagamento: { icon: <Euro className="w-4 h-4" />, cor: "text-emerald-400", label: "Pagamento" },
  utente: { icon: <Users className="w-4 h-4" />, cor: "text-violet-400", label: "Utente" },
  alerta: { icon: <AlertTriangle className="w-4 h-4" />, cor: "text-amber-400", label: "Alerta" },
  sistema: { icon: <Settings className="w-4 h-4" />, cor: "text-gray-400", label: "Sistema" },
  marketing: { icon: <MessageCircle className="w-4 h-4" />, cor: "text-green-400", label: "Marketing" },
  laboratorio: { icon: <Package className="w-4 h-4" />, cor: "text-pink-400", label: "Laboratório" },
  stock: { icon: <Package className="w-4 h-4" />, cor: "text-cyan-400", label: "Stock" },
  ia: { icon: <Brain className="w-4 h-4" />, cor: "text-purple-400", label: "IA" },
};

const PRIORIDADE_CONFIG: Record<string, { cor: string; bgCor: string; label: string }> = {
  critica: { cor: "text-red-400", bgCor: "bg-red-500/10 border-red-500/20", label: "Crítica" },
  alta: { cor: "text-amber-400", bgCor: "bg-amber-500/10 border-amber-500/20", label: "Alta" },
  media: { cor: "text-blue-400", bgCor: "bg-blue-500/10 border-blue-500/20", label: "Média" },
  baixa: { cor: "text-gray-400", bgCor: "bg-gray-500/10 border-gray-500/20", label: "Baixa" },
};

// ─── Componente Principal ───────────────────────────────────────────────────

export function SmartNotificationCenter() {
  const [aberto, setAberto] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Queries tRPC
  const { data: contagemData, refetch: refetchContagem } = trpc.notificacoes.contarNaoLidas.useQuery(
    undefined,
    { refetchInterval: 30000 } // Atualizar a cada 30 segundos
  );

  const { data: listaData, refetch: refetchLista } = trpc.notificacoes.listar.useQuery(
    { limite: 30, apenasNaoLidas: false, tipo: filtroTipo as any },
    { enabled: aberto }
  );

  // Mutations
  const marcarLida = trpc.notificacoes.marcarLida.useMutation({
    onSuccess: () => { refetchContagem(); refetchLista(); },
  });
  const marcarTodasLidas = trpc.notificacoes.marcarTodasLidas.useMutation({
    onSuccess: () => { refetchContagem(); refetchLista(); },
  });
  const eliminar = trpc.notificacoes.eliminar.useMutation({
    onSuccess: () => { refetchContagem(); refetchLista(); },
  });

  const totalNaoLidas = contagemData?.total || 0;
  const notificacoes = listaData?.notificacoes || [];

  // Fechar ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    if (aberto) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [aberto]);

  // Formatar tempo relativo
  const tempoRelativo = (data: string | Date) => {
    const diff = Date.now() - new Date(data).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "agora";
    if (mins < 60) return `${mins}m`;
    const horas = Math.floor(mins / 60);
    if (horas < 24) return `${horas}h`;
    const dias = Math.floor(horas / 24);
    return `${dias}d`;
  };

  return (
    <div ref={panelRef} className="relative">
      {/* Botão Bell com Badge */}
      <button
        onClick={() => setAberto(!aberto)}
        className="relative p-2 rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-all duration-200"
        title="Notificações"
      >
        <Bell className="w-5 h-5" />
        {totalNaoLidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] font-bold text-white bg-red-500 rounded-full animate-pulse">
            {totalNaoLidas > 99 ? "99+" : totalNaoLidas}
          </span>
        )}
      </button>

      {/* Painel Dropdown */}
      {aberto && (
        <div className="absolute right-0 top-full mt-2 w-[380px] max-h-[520px] bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-2xl shadow-2xl overflow-hidden z-[9998] animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-lighter)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: '#00E5FF' }} />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Notificações</h3>
              {totalNaoLidas > 0 && (
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full" style={{ color: '#00E5FF', background: 'rgba(0, 229, 255, 0.10)' }}>
                  {totalNaoLidas} nova{totalNaoLidas > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {totalNaoLidas > 0 && (
                <button
                  onClick={() => marcarTodasLidas.mutate()}
                  className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-primary)] hover:bg-[var(--accent-subtle)] transition-colors"
                  title="Marcar todas como lidas"
                >
                  <CheckCheck className="w-4 h-4" />
                </button>
              )}
              <button
                onClick={() => setAberto(false)}
                className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-subtle)] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Filtros rápidos */}
          <div className="flex items-center gap-1.5 px-3 py-2 border-b border-[var(--border-lightest)] overflow-x-auto">
            <button
              onClick={() => setFiltroTipo(null)}
              className={`px-2.5 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors ${
                !filtroTipo ? "bg-[var(--accent-subtle)] text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
              }`}
            >
              Todas
            </button>
            {["consulta", "pagamento", "alerta", "ia", "marketing"].map(tipo => (
              <button
                key={tipo}
                onClick={() => setFiltroTipo(filtroTipo === tipo ? null : tipo)}
                className={`px-2.5 py-1 text-[10px] font-medium rounded-full whitespace-nowrap transition-colors ${
                  filtroTipo === tipo ? "bg-[var(--accent-subtle)] text-[var(--accent-primary)]" : "text-[var(--text-muted)] hover:bg-[var(--bg-subtle)]"
                }`}
              >
                {TIPO_CONFIG[tipo]?.label || tipo}
              </button>
            ))}
          </div>

          {/* Lista de Notificações */}
          <div className="max-h-[380px] overflow-y-auto">
            {notificacoes.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <Bell className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2 opacity-30" />
                <p className="text-[var(--text-muted)] text-sm">Sem notificações</p>
                <p className="text-[var(--text-tertiary)] text-xs mt-1">Está tudo em dia!</p>
              </div>
            ) : (
              notificacoes.map((notif: any) => {
                const tipoConf = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.sistema;
                const prioConf = PRIORIDADE_CONFIG[notif.prioridade] || PRIORIDADE_CONFIG.media;

                return (
                  <div
                    key={notif.id}
                    className={`group flex items-start gap-3 px-4 py-3 border-b border-[var(--border-lightest)] transition-colors ${
                      !notif.lida ? "bg-[var(--accent-subtle)]" : ""
                    } hover:bg-[var(--bg-subtle)]`}
                  >
                    {/* Ícone */}
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      !notif.lida ? "bg-[var(--accent-subtle)]" : "bg-[var(--bg-elevated)]"
                    }`}>
                      <span className={tipoConf.cor}>{tipoConf.icon}</span>
                    </div>

                    {/* Conteúdo */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-xs font-semibold truncate ${
                          !notif.lida ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                        }`}>
                          {notif.titulo}
                        </p>
                        {!notif.lida && (
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ background: '#00E5FF' }} />
                        )}
                      </div>
                      <p className="text-[var(--text-muted)] text-[11px] mt-0.5 line-clamp-2">
                        {notif.mensagem}
                      </p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className={`px-1.5 py-0.5 text-[9px] font-medium rounded border ${prioConf.bgCor} ${prioConf.cor}`}>
                          {prioConf.label}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px]">
                          {tempoRelativo(notif.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      {!notif.lida && (
                        <button
                          onClick={() => marcarLida.mutate({ id: notif.id })}
                          className="p-1 rounded-md text-[var(--text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                          title="Marcar como lida"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => eliminar.mutate({ id: notif.id })}
                        className="p-1 rounded-md text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
