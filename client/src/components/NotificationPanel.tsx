/**
 * NotificationPanel.tsx — Painel de Notificações Real + Laboratórios
 * DentCare Elite V32 — Notificações do sistema em tempo real
 *
 * Funcionalidades:
 * - Painel deslizante ao clicar no sino
 * - Notificações de consultas do dia, alertas de saúde e sistema
 * - Notificações PERSISTENTES de envios para laboratório (até conclusão/remoção manual)
 * - Indicador de atraso em envios laboratoriais
 * - Marcar como lida / remover / limpar
 * - Badge com contagem de não lidas
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useLocation } from "wouter";
import {
  Bell, X, CheckCheck, Calendar, AlertTriangle,
  Info, Heart, Clock, ChevronRight, Trash2,
  FlaskConical, Send, Package, Zap, CheckCircle,
  Truck, Eye, RotateCcw, XCircle, CircleDot,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type TipoNotificacao = "consulta" | "alerta" | "sistema" | "saude" | "laboratorio";

interface Notificacao {
  id: string;
  tipo: TipoNotificacao;
  titulo: string;
  descricao: string;
  hora: string;
  lida: boolean;
  persistente?: boolean; // Não pode ser limpa automaticamente
  alerta?: "normal" | "atencao" | "atrasado";
  envioId?: number; // ID do envio de laboratório (para ações)
  path?: string; // Rota para navegar ao clicar
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const ICONE_ESTADO_LAB: Record<string, React.ComponentType<any>> = {
  criado: CircleDot,
  enviado: Send,
  recebido_lab: Package,
  em_producao: Zap,
  pronto: CheckCircle,
  devolvido: Truck,
  em_prova: Eye,
  ajuste: RotateCcw,
  concluido: CheckCircle,
  cancelado: XCircle,
};

const LABEL_ESTADO_LAB: Record<string, string> = {
  criado: "Criado",
  enviado: "Enviado",
  recebido_lab: "Recebido no Lab",
  em_producao: "Em Produção",
  pronto: "Pronto",
  devolvido: "Devolvido",
  em_prova: "Em Prova",
  ajuste: "Ajuste",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

function iconeParaTipo(tipo: TipoNotificacao) {
  switch (tipo) {
    case "consulta":     return Calendar;
    case "alerta":       return AlertTriangle;
    case "saude":        return Heart;
    case "laboratorio":  return FlaskConical;
    default:             return Info;
  }
}

function corParaTipo(tipo: TipoNotificacao, alerta?: string): string {
  if (tipo === "laboratorio") {
    if (alerta === "atrasado") return "text-semantic-error bg-semantic-error/10 border-semantic-error/20";
    if (alerta === "atencao") return "text-semantic-warning bg-semantic-warning/10 border-semantic-warning/20";
    return "text-violet-400 bg-violet-400/10 border-violet-400/20";
  }
  switch (tipo) {
    case "consulta": return "text-brand-primary bg-brand-primary/10 border-brand-primary/20";
    case "alerta":   return "text-semantic-warning bg-semantic-warning/10 border-semantic-warning/20";
    case "saude":    return "text-semantic-error bg-semantic-error/10 border-semantic-error/20";
    default:         return "text-text-dark-muted bg-bg-dark-elevated border-border-light";
  }
}

// ─── Componente Principal ─────────────────────────────────────────────────────
export function NotificationPanel() {
  const [aberto, setAberto] = useState(false);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [tabNotif, setTabNotif] = useState<"todas" | "laboratorio">("todas");
  const painelRef = useRef<HTMLDivElement>(null);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // FIX v35: Usar endpoints reais existentes no backend
  // consultas.listarPorData não existe — usar consultas.listarConsultas com filtro de data
  const hoje = new Date().toISOString().split("T")[0];
  const amanha = new Date(Date.now() + 86400000).toISOString().split("T")[0];
  const { data: consultasHoje } = trpc.consultas.listarConsultas.useQuery(
    { dataInicio: hoje, dataFim: amanha },
    { enabled: aberto, refetchOnWindowFocus: false }
  );

  // alertasSaude.listar não existe — usar dashboard.obterAlertasSaude
  const { data: alertasSaude } = trpc.dashboard.obterAlertasSaude.useQuery(
    { limite: 5 },
    { enabled: aberto, refetchOnWindowFocus: false }
  );

  // Carregar notificações de laboratório (SEMPRE ativas, polling a cada 30s)
  const { data: labNotifs } = trpc.laboratorios.obterNotificacoes.useQuery(undefined, {
    refetchInterval: 30000, // Polling a cada 30 segundos
    refetchOnWindowFocus: true,
  });

  // Mutations para laboratório
  const removerNotifMut = trpc.laboratorios.removerNotificacao.useMutation({
    onSuccess: () => utils.laboratorios.obterNotificacoes.invalidate(),
  });
  const marcarLidaLabMut = trpc.laboratorios.marcarNotificacaoLida.useMutation({
    onSuccess: () => utils.laboratorios.obterNotificacoes.invalidate(),
  });

  // Construir notificações a partir dos dados reais
  useEffect(() => {
    const novas: Notificacao[] = [];
    const agora = new Date();
    const horaFmt = (d: Date) =>
      d.toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

    // ── Notificações de Laboratório (PERSISTENTES) ──
    if (labNotifs?.notificacoes) {
      labNotifs.notificacoes.forEach((n: any) => {
        const estadoLabel = LABEL_ESTADO_LAB[n.estado] || n.estado;
        const updatedAt = new Date(n.updatedAt);
        const diffMin = Math.round((agora.getTime() - updatedAt.getTime()) / 60000);

        let horaStr = "";
        if (diffMin < 60) horaStr = `${diffMin}min atrás`;
        else if (diffMin < 1440) horaStr = `${Math.floor(diffMin / 60)}h atrás`;
        else horaStr = updatedAt.toLocaleDateString("pt-PT");

        let titulo = `Lab: ${n.tipoTrabalho}`;
        if (n.alerta === "atrasado") titulo = `⚠ ATRASADO: ${n.tipoTrabalho}`;

        novas.push({
          id: `lab-${n.id}`,
          tipo: "laboratorio",
          titulo,
          descricao: `${n.utenteNome || "Utente"} → ${n.laboratorioNome || "Lab"} | ${estadoLabel}`,
          hora: horaStr,
          lida: n.notificacaoLida,
          persistente: true,
          alerta: n.alerta,
          envioId: n.id,
          path: "/laboratorios",
        });
      });
    }

    // ── Consultas de hoje ──
    if (consultasHoje && Array.isArray((consultasHoje as any).consultas)) {
      const lista = (consultasHoje as any).consultas as Array<{
        id: number; utenteNome?: string; dataHoraInicio: string; estado: string;
      }>;
      lista.slice(0, 5).forEach((c) => {
        const dataConsulta = new Date(c.dataHoraInicio);
        const diffMin = Math.round((dataConsulta.getTime() - agora.getTime()) / 60000);
        if (diffMin > 0 && diffMin <= 60) {
          novas.push({
            id: `consulta-${c.id}`,
            tipo: "consulta",
            titulo: "Consulta em breve",
            descricao: `${c.utenteNome ?? "Utente"} — ${horaFmt(dataConsulta)}`,
            hora: `Em ${diffMin} min`,
            lida: false,
          });
        } else if (diffMin <= 0 && diffMin > -30) {
          novas.push({
            id: `consulta-agora-${c.id}`,
            tipo: "consulta",
            titulo: "Consulta a decorrer",
            descricao: `${c.utenteNome ?? "Utente"} — ${horaFmt(dataConsulta)}`,
            hora: "Agora",
            lida: false,
          });
        }
      });
    }

    // ── Alertas de saúde ──
    if (alertasSaude && Array.isArray((alertasSaude as any).alertas)) {
      const lista = (alertasSaude as any).alertas as Array<{
        id: number; utenteNome?: string; tipo: string; descricao?: string;
      }>;
      lista.slice(0, 3).forEach((a) => {
        novas.push({
          id: `alerta-${a.id}`,
          tipo: "saude",
          titulo: a.tipo ?? "Alerta de Saúde",
          descricao: a.utenteNome ? `Utente: ${a.utenteNome}` : (a.descricao ?? ""),
          hora: "Hoje",
          lida: false,
        });
      });
    }

    // Notificação de sistema se não houver nenhuma
    if (novas.length === 0) {
      novas.push({
        id: "sistema-ok",
        tipo: "sistema",
        titulo: "Sistema operacional",
        descricao: "Todos os serviços estão a funcionar normalmente.",
        hora: horaFmt(agora),
        lida: true,
      });
    }

    setNotificacoes((prev) => {
      // Preservar estado de "lida" das notificações NÃO persistentes
      const lidaMap = new Map(prev.filter(n => !n.persistente).map((n) => [n.id, n.lida]));
      return novas.map((n) => ({
        ...n,
        lida: n.persistente ? n.lida : (lidaMap.get(n.id) ?? n.lida),
      }));
    });
  }, [consultasHoje, alertasSaude, labNotifs]);

  // Fechar ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (painelRef.current && !painelRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    }
    if (aberto) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [aberto]);

  // Contagens
  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const labCount = notificacoes.filter(n => n.tipo === "laboratorio").length;
  const labNaoLidas = notificacoes.filter(n => n.tipo === "laboratorio" && !n.lida).length;
  const atrasados = notificacoes.filter(n => n.tipo === "laboratorio" && n.alerta === "atrasado").length;

  const notificacoesFiltradas = tabNotif === "laboratorio"
    ? notificacoes.filter(n => n.tipo === "laboratorio")
    : notificacoes;

  const marcarTodasLidas = useCallback(() => {
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    // Marcar todas as de lab como lidas no servidor
    notificacoes.filter(n => n.tipo === "laboratorio" && !n.lida).forEach(n => {
      if (n.envioId) marcarLidaLabMut.mutate({ id: n.envioId });
    });
  }, [notificacoes]);

  const marcarLida = useCallback((id: string) => {
    const notif = notificacoes.find(n => n.id === id);
    if (notif?.tipo === "laboratorio" && notif.envioId) {
      marcarLidaLabMut.mutate({ id: notif.envioId });
    }
    setNotificacoes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, lida: true } : n))
    );
  }, [notificacoes]);

  const removerNotificacao = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const notif = notificacoes.find(n => n.id === id);
    if (notif?.tipo === "laboratorio" && notif.envioId) {
      removerNotifMut.mutate({ id: notif.envioId });
    }
    setNotificacoes((prev) => prev.filter(n => n.id !== id));
  }, [notificacoes]);

  const limparNaoPersistentes = useCallback(() => {
    setNotificacoes((prev) => {
      const persistentes = prev.filter(n => n.persistente);
      if (persistentes.length === 0) {
        return [{
          id: "sistema-ok",
          tipo: "sistema" as TipoNotificacao,
          titulo: "Sistema operacional",
          descricao: "Todos os serviços estão a funcionar normalmente.",
          hora: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }),
          lida: true,
        }];
      }
      return persistentes;
    });
  }, []);

  const handleClickNotif = useCallback((notif: Notificacao) => {
    marcarLida(notif.id);
    if (notif.path) {
      navigate(notif.path);
      setAberto(false);
    }
  }, [marcarLida, navigate]);

  return (
    <div className="relative" ref={painelRef}>
      {/* Botão sino */}
      <button
        onClick={() => setAberto((v) => !v)}
        aria-label="Notificações"
        className={`
          relative w-10 h-10 flex items-center justify-center rounded-lg
          bg-bg-dark-elevated border transition-all duration-200 cursor-pointer group
          ${aberto
            ? "border-brand-primary/50 bg-brand-primary/10 text-brand-primary"
            : "border-border-light text-text-dark-muted hover:text-text-dark-primary hover:bg-bg-dark-overlay"
          }
        `}
      >
        <Bell className={`w-4 h-4 transition-colors duration-200 ${aberto ? "text-brand-primary" : "group-hover:text-brand-primary"}`} />
        {naoLidas > 0 && (
          <span className={`
            absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1
            ${atrasados > 0 ? "bg-red-500 animate-pulse" : "bg-semantic-error"} text-white text-[10px] font-bold
            rounded-full flex items-center justify-center
            ring-2 ring-bg-dark-base
          `}>
            {naoLidas > 9 ? "9+" : naoLidas}
          </span>
        )}
      </button>

      {/* Painel deslizante */}
      {aberto && (
        <div className="
          absolute right-0 top-12 w-96 z-50
          bg-bg-dark-surface border border-border-light rounded-xl shadow-2xl
          animate-in fade-in slide-in-from-top-2 duration-200
          overflow-hidden
        ">
          {/* Cabeçalho */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border-light bg-bg-dark-elevated/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-primary" />
              <span className="text-sm font-semibold text-text-dark-primary">Notificações</span>
              {naoLidas > 0 && (
                <span className="text-xs bg-brand-primary/20 text-brand-primary px-1.5 py-0.5 rounded-full font-medium">
                  {naoLidas}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {naoLidas > 0 && (
                <button
                  onClick={marcarTodasLidas}
                  title="Marcar todas como lidas"
                  className="p-1.5 rounded-lg text-text-dark-muted hover:text-brand-primary hover:bg-brand-primary/10 transition-all duration-150 cursor-pointer"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={limparNaoPersistentes}
                title="Limpar não-persistentes"
                className="p-1.5 rounded-lg text-text-dark-muted hover:text-semantic-error hover:bg-semantic-error/10 transition-all duration-150 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setAberto(false)}
                className="p-1.5 rounded-lg text-text-dark-muted hover:text-text-dark-primary hover:bg-bg-dark-overlay transition-all duration-150 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tabs de filtro */}
          <div className="flex border-b border-border-light/50">
            <button
              onClick={() => setTabNotif("todas")}
              className={`flex-1 py-2 text-xs font-semibold transition-all cursor-pointer ${
                tabNotif === "todas"
                  ? "text-brand-primary border-b-2 border-brand-primary"
                  : "text-text-dark-muted hover:text-text-dark-secondary"
              }`}
            >
              Todas ({notificacoes.length})
            </button>
            <button
              onClick={() => setTabNotif("laboratorio")}
              className={`flex-1 py-2 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                tabNotif === "laboratorio"
                  ? "text-violet-400 border-b-2 border-violet-400"
                  : "text-text-dark-muted hover:text-text-dark-secondary"
              }`}
            >
              <FlaskConical className="w-3 h-3" />
              Laboratórios ({labCount})
              {labNaoLidas > 0 && (
                <span className="min-w-[16px] h-4 px-1 bg-violet-500/20 text-violet-400 text-[10px] font-bold rounded-full flex items-center justify-center">
                  {labNaoLidas}
                </span>
              )}
            </button>
          </div>

          {/* Alerta de atrasados */}
          {atrasados > 0 && tabNotif !== "todas" && (
            <div className="mx-3 mt-2 px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span className="text-xs text-red-400 font-semibold">
                {atrasados} envio{atrasados > 1 ? "s" : ""} atrasado{atrasados > 1 ? "s" : ""}
              </span>
            </div>
          )}

          {/* Lista de notificações */}
          <div className="max-h-96 overflow-y-auto divide-y divide-border-light/50">
            {notificacoesFiltradas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-text-dark-muted gap-2">
                <Bell className="w-8 h-8 opacity-30" />
                <p className="text-sm">Sem notificações</p>
              </div>
            ) : (
              notificacoesFiltradas.map((notif) => {
                const Icone = notif.tipo === "laboratorio" && notif.alerta === "atrasado"
                  ? AlertTriangle
                  : iconeParaTipo(notif.tipo);
                const cor = corParaTipo(notif.tipo, notif.alerta);

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleClickNotif(notif)}
                    className={`
                      w-full flex items-start gap-3 px-4 py-3 text-left
                      transition-all duration-150 group cursor-pointer relative
                      ${notif.lida
                        ? "bg-transparent hover:bg-bg-dark-elevated/50 opacity-70"
                        : notif.alerta === "atrasado"
                          ? "bg-red-500/5 hover:bg-red-500/10"
                          : "bg-brand-primary/5 hover:bg-brand-primary/10"
                      }
                    `}
                  >
                    <div className={`mt-0.5 w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${cor}`}>
                      <Icone className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className={`text-xs font-semibold truncate ${notif.lida ? "text-text-dark-muted" : "text-text-dark-primary"}`}>
                          {notif.titulo}
                        </p>
                        <div className="flex items-center gap-1 shrink-0">
                          {!notif.lida && (
                            <span className={`w-1.5 h-1.5 rounded-full ${notif.alerta === "atrasado" ? "bg-red-400 animate-pulse" : "bg-brand-primary"}`} />
                          )}
                          {notif.persistente && (
                            <button
                              onClick={(e) => removerNotificacao(notif.id, e)}
                              title="Remover notificação"
                              className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-red-500/10 text-text-dark-muted hover:text-red-400 transition-all"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-text-dark-muted truncate mt-0.5">{notif.descricao}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5 text-text-dark-tertiary" />
                          <span className="text-[10px] text-text-dark-tertiary">{notif.hora}</span>
                        </div>
                        {notif.persistente && (
                          <span className="text-[9px] text-violet-400/60 font-semibold uppercase tracking-wider">Persistente</span>
                        )}
                        {notif.alerta === "atrasado" && (
                          <span className="text-[9px] text-red-400 font-bold uppercase tracking-wider animate-pulse">Atrasado</span>
                        )}
                        {notif.alerta === "atencao" && (
                          <span className="text-[9px] text-amber-400 font-bold uppercase tracking-wider">Atenção</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Rodapé */}
          <div className="px-4 py-2.5 border-t border-border-light bg-bg-dark-elevated/30">
            <button
              onClick={() => { navigate("/laboratorios"); setAberto(false); }}
              className="
                w-full flex items-center justify-center gap-1.5
                text-xs text-text-dark-muted hover:text-violet-400
                transition-colors duration-150 py-1 cursor-pointer
              "
            >
              <FlaskConical className="w-3 h-3" />
              <span>Ver todos os envios de laboratório</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
