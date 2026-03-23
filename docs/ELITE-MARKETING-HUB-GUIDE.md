# 🚀 Elite Marketing Hub — Guia Completo

**Versão**: 1.0  
**Data**: 2026-02-25  
**Status**: ✅ Pronto para Produção

---

## 📋 Visão Geral

O **Elite Marketing Hub** é um módulo de marketing totalmente integrado no DentCare Elite V10.2, que permite criar, gerar conteúdo com IA e enviar campanhas de marketing diretamente dentro da aplicação, sem a necessidade de alternar entre diferentes plataformas.

### Características Principais

*   **Integração Nativa**: Funciona completamente dentro do DentCare, mantendo a barra lateral e o contexto da aplicação.
*   **IA Generativa**: Utiliza o `iaService` para gerar conteúdo de marketing personalizado baseado em dados reais de pacientes.
*   **Postagem Direta via WhatsApp**: Integração com o `whatsappService` para envio direto de mensagens via Twilio.
*   **Dados Reais**: Campanhas alimentadas por dados reais do sistema (pacientes inativos, próximas consultas, aniversários, etc.).
*   **Gestão Completa**: Criar, editar, agendar, enviar e monitorizar campanhas tudo num único lugar.

---

## 🎯 Funcionalidades

### 1. Criar Campanhas

Acesse a aba **"Criar"** para criar uma nova campanha de marketing:

1. **Nome da Campanha**: Dê um nome descritivo (ex: "Reativação de Pacientes Inativos").
2. **Tipo de Campanha**: Escolha entre:
   - **Reativação**: Para pacientes sem consultas há mais de X meses.
   - **Aniversário**: Para enviar mensagens de aniversário.
   - **Promoção**: Para campanhas de promoção de serviços.
   - **Lembrete**: Para lembretes de consultas agendadas.
   - **Personalizada**: Para campanhas customizadas.
3. **Descrição**: Descreva o objetivo da campanha.
4. **Template de Conteúdo**: Escreva o template da mensagem. Use `{{nome}}` para personalizar com o nome do paciente.

### 2. Segmentar Audiência

Após criar a campanha, selecione a audiência:

*   **Filtros Disponíveis**:
    - Pacientes inativos há X meses
    - Aniversário no mês atual
    - Por especialidade (Ortodontia, Limpeza, Implantologia, etc.)
    - Combinações de filtros

*   **Visualização**: Veja a lista de pacientes que serão alvo da campanha antes de enviar.

### 3. Gerar Conteúdo com IA

Clique em **"Gerar com IA"** para que o sistema gere automaticamente o conteúdo personalizado:

1. A IA utilizará o template e os dados dos pacientes para criar mensagens personalizadas.
2. Você poderá rever e editar o conteúdo gerado antes de enviar.
3. O sistema mostrará o custo estimado da geração de conteúdo.

### 4. Enviar Campanha

Após rever o conteúdo:

1. Clique em **"Enviar Campanha"** para iniciar o envio.
2. As mensagens serão adicionadas à fila de envio via WhatsApp.
3. O sistema mostrará o status de envio em tempo real.

### 5. Monitorizar Campanhas

Na aba **"Campanhas"**, você pode:

*   Ver todas as campanhas criadas.
*   Filtrar por status (Rascunho, Gerada, Agendada, Enviada, Cancelada).
*   Ver estatísticas (total de pacientes, mensagens enviadas, taxa de sucesso).
*   Editar ou deletar campanhas.

### 6. Relatórios

Na aba **"Relatórios"**, você pode:

*   Ver métricas de campanhas enviadas.
*   Taxa de sucesso e falhas.
*   Custo real vs. estimado.
*   Estimativas de taxa de abertura, clique e conversão.

---

## 🔧 Arquitetura Técnica

### Frontend

*   **Página**: `client/src/pages/MarketingPage.tsx`
*   **Componentes**:
    - `CardCampanha`: Exibe informações de uma campanha.
    - `FormCampanha`: Formulário para criar campanhas.
    - Abas para navegação entre "Campanhas", "Criar" e "Relatórios".

### Backend (tRPC)

*   **Router**: `server/routers/marketing.ts`
*   **Procedimentos**:
    - `listarCampanhas`: Listar campanhas com filtros.
    - `criarCampanha`: Criar nova campanha (rascunho).
    - `listarUtentesParaMarketing`: Obter lista de pacientes segmentada.
    - `gerarConteudoMarketing`: Gerar conteúdo com IA.
    - `enviarCampanha`: Enviar campanha via WhatsApp.
    - `obterRelatorioCampanha`: Obter relatório de uma campanha.
    - `cancelarCampanha`: Cancelar uma campanha.

### Integração com Serviços Existentes

*   **iaService**: Utilizado para gerar conteúdo com IA.
*   **whatsappService**: Utilizado para enviar mensagens via WhatsApp.
*   **auditService**: Registra todas as ações de marketing para auditoria.

---

## 📊 Fluxo de Dados

