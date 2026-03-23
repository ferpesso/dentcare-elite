import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { X, Plus, Trash2, Edit2, Check, Loader2, Palette, Clock, Stethoscope } from "lucide-react";

interface ModalGestaoTiposConsultaProps {
  onClose: () => void;
}

const CORES = [
  "indigo", "blue", "emerald", "amber", "rose", "violet", "cyan", "orange", "pink", "slate"
];

const ICONES = [
  "Stethoscope", "HeartPulse", "Smile", "Activity", "Zap", "ShieldCheck", "ClipboardList"
];

export function ModalGestaoTiposConsulta({ onClose }: ModalGestaoTiposConsultaProps) {
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [novoTipo, setNovoTipo] = useState({
    nome: "",
    duracaoPadrao: 30,
    cor: "indigo",
    icone: "Stethoscope"
  });

  const utils = trpc.useUtils();
  const tiposQ = trpc.consultas.listarTipos.useQuery();
  const tipos = (tiposQ.data as any)?.tipos ?? [];

  const criarMutation = trpc.consultas.criarTipo.useMutation({
    onSuccess: () => {
      utils.consultas.listarTipos.invalidate();
      setNovoTipo({ nome: "", duracaoPadrao: 30, cor: "indigo", icone: "Stethoscope" });
    }
  });

  const atualizarMutation = trpc.consultas.atualizarTipo.useMutation({
    onSuccess: () => {
      utils.consultas.listarTipos.invalidate();
      setEditandoId(null);
    }
  });

  const handleCriar = () => {
    if (!novoTipo.nome) return;
    criarMutation.mutate(novoTipo);
  };

  const handleToggleAtivo = (id: number, ativo: boolean) => {
    atualizarMutation.mutate({ id, ativo: !ativo });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] my-auto">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-light)]">
          <div>
            <h2 className="text-[var(--text-primary)] font-bold text-xl">Tipos de Consulta</h2>
            <p className="text-[var(--text-tertiary)] text-sm">Configure os procedimentos e durações padrão</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-primary)] transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Formulário de Criação */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 space-y-4">
            <h3 className="text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-[#00E5FF]" /> Novo Tipo de Consulta
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase ml-1">Nome do Procedimento</label>
                <input 
                  type="text" 
                  className="input-premium w-full" 
                  placeholder="Ex: Limpeza, Extração..."
                  value={novoTipo.nome}
                  onChange={e => setNovoTipo(prev => ({ ...prev, nome: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase ml-1">Duração (minutos)</label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                  <input 
                    type="number" 
                    className="input-premium w-full pl-10" 
                    value={novoTipo.duracaoPadrao}
                    onChange={e => setNovoTipo(prev => ({ ...prev, duracaoPadrao: parseInt(e.target.value) || 30 }))}
                    onFocus={e => e.target.select()}
                  />
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex gap-2">
                {CORES.map(cor => (
                  <button 
                    key={cor} 
                    onClick={() => setNovoTipo(prev => ({ ...prev, cor }))}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${novoTipo.cor === cor ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-60 hover:opacity-100'}`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
              <button 
                onClick={handleCriar}
                disabled={!novoTipo.nome || criarMutation.isPending}
                className="btn-primary px-6 py-2 flex items-center gap-2 disabled:opacity-50"
              >
                {criarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de Tipos Existentes */}
          <div className="space-y-3">
            <h3 className="text-[var(--text-primary)] text-xs font-bold uppercase tracking-wider ml-1">Tipos Configurados</h3>
            {tiposQ.isLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" /></div>
            ) : tipos.length === 0 ? (
              <div className="text-center py-10 bg-[var(--bg-surface)] border border-dashed border-[var(--border-light)] rounded-xl">
                <p className="text-[var(--text-tertiary)] text-sm">Nenhum tipo de consulta configurado.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {tipos.map((t: any) => (
                  <div key={t.id} className="flex items-center justify-between p-4 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:bg-[var(--bg-subtle)] transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg" style={{ backgroundColor: `${t.cor}20`, border: `1px solid ${t.cor}40` }}>
                        <Stethoscope className="w-5 h-5" style={{ color: t.cor }} />
                      </div>
                      <div>
                        <h4 className="text-[var(--text-primary)] font-bold text-sm">{t.nome}</h4>
                        <div className="flex items-center gap-2 text-[var(--text-tertiary)] text-[10px] font-bold uppercase">
                          <Clock className="w-3 h-3" /> {t.duracaoPadrao} minutos
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleToggleAtivo(t.id, t.ativo)}
                        className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${t.ativo ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}
                      >
                        {t.ativo ? 'Ativo' : 'Inativo'}
                      </button>
                      <button 
                        onClick={() => {
                          if(confirm('Deseja realmente desativar este tipo de consulta?')) {
                            handleToggleAtivo(t.id, true);
                          }
                        }}
                        className="p-2 rounded-lg hover:bg-red-500/10 text-[var(--text-tertiary)] hover:text-red-400 transition-all opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div className="p-6 border-t border-[var(--border-light)] bg-[var(--bg-surface)] flex justify-end">
          <button onClick={onClose} className="px-6 py-2 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] text-[var(--text-primary)] font-bold text-sm transition-all">
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
