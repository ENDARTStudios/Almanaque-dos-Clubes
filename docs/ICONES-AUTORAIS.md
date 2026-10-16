# Ícones autorais do Almanaque dos Clubes

T576 — conjunto de ícones de **arte original do projeto** para o que o acervo ainda **não tem
imagem oficial**: escudo de clube, foto de jogador, imagem de troféu. Autoria **END ART Studios**.

- Geometria (fonte única): `apps/web/src/components/icons/icons.json`
- Componente tipado: `apps/web/src/components/icons/index.tsx`
- SVGs avulsos (gerados): `apps/web/public/icons/*.svg`
- Gerador: `apps/web/scripts/export-icons.mjs` (`pnpm --filter web icons:export`)
- Teste de originalidade e não-drifting: `apps/web/tests/unit/icons-autorais.test.tsx`

## A regra que define este trabalho (inegociável)

Estes desenhos **não** são rastreio, vetorização, cópia nem "reinterpretação" de fotografia,
escudo ou troféu existente. Converter ou adaptar obra alheia produz **obra derivada**
(Lei 9.610/98, art. 29), e escudo de clube é **marca registrada** — nenhum dos dois pode entrar
no produto por meio de um desenho "parecido".

O que é livre é a **forma genérica que evoca a CATEGORIA**: copo, taça, medalha, placa, cinto,
escudo, bola, o objeto do ofício de cada posição. O que não é livre é a **silhueta identificável**
de um objeto real: a taça da Copa do Mundo, por exemplo, é uma forma própria — reproduzi-la seria
derivá-la, ainda que em traço. Modelo de chuteira ou padrão de luva de uma marca também é marca:
os objetos daqui são formas genéricas, não a silhueta de um produto.

Pelo mesmo motivo, nenhum placeholder de posição é **retrato ou caricatura de pessoa real**
(Código Civil, art. 20 — direito de imagem). E, por decisão de produto, também não é **figura
humana**: a primeira versão desenhava um atleta genérico por posição e o resultado foi um
**boneco palito**, reprovado e removido. A posição passou a ser representada por um **OBJETO do
ofício** — a luva do goleiro, a caneleira do zagueiro, a bola do meio-campo, a chuteira do
atacante. Objeto genérico, desenhado pela equipe: sem pessoa, sem escudo real e **sem marca de
fabricante** (nenhuma logo de tênis, luva ou bola).

### Exceção declarada: a bola é FORMA CANÔNICA

`player-ball` **não** é "arte autoral de forma". Bola de futebol em ícone é **geometria canônica**:
círculo + pentágono central + costuras até a circunferência — a mesma construção existe em FA,
Material Symbols e Tabler (MIT). Chamar essa forma de criação deste projeto seria indefensável.
O que é **do projeto** é o desenho: pentágono maior e **rotacionado** (vértice para baixo, e não
para cima como no cânone), costuras mais curtas e nenhum `d` coincidente com biblioteca alguma.
É o que o cabeçalho do SVG publicado diz — ele não reivindica a forma.

O objeto é desenhado para ser lido a **16px** (a grade em que ele aparece): silhueta simples, o
mesmo traço 1,75 de todo o conjunto e formas que não se confundem entre si nem com os troféus.

### Rodada de auditoria visual (PR #679)

Uma auditoria independente **bloqueou** a primeira versão de `player-glove` e
`player-shin-guard` com medição em pixels (16/24/48/96px, claro e escuro): a luva lia como
**cadeado** (cúpula fechada + barra de punho colada = arco + corpo) e a caneleira como **ovo**
(barras de largura total transbordando o contorno e fundo em ponta). O que mudou:

- `player-glove` — a cúpula lisa virou **quatro dedos** (arcos com alturas diferentes), o
  polegar saiu do meio da lateral para **o alto-esquerda** e o **punho** passou a ser uma faixa
  separada **abaixo**, sem sobrepor o corpo;
- `player-shin-guard` — placa **trapezoidal com fundo reto**, uma faixa com **fivela dentro do
  contorno** (nada sai do contorno) e **vinco vertical**; o objeto **continua caneleira**
  (escudo colidiria com `trophy-shield`/`club-crest-generic`, e chuteira já é o atacante);
- `player-ball` — a forma canonica passou a ser declarada (acima) e o desenho foi **aliviado**
  (raio 7,5, pentágono rotacionado), que era o ícone mais pesado do conjunto;
- `player-boot` — desenho aprovado, **silhueta intacta**; ganhou massa (costura do solado e
  contraforte do calcanhar) para entrar na faixa de peso do conjunto.

Peso de tinta medido no render 16×16 (cobertura média do alfa, claro): os quatro novos ficam em
**18,9–24,3%**, contra **18,2–26,0%** dos ícones já aprovados — a dispersão entre os novos caiu
de 14,8 pt (laudo) para **5,4 pt**.

Como isso se sustenta na prática: toda a geometria vive em um `icons.json` versionado, e o teste
recusa raster escondido (`<image>`, `data:`, base64, `foreignObject`), recusa cor crua (o conjunto
herda `currentColor`) e recusa dois ícones com o mesmo desenho. O que o teste **não** consegue
provar é a ausência de rastreio — isso é regra de autoria, e o que a sustenta é o histórico do
arquivo: a geometria nasceu neste commit, escrita à mão, sem imagem de origem no repositório.

