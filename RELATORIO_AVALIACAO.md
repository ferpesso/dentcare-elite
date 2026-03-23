# Relatório de Avaliação: DentCare v32.5.1

## Resumo Executivo

Após uma análise detalhada ao código-fonte, arquitetura, dependências e configurações do projeto **DentCare v32.5.1**, conclui-se que o programa **não está totalmente apto para avançar para a fase de testes formais (QA)** sem que sejam resolvidas algumas anomalias críticas.

Embora o projeto apresente uma estrutura robusta baseada em React, tRPC, Drizzle ORM e Express, com funcionalidades avançadas (IA, WhatsApp, Módulo Financeiro), foram identificados erros de compilação, vulnerabilidades de segurança e problemas de arquitetura que comprometem a estabilidade em produção.

---

## 1. Problemas Críticos (Bloqueadores para Testes)

### 1.1. Erro de Compilação TypeScript
O projeto falha na compilação do TypeScript no frontend devido a um erro no ficheiro `FinanceiroPage.tsx`:
```
client/src/pages/FinanceiroPage.tsx(362,42): error TS2339: Property 'timbradoConfig' does not exist on type 'ConfigContextType'.
```
Isto indica que a propriedade `timbradoConfig` está a ser consumida do contexto `useConfig()`, mas não foi declarada na interface `ConfigContextType` no ficheiro `ConfigContext.tsx`. Este erro impede a compilação bem-sucedida do projeto em modo estrito.

### 1.2. Rotas Desprotegidas (Falta de Autenticação)
No ficheiro de rotas principal (`client/src/main.tsx`), a rota para a configuração do WhatsApp está fora do componente `<ProtectedRoute>`:
```tsx
<Route path="/configuracoes/whatsapp">
  <AppLayout>
    <ConfiguracaoWhatsAppPage />
  </AppLayout>
</Route>
```
Isto permite que qualquer utilizador não autenticado aceda à página de configurações do WhatsApp, o que representa uma falha de segurança significativa.

### 1.3. Endpoints de API Abertos (tRPC)
Vários routers no backend utilizam `publicProcedure` para endpoints que deveriam estar protegidos, incluindo operações sensíveis de Inteligência Artificial e App Mobile:
- `aiRouter` (ficheiro `server/routers/ai.ts`): Utiliza `publicProcedure` para `predictNoShow`, `projectFinancialForecast`, `analyzeTrends` e `generateInsights`. Qualquer pessoa pode chamar estes endpoints sem autenticação.
- `appMobileRouter` (ficheiro `server/routers/app-mobile.ts`): O endpoint `registarDispositivo` também utiliza `publicProcedure`.

---

## 2. Problemas Arquiteturais e de Segurança

### 2.1. Escalabilidade de Sessões (Cluster Mode)
O ficheiro `ecosystem.config.js` configura o PM2 para correr a aplicação em `cluster` mode (`instances: 'max'`). No entanto, o Express está configurado para utilizar o armazenamento de sessões em memória (`express-session` sem uma `store` configurada como o Redis).
Num ambiente de cluster, isto causará falhas de autenticação intermitentes, pois as sessões não são partilhadas entre as diferentes instâncias (workers) do Node.js. O mesmo problema aplica-se ao sistema de tokens 2FA (`pending2FATokens`) e recuperação de password (`resetTokens`), que utilizam `new Map()` em memória.

### 2.2. Possíveis Injeções de SQL (SQL Injection)
O código contém múltiplas instâncias de consultas SQL em bruto (`raw queries`) utilizando `db.execute(sql\`...\`)` ou simplesmente interpolação de strings em vez de utilizar o Query Builder do Drizzle ORM.
Por exemplo, no ficheiro `server/routers/consultas.ts`:
```typescript
await db.execute(sql`UPDATE medicos SET cor_agenda = ${input.cor} WHERE id = ${input.medicoId}`);
```
Embora a template string tag `sql` do Drizzle ofereça alguma proteção, o uso excessivo de raw queries aumenta o risco de injeções SQL e dificulta a manutenção do código.

