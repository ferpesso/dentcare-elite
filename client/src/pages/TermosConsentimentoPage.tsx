/**
 * TermosConsentimentoPage.tsx — Gestão de Termos e Consentimento RGPD
 * DentCare Elite V35 — Gestão Completa pelo Dono da Clínica
 *
 * Funcionalidades:
 * - CRUD completo de termos (criar, editar, eliminar, ativar/desativar)
 * - Templates RGPD pré-definidos para facilitar a criação
 * - Preview do termo antes de guardar
 * - Indicação visual de obrigatório/opcional
 * - Versionamento automático
 * - Conformidade total com RGPD
 */
import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  FileText, Plus, Trash2, Edit2,
  CheckCircle, Clock, Shield, X, Loader2,
  Eye, ToggleLeft, ToggleRight, Copy,
  AlertTriangle, Info, ChevronDown, ChevronUp,
  Search, FileCheck, Lock, Sparkles
} from "lucide-react";

// ─── Templates RGPD Pré-definidos ────────────────────────────────────────────
const TEMPLATES_RGPD = [
  {
    titulo: "Termos de Utilização",
    conteudo: `TERMOS DE UTILIZAÇÃO DOS SERVIÇOS CLÍNICOS

1. OBJETO
Os presentes Termos de Utilização regulam a relação entre o utente e a clínica no âmbito da prestação de serviços de saúde oral.

2. SERVIÇOS
A clínica compromete-se a prestar os serviços de saúde oral acordados com o utente, de acordo com as melhores práticas clínicas e em conformidade com a legislação vigente.

3. OBRIGAÇÕES DO UTENTE
O utente compromete-se a:
a) Fornecer informações verdadeiras e completas sobre o seu estado de saúde;
b) Informar sobre alergias, medicação e condições médicas relevantes;
c) Cumprir as indicações e recomendações do profissional de saúde;
d) Comparecer às consultas agendadas ou cancelar com antecedência mínima de 24 horas.

4. RESPONSABILIDADE
A clínica não se responsabiliza por complicações decorrentes da omissão de informações relevantes por parte do utente ou do incumprimento das recomendações clínicas.

5. PAGAMENTOS
Os pagamentos devem ser efetuados de acordo com as condições acordadas. O não pagamento poderá resultar na suspensão dos serviços.

6. LEGISLAÇÃO APLICÁVEL
Os presentes termos regem-se pela legislação portuguesa em vigor.`,
    obrigatorio: true,
    categoria: "termos_utilizacao",
  },
  {
    titulo: "Política de Privacidade (RGPD)",
    conteudo: `POLÍTICA DE PRIVACIDADE E PROTEÇÃO DE DADOS PESSOAIS
(Em conformidade com o Regulamento Geral de Proteção de Dados — RGPD — Regulamento (UE) 2016/679)

1. RESPONSÁVEL PELO TRATAMENTO
A clínica é a entidade responsável pelo tratamento dos seus dados pessoais, nos termos do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 58/2019, de 8 de agosto.

2. DADOS RECOLHIDOS
Recolhemos os seguintes dados pessoais:
a) Dados de identificação: nome completo, data de nascimento, NIF, documento de identificação;
b) Dados de contacto: morada, telefone, e-mail;
c) Dados de saúde: historial clínico, anamnese, radiografias, fotografias clínicas, planos de tratamento;
d) Dados financeiros: informações de faturação e pagamento.

3. FINALIDADES DO TRATAMENTO
Os seus dados são tratados para as seguintes finalidades:
a) Prestação de cuidados de saúde oral;
b) Gestão administrativa e financeira;
c) Cumprimento de obrigações legais (fiscais, regulatórias);
d) Comunicação de informações relevantes sobre a sua saúde oral;
e) Melhoria contínua dos serviços prestados.

4. BASE LEGAL
O tratamento dos seus dados baseia-se em:
a) Execução de contrato de prestação de serviços de saúde;
b) Cumprimento de obrigações legais;
c) Interesse legítimo da clínica;
d) Consentimento do titular (quando aplicável).

5. CONSERVAÇÃO DOS DADOS
Os dados de saúde são conservados pelo período mínimo legal de 5 anos após o último ato clínico, conforme a legislação aplicável ao setor da saúde.

6. DIREITOS DO TITULAR
Nos termos do RGPD, tem direito a:
a) Aceder aos seus dados pessoais;
b) Solicitar a retificação de dados inexatos;
c) Solicitar a eliminação dos dados (direito ao esquecimento), quando aplicável;
d) Limitar o tratamento dos dados;
e) Portabilidade dos dados;
f) Opor-se ao tratamento dos dados;
g) Apresentar reclamação junto da CNPD (Comissão Nacional de Proteção de Dados).

7. SEGURANÇA
Implementamos medidas técnicas e organizativas adequadas para proteger os seus dados pessoais contra acessos não autorizados, perda ou destruição.

8. CONTACTO DO ENCARREGADO DE PROTEÇÃO DE DADOS
Para exercer os seus direitos ou esclarecer questões sobre o tratamento dos seus dados, contacte-nos através dos meios disponibilizados na clínica.`,
    obrigatorio: true,
    categoria: "politica_privacidade",
  },
  {
    titulo: "Consentimento para Marketing",
    conteudo: `CONSENTIMENTO PARA COMUNICAÇÕES DE MARKETING

Nos termos do artigo 7.º do Regulamento (UE) 2016/679 (RGPD) e da Lei n.º 41/2004, de 18 de agosto:

1. OBJETO DO CONSENTIMENTO
Ao aceitar este termo, autoriza a clínica a enviar-lhe comunicações de marketing, incluindo:
a) Informações sobre novos serviços e tratamentos;
b) Promoções e campanhas especiais;
c) Lembretes de consultas de rotina e check-ups;
d) Newsletter com dicas de saúde oral.

2. CANAIS DE COMUNICAÇÃO
As comunicações poderão ser enviadas através de:
a) E-mail;
b) SMS/WhatsApp;
c) Correio postal;
d) Telefone.

3. REVOGAÇÃO DO CONSENTIMENTO
Este consentimento é livre, específico, informado e inequívoco. Pode revogar este consentimento a qualquer momento, sem qualquer penalização, através de:
a) Pedido presencial na receção da clínica;
b) Envio de e-mail para o endereço da clínica;
c) Clicando no link de cancelamento presente nas comunicações eletrónicas.

4. NOTA IMPORTANTE
A recusa ou revogação deste consentimento NÃO afeta de forma alguma a prestação dos serviços de saúde contratados. Este consentimento é totalmente opcional.`,
    obrigatorio: false,
    categoria: "marketing",
  },
  {
    titulo: "Consentimento Informado para Tratamento",
    conteudo: `CONSENTIMENTO INFORMADO PARA TRATAMENTO CLÍNICO

Em conformidade com a Lei n.º 15/2014 (Lei Consolidada dos Direitos e Deveres do Utente dos Serviços de Saúde) e o Código Deontológico da Ordem dos Médicos Dentistas:

1. DECLARAÇÃO
Declaro que fui informado(a) de forma clara e compreensível sobre:
a) O diagnóstico e a natureza da minha condição clínica;
b) O tratamento proposto, incluindo os procedimentos a realizar;
c) Os benefícios esperados do tratamento;
d) Os riscos e possíveis complicações associados;
e) As alternativas de tratamento disponíveis;
f) As consequências da recusa do tratamento.

2. RISCOS GERAIS
Fui informado(a) de que qualquer procedimento clínico pode envolver riscos gerais, incluindo mas não limitados a:
a) Dor ou desconforto pós-operatório;
b) Edema (inchaço) temporário;
c) Reações alérgicas a materiais ou medicamentos;
d) Hemorragia;
e) Infeção;
f) Necessidade de tratamentos adicionais.

3. ANESTESIA
Autorizo a administração de anestesia local quando clinicamente necessário, tendo sido informado(a) dos riscos associados.

4. FOTOGRAFIAS E REGISTOS
Autorizo a realização de fotografias e registos clínicos para fins de documentação do tratamento e do processo clínico.

5. DECLARAÇÃO FINAL
Declaro que li e compreendi toda a informação fornecida, que tive oportunidade de esclarecer todas as dúvidas, e que dou o meu consentimento livre e informado para o tratamento proposto.`,
    obrigatorio: true,
    categoria: "consentimento_tratamento",
  },
];

