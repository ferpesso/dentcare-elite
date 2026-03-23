/**
 * IA Agent — Agente Autónomo com MCP Tools
 * DentCare V33
 *
 * Este módulo implementa o "agente" de IA que:
 * 1. Recebe uma mensagem do utilizador
 * 2. Envia para o LLM (Groq/OpenAI) com as tools disponíveis
 * 3. Processa tool_calls automaticamente
 * 4. Devolve a resposta final ao utilizador
 *
 * Suporta loops de até 5 iterações de tool calling.
 */

import { mcpRegistry, type MCPContext } from "./mcpServer";
import {
  invocarIAComTools,
  getBestAvailableConfig,
  type IAConfig,
  type MCPTool,
} from "../services/iaService";

const MAX_TOOL_ITERATIONS = 5;

const SYSTEM_PROMPT_PT = `És a assistente de IA da clínica dentária DentClinic Portugal, integrada no sistema DentCare.
Respondes sempre em português europeu, de forma profissional e concisa.

As tuas capacidades incluem:
- Publicar e agendar conteúdo nas redes sociais (Instagram, Facebook)
- Enviar mensagens WhatsApp a pacientes (lembretes, campanhas, follow-ups)
- Gerir a agenda (verificar disponibilidade, reagendar consultas, prever faltas)
- Aceder a fichas de pacientes e registar evoluções clínicas
- Gerar relatórios financeiros e insights de negócio
- Gerar conteúdo de marketing otimizado para cada plataforma

Regras importantes:
1. Antes de executar ações que afetam pacientes (enviar mensagens, reagendar), confirma com o utilizador.
2. Nunca inventes dados clínicos — usa apenas informação da base de dados.
3. Para ações de marketing, sugere o conteúdo antes de publicar.
4. Sê proativa em sugerir melhorias e ações baseadas nos dados.
5. Respeita a privacidade dos pacientes (RGPD).`;

export interface AgentMessage {
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface AgentResponse {
  resposta: string;
  toolsExecutadas: Array<{
    nome: string;
    resultado: unknown;
    sucesso: boolean;
  }>;
  provider: string;
  modelo: string;
  custoEstimado: number;
  iteracoes: number;
}

/**
 * Processa uma mensagem do utilizador com o agente IA + MCP Tools
 */
export async function processarMensagemAgente(
  mensagemUtilizador: string,
  context: MCPContext,
  historicoConversa: AgentMessage[] = [],
  configOverride?: IAConfig
): Promise<AgentResponse> {
  const config = configOverride || getBestAvailableConfig();
  const tools: MCPTool[] = mcpRegistry.toOpenAITools();

  // Construir histórico de mensagens
  const mensagens: AgentMessage[] = [
    ...historicoConversa,
    { role: "user", content: mensagemUtilizador },
  ];

  const toolsExecutadas: AgentResponse["toolsExecutadas"] = [];
  let iteracao = 0;
  let respostaFinal = "";
  let providerUsado = config.provider;
  let modeloUsado = config.modelo || "";
  let custoTotal = 0;

  while (iteracao < MAX_TOOL_ITERATIONS) {
    iteracao++;

    try {
      const resultado = await invocarIAComTools(
        mensagens,
        config,
        tools,
        SYSTEM_PROMPT_PT
      );

      providerUsado = resultado.provider;
      modeloUsado = resultado.modelo;
      custoTotal += resultado.custoEstimado;

      // Se não há tool_calls, a IA terminou
      if (!resultado.toolCalls || resultado.toolCalls.length === 0) {
        respostaFinal = resultado.resposta;
        break;
      }

      // Processar cada tool_call
      // Adicionar a mensagem do assistente com tool_calls ao histórico
      mensagens.push({
        role: "assistant",
        content: resultado.resposta || "",
      });

      for (const toolCall of resultado.toolCalls) {
        console.log(`[IA Agent] Tool call: ${toolCall.name}`, toolCall.arguments);

        const toolResult = await mcpRegistry.execute(
          toolCall.name,
          toolCall.arguments,
          context
        );

        toolsExecutadas.push({
          nome: toolCall.name,
          resultado: toolResult.data || toolResult.message,
          sucesso: toolResult.success,
        });

        // Adicionar resultado da tool ao histórico
        mensagens.push({
          role: "tool",
          content: JSON.stringify(toolResult),
          tool_call_id: toolCall.id,
          name: toolCall.name,
        });
      }

      // Continuar o loop para a IA processar os resultados das tools
    } catch (error: any) {
      console.error(`[IA Agent] Erro na iteração ${iteracao}:`, error);
      respostaFinal = `Desculpe, ocorreu um erro ao processar o seu pedido: ${error.message}`;
      break;
    }
  }

  // Se atingiu o limite de iterações sem resposta final
  if (!respostaFinal && iteracao >= MAX_TOOL_ITERATIONS) {
    respostaFinal = "O processamento atingiu o limite de iterações. As ações solicitadas foram executadas, mas não foi possível gerar uma resposta final.";
  }

  return {
    resposta: respostaFinal,
    toolsExecutadas,
    provider: providerUsado,
    modelo: modeloUsado,
    custoEstimado: custoTotal,
    iteracoes: iteracao,
  };
}

/**
 * Processa uma mensagem simples sem tools (modo chat básico)
 */
export async function processarMensagemSimples(
  mensagem: string,
  configOverride?: IAConfig
): Promise<{ resposta: string; provider: string; modelo: string }> {
  const config = configOverride || getBestAvailableConfig();

  const resultado = await invocarIAComTools(
    [{ role: "user", content: mensagem }],
    config,
    [],
    SYSTEM_PROMPT_PT
  );

  return {
    resposta: resultado.resposta,
    provider: resultado.provider,
    modelo: resultado.modelo,
  };
}
