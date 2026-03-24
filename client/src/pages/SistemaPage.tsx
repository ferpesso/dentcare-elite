/**
 * SistemaPage.tsx — Configurações do Sistema (REDESENHADO)
 * DentCare Elite V35 — Painel de Administração Completo
 *
 * UPGRADE COMPLETO:
 * - 7 Tabs: Clínica, Agenda, Notificações, Segurança, Integrações, Faturação, Dados
 * - Opções pré-selecionadas com defaults inteligentes para Portugal
 * - Propagação automática via ConfigContext (refetch global)
 * - Validação visual em tempo real
 * - Guardar por secção com feedback visual
 * - Todas as configurações persistidas na BD
 * - Interface interativa e dinâmica
 */
import React, { useState, useEffect, useCallback, useRef } from "react";
import i18n from "../i18n";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import { useConfig, CONFIG_DEFAULTS, MOEDA_SIMBOLOS } from "../contexts/ConfigContext";
import {
  Settings, Clock, Calendar, Save, Check, Bell, Globe,
  Shield, Database, Moon, Sun, Key, Lock,
  Download, Upload, AlertTriangle, Info, Image,
  CreditCard, MessageCircle, Mail, Phone, Server,
  Eye, EyeOff, Zap, CheckCircle2,
  Trash2, HardDrive, Building2, MapPin, FileText,
  Target, Palette,
  Hash, Timer, ShieldCheck,
  Smartphone, Package,
  CalendarClock, Percent,
  ChevronRight, Activity, Receipt, Banknote,
  Users, BellRing, Scan, FolderOpen, XCircle, ImageIcon,
} from "lucide-react";

// ─── Constantes ───────────────────────────────────────────────────────────────
const DIAS_SEMANA = [
  { id: 1, label: "Seg", full: "Segunda-feira" },
  { id: 2, label: "Ter", full: "Terça-feira" },
  { id: 3, label: "Qua", full: "Quarta-feira" },
  { id: 4, label: "Qui", full: "Quinta-feira" },
  { id: 5, label: "Sex", full: "Sexta-feira" },
  { id: 6, label: "Sáb", full: "Sábado" },
  { id: 0, label: "Dom", full: "Domingo" },
];

