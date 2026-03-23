# Relatório de Auditoria para Produção: DentCare v31.1

**Data**: 03 de Março de 2026  
**Auditor**: DentCare (agente `critical-creative-dev`)

---

## Visão Geral

Este documento apresenta uma análise crítica e honesta do projeto **DentCare v31.1**, com o objetivo de avaliar a sua prontidão para o ambiente de produção. A auditoria focou-se na qualidade do código, segurança, configuração, manutenibilidade e riscos operacionais. A análise segue a metodologia do skill `critical-creative-dev`, apresentando de forma transparente os pontos positivos e, com igual ou maior ênfase, os pontos negativos e desafios.

O projeto demonstra uma base tecnológica sólida e uma arquitetura ambiciosa. No entanto, foram identificados **riscos críticos e desalinhamentos importantes** que precisam de ser resolvidos antes de um lançamento seguro e estável em produção.

---

## Análise Detalhada

A seguir, uma avaliação estruturada dos principais aspetos do projeto.

### Pontos Positivos e Boas Práticas ✅

- **Arquitetura Robusta**: O projeto está bem estruturado, com uma separação clara entre `client` (React, Vite), `server` (Express, tRPC) e `drizzle` (ORM), o que facilita a manutenção e o desenvolvimento futuro.
- **Segurança na Base**: A implementação de `helmet` para headers de segurança, `cors` com configuração específica para produção, e a validação de variáveis de ambiente no arranque (`startup-validation.ts`) são excelentes práticas.
- **Autenticação e Autorização Sólidas**: O sistema de autenticação inclui login com password (com hashing `bcrypt`), 2FA (TOTP com `speakeasy`), e um sistema de controlo de acesso baseado em papéis (RBAC) bem definido (`rbac.ts`), que é verificado em cada endpoint tRPC.
- **Qualidade do Código em Módulos Críticos**: Módulos como `auth.ts`, `resilience.ts` (com Circuit Breaker) e `auditService.ts` (para logs de auditoria) são bem escritos, demonstram conhecimento de padrões de design avançados e aumentam a fiabilidade e segurança do sistema.
- **Boas Práticas de Base de Dados**: O uso do ORM Drizzle com um schema tipado (`schema.ts`) e migrações geradas (`drizzle-kit`) é uma abordagem moderna e segura, que minimiza o risco de SQL Injection. A utilização de `upsert` e transações em operações complexas é notável.
- **Documentação Interna**: A presença de documentação detalhada na pasta `docs/` (ADRs, guias de implementação) é um ponto muito positivo, demonstrando uma preocupação com a transferência de conhecimento e a manutenibilidade do projeto.

### Pontos Negativos e Riscos Críticos ☢️

Esta secção detalha as descobertas mais preocupantes que representam riscos significativos para a segurança, estabilidade e conformidade do projeto em produção.

