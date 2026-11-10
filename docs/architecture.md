# Arquitetura da fundação

## Fronteiras

Phaser renderiza exclusivamente o mundo e animações. React renderiza a interface. `GameBridge` é um external store tipado, consumido com `useSyncExternalStore`; métricas são publicadas uma vez por segundo. `WorldConnection` encapsula o SDK Colyseus e possui encerramento idempotente. O ciclo de vida do canvas suporta remontagem em React StrictMode.

O servidor executa regras e acessa o banco. `IdentityRepository` resolve conta e personagem exclusivamente pelo token. O cliente não pode escolher `accountId`, ID persistente ou posição na criação. Catálogos e contratos ficam no pacote shared. Prisma Client gerado não é versionado nem importado pelo cliente.

## Modelos

Account guarda UUID e hash SHA-256 de token aleatório de 256 bits. Character pertence a uma conta única e guarda nome, aparência, mapa, posição, direção, vida, energia e revisão. InventorySlot possui índice único por personagem e limites SQL de 0 a 23. CharacterSkill possui profissão única, XP não negativo e cinco profissões válidas. CharacterEquipment possui posição única por personagem. FarmPlot possui posição estável e proprietário opcional, além de timestamps de cultivo.

Slots vazios são representados pela ausência de linha. Catálogos de itens e receitas serão dados versionados, não tabelas mutáveis nesta fase. As profissões iniciais são criadas junto ao personagem por uma operação relacional atômica do Prisma. Restrição única de conta protege também contra pedidos concorrentes.

## Contratos HTTP

| Endpoint                | Entrada                                                              | Saída / falha                                                   |
| ----------------------- | -------------------------------------------------------------------- | --------------------------------------------------------------- |
| `GET /health/live`      | —                                                                    | 200 quando HTTP está ativo                                      |
| `GET /health/ready`     | —                                                                    | 200 após `SELECT 1`; 503 sem banco                              |
| `POST /api/dev/session` | Sem token para criar; `Authorization: Bearer <token>` para recuperar | Token e resumo de personagem ou null; 401 para token inválido   |
| `POST /api/characters`  | Bearer; `{ name, appearance }`                                       | 201 com personagem; 400 para entrada inválida; 409 se já existe |
| `POST /api/world/seat`  | Bearer                                                               | Reserva da única sala; 409 sem personagem ou sala cheia         |

Erros da aplicação seguem `{ error: { code, message } }`. O envelope próprio de erros Colyseus permanece no protocolo Colyseus. Falhas inesperadas são respondidas como 503 com mensagem genérica; logs não incluem tokens ou URLs de banco. Corpos HTTP têm limite de 4 kB. A identidade local é explicitamente bloqueada em produção.

## Rede atual

O processo pré-cria `world` com até 16 clientes e mantém a sala quando vazia. Métodos HTTP públicos de matchmaking são desativados; a API da aplicação usa `joinById` internamente. O navegador consome a reserva via proxy WebSocket. `onAuth` valida novamente token e personagem, então reserva sua presença antes de finalizar a entrada. Outra sessão para o mesmo personagem é recusada. Saída libera a reserva.

O estado público contém somente mapa e presenças (ID de personagem e nome). Token, inventário e dados privados não são publicados. Não há mensagens de alteração de estado nesta etapa. Patch rate: 100 ms. Reconexão automática, movimentação, predição e interpolação serão implementadas na Etapa 3.

## Persistência futura

Na Etapa 4, operações econômicas serão serializadas por personagem, executadas em transação e publicadas somente após confirmação. Snapshots usarão revisão para não sobrescrever operações mais recentes. Salvamento periódico de 30 segundos, eventos importantes e encerramento normal será adicionado quando houver estado de gameplay mutável. Recursos naturais e criaturas poderão reiniciar junto ao processo; agricultura usará timestamps persistidos.

## Escala e arte

Tiles: 32×32; top-down; Brumavale possui 96×96 tiles. Cliente e servidor usam
o terreno determinístico de `packages/shared/src/data/world.ts`. O exportador
gera a grade Tiled e o plano da arte; o compositor produz o terreno e um atlas
Pixel Crawler. O Phaser organiza os objetos por profundidade a partir da base.
Os assets-fonte, autoria e termos estão em `art/pixel-crawler`.
Veja [expansão de Brumavale](world-expansion.md) para regiões e geração.

## Referências de API

- https://0-17.docs.colyseus.io/server
- https://www.prisma.io/docs/orm/v7
- https://phaser.io/download/release/v3.90.0
- https://vite.dev/blog/announcing-vite7

Versões exatas estão fixadas nos manifestos e em `pnpm-lock.yaml`. Colyseus é integrado pelos pacotes oficiais core, ws-transport, schema e SDK, evitando dependências de ferramentas de administração não utilizadas.

## Etapa 3 — movimento multiplayer

O servidor consome no maximo um input por jogador a cada 50 ms (20 Hz).
O protocolo move aceita somente seq, dx e dy inteiros com direcoes de -1 a 1.
Posicao, velocidade e tempo de simulacao nunca sao fornecidos pelo cliente.
Fila limitada a quatro inputs, sequencias repetidas rejeitadas e limite de 60 mensagens/s.
Cliente prediz passos de 50 ms, descarta comandos confirmados e reaplica os pendentes.
Snapshots de rede a 100 ms; outros jogadores usam interpolacao atrasada em 100 ms,
sem extrapolacao. Colisoes usam o mesmo terreno deterministico no cliente e servidor.
A janela de reconexao e de 15 segundos, mantendo a reserva exclusiva do personagem.
Na queda, inputs pendentes sao descartados e movimento e bloqueado; a retomada usa
estado autoritativo. Expirada a janela, a presenca e a reserva sao removidas.

