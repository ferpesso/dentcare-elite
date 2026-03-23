/**
 * MCP Tools Registration
 * DentCare V35 — 22 Tools (16 originais + 6 novas)
 *
 * Ponto central de registo de todas as tools MCP.
 * Chamado durante o arranque do servidor.
 */

import { mcpRegistry } from "./mcpServer";
import { marketingTools } from "./tools/marketing-tools";
import { whatsappTools } from "./tools/whatsapp-tools";
import { agendaTools } from "./tools/agenda-tools";
import { clinicaTools } from "./tools/clinica-tools";

// V34 — Novas tools (6)
import { analyticsTools } from "./tools/analytics-tools";
import { automationTools } from "./tools/automation-tools";

/**
 * Regista todas as tools MCP no registry global.
 * Deve ser chamado uma vez durante o arranque do servidor.
 */
export function registerAllMCPTools(): void {
  console.log("[MCP] A registar todas as tools...");

  // Marketing e Redes Sociais
  mcpRegistry.registerMany(marketingTools);

  // Comunicação WhatsApp
  mcpRegistry.registerMany(whatsappTools);

  // Gestão de Agenda
  mcpRegistry.registerMany(agendaTools);

  // Clínica e Faturação
  mcpRegistry.registerMany(clinicaTools);

  // V34 — Analytics Avançado (3)
  mcpRegistry.registerMany(analyticsTools);

  // V34 — Automação Inteligente (3)
  mcpRegistry.registerMany(automationTools);

  // Resumo
  const stats = mcpRegistry.getStats();
  console.log(`[MCP] ${stats.total} tools registadas:`);
  Object.entries(stats.porCategoria).forEach(([cat, count]) => {
    console.log(`  → ${cat}: ${count} tools`);
  });
  console.log(`[MCP] Tools disponíveis: ${stats.nomes.join(", ")}`);
}
