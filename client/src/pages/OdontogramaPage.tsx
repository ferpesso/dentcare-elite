/**
 * OdontogramaPage.tsx — Página Odontograma na Aba Lateral
 * DentCare Elite V35.6 — Odontograma Avançado Integrado
 *
 * UPGRADE V35.6:
 * - Usa o mesmo componente OdontogramaAvancado da ficha do utente
 * - Pesquisa de utentes com debounce e navegação directa
 * - Botão para abrir a ficha completa do utente
 * - Integração completa com save/refresh dos mesmos endpoints
 * - Dados avançados (periograma, implantes, prótese, notas) totalmente suportados
 */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { useLocation, useSearch } from "wouter";
import { OdontogramaAvancado } from "../components/OdontogramaAvancado";
import { parseApiError } from "../lib/parseApiError";
import {
  Search, Smile, AlertCircle, X,
  Loader2, ChevronRight, User, ExternalLink,
  Phone, ArrowLeft, Sparkles,
} from "lucide-react";

export function OdontogramaPage() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUtente, setSelectedUtente] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState<{ msg: string; tipo: "success" | "error" } | null>(null);

  // ─── Ler query params para abrir odontograma directamente ────────────────
  // Suporta: /odontograma?utenteId=5
  const utentesQuery = trpc.utentes.list.useQuery(
    { search: searchTerm || undefined, limite: 20, offset: 0 },
    { keepPreviousData: true } as any
  );

  // Query para buscar utente por ID (quando vem de query param)
  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const utenteIdFromUrl = searchParams.get("utenteId");

  const utenteByIdQuery = trpc.utentes.list.useQuery(
    { search: undefined, limite: 1, offset: 0 },
    { enabled: !!utenteIdFromUrl && !selectedUtente }
  );

  // ─── Ficha do utente seleccionado ────────────────────────────────────────
  const fichaQuery = trpc.fichaUtente.obterFicha.useQuery(
    { utenteId: selectedUtente?.id },
    { enabled: !!selectedUtente }
  );
  const utils = trpc.useUtils();

  // ─── Dados do odontograma ────────────────────────────────────────────────
  const odontogramaData: Record<string, string> = useMemo(() => {
    const anamneseData = fichaQuery.data?.anamnese;
    if (!anamneseData?.respostas) return {};
    try {
      const parsed = typeof anamneseData.respostas === "string"
        ? JSON.parse(anamneseData.respostas)
        : anamneseData.respostas;
      return parsed.__odontograma ?? {};
    } catch { return {}; }
  }, [fichaQuery.data]);

  // V35.5 — Dados avançados do odontograma (periograma, implantes, prótese, notas)
  const odontogramaAvancadoData = useMemo(() => {
    const anamneseData = fichaQuery.data?.anamnese;
    if (!anamneseData?.respostas) return {};
    try {
      const parsed = typeof anamneseData.respostas === "string"
        ? JSON.parse(anamneseData.respostas)
        : anamneseData.respostas;
      return parsed.__odontograma_avancado ?? {};
    } catch { return {}; }
  }, [fichaQuery.data]);

  const tratamentos: any[] = fichaQuery.data?.tratamentos ?? [];
  const imagens: any[] = fichaQuery.data?.imagens ?? [];

  // ─── Mutation para guardar ────────────────────────────────────────────────
  const guardarOdontogramaMutation = trpc.fichaUtente.guardarOdontograma.useMutation({
    onSuccess: () => {
      utils.fichaUtente.obterFicha.invalidate();
      setToastMsg({ msg: "Odontograma guardado com sucesso", tipo: "success" });
      setTimeout(() => setToastMsg(null), 3000);
    },
    onError: (e: any) => {
      setToastMsg({ msg: parseApiError(e, "Erro ao guardar odontograma"), tipo: "error" });
      setTimeout(() => setToastMsg(null), 5000);
    },
  });

  // ─── Auto-seleccionar utente via query param ─────────────────────────────
  useEffect(() => {
    if (utenteIdFromUrl && !selectedUtente) {
      const id = parseInt(utenteIdFromUrl);
      if (!isNaN(id)) {
        // Tentar encontrar na lista já carregada
        const utentes = (utentesQuery.data as any)?.utentes ?? [];
        const found = utentes.find((u: any) => u.id === id);
        if (found) {
          setSelectedUtente(found);
        } else {
          // Criar um utente temporário com o ID para carregar a ficha
          setSelectedUtente({ id, nome: "A carregar..." });
        }
      }
    }
  }, [utenteIdFromUrl, utentesQuery.data]);

  // Actualizar nome do utente quando a ficha carregar
  useEffect(() => {
    if (selectedUtente?.nome === "A carregar..." && fichaQuery.data?.utente) {
      setSelectedUtente(fichaQuery.data.utente);
    }
  }, [fichaQuery.data, selectedUtente]);

  const utentes = (utentesQuery.data as any)?.utentes ?? [];
  const filtered = utentes;

  // ─── Handlers ────────────────────────────────────────────────────────────
  const handleSelectUtente = useCallback((utente: any) => {
    setSelectedUtente(utente);
    setSearchTerm("");
  }, []);

  const handleVoltar = useCallback(() => {
    setSelectedUtente(null);
    setSearchTerm("");
    navigate("/odontograma", { replace: true });
  }, [navigate]);

  const handleRefresh = useCallback(() => {
    utils.fichaUtente.obterFicha.invalidate();
  }, [utils]);

  const handleSave = useCallback((dentes: Record<string, string>, dentesAvancado: Record<string, any>) => {
    if (!selectedUtente) return;
    type EstadoDente = "saudavel" | "carie" | "restauracao" | "extraido" | "implante" | "tratado" | "ausente" | "coroa" | "endodontia" | "protese" | "extracao_indicada";
    guardarOdontogramaMutation.mutate({
      utenteId: selectedUtente.id,
      dentes: dentes as Record<string, EstadoDente>,
      dentesAvancado: dentesAvancado as any,
    });
  }, [selectedUtente, guardarOdontogramaMutation]);

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Toast */}
      {toastMsg && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300 ${
          toastMsg.tipo === "success"
            ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
            : "bg-red-500/15 border-red-500/30 text-red-300"
        }`}>
          <span className="text-sm font-medium">{toastMsg.msg}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 opacity-60 hover:opacity-100 transition-opacity">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="page-header-title flex items-center gap-3">
          <Smile className="w-7 h-7 text-[#00E5FF]" style={{ filter: "drop-shadow(0 0 8px rgba(0,229,255,0.5))" }} />
          Odontograma
        </h1>
        <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
          Mapa dental interactivo com periograma, implantes e histórico clínico completo
        </p>
      </div>

      {!selectedUtente ? (
        /* ─── Selecção de Utente ─────────────────────────────────────────── */
        <>
          {/* Barra de Pesquisa */}
          <div className="card-premium p-5 border border-[var(--border-primary)]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 flex items-center justify-center">
                <Search className="w-5 h-5 text-[#00E5FF]" />
              </div>
              <div>
                <h3 className="text-[var(--text-primary)] font-semibold text-sm">Seleccionar Utente</h3>
                <p className="text-[var(--text-muted)] text-xs">Pesquise por nome ou telemóvel para abrir o odontograma</p>
              </div>
            </div>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
              <input
                type="text"
                placeholder="Pesquisar utente por nome ou telemóvel..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                autoFocus
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 focus:ring-1 focus:ring-[#00E5FF]/20 transition-all"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-lg bg-[var(--bg-surface)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Lista de Utentes */}
          <div className="card-premium overflow-hidden border border-[var(--border-primary)]">
            {utentesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-[#00E5FF] animate-spin" />
                <span className="ml-3 text-[var(--text-muted)] text-sm">A carregar utentes...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                <div className="w-14 h-14 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-[var(--text-muted)]" />
                </div>
                <p className="text-[var(--text-secondary)] text-sm font-medium mb-1">Nenhum utente encontrado</p>
                <p className="text-[var(--text-muted)] text-xs">
                  {searchTerm ? "Tente pesquisar com outros termos" : "Ainda não existem utentes registados"}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-lightest)]">
                {filtered.slice(0, 15).map((u: any) => (
                  <button
                    key={u.id}
                    onClick={() => handleSelectUtente(u)}
                    className="w-full flex items-center gap-4 p-4 hover:bg-[var(--bg-surface)] transition-all text-left group"
                  >
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#00E5FF]/15 to-blue-500/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0 group-hover:border-[#00E5FF]/40 transition-colors">
                      <span className="text-[#00E5FF] text-sm font-bold">{u.nome?.charAt(0)?.toUpperCase()}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[var(--text-primary)] text-sm font-semibold truncate">{u.nome}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {u.telemovel && (
                          <span className="text-[var(--text-muted)] text-xs flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {u.telemovel}
                          </span>
                        )}
                        {u.email && (
                          <span className="text-[var(--text-muted)] text-xs truncate">{u.email}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] font-medium text-[#00E5FF] bg-[#00E5FF]/10 px-2 py-1 rounded-lg border border-[#00E5FF]/20 opacity-0 group-hover:opacity-100 transition-opacity">
                        Abrir Odontograma
                      </span>
                      <ChevronRight className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#00E5FF] transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        /* ─── Odontograma do Utente Seleccionado ────────────────────────── */
        <>
          {/* Barra de Contexto do Utente */}
          <div className="card-premium p-4 border border-[var(--border-primary)] flex items-center gap-3 flex-wrap">
            <button
              onClick={handleVoltar}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-surface)] hover:border-[var(--border-secondary)] transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Voltar
            </button>

            <div className="w-px h-8 bg-[var(--border-primary)] shrink-0" />

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF]/15 to-blue-500/10 border border-[#00E5FF]/20 flex items-center justify-center shrink-0">
              <span className="text-[#00E5FF] text-sm font-bold">{selectedUtente.nome?.charAt(0)?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[var(--text-primary)] font-bold text-sm truncate">{selectedUtente.nome}</p>
              <p className="text-[var(--text-muted)] text-xs">
                {selectedUtente.telemovel && <span>{selectedUtente.telemovel}</span>}
                {selectedUtente.email && <span className="ml-2">{selectedUtente.email}</span>}
              </p>
            </div>

            <button
              onClick={() => navigate(`/utentes?utenteId=${selectedUtente.id}`)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs font-semibold hover:bg-[#00E5FF]/20 transition-all"
              title="Ver ficha completa do utente"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Ver Ficha Completa
            </button>
          </div>

          {/* Odontograma Avançado — Mesmo componente da ficha do utente */}
          {fichaQuery.isLoading ? (
            <div className="card-premium p-12 border border-[var(--border-primary)] flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-[#00E5FF] animate-spin mb-3" />
              <p className="text-[var(--text-secondary)] text-sm font-medium">A carregar odontograma...</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">Dados clínicos do utente</p>
            </div>
          ) : fichaQuery.isError ? (
            <div className="card-premium p-12 border border-red-500/20 flex flex-col items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400 mb-3" />
              <p className="text-red-300 text-sm font-medium">Erro ao carregar dados</p>
              <p className="text-[var(--text-muted)] text-xs mt-1">
                {parseApiError(fichaQuery.error, "Não foi possível obter os dados do utente")}
              </p>
              <button
                onClick={handleRefresh}
                className="mt-4 px-4 py-2 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[#00E5FF] text-xs font-medium hover:bg-[#00E5FF]/20 transition-all"
              >
                Tentar novamente
              </button>
            </div>
          ) : (
            <OdontogramaAvancado
              odontogramaData={odontogramaData}
              odontogramaAvancadoData={odontogramaAvancadoData}
              tratamentos={tratamentos}
              imagens={imagens}
              onSave={handleSave}
              onRefresh={handleRefresh}
              isSaving={guardarOdontogramaMutation.isPending}
              utenteId={selectedUtente?.id}
              utenteNome={selectedUtente?.nome ?? "Utente"}
            />
          )}
        </>
      )}
    </div>
  );
}
