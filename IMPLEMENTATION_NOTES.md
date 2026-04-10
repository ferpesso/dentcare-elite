# Notas de Implementação - Expansão de Links Diretos

## Análise Atual

### Navegação (navigation.ts)
- Financeiro: `/financeiro` — página única sem sub-rotas
- Faturação: `/faturacao` — faturas, recibos, notas de crédito
- Laboratórios: `/laboratorios` — tabs internas: envios, laboratorios, estatisticas

### FinanceiroPage.tsx
- KPIs: Receita, Comissões, Custos, Lucro — NÃO clicáveis
- Tabela de movimentos recentes — link para utente já funciona
- Botão "Ver Todos" — NÃO funcional (sem onClick)
- Sem sistema de tabs
- Sem filtro por tipo de movimento

### Padrão existente de deep-linking
- UtentesPage: usa `?utenteId=X&tab=pagamentos` via URLSearchParams
- LaboratoriosPage: tabs internas `envios | laboratorios | estatisticas` mas sem URL

### Backend (financeiro.ts)
- obterMovimentosRecentesSemData: retorna faturas + tratamentos unificados
- Cada movimento tem: tipo ('Fatura' | 'Tratamento'), estado, utenteId
- obterEstatisticasMensais: receita, comissoes, custos, lucro
- listarFaturas: com filtro por estado

## Plano de Implementação

### 1. navigation.ts - Expandir sub-itens no Administrativo
- Adicionar sub-itens ao Financeiro: Recebimentos, Despesas
- Adicionar link direto para Movimentos Laboratoriais

### 2. FinanceiroPage.tsx - Sistema de tabs com deep-linking
- Tabs: resumo | recebimentos | despesas | todos
- KPIs clicáveis que navegam para a tab correta
- Suporte a ?tab=recebimentos via URL
- Filtros por tipo de movimento

### 3. LaboratoriosPage.tsx - Deep-linking via URL
- Ler ?tab=envios da URL
- Notificações e links navegam para tab específica

### 4. Sidebar.tsx - Suportar sub-itens
- Expandir para renderizar sub-itens opcionalmente

### 5. DashboardPage.tsx - KPIs clicáveis com destino exato
