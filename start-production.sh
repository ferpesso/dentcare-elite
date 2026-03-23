#!/bin/bash

# ─────────────────────────────────────────────────────────────────────────────
# DentCare Elite V35 — Production Startup Script
# ─────────────────────────────────────────────────────────────────────────────

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "=========================================="
echo "  DentCare Elite V35 — Production Start"
echo "=========================================="
echo ""

# Set environment
export NODE_ENV=production

# Load environment variables if .env.production exists, otherwise .env
if [ -f .env.production ]; then
  export $(cat .env.production | grep -v '^#' | grep -v '^\s*$' | xargs)
  echo -e "${GREEN}[OK]${NC} Variáveis carregadas de .env.production"
elif [ -f .env ]; then
  export $(cat .env | grep -v '^#' | grep -v '^\s*$' | xargs)
  echo -e "${YELLOW}[AVISO]${NC} .env.production não encontrado. A usar .env"
else
  echo -e "${RED}[ERRO]${NC} Nenhum ficheiro .env encontrado!"
  exit 1
fi

# Forçar NODE_ENV=production (mesmo que .env tenha development)
export NODE_ENV=production

# Verificações de produção
ERRORS=0

if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}[ERRO]${NC} DATABASE_URL não configurada!"
  ERRORS=$((ERRORS + 1))
fi

if [ -z "$SESSION_SECRET" ] && [ -z "$JWT_SECRET" ]; then
  echo -e "${RED}[ERRO]${NC} SESSION_SECRET ou JWT_SECRET não configurados!"
  ERRORS=$((ERRORS + 1))
fi

if [ -z "$ALLOWED_ORIGIN" ]; then
  echo -e "${YELLOW}[AVISO]${NC} ALLOWED_ORIGIN não configurado. CORS será restritivo."
fi

if [ -z "$REDIS_URL" ]; then
  echo -e "${YELLOW}[AVISO]${NC} REDIS_URL não configurado. Sessões usarão MemoryStore (não recomendado em cluster)."
fi

# Verificar se o build existe
if [ ! -f "dist/index.js" ]; then
  echo -e "${RED}[ERRO]${NC} Build não encontrado em dist/index.js"
  echo "  Execute primeiro: pnpm run build"
  ERRORS=$((ERRORS + 1))
fi

if [ ! -d "dist/public" ]; then
  echo -e "${YELLOW}[AVISO]${NC} Frontend build não encontrado em dist/public/"
  echo "  Execute primeiro: pnpm run build"
fi

if [ $ERRORS -gt 0 ]; then
  echo ""
  echo -e "${RED}Encontrados $ERRORS erros críticos. Corrija antes de iniciar.${NC}"
  exit 1
fi

# Informações de arranque
PORT=${PORT:-3000}
echo ""
echo "  Porta: $PORT"
echo "  Ambiente: $NODE_ENV"
echo "  Base de dados: $(echo $DATABASE_URL | sed 's/:[^:@]*@/:***@/')"
echo "  Redis: ${REDIS_URL:-não configurado}"
echo "  CORS Origin: ${ALLOWED_ORIGIN:-não configurado}"
echo ""
echo "A iniciar servidor..."
echo ""

# Start the server
node dist/index.js
