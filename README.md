# Aetheria Online

Fundação de um RPG sandbox 2D original para navegadores desktop. **Etapa 1 implementada**: monorepo, Phaser/React, Colyseus, PostgreSQL/Prisma, identidade local e criação persistente de personagem. As Etapas 2 e 3 acrescentam mapa explorável, câmera, colisões e movimento multiplayer autoritativo.

## Requisitos

- Node.js 24 LTS (validado com 24.22.1).
- pnpm 11.25.0 (`npm install -g pnpm@11.25.0` se necessário).
- PostgreSQL portátil instalado pelas dependências; Docker não é necessário.
- Portas 5173 (cliente), 2567 (servidor) e 5432 (PostgreSQL) livres.

## Iniciar localmente

Execute na raiz `aetheria-online`:

```bash
pnpm install --frozen-lockfile
cp .env.example .env
pnpm setup:local
pnpm dev
```

Abra **http://localhost:5173**. Clique em **Começar jornada**, escolha nome, cores
e cabelo, confira a prévia animada, crie o personagem e clique em **Entrar na vila**.
A interface mostra a conexão real à sala, o número de presenças e o diagnóstico
do PostgreSQL. A aparência é persistida e renderizada com sprites em pixel art 16-bit.

`pnpm dev` compila e observa o pacote shared, inicia o servidor com reinício automático e inicia o Vite. Alterações de código no servidor encerram conexões existentes; entre novamente após o reinício.

Para verificar duas presenças, use dois perfis/contextos independentes do navegador (por exemplo, janela normal e anônima). Duas abas com a mesma identidade são recusadas. Cada contexto precisa criar seu próprio personagem. Recarregue a página e clique em Começar jornada para recuperar o personagem salvo.

### Windows: servidor local sem Docker

Neste computador, execute no PowerShell:

```powershell
Set-Location 'C:\Dev\Projetos\teste rpg wow'
.\pnpm.cmd setup:local
.\pnpm.cmd dev
```