const FUSOS_HORARIOS = [
  { value: "Europe/Lisbon", label: "Lisboa (WET/WEST)" },
  { value: "Europe/London", label: "Londres (GMT/BST)" },
  { value: "Europe/Madrid", label: "Madrid (CET/CEST)" },
  { value: "Europe/Paris", label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin", label: "Berlim (CET/CEST)" },
  { value: "America/Sao_Paulo", label: "S. Paulo (BRT)" },
  { value: "America/New_York", label: "Nova Iorque (EST)" },
  { value: "Africa/Luanda", label: "Luanda (WAT)" },
];

const IDIOMAS = [
  { value: "pt-PT", label: "Português (Portugal)" },
  { value: "pt-BR", label: "Português (Brasil)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "en-US", label: "English (US)" },
  { value: "es-ES", label: "Español" },
  { value: "fr-FR", label: "Français" },
];

const MOEDAS = [
  { value: "EUR", label: "Euro (EUR)", simbolo: "€" },
  { value: "BRL", label: "Real (BRL)", simbolo: "R$" },
  { value: "GBP", label: "Libra (GBP)", simbolo: "£" },
  { value: "USD", label: "Dólar (USD)", simbolo: "$" },
  { value: "CHF", label: "Franco (CHF)", simbolo: "CHF" },
  { value: "AOA", label: "Kwanza (AOA)", simbolo: "Kz" },
];

const PAISES = [
  "Portugal", "Brasil", "Angola", "Moçambique", "Espanha",
  "França", "Reino Unido", "Suíça", "Luxemburgo", "Alemanha", "Cabo Verde", "Guiné-Bissau", "São Tomé e Príncipe", "Timor-Leste",
];

const FORMATOS_DATA = [
  { value: "dd/MM/yyyy", label: "31/12/2025 (dd/MM/aaaa)" },
  { value: "MM/dd/yyyy", label: "12/31/2025 (MM/dd/aaaa)" },
  { value: "yyyy-MM-dd", label: "2025-12-31 (ISO)" },
];

const FORMATOS_HORA = [
  { value: "HH:mm", label: "14:30 (24h)" },
  { value: "hh:mm a", label: "02:30 PM (12h)" },
];

const TAXAS_IVA = [
  { value: "0", label: "0% - Isento (art. 9.º CIVA — serviços médicos)" },
  { value: "6", label: "6% - Reduzida (Portugal)" },
  { value: "13", label: "13% - Intermédia (Portugal)" },
  { value: "23", label: "23% - Normal (Portugal)" },
  { value: "21", label: "21% - Normal (Espanha)" },
  { value: "20", label: "20% - Normal (França/UK)" },
  { value: "19", label: "19% - Normal (Alemanha)" },
];

// ─── Componente: Toggle Switch ───────────────────────────────────────────────
function Toggle({ activo, onChange }: { activo: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={`w-11 h-6 rounded-full transition-all relative shrink-0 cursor-pointer ${
        activo ? "bg-[#00E5FF]" : "bg-white/[0.08]"
      }`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
        activo ? "left-[22px]" : "left-0.5"
      }`} />
    </button>
  );
}

// ─── Componente: Input ───────────────────────────────────────────────────────
function InputField({ label, value, onChange, placeholder, type = "text", icon: Icon, helpText, required, mono }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; icon?: any; helpText?: string; required?: boolean; mono?: boolean;
}) {
  return (
    <div>
      <label className="section-label block mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />}
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className={`w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl ${Icon ? "pl-9" : "px-3"} pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 transition-colors ${mono ? "font-mono" : ""}`}
        />
      </div>
      {helpText && <p className="text-[var(--text-muted)] text-[10px] mt-1">{helpText}</p>}
    </div>
  );
}

// ─── Componente: Select ──────────────────────────────────────────────────────
function SelectField({ label, value, onChange, options, helpText, icon: Icon }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; helpText?: string; icon?: any;
}) {
  return (
    <div>
      <label className="section-label block mb-1.5">{label}</label>
      <div className="relative">
        {Icon && <Icon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] z-10" />}
        <select value={value} onChange={e => onChange(e.target.value)}
          className={`w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl ${Icon ? "pl-9" : "px-3"} pr-8 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50 transition-colors appearance-none cursor-pointer`}
        >
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)] rotate-90 pointer-events-none" />
      </div>
      {helpText && <p className="text-[var(--text-muted)] text-[10px] mt-1">{helpText}</p>}
    </div>
  );
}

// ─── Componente: Secção Card ─────────────────────────────────────────────────
function SectionCard({ icon: Icon, title, subtitle, children, color = "[#00E5FF]", badge }: {
  icon: any; title: string; subtitle?: string; children: React.ReactNode; color?: string; badge?: string;
}) {
  const cm: Record<string, string> = {
    "#00E5FF": "text-[#00E5FF]", neonCyan: "text-[#00E5FF]", violet: "text-violet-400", emerald: "text-emerald-400",
    amber: "text-amber-400", red: "text-red-400", blue: "text-blue-400",
    orange: "text-orange-400", pink: "text-pink-400", cyan: "text-cyan-400",
  };
  return (
    <div className="card-premium p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Icon className={`w-4 h-4 ${cm[color] || cm.neonCyan}`} />
        <div className="flex-1">
          <h2 className="text-[var(--text-primary)] font-semibold text-sm">{title}</h2>
          {subtitle && <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30">{badge}</span>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Componente: Toggle Row ──────────────────────────────────────────────────
function ToggleRow({ icon: Icon, label, desc, activo, onChange, children }: {
  icon?: any; label: string; desc: string; activo: boolean; onChange: () => void; children?: React.ReactNode;
}) {
  return (
    <div className={`rounded-xl border transition-all ${activo ? "bg-[var(--bg-overlay)] border-[#00E5FF]/20" : "bg-[var(--bg-surface)] border-[var(--border-lightest)]"}`}>
      <div className="flex items-center gap-3 p-3">
        {Icon && (
          <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${activo ? "bg-[#00E5FF]/10 border-[#00E5FF]/20" : "bg-[var(--bg-overlay)] border-[var(--border-light)]"}`}>
            <Icon className={`w-3.5 h-3.5 ${activo ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[var(--text-primary)] text-sm font-medium">{label}</p>
          <p className="text-[var(--text-muted)] text-xs">{desc}</p>
        </div>
        <Toggle activo={activo} onChange={onChange} />
      </div>
      {activo && children && (
        <div className="px-3 pb-3 pt-1 border-t border-[var(--border-lightest)] space-y-3">{children}</div>
      )}
    </div>
  );
}

// ─── Componente: Estado de Servico ───────────────────────────────────────────
function EstadoServico({ label, activo, descricao }: { label: string; activo: boolean; descricao: string }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
      <div className={`w-2.5 h-2.5 rounded-full ${activo ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`} />
      <div className="flex-1">
        <p className="text-[var(--text-primary)] text-xs font-medium">{label}</p>
        <p className="text-[var(--text-muted)] text-[10px]">{descricao}</p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${activo ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
        {activo ? "Online" : "Offline"}
      </span>
    </div>
  );
}

// ─── Componente: Botao Guardar ───────────────────────────────────────────────
function SaveButton({ onClick, loading, saved, label = "Guardar Alterações" }: {
  onClick: () => void; loading: boolean; saved: boolean; label?: string;
}) {
  if (saved) {
    return (
      <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <p className="text-emerald-300 text-sm font-medium">Configurações guardadas com sucesso!</p>
      </div>
    );
  }
  return (
    <button onClick={onClick} disabled={loading}
      className="btn-primary w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]">
      {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════
export function SistemaPage() {
  const [, navigate] = useLocation();
  const { refetch: refetchGlobal } = useConfig();
  const configQuery = trpc.configuracoes.obter.useQuery();
  const atualizarLoteMutation = trpc.configuracoes.actualizarLote.useMutation();

  // Estado local
  const [tab, setTab] = useState<string>("clinica");
  const [lc, setLc] = useState<Record<string, string>>({ ...CONFIG_DEFAULTS });
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const [mostrarTokens, setMostrarTokens] = useState<Record<string, boolean>>({});
  const [backupEmCurso, setBackupEmCurso] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importTipo, setImportTipo] = useState<"saft" | "csv" | "excel" | "json" | null>(null);
  const [importFicheiro, setImportFicheiro] = useState<File | null>(null);
  const [importEstado, setImportEstado] = useState<"selecao" | "upload" | "preview" | "resultado">("selecao");
  const [importResultado, setImportResultado] = useState<any>(null);
  const [importErro, setImportErro] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const importarSaftMutation = trpc.migracao.importarSaft.useMutation();
  const importarCsvMutation = trpc.migracao.importarCsv.useMutation();
  const executarMigracaoMutation = trpc.migracao.executarMigracao.useMutation();
  const deduplicarMutation = trpc.migracao.deduplicar.useMutation();
  const initialLoadDone = useRef(false);

  // ── Estado do modal Imaginasoft ──────────────────────────────────────────
  const [showImaginasoftModal, setShowImaginasoftModal] = useState(false);
  const [imaginasoftFicheiro, setImaginasoftFicheiro] = useState<File | null>(null);
  const [imaginasoftEstado, setImaginasoftEstado] = useState<"selecao" | "analisando" | "preview" | "importando" | "resultado">("selecao");
  const [imaginasoftAnalise, setImaginasoftAnalise] = useState<any>(null);
  const [imaginasoftResultado, setImaginasoftResultado] = useState<any>(null);
  const [imaginasoftErro, setImaginasoftErro] = useState("");
  const [imaginasoftImportarRx, setImaginasoftImportarRx] = useState(true);
  const [imaginasoftSessaoId, setImaginasoftSessaoId] = useState("");
  const [imaginasoftProgresso, setImaginasoftProgresso] = useState<{ percentagem: number; mensagem: string } | null>(null);
  const imaginasoftProgressoRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Estado 2FA real ──────────────────────────────────────────────────────
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [totpCode2FA, setTotpCode2FA] = useState("");
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);
  const [twoFAMode, setTwoFAMode] = useState<"enable" | "disable">("enable");
  const enable2FAMutation = trpc.auth.enable2FA.useMutation();
  const verify2FAMutation = trpc.auth.verify2FA.useMutation();
  const disable2FAMutation = trpc.auth.disable2FA.useMutation();
  const meQuery = trpc.auth.me.useQuery();
  const is2FAActive = meQuery.data?.twoFactorEnabled === true;

  const handleToggle2FA = async () => {
    setTwoFAError("");
    setTotpCode2FA("");
    if (is2FAActive) {
      // Desativar: pedir código TOTP para confirmar
      setTwoFAMode("disable");
      setShow2FAModal(true);
    } else {
      // Ativar: gerar QR code
      setTwoFAMode("enable");
      setTwoFALoading(true);
      try {
        const result = await enable2FAMutation.mutateAsync();
        setQrCodeUrl(result.qrCodeUrl);
        setShow2FAModal(true);
      } catch (err: any) {
        setTwoFAError(parseApiError(err, "Erro ao gerar QR Code"));
      } finally {
        setTwoFALoading(false);
      }
    }
  };

  const handleConfirm2FA = async () => {
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      if (twoFAMode === "enable") {
        await verify2FAMutation.mutateAsync({ token: totpCode2FA.replace(/\s/g, "") });
      } else {
        await disable2FAMutation.mutateAsync({ token: totpCode2FA.replace(/\s/g, "") });
      }
      setShow2FAModal(false);
      setTotpCode2FA("");
      meQuery.refetch();
    } catch (err: any) {
      setTwoFAError(parseApiError(err, "Código inválido"));
      setTotpCode2FA("");
    } finally {
      setTwoFALoading(false);
    }
  };

  // Sincronizar com BD
  useEffect(() => {
    if (configQuery.data?.configuracoes && !initialLoadDone.current) {
      const dbConfig = configQuery.data.configuracoes as Record<string, string>;
      const merged: Record<string, string> = { ...CONFIG_DEFAULTS };
      for (const [key, val] of Object.entries(dbConfig)) {
        if (val !== undefined && val !== null && val !== "") {
          merged[key] = String(val);
        }
      }
      setLc(merged);
      initialLoadDone.current = true;
    }
  }, [configQuery.data]);

  // Helper: actualizar config local
  const setC = useCallback((chave: string, valor: string) => {
    setLc(prev => ({ ...prev, [chave]: valor }));
  }, []);

  // Helper: obter bool
  const getBool = useCallback((chave: string): boolean => {
    return lc[chave] === "true" || lc[chave] === "1";
  }, [lc]);

  // Helper: toggle bool
  const toggleBool = useCallback((chave: string) => {
    setLc(prev => ({ ...prev, [chave]: prev[chave] === "true" ? "false" : "true" }));
  }, []);

  // Helper: dias de funcionamento
  const diasFunc = (() => {
    try { return JSON.parse(lc.dias_funcionamento || "[]") as number[]; }
    catch { return [1, 2, 3, 4, 5]; }
  })();

  const toggleDia = (dia: number) => {
    const novos = diasFunc.includes(dia) ? diasFunc.filter(d => d !== dia) : [...diasFunc, dia];
    setC("dias_funcionamento", JSON.stringify(novos));
  };

  // Guardar secção
  const guardarSeccao = async (chaves: string[]) => {
    try {
      const configuracoes = chaves.map(chave => ({ chave, valor: lc[chave] || CONFIG_DEFAULTS[chave] || "" }));
      await atualizarLoteMutation.mutateAsync({ configuracoes });
      
      // Refetch global para propagar
      configQuery.refetch();
      refetchGlobal();

      // Aplicar idioma imediatamente via i18n se foi alterado
      if (chaves.includes("idioma") && lc.idioma) {
        i18n.changeLanguage(lc.idioma);
        localStorage.setItem("dentcare-language", lc.idioma);
      }
      
      setSavedSections(prev => ({ ...prev, [tab]: true }));
      setTimeout(() => setSavedSections(prev => ({ ...prev, [tab]: false })), 3000);
    } catch (error) {
      alert(parseApiError(error, "Erro ao guardar configurações"));
    }
  };

  // Chaves por secção
  const CHAVES_CLINICA = [
    "nome_clinica", "email_clinica", "telefone_clinica", "morada_clinica",
    "cidade_clinica", "codigo_postal_clinica", "pais_clinica", "nif_clinica", "website_clinica", "logo_clinica",
  ];
  const CHAVES_AGENDA = [
    "horario_abertura", "horario_encerramento", "dias_funcionamento", "duracao_slot",
    "intervalo_consultas", "slots_por_dia", "antecedencia_minima_marcacao", "antecedencia_maxima_marcacao",
    "meta_receita_diaria", "meta_receita_mensal", "meta_consultas_dia",
  ];
  const CHAVES_APARENCIA = [
    "idioma", "moeda", "simbolo_moeda", "fuso_horario", "formato_data", "formato_hora",
  ];
  const CHAVES_NOTIFICACOES = [
    "notif_email", "notif_sms", "notif_whatsapp", "notif_lembretes", "notif_lembretes_horas",
    "notif_aniversarios", "notif_pagamentos_atraso", "notif_pagamentos_atraso_dias",
    "notif_stocks_baixo", "notif_stocks_minimo", "notif_consultas_canceladas", "notif_novos_utentes",
  ];
  const CHAVES_SEGURANCA = [
    "seguranca_2fa", "seguranca_sessao_timeout", "seguranca_log_auditoria",
    "seguranca_ip_whitelist", "seguranca_ips_permitidos",
    "seguranca_tentativas_login", "seguranca_bloqueio_minutos",
  ];
  const CHAVES_INTEGRACOES = [
    "whatsapp_account_sid", "whatsapp_auth_token", "whatsapp_number", "whatsapp_ativo",
    "mbway_ativo", "mbway_api_key", "at_ativo", "at_nif", "at_senha_comunicacao",
  ];
  const CHAVES_FATURACAO = [
    "faturacao_serie", "faturacao_proximo_numero", "faturacao_taxa_iva",
    "faturacao_observacoes_padrao", "faturacao_vencimento_dias",
  ];
  const CHAVES_INTEGRACOES_RX = [
    "sistema_rx_nome", "sistema_rx_caminho", "sistema_rx_ativo",
  ];

  // Handler: analisar backup Imaginasoft via Express (multipart)
  const handleAnalisarImaginasoft = async () => {
    if (!imaginasoftFicheiro) return;
    setImaginasoftEstado("analisando");
    setImaginasoftErro("");
    try {
      const formData = new FormData();
      formData.append("backup", imaginasoftFicheiro);
      const resp = await fetch("/api/upload-imaginasoft/analisar", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao analisar backup");
      setImaginasoftAnalise(data);
      setImaginasoftSessaoId(data.sessaoId || "");
      setImaginasoftEstado("preview");
    } catch (err: any) {
      setImaginasoftErro(err.message || "Erro ao analisar backup");
      setImaginasoftEstado("selecao");
    }
  };

  // Handler: executar importação Imaginasoft (com polling de progresso)
  const handleImportarImaginasoft = async () => {
    if (!imaginasoftSessaoId) return;
    setImaginasoftEstado("importando");
    setImaginasoftErro("");
    setImaginasoftProgresso({ percentagem: 0, mensagem: "A iniciar importação..." });

    // Iniciar polling de progresso
    if (imaginasoftProgressoRef.current) clearInterval(imaginasoftProgressoRef.current);
    imaginasoftProgressoRef.current = setInterval(async () => {
      try {
        const r = await fetch(`/api/upload-imaginasoft/progresso/${imaginasoftSessaoId}`, { credentials: "include" });
        if (r.ok) {
          const p = await r.json();
          setImaginasoftProgresso({ percentagem: p.percentagem || 0, mensagem: p.mensagem || "" });
          if (p.estado === "concluido" || p.estado === "erro") {
            if (imaginasoftProgressoRef.current) clearInterval(imaginasoftProgressoRef.current);
          }
        }
      } catch { /* ignorar erros de polling */ }
    }, 1500);

    try {
      const resp = await fetch("/api/upload-imaginasoft/importar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          sessaoId: imaginasoftSessaoId,
          opcoes: { importarRx: imaginasoftImportarRx, deduplicar: true },
        }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || "Erro ao importar");
      setImaginasoftResultado(data);
      setImaginasoftEstado("resultado");
    } catch (err: any) {
      setImaginasoftErro(err.message || "Erro ao importar backup");
      setImaginasoftEstado("preview");
    } finally {
      if (imaginasoftProgressoRef.current) clearInterval(imaginasoftProgressoRef.current);
      setImaginasoftProgresso(null);
    }
  };

  // Backup
  const criarBackupMutation = trpc.system.criarBackup.useMutation({
    onSuccess: (data) => {
      setBackupEmCurso(false);
      const blob = new Blob([JSON.stringify(data.backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = data.nomeArquivo; a.click();
      URL.revokeObjectURL(url);
    },
    onError: (e) => { setBackupEmCurso(false); alert(parseApiError(e, "Erro")); },
  });

  // Sincronizar moeda -> simbolo
  useEffect(() => {
    const sim = MOEDA_SIMBOLOS[lc.moeda] || lc.moeda;
    if (lc.simbolo_moeda !== sim) setC("simbolo_moeda", sim);
  }, [lc.moeda]);

  const TABS = [
    { id: "clinica",       label: "Clínica",        icon: Building2 },
    { id: "agenda",        label: "Agenda & Metas", icon: CalendarClock },
    { id: "aparencia",     label: "Aparência",      icon: Palette },
    { id: "notificacoes",  label: "Notificações",   icon: Bell },
    { id: "seguranca",     label: "Segurança",      icon: Shield },
    { id: "integracoes",   label: "Integrações",    icon: Zap },
    { id: "faturacao",     label: "Faturação",      icon: Receipt },
    { id: "dados",         label: "Dados",          icon: Database },
  ] as const;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-header-title">Configurações do Sistema</h1>
          <p className="text-[var(--text-tertiary)] text-sm mt-0.5">
            Todas as configurações da clínica num só lugar. As alterações propagam-se automaticamente.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20">
            <Activity className="w-3 h-3 text-[#00E5FF]" />
            <span className="text-[#00E5FF] text-xs font-medium">Auto-Sync Ativo</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-emerald-300 text-xs font-medium">Sistema Operacional</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-[var(--bg-overlay)] border border-[var(--border-lighter)] rounded-xl overflow-x-auto">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap ${
              tab === id
                ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/10"
                : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] border border-transparent"
            }`}>
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: CLINICA — Identidade da Clinica
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "clinica" && (
        <div className="space-y-4">
          <SectionCard icon={Building2} title="Identidade da Clínica" subtitle="Informações que aparecem em faturas, recibos e comunicações" color="#00E5FF">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <InputField label="Nome da Clínica" value={lc.nome_clinica} onChange={v => setC("nome_clinica", v)}
                  placeholder="Ex: Clínica Dentária Sorriso" icon={Building2} required />
              </div>
              <InputField label="NIF / NIPC" value={lc.nif_clinica} onChange={v => setC("nif_clinica", v)}
                placeholder="Ex: 500000000" icon={Hash} helpText="Número de Identificação Fiscal da empresa" />
              <InputField label="Email" value={lc.email_clinica} onChange={v => setC("email_clinica", v)}
                placeholder="clinica@exemplo.pt" icon={Mail} type="email" />
              <InputField label="Telefone" value={lc.telefone_clinica} onChange={v => setC("telefone_clinica", v)}
                placeholder="+351 210 000 000" icon={Phone} />
              <InputField label="Website" value={lc.website_clinica} onChange={v => setC("website_clinica", v)}
                placeholder="https://www.clinica.pt" icon={Globe} />
            </div>
          </SectionCard>

          <SectionCard icon={Image} title="Logo da Clínica" subtitle="Logo que aparece no papel timbrado dos PDFs (faturas, fichas, relatórios)" color="emerald">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              {/* Preview da logo */}
              <div className="w-32 h-32 rounded-xl border-2 border-dashed border-white/[0.12] bg-[var(--bg-overlay)] flex items-center justify-center overflow-hidden shrink-0">
                {lc.logo_clinica ? (
                  <img src={lc.logo_clinica} alt="Logo da Clinica" className="max-w-full max-h-full object-contain" />
                ) : (
                  <div className="text-center">
                    <Image className="w-8 h-8 text-[var(--text-muted)] mx-auto mb-1" />
                    <p className="text-[var(--text-muted)] text-[10px]">Sem logo</p>
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-3">
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-medium mb-1">Carregar Logo</p>
                  <p className="text-[var(--text-muted)] text-xs mb-3">
                    A logo aparecerá no canto superior direito de todos os documentos PDF gerados pelo sistema.
                    Formatos aceites: PNG, JPG, SVG. Tamanho recomendado: 300x100px.
                  </p>
                  <div className="flex gap-2">
                    <label className="btn-primary px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.01] active:scale-[0.99]">
                      <Upload className="w-3.5 h-3.5" />
                      Selecionar Imagem
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/svg+xml,image/webp"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 500 * 1024) {
                            alert("A imagem deve ter no máximo 500KB. Recomendamos uma logo de 300x100px.");
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            const result = ev.target?.result as string;
                            if (result) setC("logo_clinica", result);
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                    </label>
                    {lc.logo_clinica && (
                      <button
                        onClick={() => setC("logo_clinica", "")}
                        className="px-4 py-2 rounded-xl text-xs font-medium flex items-center gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Remover
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={MapPin} title="Morada" subtitle="Endereço completo da clínica" color="violet">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <InputField label="Morada" value={lc.morada_clinica} onChange={v => setC("morada_clinica", v)}
                  placeholder="Rua, número, andar" icon={MapPin} />
              </div>
              <InputField label="Cidade" value={lc.cidade_clinica} onChange={v => setC("cidade_clinica", v)}
                placeholder="Lisboa" />
              <InputField label="Código Postal" value={lc.codigo_postal_clinica} onChange={v => setC("codigo_postal_clinica", v)}
                placeholder="1000-001" />
              <SelectField label="País" value={lc.pais_clinica} onChange={v => setC("pais_clinica", v)}
                options={PAISES.map(p => ({ value: p, label: p }))} icon={Globe} />
            </div>
          </SectionCard>

          <SaveButton onClick={() => guardarSeccao(CHAVES_CLINICA)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.clinica} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: AGENDA & METAS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "agenda" && (
        <div className="space-y-4">
          <SectionCard icon={Clock} title="Horário de Funcionamento" subtitle="Define os horários visíveis na agenda e marcações online" color="#00E5FF">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="section-label block mb-1.5">Abertura</label>
                <input type="time" value={lc.horario_abertura} onChange={e => setC("horario_abertura", e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <div>
                <label className="section-label block mb-1.5">Encerramento</label>
                <input type="time" value={lc.horario_encerramento} onChange={e => setC("horario_encerramento", e.target.value)}
                  className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50" />
              </div>
              <SelectField label="Duração do Slot" value={lc.duracao_slot} onChange={v => setC("duracao_slot", v)}
                options={[
                  { value: "15", label: "15 minutos" }, { value: "20", label: "20 minutos" },
                  { value: "30", label: "30 minutos" }, { value: "45", label: "45 minutos" },
                  { value: "60", label: "60 minutos" },
                ]} />
              <SelectField label="Intervalo entre Consultas" value={lc.intervalo_consultas} onChange={v => setC("intervalo_consultas", v)}
                options={[
                  { value: "0", label: "Sem intervalo" }, { value: "5", label: "5 minutos" },
                  { value: "10", label: "10 minutos" }, { value: "15", label: "15 minutos" },
                ]} />
            </div>
            <div>
              <label className="section-label block mb-2">Dias de Funcionamento</label>
              <div className="flex gap-2 flex-wrap">
                {DIAS_SEMANA.map(d => (
                  <button key={d.id} onClick={() => toggleDia(d.id)}
                    className={`flex flex-col items-center justify-center w-14 h-14 rounded-xl text-xs font-semibold transition-all ${
                      diasFunc.includes(d.id)
                        ? "bg-[#00E5FF] text-white border border-[#00E5FF] shadow-lg shadow-[#00E5FF]/20"
                        : "bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                    }`}>
                    <span className="text-[10px] opacity-70">{d.full.substring(0, 3)}</span>
                    <span className="font-bold">{d.label}</span>
                  </button>
                ))}
              </div>
              <p className="text-[var(--text-muted)] text-[10px] mt-2">
                {diasFunc.length} dia{diasFunc.length !== 1 ? "s" : ""} por semana selecionado{diasFunc.length !== 1 ? "s" : ""}
              </p>
            </div>
          </SectionCard>

          <SectionCard icon={Calendar} title="Limites de Marcação" subtitle="Controla quando os utentes podem marcar consultas" color="violet">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField label="Max. Consultas/Dia" value={lc.slots_por_dia} onChange={v => setC("slots_por_dia", v)}
                options={[
                  { value: "8", label: "8 consultas" }, { value: "10", label: "10 consultas" },
                  { value: "12", label: "12 consultas" }, { value: "15", label: "15 consultas" },
                  { value: "20", label: "20 consultas" }, { value: "25", label: "25 consultas" },
                  { value: "30", label: "30 consultas" },
                ]} />
              <SelectField label="Antecedência Mínima" value={lc.antecedencia_minima_marcacao} onChange={v => setC("antecedencia_minima_marcacao", v)}
                helpText="Horas antes da consulta"
                options={[
                  { value: "1", label: "1 hora" }, { value: "2", label: "2 horas" },
                  { value: "4", label: "4 horas" }, { value: "12", label: "12 horas" },
                  { value: "24", label: "24 horas (1 dia)" }, { value: "48", label: "48 horas (2 dias)" },
                ]} />
              <SelectField label="Antecedência Máxima" value={lc.antecedencia_maxima_marcacao} onChange={v => setC("antecedencia_maxima_marcacao", v)}
                helpText="Dias no futuro"
                options={[
                  { value: "30", label: "30 dias (1 mes)" }, { value: "60", label: "60 dias (2 meses)" },
                  { value: "90", label: "90 dias (3 meses)" }, { value: "180", label: "180 dias (6 meses)" },
                  { value: "365", label: "365 dias (1 ano)" },
                ]} />
            </div>
          </SectionCard>

          <SectionCard icon={Target} title="Metas e Objetivos" subtitle="Metas que aparecem no Dashboard e IA Preditiva" color="emerald" badge="Dashboard">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="section-label block mb-1.5">Meta Receita Diária ({MOEDA_SIMBOLOS[lc.moeda] || "EUR"})</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input type="number" value={lc.meta_receita_diaria} onChange={e => setC("meta_receita_diaria", e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="500" min="0" step="50"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
              </div>
              <div>
                <label className="section-label block mb-1.5">Meta Receita Mensal ({MOEDA_SIMBOLOS[lc.moeda] || "EUR"})</label>
                <div className="relative">
                  <Banknote className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                  <input type="number" value={lc.meta_receita_mensal} onChange={e => setC("meta_receita_mensal", e.target.value)}
                    onFocus={e => e.target.select()}
                    placeholder="10000" min="0" step="500"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50" />
                </div>
              </div>
              <SelectField label="Meta Consultas/Dia" value={lc.meta_consultas_dia} onChange={v => setC("meta_consultas_dia", v)}
                icon={Users}
                options={[
                  { value: "5", label: "5 consultas" }, { value: "8", label: "8 consultas" },
                  { value: "10", label: "10 consultas" }, { value: "12", label: "12 consultas" },
                  { value: "15", label: "15 consultas" }, { value: "20", label: "20 consultas" },
                ]} />
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/15">
              <Info className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
              <p className="text-[#00E5FF]/80 text-xs">
                Estas metas são usadas pelo Dashboard, IA Preditiva e Alertas de Saúde para calcular desempenho e gerar insights automáticos.
              </p>
            </div>
          </SectionCard>

          <SaveButton onClick={() => guardarSeccao(CHAVES_AGENDA)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.agenda} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: APARENCIA — Idioma, Moeda, Formato
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "aparencia" && (
        <div className="space-y-4">
          <SectionCard icon={Globe} title="Localização" subtitle="Idioma, moeda e fuso horário" color="violet">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Idioma" value={lc.idioma} onChange={v => setC("idioma", v)} icon={Globe}
                options={IDIOMAS} />
              <SelectField label="Fuso Horário" value={lc.fuso_horario} onChange={v => setC("fuso_horario", v)} icon={Clock}
                options={FUSOS_HORARIOS} />
              <SelectField label="Moeda" value={lc.moeda} onChange={v => { setC("moeda", v); setC("simbolo_moeda", MOEDA_SIMBOLOS[v] || v); }} icon={Banknote}
                options={MOEDAS} />
              <div>
                <label className="section-label block mb-1.5">Símbolo da Moeda</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
                  <span className="text-2xl font-bold text-[#00E5FF]">{MOEDA_SIMBOLOS[lc.moeda] || lc.moeda}</span>
                  <span className="text-[var(--text-muted)] text-xs">Atualizado automaticamente</span>
                </div>
              </div>
            </div>
          </SectionCard>

          <SectionCard icon={Palette} title="Formatos" subtitle="Como datas e horas são apresentadas" color="amber">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Formato de Data" value={lc.formato_data} onChange={v => setC("formato_data", v)}
                options={FORMATOS_DATA} />
              <SelectField label="Formato de Hora" value={lc.formato_hora} onChange={v => setC("formato_hora", v)}
                options={FORMATOS_HORA} />
            </div>
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
              <p className="section-label mb-1">Pré-visualização</p>
              <p className="text-[var(--text-primary)] text-sm font-mono">
                {new Date().toLocaleDateString(lc.idioma || "pt-PT")} {new Date().toLocaleTimeString(lc.idioma || "pt-PT", { hour: "2-digit", minute: "2-digit", hour12: lc.formato_hora?.includes("a") })}
                {" "} — {MOEDA_SIMBOLOS[lc.moeda] || "EUR"}1.250,00
              </p>
            </div>
          </SectionCard>

          <SectionCard icon={Palette} title="Tema Visual" subtitle="Escolha entre modo escuro ou claro" color="#00E5FF">
            <div className="flex gap-3">
              <button onClick={() => { document.documentElement.setAttribute("data-theme", "dark"); localStorage.setItem("dentcare-theme", "dark"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  (localStorage.getItem("dentcare-theme") || "dark") === "dark"
                    ? "bg-[#00E5FF]/20 border-[#00E5FF]/50 text-[#00E5FF]"
                    : "border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                }`}>
                <Moon className="w-4 h-4" /> Escuro
              </button>
              <button onClick={() => { document.documentElement.setAttribute("data-theme", "light"); localStorage.setItem("dentcare-theme", "light"); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  localStorage.getItem("dentcare-theme") === "light"
                    ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                    : "border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-overlay)]"
                }`}>
                <Sun className="w-4 h-4" /> Claro
              </button>
            </div>
          </SectionCard>

          <SaveButton onClick={() => guardarSeccao(CHAVES_APARENCIA)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.aparencia} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: NOTIFICACOES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "notificacoes" && (
        <div className="space-y-4">
          <SectionCard icon={Bell} title="Canais de Notificação" subtitle="Escolha como quer ser notificado" color="amber">
            <ToggleRow icon={Mail} label="Notificações por Email" desc="Confirmações, relatórios e alertas por email"
              activo={getBool("notif_email")} onChange={() => toggleBool("notif_email")} />
            <ToggleRow icon={Phone} label="Notificações por SMS" desc="SMS para confirmações urgentes (requer integração)"
              activo={getBool("notif_sms")} onChange={() => toggleBool("notif_sms")} />
            <ToggleRow icon={MessageCircle} label="Notificações por WhatsApp" desc="Lembretes e confirmações via WhatsApp"
              activo={getBool("notif_whatsapp")} onChange={() => toggleBool("notif_whatsapp")} />
          </SectionCard>

          <SectionCard icon={BellRing} title="Lembretes Automaticos" subtitle="Lembretes enviados aos utentes antes das consultas" color="#00E5FF">
            <ToggleRow icon={Clock} label="Lembretes de Consulta" desc="Enviar lembrete automático antes da consulta"
              activo={getBool("notif_lembretes")} onChange={() => toggleBool("notif_lembretes")}>
              <SelectField label="Enviar com antecedência de" value={lc.notif_lembretes_horas} onChange={v => setC("notif_lembretes_horas", v)}
                options={[
                  { value: "2", label: "2 horas" }, { value: "4", label: "4 horas" },
                  { value: "12", label: "12 horas" }, { value: "24", label: "24 horas (1 dia)" },
                  { value: "48", label: "48 horas (2 dias)" }, { value: "72", label: "72 horas (3 dias)" },
                ]} />
            </ToggleRow>
          </SectionCard>

          <SectionCard icon={AlertTriangle} title="Alertas Automaticos" subtitle="Alertas internos para a equipa da clinica" color="orange">
            <ToggleRow icon={Calendar} label="Aniversários de Utentes" desc="Notificar no dia do aniversário"
              activo={getBool("notif_aniversarios")} onChange={() => toggleBool("notif_aniversarios")} />
            
            <ToggleRow icon={Banknote} label="Pagamentos em Atraso" desc="Alertar quando faturas passam o prazo"
              activo={getBool("notif_pagamentos_atraso")} onChange={() => toggleBool("notif_pagamentos_atraso")}>
              <SelectField label="Considerar atraso apos" value={lc.notif_pagamentos_atraso_dias} onChange={v => setC("notif_pagamentos_atraso_dias", v)}
                options={[
                  { value: "7", label: "7 dias" }, { value: "15", label: "15 dias" },
                  { value: "30", label: "30 dias" }, { value: "60", label: "60 dias" },
                  { value: "90", label: "90 dias" },
                ]} />
            </ToggleRow>

            <ToggleRow icon={Package} label="Stocks em Nível Baixo" desc="Alertar quando produto atinge mínimo"
              activo={getBool("notif_stocks_baixo")} onChange={() => toggleBool("notif_stocks_baixo")}>
              <SelectField label="Alertar quando stock abaixo de" value={lc.notif_stocks_minimo} onChange={v => setC("notif_stocks_minimo", v)}
                options={[
                  { value: "3", label: "3 unidades" }, { value: "5", label: "5 unidades" },
                  { value: "10", label: "10 unidades" }, { value: "20", label: "20 unidades" },
                ]} />
            </ToggleRow>

            <ToggleRow icon={AlertTriangle} label="Consultas Canceladas" desc="Alertar quando uma consulta e cancelada"
              activo={getBool("notif_consultas_canceladas")} onChange={() => toggleBool("notif_consultas_canceladas")} />
            
            <ToggleRow icon={Users} label="Novos Utentes" desc="Alertar quando um novo utente e registado"
              activo={getBool("notif_novos_utentes")} onChange={() => toggleBool("notif_novos_utentes")} />
          </SectionCard>

          <SaveButton onClick={() => guardarSeccao(CHAVES_NOTIFICACOES)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.notificacoes} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: SEGURANCA
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "seguranca" && (
        <div className="space-y-4">
          <SectionCard icon={ShieldCheck} title="Autenticação e Acesso" subtitle="Controle de segurança da aplicação" color="emerald">
            {/* 2FA Real — V35 Upgrade */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lighter)]">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${is2FAActive ? 'bg-emerald-500/15 border border-emerald-500/25' : 'bg-[var(--bg-overlay)] border border-[var(--border-light)]'}`}>
                  <Key className={`w-4 h-4 ${is2FAActive ? 'text-emerald-400' : 'text-[var(--text-muted)]'}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">Autenticação de Dois Fatores (2FA)</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {is2FAActive ? 'Ativo — O seu login requer código TOTP' : 'Inativo — Adicione segurança extra ao login'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleToggle2FA}
                disabled={twoFALoading}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  is2FAActive
                    ? 'bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/20'
                    : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25 border border-emerald-500/20'
                }`}
              >
                {twoFALoading ? 'A processar...' : is2FAActive ? 'Desativar 2FA' : 'Ativar 2FA'}
              </button>
            </div>
            {twoFAError && !show2FAModal && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5">
                <p className="text-red-400 text-xs font-medium">{twoFAError}</p>
              </div>
            )}
            
            <div>
              <SelectField label="Timeout de Sessao Inactiva" value={lc.seguranca_sessao_timeout} onChange={v => setC("seguranca_sessao_timeout", v)}
                icon={Timer}
                options={[
                  { value: "15", label: "15 minutos" }, { value: "30", label: "30 minutos" },
                  { value: "60", label: "1 hora" }, { value: "120", label: "2 horas" },
                  { value: "480", label: "8 horas" }, { value: "0", label: "Nunca (nao recomendado)" },
                ]} />
            </div>

            <ToggleRow icon={FileText} label="Registo de Auditoria" desc="Registar todas as ações dos utilizadores"
              activo={getBool("seguranca_log_auditoria")} onChange={() => toggleBool("seguranca_log_auditoria")} />
          </SectionCard>

          <SectionCard icon={Shield} title="Proteção contra Ataques" subtitle="Limites de tentativas e bloqueios" color="amber">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Tentativas de Login" value={lc.seguranca_tentativas_login} onChange={v => setC("seguranca_tentativas_login", v)}
                helpText="Antes de bloquear o acesso"
                options={[
                  { value: "3", label: "3 tentativas" }, { value: "5", label: "5 tentativas" },
                  { value: "10", label: "10 tentativas" },
                ]} />
              <SelectField label="Duração do Bloqueio" value={lc.seguranca_bloqueio_minutos} onChange={v => setC("seguranca_bloqueio_minutos", v)}
                helpText="Tempo de espera apos bloqueio"
                options={[
                  { value: "5", label: "5 minutos" }, { value: "15", label: "15 minutos" },
                  { value: "30", label: "30 minutos" }, { value: "60", label: "1 hora" },
                ]} />
            </div>
          </SectionCard>

          <SectionCard icon={Lock} title="Restrição por IP" subtitle="Permitir acesso apenas de IPs autorizados" color="red">
            <ToggleRow icon={Lock} label="Ativar Whitelist de IP" desc="Apenas IPs listados podem aceder ao sistema"
              activo={getBool("seguranca_ip_whitelist")} onChange={() => toggleBool("seguranca_ip_whitelist")}>
              <InputField label="IPs Permitidos" value={lc.seguranca_ips_permitidos} onChange={v => setC("seguranca_ips_permitidos", v)}
                placeholder="192.168.1.1, 10.0.0.1" helpText="Separe multiplos IPs por virgula" mono />
            </ToggleRow>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-amber-300/80 text-xs">
                Atenção: se ativar a restrição por IP e não incluir o seu IP atual, poderá perder o acesso ao sistema.
              </p>
            </div>
          </SectionCard>

          <SectionCard icon={Lock} title="Alterar Password" subtitle="Altere a password da sua conta" color="#00E5FF">
            {["Password Atual", "Nova Password", "Confirmar Nova Password"].map((label, i) => (
              <div key={i}>
                <label className="section-label block mb-1.5">{label}</label>
                <div className="relative">
                  <input type={mostrarTokens[`pass_${i}`] ? "text" : "password"} placeholder="••••••••"
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50" />
                  <button type="button" onClick={() => setMostrarTokens(t => ({ ...t, [`pass_${i}`]: !t[`pass_${i}`] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors">
                    {mostrarTokens[`pass_${i}`] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ))}
            <button className="btn-primary w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2">
              <Lock className="w-4 h-4" /> Alterar Password
            </button>
          </SectionCard>

          <SaveButton onClick={() => guardarSeccao(CHAVES_SEGURANCA)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.seguranca} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: INTEGRACOES
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "integracoes" && (
        <div className="space-y-4">
          {/* WhatsApp / Twilio */}
          <div className={`card-premium p-5 space-y-4 border ${getBool("whatsapp_ativo") ? "border-emerald-500/20" : "border-[var(--border-lighter)]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${getBool("whatsapp_ativo") ? "bg-emerald-500/10 border-emerald-500/20" : "bg-[var(--bg-overlay)] border-[var(--border-light)]"} border flex items-center justify-center`}>
                  <MessageCircle className={`w-4 h-4 ${getBool("whatsapp_ativo") ? "text-emerald-400" : "text-[var(--text-muted)]"}`} />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold">Twilio WhatsApp</p>
                  <p className="text-[var(--text-muted)] text-xs">API para envio de mensagens WhatsApp</p>
                </div>
              </div>
              <Toggle activo={getBool("whatsapp_ativo")} onChange={() => toggleBool("whatsapp_ativo")} />
            </div>
            {getBool("whatsapp_ativo") && (
              <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
                <InputField label="Account SID" value={lc.whatsapp_account_sid} onChange={v => setC("whatsapp_account_sid", v)}
                  placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" mono />
                <div>
                  <label className="section-label block mb-1.5">Auth Token</label>
                  <div className="relative">
                    <input type={mostrarTokens.twilioToken ? "text" : "password"} value={lc.whatsapp_auth_token}
                      onChange={e => setC("whatsapp_auth_token", e.target.value)} placeholder="••••••••••••••••"
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-emerald-500/50 font-mono" />
                    <button type="button" onClick={() => setMostrarTokens(t => ({ ...t, twilioToken: !t.twilioToken }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {mostrarTokens.twilioToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <InputField label="Número WhatsApp Business" value={lc.whatsapp_number} onChange={v => setC("whatsapp_number", v)}
                  placeholder="+351910000000" icon={Phone} helpText="Formato internacional com prefixo do país" />
              </div>
            )}
          </div>

          {/* MBWAY */}
          <div className={`card-premium p-5 space-y-4 border ${getBool("mbway_ativo") ? "border-[#00E5FF]/20" : "border-[var(--border-lighter)]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${getBool("mbway_ativo") ? "bg-[#00E5FF]/10 border-[#00E5FF]/20" : "bg-[var(--bg-overlay)] border-[var(--border-light)]"} border flex items-center justify-center`}>
                  <CreditCard className={`w-4 h-4 ${getBool("mbway_ativo") ? "text-[#00E5FF]" : "text-[var(--text-muted)]"}`} />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold">MBWAY / Pagamentos</p>
                  <p className="text-[var(--text-muted)] text-xs">Integração com gateway de pagamentos</p>
                </div>
              </div>
              <Toggle activo={getBool("mbway_ativo")} onChange={() => toggleBool("mbway_ativo")} />
            </div>
            {getBool("mbway_ativo") && (
              <div className="pt-2 border-t border-[var(--border-lighter)]">
                <div>
                  <label className="section-label block mb-1.5">Chave de API</label>
                  <div className="relative">
                    <input type={mostrarTokens.mbwayKey ? "text" : "password"} value={lc.mbway_api_key}
                      onChange={e => setC("mbway_api_key", e.target.value)} placeholder="••••••••••••••••"
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 font-mono" />
                    <button type="button" onClick={() => setMostrarTokens(t => ({ ...t, mbwayKey: !t.mbwayKey }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {mostrarTokens.mbwayKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* AT — Autoridade Tributária */}
          <div className={`card-premium p-5 space-y-4 border ${getBool("at_ativo") ? "border-amber-500/20" : "border-[var(--border-lighter)]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${getBool("at_ativo") ? "bg-amber-500/10 border-amber-500/20" : "bg-[var(--bg-overlay)] border-[var(--border-light)]"} border flex items-center justify-center`}>
                  <Server className={`w-4 h-4 ${getBool("at_ativo") ? "text-amber-400" : "text-[var(--text-muted)]"}`} />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold">AT — Autoridade Tributária</p>
                  <p className="text-[var(--text-muted)] text-xs">Comunicação de faturas ao SAFT</p>
                </div>
              </div>
              <Toggle activo={getBool("at_ativo")} onChange={() => toggleBool("at_ativo")} />
            </div>
            {getBool("at_ativo") && (
              <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
                <InputField label="NIF da Empresa" value={lc.at_nif} onChange={v => setC("at_nif", v)}
                  placeholder="500000000" icon={Hash} helpText="NIF registado na AT" />
                <div>
                  <label className="section-label block mb-1.5">Senha de Comunicação</label>
                  <div className="relative">
                    <input type={mostrarTokens.atSenha ? "text" : "password"} value={lc.at_senha_comunicacao}
                      onChange={e => setC("at_senha_comunicacao", e.target.value)} placeholder="••••••••"
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 pr-10 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-amber-500/50" />
                    <button type="button" onClick={() => setMostrarTokens(t => ({ ...t, atSenha: !t.atSenha }))}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
                      {mostrarTokens.atSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Sistema de Raio-X */}
          <div className={`card-premium p-5 space-y-4 border ${getBool("sistema_rx_ativo") ? "border-orange-500/20" : "border-[var(--border-lighter)]"}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg ${getBool("sistema_rx_ativo") ? "bg-orange-500/10 border-orange-500/20" : "bg-[var(--bg-overlay)] border-[var(--border-light)]"} border flex items-center justify-center`}>
                  <Scan className={`w-4 h-4 ${getBool("sistema_rx_ativo") ? "text-orange-400" : "text-[var(--text-muted)]"}`} />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] text-sm font-semibold">Sistema de Raio-X</p>
                  <p className="text-[var(--text-muted)] text-xs">Integração com software de imagiologia (MyRay, Trophy, VisioDei, etc.)</p>
                </div>
              </div>
              <Toggle activo={getBool("sistema_rx_ativo")} onChange={() => toggleBool("sistema_rx_ativo")} />
            </div>
            {getBool("sistema_rx_ativo") && (
              <div className="space-y-3 pt-2 border-t border-[var(--border-lighter)]">
                <div>
                  <label className="section-label block mb-1.5">Software de RX</label>
                  <select
                    value={lc.sistema_rx_nome}
                    onChange={e => setC("sistema_rx_nome", e.target.value)}
                    className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-orange-500/50 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">-- Selecione o software --</option>
                    <option value="MyRay">MyRay (Cefla / Neowise)</option>
                    <option value="Trophy">Trophy Imaging</option>
                    <option value="VisioDei">VisioDei</option>
                    <option value="Sidexis">Sidexis (Sirona)</option>
                    <option value="DbsWin">DbsWin</option>
                    <option value="ClinView">ClinView</option>
                    <option value="DigiXVis">DigiXVis</option>
                    <option value="Schick">Schick (Dentsply)</option>
                    <option value="Sopro">Sopro</option>
                    <option value="MediaDe">MediaDe</option>
                    <option value="EasyDent">EasyDent</option>
                    <option value="Outro">Outro</option>
                  </select>
                  <p className="text-[var(--text-muted)] text-[10px] mt-1">Selecione o software de RX instalado na clínica</p>
                </div>
                <div>
                  <label className="section-label block mb-1.5">Caminho do Programa</label>
                  <div className="relative">
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-muted)]" />
                    <input
                      type="text"
                      value={lc.sistema_rx_caminho}
                      onChange={e => setC("sistema_rx_caminho", e.target.value)}
                      placeholder="Ex: C:\Program Files\Cefla\Neowise\diagnostic-viewer\bridge\\"
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-orange-500/50 transition-colors font-mono"
                    />
                  </div>
                  <p className="text-[var(--text-muted)] text-[10px] mt-1">Caminho completo para a pasta ou executável do software de RX no computador</p>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                  <Scan className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                  <p className="text-orange-300/80 text-xs">
                    Este caminho é usado durante a importação do backup Imaginasoft para localizar as imagens de Raio-X. Pode ser alterado a qualquer momento para outras clínicas com software diferente.
                  </p>
                </div>
              </div>
            )}
          </div>

          <SaveButton onClick={() => guardarSeccao([...CHAVES_INTEGRACOES, ...CHAVES_INTEGRACOES_RX])} loading={atualizarLoteMutation.isPending} saved={!!savedSections.integracoes} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: FATURACAO
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "faturacao" && (
        <div className="space-y-4">
          <SectionCard icon={Receipt} title="Configurações de Faturação" subtitle="Série, numeração e taxa de IVA" color="#00E5FF" badge="SAFT-PT">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <SelectField label="Série de Faturação" value={lc.faturacao_serie} onChange={v => setC("faturacao_serie", v)}
                options={[
                  { value: "FT", label: "FT - Fatura" },
                  { value: "FR", label: "FR - Fatura-Recibo" },
                  { value: "FS", label: "FS - Fatura Simplificada" },
                  { value: "NC", label: "NC - Nota de Crédito" },
                ]} />
              <InputField label="Próximo Número" value={lc.faturacao_proximo_numero} onChange={v => setC("faturacao_proximo_numero", v)}
                type="number" icon={Hash} helpText="Número sequencial da próxima fatura" />
              <SelectField label="Taxa de IVA Padrão" value={lc.faturacao_taxa_iva} onChange={v => setC("faturacao_taxa_iva", v)}
                icon={Percent} options={TAXAS_IVA} />
            </div>
          </SectionCard>

          <SectionCard icon={FileText} title="Opções de Faturação" subtitle="Vencimento e observações padrão" color="violet">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <SelectField label="Prazo de Vencimento" value={lc.faturacao_vencimento_dias} onChange={v => setC("faturacao_vencimento_dias", v)}
                helpText="Dias após emissão"
                options={[
                  { value: "0", label: "Pagamento imediato" }, { value: "7", label: "7 dias" },
                  { value: "15", label: "15 dias" }, { value: "30", label: "30 dias" },
                  { value: "60", label: "60 dias" }, { value: "90", label: "90 dias" },
                ]} />
              <div>
                <label className="section-label block mb-1.5">Moeda nas Faturas</label>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-light)]">
                  <span className="text-lg font-bold text-[#00E5FF]">{MOEDA_SIMBOLOS[lc.moeda] || "EUR"}</span>
                  <span className="text-[var(--text-primary)] text-sm">{lc.moeda}</span>
                  <span className="text-[var(--text-muted)] text-xs ml-auto">Definido em Aparência</span>
                </div>
              </div>
            </div>
            <div>
              <label className="section-label block mb-1.5">Observações Padrão nas Faturas</label>
              <textarea value={lc.faturacao_observacoes_padrao} onChange={e => setC("faturacao_observacoes_padrao", e.target.value)}
                placeholder="Ex: Isento de IVA nos termos do artigo 9.º do CIVA"
                rows={3}
                className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 resize-none" />
            </div>
          </SectionCard>

          <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-amber-300/80 text-xs">
              Atenção: A série e numeração de faturação devem estar em conformidade com a legislação fiscal portuguesa (SAFT-PT). Consulte o seu contabilista antes de alterar.
            </p>
          </div>

          <SaveButton onClick={() => guardarSeccao(CHAVES_FATURACAO)} loading={atualizarLoteMutation.isPending} saved={!!savedSections.faturacao} />
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB: DADOS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === "dados" && (
        <div className="space-y-4">
          {/* Estado dos Servicos */}
          <SectionCard icon={Server} title="Estado dos Serviços" color="emerald">
            <EstadoServico label="Servidor Web" activo={true} descricao="DentCare Elite V35 — Express/tRPC" />
            <EstadoServico label="Base de Dados" activo={true} descricao="MySQL/TiDB — Operacional" />
            <EstadoServico label="SSL/HTTPS" activo={true} descricao="Certificado válido" />
            <EstadoServico label="Twilio WhatsApp" activo={getBool("whatsapp_ativo")} descricao={getBool("whatsapp_ativo") ? "Configurado e ativo" : "Não configurado"} />
            <EstadoServico label="Pagamentos MBWAY" activo={getBool("mbway_ativo")} descricao={getBool("mbway_ativo") ? "Gateway ativo" : "Não configurado"} />
            <EstadoServico label="AT — Faturação" activo={getBool("at_ativo")} descricao={getBool("at_ativo") ? "Comunicação ativa" : "Não configurado"} />
          </SectionCard>

          {/* Informacoes do Sistema */}
          <SectionCard icon={Info} title="Informações do Sistema" color="#00E5FF">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {[
                { label: "Versão", value: "DentCare Elite V35" },
                { label: "Ambiente", value: "Produção" },
                { label: "Node.js", value: "v22.13.0" },
                { label: "Base de Dados", value: "MySQL 8.0" },
                { label: "Última Sync", value: new Date().toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit" }) },
                { label: "Uptime", value: "99.9%" },
              ].map(({ label, value }) => (
                <div key={label} className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)]">
                  <p className="section-label mb-0.5">{label}</p>
                  <p className="text-[var(--text-primary)] text-xs font-semibold">{value}</p>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Backup e Exportação */}
          <SectionCard icon={HardDrive} title="Backup e Exportação" color="violet">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => { setBackupEmCurso(true); criarBackupMutation.mutate(); }} disabled={backupEmCurso}
                className="flex items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors disabled:opacity-60">
                {backupEmCurso
                  ? <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                  : <Download className="w-4 h-4 text-violet-400" />}
                <div className="text-left">
                  <p className="text-violet-300 text-sm font-semibold">{backupEmCurso ? "A criar backup..." : "Criar Backup"}</p>
                  <p className="text-violet-400/60 text-[10px]">Exportar todos os dados</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-4 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 hover:bg-[#00E5FF]/15 transition-colors">
                <Upload className="w-4 h-4 text-[#00E5FF]" />
                <div className="text-left">
                  <p className="text-[#00E5FF] text-sm font-semibold">Exportar SAFT</p>
                  <p className="text-[#00E5FF]/60 text-[10px]">Ficheiro para a AT</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
                <Download className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <p className="text-emerald-300 text-sm font-semibold">Exportar Utentes</p>
                  <p className="text-emerald-400/60 text-[10px]">CSV com todos os utentes</p>
                </div>
              </button>
              <button className="flex items-center gap-2 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/15 transition-colors">
                <Download className="w-4 h-4 text-amber-400" />
                <div className="text-left">
                  <p className="text-amber-300 text-sm font-semibold">Exportar Financeiro</p>
                  <p className="text-amber-400/60 text-[10px]">Relatório Excel</p>
                </div>
              </button>
            </div>
          </SectionCard>

          {/* Importação de Dados */}
          <SectionCard icon={Upload} title="Importação de Dados" color="cyan">
            <div className="flex items-start gap-2 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/15 mb-3">
              <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-cyan-300/80 text-xs">
                Importe dados de outros programas como NewSoft, Tugsis, OrisDent e outros. Suporta ficheiros SAFT-PT (XML), CSV e Excel.
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button onClick={() => { setShowImportModal(true); setImportTipo("saft"); setImportEstado("upload"); setImportErro(""); setImportResultado(null); setImportFicheiro(null); }}
                className="flex items-center gap-2 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors">
                <FileText className="w-4 h-4 text-cyan-400" />
                <div className="text-left">
                  <p className="text-cyan-300 text-sm font-semibold">Importar SAFT-PT</p>
                  <p className="text-cyan-400/60 text-[10px]">Ficheiro XML de faturação</p>
                </div>
              </button>
              <button onClick={() => { setShowImportModal(true); setImportTipo("csv"); setImportEstado("upload"); setImportErro(""); setImportResultado(null); setImportFicheiro(null); }}
                className="flex items-center gap-2 p-4 rounded-xl bg-teal-500/10 border border-teal-500/20 hover:bg-teal-500/15 transition-colors">
                <Database className="w-4 h-4 text-teal-400" />
                <div className="text-left">
                  <p className="text-teal-300 text-sm font-semibold">Importar CSV</p>
                  <p className="text-teal-400/60 text-[10px]">NewSoft, Tugsis, etc.</p>
                </div>
              </button>
              <button onClick={() => { setShowImportModal(true); setImportTipo("excel"); setImportEstado("upload"); setImportErro(""); setImportResultado(null); setImportFicheiro(null); }}
                className="flex items-center gap-2 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/15 transition-colors">
                <Package className="w-4 h-4 text-emerald-400" />
                <div className="text-left">
                  <p className="text-emerald-300 text-sm font-semibold">Importar Excel</p>
                  <p className="text-emerald-400/60 text-[10px]">Ficheiro .xlsx ou .xls</p>
                </div>
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <button onClick={() => { setShowImportModal(true); setImportTipo("json"); setImportEstado("upload"); setImportErro(""); setImportResultado(null); setImportFicheiro(null); }}
                className="flex items-center gap-2 p-4 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/15 transition-colors">
                <HardDrive className="w-4 h-4 text-violet-400" />
                <div className="text-left">
                  <p className="text-violet-300 text-sm font-semibold">Importar Backup DentCare</p>
                  <p className="text-violet-400/60 text-[10px]">Ficheiro .json de backup de outra instalação DentCare</p>
                </div>
              </button>
              <button
                onClick={() => {
                  setShowImaginasoftModal(true);
                  setImaginasoftEstado("selecao");
                  setImaginasoftFicheiro(null);
                  setImaginasoftAnalise(null);
                  setImaginasoftResultado(null);
                  setImaginasoftErro("");
                  setImaginasoftSessaoId("");
                }}
                className="flex items-center gap-2 p-4 rounded-xl bg-orange-500/10 border border-orange-500/20 hover:bg-orange-500/15 transition-colors">
                <Scan className="w-4 h-4 text-orange-400" />
                <div className="text-left">
                  <p className="text-orange-300 text-sm font-semibold">Importar Backup Imaginasoft</p>
                  <p className="text-orange-400/60 text-[10px]">Ficheiro .zip do NewSoft DS / Imaginasoft</p>
                </div>
              </button>
            </div>
          </SectionCard>

          {/* Zona de Perigo */}
          <div className="card-premium p-5 border border-red-500/20 space-y-3">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <h2 className="text-red-400 font-semibold text-sm">Zona de Perigo</h2>
            </div>
            <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
              <Info className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-red-300/80 text-xs">
                As ações abaixo são irreversíveis. Certifique-se de ter um backup antes de prosseguir.
              </p>
            </div>
            <button className="w-full flex items-center gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 transition-colors text-left">
              <Trash2 className="w-4 h-4 text-red-400 shrink-0" />
              <div>
                <p className="text-red-300 text-sm font-medium">Limpar Dados de Teste</p>
                <p className="text-red-400/60 text-xs">Remove utentes e consultas de demonstração</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL 2FA — Ativar/Desativar com QR Code e TOTP
      ══════════════════════════════════════════════════════════════════════ */}
      {show2FAModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => { setShow2FAModal(false); setTwoFAError(""); }}>
          <div className="relative w-full max-w-md mx-4 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                twoFAMode === 'enable' ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-red-500/10 border border-red-500/20'
              }`}>
                <Key className={`w-6 h-6 ${twoFAMode === 'enable' ? 'text-emerald-400' : 'text-red-400'}`} />
              </div>
              <h3 className="text-[var(--text-primary)] font-semibold text-lg">
                {twoFAMode === 'enable' ? 'Ativar 2FA' : 'Desativar 2FA'}
              </h3>
              <p className="text-[var(--text-muted)] text-sm mt-1">
                {twoFAMode === 'enable'
                  ? 'Escaneie o QR Code com a sua app autenticadora (Google Authenticator, Authy, etc.)'
                  : 'Introduza o código TOTP atual para confirmar a desativação'}
              </p>
            </div>

            {twoFAMode === 'enable' && qrCodeUrl && (
              <div className="flex justify-center mb-5">
                <div className="p-3 bg-[var(--bg-elevated)] rounded-xl">
                  <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48" />
                </div>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-xs font-semibold text-[var(--text-muted)] mb-1.5">
                {twoFAMode === 'enable' ? 'Código de Verificação (6 dígitos)' : 'Código TOTP Atual'}
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9 ]{6,7}"
                maxLength={7}
                value={totpCode2FA}
                onChange={e => setTotpCode2FA(e.target.value)}
                placeholder="000 000"
                autoFocus
                className="w-full px-3.5 py-3 rounded-xl bg-[var(--bg-subtle)] border border-[var(--border-light)] text-[var(--text-primary)] placeholder-[var(--text-muted)] text-lg tracking-[0.3em] text-center font-mono focus:outline-none focus:border-[#00E5FF]/60 focus:ring-1 focus:ring-[#00E5FF]/30 transition-all"
              />
            </div>

            {twoFAError && (
              <div className="rounded-xl bg-red-500/10 border border-red-500/20 px-3.5 py-2.5 mb-4">
                <p className="text-red-400 text-xs font-medium">{twoFAError}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setShow2FAModal(false); setTwoFAError(""); }}
                className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium text-[var(--text-secondary)] bg-[var(--bg-overlay)] border border-[var(--border-light)] hover:bg-[var(--bg-subtle)] transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm2FA}
                disabled={twoFALoading || totpCode2FA.replace(/\s/g, '').length < 6}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                  twoFAMode === 'enable'
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/20'
                    : 'bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/20'
                }`}
              >
                {twoFALoading ? 'A verificar...' : twoFAMode === 'enable' ? 'Confirmar e Ativar' : 'Confirmar e Desativar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL IMPORTACAO DE DADOS
      ══════════════════════════════════════════════════════════════════════ */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setShowImportModal(false)}>
          <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-[var(--text-primary)] font-bold text-lg">Importar Dados</h2>
                  <p className="text-[var(--text-muted)] text-xs">
                    {importTipo === 'saft' ? 'SAFT-PT (XML)' : importTipo === 'csv' ? 'Ficheiro CSV' : importTipo === 'json' ? 'Backup DentCare (JSON)' : 'Ficheiro Excel'}
                    {importTipo === 'csv' && ' \u2014 NewSoft, Tugsis, OrisDent, etc.'}
                  </p>
                </div>
              </div>
              <button onClick={() => setShowImportModal(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                <span className="text-lg">&times;</span>
              </button>
            </div>

            {/* Barra de Progresso */}
            <div className="flex gap-1.5 px-6 pt-4">
              {(['upload', 'preview', 'resultado'] as const).map((etapa, i) => (
                <div key={etapa} className={`flex-1 h-1.5 rounded-full transition-all ${
                  ['upload', 'preview', 'resultado'].indexOf(importEstado) >= i ? 'bg-cyan-500' : 'bg-[var(--bg-overlay)]'
                }`} />
              ))}
            </div>

            <div className="p-6">
              {/* Erro */}
              {importErro && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{importErro}</p>
                </div>
              )}

              {/* Etapa: Upload */}
              {importEstado === 'upload' && (
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${importFicheiro ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-[var(--border-light)] hover:border-cyan-500/50'}`}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.add('border-cyan-500', 'bg-cyan-500/10'); }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); e.currentTarget.classList.remove('border-cyan-500', 'bg-cyan-500/10'); }}
                    onDrop={(e) => {
                      e.preventDefault(); e.stopPropagation();
                      e.currentTarget.classList.remove('border-cyan-500', 'bg-cyan-500/10');
                      const f = e.dataTransfer.files?.[0];
                      if (f) setImportFicheiro(f);
                    }}
                  >
                    <Upload className="w-10 h-10 text-[var(--text-muted)] mx-auto mb-3" />
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-1">Arraste o ficheiro aqui</h3>
                    <p className="text-[var(--text-muted)] text-xs mb-4">ou clique para selecionar</p>
                    {importFicheiro && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 mb-3">
                        <FileText className="w-3 h-3 text-cyan-400" />
                        <span className="text-cyan-300 text-xs font-medium">{importFicheiro.name}</span>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        id="import-file-input"
                        className="hidden"
                        accept={importTipo === 'saft' ? '.xml' : importTipo === 'csv' ? '.csv,.txt' : importTipo === 'json' ? '.json' : '.xlsx,.xls'}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setImportFicheiro(f);
                        }}
                      />
                      <label htmlFor="import-file-input"
                        className="inline-block px-5 py-2.5 bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded-xl text-sm font-semibold hover:bg-cyan-500/30 transition-colors cursor-pointer">
                        Selecionar Ficheiro
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lightest)]">
                    <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div className="text-[var(--text-muted)] text-xs space-y-1">
                      {importTipo === 'json' ? (
                        <>
                          <p><strong className="text-[var(--text-secondary)]">Backup DentCare:</strong> Importe o ficheiro .json gerado pela funcao de backup do DentCare.</p>
                          <p>Importa automaticamente utentes, consultas, tratamentos e faturas.</p>
                        </>
                      ) : (
                        <>
                          <p><strong className="text-[var(--text-secondary)]">Programas suportados:</strong> NewSoft, Tugsis, OrisDent, Oris4D, Dentrix, WinDent, Primavera, PHC, Sage e outros</p>
                          <p>O sistema detecta automaticamente o formato e mapeia as colunas.</p>
                          <p>Campos suportados: Nome, NIF, Email, Telemovel, Morada, Cidade, Data Nascimento, Consultas, Tratamentos, etc.</p>
                          <p>Importa utentes + consultas + tratamentos (quando disponiveis no ficheiro).</p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowImportModal(false)}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all">
                      Cancelar
                    </button>
                    <button
                      disabled={!importFicheiro || importLoading}
                      onClick={async () => {
                        if (!importFicheiro || !importTipo) return;
                        setImportLoading(true);
                        setImportErro('');
                        try {
                          let resultado;
                          if (importTipo === 'saft') {
                            const conteudo = await importFicheiro.text();
                            resultado = await importarSaftMutation.mutateAsync({ conteudo });
                          } else if (importTipo === 'excel') {
                            // Ler Excel como binário (base64) para preservar formatação
                            const buffer = await importFicheiro.arrayBuffer();
                            const bytes = new Uint8Array(buffer);
                            let binary = '';
                            for (let i = 0; i < bytes.byteLength; i++) {
                              binary += String.fromCharCode(bytes[i]);
                            }
                            const conteudo = btoa(binary);
                            resultado = await importarCsvMutation.mutateAsync({ conteudo, tipo: 'excel' });
                          } else if (importTipo === 'json') {
                            const conteudo = await importFicheiro.text();
                            resultado = await importarCsvMutation.mutateAsync({ conteudo, tipo: 'json' });
                          } else {
                            const conteudo = await importFicheiro.text();
                            resultado = await importarCsvMutation.mutateAsync({ conteudo, tipo: 'csv' });
                          }
                          setImportResultado(resultado);
                          setImportEstado('preview');
                        } catch (err: any) {
                          setImportErro(parseApiError(err, 'Erro ao processar ficheiro'));
                        } finally {
                          setImportLoading(false);
                        }
                      }}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {importLoading
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A processar...</>
                        : <><Upload className="w-4 h-4" /> Importar e Analisar</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa: Preview */}
              {importEstado === 'preview' && importResultado && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                      <p className="text-cyan-400 text-2xl font-black">{importResultado.utentes ?? 0}</p>
                      <p className="text-cyan-400/60 text-[10px] font-semibold uppercase tracking-wider">Utentes</p>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                      <p className="text-teal-400 text-2xl font-black">{importResultado.consultas ?? importResultado.faturas ?? 0}</p>
                      <p className="text-teal-400/60 text-[10px] font-semibold uppercase tracking-wider">{importTipo === 'saft' ? 'Faturas' : 'Consultas'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-emerald-400 text-2xl font-black">{importResultado.tratamentos ?? 0}</p>
                      <p className="text-emerald-400/60 text-[10px] font-semibold uppercase tracking-wider">Tratamentos</p>
                    </div>
                    {(importResultado.faturas > 0) && (
                      <div className="p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center col-span-3">
                        <p className="text-violet-400 text-2xl font-black">{importResultado.faturas}</p>
                        <p className="text-violet-400/60 text-[10px] font-semibold uppercase tracking-wider">Faturas</p>
                      </div>
                    )}
                  </div>

                  {importResultado.programaDetectado && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/15">
                      <Zap className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                      <p className="text-[#00E5FF]/80 text-xs">
                        Formato detectado: <strong className="text-[#00E5FF]">{importResultado.programaDetectado}</strong>
                      </p>
                    </div>
                  )}

                  {importResultado.avisos?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 text-xs font-semibold mb-1">Avisos ({importResultado.avisos.length})</p>
                      <div className="max-h-24 overflow-y-auto space-y-0.5">
                        {importResultado.avisos.slice(0, 5).map((a: string, i: number) => (
                          <p key={i} className="text-amber-300/70 text-[10px]">{a}</p>
                        ))}
                        {importResultado.avisos.length > 5 && (
                          <p className="text-amber-300/50 text-[10px]">... e mais {importResultado.avisos.length - 5} avisos</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/15">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <p className="text-emerald-300/80 text-xs">
                      Os dados foram analisados com sucesso. O sistema ira de-duplicar automaticamente os registos existentes antes de importar.
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => { setImportEstado('upload'); setImportResultado(null); }}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all">
                      Voltar
                    </button>
                    <button
                      disabled={importLoading}
                      onClick={async () => {
                        if (!importResultado?.sessaoId) return;
                        setImportLoading(true);
                        setImportErro('');
                        try {
                          await deduplicarMutation.mutateAsync({ sessaoId: importResultado.sessaoId });
                          const res = await executarMigracaoMutation.mutateAsync({
                            sessaoId: importResultado.sessaoId,
                            opcoes: { deduplicar: true, preservarDatas: true },
                          });
                          setImportResultado(res);
                          setImportEstado('resultado');
                        } catch (err: any) {
                          setImportErro(parseApiError(err, 'Erro ao executar migração'));
                        } finally {
                          setImportLoading(false);
                        }
                      }}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {importLoading
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A importar...</>
                        : <><CheckCircle2 className="w-4 h-4" /> Executar Importação</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa: Resultado */}
              {importEstado === 'resultado' && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[var(--text-primary)] font-bold text-lg">Importação Concluída!</h3>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                      {importResultado?.mensagem || `${importResultado?.utentesImportados ?? importResultado?.utentes ?? 0} utentes foram importados com sucesso para o DentCare.`}
                    </p>
                  </div>

                  {/* Resumo detalhado da importacao */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                      <p className="text-cyan-400 text-lg font-black">{importResultado?.utentesImportados ?? 0}</p>
                      <p className="text-cyan-400/60 text-[9px] font-semibold uppercase tracking-wider">Utentes</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                      <p className="text-teal-400 text-lg font-black">{importResultado?.consultasImportadas ?? 0}</p>
                      <p className="text-teal-400/60 text-[9px] font-semibold uppercase tracking-wider">Consultas</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-emerald-400 text-lg font-black">{importResultado?.tratamentosImportados ?? 0}</p>
                      <p className="text-emerald-400/60 text-[9px] font-semibold uppercase tracking-wider">Tratamentos</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-violet-500/10 border border-violet-500/20 text-center">
                      <p className="text-violet-400 text-lg font-black">{importResultado?.faturasImportadas ?? 0}</p>
                      <p className="text-violet-400/60 text-[9px] font-semibold uppercase tracking-wider">Faturas</p>
                    </div>
                  </div>

                  {importResultado?.utentesIgnorados > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300/80 text-xs">
                        {importResultado.utentesIgnorados} utentes ja existiam na base de dados e foram ignorados (sem duplicacao).
                      </p>
                    </div>
                  )}

                  {importResultado?.programaDetectado && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/15">
                      <Zap className="w-4 h-4 text-[#00E5FF] shrink-0 mt-0.5" />
                      <p className="text-[#00E5FF]/80 text-xs">
                        Formato detectado: <strong className="text-[#00E5FF]">{importResultado.programaDetectado}</strong>
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => { setShowImportModal(false); setImportEstado('selecao'); setImportResultado(null); }}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all">
                      Fechar
                    </button>
                    <button onClick={() => { navigate('/utentes'); }}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold">
                      Ver Utentes Importados
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL IMPORTAÇÃO IMAGINASOFT
      ══════════════════════════════════════════════════════════════════════ */}
      {showImaginasoftModal && (
        <div className="fixed inset-0 z-50 flex items-start sm:items-center justify-center p-4 py-8 bg-black/60 backdrop-blur-sm overflow-y-auto" onClick={() => setShowImaginasoftModal(false)}>
          <div className="relative w-full max-w-2xl rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-light)] shadow-2xl my-auto" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-[var(--border-lightest)]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                  <Scan className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h2 className="text-[var(--text-primary)] font-bold text-lg">Importar Backup Imaginasoft</h2>
                  <p className="text-[var(--text-muted)] text-xs">NewSoft DS / Imaginasoft Healthcare Solutions — Ficheiro .zip</p>
                </div>
              </div>
              <button onClick={() => setShowImaginasoftModal(false)} className="w-8 h-8 rounded-lg bg-[var(--bg-overlay)] hover:bg-[var(--bg-subtle)] flex items-center justify-center text-[var(--text-secondary)] transition-colors">
                <span className="text-lg">&times;</span>
              </button>
            </div>

            {/* Barra de Progresso */}
            <div className="flex gap-1.5 px-6 pt-4">
              {(["selecao", "preview", "resultado"] as const).map((etapa, i) => (
                <div key={etapa} className={`flex-1 h-1.5 rounded-full transition-all ${
                  ["selecao", "analisando", "preview", "importando", "resultado"].indexOf(imaginasoftEstado) >= ["selecao", "preview", "resultado"].indexOf(etapa)
                    ? "bg-orange-500" : "bg-[var(--bg-overlay)]"
                }`} />
              ))}
            </div>

            <div className="p-6">
              {/* Erro */}
              {imaginasoftErro && (
                <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
                  <p className="text-red-400 text-sm">{imaginasoftErro}</p>
                </div>
              )}

              {/* Etapa: Selecção do ficheiro */}
              {(imaginasoftEstado === "selecao" || imaginasoftEstado === "analisando") && (
                <div className="space-y-4">
                  <div
                    className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                      imaginasoftFicheiro ? "border-orange-500/50 bg-orange-500/5" : "border-[var(--border-light)] hover:border-orange-500/50"
                    }`}
                    onDragOver={e => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={e => {
                      e.preventDefault(); e.stopPropagation();
                      const f = e.dataTransfer.files?.[0];
                      if (f && f.name.toLowerCase().endsWith(".zip")) { setImaginasoftFicheiro(f); setImaginasoftErro(""); }
                      else setImaginasoftErro("Apenas ficheiros .zip são aceites.");
                    }}
                  >
                    <Scan className="w-10 h-10 text-orange-400/50 mx-auto mb-3" />
                    <h3 className="text-[var(--text-primary)] font-semibold text-sm mb-1">Arraste o ficheiro .zip aqui</h3>
                    <p className="text-[var(--text-muted)] text-xs mb-4">ou clique para selecionar o backup do Imaginasoft</p>
                    {imaginasoftFicheiro && (
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/10 border border-orange-500/20 mb-3">
                        <HardDrive className="w-3 h-3 text-orange-400" />
                        <span className="text-orange-300 text-xs font-medium">{imaginasoftFicheiro.name}</span>
                        <span className="text-orange-400/60 text-[10px]">({(imaginasoftFicheiro.size / 1024 / 1024).toFixed(1)} MB)</span>
                      </div>
                    )}
                    <div>
                      <input
                        type="file"
                        id="imaginasoft-file-input"
                        className="hidden"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (f) { setImaginasoftFicheiro(f); setImaginasoftErro(""); }
                        }}
                      />
                      <label htmlFor="imaginasoft-file-input"
                        className="inline-block px-5 py-2.5 bg-orange-500/20 border border-orange-500/30 text-orange-300 rounded-xl text-sm font-semibold hover:bg-orange-500/30 transition-colors cursor-pointer">
                        Selecionar Ficheiro .zip
                      </label>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lightest)]">
                    <Info className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <div className="text-[var(--text-muted)] text-xs space-y-1">
                      <p><strong className="text-[var(--text-secondary)]">Backup Imaginasoft (NewSoft DS):</strong> Selecione o ficheiro .zip gerado pelo sistema de backup do Imaginasoft.</p>
                      <p>O sistema irá importar os dados dos utentes e as imagens de Raio-X. As fotos de perfil serão ignoradas.</p>
                      <p>Utentes já existentes (mesmo NIF) não serão duplicados.</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => setShowImaginasoftModal(false)}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all">
                      Cancelar
                    </button>
                    <button
                      disabled={!imaginasoftFicheiro || imaginasoftEstado === "analisando"}
                      onClick={handleAnalisarImaginasoft}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {imaginasoftEstado === "analisando"
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A analisar backup...</>
                        : <><Scan className="w-4 h-4" /> Analisar Backup</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa: Preview da análise */}
              {imaginasoftEstado === "preview" && imaginasoftAnalise && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <p className="text-emerald-300 text-sm font-semibold">Backup analisado com sucesso!</p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                      <p className="text-orange-400 text-2xl font-black">{imaginasoftAnalise.totalUtentes ?? 0}</p>
                      <p className="text-orange-400/60 text-[10px] font-semibold uppercase tracking-wider">Utentes</p>
                    </div>
                    <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                      <p className="text-cyan-400 text-2xl font-black">{imaginasoftAnalise.totalImagensRx ?? 0}</p>
                      <p className="text-cyan-400/60 text-[10px] font-semibold uppercase tracking-wider">Imagens RX</p>
                    </div>
                    <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/20 text-center">
                      <p className="text-teal-400 text-2xl font-black">{imaginasoftAnalise.totalDocumentos ?? 0}</p>
                      <p className="text-teal-400/60 text-[10px] font-semibold uppercase tracking-wider">Documentos</p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)] text-center">
                      <p className="text-[var(--text-muted)] text-2xl font-black">{imaginasoftAnalise.totalFotosPerfil ?? 0}</p>
                      <p className="text-[var(--text-muted)]/60 text-[10px] font-semibold uppercase tracking-wider">Fotos Perfil</p>
                    </div>
                  </div>

                  {imaginasoftAnalise.sistemaRxDetectado && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/15">
                      <Scan className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-orange-300/80 text-xs">
                          Sistema de RX detectado: <strong className="text-orange-300">{imaginasoftAnalise.sistemaRxDetectado}</strong>
                        </p>
                        {imaginasoftAnalise.caminhoRxDetectado && (
                          <p className="text-orange-400/60 text-[10px] mt-0.5 font-mono">{imaginasoftAnalise.caminhoRxDetectado}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-2 p-3 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lightest)]">
                    <XCircle className="w-4 h-4 text-[var(--text-muted)] shrink-0 mt-0.5" />
                    <p className="text-[var(--text-muted)] text-xs">
                      As <strong>{imaginasoftAnalise.totalFotosPerfil ?? 0} fotos de perfil</strong> dos utentes serão ignoradas (não importadas), conforme solicitado.
                    </p>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    imaginasoftImportarRx ? "bg-cyan-500/5 border-cyan-500/20" : "bg-[var(--bg-surface)] border-[var(--border-lightest)]"
                  }`}>
                    <div className="flex items-center gap-2">
                      <ImageIcon className={`w-4 h-4 ${imaginasoftImportarRx ? "text-cyan-400" : "text-[var(--text-muted)]"}`} />
                      <div>
                        <p className="text-[var(--text-primary)] text-sm font-medium">Importar imagens de Raio-X</p>
                        <p className="text-[var(--text-muted)] text-xs">{imaginasoftAnalise.totalImagensRx ?? 0} imagens encontradas na pasta Captura/{imaginasoftAnalise.tamanhoTotalImagens ? ` (${(imaginasoftAnalise.tamanhoTotalImagens / 1024 / 1024).toFixed(1)} MB)` : ""}</p>
                      </div>
                    </div>
                    <Toggle activo={imaginasoftImportarRx} onChange={() => setImaginasoftImportarRx(v => !v)} />
                  </div>

                  {imaginasoftAnalise.avisos?.length > 0 && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-400 text-xs font-semibold mb-1">Avisos ({imaginasoftAnalise.avisos.length})</p>
                      <div className="max-h-24 overflow-y-auto space-y-0.5">
                        {imaginasoftAnalise.avisos.slice(0, 5).map((a: string, i: number) => (
                          <p key={i} className="text-amber-300/70 text-[10px]">{a}</p>
                        ))}
                        {imaginasoftAnalise.avisos.length > 5 && (
                          <p className="text-amber-300/50 text-[10px]">... e mais {imaginasoftAnalise.avisos.length - 5} avisos</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Barra de progresso durante importação */}
                  {(imaginasoftEstado as string) === "importando" && imaginasoftProgresso && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-[var(--text-secondary)] font-medium">{imaginasoftProgresso.mensagem}</span>
                        <span className="text-orange-400 font-bold">{Math.round(imaginasoftProgresso.percentagem)}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-orange-500 to-cyan-500 transition-all duration-500"
                          style={{ width: `${Math.min(imaginasoftProgresso.percentagem, 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => { setImaginasoftEstado("selecao"); setImaginasoftAnalise(null); }}
                      disabled={(imaginasoftEstado as string) === "importando"}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all disabled:opacity-50">
                      Voltar
                    </button>
                    <button
                      disabled={(imaginasoftEstado as string) === "importando"}
                      onClick={handleImportarImaginasoft}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
                      {(imaginasoftEstado as string) === "importando"
                        ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A importar dados...</>
                        : <><CheckCircle2 className="w-4 h-4" /> Executar Importação</>}
                    </button>
                  </div>
                </div>
              )}

              {/* Etapa: Resultado */}
              {imaginasoftEstado === "resultado" && imaginasoftResultado && (
                <div className="text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-[var(--text-primary)] font-bold text-lg">Importação Concluída!</h3>
                    <p className="text-[var(--text-muted)] text-sm mt-1">
                      {imaginasoftResultado.mensagem || "Backup Imaginasoft importado com sucesso."}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-center">
                      <p className="text-orange-400 text-lg font-black">{imaginasoftResultado.utentesImportados ?? 0}</p>
                      <p className="text-orange-400/60 text-[9px] font-semibold uppercase tracking-wider">Utentes Importados</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
                      <p className="text-cyan-400 text-lg font-black">{imaginasoftResultado.imagensImportadas ?? 0}</p>
                      <p className="text-cyan-400/60 text-[9px] font-semibold uppercase tracking-wider">Imagens RX</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-lightest)] text-center">
                      <p className="text-[var(--text-muted)] text-lg font-black">{imaginasoftResultado.utentesIgnorados ?? 0}</p>
                      <p className="text-[var(--text-muted)]/60 text-[9px] font-semibold uppercase tracking-wider">Já Existiam</p>
                    </div>
                  </div>

                  {imaginasoftResultado.utentesIgnorados > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15">
                      <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-amber-300/80 text-xs">
                        {imaginasoftResultado.utentesIgnorados} utentes já existiam na base de dados e não foram duplicados.
                      </p>
                    </div>
                  )}

                  {(imaginasoftResultado.imagensFalhadas ?? 0) > 0 && (
                    <div className="flex items-start gap-2 p-3 rounded-xl bg-red-500/5 border border-red-500/15">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <p className="text-red-300/80 text-xs">
                        {imaginasoftResultado.imagensFalhadas} imagens não puderam ser importadas (ficheiro corrompido ou formato não suportado).
                      </p>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => { setShowImaginasoftModal(false); setImaginasoftEstado("selecao"); setImaginasoftResultado(null); }}
                      className="flex-1 py-3 rounded-xl border border-[var(--border-light)] text-[var(--text-secondary)] text-sm font-semibold hover:bg-[var(--bg-overlay)] transition-all">
                      Fechar
                    </button>
                    <button onClick={() => { navigate("/utentes"); }}
                      className="flex-1 btn-primary py-3 rounded-xl text-sm font-semibold">
                      Ver Utentes Importados
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
