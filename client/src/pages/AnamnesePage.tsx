/**
 * AnamnesePage.tsx — Anamnese Digital com Termos RGPD e Assinatura
 * DentCare Elite V32.8 — Redesign Completo da Secção de Termos
 *
 * Fluxo:
 * 1. Questionário de Saúde
 * 2. Termos & Consentimento (checkboxes RGPD individuais com validação visual)
 * 3. Assinatura Digital
 *
 * Conformidade RGPD:
 * - Cada termo tem checkbox individual "Li e aceito"
 * - Termos obrigatórios bloqueiam a progressão
 * - Termos opcionais podem ser recusados
 * - Validação visual com ícones (verde/vermelho)
 * - Assinatura digital obrigatória
 * - Registo de data/hora de aceitação
 */
import React, { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  ClipboardList, Search, Check, AlertCircle, ChevronDown,
  ChevronUp, Heart, Pill, Cigarette, Wine, Activity,
  FileCheck, Clock, User, Loader2, Signature, X, RefreshCw,
  Shield, Info, Save, CheckCircle, FileText, Lock,
  Eye, EyeOff, ChevronRight, AlertTriangle, XCircle,
  CheckSquare, Square
} from "lucide-react";

// ─── Tipos e Configurações ────────────────────────────────────────────────────
interface Pergunta {
  id: string;
  label: string;
  tipo: "yesno" | "text" | "multiselect";
  opcoes?: string[];
  icone?: React.ElementType;
  grupo: string;
}

const PERGUNTAS: Pergunta[] = [
  { id: "doencas_cronicas", label: "Tem alguma doença crónica diagnosticada?", tipo: "yesno", grupo: "Saúde Geral", icone: Heart },
  { id: "doencas_cronicas_desc", label: "Se sim, quais?", tipo: "text", grupo: "Saúde Geral" },
  { id: "medicacao", label: "Toma medicação regularmente?", tipo: "yesno", grupo: "Saúde Geral", icone: Pill },
  { id: "medicacao_desc", label: "Se sim, qual medicação?", tipo: "text", grupo: "Saúde Geral" },
  { id: "alergias", label: "Tem alergias conhecidas (medicamentos, látex, etc.)?", tipo: "yesno", grupo: "Saúde Geral", icone: AlertCircle },
  { id: "alergias_desc", label: "Se sim, quais as alergias?", tipo: "text", grupo: "Saúde Geral" },
  { id: "cirurgias", label: "Já realizou alguma cirurgia?", tipo: "yesno", grupo: "Histórico Médico" },
  { id: "cirurgias_desc", label: "Se sim, qual cirurgia e quando?", tipo: "text", grupo: "Histórico Médico" },
  { id: "diabetes", label: "Tem diabetes?", tipo: "yesno", grupo: "Condições Específicas" },
  { id: "hipertensao", label: "Tem hipertensão arterial?", tipo: "yesno", grupo: "Condições Específicas" },
  { id: "cardiopatia", label: "Tem alguma doença cardíaca?", tipo: "yesno", grupo: "Condições Específicas" },
  { id: "coagulacao", label: "Tem problemas de coagulação sanguínea?", tipo: "yesno", grupo: "Condições Específicas" },
  { id: "fumador", label: "É fumador?", tipo: "yesno", grupo: "Hábitos", icone: Cigarette },
  { id: "alcool", label: "Consome bebidas alcoólicas regularmente?", tipo: "yesno", grupo: "Hábitos", icone: Wine },
  { id: "sangramento_gengivas", label: "As suas gengivas sangram ao escovar?", tipo: "yesno", grupo: "Saúde Oral" },
  { id: "ranger_dentes", label: "Range ou aperta os dentes (bruxismo)?", tipo: "yesno", grupo: "Saúde Oral" },
  { id: "observacoes", label: "Observações adicionais", tipo: "text", grupo: "Observações" },
];