Em outras ocasiões, basta `.\pnpm.cmd db:up` e `.\pnpm.cmd dev`. O comando local usa Node.js 24. O banco usa [embedded-postgres](https://github.com/leinelissen/embedded-postgres), roda como processo local, escuta somente em `127.0.0.1` e salva os dados em `.data/postgres`. O setup pode ser repetido sem apagar personagens. Depois de encerrar o jogo com Ctrl+C, use `.\pnpm.cmd db:down` para parar o banco. Não exclua `.data` ao atualizar o projeto.

Para testar multiplayer, use dois perfis ou uma janela anônima. Na mesma rede, outros dispositivos podem abrir `http://IP-DO-COMPUTADOR:5173` se o firewall permitir a porta 5173 na rede privada. O proxy Vite encaminha as conexões ao Colyseus; não é necessário expor PostgreSQL à rede. A identidade atual é de desenvolvimento; hospedagem pública exige autenticação própria.

Os modelos continuam em `apps/server/prisma/schema.prisma`, com as mesmas migrações. Todos os jogadores usam a mesma base no servidor. Os dados da nuvem não fazem parte desta instalação.

## Comandos

| Comando                             | Função                                                                  |
| ----------------------------------- | ----------------------------------------------------------------------- |
| `pnpm dev`                          | Cliente, servidor e shared em modo de desenvolvimento                   |
| `pnpm world:art`                    | Exportar o mapa e gerar terreno, casas e atlas em pixel art 16-bit      |
| `pnpm character:art`                | Gerar o atlas modular de personagens com os sprites originais           |
| `pnpm build`                        | Gerar Prisma Client e compilar todos os pacotes                         |
| `pnpm lint`                         | ESLint                                                                  |
| `pnpm format:check` / `pnpm format` | Verificar / aplicar Prettier                                            |
| `pnpm typecheck`                    | Verificar TypeScript strict                                             |
| `pnpm test`                         | Testes unitários de contratos, configuração e presença                  |
| `pnpm test:integration`             | Build, banco temporário isolado, migração, seed e testes HTTP/WebSocket |
| `pnpm test:e2e`                     | Fluxo de dois navegadores em Chromium                                   |
| `pnpm db:up` / `pnpm db:down`       | Iniciar / parar PostgreSQL local sem apagar os dados                    |
| `pnpm db:status`                    | Consultar o processo PostgreSQL local                                   |
| `pnpm setup:local`                  | Preparar banco, Prisma Client, migrações e seed                         |
| `pnpm db:generate`                  | Gerar Prisma Client                                                     |
| `pnpm db:migrate`                   | Aplicar migrações versionadas                                           |
| `pnpm db:seed`                      | Compilar shared e preparar 16 parcelas agrícolas sem apagar plantações  |

Após mudanças de schema, crie uma nova migração com `pnpm --filter @aetheria/server exec prisma migrate dev --name nome_da_mudanca`. Não reescreva migrações já aplicadas.

### Testes de integração

Mantenha PostgreSQL ativo. O runner cria uma base `aetheria_test_<uuid>`, aplica a migração do zero, executa o seed duas vezes e sobe um servidor na porta **2568**. Ao final, encerra esse servidor e remove somente a base temporária. O usuário configurado precisa de permissão `CREATEDB` (a configuração do banco portátil possui essa permissão).

A suíte verifica duas presenças, sessão duplicada, limite de 16 jogadores, validações, concorrência na criação, integridade SQL, interrupção real de conexões do banco temporário e recuperação. O runner também reinicia o servidor e verifica a restauração do personagem.

Não rode o fluxo de navegador em paralelo ao build/integração: recompilar shared reinicia o servidor de desenvolvimento.

### Testes no navegador

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

O Playwright inicia `pnpm dev` se não estiver ativo. PostgreSQL deve estar migrado e preparado. Para usar Chromium já instalado, defina `CHROMIUM_PATH=/caminho/para/chromium`. Os testes usam contextos novos, criam dados na base local e salvam screenshots em `work/`. Não utilizam contas reais.

## Estrutura e arquitetura

- `apps/client`: Phaser cuida do canvas; React/Tailwind cuidam de telas e diagnósticos.
- `apps/server`: sala Colyseus, HTTP, serviços, repositórios e Prisma.
- `packages/shared`: contratos Zod, tipos, estado sincronizado, constantes e dados iniciais.
- `docs/architecture.md`: decisões e contratos da fundação.
- `docs/roadmap.md`: próximas etapas e critérios de avanço.
- `docs/validation.md`: evidências e limites da verificação realizada.

Os diretórios futuros de gameplay serão criados quando houver código correspondente. Nenhum diretório vazio simula uma funcionalidade entregue.

## Configuração e diagnóstico

O `.env` da raiz é carregado pelo servidor, Prisma e seed. Variáveis herdadas do processo têm precedência. Nunca versione esse arquivo. As credenciais de `.env.example` são exclusivamente locais.

- `/health/live`: processo HTTP ativo.
- `/health/ready`: consulta real ao banco; retorna 503 quando indisponível.
- Banco não inicia: use `pnpm db:status` e consulte `.data/postgres.log`.
- Porta ocupada: libere a porta correspondente; o Vite não escolhe outra silenciosamente.
- Nome inválido: use 3–20 caracteres, letras, números, espaços, `_` ou `-`.
- Sessão inválida: use **Criar nova identidade local**; isso não exclui o personagem anterior, mas troca o token deste navegador.
- Personagem já conectado: saia da outra aba e tente novamente.
- Alterar senhas no `.env` não muda um banco PostgreSQL já inicializado; atualize a credencial no banco existente.

O proxy Vite encaminha HTTP e WebSocket para o backend. O token não aparece no endereço WebSocket. O diagnóstico do banco é atualizado ao abrir a tela ou clicar em Verificar; não é monitoramento contínuo.

## Limites desta entrega

O mapa jogável de 96×96 tiles tem exploração por WASD/setas, colisões e câmera.
Inclui oito construções, lago, rio, pontes, hortas, campos de monstros e cemitério.
Veja [expansão de Brumavale](docs/world-expansion.md) para detalhes e geração dos assets.
A posição é sincronizada pelo servidor a 20 Hz, com predição local e interpolação remota
de 100 ms. Reconexão automática tem janela de 15 segundos. A posição é salva a cada
30 segundos, nas operações econômicas e na saída normal. Uma queda abrupta pode perder
o deslocamento ainda não salvo. Mochila, coleta, agricultura, crafting, combate e
missões persistentes já são jogáveis. Dash e interiores das casas continuam pendentes.

Identidade local é desabilitada por padrão e recusada em `NODE_ENV=production`. Não publicar esta versão como jogo público: ainda falta autenticação real. O projeto não realiza deploy nem usa serviços pagos.

Há uma sala por processo. Não iniciar múltiplas réplicas esperando coordenação entre elas.
As operações econômicas são gravadas no banco antes de serem confirmadas.

Phaser é carregado sob demanda em um chunk separado; o build informa que esse chunk ultrapassa 500 kB. Não foram introduzidas otimizações adicionais sem medição.

## Etapa 4 — mochila, coleta e persistência

Entre na vila, selecione uma ferramenta na mochila e clique em Equipar. Machado
coleta madeira, picareta coleta pedra e foice coleta fibra. Aproxime-se dos recursos
marcados na praça e clique no botão de coleta correspondente. Alcance: 72 pixels;
rendimento: 3 itens e 10 XP; recuperação global do recurso: 5 segundos.

Selecione uma pilha, informe quantidade e slot de destino (1–24), e clique em
Mover / dividir. A pilha inteira pode trocar de lugar com um item diferente.
Materiais empilham até 99; ferramentas ocupam uma unidade. Guardar ferramenta
falha sem alterar nada caso não exista espaço. Ferramentas iniciais são entregues
uma única vez por personagem, inclusive para personagens de versões anteriores.

Cinco profissões têm XP e nível configurados em packages/shared/src/data/gameplay.ts.
Lenhador, Mineiro e Agricultor recebem XP pela coleta; Ferreiro e Guerreiro receberão
XP com crafting e combate na Etapa 5. A curva atual usa 100 * (nível - 1)^2.

A migração gameplay é aditiva. Atualize com pnpm db:migrate antes de iniciar o jogo.
A migração preserva contas e personagens. Dados privados da mochila não são
transmitidos a outros jogadores. Receber uma resposta de sucesso significa que
a operação e seu recibo já foram confirmados no PostgreSQL. Repetir solicitação
usa o mesmo identificador, evitando recompensas duplicadas após uma resposta perdida.

## Agricultura — primeira entrega da Etapa 5

A fazenda fica a sudoeste da praça (WASD/setas): parcelas entre x=336–528 e y=1232–1424.
O kit de enxada, regador e cinco sementes de cada cultura é entregue uma vez por personagem.
Se a mochila estiver cheia, libere quatro espaços e clique em Atualizar horta / receber kit.
Não é necessário criar outro personagem para receber as ferramentas agrícolas.

1. Selecione a enxada na mochila e clique em Equipar.
2. Aproxime-se da fazenda, selecione uma parcela livre e clique em Preparar terra.
3. Escolha Nabo (60 segundos) ou Abóbora (120 segundos) e clique em Plantar.
4. Equipe o regador e clique em Regar. O crescimento começa na primeira rega.
5. Quando estiver pronta, clique em Colher: recebe 3 alimentos, 2 sementes e 25 XP de Agricultor.

O personagem pode ocupar até quatro parcelas. A parcela continua sendo sua após colher;
prepare novamente para replantar ou clique em Liberar parcela. Não é possível liberar uma
parcela com cultura plantada. Uma única rega é suficiente no protótipo; não há seca ou estações.
O crescimento continua fora do jogo e após reiniciar o servidor, usando horários no PostgreSQL.
A mochila cheia não destrói a plantação nem consome a colheita: libere espaço e tente novamente.
Outros jogadores veem as parcelas ocupadas, mas não podem plantar, regar ou colher nelas.

Crafting, combate, slimes ativos e NPC de orientação continuam nas próximas entregas da Etapa 5.

## Interação e HUD imersivo

Ao entrar na vila, o mundo ocupa a tela. E executa a ação do alvo mais próximo em até
72 pixels; clicar diretamente em um recurso ou parcela próxima também interage.
O alvo recebe um contorno no chão. Ações de coleta e agricultura procuram a ferramenta
na mochila ou no equipamento: trocar de ferramenta manualmente é opcional.

B abre a mochila; L abre Ofícios e a disponibilidade das ferramentas; H abre a visão
avançada da horta. ESC fecha o painel, inclusive quando um campo está selecionado.
O movimento continua com painéis abertos; campos de texto recebem as teclas de digitação. A interface inclui
feedback de materiais recebidos, jogadores próximos e o contexto da próxima ação.
Na horta, E prepara, planta, rega e colhe conforme o estado. Na etapa de plantio, os
botões rápidos escolhem nabo ou abóbora. Liberar uma parcela continua na visão H.

A referência visual enviada orientou a distribuição: mundo como foco, identificação
nos cantos, atalhos embaixo e janelas sobrepostas. A expansão posterior substituiu
o terreno e as construções por composições em pixel art 16-bit.

## Personagem e personalização

O jogador usa o corpo animado em pixel art 16-bit, com repouso e caminhada em quatro
direções. Roupa, pele e cabelo recebem cores independentes; a escolha é salva
no personagem e vista por outros jogadores. Os estilos disponíveis são curto,
comprido, coque e sem cabelo.

No criador, use os botões de direção e Testar caminhada para conferir o sprite
real. Personagens existentes podem ser editados em Personalizar personagem no
lobby. A preferência de movimento reduzido mantém a prévia parada.
Veja [personagem animado](docs/character-art.md) para geração e limites.

## Documentação Técnica e DevLog

- [Linha do Tempo e Evolução Visual](docs/visual-evolution.md): DevLog histórico ilustrado com as 5 eras gráficas do jogo.
- [Arquitetura do Sistema](docs/architecture.md): Monorepo, networking autoritativo e persistência local.
- [Direção de Arte e Cenografia](docs/world-expansion.md): Expansão cenográfica, zonas rurais e tilesets 16-bit.
- [Sistema de Missões](docs/quests.md): Contratos de quests, NPCs e rastreador no HUD.
- [Roadmap](docs/roadmap.md): Planejamento de versões e marcos técnicos.
