/**
 * parseApiError — Utilitário global para traduzir erros tRPC/Zod em mensagens amigáveis
 * DentCare Elite V35
 *
 * Resolve o problema de erros JSON brutos do Zod serem mostrados ao utilizador.
 * Converte erros técnicos em mensagens claras e legíveis em Português.
 */

/** Mapeamento de nomes de campos para labels amigáveis em PT */
const CAMPO_LABELS: Record<string, string> = {
  // Utentes
  nome: "Nome",
  telemovel: "Telemóvel",
  email: "Email",
  nif: "NIF",
  dataNascimento: "Data de nascimento",
  genero: "Género",
  morada: "Morada",
  cidade: "Cidade",
  codigoPostal: "Código postal",
  pais: "País",
  observacoes: "Observações",
  ativo: "Estado",
  // Consultas
  medicoId: "Médico",
  utenteId: "Utente",
  tipoConsulta: "Tipo de consulta",
  tipoConsultaId: "Tipo de consulta",
  dataHoraInicio: "Data/hora de início",
  dataHoraFim: "Data/hora de fim",
  duracao: "Duração",
  duracaoPadrao: "Duração padrão",
  consultaId: "Consulta",
  estado: "Estado",
  hora: "Hora",
  // Financeiro / Faturação
  descricao: "Descrição",
  valorBruto: "Valor bruto",
  valorBase: "Valor base",
  valorPago: "Valor pago",
  custosDiretos: "Custos diretos",
  faturaId: "Fatura",
  totalParcelas: "Total de parcelas",
  intervaloDias: "Intervalo de dias",
  meses: "Meses",
  limite: "Limite",
  mes: "Mês",
  ano: "Ano",
  // Equipa / Dentistas
  cedulaProfissional: "Cédula profissional",
  especialidade: "Especialidade",
  percentualComissao: "Comissão (%)",
  tipoRemuneracao: "Tipo de remuneração",
  valorDiaria: "Valor diária",
  username: "Nome de utilizador",
  password: "Palavra-passe",
  role: "Cargo",
  // Stocks
  quantidade: "Quantidade",
  quantidadeMinima: "Quantidade mínima",
  unidade: "Unidade",
  categoria: "Categoria",
  delta: "Quantidade",
  motivo: "Motivo",
  // WhatsApp / Comunicações
  telefone: "Telefone",
  mensagem: "Mensagem",
  tipo: "Tipo",
  utenteName: "Nome do utente",
  utenteTelefone: "Telefone do utente",
  // Marketing
  assunto: "Assunto",
  conteudo: "Conteúdo",
  destinatarios: "Destinatários",
  // Configurações
  chave: "Chave",
  valor: "Valor",
  // Genéricos
  id: "ID",
  cor: "Cor",
  ordem: "Ordem",
  token: "Código",
  deviceId: "Dispositivo",
  search: "Pesquisa",
};

/** Mapeamento de códigos de erro Zod para mensagens amigáveis
 * FIX v35.5: Compatibilidade com Zod v4 (origin em vez de type, invalid_format, invalid_value)
 */
const MENSAGENS_ZOD: Record<string, (params?: any) => string> = {
  too_small: (p) => {
    // Zod v4 usa `origin`, Zod v3 usa `type`
    const t = p?.origin || p?.type;
    if (t === "string") {
      if (p?.minimum === 1) return "Este campo é obrigatório";
      return `Deve ter pelo menos ${p?.minimum} caracteres`;
    }
    if (t === "number") {
      if (p?.inclusive && p?.minimum === 0) return "O valor não pode ser negativo";
      if (p?.minimum === 0) return "O valor deve ser maior que zero";
      if (p?.minimum === 1) return "O valor deve ser pelo menos 1";
      return `O valor mínimo é ${p?.minimum}`;
    }
    if (t === "array") {
      return `Deve ter pelo menos ${p?.minimum} item(s)`;
    }
    return "Valor demasiado pequeno";
  },
  too_big: (p) => {
    const t = p?.origin || p?.type;
    if (t === "string") return `Deve ter no máximo ${p?.maximum} caracteres`;
    if (t === "number") return `O valor máximo é ${p?.maximum}`;
    if (t === "array") return `Deve ter no máximo ${p?.maximum} item(s)`;
    return "Valor demasiado grande";
  },
  invalid_type: (p) => {
    if (p?.expected === "number") return "Deve ser um número válido";
    if (p?.expected === "string") return "Deve ser um texto válido";
    if (p?.expected === "boolean") return "Deve ser verdadeiro ou falso";
    return "Tipo de dados inválido";
  },
  // Zod v3: invalid_string
  invalid_string: (p) => {
    if (p?.validation === "email") return "Email inválido";
    if (p?.validation === "url") return "URL inválido";
    if (p?.validation === "uuid") return "Identificador inválido";
    if (p?.validation === "regex") return "Formato inválido";
    return "Formato de texto inválido";
  },
  // Zod v4: invalid_format (substitui invalid_string)
  invalid_format: (p) => {
    if (p?.format === "email") return "Email inválido";
    if (p?.format === "url") return "URL inválido";
    if (p?.format === "uuid") return "Identificador inválido";
    if (p?.format === "regex") return "Formato inválido";
    return "Formato de texto inválido";
  },
  // Zod v3: invalid_enum_value
  invalid_enum_value: () => "Selecione uma opção válida",
  // Zod v4: invalid_value (substitui invalid_enum_value)
  invalid_value: () => "Selecione uma opção válida",
  invalid_date: () => "Data inválida",
  invalid_literal: () => "Valor não corresponde ao esperado",
  custom: (p) => p?.message || "Valor inválido",
  unrecognized_keys: () => "Campos não reconhecidos enviados",
  invalid_union: () => "Valor não corresponde a nenhum formato aceite",
  invalid_union_discriminator: () => "Tipo não reconhecido",
  invalid_arguments: () => "Argumentos inválidos",
  invalid_return_type: () => "Erro interno de processamento",
  not_multiple_of: (p) => `Deve ser múltiplo de ${p?.multipleOf}`,
  not_finite: () => "O valor deve ser um número finito",
};

