/**
 * PainelConfirmacaoLote.tsx — Painel de Confirmação em Lote
 * DentCare Elite V35 — Comunicação Integrada
 *
 * Funcionalidades:
 * - Enviar pedido de confirmação WhatsApp a TODOS os utentes do dia seguinte
 * - Selecionar/desselecionar utentes individualmente
 * - Progresso visual do envio em lote
 * - Resumo de estados (quantos confirmados, pendentes, cancelados)
 * - Botão de envio de lembretes em massa
 */
import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import {
  Send, CheckCircle2, XCircle, AlertCircle, Loader2, X,
  MessageCircle, Bell, Users, Calendar, Clock, Check,
  ChevronDown, ChevronUp, Phone, User,
} from "lucide-react";
import { format, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
}

interface ConsultaLote {
  id: number;
  utenteNome: string;
  utenteTelemovel?: string;
  medicoNome: string;
  dataHoraInicio: string;
  dataHoraFim: string;
  tipoConsulta: string | null;
  estado: string;
}

type EnvioEstado = "pendente" | "enviando" | "enviado" | "erro" | "sem_telefone";

export function PainelConfirmacaoLote({ onClose, onSuccess }: Props) {
  const amanha = addDays(new Date(), 1);
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [envioEstados, setEnvioEstados] = useState<Record<number, EnvioEstado>>({});
  const [enviando, setEnviando] = useState(false);
  const [modo, setModo] = useState<"confirmacao" | "lembrete">("confirmacao");
  const [concluido, setConcluido] = useState(false);

  // Buscar consultas do dia seguinte
  const consultasQ = trpc.consultas.list.useQuery({
    dataInicio: startOfDay(amanha) as any,
    dataFim: endOfDay(amanha) as any,
  });

  const consultas: ConsultaLote[] = useMemo(() => {
    const raw = (consultasQ.data as any)?.consultas ?? [];
    return raw.filter((c: any) => c.estado === "agendada" || c.estado === "confirmada");
  }, [consultasQ.data]);

  // Inicializar seleção com todos que têm telemóvel
  useMemo(() => {
    const comTelefone = consultas.filter(c => c.utenteTelemovel).map(c => c.id);
    setSelecionados(new Set(comTelefone));
  }, [consultas.length]);

  const toggleSelecionado = (id: number) => {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleTodos = () => {
    if (selecionados.size === consultas.filter(c => c.utenteTelemovel).length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(consultas.filter(c => c.utenteTelemovel).map(c => c.id)));
    }
  };

  // Mutations
  const enviarConfirmacaoMutation = trpc.whatsapp.enviarConfirmacao.useMutation();
  const enviarLembreteMutation = trpc.whatsapp.enviarLembrete.useMutation();

  const handleEnviarLote = async () => {
    setEnviando(true);
    const consultasSelecionadas = consultas.filter(c => selecionados.has(c.id));

    // Marcar sem telefone
    const estados: Record<number, EnvioEstado> = {};
    consultasSelecionadas.forEach(c => {
      estados[c.id] = c.utenteTelemovel ? "pendente" : "sem_telefone";
    });
    setEnvioEstados({ ...estados });

    // Enviar sequencialmente (para não sobrecarregar a API)
    for (const c of consultasSelecionadas) {
      if (!c.utenteTelemovel) continue;

      setEnvioEstados(prev => ({ ...prev, [c.id]: "enviando" }));

      try {
        const data = format(new Date(c.dataHoraInicio), "dd/MM/yyyy");
        const hora = format(new Date(c.dataHoraInicio), "HH:mm");

        if (modo === "confirmacao") {
          await enviarConfirmacaoMutation.mutateAsync({
            consultaId: c.id,
            utenteName: c.utenteNome,
            data,
            hora,
            medicoNome: c.medicoNome,
            utenteTelefone: c.utenteTelemovel,
            tipoConsulta: c.tipoConsulta || "Consulta",
          });
        } else {
          await enviarLembreteMutation.mutateAsync({
            consultaId: c.id,
            utenteName: c.utenteNome,
            consultaTime: hora,
            utenteTelefone: c.utenteTelemovel,
            medicoNome: c.medicoNome,
            tipoConsulta: c.tipoConsulta || "Consulta",
            consultaData: data,
          });
        }

        setEnvioEstados(prev => ({ ...prev, [c.id]: "enviado" }));
      } catch {
        setEnvioEstados(prev => ({ ...prev, [c.id]: "erro" }));
      }

      // Pequeno delay entre envios
      await new Promise(r => setTimeout(r, 500));
    }

    setEnviando(false);
    setConcluido(true);
    onSuccess();
  };

  const totalSelecionados = selecionados.size;
  const totalComTelefone = consultas.filter(c => c.utenteTelemovel).length;
  const totalSemTelefone = consultas.length - totalComTelefone;
  const totalEnviados = Object.values(envioEstados).filter(e => e === "enviado").length;
  const totalErros = Object.values(envioEstados).filter(e => e === "erro").length;

  const progresso = totalSelecionados > 0
    ? Math.round(((totalEnviados + totalErros) / totalSelecionados) * 100)
    : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-primary)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <Send className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[var(--text-primary)] font-bold text-lg">
                {modo === "confirmacao" ? "Enviar Confirmações" : "Enviar Lembretes"} — Amanhã
              </h2>
              <p className="text-[var(--text-muted)] text-xs">
                {format(amanha, "EEEE, d 'de' MMMM", { locale: ptBR })} — {consultas.length} consulta{consultas.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-secondary)] hover:text-red-400 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modo de envio */}
        <div className="p-4 border-b border-[var(--border-primary)] shrink-0">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setModo("confirmacao")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                modo === "confirmacao"
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              Pedir Confirmação (com botões)
            </button>
            <button
              onClick={() => setModo("lembrete")}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                modo === "lembrete"
                  ? "bg-amber-500/20 border border-amber-500/30 text-amber-400"
                  : "bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-muted)]"
              }`}
            >
              <Bell className="w-4 h-4" />
              Enviar Lembrete
            </button>
          </div>
        </div>

        {/* Barra de progresso (quando enviando) */}
        {enviando && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-xs font-bold">A enviar... {totalEnviados + totalErros}/{totalSelecionados}</span>
              <span className="text-[#00E5FF] text-xs font-bold">{progresso}%</span>
            </div>
            <div className="w-full h-2 bg-[var(--bg-secondary)] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#00E5FF] to-[#B388FF] rounded-full transition-all duration-500"
                style={{ width: `${progresso}%` }}
              />
            </div>
          </div>
        )}

        {/* Lista de consultas */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {consultasQ.isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
            </div>
          ) : consultas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Calendar className="w-12 h-12 text-[var(--text-muted)]" />
              <p className="text-[var(--text-muted)] text-sm font-bold">Sem consultas agendadas para amanhã</p>
            </div>
          ) : (
            <>
              {/* Selecionar todos */}
              <button
                onClick={toggleTodos}
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs font-bold hover:bg-[var(--bg-tertiary)] transition-all w-full"
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                  selecionados.size === totalComTelefone ? "bg-[#00E5FF] border-[#00E5FF]" : "border-[var(--border-secondary)]"
                }`}>
                  {selecionados.size === totalComTelefone && <Check className="w-3 h-3 text-white" />}
                </div>
                Selecionar todos ({totalComTelefone} com telemóvel)
                {totalSemTelefone > 0 && <span className="text-amber-400 ml-auto">{totalSemTelefone} sem telemóvel</span>}
              </button>

              {consultas.map(c => {
                const estado = envioEstados[c.id];
                const temTel = !!c.utenteTelemovel;
                const hora = format(new Date(c.dataHoraInicio), "HH:mm");

                return (
                  <div
                    key={c.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                      estado === "enviado" ? "bg-emerald-500/10 border-emerald-500/20" :
                      estado === "erro" ? "bg-red-500/10 border-red-500/20" :
                      estado === "enviando" ? "bg-[#00E5FF]/10 border-[#00E5FF]/20" :
                      !temTel ? "bg-amber-500/5 border-amber-500/10 opacity-60" :
                      "bg-[var(--bg-secondary)] border-[var(--border-primary)]"
                    }`}
                  >
                    {/* Checkbox */}
                    <button
                      onClick={() => temTel && toggleSelecionado(c.id)}
                      disabled={!temTel || enviando}
                      className="shrink-0"
                    >
                      <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${
                        selecionados.has(c.id) ? "bg-[#00E5FF] border-[#00E5FF]" :
                        !temTel ? "border-amber-500/30 bg-amber-500/10" :
                        "border-[var(--border-secondary)]"
                      }`}>
                        {selecionados.has(c.id) && <Check className="w-3 h-3 text-white" />}
                        {!temTel && <X className="w-3 h-3 text-amber-400" />}
                      </div>
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[var(--text-primary)] text-sm font-bold truncate">{c.utenteNome}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-full ${
                          c.estado === "confirmada" ? "bg-emerald-500/20 text-emerald-400" : "bg-[#00E5FF]/20 text-[#00E5FF]"
                        }`}>{c.estado}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1">
                          <Clock className="w-3 h-3" />{hora}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1">
                          <User className="w-3 h-3" />{c.medicoNome}
                        </span>
                        <span className="text-[var(--text-muted)] text-[10px] flex items-center gap-1">
                          <Phone className="w-3 h-3" />{c.utenteTelemovel || "Sem telemóvel"}
                        </span>
                      </div>
                    </div>

                    {/* Estado do envio */}
                    <div className="shrink-0">
                      {estado === "enviando" && <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />}
                      {estado === "enviado" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                      {estado === "erro" && <XCircle className="w-4 h-4 text-red-400" />}
                      {estado === "sem_telefone" && <AlertCircle className="w-4 h-4 text-amber-400" />}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-[var(--border-primary)] shrink-0">
          {concluido ? (
            <div className="flex items-center gap-3 w-full">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="text-emerald-400 text-sm font-bold">Envio concluído!</span>
                </div>
                <p className="text-[var(--text-muted)] text-xs mt-1">
                  {totalEnviados} enviado{totalEnviados !== 1 ? "s" : ""} com sucesso
                  {totalErros > 0 && ` — ${totalErros} erro${totalErros !== 1 ? "s" : ""}`}
                </p>
              </div>
              <button onClick={onClose} className="btn-primary px-5 py-2.5 text-sm font-bold">
                Fechar
              </button>
            </div>
          ) : (
            <>
              <div className="text-[var(--text-muted)] text-xs">
                <span className="font-bold text-[var(--text-secondary)]">{totalSelecionados}</span> utente{totalSelecionados !== 1 ? "s" : ""} selecionado{totalSelecionados !== 1 ? "s" : ""}
              </div>
              <div className="flex gap-2">
                <button onClick={onClose} className="px-4 py-2.5 rounded-xl border border-[var(--border-primary)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-secondary)] transition-all">
                  Cancelar
                </button>
                <button
                  onClick={handleEnviarLote}
                  disabled={totalSelecionados === 0 || enviando}
                  className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 text-white transition-all ${
                    modo === "confirmacao" ? "bg-emerald-500 hover:bg-emerald-600" : "bg-amber-500 hover:bg-amber-600"
                  } ${totalSelecionados === 0 || enviando ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  Enviar {modo === "confirmacao" ? "Confirmações" : "Lembretes"} ({totalSelecionados})
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
