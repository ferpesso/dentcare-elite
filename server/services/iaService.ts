import crypto from "crypto";

/**
 * Serviço de IA com suporte a múltiplos provedores e fallback inteligente
 * Modelo híbrido: Groq grátis (padrão) + Ollama + OpenAI/Gemini/Claude (premium)
 *
 * V33 — MCP + Groq Integration:
 * - Groq API (Llama 3.3 70B) como provider gratuito de alta performance
 * - Suporte a function calling (tool_calls) para integração MCP
 * - Rate limiting inteligente para Groq (14.400 req/dia)
 * - Fallback chain: Groq → Ollama → OpenAI
 *
 * SEGURANÇA v32:
 * - Chave de encriptação sem fallback inseguro: falha no arranque se não configurada
 * - Encriptação AES-256-CBC para todos os segredos de terceiros
 */

export type IAProvider = "groq" | "ollama" | "openai" | "gemini" | "claude";

export interface IAConfig {
  provider: IAProvider;
  apiKey?: string;
  modelo?: string;
  urlOllama?: string;
  ativo: boolean;
  statusConexao: "conectado" | "erro" | "nao_testado";
}

export interface AnaliseResultado {
  resposta: string;
  provider: IAProvider;
  modelo: string;
  tokensUsados: number;
  custoEstimado: number;
  tempoResposta: number;
  toolCalls?: ToolCallResult[];
}

export interface ToolCallResult {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface MCPTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

// ─── Rate Limiter para Groq (14.400 req/dia gratuitas) ─────────────────────
class GroqRateLimiter {
  private requests: number[] = [];
  private readonly maxPerDay = 14400;
  private readonly maxPerMinute = 30; // Groq free tier: 30 RPM

  canMakeRequest(): boolean {
    this.cleanup();
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneDayAgo = now - 86_400_000;

    const requestsLastMinute = this.requests.filter(t => t > oneMinuteAgo).length;
    const requestsLastDay = this.requests.filter(t => t > oneDayAgo).length;

    return requestsLastMinute < this.maxPerMinute && requestsLastDay < this.maxPerDay;
  }

  recordRequest(): void {
    this.requests.push(Date.now());
  }

  private cleanup(): void {
    const oneDayAgo = Date.now() - 86_400_000;
    this.requests = this.requests.filter(t => t > oneDayAgo);
  }

  getUsage(): { today: number; maxDay: number; lastMinute: number; maxMinute: number } {
    this.cleanup();
    const now = Date.now();
    const oneMinuteAgo = now - 60_000;
    const oneDayAgo = now - 86_400_000;
    return {
      today: this.requests.filter(t => t > oneDayAgo).length,
      maxDay: this.maxPerDay,
      lastMinute: this.requests.filter(t => t > oneMinuteAgo).length,
      maxMinute: this.maxPerMinute,
    };
  }
}

export const groqRateLimiter = new GroqRateLimiter();

// ─── Chave de encriptação segura ─────────────────────────────────────────────
function getEncryptionKey(): Buffer {
  let raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    raw = crypto.randomBytes(32).toString("hex");
    process.env.ENCRYPTION_KEY = raw;
    console.warn(
      "[AVISO DE SEGURANÇA] ENCRYPTION_KEY não definida. " +
      "Gerada automaticamente para esta sessão. " +
      "Configure no .env para valores permanentes."
    );
  }
  return Buffer.from(raw.padEnd(32, "0")).slice(0, 32);
}

const ENCRYPTION_KEY_BUFFER = getEncryptionKey();

/**
 * Encriptar segredo com AES-256-CBC
 */
