export interface DialogueTopic {
  id: string;
  prompt: string;
  response: string;
  action?: 'accept_quest' | 'turn_in_quest';
  questId?: string;
}

export interface NPCDefinition {
  id: string;
  name: string;
  title: string;
  x: number;
  y: number;
  greeting: string;
  topics: DialogueTopic[];
}

export const NPCS: readonly NPCDefinition[] = [
  {
    id: 'elder-eldrin',
    name: 'Ancião Eldrin',
    title: 'Guardião de Brumavale',
    x: 1040,
    y: 980,
    greeting:
      'Saudações, nobre viajante! Bem-vindo a Brumavale. Sou Eldrin, o guardião desta vila. Como posso orientar sua jornada hoje?',
    topics: [
      {
        id: 'quest_tutorial',
        prompt: '📜 Tenho coragem! Que tarefa você tem para mim?',
        response:
          'Jovem aventureiro! Vejo grande potencial em você, mas Brumavale exige preparo. Tenho uma missão introdutória: colha 5 madeiras, fabrique 2 tábuas na bancada e derrote 2 slimes no prado ao sul. Posso contar com você?',
        action: 'accept_quest',
        questId: 'tutorial_first_steps',
      },
      {
        id: 'gather',
        prompt: 'Como consigo recursos básicos como madeira e pedra?',
        response:
          'Na praça e arredores você encontrará troncos caídos, rochas e arbustos de fibra. Equipe a ferramenta adequada na sua mochila (B ou atalhos 1 a 8) e aproxime-se para coletar com a tecla E. Cada coleta concede experiência para sua profissão.',
      },
      {
        id: 'farm',
        prompt: 'Como funciona a horta comunitária?',
        response:
          'A sudoeste da praça fica a nossa fazenda com 16 parcelas. Prepare a terra com a enxada, plante sementes de nabo ou abóbora, regue com o regador e aguarde o tempo de maturação para colher vegetais frescos e novas sementes!',
      },
      {
        id: 'craft',
        prompt: 'Onde posso forjar e fabricar novos equipamentos?',
        response:
          'Temos duas oficinas: a Bancada de Trabalho ao lado da praça (para cortar tábuas de madeira) e a Forja do Ferreiro a sudeste (para forjar espadas e ferramentas de metal). Você pode abrir o menu de criação com a tecla C.',
      },
      {
        id: 'combat',
        prompt: 'O que devo saber sobre os perigos ao redor da vila?',
        response:
          'Ao sul, no Prado dos Slimes, criaturas saltitantes rondam o pasto. Forje uma espada de treino na ferraria para causar mais dano (30 vs 20). Ao derrotá-los com E ou Espaço, você obterá gosma de slime e ganhará experiência de Guerreiro. Se for derrotado, você acordará seguro aqui na praça.',
      },
    ],
  },
] as const;

export type NpcId = (typeof NPCS)[number]['id'];
