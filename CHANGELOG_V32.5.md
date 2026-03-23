# Changelog V32.5 — Redesign Completo da Ficha do Utente

## Visão Geral

Redesign total da **FichaUtentePage.tsx** com integrações completas entre todos os módulos clínicos, financeiros e laboratoriais. O ficheiro passou de ~2529 linhas para ~2363 linhas mais organizadas, com 29 componentes modulares.

---

## Novas Funcionalidades

### 1. Header Premium do Utente
- Avatar com gradiente baseado nas iniciais do nome
- **Health Score** visual (0-100) com indicador circular animado
- Badge de estado (activo/inactivo)
- Dados pessoais organizados com ícones (idade, telemóvel, email, NIF, morada)
- Ações rápidas: Editar, Novo Tratamento, Download PDF, Partilhar

### 2. Dashboard Clínico Redesenhado
- **4 KPIs principais** clicáveis: Consultas, Tratamentos, Pagamentos, Imagens
- Alertas clínicos (alergias, condições de saúde) com destaque visual
- Próximas consultas com countdown ("daqui a 3 dias")
- Última consulta com observações
- Resumo financeiro com barra de progressão de pagamento
- Envios de laboratório activos com mini-barra de progresso
- Tratamentos de ortodontia em curso
- Tratamentos activos com estado editável
- Especialidades do utente com cards coloridos

### 3. Tab Laboratório (NOVA)
- **Workflow completo de etapas**: Criado → Enviado → Recebido Lab → Em Produção → Pronto → Devolvido → Em Prova → Concluído
- Barra de progressão visual por envio
- **Timeline de atualizações** com histórico de estados
- Mudança de estado inline com dropdown
- KPIs: Total envios, em curso, concluídos, valor investido
- Cards expandíveis com detalhes completos
- Informações do laboratório e tipo de trabalho

### 4. Tab Ortodontia (NOVA)
- Tratamentos ortodônticos filtrados automaticamente
- **Etapas específicas por tipo**:
  - Alinhadores: Scan → ClinCheck → Receção → Fase Inicial → Intermédia → Final → Contenção
  - Brackets: Documentação → Colagem → Alinhamento → Nivelamento → Fechamento → Acabamento → Remoção
  - Genérico: Avaliação → Planeamento → Tratamento → Finalização → Contenção
- Barra de progressão por tratamento
- Consultas de controlo ortodôntico
- Informação financeira (valor total, duração, custo mensal)

### 5. Tab Imagiologia (MELHORADA)
- **Galeria com 2 modos**: Grid e Lista
- Filtros por tipo de imagem (radiografia periapical, panorâmica, fotografia, etc.)
- **Lightbox premium** com zoom e detalhes
- Indicador de análise IA nas imagens
- KPIs: Total imagens, radiografias, fotografias, com análise IA

### 6. Tab Pagamentos (MELHORADA)
- **Dashboard financeiro completo** com 4 KPIs
- Barra de progressão global de pagamento
- Filtros por estado (pendente, paga, anulada)
- Pesquisa por número de fatura
- **Modal de pagamento** com seleção de método (Numerário, Multibanco, MB WAY, Transferência)
- Lista de últimos pagamentos
- Modal de detalhes de fatura

### 7. Odontograma Interactivo (MELHORADO)
- Legenda visual com todos os estados
- Arcada superior e inferior com separador "Linha Oclusal"
- Detalhes expandidos por dente selecionado
- Tratamentos relacionados ao dente
- Imagens relacionadas ao dente

### 8. Tab Tratamentos (MELHORADA)
- Filtros por estado e especialidade
- Tabela profissional com colunas: Descrição, Médico, Data, Valor, Estado, Fatura
- Integração com faturas (badge de estado da fatura)
- Mudança de estado inline

### 9. Tab Consultas (MELHORADA)
- KPIs: Total, Realizadas, Agendadas, No-Show
- Filtros por estado
- Badge "Futura" para consultas agendadas

### 10. Tab Saúde (Anamnese)
- Alertas de saúde destacados
- Respostas do questionário organizadas em grid
- Indicador de assinatura digital

### 11. Tab Especialidades
- Grid de especialidades com cards coloridos
- Tratamentos filtrados por especialidade selecionada
- Valores por especialidade

---

## Componentes Reutilizáveis Criados

| Componente | Descrição |
|---|---|
| `AvatarUtente` | Avatar com gradiente baseado no nome |
| `HealthScoreWidget` | Indicador circular de saúde (0-100) |
| `KPICard` | Card de métrica com ícone, valor e subtítulo |
| `ProgressBar` | Barra de progressão animada com label |
| `SectionHeader` | Cabeçalho de secção com ícone |
| `EmptyState` | Estado vazio com ícone e mensagem |
| `StatusDropdownTratamento` | Dropdown inline para mudar estado |
| `Dente` | Componente visual do dente no odontograma |
| `ModalEditarUtente` | Modal de edição de dados pessoais |
| `ModalCriarTratamento` | Modal de criação de tratamento |
| `ModalDetalhesFatura` | Modal de detalhes e pagamento de fatura |

---

## Configurações e Constantes

- `LAB_WORKFLOW_STEPS`: 10 etapas do workflow de laboratório com ícones e cores
- `TIPOS_IMAGEM_LABEL`: Labels e cores para cada tipo de imagem
- `ESTADOS_DENTE`: Estados do odontograma com cores
- `ESTADO_CONSULTA_COR`: Cores por estado de consulta
- `ESTADO_FATURA_COR`: Cores e labels por estado de fatura
- `ESPECIALIDADE_CONFIG`: Configuração visual por especialidade

---

## Integrações com APIs Existentes

| Endpoint | Utilização |
|---|---|
| `fichaUtente.obterFicha` | Dados completos do utente |
| `fichaUtente.actualizarDados` | Edição de dados pessoais |
| `fichaUtente.actualizarTratamento` | Mudança de estado do tratamento |
| `tratamentos.criarTratamento` | Criação de novo tratamento |
| `tratamentos.actualizarTratamento` | Dropdown de estado |
| `laboratorios.listarEnvios` | Envios de laboratório do utente |
| `laboratorios.atualizarEstado` | Mudança de estado do envio |
| `faturacao.registarPagamento` | Registo de pagamento de fatura |

---

## Notas Técnicas

- Ficheiro: `client/src/pages/FichaUtentePage.tsx`
- Backup do original: `client/src/pages/FichaUtentePage.tsx.bak`
- Total de linhas: ~2363
- Total de componentes: 29 (28 internos + 1 export)
- Braces balanceados: 1389/1389
- Parênteses balanceados: 1535/1535
- Sem dependências externas adicionais
