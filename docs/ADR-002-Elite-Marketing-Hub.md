# 📄 ADR-002: Elite Marketing Hub — Integração Nativa com IA

**Data**: 2026-02-25  
**Autor**: DentCare AI — Principal Engineer  
**Status**: Proposta Aceite

---

## 1. Contexto

Atualmente, as funcionalidades de marketing do DentCare são limitadas ou exigem a utilização de ferramentas externas, resultando numa experiência de utilizador fragmentada e na incapacidade de alavancar os dados ricos do sistema para campanhas personalizadas e inteligentes. O utilizador expressou a necessidade de uma funcionalidade de marketing **nativa**, que permita a **geração de conteúdo com IA** e a **postagem direta** de mensagens, tudo dentro da aplicação, sem a necessidade de alternar entre diferentes plataformas. O objetivo é transformar o marketing numa funcionalidade central e integrada, que utilize dados reais do sistema para campanhas mais eficazes e eficientes.

## 2. Decisão

Será implementado o **"Elite Marketing Hub"** como um módulo totalmente integrado no DentCare Elite V10.2. Este módulo residirá numa nova página (`MarketingPage.tsx`) acessível através da barra lateral, e será responsável por:

1.  **Geração de Conteúdo com IA**: Utilizar o `iaService` existente para criar mensagens de marketing personalizadas (e.g., campanhas de reativação, lembretes, promoções) com base em dados de pacientes e prompts definidos.
2.  **Postagem Direta via WhatsApp**: Integrar com o `whatsappService` para permitir o envio direto das mensagens geradas para listas de pacientes segmentadas.
3.  **Visualização e Gestão de Campanhas**: Fornecer uma interface para criar, rever, agendar e monitorizar campanhas de marketing.
4.  **Dados Reais**: Garantir que todas as campanhas sejam alimentadas por dados reais do sistema (e.g., pacientes inativos, próximas consultas, aniversários).

Esta abordagem garante uma experiência de utilizador coesa, maximiza a utilização da infraestrutura de IA e WhatsApp já existente e posiciona o DentCare como uma solução de gestão clínica verdadeiramente inteligente.

## 3. Consequências

### Positivas

*   **Experiência de Utilizador Superior**: Elimina a necessidade de alternar entre aplicações, centralizando o fluxo de trabalho de marketing.
*   **Marketing Data-Driven**: Campanhas mais eficazes e personalizadas, baseadas em dados reais dos pacientes (e.g., histórico de consultas, preferências).
*   **Eficiência Operacional**: Automação da geração de conteúdo e envio, reduzindo o tempo e esforço manual.
*   **Inovação**: Posiciona o DentCare na vanguarda da tecnologia, oferecendo funcionalidades de IA generativa diretamente no produto.
*   **Reutilização de Código**: Alavanca os serviços de IA e WhatsApp já desenvolvidos, minimizando a duplicação de esforços.
*   **Segurança e Privacidade**: Mantém os dados dos pacientes dentro do ambiente controlado do DentCare, com RBAC e encriptação de API keys.

### Negativas / Desafios

*   **Complexidade da UI**: A página de marketing precisará ser robusta para gerir a criação, segmentação, geração e envio de campanhas.
*   **Custo da IA**: A utilização intensiva de provedores de IA pagos (OpenAI, Gemini, Claude) pode gerar custos adicionais, que precisarão ser monitorizados e faturados adequadamente.
*   **Gestão de Permissões**: Necessidade de definir permissões granulares para quem pode criar, aprovar e enviar campanhas de marketing.
*   **Qualidade do Conteúdo Gerado**: Embora a IA seja poderosa, o conteúdo gerado precisará de revisão humana para garantir a adequação e o tom da clínica.
*   **Dependência de Serviços Externos**: A funcionalidade de marketing dependerá da disponibilidade e performance dos provedores de IA e do serviço de WhatsApp (Twilio).

## 4. Proposta Arquitetural

### 4.1. Frontend (`client/src/pages/MarketingPage.tsx`)

*   **Layout**: A `MarketingPage.tsx` será renderizada dentro do `AppLayout`, mantendo a barra lateral e o `TopBar` para uma experiência integrada.
*   **Componentes**: Novos componentes para:
    *   **Seleção de Campanha**: Escolha entre tipos de campanha (e.g., reativação, aniversário, promoção).
    *   **Segmentação de Audiência**: Filtros para selecionar pacientes (e.g., inativos há X meses, com aniversário no próximo mês, por especialidade).
    *   **Geração de Conteúdo com IA**: Área de texto para prompt, visualização do conteúdo gerado pela IA, e opções de edição.
    *   **Pré-visualização e Envio**: Pré-visualização da mensagem final e botão para enviar a campanha via WhatsApp.
    *   **Histórico de Campanhas**: Tabela para listar campanhas enviadas, status e métricas básicas.
*   **Roteamento**: A página será adicionada ao `main.tsx` e à configuração de navegação (`navigation.ts`) sob a categoria "Marketing & IA".

### 4.2. Backend (tRPC)

Serão adicionados novos procedimentos tRPC ou estendidos os existentes para suportar o Elite Marketing Hub:

*   **`iaRouter.gerarConteudoMarketing` (Novo)**:
    *   **Input**: `prompt` (texto base para a IA), `dadosPaciente` (informações relevantes do paciente, e.g., nome, última consulta, especialidade), `tipoCampanha`.
    *   **Output**: `conteudoGerado` (texto da mensagem de marketing), `custoEstimado`, `providerUtilizado`.
    *   **Lógica**: Este procedimento invocará o `iaService.invocarIA` com um prompt construído dinamicamente, incorporando os dados do paciente e as instruções da campanha.
