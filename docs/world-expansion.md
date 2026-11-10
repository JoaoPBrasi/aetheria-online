# Expansão jogável de Brumavale

O mapa passou de 64×64 para 96×96 tiles de 32 pixels: 3072×3072 pixels,
com 2,25 vezes a área anterior. A praça permanece em (1040, 1040).

## Construções e exploração

As quatro referências enviadas orientam as fachadas compostas com os assets
Pixel Crawler: madeira e alvenaria com telhado marrom, casa ribeirinha com
telhado verde, estufa envidraçada e cabana de troncos com telhado de ardósia.
Há oito construções: Casa, Armazém, Ferreiro, Estalagem, Casa do Pescador,
Estufa, Casa da Horta e Cabana do Caminho. As fachadas têm janelas, portas,
degraus e detalhes próprios. Entrar nas casas ainda não está implementado.

O lago ganhou um píer e um rio conecta o norte ao sul, com duas pontes.
Caminhos ligam a vila, hortas, prado, campos do sul, acampamento dos orcs e
cemitério. A cenografia inclui bancas, caixotes, jardineiras, cercas, rochas
e bosques. O cemitério tem 12 sepulturas, cripta, grades e corredor de acesso;
as lápides foram compostas com recortes de pedra do pacote.

São 12 monstros: os três slimes originais, três slimes no sul, quatro orcs
e dois esqueletos. Orcs e esqueletos utilizam sprites animados do pacote,
com a IA, combate, respawn e validação autoritativos existentes.
Orcs concedem 40 XP e duas fibras; esqueletos, 40 XP e duas pedras.
Somente abates de slimes avançam o objetivo inicial do Eldrin.

## Colisões e persistência

`packages/shared/src/data/world.ts` é a fonte do terreno e das colisões,
consumida pela predição do cliente e pelo servidor. `cemetery.ts` define
o desenho compartilhado do cemitério. Água, prédios, rochas, árvores,
grades e túmulos têm obstáculos; pontes e corredores são caminháveis.

As posições das 16 parcelas, recursos, NPCs, estações e slimes originais
foram mantidas. A fachada do Ferreiro foi deslocada para leste para deixar
a bigorna e a fornalha existentes acessíveis. Não há migração de banco.
A posição nas novas regiões utiliza o salvamento e a reconexão existentes.

## Assets e geração

As folhas-fonte estão em `art/pixel-crawler`, com origem por arquivo no
`manifest.json` e termos originais em `Terms.txt`. Autoria: Anokolisa,
Pixel Crawler - Free Pack 2.11. As referências orientam a composição;
seus pixels não foram extraídos para o jogo.

```powershell
.\pnpm.cmd world:art
```

O comando exporta a grade para `brumavale.tmj` e `world-art-plan.json`,
depois compõe o terreno e um atlas de objetos com Canvas no Chromium.
Usa Chrome instalado no Windows; `CHROMIUM_PATH` permite outro executável.
Requer as dependências locais, sem novos pacotes ou serviços.

Arte nativa de 16 pixels é ampliada exatamente 2×, sem suavização.
O cliente carrega `brumavale-ground.png`, `brumavale-props.png`, o atlas JSON
e `brumavale-art.json`. A profundidade dos objetos segue sua base no chão.
A revisão e as dimensões são conferidas ao carregar a cena.
O TMJ mantém uma representação simplificada para inspeção da grade;
a aparência final é a composição de terreno e objetos do Phaser.

Depois de alterar a configuração do mundo ou os compositores, gere novamente
e versione os arquivos públicos resultantes. As prévias são salvas em
`work/brumavale-expanded.png` e `work/house-models.png`.
