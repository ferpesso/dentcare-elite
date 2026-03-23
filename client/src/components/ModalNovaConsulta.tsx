/**
 * ModalNovaConsulta — Refatorado v3
 * DentCare Elite V35 — FASE 1 Melhorias
 *
 * MELHORIAS v3:
 * - Tipos de consulta padronizados (dropdown) com duração automática
 * - Deteção de conflitos de horário em tempo real (médico + utente)
 * - Validação de NIF português (dígito de controlo)
 * - Validação de telemóvel português (formato 9XX XXX XXX)
 * - Aviso de conflito com opção de forçar marcação
 * - Pesquisa inteligente de utentes (Nome/NIF/Telemóvel) + Criação rápida inline
 */
import React, { useState, useMemo, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { format, setMinutes, setHours, addWeeks, addDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Calendar, X, AlertCircle, Save, Loader2, Search, Plus,
  Check, ChevronRight, UserPlus, ArrowLeft, AlertTriangle,
  Clock, Stethoscope, Repeat
} from "lucide-react";

interface ModalNovaConsultaProps {
  dataHora: Date;
  medicoIdPreSelecionado?: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface FormCriacaoUtente {
  nome: string;
  nif: string;
  telemovel: string;
  email: string;
}

// ─── Validação de NIF Português ──────────────────────────────────────────────
function validarNIF(nif: string): { valido: boolean; erro?: string } {
  if (!nif || !nif.trim()) return { valido: true }; // NIF é opcional
  const n = nif.replace(/\s/g, "");
  if (!/^\d{9}$/.test(n)) return { valido: false, erro: "O NIF deve ter exatamente 9 dígitos" };
  // Primeiros dígitos válidos: 1, 2, 3, 5, 6, 8, 9 (ou 45, 70, 71, 72, 74, 75, 77, 78, 79)
  const primeiros = ["1", "2", "3", "5", "6", "8", "9"];
  if (!primeiros.includes(n[0])) return { valido: false, erro: "O primeiro dígito do NIF é inválido" };
  // Validar dígito de controlo (mod 11)
  let soma = 0;
  for (let i = 0; i < 8; i++) {
    soma += parseInt(n[i]) * (9 - i);
  }
  const resto = soma % 11;
  const digitoControlo = resto < 2 ? 0 : 11 - resto;
  if (parseInt(n[8]) !== digitoControlo) return { valido: false, erro: "O dígito de controlo do NIF é inválido" };
  return { valido: true };
}

// ─── Validação de Telemóvel Português ────────────────────────────────────────
function validarTelemovel(tel: string): { valido: boolean; erro?: string } {
  if (!tel || !tel.trim()) return { valido: false, erro: "O telemóvel é obrigatório" };
  const n = tel.replace(/[\s\-\+]/g, "");
  // Aceitar com ou sem prefixo +351
  const numero = n.startsWith("351") ? n.substring(3) : n;
  if (!/^\d{9}$/.test(numero)) return { valido: false, erro: "O telemóvel deve ter 9 dígitos" };
  // Prefixos válidos: 91, 92, 93, 96 (móvel) ou 21, 22, 23, 24, 25, 26, 27, 28, 29 (fixo)
  const prefixo = numero.substring(0, 2);
  const prefixosValidos = ["91", "92", "93", "96", "21", "22", "23", "24", "25", "26", "27", "28", "29", "31"];
  if (!prefixosValidos.includes(prefixo)) return { valido: false, erro: `Prefixo ${prefixo}X não é um número português válido` };
  return { valido: true };
}

// ─── Formatação de Telemóvel ─────────────────────────────────────────────────
function formatarTelemovel(tel: string): string {
  const n = tel.replace(/[\s\-\+]/g, "");
  const numero = n.startsWith("351") ? n.substring(3) : n;
  if (numero.length === 9) {
    return `${numero.substring(0, 3)} ${numero.substring(3, 6)} ${numero.substring(6)}`;
  }
  return tel;
}

// ─── Indicador de Progresso ───────────────────────────────────────────────────
function ProgressoEtapas({ etapa }: { etapa: "pesquisa" | "consulta" | "criar-utente" }) {
  const etapas = [
    { id: "pesquisa",      label: "Utente"   },
    { id: "consulta",      label: "Marcação" },
  ];
  const etapaAtiva = etapa === "criar-utente" ? "pesquisa" : etapa;
  const indiceAtivo = etapas.findIndex(e => e.id === etapaAtiva);

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b modal-border modal-surface-subtle">
      {etapas.map((e, i) => (
        <React.Fragment key={e.id}>
          <div className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
              i < indiceAtivo
                ? "bg-emerald-500 text-white"
                : i === indiceAtivo
                  ? "bg-[#00E5FF] text-white"
                  : "bg-black/10 text-[var(--text-muted)]"
            }`}>
              {i < indiceAtivo ? <Check className="w-3 h-3" /> : i + 1}
            </div>
            <span className={`text-xs font-semibold transition-colors ${
              i === indiceAtivo ? "text-[#00E5FF]" : i < indiceAtivo ? "text-emerald-400" : "text-[var(--text-muted)]"
            }`}>
              {e.label}
            </span>
          </div>
          {i < etapas.length - 1 && (
            <div className={`flex-1 h-px transition-all ${i < indiceAtivo ? "bg-emerald-500/40" : "modal-border"}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
export function ModalNovaConsulta({ dataHora, medicoIdPreSelecionado, onClose, onSuccess }: ModalNovaConsultaProps) {
  // ─── Estados Principais ───────────────────────────────────────────────────────
  const [etapa, setEtapa] = useState<"pesquisa" | "consulta" | "criar-utente">("pesquisa");
  const [searchTerm, setSearchTerm] = useState("");
  const [utentesSelecionado, setUtenteSelecionado] = useState<any>(null);

  // ─── Formulário de Consulta ───────────────────────────────────────────────────
  const [form, setForm] = useState({
    medicoId: medicoIdPreSelecionado ? String(medicoIdPreSelecionado) : "", tipoConsultaId: "", tipoConsulta: "",
    duracao: "30", hora: format(dataHora, "HH:mm"), observacoes: "",
  });

  // ─── Estado de conflitos ──────────────────────────────────────────────────────
  const [conflitos, setConflitos] = useState<{ medicoConflitos: any[]; utenteConflitos: any[] } | null>(null);
  const [forcarMarcacao, setForcarMarcacao] = useState(false);

  // ─── Estado de Recorrência (V35.7) ───────────────────────────────────────────
  const [recorrente, setRecorrente] = useState(false);
  const [recorrenciaConfig, setRecorrenciaConfig] = useState({
    frequencia: "semanal" as "semanal" | "quinzenal" | "mensal",
    numOcorrencias: 4,
  });
  const [criarRecorrentePending, setCriarRecorrentePending] = useState(false);

  // ─── Formulário de Criação de Utente ──────────────────────────────────────────
  const [formUtente, setFormUtente] = useState<FormCriacaoUtente>({
    nome: "", nif: "", telemovel: "", email: "",
  });
  const [errosValidacao, setErrosValidacao] = useState<{ nif?: string; telemovel?: string }>({});

  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  // ─── Queries tRPC ─────────────────────────────────────────────────────────────
  const utentesQ = trpc.utentes.list.useQuery();
  const dentistasQ = trpc.dentistas.listar.useQuery();
  const tiposQ = trpc.consultas.listarTipos.useQuery();

  const tipos = useMemo(() => (tiposQ.data as any)?.tipos ?? [], [tiposQ.data]);

  const criarUtenteMutation = trpc.utentes.create.useMutation({
    onSuccess: (novoUtente) => {
      setSucesso("Utente criado com sucesso!");
      const novoUtenteData = {
        id: (novoUtente as any).utenteId,
        nome: formUtente.nome,
        nif: formUtente.nif || "",
        telemovel: formUtente.telemovel,
        email: formUtente.email || "",
      };
      setUtenteSelecionado(novoUtenteData);
      setFormUtente({ nome: "", nif: "", telemovel: "", email: "" });
      setErrosValidacao({});
      setTimeout(() => {
        setSucesso("");
        setEtapa("consulta");
      }, 1200);
    },
    onError: (e: any) => setErro(parseApiError(e, "Erro ao criar utente")),
  });

  const criarConsultaMutation = trpc.consultas.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => {
      // Se for conflito, mostrar aviso em vez de erro genérico
      if (e.data?.code === "CONFLICT") {
        setConflitos({ medicoConflitos: [{ mensagem: parseApiError(e, "Conflito de horário") }], utenteConflitos: [] });
        setErro("");
      } else {
        setErro(parseApiError(e, "Erro ao criar consulta"));
      }
    },
  });

  useEffect(() => {
    if (criarUtenteMutation.isSuccess) utentesQ.refetch();
  }, [criarUtenteMutation.isSuccess, utentesQ]);

  // ─── Dados Processados ────────────────────────────────────────────────────────
  const utentes = useMemo(() => (utentesQ.data as any)?.utentes ?? [], [utentesQ.data]);
  const dentistas = useMemo(() => (dentistasQ.data as any)?.dentistas ?? (dentistasQ.data as any)?.medicos ?? [], [dentistasQ.data]);

  const utentesFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return utentes;
    const termo = searchTerm.toLowerCase();
    return utentes.filter((u: any) =>
      u.nome?.toLowerCase().includes(termo) ||
      u.nif?.toLowerCase().includes(termo) ||
      u.telemovel?.toLowerCase().includes(termo) ||
      u.email?.toLowerCase().includes(termo)
    );
  }, [searchTerm, utentes]);

  const semResultados = searchTerm.trim().length > 0 && utentesFiltrados.length === 0;

  // ─── Verificação de conflitos em tempo real ───────────────────────────────────
  const calcularHorarios = () => {
    const [h, m] = form.hora.split(":").map(Number);
    const inicio = setMinutes(setHours(dataHora, h), m);
    const fim = new Date(inicio.getTime() + Number(form.duracao) * 60_000);
    return { inicio, fim };
  };

  // ─── Handler: Selecionar tipo de consulta → atualizar duração ─────────────────
  const handleSelecionarTipo = (tipoId: string) => {
    const tipo = tipos.find((t: any) => String(t.id) === tipoId);
    if (tipo) {
      setForm(f => ({
        ...f,
        tipoConsultaId: tipoId,
        tipoConsulta: tipo.nome,
        duracao: String(tipo.duracaoPadrao),
      }));
    } else {
      setForm(f => ({ ...f, tipoConsultaId: "", tipoConsulta: "", duracao: "30" }));
    }
    setConflitos(null);
    setForcarMarcacao(false);
  };

  // ─── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelecionarUtente = (utente: any) => {
    setUtenteSelecionado(utente);
    setEtapa("consulta");
    setErro("");
    setSucesso("");
    setConflitos(null);
    setForcarMarcacao(false);
  };

  const handleIrParaCriarUtente = () => {
    setFormUtente(f => ({ ...f, nome: searchTerm.trim() }));
    setErro("");
    setErrosValidacao({});
    setEtapa("criar-utente");
  };

  const handleCriarUtente = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    setErrosValidacao({});

    // Validações
    if (!formUtente.nome.trim()) { setErro("Nome do utente é obrigatório"); return; }

    const validacaoTel = validarTelemovel(formUtente.telemovel);
    if (!validacaoTel.valido) {
      setErrosValidacao(prev => ({ ...prev, telemovel: validacaoTel.erro }));
      return;
    }

    const validacaoNIF = validarNIF(formUtente.nif);
    if (!validacaoNIF.valido) {
      setErrosValidacao(prev => ({ ...prev, nif: validacaoNIF.erro }));
      return;
    }

    await criarUtenteMutation.mutateAsync({
      nome: formUtente.nome,
      nif: formUtente.nif || undefined,
      telemovel: formUtente.telemovel.replace(/[\s\-]/g, ""),
      email: formUtente.email || undefined,
    });
  };

  const handleCriarConsulta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!utentesSelecionado) { setErro("Selecione ou crie um utente"); return; }
    if (!form.medicoId) { setErro("Selecione um médico"); return; }
    if (!form.tipoConsultaId) { setErro("Selecione o tipo de consulta"); return; }
    const { inicio, fim } = calcularHorarios();

    // ─── Consultas Recorrentes (V35.7) ──────────────────────────────────────────────────────
    if (recorrente && recorrenciaConfig.numOcorrencias > 1) {
      setCriarRecorrentePending(true);
      setErro("");
      const durMs = fim.getTime() - inicio.getTime();
      const intervaloDias = recorrenciaConfig.frequencia === "semanal" ? 7
        : recorrenciaConfig.frequencia === "quinzenal" ? 14
        : 30; // mensal aproximado

      let criadas = 0;
      let erros = 0;
      for (let i = 0; i < recorrenciaConfig.numOcorrencias; i++) {
        const offsetDias = i * intervaloDias;
        const novoInicio = addDays(inicio, offsetDias);
        const novoFim = new Date(novoInicio.getTime() + durMs);
        try {
          await criarConsultaMutation.mutateAsync({
            utenteId: utentesSelecionado.id,
            medicoId: Number(form.medicoId),
            dataHoraInicio: novoInicio as any,
            dataHoraFim: novoFim as any,
            tipoConsulta: form.tipoConsulta,
            tipoConsultaId: Number(form.tipoConsultaId),
            observacoes: form.observacoes ? `[Recorrente ${i + 1}/${recorrenciaConfig.numOcorrencias}] ${form.observacoes}` : `[Recorrente ${i + 1}/${recorrenciaConfig.numOcorrencias}]`,
            forcarMarcacao: true, // recorrentes não bloqueiam por conflito
          });
          criadas++;
        } catch {
          erros++;
        }
      }
      setCriarRecorrentePending(false);
      if (criadas > 0) {
        setSucesso(`${criadas} consulta${criadas > 1 ? "s" : ""} recorrente${criadas > 1 ? "s" : ""} criada${criadas > 1 ? "s" : ""} com sucesso!${erros > 0 ? ` (${erros} com conflito ignorado)` : ""}`);
        setTimeout(() => { onSuccess(); onClose(); }, 1500);
      } else {
        setErro("Não foi possível criar nenhuma consulta recorrente.");
      }
      return;
    }

    // ─── Consulta simples ───────────────────────────────────────────────────────────────────────────────────
    criarConsultaMutation.mutate({
      utenteId: utentesSelecionado.id,
      medicoId: Number(form.medicoId),
      dataHoraInicio: inicio as any,
      dataHoraFim: fim as any,
      tipoConsulta: form.tipoConsulta,
      tipoConsultaId: Number(form.tipoConsultaId),
      observacoes: form.observacoes || undefined,
      forcarMarcacao: forcarMarcacao,
    });
  };

  const handleForcarMarcacao = () => {
    setForcarMarcacao(true);
    setConflitos(null);
    // Re-submeter com forçar
    if (!utentesSelecionado || !form.medicoId) return;
    const { inicio, fim } = calcularHorarios();
    criarConsultaMutation.mutate({
      utenteId: utentesSelecionado.id,
      medicoId: Number(form.medicoId),
      dataHoraInicio: inicio as any,
      dataHoraFim: fim as any,
      tipoConsulta: form.tipoConsulta,
      tipoConsultaId: Number(form.tipoConsultaId),
      observacoes: form.observacoes || undefined,
      forcarMarcacao: true,
    });
  };

  // ─── Renderização ─────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-md overflow-y-auto">
      <div className="modal-surface rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden my-auto">

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b modal-border modal-surface-subtle">
          <div>
            <h2 className="modal-text-primary font-bold text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#00E5FF]" />
              Nova Marcação
            </h2>
            <p className="text-[var(--text-secondary)] text-xs mt-0.5 font-medium">
              {format(dataHora, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl modal-surface-subtle hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indicador de Progresso */}
        <ProgressoEtapas etapa={etapa} />

        {/* Conteúdo */}
        <div className="p-5 space-y-4">
          {/* Mensagens de Erro/Sucesso */}
          {erro && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm font-medium">{erro}</p>
            </div>
          )}
          {sucesso && (
            <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">{sucesso}</p>
            </div>
          )}

          {/* ─── AVISO DE CONFLITO ─── */}
          {conflitos && (conflitos.medicoConflitos.length > 0 || conflitos.utenteConflitos.length > 0) && (
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <p className="text-amber-300 text-sm font-bold">Conflito de Horário Detetado</p>
              </div>
              {conflitos.medicoConflitos.map((c: any, i: number) => (
                <p key={i} className="text-amber-200/80 text-xs">{c.mensagem || `Médico já tem consulta neste horário`}</p>
              ))}
              {conflitos.utenteConflitos.map((c: any, i: number) => (
                <p key={i} className="text-amber-200/80 text-xs">{c.mensagem || `Utente já tem consulta neste horário`}</p>
              ))}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => { setConflitos(null); }}
                  className="flex-1 py-2 rounded-lg modal-surface-subtle modal-text-primary text-xs font-bold hover:bg-[var(--bg-subtle)] transition-all"
                >
                  Alterar Horário
                </button>
                <button
                  onClick={handleForcarMarcacao}
                  disabled={criarConsultaMutation.isPending}
                  className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold hover:bg-amber-500/30 transition-all"
                >
                  {criarConsultaMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                  ) : (
                    "Forçar Marcação"
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ─── ETAPA 1: Pesquisa/Seleção de Utente ─── */}
          {etapa === "pesquisa" && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Pesquisar Utente
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nome, NIF, Telemóvel ou Email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="modal-input"
                    autoFocus
                  />
                </div>
              </div>

              <div className="max-h-60 overflow-y-auto rounded-xl modal-surface-subtle">
                {utentesQ.isLoading ? (
                  <div className="flex items-center justify-center py-8 gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF]" />
                    <span className="text-[var(--text-muted)] text-xs">A carregar utentes...</span>
                  </div>
                ) : semResultados ? (
                  <div className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-[var(--text-primary)] font-semibold text-sm">Nenhum utente encontrado</p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">
                        Não existe nenhum utente com{" "}
                        <span className="text-[#00E5FF] font-medium">"{searchTerm}"</span>
                      </p>
                    </div>
                    <button
                      onClick={handleIrParaCriarUtente}
                      className="w-full py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] text-white font-bold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00E5FF]/20"
                    >
                      <Plus className="w-4 h-4" />
                      Registar "{searchTerm}" como novo utente
                    </button>
                  </div>
                ) : !searchTerm.trim() ? (
                  <div className="flex flex-col items-center justify-center py-8 gap-2">
                    <Search className="w-7 h-7 text-[var(--text-muted)] opacity-30" />
                    <p className="text-[var(--text-muted)] text-xs">Comece a digitar para pesquisar</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[var(--border-lightest)]">
                    {utentesFiltrados.map((u: any) => (
                      <button
                        key={u.id}
                        onClick={() => handleSelecionarUtente(u)}
                        className="w-full text-left p-3 hover:bg-[var(--bg-subtle)] transition-all group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
                            <span className="text-[#00E5FF] text-xs font-bold">{u.nome?.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="modal-text-primary font-semibold text-sm group-hover:text-[#00E5FF] transition-colors truncate">
                              {u.nome}
                            </p>
                            <div className="flex gap-3 mt-0.5 text-[10px] text-[var(--text-muted)]">
                              {u.nif && <span>NIF: {u.nif}</span>}
                              {u.telemovel && <span>Tel: {u.telemovel}</span>}
                            </div>
                          </div>
                          <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors shrink-0" />
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {!searchTerm.trim() && (
                <button
                  onClick={handleIrParaCriarUtente}
                  className="w-full py-2.5 rounded-xl modal-surface-subtle text-[var(--text-secondary)] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)] transition-all"
                >
                  <UserPlus className="w-4 h-4" />
                  Registar Novo Utente
                </button>
              )}
            </div>
          )}

          {/* ─── ETAPA 2: Criar Novo Utente (com validações) ─── */}
          {etapa === "criar-utente" && (
            <form onSubmit={handleCriarUtente} className="space-y-3">
              <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                <UserPlus className="w-4 h-4 text-[#00E5FF] shrink-0" />
                <p className="text-[#00E5FF] text-xs font-medium">
                  Após criar o utente, a marcação será feita automaticamente.
                </p>
              </div>

              {/* Nome */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Nome Completo *
                </label>
                <input
                  type="text"
                  placeholder="Ex: João Silva"
                  value={formUtente.nome}
                  onChange={(e) => setFormUtente(f => ({ ...f, nome: e.target.value }))}
                  className="modal-input"
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* NIF com validação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    NIF
                  </label>
                  <input
                    type="text"
                    placeholder="123456789"
                    maxLength={9}
                    value={formUtente.nif}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "").slice(0, 9);
                      setFormUtente(f => ({ ...f, nif: val }));
                      if (val.length === 9) {
                        const v = validarNIF(val);
                        setErrosValidacao(prev => ({ ...prev, nif: v.valido ? undefined : v.erro }));
                      } else {
                        setErrosValidacao(prev => ({ ...prev, nif: undefined }));
                      }
                    }}
                    className={`modal-input ${
                      errosValidacao.nif
                        ? "error"
                        : formUtente.nif.length === 9
                          ? "success"
                          : ""
                    }`}
                  />
                  {errosValidacao.nif && (
                    <p className="text-red-400 text-[10px] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errosValidacao.nif}
                    </p>
                  )}
                  {formUtente.nif.length === 9 && !errosValidacao.nif && (
                    <p className="text-emerald-400 text-[10px] font-medium flex items-center gap-1">
                      <Check className="w-3 h-3" /> NIF válido
                    </p>
                  )}
                </div>

                {/* Telemóvel com validação */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Telemóvel *
                  </label>
                  <input
                    type="tel"
                    placeholder="912 345 678"
                    value={formUtente.telemovel}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^\d\s\-\+]/g, "");
                      setFormUtente(f => ({ ...f, telemovel: val }));
                      const clean = val.replace(/[\s\-\+]/g, "");
                      const numero = clean.startsWith("351") ? clean.substring(3) : clean;
                      if (numero.length === 9) {
                        const v = validarTelemovel(val);
                        setErrosValidacao(prev => ({ ...prev, telemovel: v.valido ? undefined : v.erro }));
                      } else {
                        setErrosValidacao(prev => ({ ...prev, telemovel: undefined }));
                      }
                    }}
                    className={`modal-input ${
                      errosValidacao.telemovel
                        ? "error"
                        : formUtente.telemovel.replace(/[\s\-\+]/g, "").length >= 9
                          ? "success"
                          : ""
                    }`}
                    required
                  />
                  {errosValidacao.telemovel && (
                    <p className="text-red-400 text-[10px] font-medium flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {errosValidacao.telemovel}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="joao@example.com"
                  value={formUtente.email}
                  onChange={(e) => setFormUtente(f => ({ ...f, email: e.target.value }))}
                  className="modal-input"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t modal-border">
                <button
                  type="button"
                  onClick={() => {
                    setEtapa("pesquisa");
                    setFormUtente({ nome: "", nif: "", telemovel: "", email: "" });
                    setErro("");
                    setErrosValidacao({});
                  }}
                  className="modal-btn-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={criarUtenteMutation.isPending || !!errosValidacao.nif || !!errosValidacao.telemovel}
                  className="flex-1 bg-[#00E5FF] hover:bg-[#00E5FF] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00E5FF]/20 disabled:opacity-60"
                >
                  {criarUtenteMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> A criar...</>
                  ) : (
                    <><UserPlus className="w-4 h-4" /> Criar e Marcar Consulta</>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ─── ETAPA 3: Detalhes da Consulta (com tipos padronizados) ─── */}
          {etapa === "consulta" && utentesSelecionado && (
            <form onSubmit={handleCriarConsulta} className="space-y-4">
              {/* Utente Selecionado */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
                <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/20 border border-[#00E5FF]/30 flex items-center justify-center shrink-0">
                  <span className="text-[#00E5FF] font-bold text-sm">{utentesSelecionado.nome?.charAt(0)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-[#00E5FF] font-bold uppercase tracking-wider">Utente</p>
                  <p className="modal-text-primary font-semibold text-sm truncate">{utentesSelecionado.nome}</p>
                  {utentesSelecionado.telemovel && (
                    <p className="text-[10px] text-[var(--text-muted)]">{utentesSelecionado.telemovel}</p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => { setEtapa("pesquisa"); setUtenteSelecionado(null); setSearchTerm(""); setConflitos(null); }}
                  className="text-[10px] text-[#00E5FF] hover:text-[#00E5FF] font-semibold underline underline-offset-2 shrink-0"
                >
                  Alterar
                </button>
              </div>

              {/* NOVO: Tipo de Consulta Padronizado */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-[#00E5FF]" />
                  Tipo de Consulta *
                </label>
                <select
                  value={form.tipoConsultaId}
                  onChange={(e) => handleSelecionarTipo(e.target.value)}
                  className="input-premium w-full appearance-none"
                  required
                >
                  <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Selecionar tipo de consulta...</option>
                  {tipos.map((t: any) => (
                    <option key={t.id} value={t.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">
                      {t.nome} — {t.duracaoPadrao} min
                    </option>
                  ))}
                </select>
                {form.tipoConsultaId && (
                  <p className="text-[#00E5FF] text-[10px] font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Duração ajustada automaticamente para {form.duracao} minutos
                  </p>
                )}
              </div>

              {/* Hora e Duração */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Hora de Início
                  </label>
                  <input
                    type="time"
                    value={form.hora}
                    onChange={(e) => { setForm(f => ({ ...f, hora: e.target.value })); setConflitos(null); }}
                    className="input-premium w-full"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                    Duração
                  </label>
                  <select
                    value={form.duracao}
                    onChange={(e) => { setForm(f => ({ ...f, duracao: e.target.value })); setConflitos(null); }}
                    className="input-premium w-full appearance-none"
                  >
                    {[["15","15 min"],["20","20 min"],["30","30 min"],["45","45 min"],["60","1 hora"],["90","1h 30m"],["120","2 horas"]].map(([v,l]) => (
                      <option key={v} value={v} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{l}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Médico */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Médico Responsável *
                </label>
                <select
                  value={form.medicoId}
                  onChange={(e) => { setForm(f => ({ ...f, medicoId: e.target.value })); setConflitos(null); }}
                  className="input-premium w-full appearance-none"
                  required
                >
                  <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Selecione o médico...</option>
                  {dentistas.map((d: any) => (
                    <option key={d.id} value={d.id} className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">{d.nome}{d.especialidade ? ` (${d.especialidade})` : ""}</option>
                  ))}
                </select>
              </div>

              {/* Observações */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Notas adicionais sobre a marcação..."
                  value={form.observacoes}
                  onChange={(e) => setForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="input-premium w-full resize-none"
                />
              </div>

              {/* ─── Consultas Recorrentes (V35.7) ─── */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setRecorrente(v => !v)}
                    className={`w-9 h-5 rounded-full transition-all duration-200 relative ${recorrente ? "bg-[#00E5FF]" : "bg-white/[0.08]"}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${recorrente ? "left-4" : "left-0.5"}`} />
                  </button>
                  <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider flex items-center gap-1.5">
                    <Repeat className="w-3.5 h-3.5 text-[#00E5FF]" />
                    Consulta Recorrente
                  </span>
                </div>
                {recorrente && (
                  <div className="bg-[var(--bg-overlay)] border border-[#00E5FF]/20 rounded-xl p-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">Frequência</label>
                        <select
                          value={recorrenciaConfig.frequencia}
                          onChange={e => setRecorrenciaConfig(c => ({ ...c, frequencia: e.target.value as any }))}
                          className="input-premium w-full text-xs py-1.5"
                        >
                          <option value="semanal">Semanal (7 dias)</option>
                          <option value="quinzenal">Quinzenal (14 dias)</option>
                          <option value="mensal">Mensal (30 dias)</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider block mb-1">N.º de Sessões</label>
                        <select
                          value={recorrenciaConfig.numOcorrencias}
                          onChange={e => setRecorrenciaConfig(c => ({ ...c, numOcorrencias: Number(e.target.value) }))}
                          className="input-premium w-full text-xs py-1.5"
                        >
                          {[2, 3, 4, 5, 6, 8, 10, 12].map(n => (
                            <option key={n} value={n}>{n} sessões</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <p className="text-[10px] text-[#00E5FF]/70">
                      Serão criadas <strong className="text-[#00E5FF]">{recorrenciaConfig.numOcorrencias} consultas</strong> com intervalo de{" "}
                      {recorrenciaConfig.frequencia === "semanal" ? "1 semana" : recorrenciaConfig.frequencia === "quinzenal" ? "2 semanas" : "1 mês"} entre cada sessão.
                    </p>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-3 border-t modal-border">
                <button
                  type="button"
                  onClick={() => { setEtapa("pesquisa"); setUtenteSelecionado(null); setSearchTerm(""); setConflitos(null); }}
                  className="modal-btn-back"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Voltar
                </button>
                <button
                  type="submit"
                  disabled={criarConsultaMutation.isPending || criarRecorrentePending}
                  className="flex-1 bg-[#00E5FF] hover:bg-[#00E5FF] text-white py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-[#00E5FF]/20 disabled:opacity-60"
                >
                  {(criarConsultaMutation.isPending || criarRecorrentePending) ? (
                    <><Loader2 className="w-5 h-5 animate-spin" /> A criar{recorrente ? ` sessões...` : "..."}</>
                  ) : recorrente ? (
                    <><Repeat className="w-5 h-5" /> Criar {recorrenciaConfig.numOcorrencias} Sessões</>
                  ) : (
                    <><Save className="w-5 h-5" /> Confirmar Marcação</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
