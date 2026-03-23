# DentCare Elite — Changelog V32

**Data de lançamento:** Março 2026  
**Versão anterior:** V31.1  
**Versão atual:** V32.0.0

---

## Resumo Executivo

A versão 32 do DentCare Elite representa uma atualização focada em **segurança, estabilidade e valorização do produto**. Todas as alterações foram concebidas para não danificar a estrutura existente, preservando a compatibilidade total com os dados e configurações anteriores.

---

## Correções de Segurança Críticas

### S-01 — Encriptação de Tokens de Redes Sociais

**Problema:** Os tokens de acesso às redes sociais (Facebook, Instagram, LinkedIn) eram guardados na base de dados em texto plano, expondo credenciais de terceiros em caso de acesso não autorizado à BD.

**Solução:** Todos os tokens de acesso são agora encriptados com AES-256-GCM antes de serem persistidos, utilizando a `ENCRYPTION_KEY` configurada no `.env`. A desencriptação ocorre apenas no momento de uso, em memória.

**Ficheiros alterados:** `server/services/iaService.ts`, `server/routers/social-hub.ts`

---

### S-02 — Remoção do Fallback Inseguro da Chave de Encriptação

**Problema:** O sistema de encriptação utilizava uma chave de fallback codificada diretamente no código (`"default-encryption-key-change-in-production"`), o que tornava a encriptação inútil se a variável de ambiente não fosse configurada.

**Solução:** O servidor agora termina o arranque com um erro crítico se a `ENCRYPTION_KEY` não estiver definida em ambiente de produção. Em desenvolvimento, emite um aviso visível mas continua a funcionar.

**Ficheiros alterados:** `server/services/iaService.ts`

---

### S-03 — Rate Limiting em Memória como Fallback

**Problema:** O sistema de rate limiting dependia exclusivamente do Redis. Se o Redis não estivesse disponível, o rate limiting era silenciosamente desativado, expondo o endpoint de login a ataques de força bruta.

**Solução:** Implementado um sistema de rate limiting em memória (`Map`) que entra em ação automaticamente quando o Redis não está disponível. O comportamento é idêntico ao do Redis: máximo de 5 tentativas falhadas por IP em 15 minutos.

**Ficheiros alterados:** `server/_core/auth.ts`

---

### S-04 — Sincronização do Journal do Drizzle

**Problema:** A migração `0001_initial_schema.sql` existia no diretório de migrações mas não estava registada no `_journal.json`, causando inconsistências no sistema de migrações e potencialmente deixando tabelas por criar em instalações novas.

**Solução:** O `_journal.json` foi atualizado para incluir a entrada da migração `0001`, garantindo que o Drizzle a aplica corretamente em novas instalações.

**Ficheiros alterados:** `drizzle/migrations/meta/_journal.json`

---

### S-05 — Ativação do TypeScript Strict Mode

**Problema:** O `tsconfig.json` não tinha o modo `strict` ativado, permitindo o uso implícito de `any` e a ausência de verificações de `null`/`undefined`, aumentando o risco de erros em runtime.

**Solução:** Ativados `strict: true`, `noImplicitAny: true` e `strictNullChecks: true` no `tsconfig.json`.

**Ficheiros alterados:** `tsconfig.json`

---

## Melhorias de UX e Valorização

### UX-01 — Painel de Notificações Real

**Antes:** O botão do sino na TopBar tinha um badge a pulsar mas não fazia nada ao ser clicado.

**Agora:** Ao clicar no sino, abre-se um painel deslizante com notificações reais do sistema:
- Consultas próximas (nos próximos 60 minutos)
- Consultas a decorrer
- Alertas de saúde dos utentes
- Estado do sistema
- Marcar como lida / limpar todas
- Badge com contagem de não lidas

**Ficheiros criados:** `client/src/components/NotificationPanel.tsx`  
**Ficheiros alterados:** `client/src/components/TopBar.tsx`

---

### UX-02 — Fluxo de Recuperação de Password

**Antes:** A página de login não tinha qualquer opção para recuperar a password, obrigando o administrador a intervir manualmente na base de dados.

**Agora:** Implementado fluxo completo de recuperação:
- Link "Esqueci-me da password" no formulário de login
- Formulário de introdução de email
- Geração de token seguro (32 bytes aleatórios, TTL 30 minutos)
- Endpoint `/api/auth/recuperar-password` com proteção anti-enumeração
- Endpoint `/api/auth/reset-password` para redefinir a password com o token
- Ecrã de confirmação com instruções claras
- Registo no log de auditoria