const GRUPOS = [...new Set(PERGUNTAS.map(p => p.grupo))];

// ─── Componente: Canvas de Assinatura ──────────────────────────────────────────
function CanvasAssinatura({ onAssinado, assinaturaExistente }: { onAssinado: (dataUrl: string) => void; assinaturaExistente?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [temDesenho, setTemDesenho] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (assinaturaExistente) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setTemDesenho(true);
      };
      img.src = assinaturaExistente;
    }

    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [assinaturaExistente]);

  const getPos = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: any) => {
    e.preventDefault();
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: any) => {
    e.preventDefault();
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const imageData = canvas.getContext("2d")?.getImageData(0, 0, canvas.width, canvas.height);
      const hasDrawing = imageData?.data.some((pixel, index) => {
        if (index % 4 === 3) return false;
        return pixel < 255;
      });
      setTemDesenho(hasDrawing || false);
      onAssinado(canvas.toDataURL());
    }
  };

  const limpar = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    setTemDesenho(false);
    onAssinado("");
  };

  return (
    <div className="space-y-3">
      <div className="border-2 border-[var(--border-light)] rounded-xl bg-[var(--bg-elevated)] overflow-hidden touch-none shadow-sm">
        <canvas
          ref={canvasRef}
          width={600}
          height={200}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="w-full h-48 cursor-crosshair block"
        />
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs">
          {temDesenho ? (
            <div className="flex items-center gap-1 text-emerald-600">
              <Check className="w-4 h-4" />
              <span>Assinatura capturada</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-[var(--text-tertiary)]">
              <AlertCircle className="w-4 h-4" />
              <span>Assine no espaço acima</span>
            </div>
          )}
        </div>
        <button
          onClick={limpar}
          className="text-xs text-[#00E5FF] flex items-center gap-1 hover:text-[#00E5FF] transition-colors"
        >
          <RefreshCw className="w-3 h-3" /> Limpar
        </button>
      </div>
    </div>
  );
}

