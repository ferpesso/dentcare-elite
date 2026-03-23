# DentCare Elite — Changelog V32.2
## Upgrade: Sistema de Configurações Completo

**Data:** Março 2026  
**Versão anterior:** V32.1 DEFINITIVO V10  
**Versão actual:** V32.2 — Config Upgrade

---

## Resumo das Alterações

Esta versão traz uma reformulação completa do sistema de configurações, tornando-o mais completo, interactivo, dinâmico e com propagação automática por todo o programa.

---

## Ficheiros Alterados

| Ficheiro | Tipo | Descrição |
|---|---|---|
| `client/src/contexts/ConfigContext.tsx` | **NOVO** | Contexto global de configurações com propagação automática |
| `client/src/pages/SistemaPage.tsx` | **REDESENHADO** | Página de configurações completamente reescrita (1041 linhas) |
| `server/routers/configuracoes.ts` | **EXPANDIDO** | Router com 40+ chaves e endpoint de batch update |
| `client/src/main.tsx` | **ACTUALIZADO** | ConfigProvider adicionado ao topo da árvore React |
| `client/src/navigation.ts` | **ACTUALIZADO** | Menu de configurações reorganizado |
| `client/src/pages/DashboardPage.tsx` | **ACTUALIZADO** | Moeda dinâmica via ConfigContext |
| `client/src/pages/FinanceiroPage.tsx` | **ACTUALIZADO** | Moeda dinâmica via ConfigContext + PDF export |

---

## Novas Funcionalidades

### 1. ConfigContext — Propagação Automática
- Contexto React global que carrega todas as configurações da BD
- Qualquer componente pode aceder via `useConfig()`
- Quando as configurações são guardadas, `refetch()` propaga automaticamente
- Helpers: `getConfig()`, `getConfigBool()`, `getConfigNum()`, `getConfigJson()`, `formatMoeda()`
- Resiliente a falhas de autenticação (retorna defaults seguros)

### 2. Nova SistemaPage — 8 Tabs Completas

#### Tab 1: Clínica
- Nome, NIF/NIPC, email, telefone, website
- Morada completa (rua, cidade, código postal, país)
- Pré-seleção: Portugal como país padrão

#### Tab 2: Agenda & Metas
- Horário de abertura/encerramento (input time nativo)
- Dias de funcionamento (botões visuais interactivos, Seg-Sex pré-seleccionados)
- Duração do slot (15/20/30/45/60 min — 30 pré-seleccionado)
- Intervalo entre consultas
- Máximo de consultas por dia
- Antecedência mínima e máxima para marcação
- **Metas de receita** (diária e mensal) — propagam para Dashboard e IA Preditiva
- Meta de consultas por dia

#### Tab 3: Aparência
- Idioma (pt-PT pré-seleccionado)
- Fuso horário (Europe/Lisbon pré-seleccionado)
- Moeda (EUR pré-seleccionado) — símbolo actualiza automaticamente
- Formato de data e hora
- **Pré-visualização em tempo real** do formato escolhido
- Selector de tema (Escuro/Claro)

#### Tab 4: Notificações
- Canais: Email, SMS, WhatsApp (com toggles)
- Lembretes automáticos (com selector de antecedência)
- Alertas: aniversários, pagamentos em atraso, stocks baixos
- Alertas: consultas canceladas, novos utentes
- Cada toggle expande opções adicionais quando activado

#### Tab 5: Segurança
- 2FA (autenticação de dois factores)
- Timeout de sessão inactiva
- Registo de auditoria
- Whitelist de IP (com campo para IPs permitidos)
- Tentativas de login antes de bloqueio
- Duração do bloqueio
- Alteração de password (com show/hide)

#### Tab 6: Integrações
- **Twilio WhatsApp**: Account SID, Auth Token (oculto), número
- **MBWAY**: API Key (oculto)
- **AT — Autoridade Tributária**: NIF, senha de comunicação
- Cada integração tem toggle de activação com expansão condicional
- Indicador visual de estado (Online/Offline)

#### Tab 7: Faturação
- Série de faturação (FT/FR/FS/NC)
- Próximo número de fatura
- Taxa de IVA padrão (com opções pré-definidas para PT, ES, FR, DE)
- Prazo de vencimento
- Observações padrão nas faturas
- Aviso legal sobre conformidade SAFT-PT

#### Tab 8: Dados
- Estado dos serviços em tempo real (BD, SSL, WhatsApp, MBWAY, AT)
- Informações do sistema (versão, ambiente, Node.js)
- Backup e exportação (JSON, SAFT, CSV utentes, Excel financeiro)
- Zona de perigo (limpar dados de teste)

### 3. Endpoint `actualizarLote` (Batch Update)
- Actualiza múltiplas configurações numa única transacção
- Só actualiza registos que realmente mudaram (optimização)
- Registo de auditoria com lista de chaves alteradas

