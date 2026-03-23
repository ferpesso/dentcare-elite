/**
 * ConectoresPage.tsx — Conectores de Comunicação e Redes Sociais
 * DentCare Elite V35 — Estilo Premium com Cards Visuais Premium
 *
 * Funcionalidades:
 * - Cards visuais para cada conector com estado (conectado/desconectado/erro)
 * - Toggle de ativação com animação
 * - Configuração inline com campos expandíveis
 * - Teste de conexão em tempo real com feedback visual
 * - Duas secções: Comunicação Clínica/Utente e Redes Sociais
 * - Indicadores de saúde e resumo global
 * - Design glassmorphism premium
 */
import React, { useState, useEffect, useCallback } from "react";
import { trpc } from "../lib/trpc";
import { parseApiError } from "../lib/parseApiError";
import {
  Mail, MessageCircle, Phone, Bell, Calendar, Cloud,
  Facebook, Instagram, Linkedin, Music, Star, MapPin,
  Settings, Check, X, AlertCircle, Loader, Zap,
  ChevronDown, ChevronUp, Eye, EyeOff, Save,
  RefreshCw, ExternalLink, Shield, Wifi, WifiOff,
  Plug, PlugZap, ArrowRight, Sparkles, Globe,
  CheckCircle2, XCircle, Info, Copy, Link2,
} from "lucide-react";

// ─── Tipos ──────────────────────────────────────────────────────────────────

type ConectorEstado = "conectado" | "desconectado" | "erro" | "a_testar";

interface ConectorConfig {
  id: string;
  nome: string;
  descricao: string;
  icone: React.ReactNode;
  cor: string;
  corBg: string;
  corBorder: string;
  corGlow: string;
  categoria: "comunicacao" | "redes_sociais";
  campos: CampoConfig[];
  ajuda?: string;
  docUrl?: string;
  gratuito?: boolean;
  provider?: string;
}

interface CampoConfig {
  chave: string;
  label: string;
  tipo: "text" | "password" | "select" | "number";
  placeholder?: string;
  helpText?: string;
  obrigatorio?: boolean;
  opcoes?: { value: string; label: string }[];
  monoFont?: boolean;
}

// ─── Definição Visual dos Conectores ────────────────────────────────────────

