# Mapeamento: O que existe vs O que falta

## Módulos Existentes (Reutilizáveis)

| Módulo | Ficheiro | Estado | Notas |
|--------|----------|--------|-------|
| Social Publisher | `server/services/socialPublisher.ts` | ✅ Funcional | Instagram/Facebook/LinkedIn/TikTok. APIs v18.0 (OBSOLETA → v21.0) |
| Social Hub Router | `server/routers/social-hub.ts` | ✅ Funcional | CRUD completo, OAuth, métricas, agendamento |
| WhatsApp Service | `server/whatsappService.ts` | ✅ Funcional | Twilio, BullMQ, botões interativos, campanhas |
| WhatsApp Router | `server/routers/whatsapp.ts` | ✅ Funcional | Wrapper tRPC do serviço |
| Marketing Router | `server/routers/marketing.ts` | ✅ Funcional | Campanhas, reativação, follow-up, aniversários |
| IA Service | `server/services/iaService.ts` | ✅ Funcional | Ollama/OpenAI/Gemini/Claude, encriptação |
| IA Router | `server/routers/ia.ts` | ✅ Funcional | Análise imagem, sugestões, briefing, churn |
| IA Preditiva | `server/routers/ia-preditiva.ts` | ✅ Funcional | No-show, projeção financeira, tendências |
| Predictive Engine | `server/ai/predictiveEngine.ts` | ✅ Funcional | Motor preditivo desacoplado |
| Consultas Router | `server/routers/consultas.ts` | ✅ Funcional | CRUD agenda, disponibilidade, conflitos |
| Tratamentos Router | `server/routers/tratamentos.ts` | ✅ Funcional | Evoluções, estatísticas |
| Dashboard Router | `server/routers/dashboard.ts` | ✅ Funcional | KPIs, métricas |
| Financeiro Router | `server/routers/financeiro.ts` | ✅ Funcional | Faturas, pagamentos |

## O que falta implementar

### 1. Groq API como Provider Gratuito
- Ficheiro: `server/services/iaService.ts`
- Adicionar `"groq"` ao tipo `IAProvider`
- Implementar `chamarGroq()` (compatível OpenAI, base URL diferente)
- Custo: 0€ (14.400 req/dia grátis)

### 2. Servidor MCP (Model Context Protocol)
- Ficheiro novo: `server/_core/mcp.ts`
- Endpoint SSE no Express para comunicação MCP
- Registo de todas as Tools (conectores)

### 3. Conectores MCP (Tools)
- Ficheiro novo: `server/mcp/tools/` (diretório com tools)
  - `marketing-tools.ts` — publicar_instagram, publicar_facebook, agendar_publicacao, obter_metricas_sociais
  - `whatsapp-tools.ts` — enviar_whatsapp, enviar_whatsapp_lote, enviar_botoes_interativos
  - `agenda-tools.ts` — prever_faltas_agenda, listar_slots_livres, reagendar_consulta
  - `clinica-tools.ts` — obter_resumo_paciente, registar_evolucao, gerar_relatorio_financeiro

### 4. APIs Obsoletas a Atualizar
- Instagram Graph API: v18.0 → v21.0
- Facebook Pages API: v18.0 → v21.0
- LinkedIn: UGC Posts API → Posts API (v2/posts)

### 5. Melhorias Adicionais (Boas Ideias)
- Google Business Profile connector (reviews, posts)
- Geração de conteúdo por IA para social media
- Rate limiting inteligente para Groq
- Dashboard de monitorização MCP
- Integração IA ↔ Tools com function calling nativo
