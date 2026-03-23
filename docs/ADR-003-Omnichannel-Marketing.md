# 📄 ADR-003: Elite Marketing Hub — Integração Omnichannel (Facebook & Instagram)

**Data**: 2026-02-25  
**Autor**: DentCare AI — Principal Engineer  
**Status**: Proposta Aceite

---

## 1. Contexto

O Elite Marketing Hub atual oferece funcionalidades robustas para campanhas via WhatsApp, incluindo geração de conteúdo com IA. No entanto, para uma estratégia de marketing verdadeiramente abrangente, é crucial expandir para as principais plataformas de mídia social, como Facebook e Instagram. A necessidade é de uma integração que permita não apenas a postagem direta, mas também a **geração de criativos visuais com IA** e a **otimização de conteúdo** para essas plataformas, tudo dentro do ambiente do DentCare. Isso visa centralizar ainda mais as operações de marketing e alavancar a IA para um engajamento visual mais eficaz.

## 2. Decisão

O Elite Marketing Hub será estendido para incluir um módulo de **Marketing Omnichannel**, focado na integração com Facebook e Instagram via **Meta Graph API**. Esta extensão permitirá:

1.  **Geração de Criativos Visuais com IA**: Utilização do `iaVisionService` (e, se necessário, um novo `iaImageGenerationService`) para gerar imagens e vídeos simples, ou para otimizar imagens existentes com legendas e hashtags geradas por IA.
2.  **Otimização de Conteúdo para Redes Sociais**: A IA será usada para sugerir legendas, hashtags e horários de postagem ideais com base no público-alvo e nos dados de engajamento.
3.  **Postagem Direta e Agendamento**: Capacidade de publicar conteúdo diretamente no Facebook e Instagram (páginas e perfis de negócios) ou agendar postagens futuras.
4.  **Pré-visualização de Postagens**: Uma interface de usuário que simula como a postagem aparecerá nas redes sociais antes da publicação.
5.  **Monitoramento Básico**: Acompanhamento do status das postagens e métricas básicas de engajamento (e.g., likes, comentários).

Esta decisão visa transformar o DentCare num centro de comando de marketing completo, unificando a comunicação com pacientes através de múltiplos canais e utilizando a inteligência artificial para maximizar o impacto das campanhas visuais.

## 3. Consequências

### Positivas

*   **Alcance Ampliado**: Campanhas de marketing podem atingir um público muito maior nas redes sociais.
*   **Engajamento Visual**: A capacidade de gerar criativos com IA e postar imagens/vídeos aumenta o engajamento e a atratividade das campanhas.
*   **Consistência da Marca**: Garante que a comunicação em todos os canais seja coesa e alinhada com a identidade da clínica.
*   **Eficiência de Marketing**: Centraliza a gestão de campanhas de WhatsApp e redes sociais, economizando tempo e recursos.
*   **Inovação e Diferenciação**: Oferece uma funcionalidade de ponta que diferencia o DentCare no mercado de software para clínicas.
*   **Reutilização de IA**: Alavanca e expande as capacidades existentes do `iaService` e `iaVisionService`.

### Negativas / Desafios

*   **Complexidade de Integração**: A Meta Graph API é complexa e requer gestão de tokens de acesso, permissões de usuário e tratamento de erros específicos da API.
*   **Custos Adicionais**: A utilização da Meta Graph API e, especialmente, de serviços de IA para geração de imagens/vídeos, pode gerar **custos significativos**. Estes custos precisarão ser monitorizados, faturados e, possivelmente, repassados aos utilizadores premium.
*   **Gestão de Credenciais**: Armazenamento seguro e gestão de tokens de acesso de longa duração para Facebook/Instagram.
*   **Políticas de Plataforma**: Necessidade de aderir estritamente às políticas de uso do Facebook e Instagram para evitar bloqueios de conta.
*   **Limitações da IA**: A geração de criativos visuais com IA ainda pode exigir ajustes manuais para garantir a qualidade e a adequação à marca da clínica.
*   **Monitoramento de Engajamento**: A Meta Graph API pode ter limitações no acesso a métricas detalhadas de engajamento, exigindo soluções adicionais para relatórios completos.

## 4. Proposta Arquitetural

### 4.1. Frontend (`client/src/pages/MarketingPage.tsx`)

