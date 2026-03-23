/**
 * ModalOrcamento.tsx — Orçamento Digital gerado do Odontograma
 * DentCare Elite V35.7 — Ligação Odontograma → Financeiro
 *
 * Funcionalidades:
 * - Gera orçamento digital a partir dos tratamentos do plano do odontograma
 * - Permite adicionar/remover linhas de tratamento com preço
 * - Calcula totais com IVA opcional
 * - Cria tratamentos no módulo financeiro ao confirmar
 * - Exporta PDF do orçamento
 */
import React, { useState, useMemo, useCallback } from "react";
import { trpc } from "../lib/trpc";
import {
  X, FileText, Euro, Plus, Trash2, CheckCircle,
  AlertTriangle, Loader2, Printer, Download,
  Stethoscope, Smile, User, Calendar,
} from "lucide-react";
import { parseApiError } from "../lib/parseApiError";

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface LinhaOrcamento {
  id: string;
  descricao: string;
  dente: string;
  quantidade: number;
  precoUnitario: number;
  especialidade: string;
}

interface ModalOrcamentoProps {
  utenteId: number;
  utenteNome: string;
  medicoId?: number;
  tratamentosExistentes?: any[];
  dentesComProblema?: { numero: number; estado: string; descricao: string }[];
  onClose: () => void;
  onSuccess?: () => void;
}

// Tabela de preços de referência por tipo de tratamento
const PRECOS_REFERENCIA: Record<string, { preco: number; especialidade: string }> = {
  "Consulta de Diagnóstico":   { preco: 50,   especialidade: "Medicina Dentária Geral" },
  "Restauração a Compósito":   { preco: 80,   especialidade: "Dentisteria Operatória" },
  "Extracção Simples":         { preco: 70,   especialidade: "Cirurgia Oral" },
  "Extracção Cirúrgica":       { preco: 150,  especialidade: "Cirurgia Oral" },
  "Endodontia (1 canal)":      { preco: 200,  especialidade: "Endodontia" },
  "Endodontia (2 canais)":     { preco: 300,  especialidade: "Endodontia" },
  "Endodontia (3+ canais)":    { preco: 400,  especialidade: "Endodontia" },
  "Coroa Cerâmica":            { preco: 600,  especialidade: "Prótese" },
  "Coroa Metal-Cerâmica":      { preco: 450,  especialidade: "Prótese" },
  "Implante Dentário":         { preco: 1200, especialidade: "Implantologia" },
  "Prótese Parcial Removível": { preco: 800,  especialidade: "Prótese" },
  "Prótese Total":             { preco: 1200, especialidade: "Prótese" },
  "Destartarização":           { preco: 60,   especialidade: "Periodontologia" },
  "Tratamento Periodontal":    { preco: 120,  especialidade: "Periodontologia" },
  "Branqueamento":             { preco: 250,  especialidade: "Estética Dentária" },
  "Selante de Fissuras":       { preco: 30,   especialidade: "Medicina Dentária Geral" },
  "Radiografia Periapical":    { preco: 20,   especialidade: "Imagiologia" },
  "Ortopantomografia":         { preco: 60,   especialidade: "Imagiologia" },
};

// Mapeamento de estados do odontograma para tratamentos sugeridos
const ESTADO_PARA_TRATAMENTO: Record<string, string> = {
  carie:             "Restauração a Compósito",
  endodontia:        "Endodontia (2 canais)",
  extracao_indicada: "Extracção Simples",
  extraido:          "Implante Dentário",
  ausente:           "Implante Dentário",
  coroa:             "Coroa Cerâmica",
  protese:           "Prótese Parcial Removível",
};

