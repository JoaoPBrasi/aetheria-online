# syntax=docker/dockerfile:1
FROM node:24-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV CI=true
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

# Stage 1: Build da aplicação
FROM base AS builder
WORKDIR /app
ENV NODE_OPTIONS="--max-old-space-size=384"
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Copia definições do workspace e dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Instala dependências com concorrência e memória controladas para evitar SIGKILL no Railway
RUN pnpm install --frozen-lockfile --child-concurrency=1 --network-concurrency=2

# Copia código-fonte e esquemas
COPY tsconfig.base.json tsconfig.tools.json ./
COPY art ./art
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client ./apps/client

# Compila em etapas separadas para logs transparentes e otimização de memória
RUN pnpm --filter @aetheria/shared build
RUN pnpm --filter @aetheria/server build
RUN pnpm --filter @aetheria/client build

# Stage 2: Imagem final de execução (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NODE_OPTIONS="--max-old-space-size=384"
ENV HOST=0.0.0.0
ENV PORT=2567

# Copia arquivos compilados e dependências do estágio de build
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/apps/client/package.json ./apps/client/package.json
COPY --from=builder /app/apps/client/dist ./apps/client/dist
COPY scripts/start-production.mjs ./scripts/start-production.mjs

EXPOSE 2567

# Aplica migrações pendentes no PostgreSQL e sobe o servidor autoritativo diretamente via Node
CMD ["node", "scripts/start-production.mjs"]