const CONECTORES: ConectorConfig[] = [
  // ── COMUNICAÇÃO CLÍNICA/UTENTE ──
  {
    id: "email_smtp",
    nome: "Email SMTP",
    descricao: "Envio de emails transacionais, lembretes de consulta, faturas e campanhas",
    icone: <Mail className="w-6 h-6" />,
    cor: "text-blue-400",
    corBg: "bg-blue-500/10",
    corBorder: "border-blue-500/20",
    corGlow: "shadow-blue-500/10",
    categoria: "comunicacao",
    gratuito: true,
    ajuda: "Configure o seu servidor SMTP para enviar emails automáticos aos utentes. Compatível com Gmail, Outlook, SendGrid, Mailgun, etc.",
    docUrl: "https://support.google.com/a/answer/176600",
    campos: [
      { chave: "conector_email_smtp_host", label: "Servidor SMTP", tipo: "text", placeholder: "smtp.gmail.com", obrigatorio: true, helpText: "Ex: smtp.gmail.com, smtp.office365.com, smtp.sendgrid.net" },
      { chave: "conector_email_smtp_port", label: "Porta", tipo: "number", placeholder: "587", helpText: "587 (TLS) ou 465 (SSL)" },
      { chave: "conector_email_smtp_user", label: "Utilizador", tipo: "text", placeholder: "clinica@gmail.com", obrigatorio: true },
      { chave: "conector_email_smtp_pass", label: "Password / App Password", tipo: "password", placeholder: "••••••••", obrigatorio: true, helpText: "Para Gmail, use uma App Password" },
      { chave: "conector_email_smtp_from", label: "Email Remetente", tipo: "text", placeholder: "noreply@clinica.pt", obrigatorio: true },
      { chave: "conector_email_smtp_from_name", label: "Nome do Remetente", tipo: "text", placeholder: "Clínica Dentária Sorriso" },
      { chave: "conector_email_smtp_tls", label: "Segurança", tipo: "select", opcoes: [{ value: "tls", label: "TLS (Recomendado)" }, { value: "ssl", label: "SSL" }, { value: "none", label: "Nenhuma" }] },
    ],
  },
  {
    id: "sms_twilio",
    nome: "SMS",
    descricao: "Envio de SMS para confirmação de consultas, lembretes e alertas urgentes",
    icone: <Phone className="w-6 h-6" />,
    cor: "text-emerald-400",
    corBg: "bg-emerald-500/10",
    corBorder: "border-emerald-500/20",
    corGlow: "shadow-emerald-500/10",
    categoria: "comunicacao",
    provider: "Twilio",
    ajuda: "Utilize a Twilio para enviar SMS automáticos. Crie uma conta gratuita em twilio.com para obter as credenciais.",
    docUrl: "https://www.twilio.com/docs/sms",
    campos: [
      { chave: "conector_sms_twilio_account_sid", label: "Account SID", tipo: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", obrigatorio: true, monoFont: true },
      { chave: "conector_sms_twilio_auth_token", label: "Auth Token", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_sms_twilio_from_number", label: "Número de Envio", tipo: "text", placeholder: "+351910000000", obrigatorio: true, helpText: "Número Twilio com capacidade SMS" },
    ],
  },
  {
    id: "whatsapp_business",
    nome: "WhatsApp Business",
    descricao: "Mensagens WhatsApp com chatbot, botões interativos e marcação automática",
    icone: <MessageCircle className="w-6 h-6" />,
    cor: "text-green-400",
    corBg: "bg-green-500/10",
    corBorder: "border-green-500/20",
    corGlow: "shadow-green-500/10",
    categoria: "comunicacao",
    ajuda: "Escolha entre Twilio WhatsApp ou Meta Cloud API para enviar mensagens WhatsApp aos utentes.",
    docUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    campos: [
      { chave: "conector_whatsapp_provider", label: "Provider", tipo: "select", opcoes: [{ value: "twilio", label: "Twilio WhatsApp" }, { value: "meta_cloud", label: "Meta Cloud API (Oficial)" }] },
      { chave: "conector_whatsapp_account_sid", label: "Account SID (Twilio)", tipo: "text", placeholder: "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx", monoFont: true },
      { chave: "conector_whatsapp_auth_token", label: "Auth Token (Twilio)", tipo: "password", placeholder: "••••••••" },
      { chave: "conector_whatsapp_phone_id", label: "Phone Number ID (Meta)", tipo: "text", placeholder: "1234567890", monoFont: true },
      { chave: "conector_whatsapp_business_id", label: "Business Account ID (Meta)", tipo: "text", placeholder: "1234567890", monoFont: true },
      { chave: "conector_whatsapp_api_token", label: "API Token (Meta)", tipo: "password", placeholder: "••••••••" },
      { chave: "conector_whatsapp_number", label: "Número WhatsApp", tipo: "text", placeholder: "+351910000000", obrigatorio: true },
    ],
  },
  {
    id: "push_notifications",
    nome: "Notificações Push",
    descricao: "Alertas instantâneos no browser e dispositivos móveis dos utentes",
    icone: <Bell className="w-6 h-6" />,
    cor: "text-amber-400",
    corBg: "bg-amber-500/10",
    corBorder: "border-amber-500/20",
    corGlow: "shadow-amber-500/10",
    categoria: "comunicacao",
    gratuito: true,
    ajuda: "Notificações Push via Web Push API (gratuito) ou Firebase Cloud Messaging.",
    campos: [
      { chave: "conector_push_provider", label: "Provider", tipo: "select", opcoes: [{ value: "web_push", label: "Web Push API (Gratuito)" }, { value: "firebase", label: "Firebase Cloud Messaging" }] },
      { chave: "conector_push_vapid_public", label: "VAPID Public Key", tipo: "text", placeholder: "BNcRd...", monoFont: true, helpText: "Gerada automaticamente se vazia" },
      { chave: "conector_push_vapid_private", label: "VAPID Private Key", tipo: "password", placeholder: "••••••••", monoFont: true },
      { chave: "conector_push_firebase_project_id", label: "Firebase Project ID", tipo: "text", placeholder: "meu-projeto-firebase" },
      { chave: "conector_push_firebase_api_key", label: "Firebase API Key", tipo: "password", placeholder: "••••••••" },
    ],
  },
  {
    id: "google_calendar",
    nome: "Google Calendar",
    descricao: "Sincronização de consultas + Feriados e Datas Comemorativas do país configurado",
    icone: <Calendar className="w-6 h-6" />,
    cor: "text-sky-400",
    corBg: "bg-sky-500/10",
    corBorder: "border-sky-500/20",
    corGlow: "shadow-sky-500/10",
    categoria: "comunicacao",
    gratuito: true,
    ajuda: "Sincronize consultas com o Google Calendar e configure o país para exibir feriados e datas comemorativas na agenda. Os feriados são carregados automaticamente para 100+ países.",
    docUrl: "https://console.cloud.google.com/apis/library/calendar-json.googleapis.com",
    campos: [
      { chave: "conector_gcal_client_id", label: "Client ID", tipo: "text", placeholder: "xxxx.apps.googleusercontent.com", obrigatorio: true, monoFont: true },
      { chave: "conector_gcal_client_secret", label: "Client Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_gcal_calendar_id", label: "Calendar ID", tipo: "text", placeholder: "primary", helpText: "Deixe 'primary' para o calendário principal" },
      { chave: "conector_gcal_country_code", label: "País dos Feriados", tipo: "text", placeholder: "PT", helpText: "Código ISO do país (ex: PT, BR, US, ES, FR, DE). Os feriados e datas comemorativas exibidos na agenda serão deste país." },
    ],
  },
  {
    id: "outlook_calendar",
    nome: "Microsoft Outlook",
    descricao: "Sincronização com Outlook Calendar e Microsoft 365",
    icone: <Cloud className="w-6 h-6" />,
    cor: "text-cyan-400",
    corBg: "bg-cyan-500/10",
    corBorder: "border-cyan-500/20",
    corGlow: "shadow-cyan-500/10",
    categoria: "comunicacao",
    ajuda: "Integre com Microsoft 365 para sincronizar calendários e enviar emails via Outlook.",
    docUrl: "https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps",
    campos: [
      { chave: "conector_outlook_client_id", label: "Application (Client) ID", tipo: "text", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx", obrigatorio: true, monoFont: true },
      { chave: "conector_outlook_client_secret", label: "Client Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_outlook_tenant_id", label: "Tenant ID", tipo: "text", placeholder: "common", helpText: "'common' para multi-tenant ou ID específico" },
    ],
  },

  // ── REDES SOCIAIS ──
  {
    id: "facebook",
    nome: "Facebook",
    descricao: "Publicação automática, gestão de página e métricas de engajamento",
    icone: <Facebook className="w-6 h-6" />,
    cor: "text-blue-500",
    corBg: "bg-blue-600/10",
    corBorder: "border-blue-600/20",
    corGlow: "shadow-blue-600/10",
    categoria: "redes_sociais",
    ajuda: "Conecte a sua página do Facebook para publicar conteúdo, responder a mensagens e acompanhar métricas.",
    docUrl: "https://developers.facebook.com/apps/",
    campos: [
      { chave: "conector_facebook_app_id", label: "App ID", tipo: "text", placeholder: "1234567890", obrigatorio: true, monoFont: true },
      { chave: "conector_facebook_app_secret", label: "App Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_facebook_page_id", label: "Page ID", tipo: "text", placeholder: "1234567890", monoFont: true, helpText: "ID numérico da sua página" },
      { chave: "conector_facebook_page_token", label: "Page Access Token", tipo: "password", placeholder: "••••••••", helpText: "Token de longa duração da página" },
    ],
  },
  {
    id: "instagram",
    nome: "Instagram",
    descricao: "Publicação de posts, stories e reels com métricas de alcance",
    icone: <Instagram className="w-6 h-6" />,
    cor: "text-pink-400",
    corBg: "bg-gradient-to-br from-pink-500/10 to-purple-500/10",
    corBorder: "border-pink-500/20",
    corGlow: "shadow-pink-500/10",
    categoria: "redes_sociais",
    ajuda: "Conecte a conta profissional do Instagram (via Meta Graph API) para publicar e analisar métricas.",
    docUrl: "https://developers.facebook.com/docs/instagram-api/",
    campos: [
      { chave: "conector_instagram_app_id", label: "Meta App ID", tipo: "text", placeholder: "1234567890", obrigatorio: true, monoFont: true, helpText: "Mesmo App ID do Facebook" },
      { chave: "conector_instagram_app_secret", label: "App Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_instagram_account_id", label: "Instagram Account ID", tipo: "text", placeholder: "17841400000000000", monoFont: true },
      { chave: "conector_instagram_access_token", label: "Access Token", tipo: "password", placeholder: "••••••••" },
    ],
  },
  {
    id: "linkedin",
    nome: "LinkedIn",
    descricao: "Publicação profissional e networking para a clínica",
    icone: <Linkedin className="w-6 h-6" />,
    cor: "text-blue-400",
    corBg: "bg-blue-700/10",
    corBorder: "border-blue-700/20",
    corGlow: "shadow-blue-700/10",
    categoria: "redes_sociais",
    ajuda: "Publique conteúdo profissional no LinkedIn da clínica via Posts API v2.",
    docUrl: "https://www.linkedin.com/developers/apps",
    campos: [
      { chave: "conector_linkedin_client_id", label: "Client ID", tipo: "text", placeholder: "xxxxxxxxxxxxxxxx", obrigatorio: true, monoFont: true },
      { chave: "conector_linkedin_client_secret", label: "Client Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_linkedin_org_id", label: "Organization ID", tipo: "text", placeholder: "12345678", monoFont: true, helpText: "ID da página da empresa (opcional)" },
      { chave: "conector_linkedin_access_token", label: "Access Token", tipo: "password", placeholder: "••••••••" },
    ],
  },
  {
    id: "tiktok",
    nome: "TikTok",
    descricao: "Publicação de vídeos curtos e acompanhamento de tendências",
    icone: <Music className="w-6 h-6" />,
    cor: "text-white",
    corBg: "bg-gradient-to-br from-gray-800/50 to-gray-900/50",
    corBorder: "border-white/10",
    corGlow: "shadow-white/5",
    categoria: "redes_sociais",
    ajuda: "Conecte o TikTok for Business para publicar vídeos e acompanhar métricas.",
    docUrl: "https://developers.tiktok.com/",
    campos: [
      { chave: "conector_tiktok_client_id", label: "Client Key", tipo: "text", placeholder: "xxxxxxxxxxxxxxxx", obrigatorio: true, monoFont: true },
      { chave: "conector_tiktok_client_secret", label: "Client Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_tiktok_access_token", label: "Access Token", tipo: "password", placeholder: "••••••••" },
    ],
  },
  {
    id: "google_business",
    nome: "Google Business Profile",
    descricao: "Gestão do perfil da clínica no Google Maps e Google Search",
    icone: <MapPin className="w-6 h-6" />,
    cor: "text-red-400",
    corBg: "bg-red-500/10",
    corBorder: "border-red-500/20",
    corGlow: "shadow-red-500/10",
    categoria: "redes_sociais",
    ajuda: "Gerencie o perfil da clínica no Google, publique atualizações e responda a avaliações.",
    docUrl: "https://console.cloud.google.com/apis/library/mybusinessbusinessinformation.googleapis.com",
    campos: [
      { chave: "conector_gbp_client_id", label: "Client ID", tipo: "text", placeholder: "xxxx.apps.googleusercontent.com", obrigatorio: true, monoFont: true },
      { chave: "conector_gbp_client_secret", label: "Client Secret", tipo: "password", placeholder: "••••••••", obrigatorio: true },
      { chave: "conector_gbp_location_id", label: "Location ID", tipo: "text", placeholder: "locations/1234567890", monoFont: true },
    ],
  },
  {
    id: "google_reviews",
    nome: "Google Reviews",
    descricao: "Monitorização de avaliações e reputação online da clínica",
    icone: <Star className="w-6 h-6" />,
    cor: "text-yellow-400",
    corBg: "bg-yellow-500/10",
    corBorder: "border-yellow-500/20",
    corGlow: "shadow-yellow-500/10",
    categoria: "redes_sociais",
    gratuito: false,
    ajuda: "Acompanhe as avaliações da clínica no Google e receba alertas de novas reviews.",
    campos: [
      { chave: "conector_greviews_place_id", label: "Google Place ID", tipo: "text", placeholder: "ChIJxxxxxxxxxxxxxxx", obrigatorio: true, monoFont: true, helpText: "Encontre em Google Maps → Partilhar → Incorporar" },
      { chave: "conector_greviews_api_key", label: "Google Maps API Key", tipo: "password", placeholder: "AIzaSy...", obrigatorio: true },
    ],
  },
];

// ─── Componente: Toggle Premium ─────────────────────────────────────────────

function TogglePremium({ ativo, onChange, disabled }: { ativo: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-all duration-300 ease-out cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
        ativo
          ? "bg-gradient-to-r from-emerald-500 to-emerald-400 shadow-lg shadow-emerald-500/30"
          : "bg-white/[0.08] hover:bg-white/[0.12]"
      }`}
    >
      <div className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-md transition-all duration-300 ease-out ${
        ativo ? "left-[25px]" : "left-[3px]"
      }`}>
        {ativo && (
          <Check className="w-3 h-3 text-emerald-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
        )}
      </div>
    </button>
  );
}

// ─── Componente: Indicador de Estado ────────────────────────────────────────

function EstadoIndicador({ estado, tamanho = "md" }: { estado: ConectorEstado; tamanho?: "sm" | "md" }) {
  const configs = {
    conectado: { cor: "bg-emerald-400", label: "Conectado", pulse: true, textCor: "text-emerald-400" },
    desconectado: { cor: "bg-gray-500", label: "Desconectado", pulse: false, textCor: "text-gray-400" },
    erro: { cor: "bg-red-400", label: "Erro", pulse: true, textCor: "text-red-400" },
    a_testar: { cor: "bg-amber-400", label: "A testar...", pulse: true, textCor: "text-amber-400" },
  };
  const c = configs[estado];
  const sz = tamanho === "sm" ? "w-2 h-2" : "w-2.5 h-2.5";

  return (
    <div className="flex items-center gap-1.5">
      <div className="relative">
        <div className={`${sz} rounded-full ${c.cor}`} />
        {c.pulse && <div className={`absolute inset-0 ${sz} rounded-full ${c.cor} animate-ping opacity-40`} />}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${c.textCor}`}>{c.label}</span>
    </div>
  );
}

// ─── Componente: Card de Conector (Estilo Premium) ────────────────────────────

function ConectorCard({
  config,
  estado,
  ativo,
  onToggle,
  onTestar,
  onGuardar,
  onExpandir,
  expandido,
  valores,
  onValorChange,
  testeEmCurso,
  testeResultado,
  guardando,
  guardado,
}: {
  config: ConectorConfig;
  estado: ConectorEstado;
  ativo: boolean;
  onToggle: () => void;
  onTestar: () => void;
  onGuardar: () => void;
  onExpandir: () => void;
  expandido: boolean;
  valores: Record<string, string>;
  onValorChange: (chave: string, valor: string) => void;
  testeEmCurso: boolean;
  testeResultado: { sucesso: boolean; mensagem: string } | null;
  guardando: boolean;
  guardado: boolean;
}) {
  const [mostrarSecrets, setMostrarSecrets] = useState<Record<string, boolean>>({});

  return (
    <div className={`group relative rounded-2xl border transition-all duration-300 overflow-hidden ${
      ativo
        ? `${config.corBorder} ${config.corBg} shadow-lg ${config.corGlow}`
        : "border-[var(--border-lighter)] bg-[var(--bg-surface)] hover:border-white/[0.08]"
    } ${expandido ? "ring-1 ring-white/[0.06]" : ""}`}>

      {/* ── Barra superior com gradiente sutil ── */}
      {ativo && estado === "conectado" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400/60 to-transparent" />
      )}
      {ativo && estado === "erro" && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-red-400/60 to-transparent" />
      )}

      {/* ── Header do Card ── */}
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Ícone */}
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-all duration-300 ${
            ativo
              ? `${config.corBg} border ${config.corBorder}`
              : "bg-[var(--bg-overlay)] border border-[var(--border-light)]"
          }`}>
            <div className={ativo ? config.cor : "text-[var(--text-muted)]"}>
              {config.icone}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className={`font-semibold text-sm ${ativo ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"}`}>
                {config.nome}
              </h3>
              {config.gratuito && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                  Gratuito
                </span>
              )}
              {config.provider && (
                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-white/[0.05] text-[var(--text-muted)] border border-white/[0.06]">
                  via {config.provider}
                </span>
              )}
            </div>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed line-clamp-2">
              {config.descricao}
            </p>
            <div className="mt-2">
              <EstadoIndicador estado={ativo ? estado : "desconectado"} tamanho="sm" />
            </div>
          </div>

          {/* Toggle + Expandir */}
          <div className="flex items-center gap-3 shrink-0">
            <TogglePremium ativo={ativo} onChange={onToggle} />
            <button
              onClick={onExpandir}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 cursor-pointer ${
                expandido
                  ? "bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30"
                  : "bg-[var(--bg-overlay)] text-[var(--text-muted)] border border-[var(--border-light)] hover:text-[var(--text-secondary)] hover:border-white/[0.1]"
              }`}
            >
              {expandido ? <ChevronUp className="w-4 h-4" /> : <Settings className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Painel de Configuração Expandido ── */}
      {expandido && (
        <div className="border-t border-[var(--border-lightest)]">
          {/* Ajuda */}
          {config.ajuda && (
            <div className="mx-5 mt-4 flex items-start gap-2 p-3 rounded-xl bg-[#00E5FF]/5 border border-[#00E5FF]/10">
              <Info className="w-3.5 h-3.5 text-[#00E5FF] shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-[#00E5FF]/80 text-xs leading-relaxed">{config.ajuda}</p>
                {config.docUrl && (
                  <a href={config.docUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-[#00E5FF] text-[10px] font-semibold hover:text-[#00E5FF] transition-colors">
                    <ExternalLink className="w-3 h-3" />
                    Ver documentação
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Campos de Configuração */}
          <div className="p-5 space-y-3">
            {config.campos.map(campo => {
              const isSecret = campo.tipo === "password";
              const showSecret = mostrarSecrets[campo.chave];

              return (
                <div key={campo.chave}>
                  <label className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[var(--text-secondary)] text-xs font-semibold">{campo.label}</span>
                    {campo.obrigatorio && <span className="text-red-400 text-xs">*</span>}
                  </label>

                  {campo.tipo === "select" ? (
                    <select
                      value={valores[campo.chave] || campo.opcoes?.[0]?.value || ""}
                      onChange={e => onValorChange(campo.chave, e.target.value)}
                      className="w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:border-[#00E5FF]/50 transition-colors appearance-none cursor-pointer"
                    >
                      {campo.opcoes?.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="relative">
                      <input
                        type={isSecret && !showSecret ? "password" : campo.tipo === "number" ? "number" : "text"}
                        value={valores[campo.chave] || ""}
                        onChange={e => onValorChange(campo.chave, e.target.value)}
                        placeholder={campo.placeholder}
                        className={`w-full bg-[var(--bg-overlay)] border border-[var(--border-light)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[#00E5FF]/50 transition-colors ${
                          isSecret ? "pr-10" : ""
                        } ${campo.monoFont ? "font-mono text-xs" : ""}`}
                      />
                      {isSecret && (
                        <button
                          type="button"
                          onClick={() => setMostrarSecrets(s => ({ ...s, [campo.chave]: !s[campo.chave] }))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                        >
                          {showSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                  )}

                  {campo.helpText && (
                    <p className="text-[var(--text-muted)] text-[10px] mt-1">{campo.helpText}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Resultado do Teste */}
          {testeResultado && (
            <div className={`mx-5 mb-4 flex items-start gap-2 p-3 rounded-xl border ${
              testeResultado.sucesso
                ? "bg-emerald-500/5 border-emerald-500/15"
                : "bg-red-500/5 border-red-500/15"
            }`}>
              {testeResultado.sucesso
                ? <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                : <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              }
              <p className={`text-xs ${testeResultado.sucesso ? "text-emerald-300/80" : "text-red-300/80"}`}>
                {testeResultado.mensagem}
              </p>
            </div>
          )}

          {/* Botões de Ação */}
          <div className="px-5 pb-5 flex gap-2">
            <button
              onClick={onTestar}
              disabled={testeEmCurso}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--bg-overlay)] border border-[var(--border-light)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:border-white/[0.1]"
            >
              {testeEmCurso ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  A testar...
                </>
              ) : (
                <>
                  <Wifi className="w-3.5 h-3.5" />
                  Testar Conexão
                </>
              )}
            </button>

            <button
              onClick={onGuardar}
              disabled={guardando}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                guardado
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400"
                  : "btn-primary"
              }`}
            >
              {guardando ? (
                <>
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                  A guardar...
                </>
              ) : guardado ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  Guardado!
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Guardar
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export function ConectoresPage() {
  const [expandido, setExpandido] = useState<string | null>(null);
  const [valoresLocais, setValoresLocais] = useState<Record<string, Record<string, string>>>({});
  const [testeEmCurso, setTesteEmCurso] = useState<string | null>(null);
  const [testeResultados, setTesteResultados] = useState<Record<string, { sucesso: boolean; mensagem: string }>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [guardados, setGuardados] = useState<Record<string, boolean>>({});

  // Queries
  const listarQuery = trpc.conectores.listar.useQuery();
  const toggleMutation = trpc.conectores.toggleAtivo.useMutation({
    onSuccess: () => listarQuery.refetch(),
  });
  const guardarMutation = trpc.conectores.guardar.useMutation();
  const testarMutation = trpc.conectores.testarConexao.useMutation();
  const detalheQuery = trpc.conectores.obterDetalhe.useQuery(
    { conectorId: expandido || "" },
    { enabled: !!expandido }
  );

  // Sincronizar valores quando detalhe carrega
  useEffect(() => {
    if (detalheQuery.data?.valoresReais && expandido) {
      setValoresLocais(prev => ({
        ...prev,
        [expandido]: { ...detalheQuery.data!.valoresReais },
      }));
    }
  }, [detalheQuery.data, expandido]);

  const handleToggle = (conectorId: string, ativoAtual: boolean) => {
    toggleMutation.mutate({ conectorId, ativo: !ativoAtual });
  };

  const handleExpandir = (conectorId: string) => {
    setExpandido(prev => prev === conectorId ? null : conectorId);
    setTesteResultados(prev => ({ ...prev, [conectorId]: undefined as any }));
  };

  const handleValorChange = (conectorId: string, chave: string, valor: string) => {
    setValoresLocais(prev => ({
      ...prev,
      [conectorId]: { ...(prev[conectorId] || {}), [chave]: valor },
    }));
    setGuardados(prev => ({ ...prev, [conectorId]: false }));
  };

  const handleGuardar = async (conectorId: string) => {
    setGuardando(conectorId);
    try {
      await guardarMutation.mutateAsync({
        conectorId,
        valores: valoresLocais[conectorId] || {},
      });
      setGuardados(prev => ({ ...prev, [conectorId]: true }));
      setTimeout(() => setGuardados(prev => ({ ...prev, [conectorId]: false })), 3000);
      listarQuery.refetch();
    } catch (err) {
      console.error("Erro ao guardar:", err);
    } finally {
      setGuardando(null);
    }
  };

  const handleTestar = async (conectorId: string) => {
    setTesteEmCurso(conectorId);
    setTesteResultados(prev => ({ ...prev, [conectorId]: undefined as any }));
    try {
      // Guardar primeiro para testar com valores atuais
      if (valoresLocais[conectorId]) {
        await guardarMutation.mutateAsync({
          conectorId,
          valores: valoresLocais[conectorId],
        });
      }
      const result = await testarMutation.mutateAsync({ conectorId });
      setTesteResultados(prev => ({ ...prev, [conectorId]: result.resultado }));
      listarQuery.refetch();
    } catch (err: any) {
      setTesteResultados(prev => ({
        ...prev,
        [conectorId]: { sucesso: false, mensagem: parseApiError(err, "Erro ao testar conexão") },
      }));
    } finally {
      setTesteEmCurso(null);
    }
  };

  // Dados
  const dados = listarQuery.data;
  const comunicacaoConectores = CONECTORES.filter(c => c.categoria === "comunicacao");
  const redesSociaisConectores = CONECTORES.filter(c => c.categoria === "redes_sociais");

  const getEstado = (conectorId: string): ConectorEstado => {
    if (testeEmCurso === conectorId) return "a_testar";
    const all = [...(dados?.comunicacao || []), ...(dados?.redesSociais || [])];
    const info = all.find(c => c.id === conectorId);
    return (info?.estado as ConectorEstado) || "desconectado";
  };

  const isAtivo = (conectorId: string): boolean => {
    const all = [...(dados?.comunicacao || []), ...(dados?.redesSociais || [])];
    const info = all.find(c => c.id === conectorId);
    return info?.ativo || false;
  };

  const totalConectados = dados?.totalConectados || 0;
  const totalConectores = dados?.totalConectores || CONECTORES.length;

  return (
    <div className="space-y-6">
      {/* ── Header Premium ── */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-[var(--text-primary)] text-2xl font-bold flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00E5FF] to-[#B388FF] flex items-center justify-center shadow-lg shadow-[#00E5FF]/20">
                <PlugZap className="w-5 h-5 text-white" />
              </div>
              Conectores
            </h1>
            <p className="text-[var(--text-muted)] text-sm mt-1">
              Configure as integrações de comunicação com utentes e redes sociais da clínica
            </p>
          </div>

          {/* Resumo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-overlay)] border border-[var(--border-lighter)]">
              <div className="relative">
                <div className={`w-2.5 h-2.5 rounded-full ${totalConectados > 0 ? "bg-emerald-400" : "bg-gray-500"}`} />
                {totalConectados > 0 && <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping opacity-40" />}
              </div>
              <span className="text-[var(--text-secondary)] text-sm font-medium">
                <span className="text-[var(--text-primary)] font-bold">{totalConectados}</span>
                <span className="text-[var(--text-muted)]"> / {totalConectores}</span>
                <span className="text-[var(--text-muted)] ml-1">ativos</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Barra de Saúde dos Conectores ── */}
      <div className="card-premium p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[var(--text-secondary)] text-xs font-semibold">Conectores Ativos</span>
              <span className="text-[var(--text-muted)] text-xs">{Math.round((totalConectados / Math.max(totalConectores, 1)) * 100)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-[var(--bg-overlay)] overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#00E5FF] to-[#B388FF] transition-all duration-700 ease-out"
                style={{ width: `${(totalConectados / Math.max(totalConectores, 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Mini-indicadores */}
          <div className="flex gap-4 shrink-0">
            <div className="text-center">
              <p className="text-emerald-400 text-lg font-bold">{dados?.comunicacao?.filter(c => c.estado === "conectado").length || 0}</p>
              <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">Comunicação</p>
            </div>
            <div className="w-px h-8 bg-[var(--border-lighter)]" />
            <div className="text-center">
              <p className="text-violet-400 text-lg font-bold">{dados?.redesSociais?.filter(c => c.estado === "conectado").length || 0}</p>
              <p className="text-[var(--text-muted)] text-[9px] font-semibold uppercase tracking-wider">Redes Sociais</p>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECÇÃO: COMUNICAÇÃO CLÍNICA / UTENTE
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <MessageCircle className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold text-sm">Comunicação Clínica / Utente</h2>
            <p className="text-[var(--text-muted)] text-xs">Email, SMS, WhatsApp, Push e Calendários</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {comunicacaoConectores.map(config => (
            <ConectorCard
              key={config.id}
              config={config}
              estado={getEstado(config.id)}
              ativo={isAtivo(config.id)}
              onToggle={() => handleToggle(config.id, isAtivo(config.id))}
              onTestar={() => handleTestar(config.id)}
              onGuardar={() => handleGuardar(config.id)}
              onExpandir={() => handleExpandir(config.id)}
              expandido={expandido === config.id}
              valores={valoresLocais[config.id] || {}}
              onValorChange={(chave, valor) => handleValorChange(config.id, chave, valor)}
              testeEmCurso={testeEmCurso === config.id}
              testeResultado={testeResultados[config.id] || null}
              guardando={guardando === config.id}
              guardado={guardados[config.id] || false}
            />
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          SECÇÃO: REDES SOCIAIS
      ══════════════════════════════════════════════════════════════════════ */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Globe className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-[var(--text-primary)] font-semibold text-sm">Redes Sociais</h2>
            <p className="text-[var(--text-muted)] text-xs">Facebook, Instagram, LinkedIn, TikTok, Google Business e Reviews</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {redesSociaisConectores.map(config => (
            <ConectorCard
              key={config.id}
              config={config}
              estado={getEstado(config.id)}
              ativo={isAtivo(config.id)}
              onToggle={() => handleToggle(config.id, isAtivo(config.id))}
              onTestar={() => handleTestar(config.id)}
              onGuardar={() => handleGuardar(config.id)}
              onExpandir={() => handleExpandir(config.id)}
              expandido={expandido === config.id}
              valores={valoresLocais[config.id] || {}}
              onValorChange={(chave, valor) => handleValorChange(config.id, chave, valor)}
              testeEmCurso={testeEmCurso === config.id}
              testeResultado={testeResultados[config.id] || null}
              guardando={guardando === config.id}
              guardado={guardados[config.id] || false}
            />
          ))}
        </div>
      </div>

      {/* ── Nota informativa ── */}
      <div className="card-premium p-4 border border-[var(--border-lighter)]">
        <div className="flex items-start gap-3">
          <Shield className="w-5 h-5 text-[#00E5FF] shrink-0 mt-0.5" />
          <div>
            <p className="text-[var(--text-secondary)] text-xs font-semibold mb-1">Segurança e Privacidade</p>
            <p className="text-[var(--text-muted)] text-xs leading-relaxed">
              Todas as credenciais são armazenadas de forma encriptada na base de dados. Os tokens de acesso nunca são expostos em logs ou respostas da API.
              As integrações OAuth utilizam o protocolo seguro com refresh tokens automáticos. Conforme com o RGPD.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
