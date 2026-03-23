/**
 * EquipaPage.tsx — Gestão de Equipa com Ficha do Dentista e Relatório de Comissões
 * DentCare Elite V35
 * 
 * CORREÇÕES V32.8:
 * - ModalFichaDentista: Nova tab "Faturas" para ver faturas pagas/pendentes do dentista
 * - ModalFichaDentista: Resumo financeiro agora mostra dados correctamente (LEFT JOIN no backend)
 * - ModalFichaDentista: Indicadores de faturas pagas/pendentes no resumo
 * - ModalFichaDentista: Melhorias visuais e informativas
 * - ModalDentista: Suporte completo a edição e criação
 * - Marcar comissões como pagas individualmente ou em lote
 */
import React, { useState, useMemo } from "react";
import { trpc } from "../lib/trpc";
import { useConfig } from "../contexts/ConfigContext";
import { aplicarTimbrado, aplicarRodapeTimbrado } from "../lib/pdfTimbrado";
import { parseApiError } from "../lib/parseApiError";
import {
  Users, Search, Plus, Stethoscope, X, Check, Edit2,
  UserCog, Mail, Phone, Percent, Star, AlertCircle,
  UserCheck, UserX, Eye, FileText, DollarSign, Clock,
  CheckCircle, TrendingUp, Calendar, Loader2, ArrowLeft,
  CreditCard, Receipt, ChevronDown, ChevronUp, Filter, Download,
  Paperclip, Upload, Image, Trash2, ExternalLink
} from "lucide-react";

// ─── Helper: formatar valor monetário ────────────────────────────────────────
function fmtVal(valor: number | string | null | undefined, sm = "€"): string {
  const num = Number(valor ?? 0);
  return `${sm} ${num.toFixed(2)}`;
}

