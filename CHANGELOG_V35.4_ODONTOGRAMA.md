# CHANGELOG V35.4 — Odontograma 3D Corrigido + Melhorias Premium

**Data:** 2026-03-20
**Componente:** `OdontogramaAvancado.tsx`
**Versão anterior:** V35.3 (1113 linhas)
**Versão actual:** V35.4 (1441 linhas)

---

## Correcção Crítica

### Inversão da Direcção dos Dentes (Bug Principal)

O problema era que a orientação anatómica dos dentes estava invertida entre as arcadas superior e inferior.

**Antes (V35.3 — ERRADO):**
```tsx
transform: isUpper ? "none" : "scaleY(-1)"
```
- Superior: sem inversão — coroa em cima, raiz em baixo (ERRADO)
- Inferior: invertido — coroa em baixo, raiz em cima (ERRADO)

**Depois (V35.4 — CORRECTO):**
```tsx
transform: isUpper ? "scaleY(-1)" : "none"
```
- Superior: invertido — raiz aponta para CIMA (gengiva), coroa para BAIXO (plano oclusal) (CORRECTO)
- Inferior: sem inversão — coroa aponta para CIMA (plano oclusal), raiz para BAIXO (gengiva) (CORRECTO)

As imagens PNG originais têm a coroa no topo e a raiz na base. Para a arcada superior, é necessário inverter verticalmente para que a raiz aponte para cima (em direcção à gengiva/crânio) e a coroa para baixo (em direcção ao plano oclusal). Para a arcada inferior, a imagem fica como está.

---

## Melhorias Implementadas

### 1. Layout Anatómico Melhorado
- **Arcada Superior:** Número → Oclusal → Lateral (raiz para cima)
- **Arcada Inferior:** Lateral (raiz para baixo) → Oclusal → Número
- Separador visual entre quadrantes (linha vertical entre dentes 11/21 e 41/31)
- Labels de arcada com nomes anatómicos (Maxilar / Mandíbula)

### 2. Vista Oclusal SVG Interactiva (5 Faces)
- Substituição das zonas rectangulares por **paths SVG** que formam o diagrama clássico de 5 faces
- Vestibular (topo), Lingual (baixo), Mesial (esquerda), Distal (direita), Oclusal (centro)
- Cada face é um polígono SVG clicável com feedback visual ao hover
- Labels de face (V, L, M, D, O) aparecem ao hover ou quando a face tem estado
- Tooltip flutuante com nome completo da face e estado actual
- Imagem oclusal PNG como background do SVG (melhor integração visual)

### 3. Dente Ausente Redesenhado
- Em vez de imagem PNG com opacidade, usa **SVG com borda tracejada** e símbolo "—"
- Mais limpo e profissional visualmente

### 4. Linha Gengival Visual
- Linha vermelha suave entre as arcadas simulando a **linha gengival**
- Gradiente de opacidade do centro para as extremidades
- Glow subtil para efeito holográfico

### 5. Painel de Detalhes Expandido
- **Diagrama SVG grande (160x160px)** com as 5 faces clicáveis no painel de detalhes
- Informação anatómica: tipo de dente (Molar, Pré-molar, etc.) e quadrante
- Badges inline para placa, sangramento e mobilidade no header
- Navegação entre dentes com botões ← → no painel
- Lista de faces com estado actual ao lado do diagrama

### 6. Indicador de Estado sob o Número
- Barra colorida fina sob o número FDI quando o dente tem estado não-saudável
- Cor e glow correspondem ao estado do dente
- Expande ao selecionar o dente

### 7. Atalhos de Teclado
- **← →** — Navegar entre dentes sequencialmente
- **Esc** — Fechar face selecionada → dente selecionado → modo multi → preset
- **Ctrl+S** — Guardar alterações
- Painel de atalhos colapsável na barra de acções

### 8. Legenda Interactiva com Contadores
- Cada estado na legenda mostra o **número de dentes** nesse estado
- Clique na legenda filtra os dentes por estado (toggle)
- Filtro activo mostra ring visual

### 9. Melhorias Visuais Gerais
- Efeitos neon/glow mais intensos e consistentes
- Hover glow radial no dente (background subtil)
- Animação de entrada do painel de detalhes (`slideInDetail`)
- Text shadow neon nos números FDI quando selecionados
- Borda exterior do SVG oclusal muda com selecção
- Indicadores de placa/sangramento corrigidos para não inverter com o dente

### 10. Informação Anatómica
- Funções `getNomeTipoDente()` e `getQuadrante()` para mostrar informação contextual
- Painel de detalhes mostra "Molar · Superior Direito" etc.
- Estatísticas incluem contagem de dentes com faces afectadas

---

## Compatibilidade

- **Interface mantida:** Props `OdontogramaAvancadoProps` inalteradas
- **Integração com FichaUtentePage:** Sem alterações necessárias
- **Imagens PNG:** Todas as imagens existentes continuam a ser utilizadas
- **Backend:** Sem alterações ao servidor — compatibilidade total com `guardarOdontograma`
