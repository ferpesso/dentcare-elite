# Relatório de Implementação de Smart Presets no DentCare v31.1

**Data**: 03 de Março de 2026  
**Autor**: DentCare (agente `critical-creative-dev`)

---

## Visão Geral

Este relatório detalha a proposta de implementação de um sistema de "Smart Presets" no DentCare v31.1, com o objetivo de otimizar os fluxos de trabalho para gestores, dentistas e rececionistas. A iniciativa visa reduzir a entrada manual de dados, minimizar erros e acelerar operações rotineiras através de pré-seleções inteligentes. O documento aborda a arquitetura técnica, protótipos para módulos críticos e uma análise crítica dos benefícios e riscos, seguindo a abordagem honesta e transparente do `critical-creative-dev`.

---

## Arquitetura Técnica dos Smart Presets

A arquitetura proposta para os Smart Presets baseia-se na extensão do sistema existente do DentCare, utilizando o ORM Drizzle para persistência de dados e o tRPC para a comunicação entre frontend e backend. O objetivo é criar um sistema flexível e escalável que possa ser aplicado a diversas funcionalidades da aplicação.

### Modelo de Dados

Uma nova tabela, `smart_presets`, será introduzida no schema do Drizzle. Esta tabela armazenará os presets de forma genérica, permitindo a sua aplicação em diferentes contextos da aplicação. A estrutura inclui campos para `nome`, `descricao`, `tipo` (para categorizar o preset, ex: `consulta`, `tratamento`, `marketing_whatsapp`), `dados` (um campo JSON para armazenar os valores específicos do preset), e indicadores de `global`, `usuarioId` e `clinicaId` para controlo de acesso e âmbito [1].

```typescript
// Exemplo de estrutura no drizzle/schema.ts
export const smartPresets = mysqlTable("smart_presets", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 50 }).notNull(),
  dados: json("dados").notNull(),
  global: boolean("global").default(false),
  usuarioId: int("usuario_id"),
  clinicaId: int("clinica_id"),
  ativo: boolean("ativo").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdate(sql`CURRENT_TIMESTAMP`),
});
```

### Backend (tRPC Router)

O router `server/routers/presets.ts` será estendido para incluir endpoints CRUD (Create, Read, Update, Delete) para a gestão dos `smart_presets`. Estes endpoints integrarão o sistema de controlo de acesso baseado em papéis (RBAC) existente, garantindo que apenas utilizadores com as permissões adequadas possam criar, listar, editar ou eliminar presets. A validação dos dados JSON (`dados`) será crucial e deverá ser implementada no backend para cada tipo de preset, dado que o MySQL não impõe um schema para campos JSON nativamente [2].

### Frontend (Componentes React)

No frontend, será desenvolvido um componente reutilizável, `SmartPresetSelector.tsx`, que permitirá aos utilizadores selecionar um preset de uma lista filtrada. Este componente será integrado em formulários existentes, como o `ModalNovaConsulta.tsx`, `ModalNovoTratamento.tsx` e `MarketingPage.tsx`. Uma nova página de gestão (`ConfiguracoesPresetsPage.tsx`) será criada para permitir que utilizadores autorizados configurem e mantenham os presets [3].

---

## Protótipos de Smart Presets em Módulos Críticos

Foram desenvolvidos protótipos para demonstrar a aplicação dos Smart Presets em três módulos chave do DentCare v31.1:

### 1. Agenda (Agendamento de Consultas)

-   **Caso de Uso**: Rececionista agenda uma consulta de rotina. Seleciona um preset como "Consulta de Rotina - Dr. Silva", e campos como `medicoId`, `tipoConsulta`, `duracao` e `observacoes` são preenchidos automaticamente. A rececionista pode ajustar os campos conforme necessário.
-   **Benefícios**: Acelera o agendamento, reduz erros de digitação e garante consistência nos detalhes da consulta.
-   **Desafios**: A gestão de presets (criação, atualização) adiciona uma tarefa administrativa. A sobrecarga de opções pode ocorrer se houver muitos presets, exigindo funcionalidades de pesquisa e filtragem.

### 2. Tratamentos

-   **Caso de Uso**: Dentista regista um novo tratamento para um paciente. Seleciona um preset como "Restauração em Resina", e campos como `tipo`, `material`, `duracao`, `preco` e `especialidade` são preenchidos. O dentista apenas precisa de especificar o dente afetado.
-   **Benefícios**: Garante consistência nos preços e detalhes dos tratamentos, reduzindo a variabilidade e facilitando a conformidade.
-   **Desafios**: A rigidez dos presets pode não se adequar a tratamentos altamente personalizados. A atualização de preços ou materiais nos presets requer manutenção.

### 3. Marketing (WhatsApp)