function fmtData(data: string | Date | null | undefined): string {
  if (!data) return "—";
  try {
    return new Date(data).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

// ─── Modal Novo / Editar Dentista ─────────────────────────────────────────────
function ModalDentista({
  dentista,
  onClose,
  onSuccess,
}: {
  dentista?: any;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const isEdit = !!dentista;
  const [form, setForm] = useState({
    nome: dentista?.nome ?? "",
    cedulaProfissional: dentista?.cedulaProfissional ?? "",
    especialidade: dentista?.especialidade ?? "",
    telemovel: dentista?.telemovel ?? "",
    email: dentista?.email ?? "",
    percentualComissao: dentista?.percentualComissao ?? "30",
    tipoRemuneracao: (dentista?.tipoRemuneracao ?? "percentual") as "percentual" | "percentual_diaria",
    valorDiaria: dentista?.valorDiaria ?? "0",
  });
  const [erro, setErro] = useState("");

  const criarMutation = trpc.dentistas.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const actualizarMutation = trpc.dentistas.actualizar.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    if (!form.cedulaProfissional.trim()) { setErro("A cédula profissional é obrigatória"); return; }
    setErro("");

    const payload = {
      nome: form.nome,
      cedulaProfissional: form.cedulaProfissional,
      especialidade: form.especialidade || undefined,
      telemovel: form.telemovel || undefined,
      email: form.email || undefined,
      percentualComissao: parseFloat(form.percentualComissao) || 30,
      tipoRemuneracao: form.tipoRemuneracao,
      valorDiaria: parseFloat(form.valorDiaria) || 0,
    };

    if (isEdit) {
      actualizarMutation.mutate({ id: dentista.id, ...payload });
    } else {
      criarMutation.mutate(payload);
    }
  };

  const isPending = criarMutation.isPending || actualizarMutation.isPending;

  const ESPECIALIDADES = [
    "Medicina Dentária Geral",
    "Ortodontia",
    "Periodontologia",
    "Endodontia",
    "Cirurgia Oral",
    "Cirurgia Maxilofacial",
    "Odontopediatria",
    "Implantologia",
    "Prostodontia",
    "Dentisteria Operatória",
    "Dentisteria Estética",
    "Oclusão e DTM",
    "Medicina Oral",
    "Radiologia Oral",
    "Higiene Oral",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl my-auto flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)] sticky top-0 bg-[var(--bg-elevated)] z-10 rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-violet-600" />
            <h2 className="text-[var(--text-primary)] font-semibold">
              {isEdit ? "Editar Dentista" : "Novo Dentista"}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 bg-[var(--bg-elevated)] overflow-y-auto flex-1">
          {erro && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{erro}</p>
            </div>
          )}

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Nome Completo *</label>
            <input type="text" placeholder="Dr. João Silva"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Cédula Profissional (OMD) *</label>
            <input type="text" placeholder="OMD-12345"
              value={form.cedulaProfissional} onChange={e => setForm(f => ({ ...f, cedulaProfissional: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Especialidade</label>
            <select value={form.especialidade} onChange={e => setForm(f => ({ ...f, especialidade: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50">
              <option value="">— Selecionar especialidade —</option>
              {ESPECIALIDADES.map(esp => <option key={esp} value={esp}>{esp}</option>)}
            </select>
          </div>

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Telemóvel</label>
            <input type="tel" placeholder="912 345 678"
              value={form.telemovel} onChange={e => setForm(f => ({ ...f, telemovel: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Tipo de Remuneração</label>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, tipoRemuneracao: "percentual" }))}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${form.tipoRemuneracao === "percentual" ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                Apenas %
              </button>
              <button type="button" onClick={() => setForm(f => ({ ...f, tipoRemuneracao: "percentual_diaria" }))}
                className={`py-2.5 rounded-xl border text-xs font-bold transition-all ${form.tipoRemuneracao === "percentual_diaria" ? "bg-violet-500/20 border-violet-500/40 text-violet-400" : "bg-[var(--bg-overlay)] border-[var(--border-light)] text-[var(--text-muted)] hover:border-[var(--border-secondary)]"}`}>
                % + Diária
              </button>
            </div>
          </div>

          <div className={`grid gap-3 ${form.tipoRemuneracao === "percentual_diaria" ? "grid-cols-2" : "grid-cols-1"}`}>
            <div>
              <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Comissão (%)</label>
              <input type="number" min="0" max="100" step="0.5" placeholder="30"
                value={form.percentualComissao} onChange={e => setForm(f => ({ ...f, percentualComissao: e.target.value }))}
                onFocus={e => e.target.select()}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
            </div>
            {form.tipoRemuneracao === "percentual_diaria" && (
              <div>
                <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Valor Diária (€/dia)</label>
                <input type="number" min="0" step="5" placeholder="150"
                  value={form.valorDiaria} onChange={e => setForm(f => ({ ...f, valorDiaria: e.target.value }))}
                  onFocus={e => e.target.select()}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
            )}
          </div>

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Email</label>
            <input type="email" placeholder="medico@clinica.pt"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={isPending}
              className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check className="w-4 h-4" />}
              {isEdit ? "Guardar Alterações" : "Criar Dentista"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── V35: Modal Registar Pagamento Agrupado com Upload de Comprovativo ──────
function ModalRegistarPagamento({
  medicoId,
  comissaoIds,
  valorTotal,
  sm,
  onClose,
  onSubmit,
  isPending,
  onUploadComprovativo,
}: {
  medicoId: number;
  comissaoIds: number[];
  valorTotal: number;
  sm: string;
  onClose: () => void;
  onSubmit: (dados: any) => Promise<{ pagamentoId?: number } | void>;
  isPending: boolean;
  onUploadComprovativo?: (pagamentoId: number, fileBase64: string, fileName: string) => void;
}) {
  const [form, setForm] = useState({
    metodoPagamento: "transferencia" as "transferencia" | "numerario" | "cheque" | "mbway" | "outro",
    referencia: "",
    dataPagamento: new Date().toISOString().slice(0, 10),
    observacoes: "",
  });
  const [comprovativoFile, setComprovativoFile] = useState<File | null>(null);
  const [comprovativoPreview, setComprovativoPreview] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadingAfter, setUploadingAfter] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Processar ficheiro selecionado
  const handleFileSelect = (file: File) => {
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("O ficheiro excede o tamanho máximo de 10MB.");
      return;
    }
    const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      alert("Formato não suportado. Use PDF, JPG, PNG ou WebP.");
      return;
    }
    setComprovativoFile(file);
    // Gerar preview para imagens
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => setComprovativoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setComprovativoPreview(null);
    }
  };

  // Drag & Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
    else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFileSelect(e.dataTransfer.files[0]);
  };

  // Converter ficheiro para base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Preparar dados do pagamento
    const dadosPagamento: any = {
      medicoId,
      comissaoIds,
      metodoPagamento: form.metodoPagamento,
      referencia: form.referencia || undefined,
      dataPagamento: new Date(form.dataPagamento).toISOString(),
      observacoes: form.observacoes || undefined,
    };

    // Se há comprovativo, incluir no registo do pagamento
    if (comprovativoFile) {
      dadosPagamento._comprovativoFile = comprovativoFile;
      dadosPagamento._comprovativoFileName = comprovativoFile.name;
    }

    onSubmit(dadosPagamento);
  };

  const removeComprovativo = () => {
    setComprovativoFile(null);
    setComprovativoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl my-auto flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-5 border-b border-[var(--border-lightest)] shrink-0">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-emerald-600" />
            <h2 className="text-[var(--text-primary)] font-bold">Registar Pagamento</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Resumo do pagamento */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-emerald-600 text-xs font-bold uppercase">Total a Pagar</p>
            <p className="text-emerald-800 text-2xl font-black mt-1">{fmtVal(valorTotal, sm)}</p>
            <p className="text-emerald-600/70 text-xs mt-1">{comissaoIds.length} comiss{comissaoIds.length !== 1 ? "ões" : "ão"} selecionada{comissaoIds.length !== 1 ? "s" : ""}</p>
          </div>

          {/* Método de Pagamento */}
          <div>
            <label className="block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Método de Pagamento *</label>
            <select
              value={form.metodoPagamento}
              onChange={e => setForm(f => ({ ...f, metodoPagamento: e.target.value as any }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50"
            >
              <option value="transferencia">Transferência Bancária</option>
              <option value="numerario">Numerário</option>
              <option value="cheque">Cheque</option>
              <option value="mbway">MB WAY</option>
              <option value="outro">Outro</option>
            </select>
          </div>

          {/* Referência */}
          <div>
            <label className="block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Referência / Nº Comprovativo</label>
            <input
              type="text"
              placeholder="Ex: TRF-2026-001, Nº cheque, etc."
              value={form.referencia}
              onChange={e => setForm(f => ({ ...f, referencia: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50"
            />
          </div>

          {/* Data de Pagamento */}
          <div>
            <label className="block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Data de Pagamento *</label>
            <input
              type="date"
              value={form.dataPagamento}
              onChange={e => setForm(f => ({ ...f, dataPagamento: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50"
            />
          </div>

          {/* Observações */}
          <div>
            <label className="block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Observações</label>
            <textarea
              placeholder="Notas adicionais sobre este pagamento..."
              value={form.observacoes}
              onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
              rows={2}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none"
            />
          </div>

          {/* ─── COMPROVATIVO DE DEPÓSITO / TRANSFERÊNCIA ─── */}
          <div>
            <label className="block mb-1.5 text-[var(--text-primary)] font-semibold text-sm flex items-center gap-1.5">
              <Paperclip className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              Comprovativo de Pagamento
            </label>
            {!comprovativoFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
                  dragActive
                    ? "border-[#00E5FF] bg-[#00E5FF]/10"
                    : "border-[var(--border-light)] hover:border-[#00E5FF]/50 hover:bg-[var(--bg-surface)]"
                }`}
              >
                <Upload className={`w-8 h-8 mx-auto mb-2 ${dragActive ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
                <p className="text-sm font-medium text-[var(--text-secondary)]">
                  {dragActive ? "Solte o ficheiro aqui" : "Arraste o comprovativo ou clique para selecionar"}
                </p>
                <p className="text-xs text-[var(--text-muted)] mt-1">PDF, JPG, PNG ou WebP (máx. 10MB)</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
              </div>
            ) : (
              <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                {/* Preview do ficheiro */}
                {comprovativoPreview ? (
                  <div className="relative bg-[var(--bg-surface)] p-2">
                    <img
                      src={comprovativoPreview}
                      alt="Preview do comprovativo"
                      className="w-full max-h-40 object-contain rounded-lg"
                    />
                  </div>
                ) : (
                  <div className="bg-[var(--bg-surface)] p-4 flex items-center justify-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-red-50 border border-red-200 flex items-center justify-center">
                      <FileText className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[var(--text-primary)]">
                        {comprovativoFile.name.length > 35
                          ? comprovativoFile.name.slice(0, 32) + "..."
                          : comprovativoFile.name}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        Documento PDF
                      </p>
                    </div>
                  </div>
                )}
                {/* Barra de info do ficheiro */}
                <div className="flex items-center justify-between px-3 py-2 bg-[var(--bg-overlay)] border-t border-[var(--border-lightest)]">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-xs text-[var(--text-secondary)] font-medium">
                      {comprovativoFile.name.length > 25
                        ? comprovativoFile.name.slice(0, 22) + "..."
                        : comprovativoFile.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      ({formatFileSize(comprovativoFile.size)})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={removeComprovativo}
                    className="flex items-center gap-1 text-xs text-red-400 hover:text-red-500 font-medium transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remover
                  </button>
                </div>
              </div>
            )}
            <p className="text-[10px] text-[var(--text-muted)] mt-1.5">
              O comprovativo ficará associado a este grupo de faturas para controlo interno.
            </p>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 text-white text-sm font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {comprovativoFile ? "Confirmar com Comprovativo" : "Confirmar Pagamento"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Modal Ficha do Dentista com Relatório de Comissões ─────────────────────
function ModalFichaDentista({
  medicoId,
  onClose,
}: {
  medicoId: number;
  onClose: () => void;
}) {
  const { simboloMoeda: sm, timbradoConfig } = useConfig();
  const [tabFicha, setTabFicha] = useState<"resumo" | "comissoes" | "tratamentos" | "consultas" | "faturas">("resumo");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "pendente" | "paga">("todos");
  const [exportandoPDF, setExportandoPDF] = useState(false);
  // V35: Estado para seleção de comissões e modal de pagamento
  const [selectedComissaoIds, setSelectedComissaoIds] = useState<Set<number>>(new Set());
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showHistoricoPagamentos, setShowHistoricoPagamentos] = useState(false);

  const fichaQ = trpc.dentistas.obterFichaDentista.useQuery({ medicoId });
  const pagamentosQ = trpc.dentistas.listarPagamentosComissoes.useQuery({ medicoId });
  const utils = trpc.useUtils();

  const data = fichaQ.data as any;
  const medico = data?.medico;
  const tratamentos = data?.tratamentos ?? [];
  const consultasData = data?.consultas ?? [];
  const comissoes = data?.comissoes ?? [];
  const faturasData = data?.faturas ?? [];
  const resumo = data?.resumo ?? {};

  const marcarPagaMutation = trpc.dentistas.marcarComissaoPaga.useMutation({
    onSuccess: () => {
      utils.dentistas.obterFichaDentista.invalidate({ medicoId });
    },
  });

  const marcarTodasPagasMutation = trpc.dentistas.marcarComissoesPagas.useMutation({
    onSuccess: () => {
      utils.dentistas.obterFichaDentista.invalidate({ medicoId });
    },
  });

  const registarPagamentoMutation = trpc.dentistas.registarPagamentoComissoes.useMutation({
    onSuccess: () => {
      utils.dentistas.obterFichaDentista.invalidate({ medicoId });
      utils.dentistas.listarPagamentosComissoes.invalidate({ medicoId });
      setSelectedComissaoIds(new Set());
      setShowPagamentoModal(false);
    },
  });

  const uploadComprovativoMutation = trpc.dentistas.uploadComprovativo.useMutation({
    onSuccess: () => {
      utils.dentistas.listarPagamentosComissoes.invalidate({ medicoId });
    },
  });

  // Toggle seleção de comissão
  const toggleComissaoSel = (id: number) => {
    setSelectedComissaoIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };
  const toggleAllPendentes = () => {
    const pendentes = (comissoes ?? []).filter((c: any) => c.estado === "pendente").map((c: any) => c.id);
    if (pendentes.every((id: number) => selectedComissaoIds.has(id))) {
      setSelectedComissaoIds(new Set());
    } else {
      setSelectedComissaoIds(new Set(pendentes));
    }
  };
  const valorSelecionado = useMemo(() => {
    return (comissoes ?? []).filter((c: any) => selectedComissaoIds.has(c.id)).reduce((acc: number, c: any) => acc + Number(c.valorComissao || 0), 0);
  }, [comissoes, selectedComissaoIds]);

  // useMemo deve estar ANTES de qualquer return condicional (regras dos hooks)
  const tratamentosUnicos = useMemo(() => {
    const vistos = new Set<string>();
    return (tratamentos ?? []).filter((t: any) => {
      const chave = [
        t.id ?? "",
        t.descricao ?? "",
        t.utenteNome ?? "",
        t.dataInicio ? new Date(t.dataInicio).toISOString() : "",
        String(t.valorBruto ?? ""),
        String(t.valorComissao ?? "")
      ].join("|");
      if (vistos.has(chave)) return false;
      vistos.add(chave);
      return true;
    });
  }, [tratamentos]);

  const comissoesFiltradas = useMemo(() => {
    if (filtroEstado === "todos") return comissoes;
    return comissoes.filter((c: any) => c.estado === filtroEstado);
  }, [comissoes, filtroEstado]);

  // FIX BUG #3: Função de exportação do relatório do dentista em PDF
  const exportarRelatorioDentistaPDF = async () => {
    if (!medico) return;
    setExportandoPDF(true);
    try {
      const { jsPDF } = await import("jspdf");
      const autoTable = (await import("jspdf-autotable")).default;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const dataGeracao = new Date().toLocaleDateString("pt-PT");
      const horaGeracao = new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" });

      // Aplicar papel timbrado
      let yPos = timbradoConfig
        ? aplicarTimbrado(doc, timbradoConfig)
        : 20;

      // Título
      doc.setTextColor(25, 55, 109);
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text("RELATÓRIO DO DENTISTA", 12, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 110, 130);
      doc.text(`Gerado em: ${dataGeracao} às ${horaGeracao}`, 12, yPos);
      yPos += 10;

      // Dados do dentista
      doc.setFillColor(245, 245, 250);
      doc.roundedRect(12, yPos, 183, 28, 3, 3, "F");
      doc.setTextColor(25, 55, 109);
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(medico.nome || "Dentista", 18, yPos + 8);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 90, 110);
      if (medico.especialidade) doc.text(`Especialidade: ${medico.especialidade}`, 18, yPos + 15);
      doc.text(`OMD: ${medico.cedulaProfissional || "N/D"}`, 18, yPos + 21);
      doc.text(`Comissão: ${medico.percentualComissao || 30}%`, 100, yPos + 15);
      if (medico.email) doc.text(`Email: ${medico.email}`, 100, yPos + 21);
      yPos += 36;

      // KPIs financeiros
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Resumo Financeiro", 12, yPos);
      yPos += 6;
      const kpis = [
        { label: "Total Faturado",       valor: resumo.totalFaturado ?? 0,       cor: [79, 70, 229] as [number,number,number] },
        { label: "Comissões Pendentes",  valor: resumo.comissoesPendentes ?? 0,  cor: [245, 158, 11] as [number,number,number] },
        { label: "Comissões Pagas",      valor: resumo.comissoesPagas ?? 0,      cor: [34, 197, 94] as [number,number,number] },
        { label: "Lucro Clínica",        valor: resumo.totalLucroClinica ?? 0,   cor: [59, 130, 246] as [number,number,number] },
      ];
      let xKpi = 12;
      for (const kpi of kpis) {
        doc.setFillColor(kpi.cor[0], kpi.cor[1], kpi.cor[2]);
        doc.roundedRect(xKpi, yPos, 43, 20, 3, 3, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont("helvetica", "normal");
        doc.text(kpi.label, xKpi + 3, yPos + 6);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`${sm} ${Number(kpi.valor).toFixed(2)}`, xKpi + 3, yPos + 15);
        xKpi += 47;
      }
      yPos += 28;

      // Métricas operacionais
      doc.setTextColor(60, 60, 80);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Métricas Operacionais", 12, yPos);
      yPos += 5;
      const metricas = [
        { label: "Total de Consultas",        valor: resumo.totalConsultas ?? 0 },
        { label: "Consultas Realizadas",       valor: resumo.consultasRealizadas ?? 0 },
        { label: "Total de Tratamentos",       valor: resumo.totalTratamentos ?? 0 },
        { label: "Tratamentos Concluídos",     valor: resumo.tratamentosConcluidos ?? 0 },
      ];
      for (const m of metricas) {
        doc.setFillColor(248, 248, 252);
        doc.roundedRect(12, yPos, 183, 9, 1, 1, "F");
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 90, 110);
        doc.text(m.label, 17, yPos + 6);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(40, 40, 60);
        doc.text(String(m.valor), 188, yPos + 6, { align: "right" });
        yPos += 12;
      }
      yPos += 4;

      // Tabela de comissões
      if (comissoes.length > 0) {
        doc.setTextColor(60, 60, 80);
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text("Comissões Registadas", 12, yPos);
        yPos += 4;
        autoTable(doc, {
          startY: yPos,
          head: [["Data Pgto.", "Fatura", "Utente", "Valor Fatura", "%", "Comissão", "Estado"]],
          body: comissoes.map((c: any) => [
            c.dataPagamentoUtente ? new Date(c.dataPagamentoUtente).toLocaleDateString("pt-PT") : "—",
            c.numeroFatura || `#${c.faturaId}`,
            c.utenteNome || "—",
            `${sm} ${Number(c.valorFatura).toFixed(2)}`,
            `${Number(c.percentualComissao).toFixed(0)}%`,
            `${sm} ${Number(c.valorComissao).toFixed(2)}`,
            c.estado === "paga" ? "Paga" : c.estado === "pendente" ? "Pendente" : "Anulada",
          ]),
          styles: { fontSize: 8, cellPadding: 3 },
          headStyles: { fillColor: [25, 55, 109], textColor: [255, 255, 255] },
          alternateRowStyles: { fillColor: [248, 248, 252] },
          columnStyles: {
            3: { halign: "right" },
            4: { halign: "center" },
            5: { halign: "right", fontStyle: "bold" },
            6: { halign: "center" },
          },
          margin: { left: 12, right: 12 },
        });
      }

      // Rodapé
      if (timbradoConfig) {
        aplicarRodapeTimbrado(doc, timbradoConfig);
      }

      const nomeFicheiro = `Relatorio_Dentista_${(medico.nome || "dentista").replace(/\s+/g, "_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      doc.save(nomeFicheiro);
    } catch (err) {
      console.error("Erro ao gerar PDF do dentista:", err);
    } finally {
      setExportandoPDF(false);
    }
  };

  if (fichaQ.isLoading) {
    return (
      <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
        <div className="bg-[var(--bg-elevated)] rounded-2xl p-12 flex flex-col items-center gap-4 my-auto">
          <Loader2 className="w-8 h-8 animate-spin text-[#00E5FF]" />
          <p className="text-[var(--text-secondary)] text-sm">A carregar ficha do dentista...</p>
        </div>
      </div>
    );
  }

  if (!data || !medico) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-5xl shadow-2xl max-h-[92vh] overflow-hidden flex flex-col my-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)] shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center">
              <span className="text-violet-700 text-lg font-bold">{medico.nome?.charAt(0) ?? "D"}</span>
            </div>
            <div>
              <h2 className="text-[var(--text-primary)] font-bold text-lg">{medico.nome}</h2>
              <div className="flex items-center gap-3 text-xs text-[var(--text-tertiary)]">
                {medico.especialidade && <span>{medico.especialidade}</span>}
                <span>OMD: {medico.cedulaProfissional}</span>
                <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold">
                  {medico.percentualComissao}% comissão{medico.tipoRemuneracao === "percentual_diaria" && ` + ${Number(medico.valorDiaria || 0).toFixed(0)}€/dia`}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* FIX BUG #3: Botão de exportar relatório PDF do dentista */}
            <button
              onClick={exportarRelatorioDentistaPDF}
              disabled={exportandoPDF}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00E5FF]/10 hover:bg-[#00E5FF] text-sm font-medium transition-colors disabled:opacity-50"
              title="Exportar relatório completo do dentista em PDF"
            >
              {exportandoPDF
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <Download className="w-4 h-4" />}
              Exportar PDF
            </button>
            <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-[var(--border-lightest)] px-6 shrink-0">
          {[
            { key: "resumo", label: "Resumo", icon: TrendingUp },
            { key: "faturas", label: `Faturas (${faturasData.length})`, icon: DollarSign },
            { key: "comissoes", label: "Comissões / Pagamentos", icon: Receipt },
            { key: "tratamentos", label: "Tratamentos", icon: FileText },
            { key: "consultas", label: "Consultas", icon: Calendar },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTabFicha(key as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tabFicha === key
                  ? "border-[#00E5FF] text-[#00E5FF]"
                  : "border-transparent text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ─── TAB RESUMO ─── */}
          {tabFicha === "resumo" && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
                  <p className="text-violet-600 text-[10px] font-bold uppercase tracking-wider">Total Faturado</p>
                  <p className="text-violet-800 text-xl font-black mt-1">{fmtVal(resumo.totalFaturado, sm)}</p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-amber-600 text-[10px] font-bold uppercase tracking-wider">Comissões Pendentes</p>
                  <p className="text-amber-800 text-xl font-black mt-1">{fmtVal(resumo.comissoesPendentes, sm)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                  <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wider">Comissões Pagas</p>
                  <p className="text-emerald-800 text-xl font-black mt-1">{fmtVal(resumo.comissoesPagas, sm)}</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-blue-600 text-[10px] font-bold uppercase tracking-wider">Lucro Clínica</p>
                  <p className="text-blue-800 text-xl font-black mt-1">{fmtVal(resumo.totalLucroClinica, sm)}</p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 text-center">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Faturas</p>
                  <p className="text-[var(--text-primary)] text-2xl font-black mt-1">{resumo.totalFaturas ?? 0}</p>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="text-emerald-600 text-xs">{resumo.totalFaturasPagas ?? 0} pagas</span>
                    <span className="text-[var(--text-muted)] text-xs">·</span>
                    <span className="text-amber-600 text-xs">{resumo.totalFaturasPendentes ?? 0} pendentes</span>
                  </div>
                  {(resumo.totalFaturasAnuladas ?? 0) > 0 && (
                    <p className="text-red-500 text-xs mt-0.5">{resumo.totalFaturasAnuladas} anuladas</p>
                  )}
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 text-center">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Consultas</p>
                  <p className="text-[var(--text-primary)] text-2xl font-black mt-1">{resumo.totalConsultas}</p>
                  <p className="text-emerald-600 text-xs">{resumo.consultasRealizadas} realizadas</p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 text-center">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Comissão Total</p>
                  <p className="text-[var(--text-primary)] text-2xl font-black mt-1">{fmtVal(resumo.totalComissaoTratamentos, sm)}</p>
                  <p className="text-[var(--text-tertiary)] text-xs">sobre tratamentos</p>
                </div>
                <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-4 text-center">
                  <p className="text-[var(--text-tertiary)] text-[10px] font-bold uppercase">Ticket Médio</p>
                  <p className="text-[var(--text-primary)] text-2xl font-black mt-1">
                    {fmtVal((resumo.totalFaturas ?? 0) > 0 ? resumo.totalFaturado / resumo.totalFaturas : 0, sm)}
                  </p>
                  <p className="text-[var(--text-tertiary)] text-xs">por fatura válida</p>
                </div>
              </div>

              {/* Info de contacto */}
              <div className="bg-[var(--bg-surface)] border border-[var(--border-light)] rounded-xl p-5">
                <h3 className="text-[var(--text-primary)] font-bold text-sm mb-3">Informações de Contacto</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{medico.telemovel || "Não definido"}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-[var(--text-muted)]" />
                    <span className="text-[var(--text-secondary)]">{medico.email || "Não definido"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ─── TAB FATURAS ─── */}
          {tabFicha === "faturas" && (
            <div className="space-y-4">
              {/* Resumo rápido de faturas */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <p className="text-emerald-600 text-[10px] font-bold uppercase">Pagas</p>
                  <p className="text-emerald-800 text-lg font-black">{resumo.totalFaturasPagas ?? 0}</p>
                  <p className="text-emerald-600 text-xs">
                    {fmtVal(faturasData.filter((f: any) => f.estado === "paga").reduce((acc: number, f: any) => acc + Number(f.valorTotal || 0), 0), sm)}
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-amber-600 text-[10px] font-bold uppercase">Pendentes</p>
                  <p className="text-amber-800 text-lg font-black">{resumo.totalFaturasPendentes ?? 0}</p>
                  <p className="text-amber-600 text-xs">
                    {fmtVal(faturasData.filter((f: any) => f.estado === "pendente").reduce((acc: number, f: any) => acc + Number(f.valorTotal || 0), 0), sm)}
                  </p>
                </div>
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
                  <p className="text-violet-600 text-[10px] font-bold uppercase">Total</p>
                  <p className="text-violet-800 text-lg font-black">{faturasData.length}</p>
                  <p className="text-violet-600 text-xs">{fmtVal(resumo.totalFaturado, sm)}</p>
                </div>
              </div>

              {/* Tabela de faturas */}
              {faturasData.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma fatura associada a este dentista</p>
                  <p className="text-xs mt-1">As faturas aparecem aqui quando são emitidas com este médico associado.</p>
                </div>
              ) : (
                <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-[var(--text-tertiary)] uppercase bg-[var(--bg-surface)] border-b border-[var(--border-light)]">
                        <th className="p-3">Nº Fatura</th>
                        <th className="p-3">Data</th>
                        <th className="p-3">Utente</th>
                        <th className="p-3 text-right">Base</th>
                        <th className="p-3 text-right">IVA</th>
                        <th className="p-3 text-right">Total</th>
                        <th className="p-3 text-center">Método</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {faturasData.map((f: any) => {
                        const metodoLabel = f.metodoPagamento === "numerario" ? "Numerário"
                          : f.metodoPagamento === "multibanco" ? "Multibanco"
                          : f.metodoPagamento === "mbway" ? "MB WAY"
                          : f.metodoPagamento === "transferencia" ? "Transferência"
                          : f.metodoPagamento || "—";
                        return (
                          <tr key={f.id} className="border-b border-[var(--border-lightest)] last:border-b-0 hover:bg-[var(--bg-surface)]/50">
                            <td className="p-3 text-sm text-[var(--text-primary)] font-mono font-medium">{f.numeroFatura || `#${f.id}`}</td>
                            <td className="p-3 text-sm text-[var(--text-secondary)]">{fmtData(f.dataEmissao)}</td>
                            <td className="p-3 text-sm text-[var(--text-secondary)]">{f.utenteNome || "—"}</td>
                            <td className="p-3 text-sm text-[var(--text-secondary)] text-right">{fmtVal(f.valorBase, sm)}</td>
                            <td className="p-3 text-sm text-[var(--text-muted)] text-right">{fmtVal(f.valorIva, sm)}</td>
                            <td className="p-3 text-sm font-bold text-right">
                              <span className={f.estado === "paga" ? "text-emerald-600" : f.estado === "anulada" ? "text-red-500 line-through" : "text-[var(--text-primary)]"}>
                                {fmtVal(f.valorTotal, sm)}
                              </span>
                            </td>
                            <td className="p-3 text-sm text-[var(--text-tertiary)] text-center">{metodoLabel}</td>
                            <td className="p-3 text-center">
                              {f.estado === "paga" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <Check className="w-3 h-3" /> Paga
                                </span>
                              ) : f.estado === "pendente" ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                  <Clock className="w-3 h-3" /> Pendente
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                  <X className="w-3 h-3" /> Anulada
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB COMISSÕES / PAGAMENTOS ─── */}
          {tabFicha === "comissoes" && (
            <div className="space-y-4">
              {/* Barra de ações */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-[var(--text-muted)]" />
                  <select
                    value={filtroEstado}
                    onChange={e => setFiltroEstado(e.target.value as any)}
                    className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-lg px-3 py-1.5 text-sm text-[var(--text-secondary)] focus:outline-none focus:border-[#00E5FF]/50"
                  >
                    <option value="todos">Todos os estados</option>
                    <option value="pendente">Pendentes</option>
                    <option value="paga">Pagas</option>
                  </select>
                  <span className="text-[var(--text-tertiary)] text-xs ml-2">
                    {comissoesFiltradas.length} registo{comissoesFiltradas.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistoricoPagamentos(!showHistoricoPagamentos)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--border-light)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-surface)] transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Histórico de Pagamentos
                    {showHistoricoPagamentos ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  {selectedComissaoIds.size > 0 && (
                    <button
                      onClick={() => setShowPagamentoModal(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-medium hover:bg-emerald-600 transition-colors"
                    >
                      <CreditCard className="w-4 h-4" />
                      Registar Pagamento ({selectedComissaoIds.size}) — {fmtVal(valorSelecionado, sm)}
                    </button>
                  )}
                </div>
              </div>

              {/* Resumo rápido */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-amber-600 text-[10px] font-bold uppercase">Pendente</p>
                  <p className="text-amber-800 text-lg font-black">{fmtVal(resumo.comissoesPendentes, sm)}</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-center">
                  <p className="text-emerald-600 text-[10px] font-bold uppercase">Pago</p>
                  <p className="text-emerald-800 text-lg font-black">{fmtVal(resumo.comissoesPagas, sm)}</p>
                </div>
                <div className="bg-violet-50 border border-violet-200 rounded-lg p-3 text-center">
                  <p className="text-violet-600 text-[10px] font-bold uppercase">Total</p>
                  <p className="text-violet-800 text-lg font-black">{fmtVal(resumo.comissoesPendentes + resumo.comissoesPagas, sm)}</p>
                </div>
              </div>

              {/* V35: Histórico de Pagamentos Agrupados */}
              {showHistoricoPagamentos && (
                <div className="border border-[#00E5FF]/30 bg-[#00E5FF]/10 rounded-xl p-4 space-y-3">
                  <h4 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-[#00E5FF]" />
                    Histórico de Pagamentos com Comprovativo
                  </h4>
                  {(!pagamentosQ.data?.pagamentos || pagamentosQ.data.pagamentos.length === 0) ? (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">Nenhum pagamento agrupado registado ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {(pagamentosQ.data?.pagamentos ?? []).map((p: any) => (
                        <div key={p.id} className="bg-[var(--bg-elevated)] border border-[var(--border-light)] rounded-xl p-4">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-[var(--text-primary)]">Pagamento #{p.id}</span>
                                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  <Check className="w-3 h-3 mr-0.5" /> Pago
                                </span>
                              </div>
                              <p className="text-xs text-[var(--text-tertiary)] mt-0.5">
                                {fmtData(p.dataPagamento)} • {p.metodoPagamento === "transferencia" ? "Transferência" : p.metodoPagamento === "numerario" ? "Numerário" : p.metodoPagamento === "cheque" ? "Cheque" : p.metodoPagamento === "mbway" ? "MB WAY" : "Outro"}
                                {p.referencia && <> • Ref: {p.referencia}</>}
                              </p>
                              {p.observacoes && <p className="text-xs text-[var(--text-muted)] mt-1 italic">{p.observacoes}</p>}
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-black text-emerald-600">{fmtVal(p.valorTotal, sm)}</p>
                              <p className="text-[10px] text-[var(--text-muted)]">{(p.comissoes ?? []).length} fatura{(p.comissoes ?? []).length !== 1 ? "s" : ""}</p>
                            </div>
                          </div>
                          {/* Faturas incluídas neste pagamento */}
                          <div className="border-t border-[var(--border-lightest)] pt-2 mt-2">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[var(--text-tertiary)] uppercase">
                                  <th className="text-left py-1">Fatura</th>
                                  <th className="text-left py-1">Utente</th>
                                  <th className="text-right py-1">Valor Fatura</th>
                                  <th className="text-right py-1">Comissão</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(p.comissoes ?? []).map((c: any) => (
                                  <tr key={c.id} className="border-t border-[var(--border-lightest)]">
                                    <td className="py-1 font-mono text-[var(--text-secondary)]">{c.numeroFatura || `#${c.faturaId}`}</td>
                                    <td className="py-1 text-[var(--text-secondary)]">{c.utenteNome}</td>
                                    <td className="py-1 text-right text-[var(--text-secondary)]">{fmtVal(c.valorFatura, sm)}</td>
                                    <td className="py-1 text-right font-bold text-emerald-600">{fmtVal(c.valorComissao, sm)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                          {/* Comprovativo */}
                          <div className="border-t border-[var(--border-lightest)] pt-3 mt-2">
                            {p.comprovativoUrl ? (
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center">
                                    {p.comprovativoNome?.match(/\.(jpg|jpeg|png|webp)$/i)
                                      ? <Image className="w-4 h-4 text-emerald-600" />
                                      : <FileText className="w-4 h-4 text-emerald-600" />}
                                  </div>
                                  <div>
                                    <p className="text-xs font-medium text-[var(--text-primary)]">
                                      {p.comprovativoNome || "Comprovativo"}
                                    </p>
                                    <p className="text-[10px] text-emerald-600 flex items-center gap-1">
                                      <CheckCircle className="w-3 h-3" /> Comprovativo anexado
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <a
                                    href={p.comprovativoUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#00E5FF]/10 text-[#00E5FF] text-xs font-medium hover:bg-[#00E5FF]/20 transition-colors"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    Ver
                                  </a>
                                  <a
                                    href={p.comprovativoUrl}
                                    download={p.comprovativoNome || "comprovativo"}
                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] text-[var(--text-secondary)] text-xs font-medium hover:bg-[var(--bg-overlay)] transition-colors"
                                  >
                                    <Download className="w-3 h-3" />
                                    Descarregar
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <label className="flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[var(--border-light)] hover:border-[#00E5FF]/50 hover:bg-[var(--bg-surface)] cursor-pointer transition-all group">
                                <div className="w-8 h-8 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-light)] flex items-center justify-center group-hover:border-[#00E5FF]/30">
                                  <Upload className="w-4 h-4 text-[var(--text-muted)] group-hover:text-[#00E5FF]" />
                                </div>
                                <div>
                                  <p className="text-xs font-medium text-[var(--text-secondary)] group-hover:text-[#00E5FF]">
                                    {uploadComprovativoMutation.isPending ? "A enviar comprovativo..." : "Anexar Comprovativo"}
                                  </p>
                                  <p className="text-[10px] text-[var(--text-muted)]">
                                    PDF, JPG, PNG ou WebP (máx. 10MB)
                                  </p>
                                </div>
                                {uploadComprovativoMutation.isPending && (
                                  <Loader2 className="w-4 h-4 animate-spin text-[#00E5FF] ml-auto" />
                                )}
                                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp" className="hidden" onChange={async (e) => {
                                  const file = e.target.files?.[0];
                                  if (!file) return;
                                  if (file.size > 10 * 1024 * 1024) {
                                    alert("O ficheiro excede o tamanho máximo de 10MB.");
                                    return;
                                  }
                                  const reader = new FileReader();
                                  reader.onload = () => {
                                    uploadComprovativoMutation.mutate({
                                      pagamentoId: p.id,
                                      fileBase64: reader.result as string,
                                      fileName: file.name,
                                    });
                                  };
                                  reader.readAsDataURL(file);
                                }} />
                              </label>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tabela de comissões com checkboxes */}
              {comissoesFiltradas.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Receipt className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma comissão registada</p>
                  <p className="text-xs mt-1">As comissões são registadas automaticamente quando o utente paga uma fatura.</p>
                </div>
              ) : (
                <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-[var(--text-tertiary)] uppercase bg-[var(--bg-surface)] border-b border-[var(--border-light)]">
                        <th className="p-3 w-10">
                          {(comissoes ?? []).some((c: any) => c.estado === "pendente") && (
                            <input
                              type="checkbox"
                              checked={(comissoes ?? []).filter((c: any) => c.estado === "pendente").every((c: any) => selectedComissaoIds.has(c.id)) && (comissoes ?? []).some((c: any) => c.estado === "pendente")}
                              onChange={toggleAllPendentes}
                              className="w-4 h-4 rounded border-[var(--border-light)] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                            />
                          )}
                        </th>
                        <th className="p-3">Data Pgto.</th>
                        <th className="p-3">Fatura</th>
                        <th className="p-3">Utente</th>
                        <th className="p-3 text-right">Valor Fatura</th>
                        <th className="p-3 text-center">%</th>
                        <th className="p-3 text-right">Comissão</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-center">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comissoesFiltradas.map((c: any) => (
                        <tr key={c.id} className={`border-b border-[var(--border-lightest)] last:border-b-0 transition-colors ${
                          selectedComissaoIds.has(c.id) ? "bg-[#00E5FF]/50" : "hover:bg-[var(--bg-surface)]/50"
                        }`}>
                          <td className="p-3">
                            {c.estado === "pendente" && (
                              <input
                                type="checkbox"
                                checked={selectedComissaoIds.has(c.id)}
                                onChange={() => toggleComissaoSel(c.id)}
                                className="w-4 h-4 rounded border-[var(--border-light)] text-[#00E5FF] focus:ring-[#00E5FF] cursor-pointer"
                              />
                            )}
                          </td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{fmtData(c.dataPagamentoUtente)}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)] font-mono">{c.numeroFatura || `#${c.faturaId}`}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{c.utenteNome}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)] text-right">{fmtVal(c.valorFatura, sm)}</td>
                          <td className="p-3 text-sm text-[var(--text-tertiary)] text-center">{Number(c.percentualComissao).toFixed(0)}%</td>
                          <td className="p-3 text-sm font-bold text-right">
                            <span className={c.estado === "paga" ? "text-emerald-600" : "text-amber-600"}>
                              {fmtVal(c.valorComissao, sm)}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            {c.estado === "paga" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                <Check className="w-3 h-3" /> Paga
                              </span>
                            ) : c.estado === "pendente" ? (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                                <Clock className="w-3 h-3" /> Pendente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">
                                <X className="w-3 h-3" /> Anulada
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            {c.estado === "pendente" && (
                              <button
                                onClick={() => marcarPagaMutation.mutate({ comissaoId: c.id })}
                                disabled={marcarPagaMutation.isPending}
                                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 hover:underline disabled:opacity-50"
                              >
                                Pagar
                              </button>
                            )}
                            {c.estado === "paga" && c.dataPagamentoMedico && (
                              <span className="text-[10px] text-[var(--text-muted)]">{fmtData(c.dataPagamentoMedico)}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* V35: Modal de Registar Pagamento Agrupado com Comprovativo */}
              {showPagamentoModal && (
                <ModalRegistarPagamento
                  medicoId={medicoId}
                  comissaoIds={Array.from(selectedComissaoIds)}
                  valorTotal={valorSelecionado}
                  sm={sm}
                  onClose={() => setShowPagamentoModal(false)}
                  onSubmit={async (dados) => {
                    // Extrair ficheiro do comprovativo antes de enviar ao tRPC
                    const compFile = dados._comprovativoFile as File | undefined;
                    const compFileName = dados._comprovativoFileName as string | undefined;
                    // Remover campos internos que não fazem parte do schema tRPC
                    delete dados._comprovativoFile;
                    delete dados._comprovativoFileName;

                    // Registar o pagamento
                    registarPagamentoMutation.mutate(dados, {
                      onSuccess: async (result) => {
                        // Se há comprovativo, fazer upload após o pagamento ser criado
                        if (compFile && result?.pagamentoId) {
                          try {
                            const reader = new FileReader();
                            reader.onload = () => {
                              uploadComprovativoMutation.mutate({
                                pagamentoId: result.pagamentoId,
                                fileBase64: reader.result as string,
                                fileName: compFileName || compFile.name,
                              });
                            };
                            reader.readAsDataURL(compFile);
                          } catch (err) {
                            console.error("Erro ao enviar comprovativo:", err);
                          }
                        }
                      },
                    });
                  }}
                  isPending={registarPagamentoMutation.isPending}
                />
              )}
            </div>
          )}

          {/* ─── TAB TRATAMENTOS ─── */}
          {tabFicha === "tratamentos" && (
            <div>
              {tratamentosUnicos.length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhum tratamento registado</p>
                </div>
              ) : (
                <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-[var(--text-tertiary)] uppercase bg-[var(--bg-surface)] border-b border-[var(--border-light)]">
                        <th className="p-3">Data</th>
                        <th className="p-3">Descrição</th>
                        <th className="p-3">Utente</th>
                        <th className="p-3 text-right">Valor</th>
                        <th className="p-3 text-right">Comissão</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tratamentosUnicos.map((t: any) => (
                        <tr key={t.id} className="border-b border-[var(--border-lightest)] last:border-b-0 hover:bg-[var(--bg-surface)]/50">
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{fmtData(t.dataInicio)}</td>
                          <td className="p-3 text-sm text-[var(--text-primary)] font-medium max-w-[200px] truncate">{t.descricao}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{t.utenteNome}</td>
                          <td className="p-3 text-sm text-[var(--text-secondary)] text-right">{fmtVal(t.valorBruto, sm)}</td>
                          <td className="p-3 text-sm text-violet-600 font-bold text-right">{fmtVal(t.valorComissao, sm)}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              t.estado === "concluido" ? "bg-emerald-100 text-emerald-700" :
                              t.estado === "em_progresso" ? "bg-blue-100 text-blue-700" :
                              t.estado === "pendente" ? "bg-amber-100 text-amber-700" :
                              t.estado === "cancelado" || t.estado === "anulado" ? "bg-red-100 text-red-700" :
                              "bg-[var(--bg-overlay)] text-[var(--text-secondary)]"
                            }`}>
                              {t.estado === "concluido" ? "Concluído" :
                               t.estado === "em_progresso" ? "Em Progresso" :
                               t.estado === "pendente" ? "Pendente" :
                               t.estado === "cancelado" ? "Cancelado" :
                               t.estado === "anulado" ? "Anulado" :
                               t.estado === "proposto" ? "Proposto" : t.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ─── TAB CONSULTAS ─── */}
          {tabFicha === "consultas" && (
            <div>
              {(consultasData ?? []).length === 0 ? (
                <div className="text-center py-12 text-[var(--text-muted)]">
                  <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">Nenhuma consulta registada</p>
                </div>
              ) : (
                <div className="border border-[var(--border-light)] rounded-xl overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="text-xs text-[var(--text-tertiary)] uppercase bg-[var(--bg-surface)] border-b border-[var(--border-light)]">
                        <th className="p-3">Data / Hora</th>
                        <th className="p-3">Utente</th>
                        <th className="p-3">Tipo</th>
                        <th className="p-3 text-center">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(consultasData ?? []).map((c: any) => (
                        <tr key={c.id} className="border-b border-[var(--border-lightest)] last:border-b-0 hover:bg-[var(--bg-surface)]/50">
                          <td className="p-3 text-sm text-[var(--text-secondary)]">
                            {fmtData(c.dataHoraInicio)}
                            {c.dataHoraInicio && (
                              <span className="text-[var(--text-muted)] ml-1">
                                {new Date(c.dataHoraInicio).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </td>
                          <td className="p-3 text-sm text-[var(--text-secondary)]">{c.utenteNome}</td>
                          <td className="p-3 text-sm text-[var(--text-tertiary)]">{c.tipoConsulta || "Geral"}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              c.estado === "realizada" ? "bg-emerald-100 text-emerald-700" :
                              c.estado === "agendada" ? "bg-blue-100 text-blue-700" :
                              c.estado === "cancelada" ? "bg-red-100 text-red-700" :
                              "bg-[var(--bg-overlay)] text-[var(--text-secondary)]"
                            }`}>
                              {c.estado === "realizada" ? "Realizada" :
                               c.estado === "agendada" ? "Agendada" :
                               c.estado === "cancelada" ? "Cancelada" :
                               c.estado === "confirmada" ? "Confirmada" : c.estado}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Modal Novo Funcionário ───────────────────────────────────────────────────
function ModalFuncionario({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    username: "",
    role: "recepcao",
    password: "",
    cargoDisplay: "",
    nif: "",
    telemovel: "",
  });
  const [erro, setErro] = useState("");

  const criarMutation = trpc.funcionarios.criar.useMutation({
    onSuccess: () => { onSuccess(); onClose(); },
    onError: (e: any) => setErro(parseApiError(e)),
  });

  const CARGOS = [
    "Recepcionista",
    "Assistente Dentária",
    "Higienista Oral",
    "Auxiliar de Limpeza",
    "Gestor Administrativo",
    "Técnico de Radiologia",
    "Enfermeiro",
  ];

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nome.trim()) { setErro("O nome é obrigatório"); return; }
    if (!form.role) { setErro("O cargo é obrigatório"); return; }
    setErro("");
    const roleToSend = form.cargoDisplay === "Gestor Administrativo" ? "admin" : "recepcao";
    criarMutation.mutate({
      nome: form.nome,
      email: form.email || undefined,
      username: form.username || undefined,
      role: roleToSend,
      password: form.password || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[var(--bg-elevated)] border border-[var(--border-primary)] rounded-2xl w-full max-w-lg shadow-2xl my-auto flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)] shrink-0">
          <div className="flex items-center gap-2">
            <UserCog className="w-4 h-4 text-emerald-600" />
            <h2 className="text-[var(--text-primary)] font-semibold">Novo Funcionário</h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4 bg-[var(--bg-elevated)] overflow-y-auto flex-1">
          {erro && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-400 text-xs">{erro}</p>
            </div>
          )}

          <div>
            <label className="section-label block mb-1.5 text-[var(--text-primary)] font-semibold text-sm">Nome Completo *</label>
            <input type="text" placeholder="Ana Ferreira"
              value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5">Cargo *</label>
            <select value={form.cargoDisplay} onChange={e => setForm(f => ({ ...f, cargoDisplay: e.target.value, role: (e.target.value === "Gestor Administrativo" ? "admin" : "recepcao") }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50">
              <option value="">— Seleccionar cargo —</option>
              {CARGOS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="section-label block mb-1.5">NIF</label>
              <input type="text" placeholder="123456789"
                value={form.nif} onChange={e => setForm(f => ({ ...f, nif: e.target.value }))}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
            </div>
            <div>
              <label className="section-label block mb-1.5">Telemóvel</label>
              <input type="tel" placeholder="912 345 678"
                value={form.telemovel} onChange={e => setForm(f => ({ ...f, telemovel: e.target.value }))}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
            </div>
          </div>

          <div>
            <label className="section-label block mb-1.5">Email</label>
            <input type="email" placeholder="funcionario@clinica.pt"
              value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5">Username</label>
            <input type="text" placeholder="username.funcionario"
              value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div>
            <label className="section-label block mb-1.5">Password</label>
            <input type="password" placeholder="********"
              value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-medium hover:bg-[var(--bg-surface)] transition-colors">
              Cancelar
            </button>
            <button type="submit" disabled={criarMutation.isPending}
              className="flex-1 btn-primary py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              {criarMutation.isPending
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <Check className="w-4 h-4" />}
              Criar Funcionário
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página Principal ─────────────────────────────────────────────────────────
export function EquipaPage() {
  const [tab, setTab] = useState<"dentistas" | "funcionarios">("dentistas");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModalDentista, setShowModalDentista] = useState(false);
  const [showModalFuncionario, setShowModalFuncionario] = useState(false);
  const [dentistaEditando, setDentistaEditando] = useState<any>(null);
  const [fichaDentistaId, setFichaDentistaId] = useState<number | null>(null);

  const utils = trpc.useUtils();
  const dentistasQuery = trpc.dentistas.listar.useQuery();
  const funcionariosQuery = trpc.funcionarios.listar.useQuery();
  const dentistas = (dentistasQuery.data as any)?.dentistas ?? [];
  const funcionarios = (funcionariosQuery.data as any)?.funcionarios ?? [];

  const desativarMutation = trpc.dentistas.desactivar.useMutation({
    onSuccess: () => utils.dentistas.listar.invalidate(),
  });

  const ativarMutation = trpc.dentistas.actualizar.useMutation({
    onSuccess: () => utils.dentistas.listar.invalidate(),
  });

  const filteredDentistas = dentistas.filter((d: any) =>
    d.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.cedulaProfissional?.includes(searchTerm) ||
    d.especialidade?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredFuncionarios = funcionarios.filter((f: any) =>
    f.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.cargo?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const refresh = () => {
    utils.dentistas.listar.invalidate();
    utils.funcionarios.listar.invalidate();
  };

  const totalAtivos = dentistas.filter((d: any) => d.ativo !== false).length;

  return (
    <div className="space-y-5">
      {(showModalDentista || dentistaEditando) && (
        <ModalDentista
          dentista={dentistaEditando}
          onClose={() => { setShowModalDentista(false); setDentistaEditando(null); }}
          onSuccess={refresh}
        />
      )}
      {showModalFuncionario && (
        <ModalFuncionario onClose={() => setShowModalFuncionario(false)} onSuccess={refresh} />
      )}
      {fichaDentistaId && (
        <ModalFichaDentista
          medicoId={fichaDentistaId}
          onClose={() => setFichaDentistaId(null)}
        />
      )}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">Equipa</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            {dentistas.length} dentista{dentistas.length !== 1 ? "s" : ""} · {funcionarios.length} funcionário{funcionarios.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={() => tab === "dentistas" ? setShowModalDentista(true) : setShowModalFuncionario(true)}
          className="btn-primary px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {tab === "dentistas" ? "Novo Dentista" : "Novo Funcionário"}
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-premium p-4 border border-violet-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Stethoscope className="w-3.5 h-3.5 text-violet-400" />
            <p className="section-label">Dentistas</p>
          </div>
          <p className="text-xl font-bold text-violet-400">{dentistas.length}</p>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">{totalAtivos} activos</p>
        </div>
        <div className="card-premium p-4 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <UserCog className="w-3.5 h-3.5 text-emerald-400" />
            <p className="section-label">Funcionários</p>
          </div>
          <p className="text-xl font-bold text-emerald-400">{funcionarios.length}</p>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">equipa de apoio</p>
        </div>
        <div className="card-premium p-4 border border-[#00E5FF]/20">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-3.5 h-3.5 text-[#00E5FF]" />
            <p className="section-label">Total Equipa</p>
          </div>
          <p className="text-xl font-bold text-[#00E5FF]">{dentistas.length + funcionarios.length}</p>
          <p className="text-[var(--text-muted)] text-xs mt-0.5">colaboradores</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl p-1 w-fit">
        <button onClick={() => setTab("dentistas")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === "dentistas" ? "bg-[#00E5FF] text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
          <Stethoscope className="w-3.5 h-3.5" />Dentistas
        </button>
        <button onClick={() => setTab("funcionarios")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${tab === "funcionarios" ? "bg-[#00E5FF] text-white shadow-[0_0_10px_rgba(99,102,241,0.3)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"}`}>
          <UserCog className="w-3.5 h-3.5" />Funcionários
        </button>
      </div>

      {/* Pesquisa */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
        <input type="text" placeholder="Pesquisar dentistas ou funcionários..."
          value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
          className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-10 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
      </div>

      {/* Tabela de Dentistas */}
      {tab === "dentistas" && (
        <div className="card-premium p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] uppercase border-b border-[var(--border-lighter)]">
                <th className="p-4">Nome</th>
                <th className="p-4">Cédula Profissional</th>
                <th className="p-4">Especialidade</th>
                <th className="p-4">Telemóvel</th>
                <th className="p-4">Email</th>
                <th className="p-4">Comissão</th>
                <th className="p-4">Estado</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredDentistas.map((dentista: any) => (
                <tr key={dentista.id} className="border-b border-white/[0.03] last:border-b-0 hover:bg-[var(--bg-surface)]">
                  <td className="p-4 text-sm font-medium text-[var(--text-primary)]">{dentista.nome}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{dentista.cedulaProfissional}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{dentista.especialidade || "N/A"}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{dentista.telemovel || "N/A"}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{dentista.email || "N/A"}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">
                    {dentista.percentualComissao}%
                    {dentista.tipoRemuneracao === "percentual_diaria" && (
                      <span className="ml-1 text-xs text-violet-400">+ {Number(dentista.valorDiaria || 0).toFixed(0)}€/dia</span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    {dentista.ativo !== false ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-xs font-medium text-emerald-500">
                        <Check className="w-3 h-3" /> Ativo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2 py-1 text-xs font-medium text-red-500">
                        <X className="w-3 h-3" /> Inativo
                      </span>
                    )}
                  </td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-1.5">
                      {/* Ver Ficha */}
                      <button
                        onClick={(e) => { e.stopPropagation(); setDentistaEditando(null); setShowModalDentista(false); setFichaDentistaId(dentista.id); }}
                        title="Ver Ficha e Comissões"
                        className="w-8 h-8 rounded-lg bg-violet-100 hover:bg-violet-200 flex items-center justify-center text-violet-600 transition-colors">
                        <Eye className="w-4 h-4" />
                      </button>
                      {/* Editar */}
                      <button onClick={() => setDentistaEditando(dentista)}
                        title="Editar"
                        className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {/* Ativar/Desativar */}
                      {dentista.ativo !== false ? (
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja desativar ${dentista.nome}?`)) {
                              desativarMutation.mutate({ id: dentista.id });
                            }
                          }}
                          title="Desativar"
                          className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors">
                          <UserX className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja ativar ${dentista.nome}?`)) {
                              ativarMutation.mutate({ id: dentista.id, ativo: true });
                            }
                          }}
                          title="Ativar"
                          className="w-8 h-8 rounded-lg bg-emerald-100 hover:bg-emerald-200 flex items-center justify-center text-emerald-600 transition-colors">
                          <UserCheck className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Tabela de Funcionários */}
      {tab === "funcionarios" && (
        <div className="card-premium p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs text-[var(--text-secondary)] uppercase border-b border-[var(--border-lighter)]">
                <th className="p-4">Nome</th>
                <th className="p-4">Cargo</th>
                <th className="p-4">Email</th>
                <th className="p-4">Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredFuncionarios.map((funcionario: any) => (
                <tr key={funcionario.id} className="border-b border-white/[0.03] last:border-b-0">
                  <td className="p-4 text-sm font-medium text-[var(--text-primary)]">{funcionario.nome}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{funcionario.role}</td>
                  <td className="p-4 text-sm text-[var(--text-secondary)]">{funcionario.email || "N/A"}</td>
                  <td className="p-4 text-sm">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja remover ${funcionario.nome}?`)) {
                            // Lógica para remover funcionário
                          }
                        }}
                        className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-200 flex items-center justify-center text-red-600 transition-colors">
                        <UserX className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
