# DentCare V34.1 — Feriados Internacionais + Google Calendar

## Resumo

Integração completa de feriados e datas comemorativas internacionais na Agenda do DentCare, com suporte a 100+ países. Os feriados exibidos são **exclusivamente do país configurado** no conector Google Calendar (ou na configuração `pais_clinica` como fallback).

---

## Ficheiros Criados

| Ficheiro | Descrição |
|----------|-----------|
| `server/services/holidayService.ts` | Serviço de feriados internacionais (API Nager.Date + cache 24h + mapeamento país→ISO) |
| `server/routers/feriados.ts` | Router tRPC com 8 endpoints para feriados |

## Ficheiros Modificados

| Ficheiro | Alterações |
|----------|------------|
| `server/routers.ts` | Registado `feriadosRouter` no router principal |
| `server/routers/conectores.ts` | Adicionado campo `conector_gcal_country_code` + validação de país no teste de conexão |
| `client/src/pages/AgendaPage.tsx` | Substituído array hardcoded por API dinâmica + feriados nas 3 vistas + painel de alertas |
| `client/src/pages/ConectoresPage.tsx` | Adicionado campo "País dos Feriados" ao conector Google Calendar |

---

## Funcionalidades Implementadas

### 1. Serviço de Feriados no Servidor (`holidayService.ts`)

- **API Nager.Date** — gratuita, sem rate limit, CORS habilitado, 100+ países
- **Cache em memória** com TTL de 24h (feriados não mudam frequentemente)
- **Mapeamento automático** nome do país → código ISO (suporta português, inglês, espanhol)
  - Ex: "Portugal" → "PT", "Brasil" → "BR", "United States" → "US"
- **Categorização automática** por tipo:
  - `feriado_nacional` (Public) — vermelho
  - `feriado_bancario` (Bank) — âmbar
  - `feriado_escolar` (School) — azul
  - `opcional` (Optional) — violeta
  - `comemorativo` (Observance) — verde
  - `personalizado` (Custom) — ciano

### 2. Router tRPC de Feriados (`feriados.ts`)

| Endpoint | Tipo | Descrição |
|----------|------|-----------|
| `feriados.listar` | Query | Feriados do país configurado para um ano (ou intervalo) |
| `feriados.proximos` | Query | Próximos N feriados com contagem de dias |
| `feriados.ehHojeFeriado` | Query | Verificar se hoje é feriado |
| `feriados.paisesDisponiveis` | Query | Lista de 100+ países suportados |
| `feriados.paisAtual` | Query | País atualmente configurado |
| `feriados.alterarPais` | Mutation | Alterar o país dos feriados |
| `feriados.personalizados` | Query | Feriados personalizados da clínica |
| `feriados.adicionarPersonalizado` | Mutation | Adicionar feriado personalizado |
| `feriados.removerPersonalizado` | Mutation | Remover feriado personalizado |

### 3. Prioridade de País

O sistema determina o país dos feriados na seguinte ordem:
1. **`conector_gcal_country_code`** — campo do conector Google Calendar (prioridade máxima)
2. **`pais_clinica`** — configuração geral da clínica (fallback)
3. **"PT" (Portugal)** — default se nenhum estiver configurado

### 4. Vista Dia — Banner de Feriado

- Banner colorido no topo da vista quando o dia selecionado é feriado
- Ícone por categoria (bandeira, edifício, chapéu de formatura, etc.)
- Nome local + nome em inglês
- Tipo do feriado (Nacional, Bancário, Escolar, etc.)
- Alerta para recepcionistas: "Atenção: Clínica pode estar encerrada"

### 5. Vista Semana — Badge de Feriado

- Badge colorido no header de cada dia que é feriado
- Fundo suave na coluna do dia de feriado
- Tooltip com nome completo + nome em inglês

### 6. Vista Mês — Categorização Visual

- Badge colorido por categoria (vermelho=nacional, verde=comemorativo, etc.)
- Fundo suave na célula do dia de feriado
- Tooltip com nome completo

### 7. Painel de Próximos Feriados

- Exibido entre o painel de estados e a agenda
- Mostra os próximos 5 feriados com:
  - Ícone por categoria
  - Nome do feriado
  - Data formatada
  - Contagem de dias ("3d", "Amanhã", "HOJE")
  - Indicador pulsante para feriados hoje/amanhã
- Nome do país exibido no canto

### 8. Indicador de País na Barra de Ferramentas

- Ícone de globo + nome do país na barra de ferramentas da agenda
- Permite à recepcionista confirmar rapidamente qual país está configurado

### 9. Conector Google Calendar Melhorado

- Novo campo "País dos Feriados" com código ISO
- Validação do país no teste de conexão (verifica se é suportado)
- Descrição atualizada para mencionar feriados
- Ajuda expandida com informação sobre 100+ países

### 10. Feriados Personalizados

- A clínica pode adicionar feriados personalizados (ex: aniversário da clínica)
- Persistidos na BD por ano
- Exibidos com cor ciano distinta
- Endpoints de adicionar/remover via tRPC

---

## Países Suportados (Exemplos)

| Código | País | Código | País |
|--------|------|--------|------|
| PT | Portugal | BR | Brasil |
| US | Estados Unidos | ES | Espanha |
| FR | França | DE | Alemanha |
| IT | Itália | GB | Reino Unido |
| CA | Canadá | AU | Austrália |
| JP | Japão | MX | México |
| AR | Argentina | CL | Chile |
| CO | Colômbia | AO | Angola |
| MZ | Moçambique | CV | Cabo Verde |

**Total: 100+ países** — lista completa em https://date.nager.at/

---

## Como Configurar

1. Ir a **Conectores** → **Google Calendar**
2. No campo **"País dos Feriados"**, colocar o código ISO do país (ex: `PT`, `BR`, `US`)
3. Clicar em **"Testar Conexão"** para validar
4. Os feriados aparecem automaticamente na **Agenda** (todas as vistas)

**Alternativa:** O sistema também usa o campo `pais_clinica` das Configurações como fallback.

---

## Notas Técnicas

- A API Nager.Date é gratuita, sem autenticação, sem rate limit
- Cache de 24h em memória no servidor (feriados raramente mudam)
- Cache de 7 dias para a lista de países
- Suporte multi-ano automático (busca feriados do ano da data selecionada)
- Sem dependências externas adicionais (usa `fetch` nativo do Node.js)
- Zero duplicação de código — o array hardcoded foi completamente removido
