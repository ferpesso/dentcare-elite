# DentCare V32.8 — Gestão de Materiais de Laboratório

**Data:** Março 2026  
**Módulo:** Ficha do Utente — Tab Laboratório  
**Build:** ✅ Compilado sem erros

---

## Resumo das Alterações

Esta versão introduz a **gestão completa de materiais físicos** enviados e recebidos de laboratórios externos, integrada directamente na ficha do utente. A funcionalidade estava em falta: existia o workflow de envios, mas não havia rastreamento dos materiais físicos (moldagens, modelos, registos de mordida, etc.) que acompanham cada envio.

---

## Novos Ficheiros

| Ficheiro | Descrição |
|---|---|
| `drizzle/migrations/0005_add_materiais_envio_laboratorio.sql` | Migração SQL com as duas novas tabelas |
| `server/routers/materiais-lab.ts` | Router tRPC completo para materiais e guias de remessa |

---

## Ficheiros Modificados

| Ficheiro | Alterações |
|---|---|
| `drizzle/schema.ts` | Adicionadas tabelas `materiaisEnvioLab` e `guiasRemessaLab` |
| `server/routers.ts` | Registado o router `materiaisLab` |
| `client/src/pages/FichaUtentePage.tsx` | Componentes de materiais, alertas e melhorias no dashboard |

---

## Base de Dados — Novas Tabelas

### `materiais_envio_lab`

Regista cada material físico associado a um envio de laboratório.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | serial | Chave primária |
| `envio_id` | bigint FK | Envio de laboratório associado |
| `tipo_material` | enum | Tipo de material (24 tipos disponíveis) |
| `descricao` | varchar(255) | Descrição livre do material |
| `quantidade` | int | Quantidade de unidades |
| `estado` | enum | Estado actual do material (9 estados) |
| `direcao` | enum | `clinica_para_lab` ou `lab_para_clinica` |
| `data_envio` | datetime | Data de envio |
| `data_rececao` | datetime | Data de receção confirmada |
| `observacoes` | text | Notas adicionais |
| `verificado_por` | varchar(100) | Nome de quem verificou |

**Tipos de Material disponíveis:**
- Moldagem Alginato, Moldagem Silicone, Moldagem Digital
- Modelo Gesso, Modelo Articulador
- Registo Mordida, Registo Arco Facial
- Provisório, Dente Provisório
- Núcleo/Espigão, Componente Implante
- Scan Intraoral, Fotografias, Radiografias
- Guia Cirúrgica, Goteira, Placa Base, Rolos de Cera
- Prova Metal, Prova Cerâmica, Prova Acrílico, Prova Zircónia
- Trabalho Anterior, Outro

**Estados do Material:**
`preparado` → `enviado_lab` → `recebido_lab` → `em_uso` → `devolvido_clinica` → `recebido_clinica`  
Estados de excepção: `extraviado`, `danificado`, `descartado`

### `guias_remessa_lab`

Documenta formalmente cada expedição de materiais com numeração automática.

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | serial | Chave primária |
| `envio_id` | bigint FK | Envio associado |
| `numero_guia` | varchar(50) UNIQUE | Número automático (ex: GR-2026-0001) |
| `tipo` | enum | `envio`, `devolucao`, `reenvio` |
| `transportadora` | varchar(100) | Nome da transportadora |
| `codigo_rastreamento` | varchar(100) | Tracking number |
| `materiais_ids` | text (JSON) | IDs dos materiais incluídos |
| `assinatura_envio` | varchar(100) | Quem enviou |
| `assinatura_rececao` | varchar(100) | Quem recebeu |
| `data_rececao_confirmada` | datetime | Confirmação de receção |

---

## Backend — Router `materiaisLab`

Endpoints tRPC disponíveis em `(trpc as any).materiaisLab.*`:

| Endpoint | Tipo | Descrição |
|---|---|---|
| `listarPorEnvio` | query | Lista materiais de um envio com resumo |
| `listarPorUtente` | query | Lista todos os materiais de um utente |
| `adicionar` | mutation | Adiciona um material a um envio |
| `adicionarBatch` | mutation | Adiciona vários materiais de uma vez |
| `actualizarEstado` | mutation | Actualiza estado de um material |
| `actualizarEstadoBatch` | mutation | Actualiza estado de vários materiais |
| `remover` | mutation | Remove um material |
| `listarGuias` | query | Lista guias de remessa de um envio |
| `criarGuia` | mutation | Cria guia de remessa com numeração automática |
| `confirmarRececaoGuia` | mutation | Confirma receção e actualiza materiais |
| `obterDadosGuia` | query | Dados completos para PDF da guia |

---

## Frontend — Componentes Adicionados

### `MateriaisEnvioSection`

Componente integrado na secção expandida de cada envio na **Tab Laboratório** da ficha do utente.

**Funcionalidades:**
- **KPIs mini** — Total, Enviados, Recebidos, Problemas
- **Checklist de materiais enviados** (Clínica → Lab) com checkboxes de selecção
- **Checklist de materiais recebidos** (Lab → Clínica) com verificação
- **Selecção em lote** — Marcar vários materiais de uma vez
- **Acções em lote** — Enviado, Recebido Lab, Devolvido, Recebido Clínica
- **Menu contextual** por material — Alterar estado ou remover
- **Lista de guias de remessa** com estado de receção
- **Modal de adição** de novo material com selector de tipo
- **Modal de criação de guia** com selecção de materiais a incluir

### `ModalGuiaRemessa`

Modal para criação de guias de remessa/expedição.

**Campos:**
- Tipo de guia (Envio / Devolução / Reenvio)
- Transportadora e código de rastreamento
- Assinatura de quem envia
- Selecção visual dos materiais a incluir
- Observações

---

## Melhorias no Dashboard da Ficha do Utente

### Alertas Inteligentes no Card de Laboratório

Dois novos alertas contextuais aparecem automaticamente quando relevante:

1. **Alerta Vermelho** — Envios atrasados (data prevista ultrapassada) ou com prioridade "Muito Urgente"
2. **Alerta Verde** — Trabalhos prontos para recolha no laboratório ou devolvidos a aguardar confirmação

### Card de Envio Melhorado

Cada envio no dashboard agora mostra:
- Indicador de prioridade (urgente/muito urgente) com badge colorido
- Contador de dias restantes/atraso com código de cores
- Nome do laboratório e dente associado
- Seta de navegação para a tab de laboratório

---

## Instalação / Aplicação da Migração

Para aplicar as novas tabelas na base de dados, executar:

```sql
-- Executar o ficheiro de migração:
-- drizzle/migrations/0005_add_materiais_envio_laboratorio.sql
```

Ou via Drizzle Kit:
```bash
pnpm drizzle-kit push
```

---

## Notas Técnicas

- Todas as permissões utilizam `laboratorios.read` (compatível com roles existentes)
- Todas as mutações são registadas no log de auditoria
- A tabela `materiais_envio_lab` tem CASCADE DELETE ao eliminar o envio pai
- O número da guia é gerado automaticamente no formato `GR-YYYY-NNNN`
- O campo `materiais_ids` na guia de remessa é JSON serializado (array de IDs)
- Build verificado: ✅ `3400 modules transformed` sem erros
