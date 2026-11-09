# Etapas verificáveis

## 1 — Fundação (concluída)

Monorepo, Phaser/React, Colyseus, PostgreSQL, modelos Prisma, migração, seed, identidade local, criação de personagem e presença real. Aceite: instalação reproduzível, banco consultável, duas presenças, isolamento entre contas, testes e build.

## 2 — Mundo (concluída)

Tilemap Tiled 64×64, tiles 32×32, vila com praça, fazenda, casa, loja, ferreiro, lago, floresta, mineração e área de slimes. Camadas do contrato, colisões, câmera e personagem com máquina de estados idle/walking. Revisar encaixes, pivôs e profundidade dos assets originais. Aceite: mapa sem erros, movimento diagonal normalizado, colisões e leitura visual correta.

Implementado como protótipo visual com arte geométrica original, movimento local e estados idle/walking. O arquivo Tiled é gerado pelo comando `pnpm world:export`, a partir de `packages/shared/src/data/world.ts`, fonte comum para terreno e colisões. O tileset SVG de edição usa cores-base; o cliente acrescenta detalhes procedurais. Interiores, NPCs e slimes ativos ainda não estão implementados. Na Etapa 3, a posição passou a ser sincronizada pelo servidor. O salvamento da posição no banco pertence à Etapa 4.

## 3 — Multiplayer (concluída)

Simulação de 20 Hz, inputs sequenciados limitados, colisões no servidor, predição/reconciliação local e interpolação remota de 100 ms. Preservar uma sala de 16 jogadores. Reconexão de 15 segundos e bloqueio de ações enquanto desconectado. Aceite: dois navegadores veem movimento correto; velocidade, posição e alcance não são confiados ao cliente.

## 4 — Sistemas (concluída)

ResourceNode genérico para madeira, pedra e fibra; ferramentas e alcance; inventário de 24 slots com empilhamento, divisão, movimento e equipamento; cinco profissões com curva configurável. Persistência atômica e snapshots revisionados. Aceite: coleta gera recursos e XP, falhas não duplicam itens, personagem restaura após sair e reiniciar.

## 5 — Gameplay (em andamento: agricultura)

Parcelas com proprietário, preparo, plantio, rega e duas culturas de 60 e 120 segundos. Ferramentas iniciais evitam bloqueio de progressão. Crafting de machado, picareta, espada e tábuas em estações. Combate corpo a corpo e slime com idle, patrulha, perseguição, ataque e retorno. NPC de diálogo/orientação. Morte sem perda de inventário; respawn na vila. Aceite: ciclo de plantar/colher, fabricar tábuas e derrotar slime, com resultados validados no servidor.

## 6 — Integração

HUD, vida, energia, XP da profissão ativa, hotbar de oito slots, indicador de interação, inventário, profissões, crafting e configurações. Verificar diferentes resoluções desktop, medir FPS e latência, testar quatro jogadores e atualizar documentação. Aceite: os 14 critérios do prompt mestre demonstrados.

Fora deste MVP: PvP, comércio, mercado, pesca, interiores, controles móveis, dash e múltiplas réplicas coordenadas. Antes de disponibilização pública, adicionar autenticação real e associação segura de sessão/personagem.
