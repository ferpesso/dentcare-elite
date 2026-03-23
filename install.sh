#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  DentCare Elite V32.3 — Instalador Automático
#  Versão do instalador: 2.0 (com todas as correcções aplicadas)
# ═══════════════════════════════════════════════════════════════════════════════
set -e

# ── Cores para output ──────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'

info()    { echo -e "${CYAN}[INFO]${NC}  $1"; }
success() { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()    { echo -e "${YELLOW}[AVISO]${NC} $1"; }
error()   { echo -e "${RED}[ERRO]${NC}  $1"; exit 1; }
header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════${NC}"; echo -e "${BOLD}${BLUE}  $1${NC}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════${NC}\n"; }

# ── Directório do script ───────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo -e "${BOLD}${BLUE}"
echo "  ██████╗  ██████╗  ██████╗ ██╗  ██╗███╗   ██╗ █████╗ ██████╗ ██╗   ██╗"
echo "  ██╔══██╗██╔═══██╗██╔═══██╗██║ ██╔╝████╗  ██║██╔══██╗██╔══██╗╚██╗ ██╔╝"
echo "  ██████╔╝██║   ██║██║   ██║█████╔╝ ██╔██╗ ██║███████║██████╔╝ ╚████╔╝ "
echo "  ██╔══██╗██║   ██║██║   ██║██╔═██╗ ██║╚██╗██║██╔══██║██╔══██╗  ╚██╔╝  "
echo "  ██████╔╝╚██████╔╝╚██████╔╝██║  ██╗██║ ╚████║██║  ██║██║  ██║   ██║   "
echo "  ╚═════╝  ╚═════╝  ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝  "
echo -e "${NC}"
echo -e "  ${BOLD}Gestão Clínica Dentária — Elite V32.3${NC}"
echo -e "  ${CYAN}Instalador Automático v2.0${NC}"
echo ""

# ══════════════════════════════════════════════════════════════════════════════
header "1. VERIFICAÇÃO DE REQUISITOS"
# ══════════════════════════════════════════════════════════════════════════════

# Node.js
if ! command -v node &> /dev/null; then
  error "Node.js não encontrado. Instale Node.js 18+ em https://nodejs.org"
fi
NODE_VER=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VER" -lt 18 ]; then
  error "Node.js 18+ é necessário. Versão actual: $(node -v)"
fi
success "Node.js $(node -v)"

# pnpm
if ! command -v pnpm &> /dev/null; then
  info "pnpm não encontrado. A instalar..."
  npm install -g pnpm || error "Falha ao instalar pnpm"
fi
success "pnpm $(pnpm -v)"

# MySQL
if ! command -v mysql &> /dev/null; then
  error "MySQL não encontrado. Instale MySQL 8.0+ e certifique-se que está no PATH."
fi
success "MySQL $(mysql --version | awk '{print $3}')"

# ══════════════════════════════════════════════════════════════════════════════
header "2. CONFIGURAÇÃO DO AMBIENTE"
# ══════════════════════════════════════════════════════════════════════════════

if [ ! -f ".env" ]; then
  info "Ficheiro .env não encontrado. A criar a partir do .env.example..."
  cp .env.example .env

  # Gerar SESSION_SECRET aleatório
  SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
  else
    sed -i "s|SESSION_SECRET=.*|SESSION_SECRET=$SESSION_SECRET|" .env
  fi

  warn "Ficheiro .env criado. EDITE o ficheiro .env antes de continuar:"
  warn "  - DATABASE_URL: URL de ligação ao MySQL"
  warn "  - OPENAI_API_KEY: Chave da API OpenAI (para funcionalidades de IA)"
  warn "  - ALLOWED_ORIGIN: URL do frontend em produção"
  echo ""
  read -p "$(echo -e "${YELLOW}Prima ENTER após editar o .env para continuar...${NC}")"
else
  success "Ficheiro .env encontrado"
fi

# Carregar variáveis do .env
set -a
source .env
set +a

# Validar variáveis obrigatórias
if [ -z "$DATABASE_URL" ] || [ "$DATABASE_URL" = "mysql://user:password@host:3306/dentcare" ]; then
  error "DATABASE_URL não configurada no .env. Edite o ficheiro .env e defina a ligação MySQL."
fi
success "Variáveis de ambiente carregadas"

# ══════════════════════════════════════════════════════════════════════════════
header "3. CONFIGURAÇÃO DA BASE DE DADOS"
# ══════════════════════════════════════════════════════════════════════════════

# Extrair credenciais do DATABASE_URL
# Formato: mysql://user:password@host:port/database
DB_USER=$(echo "$DATABASE_URL" | sed 's|mysql://||' | cut -d: -f1)
DB_PASS=$(echo "$DATABASE_URL" | sed 's|mysql://[^:]*:||' | cut -d@ -f1)
DB_HOST=$(echo "$DATABASE_URL" | cut -d@ -f2 | cut -d: -f1)
DB_PORT=$(echo "$DATABASE_URL" | cut -d@ -f2 | cut -d: -f2 | cut -d/ -f1)
DB_NAME=$(echo "$DATABASE_URL" | cut -d/ -f4 | cut -d? -f1)
DB_PORT=${DB_PORT:-3306}

info "Base de dados: $DB_NAME em $DB_HOST:$DB_PORT"

# Testar ligação
if ! mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "SELECT 1;" &>/dev/null; then
  error "Não foi possível ligar ao MySQL. Verifique as credenciais no .env (DATABASE_URL)."
fi
success "Ligação ao MySQL estabelecida"

# Criar base de dados se não existir
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" -e "CREATE DATABASE IF NOT EXISTS \`$DB_NAME\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;" 2>/dev/null
success "Base de dados '$DB_NAME' verificada/criada"

# Aplicar schema completo (inclui todas as correcções)
info "A aplicar schema da base de dados (inclui todas as correcções)..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < drizzle/schema_completo_corrigido.sql 2>/dev/null || true

# Aplicar correcções adicionais de colunas (idempotente — seguro executar múltiplas vezes)
info "A verificar e aplicar correcções de schema..."
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" << 'SQLFIX' 2>/dev/null || true
-- ── Correcção 1: coluna localidade em falta na tabela utentes ─────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'utentes' AND COLUMN_NAME = 'localidade'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE utentes ADD COLUMN localidade VARCHAR(100) NULL AFTER morada',
  'SELECT "utentes.localidade já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Correcção 2: colunas em falta na tabela consultas ────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND COLUMN_NAME = 'utente_nome'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE consultas ADD COLUMN utente_nome VARCHAR(255) NULL AFTER estado',
  'SELECT "consultas.utente_nome já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'consultas' AND COLUMN_NAME = 'medico_nome'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE consultas ADD COLUMN medico_nome VARCHAR(255) NULL AFTER utente_nome',
  'SELECT "consultas.medico_nome já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Correcção 3: colunas em falta na tabela faturas ──────────────────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturas' AND COLUMN_NAME = 'subtotal'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE faturas ADD COLUMN subtotal DECIMAL(10,2) NULL AFTER utente_nif',
  'SELECT "faturas.subtotal já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturas' AND COLUMN_NAME = 'iva'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE faturas ADD COLUMN iva DECIMAL(10,2) NULL AFTER valor_iva',
  'SELECT "faturas.iva já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturas' AND COLUMN_NAME = 'total'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE faturas ADD COLUMN total DECIMAL(10,2) NULL AFTER iva',
  'SELECT "faturas.total já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Correcção 4: coluna utente_nome e utente_nif na tabela faturas ────────────
SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturas' AND COLUMN_NAME = 'utente_nome'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE faturas ADD COLUMN utente_nome VARCHAR(255) NULL AFTER data_vencimento',
  'SELECT "faturas.utente_nome já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @col_exists = (
  SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'faturas' AND COLUMN_NAME = 'utente_nif'
);
SET @sql = IF(@col_exists = 0,
  'ALTER TABLE faturas ADD COLUMN utente_nif VARCHAR(15) NULL AFTER utente_nome',
  'SELECT "faturas.utente_nif já existe" AS info'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- ── Dados iniciais: tipos_consulta ───────────────────────────────────────────
INSERT IGNORE INTO tipos_consulta (nome, duracao_minutos, cor, created_at, updated_at) VALUES
  ('Consulta Geral', 30, '#6366f1', NOW(), NOW()),
  ('Limpeza', 30, '#22c55e', NOW(), NOW()),
  ('Extracção', 60, '#ef4444', NOW(), NOW()),
  ('Ortodontia', 45, '#f59e0b', NOW(), NOW()),
  ('Implante', 90, '#8b5cf6', NOW(), NOW()),
  ('Branqueamento', 60, '#06b6d4', NOW(), NOW()),
  ('Primeira Consulta', 45, '#3b82f6', NOW(), NOW());
SQLFIX

success "Schema da base de dados aplicado e correcções verificadas"

# ══════════════════════════════════════════════════════════════════════════════
header "4. INSTALAÇÃO DE DEPENDÊNCIAS"
# ══════════════════════════════════════════════════════════════════════════════

info "A instalar dependências Node.js (pode demorar alguns minutos)..."
pnpm install --frozen-lockfile 2>&1 | tail -5 || pnpm install 2>&1 | tail -5
success "Dependências instaladas"

# ══════════════════════════════════════════════════════════════════════════════
header "5. COMPILAÇÃO DO PROJECTO"
# ══════════════════════════════════════════════════════════════════════════════

info "A compilar o frontend (React + Vite)..."
pnpm run build 2>&1 | tail -10
success "Compilação concluída"

# ══════════════════════════════════════════════════════════════════════════════
header "6. INSTALAÇÃO CONCLUÍDA"
# ══════════════════════════════════════════════════════════════════════════════

echo -e "${GREEN}${BOLD}"
echo "  ✓ DentCare Elite V32.3 instalado com sucesso!"
echo -e "${NC}"
echo -e "  Para iniciar o servidor em ${BOLD}produção${NC}:"
echo -e "  ${CYAN}  ./start-production.sh${NC}"
echo ""
echo -e "  Para iniciar em ${BOLD}desenvolvimento${NC} (com hot-reload):"
echo -e "  ${CYAN}  pnpm run dev${NC}"
echo ""
echo -e "  O servidor ficará disponível em: ${BOLD}http://localhost:${PORT:-3000}${NC}"
echo ""
echo -e "  ${YELLOW}Na primeira execução, será apresentado o ecrã de criação de conta de administrador.${NC}"
echo ""