### 2.3. Fuga de Informação Sensível no Pacote
O ficheiro ZIP fornecido inclui o ficheiro `.env` com credenciais reais ou simuladas que parecem destinadas a produção:
```env
JWT_SECRET=dentcare_elite_v32_secret_key_32_chars_long_minimum
SESSION_SECRET=dentcare_elite_v32_session_secret_key_very_long_and_secure
ENCRYPTION_KEY=dentcare_elite_v32_encryption_key_32_chars_long_minimum_!
DATABASE_URL=mysql://root:dentcare@localhost:3306/dentcare
```
O ficheiro `.env` nunca deve ser incluído no controlo de versões ou em pacotes de distribuição.

---

## 3. Qualidade de Código e Manutenção

### 3.1. Ausência de Testes Automatizados
Ao executar o comando `vitest run`, o sistema não encontrou nenhum ficheiro de teste. A ausência de testes unitários ou de integração (E2E) torna a fase de testes manuais muito mais morosa e arriscada.

### 3.2. Uso Excessivo de Tipos `any`
Foram detetados **35 casts de `as any`** no backend e **152 casts de `as any`** no frontend. O uso excessivo de `any` anula os benefícios do TypeScript, escondendo potenciais erros de tipagem que poderiam ser detetados em tempo de compilação.
Exemplo no `drizzle/schema.ts`:
```typescript
export const consultas: any = mysqlTable("consultas", { ... });
export const tratamentos: any = mysqlTable("tratamentos", { ... });
```

### 3.3. Erros Tipográficos no Schema da Base de Dados
No ficheiro `drizzle/schema.ts`, existe um erro tipográfico na definição da tabela de evoluções clínicas:
```typescript
export const evolucoesClincias = mysqlTable("evolucoes_clinicas", { ... });
export type EvolucaoClinica = InferSelectModel<typeof evolucoesClincias>;
```
A variável chama-se `evolucoesClincias` em vez de `evolucoesClinicas`. Além disso, existem duas tabelas com propósitos muito semelhantes (`evolucoes` e `evolucoesClincias`), o que pode causar confusão.

### 3.4. Ficheiros de Grande Dimensão
O ficheiro `client/src/pages/FichaUtentePage.tsx` possui mais de 3.300 linhas de código. Apesar de o changelog da versão V32.5 mencionar um "Redesign Completo", um ficheiro desta dimensão é extremamente difícil de manter e testar.

---

## 4. Plano de Ação Recomendado (Antes dos Testes)

Para que o projeto fique apto para a fase de testes, recomendo a execução das seguintes tarefas:

1. **Correção do TypeScript**: Adicionar a propriedade `timbradoConfig` à interface `ConfigContextType` no ficheiro `ConfigContext.tsx`.
2. **Proteção de Rotas**: Envolver a rota `/configuracoes/whatsapp` com o componente `<ProtectedRoute>` no `main.tsx`.
3. **Segurança de Endpoints**: Alterar os endpoints em `server/routers/ai.ts` e `server/routers/app-mobile.ts` de `publicProcedure` para `protectedProcedure`.
4. **Configuração de Sessões**: Configurar o `express-session` para utilizar o Redis (já existe código para Redis no `auth.ts`) de forma a suportar o modo cluster do PM2, ou alterar o `ecosystem.config.js` para não utilizar cluster mode temporariamente.
5. **Limpeza de Ficheiros Sensíveis**: Remover o ficheiro `.env` do repositório e garantir que o `.gitignore` está a ser respeitado.
6. **Refatorização de Raw Queries**: Rever as queries SQL em bruto, especialmente no router de consultas, e substituí-las por operações nativas do Drizzle ORM.

## Conclusão

O projeto **DentCare v32.5.1** apresenta um nível elevado de maturidade em termos de funcionalidades, mas contém bloqueadores técnicos (erros de compilação e falhas de segurança) que **impedem o início imediato dos testes**. Após a resolução dos pontos críticos mencionados acima (especialmente os pontos 1.1, 1.2 e 1.3), o sistema estará pronto para uma bateria de testes rigorosa.
