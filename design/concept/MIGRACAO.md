# Migração para o sistema FICHA

> O que existe no site hoje **permanece** — muda a apresentação. Este documento lista, página por
> página, o que foi migrado, o que o conceito anterior tinha esquecido e o que foi criado.

---

## 1. O que a auditoria encontrou

Extraí a estrutura real de cada `page.tsx` (títulos `h1/h2/h3` e `data-testid` de seção). O
conceito anterior desenhou várias páginas **sem metade do que elas já têm**:

| Página | Blocos que existem no código | Estavam no conceito? |
|---|---|---|
| `/clubs/[id]` | sobre · estatística por competição · **maiores rivais** · honrarias · elenco · **uniformes (kits)** · **flâmulas** · **hino** · escudo · geo-attribution | só 4 de 10 |
| `/players/[id]` | métricas · carreira · **gols por passagem** · **conquistas** · **prêmios individuais** · clubes | 3 de 6 |
| `/competitions/[id]` | pódio · história · sobre · métricas · recordes · evolução rodada a rodada · tabela · campeões · edições · clubes · **troféu** · **status** | 8 de 12 |
| `/dashboard` | **Meu Almanaque** · conta e assinatura · perfil | **não existia** |
| `/metodologia` | **12 seções, 522 linhas** — fontes, rankings 0-100, critérios, divergências, limitações | **não existia** |

O conceito estava bonito e incompleto: desenhou um clube ideal e ignorou uniforme, flâmula e hino —
que é justamente o que o torcedor procura na ficha de um clube.

---

## 2. Migrado — com os blocos reais

### `clube-migrado` (195 camadas, 10 blocos)

| Ordem | Bloco | Origem no código |
|---|---|---|
| 1 | Identidade + escudo com licença | `club-crest-illustration` |
| 2 | 4 pilares (títulos, jogos, gols, fundação) | `club-stats-overall` |
| 3 | **Sobre o clube** + fonte | `club-about` |
| 4 | **Estatística por competição** (J, V, E, D, GP, GC, aproveitamento) | `club-stats-by-competition` |
| 5 | **Maiores rivais** (jogos e retrospecto) | `club-stats-top-rivals` |
| 6 | Parede de honrarias (competição → títulos → anos) | `club-honour-title` |
| 7 | Elenco | — |
| 8 | **Uniformes** (casa, fora, terceiro, com cores) | `kit-label` |
| 9 | **Flâmulas** (por década) | `pennant-figure` |
| 10 | **Hino** (player + nota de licença) | `anthem-audio`, `anthem-lyrics-note` |

### `jogador-migrado` (138 camadas, 6 blocos)

| Ordem | Bloco | Origem |
|---|---|---|
| 1 | Identidade + retrato em moldura | `player-photo-illustration` |
| 2 | Métricas (jogos, gols, média, títulos) | `metricsTitle` |
| 3 | Carreira em tabela | `careerTitle` |
| 4 | **Gols por passagem** | `goalsByStintTitle` |
| 5 | **Conquistas** | `achievementsTitle` |
| 6 | **Prêmios individuais** | `individualAwardsTitle` |

Os três últimos eram o que faltava. Sem eles a ficha do jogador é uma biografia; com eles, é um
currículo.

---

## 3. Criado — as pendências de design

### `dashboard` (62 camadas) — não existia no conceito
**Meu Almanaque** (4 cartões: clubes, competições, jogadores, rankings) · **Conta e assinatura**
(plano, perfil, notificações, com ação) · **Perfil incompleto** (o aviso que faz o usuário agir).

É a página do usuário que volta — e ela não tinha desenho nenhum.

### `metodologia` (74 camadas) — não existia no conceito
Índice das 12 seções à esquerda · **fontes** (4, com licença e o que cada uma fornece) ·
**critério de verificação** (duas fontes concordam) · **limitações conhecidas** em bloco de aviso.

Esta é a página que sustenta todas as outras. Um acervo que publica número sem publicar o método é
uma lista de opiniões — e essa página já existia no site (25,6 KB) e não estava no conceito.

---

## 4. O que muda e o que não muda

**Não muda:** conteúdo, dados, ordem das informações, rotas, textos.

**Muda:** a apresentação.
- Título em **Barlow Condensed** (a fonte do projeto), não serifa.
- Número-âncora em **crimson** no cabeçalho de cada ficha.
- **Fio de 2 px** separando cabeçalho de corpo; fio de 1 px entre linhas de tabela.
- Tabelas com **zebra** e números alinhados à direita.
- **Procedência** ao pé de toda página.
- Blocos densos onde antes havia cartões soltos: a estatística por competição vira tabela, os
  rivais viram três cartões com retrospecto, os uniformes mostram a cor real.

---

## 5. Estado do projeto no FigCraft

| | |
|---|---|
| Frames | **18** |
| Camadas | **~1.900** |
| Capturas em `design/concept/app/` | **20** |
| Arquivo | `design/concept/FICHA.figcraft` |

**Páginas com tela:** home · competicoes · clube-migrado · jogador-migrado · ranking · rankings ·
tabela · partida · comparar · estadio · temporada · busca · favoritos · lendas · mapa ·
dashboard · metodologia · admin

---

## 6. Ainda pendente

| Item | Por quê |
|---|---|
| **Estádios (índice)** | 84 estádios, só a ficha existe |
| **Tabela com URL própria** | hoje é aba dentro da competição |
| **Admin no sistema visual** | 12 rotas, nenhuma tela desenhada |
| **Estado vazio / erro / carregando** | nenhuma página tem esses estados desenhados |
| **Responsivo** | todas as telas são desktop 1440 |
| **Jogadores por estado/cidade** | bloqueado: `Player` não tem campo de localidade |
| **Mercado da bola** | sem fonte de dados — a página declara isso (`market-soon`) |
