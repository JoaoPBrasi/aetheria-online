# ☁️ Guia de Deploy na Nuvem — Aetheria Online

Este guia orienta como colocar o **Aetheria Online** online na nuvem para testes abertos de playtest com amigos e comunidade.

---

## 🏗️ 1. Arquitetura de Produção

O projeto utiliza um modelo **monolítico unificado para a nuvem**:
- **Porta Única:** O backend Express + Colyseus gerencia a API (`/api/*`), WebSockets (`/socket`) e entrega diretamente os arquivos estáticos compilados do frontend ([Phaser 3](file:///c:/Dev/Projetos/teste%20rpg%20wow/apps/client) + React 19).
- **Sem Problemas de CORS ou SSL:** Ao rodar no mesmo host e porta, as conexões WebSocket herdam o mesmo certificado HTTPS (`wss://seu-jogo.up.railway.app/socket`) sem necessidade de configurar proxies complexos.
- **Banco Relacional:** Conecta a qualquer PostgreSQL (Railway Postgres, Neon.tech, Supabase, etc.) via string padrão `DATABASE_URL`.
- **Migrações Automáticas:** O script `start:prod` executa `prisma migrate deploy` antes de iniciar a sala `WorldRoom`, garantindo que o banco de dados remoto esteja sempre com o schema em dia.

---

## 🚀 2. Opção Recomendada: Railway (3 Cliques)

O [Railway](https://railway.com/) é a plataforma mais simples e indicada para jogos Colyseus por suportar WebSockets contínuos e provisionar o PostgreSQL no mesmo projeto.

### Passo 1: Criar o Projeto no Railway
1. Acesse [railway.com](https://railway.com/) e faça login com sua conta do GitHub.
2. Clique em **"New Project"** -> **"Provision PostgreSQL"**.
   - Isso criará um banco de dados PostgreSQL gerenciado na nuvem.

### Passo 2: Adicionar o Repositório do Jogo
1. No mesmo painel do projeto, clique em **"+ New"** -> **"GitHub Repo"**.
2. Selecione o repositório `aetheria-online` (escolha a branch `beta` ou `release`).
3. O Railway detectará automaticamente o [Dockerfile](file:///c:/Dev/Projetos/teste%20rpg%20wow/Dockerfile) na raiz do projeto.

### Passo 3: Configurar as Variáveis de Ambiente
Na aba **Variables** do serviço web do Aetheria, configure:

| Variável | Valor Recomendado | Descrição |
| :--- | :--- | :--- |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | Vincula automaticamente ao banco PostgreSQL criado no passo 1 |
| `NODE_ENV` | `production` | Modo de alta performance |
| `PORT` | `2567` | Porta interna (o Railway expõe via porta 443/80 externamente) |
| `HOST` | `0.0.0.0` | Permite escutar conexões externas no contêiner |
| `DEV_IDENTITY_ENABLED`| `true` | Habilita a criação direta de aventureiros pelo lobby |
| `OPEN_PLAYTEST_ENABLED`| `true` | Autoriza playtests abertos sem bloqueio de OAuth |

### Passo 4: Gerar Domínio Público
1. Vá na aba **Settings** do serviço web.
2. Na seção **Networking**, clique em **"Generate Domain"** (ex: `aetheria-online-production.up.railway.app`).
3. Aguarde o build terminar (cerca de 2 minutos).
4. Abra o link gerado no navegador e jogue!

---

## 🐘 3. Opção Alternativa: Render + Neon PostgreSQL

Caso prefira o [Render](https://render.com/):

1. **Banco de Dados (Neon.tech):**
   - Crie uma conta gratuita no [neon.tech](https://neon.tech/) e crie um projeto PostgreSQL.
   - Copie a string de conexão `DATABASE_URL` (com pooling `?sslmode=require`).
2. **Web Service no Render:**
   - Crie um **New Web Service** apontando para o repositório GitHub.
   - Environment: **Docker**.
   - Instance Type: **Free** ou **Starter** (para conexões WebSocket ativas).
   - Health Check Path: `/health/ready`.
   - Adicione as variáveis de ambiente:
     - `DATABASE_URL`: string copiada do Neon.
     - `NODE_ENV`: `production`.
     - `DEV_IDENTITY_ENABLED`: `true`.
     - `OPEN_PLAYTEST_ENABLED`: `true`.

---

## ⚡ 4. Teste Rápido Imediato com Amigos (Sem Nuvem — Cloudflare Tunnel)

Se quiser testar online **agora mesmo** sem criar contas em plataformas de nuvem:

1. Mantenha o jogo rodando localmente com `pnpm dev`.
2. Baixe o utilitário leve do Cloudflare: `cloudflared` (ou instale via `winget install Cloudflare.cloudflared`).
3. Em um novo terminal, execute:
   ```bash
   cloudflared tunnel --url http://127.0.0.1:5173
   ```
4. O Cloudflare gerará uma URL segura temporária (ex: `https://seu-tunel.trycloudflare.com`).
5. Envie esse link para quem você quiser testar — ele abrirá o jogo e conectará diretamente no seu servidor local!