// ─── Componente: Card de Termo RGPD com Checkbox ──────────────────────────────
function TermoRGPDCard({
  termo,
  aceite,
  onToggle,
}: {
  termo: any;
  aceite: boolean;
  onToggle: () => void;
}) {
  const [expandido, setExpandido] = useState(false);

  return (
    <div className={`rounded-2xl border-2 transition-all duration-300 overflow-hidden ${
      aceite
        ? 'border-emerald-500/40 bg-emerald-500/[0.03] shadow-sm shadow-emerald-500/5'
        : termo.obrigatorio
          ? 'border-red-500/20 bg-red-500/[0.02]'
          : 'border-[var(--border-light)] bg-[var(--bg-surface)]'
    }`}>
      {/* Cabeçalho do Termo */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Ícone de Estado (grande e visível como na imagem) */}
          <div className="shrink-0 mt-0.5">
            {aceite ? (
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-emerald-500" />
              </div>
            ) : (
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                termo.obrigatorio ? 'bg-red-500/10' : 'bg-[var(--bg-overlay)]'
              }`}>
                {termo.obrigatorio ? (
                  <XCircle className="w-6 h-6 text-red-400/60" />
                ) : (
                  <Square className="w-6 h-6 text-[var(--text-muted)]" />
                )}
              </div>
            )}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h4 className="text-sm font-bold text-[var(--text-primary)]">{termo.titulo}</h4>
              {termo.obrigatorio ? (
                <span className="px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 text-[8px] font-black uppercase tracking-widest border border-red-500/10 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" /> Obrigatório
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-[8px] font-black uppercase tracking-widest border border-blue-500/10">
                  Opcional
                </span>
              )}
            </div>

            {/* Preview do conteúdo */}
            {!expandido && (
              <p className="text-[11px] text-[var(--text-muted)] line-clamp-2 leading-relaxed">{termo.conteudo.substring(0, 180)}...</p>
            )}
          </div>

          {/* Botão expandir */}
          <button
            onClick={() => setExpandido(!expandido)}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors shrink-0"
            title={expandido ? "Recolher" : "Ler termo completo"}
          >
            {expandido ? <ChevronUp className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Conteúdo Expandido (leitura completa) */}
      {expandido && (
        <div className="mx-4 mb-3 p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] max-h-72 overflow-y-auto">
          <pre className="text-[11px] text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">{termo.conteudo}</pre>
        </div>
      )}

      {/* Checkbox de Aceitação */}
      <div className={`px-4 py-3 border-t transition-colors ${
        aceite
          ? 'border-emerald-500/20 bg-emerald-500/[0.05]'
          : 'border-[var(--border-lightest)] bg-[var(--bg-overlay)]'
      }`}>
        <label className="flex items-center gap-3 cursor-pointer select-none group">
          {/* Checkbox customizado */}
          <div className="relative shrink-0">
            <input
              type="checkbox"
              checked={aceite}
              onChange={onToggle}
              className="sr-only peer"
            />
            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200 ${
              aceite
                ? 'bg-emerald-500 border-emerald-500 shadow-sm shadow-emerald-500/30'
                : termo.obrigatorio
                  ? 'border-red-400/40 bg-[var(--bg-surface)] group-hover:border-red-400/60'
                  : 'border-[var(--border-light)] bg-[var(--bg-surface)] group-hover:border-[#00E5FF]/40'
            }`}>
              {aceite && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
            </div>
          </div>

          {/* Texto da checkbox */}
          <span className={`text-xs font-semibold leading-snug transition-colors ${
            aceite
              ? 'text-emerald-500'
              : 'text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'
          }`}>
            {aceite ? (
              <>Li, compreendi e aceito {termo.obrigatorio ? '' : '(opcional) '}<strong>{termo.titulo}</strong></>
            ) : (
              <>Li e aceito {termo.obrigatorio ? '' : '(opcional) '}<strong>{termo.titulo}</strong></>
            )}
          </span>

          {/* Indicador visual de estado (como na imagem) */}
          <div className="ml-auto shrink-0">
            {aceite ? (
              <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                <Check className="w-5 h-5 text-emerald-500" strokeWidth={3} />
              </div>
            ) : termo.obrigatorio ? (
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <X className="w-5 h-5 text-red-400" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center">
                <div className="w-3 h-3 rounded-full border-2 border-[var(--text-muted)]" />
              </div>
            )}
          </div>
        </label>
      </div>
    </div>
  );
}

// ─── Componente: Resumo de Aceitação ──────────────────────────────────────────
function ResumoAceitacao({
  termos,
  termosAceites,
}: {
  termos: any[];
  termosAceites: number[];
}) {
  const obrigatorios = termos.filter((t: any) => t.obrigatorio && t.ativo);
  const opcionais = termos.filter((t: any) => !t.obrigatorio && t.ativo);
  const obrigatoriosAceites = obrigatorios.filter((t: any) => termosAceites.includes(t.id));
  const opcionaisAceites = opcionais.filter((t: any) => termosAceites.includes(t.id));
  const todosObrigatoriosAceites = obrigatorios.length === obrigatoriosAceites.length;

  return (
    <div className={`p-4 rounded-xl border-2 transition-all ${
      todosObrigatoriosAceites
        ? 'border-emerald-500/30 bg-emerald-500/[0.03]'
        : 'border-amber-500/30 bg-amber-500/[0.03]'
    }`}>
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
          todosObrigatoriosAceites ? 'bg-emerald-500/15' : 'bg-amber-500/15'
        }`}>
          {todosObrigatoriosAceites ? (
            <Shield className="w-5 h-5 text-emerald-500" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          )}
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-bold mb-2 ${
            todosObrigatoriosAceites ? 'text-emerald-500' : 'text-amber-500'
          }`}>
            {todosObrigatoriosAceites
              ? 'Todos os termos obrigatórios foram aceites'
              : `Faltam ${obrigatorios.length - obrigatoriosAceites.length} termo(s) obrigatório(s)`
            }
          </h4>
          <div className="space-y-1.5">
            {obrigatorios.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                {termosAceites.includes(t.id) ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                )}
                <span className={termosAceites.includes(t.id) ? 'text-emerald-500/80' : 'text-red-400/80'}>
                  {t.titulo}
                </span>
                <span className="text-[8px] font-black text-red-400/50 uppercase tracking-widest">(obrigatório)</span>
              </div>
            ))}
            {opcionais.map((t: any) => (
              <div key={t.id} className="flex items-center gap-2 text-xs">
                {termosAceites.includes(t.id) ? (
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                ) : (
                  <div className="w-3.5 h-3.5 rounded-full border border-[var(--text-muted)] shrink-0" />
                )}
                <span className={termosAceites.includes(t.id) ? 'text-emerald-500/80' : 'text-[var(--text-muted)]'}>
                  {t.titulo}
                </span>
                <span className="text-[8px] font-black text-blue-400/50 uppercase tracking-widest">(opcional)</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export function AnamnesePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUtente, setSelectedUtente] = useState<any>(null);
  const [respostas, setRespostas] = useState<Record<string, any>>({});
  const [assinatura, setAssinatura] = useState("");
  const [termosAceites, setTermosAceites] = useState<number[]>([]);
  const [etapa, setEtapa] = useState<"questionario" | "termos" | "assinatura">("questionario");
  const search = useSearch();
  const params = new URLSearchParams(search);
  const utenteIdParam = params.get("utenteId");

  const utils = trpc.useUtils();
  const utentesQuery = trpc.utentes.list.useQuery();
  const termosQuery = trpc.termosConsentimento.listarTermos.useQuery();
  const fichaQuery = trpc.fichaUtente.obterFicha.useQuery(
    { utenteId: selectedUtente?.id ?? 0 },
    { enabled: !!selectedUtente }
  );

  // Selecionar utente automaticamente se vier via URL
  useEffect(() => {
    if (utenteIdParam && utentesQuery.data) {
      const utente = utentesQuery.data.utentes?.find(u => u.id === parseInt(utenteIdParam));
      if (utente) setSelectedUtente(utente);
    }
  }, [utenteIdParam, utentesQuery.data]);

  const guardarMutation = trpc.fichaUtente.guardarAnamnese.useMutation({
    onSuccess: (data) => {
      alert(data.message || "Anamnese guardada com sucesso!");
      setSelectedUtente(null);
      setEtapa("questionario");
      setRespostas({});
      setAssinatura("");
      setTermosAceites([]);
      utils.fichaUtente.obterFicha.invalidate();
    },
    onError: (error) => {
      alert(parseApiError(error, "Erro ao guardar"));
    }
  });

  useEffect(() => {
    if (fichaQuery.data?.anamnese) {
      try {
        setRespostas(JSON.parse(fichaQuery.data.anamnese.respostas));
        if (fichaQuery.data.anamnese.assinaturaDigital) {
          setAssinatura(fichaQuery.data.anamnese.assinaturaDigital);
        }
        if (fichaQuery.data.anamnese.termosAceites) {
          try {
            const termos = JSON.parse(fichaQuery.data.anamnese.termosAceites);
            setTermosAceites(termos);
          } catch (e) { console.error(e); }
        }
      } catch (e) { console.error(e); }
    }
  }, [fichaQuery.data]);

  const termosAtivos = termosQuery.data?.termos?.filter((t: any) => t.ativo) || [];

  const toggleTermo = (termoId: number) => {
    if (termosAceites.includes(termoId)) {
      setTermosAceites(termosAceites.filter(id => id !== termoId));
    } else {
      setTermosAceites([...termosAceites, termoId]);
    }
  };

  const todosTermosObrigatoriosAceites = () => {
    const termosObrigatorios = termosAtivos.filter((t: any) => t.obrigatorio).map((t: any) => t.id);
    return termosObrigatorios.every((id: number) => termosAceites.includes(id));
  };

  const handleGuardar = () => {
    if (!selectedUtente) return;

    if (!todosTermosObrigatoriosAceites()) {
      alert("Deve aceitar todos os termos obrigatórios antes de guardar.");
      setEtapa("termos");
      return;
    }

    if (!assinatura || assinatura === "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==") {
      alert("A assinatura digital é obrigatória. Por favor, assine no espaço fornecido.");
      setEtapa("assinatura");
      return;
    }

    guardarMutation.mutate({
      utenteId: selectedUtente.id,
      respostas,
      assinaturaDigital: assinatura,
      termosAceites: JSON.stringify(termosAceites),
      alergiasDetectadas: respostas.alergias === "Sim" ? respostas.alergias_desc : undefined,
      problemasSaude: [
        respostas.diabetes === "Sim" ? "Diabetes" : null,
        respostas.hipertensao === "Sim" ? "Hipertensão" : null,
      ].filter(Boolean).join(", ") || undefined
    });
  };

  // ─── Ecrã de Seleção de Utente ──────────────────────────────────────────────
  if (!selectedUtente) {
    return (
      <div className="space-y-6">
        <h1 className="page-header-title">Anamnese Digital</h1>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
          <input
            type="text"
            placeholder="Pesquisar utente..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#00E5FF]/50"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {utentesQuery.data?.utentes.filter(u => u.nome.toLowerCase().includes(searchTerm.toLowerCase())).map(u => (
            <button
              key={u.id}
              onClick={() => setSelectedUtente(u)}
              className="card-premium p-4 flex items-center gap-4 hover:border-[#00E5FF]/30 transition-all text-left"
            >
              <div className="w-10 h-10 rounded-full bg-[#00E5FF]/10 flex items-center justify-center text-[#00E5FF] font-bold">
                {u.nome.charAt(0)}
              </div>
              <div>
                <p className="text-sm font-bold text-[var(--text-primary)]">{u.nome}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{u.telemovel}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ─── Ecrã Principal da Anamnese ─────────────────────────────────────────────
  return (
    <div className="space-y-6 font-sans">
      {/* Header com navegação de etapas */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedUtente(null)} className="p-2 hover:bg-[var(--bg-overlay)] rounded-lg text-[var(--text-muted)]">
            <X className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)]">{selectedUtente.nome}</h1>
            <p className="text-xs text-[#00E5FF] font-medium">Questionário de Saúde Digital</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setEtapa("questionario")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
              etapa === 'questionario'
                ? 'bg-[#00E5FF]/20 border-[#00E5FF]/40 text-[#00E5FF]'
                : 'border-[var(--border-light)] text-[var(--text-muted)]'
            }`}
          >
            1. Questionário
          </button>
          <button
            onClick={() => setEtapa("termos")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
              etapa === 'termos'
                ? 'bg-[#00E5FF]/20 border-[#00E5FF]/40 text-[#00E5FF]'
                : todosTermosObrigatoriosAceites()
                  ? 'border-emerald-500/30 text-emerald-400'
                  : 'border-[var(--border-light)] text-[var(--text-muted)]'
            }`}
          >
            {todosTermosObrigatoriosAceites() && etapa !== 'termos' && <CheckCircle className="w-3 h-3" />}
            2. Termos
          </button>
          <button
            onClick={() => setEtapa("assinatura")}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${
              etapa === 'assinatura'
                ? 'bg-[#00E5FF]/20 border-[#00E5FF]/40 text-[#00E5FF]'
                : assinatura
                  ? 'border-emerald-500/30 text-emerald-400'
                  : 'border-[var(--border-light)] text-[var(--text-muted)]'
            }`}
          >
            3. Assinatura
          </button>
        </div>
      </div>

      <div className="card-premium p-6">
        {/* ═══ ETAPA 1: Questionário ═══════════════════════════════════════════ */}
        {etapa === "questionario" && (
          <div className="space-y-8">
            {GRUPOS.map(grupo => (
              <div key={grupo} className="space-y-4">
                <h3 className="text-xs font-black text-[#00E5FF] uppercase tracking-[0.2em] border-b border-[var(--border-light)] pb-2">{grupo}</h3>
                <div className="grid grid-cols-1 gap-6">
                  {PERGUNTAS.filter(p => p.grupo === grupo).map(p => (
                    <div key={p.id} className="space-y-3">
                      <div className="flex items-start justify-between gap-4">
                        <label className="text-sm text-[var(--text-secondary)] font-medium leading-relaxed">{p.label}</label>
                        {p.tipo === "yesno" && (
                          <div className="flex bg-white/25 p-1 rounded-xl border border-[var(--border-light)] shrink-0">
                            {["Sim", "Não"].map(opt => (
                              <button
                                key={opt}
                                onClick={() => setRespostas({...respostas, [p.id]: opt})}
                                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${respostas[p.id] === opt ? 'bg-[#00E5FF] text-white shadow-lg shadow-[#00E5FF]/20' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      {p.tipo === "text" && (
                        <input
                          type="text"
                          value={respostas[p.id] || ""}
                          onChange={e => setRespostas({...respostas, [p.id]: e.target.value})}
                          className="w-full bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#00E5FF]/30"
                          placeholder="Detalhes..."
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <button onClick={() => setEtapa("termos")} className="btn-primary w-full py-4 flex items-center justify-center gap-2">
              Próximo Passo: Termos de Consentimento <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* ═══ ETAPA 2: Termos & Consentimento RGPD ═══════════════════════════ */}
        {etapa === "termos" && (
          <div className="space-y-6">
            {/* Banner informativo RGPD */}
            <div className="p-4 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex gap-3">
              <Shield className="w-5 h-5 text-[#00E5FF] shrink-0 mt-0.5" />
              <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
                <p className="font-bold text-[#00E5FF] text-sm">Termos & Consentimento — Conformidade RGPD</p>
                <p>
                  Em conformidade com o <strong>Regulamento (UE) 2016/679</strong> (RGPD) e a <strong>Lei n.º 58/2019</strong>,
                  por favor leia atentamente cada termo abaixo. Clique na caixa de verificação para confirmar que
                  <strong> leu e aceita</strong> cada termo. Os termos marcados como <strong>obrigatórios</strong> devem
                  ser aceites para poder prosseguir para a assinatura digital.
                </p>
              </div>
            </div>

            {/* Lista de Termos com Checkboxes */}
            <div className="space-y-4">
              {termosAtivos.length > 0 ? (
                <>
                  {/* Termos Obrigatórios primeiro */}
                  {termosAtivos.filter((t: any) => t.obrigatorio).length > 0 && (
                    <div className="space-y-3">
                      <h3 className="text-[10px] font-black text-red-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Lock className="w-3 h-3" />
                        Termos Obrigatórios
                      </h3>
                      {termosAtivos.filter((t: any) => t.obrigatorio).map((termo: any) => (
                        <TermoRGPDCard
                          key={termo.id}
                          termo={termo}
                          aceite={termosAceites.includes(termo.id)}
                          onToggle={() => toggleTermo(termo.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Termos Opcionais */}
                  {termosAtivos.filter((t: any) => !t.obrigatorio).length > 0 && (
                    <div className="space-y-3 mt-6">
                      <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                        <Info className="w-3 h-3" />
                        Termos Opcionais
                      </h3>
                      <p className="text-[10px] text-[var(--text-muted)]">
                        A recusa destes termos não afeta a prestação dos serviços de saúde.
                      </p>
                      {termosAtivos.filter((t: any) => !t.obrigatorio).map((termo: any) => (
                        <TermoRGPDCard
                          key={termo.id}
                          termo={termo}
                          aceite={termosAceites.includes(termo.id)}
                          onToggle={() => toggleTermo(termo.id)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Resumo de Aceitação */}
                  <div className="mt-6">
                    <ResumoAceitacao termos={termosAtivos} termosAceites={termosAceites} />
                  </div>
                </>
              ) : (
                <div className="p-8 text-center border border-dashed border-[var(--border-light)] rounded-2xl">
                  <Shield className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                  <p className="text-sm text-[var(--text-secondary)] font-medium">Não existem termos de consentimento configurados.</p>
                  <p className="text-xs text-[var(--text-muted)] mt-1">O administrador da clínica pode configurar os termos em Configurações &gt; Termos de Consentimento.</p>
                </div>
              )}
            </div>

            {/* Botões de Navegação */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setEtapa("questionario")}
                className="flex-1 py-3.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Voltar ao Questionário
              </button>
              <button
                onClick={() => setEtapa("assinatura")}
                disabled={!todosTermosObrigatoriosAceites()}
                className="flex-[2] py-3.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#00E5FF]/20"
              >
                {todosTermosObrigatoriosAceites() ? (
                  <>Próximo Passo: Assinatura Digital <ChevronRight className="w-4 h-4" /></>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Aceite todos os termos obrigatórios para continuar
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ═══ ETAPA 3: Assinatura Digital ════════════════════════════════════ */}
        {etapa === "assinatura" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <Signature className="w-12 h-12 text-[#00E5FF] mx-auto opacity-50" />
              <h3 className="text-lg font-bold text-[var(--text-primary)]">Assinatura Digital do Utente</h3>
              <p className="text-xs text-[var(--text-muted)]">Utilize o rato ou o ecrã táctil para assinar no espaço abaixo</p>
            </div>

            {/* Resumo dos termos aceites antes da assinatura */}
            <div className="p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
              <h4 className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <FileCheck className="w-3.5 h-3.5" />
                Resumo dos Termos Aceites
              </h4>
              <div className="space-y-1.5">
                {termosAtivos.map((t: any) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    {termosAceites.includes(t.id) ? (
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    )}
                    <span className={termosAceites.includes(t.id) ? 'text-[var(--text-secondary)]' : 'text-[var(--text-muted)]'}>
                      {t.titulo}
                    </span>
                    {termosAceites.includes(t.id) ? (
                      <span className="text-[8px] font-black text-emerald-500/60 uppercase tracking-widest ml-auto">Aceite</span>
                    ) : (
                      <span className="text-[8px] font-black text-red-400/60 uppercase tracking-widest ml-auto">
                        {t.obrigatorio ? 'Não aceite' : 'Recusado'}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Declaração legal antes da assinatura */}
            <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/15 flex gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                Ao assinar abaixo, declaro que li e compreendi todos os termos acima indicados, que tive oportunidade de esclarecer
                todas as dúvidas, e que dou o meu consentimento livre, específico, informado e inequívoco para o tratamento dos
                meus dados pessoais conforme descrito nos termos aceites.
              </p>
            </div>

            <CanvasAssinatura onAssinado={setAssinatura} assinaturaExistente={assinatura} />

            {assinatura && assinatura !== "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" && (
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="text-xs text-emerald-300 font-bold">Assinatura capturada com sucesso</p>
                  <p className="text-[10px] text-emerald-400/60 mt-0.5">
                    Data e hora: {new Date().toLocaleString('pt-PT')} — A assinatura será vinculada ao historial clínico.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setEtapa("termos")} className="flex-1 py-4 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-bold hover:bg-[var(--bg-overlay)] transition-colors">
                Voltar aos Termos
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardarMutation.isPending || !assinatura}
                className="flex-[2] py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {guardarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {guardarMutation.isPending ? "A guardar..." : "Finalizar e Guardar Anamnese"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
