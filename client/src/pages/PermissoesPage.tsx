/**
 * PermissoesPage.tsx — Gestão de Permissões e Controlo de Acesso
 * DentCare Elite V35 — RBAC Dinâmico editável pelo MASTER
 */
import React, { useState, useEffect } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  Shield, User, Users, Lock, Check, X, Plus,
  Edit2, AlertCircle, Key, UserCog, Crown, Stethoscope,
  Phone, Mail, Clock, CheckCircle, XCircle,
  RefreshCw, Trash2, Loader2, Save, RotateCcw, Info,
  FlaskConical, Package, DollarSign, Settings, MessageCircle,
  BarChart2, FileText, Calendar
} from "lucide-react";

// ─── Tipos ────────────────────────────────────────────────────────────────────
type Role = "master" | "admin" | "medico" | "recepcao" | "user";
type RoleEditavel = "admin" | "medico" | "recepcao" | "user";

// ─── Configuração de Papéis ───────────────────────────────────────────────────
const PAPEIS: Record<string, {
  label: string;
  descricao: string;
  cor: string;
  bg: string;
  border: string;
  icone: React.ComponentType<any>;
  badge: string;
}> = {
  master: {
    label: "Master",
    descricao: "Acesso total ao sistema. Não editável.",
    cor: "text-amber-400",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icone: Crown,
    badge: "bg-amber-500/20 text-amber-300 border-amber-500/30",
  },
  admin: {
    label: "Administrador",
    descricao: "Gestão financeira, relatórios e configurações da clínica.",
    cor: "text-violet-400",
    bg: "bg-violet-500/10",
    border: "border-violet-500/20",
    icone: UserCog,
    badge: "bg-violet-500/20 text-violet-300 border-violet-500/30",
  },
  medico: {
    label: "Médico / Dentista",
    descricao: "Acesso clínico: odontograma, anamnese, consultas e imagens.",
    cor: "text-[#00E5FF]",
    bg: "bg-[#00E5FF]/10",
    border: "border-[#00E5FF]/20",
    icone: Stethoscope,
    badge: "bg-[#00E5FF]/20 text-[#00E5FF] border-[#00E5FF]/30",
  },
  recepcao: {
    label: "Recepcionista",
    descricao: "Agendamento, registo de utentes e faturação básica.",
    cor: "text-emerald-400",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icone: Phone,
    badge: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  },
  user: {
    label: "Utilizador",
    descricao: "Acesso básico ao sistema.",
    cor: "text-slate-400",
    bg: "bg-slate-500/10",
    border: "border-slate-500/20",
    icone: User,
    badge: "bg-slate-500/20 text-slate-300 border-slate-500/30",
  },
};

// Mapa de ícones por nome (para os módulos vindos do backend)
const ICONE_MAP: Record<string, React.ComponentType<any>> = {
  Users, Calendar, DollarSign, Package, Stethoscope,
  MessageCircle, FlaskConical, FileText, BarChart2, Settings,
  UserCog, Shield, Key, Clock, Mail, Phone,
};

