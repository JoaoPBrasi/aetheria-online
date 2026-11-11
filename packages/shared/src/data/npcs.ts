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
          'Posso lhe dar uma espada de treino. Siga pela estrada a leste, desça pelo acampamento e derrote 2 slimes no prado. Depois, traga 5 madeiras do Bosque Antigo e fabrique 2 tábuas na Bancada. Posso contar com você?',
        action: 'accept_quest',
        questId: 'tutorial_first_steps',
      },
      {
        id: 'quest_first_iron_blade',
        prompt: 'Aceitar missão: A Primeira Lâmina de Ferro',
        response: 'Posso lhe mostrar como forjar sua primeira espada de ferro.',
        action: 'accept_quest',
        questId: 'first_iron_blade',
      },
      {
        id: 'gather',
        prompt: 'Como consigo recursos básicos como madeira e pedra?',
        response:
          'Corte os carvalhos adultos do Bosque Antigo para obter madeira. A Pedreira do Lago, a nordeste do Lago dos Juncos, tem pedra e ferro. Procure fibras e flores nas clareiras pelo mapa. Leve a ferramenta adequada e pressione E para coletar. Flores podem ser colhidas à mão.',
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
          'Use a Bancada da praça para fazer tábuas. Perto do Ferreiro, transforme madeira em carvão e funda minério em lingotes na Fornalha. Leve os lingotes à Forja para fazer machados e espadas. Consulte as receitas com a tecla C.',
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