**Nota:** O envio de email requer configuração de SMTP no `.env` (variáveis `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`). Sem SMTP configurado, o token é registado no log do servidor para uso em desenvolvimento.

**Ficheiros alterados:** `client/src/pages/LoginPage.tsx`, `server/_core/auth.ts`

---

### UX-03 — Consistência de Versão

**Antes:** Múltiplos ficheiros referenciavam "V31" ou "V31.1" de forma inconsistente.

**Agora:** Todas as referências de versão foram atualizadas para "V32" de forma consistente em todos os ficheiros do cliente e do servidor.

**Ficheiros alterados:** Todos os ficheiros `.tsx`/`.ts` com referências de versão

---

### UX-04 — Exportação CSV e XLSX

**Antes:** Não existia forma de exportar dados tabulares para formatos de folha de cálculo.

**Agora:** Novos endpoints de exportação protegidos por autenticação e RBAC:

| Endpoint | Formato | Entidade |
|---|---|---|
| `GET /api/export/utentes.csv` | CSV | Utentes |
| `GET /api/export/utentes.xlsx` | XLSX | Utentes |
| `GET /api/export/consultas.csv` | CSV | Consultas |
| `GET /api/export/consultas.xlsx` | XLSX | Consultas |
| `GET /api/export/pagamentos.csv` | CSV | Pagamentos |
| `GET /api/export/pagamentos.xlsx` | XLSX | Pagamentos |
| `GET /api/export/faturacao.csv` | CSV | Faturação |
| `GET /api/export/faturacao.xlsx` | XLSX | Faturação |

Características:
- CSV com BOM UTF-8 para compatibilidade com Excel em Windows
- Separador ponto e vírgula (padrão europeu)
- XLSX com larguras de coluna configuradas e primeira linha congelada
- Nomes de ficheiro com data (ex: `dentcare_utentes_2026-03-04.xlsx`)
- Verificação de permissões RBAC por entidade

**Ficheiros criados:** `server/services/exportService.ts`, `server/services/exportRoutes.ts`  
**Ficheiros alterados:** `server/_core/index.ts`

---

### UX-05 — Limpeza de Código Morto

**Antes:** O ficheiro `client/src/main-old.tsx` (código obsoleto) estava presente no projeto, aumentando a confusão e o tamanho do bundle.

**Agora:** O ficheiro foi removido. O projeto está mais limpo e o bundle de produção é ligeiramente menor.

---

## Instalador Windows 11

### INSTALAR_WINDOWS.bat — Instalador Totalmente Automático

Novo instalador `.bat` para Windows 10/11 (64-bit) que:

1. **Verifica privilégios** de administrador antes de iniciar
2. **Deteta gestores de pacotes** (winget, chocolatey)
3. **Instala Node.js** automaticamente via winget, chocolatey ou MSI direto
4. **Instala pnpm** via npm
5. **Deteta MySQL/MariaDB** em múltiplas localizações (incluindo XAMPP, WAMP)
6. **Instala MySQL** automaticamente via winget ou chocolatey se não encontrado
7. **Configura o `.env`** interativamente com geração automática de segredos
8. **Cria a base de dados** e aplica o schema
9. **Instala dependências** do projeto
10. **Compila o frontend** para produção
11. **Cria atalho** no Ambiente de Trabalho
12. **Inicia o servidor** e abre o browser automaticamente
13. **Gera log completo** em `dentcare_install.log`

---

## Pontos Negativos e Limitações Conhecidas (Honestidade Crítica)

Seguindo a filosofia de transparência total:

- **Recuperação de password por email:** Requer configuração manual de SMTP. Sem ela, o fluxo funciona mas o email não é enviado — o token aparece apenas no log do servidor.
- **Notificações em tempo real:** O painel de notificações usa polling via tRPC (não WebSockets). Em clínicas com muita atividade, pode haver um atraso de alguns segundos.
- **Rate limiting em memória:** Não é partilhado entre múltiplas instâncias do servidor. Em ambientes com load balancing, o Redis continua a ser obrigatório.
- **Exportação XLSX:** Usa SheetJS (já incluído), sem formatação avançada de células (cores, fórmulas). Para relatórios mais elaborados, o PDF existente continua a ser a melhor opção.
- **Instalador Windows:** Testado concetualmente; em ambientes com políticas de grupo restritivas ou antivírus agressivos, pode ser necessária intervenção manual.
- **TypeScript strict mode:** A ativação do strict mode pode revelar erros de tipo latentes em futuras adições de código. Não afeta o código existente compilado.
