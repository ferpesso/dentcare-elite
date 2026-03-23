# CHANGELOG V35.5 — Odontograma Clínico Profissional Completo

**Data:** 2026-03-20
**Componente:** `OdontogramaAvancado.tsx`
**Versão anterior:** V35.4 (1492 linhas)
**Versão actual:** V35.5 (1970 linhas)

---

## Resumo da Actualização

A V35.5 transforma o odontograma de uma ferramenta visual básica num **sistema clínico profissional completo**, com periograma integrado, gestão detalhada de implantes e próteses, indicadores periodontais por face, e uma interface organizada por tabs para acesso rápido a todas as informações clínicas de cada dente.

---

## Novas Funcionalidades

### 1. Periograma Integrado (Tab "Periograma")

Sondagem periodontal completa por face individual, com os seguintes campos:

- **Profundidade de Sondagem** (1-12mm) — com escala visual colorida por gravidade
- **Recessão Gengival** (0-10mm) — com indicador de severidade
- **Sangramento à Sondagem (BOP)** — toggle por face individual
- **Supuração** — toggle por face individual

Cada face (Vestibular, Mesial, Oclusal, Distal, Lingual) tem o seu próprio editor de periograma com botões numéricos interactivos e código de cores:

| Profundidade | Cor | Classificação |
|---|---|---|
| 1-3mm | Verde | Normal |
| 4-5mm | Amarelo | Moderado |
| 6-7mm | Laranja | Severo |
| 8+mm | Vermelho | Crítico |

### 2. Gestão Detalhada de Implantes (Tab "Implante")

Quando o dente é marcado como "Implante", abre-se um formulário completo:

- **Tipo de Implante:** Convencional, Zigomático, Curto, Mini-implante, Pterigoideu
- **Marca:** Campo de texto livre (Straumann, Nobel Biocare, etc.)
- **Comprimento:** 4-18mm
- **Diâmetro:** 2-7mm
- **Pilar:** Tipo de pilar utilizado
- **Data de Colocação:** Campo de data
- **Observações:** Notas livres

### 3. Gestão Detalhada de Próteses (Tab "Implante/Prótese")

Quando o dente é marcado como "Prótese", abre-se um formulário completo:

- **Tipo:** Fixa, Removível, Sobre Implante, Total, Parcial
- **Material:** Cerâmica, Metálica, Metalocerâmica, Zircónia, Resina, Acrílico
- **Data de Instalação:** Campo de data
- **Observações:** Notas livres

### 4. Indicadores Clínicos Expandidos

Novos indicadores no painel de detalhe de cada dente:

- **Sensibilidade** — toggle (novo)
- **Supuração** — toggle (novo)
- **Furca** — Grau 0, I, II, III (apenas para molares) (novo)
- **Nível de Perda Óssea** — slider 0-100% com código de cores (novo)
- **Placa** — mantido
- **Sangramento** — mantido
- **Mobilidade** — mantido (0-3)

### 5. Mini-Indicadores no Mapa Principal

Cada dente no mapa principal agora mostra pequenos indicadores visuais (pontos coloridos) para:

- Placa (amarelo)
- Sangramento (vermelho)
- Problemas periodontais (rosa)
- Furca (violeta)
- Sensibilidade (ciano)
- Supuração (laranja)

### 6. Periograma Resumo Visual

Mini-gráfico de barras no header do painel de detalhes mostrando a profundidade de sondagem de todas as 5 faces, com indicadores BOP.

### 7. BOP e Bolsas Profundas na Vista Oclusal

As faces na vista oclusal do mapa principal agora mostram:

- **Coloração vermelha subtil** para faces com BOP
- **Coloração laranja subtil** para faces com bolsas >3mm
- **Tooltip expandido** com informação periodontal (profundidade + BOP)

### 8. Interface Organizada por Tabs

O painel de detalhes agora está organizado em 5 tabs:

| Tab | Tecla | Conteúdo |
|---|---|---|
| Faces & Estado | 1 | Diagrama SVG, estados de face, estado do dente, indicadores clínicos |
| Periograma | 2 | Sondagem por face, recessão, BOP, supuração, resumo visual |
| Implante/Prótese | 3 | Detalhes do implante ou prótese (contextual) |
| Notas | 4 | Editor de notas clínicas inline (sem modal) |
| Histórico | 5 | Tratamentos e imagens do dente |

### 9. Presets Expandidos

Novos presets rápidos adicionados:

- **Cárie Mesial** — aplica cárie apenas na face mesial
- **Cárie Distal** — aplica cárie apenas na face distal
- **Cárie Vestibular** — aplica cárie apenas na face vestibular

### 10. Estatísticas Avançadas

A barra de saúde oral agora inclui:

- Contagem de **implantes**
- Contagem de dentes com **BOP**
- Contagem de dentes com **bolsas >3mm**
- Contagem de dentes com **furca**

### 11. Botão de Impressão

Novo botão na barra de acções para imprimir o odontograma.

### 12. Atalhos de Teclado Expandidos

- **1-5** — Alternar entre tabs quando um dente está selecionado

---

## Tipos de Dados Novos

```typescript
interface PerioFaceData {
  profundidadeSondagem: number; // 1-12mm
  recessao: number;            // 0-10mm
  sangramentoSondagem: boolean; // BOP
  supuracao: boolean;
}

interface ImplanteData {
  tipo: TipoImplante;
  marca: string;
  comprimento: number;  // mm
  diametro: number;     // mm
  pilar: string;
  dataColocacao: string;
  observacoes: string;
}

interface ProteseData {
  tipo: TipoProtese;
  material: MaterialProtese;
  pilares: number[];
  dataInstalacao: string;
  observacoes: string;
}

// DenteData expandido com:
perio?: Partial<Record<FaceId, PerioFaceData>>;
furca?: GrauFurca;           // 0 | 1 | 2 | 3
implante_detalhes?: ImplanteData;
protese_detalhes?: ProteseData;
sensibilidade?: boolean;
supuracao?: boolean;
nivelOsseo?: number;         // % de perda óssea
```

---

## Compatibilidade

- **Interface mantida:** Props `OdontogramaAvancadoProps` inalteradas
- **Integração com FichaUtentePage:** Sem alterações necessárias
- **Imagens PNG:** Todas as imagens existentes continuam a ser utilizadas
- **Backend:** Compatível — `onSave` continua a receber `(dentesSimples, dentesAvancado)`
- **Nota:** Para persistir os dados avançados (perio, implante, prótese), o backend deverá ser actualizado para guardar o segundo parâmetro `dentesAvancado` do `onSave`

---

## Componentes Novos

| Componente | Descrição |
|---|---|
| `PerioFaceEditor` | Editor de sondagem periodontal por face |
| `ImplanteEditor` | Formulário de detalhes do implante |
| `ProteseEditor` | Formulário de detalhes da prótese |
| `PerioResumo` | Mini-gráfico de barras do periograma |
| `MiniIndicadores` | Indicadores visuais compactos no mapa |