-   **Caso de Uso**: Gestor de marketing envia uma mensagem de lembrete de consulta. Seleciona um preset como "Lembrete de Consulta - 24h", e o template da mensagem é preenchido automaticamente com variáveis (`{nome}`, `{hora}`, `{medico}`). O sistema substitui as variáveis com os dados do paciente antes do envio.
-   **Benefícios**: Assegura a consistência e profissionalismo das comunicações. Otimiza o tempo do gestor e permite personalização em massa.
-   **Desafios**: Presets muito genéricos podem resultar em mensagens impessoais. A gestão de variáveis e a sua substituição correta são cruciais para evitar erros nas mensagens enviadas.

---

## Análise Crítica de Riscos e Benefícios

| Categoria | Benefícios Potenciais | Riscos e Desafios (Honestidade Inabalável) | Mitigações Propostas | Criticidade do Risco (sem mitigação) |
| :--- | :--- | :--- | :--- | :--- |
| **Eficiência Operacional** | Redução drástica do tempo de entrada de dados. Aceleração de processos rotineiros (agendamento, registo de tratamentos, envio de mensagens). | **Carga Administrativa**: A criação e manutenção dos presets requer tempo e esforço, podendo ser subestimada. | Implementar uma interface de gestão de presets intuitiva e eficiente. Oferecer presets padrão de fábrica. | **Médio** |
| **Qualidade e Consistência dos Dados** | Minimização de erros de digitação. Padronização de informações (tipos de consulta, nomes de tratamentos, mensagens). | **Inconsistência de Schema JSON (P-01)**: O campo `dados` é JSON genérico; mudanças no schema subjacente podem invalidar presets. | Validação rigorosa do schema JSON no backend para cada `tipo` de preset. Ferramentas de migração para presets antigos. | **Elevado** |
| **Experiência do Utilizador (UX)** | Interface mais intuitiva e rápida. Redução da carga cognitiva. Satisfação do utilizador. | **Sobrecarga de Opções (P-03)**: Muitos presets podem tornar a seleção mais complexa do que a entrada manual. | Funcionalidades de pesquisa, filtragem e categorização de presets. Limitar presets visíveis por defeito. | **Médio** |
| **Segurança e Privacidade** | N/A (não é o foco principal, mas pode ser afetado). | **Exposição de Dados Sensíveis (P-02)**: Presets mal configurados podem expor dados sensíveis se marcados como `global` ou acessíveis indevidamente. | Controlo de acesso rigoroso no backend (`presets.ts`) com base no RBAC. Auditoria de conteúdo de presets. | **Crítico** |
| **Manutenibilidade** | Código mais limpo e modular com o `SmartPresetSelector` reutilizável. | **Acoplamento de UI**: O `SmartPresetSelector` pode exigir lógica específica para mapear dados para cada formulário. **Manutenção de Presets**: Se dados base (ex: `medicoId`) mudarem, presets podem precisar de atualização manual. | Design de interface flexível para mapeamento de campos. Ferramentas de gestão de presets que alertem para dependências. | **Médio** |
| **Performance** | N/A (a otimização de performance não é o foco direto, mas a redução de cliques pode indiretamente melhorar a perceção). | **Carga de Presets (P-04)**: Carregar muitos presets com JSONs grandes pode impactar o desempenho do frontend. | Paginação ou lazy-loading para listas de presets. Otimização de queries de BD. | **Baixo** |

---

## Conclusão Final

A implementação de "Smart Presets" no DentCare v31.1 representa uma **oportunidade significativa para otimizar a eficiência operacional e a experiência do utilizador**. A arquitetura proposta é sólida e integra-se bem com a base de código existente, prometendo um retorno considerável no investimento de desenvolvimento através da redução de tempo e erros nas tarefas diárias.

No entanto, a honestidade brutal do `critical-creative-dev` exige que se reconheça que esta funcionalidade, embora poderosa, não está isenta de desafios. Os riscos relacionados com a **inconsistência do schema JSON** e a **potencial exposição de dados sensíveis** são de criticidade elevada e requerem atenção meticulosa durante o desenvolvimento e a fase de testes. A gestão da complexidade dos presets e a garantia de uma UX intuitiva serão cruciais para a sua adoção e sucesso.

**Recomendação Final**: Prossiga com a implementação dos Smart Presets, mas com um foco rigoroso nas mitigações propostas para os riscos identificados. A validação contínua com os utilizadores finais (rececionistas, dentistas, gestores) será essencial para refinar a funcionalidade e garantir que ela realmente atende às suas necessidades, sem introduzir novas complexidades ou frustrações. Uma abordagem iterativa, começando com os presets mais impactantes e de menor risco, é aconselhável.

---

## Referências

[1] Kleppmann, M. (2017). *Designing Data-Intensive Applications*. O'Reilly Media.
[2] Newman, S. (2015). *Building Microservices*. O'Reilly Media.
[3] Norman, D. A. (2013). *The Design of Everyday Things: Revised and Expanded Edition*. Basic Books.
