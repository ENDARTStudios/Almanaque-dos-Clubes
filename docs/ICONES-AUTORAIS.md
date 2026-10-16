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
escudo, atleta, bola. O que não é livre é a **silhueta identificável** de um objeto real: a taça
da Copa do Mundo, por exemplo, é uma forma própria — reproduzi-la seria derivá-la, ainda que em
traço.

Pelo mesmo motivo, nenhum placeholder de atleta é **retrato ou caricatura de pessoa real**
(Código Civil, art. 20 — direito de imagem). São figuras genéricas, sem semelhança com ninguém:
a mesma cabeça, o mesmo tronco, o mesmo traço, com a postura mudando por posição.

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
| `player-goalkeeper`       | atleta    | Placeholder de `GOALKEEPER`                                                             |
| `player-defender`         | atleta    | Placeholder de `DEFENDER`                                                               |
| `player-midfielder`       | atleta    | Placeholder de `MIDFIELDER`                                                             |
| `player-forward`          | atleta    | Placeholder de `FORWARD`                                                                |
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
- **Não é retrato de atleta.** Nenhuma figura se parece com pessoa alguma, viva ou não.
- **Não é decoração de tela cheia.** Onde há imagem real no acervo, a imagem real ganha.

## Integração honesta (T576)

Quando o ícone entra no lugar de uma imagem que **não existe**, a tela **declara** que é
ilustração — cópia em `apps/web/src/i18n/wsIcons.ts` (`clubCrest`, `playerPhoto`,
`playerPhotoWithPosition`, `competitionTrophy`). O ícone em si é decorativo (`aria-hidden`); a
lacuna é dita em texto, ao lado do nome, nunca fingida como se fosse o original.

Pontos já integrados:

- `/clubs/[id]` — cabeçalho do clube sem `media.logoUrl`;
- `/players/[id]` — cabeçalho do atleta sem `photoUrl` (a figura muda com a posição);
- `/competitions/[id]` — cabeçalho da competição sem `trophyImageUrl`.

Lugares que **ainda** mostram só a sigla — a lista exata para plugar o ícone, se for o caso:

- `apps/web/src/components/ClubCard.tsx` (escudo → `club-crest-generic-dark`);
- `apps/web/src/app/competitions/page.tsx` (troféu → `trophy-cup`);
- `apps/web/src/app/players/page.tsx` (posição → `player-*`).

Ficaram de fora desta rodada porque são listagens densas (o avatar é pequeno e o ícone competiria
com a sigla que identifica o item) e porque a lacuna mais visível — o cabeçalho de detalhe, onde a
pessoa procura a imagem — já está declarada.
