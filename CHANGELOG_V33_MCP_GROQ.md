# CHANGELOG V33 — MCP + Groq Integration

**Data:** 17 de Março de 2026
**Versão:** DentCare V33 — IA Gratuita com Ações Reais (MCP + Groq)

---

## Resumo Executivo

Esta versão transforma o DentCare num sistema com **IA autónoma gratuita** capaz de executar **ações reais** na clínica. A IA pode publicar nas redes sociais, enviar WhatsApp, gerir a agenda, aceder a fichas clínicas e gerar relatórios financeiros — tudo via comandos em linguagem natural.

**Custo mensal de IA: 0€** (Groq gratuito com 14.400 requisições/dia)

---

## 1. Integração Groq API (Provider Gratuito)

### Ficheiro: `server/services/iaService.ts` (reescrito)

- **Groq como provider principal** — Llama 3.3 70B via API gratuita
- **Rate limiter inteligente** — Controla 30 RPM e 14.400 req/dia
- **Cadeia de fallback** — Groq → OpenAI → Ollama (automático)
- **Function calling nativo** — Suporte a tool_calls para integração MCP
- **5 providers suportados** — Groq, OpenAI, Ollama, Gemini, Claude
- **Teste de conexão** — Endpoint para verificar estado de cada provider

### Ficheiro: `server/routers/ia.ts` (atualizado)

- **Multi-provider** — `getAIClient()` tenta Groq primeiro, depois OpenAI
- **Listar provedores** — Mostra todos os providers com estado e custo
- **Análise de radiografias** — Usa o melhor provider disponível

---

## 2. Servidor MCP (Model Context Protocol)

### Ficheiro: `server/mcp/mcpServer.ts` (novo)

- **Registry global de tools** — Registo centralizado de todas as capacidades
- **Endpoint SSE** — `/api/mcp/sse` para comunicação em tempo real
- **Execução de tools** — `/api/mcp/execute` e `/api/mcp/execute-batch`
- **Formato OpenAI** — Conversão automática para function calling
- **Estatísticas** — `/api/mcp/stats` com métricas do servidor

### Ficheiro: `server/mcp/registerTools.ts` (novo)

- Ponto central de registo de todas as tools no arranque do servidor

### Ficheiro: `server/mcp/iaAgent.ts` (novo)

- **Agente autónomo** — Loop de até 5 iterações de tool calling
- **System prompt** — Personalizado para clínica dentária em Portugal
- **Histórico de conversa** — Mantém contexto entre mensagens
- **Modo chat simples** — Alternativa sem tools para conversas rápidas

---

## 3. Conectores MCP (16 Tools)

### Marketing e Redes Sociais (6 tools)
**Ficheiro:** `server/mcp/tools/marketing-tools.ts`

| Tool | Descrição |
|------|-----------|
| `publicar_instagram` | Publica post com imagem no Instagram via Graph API v21.0 |
| `publicar_facebook` | Publica post na Página de Facebook via Graph API v21.0 |
| `agendar_publicacao` | Agenda post para data/hora futura em qualquer rede |
| `obter_metricas_sociais` | Métricas de engagement, alcance e melhor post |
| `gerar_conteudo_social` | Gera conteúdo otimizado por plataforma com IA |
| `planear_semana_social` | Planeia e cria posts para a semana inteira |

### Comunicação WhatsApp (4 tools)
**Ficheiro:** `server/mcp/tools/whatsapp-tools.ts`

| Tool | Descrição |
|------|-----------|
| `enviar_whatsapp` | Envia mensagem a paciente específico |
| `enviar_whatsapp_lote` | Campanha em lote (sem consulta 6/12 meses, aniversariantes) |
| `enviar_botoes_interativos` | Mensagem com botões de ação rápida |
| `enviar_confirmacao_consultas` | Confirmação automática das consultas do dia seguinte |

### Gestão de Agenda (3 tools)
**Ficheiro:** `server/mcp/tools/agenda-tools.ts`

| Tool | Descrição |
|------|-----------|
| `prever_faltas_agenda` | Prevê probabilidade de no-show com IA preditiva |
| `listar_slots_livres` | Lista horários disponíveis com filtros |
| `reagendar_consulta` | Reagenda consulta com verificação de conflitos e notificação |

### Clínica e Faturação (3 tools)
**Ficheiro:** `server/mcp/tools/clinica-tools.ts`

| Tool | Descrição |
|------|-----------|
| `obter_resumo_paciente` | Resumo completo com briefing IA (Voice Briefing) |
| `registar_evolucao` | Regista evolução clínica com estruturação por IA |
| `gerar_relatorio_financeiro` | Relatório financeiro com comparação e insights IA |

