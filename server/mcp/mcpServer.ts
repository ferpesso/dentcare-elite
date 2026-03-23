/**
 * MCP Server — Model Context Protocol para DentCare
 * V33 — Servidor MCP com SSE (Server-Sent Events)
 *
 * Este módulo implementa o servidor MCP que:
 * 1. Regista todas as tools (conectores) disponíveis
 * 2. Expõe um endpoint SSE para comunicação em tempo real
 * 3. Processa tool_calls da IA e executa ações reais
 * 4. Integra-se com o Express existente do DentCare
 *
 * Referência: https://modelcontextprotocol.io/docs/learn/architecture
 */

import type { Express, Request, Response } from "express";
import type { MCPTool } from "../services/iaService";

// ─── Tipos MCP ───────────────────────────────────────────────────────────────

export interface MCPToolDefinition {
  name: string;
  description: string;
  parameters: {
    type: "object";
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
      items?: { type: string };
      default?: unknown;
    }>;
    required: string[];
  };
  handler: (args: Record<string, unknown>, context: MCPContext) => Promise<MCPToolResult>;
  category: "marketing" | "whatsapp" | "agenda" | "clinica" | "financeiro" | "analytics";
  requiresAuth: boolean;
}

export interface MCPToolResult {
  success: boolean;
  data?: unknown;
  message?: string;
  error?: string;
}

export interface MCPContext {
  userId?: number;
  userRole?: string;
  clinicaId?: number;
}

// ─── Registo Global de Tools ─────────────────────────────────────────────────

class MCPToolRegistry {
  private tools: Map<string, MCPToolDefinition> = new Map();

  register(tool: MCPToolDefinition): void {
    if (this.tools.has(tool.name)) {
      console.warn(`[MCP] Tool "${tool.name}" já registada. A substituir.`);
    }
    this.tools.set(tool.name, tool);
    console.log(`[MCP] Tool registada: ${tool.name} (${tool.category})`);
  }

  registerMany(tools: MCPToolDefinition[]): void {
    tools.forEach(t => this.register(t));
  }

  get(name: string): MCPToolDefinition | undefined {
    return this.tools.get(name);
  }

  getAll(): MCPToolDefinition[] {
    return Array.from(this.tools.values());
  }

  getByCategory(category: string): MCPToolDefinition[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Converte as tools registadas para o formato OpenAI/Groq function calling
   */
  toOpenAITools(): MCPTool[] {
    return this.getAll().map(tool => ({
      type: "function" as const,
      function: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as Record<string, unknown>,
      },
    }));
  }

  /**
   * Executa uma tool pelo nome
   */
  async execute(
    toolName: string,
    args: Record<string, unknown>,
    context: MCPContext
  ): Promise<MCPToolResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      return { success: false, error: `Tool "${toolName}" não encontrada` };
    }

    if (tool.requiresAuth && !context.userId) {
      return { success: false, error: "Autenticação necessária para esta ação" };
    }

    try {
      console.log(`[MCP] A executar tool: ${toolName}`, JSON.stringify(args).substring(0, 200));
      const result = await tool.handler(args, context);
      console.log(`[MCP] Tool ${toolName} concluída: ${result.success ? "OK" : "ERRO"}`);
      return result;
    } catch (error: any) {
      console.error(`[MCP] Erro ao executar tool ${toolName}:`, error);
      return { success: false, error: 'Erro interno ao executar operação. Tente novamente.' };
    }
  }

  getStats(): {
    total: number;
    porCategoria: Record<string, number>;
    nomes: string[];
  } {
    const porCategoria: Record<string, number> = {};
    this.getAll().forEach(t => {
      porCategoria[t.category] = (porCategoria[t.category] || 0) + 1;
    });
    return {
      total: this.tools.size,
      porCategoria,
      nomes: Array.from(this.tools.keys()),
    };
  }
}

// Instância global do registo
export const mcpRegistry = new MCPToolRegistry();

// ─── SSE Connections ─────────────────────────────────────────────────────────

const sseClients: Map<string, Response> = new Map();

function sendSSEEvent(clientId: string, event: string, data: unknown): void {
  const res = sseClients.get(clientId);
  if (res && !res.writableEnded) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }
}

function broadcastSSE(event: string, data: unknown): void {
  sseClients.forEach((res, clientId) => {
    sendSSEEvent(clientId, event, data);
  });
}

// ─── Express Integration ─────────────────────────────────────────────────────

/**
 * Registar as rotas MCP no Express
 * Deve ser chamado após o authMiddleware
 */
export function registerMCPRoutes(app: Express): void {
  // SSE endpoint para comunicação em tempo real
  app.get("/api/mcp/sse", (req: Request, res: Response) => {
    const clientId = `mcp-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    // Enviar lista de tools disponíveis ao conectar
    res.write(`event: connected\n`);
    res.write(`data: ${JSON.stringify({
      clientId,
      tools: mcpRegistry.getStats(),
      timestamp: new Date().toISOString(),
    })}\n\n`);

    sseClients.set(clientId, res);

    req.on("close", () => {
      sseClients.delete(clientId);
    });
  });

  // Listar todas as tools disponíveis
  app.get("/api/mcp/tools", (_req: Request, res: Response) => {
    const tools = mcpRegistry.getAll().map(t => ({
      name: t.name,
      description: t.description,
      category: t.category,
      requiresAuth: t.requiresAuth,
      parameters: t.parameters,
    }));
    res.json({ success: true, tools, total: tools.length });
  });

  // Obter tools no formato OpenAI/Groq
  app.get("/api/mcp/tools/openai", (_req: Request, res: Response) => {
    res.json({ tools: mcpRegistry.toOpenAITools() });
  });

  // Executar uma tool
  app.post("/api/mcp/execute", async (req: Request, res: Response) => {
    const { tool: toolName, arguments: args } = req.body;

    if (!toolName) {
      return res.status(400).json({ success: false, error: "Nome da tool é obrigatório" });
    }

    const context: MCPContext = {
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      clinicaId: (req as any).user?.clinicaId || 1,
    };

    const result = await mcpRegistry.execute(toolName, args || {}, context);

    // Notificar clientes SSE sobre a execução
    broadcastSSE("tool_executed", {
      tool: toolName,
      success: result.success,
      timestamp: new Date().toISOString(),
    });

    res.json(result);
  });

  // Executar múltiplas tools em sequência (batch)
  app.post("/api/mcp/execute-batch", async (req: Request, res: Response) => {
    const { calls } = req.body;

    if (!Array.isArray(calls)) {
      return res.status(400).json({ success: false, error: "Array de calls é obrigatório" });
    }

    const context: MCPContext = {
      userId: (req as any).user?.id,
      userRole: (req as any).user?.role,
      clinicaId: (req as any).user?.clinicaId || 1,
    };

    const results = [];
    for (const call of calls) {
      const result = await mcpRegistry.execute(call.tool, call.arguments || {}, context);
      results.push({ tool: call.tool, ...result });
    }

    res.json({ success: true, results });
  });

  // Estatísticas do servidor MCP
  app.get("/api/mcp/stats", (_req: Request, res: Response) => {
    res.json({
      success: true,
      stats: mcpRegistry.getStats(),
      sseClients: sseClients.size,
      timestamp: new Date().toISOString(),
    });
  });

  console.log("[MCP] Rotas MCP registadas: /api/mcp/sse, /api/mcp/tools, /api/mcp/execute");
}

// ─── Exportações ─────────────────────────────────────────────────────────────

export { broadcastSSE, sendSSEEvent };
