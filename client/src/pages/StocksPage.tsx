/**
 * StocksPage.tsx — Gestão de Inventário e Consumíveis
 * DentCare Elite V35 — Controlo de Stock em Tempo Real
 * UPGRADE V35: Moeda dinâmica via ConfigContext (useConfig)
 */
import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { useConfig } from "../contexts/ConfigContext";
import {
  Package, Search, Plus, AlertTriangle, X, Check,
  Edit2, Trash2, AlertCircle, Minus, ArrowUp, ArrowDown,
  Tag, Box, Loader2, Filter, MoreVertical, History
} from "lucide-react";

const CATEGORIAS = [
  "Anestesia", "Materiais de Impressão", "Instrumentos", "Higiene",
  "Radiologia", "Próteses", "Consumíveis", "Ortodontia",
  "Endodontia", "Cirurgia", "Descartáveis", "Equipamento",
  "Cimentos e Adesivos", "Compósitos e Resinas", "Desinfeção e Esterilização",
  "Outros",
];

const FORNECEDORES_SUGESTOES = [
  "Henry Schein", "Dentarum", "Dentsply Sirona", "3M Oral Care",
  "Ivoclar Vivadent", "Kulzer", "GC Europe", "Kerr Dental",
  "Hu-Friedy", "NSK", "W&H", "Bien-Air", "Planmeca",
  "Ormco", "American Orthodontics", "Ultradent",
  "Coltene", "Septodont", "Zhermack", "Outro",
];

