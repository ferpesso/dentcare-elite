# DentCare Elite V35.2 — Sistema de Traduções i18n + Fundo Decorativo

## Data: 20 de Março de 2026

---

## 1. Sistema de Traduções Internacionais (i18n)

### Bibliotecas Adicionadas
- `i18next` v25.8.20
- `react-i18next` v16.5.8
- `i18next-browser-languagedetector` v8.2.1

### Idiomas Suportados

| Idioma | Código | Terminologia Clínica |
|--------|--------|---------------------|
| Português (Portugal) | `pt-PT` | Utente, Médico Dentista, Morada, NIF, Código Postal, Telemóvel, Fatura |
| Português (Brasil) | `pt-BR` | Paciente, Dentista, Endereço, CPF/CNPJ, CEP, Celular, Nota Fiscal |
| English (UK) | `en-GB` | Patient, Dentist, Address, VAT Number, Postcode, Mobile, Invoice |
| English (US) | `en-US` | Patient, Dentist, Address, Tax ID, Zip Code, Cell Phone, Invoice |
| Español | `es-ES` | Paciente, Odontólogo, Dirección, NIF/CIF, Código Postal, Móvil, Factura |
| Français | `fr-FR` | Patient, Chirurgien-dentiste, Adresse, Numéro de TVA, Code Postal, Portable, Facture |

### Ficheiros Criados
- `client/src/i18n/index.ts` — Configuração central do i18n
- `client/src/i18n/locales/pt-PT.json` — Dicionário PT-PT (base)
- `client/src/i18n/locales/pt-BR.json` — Dicionário PT-BR
- `client/src/i18n/locales/en-GB.json` — Dicionário EN-GB
- `client/src/i18n/locales/en-US.json` — Dicionário EN-US
- `client/src/i18n/locales/es-ES.json` — Dicionário ES-ES
- `client/src/i18n/locales/fr-FR.json` — Dicionário FR-FR

### Ficheiros Modificados
- `client/src/main.tsx` — Import do i18n
- `client/src/contexts/ConfigContext.tsx` — Sincronização automática do idioma com i18n
- `client/src/components/Sidebar.tsx` — Navegação traduzida
- `client/src/components/TopBar.tsx` — Barra superior traduzida
- `client/src/components/ThemeToggle.tsx` — Tooltips traduzidos
- `client/src/pages/DashboardPage.tsx` — Dashboard completamente traduzido
- `client/src/pages/SistemaPage.tsx` — Ligação idioma ↔ i18n ao guardar

### Como Funciona
1. O idioma é guardado na BD via `SistemaPage > Aparência > Localização`
2. Ao guardar, o `i18n.changeLanguage()` é chamado imediatamente
3. Ao carregar a app, o `ConfigContext` sincroniza o idioma da BD com o i18n
4. O idioma persiste em `localStorage` como fallback

---

## 2. Fundo Decorativo (Wave Background)

### Componente
- `client/src/components/WaveBackground.tsx` — Imagem decorativa no canto da tela

### Imagens
- `client/public/installer_sidebar_dentcare.webp` — Versão dark (ondas cyan + violet)
- `client/public/installer_sidebar_light.webp` — Versão light (clara e suave)

### Opções em Configurações > Aparência
- **Ondas Animadas** — Mostra a imagem decorativa no canto inferior direito
- **Fundo Liso** — Remove o efeito (fundo limpo branco ou escuro)

---

## Notas Técnicas
- Build compila sem erros
- Compatível com tema escuro e claro
- Datas formatadas automaticamente no locale do idioma selecionado
- Moeda formatada via `Intl.NumberFormat` com o locale correto
