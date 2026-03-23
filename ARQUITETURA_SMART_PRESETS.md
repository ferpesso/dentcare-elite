# Arquitetura Técnica para "Smart Presets" no DentCare v31.1

**Data**: 03 de Março de 2026  
**Arquiteto**: DentCare (agente `critical-creative-dev`)

---

## Visão Geral

Esta proposta descreve a arquitetura técnica para a implementação de um sistema de "Smart Presets" no DentCare v31.1. O objetivo é permitir que gestores, dentistas e rececionistas configurem e apliquem rapidamente valores pré-definidos em campos de entrada de dados comuns, otimizando o fluxo de trabalho e reduzindo erros. A arquitetura será construída sobre a base existente do projeto, estendendo o router `presets.ts` e o schema Drizzle.

---

## Componentes da Arquitetura

### 1. Modelo de Dados (Drizzle Schema)

Será necessário estender o `drizzle/schema.ts` para incluir uma nova tabela ou adaptar as existentes para armazenar os "Smart Presets".

**Opção A: Nova Tabela `smartPresets` (Recomendado)**

Uma nova tabela `smartPresets` oferece maior flexibilidade e escalabilidade para diferentes tipos de presets.

```typescript
// drizzle/schema.ts
import { mysqlTable, int, varchar, text, json, boolean, datetime } from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

// ... (outras tabelas existentes)

export const smartPresets = mysqlTable("smart_presets", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  descricao: text("descricao"),
  tipo: varchar("tipo", { length: 50 }).notNull(), // Ex: 'consulta', 'tratamento', 'marketing_whatsapp'
  dados: json("dados").notNull(), // JSON com os valores do preset (ex: { medicoId: 1, duracao: 30, tipoConsulta: 'Rotina' })
  global: boolean("global").default(false), // Se o preset é global ou específico de um utilizador/clínica
  usuarioId: int("usuario_id"), // Opcional: ID do utilizador que criou o preset (se não for global)
  clinicaId: int("clinica_id"), // Opcional: ID da clínica (se não for global)
  ativo: boolean("ativo").default(true),
  createdAt: datetime("created_at").default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").default(sql`CURRENT_TIMESTAMP`).onUpdate(sql`CURRENT_TIMESTAMP`),
});

export const smartPresetsRelations = relations(smartPresets, ({ one }) => ({
  usuario: one(usuarios, { fields: [smartPresets.usuarioId], references: [usuarios.id] }),
  clinica: one(clinicas, { fields: [smartPresets.clinicaId], references: [clinicas.id] }),
}));
```

**Pontos Positivos:**
-   **Flexibilidade**: Pode armazenar presets para qualquer tipo de formulário ou campo.
-   **Escalabilidade**: Facilmente extensível para novos tipos de presets sem alterar o schema de outras tabelas.
-   **Controlo de Acesso**: Permite definir presets globais, por clínica ou por utilizador.

**Pontos Negativos e Desafios:**
-   **Complexidade Inicial**: Requer a criação de uma nova tabela e a gestão de dados JSON.
-   **Validação de `dados`**: A validação do schema do JSON `dados` terá de ser feita a nível da aplicação (backend), pois o MySQL não impõe schema para JSON de forma nativa.

### 2. Backend (tRPC Router)

O router `server/routers/presets.ts` será estendido para gerir os "Smart Presets".

**Novos Endpoints no `presetsRouter`:**

-   `presets.criarSmartPreset`: Cria um novo preset.
    -   **Input**: `z.object({ nome: string, descricao: string, tipo: string, dados: z.record(z.string(), z.any()), global: boolean })`
    -   **Permissões**: `system.configure` (para global), `presets.create` (para utilizador/clínica).
-   `presets.listarSmartPresets`: Lista presets disponíveis (filtrados por tipo, global/utilizador/clínica).
    -   **Input**: `z.object({ tipo: string.optional(), global: boolean.optional() })`
    -   **Permissões**: `presets.read`.
-   `presets.editarSmartPreset`: Atualiza um preset existente.
    -   **Input**: `z.object({ id: number, ...camposOpcionais })`
    -   **Permissões**: `system.configure` ou `presets.update` (se for o criador/clínica).
-   `presets.eliminarSmartPreset`: Elimina um preset.
    -   **Input**: `z.object({ id: number })`
    -   **Permissões**: `system.configure` ou `presets.delete`.

**Exemplo de Lógica de Criação (server/routers/presets.ts):**

