/**
 * ConfigContext.tsx — Contexto Global de Configurações
 * DentCare Elite V32.3 — Propagação Automática
 *
 * Este contexto carrega TODAS as configurações da BD e disponibiliza-as
 * a qualquer componente da aplicação via useConfig().
 * Quando as configurações são alteradas na SistemaPage, o refetch
 * propaga automaticamente as mudanças por todo o programa.
 */
import React, { createContext, useContext, useMemo, useCallback, useEffect } from "react";
import i18n from "../i18n";
import { buildTimbradoConfig, type TimbradoConfig } from "../lib/pdfTimbrado";
import { trpc } from "../lib/trpc";

// ─── Tipos ───────────────────────────────────────────────────────────────────
export interface ConfiguracaoClinica {
  // Identidade da Clínica
  nome_clinica: string;
  email_clinica: string;
  telefone_clinica: string;
  morada_clinica: string;
  cidade_clinica: string;
  codigo_postal_clinica: string;
  pais_clinica: string;
  nif_clinica: string;
  website_clinica: string;
  logo_clinica: string; // Base64 data URL da logo da clínica
  
  // Horário e Agenda
  horario_abertura: string;
  horario_encerramento: string;
  dias_funcionamento: string; // JSON array
  duracao_slot: string;
  intervalo_consultas: string;
  slots_por_dia: string;
  antecedencia_minima_marcacao: string;
  antecedencia_maxima_marcacao: string;
  
  // Metas e Objetivos
  meta_receita_diaria: string;
  meta_receita_mensal: string;
  meta_consultas_dia: string;
  
  // Aparência e Localização
  idioma: string;
  moeda: string;
  simbolo_moeda: string;
  fuso_horario: string;
  formato_data: string;
  formato_hora: string;
  
  // Notificações
  notif_email: string;
  notif_sms: string;
  notif_whatsapp: string;
  notif_lembretes: string;
  notif_lembretes_horas: string;
  notif_aniversarios: string;
  notif_pagamentos_atraso: string;
  notif_pagamentos_atraso_dias: string;
  notif_stocks_baixo: string;
  notif_stocks_minimo: string;
  notif_consultas_canceladas: string;
  notif_novos_utentes: string;
  
  // Segurança
  seguranca_2fa: string;
  seguranca_sessao_timeout: string;
  seguranca_log_auditoria: string;
  seguranca_ip_whitelist: string;
  seguranca_ips_permitidos: string;
  seguranca_tentativas_login: string;
  seguranca_bloqueio_minutos: string;
  
  // Integrações
  whatsapp_account_sid: string;
  whatsapp_auth_token: string;
  whatsapp_number: string;
  whatsapp_ativo: string;
  mbway_ativo: string;
  mbway_api_key: string;
  at_ativo: string;
  at_nif: string;
  at_senha_comunicacao: string;
  
  // Faturação
  faturacao_serie: string;
  faturacao_proximo_numero: string;
  faturacao_taxa_iva: string;
  faturacao_observacoes_padrao: string;
  faturacao_vencimento_dias: string;
  
  // Campos genéricos
  [key: string]: string;
}

// Valores padrão inteligentes para clínica dentária em Portugal
export const CONFIG_DEFAULTS: ConfiguracaoClinica = {
  nome_clinica: "Clínica Dentária",
  email_clinica: "",
  telefone_clinica: "",
  morada_clinica: "",
  cidade_clinica: "",
  codigo_postal_clinica: "",
  pais_clinica: "Portugal",
  nif_clinica: "",
  website_clinica: "",
  logo_clinica: "",
  
  horario_abertura: "09:00",
  horario_encerramento: "18:00",
  dias_funcionamento: "[1,2,3,4,5]",
  duracao_slot: "30",
  intervalo_consultas: "0",
  slots_por_dia: "15",
  antecedencia_minima_marcacao: "2",
  antecedencia_maxima_marcacao: "90",
  
  meta_receita_diaria: "500",
  meta_receita_mensal: "10000",
  meta_consultas_dia: "15",
  
  idioma: "pt-PT",
  moeda: "EUR",
  simbolo_moeda: "€",
  fuso_horario: "Europe/Lisbon",
  formato_data: "dd/MM/yyyy",
  formato_hora: "HH:mm",
  
  notif_email: "true",
  notif_sms: "false",
  notif_whatsapp: "true",
  notif_lembretes: "true",
  notif_lembretes_horas: "24",
  notif_aniversarios: "true",
  notif_pagamentos_atraso: "true",
  notif_pagamentos_atraso_dias: "30",
  notif_stocks_baixo: "true",
  notif_stocks_minimo: "5",
  notif_consultas_canceladas: "true",
  notif_novos_utentes: "false",
  
  seguranca_2fa: "false",
  seguranca_sessao_timeout: "60",
  seguranca_log_auditoria: "true",
  seguranca_ip_whitelist: "false",
  seguranca_ips_permitidos: "",
  seguranca_tentativas_login: "5",
  seguranca_bloqueio_minutos: "15",
  
  whatsapp_account_sid: "",
  whatsapp_auth_token: "",
  whatsapp_number: "",
  whatsapp_ativo: "false",
  mbway_ativo: "false",
  mbway_api_key: "",
  at_ativo: "false",
  at_nif: "",
  at_senha_comunicacao: "",
  
  faturacao_serie: "FT",
  faturacao_proximo_numero: "1",
  faturacao_taxa_iva: "0",
  faturacao_observacoes_padrao: "Isento de IVA ao abrigo do art.º 9.º do CIVA",
  faturacao_vencimento_dias: "30",
};

