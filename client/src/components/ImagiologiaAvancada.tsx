/**
 * ImagiologiaAvancada.tsx — Módulo de Imagiologia Premium
 * DentCare Elite V35 — Redesign Premium
 *
 * Funcionalidades:
 * - Galeria avançada com grid/lista/timeline
 * - Comparação lado-a-lado de imagens (antes/depois)
 * - Anotações sobre imagens com marcadores
 * - Timeline cronológica visual
 * - Categorização inteligente com presets de tipo
 * - Análise IA integrada
 * - Barra de progressão de documentação
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  Camera, Image, Upload, Download, Trash2, X, Sparkles,
  Maximize2, Scan, Filter, Layers, ClipboardList,
  Calendar, Clock, Eye, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, RotateCw, Loader2, RefreshCw,
  FileText, AlertCircle, CheckCircle, Grid3X3,
  ArrowLeftRight, MessageSquare, Tag, TrendingUp,
  Bookmark, Star, Search, SlidersHorizontal,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────
interface Anotacao {
  id: string;
  x: number; // percentagem 0-100
  y: number; // percentagem 0-100
  texto: string;
  cor: string;
  dataCriacao: string;
}

// ─── Configurações ──────────────────────────────────────────────────────────
const TIPOS_IMAGEM: Record<string, { label: string; icon: React.ComponentType<any>; cor: string; bg: string; border: string }> = {
  radiografia_panoramica: { label: "Panorâmica", icon: Scan, cor: "text-blue-400", bg: "bg-blue-500/15", border: "border-blue-500/30" },
  radiografia_periapical: { label: "Periapical", icon: Scan, cor: "text-cyan-400", bg: "bg-cyan-500/15", border: "border-cyan-500/30" },
  radiografia_bitewing: { label: "Bitewing", icon: Scan, cor: "text-[#00E5FF]", bg: "bg-[#00E5FF]/15", border: "border-[#00E5FF]/30" },
  radiografia_cefalometrica: { label: "Cefalométrica", icon: Scan, cor: "text-violet-400", bg: "bg-violet-500/15", border: "bordto-[#B388FF]/30" },
  fotografia_intraoral: { label: "Intraoral", icon: Camera, cor: "text-emerald-400", bg: "bg-emerald-500/15", border: "border-emerald-500/30" },
  fotografia_extraoral: { label: "Extraoral", icon: Camera, cor: "text-green-400", bg: "bg-green-500/15", border: "border-green-500/30" },
  cbct: { label: "CBCT/3D", icon: Grid3X3, cor: "text-pink-400", bg: "bg-pink-500/15", border: "border-pink-500/30" },
  scan_intraoral: { label: "Scan Intraoral", icon: Scan, cor: "text-amber-400", bg: "bg-amber-500/15", border: "border-amber-500/30" },
  outro: { label: "Outro", icon: Image, cor: "text-slate-400", bg: "bg-slate-500/15", border: "border-slate-500/30" },
};

const DOCUMENTACAO_NECESSARIA = [
  { tipo: "radiografia_panoramica", label: "Panorâmica", obrigatorio: true },
  { tipo: "radiografia_periapical", label: "Periapicais", obrigatorio: false },
  { tipo: "radiografia_bitewing", label: "Bitewings", obrigatorio: false },
  { tipo: "fotografia_intraoral", label: "Fotos Intraorais", obrigatorio: true },
  { tipo: "fotografia_extraoral", label: "Fotos Extraorais", obrigatorio: true },
];

// ─── Componente Principal ───────────────────────────────────────────────────
interface ImagiologiaAvancadaProps {
  utenteId: number;
  imagens: any[];
  onRefresh: () => void;
  onUpload: () => void;
  onEliminar: (img: any) => void;
  onAnalisarIA: (img: any) => void;
  isAnalisando?: number | null;
}

export function ImagiologiaAvancada({
  utenteId, imagens, onRefresh, onUpload, onEliminar, onAnalisarIA, isAnalisando = null,
}: ImagiologiaAvancadaProps) {
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [viewMode, setViewMode] = useState<"grid" | "list" | "timeline" | "compare">("grid");
  const [lightboxImg, setLightboxImg] = useState<any>(null);
  const [lightboxIdx, setLightboxIdx] = useState(0);
  const [compareImgs, setCompareImgs] = useState<[any | null, any | null]>([null, null]);
  const [compareSelectSlot, setCompareSelectSlot] = useState<0 | 1>(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAnotacoes, setShowAnotacoes] = useState(false);
  const [anotacoes, setAnotacoes] = useState<Record<number, Anotacao[]>>({});
  const [novaAnotacao, setNovaAnotacao] = useState("");
  const [sortBy, setSortBy] = useState<"data" | "tipo" | "nome">("data");
  const [showDocProgress, setShowDocProgress] = useState(true);
  const [favoritosIds, setFavoritosIds] = useState<Set<number>>(new Set());

  // ─── Filtragem e Ordenação ────────────────────────────────────────────────
  const imagensFiltradas = useMemo(() => {
    let resultado = [...imagens];
    if (filtroTipo !== "todos") resultado = resultado.filter(img => img.tipo === filtroTipo);
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      resultado = resultado.filter(img =>
        (img.nomeOriginal || "").toLowerCase().includes(term) ||
        (img.descricao || "").toLowerCase().includes(term) ||
        (img.tipo || "").toLowerCase().includes(term)
      );
    }
    resultado.sort((a, b) => {
      if (sortBy === "data") return new Date(b.dataExame || b.createdAt).getTime() - new Date(a.dataExame || a.createdAt).getTime();
      if (sortBy === "tipo") return (a.tipo || "").localeCompare(b.tipo || "");
      return (a.nomeOriginal || "").localeCompare(b.nomeOriginal || "");
    });
    return resultado;
  }, [imagens, filtroTipo, searchTerm, sortBy]);

  // ─── Estatísticas ─────────────────────────────────────────────────────────
  const statsPorTipo = useMemo(() => {
    const map = new Map<string, number>();
    imagens.forEach(img => { map.set(img.tipo, (map.get(img.tipo) || 0) + 1); });
    return map;
  }, [imagens]);

  const docProgress = useMemo(() => {
    const total = DOCUMENTACAO_NECESSARIA.length;
    const presentes = DOCUMENTACAO_NECESSARIA.filter(d => imagens.some(i => i.tipo === d.tipo)).length;
    return { total, presentes, percentagem: Math.round((presentes / total) * 100) };
  }, [imagens]);

  // ─── Agrupamento por data (timeline) ──────────────────────────────────────
  const imagensPorData = useMemo(() => {
    const map = new Map<string, any[]>();
    imagensFiltradas.forEach(img => {
      const data = new Date(img.dataExame || img.createdAt).toLocaleDateString("pt-PT", { month: "long", year: "numeric" });
      const arr = map.get(data) || [];
      arr.push(img);
      map.set(data, arr);
    });
    return map;
  }, [imagensFiltradas]);

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const openLightbox = useCallback((img: any) => {
    const idx = imagensFiltradas.findIndex(i => i.id === img.id);
    setLightboxIdx(idx >= 0 ? idx : 0);
    setLightboxImg(img);
  }, [imagensFiltradas]);

  const navLightbox = useCallback((dir: 1 | -1) => {
    const newIdx = lightboxIdx + dir;
    if (newIdx >= 0 && newIdx < imagensFiltradas.length) {
      setLightboxIdx(newIdx);
      setLightboxImg(imagensFiltradas[newIdx]);
    }
  }, [lightboxIdx, imagensFiltradas]);

  const selectForCompare = useCallback((img: any) => {
    setCompareImgs(prev => {
      const novo: [any, any] = [...prev] as [any, any];
      novo[compareSelectSlot] = img;
      return novo;
    });
    setCompareSelectSlot(prev => prev === 0 ? 1 : 0);
  }, [compareSelectSlot]);

  const toggleFavorito = useCallback((id: number) => {
    setFavoritosIds(prev => {
      const novo = new Set(prev);
      if (novo.has(id)) novo.delete(id); else novo.add(id);
      return novo;
    });
  }, []);

  const addAnotacao = useCallback((imgId: number, x: number, y: number) => {
    if (!novaAnotacao.trim()) return;
    const nova: Anotacao = {
      id: Date.now().toString(),
      x, y,
      texto: novaAnotacao,
      cor: "#00E5FF",
      dataCriacao: new Date().toISOString(),
    };
    setAnotacoes(prev => ({
      ...prev,
      [imgId]: [...(prev[imgId] || []), nova],
    }));
    setNovaAnotacao("");
  }, [novaAnotacao]);

  const cfg = (tipo: string) => TIPOS_IMAGEM[tipo] || TIPOS_IMAGEM.outro;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* ─── Lightbox Avançado ────────────────────────────────────────────────── */}
      {lightboxImg && (
        <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-xl flex flex-col animate-in fade-in duration-200">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="text-white/60 text-xs">{lightboxIdx + 1} / {imagensFiltradas.length}</span>
              <span className="text-white font-bold text-sm">{lightboxImg.nomeOriginal || "Sem nome"}</span>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${cfg(lightboxImg.tipo).bg} ${cfg(lightboxImg.tipo).cor} border ${cfg(lightboxImg.tipo).border}`}>
                {cfg(lightboxImg.tipo).label}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => onAnalisarIA(lightboxImg)} disabled={isAnalisando === lightboxImg.id}
                className="w-9 h-9 rounded-xl bg-violet-500/20 hover:bg-violet-500/30 flex items-center justify-center text-violet-300 transition-all" title="Analisar IA">
                {isAnalisando === lightboxImg.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </button>
              <button onClick={() => toggleFavorito(lightboxImg.id)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${favoritosIds.has(lightboxImg.id) ? "bg-amber-500/20 text-amber-300" : "bg-white/10 text-white/60 hover:bg-white/20"}`} title="Favorito">
                <Star className={`w-4 h-4 ${favoritosIds.has(lightboxImg.id) ? "fill-amber-400" : ""}`} />
              </button>
              <button onClick={() => setShowAnotacoes(!showAnotacoes)}
                className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${showAnotacoes ? "bg-[#00E5FF]/20 text-[#00E5FF]" : "bg-white/10 text-white/60 hover:bg-white/20"}`} title="Anotações">
                <MessageSquare className="w-4 h-4" />
              </button>
              <button onClick={() => {
                if (lightboxImg?.s3Url) {
                  const a = document.createElement("a"); a.href = lightboxImg.s3Url; a.download = lightboxImg.nomeOriginal || "imagem"; a.click();
                }
              }} className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/60 transition-all" title="Download">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => { setLightboxImg(null); setShowAnotacoes(false); }}
                className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Imagem + Navegação */}
          <div className="flex-1 flex items-center justify-center relative p-4">
            <button onClick={() => navLightbox(-1)} disabled={lightboxIdx === 0}
              className="absolute left-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all disabled:opacity-20 z-10">
              <ChevronLeft className="w-6 h-6" />
            </button>

            <div className="relative max-w-4xl max-h-[70vh] w-full">
              <img src={lightboxImg.s3Url} alt={lightboxImg.nomeOriginal || ""} className="w-full h-auto max-h-[70vh] object-contain rounded-xl" />

              {/* Anotações overlay */}
              {showAnotacoes && anotacoes[lightboxImg.id]?.map(a => (
                <div key={a.id} className="absolute w-6 h-6 rounded-full bg-[#00E5FF] border-2 border-white flex items-center justify-center cursor-pointer group"
                  style={{ left: `${a.x}%`, top: `${a.y}%`, transform: "translate(-50%, -50%)" }}>
                  <span className="text-[8px] text-white font-bold">{(anotacoes[lightboxImg.id]?.indexOf(a) || 0) + 1}</span>
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-primary)] shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                    <p className="text-[var(--text-primary)] text-xs font-semibold">{a.texto}</p>
                    <p className="text-[var(--text-muted)] text-[9px]">{new Date(a.dataCriacao).toLocaleDateString("pt-PT")}</p>
                  </div>
                </div>
              ))}

              {/* Click para adicionar anotação */}
              {showAnotacoes && (
                <div className="absolute inset-0 cursor-crosshair" onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect();
                  const x = ((e.clientX - rect.left) / rect.width) * 100;
                  const y = ((e.clientY - rect.top) / rect.height) * 100;
                  if (novaAnotacao.trim()) addAnotacao(lightboxImg.id, x, y);
                }} />
              )}
            </div>

            <button onClick={() => navLightbox(1)} disabled={lightboxIdx === imagensFiltradas.length - 1}
              className="absolute right-4 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-all disabled:opacity-20 z-10">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          {/* Info + Anotações */}
          <div className="p-4 border-t border-white/10 bg-black/50">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-start gap-4">
                <div className="flex-1">
                  {lightboxImg.descricao && <p className="text-white/70 text-xs mb-2">{lightboxImg.descricao}</p>}
                  <div className="flex items-center gap-4 text-white/40 text-[10px]">
                    <span>{new Date(lightboxImg.dataExame || lightboxImg.createdAt).toLocaleDateString("pt-PT")}</span>
                    {lightboxImg.dentesRelacionados && <span>Dentes: {lightboxImg.dentesRelacionados}</span>}
                  </div>
                  {lightboxImg.analiseIA && (
                    <div className="mt-2 p-3 rounded-xl bg-violet-500/10 border border-violet-500/20">
                      <p className="text-violet-300 text-[10px] uppercase font-bold mb-1 flex items-center gap-1"><Sparkles className="w-3 h-3" /> Análise IA</p>
                      <p className="text-white/70 text-xs">{lightboxImg.analiseIA}</p>
                    </div>
                  )}
                </div>
                {showAnotacoes && (
                  <div className="w-64 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-3 h-3 text-[#00E5FF]" />
                      <p className="text-white/80 text-xs font-bold">Anotações</p>
                    </div>
                    <input value={novaAnotacao} onChange={e => setNovaAnotacao(e.target.value)}
                      placeholder="Escreva e clique na imagem..."
                      className="w-full px-3 py-2 rounded-lg bg-white/10 border border-white/20 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-[#00E5FF]/50 mb-2" />
                    {(anotacoes[lightboxImg.id] || []).map((a, i) => (
                      <div key={a.id} className="flex items-start gap-2 mb-1.5">
                        <span className="w-5 h-5 rounded-full bg-[#00E5FF]/30 flex items-center justify-center text-[8px] text-[#00E5FF] font-bold shrink-0">{i + 1}</span>
                        <p className="text-white/60 text-[10px]">{a.texto}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Action Bar ──────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 flex items-center gap-2 p-3 rounded-2xl bg-gradient-to-r from-violet-500/5 to-purple-500/5 border border-violet-500/20 backdrop-blur-xl shadow-sm flex-wrap">
        <button onClick={onUpload}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border bg-[#00E5FF] hover:bg-[#00E5FF] text-white border-[#00E5FF]/50 shadow-sm shadow-[#00E5FF]/20 transition-all hover:scale-[1.02] active:scale-[0.98]">
          <Upload className="w-3.5 h-3.5" /> Upload
        </button>
        <div className="w-px h-6 bg-[var(--border-primary)] mx-1 shrink-0" />
        <button onClick={() => {
          const semAnalise = imagensFiltradas.find(i => !i.analiseIA && i.s3Url);
          if (semAnalise) onAnalisarIA(semAnalise);
        }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-xl border bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/20 transition-all">
          <Sparkles className="w-3.5 h-3.5" /> Analisar IA
        </button>
        <div className="ml-auto flex items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--text-muted)]" />
            <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Pesquisar..."
              className="pl-7 pr-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-primary)] text-[10px] w-36 focus:outline-none focus:border-violet-500/50 transition-colors" />
          </div>
          {/* View modes */}
          <div className="flex items-center gap-0.5 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-lg p-0.5">
            {([
              { id: "grid" as const, icon: Grid3X3 },
              { id: "list" as const, icon: ClipboardList },
              { id: "timeline" as const, icon: Calendar },
              { id: "compare" as const, icon: ArrowLeftRight },
            ]).map(v => (
              <button key={v.id} onClick={() => setViewMode(v.id)}
                className={`p-1.5 rounded-md transition-all ${viewMode === v.id ? "bg-violet-500/20 text-violet-300" : "text-[var(--text-muted)]"}`}>
                <v.icon className="w-3.5 h-3.5" />
              </button>
            ))}
          </div>
          <button onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2 py-1.5 text-[10px] font-bold rounded-lg border bg-transparent text-[var(--text-muted)] border-transparent hover:bg-[var(--bg-secondary)] transition-all">
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* ─── Barra de Documentação ───────────────────────────────────────────── */}
      {showDocProgress && (
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-violet-400" />
              <h3 className="text-[var(--text-primary)] font-bold text-xs">Documentação Imagiológica</h3>
              <span className={`text-xs font-black ${docProgress.percentagem === 100 ? "text-emerald-400" : docProgress.percentagem >= 60 ? "text-amber-400" : "text-red-400"}`}>
                {docProgress.percentagem}%
              </span>
            </div>
            <button onClick={() => setShowDocProgress(false)} className="text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="h-2 rounded-full bg-[var(--bg-secondary)] overflow-hidden mb-3">
            <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500 transition-all duration-700" style={{ width: `${docProgress.percentagem}%` }} />
          </div>
          <div className="flex flex-wrap gap-2">
            {DOCUMENTACAO_NECESSARIA.map(d => {
              const presente = imagens.some(i => i.tipo === d.tipo);
              return (
                <div key={d.tipo} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-bold ${presente ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300" : d.obrigatorio ? "bg-red-500/10 border-red-500/20 text-red-300" : "bg-[var(--bg-secondary)] border-[var(--border-primary)] text-[var(--text-muted)]"}`}>
                  {presente ? <CheckCircle className="w-3 h-3" /> : d.obrigatorio ? <AlertCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                  {d.label}
                  {d.obrigatorio && !presente && <span className="text-[8px]">*</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── KPIs ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
              <Image className="w-5 h-5 text-violet-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Total</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{imagens.length}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center">
              <Scan className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Radiografias</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{imagens.filter(i => (i.tipo || "").startsWith("radiografia")).length}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center">
              <Camera className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Fotografias</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{imagens.filter(i => (i.tipo || "").startsWith("fotografia")).length}</p>
            </div>
          </div>
        </div>
        <div className="card-premium p-4 border border-[var(--border-primary)]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 border border-pink-500/30 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-pink-400" />
            </div>
            <div>
              <p className="text-[var(--text-muted)] text-[10px] font-bold uppercase">Com Análise IA</p>
              <p className="text-[var(--text-primary)] text-xl font-black">{imagens.filter(i => i.analiseIA).length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Filtros ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-[var(--bg-secondary)] border border-[var(--border-primary)] rounded-xl p-1 overflow-x-auto">
          <button onClick={() => setFiltroTipo("todos")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filtroTipo === "todos" ? "bg-violet-500/20 text-violet-300 border border-violet-500/30" : "text-[var(--text-muted)]"}`}>
            Todos ({imagens.length})
          </button>
          {Array.from(statsPorTipo.entries()).map(([tipo, count]) => {
            const c = cfg(tipo);
            return (
              <button key={tipo} onClick={() => setFiltroTipo(tipo === filtroTipo ? "todos" : tipo)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${filtroTipo === tipo ? `${c.bg} ${c.cor}` : "text-[var(--text-muted)]"}`}>
                {c.label} ({count})
              </button>
            );
          })}
        </div>
        <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
          className="ml-auto px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs font-bold focus:outline-none">
          <option value="data">Data</option>
          <option value="tipo">Tipo</option>
          <option value="nome">Nome</option>
        </select>
      </div>

      {/* ─── Modo Comparação ─────────────────────────────────────────────────── */}
      {viewMode === "compare" && (
        <div className="card-premium p-5 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-4">
            <ArrowLeftRight className="w-5 h-5 text-violet-400" />
            <h3 className="text-[var(--text-primary)] font-bold text-sm">Comparação Lado-a-Lado</h3>
            <span className="text-[var(--text-muted)] text-[10px]">— Selecione 2 imagens abaixo</span>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-4">
            {[0, 1].map(slot => (
              <div key={slot} className={`aspect-video rounded-xl border-2 border-dashed overflow-hidden flex items-center justify-center ${compareImgs[slot] ? "border-violet-500/30" : compareSelectSlot === slot ? "border-[#00E5FF]/50 bg-[#00E5FF]/5" : "border-[var(--border-primary)]"}`}>
                {compareImgs[slot] ? (
                  <div className="relative w-full h-full">
                    <img src={compareImgs[slot].s3Url} alt="" className="w-full h-full object-contain" />
                    <div className="absolute top-2 left-2 px-2 py-1 rounded-lg bg-black/60 text-white text-[10px] font-bold">
                      {new Date(compareImgs[slot].dataExame || compareImgs[slot].createdAt).toLocaleDateString("pt-PT")}
                    </div>
                    <button onClick={() => {
                      setCompareImgs(prev => {
                        const novo: [any, any] = [...prev] as [any, any];
                        novo[slot] = null;
                        return novo;
                      });
                    }} className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center text-white hover:bg-red-500/60 transition-all">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="text-center p-4">
                    <Image className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-2" />
                    <p className="text-[var(--text-muted)] text-xs">Selecione a imagem {slot + 1}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">{compareSelectSlot === slot ? "(a seleccionar)" : ""}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
          {/* Thumbnails para selecção */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {imagensFiltradas.filter(i => i.s3Url).map(img => (
              <button key={img.id} onClick={() => selectForCompare(img)}
                className={`w-16 h-16 rounded-lg border-2 overflow-hidden shrink-0 transition-all hover:scale-105 ${compareImgs[0]?.id === img.id || compareImgs[1]?.id === img.id ? "border-violet-500 ring-2 ring-violet-500/30" : "border-[var(--border-primary)]"}`}>
                <img src={img.s3Url} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ─── Galeria Grid ────────────────────────────────────────────────────── */}
      {viewMode === "grid" && (
        imagensFiltradas.length === 0 ? (
          <div className="card-premium border border-[var(--border-primary)] p-12 text-center">
            <div className="w-16 h-16 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center mx-auto mb-4">
              <Camera className="w-8 h-8 text-violet-400" />
            </div>
            <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Sem Imagens</h3>
            <p className="text-[var(--text-muted)] text-sm mb-4">Radiografias, fotografias e outros exames aparecerão aqui.</p>
            <button onClick={onUpload}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] text-white transition-all">
              <Upload className="w-4 h-4" /> Upload de Imagem
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {imagensFiltradas.map(img => {
              const c = cfg(img.tipo);
              const Icon = c.icon;
              return (
                <button key={img.id} onClick={() => openLightbox(img)}
                  className="card-premium border border-[var(--border-primary)] overflow-hidden group hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/5 transition-all text-left">
                  <div className="aspect-square bg-[var(--bg-secondary)] relative overflow-hidden">
                    {img.s3Url ? (
                      <img src={img.s3Url} alt={img.nomeOriginal} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Icon className={`w-12 h-12 ${c.cor} opacity-40`} /></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <Maximize2 className="w-5 h-5 text-white" />
                    </div>
                    {img.analiseIA && (
                      <div className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-violet-500/80 flex items-center justify-center"><Sparkles className="w-3 h-3 text-white" /></div>
                    )}
                    {favoritosIds.has(img.id) && (
                      <div className="absolute top-2 left-2 w-6 h-6 rounded-lg bg-amber-500/80 flex items-center justify-center"><Star className="w-3 h-3 text-white fill-white" /></div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="text-[var(--text-primary)] text-xs font-semibold truncate">{img.nomeOriginal || "Sem nome"}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`text-[9px] font-bold uppercase ${c.cor}`}>{c.label}</span>
                      <span className="text-[var(--text-muted)] text-[9px]">{new Date(img.dataExame || img.createdAt).toLocaleDateString("pt-PT")}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {/* ─── Vista Lista ─────────────────────────────────────────────────────── */}
      {viewMode === "list" && imagensFiltradas.length > 0 && (
        <div className="card-premium border border-[var(--border-primary)]">
          <div className="divide-y divide-[var(--border-primary)]">
            {imagensFiltradas.map(img => {
              const c = cfg(img.tipo);
              const Icon = c.icon;
              return (
                <div key={img.id} className="flex items-center gap-4 p-4 hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer" onClick={() => openLightbox(img)}>
                  <div className="w-14 h-14 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] overflow-hidden shrink-0">
                    {img.s3Url ? (
                      <img src={img.s3Url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Icon className={`w-6 h-6 ${c.cor}`} /></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{img.nomeOriginal || "Sem nome"}</p>
                    <div className="flex items-center gap-3 text-[var(--text-muted)] text-[10px] mt-0.5">
                      <span className={`font-bold uppercase ${c.cor}`}>{c.label}</span>
                      <span>{new Date(img.dataExame || img.createdAt).toLocaleDateString("pt-PT")}</span>
                      {img.dentesRelacionados && <span>Dentes: {img.dentesRelacionados}</span>}
                    </div>
                    {img.descricao && <p className="text-[var(--text-muted)] text-[10px] mt-1 truncate">{img.descricao}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {img.analiseIA && <Sparkles className="w-4 h-4 text-violet-400" />}
                    {favoritosIds.has(img.id) && <Star className="w-4 h-4 text-amber-400 fill-amber-400" />}
                    <button onClick={e => { e.stopPropagation(); onEliminar(img); }}
                      className="w-7 h-7 rounded-lg bg-[var(--bg-secondary)] hover:bg-red-500/20 flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 transition-all opacity-0 group-hover:opacity-100">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Vista Timeline ──────────────────────────────────────────────────── */}
      {viewMode === "timeline" && (
        <div className="space-y-6">
          {Array.from(imagensPorData.entries()).map(([data, imgs]) => (
            <div key={data}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-violet-400" />
                </div>
                <h3 className="text-[var(--text-primary)] font-bold text-sm capitalize">{data}</h3>
                <span className="text-[var(--text-muted)] text-[10px]">({imgs.length} imagens)</span>
                <div className="flex-1 h-px bg-[var(--border-primary)]" />
              </div>
              <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 ml-11">
                {imgs.map(img => {
                  const c = cfg(img.tipo);
                  return (
                    <button key={img.id} onClick={() => openLightbox(img)}
                      className="rounded-xl border border-[var(--border-primary)] overflow-hidden hover:border-violet-500/40 transition-all text-left">
                      <div className="aspect-square bg-[var(--bg-secondary)] relative overflow-hidden">
                        {img.s3Url ? (
                          <img src={img.s3Url} alt="" className="w-full h-full object-cover hover:scale-105 transition-transform" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><c.icon className={`w-8 h-8 ${c.cor} opacity-40`} /></div>
                        )}
                      </div>
                      <div className="p-2">
                        <p className={`text-[9px] font-bold ${c.cor}`}>{c.label}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Helper component for Circle icon
function Circle(props: any) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

export default ImagiologiaAvancada;