*   **`whatsappRouter.enviarCampanha` (Novo/Extensão)**:
    *   **Input**: `listaPacientes` (IDs ou dados mínimos), `conteudoMensagem` (gerado pela IA ou manual), `tipoCampanha`.
    *   **Lógica**: Este procedimento iterará sobre a `listaPacientes` e chamará o `whatsappService.enviarMensagemWhatsApp` para cada paciente, adicionando as mensagens à fila de envio.
*   **`utentesRouter.listarUtentesParaMarketing` (Novo)**:
    *   **Input**: `filtros` (e.g., `inativosHaMeses`, `aniversarioNoMes`, `especialidade`)
    *   **Output**: `listaUtentes` (ID, nome, telefone, última consulta, etc.)
    *   **Lógica**: Query à base de dados para obter listas de pacientes segmentadas para campanhas.

### 4.3. Fluxo de Dados e Interações

```mermaid
graph TD
    A[Utilizador: MarketingPage] --> B{Selecionar Tipo de Campanha}
    B --> C{Segmentar Audiência}
    C --> D[Frontend: Obter Dados de Pacientes (trpc.utentes.listarUtentesParaMarketing)]
    D --> E[Frontend: Enviar Prompt + Dados para IA (trpc.ia.gerarConteudoMarketing)]
    E --> F[Backend: iaService.invocarIA]
    F --> G[IA Provider (Ollama/OpenAI/Gemini/Claude)]
    G --> F
    F --> E
    E --> H{Frontend: Rever e Editar Conteúdo Gerado}
    H --> I[Frontend: Enviar Campanha (trpc.whatsapp.enviarCampanha)]
    I --> J[Backend: whatsappService.enviarMensagemWhatsApp]
    J --> K[Fila de Mensagens (Bull/Redis)]
    K --> L[WhatsApp Worker]
    L --> M[Twilio API]
    M --> N[Paciente (WhatsApp)]
```

### 4.4. Design System

O Elite Marketing Hub seguirá o design system já estabelecido, utilizando TailwindCSS para estilização e ícones Lucide para representação visual das funcionalidades. Serão criados novos componentes de UI (e.g., `AudienceSegmenter`, `AICampaignGenerator`) que se integrarão perfeitamente com a estética existente.

### 4.5. Segurança

*   **RBAC**: Novas permissões serão definidas para o módulo de marketing (e.g., `marketing.create_campaign`, `marketing.send_campaign`, `marketing.view_reports`). Apenas utilizadores com as permissões adequadas poderão aceder e executar ações no hub.
*   **Privacidade de Dados**: O `iaService` será configurado para garantir que dados sensíveis dos pacientes não sejam enviados para provedores de IA externos sem anonimização ou consentimento explícito, ou que sejam utilizados apenas com provedores locais (Ollama) ou com políticas de privacidade adequadas.
*   **Encriptação**: As API keys dos provedores de IA continuarão a ser encriptadas em repouso e em trânsito.
*   **Auditoria**: Todas as ações de criação e envio de campanhas serão registadas no `auditService`.

### 4.6. Performance

*   **Processamento Assíncrono**: A geração de conteúdo com IA e o envio de mensagens WhatsApp serão operações assíncronas. O `whatsappService` já utiliza uma fila (Bull/Redis) para garantir a entrega fiável e não bloquear a UI.
*   **Lazy Loading**: A `MarketingPage.tsx` e os seus componentes serão carregados sob demanda para otimizar o tempo de carregamento inicial da aplicação.
*   **Cache de Dados**: Listas de pacientes e configurações de campanha podem ser cacheadas no frontend para melhorar a responsividade.

## 5. Alternativas Consideradas

*   **Manter Ferramenta Externa**: Rejeitado. Não atende ao requisito de integração nativa e experiência de utilizador coesa.
*   **Integração via iFrame**: Rejeitado. Embora mais simples de implementar, resultaria numa experiência de utilizador inferior, com potenciais problemas de segurança (CORS) e dificuldade em partilhar dados de forma nativa com o sistema.
*   **Módulo de Marketing Separado (mas no mesmo codebase)**: Rejeitado. Embora ofereça alguma modularidade, a integração profunda com dados e serviços existentes seria mais complexa sem uma abordagem de módulo totalmente embutido no layout principal.

## 6. Próximos Passos

1.  Criar os novos procedimentos tRPC (`iaRouter.gerarConteudoMarketing`, `whatsappRouter.enviarCampanha`, `utentesRouter.listarUtentesParaMarketing`).
2.  Desenvolver a `MarketingPage.tsx` e os seus sub-componentes no frontend.
3.  Atualizar `navigation.ts` para incluir a nova página.
4.  Implementar testes unitários e de integração para os novos procedimentos e componentes.
5.  Realizar testes de ponta a ponta para o fluxo completo de criação e envio de campanhas.

---

## 7. Referências

*   [1] `iaService.ts` - Serviço de IA do DentCare Elite V10.2
*   [2] `whatsappService.ts` - Serviço de WhatsApp do DentCare Elite V10.2
*   [3] `ia.ts` - Router tRPC para IA do DentCare Elite V10.2
*   [4] `whatsapp.ts` - Router tRPC para WhatsApp do DentCare Elite V10.2
*   [5] `ADR-001-Refatoracao-UI-Sidebar.md` - Decisão Arquitetural da Refatoração da UI