| Risco ID | Categoria | Descrição Detalhada do Risco | Impacto | Criticidade |
| :--- | :--- | :--- | :--- | :--- |
| **R-01** | **Segurança** | **Tokens de Acesso de Redes Sociais Armazenados em Texto Plano**: O `social-hub.ts` guarda tokens de acesso de APIs (Facebook, Instagram) diretamente na base de dados sem qualquer tipo de encriptação. Embora exista um serviço de encriptação (`iaService.ts`), ele não é utilizado para este fim. | **Alto**: Uma violação da base de dados exporia tokens que dão controlo total sobre as contas de redes sociais dos clientes, resultando em danos reputacionais e financeiros severos. | **Crítico** |
| **R-02** | **Segurança** | **Chave de Encriptação com Fallback Inseguro**: O `iaService.ts` utiliza uma chave de encriptação hardcoded (`default-key-32-chars-minimum-1234`) se a variável de ambiente `ENCRYPTION_KEY` não for definida. | **Alto**: Se a variável de ambiente for esquecida, todas as chaves de API (ex: OpenAI) serão encriptadas com uma chave conhecida e publicamente visível no código-fonte, tornando a encriptação inútil. | **Crítico** |
| **R-03** | **Segurança** | **Ausência de Rate Limiting na Autenticação**: O mecanismo de `rate limiting` para tentativas de login (`auth.ts`) depende exclusivamente do Redis. Se a conexão com o Redis falhar, o `rate limiting` é completamente desativado, deixando o sistema vulnerável a ataques de força bruta. | **Alto**: Permite que um atacante tente um número ilimitado de passwords, aumentando drasticamente a probabilidade de uma conta ser comprometida. | **Crítico** |
| **R-04** | **Segurança** | **Política de Segurança de Conteúdo (CSP) Excessivamente Restritiva**: O `index.ts` define uma política CSP em produção que apenas permite `connectSrc: ['self']`. Isto bloqueará todas as chamadas a APIs externas (OpenAI, Twilio, Meta/Facebook, S3), quebrando funcionalidades essenciais. | **Alto**: As principais funcionalidades de IA, WhatsApp e redes sociais não irão funcionar em produção, resultando em falhas silenciosas e uma péssima experiência para o utilizador. | **Crítico** |
| **R-05** | **Segurança** | **Rota de Configuração do WhatsApp sem Proteção**: A rota `/configuracoes/whatsapp` no `main.tsx` do cliente não está envolvida pelo componente `ProtectedRoute`, permitindo que qualquer pessoa, mesmo sem autenticação, aceda à página. | **Médio**: Embora a API tRPC subjacente provavelmente exija autenticação, a exposição da interface de configuração é uma falha de segurança que pode revelar informações sobre a arquitetura do sistema. | **Elevado** |
| **R-06** | **Estabilidade** | **Inconsistência nas Migrações da Base de Dados**: O ficheiro de migração `0001_add_especialidades_evolucoes.sql` existe, mas não está registado no `_journal.json` do Drizzle. Adicionalmente, existe um ficheiro SQL avulso (`docs/0005_...`) que não parece ter sido integrado no sistema de migração. | **Alto**: A base de dados em produção pode não ser criada corretamente, levando a erros em tempo de execução quando o código tentar aceder a tabelas ou colunas inexistentes. O estado do schema é incerto. | **Crítico** |
| **R-07** | **Qualidade** | **TypeScript com `"strict": false`**: O `tsconfig.json` está configurado com `"strict": false`. Isto desativa verificações de tipo essenciais (como `strictNullChecks`), permitindo a introdução de bugs relacionados com valores `null` e `undefined`. O código tem mais de 260 usos de `any`. | **Alto**: Reduz drasticamente a principal vantagem do TypeScript. Aumenta a probabilidade de erros em tempo de execução que poderiam ser detetados em compilação, tornando o código menos fiável e mais difícil de refatorar. | **Elevado** |
| **R-08** | **Manutenção** | **Código Duplicado e Morto**: Existem componentes e páginas React na pasta `src/` que parecem ser versões antigas ou de teste e não são importados em nenhum lugar no `client/src/main.tsx`. Isto representa código morto que polui o projeto. | **Baixo**: Aumenta a complexidade do projeto, confunde novos programadores e pode levar a modificações em ficheiros que não são efetivamente utilizados. | **Médio** |
| **R-09** | **Dependências** | **Dependências Conflituantes e Vulneráveis**: O `package.json` inclui `bull` e `bullmq` simultaneamente, o que pode causar conflitos. A versão do `xlsx` (`0.18.5`) é antiga e possui vulnerabilidades conhecidas. | **Médio**: Conflitos de dependências podem levar a comportamentos inesperados. Vulnerabilidades em pacotes podem ser exploradas para ataques (ex: Prototype Pollution). | **Elevado** |
| **R-10** | **Configuração** | **Ficheiros de Desenvolvimento no Pacote de Produção**: O ficheiro `simulate_day.ts` e outros ficheiros de teste/utilitários estão incluídos no pacote ZIP, o que não é ideal para um build de produção. | **Baixo**: Embora o router de `seedData` esteja comentado, a presença destes ficheiros aumenta a superfície de ataque e o tamanho do pacote. | **Médio** |
| **R-11** | **Configuração** | **Inconsistência de Nomenclatura**: O `package.json` define o nome como `dentcare-v31`, mas o `ecosystem.config.js` usa `dentcare-v32`. Esta falta de sincronia pode complicar a gestão de processos e logs. | **Baixo**: Causa confusão na monitorização e administração do sistema, podendo levar a erros humanos ao gerir os processos (ex: reiniciar a versão errada). | **Baixo** |

---

## Recomendações (com Ressalvas)

