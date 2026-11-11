# syntax=docker/dockerfile:1
FROM node:24-slim AS base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@11.25.0 --activate

# Stage 1: Build da aplicação
FROM base AS builder
WORKDIR /app

# Copia definições do workspace e dependências
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/
COPY apps/client/package.json ./apps/client/

# Instala todas as dependências com lockfile congelado
RUN pnpm install --frozen-lockfile

# Copia código-fonte e esquemas
COPY tsconfig.json tsconfig.tools.json ./
COPY packages/shared ./packages/shared
COPY apps/server ./apps/server
COPY apps/client ./apps/client

# Compila shared, gera prisma client, compila server e compila o client (Vite)
RUN pnpm build

# Stage 2: Imagem final de execução (Runner)
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=2567

# Copia arquivos compilados e dependências do estágio de build
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages/shared ./packages/shared
COPY --from=builder /app/apps/server ./apps/server
COPY --from=builder /app/apps/client/dist ./apps/client/dist

EXPOSE 2567

# Aplica migrações pendentes no PostgreSQL da nuvem e sobe o servidor autoritativo
CMD ["pnpm", "start:prod"]
