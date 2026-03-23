# ─────────────────────────────────────────────────────────────────
# DentCare Elite V35 — Dockerfile Multi-Stage
# Stage 1: Build (instala dependências e compila frontend + backend)
# Stage 2: Production (imagem final leve)
# ─────────────────────────────────────────────────────────────────

# ── Stage 1: Builder ──────────────────────────────────────────────
FROM node:20-alpine AS builder

# Instalar pnpm
RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar ficheiros de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar todas as dependências (incluindo devDependencies para o build)
RUN pnpm install --frozen-lockfile

# Copiar o código fonte
COPY . .

# Compilar frontend (Vite) + backend (esbuild)
RUN pnpm run build

# ── Stage 2: Production ───────────────────────────────────────────
FROM node:20-alpine AS production

RUN npm install -g pnpm@10.4.1

WORKDIR /app

# Copiar ficheiros de dependências
COPY package.json pnpm-lock.yaml ./

# Instalar apenas dependências de produção
RUN pnpm install --frozen-lockfile --prod

# Copiar artefactos compilados do stage builder
COPY --from=builder /app/dist ./dist

# Copiar ficheiros necessários em runtime
COPY drizzle ./drizzle
COPY shared ./shared

# Criar directório de logs
RUN mkdir -p logs

# Expor porta
EXPOSE 3000

# Variáveis de ambiente padrão (serão sobrescritas em produção)
ENV NODE_ENV=production
ENV PORT=3000

# Iniciar o servidor
CMD ["node", "dist/index.js"]