### 4. Moeda Dinâmica em Todo o Programa
- **DashboardPage**: KPIs, estatísticas, gráfico de barras, relatório executivo
- **FinanceiroPage**: KPIs, tabela de movimentos, gráfico de evolução, exportação PDF
- Símbolo actualiza automaticamente ao mudar a moeda nas configurações

---

## Chaves de Configuração (40+)

### Clínica (9 chaves)
`nome_clinica`, `email_clinica`, `telefone_clinica`, `morada_clinica`, `cidade_clinica`, `codigo_postal_clinica`, `pais_clinica`, `nif_clinica`, `website_clinica`

### Agenda (8 chaves)
`horario_abertura`, `horario_encerramento`, `dias_funcionamento`, `duracao_slot`, `intervalo_consultas`, `slots_por_dia`, `antecedencia_minima_marcacao`, `antecedencia_maxima_marcacao`

### Metas (3 chaves)
`meta_receita_diaria`, `meta_receita_mensal`, `meta_consultas_dia`

### Aparência (6 chaves)
`idioma`, `moeda`, `simbolo_moeda`, `fuso_horario`, `formato_data`, `formato_hora`

### Notificações (12 chaves)
`notif_email`, `notif_sms`, `notif_whatsapp`, `notif_lembretes`, `notif_lembretes_horas`, `notif_aniversarios`, `notif_pagamentos_atraso`, `notif_pagamentos_atraso_dias`, `notif_stocks_baixo`, `notif_stocks_minimo`, `notif_consultas_canceladas`, `notif_novos_utentes`

### Segurança (7 chaves)
`seguranca_2fa`, `seguranca_sessao_timeout`, `seguranca_log_auditoria`, `seguranca_ip_whitelist`, `seguranca_ips_permitidos`, `seguranca_tentativas_login`, `seguranca_bloqueio_minutos`

### Integrações (9 chaves)
`whatsapp_account_sid`, `whatsapp_auth_token`, `whatsapp_number`, `whatsapp_ativo`, `mbway_ativo`, `mbway_api_key`, `at_ativo`, `at_nif`, `at_senha_comunicacao`

### Faturação (5 chaves)
`faturacao_serie`, `faturacao_proximo_numero`, `faturacao_taxa_iva`, `faturacao_observacoes_padrao`, `faturacao_vencimento_dias`

---

## Próximos Passos Recomendados

### Prioridade Alta
1. **Integrar moeda dinâmica nas páginas restantes** — `FaturacaoPage.tsx`, `StocksPage.tsx`, `AlertasSaudePage.tsx`, `IAPreditivaPage.tsx`, `FichaUtentePage.tsx`
2. **Implementar o 2FA real** — actualmente o toggle guarda a preferência mas não activa o 2FA no servidor
3. **Implementar o timeout de sessão** — usar o valor `seguranca_sessao_timeout` no middleware de autenticação
4. **Implementar a whitelist de IP** — usar `seguranca_ips_permitidos` no middleware Express

### Prioridade Média
5. **Lembretes automáticos reais** — usar `notif_lembretes_horas` para agendar envio via WhatsApp/email
6. **Alertas de stocks** — usar `notif_stocks_minimo` no router de stocks para disparar alertas
7. **Alertas de pagamentos em atraso** — usar `notif_pagamentos_atraso_dias` no cron job
8. **Nome da clínica no cabeçalho** — usar `nomeClinica` do ConfigContext no AppLayout
9. **Nome da clínica nas faturas PDF** — usar `nome_clinica` e `nif_clinica` nos PDFs gerados

### Prioridade Baixa
10. **Upload de logotipo** — adicionar campo de logotipo à tab Clínica (requer S3/storage)
11. **Exportação SAFT real** — implementar geração do ficheiro XML SAFT-PT com os dados reais
12. **Integração MBWAY real** — conectar ao gateway de pagamentos com a API key configurada
13. **Integração AT real** — comunicação automática de facturas à Autoridade Tributária
14. **Tema claro funcional** — o toggle existe mas o CSS do tema claro precisa de ser implementado

---

## Como Usar o useConfig nos Seus Componentes

```tsx
import { useConfig } from "../contexts/ConfigContext";

function MeuComponente() {
  const { 
    config,           // Todas as configurações como Record<string, string>
    simboloMoeda,     // "€", "R$", "£", etc.
    nomeClinica,      // "Clínica Dentária Sorriso"
    formatMoeda,      // formatMoeda(1250.50) → "€1.250,50"
    getConfigBool,    // getConfigBool("notif_email") → true/false
    getConfigNum,     // getConfigNum("duracao_slot") → 30
    diasFuncionamento,// [1, 2, 3, 4, 5]
    refetch,          // Forçar re-sincronização
  } = useConfig();

  return <p>{nomeClinica} — {simboloMoeda}1.250,00</p>;
}
```

---

*DentCare Elite V32.2 — Configurações Globais Completas*
