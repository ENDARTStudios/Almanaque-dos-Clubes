# T575 — Bot de enriquecimento contínuo (`enrich-bot`)

> Processo de longa duração que fecha, em VOLTAS, os gaps do acervo que dependem de rodar:
> escudo/estádio/cores, editorial, uniforme/hino/flâmula, perfil de jogador, vínculo
> jogador→clube e coordenadas. Nenhum dado é inventado: onde a fonte não tem, o gap fica
> **declarado** (carimbo `no_source` no cursor).

## 1. Por que existe

Os lotes de enriquecimento rodam **uma vez por dia** (crons 04:00–07:00 UTC) e cada lote
novo exigiu um cron novo. Com 12 k clubes e 105 k jogadores, uma volta por noite leva meses
para fechar o acervo — e cada fila avança só o próprio pedaço. O bot roda as filas em
**rodízio contínuo**, sempre atacando a fila mais atrasada.

## 2. Filas cobertas (e o que cada uma reusa)

| Fila (`id`)            | Chaves do cursor                   | Lote/componente reusado (nada reimplementado)             |
| ---------------------- | ---------------------------------- | --------------------------------------------------------- |
| `club-media`           | `logo`, `stadium`, `colors`        | `enrichClubsMediaBatch` (`enrich-media.service.ts`)       |
| `club-editorial`       | `editorial`                        | `enrichClubsEditorialBatch`                               |
| `club-extra-media`     | `kits`, `anthem`, `pennants`       | `enrichAllMediaBatch` (`enrich-all-media.service.ts`)     |
| `player-profile`       | `profile` (foto/país/posição)      | `enrichPlayersMediaBatch`                                 |
| `player-club`          | `club`                             | `linkPlayersClubsBatch` (`link-players-clubs.service.ts`) |
| `player-club-squad`    | `clubFromSquad`                    | `derivePlayersClubFromSquadBatch` (T582)                  |
| `commons-club-logo`    | `commonsLogo`                      | `harvestClubsBatch` (`commons-images.service.ts`)         |
| `commons-player-photo` | `commonsPhoto`                     | `harvestPlayersBatch` (`commons-images.service.ts`)       |
| `club-coordinates`     | `coordinates` (latitude/longitude) | connector `extractClubCoordinatesBulk`                    |

O escritor de cada fila é o MESMO caminho que o cron usa — mesma aceitação, mesma
proveniência, mesmo "só se estiver NULL". O bot não tem escrita própria.

**Novidades de código:**

1. **`link-players-clubs.service.ts`** — a lógica que estava dentro do `main()` do script
   `link-players-clubs-t551.ts` virou service. O bot precisa da MESMA fila; reescrever a
   inferência de P54 seria a segunda implementação do mesmo predicado (foi o que divergiu no
   T536). O script passou a ser wrapper fino e **o comportamento do CLI não mudou**.
2. **`coordinates` como chave de cursor** (`media-cursor.ts`) + `enrich-bot-queues.ts`
   implementando a fila. Os scripts de coordenadas (`enrich-clubs-coordinates-m1a2`,
   `resolve-club-coordinates-m1a3`) selecionam `latitude/longitude IS NULL` +
   `orderBy: id ASC` e **não têm cursor**: clube sem coordenada na fonte nunca sai do filtro,
   logo o script reprocessa o mesmo começo para sempre — exatamente o defeito do
   T536/T547/T554. Aqui o clube sem fonte recebe `no_source` e a fila avança.
3. **Correção de seleção no lote unificado** (`enrichAllMediaBatch`): o modo normal filtrava
   `"mediaEnrichment" IS NULL` — o REGISTRO inteiro ausente. Como o job de mídia (04:00)
   carimba todo clube que passa e o unificado roda às 07:00, a fila de uniforme/hino/flâmula
   perdia candidatos conforme o acervo era carimbado: **o cursor existia, mas a seleção não
   perguntava a ele**. Agora usa a mesma `clausulaNaoTentada([kits, anthem, pennants])` da
   seleção de mídia — coerente com o `pendingMedia` que o próprio lote já aplicava por clube.
   O modo `recheck` (usado como prova de noop) ficou **intacto**.
