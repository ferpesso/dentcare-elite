/**
 * VoiceBriefingPage.tsx — Briefing Diário por Voz
 * DentCare Elite V35.7 — OpenAI TTS (qualidade premium)
 *
 * UPGRADE V35.7:
 * - Substituição do speechSynthesis do browser por OpenAI TTS
 * - Vozes premium: alloy, echo, fable, onyx, nova, shimmer
 * - Modelos: tts-1 (rápido) e tts-1-hd (alta qualidade)
 * - Fallback automático para speechSynthesis se OpenAI indisponível
 * - Barra de progresso real baseada no tempo de áudio
 * - Controlo de volume via Web Audio API
 */
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "../lib/trpc";
import {
  Mic, Play, Pause, Square, Volume2, VolumeX,
  Calendar, Euro, Users, Clock, CheckCircle,
  AlertTriangle, Sparkles, Settings, History,
  FileText, Zap, Loader2, Cpu, Star,
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface SecaoBriefing {
  id: string;
  label: string;
  activa: boolean;
  icone: React.ComponentType<any>;
}

// Vozes OpenAI TTS disponíveis
const TTS_VOZES = [
  { id: "nova",    label: "Nova",    descricao: "Feminino · suave e clara",    recomendada: true },
  { id: "shimmer", label: "Shimmer", descricao: "Feminino · calorosa",          recomendada: false },
  { id: "alloy",   label: "Alloy",   descricao: "Neutro · equilibrado",         recomendada: false },
  { id: "echo",    label: "Echo",    descricao: "Masculino · claro",            recomendada: false },
  { id: "fable",   label: "Fable",   descricao: "Masculino · expressivo",       recomendada: false },
  { id: "onyx",    label: "Onyx",    descricao: "Masculino · profundo",         recomendada: false },
] as const;

const TTS_MODELOS = [
  { id: "tts-1",    label: "Standard",     descricao: "Rápido · boa qualidade" },
  { id: "tts-1-hd", label: "HD",           descricao: "Alta qualidade · ligeiramente mais lento" },
] as const;

// ═══════════════════════════════════════════════════════════════════════════════
// Componente Principal
// ═══════════════════════════════════════════════════════════════════════════════
export function VoiceBriefingPage() {
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [velocidade, setVelocidade] = useState(1.0);
  const [volume, setVolume] = useState(1.0);
  const [mutado, setMutado] = useState(false);
  const [vozSelecionada, setVozSelecionada] = useState<string>("nova");
  const [modeloSelecionado, setModeloSelecionado] = useState<string>("tts-1");
  const [tab, setTab] = useState<"briefing" | "configurar" | "historico" | "resumo">("briefing");
  const [carregandoAudio, setCarregandoAudio] = useState(false);
  const [erroTTS, setErroTTS] = useState<string | null>(null);
  const [usarFallback, setUsarFallback] = useState(false);

  const [secoes, setSecoes] = useState<SecaoBriefing[]>([
    { id: "saudacao",   label: "Saudação e Data",       activa: true,  icone: Sparkles },
    { id: "consultas",  label: "Consultas do Dia",       activa: true,  icone: Calendar },
    { id: "financeiro", label: "Resumo Financeiro",      activa: true,  icone: Euro },
    { id: "alertas",    label: "Alertas e Urgências",    activa: true,  icone: AlertTriangle },
    { id: "utentes",    label: "Novos Utentes",          activa: false, icone: Users },
    { id: "stocks",     label: "Stocks em Falta",        activa: true,  icone: Zap },
  ]);

  // Refs para controlo de áudio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressoIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Verificar disponibilidade do TTS OpenAI
  const ttsDisponibilidadeQuery = trpc.tts.verificarDisponibilidade.useQuery(undefined, {
    staleTime: 60_000,
  });
  const ttsDisponivel = ttsDisponibilidadeQuery.data?.disponivel ?? false;

  // Queries de dados
  const hoje = new Date();
  const consultasQuery = trpc.consultas.listarConsultas.useQuery({
    dataInicio: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString(),
    dataFim: new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 23, 59).toISOString(),
  } as any);
  const resumoQuery = trpc.financeiro.obterResumo.useQuery({
    startDate: new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString(),
    endDate: hoje.toISOString(),
  } as any);
  const utentesQuery = trpc.utentes.list.useQuery();
  const historicoQuery = trpc.voiceBriefing.listarHistorico.useQuery({ limite: 5 });
  const registarMutation = trpc.voiceBriefing.registarBriefing.useMutation();

  const consultas = (consultasQuery.data as any)?.consultas ?? [];
  const resumo = resumoQuery.data as any;
  const totalUtentes = (utentesQuery.data as any)?.total ?? 0;
  const historico = (historicoQuery.data as any)?.historico ?? [];

  const consultasHoje = consultas.length;
  const consultasConfirmadas = consultas.filter((c: any) => c.estado === "confirmada").length;
  const consultasPendentes = consultas.filter((c: any) => c.estado === "agendada").length;
  const receitaMes = Number(resumo?.totalFaturado ?? 0);

  // Gerar texto do briefing
  const textoBriefing = useMemo(() => {
    const dataFormatada = hoje.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" });
    const partes: string[] = [];

    if (secoes.find(s => s.id === "saudacao")?.activa) {
      const hora = hoje.getHours();
      const saudacao = hora < 12 ? "Bom dia" : hora < 18 ? "Boa tarde" : "Boa noite";
      partes.push(`${saudacao}! Hoje é ${dataFormatada}. Aqui está o seu briefing diário da clínica.`);
    }

    if (secoes.find(s => s.id === "consultas")?.activa) {
      partes.push(`Agenda do dia: tem ${consultasHoje} consultas marcadas. ${consultasConfirmadas} confirmadas e ${consultasPendentes} aguardam confirmação.`);
      if (consultas.length > 0) {
        const primeira = consultas[0];
        const hora = new Date(primeira.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
        partes.push(`A primeira consulta é às ${hora} com ${primeira.utenteNome ?? "utente"}.`);
      }
    }

    if (secoes.find(s => s.id === "financeiro")?.activa) {
      partes.push(`Resumo financeiro do mês: ${receitaMes > 0 ? `faturação de ${receitaMes.toFixed(0)} euros` : "dados financeiros em carregamento"}.`);
    }

    if (secoes.find(s => s.id === "alertas")?.activa) {
      partes.push(`Alertas: ${consultasPendentes} consultas aguardam confirmação. Verifique os lembretes automáticos de WhatsApp.`);
    }

    if (secoes.find(s => s.id === "utentes")?.activa && totalUtentes > 0) {
      partes.push(`Base de utentes: ${totalUtentes} utentes registados no sistema.`);
    }

    if (secoes.find(s => s.id === "stocks")?.activa) {
      partes.push(`Stocks: verifique os níveis de consumíveis antes de iniciar as consultas.`);
    }

    partes.push(`Tenha um excelente dia de trabalho!`);
    return partes.join(" ");
  }, [secoes, consultasHoje, consultasConfirmadas, consultasPendentes, receitaMes, totalUtentes, consultas]);

  // ─── Limpar áudio ao desmontar ────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = "";
      }
      if (progressoIntervalRef.current) clearInterval(progressoIntervalRef.current);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  // ─── Iniciar briefing com OpenAI TTS ─────────────────────────────────────
  const iniciarBriefingOpenAI = useCallback(async () => {
    setErroTTS(null);
    setCarregandoAudio(true);
    setProgresso(0);

    try {
      const response = await fetch("/api/tts/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          texto: textoBriefing,
          voz: vozSelecionada,
          modelo: modeloSelecionado,
          velocidade: velocidade,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(err.error || `Erro HTTP ${response.status}`);
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      // Criar elemento de áudio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(url);
      audio.volume = mutado ? 0 : volume;
      audioRef.current = audio;

      // Progresso baseado no tempo real
      audio.addEventListener("timeupdate", () => {
        if (audio.duration && audio.duration > 0) {
          setProgresso(Math.round((audio.currentTime / audio.duration) * 100));
        }
      });

      audio.addEventListener("ended", () => {
        setPlaying(false);
        setPaused(false);
        setProgresso(100);
        URL.revokeObjectURL(url);
      });

      audio.addEventListener("error", () => {
        setPlaying(false);
        setPaused(false);
        setErroTTS("Erro ao reproduzir o áudio.");
      });

      await audio.play();
      setPlaying(true);
      setPaused(false);
      setCarregandoAudio(false);

      // Registar na BD
      registarMutation.mutate({
        secoes: secoes.filter(s => s.activa).map(s => s.label),
        duracaoSegundos: Math.round(textoBriefing.length / 15),
        conteudoTextual: textoBriefing,
      }, {
        onSuccess: () => historicoQuery.refetch(),
      });

    } catch (error: any) {
      setCarregandoAudio(false);
      const msg = error?.message || "Erro ao gerar áudio com OpenAI TTS";
      setErroTTS(msg);
      // Fallback para speechSynthesis
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        setUsarFallback(true);
        iniciarBriefingFallback();
      }
    }
  }, [textoBriefing, vozSelecionada, modeloSelecionado, velocidade, volume, mutado, secoes, registarMutation, historicoQuery]);

  // ─── Fallback: speechSynthesis do browser ────────────────────────────────
  const iniciarBriefingFallback = useCallback(() => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(textoBriefing);
    utterance.lang = "pt-PT";
    utterance.rate = velocidade;
    utterance.volume = mutado ? 0 : volume;
    const totalChars = textoBriefing.length;
    utterance.onboundary = (e) => {
      setProgresso(Math.min(100, Math.round((e.charIndex / totalChars) * 100)));
    };
    utterance.onend = () => { setPlaying(false); setPaused(false); setProgresso(100); };
    utterance.onerror = () => { setPlaying(false); setPaused(false); };
    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setPlaying(true);
    setPaused(false);
    setProgresso(0);
    registarMutation.mutate({
      secoes: secoes.filter(s => s.activa).map(s => s.label),
      duracaoSegundos: Math.round(textoBriefing.length / 15),
      conteudoTextual: textoBriefing,
    }, { onSuccess: () => historicoQuery.refetch() });
  }, [textoBriefing, velocidade, volume, mutado, secoes, registarMutation, historicoQuery]);

  // ─── Iniciar briefing (escolhe método) ───────────────────────────────────
  const iniciarBriefing = useCallback(() => {
    if (ttsDisponivel && !usarFallback) {
      iniciarBriefingOpenAI();
    } else {
      iniciarBriefingFallback();
    }
  }, [ttsDisponivel, usarFallback, iniciarBriefingOpenAI, iniciarBriefingFallback]);

  // ─── Pausar / Retomar ─────────────────────────────────────────────────────
  const pausarResumir = useCallback(() => {
    if (audioRef.current && !usarFallback) {
      if (paused) {
        audioRef.current.play();
        setPaused(false);
      } else {
        audioRef.current.pause();
        setPaused(true);
      }
    } else if (typeof window !== "undefined" && "speechSynthesis" in window) {
      if (paused) { window.speechSynthesis.resume(); setPaused(false); }
      else { window.speechSynthesis.pause(); setPaused(true); }
    }
  }, [paused, usarFallback]);

  // ─── Parar briefing ───────────────────────────────────────────────────────
  const pararBriefing = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setPlaying(false);
    setPaused(false);
    setProgresso(0);
  }, []);

  // ─── Controlo de volume em tempo real ────────────────────────────────────
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = mutado ? 0 : volume;
    }
  }, [volume, mutado]);

  const toggleSecao = (id: string) => {
    setSecoes(prev => prev.map(s => s.id === id ? { ...s, activa: !s.activa } : s));
  };

  const dataFormatada = hoje.toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  const kpis = [
    { label: "Consultas Hoje",    value: consultasHoje,         icon: Calendar,      color: "text-[#00E5FF]",  bg: "bg-[#00E5FF]/10",  border: "border-[#00E5FF]/20" },
    { label: "Confirmadas",       value: consultasConfirmadas,  icon: CheckCircle,   color: "text-emerald-400", bg: "bg-emerald-500/10", border: "border-emerald-500/20" },
    { label: "Pendentes",         value: consultasPendentes,    icon: Clock,         color: "text-amber-400",   bg: "bg-amber-500/10",   border: "border-amber-500/20" },
    { label: "Total Utentes",     value: totalUtentes || "—",   icon: Users,         color: "text-violet-400",  bg: "bg-violet-500/10",  border: "border-violet-500/20" },
  ];

  const TABS = [
    { id: "briefing",   label: "Briefing",    icon: Mic },
    { id: "configurar", label: "Configurar",  icon: Settings },
    { id: "historico",  label: "Histórico",   icon: History },
    { id: "resumo",     label: "Resumo",      icon: FileText },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">Voice Briefing</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            Resumo diário da clínica narrado por voz
          </p>
        </div>
        <div className="text-right">
          <p className="text-[var(--text-secondary)] text-sm font-medium capitalize">{dataFormatada}</p>
          <div className="flex items-center gap-1.5 justify-end mt-0.5">
            {ttsDisponivel && !usarFallback ? (
              <>
                <Cpu className="w-3 h-3 text-[#00E5FF]" />
                <span className="text-[10px] text-[#00E5FF] font-semibold">OpenAI TTS</span>
              </>
            ) : (
              <>
                <Mic className="w-3 h-3 text-amber-400" />
                <span className="text-[10px] text-amber-400">Browser TTS</span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Badge OpenAI TTS */}
      {ttsDisponivel && !usarFallback && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/20">
          <Star className="w-4 h-4 text-[#00E5FF] shrink-0" />
          <p className="text-[var(--text-secondary)] text-xs">
            <span className="text-[#00E5FF] font-semibold">OpenAI TTS activo</span> — Qualidade de voz premium com síntese neural. Voz: <span className="font-medium capitalize">{vozSelecionada}</span> · Modelo: <span className="font-medium">{modeloSelecionado}</span>
          </p>
          {usarFallback && (
            <button
              onClick={() => setUsarFallback(false)}
              className="ml-auto text-[10px] text-[#00E5FF] hover:underline shrink-0"
            >
              Usar OpenAI
            </button>
          )}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`card-premium p-4 border ${border}`}>
            <div className={`w-8 h-8 rounded-xl ${bg} border ${border} flex items-center justify-center mb-2`}>
              <Icon className={`w-3.5 h-3.5 ${color}`} />
            </div>
            <p className="section-label mb-0.5">{label}</p>
            <p className={`text-xl font-black ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${
              tab === id
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {/* ── Tab: Briefing ── */}
      {tab === "briefing" && (
        <div className="space-y-4">
          {/* Player Principal */}
          <div className="card-premium p-8 flex flex-col items-center text-center">
            {/* Ícone animado */}
            <div className={`relative w-24 h-24 rounded-full flex items-center justify-center mb-6 transition-all duration-300 ${
              carregandoAudio
                ? "bg-violet-500/20 border-2 border-violet-400/50"
                : playing && !paused
                ? "bg-[#00E5FF]/20 border-2 border-[#00E5FF]/50 shadow-lg shadow-[#00E5FF]/20"
                : paused
                ? "bg-amber-500/20 border-2 border-amber-400/50"
                : "bg-[var(--bg-overlay)] border border-[var(--border-light)]"
            }`}>
              {carregandoAudio
                ? <Loader2 className="w-10 h-10 text-violet-400 animate-spin" />
                : playing && !paused
                ? <Volume2 className="w-10 h-10 text-[#00E5FF] animate-pulse" />
                : paused
                ? <Pause className="w-10 h-10 text-amber-400" />
                : <Mic className="w-10 h-10 text-[var(--text-muted)]" />
              }
              {playing && !paused && (
                <div className="absolute inset-0 rounded-full border-2 border-[#00E5FF]/30 animate-ping" />
              )}
            </div>

            <h2 className="text-[var(--text-primary)] font-semibold text-lg mb-1">
              {carregandoAudio
                ? "A gerar áudio com IA..."
                : playing && !paused
                ? "A reproduzir briefing..."
                : paused
                ? "Briefing em pausa"
                : "Briefing Diário"
              }
            </h2>
            <p className="text-[var(--text-muted)] text-sm mb-4 capitalize">{dataFormatada}</p>

            {/* Barra de progresso */}
            {(playing || paused || progresso > 0) && (
              <div className="w-full max-w-xs mb-2">
                <div className="w-full bg-[var(--bg-subtle)] rounded-full h-1.5 mb-1">
                  <div
                    className="bg-[#00E5FF] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progresso}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-[var(--text-muted)]">
                  <span>{progresso}%</span>
                  <span>{secoes.filter(s => s.activa).length} secções</span>
                </div>
              </div>
            )}

            {/* Erro TTS */}
            {erroTTS && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4 text-left w-full max-w-sm">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <p className="text-amber-300 text-xs">{erroTTS}</p>
                  {usarFallback && <p className="text-amber-400/70 text-[10px] mt-0.5">A usar síntese de voz do browser como alternativa.</p>}
                </div>
              </div>
            )}

            {/* Controlos */}
            <div className="flex items-center gap-3 mt-2">
              {!playing && !paused && !carregandoAudio && (
                <button
                  onClick={iniciarBriefing}
                  className="btn-primary px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                >
                  <Play className="w-4 h-4" />
                  Iniciar Briefing
                </button>
              )}
              {carregandoAudio && (
                <button disabled className="px-6 py-3 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-sm font-medium flex items-center gap-2 opacity-70 cursor-not-allowed">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A gerar...
                </button>
              )}
              {playing && !paused && (
                <>
                  <button onClick={pausarResumir} className="px-5 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-sm font-medium flex items-center gap-2 hover:bg-amber-500/30 transition-colors">
                    <Pause className="w-4 h-4" />Pausar
                  </button>
                  <button onClick={pararBriefing} className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2 hover:bg-red-500/30 transition-colors">
                    <Square className="w-4 h-4" />Parar
                  </button>
                </>
              )}
              {paused && (
                <>
                  <button onClick={pausarResumir} className="btn-primary px-5 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2">
                    <Play className="w-4 h-4" />Continuar
                  </button>
                  <button onClick={pararBriefing} className="px-5 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-sm font-medium flex items-center gap-2 hover:bg-red-500/30 transition-colors">
                    <Square className="w-4 h-4" />Parar
                  </button>
                </>
              )}
            </div>

            {/* Controlos de volume inline (durante reprodução) */}
            {(playing || paused) && (
              <div className="flex items-center gap-6 mt-5 pt-4 border-t border-[var(--border-lighter)] w-full max-w-xs">
                <div className="flex items-center gap-2 flex-1">
                  <button onClick={() => setMutado(v => !v)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                    {mutado ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                  </button>
                  <input
                    type="range" min="0" max="1" step="0.05"
                    value={mutado ? 0 : volume}
                    onChange={e => { setVolume(Number(e.target.value)); setMutado(false); }}
                    className="flex-1 accent-[#00E5FF] h-1"
                  />
                  <span className="text-[#00E5FF] text-[10px] shrink-0 w-8">{Math.round(volume * 100)}%</span>
                </div>
              </div>
            )}
          </div>

          {/* Lista de Consultas */}
          {consultas.length > 0 && (
            <div className="card-premium overflow-hidden">
              <div className="p-4 border-b border-[var(--border-lighter)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#00E5FF]" />
                <p className="text-[var(--text-primary)] font-semibold text-sm">Consultas de Hoje</p>
                <span className="ml-auto text-[10px] text-[var(--text-muted)]">{consultas.length} marcadas</span>
              </div>
              <div className="divide-y divide-[var(--border-lightest)]">
                {consultas.slice(0, 8).map((c: any) => {
                  const hora = new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });
                  const estadoCor: Record<string, string> = {
                    agendada:   "text-[#00E5FF] bg-[#00E5FF]/20 border-[#00E5FF]/30",
                    confirmada: "text-emerald-300 bg-emerald-500/20 border-emerald-500/30",
                    realizada:  "text-[var(--text-primary)]/40 bg-[var(--bg-overlay)] border-[var(--border-light)]",
                    cancelada:  "text-red-300 bg-red-500/20 border-red-500/30",
                  };
                  return (
                    <div key={c.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] transition-colors">
                      <div className="flex items-center gap-1.5 text-[var(--text-muted)] shrink-0 w-14">
                        <Clock className="w-3 h-3" />
                        <span className="text-xs font-medium">{hora}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[var(--text-primary)] text-sm font-medium truncate">{c.utenteNome ?? "—"}</p>
                        <p className="text-[var(--text-muted)] text-xs">{c.tipoConsulta ?? "Consulta"} · {c.medicoNome ?? "—"}</p>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${estadoCor[c.estado] ?? "text-[var(--text-primary)]/40 bg-[var(--bg-overlay)] border-[var(--border-light)]"}`}>
                        {c.estado}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-1">
            <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="text-[var(--text-muted)] text-xs">
              {ttsDisponivel && !usarFallback
                ? "Síntese de voz neural com OpenAI TTS — qualidade muito superior ao browser."
                : "A usar síntese de voz do browser. Configure OPENAI_API_KEY para qualidade premium."
              }
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Configurar ── */}
      {tab === "configurar" && (
        <div className="space-y-4">
          {/* Secções do Briefing */}
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-[var(--border-lighter)] flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#00E5FF]" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Secções do Briefing</h2>
              <span className="ml-auto text-[10px] text-[var(--text-muted)]">{secoes.filter(s => s.activa).length}/{secoes.length} activas</span>
            </div>
            <div className="divide-y divide-[var(--border-lightest)]">
              {secoes.map(s => {
                const Icon = s.icone;
                return (
                  <div key={s.id} className="flex items-center gap-3 p-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${s.activa ? "bg-[#00E5FF]/10 border border-[#00E5FF]/20" : "bg-[var(--bg-overlay)] border border-[var(--border-lighter)]"}`}>
                      <Icon className={`w-4 h-4 ${s.activa ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
                    </div>
                    <p className={`flex-1 text-sm font-medium ${s.activa ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"}`}>{s.label}</p>
                    <button
                      onClick={() => toggleSecao(s.id)}
                      className={`w-10 h-5 rounded-full transition-all duration-200 relative ${s.activa ? "bg-[#00E5FF]" : "bg-white/[0.08]"}`}
                    >
                      <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${s.activa ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configurações de Voz OpenAI TTS */}
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-[#00E5FF]" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Voz OpenAI TTS</h2>
              {ttsDisponivel ? (
                <span className="ml-auto text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Activo</span>
              ) : (
                <span className="ml-auto text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">Indisponível</span>
              )}
            </div>

            {!ttsDisponivel && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <p className="text-amber-300 text-xs">OpenAI TTS não configurado. Defina <code className="bg-amber-500/20 px-1 rounded">OPENAI_API_KEY</code> no servidor para activar.</p>
              </div>
            )}

            <div className="space-y-4">
              {/* Selecção de Voz */}
              <div>
                <label className="section-label block mb-2">Voz</label>
                <div className="grid grid-cols-2 gap-2">
                  {TTS_VOZES.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setVozSelecionada(v.id)}
                      disabled={!ttsDisponivel}
                      className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 ${
                        vozSelecionada === v.id
                          ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF]"
                          : "bg-[var(--bg-overlay)] border-[var(--border-lighter)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="text-sm font-semibold">{v.label}</span>
                        {v.recomendada && <span className="text-[9px] text-[#00E5FF] bg-[#00E5FF]/10 px-1.5 py-0.5 rounded-full">Recomendada</span>}
                      </div>
                      <p className="text-[10px] text-[var(--text-muted)]">{v.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Modelo */}
              <div>
                <label className="section-label block mb-2">Modelo de Qualidade</label>
                <div className="grid grid-cols-2 gap-2">
                  {TTS_MODELOS.map(m => (
                    <button
                      key={m.id}
                      onClick={() => setModeloSelecionado(m.id)}
                      disabled={!ttsDisponivel}
                      className={`p-3 rounded-xl border text-left transition-all disabled:opacity-40 ${
                        modeloSelecionado === m.id
                          ? "bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF]"
                          : "bg-[var(--bg-overlay)] border-[var(--border-lighter)] text-[var(--text-secondary)] hover:border-[var(--border-light)]"
                      }`}
                    >
                      <p className="text-sm font-semibold mb-0.5">{m.label}</p>
                      <p className="text-[10px] text-[var(--text-muted)]">{m.descricao}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Velocidade */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="section-label">Velocidade de Leitura</label>
                  <span className="text-[#00E5FF] text-xs font-semibold">{velocidade.toFixed(1)}x</span>
                </div>
                <input
                  type="range" min="0.25" max="4" step="0.25"
                  value={velocidade}
                  onChange={e => setVelocidade(Number(e.target.value))}
                  className="w-full accent-[#00E5FF]"
                />
                <div className="flex justify-between text-[10px] text-[var(--text-muted)] mt-0.5">
                  <span>Lento (0.25x)</span>
                  <span>Normal (1.0x)</span>
                  <span>Rápido (4.0x)</span>
                </div>
              </div>

              {/* Volume */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="section-label">Volume</label>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setMutado(v => !v)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
                      {mutado ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <span className="text-[#00E5FF] text-xs font-semibold">{mutado ? "Mudo" : `${Math.round(volume * 100)}%`}</span>
                  </div>
                </div>
                <input
                  type="range" min="0" max="1" step="0.05"
                  value={mutado ? 0 : volume}
                  onChange={e => { setVolume(Number(e.target.value)); setMutado(false); }}
                  className="w-full accent-[#00E5FF]"
                  disabled={mutado}
                />
              </div>

              {/* Fallback toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-[var(--border-lighter)]">
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Usar voz do browser</p>
                  <p className="text-[10px] text-[var(--text-muted)]">Fallback para speechSynthesis (menor qualidade)</p>
                </div>
                <button
                  onClick={() => setUsarFallback(v => !v)}
                  className={`w-10 h-5 rounded-full transition-all duration-200 relative ${usarFallback ? "bg-amber-400" : "bg-white/[0.08]"}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${usarFallback ? "left-5" : "left-0.5"}`} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Tab: Histórico ── */}
      {tab === "historico" && (
        <div className="space-y-4">
          <div className="card-premium overflow-hidden">
            <div className="p-4 border-b border-[var(--border-lighter)] flex items-center gap-2">
              <History className="w-4 h-4 text-violet-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Briefings Anteriores</h2>
            </div>
            <div className="divide-y divide-[var(--border-lightest)]">
              {historico.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-[var(--text-muted)] text-sm">Nenhum briefing registado ainda.</p>
                </div>
              ) : (
                historico.map((h: any, i: number) => (
                  <div key={i} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] transition-colors">
                    <div className="w-9 h-9 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
                      <Mic className="w-4 h-4 text-[#00E5FF]" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[var(--text-primary)] text-sm font-medium">
                        {new Date(h.data).toLocaleDateString("pt-PT", { weekday: "long", day: "numeric", month: "long" })}
                      </p>
                      <p className="text-[var(--text-muted)] text-xs">{h.secoes} secções · duração ~{h.duracao}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          <p className="text-[var(--text-muted)] text-xs px-1">
            O histórico mostra os últimos 5 briefings realizados.
          </p>
        </div>
      )}

      {/* ── Tab: Resumo Textual ── */}
      {tab === "resumo" && (
        <div className="space-y-4">
          <div className="card-premium p-5">
            <div className="flex items-center gap-2 mb-4">
              <FileText className="w-4 h-4 text-emerald-400" />
              <h2 className="text-[var(--text-primary)] font-semibold text-sm">Resumo Textual do Briefing</h2>
              <span className="ml-auto text-[10px] text-[var(--text-muted)]">{textoBriefing.split(" ").length} palavras</span>
            </div>
            <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-4">
              <p className="text-[var(--text-secondary)] text-sm leading-relaxed">{textoBriefing}</p>
            </div>
            <button
              onClick={iniciarBriefing}
              disabled={carregandoAudio}
              className="mt-4 btn-primary w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {carregandoAudio ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              {carregandoAudio ? "A gerar..." : "Reproduzir Este Texto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
