# Missões persistentes

A missão `tutorial_first_steps`, oferecida pelo NPC `elder-eldrin`, exige coletar
5 madeiras, fabricar 2 tábuas e derrotar 2 slimes. Os objetivos podem avançar em
qualquer ordem após o aceite. A coleta concede 3 madeiras por ação e o contador
para no requisito de 5. Ações repetidas com o mesmo recibo não contam novamente.

## Persistência e autoridade

`CharacterQuest` usa chave composta `(characterId, questId)`, com estado,
progresso JSON e `completedAt`. A migração `20261110000500_quests` adiciona a
tabela sem modificar personagens, inventários ou cultivos existentes.

Os comandos `quest:accept` e `quest:turn_in` aceitam apenas `{ questId }`,
validado por Zod. O personagem vem da sessão autenticada. O servidor exige
distância de até 72 px do NPC e verifica a posição ao executar a operação.

`QuestRepository` gerencia aceite, leitura e entrega. `advanceQuests` participa
da transação de coleta, fabricação ou recompensa de abate. Todas as mutações
adquirem o bloqueio da linha do personagem, compartilhado com o inventário.

## Entrega

A transação verifica os objetivos, adiciona 5 sementes de nabo e 2 de abóbora,
concede 50 XP de Guerreiro, registra conclusão e incrementa a revisão.
Qualquer falha reverte tudo. Se já estiver concluída, a entrega é um sucesso
idempotente: retorna o estado atual sem conceder itens ou XP novamente.

O cliente aguarda a resposta e mostra erros no diálogo. Reabrir o jogo ou
reiniciar o servidor recupera o estado do PostgreSQL. Progresso antigo que
existia apenas no gerenciador em memória não pode ser recuperado automaticamente.

## Diário e prioridades no HUD

O atalho `J` e o botão **Missões** abrem o diário dentro do jogo. As abas
**Em andamento** e **Concluídas** separam missões ativas e histórico. A lista
permite buscar por nome e consultar objetivos, recompensas, NPC e data de entrega.

Uma missão aceita é acompanhada automaticamente. O jogador pode desmarcá-la
na lista, no painel de detalhes ou no próprio rastreador do HUD. Se não houver
missões acompanhadas, o rastreador desaparece. A conclusão confirmada pelo
servidor remove a missão imediatamente do HUD e a mantém somente no histórico.
Objetivos completos com entrega pendente continuam em andamento.

As preferências são armazenadas em `localStorage`, sob a chave
`aetheria:quests:hidden:<characterId>`. São independentes por personagem e
restritas a este navegador; não alteram o progresso persistido no servidor.
Se o armazenamento do navegador não estiver disponível, a escolha vale para
a sessão. Não foi necessária migração de banco nesta entrega.

## Escopo restante

O dano em monstros ainda é aplicado em memória antes da transação econômica;
uma falha pode deixar o monstro danificado sem recompensa. Esta entrega impede
que esse abate não confirmado avance a missão, mas a consistência completa do
combate permanece uma correção separada. A seleção exclusiva de ataques por
Espaço e o comportamento da hotbar equipada também permanecem para polimento.