*   **Nova Aba/Seção**: Adicionar uma nova aba ou seção dentro da `MarketingPage.tsx` para "Redes Sociais".
*   **Componentes Específicos**: Novos componentes para:
    *   **Conexão de Contas**: Interface para conectar páginas/perfis de Facebook e Instagram (via OAuth).
    *   **Criador de Postagens**: Formulário para criar postagens, incluindo upload de imagens/vídeos, texto, hashtags, e agendamento.
    *   **Geração de Criativos com IA**: Botão para invocar a IA para gerar sugestões de imagens/vídeos ou otimizar conteúdo textual.
    *   **Pré-visualização**: Componente que exibe como a postagem aparecerá no Facebook/Instagram.
    *   **Calendário de Postagens**: Visualização das postagens agendadas.
    *   **Métricas de Postagem**: Resumo do desempenho das postagens.

### 4.2. Backend (tRPC)

Serão adicionados novos procedimentos tRPC ou estendidos os existentes no `marketingRouter` e `iaRouter`:

*   **`marketingRouter.conectarMetaAccount` (Novo)**:
    *   **Input**: `accessToken` (curto prazo), `userId`.
    *   **Output**: `longLivedAccessToken`, `pages` (páginas/perfis de negócios associados).
    *   **Lógica**: Troca o token de acesso de curta duração por um de longa duração e armazena-o de forma segura (encriptado) na base de dados, associado ao utilizador e à clínica.
*   **`marketingRouter.listarMetaPages` (Novo)**:
    *   **Input**: Nenhum.
    *   **Output**: Lista de páginas/perfis de Facebook/Instagram conectados.
    *   **Lógica**: Recupera as contas conectadas do utilizador.
*   **`marketingRouter.criarPostagemSocial` (Novo)**:
    *   **Input**: `pageId`, `tipoPlataforma` (Facebook/Instagram), `texto`, `imagemUrl` (opcional), `videoUrl` (opcional), `agendamento` (opcional).
    *   **Output**: `postId`, `status`.
    *   **Lógica**: Invoca a Meta Graph API para publicar ou agendar a postagem. Utilizará uma fila de mensagens (similar ao WhatsApp) para processamento assíncrono.
*   **`iaRouter.gerarCriativoSocial` (Novo)**:
    *   **Input**: `prompt` (descrição do criativo), `tipo` (imagem/video), `contexto` (e.g., dados da campanha).
    *   **Output**: `imageUrl` ou `videoUrl`, `sugestaoLegenda`, `sugestaoHashtags`.
    *   **Lógica**: Invoca o `iaVisionService` ou um novo `iaImageGenerationService` para gerar a imagem/vídeo. O `iaService` existente pode ser usado para gerar legendas e hashtags.

### 4.3. Fluxo de Dados e Interações

```mermaid
graph TD
    A[Utilizador: MarketingPage (Redes Sociais)] --> B{Conectar Conta Meta}
    B --> C[Meta OAuth Flow]
    C --> D[Backend: trpc.marketing.conectarMetaAccount]
    D --> E[Armazenamento Seguro (DB)]

    F[Utilizador: Criar Postagem] --> G{Selecionar Conta}
    G --> H{Gerar Criativo com IA (trpc.ia.gerarCriativoSocial)}
    H --> I[Backend: iaVisionService / iaImageGenerationService]
    I --> J[IA Provider (DALL-E/Midjourney/Stable Diffusion)]
    J --> I
    I --> H
    H --> K[Frontend: Pré-visualizar Postagem]
    K --> L[Frontend: Publicar/Agendar (trpc.marketing.criarPostagemSocial)]
    L --> M[Backend: Fila de Postagens (Bull/Redis)]
    M --> N[Social Media Worker]
    N --> O[Meta Graph API]
    O --> P[Facebook/Instagram]
```

### 4.4. Design System

Manterá a consistência com o design system existente. Novos ícones Lucide serão usados para representar as funcionalidades de redes sociais. Serão desenvolvidos componentes de UI para o fluxo de OAuth da Meta, upload de mídia, pré-visualização de postagens e calendário de agendamento.

### 4.5. Segurança

