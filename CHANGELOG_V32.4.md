# CHANGELOG V32.4 — Especialidades, Pagamentos, Comissões e Performance

## Data: 10/03/2026

---

## Correções V32.4 (Patch 2) — Comissões, Ficha Dentista e Agenda DIA

### 🔧 BUG FIX: Comissão do Dentista no Pagamento
**Problema:** Quando o utente pagava uma fatura, a comissão do dentista não era calculada nem registada.

**Solução implementada:**
- Nova tabela `comissoes_medicos` no schema e migração `0004_add_comissoes_medicos.sql`
- O endpoint `faturacao.registarPagamento` agora, após criar o recibo, calcula automaticamente a comissão do dentista:
  - Obtém o `percentualComissao` do médico associado à fatura
  - Calcula `valorComissao = valorBase × percentual / 100`
  - Insere registo na tabela `comissoes_medicos` com estado `pendente`
- A comissão fica pendente até a clínica a marcar como paga ao dentista

### ✨ NOVO: Ficha do Dentista com Relatório de Comissões
**Problema:** A ficha do dentista não existia — não havia forma de ver o relatório de pagamentos/comissões.

**Solução implementada:**
- Novos endpoints no `dentistas.ts`:
  - `obterFichaDentista` — ficha completa com tratamentos, consultas, comissões e resumo financeiro
  - `obterRelatorioComissoes` — relatório de comissões com filtro por período
  - `marcarComissaoPaga` — marcar uma comissão individual como paga ao médico
  - `marcarComissoesPagas` — marcar todas as comissões pendentes de um médico como pagas
- `EquipaPage.tsx` atualizada com:
  - Botão "Ver Ficha" (icóne olho) em cada dentista na tabela
  - `ModalFichaDentista` com 4 tabs: Resumo, Comissões/Pagamentos, Tratamentos, Consultas
  - Tab Resumo: KPIs (total faturado, comissões pendentes, comissões pagas, lucro clínica)
  - Tab Comissões: tabela com todas as comissões, filtro por estado, botão "Pagar Todas as Pendentes"
  - Tab Tratamentos: histórico de tratamentos do dentista
  - Tab Consultas: histórico de consultas do dentista

### 🔧 BUG FIX: ModalDentista não enviava todos os campos
**Problema:** Ao criar/editar um dentista, apenas `nome` e `cedulaProfissional` eram enviados — especialidade, email, telemóvel e comissão eram ignorados.

**Solução:** `ModalDentista` agora envia todos os campos e suporta edição (chama `actualizar` em modo de edição).

### ⚡ PERFORMANCE FIX: Agenda DIA muito lenta
**Problema:** A vista DIA criava um componente `SlotDrop` (com `useDroppable` do dnd-kit) por cada slot de 30 minutos por médico. Com 14 horas × 2 slots × N médicos = centenas de componentes registados no DnD context, causando lentidão.

**Solução — `ColunaDrop`:**
- Novo componente `ColunaDrop`: UMA zona de drop por coluna de médico (em vez de N_horas × 2)
- O slot de destino é calculado pela posição Y do clique/drop, sem necessidade de componentes individuais
- Redução de ~280 para ~5 componentes droppable registados no DnD context
- Drag & drop continua a funcionar: o `handleDragEnd` calcula a nova hora pelo delta Y do movimento
- `SlotDrop` mantido apenas na VistaSemana (7 dias × N_horas × 2 ≈ 200 slots, aceitável)

**Ficheiros alterados (Patch 2):**

| Ficheiro | Alteração |
|----------|----------|
| `drizzle/schema.ts` | Nova tabela `comissoes_medicos` |
| `drizzle/migrations/0004_add_comissoes_medicos.sql` | Migração SQL da nova tabela |
| `drizzle/migrations/meta/_journal.json` | Registo da nova migração |
| `server/routers/faturacao.ts` | `registarPagamento` agora calcula e regista comissão |
| `server/routers/dentistas.ts` | Novos endpoints de ficha e comissões |
| `client/src/pages/EquipaPage.tsx` | `ModalDentista` corrigido + nova `ModalFichaDentista` |
| `client/src/pages/AgendaPage.tsx` | `VistaDia` otimizada com `ColunaDrop` (performance fix) |

