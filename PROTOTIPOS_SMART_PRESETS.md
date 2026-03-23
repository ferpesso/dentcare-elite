# Protótipos de Smart Presets para Módulos Críticos

**Data**: 03 de Março de 2026  
**Arquiteto**: DentCare (agente `critical-creative-dev`)

---

## Visão Geral

Este documento apresenta protótipos práticos de implementação de "Smart Presets" para três módulos críticos do DentCare v31.1: **Agenda (Agendamento de Consultas)**, **Tratamentos** e **Marketing (WhatsApp)**. Cada protótipo inclui exemplos de código, fluxos de utilizador e considerações de implementação.

---

## 1. Smart Presets para Agenda (Agendamento de Consultas)

### Caso de Uso

Uma rececionista precisa agendar uma consulta de rotina com o Dr. Silva. Atualmente, ela teria de preencher manualmente: tipo de consulta, duração, médico, observações, etc. Com Smart Presets, ela pode selecionar "Consulta de Rotina - Dr. Silva" e todos os campos são preenchidos automaticamente.

### Exemplos de Presets Pré-configurados

| Nome do Preset | Tipo | Dados do Preset |
| :--- | :--- | :--- |
| Consulta de Rotina - Dr. Silva | `consulta` | `{ medicoId: 1, tipoConsulta: "Rotina", duracao: 30, observacoes: "Consulta de rotina" }` |
| Limpeza Profissional - Dra. Maria | `consulta` | `{ medicoId: 2, tipoConsulta: "Limpeza", duracao: 45, observacoes: "Limpeza profissional com fluorização" }` |
| Emergência - Qualquer Médico | `consulta` | `{ medicoId: null, tipoConsulta: "Emergência", duracao: 20, observacoes: "Consulta de emergência - avaliar urgência" }` |
| Consulta Pediátrica - Dr. João | `consulta` | `{ medicoId: 3, tipoConsulta: "Pediátrica", duracao: 25, observacoes: "Paciente pediátrico - ambiente acolhedor" }` |

### Fluxo de Utilizador

1. **Rececionista abre o modal de nova consulta** (ModalNovaConsulta.tsx).
2. **Sistema exibe um dropdown com presets de consulta** (ex: "Consulta de Rotina - Dr. Silva").
3. **Rececionista seleciona um preset**.
4. **Todos os campos do formulário são preenchidos automaticamente** com os dados do preset.
5. **Rececionista pode ajustar qualquer campo** se necessário (ex: mudar a duração de 30 para 45 minutos).
6. **Rececionista confirma e a consulta é agendada**.

### Implementação Técnica

**Componente: `SmartPresetSelector.tsx` (Novo)**

```typescript
// client/src/components/SmartPresetSelector.tsx
import React, { useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";

interface SmartPreset {
  id: number;
  nome: string;
  descricao?: string;
  dados: Record<string, any>;
}

interface SmartPresetSelectorProps {
  presets: SmartPreset[];
  onSelectPreset: (preset: SmartPreset) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function SmartPresetSelector({
  presets,
  onSelectPreset,
  label = "Smart Preset",
  placeholder = "Selecione um preset...",
  disabled = false,
}: SmartPresetSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPresets = presets.filter(p =>
    p.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.descricao?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSelectPreset = (preset: SmartPreset) => {
    onSelectPreset(preset);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">
          <Sparkles className="inline w-3 h-3 mr-1" />
          {label}
        </label>
      )}

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={disabled || presets.length === 0}
          className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)] text-sm flex items-center justify-between hover:bg-white/[0.08] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{placeholder}</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-white/[0.1] rounded-lg shadow-lg z-50">
            {/* Barra de Pesquisa */}
            <div className="p-2 border-b border-white/[0.05]">
              <input
                type="text"
                placeholder="Pesquisar preset..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-2 py-1 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)] text-xs placeholder-[var(--text-muted)] focus:outline-none focus:border-indigo-500/50"
              />
            </div>

            {/* Lista de Presets */}
            <div className="max-h-48 overflow-y-auto">
              {filteredPresets.length > 0 ? (
                filteredPresets.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset)}
                    className="w-full px-3 py-2 text-left text-xs hover:bg-white/[0.05] transition-colors border-b border-white/[0.02] last:border-b-0"
                  >
                    <p className="font-semibold text-[var(--text-primary)]">{preset.nome}</p>
                    {preset.descricao && (
                      <p className="text-[var(--text-muted)] text-[10px] mt-0.5">{preset.descricao}</p>
                    )}
                  </button>
                ))
              ) : (
                <div className="px-3 py-4 text-center text-[var(--text-muted)] text-xs">
                  Nenhum preset encontrado
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Integração em ModalNovaConsulta.tsx:**

```typescript
// client/src/components/ModalNovaConsulta.tsx (Trecho)
import { SmartPresetSelector } from "./SmartPresetSelector";

