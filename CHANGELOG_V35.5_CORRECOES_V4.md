# Changelog de Correções — DentCare Elite V35.5 (Patch v4)

Data: 2026-03-20  
Baseado em: `RELATORIO_ERROS_V35.5.md`

---

## Secção 2 — Erros de Base de Dados e Schema (Drizzle)

### 2.1 Tabelas sem Migração SQL
- **Criado** `drizzle/migrations/0008_add_parcelas_pagamentos.sql` com as definições completas das tabelas `parcelas` e `pagamentos`, incluindo índices e chaves estrangeiras.
- **Actualizado** `drizzle/migrations/meta/_journal.json` com a entrada da nova migração (idx: 8, tag: `0008_add_parcelas_pagamentos`).

### 2.2 Tabelas não Registadas no Drizzle
- **Corrigido** `server/db.ts`: adicionadas `parcelas` e `pagamentosComissoes` ao import e ao objeto de schema do Drizzle.

### 2.3 Import Inválido de InsertUser
- **Corrigido** `server/db.ts`: `InsertUser` importado com `import type` para evitar erro de importação de valor não exportado.

---

## Secção 3 — Imports Quebrados

### 3.1 Módulos Inexistentes em routers.ts
- **Removido** o import comentado de `./routers/seedData` (ficheiro eliminado).
- **Removido** o import comentado de `./routers/social-media` (substituído por `socialHubRouter`).
- **Removido** o registo comentado `seedData: seedDataRouter` do `appRouter`.

### 3.2 Import Circular em voiceTranscription.ts
- **Corrigido** o comentário de documentação na linha 249 para clarificar o caminho correto do import.

---

## Secção 4 — JSON.parse sem Try-Catch (18 instâncias)

Todos os `JSON.parse()` directos sobre dados da base de dados foram envolvidos em blocos `try/catch` com valores de fallback seguros.

| Ficheiro | Instâncias Corrigidas |
|---|---|
| `client/src/pages/FichaUtentePage.tsx` | 1 |
| `client/src/pages/PermissoesPage.tsx` | 1 |
| `server/routers/laboratorios.ts` | 5 |
| `server/routers/materiais-lab.ts` | 3 |
| `server/routers/social-hub.ts` | 3 |
| `server/services/iaService.ts` | 3 (tool_calls arguments) |

**Padrão aplicado:** `(() => { try { return JSON.parse(val); } catch { return fallback; } })()`

---

## Secção 5 — Funções Async sem Await

### 5.1 whatsappService.ts (10 funções)
Removida a palavra-chave `async` das funções que apenas retornam o resultado de outra função assíncrona (sem `await` directo):
- `enviarMensagemDireta`, `enviarLembrete`, `enviarConfirmacaoMarcacao`, `enviarHorariosDisponiveis`, `enviarCampanhaReativacao`, `enviarFollowupPosConsulta`, `enviarPedidoAvaliacao`, `enviarFelicitacaoAniversario`, `enviarMenuPrincipal`, `enviarListaServicos`

### 5.2 socialPublisher.ts (2 funções)
- `publicarTikTok`: removido `async`, retorno envolvido em `Promise.resolve()`.
- `publicarNaRedeSocial`: removido `async`, caso `default` envolvido em `Promise.resolve()`.

### 5.3 conectores.ts (4 funções)
- `testarConexaoGoogleBusiness`, `testarConexaoOutlook`, `testarConexaoPush`, `testarConexaoTikTok`: removido `async`, tipo de retorno corrigido para síncrono.
- `TESTES_CONEXAO`: tipo actualizado para aceitar funções síncronas e assíncronas.
- Chamada `await testeFn(valores)` substituída por `await Promise.resolve(testeFn(valores))` para normalização.

---

## Secção 6 — Compatibilidade Zod v4

### 6.1 server/_core/trpc.ts
- **Corrigido** `traduzirErroZod()`: adicionado suporte a `issue.origin` (Zod v4) como alternativa a `issue.type` (Zod v3).
- **Adicionados** casos `invalid_format` (Zod v4, substitui `invalid_string`) e `invalid_value` (Zod v4, substitui `invalid_enum_value`).

### 6.2 client/src/lib/parseApiError.ts
- **Corrigido** `MENSAGENS_ZOD`: funções `too_small` e `too_big` agora usam `p?.origin || p?.type`.
- **Adicionadas** entradas `invalid_format` e `invalid_value` ao mapeamento.
- **Corrigida** chamada ao `MENSAGENS_ZOD` para passar `origin` e `format` além dos campos Zod v3.

---

## Secção 7 — Routers Não Utilizados

Removidos do `server/routers.ts` (imports e registos no `appRouter`):
- `permissoesRouter` — substituído funcionalmente por `controloAcessoRouter`
- `especialidadesRouter` — não chamado pelo frontend
- `appMobileRouter` — não chamado pelo frontend
- `presetsRouter` — não chamado pelo frontend

Os ficheiros dos routers foram mantidos no sistema de ficheiros para referência futura.

---

## Resumo de Ficheiros Modificados

| Ficheiro | Tipo de Alteração |
|---|---|
| `drizzle/migrations/0008_add_parcelas_pagamentos.sql` | **Criado** |
| `drizzle/migrations/meta/_journal.json` | Actualizado |
| `server/db.ts` | Corrigido (imports + schema) |
| `server/routers.ts` | Corrigido (imports + appRouter) |
| `server/_core/trpc.ts` | Corrigido (Zod v4) |
| `server/_core/voiceTranscription.ts` | Corrigido (comentário) |
| `server/whatsappService.ts` | Corrigido (async sem await) |
| `server/services/socialPublisher.ts` | Corrigido (async sem await) |
| `server/services/iaService.ts` | Corrigido (JSON.parse) |
| `server/routers/laboratorios.ts` | Corrigido (JSON.parse) |
| `server/routers/materiais-lab.ts` | Corrigido (JSON.parse) |
| `server/routers/social-hub.ts` | Corrigido (JSON.parse) |
| `server/routers/conectores.ts` | Corrigido (async sem await) |
| `client/src/pages/FichaUtentePage.tsx` | Corrigido (JSON.parse) |
| `client/src/pages/PermissoesPage.tsx` | Corrigido (JSON.parse) |
| `client/src/lib/parseApiError.ts` | Corrigido (Zod v4) |
