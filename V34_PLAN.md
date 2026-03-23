# DentCare V34 — Plano de Melhorias Criativas (100% Gratuito)

## Análise do Estado Atual (V33)
- 16 MCP tools (marketing, whatsapp, agenda, clínica)
- Agente IA com Groq gratuito + fallback chain
- Dashboard com KPIs, gráficos SVG, alertas
- Design system dark/light premium

## Melhorias Planeadas para V34

### 1. SMART COMMAND BAR (Barra de Comandos Inteligente)
**Ficheiro:** `client/src/components/SmartCommandBar.tsx`
- Barra de comandos estilo Spotlight/Cmd+K
- Pesquisa universal: utentes, consultas, faturas, ações
- Comandos rápidos por voz (Web Speech API — gratuito, nativo do browser)
- Atalhos de teclado para ações frequentes
- Histórico de comandos recentes
- Integração com IA para comandos em linguagem natural

### 2. PATIENT TIMELINE (Linha Temporal do Paciente)
**Ficheiro:** `client/src/components/PatientTimeline.tsx`
- Visualização cronológica completa de cada paciente
- Consultas, tratamentos, pagamentos, comunicações, imagens
- Timeline interativa com zoom e filtros
- Ícones e cores por tipo de evento
- Exportação em PDF da timeline completa

### 3. SMART NOTIFICATIONS CENTER (Centro de Notificações Inteligente)
**Ficheiro:** `client/src/components/SmartNotificationCenter.tsx`
- Centro de notificações em tempo real (SSE já existe)
- Notificações agrupadas por prioridade e categoria
- Ações rápidas diretamente nas notificações
- Badge animado na TopBar com contagem
- Notificações de sistema, clínicas, financeiras, marketing

### 4. CLINIC ANALYTICS DASHBOARD (Dashboard Analítico Avançado)
**Ficheiro:** `client/src/components/ClinicAnalyticsDashboard.tsx`
- Gráficos interativos SVG avançados (sem dependências externas)
- Heatmap de ocupação da agenda (dias/horas)
- Funil de conversão de pacientes (novo → consulta → tratamento → fidelizado)
- Comparação mês-a-mês com sparklines
- Score de saúde da clínica (0-100)

### 5. NOVAS MCP TOOLS (6 tools adicionais — total: 22)
**Ficheiros:** `server/mcp/tools/analytics-tools.ts`, `server/mcp/tools/automation-tools.ts`

#### Analytics Tools (3):
- `analisar_tendencias` — Análise de tendências de tratamentos e receita
- `score_saude_clinica` — Score composto de saúde do negócio
- `comparar_periodos` — Comparação entre períodos com insights IA

#### Automation Tools (3):
- `gerar_lista_reactivacao` — Lista inteligente de pacientes para reativar
- `optimizar_agenda` — Sugestões de otimização de horários
- `gerar_relatorio_semanal` — Relatório semanal automático com insights

### 6. KEYBOARD SHORTCUTS SYSTEM
**Ficheiro:** `client/src/hooks/useKeyboardShortcuts.ts`
- Sistema global de atalhos de teclado
- Ctrl+K: Command Bar
- Ctrl+N: Nova consulta
- Ctrl+P: Pesquisar paciente
- Ctrl+F: Financeiro
- Ctrl+A: Agenda
- Overlay de ajuda com "?"

### 7. ENHANCED IA AGENT PANEL
**Melhorias em:** `client/src/components/IAAgentPanel.tsx`
- Markdown rendering nas respostas da IA
- Animação de typing (typewriter effect)
- Histórico de conversas persistente (localStorage)
- Exportar conversa em texto
- Sugestões contextuais baseadas na última resposta
- Indicador visual de progresso das tools em execução

### 8. CLINIC HEALTH SCORE SERVICE
**Ficheiro:** `server/services/clinicHealthScore.ts`
- Algoritmo composto que avalia:
  - Taxa de ocupação da agenda (peso 25%)
  - Taxa de no-show (peso 15%)
  - Receita vs meta (peso 25%)
  - Retenção de pacientes (peso 20%)
  - Satisfação estimada (peso 15%)
- Score de 0-100 com classificação (Excelente/Bom/Atenção/Crítico)
- Recomendações automáticas por IA

### 9. DATABASE MIGRATION — Novas Tabelas
**Ficheiro:** `drizzle/schema.ts` (extensão)
- `notificacoes` — Tabela de notificações persistentes
- `comandos_rapidos` — Histórico de comandos do utilizador
- `clinic_health_snapshots` — Snapshots diários do score de saúde

### 10. WEEKLY DIGEST EMAIL TEMPLATE
**Ficheiro:** `server/services/weeklyDigest.ts`
- Geração de resumo semanal em HTML
- KPIs da semana, comparação com anterior
- Top 5 pacientes por receita
- Alertas pendentes
- Sugestões de IA para a próxima semana