// ─── Modal Novo / Editar Produto ──────────────────────────────────────────────
function ModalProduto({
  produto,
  onClose,
  onSuccess,
}: {
  produto?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!produto;
  const [form, setForm] = useState({
    nome: produto?.nome ?? "",
    descricao: produto?.descricao ?? "",
    quantidade: produto?.quantidade ?? 0,
    quantidadeMinima: produto?.quantidadeMinima ?? 5,
    unidade: produto?.unidade ?? "unidade",
    precoCusto: produto?.precoCusto ?? "0",
    precoVenda: produto?.precoVenda ?? "0",
    fornecedor: produto?.fornecedor ?? "",
    categoria: produto?.categoria ?? "Consumíveis",
  });
  const [erro, setErro] = useState("");

  const criarMutation = trpc.stocks.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const actualizarMutation = trpc.stocks.actualizar.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    setErro("");
    const data = {
      nome: form.nome,
      descricao: form.descricao || undefined,
      quantidade: Number(form.quantidade),
      quantidadeMinima: Number(form.quantidadeMinima),
      unidade: form.unidade,
      precoCusto: parseFloat(form.precoCusto) || 0,
      precoVenda: parseFloat(form.precoVenda) || 0,
      fornecedor: form.fornecedor || undefined,
      categoria: form.categoria,
    };
    if (isEdit) {
      actualizarMutation.mutate({ id: produto.id, ...data });
    } else {
      criarMutation.mutate(data);
    }
  };

  const isPending = criarMutation.isPending || actualizarMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="card-premium w-full max-w-md border border-[var(--border-light)] shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)] sticky top-0 bg-[var(--bg-base)] z-10">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#00E5FF]" />
            <h2 className="text-xl font-black text-[var(--text-primary)]">{isEdit ? "Editar Produto" : "Novo Produto"}</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {erro && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs font-medium">{erro}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Nome do Produto *</label>
            <input type="text" placeholder="Ex: Luvas de Nitrilo M"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="input-premium w-full px-4 py-3 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Categoria</label>
            <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
              className="input-premium w-full px-4 py-3 text-sm">
              {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Qtd</label>
              <input type="number" min="0"
                value={form.quantidade} onChange={e => setForm(f => ({ ...f, quantidade: e.target.value }))}
                onFocus={e => e.target.select()}
                className="input-premium w-full px-4 py-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Mínimo</label>
              <input type="number" min="0"
                value={form.quantidadeMinima} onChange={e => setForm(f => ({ ...f, quantidadeMinima: e.target.value }))}
                onFocus={e => e.target.select()}
                className="input-premium w-full px-4 py-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Unidade</label>
              <select value={form.unidade} onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                className="input-premium w-full px-4 py-3 text-sm">
                {["unidade", "caixa", "embalagem", "frasco", "tubo", "seringa", "ml", "g", "kg", "litro", "rolo", "par", "pacote", "blister", "conjunto"].map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Custo</label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.precoCusto} onChange={e => setForm(f => ({ ...f, precoCusto: e.target.value }))}
                onFocus={e => e.target.select()}
                className="input-premium w-full px-4 py-3 text-sm" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Venda</label>
              <input type="number" step="0.01" min="0" placeholder="0.00"
                value={form.precoVenda} onChange={e => setForm(f => ({ ...f, precoVenda: e.target.value }))}
                onFocus={e => e.target.select()}
                className="input-premium w-full px-4 py-3 text-sm" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Fornecedor</label>
            <input type="text" placeholder="Ex: Henry Schein, Dentsply Sirona..."
              list="fornecedores-list"
              value={form.fornecedor} onChange={e => setForm(f => ({ ...f, fornecedor: e.target.value }))}
              className="input-premium w-full px-4 py-3 text-sm" />
            <datalist id="fornecedores-list">
              {FORNECEDORES_SUGESTOES.map(f => <option key={f} value={f} />)}
            </datalist>
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose}
              className="flex-1 btn-secondary py-3 text-sm font-bold">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEdit ? "Guardar" : "Criar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Ajustar Quantidade ─────────────────────────────────────────────────
function ModalAjustarQtd({ produto, onClose, onSuccess }: { produto: any; onClose: () => void; onSuccess: () => void }) {
  const [tipo, setTipo] = useState<"entrada" | "saida">("entrada");
  const [quantidade, setQuantidade] = useState("1");
  const [motivo, setMotivo] = useState("");
  const [erro, setErro] = useState("");

  const ajustarMutation = trpc.stocks.ajustarQuantidade.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const qtd = parseInt(quantidade);
    if (!qtd || qtd <= 0) { setErro("Introduza uma quantidade válida"); return; }
    setErro("");
    ajustarMutation.mutate({
      id: produto.id,
      delta: tipo === "entrada" ? qtd : -qtd,
      motivo: motivo || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="card-premium w-full max-w-md border border-[var(--border-light)] shadow-2xl animate-in fade-in zoom-in duration-200 my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
          <div className="flex items-center gap-2">
            <Box className="w-5 h-5 text-[#00E5FF]" />
            <h2 className="text-xl font-black text-[var(--text-primary)]">Ajustar Stock</h2>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-[var(--bg-subtle)] text-[var(--text-tertiary)] transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-5">
          {erro && <p className="text-red-400 text-xs bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 font-medium">{erro}</p>}

          <div className="p-4 rounded-2xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
            <p className="text-[var(--text-primary)] font-bold text-sm">{produto.nome}</p>
            <p className="text-[var(--text-secondary)] text-xs mt-1">Stock atual: <span className="font-black text-[#00E5FF]">{produto.quantidade} {produto.unidade}</span></p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => setTipo("entrada")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "entrada" ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-400" : "border-[var(--border-light)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)]"}`}>
              <ArrowUp className="w-4 h-4" />Entrada
            </button>
            <button type="button" onClick={() => setTipo("saida")}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all ${tipo === "saida" ? "bg-red-500/20 border-red-500/50 text-red-400" : "border-[var(--border-light)] text-[var(--text-tertiary)] hover:bg-[var(--bg-overlay)]"}`}>
              <ArrowDown className="w-4 h-4" />Saída
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Quantidade</label>
            <input type="number" min="1" value={quantidade} onChange={e => setQuantidade(e.target.value)}
              onFocus={e => e.target.select()}
              className="input-premium w-full px-4 py-3 text-sm" />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Motivo (Opcional)</label>
            <input type="text" placeholder="Ex: Quebra, Venda, Reabastecimento" value={motivo} onChange={e => setMotivo(e.target.value)}
              className="input-premium w-full px-4 py-3 text-sm" />
          </div>

          <button type="submit" disabled={ajustarMutation.isPending}
            className="w-full btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
            {ajustarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Confirmar Ajuste
          </button>
        </form>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export function StocksPage() {
  const { formatMoeda, simboloMoeda } = useConfig();
  const [pesquisa, setPesquisa] = useState("");
  const [categoria, setCategoria] = useState("todas");
  const [produtoEditando, setProdutoEditando] = useState<any>(null);
  const [produtoAjustando, setProdutoAjustando] = useState<any>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

  const stocksQ = trpc.stocks.listar.useQuery({});
  const produtos = (stocksQ.data as any)?.stocks || [];

  const filtrados = produtos.filter((p: any) => {
    const matchPesquisa = p.nome.toLowerCase().includes(pesquisa.toLowerCase()) || p.fornecedor?.toLowerCase().includes(pesquisa.toLowerCase());
    const matchCategoria = categoria === "todas" || p.categoria === categoria;
    return matchPesquisa && matchCategoria;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Gestão de Stock</h1>
          <p className="text-[var(--text-secondary)] text-sm">Controlo de inventário, consumíveis e alertas de rutura.</p>
        </div>
        <button onClick={() => setMostrarNovo(true)} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-sm font-bold">
          <Plus className="w-4 h-4" />
          Novo Produto
        </button>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="relative md:col-span-2">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input type="text" placeholder="Pesquisar produtos ou fornecedores..."
            className="input-premium w-full pl-12 py-3 text-sm"
            value={pesquisa} onChange={e => setPesquisa(e.target.value)} />
        </div>
        <div className="relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <select className="input-premium w-full pl-12 py-3 text-sm appearance-none"
            value={categoria} onChange={e => setCategoria(e.target.value)}>
            <option value="todas">Todas as Categorias</option>
            {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtrados.map((p: any) => {
          const isBaixo = p.quantidade <= p.quantidadeMinima;
          return (
            <div key={p.id} className={`card-premium p-5 border transition-all group ${isBaixo ? 'border-red-500/30 bg-red-500/[0.02]' : 'border-[var(--border-lighter)] hover:border-white/[0.12]'}`}>
              <div className="flex items-start justify-between mb-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isBaixo ? 'bg-red-500/10 text-red-400' : 'bg-[#00E5FF]/10 text-[#00E5FF]'}`}>
                  <Package className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setProdutoAjustando(p)} className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors" title="Ajustar Stock">
                    <Box className="w-4 h-4" />
                  </button>
                  <button onClick={() => setProdutoEditando(p)} className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 mb-4">
                <div className="flex items-center gap-2">
                  <h3 className="text-[var(--text-primary)] font-bold text-sm truncate">{p.nome}</h3>
                  {isBaixo && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                </div>
                <p className="text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest">{p.categoria}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-y border-[var(--border-lightest)] mb-4">
                <div>
                  <p className="text-[var(--text-tertiary)] text-[9px] font-black uppercase tracking-widest mb-1">Stock Atual</p>
                  <p className={`text-lg font-black ${isBaixo ? 'text-red-400' : 'text-[var(--text-primary)]'}`}>
                    {p.quantidade} <span className="text-[10px] font-bold text-[var(--text-secondary)]">{p.unidade}</span>
                  </p>
                </div>
                <div>
                  <p className="text-[var(--text-tertiary)] text-[9px] font-black uppercase tracking-widest mb-1">Preço Venda</p>
                  <p className="text-lg font-black text-emerald-400">{formatMoeda(Number(p.precoVenda))}</p>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <Tag className="w-3 h-3" />
                  <span className="font-medium">{p.fornecedor || 'Sem fornecedor'}</span>
                </div>
                {isBaixo && (
                  <span className="text-red-400 font-black uppercase tracking-tighter animate-pulse">Rutura Iminente</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modais */}
      {(mostrarNovo || produtoEditando) && (
        <ModalProduto
          produto={produtoEditando}
          onClose={() => { setMostrarNovo(false); setProdutoEditando(null); }}
          onSuccess={() => stocksQ.refetch()}
        />
      )}

      {produtoAjustando && (
        <ModalAjustarQtd
          produto={produtoAjustando}
          onClose={() => setProdutoAjustando(null)}
          onSuccess={() => stocksQ.refetch()}
        />
      )}
    </div>
  );
}