// ─── Componente ───────────────────────────────────────────────────────────────
export function ModalOrcamento({
  utenteId,
  utenteNome,
  medicoId,
  tratamentosExistentes = [],
  dentesComProblema = [],
  onClose,
  onSuccess,
}: ModalOrcamentoProps) {
  const [linhas, setLinhas] = useState<LinhaOrcamento[]>(() => {
    // Pré-popular com tratamentos sugeridos dos dentes com problema
    const sugeridas: LinhaOrcamento[] = [];

    // A partir dos dentes com problema no odontograma
    dentesComProblema.forEach(({ numero, estado }) => {
      const tratSugerido = ESTADO_PARA_TRATAMENTO[estado];
      if (tratSugerido) {
        const ref = PRECOS_REFERENCIA[tratSugerido];
        sugeridas.push({
          id: `dente-${numero}-${estado}`,
          descricao: tratSugerido,
          dente: String(numero),
          quantidade: 1,
          precoUnitario: ref?.preco ?? 0,
          especialidade: ref?.especialidade ?? "Medicina Dentária Geral",
        });
      }
    });

    // A partir dos tratamentos existentes pendentes/propostos
    tratamentosExistentes
      .filter(t => t.estado === "pendente" || t.estado === "proposto")
      .forEach(t => {
        sugeridas.push({
          id: `trat-${t.id}`,
          descricao: t.descricao,
          dente: t.dente ?? "",
          quantidade: 1,
          precoUnitario: parseFloat(t.valorBruto ?? "0") || 0,
          especialidade: t.especialidade ?? "Medicina Dentária Geral",
        });
      });

    // Se não há sugestões, adicionar linha em branco
    if (sugeridas.length === 0) {
      sugeridas.push({
        id: "linha-1",
        descricao: "Consulta de Diagnóstico",
        dente: "",
        quantidade: 1,
        precoUnitario: 50,
        especialidade: "Medicina Dentária Geral",
      });
    }

    return sugeridas;
  });

  const [incluirIva, setIncluirIva] = useState(false);
  const [taxaIva, setTaxaIva] = useState(23);
  const [observacoes, setObservacoes] = useState("");
  const [validadeDias, setValidadeDias] = useState(30);
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // Queries
  const medicosQuery = trpc.dentistas.listar.useQuery();
  const criarTratamentoMutation = trpc.tratamentos.criarTratamento.useMutation();

  const medicos = (medicosQuery.data as any)?.dentistas ?? [];
  const [medicoIdSelecionado, setMedicoIdSelecionado] = useState<number | null>(medicoId ?? null);

  // Cálculos
  const subtotal = useMemo(() =>
    linhas.reduce((acc, l) => acc + l.quantidade * l.precoUnitario, 0),
    [linhas]
  );
  const valorIva = useMemo(() =>
    incluirIva ? Math.round(subtotal * (taxaIva / 100) * 100) / 100 : 0,
    [subtotal, incluirIva, taxaIva]
  );
  const total = subtotal + valorIva;

  // Adicionar linha
  const adicionarLinha = () => {
    setLinhas(prev => [...prev, {
      id: `linha-${Date.now()}`,
      descricao: "",
      dente: "",
      quantidade: 1,
      precoUnitario: 0,
      especialidade: "Medicina Dentária Geral",
    }]);
  };

  // Remover linha
  const removerLinha = (id: string) => {
    setLinhas(prev => prev.filter(l => l.id !== id));
  };

  // Actualizar linha
  const actualizarLinha = (id: string, campo: keyof LinhaOrcamento, valor: any) => {
    setLinhas(prev => prev.map(l => {
      if (l.id !== id) return l;
      const updated = { ...l, [campo]: valor };
      // Auto-preencher preço e especialidade ao seleccionar descrição
      if (campo === "descricao" && PRECOS_REFERENCIA[valor]) {
        const ref = PRECOS_REFERENCIA[valor];
        updated.precoUnitario = ref.preco;
        updated.especialidade = ref.especialidade;
      }
      return updated;
    }));
  };

  // Confirmar e criar tratamentos no financeiro
  const confirmarOrcamento = useCallback(async () => {
    if (!medicoIdSelecionado) {
      setErro("Seleccione um médico/dentista para o orçamento.");
      return;
    }
    if (linhas.length === 0) {
      setErro("Adicione pelo menos um tratamento ao orçamento.");
      return;
    }
    const linhasValidas = linhas.filter(l => l.descricao.trim() && l.precoUnitario >= 0);
    if (linhasValidas.length === 0) {
      setErro("Preencha a descrição e o preço de pelo menos um tratamento.");
      return;
    }

    setEnviando(true);
    setErro(null);

    try {
      // Criar cada tratamento no módulo financeiro
      for (const linha of linhasValidas) {
        await criarTratamentoMutation.mutateAsync({
          utenteId,
          medicoId: medicoIdSelecionado,
          dente: linha.dente || "—",
          descricao: linha.descricao,
          especialidade: linha.especialidade,
          estado: "proposto",
          valor: linha.precoUnitario * linha.quantidade,
        });
      }
      setSucesso(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1500);
    } catch (error: any) {
      setErro(parseApiError(error, "Erro ao criar orçamento no módulo financeiro."));
    } finally {
      setEnviando(false);
    }
  }, [linhas, medicoIdSelecionado, utenteId, criarTratamentoMutation, onSuccess, onClose]);

  // Imprimir orçamento
  const imprimirOrcamento = () => {
    const dataValidade = new Date(Date.now() + validadeDias * 24 * 60 * 60 * 1000);
    const linhasHtml = linhas.map(l => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #eee">${l.descricao}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${l.dente || "—"}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:center">${l.quantidade}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right">${l.precoUnitario.toFixed(2)} €</td>
        <td style="padding:8px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${(l.quantidade * l.precoUnitario).toFixed(2)} €</td>
      </tr>
    `).join("");

    const html = `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <title>Orçamento — ${utenteNome}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
    h1 { color: #0066cc; font-size: 24px; margin-bottom: 4px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info { font-size: 13px; color: #666; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th { background: #0066cc; color: white; padding: 10px 12px; text-align: left; font-size: 12px; }
    td { font-size: 13px; }
    .totals { margin-top: 20px; text-align: right; }
    .total-line { font-size: 13px; margin: 4px 0; }
    .total-final { font-size: 18px; font-weight: bold; color: #0066cc; margin-top: 8px; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 12px; }
    .badge { display: inline-block; background: #fff3cd; border: 1px solid #ffc107; color: #856404; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Orçamento Clínico</h1>
      <p class="info">Emitido em: ${new Date().toLocaleDateString("pt-PT")}</p>
      <p class="info">Válido até: ${dataValidade.toLocaleDateString("pt-PT")}</p>
      <span class="badge">Válido por ${validadeDias} dias</span>
    </div>
    <div style="text-align:right">
      <p class="info"><strong>Utente:</strong> ${utenteNome}</p>
      <p class="info"><strong>Ref.:</strong> ORC/${new Date().getFullYear()}/${Date.now().toString().slice(-4)}</p>
    </div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Descrição do Tratamento</th>
        <th style="text-align:center">Dente</th>
        <th style="text-align:center">Qtd.</th>
        <th style="text-align:right">Preço Unit.</th>
        <th style="text-align:right">Total</th>
      </tr>
    </thead>
    <tbody>${linhasHtml}</tbody>
  </table>
  <div class="totals">
    <p class="total-line">Subtotal: <strong>${subtotal.toFixed(2)} €</strong></p>
    ${incluirIva ? `<p class="total-line">IVA (${taxaIva}%): <strong>${valorIva.toFixed(2)} €</strong></p>` : ""}
    <p class="total-final">TOTAL: ${total.toFixed(2)} €</p>
  </div>
  ${observacoes ? `<div style="margin-top:20px;padding:12px;background:#f8f9fa;border-radius:8px;font-size:13px"><strong>Observações:</strong><br>${observacoes}</div>` : ""}
  <div class="footer">
    Este orçamento é meramente indicativo e pode estar sujeito a alterações após avaliação clínica detalhada.
    Os preços indicados incluem o acto clínico mas excluem materiais adicionais não previstos.
  </div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.write(html);
      win.document.close();
      win.print();
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-lighter)] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-[var(--text-primary)] font-bold text-base">Orçamento Digital</h2>
              <p className="text-[var(--text-muted)] text-xs flex items-center gap-1.5">
                <User className="w-3 h-3" />
                {utenteNome}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Conteúdo com scroll */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Sucesso */}
          {sucesso && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm font-medium">Orçamento criado com sucesso no módulo financeiro!</p>
            </div>
          )}

          {/* Erro */}
          {erro && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">{erro}</p>
            </div>
          )}

          {/* Médico */}
          <div>
            <label className="section-label block mb-1.5">Médico/Dentista Responsável</label>
            <select
              value={medicoIdSelecionado ?? ""}
              onChange={e => setMedicoIdSelecionado(e.target.value ? Number(e.target.value) : null)}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500/50"
            >
              <option value="">Seleccionar médico...</option>
              {medicos.map((m: any) => (
                <option key={m.id} value={m.id}>{m.nome} {m.especialidade ? `— ${m.especialidade}` : ""}</option>
              ))}
            </select>
          </div>

          {/* Tabela de tratamentos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="section-label">Tratamentos / Procedimentos</label>
              <button
                onClick={adicionarLinha}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Adicionar Linha
              </button>
            </div>

            <div className="border border-[var(--border-lighter)] rounded-xl overflow-hidden">
              {/* Cabeçalho */}
              <div className="grid grid-cols-[2fr_80px_80px_100px_40px] gap-2 px-3 py-2 bg-[var(--bg-overlay)] border-b border-[var(--border-lighter)]">
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider">Tratamento</span>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider text-center">Dente</span>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider text-center">Qtd.</span>
                <span className="text-[10px] font-bold uppercase text-[var(--text-muted)] tracking-wider text-right">Preço</span>
                <span></span>
              </div>

              {/* Linhas */}
              <div className="divide-y divide-[var(--border-lightest)]">
                {linhas.map(linha => (
                  <div key={linha.id} className="grid grid-cols-[2fr_80px_80px_100px_40px] gap-2 px-3 py-2.5 items-center">
                    {/* Descrição */}
                    <div>
                      <input
                        list={`tratamentos-${linha.id}`}
                        value={linha.descricao}
                        onChange={e => actualizarLinha(linha.id, "descricao", e.target.value)}
                        placeholder="Descrição do tratamento..."
                        className="w-full bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none border-b border-transparent focus:border-[var(--border-light)] transition-colors"
                      />
                      <datalist id={`tratamentos-${linha.id}`}>
                        {Object.keys(PRECOS_REFERENCIA).map(t => (
                          <option key={t} value={t} />
                        ))}
                      </datalist>
                    </div>
                    {/* Dente */}
                    <input
                      value={linha.dente}
                      onChange={e => actualizarLinha(linha.id, "dente", e.target.value)}
                      placeholder="—"
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] text-center placeholder-[var(--text-muted)] focus:outline-none border-b border-transparent focus:border-[var(--border-light)] transition-colors"
                    />
                    {/* Quantidade */}
                    <input
                      type="number"
                      min="1"
                      value={linha.quantidade}
                      onChange={e => actualizarLinha(linha.id, "quantidade", Math.max(1, Number(e.target.value)))}
                      className="w-full bg-transparent text-sm text-[var(--text-primary)] text-center focus:outline-none border-b border-transparent focus:border-[var(--border-light)] transition-colors"
                    />
                    {/* Preço */}
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={linha.precoUnitario}
                        onChange={e => actualizarLinha(linha.id, "precoUnitario", Math.max(0, Number(e.target.value)))}
                        className="w-full bg-transparent text-sm text-[var(--text-primary)] text-right focus:outline-none border-b border-transparent focus:border-[var(--border-light)] transition-colors"
                      />
                      <span className="text-[var(--text-muted)] text-xs shrink-0">€</span>
                    </div>
                    {/* Remover */}
                    <button
                      onClick={() => removerLinha(linha.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Opções de IVA */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIncluirIva(v => !v)}
                className={`w-9 h-5 rounded-full transition-all duration-200 relative ${incluirIva ? "bg-emerald-400" : "bg-white/[0.08]"}`}
              >
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all duration-200 ${incluirIva ? "left-4" : "left-0.5"}`} />
              </button>
              <span className="text-sm text-[var(--text-secondary)]">Incluir IVA</span>
            </div>
            {incluirIva && (
              <div className="flex items-center gap-2">
                <select
                  value={taxaIva}
                  onChange={e => setTaxaIva(Number(e.target.value))}
                  className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
                >
                  <option value={6}>6%</option>
                  <option value={13}>13%</option>
                  <option value={23}>23%</option>
                </select>
              </div>
            )}
            <div className="flex items-center gap-2 ml-auto">
              <Calendar className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="text-xs text-[var(--text-muted)]">Validade:</span>
              <select
                value={validadeDias}
                onChange={e => setValidadeDias(Number(e.target.value))}
                className="bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-lg px-2 py-1 text-sm text-[var(--text-primary)] focus:outline-none"
              >
                <option value={15}>15 dias</option>
                <option value={30}>30 dias</option>
                <option value={60}>60 dias</option>
                <option value={90}>90 dias</option>
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="section-label block mb-1.5">Observações</label>
            <textarea
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Condições do orçamento, notas clínicas, plano de pagamento..."
              rows={2}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 resize-none"
            />
          </div>

          {/* Totais */}
          <div className="bg-[var(--bg-surface)] border border-[var(--border-lighter)] rounded-xl p-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-medium">{subtotal.toFixed(2)} €</span>
              </div>
              {incluirIva && (
                <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                  <span>IVA ({taxaIva}%)</span>
                  <span className="font-medium">{valorIva.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex justify-between text-base font-bold text-[var(--text-primary)] pt-2 border-t border-[var(--border-lighter)]">
                <span className="flex items-center gap-1.5">
                  <Euro className="w-4 h-4 text-emerald-400" />
                  Total
                </span>
                <span className="text-emerald-400 text-lg">{total.toFixed(2)} €</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer com botões */}
        <div className="flex items-center gap-3 p-5 border-t border-[var(--border-lighter)] shrink-0">
          <button
            onClick={imprimirOrcamento}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir / PDF
          </button>
          <div className="flex-1" />
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-subtle)] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarOrcamento}
            disabled={enviando || sucesso || !medicoIdSelecionado}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {enviando ? (
              <><Loader2 className="w-4 h-4 animate-spin" />A criar...</>
            ) : sucesso ? (
              <><CheckCircle className="w-4 h-4" />Criado!</>
            ) : (
              <><Stethoscope className="w-4 h-4" />Criar no Financeiro</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
