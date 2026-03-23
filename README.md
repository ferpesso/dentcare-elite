# DentCare Elite V32.3 — Gestão Clínica Dentária

Sistema completo de gestão para clínicas dentárias com agenda, odontograma, módulo financeiro, imagiologia, IA preditiva e muito mais.

---

## Requisitos

| Componente | Versão mínima |
|---|---|
| Node.js | 18.x ou superior |
| pnpm | 8.x ou superior (instalado automaticamente) |
| MySQL | 8.0 ou superior |

---

## Instalação Rápida

### 1. Configurar o ficheiro `.env`

```bash
cp .env.example .env
```

Edite o ficheiro `.env` e preencha as variáveis obrigatórias:

```env
DATABASE_URL=mysql://utilizador:senha@localhost:3306/dentcare
SESSION_SECRET=gere_um_segredo_longo_e_aleatorio_aqui
OPENAI_API_KEY=sk-...
ALLOWED_ORIGIN=http://localhost:3000
```

### 2. Executar o instalador automático

```bash
chmod +x install.sh
./install.sh
```

O instalador irá automaticamente:
- Verificar os requisitos (Node.js, pnpm, MySQL)
- Criar a base de dados se não existir
- Aplicar o schema completo com todas as correcções
- Instalar as dependências Node.js
- Compilar o frontend

### 3. Iniciar o servidor

**Produção:**
```bash
./start-production.sh
```

**Desenvolvimento** (com hot-reload):
```bash
pnpm run dev
```

O servidor ficará disponível em `http://localhost:3000`.

---

## Primeiro Acesso

Na primeira execução, será apresentado o ecrã de **criação de conta de administrador**. Basta escolher um nome de utilizador e senha (mínimo 6 caracteres).

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Agenda** | Gestão de consultas com vista dia/semana/mês, cores por estado |
| **Utentes** | Fichas completas com histórico clínico |
| **Odontograma** | Registo visual por dente |
| **Imagiologia** | Arquivo de radiografias e fotografias |
| **Anamnese Digital** | Formulários de anamnese configuráveis |
| **Financeiro** | Tratamentos, faturas, comissões e lucro |
| **Stocks** | Gestão de materiais e consumíveis |
| **Equipa** | Gestão de médicos e funcionários |
| **Laboratórios** | Gestão de envios para laboratório |
| **WhatsApp Marketing** | Campanhas e lembretes automáticos (requer Twilio) |
| **IA Preditiva** | Análise de padrões e previsões (requer OpenAI) |
| **Voice Briefing** | Resumo diário em áudio (requer OpenAI) |

---

## Correcções Aplicadas (v32.3 → v32.3-fixed)

| Problema | Solução |
|---|---|
| Erro ao criar utente (`localidade` em falta) | Coluna adicionada ao schema e ao instalador |
| Texto branco ilegível no modal de marcação | Classes CSS corrigidas para tema light |
| Login falhava via HTTPS | Cookie de sessão com `secure: 'auto'` |
| Erro de horário na marcação (fuso horário) | `getUTCHours()` em vez de `getHours()` |
| Erro ao criar consulta (`utente_nome`, `medico_nome`) | Colunas adicionadas à tabela `consultas` |
| Erro ao aceder ficha do utente (`faturas`) | Colunas `subtotal`, `iva`, `total` adicionadas |
| Erro ao registar tratamento com faturação | Coluna `total` adicionada à tabela `faturas` |
| Slots de agenda demasiado pequenos | Altura aumentada de 64px para 120px por hora |
| Cores de consulta sem distinção por estado | Cores distintas: agendada (azul), confirmada (verde), cancelada (vermelho) |

---

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | URL MySQL: `mysql://user:pass@host:3306/db` |
| `SESSION_SECRET` | Sim | Segredo para cookies (mínimo 32 caracteres) |
| `OPENAI_API_KEY` | Sim* | Chave OpenAI para funcionalidades de IA |
| `ALLOWED_ORIGIN` | Sim | URL do frontend (ex: `https://app.clinica.pt`) |
| `TWILIO_ACCOUNT_SID` | Não | Para WhatsApp Marketing |
| `TWILIO_AUTH_TOKEN` | Não | Para WhatsApp Marketing |
| `TWILIO_WHATSAPP_FROM` | Não | Número WhatsApp Twilio |
| `REDIS_URL` | Não | Para filas de mensagens WhatsApp |
| `S3_BUCKET` | Não | Para armazenamento de imagiologia na nuvem |

*Obrigatório apenas para Voice Briefing, IA Preditiva e Análise de Imagem.

---

## Suporte

Para questões ou problemas, consulte os logs do servidor em `/tmp/dentcare.log` (desenvolvimento) ou no output do processo Node.js (produção).