export function ModalNovaConsulta({ dataHora, onClose, onSuccess }: ModalNovaConsultaProps) {
  // ... estados existentes
  const [form, setForm] = useState({
    medicoId: "",
    tipoConsulta: "Consulta",
    duracao: "30",
    hora: format(dataHora, "HH:mm"),
    observacoes: "",
  });

  // Query para listar presets de consulta
  const consultaPresetsQuery = trpc.presets.listarSmartPresets.useQuery({ tipo: "consulta" });
  const consultaPresets = consultaPresetsQuery.data?.presets || [];

  const handleApplyPreset = (preset: any) => {
    setForm(prevForm => ({
      ...prevForm,
      medicoId: preset.dados.medicoId?.toString() || "",
      tipoConsulta: preset.dados.tipoConsulta || "Consulta",
      duracao: preset.dados.duracao?.toString() || "30",
      observacoes: preset.dados.observacoes || "",
    }));
  };

  return (
    <div className="modal-content">
      {/* ... indicador de progresso */}

      {/* Smart Preset Selector */}
      <div className="px-6 py-3 border-b border-white/5 bg-white/[0.01]">
        <SmartPresetSelector
          presets={consultaPresets}
          onSelectPreset={handleApplyPreset}
          label="Aplicar Preset de Consulta"
          placeholder="Selecione um preset para preencher automaticamente..."
        />
      </div>

      {/* Formulário de Consulta (existente) */}
      {/* ... */}
    </div>
  );
}
```

### Pontos Positivos

-   **Eficiência Imediata**: A rececionista economiza tempo ao não ter de preencher manualmente cada campo.
-   **Redução de Erros**: Presets pré-validados minimizam erros de entrada.
-   **Flexibilidade**: A rececionista ainda pode ajustar qualquer campo após aplicar o preset.

### Pontos Negativos e Desafios

-   **Gestão de Presets**: A rececionista ou gestor precisa de criar e manter os presets, o que adiciona uma tarefa administrativa.
-   **Sobrecarga de Opções**: Se houver muitos presets, a seleção pode tornar-se mais difícil do que a entrada manual.
-   **Manutenção**: Se os dados do médico (ex: `medicoId`) mudarem, os presets precisam ser atualizados.

---

## 2. Smart Presets para Tratamentos

### Caso de Uso

Um dentista está a registar um novo tratamento para um paciente. Ele sabe que o paciente precisa de uma "Restauração em Resina - Dente 24". Com um Smart Preset, ele pode selecionar este tratamento e todos os detalhes (tipo, material, duração estimada, preço) são preenchidos automaticamente.

### Exemplos de Presets Pré-configurados

| Nome do Preset | Tipo | Dados do Preset |
| :--- | :--- | :--- |
| Restauração em Resina | `tratamento` | `{ tipo: "Restauração", material: "Resina Composta", duracao: 45, preco: 80, especialidade: "Dentisteria Operatória" }` |
| Limpeza Profissional | `tratamento` | `{ tipo: "Limpeza", material: "Pasta de Limpeza", duracao: 60, preco: 50, especialidade: "Higiene Oral" }` |
| Tratamento de Canal | `tratamento` | `{ tipo: "Endodontia", material: "Guta-percha", duracao: 120, preco: 250, especialidade: "Endodontia" }` |
| Extração Dentária | `tratamento` | `{ tipo: "Extração", material: "N/A", duracao: 30, preco: 100, especialidade: "Cirurgia Oral" }` |

### Fluxo de Utilizador

1. **Dentista abre a página de Ficha de Utente** (FichaUtentePage.tsx).
2. **Dentista clica em "Adicionar Tratamento"**.
3. **Um modal ou formulário abre com um Smart Preset Selector**.
4. **Dentista seleciona "Restauração em Resina"**.
5. **Todos os campos do tratamento são preenchidos** (tipo, material, duração, preço).
6. **Dentista seleciona o dente afetado** (ex: 24) e confirma.
7. **O tratamento é registado com todos os detalhes**.

### Implementação Técnica

**Componente: `ModalNovoTratamento.tsx` (Novo ou Refatorado)**

```typescript
// client/src/components/ModalNovoTratamento.tsx
import React, { useState } from "react";
import { SmartPresetSelector } from "./SmartPresetSelector";
import { trpc } from "../lib/trpc";

