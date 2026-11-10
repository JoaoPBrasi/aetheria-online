# Personagem animado e personalização

O jogador local e os jogadores remotos utilizam o corpo `Body_A` do pacote
Pixel Crawler - Free Pack 2.11, enviado pelo usuário. O corpo geométrico
anterior e o retrato SVG foram substituídos por sprites.

## Aparência e criação

O criador usa o mesmo atlas do mundo. Permite mudar cor da roupa, cabelo,
tom de pele e estilo de cabelo: curto, comprido, coque ou sem cabelo.
As seis opções por paleta e os seletores de cores livres continuam disponíveis.
É possível ver a prévia de frente, costas, esquerda e direita e testar caminhada.

O pacote oferece o corpo-base, sem folhas modulares de roupa ou cabelo.
As camadas complementares foram compostas em pixels inteiros e seguem
a cabeça e o corpo em cada quadro. A proveniência dos arquivos está em
`art/pixel-crawler/character/manifest.json`, com os termos originais preservados.

Personagens existentes podem ser editados no lobby. A aparência utiliza
os campos persistentes existentes, sem migração de banco.

## Animações

Repouso possui quatro quadros por direção; caminhada, seis. A lateral é
espelhada para representar esquerda. A última direção é mantida ao parar
e recuperada do servidor. Jogadores remotos utilizam posições interpoladas.
Uma tolerância de 120 ms entre deslocamentos evita alternar caminhada e
repouso a cada passo da simulação de 50 ms.

Gestos locais de coleta, machado, mineração e rega começam após confirmação
da ação. Dano confirmado pode reproduzir reação. Caminhar interrompe o gesto.
As animações são cosméticas: alcance, dano, itens, XP e colisões continuam
nas regras autoritativas existentes. Os gestos ainda não são transmitidos
aos outros jogadores; aparência e locomoção são.

O golpe genérico reutiliza o gesto corporal de interação. Armas e armaduras
visíveis vinculadas aos equipamentos não fazem parte desta entrega.

## Geração e renderização

```powershell
.\pnpm.cmd character:art
```

O gerador lê 21 folhas PNG com quadros de 64×64 e compõe um atlas de
2048×2048 com 966 recortes: base, pele, roupa e camadas de cabelo.
Os quadros completos mantêm os pés em (32, 48); a escala no mundo é 2×.
O comando usa Chrome no Windows, com opção `CHROMIUM_PATH`, como o gerador do mapa.

Versione os resultados ao modificar o compositor:

- `apps/client/public/sprites/player-atlas.png`
- `apps/client/public/maps/player-atlas.json`

O Phaser aplica cores por camada. O Canvas da prévia usa os mesmos recortes
e multiplicação RGB; prepara os quadros quando a aparência muda e anima
os quadros prontos. Ao desmontar ou mudar a prévia, cancela sua animação.
A preferência de movimento reduzido deixa a prévia parada.
