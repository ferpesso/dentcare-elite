# DentCare V34 — Conectores (Estilo DentCare)

## Resumo

Implementação completa de uma página de **Conectores** nas Configurações, inspirada no design do DentCare, com cards visuais premium para cada serviço, toggle de ativação, configuração inline, teste de conexão em tempo real e estado visual.

---

## Ficheiros Criados

| Ficheiro | Linhas | Descrição |
|----------|--------|-----------|
| `server/routers/conectores.ts` | 709 | Router backend completo com CRUD, testes de conexão e persistência |
| `client/src/pages/ConectoresPage.tsx` | 861 | Página frontend com design premium estilo DentCare |

## Ficheiros Modificados

| Ficheiro | Alteração |
|----------|-----------|
| `server/routers.ts` | Import e registo do `conectoresRouter` |
| `client/src/main.tsx` | Import da `ConectoresPage` e rota `/configuracoes/conectores` |
| `client/src/navigation.ts` | Item "Conectores" com badge V34 no menu Configurações |

---

## Conectores Implementados

### Comunicação Clínica / Utente (6 conectores)

| Conector | Provider | Funcionalidade |
|----------|----------|----------------|
| **Email SMTP** | Gmail, Outlook, SendGrid, etc. | Emails transacionais, lembretes, faturas, campanhas |
| **SMS** | Twilio | Confirmação de consultas, lembretes, alertas urgentes |
| **WhatsApp Business** | Twilio / Meta Cloud API | Chatbot, botões interativos, marcação automática |
| **Notificações Push** | Web Push API / Firebase | Alertas instantâneos no browser e dispositivos |
| **Google Calendar** | Google API | Sincronização bidirecional de consultas |
| **Microsoft Outlook** | Microsoft 365 | Sincronização com Outlook Calendar |

### Redes Sociais (6 conectores)

| Conector | API | Funcionalidade |
|----------|-----|----------------|
| **Facebook** | Meta Graph API v21.0 | Publicação automática, gestão de página, métricas |
| **Instagram** | Instagram Graph API v21.0 | Posts, stories, reels, métricas de alcance |
| **LinkedIn** | Posts API v2 | Publicação profissional e networking |
| **TikTok** | TikTok for Business | Vídeos curtos e tendências |
| **Google Business Profile** | GBP API | Gestão do perfil no Google Maps/Search |
| **Google Reviews** | Places API | Monitorização de avaliações e reputação |

---

## Funcionalidades do Backend

- **Listar conectores** com estado em tempo real (conectado/desconectado/erro)
- **Obter detalhe** com mascaramento automático de tokens e passwords
- **Guardar configuração** com upsert na BD (chave/valor)
- **Toggle ativar/desativar** com persistência
- **Teste de conexão** real para cada conector:
  - Email SMTP: teste TCP ao servidor
  - Twilio SMS/WhatsApp: verificação de credenciais via API
  - Meta Cloud API: validação de Phone Number ID
  - Facebook: verificação de Page Token com dados da página
  - Instagram: verificação de Access Token com dados da conta
  - LinkedIn: verificação de token via userinfo
  - Google Reviews: verificação de Place ID via Places API
- **Resumo rápido** para dashboard (contagem de ativos)
- **Audit log** de todas as alterações

---

## Funcionalidades do Frontend

- **Cards visuais premium** com glassmorphism e gradientes por conector
- **Toggle de ativação** com animação suave e feedback visual
- **Indicador de estado** com dot pulsante (conectado=verde, erro=vermelho, desconectado=cinza)
- **Barra de saúde** com percentagem de conectores ativos
- **Painel expandível** com campos de configuração inline
- **Campos inteligentes**: text, password (com toggle eye), select, number
- **Mascaramento** automático de secrets com botão de revelar
- **Teste de conexão** com loading spinner e resultado visual
- **Botão guardar** com estado de sucesso temporário
- **Badges**: "Gratuito" para serviços sem custo, "via Provider" para indicar o serviço
- **Links de documentação** para cada conector
- **Nota de segurança** RGPD no rodapé
- **Design responsivo** com grid 1-2 colunas

---

## Acesso

- **Rota**: `/configuracoes/conectores`
- **Menu**: Configurações → Conectores (com badge V34)
- **Permissão**: `system.configure` (Master e Admin)

---

## Notas Técnicas

- Utiliza a tabela `configuracoes_clinica` existente (chave/valor) para persistência
- Cada conector tem chaves prefixadas com `conector_` para isolamento
- Tokens são mascarados no frontend (`••••••••` + últimos 4 caracteres)
- Valores mascarados são ignorados no save (não sobrescrevem o valor real)
- Testes de conexão guardam timestamp e resultado na BD
- Totalmente integrado com o ConfigContext e RBAC existentes
