/**
 * Router de IA Agent — Assistente Autónomo com MCP Tools
 * DentCare V33
 *
 * Endpoint tRPC que expõe o agente IA ao frontend.
 * O agente pode executar ações reais via MCP tools.
 * FIX V35.5: Adicionado controlo de acesso RBAC nos endpoints sensíveis.
 */

import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { processarMensagemAgente, processarMensagemSimples, type AgentMessage } from "../mcp/iaAgent";
import { mcpRegistry } from "../mcp/mcpServer";
import { getBestAvailableConfig, groqRateLimiter, testarConexaoProvider } from "../services/iaService";
import type { MCPContext } from "../mcp/mcpServer";
import { hasPermission } from "../rbac";

export const iaAgentRouter = router({
  /**
   * Enviar mensagem ao agente IA (com suporte a MCP tools)
   */
  enviarMensagem: protectedProcedure
    .input(z.object({
      mensagem: z.string().min(1).max(5000),
      historico: z.array(z.object({
        role: z.enum(["user", "assistant", "system", "tool"]),
        content: z.string(),
        tool_call_id: z.string().optional(),
        name: z.string().optional(),
      })).optional(),
      modoTools: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para utilizar o Assistente IA" });
      }
      const context: MCPContext = {
        userId: ctx.user.id,
        userRole: ctx.user.role,
        clinicaId: (ctx.user as any).clinicaId || 1,
      };

      try {
        if (input.modoTools) {
          const resultado = await processarMensagemAgente(
            input.mensagem,
            context,
            (input.historico || []) as AgentMessage[]
          );

          return {
            success: true,
            resposta: resultado.resposta,
            toolsExecutadas: resultado.toolsExecutadas,
            provider: resultado.provider,
            modelo: resultado.modelo,
            custoEstimado: resultado.custoEstimado,
            iteracoes: resultado.iteracoes,
          };
        } else {
          const resultado = await processarMensagemSimples(input.mensagem);
          return {
            success: true,
            resposta: resultado.resposta,
            toolsExecutadas: [],
            provider: resultado.provider,
            modelo: resultado.modelo,
            custoEstimado: 0,
            iteracoes: 1,
          };
        }
      } catch (error: any) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Erro no agente IA. Verifique a configuração do provider de IA.",
        });
      }
    }),

  /**
   * Listar tools MCP disponíveis
   */
  listarTools: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.read")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para listar tools de IA" });
      }
      const tools = mcpRegistry.getAll();
      return {
        success: true,
        tools: tools.map(t => ({
          name: t.name,
          description: t.description,
          category: t.category,
          requiresAuth: t.requiresAuth,
        })),
        stats: mcpRegistry.getStats(),
      };
    }),

  /**
   * Executar uma tool MCP diretamente (sem passar pela IA)
   * Requer permissão de admin — execução direta de tools é uma operação privilegiada.
   */
  executarTool: protectedProcedure
    .input(z.object({
      toolName: z.string(),
      arguments: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.view_all")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para executar tools de IA diretamente" });
      }
      const context: MCPContext = {
        userId: ctx.user.id,
        userRole: ctx.user.role,
        clinicaId: (ctx.user as any).clinicaId || 1,
      };

      const resultado = await mcpRegistry.execute(
        input.toolName,
        input.arguments || {},
        context
      );

      return resultado;
    }),

  /**
   * Obter estado do sistema de IA
   * Requer permissão de admin — expõe informação sobre providers e chaves configuradas.
   */
  obterEstado: protectedProcedure
    .query(async ({ ctx }) => {
      if (!hasPermission(ctx.user, "dashboard.view_all")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para ver o estado do sistema de IA" });
      }
      const config = getBestAvailableConfig();
      const groqUsage = groqRateLimiter.getUsage();

      // Testar conexão do provider ativo
      let statusConexao: { conectado: boolean; latencia: number; erro?: string } = { conectado: false, latencia: 0, erro: "" };
      try {
        statusConexao = await testarConexaoProvider(config.provider, config);
      } catch {}

      return {
        success: true,
        provider: {
          nome: config.provider,
          modelo: config.modelo,
          ativo: config.ativo,
          statusConexao,
        },
        groq: {
          configurado: !!process.env.GROQ_API_KEY,
          uso: groqUsage,
        },
        mcp: {
          stats: mcpRegistry.getStats(),
        },
        provedoresDisponiveis: [
          { nome: "groq", configurado: !!process.env.GROQ_API_KEY, custo: "Gratuito (14.400 req/dia)", modelo: "Llama 3.3 70B" },
          { nome: "openai", configurado: !!process.env.OPENAI_API_KEY, custo: "Pago", modelo: "GPT-4.1 Mini" },
          { nome: "ollama", configurado: true, custo: "Gratuito (local)", modelo: "Llama 2" },
          { nome: "gemini", configurado: !!process.env.GEMINI_API_KEY, custo: "Pago", modelo: "Gemini Pro" },
          { nome: "claude", configurado: !!process.env.ANTHROPIC_API_KEY, custo: "Pago", modelo: "Claude 3 Sonnet" },
        ],
      };
    }),
});