// Mapeamento moeda -> símbolo
export const MOEDA_SIMBOLOS: Record<string, string> = {
  EUR: "\u20AC",
  BRL: "R$",
  GBP: "\u00A3",
  USD: "$",
  CHF: "CHF",
  AOA: "Kz",
  MZN: "MT",
  CVE: "$",
};

// ─── Context ─────────────────────────────────────────────────────────────────
interface ConfigContextType {
  config: ConfiguracaoClinica;
  isLoading: boolean;
  isError: boolean;
  refetch: () => void;
  getConfig: (chave: string, fallback?: string) => string;
  getConfigBool: (chave: string) => boolean;
  getConfigNum: (chave: string) => number;
  getConfigJson: <T = any>(chave: string) => T | null;
  formatMoeda: (valor: number) => string;
  nomeClinica: string;
  simboloMoeda: string;
  logoClinica: string;
  diasFuncionamento: number[];
  timbradoConfig: TimbradoConfig;
}

const ConfigContext = createContext<ConfigContextType | undefined>(undefined);

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const configQuery = trpc.configuracoes.obter.useQuery(undefined, {
    staleTime: 1000 * 60 * 2, // 2 minutos
    refetchOnWindowFocus: true,
    retry: 1,
    // Silenciar erros de autenticação (utilizador não logado)
    retryDelay: 2000,
  });

  const config = useMemo<ConfiguracaoClinica>(() => {
    const base = { ...CONFIG_DEFAULTS };
    if (configQuery.data?.configuracoes) {
      const dbConfig = configQuery.data.configuracoes as Record<string, string>;
      for (const [key, val] of Object.entries(dbConfig)) {
        if (val !== undefined && val !== null && val !== "") {
          base[key] = String(val);
        }
      }
    }
    // Sincronizar símbolo da moeda
    base.simbolo_moeda = MOEDA_SIMBOLOS[base.moeda] || base.moeda;
    return base;
  }, [configQuery.data]);

  // Sincronizar idioma com i18n quando carregado da BD
  useEffect(() => {
    if (config.idioma && config.idioma !== i18n.language) {
      i18n.changeLanguage(config.idioma);
    }
  }, [config.idioma]);

  const getConfig = useCallback((chave: string, fallback?: string): string => {
    return config[chave] ?? fallback ?? CONFIG_DEFAULTS[chave] ?? "";
  }, [config]);

  const getConfigBool = useCallback((chave: string): boolean => {
    const val = config[chave];
    return val === "true" || val === "1";
  }, [config]);

  const getConfigNum = useCallback((chave: string): number => {
    return parseFloat(config[chave]) || 0;
  }, [config]);

  const getConfigJson = useCallback(<T = any,>(chave: string): T | null => {
    try {
      return JSON.parse(config[chave]) as T;
    } catch {
      return null;
    }
  }, [config]);

  const formatMoeda = useCallback((valor: number): string => {
    const simbolo = MOEDA_SIMBOLOS[config.moeda] || config.moeda;
    const locale = config.idioma || "pt-PT";
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: config.moeda || "EUR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(valor);
    } catch {
      return `${simbolo}${valor.toFixed(2)}`;
    }
  }, [config.moeda, config.idioma]);

  const nomeClinica = config.nome_clinica || "Clínica Dentária";
  const simboloMoeda = MOEDA_SIMBOLOS[config.moeda] || "€";
  const logoClinica = config.logo_clinica || "";

  const timbradoConfig = useMemo<TimbradoConfig>(() => buildTimbradoConfig(config), [config]);

  const diasFuncionamento = useMemo(() => {
    try {
      return JSON.parse(config.dias_funcionamento) as number[];
    } catch {
      return [1, 2, 3, 4, 5];
    }
  }, [config.dias_funcionamento]);

  // FIX V35.5: Memoizar o value do contexto para evitar re-renders em cascata
  // em todos os consumidores (Sidebar, TopBar, páginas) quando o ConfigProvider re-renderiza
  const value = useMemo<ConfigContextType>(() => ({
    config,
    isLoading: configQuery.isLoading,
    isError: configQuery.isError,
    refetch: configQuery.refetch,
    getConfig,
    getConfigBool,
    getConfigNum,
    getConfigJson,
    formatMoeda,
    nomeClinica,
    simboloMoeda,
    logoClinica,
    diasFuncionamento,
    timbradoConfig,
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [config, configQuery.isLoading, configQuery.isError, configQuery.refetch, getConfig, getConfigBool, getConfigNum, getConfigJson, formatMoeda, nomeClinica, simboloMoeda, logoClinica, diasFuncionamento, timbradoConfig]);

  return (
    <ConfigContext.Provider value={value}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  const context = useContext(ConfigContext);
  if (!context) {
    // Retornar defaults seguros se fora do Provider (ex: login page)
    return {
      config: { ...CONFIG_DEFAULTS },
      isLoading: false,
      isError: false,
      refetch: () => {},
      getConfig: (chave: string, fallback?: string) => CONFIG_DEFAULTS[chave] ?? fallback ?? "",
      getConfigBool: (chave: string) => CONFIG_DEFAULTS[chave] === "true",
      getConfigNum: (chave: string) => parseFloat(CONFIG_DEFAULTS[chave]) || 0,
      getConfigJson: <T = any,>(_chave: string): T | null => null,
      formatMoeda: (valor: number) => `\u20AC${valor.toFixed(2)}`,
      nomeClinica: CONFIG_DEFAULTS.nome_clinica,
      simboloMoeda: "\u20AC",
      logoClinica: "",
      diasFuncionamento: [1, 2, 3, 4, 5],
      timbradoConfig: buildTimbradoConfig(CONFIG_DEFAULTS),
    } as ConfigContextType;
  }
  return context;
}