*   **RBAC**: Novas permissões (e.g., `social.connect_account`, `social.publish_post`, `social.view_metrics`) serão adicionadas.
*   **Armazenamento Seguro de Tokens**: Tokens de acesso de longa duração da Meta serão encriptados e armazenados de forma segura na base de dados.
*   **Validação de Entrada**: Todos os inputs para a Meta Graph API serão validados para prevenir ataques de injeção e garantir conformidade com as políticas da plataforma.
*   **Anonimização de Dados**: Ao gerar criativos com IA, garantir que nenhum dado sensível de pacientes seja inadvertidamente incluído ou exposto.

### 4.6. Performance

*   **Processamento Assíncrono**: A publicação e agendamento de postagens, bem como a geração de criativos com IA, serão operações assíncronas, utilizando filas de trabalho para não bloquear a UI.
*   **Cache**: Informações de contas conectadas e métricas básicas podem ser cacheadas para acesso rápido.
*   **Otimização de Imagens**: As imagens geradas ou carregadas serão otimizadas para o tamanho e formato ideais para cada plataforma social.

## 5. Custos Envolvidos

A integração com mídias sociais e a geração de criativos com IA introduzem custos adicionais que devem ser considerados:

| Categoria de Custo | Descrição | Impacto | Estratégia de Mitigação |
| :--- | :--- | :--- | :--- |
| **Meta Graph API** | Embora o acesso básico seja gratuito, volumes muito altos de requisições ou uso de funcionalidades avançadas podem ter limites ou custos associados. | Baixo a Médio | Monitoramento de uso, otimização de requisições, caching. |
| **IA de Geração de Imagens/Vídeos** | Provedores como DALL-E, Midjourney, Stable Diffusion (via APIs) cobram por geração de imagem/vídeo. | Alto | Oferecer Ollama (local/gratuito) como opção padrão, modelos de IA mais baratos para uso básico, planos premium para acesso a modelos avançados. |
| **IA de Otimização de Texto** | Uso do `iaService` (OpenAI, Gemini, Claude) para legendas e hashtags. | Médio | Reutilização do `iaService` existente, otimização de prompts para reduzir tokens, fallback para Ollama. |
| **Armazenamento de Mídia** | Armazenamento de imagens/vídeos gerados ou carregados (S3, Google Cloud Storage). | Baixo a Médio | Otimização de armazenamento, remoção de mídias não utilizadas após X tempo. |
| **Infraestrutura de Fila** | Bull/Redis para processamento assíncrono. | Baixo | Reutilização da infraestrutura existente do WhatsApp, otimização de recursos. |

**Estratégia de Monetização**: Para mitigar os custos, as funcionalidades avançadas de IA (especialmente geração de imagens/vídeos com provedores pagos) e o volume de postagens podem ser incluídos em **planos premium** do DentCare Elite. O uso de provedores de IA gratuitos/locais (Ollama) será sempre a opção padrão.

## 6. Alternativas Consideradas

*   **Integração via Ferramentas de Terceiros (e.g., Hootsuite, Buffer)**: Rejeitado. Não atende ao requisito de integração nativa e controle total sobre o fluxo de trabalho e dados. Introduziria outra camada de complexidade e dependência externa.
*   **Apenas Postagem Manual**: Rejeitado. Não alavancaria o poder da IA para geração de criativos e otimização, resultando numa solução menos "Elite".
*   **Foco Apenas em Texto**: Rejeitado. O marketing em redes sociais é altamente visual; ignorar a geração de criativos visuais limitaria severamente a eficácia.

## 7. Próximos Passos

1.  Desenvolver os novos procedimentos tRPC (`marketingRouter.conectarMetaAccount`, `marketingRouter.listarMetaPages`, `marketingRouter.criarPostagemSocial`, `iaRouter.gerarCriativoSocial`).
2.  Implementar a nova seção de "Redes Sociais" na `MarketingPage.tsx` com os componentes de UI necessários.
3.  Atualizar `navigation.ts` para refletir as novas funcionalidades.
4.  Implementar o `SocialMediaWorker` para processamento assíncrono de postagens.
5.  Realizar testes abrangentes, incluindo o fluxo de OAuth da Meta e a publicação de conteúdo.

---

## 8. Referências

*   [1] [Meta Graph API Documentation](https://developers.facebook.com/docs/graph-api)
*   [2] `iaService.ts` - Serviço de IA do DentCare Elite V10.2
*   [3] `iaVisionService.ts` - Serviço de Visão de IA do DentCare Elite V10.2
*   [4] `ADR-002-Elite-Marketing-Hub.md` - Decisão Arquitetural do Elite Marketing Hub
