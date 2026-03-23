/**
 * ImagemPage.tsx — Imagiologia com IA
 * DentCare Elite V35
 *
 * FIX: Imagens agora persistidas na BD via trpc.imagiologia.upload
 *      (antes ficavam apenas em memória e perdiam-se ao recarregar)
 * FIX: Análise IA guardada na BD via trpc.imagiologia.guardarAnalise
 * FIX: Listagem de imagens carregada da BD ao seleccionar utente
 */
import React, { useState, useRef } from "react";
import { parseApiError } from "../lib/parseApiError";
import { trpc } from "../lib/trpc";
import {
  Upload, Brain, Search, FileImage, Sparkles,
  AlertCircle, CheckCircle, Trash2, Loader2,
} from "lucide-react";

// Mapeamento entre label UI e valor do enum na BD
const TIPOS_IMAGEM: { label: string; value: string }[] = [
  { label: "Radiografia Periapical",  value: "radiografia_periapical"   },
  { label: "Radiografia Panorâmica",  value: "radiografia_panoramica"   },
  { label: "Radiografia Bitewing",    value: "radiografia_bitewing"      },
  { label: "Fotografia Intraoral",    value: "fotografia_intraoral"      },
  { label: "Fotografia Extraoral",    value: "fotografia_extraoral"      },
  { label: "CBCT",                    value: "tomografia_cbct"           },
  { label: "Outro",                   value: "outro"                     },
];