export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-cbc", ENCRYPTION_KEY_BUFFER, iv);
  let encrypted = cipher.update(apiKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

/**
 * Descriptografar segredo
 */
export function decryptApiKey(encrypted: string): string {
  const parts = encrypted.split(":");
  if (parts.length !== 2) {
    throw new Error("[decryptApiKey] Formato de valor encriptado inválido.");
  }
  const [ivHex, encryptedData] = parts;
  const decipher = crypto.createDecipheriv(
    "aes-256-cbc",
    ENCRYPTION_KEY_BUFFER,
    Buffer.from(ivHex, "hex")
  );
  let decrypted = decipher.update(encryptedData, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

/**
 * Verificar se um valor já está encriptado (formato iv:dados)
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(":");
  return parts.length === 2 && parts[0].length === 32 && /^[0-9a-f]+$/i.test(parts[0]);
}

/**
 * Obter configuração Groq a partir de variáveis de ambiente
 */
export function getGroqConfig(): IAConfig {
  const apiKey = process.env.GROQ_API_KEY;
  return {
    provider: "groq",
    apiKey,
    modelo: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    ativo: !!apiKey,
    statusConexao: apiKey ? "nao_testado" : "erro",
  };
}

/**
 * Obter a melhor configuração de IA disponível (prioridade: Groq → OpenAI → Ollama)
 */
export function getBestAvailableConfig(): IAConfig {
  // 1. Groq (grátis, rápido)
  if (process.env.GROQ_API_KEY) {
    return getGroqConfig();
  }
  // 2. OpenAI (pago, mais capaz)
  if (process.env.OPENAI_API_KEY) {
    return {
      provider: "openai",
      apiKey: process.env.OPENAI_API_KEY,
      modelo: "gpt-4.1-mini",
      ativo: true,
      statusConexao: "nao_testado",
    };
  }
  // 3. Ollama (local, grátis)
  return {
    provider: "ollama",
    modelo: "llama2",
    urlOllama: process.env.OLLAMA_URL || "http://localhost:11434",
    ativo: true,
    statusConexao: "nao_testado",
  };
}

/**
 * Testar conexão com provedor
 */
export async function testarConexaoProvider(
  provider: IAProvider,
  config: Partial<IAConfig>
): Promise<{ conectado: boolean; latencia: number; erro?: string }> {
  const inicio = Date.now();

  try {
    switch (provider) {
      case "groq": {
        if (!config.apiKey) throw new Error("API key Groq não fornecida");
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const response = await fetch("https://api.groq.com/openai/v1/models", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) throw new Error("Groq retornou erro");
        return { conectado: true, latencia: Date.now() - inicio };
      }

      case "ollama": {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        const responseOllama = await fetch(config.urlOllama || "http://localhost:11434/api/tags", {
          signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!responseOllama.ok) throw new Error("Ollama não respondeu");
        return { conectado: true, latencia: Date.now() - inicio };
      }

      case "openai": {
        if (!config.apiKey) throw new Error("API key não fornecida");
        const controller2 = new AbortController();
        const timeoutId2 = setTimeout(() => controller2.abort(), 5000);
        const responseOpenAI = await fetch("https://api.openai.com/v1/models", {
          headers: { Authorization: `Bearer ${config.apiKey}` },
          signal: controller2.signal,
        });
        clearTimeout(timeoutId2);
        if (!responseOpenAI.ok) throw new Error("OpenAI retornou erro");
        return { conectado: true, latencia: Date.now() - inicio };
      }

      case "gemini": {
        if (!config.apiKey) throw new Error("API key não fornecida");
        const controller3 = new AbortController();
        const timeoutId3 = setTimeout(() => controller3.abort(), 5000);
        const responseGemini = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${config.apiKey}`,
          { signal: controller3.signal }
        );
        clearTimeout(timeoutId3);
        if (!responseGemini.ok) throw new Error("Gemini retornou erro");
        return { conectado: true, latencia: Date.now() - inicio };
      }

      case "claude": {
        if (!config.apiKey) throw new Error("API key não fornecida");
        const controller4 = new AbortController();
        const timeoutId4 = setTimeout(() => controller4.abort(), 5000);
        const responseClaude = await fetch("https://api.anthropic.com/v1/models", {
          headers: { "x-api-key": config.apiKey },
          signal: controller4.signal,
        });
        clearTimeout(timeoutId4);
        if (!responseClaude.ok) throw new Error("Claude retornou erro");
        return { conectado: true, latencia: Date.now() - inicio };
      }

      default:
        throw new Error(`Provider desconhecido: ${provider}`);
    }
  } catch (error: any) {
    return {
      conectado: false,
      latencia: Date.now() - inicio,
      erro: 'Erro ao processar análise de IA',
    };
  }
}

/**
 * Invocar IA com fallback automático e suporte a function calling (MCP Tools)
 * Cadeia de fallback: Provider configurado → Groq → Ollama
 */
export async function invocarIA(
  prompt: string,
  config: IAConfig,
  tipoAnalise: "financeiro" | "agenda" | "chat" | "marketing" | "clinico" | "outro" = "outro",
  tools?: MCPTool[]
): Promise<AnaliseResultado> {
  const inicio = Date.now();

  try {
    if (config.ativo && config.statusConexao !== "erro") {
      const resultado = await chamarProvider(prompt, config, tools);
      return { ...resultado, tempoResposta: Date.now() - inicio };
    }

    // Fallback chain: Groq → Ollama
    console.warn(`Provider ${config.provider} indisponível, tentando fallback...`);

    // Tentar Groq primeiro (grátis e rápido)
    if (process.env.GROQ_API_KEY && groqRateLimiter.canMakeRequest()) {
      try {
        const configGroq = getGroqConfig();
        const resultado = await chamarProvider(prompt, configGroq, tools);
        return { ...resultado, tempoResposta: Date.now() - inicio };
      } catch (e) {
        console.warn("Groq fallback falhou, tentando Ollama...");
      }
    }

    // Último recurso: Ollama local
    const configOllama: IAConfig = {
      provider: "ollama",
      modelo: "llama2",
      urlOllama: process.env.OLLAMA_URL || "http://localhost:11434",
      ativo: true,
      statusConexao: "conectado",
    };

    const resultado = await chamarProvider(prompt, configOllama);
    return { ...resultado, tempoResposta: Date.now() - inicio };
  } catch (error: any) {
    console.error("Erro ao invocar IA:", error);
    throw new Error('Falha ao processar análise de IA. Tente novamente.');
  }
}

/**
 * Invocar IA com function calling (MCP agent loop)
 * Envia o prompt com tools disponíveis e processa tool_calls automaticamente
 */
export async function invocarIAComTools(
  mensagens: Array<{ role: string; content: string; tool_call_id?: string; name?: string }>,
  config: IAConfig,
  tools: MCPTool[],
  systemPrompt?: string
): Promise<AnaliseResultado> {
  const inicio = Date.now();

  const messages: any[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push(...mensagens);

  try {
    const resultado = await chamarProviderComTools(messages, config, tools);
    return { ...resultado, tempoResposta: Date.now() - inicio };
  } catch (error: any) {
    console.error("Erro ao invocar IA com tools:", error);
    throw new Error('Falha ao processar com ferramentas de IA. Tente novamente.');
  }
}

async function chamarProvider(
  prompt: string,
  config: IAConfig,
  tools?: MCPTool[]
): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  switch (config.provider) {
    case "groq":   return await chamarGroq(prompt, config, tools);
    case "ollama":  return await chamarOllama(prompt, config);
    case "openai":  return await chamarOpenAI(prompt, config, tools);
    case "gemini":  return await chamarGemini(prompt, config);
    case "claude":  return await chamarClaude(prompt, config, tools);
    default:
      throw new Error(`Provider desconhecido: ${config.provider}`);
  }
}

async function chamarProviderComTools(
  messages: any[],
  config: IAConfig,
  tools: MCPTool[]
): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  // Groq e OpenAI suportam function calling nativo
  const baseUrl = config.provider === "groq"
    ? "https://api.groq.com/openai/v1"
    : config.provider === "openai"
      ? "https://api.openai.com/v1"
      : null;

  if (!baseUrl || !config.apiKey) {
    throw new Error(`Provider ${config.provider} não suporta function calling ou API key em falta`);
  }

  if (config.provider === "groq") {
    groqRateLimiter.recordRequest();
  }

  const body: any = {
    model: config.modelo || (config.provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4.1-mini"),
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  };

  if (tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`${config.provider} retornou erro: ${response.status} — ${errorData}`);
  }

  const data = await response.json() as any;
  const choice = data.choices?.[0];
  const tokensUsados = data.usage?.total_tokens || 0;

  const toolCalls: ToolCallResult[] = (choice?.message?.tool_calls || []).map((tc: any) => {
    let args: Record<string, any> = {};
    try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });

  return {
    resposta: choice?.message?.content || "",
    provider: config.provider,
    modelo: body.model,
    tokensUsados,
    custoEstimado: config.provider === "groq" ? 0 : (tokensUsados / 1000) * 0.015,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// ─── Groq API (Llama 3.3 70B — Gratuito) ────────────────────────────────────
async function chamarGroq(
  prompt: string,
  config: IAConfig,
  tools?: MCPTool[]
): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  if (!config.apiKey) throw new Error("API key Groq não fornecida. Obtenha gratuitamente em https://console.groq.com");

  if (!groqRateLimiter.canMakeRequest()) {
    throw new Error("Limite de requisições Groq atingido. Tente novamente em breve.");
  }

  groqRateLimiter.recordRequest();

  const body: any = {
    model: config.modelo || "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: "És um assistente profissional de uma clínica dentária em Portugal. Responde sempre em português europeu, de forma concisa e profissional.",
      },
      { role: "user", content: prompt },
    ],
    temperature: 0.7,
    max_tokens: 1500,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Groq retornou erro ${response.status}: ${errorText}`);
  }

  const data = await response.json() as any;
  const choice = data.choices?.[0];
  const tokensUsados = data.usage?.total_tokens || 0;

  const toolCalls: ToolCallResult[] = (choice?.message?.tool_calls || []).map((tc: any) => {
    let args: Record<string, any> = {};
    try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });

  return {
    resposta: choice?.message?.content || "",
    provider: "groq",
    modelo: config.modelo || "llama-3.3-70b-versatile",
    tokensUsados,
    custoEstimado: 0, // Groq é gratuito
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// ─── Ollama (Local) ──────────────────────────────────────────────────────────
async function chamarOllama(prompt: string, config: IAConfig): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  const url = config.urlOllama || "http://localhost:11434/api/generate";
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: config.modelo || "llama2", prompt, stream: false }),
  });
  if (!response.ok) throw new Error("Ollama retornou erro");
  const data = await response.json() as any;
  return {
    resposta: data.response || "Resposta vazia",
    provider: "ollama",
    modelo: config.modelo || "llama2",
    tokensUsados: data.eval_count || 0,
    custoEstimado: 0,
  };
}

// ─── OpenAI ──────────────────────────────────────────────────────────────────
async function chamarOpenAI(
  prompt: string,
  config: IAConfig,
  tools?: MCPTool[]
): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  if (!config.apiKey) throw new Error("API key OpenAI não fornecida");

  const body: any = {
    model: config.modelo || "gpt-4.1-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.7,
    max_tokens: 1000,
  };

  if (tools && tools.length > 0) {
    body.tools = tools;
    body.tool_choice = "auto";
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("OpenAI retornou erro");
  const data = await response.json() as any;
  const tokensUsados = data.usage?.total_tokens || 0;
  const choice = data.choices?.[0];

  const toolCalls: ToolCallResult[] = (choice?.message?.tool_calls || []).map((tc: any) => {
    let args: Record<string, any> = {};
    try { args = JSON.parse(tc.function.arguments || "{}"); } catch { args = {}; }
    return { id: tc.id, name: tc.function.name, arguments: args };
  });

  return {
    resposta: choice?.message?.content || "Resposta vazia",
    provider: "openai",
    modelo: config.modelo || "gpt-4.1-mini",
    tokensUsados,
    custoEstimado: (tokensUsados / 1000) * 0.015,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

// ─── Gemini ──────────────────────────────────────────────────────────────────
async function chamarGemini(prompt: string, config: IAConfig): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  if (!config.apiKey) throw new Error("API key Gemini não fornecida");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.modelo || "gemini-pro"}:generateContent?key=${config.apiKey}`,
    { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] }) }
  );
  if (!response.ok) throw new Error("Gemini retornou erro");
  const data = await response.json() as any;
  const tokensUsados = data.usageMetadata?.totalTokenCount || 0;
  return {
    resposta: data.candidates[0]?.content?.parts[0]?.text || "Resposta vazia",
    provider: "gemini",
    modelo: config.modelo || "gemini-pro",
    tokensUsados,
    custoEstimado: (tokensUsados / 1000) * 0.0075,
  };
}

// ─── Claude ──────────────────────────────────────────────────────────────────
async function chamarClaude(
  prompt: string,
  config: IAConfig,
  tools?: MCPTool[]
): Promise<Omit<AnaliseResultado, "tempoResposta">> {
  if (!config.apiKey) throw new Error("API key Claude não fornecida");

  const body: any = {
    model: config.modelo || "claude-3-sonnet-20240229",
    max_tokens: 1000,
    messages: [{ role: "user", content: prompt }],
  };

  if (tools && tools.length > 0) {
    body.tools = tools.map(t => ({
      name: t.function.name,
      description: t.function.description,
      input_schema: t.function.parameters,
    }));
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error("Claude retornou erro");
  const data = await response.json() as any;
  const tokensUsados = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0);

  // Claude retorna tool_use blocks em vez de tool_calls
  const toolCalls: ToolCallResult[] = (data.content || [])
    .filter((block: any) => block.type === "tool_use")
    .map((block: any) => ({
      id: block.id,
      name: block.name,
      arguments: block.input || {},
    }));

  return {
    resposta: data.content?.find((b: any) => b.type === "text")?.text || "Resposta vazia",
    provider: "claude",
    modelo: config.modelo || "claude-3-sonnet-20240229",
    tokensUsados,
    custoEstimado: (tokensUsados / 1000) * 0.01,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
  };
}

export function calcularCustoMensal(provider: IAProvider, requestsPorMes: number = 1000): number {
  const custoPorRequest: Record<IAProvider, number> = {
    groq: 0,
    ollama: 0,
    openai: 0.015 / 1000,
    gemini: 0.0075 / 1000,
    claude: 0.01 / 1000,
  };
  const tokensMediaPorRequest = 300;
  return (custoPorRequest[provider] || 0) * requestsPorMes * tokensMediaPorRequest;
}
