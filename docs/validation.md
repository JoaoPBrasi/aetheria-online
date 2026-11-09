# Validação da Etapa 1

Verificação em 9 de novembro de 2026, em ambiente Linux com Node 24.22.1, pnpm 11.25.0, Docker 29.9.2 e PostgreSQL 17 em Compose.

## Resultados

| Verificação             | Evidência                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Instalação reproduzível | `pnpm install --frozen-lockfile` concluído                                                                                             |
| Banco local             | Compose iniciou contêiner saudável com volume persistente                                                                              |
| Migração inicial        | Aplicada na base local e novamente em bases temporárias vazias                                                                         |
| Seed idempotente        | Duas execuções mantiveram exatamente 16 parcelas                                                                                       |
| Testes unitários        | 10 testes: contratos de entrada, configuração e exclusividade de presença                                                              |
| Integração real         | 8 testes HTTP/WebSocket/PostgreSQL passaram                                                                                            |
| Reinício real           | Runner encerrou o servidor, iniciou novamente e recuperou o mesmo ID e nome de personagem                                              |
| Navegador               | Playwright/Chromium concluiu criação, entrada de dois contextos independentes, contagem sincronizada, saída e recuperação após recarga |
| Layout                  | Screenshots revisadas em 1440 e 1024 pixels; sem overflow horizontal no cenário de 1024 pixels                                         |
| JavaScript no navegador | Nenhum evento `pageerror` durante o fluxo automatizado                                                                                 |
| TypeScript              | Verificação strict de cliente, servidor, shared, scripts e testes                                                                      |
| Lint e formatação       | ESLint e Prettier verificados                                                                                                          |
| Build                   | Cliente Vite, servidor TypeScript e shared compilados                                                                                  |

## Cenários de integração

1. Healthchecks e consistência do seed.
2. Tokens inválidos, desconhecidos e ausência de autorização.
3. Hashes de token no banco, isolamento de contas, cinco profissões iniciais, validação de entrada e criação concorrente de personagem.
4. Duas presenças sincronizadas; sessão duplicada recusada; saída e nova entrada permitidas.
5. Entrada recusada sem personagem.
6. Criação pública de sala desativada, 16 conexões na mesma sala e 17ª entrada recusada.
7. Índice inválido e quantidade negativa recusados por constraints SQL.
8. Conexões da base temporária realmente interrompidas: readiness retornou 503, liveness permaneceu 200 e readiness voltou a 200 após recuperação.

O banco usado na integração é temporário e isolado da base local. O runner remove a base ao terminar. A suíte de navegador usa contas locais novas; não elimina personagens de outros contextos.

## Limites da evidência

- O navegador foi testado em desenvolvimento; o build de produção foi compilado, sem deploy.
- O teste automatizado usa Chromium. Firefox e Safari ainda não foram verificados.
- FPS é exibido pela engine, mas não foi estabelecido um benchmark de desempenho; renderização headless não representa hardware de jogadores.
- Não há mapa jogável, movimento, inventário funcional ou combate nesta entrega. Os 14 critérios completos do vertical slice dependem das próximas etapas.
- O aviso de chunk grande corresponde ao Phaser isolado (aproximadamente 1,2 MB antes de gzip); não impede o build. Há também avisos de anotações de tree-shaking no Zod, sem erro de compilação.
- A mensagem de encerramento 4002 durante o teste de sessão duplicada é esperada: a autenticação da segunda conexão é recusada pelo servidor.

## Validacao local Windows sem Docker — 2026-11-09

- PostgreSQL portatil 18.6.0-beta.19 instalado pelo pnpm, escutando somente em 127.0.0.1:5432.
- Prisma 7.10.1 mantido: schema PostgreSQL, migracao foundation aplicada e seed de 16 parcelas.
- TypeScript, lint e build passaram; avisos preexistentes do bundle Phaser e comentarios de Zod permanecem.
- 10 testes unitarios, 8 testes de integracao e 1 teste Playwright no Chrome passaram.
- Integracao confirmou dois jogadores por WebSocket, bloqueio de sessoes duplicadas e personagem restaurado apos reiniciar o servidor.
- db:down, db:up repetido e db:status funcionaram; migracao continuou aplicada apos reiniciar o banco.
- O teste de navegador criou dois personagens de teste na base local, confirmou duas presencas, saida e recuperacao apos recarregar.
- Cliente e servidor iniciados com pnpm dev. Acesso pela LAN depende do firewall e nao foi testado em outro dispositivo.
- Nenhum schema foi substituido, e nenhum dado da nuvem foi importado. Identidade continua exclusiva de desenvolvimento.

## Etapa 2 — mundo exploravel