4. **Coletor do Commons no bot (T578)** — `harvest-commons-images.ts` virou wrapper fino do
   service `commons-images.service.ts`, e o bot ganhou DUAS filas com as chaves de cursor
   próprias do coletor (`commonsLogo`/`commonsPhoto`). A licença continua verificada POR
   ARQUIVO no connector; a entrada do cursor carrega `file/license/author/sourceUrl`.
   Falha de leitura não carimba (a fila fica intacta), e a separação em duas filas evita
   que o universo de 105 k jogadores esconda o déficit dos 12 k clubes (ou vice-versa).

## 3. Roteador: como a fila da volta é escolhida

`chooseNextQueue` (em `enrich-bot-router.ts`, **puro** — sem banco/rede/logger):

1. **Fora**: fila com contagem falhada, fila sem universo (`total = 0`), fila sem pendentes
   (`pending = 0`) e fila em castigo (ver §5);
2. entre as candidatas, vence o **maior déficit relativo** `pending / total` — a fila mais
   atrasada em relação ao PRÓPRIO universo. Comparar pendência absoluta enviesaria para a
   fila maior (105 k jogadores) e inaniria a pequena;
3. **empate** → rodízio: distância circular na ordem canônica a partir da última escolhida
   (nunca a mesma fila duas voltas seguidas);
4. **nada elegível** → o bot fica ocioso (`idle`), dorme a pausa e volta — não gira.

`total` e `pending` saem do **mesmo `needs`** do job somado, no caso de `pending`, à cláusula
do cursor (`clausulaNaoTentada`) — a MESMA função que a seleção usa. Duas versões do
predicado divergem; contar com um predicado diferente de selecionar é meio caminho para o
bug de fila congelada.

## 4. Caps, pausa e defaults