---

## 4. APIs de Marketing Atualizadas

### Ficheiro: `server/services/socialPublisher.ts` (reescrito)

| Antes (V32) | Depois (V33) |
|-------------|-------------|
| Meta Graph API v18.0 | Meta Graph API **v21.0** |
| LinkedIn UGC Posts API | LinkedIn **Posts API v2** (UGC deprecated) |
| Apenas posts com imagem | **Reels**, **Carrosséis** e posts |
| Sem Google Business | **Google Business Profile** (posts + reviews) |
| Scopes básicos | Scopes expandidos (insights, comments) |

### Ficheiro: `server/routers/social-hub.ts` (atualizado)

- **Facebook OAuth** — `v18.0` → `v21.0`
- **Instagram scopes** — Adicionados `instagram_manage_comments`, `instagram_manage_insights`
- **LinkedIn scopes** — `w_member_social` → `openid profile w_member_social`
- **Google Business** — Novo OAuth flow com scope `business.manage`
- **Schema atualizado** — Enum `plataforma` inclui `google_business`

---

## 5. Frontend — Painel do Assistente IA

### Ficheiro: `client/src/components/IAAgentPanel.tsx` (novo)

- **Interface de chat** — Design moderno com dark mode
- **Modo Agente vs Chat** — Toggle entre IA com ações e conversa simples
- **Sugestões rápidas** — 6 ações pré-definidas para começar
- **Tools executadas** — Badge expansível mostrando ações realizadas
- **Estado do sistema** — Painel colapsável com provider, uso Groq e tools
- **Indicadores visuais** — Ícones por categoria, status de conexão

### Ficheiro: `client/src/pages/IAAgentPage.tsx` (novo)

- Página wrapper para o painel do agente

### Ficheiro: `client/src/navigation.ts` (atualizado)

- **Nova entrada** — "Assistente IA" com badge "MCP" na secção Marketing & IA

### Ficheiro: `client/src/main.tsx` (atualizado)

- **Nova rota** — `/assistente-ia` com proteção de autenticação

---

## 6. Backend — Router tRPC do Agente

### Ficheiro: `server/routers/ia-agent.ts` (novo)

| Endpoint | Descrição |
|----------|-----------|
| `iaAgent.enviarMensagem` | Envia mensagem ao agente com suporte a tools |
| `iaAgent.listarTools` | Lista todas as MCP tools disponíveis |
| `iaAgent.executarTool` | Executa uma tool diretamente (sem IA) |
| `iaAgent.obterEstado` | Estado do sistema: provider, uso, tools |

### Ficheiro: `server/routers.ts` (atualizado)

- Adicionado `iaAgentRouter` ao `appRouter`

### Ficheiro: `server/_core/index.ts` (atualizado)

- MCP tools registadas no arranque do servidor
- Rotas MCP (SSE, execute, stats) montadas no Express

---

## 7. Variáveis de Ambiente (`.env`)

```env
# Novas variáveis V33
GROQ_API_KEY=              # Obter em https://console.groq.com (gratuito)
GROQ_MODEL=llama-3.3-70b-versatile
GOOGLE_CLIENT_ID=          # Google Business Profile
GOOGLE_CLIENT_SECRET=
CLINIC_WEBSITE_URL=https://dentclinic.pt
```

---

## 8. Estrutura de Ficheiros Novos

```
server/
├── mcp/
│   ├── mcpServer.ts          # Servidor MCP com SSE e registry
│   ├── iaAgent.ts             # Agente autónomo com tool calling loop
│   ├── registerTools.ts       # Registo central de todas as tools
│   └── tools/
│       ├── marketing-tools.ts # 6 tools de marketing
│       ├── whatsapp-tools.ts  # 4 tools de WhatsApp
│       ├── agenda-tools.ts    # 3 tools de agenda
│       └── clinica-tools.ts   # 3 tools clínicas/financeiras
├── routers/
│   └── ia-agent.ts            # Router tRPC do agente
client/
├── src/
│   ├── components/
│   │   └── IAAgentPanel.tsx   # Painel de chat do agente
│   └── pages/
│       └── IAAgentPage.tsx    # Página do assistente IA
```

---

## Como Ativar

1. **Obter API key Groq** (gratuita): https://console.groq.com
2. **Adicionar ao `.env`**: `GROQ_API_KEY=gsk_...`
3. **Reiniciar o servidor**
4. **Aceder a** `/assistente-ia` na sidebar
5. **Testar**: "Gera um post para Instagram sobre higiene oral"