Com base na análise, o projeto **NÃO ESTÁ PRONTO** para ser enviado para produção. As recomendações seguintes são priorizadas pela criticidade dos riscos identificados.

1.  **Resolver Riscos de Segurança Críticos (R-01, R-02, R-03, R-04, R-05) - Prioridade Máxima**:
    - **Recomendação**: Encriptar **todos** os segredos de terceiros (tokens de redes sociais, etc.) na base de dados usando a função `encryptApiKey` já existente. *No entanto, é crucial garantir que a `ENCRYPTION_KEY` seja robusta e gerida de forma segura através de um cofre de segredos (como AWS Secrets Manager ou HashiCorp Vault), em vez de depender apenas de variáveis de ambiente.* 
    - **Recomendação**: Remover o fallback inseguro da `ENCRYPTION_KEY`. O sistema deve falhar no arranque se a chave não for fornecida em produção. *Apesar dos benefícios, isto requer uma disciplina rigorosa na configuração do ambiente, o que pode complicar o setup inicial.*
    - **Recomendação**: Implementar um `rate limiting` em memória como fallback para o `auth.ts`, que é ativado se a conexão com o Redis falhar. *No entanto, esta abordagem não é eficaz num ambiente com múltiplos servidores (cluster), mas é significativamente melhor do que não ter qualquer limite.*
    - **Recomendação**: Corrigir a política CSP, adicionando os domínios das APIs externas (`api.openai.com`, `api.twilio.com`, `graph.facebook.com`, etc.) à diretiva `connect-src`. *É crucial não usar `*`, mas sim uma lista explícita para manter a segurança.*
    - **Recomendação**: Envolver a rota `/configuracoes/whatsapp` com o `ProtectedRoute` para garantir que apenas utilizadores autenticados possam aceder.

2.  **Corrigir Problemas de Estabilidade e Qualidade (R-06, R-07) - Prioridade Alta**:
    - **Recomendação**: Sincronizar o estado das migrações. Gerar uma nova migração com o Drizzle para capturar as tabelas em falta (`especialidades`, `evolucoes_clinicas`, etc.) e garantir que o `_journal.json` reflete o estado real do `schema.ts`. *Apesar dos benefícios, isto pode exigir ajustes manuais no schema ou nas migrações para evitar a perda de dados se a base de dados já existir.*
    - **Recomendação**: Ativar o modo `"strict": true` no `tsconfig.json` e corrigir os erros de tipo resultantes. Eliminar gradualmente o uso de `any`. *No entanto, é crucial considerar que esta é uma tarefa que consome tempo e pode introduzir regressões se não for feita com cuidado e testes adequados.*

3.  **Melhorar a Manutenção e Configuração (R-08, R-09, R-10, R-11) - Prioridade Média**:
    - **Recomendação**: Remover o código morto (`src/components`, `src/pages`) e os ficheiros de desenvolvimento (`simulate_day.ts`) do projeto. Atualizar as dependências vulneráveis (`xlsx`) e remover pacotes conflituantes (`bull`). *Apesar dos benefícios de um projeto mais limpo, a remoção de código deve ser feita com cautela para não eliminar ficheiros que, embora não pareçam, são utilizados por algum processo de build ou script.*
    - **Recomendação**: Unificar a nomenclatura do projeto entre `package.json` e `ecosystem.config.js` para `dentcare-v31.1` para garantir consistência.

---

## Conclusão Final

O DentCare v31.1 é um software com um potencial imenso, construído sobre uma base moderna e com várias funcionalidades avançadas bem implementadas. A equipa de desenvolvimento demonstrou competência em áreas complexas como autenticação, autorização e resiliência.

Contudo, a honestidade brutal, pilar do `critical-creative-dev`, obriga a concluir que o projeto, no seu estado atual, é uma **"bomba-relógio" de segurança e estabilidade**. Os pontos negativos, especialmente os relacionados com a gestão de segredos, a falta de `rate limiting` robusto e as inconsistências na base de dados, representam um risco inaceitável para um ambiente de produção.

**Veredito**: Lançar o projeto neste estado seria irresponsável. Recomenda-se fortemente a implementação das correções críticas listadas antes de qualquer lançamento público. Após a resolução dos pontos, uma nova auditoria focada nos itens corrigidos seria prudente.ente seria aconselhidos seria aconselh aconselh aconselh aconselh aconselhável. 