/** Traduz um código de erro tRPC para uma mensagem amigável */
const TRPC_CODE_MESSAGES: Record<string, string> = {
  BAD_REQUEST: "Dados inválidos",
  UNAUTHORIZED: "Sessão expirada. Por favor, faça login novamente.",
  FORBIDDEN: "Sem permissão para realizar esta ação",
  NOT_FOUND: "Registo não encontrado",
  CONFLICT: "Conflito de dados",
  TIMEOUT: "O pedido demorou demasiado. Tente novamente.",
  TOO_MANY_REQUESTS: "Demasiados pedidos. Aguarde um momento.",
  INTERNAL_SERVER_ERROR: "Erro interno do servidor. Tente novamente mais tarde.",
  SERVICE_UNAVAILABLE: "Serviço temporariamente indisponível. Tente novamente.",
  PRECONDITION_FAILED: "Condição prévia não satisfeita",
  METHOD_NOT_SUPPORTED: "Operação não suportada",
  PARSE_ERROR: "Erro ao processar os dados enviados",
  PAYLOAD_TOO_LARGE: "Os dados enviados são demasiado grandes",
  CLIENT_CLOSED_REQUEST: "O pedido foi cancelado",
  UNPROCESSABLE_CONTENT: "Conteúdo não processável",
};

/**
 * Tenta fazer parse de uma mensagem de erro Zod (que vem como JSON array)
 * e retorna uma mensagem amigável.
 */
function parseZodErrors(message: string): string | null {
  try {
    if (!message.startsWith("[")) return null;
    const parsed = JSON.parse(message);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    const mensagens: string[] = [];

    for (const err of parsed) {
      const campo = err?.path?.length > 0
        ? err.path.map((p: string | number) => CAMPO_LABELS[String(p)] || String(p)).join(" > ")
        : null;

      const code = err?.code || "";
      
      // Se o Zod já tem uma mensagem customizada (definida no schema), usar essa
      const zodMessage = err?.message;
      const isDefaultMessage = !zodMessage || 
        zodMessage === "Required" || 
        zodMessage === "Expected string, received number" ||
        zodMessage === "Expected number, received string" ||
        zodMessage === "Expected number, received nan" ||
        zodMessage.startsWith("String must contain") ||
        zodMessage.startsWith("Number must be") ||
        zodMessage.startsWith("Invalid") ||
        zodMessage.startsWith("Expected ");
      
      let mensagemFinal: string;

      if (!isDefaultMessage && zodMessage) {
        // Mensagem customizada do schema — usar directamente
        mensagemFinal = campo ? `${campo}: ${zodMessage}` : zodMessage;
      } else {
        // Mensagem padrão do Zod — traduzir
        const traduzir = MENSAGENS_ZOD[code];
        const mensagemTraduzida = traduzir
          // FIX v35.5: Passar origin (Zod v4) e format (Zod v4) além dos campos Zod v3
          ? traduzir({ type: err?.type, origin: err?.origin, minimum: err?.minimum, maximum: err?.maximum, inclusive: err?.inclusive, expected: err?.expected, received: err?.received, validation: err?.validation, format: err?.format, multipleOf: err?.multipleOf, message: err?.message })
          : zodMessage || "Valor inválido";

        mensagemFinal = campo ? `${campo}: ${mensagemTraduzida}` : mensagemTraduzida;
      }

      mensagens.push(mensagemFinal);
    }

    return mensagens.join(". ");
  } catch {
    return null;
  }
}

/**
 * Função principal: converte qualquer erro tRPC em mensagem amigável.
 * 
 * Uso:
 *   onError: (e) => setErro(parseApiError(e))
 *   onError: (e) => setErro(parseApiError(e, "Erro ao criar utente"))
 */
export function parseApiError(error: any, fallback?: string): string {
  if (!error) return fallback || "Ocorreu um erro inesperado";

  const message = error?.message || error?.data?.message || "";
  const trpcCode = error?.data?.code || error?.code || "";

  // 1. Tentar fazer parse de erros Zod (JSON array)
  const zodResult = parseZodErrors(message);
  if (zodResult) return zodResult;

  // 2. Se a mensagem já é legível (não é JSON, não é código técnico), usar directamente
  if (message && !message.startsWith("{") && !message.startsWith("[") && message.length < 500) {
    // Verificar se não é uma mensagem técnica genérica
    const isTechnical = /^[A-Z_]+$/.test(message) || 
      message.includes("TRPC") || 
      message.includes("prisma") ||
      message.includes("drizzle") ||
      message.includes("SQL") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ETIMEDOUT") ||
      message.includes("TypeError") ||
      message.includes("ReferenceError") ||
      message.includes("Cannot read properties");
    
    if (!isTechnical) return message;
  }

  // 3. Usar mensagem baseada no código tRPC
  if (trpcCode && TRPC_CODE_MESSAGES[trpcCode]) {
    return TRPC_CODE_MESSAGES[trpcCode];
  }

  // 4. Fallback
  return fallback || "Ocorreu um erro inesperado. Tente novamente.";
}

export default parseApiError;
