/**
 * InsightsClinicosTab.tsx — Painel de Insights Clínicos Inteligentes
 * DentCare Elite V35 — Redesign Premium
 *
 * Funcionalidades:
 * - Análise automática do histórico do utente
 * - Alertas e recomendações baseadas em padrões
 * - Score de saúde oral com breakdown detalhado
 * - Tendências temporais (frequência de consultas, tratamentos)
 * - Previsões e lembretes inteligentes
 * - Resumo executivo para o dentista
 */
import React, { useMemo } from "react";
import {
  Brain, AlertTriangle, CheckCircle, Clock, Calendar,
  TrendingUp, TrendingDown, Activity, Heart, Shield,
  Zap, Target, Eye, Star, AlertCircle, Info,
  BarChart3, PieChart, ArrowUp, ArrowDown, Minus,
  Stethoscope, Wallet, Camera, Smile, RefreshCw,
  Sparkles, Award, Bell, FileText, ChevronRight,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Alerta {
  id: string;
  tipo: "critico" | "aviso" | "info" | "sucesso";
  titulo: string;
  descricao: string;
  icon: React.ComponentType<any>;
  accao?: string;
  accaoTab?: string;
}

interface Recomendacao {
  id: string;
  prioridade: "alta" | "media" | "baixa";
  titulo: string;
  descricao: string;
  icon: React.ComponentType<any>;
  cor: string;
}

interface Tendencia {
  label: string;
  valor: number;
  anterior: number;
  unidade: string;
  icon: React.ComponentType<any>;
  cor: string;
}

// ─── Componente Principal ───────────────────────────────────────────────────
interface InsightsClinicosProps {
  utente: any;
  consultas: any[];
  tratamentos: any[];
  faturas: any[];
  anamnese: any;
  imagens: any[];
  odontogramaData: Record<string, string>;
  onNavigate: (tab: string, filter?: string) => void;
  onRefresh: () => void;
}

export function InsightsClinicosTab({
  utente, consultas, tratamentos, faturas, anamnese, imagens, odontogramaData, onNavigate, onRefresh,
}: InsightsClinicosProps) {

  // ─── Health Score Detalhado ───────────────────────────────────────────────
  const healthAnalysis = useMemo(() => {
    let score = 50;
    const breakdown: { label: string; pontos: number; max: number; descricao: string }[] = [];

    // 1. Frequência de consultas
    const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
    const consultasRecentes = consultas.filter(c => c.estado === "realizada" && new Date(c.dataHoraInicio) > seisAtras).length;
    const ptConsultas = consultasRecentes >= 2 ? 15 : consultasRecentes === 1 ? 10 : 0;
    score += ptConsultas;
    breakdown.push({ label: "Frequência de Consultas", pontos: ptConsultas, max: 15, descricao: `${consultasRecentes} consultas nos últimos 6 meses` });

    // 2. Consultas agendadas
    const futuras = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada").length;
    const ptAgendadas = futuras > 0 ? 10 : 0;
    score += ptAgendadas;
    breakdown.push({ label: "Consultas Agendadas", pontos: ptAgendadas, max: 10, descricao: futuras > 0 ? `${futuras} consulta(s) agendada(s)` : "Sem consultas agendadas" });

    // 3. Tratamentos concluídos
    const concluidos = tratamentos.filter(t => t.estado === "concluido").length;
    const ptConcluidos = Math.min(concluidos * 3, 10);
    score += ptConcluidos;
    breakdown.push({ label: "Tratamentos Concluídos", pontos: ptConcluidos, max: 10, descricao: `${concluidos} tratamento(s) concluído(s)` });

    // 4. Tratamentos pendentes antigos
    const tresAtras = new Date(); tresAtras.setMonth(tresAtras.getMonth() - 3);
    const pendentesAntigos = tratamentos.filter(t => (t.estado === "pendente" || t.estado === "proposto") && new Date(t.dataInicio) < tresAtras).length;
    const ptPendentes = pendentesAntigos > 0 ? -10 : 5;
    score += ptPendentes;
    breakdown.push({ label: "Tratamentos Pendentes", pontos: ptPendentes, max: 5, descricao: pendentesAntigos > 0 ? `${pendentesAntigos} tratamento(s) pendente(s) há mais de 3 meses` : "Sem tratamentos pendentes antigos" });

    // 5. Anamnese preenchida
    const ptAnamnese = anamnese ? 5 : -5;
    score += ptAnamnese;
    breakdown.push({ label: "Anamnese", pontos: ptAnamnese, max: 5, descricao: anamnese ? "Anamnese preenchida" : "Anamnese não preenchida" });

    // 6. Alergias/problemas
    let ptSaude = 0;
    if (anamnese?.alergiasDetectadas) { ptSaude -= 5; }
    if (anamnese?.problemasSaude) { ptSaude -= 5; }
    score += ptSaude;
    breakdown.push({ label: "Condições de Saúde", pontos: ptSaude, max: 0, descricao: ptSaude < 0 ? "Alergias ou problemas de saúde detectados" : "Sem condições especiais registadas" });

    // 7. Situação financeira
    const divida = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    const ptFinanceiro = divida === 0 ? 5 : -5;
    score += ptFinanceiro;
    breakdown.push({ label: "Situação Financeira", pontos: ptFinanceiro, max: 5, descricao: divida === 0 ? "Sem dívida pendente" : `Dívida: ${divida.toFixed(2)}€` });

    // 8. Documentação imagiológica
    const temPanoramica = imagens.some(i => (i.tipo || "").includes("panoramica"));
    const temFotos = imagens.some(i => (i.tipo || "").includes("fotografia"));
    const ptImagens = (temPanoramica ? 3 : 0) + (temFotos ? 2 : 0);
    score += ptImagens;
    breakdown.push({ label: "Documentação Imagiológica", pontos: ptImagens, max: 5, descricao: `${imagens.length} imagens no arquivo` });

    // 9. Estado do odontograma
    const dentesComProblema = Object.values(odontogramaData).filter(v => v && v !== "saudavel" && v !== "tratado" && v !== "restauracao").length;
    const ptOdonto = dentesComProblema === 0 ? 5 : dentesComProblema <= 3 ? 0 : -5;
    score += ptOdonto;
    breakdown.push({ label: "Estado Dentário", pontos: ptOdonto, max: 5, descricao: dentesComProblema > 0 ? `${dentesComProblema} dente(s) com problema` : "Sem problemas dentários registados" });

    return { score: Math.max(0, Math.min(100, score)), breakdown };
  }, [consultas, tratamentos, faturas, anamnese, imagens, odontogramaData]);

  // ─── Alertas Automáticos ──────────────────────────────────────────────────
  const alertas = useMemo(() => {
    const lista: Alerta[] = [];

    // Sem consultas recentes
    const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
    const ultimaConsulta = consultas.filter(c => c.estado === "realizada").sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0];
    if (!ultimaConsulta || new Date(ultimaConsulta.dataHoraInicio) < seisAtras) {
      lista.push({ id: "sem_consulta_recente", tipo: "aviso", titulo: "Sem consulta recente", descricao: ultimaConsulta ? `Última consulta há ${Math.round((Date.now() - new Date(ultimaConsulta.dataHoraInicio).getTime()) / (30 * 86400000))} meses` : "Nenhuma consulta realizada", icon: Calendar, accao: "Agendar consulta", accaoTab: "consultas" });
    }

    // Tratamentos pendentes
    const pendentes = tratamentos.filter(t => t.estado === "pendente" || t.estado === "proposto");
    if (pendentes.length > 0) {
      lista.push({ id: "tratamentos_pendentes", tipo: "aviso", titulo: `${pendentes.length} tratamento(s) pendente(s)`, descricao: "Existem tratamentos propostos que aguardam início", icon: Stethoscope, accao: "Ver tratamentos", accaoTab: "tratamentos" });
    }

    // Dívida financeira
    const divida = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    if (divida > 0) {
      lista.push({ id: "divida", tipo: "critico", titulo: `Dívida pendente: ${divida.toFixed(2)}€`, descricao: `${faturas.filter(f => f.estado === "pendente").length} fatura(s) por pagar`, icon: Wallet, accao: "Ver pagamentos", accaoTab: "pagamentos" });
    }

    // Anamnese em falta
    if (!anamnese) {
      lista.push({ id: "sem_anamnese", tipo: "aviso", titulo: "Anamnese não preenchida", descricao: "É importante ter a anamnese actualizada para segurança clínica", icon: FileText, accao: "Preencher anamnese", accaoTab: "saude" });
    }

    // Alergias
    if (anamnese?.alergiasDetectadas) {
      lista.push({ id: "alergias", tipo: "critico", titulo: "Alergias detectadas", descricao: "Verificar alergias antes de qualquer procedimento", icon: AlertTriangle, accao: "Ver saúde", accaoTab: "saude" });
    }

    // Sem panorâmica
    if (!imagens.some(i => (i.tipo || "").includes("panoramica"))) {
      lista.push({ id: "sem_panoramica", tipo: "info", titulo: "Sem radiografia panorâmica", descricao: "Recomenda-se panorâmica para avaliação geral", icon: Camera, accao: "Ver imagiologia", accaoTab: "imagens" });
    }

    // Dentes com problema no odontograma
    const dentesProblema = Object.entries(odontogramaData).filter(([_, v]) => v === "carie" || v === "extracao_indicada" || v === "endodontia" || v === "protese");
    if (dentesProblema.length > 0) {
      lista.push({ id: "dentes_problema", tipo: "aviso", titulo: `${dentesProblema.length} dente(s) necessitam atenção`, descricao: `Dentes: ${dentesProblema.map(([k]) => k).join(", ")}`, icon: Smile, accao: "Ver odontograma", accaoTab: "odontograma" });
    }

    // Tratamentos em progresso (positivo)
    const emProgresso = tratamentos.filter(t => t.estado === "em_progresso").length;
    if (emProgresso > 0) {
      lista.push({ id: "em_progresso", tipo: "sucesso", titulo: `${emProgresso} tratamento(s) em progresso`, descricao: "Tratamentos activos a decorrer normalmente", icon: Activity });
    }

    // Sem consultas futuras
    const futuras = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada");
    if (futuras.length === 0 && tratamentos.some(t => t.estado === "em_progresso")) {
      lista.push({ id: "sem_proxima", tipo: "aviso", titulo: "Sem próxima consulta agendada", descricao: "Existem tratamentos activos mas sem consulta de acompanhamento", icon: Bell, accao: "Agendar", accaoTab: "consultas" });
    }

    return lista.sort((a, b) => {
      const prioridade = { critico: 0, aviso: 1, info: 2, sucesso: 3 };
      return prioridade[a.tipo] - prioridade[b.tipo];
    });
  }, [consultas, tratamentos, faturas, anamnese, imagens, odontogramaData]);

  // ─── Recomendações ────────────────────────────────────────────────────────
  const recomendacoes = useMemo(() => {
    const lista: Recomendacao[] = [];

    // Limpeza semestral
    const ultimaLimpeza = consultas.filter(c => c.estado === "realizada" && ((c.tipoConsulta || "").toLowerCase().includes("limpeza") || (c.tipoConsulta || "").toLowerCase().includes("higien"))).sort((a, b) => new Date(b.dataHoraInicio).getTime() - new Date(a.dataHoraInicio).getTime())[0];
    if (!ultimaLimpeza || (Date.now() - new Date(ultimaLimpeza.dataHoraInicio).getTime()) > 180 * 86400000) {
      lista.push({ id: "limpeza", prioridade: "media", titulo: "Agendar destartarização", descricao: "Recomenda-se limpeza profissional a cada 6 meses", icon: Sparkles, cor: "text-cyan-400" });
    }

    // Radiografia periódica
    const ultimaPanoramica = imagens.filter(i => (i.tipo || "").includes("panoramica")).sort((a, b) => new Date(b.dataExame || b.createdAt).getTime() - new Date(a.dataExame || a.createdAt).getTime())[0];
    if (!ultimaPanoramica || (Date.now() - new Date(ultimaPanoramica.dataExame || ultimaPanoramica.createdAt).getTime()) > 365 * 86400000) {
      lista.push({ id: "panoramica", prioridade: "baixa", titulo: "Actualizar radiografia panorâmica", descricao: "Panorâmica anual para monitorização geral", icon: Camera, cor: "text-violet-400" });
    }

    // Tratamentos pendentes prioritários
    const caries = Object.entries(odontogramaData).filter(([_, v]) => v === "carie");
    if (caries.length > 0) {
      lista.push({ id: "tratar_caries", prioridade: "alta", titulo: `Tratar ${caries.length} cárie(s)`, descricao: `Dentes ${caries.map(([k]) => k).join(", ")} necessitam restauração`, icon: AlertTriangle, cor: "text-red-400" });
    }

    // Completar documentação
    if (imagens.length < 3) {
      lista.push({ id: "documentacao", prioridade: "baixa", titulo: "Completar documentação fotográfica", descricao: "Fotografias intraorais e extraorais para registo completo", icon: Camera, cor: "text-emerald-400" });
    }

    // Actualizar anamnese
    if (anamnese) {
      const dataAnamnese = new Date(anamnese.updatedAt || anamnese.createdAt);
      if ((Date.now() - dataAnamnese.getTime()) > 365 * 86400000) {
        lista.push({ id: "actualizar_anamnese", prioridade: "media", titulo: "Actualizar anamnese", descricao: "Anamnese com mais de 1 ano — verificar alterações de saúde", icon: Heart, cor: "text-pink-400" });
      }
    }

    return lista.sort((a, b) => {
      const p = { alta: 0, media: 1, baixa: 2 };
      return p[a.prioridade] - p[b.prioridade];
    });
  }, [consultas, imagens, odontogramaData, anamnese]);

  // ─── Tendências ───────────────────────────────────────────────────────────
  const tendencias = useMemo(() => {
    const agora = new Date();
    const seisAtras = new Date(); seisAtras.setMonth(seisAtras.getMonth() - 6);
    const dozeAtras = new Date(); dozeAtras.setMonth(dozeAtras.getMonth() - 12);

    const consultasUlt6 = consultas.filter(c => c.estado === "realizada" && new Date(c.dataHoraInicio) > seisAtras).length;
    const consultasAnt6 = consultas.filter(c => c.estado === "realizada" && new Date(c.dataHoraInicio) > dozeAtras && new Date(c.dataHoraInicio) <= seisAtras).length;

    const tratsUlt6 = tratamentos.filter(t => t.estado === "concluido" && new Date(t.dataInicio) > seisAtras).length;
    const tratsAnt6 = tratamentos.filter(t => t.estado === "concluido" && new Date(t.dataInicio) > dozeAtras && new Date(t.dataInicio) <= seisAtras).length;

    const gastoUlt6 = faturas.filter(f => f.estado === "paga" && new Date(f.createdAt) > seisAtras).reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    const gastoAnt6 = faturas.filter(f => f.estado === "paga" && new Date(f.createdAt) > dozeAtras && new Date(f.createdAt) <= seisAtras).reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);

    const imgUlt6 = imagens.filter(i => new Date(i.dataExame || i.createdAt) > seisAtras).length;
    const imgAnt6 = imagens.filter(i => {
      const d = new Date(i.dataExame || i.createdAt);
      return d > dozeAtras && d <= seisAtras;
    }).length;

    return [
      { label: "Consultas (6m)", valor: consultasUlt6, anterior: consultasAnt6, unidade: "", icon: Calendar, cor: "text-[#00E5FF]" },
      { label: "Tratamentos Concluídos", valor: tratsUlt6, anterior: tratsAnt6, unidade: "", icon: Stethoscope, cor: "text-emerald-400" },
      { label: "Investimento (6m)", valor: Math.round(gastoUlt6), anterior: Math.round(gastoAnt6), unidade: "€", icon: Wallet, cor: "text-violet-400" },
      { label: "Imagens (6m)", valor: imgUlt6, anterior: imgAnt6, unidade: "", icon: Camera, cor: "text-pink-400" },
    ] as Tendencia[];
  }, [consultas, tratamentos, faturas, imagens]);

  // ─── Resumo Executivo ─────────────────────────────────────────────────────
  const resumo = useMemo(() => {
    const totalTrats = tratamentos.length;
    const emProgresso = tratamentos.filter(t => t.estado === "em_progresso").length;
    const concluidos = tratamentos.filter(t => t.estado === "concluido").length;
    const totalConsultas = consultas.filter(c => c.estado === "realizada").length;
    const proximaConsulta = consultas.filter(c => new Date(c.dataHoraInicio) > new Date() && c.estado !== "cancelada").sort((a, b) => new Date(a.dataHoraInicio).getTime() - new Date(b.dataHoraInicio).getTime())[0];
    const totalGasto = faturas.filter(f => f.estado === "paga").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);
    const divida = faturas.filter(f => f.estado === "pendente").reduce((acc: number, f: any) => acc + parseFloat(f.valorTotal || "0"), 0);

    return { totalTrats, emProgresso, concluidos, totalConsultas, proximaConsulta, totalGasto, divida };
  }, [tratamentos, consultas, faturas]);

  const alertaCores = {
    critico: { bg: "bg-red-500/10", border: "border-red-500/20", text: "text-red-400", iconBg: "bg-red-500/20" },
    aviso: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-400", iconBg: "bg-amber-500/20" },
    info: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400", iconBg: "bg-blue-500/20" },
    sucesso: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400", iconBg: "bg-emerald-500/20" },
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Action Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-pink-500/5 to-rose-500/5 border border-pink-500/20 backdrop-blur-xl shadow-sm flex-wrap">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-pink-400" />
          <span className="text-[var(--text-primary)] text-xs font-bold">Insights Clínicos</span>
          <span className="text-[var(--text-muted)] text-[10px]">— Análise automática do histórico do utente</span>
        </div>
        <div className="ml-auto">
          <button onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-3 h-3" /> Actualizar
          </button>
        </div>
      </div>

      {/* ─── Score de Saúde Oral ──────────────────────────────────────────────── */}
      <div className="card-premium p-6 border border-[var(--border-primary)]">
        <div className="flex items-start gap-6">
          {/* Score circular */}
          <div className="shrink-0 text-center">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--bg-secondary)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none"
                  stroke={healthAnalysis.score >= 80 ? "#34D399" : healthAnalysis.score >= 50 ? "#FBBF24" : "#F87171"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${(healthAnalysis.score / 100) * 264} 264`}
                  className="transition-all duration-1000" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black ${healthAnalysis.score >= 80 ? "text-emerald-400" : healthAnalysis.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {healthAnalysis.score}
                </span>
                <span className="text-[var(--text-muted)] text-[9px] font-bold uppercase">Score</span>
              </div>
            </div>
            <p className={`text-xs font-bold mt-2 ${healthAnalysis.score >= 80 ? "text-emerald-400" : healthAnalysis.score >= 50 ? "text-amber-400" : "text-red-400"}`}>
              {healthAnalysis.score >= 80 ? "Excelente" : healthAnalysis.score >= 60 ? "Bom" : healthAnalysis.score >= 40 ? "Regular" : "Atenção"}
            </p>
          </div>

          {/* Breakdown */}
          <div className="flex-1 space-y-2">
            <h3 className="text-[var(--text-primary)] font-bold text-sm mb-3">Análise Detalhada</h3>
            {healthAnalysis.breakdown.map(item => (
              <div key={item.label} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[var(--text-secondary)] text-[10px] font-semibold">{item.label}</span>
                    <span className={`text-[10px] font-bold ${item.pontos > 0 ? "text-emerald-400" : item.pontos < 0 ? "text-red-400" : "text-[var(--text-muted)]"}`}>
                      {item.pontos > 0 ? "+" : ""}{item.pontos}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--bg-secondary)] overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.max > 0 ? Math.max(0, (item.pontos / item.max) * 100) : item.pontos >= 0 ? 100 : 0}%`,
                        backgroundColor: item.pontos > 0 ? "#34D399" : item.pontos < 0 ? "#F87171" : "#64748B",
                      }} />
                  </div>
                  <p className="text-[var(--text-muted)] text-[9px] mt-0.5">{item.descricao}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Alertas ─────────────────────────────────────────────────────────── */}
      {alertas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-amber-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Alertas e Notificações</h3>
            <span className="text-[var(--text-muted)] text-[10px]">({alertas.length})</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {alertas.map(alerta => {
              const cores = alertaCores[alerta.tipo];
              const Icon = alerta.icon;
              return (
                <div key={alerta.id} className={`p-4 rounded-xl border ${cores.bg} ${cores.border} transition-all hover:scale-[1.01]`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-lg ${cores.iconBg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-4 h-4 ${cores.text}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold ${cores.text}`}>{alerta.titulo}</p>
                      <p className="text-[var(--text-muted)] text-xs mt-0.5">{alerta.descricao}</p>
                      {alerta.accao && alerta.accaoTab && (
                        <button onClick={() => onNavigate(alerta.accaoTab!)}
                          className={`mt-2 inline-flex items-center gap-1 text-[10px] font-bold ${cores.text} hover:underline`}>
                          {alerta.accao} <ChevronRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Tendências ──────────────────────────────────────────────────────── */}
      <div className="card-premium p-5 border border-[var(--border-primary)]">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[#00E5FF]" />
          <h3 className="text-[var(--text-primary)] font-bold text-sm">Tendências (últimos 6 meses vs. anteriores)</h3>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {tendencias.map(t => {
            const Icon = t.icon;
            const diff = t.valor - t.anterior;
            const isUp = diff > 0;
            const isDown = diff < 0;
            return (
              <div key={t.label} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
                <div className="flex items-center justify-between mb-2">
                  <Icon className={`w-5 h-5 ${t.cor}`} />
                  {diff !== 0 ? (
                    <div className={`flex items-center gap-0.5 text-[10px] font-bold ${isUp ? "text-emerald-400" : "text-red-400"}`}>
                      {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                      {Math.abs(diff)}
                    </div>
                  ) : (
                    <div className="flex items-center gap-0.5 text-[10px] font-bold text-[var(--text-muted)]">
                      <Minus className="w-3 h-3" /> Igual
                    </div>
                  )}
                </div>
                <p className="text-[var(--text-primary)] text-xl font-black">{t.valor}{t.unidade}</p>
                <p className="text-[var(--text-muted)] text-[10px]">{t.label}</p>
                <p className="text-[var(--text-muted)] text-[9px]">Anterior: {t.anterior}{t.unidade}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Recomendações ───────────────────────────────────────────────────── */}
      {recomendacoes.length > 0 && (
        <div className="card-premium p-5 border border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Recomendações</h3>
          </div>
          <div className="space-y-3">
            {recomendacoes.map(rec => {
              const Icon = rec.icon;
              const prioridadeCor = rec.prioridade === "alta" ? "bg-red-500/15 text-red-300 border-red-500/30" : rec.prioridade === "media" ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-blue-500/15 text-blue-300 border-blue-500/30";
              return (
                <div key={rec.id} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--border-secondary)] transition-all">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${rec.cor.replace("text-", "bg-").replace("400", "500/15")} border ${rec.cor.replace("text-", "border-").replace("400", "500/30")}`}>
                    <Icon className={`w-5 h-5 ${rec.cor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold">{rec.titulo}</p>
                    <p className="text-[var(--text-muted)] text-xs">{rec.descricao}</p>
                  </div>
                  <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full border ${prioridadeCor}`}>
                    {rec.prioridade}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Resumo Executivo ─────────────────────────────────────────────────── */}
      <div className="card-premium p-5 border border-[var(--border-primary)]">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-slate-400" />
          <h3 className="text-[var(--text-primary)] font-bold text-sm">Resumo do Utente</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "Total Tratamentos", valor: resumo.totalTrats, sub: `${resumo.emProgresso} activos, ${resumo.concluidos} concluídos`, cor: "text-amber-400" },
            { label: "Consultas Realizadas", valor: resumo.totalConsultas, sub: resumo.proximaConsulta ? `Próxima: ${new Date(resumo.proximaConsulta.dataHoraInicio).toLocaleDateString("pt-PT")}` : "Sem próxima agendada", cor: "text-[#00E5FF]" },
            { label: "Total Investido", valor: `${resumo.totalGasto.toFixed(0)}€`, sub: resumo.divida > 0 ? `Dívida: ${resumo.divida.toFixed(2)}€` : "Sem dívida", cor: "text-violet-400" },
            { label: "Imagens no Arquivo", valor: imagens.length, sub: `${imagens.filter(i => i.analiseIA).length} com análise IA`, cor: "text-pink-400" },
          ].map(item => (
            <div key={item.label} className="p-4 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)]">
              <p className="text-[var(--text-muted)] text-[9px] font-bold uppercase">{item.label}</p>
              <p className={`text-xl font-black mt-1 ${item.cor}`}>{item.valor}</p>
              <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default InsightsClinicosTab;
