# DentCare V32.7 — Relatório de Correções

## 1. Correções Visuais de Contraste (Tema Claro/Escuro)

### Problema Identificado

Os modais e várias páginas do sistema apresentavam problemas graves de contraste em ambos os temas:

- **Tema Claro**: Texto branco (`text-white`) sobre fundo claro, tornando o conteúdo ilegível.
- **Tema Escuro**: Fundo branco (`bg-white`) e texto escuro (`text-gray-900`) sobre fundo escuro, criando elementos que "brilham" e não se integram no design.

### Causa Raiz

As cores estavam **hardcoded** (fixas) em vez de usarem as variáveis CSS do sistema de temas (`var(--text-primary)`, `var(--bg-elevated)`, etc.). Além disso, variáveis CSS usadas extensivamente nos componentes (`--bg-secondary`, `--bg-tertiary`, `--border-primary`, `--border-secondary`) **não estavam definidas** no `globals.css`.

### Correções Aplicadas

#### 1.1 Variáveis CSS em Falta Adicionadas ao `globals.css`

Adicionadas as seguintes variáveis a todos os 4 blocos de tema (`:root`, `prefers-color-scheme: light`, `[data-theme="dark"]`, `[data-theme="light"]`):

| Variável | Tema Escuro | Tema Claro |
|---|---|---|
| `--bg-secondary` | `#1C1C28` | `#E8EBF2` |
| `--bg-tertiary` | `#252535` | `#E0E3EB` |
| `--border-primary` | `rgba(255,255,255,0.12)` | `rgba(0,0,0,0.12)` |
| `--border-secondary` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` |

#### 1.2 Substituições de Cores Hardcoded (249+ alterações em 13+ ficheiros)

| Padrão Antigo | Substituição | Ficheiros Afetados |
|---|---|---|
| `bg-white` (containers/modais) | `bg-[var(--bg-elevated)]` | EquipaPage, MarketingPage, OdontogramaPage, TermosConsentimentoPage, AnamnesePage |
| `bg-white` (inputs) | `bg-[var(--bg-overlay)]` | EquipaPage, MarketingPage, TermosConsentimentoPage |
| `text-gray-900` / `text-gray-800` | `text-[var(--text-primary)]` | EquipaPage, MarketingPage, FichaUtentePage |
| `text-gray-700` / `text-gray-600` | `text-[var(--text-secondary)]` | EquipaPage, MarketingPage |
| `text-gray-500` / `text-gray-400` | `text-[var(--text-muted)]` | Vários |
| `border-gray-200` / `border-gray-300` | `border-[var(--border-light)]` | EquipaPage, MarketingPage |
| `bg-gray-50` / `bg-gray-100` | `bg-[var(--bg-surface)]` / `bg-[var(--bg-overlay)]` | Vários |
| `placeholder-gray-400` | `placeholder-[var(--text-muted)]` | EquipaPage, MarketingPage, TermosConsentimentoPage |
| `bg-[#1C1C28] text-white` (options) | `bg-[var(--bg-elevated)] text-[var(--text-primary)]` | ModalNovaConsulta, AgendaPage, UtentesPage |
| `bg-[#0A0A0F]` | `bg-[var(--bg-base)]` | StocksPage, main.tsx |
| `select option` hardcoded no CSS | `var(--bg-elevated)` / `var(--text-primary)` | globals.css |

#### 1.3 Correção de Padrões Malformados

Corrigidos padrões como `bg-[var(--bg-surface)]0/20` (gerados por substituições anteriores) para `bg-[var(--bg-surface)]`.

---

## 2. Correção de Faturas Duplicadas

### Problema Identificado

O sistema criava faturas duplicadas em duas situações:

1. **Duplicação automática + manual**: Ao criar um tratamento via `tratamentos.criarTratamento`, uma fatura era gerada automaticamente. Mas o utilizador podia depois criar outra fatura manual via `faturacao.criarFatura` na FichaUtentePage, sem qualquer aviso de que já existia uma fatura pendente.

2. **Race conditions na sequência SAFT**: A sequência de numeração SAFT-PT não usava `SELECT ... FOR UPDATE`, permitindo que dois pedidos concorrentes lessem o mesmo número de sequência e gerassem faturas com números duplicados.

### Correções Aplicadas

#### 2.1 Anti-Duplicação no `criarFatura` (faturacao.ts)

- Adicionada verificação dentro da transação: antes de criar uma nova fatura, verifica se já existe uma fatura pendente para o mesmo utente com valor semelhante (tolerância de 0.02 EUR) criada nos últimos 60 segundos.
- Se detectada duplicação, retorna erro `CONFLICT` com mensagem explicativa incluindo o número da fatura existente.

#### 2.2 Anti-Duplicação no `criarTratamento` (tratamentos.ts)

- Adicionada verificação: antes de criar a fatura automática, verifica se já existe uma fatura associada ao `tratamentoId` recém-criado.
- Apenas cria a fatura se `faturaExistente.length === 0`.

#### 2.3 `SELECT ... FOR UPDATE` na Sequência SAFT-PT

Corrigido em **3 locais**:

| Ficheiro | Endpoint | Correção |
|---|---|---|
| `faturacao.ts` | `criarFatura` | `SELECT * FROM saft_sequences WHERE ano = ? FOR UPDATE` |
| `tratamentos.ts` | `criarTratamento` | `SELECT * FROM saft_sequences WHERE ano = ? FOR UPDATE` |
| `faturacao.ts` | `registarPagamento` | `SELECT * FROM saft_sequences WHERE ano = ? FOR UPDATE` (recibos) |

Isto garante que, em acessos concorrentes, apenas um pedido de cada vez pode ler e incrementar o número de sequência.

#### 2.4 Aviso no Frontend (FichaUtentePage.tsx)

- O botão "Nova Fatura" na FichaUtentePage agora verifica se existem faturas pendentes antes de abrir o modal.
- Se existirem, mostra um `window.confirm()` com a lista de faturas pendentes, pedindo confirmação ao utilizador.

---

## 3. Compilação

O projeto foi compilado com sucesso (`vite build`) sem erros de TypeScript ou de bundling. Apenas avisos normais de tamanho de chunk (que são esperados num projeto desta dimensão).

---

## Ficheiros Modificados

### CSS
- `client/src/globals.css` — Variáveis de tema + estilos de select option

### Frontend (Contraste)
- `client/src/pages/EquipaPage.tsx`
- `client/src/pages/MarketingPage.tsx`
- `client/src/pages/FichaUtentePage.tsx`
- `client/src/pages/OdontogramaPage.tsx`
- `client/src/pages/TermosConsentimentoPage.tsx`
- `client/src/pages/AnamnesePage.tsx`
- `client/src/pages/AgendaPage.tsx`
- `client/src/pages/UtentesPage.tsx`
- `client/src/pages/PermissoesPage.tsx`
- `client/src/pages/IAPreditivaPage.tsx`
- `client/src/pages/StocksPage.tsx`
- `client/src/components/ModalNovaConsulta.tsx`
- `client/src/main.tsx`

### Backend (Faturação)
- `server/routers/faturacao.ts` — Anti-duplicação + FOR UPDATE
- `server/routers/tratamentos.ts` — Anti-duplicação + FOR UPDATE
