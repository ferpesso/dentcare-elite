import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { Users, Search, Plus, Phone, Mail, MapPin, X, Check, ChevronRight, AlertCircle, Save, Loader2 } from "lucide-react";
import { FichaUtentePage } from "./FichaUtentePage";
import { useSearch, useLocation } from "wouter";
import { useDebounce } from "../lib/useOptimizedQuery";

function ModalNovoUtente({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({ nome: "", telemovel: "", email: "", nif: "", morada: "", localidade: "", cidade: "", codigoPostal: "", genero: "" });
  const [erro, setErro] = useState("");
  const criarMutation = trpc.utentes.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e) => setErro(parseApiError(e, "Erro ao criar utente")),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    if (!form.telemovel.trim()) { setErro("O telemóvel é obrigatório"); return; }
    criarMutation.mutate({ 
      nome: form.nome, 
      telemovel: form.telemovel, 
      email: form.email || undefined, 
      nif: form.nif || undefined, 
      morada: form.morada || undefined,
      localidade: form.localidade || undefined,
      cidade: form.cidade || undefined, 
      codigoPostal: form.codigoPostal || undefined,
      genero: (form.genero as any) || undefined 
    } as any);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-md overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl w-full max-w-md shadow-2xl my-auto flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)] bg-[var(--bg-surface)]">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00E5FF]" />
            <h2 className="text-[var(--text-primary)] font-bold text-lg">Novo Utente</h2>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} className="p-6 space-y-5 overflow-y-auto flex-1">
          {erro && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-400 text-sm font-medium">{erro}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Nome Completo *</label>
            <input
              type="text"
              placeholder="Ex: João Silva"
              value={form.nome}
              onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="input-premium w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Telemóvel *</label>
              <input
                type="tel"
                placeholder="912 345 678"
                value={form.telemovel}
                onChange={e => setForm(f => ({ ...f, telemovel: e.target.value }))}
                className="input-premium w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">NIF</label>
              <input
                type="text"
                placeholder="123456789"
                value={form.nif}
                onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                className="input-premium w-full"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Email</label>
            <input
              type="email"
              placeholder="joao@email.com"
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="input-premium w-full"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Morada</label>
            <input
              type="text"
              placeholder="Rua, número, andar..."
              value={form.morada}
              onChange={e => setForm(f => ({ ...f, morada: e.target.value }))}
              className="input-premium w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Localidade</label>
              <input
                type="text"
                placeholder="Ex: Cascais"
                value={form.localidade}
                onChange={e => setForm(f => ({ ...f, localidade: e.target.value }))}
                className="input-premium w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Cidade</label>
              <input
                type="text"
                placeholder="Lisboa"
                value={form.cidade}
                onChange={e => setForm(f => ({ ...f, cidade: e.target.value }))}
                className="input-premium w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Código Postal</label>
              <input
                type="text"
                placeholder="1000-001"
                value={form.codigoPostal}
                onChange={e => setForm(f => ({ ...f, codigoPostal: e.target.value }))}
                className="input-premium w-full"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Género</label>
              <select
                value={form.genero}
                onChange={e => setForm(f => ({ ...f, genero: e.target.value }))}
                className="input-premium w-full appearance-none"
              >
                <option value="" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Seleccionar...</option>
                <option value="masculino" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Masculino</option>
                <option value="feminino" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Feminino</option>
                <option value="outro" className="bg-[var(--bg-elevated)] text-[var(--text-primary)]">Outro</option>
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4 border-t border-[var(--border-light)]">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-primary)] text-sm font-bold hover:bg-[var(--bg-overlay)] transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              disabled={criarMutation.isPending} 
              className="flex-1 btn-primary py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
            >
              {criarMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Criar Utente
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function UtentesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [utenteSelecionado, setUtenteSelecionado] = useState<number | null>(null);
  const [tabInicial, setTabInicial] = useState<string | undefined>(undefined);
  const search = useSearch();
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  // Ler query params para abrir ficha automaticamente (ex: /utentes?utenteId=5&tab=pagamentos)
  React.useEffect(() => {
    const params = new URLSearchParams(search);
    const uId = params.get("utenteId");
    const tab = params.get("tab");
    if (uId) {
      setUtenteSelecionado(parseInt(uId));
      if (tab) setTabInicial(tab);
    }
  }, [search]);

  // FIX V35.5: Debounce de 350ms para evitar uma query por cada tecla pressionada
  const debouncedSearch = useDebounce(searchTerm, 350);

  // FIX V35.5: Pesquisa feita no servidor (não em memória) com páginação
  const utentesQuery = trpc.utentes.list.useQuery(
    { search: debouncedSearch || undefined, limite: 50, offset: 0 },
    { keepPreviousData: true } as any
  );
  const utentes = (utentesQuery.data as any)?.utentes ?? [];
  const totalUtentes = (utentesQuery.data as any)?.total ?? utentes.length;

  // Filtro local apenas para highlight visual (dados já filtrados pelo servidor)
  const filtered = utentes;

  if (utenteSelecionado !== null) {
    return (
      <FichaUtentePage
        utenteId={utenteSelecionado}
        tabInicial={tabInicial}
        onVoltar={() => {
          setUtenteSelecionado(null);
          setTabInicial(undefined);
          // Limpar query params da URL
          navigate("/utentes", { replace: true });
        }}
      />
    );
  }

  return (
    <div className="space-y-6 font-sans">
      {showModal && (
        <ModalNovoUtente
          onClose={() => setShowModal(false)}
          onSuccess={() => utils.utentes.list.invalidate()}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-header-title">Gestão de Utentes</h1>
          <p className="page-header-subtitle">
            {utentesQuery.isLoading ? "A carregar..." : `${totalUtentes} utentes registados na clínica`}
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-primary px-5 py-2.5 flex items-center gap-2">
          <Plus className="w-5 h-5" /> Novo Utente
        </button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
        <input
          type="text"
          placeholder="Pesquisar por nome, telemóvel ou email..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="input-premium w-full pl-10"
        />
      </div>

      <div className="card-premium overflow-hidden">
          {utentesQuery.isLoading || utentesQuery.isFetching ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-16 rounded-xl bg-[var(--bg-overlay)] animate-pulse" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-light)] flex items-center justify-center mb-4">
              <Users className="w-8 h-8 text-[var(--text-tertiary)]" />
            </div>
            <p className="text-[var(--text-primary)] font-bold text-lg">
              {searchTerm ? "Nenhum utente encontrado" : "Sem utentes registados"}
            </p>
            <p className="text-[var(--text-secondary)] text-sm mt-1">
              {searchTerm ? "Tente outro termo de pesquisa" : "Clique em \"Novo Utente\" para começar"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {filtered.map((u: any) => (
              <div
                key={u.id}
                onClick={() => setUtenteSelecionado(u.id)}
                className="flex items-center gap-4 p-5 hover:bg-[var(--bg-surface)] transition-all cursor-pointer group"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#00E5FF]/20 to-[#B388FF]/20 border border-[#00E5FF]/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  <span className="text-[#00E5FF] text-lg font-black">{u.nome?.charAt(0)?.toUpperCase() ?? "?"}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[var(--text-primary)] text-base font-bold truncate group-hover:text-[#00E5FF] transition-colors">{u.nome}</p>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {u.telemovel && (
                      <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs font-medium">
                        <Phone className="w-3.5 h-3.5 text-[#00E5FF]/70" />{u.telemovel}
                      </span>
                    )}
                    {u.email && (
                      <span className="flex items-center gap-1.5 text-[var(--text-secondary)] text-xs font-medium truncate">
                        <Mail className="w-3.5 h-3.5 text-[#00E5FF]/70" />{u.email}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg ${u.ativo ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                    {u.ativo ? "Ativo" : "Inativo"}
                  </span>
                  <ChevronRight className="w-5 h-5 text-[var(--text-tertiary)] group-hover:text-[#00E5FF] group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