Mapa 64x64 com tiles 32x32 e exportacao Tiled em apps/client/public/maps/brumavale.tmj.
Fonte canonica: packages/shared/src/data/world.ts; regenere com pnpm world:export.
Arte geometrica original produzida em codigo, sem assets externos.
Terreno e colisoes compartilham a mesma fonte, incluindo agua, construcoes e limites.
Movimento diagonal normalizado, deslizamento em paredes, subpassos contra atravessamento,
limite de delta, camera limitada ao mapa e profundidade pelo eixo Y para arvores/personagem.
Movimento desativado em formularios, desconexao e apos sair; teclas limpas ao perder foco.
Validacao: 13 testes unitarios e teste Playwright com movimento e bloqueio apos sair passaram.
Revisao visual nas capturas desktop e 1024px sem erros de pagina.
Posicoes sao locais e reiniciam no spawn ao entrar. Sincronizacao fica para Etapa 3.

## Etapa 3 — validacao de multiplayer

17 testes unitarios passaram, incluindo validacao de comandos, fila limitada,
rejeicao de replay, reconciliacao dos inputs e interpolacao remota.
10 testes de integracao passaram contra PostgreSQL e WebSockets reais.
A nova cobertura verifica movimento recebido por outro cliente, rejeicao de teleport,
replay, reconexao mantendo posicao, reserva durante queda e liberacao apos 15 segundos.
Playwright no Chrome confirmou que um navegador observa o movimento do outro,
que a saida remove a presenca e que o jogador desconectado nao se move.
Sala nao precisa estar vazia para o teste de navegador. Captura desktop revisada
com dois avatares visiveis. Testes de rede usaram conexao local; latencia e perdas
artificiais ainda nao foram medidas. Persistencia de posicao pertence a Etapa 4.

## Etapa 4 — validação em Windows, 2026-11-09

- Migração aditiva gameplay aplicada no PostgreSQL local, preservando personagens.
- 20 testes unitários passaram: movimento, validação de ações, pilhas, divisão e curva de níveis.
- 14 testes de integração passaram em base temporária isolada: ferramentas iniciais únicas,
  equipamento, coleta, idempotência, revisões, rollback com inventário cheio, corrida por recurso,
  concorrência por personagem e funcionalidades anteriores de multiplayer.
- 2 testes Playwright no Chrome passaram, cobrindo dois jogadores e movimento, mochila,
  equipamento, coleta, divisão de pilha, XP e recuperação depois de sair/reentrar.
- Fixture adicional coletou fibra, moveu o personagem, salvou e verificou posição, inventário
  e XP após reiniciar de fato o servidor. Identificadores temporários foram removidos no cleanup.
- Build, TypeScript e lint passaram. Captura work/gameplay-inventory.png foi revisada visualmente.
- Bench local do snapshot privado: consultas 200 -> 120 em 20 operações; p50 10,50 -> 6,88 ms;
  p95 13,89 -> 8,97 ms. Perfis CPU e EXPLAIN revisados; detalhes em architecture.md.
- Testes não constituem teste de carga com 16 jogadores. Não foram implementados crafting,
  combate ou agricultura jogável. XP de Ferreiro e Guerreiro aguarda os sistemas da Etapa 5.
- Persistência exige PostgreSQL acessível. Em término abrupto, deslocamento desde o último
  save pode ser perdido; operações econômicas confirmadas já foram gravadas atomicamente.

## Agricultura — Etapa 5, primeira entrega

21 testes unitários, 17 testes de integração e 3 testes Playwright passaram.
Inclui dono da parcela, alcance, ferramenta, disputa simultânea, limite de quatro parcelas,
consumo de sementes, prazos 60/120 s, rejeição de colheita antecipada, recibo idempotente,
rollback com mochila cheia e recuperação do prazo após reiniciar realmente o servidor.
O teste Chrome plantou, regou, saiu/reentrou, esperou o prazo real de 60 segundos,
colheu 3 nabos e 25 XP e liberou a parcela ao final. Screenshot farming-growing.png revisada.
Build, TypeScript e lint passaram; migração e seed aplicados ao PostgreSQL local.
Nenhuma cultura ou personagem foi apagado pela migração. Agricultura não consulta o banco
por frame: atualizações acontecem em ações e sincronização. Crafting, combate e NPC pendentes.

## Game feel e HUD — validação

23 testes unitários e 17 testes de integração passaram. A regra de ferramenta agora
considera mochila ou equipamento no servidor, mantendo alcance, propriedade e transações.
4 cenários de navegador passaram: multiplayer, coleta por E sem equipar, mochila e
ofícios por atalho, clique direto num recurso após redimensionar e agricultura contextual.
O cenário agrícola esperou o prazo real de 60 segundos, saiu/reentrou e colheu sem troca
manual de ferramentas. Outro cenário conferiu clique alinhado em 1024×768 e canvas com
resolução real igual ao viewport. Screenshots immersive-hud, immersive-inventory e
immersive-1024 foram revisadas. Build, TypeScript e lint passaram.
A imagem de referência orientou composição do HUD; a arte do mundo continua no estágio
geométrico do protótipo. Sem migração de banco ou alteração dos dados dos personagens.
