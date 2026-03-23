# Changelog V35.1 — Pagamento em Lote + Alertas Dashboard

## Resumo

Esta versão implementa o fluxo completo de **pagamento em lote de comissões ao dentista com upload de comprovativo**, e integra os **Alertas e Notificações do Insights** directamente no **dashboard da ficha do utente**.

---

## 1. Pagamento em Lote com Comprovativo (EquipaPage.tsx)

### Funcionalidades

- **Selecção em lote**: Checkboxes na tabela de comissões pendentes permitem seleccionar múltiplas comissões para pagar de uma só vez.
- **Checkbox "Seleccionar Todas"**: No cabeçalho da tabela, selecciona/deselecciona todas as comissões pendentes.
- **Botão "Registar Pagamento"**: Aparece quando há comissões seleccionadas, mostrando a quantidade e o valor total.
- **Modal de Pagamento**: Permite escolher método de pagamento (transferência, numerário, cheque, MB WAY, outro), referência, observações e **upload de comprovativo**.
- **Upload de Comprovativo**: Arraste ou seleccione ficheiros (PDF, JPG, PNG, WebP) até 10MB, com pré-visualização inline para imagens.
- **Envio automático**: Após confirmar o pagamento, o comprovativo é convertido para base64 e enviado automaticamente ao servidor.
- **Histórico de Pagamentos**: Cada pagamento agrupado mostra o comprovativo anexado com botões "Ver" e "Descarregar", ou zona de upload posterior.

### Componente ModalRegistarPagamento

- Recebe `medicoId`, `comissaoIds`, `valorTotal`, `sm` (símbolo moeda), `onClose`, `onSubmit`, `isPending`
- Estado interno: `metodo`, `referencia`, `observacoes`, `comprovativoFile`, `comprovativoPreview`
- Validação de tamanho (máx. 10MB) e tipo de ficheiro
- Pré-visualização inline para imagens, ícone de ficheiro para PDFs

---

## 2. Alertas e Notificações no Dashboard do Utente (FichaUtentePage.tsx)

### Funcionalidades

- **Health Score Compacto**: Score de saúde oral (0-100) com gauge circular, classificação e resumo dos alertas activos.
- **Alertas Críticos**: Dívida pendente e alergias detectadas em destaque vermelho com botões de acção.
- **Alertas e Avisos**: Sem consulta recente, tratamentos pendentes, anamnese em falta, sem panorâmica, dentes com problema, tratamentos em progresso, sem próxima consulta.
- **Recomendações Rápidas**: Destartarização, panorâmica, tratar cáries, documentação fotográfica, actualizar anamnese.
- **Prop odontogramaData**: Adicionada ao DashboardClinico para alimentar alertas de dentes com problema.

---

## 3. Correções na Base de Dados

### Tabela `medicos`
- Adicionada coluna `tipo_remuneracao` (enum: percentual, percentual_diaria) com default 'percentual'
- Adicionada coluna `valor_diaria` (decimal 10,2) com default 0.00
- Corrigido default de `cor_agenda` para '#6366F1'

### Tabela `faturas`
- Adicionada coluna `parcelado` (tinyint) com default 0
- Adicionada coluna `total_parcelas` (int) nullable

### Tabela `comissoes_medicos`
- Adicionada coluna `pagamento_comissao_id` (bigint unsigned) nullable — referência ao pagamento agrupado

### Tabela `pagamentos_comissoes` (nova)
- Tabela para pagamentos agrupados de comissões
- Colunas: id, medico_id, valor_total, metodo_pagamento, referencia, data_pagamento, observacoes, comprovativo_url, comprovativo_nome, created_by, created_at, updated_at

### Tabelas adicionadas (migration 0006)
- `notificacoes` — Sistema de notificações internas
- `clinic_health_snapshots` — Snapshots de saúde da clínica
- `conversas_ia` — Conversas com IA
- `comunicacoes_log` — Log de comunicações (WhatsApp, SMS, email)

### Schema SQL Completo
- Ficheiro `drizzle/schema_completo_corrigido.sql` actualizado com todas as tabelas e colunas acima

---

## 4. Ficheiros Alterados

| Ficheiro | Alteração |
|----------|-----------|
| `client/src/pages/EquipaPage.tsx` | ModalRegistarPagamento reescrito, checkboxes, histórico com comprovativo |
| `client/src/pages/FichaUtentePage.tsx` | DashboardClinico com alertas, health score, recomendações |
| `drizzle/schema_completo_corrigido.sql` | Tabelas e colunas corrigidas/adicionadas |
| `drizzle/migrations/0007_add_pagamentos_comissoes.sql` | Migration para pagamentos_comissoes e pagamento_comissao_id |

---

## 5. Credenciais de Teste

| Campo | Valor |
|-------|-------|
| Utilizador | `admin` |
| Password | `Admin123` |

## 6. Como Testar o Pagamento em Lote

1. Criar um utente e um dentista
2. Criar uma fatura associada ao dentista
3. Marcar a fatura como paga (isso cria automaticamente uma comissão pendente)
4. Ir à ficha do dentista → tab "Comissões / Pagamentos"
5. Seleccionar as comissões pendentes com os checkboxes
6. Clicar "Registar Pagamento" → preencher dados e anexar comprovativo
7. Confirmar → o pagamento é registado e o comprovativo fica associado
8. Clicar "Histórico de Pagamentos" para ver os pagamentos agrupados com comprovativo
