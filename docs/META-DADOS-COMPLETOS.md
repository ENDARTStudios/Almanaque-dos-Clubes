# META — dados completos (objetivo mensurável)

> Medido em **2026-11-02** em produção (`SELECT` no container + `GET /coverage`).
> Regra do projeto: **meta se declara com número e fonte de medição** — "maior
> plataforma pública de futebol do mundo" é a ambição; o que se persegue é a tabela
> abaixo. Nada aqui é prometido ao usuário antes de estar medido.

## 0. O que "completo" significa (e o que não significa)

"Completo" **não** é "todo o futebol do planeta". É: **para os recortes publicados,
nenhum campo aparece vazio sem explicação** — ou tem dado, ou tem lacuna declarada
("sem fonte", "fonte não publica", "não se aplica"). O produto nunca finge cobertura
(o `GET /coverage` e a matriz do `gap-bot` são a prova pública).

## 1. Meta por dimensão

Legenda: **P0** = bloqueia o MVP (Série A, Premier League, Libertadores); P1 = beta
global; P2 = expansão.

| # | Dimensão | Base (02-11) | Meta P0 | Meta P1 | Fonte permitida |
|---|---|---|---|---|---|
| 1 | Partidas do piloto (2015→hoje) | 17.265 no total; piloto medido por `/coverage` | **100%** das temporadas publicadas pela fonte | idem, + 3 competições | RSSSF |
| 2 | Placar preenchido | **100%** (17.265/17.265) | manter 100% | idem | RSSSF |
| 3 | **Autores dos gols (`scorers`)** | 126 de 17.265 (**0,7%**) | **≥ 80%** das partidas com placar no piloto | ≥ 95% | RSSSF (HTML) |
| 4 | Ranking de jogador | 68 jogadores (BR 2023) | 1 ranking por temporada do piloto com `scorers` | todas as temporadas com placar | derivado de (3) |
| 5 | Escudo vigente | 807 de 12.003 (**6,7%**) | **100%** dos clubes do piloto (faltam 82) | ≥ 50% do acervo | Commons/Wikidata (P18) |
| 6 | Logo no perfil do clube | 2.236 (**18,6%**) | ≥ 90% do piloto | ≥ 60% | Commons + autorização do clube |
| 7 | Coordenada | 6.794 (**56,6%**) | **100%** dos clubes do piloto | ≥ 90% | Wikidata (P625/P131/P115) |
| 8 | Estádio + cores | 11.303 sem mídia completa | ≥ 80% do piloto | ≥ 60% | Wikidata/composição de peças |
| 9 | Texto editorial | 2.447 sem (79,6% com) | **100%** do piloto | ≥ 70% do acervo | Wikipédia/Wikimedia (com atribuição) |
| 10 | Uniformes / hino / flâmula | 12.003 sem os três | ≥ 60% do piloto nos três | ≥ 40% | Commons (licença por arquivo) |
| 11 | Foto do jogador | 29.978 (**28,5%**) | ≥ 80% dos jogadores **do piloto** | ≥ 70% global | Commons + CC (NC aceito) |
| 12 | Posição do jogador | 89.082 (**84,7%**) | **≥ 98%** dos jogadores do piloto | ≥ 95% global | Wikidata (P413) |
| 13 | País do jogador | 98.599 (**93,7%**) | **100%** | ≥ 98% | Wikidata (P27) |
| 14 | Clube atual (`clubId`) | 2.909 (**2,8%**) | ≥ 70% dos jogadores do piloto | ≥ 50% global | Wikidata P54 (janela 2 anos) |

## 2. Como cada meta é alimentada (sem aprovação por rodada)

| Mecanismo | Cadência | Cobre |
|---|---|---|
`ingest-backlog` (novo, T602) | diário 08:00 UTC, 3 itens | dimensões 1–4 (RSSSF: partidas, placar, `scorers`) |
`wikidata-incremental` | diário 03:00 | 7, 12, 13, 14 |
`enrich-clubs-media` | diário 04:00 | 6, 8 |
`enrich-players-media` | diário 05:00 | 11 |
`enrich-clubs-editorial` | diário 06:00 | 9 |
`enrich-all-media` | diário 07:00 | 10 |
`gap-bot --run=crest` | sob demanda (botão) | 5 |
`integrity-check` | domingo 04:00 | qualidade + fila de revisão |

**Regra de aprovação:** o que já está agendado roda sozinho. O que exige decisão
humana é **apenas** o que muda licença, fonte ou dinheiro — e está explícito na tabela
`source-registry` (fonte bloqueada nunca entra).

## 3. Definição de "dados completos" (porta de saída)

O acervo pode ser chamado de completo quando **as 14 linhas estiverem ≥ meta P0 e a
matriz de cobertura não tiver recorte do piloto com lacuna sem explicação**.

Medição automática: `node dist/scripts/gap-bot.js` (pendências) + `GET /api/v1/coverage`
(frescor por recorte). Nenhuma afirmação pública de completude sem esses dois números.

## 4. O que NÃO entra na meta (declarado)

- Escudos de clubes sem arquivo livre e sem autorização do detentor → **lacuna
  declarada**, nunca cópia. `soccerwiki` está bloqueada no registro de fontes (robots
  proíbe agentes de IA); Imortais/Futbox/História do Futebol são `reference-only`.
- Placar ao vivo (MATCH-04) — depende de fonte licenciada; bloqueado até decisão.
- Estatística por jogador por partida (passes, distância) — não há fonte aberta.

## 5. Revisão

Esta meta é revisada **quando**: (a) uma linha for atingida (sobe a meta); (b) uma
fonte mudar de licença (a linha cai para "bloqueada"); (c) o escopo do MVP mudar.
Toda revisão entra aqui com data e o número medido.

## 6. Achado da primeira execução da fila (2026-11-02)

A fila foi populada em produção (**54 itens**, 24 temporadas do RSSSF) e o primeiro
item (`rsssf 2024-2025`) rodou até `DONE`. **Mas o número de partidas com autores dos
gols não mudou (126).** Leitura honesta:

- `DONE` significa **"a fonte respondeu e o pipeline rodou"**, não "o dado apareceu";
- as páginas do RSSSF trazem, para essas temporadas, os gols **dentro da linha da
  partida** apenas em parte dos arquivos; o que elas têm de forma sistemática é a
  tabela **"Top scorers"** (totais por jogador na temporada);
- portanto a meta #3 (≥80% de `scorers` por partida) **não é atingível com o parser
  atual**. O caminho é um segundo parser: **tabela de artilheiros por temporada** →
  alimenta diretamente o ranking de jogador (que precisa de total por jogador, não do
  minuto de cada gol).

**Consequência para a meta:** a linha #3 passa a ter duas metas separadas —
(a) artilheiros por temporada (viável agora, fonte = tabela "Top scorers"), e
(b) autores por partida (só onde a fonte imprime na linha do jogo). O ranking de
jogador depende de (a), não de (b). A fila precisa ganhar `reason='missing_topscorers'`
para diferenciar.