| Variável / flag                          | Default           | Efeito                                            |
| ---------------------------------------- | ----------------- | ------------------------------------------------- |
| `ENRICH_BOT_ENABLED`                     | **false**         | Gate do modo que GRAVA (via `envFlag`, PR #671)   |
| `ENRICH_BOT_APPLY` / `--apply`           | false             | Liga a escrita (exige a flag acima)               |
| `ENRICH_BOT_DRY_RUN` / `--dry-run`       | —                 | Força dry-run (vence `--apply`)                   |
| `ENRICH_BOT_CAP` / `--cap=N`             | **40**            | Entidades por volta (1–500)                       |
| `ENRICH_BOT_PAUSE_MS` / `--pause-ms=N`   | **30000**         | Pausa entre voltas (1 s–1 h), **fatiada em 1 s**  |
| `ENRICH_BOT_MAX_TURNS` / `--max-turns=N` | **0** (infinito)  | Voltas máximas (útil para inspeção)               |
| `ENRICH_BOT_STALL_COOLDOWN_TURNS`        | **3**             | Voltas de castigo da fila que não anda            |
| `ENRICH_BOT_TURN_TIMEOUT_MS`             | **900000**        | Orçamento da volta — só LOGA (não aborta escrita) |
| `ENRICH_BOT_REFRESH_DAYS`                | **0** (desligado) | Revisita de mídia já tentada                      |

O cap de 40 mantém a volta longe do teto de leitura de artigo (`INFOBOX_MAX_POR_RUN = 60`) e
do timeout do job, e a pausa de 30 s respeita a taxa da fonte (IP de datacenter do Railway;
429 medido sem cadência).

**Shutdown gracioso.** `SIGTERM`/`SIGINT` marcam parada; o laço **termina a volta corrente**
(nenhuma escrita é abortada no meio) e sai sem iniciar outra. A pausa entre voltas é **fatiada
em 1 s** e consulta a parada a cada fatia, então o processo sai em ≤ 1 s mesmo com
`ENRICH_BOT_PAUSE_MS = 30000` — dentro do grace period do container. Um segundo sinal encerra
na hora (código 130), para quem não quer esperar nada.

## 5. Anti-congelamento (a defesa que o T536 ensinou)

Se uma fila não ANDA, ela entra em **castigo por N voltas** (`queue-stalled` no log, com o
motivo) e o bot ataca as outras. As três formas de "não andou", todas contadas:

| Motivo no log         | O que aconteceu                              | Por que castiga                                                       |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------- |
| `erro-na-volta`       | o lote lançou (banco/rede)                   | nada foi carimbado, a fila está idêntica                              |
| `processed=0`         | percorreu e não escreveu                     | a seleção e a aceitação divergiram                                    |
| `so-falha-de-leitura` | só FALHA de leitura (429/5xx) e nada gravado | a fila está idêntica e o bot voltaria a bater na fonte que já recusou |

Falha **junto** com escrita é progresso parcial: não castiga. Sem o castigo, uma fila travada
consumiria todas as voltas girando em falso — o defeito do T536 um nível acima. Erro de leitura
**não** carimba nada: a fila continua intacta para a próxima volta.

## 6. Idempotência (o que acontece na segunda volta do mesmo dia)

A garantia vem do cursor por tentativa (T528/T547/T550/T551), **não** do bot:

- **Avança, não repete.** Toda entidade processada recebe carimbo (`enriched`, `no_source` ou
  `already_present`) em `clubs.mediaEnrichment` / `players.mediaEnrichment`. A segunda volta
  seleciona o PRÓXIMO lote — nunca o mesmo começo. O teste unitário do laço prova a mecânica:
  a volta seguinte escolhe outra fila por menor déficit.
- **Noop legítimo.** Quando todas as filas ficam sem pendentes, o roteador devolve `null`, o
  bot loga `idle` e dorme. Não há UPDATE, não há requisição à fonte.
- **O que NÃO é noop legítimo, e o bot declara**: fila cujo lote não pode avançar é castigada
  (§5) e aparece como `queue-stalled` no log — é o sinal para investigar, não um silêncio.
- **Dry-run NÃO avança**: sem carimbo, a volta seguinte re-seleciona o mesmo começo (é uma
  sonda, por desenho). Por isso dry-run é medido por contagem, nunca por "progresso".
- **Re-run noop de revisita**: `ENRICH_BOT_REFRESH_DAYS = 0` (default) significa "só nunca
  tentado". Ligar a revisita quebra o noop de propósito (decisão explícita, como no T547).

## 7. Provas de correção (o que foi rodado, sem tocar produção)

Cláusula do ambiente: o worktree desta tarefa não tem `node_modules` (o CI valida typecheck,
lint e a suíte). A lógica nova foi validada fora do repositório, com bundles esbuild:

1. **Roteador + laço**: 66 asserções (escolha por déficit, empate por rodízio, fila vazia /
   sem universo / contagem falhada, castigo, cap e pausa chegando ao adaptador, pausa
   `n−1` voltas, erro sem derrubar a sessão, shutdown terminando a volta corrente,
   contadores da sessão, log sem PII). 66/66.
2. **SQL gerado** (a parte mais arriscada): 18 asserções sobre o texto que iria ao Postgres —
   chave `coordinates`, guarda `"mediaEnrichment" IS NULL`, `NOT (... ? 'coordinates')`,
   `EXISTS` só com `refreshDays`, `total` sem a cláusula de cursor e `pending` com ela,
   filtro de país nos dois, `LIMIT`/ordem estável da seleção. 18/18.
3. **Seleção do lote unificado**: 8 asserções rodando `enrichAllMediaBatch` de verdade com
   `$queryRaw` falso — modo normal pergunta pelo cursor por chave (`kits`/`anthem`/`pennants`)
   e `recheck` continua olhando os já tentados. 8/8.
4. **Dry-run**: os testes provam que `apply: false` chega ao adaptador (nenhuma escrita) e que
   `--dry-run` vence `--apply`; `--apply` sem `ENRICH_BOT_ENABLED` é BLOQUEADO.
5. **Nada disso tocou produção**: nenhum deploy, nenhum `railway run`, nenhuma requisição à
   fonte ou ao banco de produção.

## 8. Limites honestos (o que ficou DE FORA, e por quê)

- **Fonte ausente é gap declarado, não lacuna a preencher.** Escudo, cores, foto de jogador e
  vínculo jogador→clube são limitados pela fonte (Wikidata/Wikipédia/Commons). O bot avança a
  fila e carimba `no_source`; nunca inventa.
- **Nenhuma fonte nova** foi introduzida (os sites de história têm ToS/copyright restritivos —
  análise jurídica desta sessão).
- **O bot não conserta a fonte**: clube sem P625/P159/P115/P131 fica sem coordenada, declarado.
- **`players` sem QID** não entram em nenhuma fila de jogador (o cursor exige `qid IS NOT NULL`).
- **Revisita de mídia** existe como opção (`ENRICH_BOT_REFRESH_DAYS`) mas desligada por padrão.
- **Observabilidade**: `logger` estruturado + contadores de sessão em memória. A sessão zera no
  restart do container — como qualquer gauge em memória deste projeto. Não há métrica
  persistida (o serviço não tem endpoint HTTP).

## 9. Provisionamento (Railway) — o dono provisiona

O bot roda no **mesmo image** do `media-worker` (`apps/api/Dockerfile.worker`), escolhido por
variável no entrypoint. **Nenhum recurso novo foi criado nesta tarefa.**

**Opção A — serviço novo (recomendado; não compete com o consumidor da fila):**

1. Novo service no projeto Railway apontando para o MESMO `apps/api/Dockerfile.worker`
   (config-as-code em `apps/api/railway.worker.json`);
2. variáveis do serviço:
   - `MEDIA_WORKER_MODE=enrich-bot`
   - `ENRICH_BOT_ENABLED=1`
   - `DATABASE_URL` (ou `DATABASE_URL_APP`, o singleton prefere essa) e `REDIS_URL` se
     presentes no projeto — o bot não usa Redis, mas o boot importa `config/prisma.ts`;
   - `ENRICH_BOT_APPLY=1` **só depois** de uma janela de observação em dry-run;
   - opcionais: `ENRICH_BOT_CAP`, `ENRICH_BOT_PAUSE_MS`, `ENRICH_BOT_REFRESH_DAYS`;
3. primeiro deploy já pode subir em dry-run (`ENRICH_BOT_ENABLED=1` sem `--apply`) e o log sai
   `enrich-bot: session-start … dryRun=true`.

**Opção B — reaproveitar o serviço `media-worker`:** definir `MEDIA_WORKER_MODE=enrich-bot` faz
o MESMO container deixar de consumir a fila `media-enrich`. Só é indicado se o consumo da fila
migrar para outro serviço — senão os lotes de mídia do cron ficam sem consumidor.

**Verificação depois do deploy (operador):**
`railway logs` do serviço deve mostrar, a cada ~30 s, um `enrich-bot: turn-start` com `queue` e
`cap`, seguido de `enrich-bot: turn-done` com `processed/updated/gaps/failures`. `idle` é o
comportamento esperado quando não há pendência. Shutdown em `SIGTERM`: aparece
`enrich-bot: sinal recebido — termina a volta corrente e sai`.

## 10. Arquivos

- `apps/api/src/modules/etl/enrich-bot-router.ts` (novo) — roteador + config (puro)
- `apps/api/src/modules/etl/enrich-bot.service.ts` (novo) — laço, cap/pausa, shutdown, contadores
- `apps/api/src/modules/etl/enrich-bot-queues.ts` (novo) — as 9 filas reais (adaptadores)
- `apps/api/src/modules/etl/link-players-clubs.service.ts` (novo) — lote extraído do script T551
- `apps/api/src/modules/etl/commons-images.service.ts` (novo, T578) — coletor do Commons
  compartilhado pelo CLI e pelo bot (chaves `commonsLogo`/`commonsPhoto`, licença por arquivo)
- `apps/api/src/scripts/harvest-commons-images.ts` — passa a ser wrapper do service T578
- `apps/api/src/scripts/enrich-bot.ts` (novo) — entrypoint do processo
- `apps/api/src/modules/etl/media-cursor.ts` — chaves `coordinates`, `commonsLogo`,
  `commonsPhoto`, `clausulaNaoTentada` exportada, `countPendingClubs`/`countPendingPlayers`
  e `needs` opcional na seleção de clubes
- `apps/api/src/modules/etl/enrich-media.service.ts` — `refreshDays` opcional nos lotes de clube
- `apps/api/src/modules/etl/enrich-all-media.service.ts` — seleção pelo cursor por chave
- `apps/api/src/scripts/link-players-clubs-t551.ts` — passa a ser wrapper do service
- `apps/api/entrypoint.worker.sh` — `MEDIA_WORKER_MODE=enrich-bot`
- Testes: `apps/api/tests/unit/etl/enrich-bot-router.test.ts`,
  `apps/api/tests/unit/etl/enrich-bot-session.test.ts`,
  `apps/api/tests/unit/etl/enrich-all-media.test.ts` (2 testes novos)
