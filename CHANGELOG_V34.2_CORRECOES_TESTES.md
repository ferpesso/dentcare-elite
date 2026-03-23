# Changelog V34.2 — Correções para Testes (18/03/2026)

## Resumo

Esta versão corrige todos os erros identificados no fluxo de comunicação WhatsApp, incluindo a validação de telefone, mensagens com datas em branco e a apresentação de erros Zod como JSON bruto. O sistema está agora pronto para testes.

---

## Correções Aplicadas

### 1. Validação de Telefone — `server/routers/whatsapp.ts`

O schema Zod dos endpoints `enviarMensagem` e `enviarMensagemInterativa` exigia `z.string().min(10)` para o campo `telefone`, o que rejeitava números portugueses válidos com 9 dígitos (por exemplo, 926560577). A validação foi alterada para `z.string().min(9, "Número de telefone inválido")`, alinhando com o router de utentes que já aceitava `min(9)`.

| Endpoint | Antes | Depois |
|---|---|---|
| `enviarMensagem` | `z.string().min(10)` | `z.string().min(9, "Número de telefone inválido")` |
| `enviarMensagemInterativa` | `z.string().min(10)` | `z.string().min(9, "Número de telefone inválido")` |

### 2. Normalização de Telefone para Twilio — `server/whatsappService.ts`

Foi adicionada a função `normalizarTelefone()` que converte automaticamente números portugueses de 9 dígitos para o formato internacional E.164 (`+351XXXXXXXXX`), necessário para o envio via Twilio. A normalização é aplicada em ambas as funções de envio (`enviarTextoViaTwilio` e `enviarInteractivaViaTwilio`).

| Entrada | Saída |
|---|---|
| `926560577` | `+351926560577` |
| `351926560577` | `+351926560577` |
| `+351926560577` | `+351926560577` |
| `0035192656057` | `+35192656057` |

### 3. Mensagem de Lembrete com Datas em Branco — Múltiplos ficheiros

O problema "Relembramos a sua consulta agendada para — às —." ocorria quando não existia consulta futura associada ao utente. Foram aplicadas três correções complementares:

**3a. Validação no frontend** (`client/src/components/TabComunicacao.tsx`): Adicionada validação que impede o envio de lembretes, confirmações, follow-ups e pedidos de avaliação quando não existe consulta agendada. O botão de envio fica desabilitado e é mostrado um alerta visual informativo.

**3b. Data na mensagem do backend** (`server/whatsappService.ts`, `server/routers/whatsapp.ts`): O endpoint `enviarLembrete` agora aceita o parâmetro opcional `consultaData` que é incluído na mensagem WhatsApp em vez do texto fixo "amanhã". Todos os pontos de chamada foram atualizados para enviar a data formatada.

**3c. Atualização de todos os chamadores**: Os seguintes ficheiros foram atualizados para enviar `consultaData`:

| Ficheiro | Contexto |
|---|---|
| `client/src/components/TabComunicacao.tsx` | Modal de envio e quick action |
| `client/src/components/PainelConfirmacaoLote.tsx` | Envio em lote |
| `client/src/pages/AgendaPage.tsx` | Lembrete da agenda |
| `server/notificationEngine.ts` | Lembretes automáticos (cron) |

### 4. Erros Zod Mostrados como JSON Bruto — `client/src/components/TabComunicacao.tsx`

Os erros de validação Zod eram apresentados ao utilizador como JSON bruto (por exemplo, `[{ "origin": "string", "code": "too_small", ... }]`). Foi adicionada a função `parseErro()` que extrai mensagens user-friendly dos erros Zod, traduzindo os nomes dos campos para português. Todos os handlers `onError` das mutations foram atualizados para usar esta função.

### 5. Links WhatsApp Direto sem Prefixo — `client/src/components/TabComunicacao.tsx`, `client/src/pages/AgendaPage.tsx`

Os links `wa.me/` para abrir conversa direta no WhatsApp não incluíam o prefixo internacional `351` para números portugueses de 9 dígitos. Ambos os locais foram corrigidos para normalizar o número antes de construir o URL.

---

## Ficheiros Modificados

| Ficheiro | Tipo de Correção |
|---|---|
| `server/routers/whatsapp.ts` | Validação telefone + campo consultaData |
| `server/whatsappService.ts` | Normalização telefone + parâmetro consultaData |
| `server/notificationEngine.ts` | Envio de consultaData nos lembretes automáticos |
| `client/src/components/TabComunicacao.tsx` | Parse erros + validação consulta + consultaData + wa.me |
| `client/src/components/PainelConfirmacaoLote.tsx` | Envio de consultaData |
| `client/src/pages/AgendaPage.tsx` | consultaData + normalização wa.me |

---

## Notas para Testes

Para validar as correções, recomenda-se testar os seguintes cenários:

1. Enviar lembrete WhatsApp para utente com telemóvel de 9 dígitos (ex: 926560577)
2. Enviar lembrete para utente com consulta agendada — verificar que a data aparece na mensagem
3. Tentar enviar lembrete para utente sem consulta agendada — verificar que o botão está desabilitado e o alerta é mostrado
4. Provocar um erro de validação — verificar que a mensagem é legível e não JSON
5. Clicar em "WhatsApp Direto" — verificar que o link abre com o número correto (351...)
6. Enviar confirmação em lote — verificar que a data é incluída nos lembretes