```typescript
// ... imports existentes
import { smartPresets } from "../../drizzle/schema";

export const presetsRouter = router({
  // ... endpoints existentes

  criarSmartPreset: protectedProcedure
    .input(
      z.object({
        nome: z.string().min(1).max(255),
        descricao: z.string().optional(),
        tipo: z.string().min(1).max(50), // Ex: 'consulta', 'tratamento', 'marketing_whatsapp'
        dados: z.record(z.string(), z.any()), // JSON com os valores do preset
        global: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Lógica de permissões (ex: global requer system.configure)
      if (input.global && !hasPermission(ctx.user, "system.configure")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar presets globais" });
      }
      if (!hasPermission(ctx.user, "presets.create")) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para criar presets" });
      }

      const db = await getDb();
      if (!db) throw new TRPCError({ code: "SERVICE_UNAVAILABLE" });

      const [result] = await db.insert(smartPresets).values({
        nome: input.nome,
        descricao: input.descricao,
        tipo: input.tipo,
        dados: input.dados,
        global: input.global,
        usuarioId: input.global ? null : ctx.user.id, // Associar ao utilizador se não for global
        clinicaId: ctx.user.clinicaId, // Associar à clínica
      });

      await logAuditAction(ctx.user, {
        acao: "create",
        tabela: "smart_presets",
        registoId: result.insertId,
        descricao: `Smart Preset '${input.nome}' (${input.tipo}) criado.`,
      });

      return { success: true, presetId: result.insertId };
    }),

  // ... outros endpoints para listar, editar, eliminar
});
```

**Pontos Positivos:**
-   **Reutilização**: Estende um router existente, minimizando a duplicação de código.
-   **Tipagem Forte**: O tRPC e Zod garantem validação e tipagem de ponta a ponta.
-   **Controlo de Acesso**: Integra-se com o sistema RBAC existente para permissões granulares.

**Pontos Negativos e Desafios:**
-   **Validação de `dados`**: A validação do conteúdo do JSON `dados` (ex: `medicoId` existe, `duracao` é um número válido) terá de ser implementada manualmente no backend para cada `tipo` de preset, o que pode ser verboso.
-   **Acoplamento**: O router `presets.ts` pode tornar-se grande e complexo se muitos tipos de presets forem adicionados.

### 3. Frontend (Componentes React)

A implementação no frontend envolverá:

-   **Componente `SmartPresetSelector` (Novo)**: Um componente reutilizável que exibe uma lista de presets para um determinado `tipo` e permite ao utilizador selecionar um para aplicar. Pode ser um `Dropdown` ou `Combobox`.
-   **Integração em Formulários Existentes**: Modificar componentes como `ModalNovaConsulta.tsx`, `FichaUtentePage.tsx`, `MarketingPage.tsx`, etc., para incluir o `SmartPresetSelector` e aplicar os valores selecionados aos campos do formulário.
-   **Página de Gestão de Presets (Nova)**: Uma página (`ConfiguracoesPresetsPage.tsx`) onde os utilizadores com permissão podem criar, editar e eliminar os seus presets ou presets globais/clínica.

**Exemplo de Integração (ModalNovaConsulta.tsx):**

```typescript
// client/src/components/ModalNovaConsulta.tsx
// ... imports existentes
import { trpc } from "../lib/trpc";
import { SmartPresetSelector } from "./SmartPresetSelector"; // Novo componente

export function ModalNovaConsulta({ dataHora, onClose, onSuccess }: ModalNovaConsultaProps) {
  // ... estados existentes

  // Query para listar presets de consulta
  const consultaPresetsQuery = trpc.presets.listarSmartPresets.useQuery({ tipo: "consulta" });
  const consultaPresets = consultaPresetsQuery.data?.presets || [];

  const handleApplyPreset = (preset: any) => {
    // Aplicar os dados do preset ao formulário de consulta
    setForm(prevForm => ({
      ...prevForm,
      ...preset.dados, // Sobrescreve os campos com os valores do preset
    }));
  };

  return (
    // ... JSX existente do modal
    <div className="modal-content">
      {/* ... indicador de progresso */}

      {/* Selector de Smart Presets */}
      <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01]">
        <SmartPresetSelector
          presets={consultaPresets}
          onSelectPreset={handleApplyPreset}
          label="Aplicar Preset de Consulta"
        />
      </div>

      {/* ... formulário de consulta */}
    </div>
  );
}
```