// ─── Componente: Modal Utilizador (Novo / Editar) ─────────────────────────────
function ModalUtilizador({
  utilizador,
  onClose,
  onSuccess,
}: {
  utilizador?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!utilizador;
  const [form, setForm] = useState({
    nome: utilizador?.name || utilizador?.nome || "",
    email: utilizador?.email || "",
    role: (utilizador?.role as Role) || "recepcao",
    password: "",
    confirmar: "",
  });
  const [erro, setErro] = useState("");

  const createMutation = trpc.users.create.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const updateMutation = trpc.users.update.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    if (!form.email.trim()) { setErro("O email é obrigatório"); return; }

    if (!isEdit) {
      if (form.password.length < 6) { setErro("A password deve ter pelo menos 6 caracteres"); return; }
      if (form.password !== form.confirmar) { setErro("As passwords não coincidem"); return; }
      createMutation.mutate({ name: form.nome, email: form.email, role: form.role, password: form.password });
    } else {
      updateMutation.mutate({ id: utilizador.id, name: form.nome, email: form.email, role: form.role });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="card-premium w-full max-w-md p-8 border border-[var(--border-lighter)] space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-[var(--text-primary)]">{isEdit ? "Editar Utilizador" : "Novo Utilizador"}</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-tertiary)]"><X className="w-4 h-4" /></button>
        </div>

        {erro && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />{erro}
          </div>
        )}

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Nome</label>
            <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              placeholder="Nome completo" className="input-premium w-full px-4 py-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Email</label>
            <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              placeholder="email@clinica.pt" className="input-premium w-full px-4 py-3 text-sm" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Papel</label>
            <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value as Role }))}
              className="input-premium w-full px-4 py-3 text-sm">
              {Object.entries(PAPEIS).filter(([k]) => k !== "master").map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
          </div>
          {!isEdit && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Password</label>
                <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="input-premium w-full px-4 py-3 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-widest px-1">Confirmar</label>
                <input type="password" value={form.confirmar} onChange={e => setForm(f => ({ ...f, confirmar: e.target.value }))}
                  className="input-premium w-full px-4 py-3 text-sm" />
              </div>
            </div>
          )}
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 btn-secondary py-3 text-sm font-bold">Cancelar</button>
            <button type="submit" disabled={isPending} className="flex-1 btn-primary py-3 text-sm font-bold flex items-center justify-center gap-2">
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isEdit ? "Guardar Alterações" : "Criar Utilizador"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Componente: Matriz de Permissões Editável ────────────────────────────────
function MatrizPermissoes({ isMasterUser }: { isMasterUser: boolean }) {
  // Estado local da matriz (cópia editável)
  const [matrizLocal, setMatrizLocal] = useState<Record<string, Record<string, boolean>>>({});
  const [alteracoesPendentes, setAlteracoesPendentes] = useState<Set<string>>(new Set());
  const [guardando, setGuardando] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  // Query: carregar a matriz do backend (só para MASTER)
  const matrizQ = trpc.controloAcesso.obterMatriz.useQuery(undefined, {
    enabled: isMasterUser,
    staleTime: 0,
  });

  // Mutation: guardar permissões de um role
  const guardarRoleMutation = trpc.controloAcesso.guardarRole.useMutation({
    onSuccess: (data, vars) => {
      setGuardando(null);
      setAlteracoesPendentes(prev => {
        const next = new Set(prev);
        next.delete(vars.role);
        return next;
      });
      setMensagem({ tipo: "ok", texto: data.message });
      setTimeout(() => setMensagem(null), 3000);
      matrizQ.refetch();
    },
    onError: (e) => {
      setGuardando(null);
      setMensagem({ tipo: "erro", texto: parseApiError(e) });
      setTimeout(() => setMensagem(null), 4000);
    },
  });

  // Mutation: repor padrão
  const reporPadraoMutation = trpc.controloAcesso.reporPadrao.useMutation({
    onSuccess: (data, vars) => {
      setMensagem({ tipo: "ok", texto: data.message });
      setTimeout(() => setMensagem(null), 3000);
      matrizQ.refetch();
    },
    onError: (e) => {
      setMensagem({ tipo: "erro", texto: parseApiError(e) });
    },
  });

  // Sincronizar estado local quando os dados chegam do backend
  useEffect(() => {
    if (matrizQ.data?.matriz) {
      try {
        setMatrizLocal(JSON.parse(JSON.stringify(matrizQ.data.matriz)));
      } catch {
        setMatrizLocal(matrizQ.data.matriz);
      }
      setAlteracoesPendentes(new Set());
    }
  }, [matrizQ.data?.matriz]);

  const togglePermissao = (role: RoleEditavel, permissao: string) => {
    if (!isMasterUser) return;
    setMatrizLocal(prev => {
      const next = { ...prev, [role]: { ...prev[role], [permissao]: !prev[role]?.[permissao] } };
      return next;
    });
    setAlteracoesPendentes(prev => new Set(prev).add(role));
  };

  const guardarRole = (role: RoleEditavel) => {
    setGuardando(role);
    guardarRoleMutation.mutate({ role, permissoes: matrizLocal[role] || {} });
  };

  const reporRole = (role: RoleEditavel) => {
    if (!confirm(`Repor as permissões padrão para o role "${PAPEIS[role]?.label}"?`)) return;
    reporPadraoMutation.mutate({ role });
  };

  if (!isMasterUser) {
    return (
      <div className="card-premium border border-[var(--border-lighter)] p-12 text-center">
        <Lock className="w-12 h-12 text-[var(--text-tertiary)] mx-auto mb-4" />
        <h3 className="text-[var(--text-primary)] font-bold text-lg mb-2">Acesso Restrito</h3>
        <p className="text-[var(--text-secondary)] text-sm">Apenas o utilizador <strong className="text-amber-400">MASTER</strong> pode editar a matriz de permissões.</p>
      </div>
    );
  }

  if (matrizQ.isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
      </div>
    );
  }

  const modulos = matrizQ.data?.modulos || [];
  const roles: RoleEditavel[] = ["admin", "medico", "recepcao", "user"];

  return (
    <div className="space-y-4">
      {/* Aviso informativo */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Modo Edição MASTER</span> — Clique em qualquer célula para alternar a permissão. As alterações só são aplicadas após clicar em <strong>Guardar</strong> na coluna correspondente. O role <strong>Master</strong> tem sempre acesso total e não é editável.
        </div>
      </div>

      {/* Mensagem de feedback */}
      {mensagem && (
        <div className={`flex items-center gap-2 p-3 rounded-xl text-sm font-medium ${mensagem.tipo === "ok" ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300" : "bg-red-500/10 border border-red-500/20 text-red-400"}`}>
          {mensagem.tipo === "ok" ? <CheckCircle className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {mensagem.texto}
        </div>
      )}

      {/* Botões de guardar por role */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {roles.map(role => {
          const papel = PAPEIS[role];
          const Icon = papel.icone;
          const temAlteracoes = alteracoesPendentes.has(role);
          const isGuardando = guardando === role;
          return (
            <div key={role} className={`card-premium p-4 border transition-all ${temAlteracoes ? "border-[#00E5FF]/40 bg-[#00E5FF]/5" : "border-[var(--border-lighter)]"}`}>
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-xl ${papel.bg} ${papel.cor} flex items-center justify-center border ${papel.border}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[var(--text-primary)] font-bold text-xs">{papel.label}</div>
                  {temAlteracoes && <div className="text-[#00E5FF] text-[10px] font-bold">Alterações pendentes</div>}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => guardarRole(role)}
                  disabled={!temAlteracoes || isGuardando}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${temAlteracoes ? "bg-[#00E5FF] hover:bg-[#00E5FF] text-white" : "bg-[var(--bg-overlay)] text-[var(--text-tertiary)] cursor-not-allowed"}`}
                >
                  {isGuardando ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  Guardar
                </button>
                <button
                  onClick={() => reporRole(role)}
                  title="Repor permissões padrão"
                  className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tabela de permissões */}
      <div className="card-premium border border-[var(--border-lighter)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-lighter)] bg-[var(--bg-surface)]">
                <th className="px-6 py-4 text-left text-[var(--text-tertiary)] text-[10px] font-black uppercase tracking-widest min-w-[200px]">Módulo / Permissão</th>
                {/* Master — sempre tudo */}
                <th className="px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest text-amber-400 min-w-[110px]">
                  <div className="flex flex-col items-center gap-1">
                    <Crown className="w-4 h-4" />
                    Master
                  </div>
                </th>
                {roles.filter(r => r !== "user").map(role => {
                  const papel = PAPEIS[role];
                  const Icon = papel.icone;
                  const temAlteracoes = alteracoesPendentes.has(role);
                  return (
                    <th key={role} className={`px-4 py-4 text-center text-[10px] font-black uppercase tracking-widest min-w-[120px] ${papel.cor} ${temAlteracoes ? "bg-[#00E5FF]/5" : ""}`}>
                      <div className="flex flex-col items-center gap-1">
                        <Icon className="w-4 h-4" />
                        {papel.label}
                        {temAlteracoes && <span className="text-[#00E5FF] text-[9px] normal-case font-bold">● editado</span>}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-lightest)]">
              {modulos.map((grupo: any) => {
                const GrupoIcon = ICONE_MAP[grupo.icone] || Shield;
                return (
                  <React.Fragment key={grupo.modulo}>
                    {/* Cabeçalho do módulo */}
                    <tr className="bg-[#00E5FF]/[0.02]">
                      <td colSpan={5} className="px-6 py-3">
                        <div className="flex items-center gap-2">
                          <GrupoIcon className="w-4 h-4 text-[#00E5FF]" />
                          <span className="text-[var(--text-primary)] font-black text-[10px] uppercase tracking-widest">{grupo.modulo}</span>
                        </div>
                      </td>
                    </tr>
                    {/* Linhas de permissão */}
                    {grupo.permissoes.map((p: any) => (
                      <tr key={p.chave} className="hover:bg-[var(--bg-surface)] transition-colors">
                        <td className="px-8 py-3 text-[var(--text-secondary)] text-xs font-medium">{p.label}</td>
                        {/* Master — sempre ativo, não editável */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center">
                            <CheckCircle className="w-4 h-4 text-amber-400/60" />
                          </div>
                        </td>
                        {/* Roles editáveis */}
                        {(roles.filter(r => r !== "user") as RoleEditavel[]).map(role => {
                          const granted = matrizLocal[role]?.[p.chave] ?? false;
                          const temAlteracoes = alteracoesPendentes.has(role);
                          return (
                            <td key={role} className={`px-4 py-3 text-center ${temAlteracoes ? "bg-[#00E5FF]/[0.02]" : ""}`}>
                              <button
                                onClick={() => togglePermissao(role, p.chave)}
                                className={`w-8 h-8 rounded-xl flex items-center justify-center mx-auto transition-all ${
                                  granted
                                    ? "bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/25 text-emerald-400"
                                    : "bg-[var(--bg-overlay)] border border-[var(--border-lightest)] hover:border-red-500/30 hover:bg-red-500/10 text-[var(--text-primary)]/10 hover:text-red-400/50"
                                }`}
                                title={granted ? `Revogar "${p.label}" para ${PAPEIS[role]?.label}` : `Conceder "${p.label}" para ${PAPEIS[role]?.label}`}
                              >
                                {granted
                                  ? <CheckCircle className="w-4 h-4" />
                                  : <XCircle className="w-4 h-4" />
                                }
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Componente Principal ──────────────────────────────────────────────────────
export function PermissoesPage() {
  const [tab, setTab] = useState<"utilizadores" | "matriz">("utilizadores");
  const [utilizadorEditando, setUtilizadorEditando] = useState<any>(null);
  const [mostrarNovo, setMostrarNovo] = useState(false);

  // Verificar se o utilizador atual é MASTER
  const meQ = trpc.auth.me.useQuery();
  const isMasterUser = (meQ.data as any)?.role === "master";

  const usersQ = trpc.users.list.useQuery();
  const deleteMutation = trpc.users.delete.useMutation({
    onSuccess: () => usersQ.refetch(),
    onError: (e) => alert(parseApiError(e)),
  });

  const utilizadores = (usersQ.data as any)?.users || [];

  const handleEliminar = (id: number, nome: string) => {
    if (confirm(`Tem a certeza que deseja eliminar o utilizador ${nome}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[var(--text-primary)] tracking-tight">Controlo de Acesso</h1>
          <p className="text-[var(--text-secondary)] text-sm">Gestão de utilizadores, papéis e permissões do sistema.</p>
        </div>
        <div className="flex items-center gap-3">
          {isMasterUser && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-black uppercase tracking-widest">
              <Crown className="w-3 h-3" />
              Modo Master
            </span>
          )}
          <button onClick={() => setMostrarNovo(true)} className="btn-primary py-2.5 px-6 flex items-center gap-2 text-sm font-bold">
            <Plus className="w-4 h-4" />
            Novo Utilizador
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl w-fit">
        <button
          onClick={() => setTab("utilizadores")}
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "utilizadores" ? "bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white shadow-lg shadow-[#00E5FF]/20" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"}`}
        >
          Utilizadores
        </button>
        <button
          onClick={() => setTab("matriz")}
          className={`px-6 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${tab === "matriz" ? "bg-gradient-to-r from-[#00E5FF] to-[#B388FF] text-white shadow-lg shadow-[#00E5FF]/20" : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)]"}`}
        >
          Matriz de Permissões
          {isMasterUser && <span className="ml-2 text-amber-400">✦</span>}
        </button>
      </div>

      {tab === "utilizadores" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {utilizadores.map((u: any) => {
            const papel = PAPEIS[u.role] || PAPEIS.user;
            const Icon = papel.icone;
            const isActivo = u.ativo !== false;
            const nomeExibicao = u.name || u.nome || "Sem Nome";
            return (
              <div key={u.id} className="card-premium p-6 border border-[var(--border-lighter)] hover:border-white/[0.12] transition-all group">
                <div className="flex items-start justify-between mb-4">
                  <div className={`w-12 h-12 rounded-2xl ${papel.bg} ${papel.cor} flex items-center justify-center border ${papel.border}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setUtilizadorEditando(u)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEliminar(u.id, nomeExibicao)}
                      className="p-2 rounded-lg hover:bg-[var(--bg-overlay)] text-red-400/50 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 mb-4">
                  <h3 className="text-[var(--text-primary)] font-bold text-lg">{nomeExibicao}</h3>
                  <p className="text-[var(--text-secondary)] text-xs">{u.email}</p>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-[var(--border-lightest)]">
                  <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${papel.badge}`}>{papel.label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2 h-2 rounded-full ${isActivo ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : "bg-red-500"}`} />
                    <span className="text-[10px] font-bold text-[var(--text-tertiary)] uppercase">{isActivo ? "Ativo" : "Inativo"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <MatrizPermissoes isMasterUser={isMasterUser} />
      )}

      {(mostrarNovo || utilizadorEditando) && (
        <ModalUtilizador
          utilizador={utilizadorEditando}
          onClose={() => { setMostrarNovo(false); setUtilizadorEditando(null); }}
          onSuccess={() => usersQ.refetch()}
        />
      )}
    </div>
  );
}