// ─── Componente Principal ──────────────────────────────────────────────────────
export function TermosConsentimentoPage() {
  const [pesquisa, setPesquisa] = useState("");
  const [mostrarModal, setMostrarModal] = useState(false);
  const [mostrarTemplates, setMostrarTemplates] = useState(false);
  const [mostrarPreview, setMostrarPreview] = useState<any>(null);
  const [mostrarConfirmDelete, setMostrarConfirmDelete] = useState<any>(null);
  const [termoEmEdicao, setTermoEmEdicao] = useState<any>(null);
  const [formData, setFormData] = useState({ titulo: "", conteudo: "", obrigatorio: true });
  const [expandedTermos, setExpandedTermos] = useState<Set<number>>(new Set());

  const termosQ = trpc.termosConsentimento.listarTermos.useQuery();
  const termos = (termosQ.data as any)?.termos || [];

  const criarMutation = trpc.termosConsentimento.criarTermo.useMutation({
    onSuccess: () => {
      termosQ.refetch();
      setMostrarModal(false);
      setFormData({ titulo: "", conteudo: "", obrigatorio: true });
    },
  });

  const editarMutation = trpc.termosConsentimento.atualizarTermo.useMutation({
    onSuccess: () => {
      termosQ.refetch();
      setMostrarModal(false);
      setTermoEmEdicao(null);
      setFormData({ titulo: "", conteudo: "", obrigatorio: true });
    },
  });

  const eliminarMutation = trpc.termosConsentimento.eliminarTermo.useMutation({
    onSuccess: () => {
      termosQ.refetch();
      setMostrarConfirmDelete(null);
    },
  });

  const toggleAtivoMutation = trpc.termosConsentimento.atualizarTermo.useMutation({
    onSuccess: () => termosQ.refetch(),
  });

  const abrirModalCriacao = () => {
    setTermoEmEdicao(null);
    setFormData({ titulo: "", conteudo: "", obrigatorio: true });
    setMostrarModal(true);
    setMostrarTemplates(false);
  };

  const abrirModalEdicao = (termo: any) => {
    setTermoEmEdicao(termo);
    setFormData({ titulo: termo.titulo, conteudo: termo.conteudo, obrigatorio: termo.obrigatorio });
    setMostrarModal(true);
    setMostrarTemplates(false);
  };

  const usarTemplate = (template: typeof TEMPLATES_RGPD[0]) => {
    setFormData({
      titulo: template.titulo,
      conteudo: template.conteudo,
      obrigatorio: template.obrigatorio,
    });
    setMostrarTemplates(false);
  };

  const guardar = () => {
    if (!formData.titulo.trim() || !formData.conteudo.trim()) return;
    if (termoEmEdicao) {
      editarMutation.mutate({ id: termoEmEdicao.id, ...formData });
    } else {
      criarMutation.mutate(formData);
    }
  };

  const toggleExpanded = (id: number) => {
    const newSet = new Set(expandedTermos);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedTermos(newSet);
  };

  const toggleAtivo = (termo: any) => {
    toggleAtivoMutation.mutate({ id: termo.id, ativo: !termo.ativo });
  };

  const termosFiltrados = termos.filter((t: any) =>
    t.titulo.toLowerCase().includes(pesquisa.toLowerCase()) ||
    t.conteudo.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const termosAtivos = termos.filter((t: any) => t.ativo).length;
  const termosObrigatorios = termos.filter((t: any) => t.obrigatorio).length;

  return (
    <div className="p-4 sm:p-8 bg-[var(--bg-primary)] min-h-screen">
      {/* ═══ Header ═════════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
        <div className="mb-4 sm:mb-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[var(--bg-elevated)] rounded-2xl flex items-center justify-center border border-[var(--border-primary)]">
              <FileText className="w-6 h-6 text-[#00E5FF]" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">Termos e Consentimentos</h1>
              <p className="text-sm text-[var(--text-secondary)]">Gestão de todos os termos RGPD e consentimentos da clínica.</p>
            </div>
          </div>
        </div>
        <button
          onClick={abrirModalCriacao}
          className="flex items-center justify-center gap-2 px-5 py-3 text-sm font-bold text-white transition-colors rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] shadow-lg shadow-[#00E5FF]/20"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Termo</span>
        </button>
      </div>

      {/* ═══ Stats & Search ═════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl p-5 flex items-center gap-5">
          <div className="w-11 h-11 rounded-full bg-green-500/10 flex items-center justify-center">
            <CheckCircle className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Ativos</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{termosAtivos} <span className="text-base font-medium text-[var(--text-secondary)]">/ {termos.length}</span></p>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl p-5 flex items-center gap-5">
          <div className="w-11 h-11 rounded-full bg-red-500/10 flex items-center justify-center">
            <Shield className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest">Obrigatórios</p>
            <p className="text-2xl font-bold text-[var(--text-primary)]">{termosObrigatorios} <span className="text-base font-medium text-[var(--text-secondary)]">/ {termos.length}</span></p>
          </div>
        </div>
        <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl p-5 flex items-center gap-5 md:col-span-1">
          <div className="relative w-full">
            <Search className="absolute w-4 h-4 top-3.5 left-4 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Pesquisar por título ou conteúdo..."
              value={pesquisa}
              onChange={e => setPesquisa(e.target.value)}
              className="w-full py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] transition-colors"
            />
          </div>
        </div>
      </div>

      {/* ═══ Lista de Termos ════════════════════════════════════════════════════ */}
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl">
        {termosQ.isLoading ? (
          <div className="p-12 text-center text-[var(--text-muted)] flex flex-col items-center justify-center">
            <Loader2 className="w-6 h-6 mb-3 animate-spin" />
            <p className="text-sm">A carregar termos...</p>
          </div>
        ) : termosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-[var(--text-muted)] flex flex-col items-center justify-center">
            <Search className="w-6 h-6 mb-3" />
            <p className="text-sm font-medium">Nenhum termo encontrado</p>
            <p className="text-xs">Tente ajustar a sua pesquisa.</p>
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-lightest)]">
            {termosFiltrados.map((termo: any) => (
              <li key={termo.id} className="p-4 hover:bg-[var(--bg-surface)] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-2 h-10 rounded-full ${termo.ativo ? 'bg-green-400' : 'bg-gray-600'}`}></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-[var(--text-primary)] truncate">{termo.titulo}</p>
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                          termo.obrigatorio ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                        }`}>
                          {termo.obrigatorio ? 'Obrigatório' : 'Opcional'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-[var(--text-muted)] mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>Versão {termo.versao}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Info className="w-3 h-3" />
                          <span>{termo.conteudo.length} caracteres</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button onClick={() => toggleAtivo(termo)} title={termo.ativo ? 'Desativar' : 'Ativar'}>
                      {termo.ativo ? <ToggleRight className="w-9 h-9 text-green-400" /> : <ToggleLeft className="w-9 h-9 text-gray-600" />}
                    </button>
                    <button onClick={() => setMostrarPreview(termo)} className="w-9 h-9 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" title="Preview">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button onClick={() => abrirModalEdicao(termo)} className="w-9 h-9 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" title="Editar">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setMostrarConfirmDelete(termo)} className="w-9 h-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors" title="Eliminar">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => toggleExpanded(termo.id)} className="w-9 h-9 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors" title="Expandir/Recolher">
                      {expandedTermos.has(termo.id) ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                {expandedTermos.has(termo.id) && (
                  <div className="mt-4 pl-6 border-l-2 border-dashed border-[var(--border-light)] ml-5">
                    <pre className="text-xs text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans bg-[var(--bg-primary)] p-4 rounded-lg max-h-60 overflow-y-auto">{termo.conteudo}</pre>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ═══ Modal de Criação/Edição ════════════════════════════════════════════ */}
      {mostrarModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-3xl shadow-2xl max-h-[90vh] flex flex-col my-auto">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-[#00E5FF]/10 rounded-lg flex items-center justify-center border border-[#00E5FF]/20">
                  <FileText className="w-5 h-5 text-[#00E5FF]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[var(--text-primary)]">{termoEmEdicao ? 'Editar Termo' : 'Criar Novo Termo'}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">{termoEmEdicao ? 'Ajuste os detalhes abaixo.' : 'Preencha os detalhes ou use um template.'}</p>
                </div>
              </div>
              <button onClick={() => setMostrarModal(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
              {/* Templates */}
              {!termoEmEdicao && (
                <div className="p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                  <button onClick={() => setMostrarTemplates(!mostrarTemplates)} className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-yellow-400" />
                      <span className="text-sm font-bold text-[var(--text-primary)]">Usar Template RGPD</span>
                    </div>
                    {mostrarTemplates ? <ChevronUp className="w-5 h-5 text-[var(--text-muted)]" /> : <ChevronDown className="w-5 h-5 text-[var(--text-muted)]" />}
                  </button>
                  {mostrarTemplates && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4 pt-4 border-t border-[var(--border-light)]">
                      {TEMPLATES_RGPD.map(tpl => (
                        <button
                          key={tpl.categoria}
                          onClick={() => usarTemplate(tpl)}
                          className="p-3 text-left transition-colors border rounded-lg border-[#00E5FF]/10 hover:bg-[#00E5FF]/10 bg-[#00E5FF]/5"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <FileCheck className="w-4 h-4 text-[#00E5FF]" />
                            <span className="text-sm font-bold text-[var(--text-primary)]">{tpl.titulo}</span>
                          </div>
                          <p className="text-[10px] text-[var(--text-muted)] line-clamp-2">{tpl.conteudo.substring(0, 100)}...</p>
                          <div className="mt-2">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              tpl.obrigatorio ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                            }`}>
                              {tpl.obrigatorio ? 'Obrigatório' : 'Opcional'}
                            </span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Título */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
                  Título do Termo
                </label>
                <input
                  type="text"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] transition-colors"
                  placeholder="Ex: Política de Privacidade (RGPD)"
                />
              </div>

              {/* Conteúdo */}
              <div>
                <label className="block text-xs font-bold text-[var(--text-tertiary)] uppercase tracking-widest mb-2">
                  Conteúdo do Termo
                </label>
                <textarea
                  value={formData.conteudo}
                  onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
                  rows={12}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[#00E5FF]/30 focus:border-[#00E5FF] transition-colors resize-none font-sans leading-relaxed"
                  placeholder="Escreva aqui o conteúdo completo do termo de consentimento...&#10;&#10;Pode usar os templates RGPD acima como ponto de partida e personalizar conforme necessário."
                />
                <p className="text-[10px] text-[var(--text-muted)] mt-1.5">{formData.conteudo.length} caracteres</p>
              </div>

              {/* Obrigatório */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                <label className="relative inline-flex items-center cursor-pointer mt-0.5">
                  <input
                    type="checkbox"
                    checked={formData.obrigatorio}
                    onChange={e => setFormData({ ...formData, obrigatorio: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[var(--bg-overlay)] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#00E5FF]/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#00E5FF] border border-[var(--border-light)]"></div>
                </label>
                <div>
                  <span className="text-sm font-bold text-[var(--text-primary)]">
                    {formData.obrigatorio ? 'Obrigatório' : 'Opcional'}
                  </span>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    {formData.obrigatorio
                      ? 'O utente DEVE aceitar este termo para concluir a anamnese e assinar. Não pode prosseguir sem aceitar.'
                      : 'O utente pode recusar este termo sem impacto nos serviços (ex: consentimento de marketing).'}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-[var(--border-lightest)] flex items-center gap-3 bg-[var(--bg-surface)] rounded-b-2xl">
              <button
                onClick={() => setMostrarModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={criarMutation.isPending || editarMutation.isPending || !formData.titulo.trim() || !formData.conteudo.trim()}
                className="flex-1 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00E5FF] text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm shadow-[#00E5FF]/20"
              >
                {criarMutation.isPending || editarMutation.isPending
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <CheckCircle className="w-4 h-4" />
                }
                {termoEmEdicao ? 'Guardar Alterações' : 'Criar Termo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal de Preview ═══════════════════════════════════════════════════ */}
      {mostrarPreview && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-2xl shadow-2xl max-h-[85vh] flex flex-col my-auto">
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)]">
              <div className="flex items-center gap-3">
                <Eye className="w-5 h-5 text-[#00E5FF]" />
                <div>
                  <h2 className="text-[var(--text-primary)] font-bold">{mostrarPreview.titulo}</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[9px] text-[var(--text-muted)] font-bold uppercase tracking-widest">Versão {mostrarPreview.versao}</span>
                    <span className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                      mostrarPreview.obrigatorio ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {mostrarPreview.obrigatorio ? 'Obrigatório' : 'Opcional'}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setMostrarPreview(null)} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <pre className="text-sm text-[var(--text-secondary)] leading-relaxed whitespace-pre-wrap font-sans">{mostrarPreview.conteudo}</pre>
            </div>
            <div className="p-4 border-t border-[var(--border-lightest)] bg-[var(--bg-surface)] rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => { abrirModalEdicao(mostrarPreview); setMostrarPreview(null); }} className="py-2 px-4 rounded-xl border border-[#00E5FF]/30 text-[#00E5FF] text-sm font-bold hover:bg-[#00E5FF]/10 transition-colors flex items-center gap-2">
                <Edit2 className="w-3.5 h-3.5" /> Editar
              </button>
              <button onClick={() => setMostrarPreview(null)} className="py-2 px-4 rounded-xl bg-[var(--bg-overlay)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Modal de Confirmação de Eliminação ════════════════════════════════ */}
      {mostrarConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[var(--bg-elevated)] border border-red-500/20 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle className="w-7 h-7 text-red-400" />
              </div>
              <h3 className="text-lg font-bold text-[var(--text-primary)] mb-2">Eliminar Termo?</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-1">Tem a certeza que deseja eliminar o termo:</p>
              <p className="text-sm font-bold text-[var(--text-primary)] mb-4">"{mostrarConfirmDelete.titulo}"</p>
              <p className="text-xs text-red-400 bg-red-500/5 rounded-lg p-3 border border-red-500/10">
                Esta ação é irreversível. Os registos de consentimento já dados pelos utentes serão mantidos no histórico.
              </p>
            </div>
            <div className="p-4 border-t border-[var(--border-lightest)] flex gap-3">
              <button
                onClick={() => setMostrarConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-overlay)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => eliminarMutation.mutate({ id: mostrarConfirmDelete.id })}
                disabled={eliminarMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                {eliminarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