interface ModalNovoTratamentoProps {
  utenteId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export function ModalNovoTratamento({ utenteId, onClose, onSuccess }: ModalNovoTratamentoProps) {
  const [form, setForm] = useState({
    tipo: "",
    material: "",
    duracao: "",
    preco: "",
    especialidade: "",
    dente: "",
    descricao: "",
  });

  // Query para listar presets de tratamento
  const tratamentoPresetsQuery = trpc.presets.listarSmartPresets.useQuery({ tipo: "tratamento" });
  const tratamentoPresets = tratamentoPresetsQuery.data?.presets || [];

  const handleApplyPreset = (preset: any) => {
    setForm(prevForm => ({
      ...prevForm,
      tipo: preset.dados.tipo || "",
      material: preset.dados.material || "",
      duracao: preset.dados.duracao?.toString() || "",
      preco: preset.dados.preco?.toString() || "",
      especialidade: preset.dados.especialidade || "",
    }));
  };

  const handleSave = async () => {
    // Validação e envio para o backend
    if (!form.tipo || !form.dente) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    // Chamar mutation para criar tratamento
    // ...
    onSuccess();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content max-w-md">
        <h2 className="text-lg font-semibold mb-4">Novo Tratamento</h2>

        {/* Smart Preset Selector */}
        <SmartPresetSelector
          presets={tratamentoPresets}
          onSelectPreset={handleApplyPreset}
          label="Selecionar Preset de Tratamento"
          placeholder="Escolha um tratamento comum..."
        />

        {/* Formulário */}
        <div className="space-y-3 mt-4">
          <div>
            <label className="block text-xs font-semibold mb-1">Tipo</label>
            <input
              type="text"
              value={form.tipo}
              onChange={(e) => setForm({ ...form, tipo: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Material</label>
            <input
              type="text"
              value={form.material}
              onChange={(e) => setForm({ ...form, material: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold mb-1">Duração (min)</label>
              <input
                type="number"
                value={form.duracao}
                onChange={(e) => setForm({ ...form, duracao: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1">Preço (€)</label>
              <input
                type="number"
                step="0.01"
                value={form.preco}
                onChange={(e) => setForm({ ...form, preco: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Dente *</label>
            <select
              value={form.dente}
              onChange={(e) => setForm({ ...form, dente: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
            >
              <option value="">Selecione um dente</option>
              {[11, 12, 13, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 26, 27, 28, 31, 32, 33, 34, 35, 36, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48].map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1">Descrição</label>
            <textarea
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)] text-xs"
              rows={3}
            />
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-2 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)] text-sm hover:bg-white/[0.08] transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 rounded-lg bg-indigo-500 text-white text-sm hover:bg-indigo-600 transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Pontos Positivos

-   **Consistência de Preços**: Os preços dos tratamentos são sempre consistentes quando aplicados através de presets.
-   **Redução de Variabilidade**: Minimiza a variação de duração estimada e preço entre diferentes dentistas.
-   **Conformidade**: Garante que os tratamentos registados seguem os padrões da clínica.

### Pontos Negativos e Desafios

-   **Rigidez**: Presets podem ser demasiado rígidos para casos especiais ou tratamentos personalizados.
-   **Manutenção de Preços**: Se os preços dos tratamentos mudarem, todos os presets precisam ser atualizados.
-   **Variabilidade Clínica**: Diferentes dentistas podem ter tempos de tratamento diferentes, o que pode levar a conflitos com os presets.

---

## 3. Smart Presets para Marketing (WhatsApp)

### Caso de Uso

Um gestor de marketing precisa enviar uma mensagem de lembrete de consulta para um paciente. Com um Smart Preset, ele pode selecionar "Lembrete de Consulta - 24h" e a mensagem é preenchida automaticamente com as variáveis corretas (nome do paciente, data, hora, médico).

### Exemplos de Presets Pré-configurados

| Nome do Preset | Tipo | Dados do Preset |
| :--- | :--- | :--- |
| Lembrete de Consulta - 24h | `marketing_whatsapp` | `{ template: "Olá {nome}! 👋\n\nLembramos que tem uma consulta marcada para *amanhã* às {hora} com o Dr(a). {medico}.\n\nPor favor confirme a sua presença respondendo *SIM* ou *NÃO*.\n\nAté amanhã! 😊", variaveis: ["nome", "hora", "medico"] }` |
| Confirmação de Marcação | `marketing_whatsapp` | `{ template: "Olá {nome}! ✅\n\nA sua consulta foi confirmada com sucesso!\n\n📅 Data: *{data}*\n⏰ Hora: *{hora}*\n👨‍⚕️ Médico: *Dr(a). {medico}*\n\nAguardamos a sua visita! 🦷", variaveis: ["nome", "data", "hora", "medico"] }` |
| Reativação de Utente | `marketing_whatsapp` | `{ template: "Olá {nome}! 😊\n\nHá algum tempo que não o(a) vemos na nossa clínica.\n\nA saúde oral é muito importante! Que tal agendar uma consulta de rotina?\n\n🦷 Consulta de avaliação disponível\n📞 Ligue-nos ou responda a esta mensagem\n\nEstamos à sua espera! ❤️", variaveis: ["nome"] }` |
| Promoção Especial | `marketing_whatsapp` | `{ template: "Olá {nome}! 🎉\n\n*Oferta especial este mês!*\n\n✨ {descricao_promocao}\n\n⏰ Válido até {data_fim}\n\nNão perca esta oportunidade! Responda a esta mensagem para saber mais. 😊", variaveis: ["nome", "descricao_promocao", "data_fim"] }` |

### Fluxo de Utilizador

1. **Gestor abre a página de Marketing** (MarketingPage.tsx).
2. **Gestor clica em "Enviar Mensagem"**.
3. **Um modal abre com um Smart Preset Selector para templates de WhatsApp**.
4. **Gestor seleciona "Lembrete de Consulta - 24h"**.
5. **O template é preenchido automaticamente** com a mensagem e as variáveis esperadas.
6. **Gestor seleciona os utentes para os quais quer enviar a mensagem**.
7. **O sistema substitui as variáveis** (ex: `{nome}` → "João Silva", `{hora}` → "14:30").
8. **Gestor revê a mensagem e confirma o envio**.

### Implementação Técnica

**Integração em MarketingPage.tsx:**

```typescript
// client/src/pages/MarketingPage.tsx (Trecho)
import { SmartPresetSelector } from "../components/SmartPresetSelector";

export function MarketingPage() {
  const [form, setForm] = useState({
    template: "",
    variaveis: {} as Record<string, string>,
    utentes: [] as number[],
  });

  // Query para listar presets de marketing
  const marketingPresetsQuery = trpc.presets.listarSmartPresets.useQuery({ tipo: "marketing_whatsapp" });
  const marketingPresets = marketingPresetsQuery.data?.presets || [];

  const handleApplyPreset = (preset: any) => {
    setForm(prevForm => ({
      ...prevForm,
      template: preset.dados.template || "",
      // Inicializar variáveis com valores vazios
      variaveis: preset.dados.variaveis?.reduce((acc: any, v: string) => ({ ...acc, [v]: "" }), {}) || {},
    }));
  };

  const handleSendMessage = async () => {
    // Validação e envio
    if (!form.template || form.utentes.length === 0) {
      alert("Preencha os campos obrigatórios");
      return;
    }

    // Chamar mutation para enviar mensagens
    // ...
  };

  return (
    <div className="space-y-6">
      {/* Smart Preset Selector */}
      <SmartPresetSelector
        presets={marketingPresets}
        onSelectPreset={handleApplyPreset}
        label="Selecionar Template de Mensagem"
        placeholder="Escolha um template de WhatsApp..."
      />

      {/* Preview do Template */}
      {form.template && (
        <div className="p-4 rounded-lg bg-white/[0.05] border border-white/[0.1]">
          <p className="text-xs font-semibold mb-2">Preview da Mensagem:</p>
          <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{form.template}</p>
        </div>
      )}

      {/* Formulário de Variáveis */}
      {Object.keys(form.variaveis).length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold">Preencher Variáveis:</p>
          {Object.entries(form.variaveis).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs font-semibold mb-1">{key}</label>
              <input
                type="text"
                value={value as string}
                onChange={(e) => setForm({
                  ...form,
                  variaveis: { ...form.variaveis, [key]: e.target.value }
                })}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[var(--text-primary)]"
              />
            </div>
          ))}
        </div>
      )}

      {/* Seleção de Utentes */}
      <div>
        <label className="block text-xs font-semibold mb-2">Selecionar Utentes</label>
        {/* ... componente de seleção de utentes */}
      </div>

      {/* Botão de Envio */}
      <button
        onClick={handleSendMessage}
        className="w-full px-4 py-2 rounded-lg bg-indigo-500 text-white font-semibold hover:bg-indigo-600 transition-colors"
      >
        Enviar Mensagens
      </button>
    </div>
  );
}
```

### Pontos Positivos

-   **Consistência de Mensagens**: Todas as mensagens seguem um padrão consistente e profissional.
-   **Eficiência de Tempo**: O gestor não precisa de escrever mensagens do zero.
-   **Personalização Automática**: As variáveis são substituídas automaticamente para cada utente.

### Pontos Negativos e Desafios

-   **Falta de Contexto**: Presets genéricos podem não capturar nuances específicas de cada utente ou situação.
-   **Risco de Mensagens Genéricas**: Se os presets forem muito rígidos, as mensagens podem parecer impessoais ou robóticas.
-   **Gestão de Variáveis**: A substituição de variáveis pode falhar se os dados do utente (ex: nome, data de consulta) não forem preenchidos corretamente.

---

## Conclusão

Os protótipos apresentados demonstram como os "Smart Presets" podem ser implementados de forma prática e eficaz em módulos críticos do DentCare v31.1. Cada protótipo foi desenhado com a honestidade característica do `critical-creative-dev`, apresentando tanto os benefícios quanto os desafios e riscos associados. A implementação destes presets pode transformar significativamente a eficiência do fluxo de trabalho, mas requer atenção cuidadosa à manutenção, validação de dados e experiência do utilizador.

---

## Referências

[1] "The Design of Everyday Things" by Don Norman. Basic Books, 2013.
[2] "Interaction Design: Beyond Human-Computer Interaction" by Preece, Rogers, and Sharp. Wiley, 2015.
