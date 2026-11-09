export interface DialogueTopic {
  id: string;
  prompt: string;
  response: string;
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
