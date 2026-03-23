# DentCare Elite V32.1 — CHANGELOG

**Data:** 04 de Março de 2026
**Tipo:** Hotfix + Melhorias para Produção
**Foco:** Módulo Financeiro + Ficha do Utente

---

## Módulo Financeiro — Correções Críticas

### Bugs Corrigidos

| # | Bug | Impacto | Ficheiro |
|---|-----|---------|----------|
| 1 | **Botão "Registar Tratamento" lançava erro** — chamava `financeiro.registarTratamento` (deprecated) | Bloqueante | `FinanceiroPage.tsx` |
| 2 | **PDF com texto invisível** — texto branco sobre fundo branco após KPIs | Grave | `FinanceiroPage.tsx` |
| 3 | **Seletor de mês invisível em tema claro** — usava classes `bg-white/[0.04]` hardcoded | Moderado | `FinanceiroPage.tsx` |
| 4 | **Consultas Realizadas e Utentes Novos sempre 0** — valores hardcoded no backend | Grave | `financeiro.ts` |
| 5 | **Gráfico não mostrava evolução** — filtrava apenas 1 mês | Moderado | `financeiro.ts` |

### Melhorias Implementadas

- **Novo endpoint `obterEvolucaoMensal`** — retorna dados dos últimos N meses para gráfico AreaChart
- **Novo endpoint `obterMovimentosRecentes`** — retorna tratamentos + faturas com nomes de utentes/médicos
- **Tabela de Movimentos Recentes** — com filtros (Todos/Tratamentos/Faturas) e pesquisa
- **Gráfico de Evolução** — AreaChart com gradientes (Receita, Lucro, Comissões) dos últimos 6 meses
- **PDF Relatório Mensal** — cores legíveis, KPIs em caixas coloridas, tabela de movimentos, rodapé
- **Seletor de Mês/Ano** — usa variáveis CSS do tema (`var(--border-primary)`, etc.)
- **CardKPI com variação** — suporte para indicador de variação percentual
- **Modal Registar Tratamento** — redireccionado para `tratamentos.criarTratamento`

---

## Ficha do Utente — Correções Críticas

### Bugs Corrigidos

| # | Bug | Impacto | Ficheiro |
|---|-----|---------|----------|
| 1 | **Código corrompido linhas 991-1012** — `}uccess(() => {` e modal duplicado | Crash | `FichaUtentePage.tsx` |
| 2 | **Modal Editar usava endpoint errado** — `utentes.update` em vez de `fichaUtente.actualizarDados` | Grave | `FichaUtentePage.tsx` |
| 3 | **Health Score fixo em 78** — nunca calculado dinamicamente | Moderado | `FichaUtentePage.tsx` |
| 4 | **Notas Rápidas sem formulário** — botão "Nova Nota" não fazia nada | Moderado | `FichaUtentePage.tsx` |
| 5 | **Botões "Descarregar" e "Partilhar" sem handler** — sem `onClick` | Moderado | `FichaUtentePage.tsx` |

### Melhorias Implementadas

- **Health Score dinâmico** — calculado com base em:
  - Consultas recentes (últimos 6 meses)
  - Consultas futuras agendadas
  - Tratamentos concluídos vs pendentes antigos
  - Alergias e problemas de saúde
  - Dívidas pendentes
  - Anamnese preenchida
- **Download PDF da Ficha Clínica** — gera documento completo com:
  - Dados pessoais, alertas clínicos, health score
  - Resumo financeiro
  - Lista de consultas e tratamentos
  - Rodapé com marca d'água
- **Botão Partilhar** — copia resumo do utente para clipboard
- **Notas Rápidas com formulário** — permite adicionar novas notas com título, conteúdo e categoria
- **Dashboard Clínico completo** — KPIs, próximas consultas, última consulta, resumo financeiro, tratamentos activos, registos recentes
- **Modal Editar corrigido** — usa `fichaUtente.actualizarDados` (endpoint correcto com RGPD audit)
- **Modal Criar Tratamento corrigido** — usa `tratamentos.criarTratamento` (com faturação automática)
- **Tabs reorganizadas** — Dashboard, Odontograma, Tratamentos, Consultas, Imagens, Saúde
- **Todas as cores usam variáveis CSS** — compatível com tema claro e escuro

---

## Ficheiros Alterados

| Ficheiro | Acção | Linhas |
|----------|-------|--------|
| `client/src/pages/FinanceiroPage.tsx` | Reescrito | 723 |
| `client/src/pages/FichaUtentePage.tsx` | Reescrito | 1765 |
| `server/routers/financeiro.ts` | Reescrito | 467 |
| `server/routers/financeiro-cached.ts` | Corrigido | 37 |

---

## Notas para Deploy

1. **Sem alterações ao schema** — não é necessário correr migrações
2. **Sem novas dependências** — `jsPDF` e `recharts` já estavam no `package.json`
3. **Retrocompatibilidade** — endpoint `financeiro.registarTratamento` mantido (deprecated, lança erro informativo)
4. **RGPD** — todas as operações de escrita mantêm audit logging via `logAuditAction`