Posicoes sao estado de sala, ainda nao persistido no PostgreSQL. A etapa 4 acrescentara
persistencia de gameplay. Prisma, schemas e migracoes nao foram alterados nesta etapa.
Referencia do protocolo de reconexao: https://0-17.docs.colyseus.io/room/reconnection

## Etapa 4 — decisões e desempenho

Room -> GameplayService -> GameplayRepository -> Prisma. O personagem de uma ação
vem da sessão autenticada; o comando não aceita characterId, posição, recompensa ou XP.
Inventário, equipamento, XP e revisão são atualizados na mesma transação com bloqueio
da linha do personagem. GameActionReceipt tem chave composta personagem/UUID da ação.
Replays confirmados retornam o estado atual sem repetir efeitos. Comandos de estado
antigo são rejeitados. Filas por personagem impedem concorrência de operações econômicas,
e filas por recurso impedem dois jogadores de consumir a mesma disponibilidade.

A posição é salva a cada 30 s, nas operações econômicas, na saída e no encerramento
normal. Saves falhos ficam pendentes em memória para nova tentativa enquanto o servidor
estiver ativo; sem PostgreSQL acessível não é possível garantir persistência no encerramento.
Sem resposta de sucesso, o cliente não deve presumir que recebeu recursos. Quedas abruptas
podem perder deslocamento não salvo. Recursos e cooldowns reiniciam com o processo,
conforme previsto no MVP; inventário e XP continuam no PostgreSQL.

Profiling local de 20 carregamentos privados, após aquecimento:

| Medida                     | Antes     | Depois    |
| -------------------------- | --------- | --------- |
| Consultas SQL totais       | 200       | 120       |
| Latência mediana           | 10,50 ms  | 6,88 ms   |
| Latência p95               | 13,89 ms  | 8,97 ms   |
| Tempo SQL acumulado        | 232,87 ms | 137,68 ms |
| Variação de heap observada | 2,81 MB   | 1,60 MB   |

Removida a segunda leitura completa de um snapshot sem alterações. EXPLAIN confirmou
uso do índice existente InventorySlot_characterId_index_key; nenhum índice extra foi
necessário. CPU profiles em work/ mostram principalmente espera e compilação de módulos
na amostra curta, sem justificar otimizações adicionais do loop. A variação de heap é
ruidosa, sem coleta de lixo controlada; não comprova redução permanente de memória.
Esses números são de laboratório local, não representam 16 jogadores ou latência de internet.
Reprodução: pnpm exec node --cpu-prof --cpu-prof-dir=work --import tsx scripts/profile-gameplay.ts.
O script cria e remove somente a conta temporária usada na medição.

Recibos são mantidos para garantir idempotência durante o MVP. Antes de operação prolongada
será necessário definir arquivamento/retenção e monitorar o crescimento dessa tabela.

## Agricultura — decisões

FarmPlot continua sendo a fonte persistente de propriedade e cultivo. Uma migração aditiva
adiciona apenas farmingKitGranted e move os 16 IDs estáveis para a fazenda, preservando donos,
culturas e horários. O seed atualiza a localização sem apagar a produção. Nabo e abóbora usam
os mesmos contratos e catálogo, com 60 s e 120 s de crescimento contados a partir da primeira rega.

Ação farm aceita ID da parcela, operação e cultura; proprietário, alcance, XP, rendimento e
horários são decididos pelo servidor. A transação bloqueia primeiro o personagem e depois a
parcela. O bloqueio do personagem serializa a contagem de quatro parcelas; o bloqueio da parcela
resolve a disputa entre donos. Inventário, cultivo, XP, revisão e recibo são confirmados juntos.
Repetir o UUID de uma colheita retorna o estado atual sem conceder novos itens.

Snapshot público da fazenda é consultado ao sincronizar e após operações agrícolas. Não há
consultas por frame ou temporizadores de crescimento no banco. Cliente calcula apenas a exibição
do tempo restante; o servidor compara a hora real com harvestAt antes de conceder a colheita.
Mudanças de inventário ficam privadas. Não há interiores, seca, temporadas nem venda de alimentos.

## HUD e ferramentas automáticas

hasTool, no pacote shared, aceita item na mochila ou equipamento. GameplayRepository
aplica a verificação dentro da transação para coleta, enxada e regador. Nenhuma posição,
recompensa ou propriedade passou a ser escolhida pelo cliente. Interação contextual no
cliente apenas seleciona um comando já existente; o servidor mantém as validações.

GameHud cuida de atalhos, foco e janelas no DOM; WorldScene destaca e recebe cliques
nos objetos Phaser. GameBridge liga a seleção à conexão existente. Painéis pausam inputs
locais, sem pausar os outros jogadores. ResizeObserver acompanha o viewport e é removido
no encerramento. HUD não inicia novas conexões nem cria consultas periódicas de banco.
