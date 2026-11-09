# Changelog - Aetheria Online

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.
O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [Unreleased]

### Criação de Itens (Crafting), Combate Corpo a Corpo e Slimes

#### Adicionado

- **Sistema de Criação de Itens (Crafting):**
  - Estações de trabalho no mapa: Bancada de Trabalho (`workbench-plaza`) e Forja do Ferreiro (`forge-blacksmith`).
  - Receitas implementadas:
    - _Tábua de madeira_ (2x Madeira $\rightarrow$ 1x Tábua + 10 XP Ferreiro) na bancada.
    - _Espada de treino_ (3x Madeira + 2x Pedra $\rightarrow$ 1x Espada + 25 XP Ferreiro) na forja.
  - Painel interativo `CraftingPanel` com atalho **`C`** e botão no dock do HUD.
  - Consumo de materiais e geração de itens de forma atômica e transacional no PostgreSQL.
- **NPC de Diálogo e Orientação (Ancião Eldrin):**
  - Adição do Ancião Eldrin na Praça Central de Brumavale (`X: 1040, Y: 980`) com túnica cerimonial, barba e etiquetas de identificação.
  - Interação contextual pelo atalho **`E`** ou clique do mouse.
  - Modal imersivo `DialogueModal` com árvore de perguntas e respostas sobre coleta, horta comunitária, oficinas de criação e perigos dos slimes.
- **Hotbar de Acesso Rápido (8 Slots):**
  - Barra de 8 slots na base da tela vinculada aos primeiros índices da mochila.
  - Atalhos no teclado (**`1`** a **`8`**) para equipar e alternar ferramentas com toque direto.
  - Indicador visual e contorno iluminado na ferramenta atualmente em uso.
- **Sistema de Combate Corpo a Corpo e Monstros (Slimes):**
  - Adição da região do _Prado dos Slimes_ a sudeste de Brumavale com 3 slimes ativos (`slime-1`, `slime-2`, `slime-3`).
  - IA de monstros com máquina de estados autoritativa no servidor: _idle_, _chase_, _attack_, _return_ e _dead_ com respawn automático de 15 segundos.
  - Ataque corpo a corpo com validação de distância ($\le 64$ px), cooldown de 400 ms e cálculo de dano (20 desarmado/ferramenta vs 30 com Espada de treino equipada/na mochila).
  - Recompensa por abate: ganho de 30 XP para a profissão de **Guerreiro** e drop garantido de _Gosma de slime_ (`slime_goo`).
  - Mecânica de contra-ataque dos monstros contra jogadores e sistema de derrota/respawn com restauração de vida na praça de Brumavale (`WORLD_SPAWN`).
  - Renderização gráfica dos slimes no cliente Phaser com corpo pulsante/saltitante, olhos e barra de vida flutuante.
  - Barra de vida do personagem exibida em tempo real no HUD de topo (`100/100 HP`).
  - Suporte a ataque via clique direto sobre o monstro ou através da tecla de ação contextual (**`E`** ou **`Espaço`**).

---

## [0.3.0] - 2026-11-09

### Agricultura, Customização de Personagem e HUD Imersivo

#### Adicionado

- **Sistema de Agricultura Persistente:**
  - 16 parcelas de terra estáveis localizadas na fazenda a sudoeste da praça (`Brumavale`).
  - Ciclo de cultivo completo: arar terra com enxada, plantar sementes, regar com regador e colher.
  - Duas culturas disponíveis: **Nabo** (tempo de maturação de 60 s) e **Abóbora** (tempo de maturação de 120 s).
  - Crescimento baseado em timestamps no banco de dados (o crescimento progride mesmo com o jogador desconectado ou servidor reiniciado).
  - Kit agrícola inicial (enxada, regador e sementes) concedido uma vez por personagem.
  - Concessão de 25 XP para a profissão de **Agricultor** por colheita.
- **Customização Visual de Personagens:**
  - Seletor de cores de vestimenta, pele e cabelo no saguão e em jogo.
  - 4 variações de penteado (_short_, _long_, _bun_, _none_).
  - Persistência das características cosméticas na tabela `Character` do PostgreSQL e sincronização em tempo real via Colyseus.
- **HUD Imersivo & Interação Contextual:**
  - Interação contextual pelo atalho **`E`** com raio de alcance de 72 pixels e destaque no chão (_focus ring_).
  - Atalhos de interface rápida: **`B`** (Mochila), **`L`** (Ofícios & Profissões), **`H`** (Visão da Horta) e **`ESC`** (Fechar janelas).
  - Bloqueio de movimentação durante interação com menus abertos para evitar conflitos de entrada.

---

## [0.2.0] - 2026-11-09

### Sistemas de Coleta, Inventário e Economia

#### Adicionado

- **Nós de Recursos na Vila:**
  - Pontos de coleta interativos: Tronco caído (madeira), Rocha (pedra) e Fibras silvestres (fibra).
  - Cooldown global de recuperação de nós de recursos de 5 segundos.
- **Ferramentas Equipáveis:**
  - Machado inicial (coleta de madeira), Picareta inicial (coleta de pedra) e Foice inicial (coleta de fibra).
  - Slot de equipamento de ferramenta com persistência relacional.
- **Mochila e Inventário:**
  - Capacidade de 24 slots individuais com restrições SQL de integridade.
  - Empilhamento de materiais até 99 unidades; ferramentas ocupam 1 unidade individual.
  - Funcionalidade de divisão e movimentação de pilhas entre slots.
- **Sistema de Profissões e XP:**
  - 5 profissões estruturadas: Lenhador, Mineiro, Agricultor, Ferreiro e Guerreiro.
  - Curva de progressão quadrática configurada: `XP = 100 * (nível - 1)^2`.
- **Persistência Transacional & Idempotência:**
  - Transações atômicas no PostgreSQL com bloqueio pessimista (`FOR UPDATE`).
  - Registro de recibos `GameActionReceipt` com chave composta `[characterId, actionId]` para prevenir duplicação de itens (_replay attack_).
  - Salvamento periódico da posição do jogador a cada 30 segundos e no encerramento de sessão.

---

## [0.1.0] - 2026-11-09

### Fundação Técnica e Multiplayer Autoritativo 2D

#### Adicionado

- **Arquitetura Monorepo:**
  - Estrutura baseada em pnpm workspaces (`apps/client`, `apps/server`, `packages/shared`).
  - TypeScript em modo estrito e validação de contratos com schemas Zod.
- **Mundo e Engine 2D:**
  - Phaser 3 integrado via canvas com resolução responsiva.
  - Mapa de Brumavale (64×64 tiles de 32×32) com exportação Tiled (`brumavale.tmj`).
  - Câmera dinâmica centralizada no jogador e colisões determinísticas em terreno e construções.
  - Máquina de estados de animação _idle_ e _walking_.
- **Servidor Autoritativo & Multiplayer:**
  - Servidor WebSocket em tempo real utilizando Colyseus 0.17.
  - Simulação de física a 20 Hz (ticks de 50 ms) no servidor.
  - Predição de movimento no cliente e reconciliação com estado do servidor.
  - Interpolação de outros jogadores com buffer de 100 ms.
  - Limite de 16 jogadores por sala de mundo.
  - Janela de reconexão de 15 segundos em caso de perda temporária de pacote/conexão.
- **Banco de Dados Local sem Docker:**
  - Integração do PostgreSQL portátil (`embedded-postgres 18.6`) com persistência em diretório local.
  - Prisma ORM 7.10 com migrações versionadas e seed idempotente.
  - Autenticação e sessões locais de desenvolvimento.