export function ImagemPage() {
  const [searchTerm, setSearchTerm]         = useState("");
  const [selectedUtenteId, setSelectedUtenteId] = useState<number | null>(null);
  const [tipoImagem, setTipoImagem]         = useState(TIPOS_IMAGEM[0]);
  const [arrastando, setArrastando]         = useState(false);
  const [uploading, setUploading]           = useState(false);
  // Estado local para controlar "a analisar" por ID
  const [analisando, setAnalisando]         = useState<Record<number, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const utentesQuery = trpc.utentes.list.useQuery();
  const utentes = (utentesQuery.data as any)?.utentes ?? [];
  const filtered = utentes.filter((u: any) =>
    u.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const utenteSelec = utentes.find((u: any) => u.id === selectedUtenteId);

  // Listar imagens do utente selecionado (recarrega da BD)
  const imagensQuery = trpc.imagiologia.listar.useQuery(
    { utenteId: selectedUtenteId! },
    { enabled: !!selectedUtenteId }
  );
  const imagens = (imagensQuery.data as any)?.imagens ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const uploadMutation        = trpc.imagiologia.upload.useMutation();
  const guardarAnaliseMutation = trpc.imagiologia.guardarAnalise.useMutation();
  const eliminarMutation      = trpc.imagiologia.eliminar.useMutation();
  // FIX: iaClinica é o router com analisarImagem (ia.ts) — trpc.ia aponta para aiRouter sem este método
  const analisarImagemMutation = trpc.iaClinica.analisarImagem.useMutation();

  // ── Handlers ──────────────────────────────────────────────────────────────────
  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/") || !selectedUtenteId) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const dataUrl = e.target?.result as string;
        const base64 = dataUrl.split(",")[1];
        await uploadMutation.mutateAsync({
          utenteId: selectedUtenteId,
          tipo: tipoImagem.value as any,
          nomeOriginal: file.name,
          mimeType: file.type || "image/jpeg",
          imagemBase64: base64,
          tamanhoBytes: file.size,
        });
        // Recarregar lista da BD
        imagensQuery.refetch();
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      alert(parseApiError(err, "Erro ao carregar imagem"));
    } finally {
      setUploading(false);
    }
  };

  const analisarComIA = async (img: any) => {
    if (!img?.s3Url) return;
    setAnalisando(prev => ({ ...prev, [img.id]: true }));
    try {
      // Extrair base64 da s3Url (que pode ser data:... ou URL real)
      let base64: string;
      let mimeType: string = img.mimeType || "image/jpeg";
      if (img.s3Url.startsWith("data:")) {
        base64 = img.s3Url.split(",")[1];
        mimeType = img.s3Url.split(";")[0].replace("data:", "") || mimeType;
      } else {
        // URL real: fazer fetch e converter para base64
        const resp = await fetch(img.s3Url);
        const blob = await resp.blob();
        const reader = new FileReader();
        base64 = await new Promise<string>((resolve) => {
          reader.onload = (e) => resolve((e.target?.result as string).split(",")[1]);
          reader.readAsDataURL(blob);
        });
      }
      const resultado = await analisarImagemMutation.mutateAsync({
        imagemBase64: base64,
        mimeType,
        contexto: `Tipo de imagem: ${img.tipo}. Utente: ${utenteSelec?.nome ?? "N/A"}.`,
      });
      // Guardar análise na BD
      await guardarAnaliseMutation.mutateAsync({
        imagemId: img.id,
        analise: resultado.analise,
      });
      imagensQuery.refetch();
    } catch (error: any) {
      // Guardar erro na BD também para não perder contexto
      await guardarAnaliseMutation.mutateAsync({
        imagemId: img.id,
        analise: `Erro na análise: ${parseApiError(error, "Verifique a configuração da API de IA.")}`,
      }).catch(() => {});
      imagensQuery.refetch();
    } finally {
      setAnalisando(prev => ({ ...prev, [img.id]: false }));
    }
  };

  const eliminarImagem = async (imagemId: number) => {
    if (!confirm("Eliminar esta imagem permanentemente?")) return;
    try {
      await eliminarMutation.mutateAsync({ imagemId });
      imagensQuery.refetch();
    } catch (err: any) {
      alert(parseApiError(err, "Erro ao eliminar"));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <h1 className="page-header-title">Imagiologia com IA</h1>
          <span className="badge-ia">IA</span>
        </div>
        <p className="page-header-subtitle">
          Análise de radiografias e imagens dentárias com inteligência artificial
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Coluna esquerda — Lista de utentes */}
        <div className="space-y-3">
          <div className="card-premium p-3">
            <div className="flex items-center gap-2 px-1">
              <Search className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Pesquisar utente..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none"
              />
            </div>
          </div>
          <div className="card-premium overflow-hidden">
            <div className="divide-y divide-[var(--border-lightest)] max-h-80 overflow-y-auto">
              {filtered.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-[var(--text-muted)] text-sm">Nenhum utente encontrado</p>
                </div>
              ) : filtered.slice(0, 10).map((u: any) => (
                <button
                  key={u.id}
                  onClick={() => setSelectedUtenteId(u.id)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-[var(--bg-overlay)] transition-colors ${
                    selectedUtenteId === u.id ? "bg-[#00E5FF]/10 border-l-2 border-[#00E5FF]" : ""
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
                    <span className="text-[#00E5FF] text-xs font-bold">{u.nome?.charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] text-sm font-medium truncate">{u.nome}</p>
                    <p className="text-[var(--text-muted)] text-xs">
                      {selectedUtenteId === u.id ? `${imagens.length} imagem(ns)` : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna direita — Upload e imagens */}
        <div className="lg:col-span-2 space-y-4">
          {!selectedUtenteId ? (
            <div className="card-premium p-12 flex flex-col items-center justify-center text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mb-4">
                <FileImage className="w-6 h-6 text-[#00E5FF]" />
              </div>
              <p className="text-[var(--text-secondary)] font-medium">Selecione um utente</p>
              <p className="text-[var(--text-muted)] text-sm mt-1">Para ver ou carregar imagens clínicas</p>
            </div>
          ) : (
            <>
              {/* Tipo de imagem */}
              <div className="card-premium p-4">
                <label className="section-label block mb-2">Tipo de Imagem</label>
                <div className="flex flex-wrap gap-2">
                  {TIPOS_IMAGEM.map(t => (
                    <button
                      key={t.value}
                      onClick={() => setTipoImagem(t)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        tipoImagem.value === t.value
                          ? "bg-[#00E5FF]/20 border-[#00E5FF]/50 text-[#00E5FF]"
                          : "border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Área de upload */}
              <div
                onDragOver={e => { e.preventDefault(); setArrastando(true); }}
                onDragLeave={() => setArrastando(false)}
                onDrop={e => {
                  e.preventDefault();
                  setArrastando(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => !uploading && fileInputRef.current?.click()}
                className={`card-premium p-8 flex flex-col items-center justify-center text-center border-2 border-dashed transition-all ${
                  uploading
                    ? "border-[#00E5FF]/40 bg-[#00E5FF]/5 cursor-wait"
                    : arrastando
                    ? "border-[#00E5FF]/60 bg-[#00E5FF]/5 cursor-copy"
                    : "border-[var(--border-light)] hover:border-[#00E5FF]/30 hover:bg-[var(--bg-surface)] cursor-pointer"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
                />
                <div className="w-12 h-12 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center mb-3">
                  {uploading
                    ? <Loader2 className="w-5 h-5 text-[#00E5FF] animate-spin" />
                    : <Upload className="w-5 h-5 text-[#00E5FF]" />
                  }
                </div>
                <p className="text-[var(--text-primary)] font-semibold text-sm mb-1">
                  {uploading ? "A guardar imagem..." : `Carregar Imagem para ${utenteSelec?.nome}`}
                </p>
                {!uploading && (
                  <p className="text-[var(--text-muted)] text-xs">
                    Arraste ou clique para seleccionar (JPEG, PNG)
                  </p>
                )}
              </div>

              {/* Lista de imagens (da BD) */}
              {imagensQuery.isLoading ? (
                <div className="card-premium p-8 flex items-center justify-center gap-2 text-[var(--text-muted)] text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  A carregar imagens...
                </div>
              ) : imagens.length > 0 ? (
                <div className="card-premium overflow-hidden">
                  <div className="p-4 border-b border-[var(--border-lighter)]">
                    <p className="section-label">Imagens Guardadas ({imagens.length})</p>
                  </div>
                  <div className="divide-y divide-[var(--border-lightest)]">
                    {imagens.map((img: any) => (
                      <div key={img.id} className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          {img.s3Url && (
                            <img
                              src={img.s3Url}
                              alt={img.nomeOriginal ?? "imagem"}
                              className="w-12 h-12 rounded-lg object-cover border border-[var(--border-light)] shrink-0"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[var(--text-primary)] text-sm font-medium truncate">
                              {img.nomeOriginal ?? "imagem"}
                            </p>
                            <p className="text-[var(--text-muted)] text-xs">
                              {img.tipo} · {new Date(img.createdAt).toLocaleDateString("pt-PT")}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {!img.analiseIA && !analisando[img.id] && (
                              <button
                                onClick={() => analisarComIA(img)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-medium hover:bg-violet-500/30 transition-colors"
                              >
                                <Brain className="w-3 h-3" />
                                Analisar IA
                              </button>
                            )}
                            {analisando[img.id] && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-violet-300 text-xs">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                A analisar...
                              </div>
                            )}
                            <button
                              onClick={() => eliminarImagem(img.id)}
                              className="p-1.5 rounded-lg text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                              title="Eliminar imagem"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        {img.analiseIA && (
                          <div className={`flex items-start gap-2 p-3 rounded-xl text-xs ${
                            img.analiseIA.includes("Detectada") || img.analiseIA.includes("possível")
                              ? "bg-amber-500/10 border border-amber-500/20"
                              : "bg-emerald-500/10 border border-emerald-500/20"
                          }`}>
                            {img.analiseIA.includes("Detectada") || img.analiseIA.includes("possível")
                              ? <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                              : <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                            }
                            <div>
                              <p className="font-semibold mb-0.5 flex items-center gap-1">
                                <Sparkles className="w-3 h-3" />
                                Análise IA
                              </p>
                              <p className={
                                img.analiseIA.includes("Detectada") || img.analiseIA.includes("possível")
                                  ? "text-amber-200"
                                  : "text-emerald-200"
                              }>
                                {img.analiseIA}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="card-premium p-8 text-center text-[var(--text-muted)] text-sm">
                  Nenhuma imagem guardada para este utente.
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
