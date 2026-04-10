/**
 * navigation.ts — Configuração Central da Barra Lateral
 * DentCare V35 → V41 — Expansão de Links Diretos
 *
 * Define a estrutura de navegação da aplicação.
 * Cada categoria agrupa funcionalidades relacionadas.
 * V41: Sub-itens financeiros clicáveis com deep-linking via query params.
 */

export interface NavItem {
  label: string;
  path: string;
  icon: string; // Nome do ícone Lucide
  badge?: string; // Texto de badge opcional (ex: "Novo", "IA")
  description?: string;
  children?: NavItem[]; // V41: Sub-itens para navegação direta
}

export interface NavCategory {
  id: string;
  label: string;
  icon: string;
  items: NavItem[];
}

export const NAVIGATION: NavCategory[] = [
  {
    id: "visao-geral",
    label: "Visão Geral",
    icon: "LayoutDashboard",
    items: [
      {
        label: "Dashboard",
        path: "/dashboard",
        icon: "BarChart3",
        description: "KPIs e métricas em tempo real",
      },
      {
        label: "Agenda",
        path: "/agenda",
        icon: "CalendarDays",
        description: "Gestão de consultas e horários",
      },
      {
        label: "Ligações Pendentes",
        path: "/ligacoes",
        icon: "Phone",
        description: "Confirmações, seguimentos e cobranças",
      },
    ],
  },
  {
    id: "gestao-clinica",
    label: "Gestão Clínica",
    icon: "HeartPulse",
    items: [
      {
        label: "Utentes",
        path: "/utentes",
        icon: "Users",
        description: "Fichas e histórico clínico",
      },
      {
        label: "Odontograma",
        path: "/odontograma",
        icon: "Smile",
        description: "Mapa visual dentário",
      },
      {
        label: "Imagiologia",
        path: "/imagiologia",
        icon: "ScanLine",
        description: "Raio-X e análise por IA",
      },
      {
        label: "Anamnese Digital",
        path: "/anamnese",
        icon: "ClipboardList",
        description: "Formulários e assinatura digital",
      },
    ],
  },
  {
    id: "administrativo",
    label: "Administrativo",
    icon: "Building2",
    items: [
      {
        label: "Financeiro",
        path: "/financeiro",
        icon: "TrendingUp",
        description: "Receitas, despesas e previsões",
        children: [
          {
            label: "Resumo Geral",
            path: "/financeiro?tab=resumo",
            icon: "BarChart3",
            description: "Visão geral financeira",
          },
          {
            label: "Recebimentos",
            path: "/financeiro?tab=recebimentos",
            icon: "ArrowDownCircle",
            description: "Faturas pagas e pagamentos recebidos",
          },
          {
            label: "Despesas",
            path: "/financeiro?tab=despesas",
            icon: "ArrowUpCircle",
            description: "Custos, comissões e materiais",
          },
          {
            label: "Todos os Movimentos",
            path: "/financeiro?tab=movimentos",
            icon: "List",
            description: "Histórico completo de movimentos",
          },
        ],
      },
      {
        label: "Faturação",
        path: "/faturacao",
        icon: "Receipt",
        description: "Faturas, recibos e notas de crédito",
      },
      {
        label: "Stocks",
        path: "/stocks",
        icon: "Package",
        description: "Inventário de materiais",
      },
      {
        label: "Equipa",
        path: "/equipa",
        icon: "UserCog",
        description: "Médicos e funcionários",
      },
      {
        label: "Laboratórios",
        path: "/laboratorios",
        icon: "FlaskConical",
        badge: "Novo",
        description: "Gestão de laboratórios e envios",
        children: [
          {
            label: "Envios",
            path: "/laboratorios?tab=envios",
            icon: "Send",
            description: "Trabalhos enviados e em curso",
          },
          {
            label: "Gestão de Labs",
            path: "/laboratorios?tab=laboratorios",
            icon: "Building2",
            description: "Cadastro de laboratórios",
          },
          {
            label: "Mov. Laboratoriais",
            path: "/laboratorios?tab=estatisticas",
            icon: "TrendingUp",
            description: "Estatísticas e custos laboratoriais",
          },
        ],
      },
    ],
  },
  {
    id: "marketing-ia",
    label: "Marketing & IA",
    icon: "Sparkles",
    items: [
      {
        label: "WhatsApp Marketing",
        path: "/marketing",
        icon: "MessageCircle",
        description: "Campanhas de reativação",
      },
      {
        label: "Redes Sociais",
        path: "/redes-sociais",
        icon: "Share2",
        description: "Facebook e Instagram (100% Gratuito)",
      },
      {
        label: "Assistente IA",
        path: "/assistente-ia",
        icon: "Zap",
        badge: "MCP",
        description: "Agente IA com ações reais (Groq gratuito)",
      },
      {
        label: "IA Preditiva",
        path: "/ia-preditiva",
        icon: "Brain",
        description: "Insights e previsões inteligentes",
      },
      {
        label: "Voice Briefing",
        path: "/voice-briefing",
        icon: "Mic",
        description: "Assistente de voz clínico",
      },
      {
        label: "Alertas de Saúde",
        path: "/alertas",
        icon: "ShieldAlert",
        description: "Monitorização proativa do negócio",
      },
      {
        label: "Score de Saúde",
        path: "/health-score",
        icon: "Heart",
        badge: "V35",
        description: "Score composto de saúde da clínica (0-100)",
      },
      {
        label: "Relatórios",
        path: "/relatorios",
        icon: "FileBarChart",
        badge: "V35.5",
        description: "Relatórios executivos e de retenção de utentes",
      },
    ],
  },
  {
    id: "configuracoes",
    label: "Configurações",
    icon: "Settings",
    items: [
      {
        label: "Conectores",
        path: "/configuracoes/conectores",
        icon: "Zap",
        badge: "V35",
        description: "Comunicação clínica, redes sociais e integrações",
      },
      {
        label: "Sistema",
        path: "/configuracoes/sistema",
        icon: "Settings",
        description: "Clínica, agenda, notificações, segurança e integrações",
      },
      {
        label: "WhatsApp",
        path: "/configuracoes/whatsapp",
        icon: "MessageCircle",
        description: "Integração com Twilio",
      },
      {
        label: "Permissões",
        path: "/configuracoes/permissoes",
        icon: "Lock",
        description: "Roles e controlo de acesso",
      },
      {
        label: "Termos de Consentimento",
        path: "/configuracoes/termos",
        icon: "FileCheck",
        description: "Gestão de termos RGPD",
      },
      {
        label: "Migração de Dados",
        path: "/migracao",
        icon: "Database",
        badge: "Novo",
        description: "Importar dados de outros sistemas (SAFT, CSV)",
      },
    ],
  },
];
