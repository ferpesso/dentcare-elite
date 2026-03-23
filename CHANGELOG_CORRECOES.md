# Correções Aplicadas — DentCare v32.5.1

## Resumo das Correções

Este documento regista todas as correções aplicadas ao projeto DentCare v32.5.1 na sequência do relatório de avaliação de pré-testes.

---

## 1. Erro de Compilação TypeScript (CRÍTICO)

**Ficheiro:** `client/src/contexts/ConfigContext.tsx`

**Problema:** A propriedade `timbradoConfig` era consumida via `useConfig()` no `FinanceiroPage.tsx`, mas não estava declarada na interface `ConfigContextType`, causando um erro de compilação TypeScript (`TS2339`).

**Correção:**
- Adicionado `import { buildTimbradoConfig, type TimbradoConfig }` ao `ConfigContext.tsx`.
- Adicionada a propriedade `timbradoConfig: TimbradoConfig` à interface `ConfigContextType`.
- Adicionado `const timbradoConfig = useMemo<TimbradoConfig>(() => buildTimbradoConfig(config), [config])` ao provider.
- Adicionado `timbradoConfig` ao valor do contexto e ao fallback.

---

## 2. Rota Desprotegida (CRÍTICO — Segurança)

**Ficheiro:** `client/src/main.tsx`

**Problema:** A rota `/configuracoes/whatsapp` utilizava `<AppLayout>` diretamente em vez de `<ProtectedRoute>`, permitindo acesso sem autenticação.

**Correção:** Substituído `<AppLayout>` por `<ProtectedRoute>` na rota `/configuracoes/whatsapp`.

---

## 3. Endpoints de API Abertos (CRÍTICO — Segurança)

**Ficheiros:** `server/routers/ai.ts`, `server/routers/app-mobile.ts`, `server/routers/especialidades.ts`

**Problema:** Vários endpoints utilizavam `publicProcedure`, permitindo chamadas sem autenticação a dados sensíveis (previsões de IA, dados financeiros, registos de dispositivos).

**Correção:**
- `server/routers/ai.ts`: Todos os endpoints (`predictNoShow`, `projectFinancialForecast`, `analyzeTrends`, `generateInsights`) migrados de `publicProcedure` para `protectedProcedure`.
- `server/routers/app-mobile.ts`: Endpoint `registarDispositivo` migrado para `protectedProcedure`.
- `server/routers/especialidades.ts`: Endpoints `list` e `getById` migrados para `protectedProcedure`.
- Nota: Os endpoints `auth.me` e `health` em `system.ts` mantêm `publicProcedure` intencionalmente (necessários para o fluxo de autenticação e monitorização).

---

## 4. Escalabilidade de Sessões — Cluster Mode (ARQUITETURAL)

**Ficheiro:** `server/_core/index.ts`

**Problema:** O `express-session` estava configurado com `MemoryStore` (padrão), incompatível com o modo cluster do PM2 (`instances: 'max'`), causando falhas de autenticação intermitentes.

**Correção:**
- Adicionado suporte a `RedisStore` (pacote `connect-redis`) como session store partilhado.
- O sistema tenta ligar ao Redis via `REDIS_URL`. Se disponível, usa `RedisStore`; caso contrário, usa `MemoryStore` com aviso de log.
- Adicionado `connect-redis` às dependências do projeto.

---

## 5. Tipos `any` no Schema da Base de Dados (QUALIDADE)

**Ficheiro:** `drizzle/schema.ts`

**Problema:** As tabelas `consultas` e `tratamentos` tinham o tipo `any` explícito (`export const consultas: any = ...`), anulando a tipagem do Drizzle ORM. A causa era uma referência circular entre as duas tabelas.

**Correção:**
- Importado `AnyMySqlColumn` do `drizzle-orm/mysql-core`.
- Substituídas as funções de referência circular por `(): AnyMySqlColumn => ...`, resolvendo o erro de inferência de tipo sem necessidade de `any`.

---

## 6. Erro Tipográfico no Schema (QUALIDADE)

**Ficheiro:** `drizzle/schema.ts`

**Problema:** A variável `evolucoesClincias` continha um erro tipográfico (faltava o "i" em "Clínicas").

**Correção:** Renomeado para `evolucoesClinicas` (e os tipos `EvolucaoClinica` e `InsertEvolucaoClinica` atualizados em conformidade).

---

## 7. Campo `cor_agenda` em Falta no Schema (QUALIDADE)

**Ficheiro:** `drizzle/schema.ts`, `server/routers/consultas.ts`

**Problema:** O campo `cor_agenda` da tabela `medicos` era atualizado via raw SQL (`db.execute(sql\`UPDATE medicos SET cor_agenda = ...\`)`), pois não estava definido no schema Drizzle.

**Correção:**
- Adicionado o campo `corAgenda: varchar("cor_agenda", { length: 20 }).default("#6366F1")` à tabela `medicos` no schema.
- Substituída a raw query `db.execute(sql\`UPDATE medicos SET cor_agenda = ...\`)` por `db.update(medicos).set({ corAgenda: input.cor, ... })`.
- Substituída a raw query `SELECT id, nome, especialidade, cor_agenda, ativo FROM medicos` por uma query tipada com `db.select({ ... }).from(medicos)`.

---

## 8. Ficheiro `.env` Removido do Pacote (SEGURANÇA)

**Problema:** O ficheiro `.env` com credenciais de desenvolvimento estava incluído no pacote ZIP.

**Correção:** Ficheiro `.env` removido. O `.gitignore` já estava corretamente configurado para excluir `.env`.

---

## Estado Final

| # | Problema | Severidade | Estado |
|---|----------|-----------|--------|
| 1 | Erro de compilação TypeScript (`timbradoConfig`) | Crítico | ✅ Corrigido |
| 2 | Rota `/configuracoes/whatsapp` desprotegida | Crítico | ✅ Corrigido |
| 3 | Endpoints AI/Mobile com `publicProcedure` | Crítico | ✅ Corrigido |
| 4 | Session store incompatível com cluster mode | Arquitetural | ✅ Corrigido |
| 5 | Tipos `any` em `consultas` e `tratamentos` | Qualidade | ✅ Corrigido |
| 6 | Typo `evolucoesClincias` | Qualidade | ✅ Corrigido |
| 7 | `cor_agenda` em falta no schema | Qualidade | ✅ Corrigido |
| 8 | `.env` incluído no pacote | Segurança | ✅ Corrigido |

**Compilação TypeScript:** 0 erros  
**Build frontend (Vite):** Sucesso  
**Build backend (esbuild):** Sucesso