## O que existe

| Ícone                     | Categoria | Uso pretendido                                                                          |
| ------------------------- | --------- | --------------------------------------------------------------------------------------- |
| `trophy-cup`              | troféu    | Competição cujo troféu é uma taça/copo; ausência de imagem oficial do troféu            |
| `trophy-plate`            | mérito    | Placa comemorativa / homologação / homenagem                                            |
| `trophy-medal`            | mérito    | Medalha (vice, campanha, honraria)                                                      |
| `trophy-shield`           | troféu    | Conquista cujo símbolo é um escudo/emblema (supercopa, recopa)                          |
| `trophy-belt`             | troféu    | Título de cinturão (campeão vigente em disputa contínua)                                |
| `player-glove`            | posição   | `GOALKEEPER` — **luva de goleiro** (quatro dedos, polegar à esquerda, punho separado)   |
| `player-shin-guard`       | posição   | `DEFENDER` — **caneleira** (placa trapezoidal, faixa com fivela e vinco)                |
| `player-ball`             | posição   | `MIDFIELDER` — **bola** em forma canônica (pentágono rotacionado e costuras)            |
| `player-boot`             | posição   | `FORWARD` — **chuteira** de perfil (bico, cano, travas e costura do solado)             |
| `club-crest-generic`      | clube     | Clube/seleção sem escudo no acervo — traço puro (superfície clara, uso pequeno)         |
| `club-crest-generic-dark` | clube     | O mesmo, em **fundo escuro**: placa preenchida a 16% para ganhar peso sem sair do token |

O campo `purpose` de cada ícone em `icons.json` é a fonte desta tabela.

## Como usar

```tsx
import { ClubCrestGenericDark, PlayerPositionIcon, TrophyCup } from '@/components/icons';

// Decorativo (o padrão): o nome ao lado já diz o que é. Fica `aria-hidden`.
<ClubCrestGenericDark size={32} />

// Informativo: aí sim recebe nome acessível e <title>.
<TrophyCup size={24} title="Taça do campeonato" />

// A partir da posição crua da API (GOALKEEPER…). Posição desconhecida devolve `null`.
<PlayerPositionIcon position={player.position} size={32} />
```

- **Cor**: `stroke="currentColor"`. Pinte pelo token do contexto (`text-primary-ink`,
  `text-foreground/70`, `bg-primary/10 text-primary-ink`) — nunca com cor crua.
- **Tamanhos**: grade 16 / 24 / 32 (`ICON_SIZES`), desenhados para 24. Qualquer número é aceito.
- **Traço**: 1,75, pontas e junções arredondadas — a mesma linguagem do `lucide-react` já usado
  no app, para os dois conjuntos não brigarem lado a lado.
- **Arquivos avulsos**: `public/icons/<nome>.svg` (entregáveis, e-mail, OG). São **gerados** de
  `icons.json` por `pnpm --filter web icons:export` — não edite à mão; o teste de contagem de
  formas pega a divergência.

## O que este conjunto NÃO é

- **Não substitui a imagem oficial quando ela existe.** Ele é o caminho do dado ausente.
- **Não é a marca nem o escudo de nenhum clube**, e não deve ser apresentado como tal.
- **Não é figura humana.** Nem boneco, nem silhueta, nem retrato: a posição é lida pelo
  **objeto** do ofício, e nenhum desenho se parece com pessoa alguma, viva ou não.
- **Não é marca de fabricante.** Nenhum objeto reproduz logo, padrão ou modelo de marca.
- **Não é decoração de tela cheia.** Onde há imagem real no acervo, a imagem real ganha.

## Integração honesta (T576)

Quando o ícone entra no lugar de uma imagem que **não existe**, a tela **declara** que é
ilustração — cópia em `apps/web/src/i18n/wsIcons.ts` (`clubCrest`, `playerPhoto`,
`playerPhotoWithPosition`, `competitionTrophy`). O ícone em si é decorativo (`aria-hidden`); a
lacuna é dita em texto, ao lado do nome, nunca fingida como se fosse o original.

Pontos já integrados:

- `/clubs/[id]` — cabeçalho do clube sem `media.logoUrl`;
- `/players/[id]` — cabeçalho do atleta sem `photoUrl` (o **objeto** muda com a posição);
- `/competitions/[id]` — cabeçalho da competição sem `trophyImageUrl`.

Lugares que **ainda** mostram só a sigla — a lista exata para plugar o ícone, se for o caso:

- `apps/web/src/components/ClubCard.tsx` (escudo → `club-crest-generic-dark`);
- `apps/web/src/app/competitions/page.tsx` (troféu → `trophy-cup`);
- `apps/web/src/app/players/page.tsx` (posição → `player-glove|shin-guard|ball|boot`).

Ficaram de fora desta rodada porque são listagens densas (o avatar é pequeno e o ícone competiria
com a sigla que identifica o item) e porque a lacuna mais visível — o cabeçalho de detalhe, onde a
pessoa procura a imagem — já está declarada.