```
1. Utilizador cria campanha (MarketingPage → trpc.marketing.criarCampanha)
   ↓
2. Seleciona audiência (trpc.marketing.listarUtentesParaMarketing)
   ↓
3. Gera conteúdo com IA (trpc.marketing.gerarConteudoMarketing)
   ↓
4. IA Service invoca provider (iaService.invocarIA)
   ↓
5. Conteúdo é retornado e revisado pelo utilizador
   ↓
6. Utilizador envia campanha (trpc.marketing.enviarCampanha)
   ↓
7. WhatsApp Service enfileira mensagens (whatsappService.enviarMensagemWhatsApp)
   ↓
8. Bull/Redis processa fila e envia via Twilio
   ↓
9. Pacientes recebem mensagens no WhatsApp
```

---

## 🔒 Segurança e Permissões

### Permissões Necessárias

*   `marketing.view`: Visualizar campanhas e relatórios.
*   `marketing.create`: Criar novas campanhas.
*   `marketing.send`: Enviar campanhas.
*   `marketing.delete`: Deletar campanhas.

### Proteção de Dados

*   **Encriptação**: API keys de provedores de IA são encriptadas em repouso.
*   **RBAC**: Apenas utilizadores com permissões adequadas podem acessar o hub.
*   **Auditoria**: Todas as ações são registadas no `auditService`.
*   **Privacidade**: Dados sensíveis dos pacientes são tratados com cuidado e não são enviados para provedores externos sem consentimento.

---

## 💰 Custos

### Modelos de Custo

*   **Ollama (Grátis)**: Modelo local, sem custo de API.
*   **OpenAI (Pago)**: ~€0.015 por 1K tokens.
*   **Google Gemini (Pago)**: ~€0.0075 por 1K tokens.
*   **Anthropic Claude (Pago)**: ~€0.01 por 1K tokens.

### Estimativas

Para uma campanha de 100 mensagens:

*   **Ollama**: €0 (grátis)
*   **OpenAI**: ~€0.15 - €0.30
*   **Gemini**: ~€0.08 - €0.15
*   **Claude**: ~€0.10 - €0.20

---

## 🚀 Como Usar

### Passo a Passo: Criar uma Campanha de Reativação

1. **Acesse o Elite Marketing Hub**:
   - Clique em "Marketing & IA" na barra lateral.
   - Selecione "WhatsApp Marketing".

2. **Crie uma Nova Campanha**:
   - Clique em "Nova Campanha".
   - Preencha os detalhes:
     - Nome: "Reativação de Pacientes Inativos - Fevereiro"
     - Tipo: "Reativação"
     - Descrição: "Campanha para reativar pacientes sem consultas há mais de 6 meses"
     - Template: "Olá {{nome}}, sentimos sua falta! Agende sua próxima consulta com desconto especial de 15%."

3. **Segmente a Audiência**:
   - Filtro: "Pacientes inativos há 6+ meses"
   - O sistema mostrará a lista de pacientes qualificados.

4. **Gere Conteúdo com IA**:
   - Clique em "Gerar com IA".
   - A IA personalizará o template para cada paciente.
   - Revise o conteúdo gerado.

5. **Envie a Campanha**:
   - Clique em "Enviar Campanha".
   - O sistema adicionará as mensagens à fila de envio.
   - Você receberá uma confirmação com o número de mensagens enviadas.

6. **Monitorize**:
   - Acesse a aba "Relatórios" para ver métricas da campanha.

---

## 🐛 Troubleshooting

### Problema: "Erro ao gerar conteúdo com IA"

**Solução**:
1. Verifique se o provider de IA está configurado corretamente em "Configurações > Sistema".
2. Se usar OpenAI/Gemini/Claude, verifique se a API key é válida.
3. Tente usar Ollama (grátis, local) como fallback.

### Problema: "Mensagens não estão sendo enviadas"

**Solução**:
1. Verifique se o Twilio está configurado corretamente.
2. Verifique se os números de telefone estão no formato correto (+351912345678).
3. Verifique o status do Redis e da fila de mensagens.
4. Consulte os logs: `tail -f /var/log/dentcare/whatsapp.log`

### Problema: "Permissão negada ao criar campanha"

**Solução**:
1. Verifique se o seu utilizador tem a permissão `marketing.create`.
2. Contacte o administrador para adicionar a permissão.

---

## 📈 Melhores Práticas

1. **Teste Primeiro**: Crie uma campanha de teste com um pequeno grupo de pacientes antes de enviar para todos.
2. **Revise o Conteúdo**: Sempre revise o conteúdo gerado pela IA antes de enviar.
3. **Personalize**: Use templates personalizados para aumentar a taxa de resposta.
4. **Segmente**: Segmente a audiência por especialidade ou tempo de inatividade para campanhas mais eficazes.
5. **Monitore**: Acompanhe as métricas das campanhas para otimizar futuras campanhas.

---

## 📞 Suporte

Para dúvidas ou problemas:

1. Consulte este guia.
2. Verifique a documentação técnica em `docs/ADR-002-Elite-Marketing-Hub.md`.
3. Contacte a equipa de suporte.

---

**Desenvolvido com ❤️ por DentCare AI — Principal Engineer**