**Pontos Positivos:**
-   **Melhoria de UX**: Reduz o tempo de preenchimento e a probabilidade de erros.
-   **Reutilização de Componentes**: O `SmartPresetSelector` pode ser usado em vários locais.
-   **Feedback Imediato**: A aplicação do preset é instantânea, melhorando a perceção de eficiência.

**Pontos Negativos e Desafios:**
-   **Acoplamento de UI**: O `SmartPresetSelector` precisará de saber como mapear os dados do preset para os campos específicos de cada formulário, o que pode levar a lógica complexa ou a um acoplamento forte.
-   **Gestão de Estado**: A integração com formulários existentes (que podem usar `useState` ou bibliotecas de formulários) pode ser desafiadora para garantir que os presets se aplicam corretamente e que o estado do formulário é atualizado.
-   **Design de Interface**: Garantir que a interface para criar e gerir presets seja intuitiva e poderosa, sem sobrecarregar o utilizador.

### 4. Lógica de Negócio e Aplicação Dinâmica

-   **Mapeamento de Campos**: Será necessário um mapeamento claro entre os `tipo`s de presets e os campos de formulário correspondentes. Isto pode ser feito através de convenções de nomenclatura ou de um registo explícito no frontend/backend.
-   **Prioridade de Presets**: Definir a ordem de aplicação dos presets (ex: presets de utilizador > presets de clínica > presets globais).
-   **Integração com IA (Futuro)**: No futuro, a IA pode sugerir presets com base no contexto do paciente ou histórico de uso, tornando-os ainda mais "Smart".

---

## Riscos e Mitigações

| Risco ID | Categoria | Descrição Detalhada do Risco | Impacto | Criticidade | Mitigação Proposta |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **P-01** | **Dados** | **Inconsistência de Schema JSON**: O campo `dados` na tabela `smart_presets` é um JSON genérico. Se o schema dos dados de um preset mudar (ex: `medicoId` para `dentistaId`), os presets existentes podem tornar-se inválidos. | **Médio**: Presets podem falhar ao aplicar, causando erros ou dados incorretos. | **Elevado** | Implementar validação de schema para o campo `dados` no backend (tRPC) para cada `tipo` de preset. Fornecer ferramentas de migração para presets antigos quando o schema muda. |
| **P-02** | **Segurança** | **Exposição de Dados Sensíveis em Presets**: Se presets contiverem dados sensíveis (ex: notas clínicas detalhadas) e forem acidentalmente marcados como `global` ou acessíveis a utilizadores sem permissão. | **Alto**: Violação de privacidade e conformidade com RGPD. | **Crítico** | Implementar controlo de acesso rigoroso no backend (`presets.ts`) para a criação e listagem de presets. Revisar permissões de `global` e `clinicaId`. Auditar o conteúdo dos presets antes de serem guardados. |
| **P-03** | **UX/UI** | **Sobrecarga de Opções**: Muitos presets podem sobrecarregar a interface do utilizador, tornando a seleção mais difícil do que a entrada manual. | **Baixo**: Frustração do utilizador, baixa adoção da funcionalidade. | **Médio** | Implementar funcionalidades de pesquisa, filtragem e categorização de presets. Permitir que os utilizadores marquem presets como favoritos. Limitar o número de presets visíveis por defeito. |
| **P-04** | **Performance** | **Carga de Presets**: Carregar muitos presets (especialmente se contiverem JSONs grandes) pode impactar o desempenho do frontend. | **Baixo**: Lentidão na interface, má experiência do utilizador. | **Baixo** | Implementar paginação ou carregamento lazy-loading para a lista de presets. Otimizar as queries da base de dados para buscar apenas os campos necessários. |

---

## Conclusão

A implementação de "Smart Presets" é uma melhoria funcional estratégica que pode otimizar significativamente a eficiência do DentCare v31.1 para todos os tipos de utilizadores. A arquitetura proposta é escalável e integra-se bem com a base de código existente. No entanto, é crucial abordar os riscos identificados, especialmente a validação de dados e a segurança, para garantir uma implementação robusta e fiável. Com um planeamento cuidadoso e atenção aos detalhes, este sistema pode transformar a forma como os utilizadores interagem com a aplicação, tornando-a mais rápida, inteligente e intuitiva.

---

## Referências

[1] "Designing Data-Intensive Applications" by Martin Kleppmann. O'Reilly Media, 2017.
[2] "Building Microservices" by Sam Newman. O'Reilly Media, 2015.
[3] "Domain-Driven Design: Tackling Complexity in the Heart of Software" by Eric Evans. Addison-Wesley Professional, 2003.