---

## Novas Funcionalidades (Patch 1 original)

---

## Novas Funcionalidades

### 1. Tab "Especialidades" (Nova)
- **8 especialidades** configuradas: Ortodontia, Implantologia, Periodontia, Endodontia, Cirurgia Oral, Prostodontia, Estética Dentária e Pedodontia
- Cada especialidade tem **ícone, cor e descrição** próprios
- **Cards interativos** com contagem de tratamentos e valor total por especialidade
- **Filtro por especialidade** — clicar num card filtra os tratamentos dessa área
- **Tratamentos listados por especialidade** com estado, valor e link para a fatura
- **Navegação cruzada** — clicar num tratamento navega para a tab de Tratamentos

### 2. Tab "Pagamentos" (Nova)
- **4 KPIs financeiros** interativos: Total Faturado, Pago, Pendente e Anulado
- **Barra de progresso** visual do estado de pagamento (verde/amarelo/vermelho)
- **Tabela de faturas** completa com:
  - Número da fatura
  - Tratamento associado
  - Data de emissão e vencimento
  - Valor (total e base)
  - Estado com badge colorido
  - Acções rápidas (ver detalhes, registar pagamento)
- **Filtros** por estado (Todos/Pagas/Pendentes/Anuladas) e pesquisa por texto
- **Modal de detalhes da fatura** com todas as informações e botão de pagamento
- **Modal de registo de pagamento** com selecção de método (Numerário, Multibanco, MB WAY, Transferência)
- **Histórico de últimos pagamentos** com método e data
- Conectado ao endpoint `faturacao.registarPagamento` do servidor

### 3. Tab "Tratamentos" (Melhorada)
- **Filtros por estado** (Todos, Pendente, Em Progresso, Concluído, Cancelado)
- **Filtro por especialidade** (dropdown dinâmico baseado nos tratamentos existentes)
- **Coluna "Fatura"** — mostra o estado da fatura associada ao tratamento
- **Link directo** — clicar no badge da fatura navega para a tab de Pagamentos
- Botão "Novo Tratamento" com **campo de especialidade** no formulário

### 4. Dashboard (Melhorado)
- **KPIs clicáveis** — clicar em Consultas, Tratamentos, Pagamentos ou Imagens navega para a tab respectiva
- **Secção "Especialidades do Utente"** — mostra as especialidades activas com cards interativos
- **Resumo Financeiro clicável** — navega para a tab de Pagamentos
- **Seta de navegação** (ArrowUpRight) aparece no hover dos cards
- **Tratamentos em Curso** — clicáveis, navegam para a tab de Tratamentos

### 5. Badges de Notificação nas Tabs
- Tab **Pagamentos** mostra badge vermelho com número de faturas pendentes
- Tab **Tratamentos** mostra badge com número de tratamentos activos/propostos

### 6. Odontograma (Melhorado)
- Ao seleccionar um dente, mostra **tratamentos associados** a esse dente
- Tratamentos são **clicáveis** e navegam para a tab de Tratamentos

### 7. Interatividade Global
- Todas as secções estão **interconectadas**:
  - Dashboard → Especialidades → Tratamentos → Pagamentos
  - Odontograma → Tratamentos
  - Tratamentos → Faturas/Pagamentos
  - Faturas → Detalhes → Registar Pagamento

---

## Ficheiros Alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/pages/FichaUtentePage.tsx` | Reescrito com novas tabs, componentes e interatividade |

## Notas Técnicas
- Todas as novas funcionalidades são client-side e utilizam os endpoints existentes do servidor
- O endpoint `faturacao.registarPagamento` é utilizado para registar pagamentos
- A classificação de especialidades é baseada em keywords na descrição dos tratamentos
- Sem alterações no schema da base de dados
- Sem alterações nos routers do servidor
