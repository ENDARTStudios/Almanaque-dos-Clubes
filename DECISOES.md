# DECISOES.md

Registro permanente de decisões técnicas e de produto do projeto.
Cada entrada segue o formato abaixo. Decisões registradas **não se re-discutem**
sem fato novo (PROTOCOLO_MESTRE.md, Seção 3, item 4).

Formato obrigatório:

```
## [AAAA-MM-DD] Decisão: <o quê>
Motivo: <por quê>
Alternativas consideradas: <se houver>
```

---

## Histórico de decisões

<!-- Novas decisões devem ser adicionadas ACIMA da linha abaixo, em ordem cronológica. -->
<!-- Novas decisões devem ser adicionadas ACIMA da linha abaixo, em ordem cronológica. -->

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-writers-go-pr-2025 — Writer dos pilotos GO 2025 / PR 2025 (apply pendente do gate)

Motivo: packs `go-2025-pilot-candidates.json` (#211) e `pr-2025-pilot-candidates.json` (#213) prontos, mas o writer (`--pack=go`) bloqueava 2025 por guarda hardcoded. **Generalização retrocompatível:** `syncGoWonEdges` passa a aceitar `options` (`allowedYears`, `expectedCompetitionQid`, `expectedClubQid`, `writerVersion`, `uf`, `restorableReasons`); defaults preservam GO 2023–2024 (`allowedYears=[2023,2024]`, `expectedClubQid=Q198034`, `writerVersion=t448b2d-writer-go-v1`). Novos reasonCodes `out_of_scope_season`/`out_of_scope_competition`/`out_of_scope_club` (fail-fast, zero escrita). Writer 2025: `writerVersion=t448b2d-writer-go-pr-v1`; restore só de `rollback_t448b2d_go_2025_apply`/`rollback_t448b2d_pr_2025_apply`/`rollback_t448b2d_writers_failure`. **Loader** `lib/rsssf/estaduais-2025-pack.ts` (Zod; escopo/ano/competição/clube exatos; atribuição obrigatória; `retrievedAt` ISO do pack — **sem `now()`**; `doNotTouch` de homônimos). **Script** `write-rsssf-won-edges.ts` aceita `--pack=go-2025|pr-2025` (DRY default; `--apply` exige `--allow-production`; transação Serializable; packs com import estático → emitidos ao `dist`). **Não cria/linka entidades** (resolve só por QID; `missing/ambiguous/soft_deleted` = fail). Idempotência factual `(sourceId,targetId,year,WON)` inclui soft-deleted. Testes unit 20 + integração 8 (transações revertidas). **APPLY em produção pendente do gate (2.2).**

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-seed-gate-producao-concluido — Identidades `Q1513287`/`Q2580083` ativas em produção

Motivo: **merge #214** (`4372cd8`) → deploy Railway **SUCCESS**. **DRY-run** prod: `Q1513287 create` · `Q2580083 create` · `conflicts []` · `errors []`. **APPLY `--allow-production`:** `created=2` · `hardDeletes=0` · `migrations=0` · `errors=[]`. **SQL (read-only):** `Q1513287`=1 (Vila Nova Futebol Clube, BR, `wikidata-go-2025-pre`) · `Q2580083`=1 (Operário Ferroviário EC, `wikidata-pr-2025-pre`) · homônimos `Q10391045`/`Q10391046`/`Q671621` **intactos** · dup por QID=**0** · clubes ativos **+2** (3878→3880). **Cache:** DEL cirúrgico `clubs:list:*`+`clubs:geo-stats` (sem FLUSHALL). **Smoke:** `/clubs?qid=…` 200 · `search=Vila`→`Q1513287`+`Q10391045` · `search=Operário`→`Q2580083`+`Q671621` · `/champions` 200. **Observação pré-existente:** `search` é case-sensitive (sem `mode:'insensitive'`/`search_vector`) — não é regressão; follow-up. **DESTRAVA:** writers WON **GO 2025 / PR 2025** (PRs próprios).

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-seed-qids-vilanova-operario — Micro-seed de identidade `Q1513287` + `Q2580083`

Motivo: os parsers GO 2025 / PR 2025 exigem os clubes campeões no acervo (identidade por QID). **Entrega (só clubes, sem parser/aresta):** packs `data/go-2025-seed-pack.json` (`Q1513287` Vila Nova Futebol Clube) e `data/pr-2025-seed-pack.json` (`Q2580083` Operário Ferroviário Esporte Clube), com **proveniência Wikidata CC0** (`importedFrom=wikidata-{go,pr}-2025-pre`, `sourceUrl` Wikidata, `retrievedAt` estático). Módulo puro `lib/rsssf/seeds/club-seed.ts` (Zod + `planClubSeed`/`applyClubSeed`; **upsert por QID**; `ambiguous_club_qid`/`soft_deleted_club_qid`; **nunca link-by-name**) + script `seed-go-pr-2025-clubs.ts` (DRY default; `--apply` exige `--allow-production`; **import estático dos packs** → emitidos ao `dist`). **Homônimos intocados** (`doNotTouch`: `Q10391045`,`Q10391046` / `Q671621`). Testes unit **9/9** + integração **1/1** (cria 2 por QID, re-run noop, homônimos intactos). **APPLY em produção pendente do gate.**

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-parser-pr-2025-ready-awaiting-seed — Parser PR 2025 pronto (apply bloqueado até seed de Q2580083)

Motivo: parser PURO do **Campeonato Paranaense 2025** (Operário Ferroviário). **FASE 0 read-only:** `tablesfq/pr2025.htm` **200**, autor **Moacir Dalpiaz de Souza**, licença presente, frase `*** Operário are Champions ***`; Wikidata **`Q2580083`** (pt `Operário Ferroviário Esporte Clube`, P31=Q476028, P17=Q155, P641=Q2736) e mãe `Q920397`; DB: mãe `Q920397`=1, **`Q2580083`=0 (ausente)**, homônimo `Q671621`=1. **Reuso:** `lib/rsssf/pr/index.ts` (`buildPrWonCandidate`) reusa o builder generalizado do GO com options PR (`Q920397`/`Q2580083`/`pr-2025`/`uf=PR`). **Resolução estrita por QID** — o homônimo "Operário FC" (`Q671621`) **NÃO casa** (teste T2). **Entrega:** fixture `tests/fixtures/rsssf/pr/2025/` (mock com `Q2580083`), script `parse-rsssf-pr-2025-fixtures.ts` (offline), pack `data/pr-2025-pilot-candidates.json` (**1 candidate** `Q920397|2025|Q2580083|WON`, `seedRequired=Q2580083`). Testes T1–T4 **verdes**. **APPLY BLOQUEADO** até micro-seed de `Q2580083`. **Empilhado no #211** (GO 2025) por depender do builder generalizado.

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-parser-go-2025-ready-awaiting-seed — Parser GO 2025 pronto (apply bloqueado até seed de Q1513287)

Motivo: parser PURO do **Campeonato Goiano 2025** (Vila Nova). **FASE 0 read-only:** `tablesfq/go2025.htm` **200**, autor **Guillermo Alexander Rivera**, licença (atribuição ao autor) presente, frase `*** VILA NOVA are Goiás State 2025 champions ***`; Wikidata **`Q1513287`** (pt `Vila Nova Futebol Clube`, P31=Q476028, P17=Q155, P641=Q2736); DB: mãe `Q931386`=1, **`Q1513287`=0 (ausente)**, homônimos `Q10391045/Q10391046`=2. **Generalização:** `buildGoWonCandidate` agora recebe `options` (`expectedCompetitionQid`, `expectedChampionQid`, `excludedSeasons`, `uf`, `pilotScope`, `parserVersion`) — reusa para 2023–2024 / 2025 / PR. **Entrega:** fixture `tests/fixtures/rsssf/go/2025/go-2025.fixture.json` (+ índices mock com `Q1513287`), script `parse-rsssf-go-2025-fixtures.ts` (offline) e pack `data/go-2025-pilot-candidates.json` (**1 candidate**, `dedupKey=Q931386|2025|Q1513287|WON`, `seedRequired=Q1513287`). Testes T1 (mock com clube⇒candidate), T2 (ausente⇒`missing_club`), T3 (gender), T4 (determinismo) **verdes**. **APPLY BLOQUEADO** até micro-seed de `Q1513287` (round separado). **Sem writer/produção/migration/cache.**

### [2026-09-25] Decisão: D-2026-09-25-t448b2f-gate-producao-concluido — Migration de identidade APLICADA em produção; FASE 2 LIBERADA

Motivo: **merge #209** (`85c0610`) → deploy Railway **SUCCESS** → entrypoint aplicou a migration no boot. **Verificado (read-only):** `_prisma_migrations.20261004120000_t448b2f_remove_name_country_unique` **applied**; **`clubs_name_country_key` AUSENTE** · **`clubs_name_country_idx`** (não-único) presente · **`clubs_qid_key` único INTACTO**; **homônimos ativos = 0**; **estadual RSSSF ativo = 5** (MG 3 + GO 2); smoke `/clubs` 200 · `/clubs/:id` 200 · `/champions` 200 (`estadual=Atlético-MG 2025`). **FASE 2 LIBERADA:** parsers **GO 2025** (`Q1513287`) e **PR 2025** (`Q2580083`) agora são tecnicamente possíveis (homônimos nacionais coexistindo; identidade por QID; duplicata exata bloqueada pela validação contextual). **Follow-up T448b-2g** (backfill dos 9 clubes sem QID) autorizado, prioridade pós-parsers.

### [2026-09-25] Decisão: D-2026-09-25-t448b2f-option-a-approved — Remover `@@unique([name,country])` (identidade = QID)

Motivo (FASE 0 medida): o único global `clubs_name_country_key` impedia homônimos nacionais legítimos com QIDs distintos (Vila Nova/GO `Q1513287` vs /RN `Q10391045`; Operário Ferroviário `Q2580083` vs Operário FC `Q671621`). A identidade canônica é o **QID** (`clubs_qid_key` @unique, intocado). **Opção A adotada:** dropar o único → **índice não-único** `(name,country)`; **validação de negócio contextual** (`club-uniqueness.ts`, pura) bloqueia só **duplicata exata** (`name+country+state+city`, incluindo ambos sem state/city), **permite** homônimos por state/city distintos e trata o caso **parcial** como `ambiguous` (log, sem auto-bloqueio nem auto-permissão). **Por que não B (sufixo no nome):** fabricaria identidade. **Jev/TypeSafe (usado):** `same_club.noul=0.43` no par homônimo → **ambíguo**, reforçando que **nome não é chave** (Jev só cross-check semântico). **Migration** `20261004120000_t448b2f_remove_name_country_unique` (idempotente; down recria o único **só** se não houver homônimos — falha explícita senão). **Ajustados:** `clubsService.create` (validação contextual; `listActiveForDedup`), `prisma/seed.ts` (find-first, sem `name_country`). **Backfill dos 9 clubes sem QID = follow-up separado (T448b-2g), fora do escopo.** **Rollback:** recriar único (guardado) ou soft-hide. **DESTRAVA:** GO 2025 / PR 2025 (homônimos nacionais) tecnicamente.

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-go-gate-producao-concluido — Piloto GO 2023–2024 ATIVO em produção

Motivo: o rate limit do Vercel **resetou** (preview do #208 deployou) → deploy de produção do web (#207) **SUCCESS** (`qytfay2a1`, aliased a almanaquedosclubes.com) → `/metodologia` ao vivo **confirmou a atribuição GO** (hash SHA-256 `9bca4898…`; `Guillermo Alexander Rivera`, `RSSSF Brasil`, `go2023/go2024.htm`, gap 2025 explicado por `clubs @@unique([name,country])`, "não representa cobertura completa", **"(Não é domínio público.)"**). **Gate executado:** dry-run `--pack=go` → `created=2 · failed=0`; **apply** → `created=2 · failed=0` (`competitionsCreated=[]/clubsCreated=[]/clubsUpdated=[]`, `hardDeletes=0`). **SQL verde:** GO ativo=2 (2023/2024) · `missing_provenance=0` · autor "Guillermo Alexander Rivera" · URLs go2023/go2024 · 2025=0 · Q1513287=0 · **MG=3** · **total estadual RSSSF=5** · homônimos=2. **Cache:** `competitions:list:{…}` deletado; champions/titles=0 (no-op). **API:** `/clubs/16a63050-…/titles` → 2 GO estaduais (2023/2024, fonte RSSSF) + 3 nacionais pré-existentes; `/clubs/420a0968-…/titles` → 3; `/champions` → **estadual permanece Atlético-MG 2025** (GO não desloca). **GO 2023–2024 fechado.** Follow-up **T448b-2f** (identidade) antes de reabrir GO 2025/PR/outras UFs com homônimos.

### [2026-09-25] Decisão: D-2026-09-25-vercel-rate-limit-bloqueou-apply-go — Gate GO abortado antes do apply (rate limit Vercel) [RESOLVIDO]

Motivo: o deploy de produção do web (#207, atribuição GO em `/metodologia`) **não subiu** — o Vercel retornou **`Resource is limited - try again in 24 hours (more than 100, api-deployments-free-per-day)`**. Como o gate exige **atribuição pública ANTES do apply**, **o apply GO foi corretamente abortado**: `blocked_reason=vercel_deploy_rate_limited_24h`. **Não autorizada divergência** (aplicar GO com atribuição pendente); **não contornar o rate limit**; **não usar preview como produção**; **não retentar em loop**; **não usar admin bypass**. **Estado congelado (verificado read-only):** `go_active_won=0`, `go_2025_edges=0`, `q1513287=0`, homônimos presentes (2), `mg_active_won=3`, `total_estadual_rsssf_active=3`. Railway API em `928e5ce` com os artefatos GO no container (dry-run `--pack=go` ainda não executado em produção). **Retomada** somente após o deploy de produção Vercel conter o #207 (`/metodologia` com a seção GO) → então executar PASSO 2–8 (dry-run/apply/SQL/cache/smoke). Se após a janela o deploy ainda falhar: `vercel_deploy_still_rate_limited_after_24h` → escalar ao Operador (infra).

### [2026-09-25] Decisão: D-2026-09-25-rsssf-go-attribution-guillermo-alexander-rivera — Atribuição pública do piloto GO + `/champions` verificado

Motivo: publicada a seção **"Conquistas estaduais — Piloto Campeonato Goiano (2023–2024)"** em `/metodologia` (`apps/web/src/app/metodologia/page.tsx`): fonte **RSSSF / RSSSF Brasil**, autor da página **Guillermo Alexander Rivera**, URLs `go2023/go2024.htm`, aviso de licença **verbatim**, explicação de que a atribuição é **ao autor da página** (não só RSSSF), limitação (2025 fora por `clubs @@unique([name,country])`) e canal de correção. **Não é domínio público.** **`/champions` verificado (read-only, PASSO 3):** agrega por hierarquia e elege **1 representante** via `compareRepresentatives` (GRUPO-LIGA: tipo → **ano desc** → edições → campeões distintos → nome → id), determinístico e independente da ordem de entrada. Com MG 2025 + GO 2023/2024, **o card `estadual` permanece Atlético-MG 2025**; GO não desloca nem duplica → **apply aprovado sem filtro**.

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-writer-go-2023-2024 — Writer GO idempotente (2023–2024)

Motivo: writer das 2 arestas WON GO (`Q931386|year|Q198034|WON`). **GO não cria/linka entidades** — resolve competição/clube **só por QID** (fail-fast: `missing/ambiguous_competition`, `missing/ambiguous_club`, `soft_deleted_club`). `modules/etl/rsssf-won-edges-go.service.ts` (repo injetável + `syncGoWonEdges`; idempotência factual inclui soft-deleted; **restore só** para reasons GO `rollback_t448b2d_go_{apply,provenance,failure}`; >1 aresta → `duplicate_factual_edges`). Script `write-rsssf-won-edges.ts` ganhou `--pack=go` (MG inalterado; DRY default; `--apply` exige `--allow-production`; `$transaction` Serializable). Metadata: `retrievedAt` do pack (estático), `authorCredit`/`licenseText`, `writerVersion=t448b2d-writer-go-v1`, `pilotScope`, `uf=GO`, `sourcePageUrlHash`/`championPhrase`, `dedupKey`. **Guardas:** rejeita 2025/Q1513287; não toca homônimos/MG; sem create/migration/hard delete. Evidência local (test DB): dry-run `--pack=go` → **created=2 · failed=0**; unit 11/11; integração 4/4.
Alternativas consideradas: generalizar o sync MG (create/link) — REJEITADO (GO proíbe criar/linkar); writer separado — ADOTADO.

### [2026-09-25] Decisão: D-2026-09-25-go-2025-gap-club-name-unique-conflict — GO 2025 = gap (não entra no parser)

Motivo: `Q1513287` (Vila Nova/GO, campeão 2025) **não pode ser seedado** por `clubs @@unique([name,country])` (ocupada por `Q10391045`). Homônimos **intocados**; sem rename/link/migration. **GO 2025 excluído** do parser (pack em `excluded`). Reabrir só após **T448b-2f**.

### [2026-09-25] Decisão: D-2026-09-25-t448b2d-parser-go-2023-2024 — Parser GO puro (2023–2024)

Motivo: parser puro do **Campeonato Goiano 2023–2024** (RSSSF Brasil). **FASE 0 read-only:** `tablesfq/go2023/2024.htm` **200**, autor **Guillermo Alexander Rivera**, licença (atribuição ao autor) presente, frases `*** ATLÉTICO are Goiás State 2023/2024 champions ***`. **Encoding:** as páginas GO são **UTF-8** apesar do meta declarar windows-1252 (confirmado por hex `c3 89` = É) — fixtures em `utf-8`/`rawText` (as MG eram cp1252). **Gênero = men evidenciado:** RSSSF Brasil distingue feminino pelo sufixo `w` (`go2023w.htm` = 200) e o clube campeão `Q198034` é o masculino. **Hierarquia = estadual** (título "Goiás State League" + `Q931386`). **Identidade por QID** (`Q931386` mãe; `Q198034` clube). **#198-style:** `lib/rsssf/go/**` (reusa o núcleo genérico: decode/extract/map/resolve) + `data/go-pilot-candidates.json` (**2 candidates**, `dedupKey` factual sem hash de URL, `retrievedAt=2026-09-24T20:03:52Z` estático) + `scripts/parse-rsssf-go-fixtures.ts` (dry, sem rede no CI) + `pack.ts` (Zod/fail-fast: rejeita 2025/Q1513287). **Testes:** unit GO (T1–T15) verdes; total unit rsssf **78**. **SEM writer/apply/arestas/migration/produção.** Dry-run: `candidatesValid=2 · pendingReview=0 · excluded=[2025]`.
Alternativas consideradas: incluir 2025 — REJEITADO (club_name_unique_conflict); assumir men por padrão — evitado (evidência documentada: sufixo `w` + clube masculino).

### [2026-09-24] Decisão: D-2026-09-24-clubs-name-country-unique-blocker — `clubs @@unique([name,country])` é blocker real para homônimos nacionais

Motivo (medido no FASE 0 do seed GO): o índice **`clubs_name_country_key` (UNIQUE name,country)** impede criar dois clubes BR com o mesmo nome. O clube **Vila Nova/GO `Q1513287`** não pode ser criado porque `Q10391045` (Vila Nova/RN) já ocupa `("Vila Nova Futebol Clube","BR")`. **Não autorizado** rename/sufixo/link-by-name/migration neste round. **Follow-up:** `T448b-2f` — remediation de identidade de clubes/homônimos (auditar a constraint; opções: unique por `qid` + remover/relaxar name/country; name/country/state; aliases + unique em qid), **sem implementar migration sem aprovação**.

### [2026-09-24] Decisão: D-2026-09-24-go-pilot-reduced-2023-2024 — Piloto GO reduzido a 2023–2024 (2025 = gap)

Motivo: com o blocker de identidade acima, **GO 2025** (campeão Vila Nova/GO `Q1513287`) fica **excluído do piloto** (`club_name_unique_conflict`). O seed de identidade GO fica **reduzido**: **criar só a competição-mãe `Q931386`**, **noop** no clube `Q198034` (Atlético Goianiense) e **nenhuma** criação/link/update de clube. Homônimos `Q10391045`/`Q10391046` **intocados**. O **parser GO** (round futuro) cobrirá apenas **2023/2024**.

### [2026-09-24] Decisão: D-2026-09-24-t448b2d-go-pre-identity-seed — Seed de identidade GO (reduzido)

Motivo: `apps/api/src/lib/rsssf/go/**` (`identity-types`, `seed-plan` com Zod/fail-fast, `index`) + pack `apps/api/src/lib/rsssf/data/go-identity-seed.json` (`pilotScope=go-2023-2024`, `license=CC0`, `retrievedAt=2026-09-24T14:49:12Z` estático) + script `apps/api/src/scripts/seed-go-identity.ts` (DRY default; `--apply` exige `--allow-production`; `$transaction` Serializable). **Proveniência em `importedFrom='wikidata-go-pre'`+`sourceUrl`** (Competition/Club **não têm `metadata`**). **Competition sem `deletedAt`** → rollback por hard delete **só com aprovação explícita** e ausência de referências. **SEM parser RSSSF, SEM writer WON, SEM arestas, SEM migration.** Dry-run local (dist) = `competition create` + `Q198034 noop` + `excluded Q1513287` + `errors []`. Testes: unit 14 + integração 6 verdes.
Alternativas consideradas: rename/sufixo do clube GO ou link-by-name — REJEITADAS (contornariam a identidade). Migration da constraint — fora do round (follow-up T448b-2f).

### [2026-09-24] Decisão: D-2026-09-24-t448b2d-pr-blocked-go-discovery — PR bloqueado; GO discovery (seedable)

Motivo: **T448b-2d (PR) BLOQUEADO** — o Paranaense (`Q920397`, mãe existente) só tem **2025** com frase explícita (`*** Operário are Champions ***`), e o clube campeão **`Q2580083` Operário Ferroviário EC está ausente** do acervo; **2023/2024 não têm declaração de campeão** (2024 só tabela; 2023 sem tabela no formato) → **0 temporadas plenamente ready (<2)**. **Nenhuma branch de parser PR codada.** **Discovery GO (read-only)** aprovou GO como próxima UF: `tablesfq/go{2023,2024,2025}.htm` **200**, autor **Guillermo Alexander Rivera**, licença presente, **frase de campeão explícita nos 3 anos** (2023/2024 ATLÉTICO; 2025 VILA NOVA); mãe **`Q931386`** (Wikidata: P31=Q1478437, P17=Q155) **ausente do DB (seed)**; campeões **`Q198034`** Atlético Goianiense (**presente ACTIVE**) e **`Q1513287`** Vila Nova/GO (**ausente, `missing_but_seedable_by_qid`**). ⚠️ **Homônimo**: o DB tem `Q10391045`/`Q10391046` (Vila Nova/RN e /ES; o RN tem o mesmo nome) → resolver **só por QID**. **Higiene jurídica:** `/direitos-titular` (cache-bypass, SHA-256 `6faa117e…`) **sem "resposta imediata"** → **T470c permanece no-op**. **Ver:** `docs/T448B2D-PR-BLOCK-GO-DISCOVERY.md`. **Seed GO (PASSO 2) gated na aprovação do Thinker.**

### [2026-09-24] Decisão: D-2026-09-24-t448b2c-discovery-ufs — Discovery read-only de expansão estadual (nenhum parser)

Motivo (dispatch do Thinker): round de **descoberta read-only** para expansão estadual após o piloto MG. **Nada codado/escrito.** Medições: (1) **Higiene jurídica** — `/direitos-titular` ao vivo (cache-bypass) **NÃO** contém "resposta imediata" (texto coerente com T470: protocolo, BR 15 dias / EEE-UK "1 mês" prorrogável, canal manual `endart.studios@gmail.com`) → **T470c = no-op**; `/fontes` = **404** e **sem referência no repo** → no-op. (2) **Universo RSSSF Brasil** (`current.htm`, 85 URLs, 24 UFs): SP/CE/PR/SC/GO presentes; **RJ/RS/RO/RR AUSENTES** — probe direto 404 em todos os prefixos + ausentes do `historical.htm` + sem "carioca/gaúcho" → **gap de FONTE** (RSSSF Brasil não publica RJ/RS). (3) **Mães validadas ao vivo** no Wikidata: SP `Q1348155` · CE `Q2469206` · PR `Q920397` · SC `Q2317199` · GO `Q931386` (P17=Q155; P31 futebol). (4) **DB read-only**: mães SP/CE/PR **já existem**; **SC/GO ausentes (gap)**; homônimos confirmados (Vila Nova GO×ES; Operário FC×Ferroviário/Ponta Grossa). **Recomendação:** **PR (primária)** — mãe existente + autor/licença + campeão explícito (risco: homônimo "Operário" → resolver QID exato); **GO (secundária)** — melhor evidência de campeão (mãe ausente → seed). **Gap declarado** para SP/CE/SC e RJ/RS/RO/RR. **Nenhum parser iniciado.**

### [2026-09-24] Decisão: D-2026-09-24-t448b2b-gate-producao-concluido — Piloto MG ATIVO em produção

Motivo: ciclo de ativação concluído após o merge/deploy do #198 (SHA `dfe6e5c`). **Deploy verificado** (container com `dist/lib/rsssf/data/mg-pilot-candidates.json` + `t448b2b-fase2-provenance-v2` no bundle). **Dry-run e APPLY em produção:** `created=0 · restored=3 · failed=0` (restaurou as 3 arestas soft-deleted do rollback anterior — provou a idempotência sobre soft-delete). **Gate SQL verde:** active=3 · anos 1/1/1 · `missing_provenance=0` · `soft_deleted_remaining=0` · links=3 · `Q5028286`=0 · `retrievedAt=2026-09-23T22:59:09Z` + `reactivationReason`. **Cache:** `champions:all` invalidado (padrão `champions:*`); `clubs:titles:<id>`/`clubs:byId:<id>` sem cache; padrão do dispatch `club:<id>:*` **não é a chave real** (chave real = `clubs:titles:<id>`) — sinalizado. **API pública:** `/clubs/420a0968-…/titles` → **200 · total=3** (2025/2024/2023, `estadual`, `sourceUrl` RSSSF Brasil); `/champions` → 200 · `estadual → Atlético-MG`, sem regressão. **Proveniência:** RSSSF com atribuição ao autor da página (Claudio Freati). **Rollback** testado no run anterior (funcionou) e **descartado** aqui (apply limpo). **Limitações:** escopo restrito a **MG 2023–2025**; outros estados/municipal pendentes.

### [2026-09-24] Decisão: D-2026-09-24-t448b-2e-atribuicao-rsssf-mg — Atribuição pública do piloto MG (`/metodologia`)

Motivo: a verificação read-only da superfície pública mostrou que `/metodologia` creditava apenas o **piloto Inglaterra** (T449a) e **não** o piloto **MG** (`Mineiro`/`Claudio Freati`/`mg2023` ausentes); `/fontes` **não existe** (404). Adicionada a seção **"Conquistas estaduais — Piloto Minas Gerais (2023-2025)"** em `apps/web/src/app/metodologia/page.tsx`: fonte **RSSSF / RSSSF Brasil**, autor **Claudio Freati**, as 3 URLs-fonte (`mg2023/2024/2025.htm`), o aviso de licença **verbatim** ("free to copy … proper acknowledgement … All rights reserved") e a **limitação** (amostra do Mineiro Módulo I 2023-2025; não é cobertura completa). Página é PT-only (status quo). **Mudança de frontend → PR próprio (não docs-only).** Verificado AO VIVO após merge/deploy (#200).

### [2026-09-25] Decisão: D-2026-09-25-t448b2b-provenance-retrieved-at-fix — `retrievedAt` persistido + restore idempotente sobre soft-deleted

Motivo: o **gate de produção abortou no check 3.4** (`missing_provenance=3`). O writer v1 gravava `sourceUrl/authorCredit/licenseText`, mas **descartava `candidate.retrievedAt`** (usava `importedAt`). Rollback lógico executado (3 arestas soft-deleted com `deletionReason='rollback_t448b2b_mg_apply'`; `active=0`) e o read-filter (`metadata.deletedAt`) **confirmado na API pública** (`/clubs/:id/titles` → 0). Fix (**#198**): `buildRsssfWonMetadata` passa a persistir **`retrievedAt` do candidate** (fail-fast se ausente/não-ISO-8601) + **bump de `parserVersion`** (`t448b2b-fase2-provenance-v2`) + `dedupKey` no metadata; a comparação de idempotência (`isSameStableData`) cobre **só campos estáveis** (exclui `importedAt/deletedAt/deletionReason/reactivatedAt`); a lookup do fato lógico **inclui soft-deleted**; o upsert classifica **created/updated/restored/skipped/failed**; **restore** só para reason de rollback do piloto (senão `unexpected_soft_deleted_edge`); >1 aresta do fato → `duplicate_factual_edges`; **APPLY atômico** (`$transaction` + `Serializable`). Evidência: dry-run simulado contra o estado de produção → `created=0 · restored=3 · failed=0`; integração replicando o cenário de prod **11/11**. **Regra:** proveniência externa deve ser persistida **field-a-field** e **testada contra o DB**, não apenas contra o candidate.
Alternativas consideradas: `retrievedAt = now()` — REJEITADA (perde o instante da coleta); recriar aresta duplicando o fato — REJEITADA (viola dedup factual).

### [2026-09-25] Decisão: D-2026-09-25-t448b2b-fix-pack-runtime-data — Empacotar os candidates no runtime (writer não depende mais de tests/)

Motivo (bloqueio medido no Gate de Produção): o writer lia `apps/api/tests/fixtures/rsssf/mg/*.json` e o **Dockerfile não copia `tests/`** → em produção, `node dist/scripts/write-rsssf-won-edges.js` falharia com **ENOENT** (0 candidates). Solução (opção A): pack **congelado** em `apps/api/src/lib/rsssf/data/mg-pilot-candidates.json` (levado pelo `COPY apps/api/src` e **emitido ao `dist/`** pelo tsc via `resolveJsonModule` + import `with { type: 'json' }`), carregado por `apps/api/src/lib/rsssf/candidates-pack.ts` com **validação Zod + fail-fast** (pack inválido, atribuição ausente, `dedupKey` duplicada). O writer passa a usar `loadPilotCandidates()` (pack) por padrão; `--from-fixtures` fica como fallback **dev/teste** apenas. **Determinístico/offline** (sem fetch no apply); `retrievedAt` estático das fixtures. Ajuste correlato: a trava de produção passou a valer **só no `--apply`** (DRY/rolled-back é read-only e sempre permitido). **Evidência:** `docker build` + dry-run **dentro do container** → arquivo presente (`/app/apps/api/dist/lib/rsssf/data/mg-pilot-candidates.json`, 3360 bytes), `candidatesSource=pack(prod)`, `candidates=3`, `created=3`, `failed=0`. **Limitações declaradas:** piloto restrito a MG 2023–2025; expansão para outros estados/ingestão dinâmica exigirá novos packs (ou mecanismo genérico) — fora deste round.
Alternativas consideradas: copiar `tests/` no Dockerfile — REJEITADA (arrasta fixtures de teste para a imagem); mudar o build p/ copiar assets — REJEITADA (import JSON já emite ao dist, sem passo extra).

### [2026-09-24] Decisão: D-2026-09-24-t448b2b-fase2-writer — Writer WON RSSSF (ponte de identidade + idempotência) + read-filter de soft-delete

Motivo (dispatch do Thinker): FASE 2 do T448b-2b. Entreguei `apps/api/src/modules/etl/rsssf-won-edges.service.ts` (repo injetável `createPrismaRsssfWonRepo` + `syncRsssfWonEdges` puro), script `apps/api/src/scripts/write-rsssf-won-edges.ts` (**DRY revertendo transação** por padrão; `--apply` grava; **bloqueado em produção sem `--allow-production`**) e `apps/api/src/modules/graph/soft-delete.ts`. **Desvios de schema sinalizados (R3):** (1) o payload do dispatch (`competitionId/year/clubId/relation`) NÃO existe em `KnowledgeGraph` — segui a convenção real do T448 (`sourceId=clubId/Club`, `targetId=competitionId/Competition`, `relation='WON'`, ano em `metadata.year`); (2) `Competition` **não tem** `hierarchy/state/gender` — o upsert usa as colunas reais (`country='BR'`, `type='LEAGUE'`, `qid`, `importedFrom='rsssf'`, `sourceUrl`); a hierarquia fica em `metadata.hierarchy='estadual'`. **Ponte de identidade:** competição ausente → upsert idempotente por `qid`; clube ausente por `qid` → lookup por **NOME EXATO** (sem fuzzy) e, se achar, vincula o `qid`; senão **fail-fast** (nunca órfão). **R1:** idempotência por `(clubId, competitionId, year)`; URL diferente atualiza `metadata` sem duplicar. **R3:** soft-delete lógico (`metadata.deletedAt`) + `isEdgeSoftDeleted`/`excludeSoftDeleted` aplicados em `clubs/repository.listTitlesByClub`, `champions.loadChampions`, `compare.service` e `ranking-algorithm` (leitores/agregações). **Evidência (Postgres 54330 local, zero produção):** `apply` → **created=3**; re-run → **created=0/skipped=3** (idempotência); mãe `Q731877` criada (BR/LEAGUE/rsssf); clube `Q270995` resolvido; `GET /api/v1/clubs/:id/titles` → **total=3** com `sourceUrl` RSSSF; integração `rsssf-won-edges` **7/7** e suíte de integração **222 passed** (1 falha de isolamento em `t470b-revoke-access`, que passa isolada — não tocada).
Alternativas consideradas: usar `sourcePageUrlHash` como chave de dedup — REJEITADA (R1); nome→QID por fuzzy — REJEITADA (identidade determinística).

### [2026-09-24] Decisão: D-2026-09-24-t448b2b-fase1-parser-mg — Parser PURO MG (RSSSF Brasil), sem escrita

Motivo (dispatch do Thinker): FASE 1 do T448b-2b. Núcleo determinístico em `apps/api/src/lib/rsssf/**` (`types`, `decode-legacy-table` [cp1252 mascarado como utf-8 + extração de tabela], `extract-state-champion` [família de frases + cross-check com tabela], `map-team-to-club` [match **exato** por nome/alias/QID — **sem fuzzy como chave**], `resolve-competition-qid` [por QID/alias auditável], `build-won-candidate`, `pending-review`, `fixtures-loader`, `index`) + script **DRY** `src/scripts/parse-rsssf-mg-fixtures.ts` (**sem Prisma**) + **41 testes** (T1–T12) **network-free** + fixtures reais mínimas (**cp1252 preservado em base64**) com `sourceUrl/retrievedAt/authorCredit/licenseText`. **R1:** `dedupKey` factual = `competitionQid|seasonYear|clubQid|WON`; o hash da URL vive **só** em `externalId`/`metadataExtras` (mesma conquista em URL diferente ⇒ mesmo dedup; não duplica fato). **R2:** múltiplos campeões e conflito frase×tabela ⇒ `pending_review` (zero candidate; **não muta QID**). **R4:** `authorCredit`+`licenseText` obrigatórios (ausência bloqueia). **R5:** 3 URLs validadas ao vivo (HTTP 200, crédito+frase); QIDs verificados **fora do código** (Campeonato Mineiro **Q731877**; Atlético-MG **Q270995** em índice de amostra). Dry-run: **3/3 candidates válidos**, 0 pendências; cobertura **95% stmts / 87% branch / 100% funcs**. **Sem Prisma/DB/rede/migration/escrita; não semeia mãe; gap estadual fora do MG declarado.**
Alternativas consideradas: incluir `sourcePageUrlHash` no `dedupKey` — **REJEITADA por R1** (duplicaria o fato por URL); sufixo `_coN` no QID para co-campeão — **REJEITADA por R2** (bloqueia; exige decisão de modelo futura).

### [2026-09-23] Decisão: D-2026-09-23-t449b-scoring-engine — Motor 0-100 de jogadores/técnicos (lógica pura, sem dado real)

Motivo (spec do Operador): o "0-100" definitivo é de **jogadores** (estatística individual) e **técnicos** (desempenho coletivo sob mandato); **clubes** seguem lógica federativa (classificação/títulos) — o piloto de clubes do T449a é transitório/rotulado. Entreguei a **infraestrutura lógica** (`apps/api/src/lib/scoring/**`): tipos puros (`types/player.ts`, `types/coach.ts`), constantes (`constants/weights.ts` — matrizes por posição, MIJ por fase, bônus/penalidades, K/interino), motores puros (`engine/computePlayerRaw.ts`, `engine/computeCoachRaw.ts`), normalização (`utils/normalization.ts` — MinMax + percentil) e **14 testes** (`tests/unit/scoring/{player,coach}.test.ts`) cobrindo bordas (amostra insuficiente→cap 70; cartões; MinMax com outlier; empate→50; interino ×0.7; título mundial×estadual; rebaixamento −30). Doc: `docs/METODOLOGIA_RANKING.md` (fórmulas, pesos justificados, fluxo, limitações). **Sem Prisma/DB/rede, sem endpoints, sem UI** — só código/teste/doc. Determinístico e reprodutível. Ativação gated em dados granulares (Operador/fontes) + relabeling dos clubes.

### [2026-09-23] Decisão: D-2026-09-23-t449a-close-produto — Superfície pública do ranking piloto + crédito RSSSF (fecha T449a)

Motivo (exigido pelo Operador; sem isso a oferta pública podia ser enganosa — CDC art. 30/37): o número "Ranking 0-100" precisa declarar que é **piloto Inglaterra · RSSSF · tabelas-só · sem títulos**, e a RSSSF precisa de **atribuição** (D-rsssf-atribuicao-obrigatoria).
**Entregue:** (1) `/metodologia` ganha a seção **"Ranking 0-100 (Piloto Inglaterra)"** (`id=ranking-piloto-inglaterra`) com fórmula (`Vitórias×3 + Empates×1 + Gols Pró×0.2`; títulos=0), peso (nacional 3.0), normalização MinMax por competição/temporada, **fonte + atribuição RSSSF** ("uso condicionado à atribuição adequada; não é domínio público"), limitações e canal de correção; a seção "Fontes" passa a creditar a RSSSF corretamente (removida a menção errônea "acesso público"). (2) **Badge honesto** na UI de rankings: "Piloto Inglaterra · Fonte RSSSF" + subtítulo + link para a seção, **i18n pt/en/es** (`pages.rankings.pilotBadge/pilotSubtitle/pilotMethodology`). **Reversível:** texto/i18n apenas; sem migration.

### [2026-09-23] Decisão: D-2026-09-23-t449a-tier-emerge-por-competicao — Ranking 0-100 POR competição/temporada (sem agregado cross-division)

Motivo: o T449a **não cria ranking único** misturando Premier League/Championship/League One/League Two/National League. A normalização MinMax é **por competição/temporada** → as divisões ficam em rankings separados e o **tier emerge** do escopo (não de campo novo). A dívida de "tier agregado 1ª-vs-2ª num ranking nacional" fica **T449c/T449b** (com campo de tier/divisão). **Limitação declarada:** sem ranking cross-division.

### [2026-09-23] Decisão: D-2026-09-23-t449a-parser-tables-ranking-piloto-en — T449a = tabelas RSSSF → ranking 0-100 (sem `matches`) + fórmula documentada

Motivo (FASE 0, medido): o parser #185 lê `rsssf.org/tablese/eng2023.html` e emite **TABELAS FINAIS** (classificação: P/W/D/L/GF-GA/pontos) por divisão — **NÃO partidas individuais**. Popular `matches` exigiria **outro parser** (resultados por rodada com **nomes abreviados** "Crystal P") — sub-projeto. Arbitrado: **T449a = tabelas→ranking 0-100**, sem escrever `matches` (consistente com a arbitragem anterior). Pilot: England 2022/23, 5 divisões. **Fórmula documentada:** `raw = W×3×peso + D×1×peso + GF×0.2×peso` (+ `títulos×50×peso`, **títulos=0** no piloto — sem KG auditável na competição/temporada; limitação declarada) → **MinMax por competição/temporada** → 0-100; desempate determinístico (gols contra, saldo, GF, nome, clubId). **Peso** = hierarquia real (nacional=3.0 no piloto). **Escrita:** `competitions` (por **QID existente**: PL Q9448/Championship Q19510/League One Q19565/League Two Q48837/National League Q18504 — sem duplicar por nome), `rankings` (competição+temporada), `ranking_entries` (`position`, `points`=score, `baseMatches`=P, `dataSourceIds=['rsssf']`, `gender='men'`). **Sem migration.** Proveniência/atribuição RSSSF em cada escrita. **Gap de schema declarado:** `Ranking` não tem `methodVersion`/`limitations` (documentados em `/metodologia`/docs; migration futura). **Cobertura:** 116/116 (gate T449EN). Reversível por proveniência.

### [2026-09-23] Decisão: D-2026-09-23-t449en-universo-minimo — Base EN para o piloto T449a: universo mínimo, threshold 100%, soft-delete por `deletedAt`

Motivo (FASE 0 medida): o piloto T449a exige os clubes da Inglaterra. Produção tinha **303 clubes GB** mas só **93/116** das tabelas RSSSF casavam; **23 faltantes** (5 grandes: Arsenal, Chelsea, Liverpool, Manchester City, Leeds) + **1 ruído** (`1964–65 Leeds United A.F.C. season`, Q10556336, ingerido como clube). `Club` **não tinha `deletedAt`**.
**Decisões:** (1) **Universo mínimo** = somente os **faltantes do piloto** (não todos os clubes da Inglaterra); fonte Wikidata (CC0), dedup por **QID**. (2) **Threshold (métrica EXATA, medida em produção)** — `total_references=116` (o parser #185 emite só nomes de clube; **o ruído NÃO é referência do parser**, é um registro do NOSSO banco). Gate: `matched_active = 116/116` **E** `missing_real=0` **E** `ambiguous=0` **E** `noise_active=0` (o `…season` é soft-deleted e filtrado, `noise_deleted=1`). **NÃO** confundir "referências casadas (116)" com "registros no banco". `deletedAt` = remoção admin/ruído, **não** clube extinto (histórico permanece ACTIVE). (3) **Ruído** → **migration `clubs.deletedAt`** + **filtro default `deletedAt: null`** no repository — nunca hard delete; reversível (`deletedAt=NULL`). (4) **Legal suffix/alias:** normalização (acento/pontuação/"F.C./A.F.C./Football Club") só para **match**; QID é a chave canônica. (5) **Competições do piloto** já presentes (Premier League Q9448 · EFL Championship Q19510 · EFL League One Q19565 · EFL League Two Q48837 · National League Q18504). (6) **Rollback:** DELETE dos clubes criados por `importedFrom='wikidata-en-piloto'` + `deletedAt=NULL`; migration drop column. **Entregue (DRY-RUN 115/115):** conector `wikidata-en-clubs` (SPARQL `P641=futebol` + `P17 UK/England`, fallback `wbsearchentities`) + script `ingest-en-clubs-missing` + migration + filtros + 8 testes.

### [2026-09-23] Decisão: D-2026-09-23-t449a-bloqueado-ate-en — T449a permanece bloqueado; #185 não mergeia

Motivo: o parser RSSSF do T449a (#185, PR aberto) funciona, mas o ranking sairia **parcial** sem a base EN completa. Decisão: **#185 fica aberto/não mergeado** até o T449EN elevar a cobertura ao **threshold 100%** em produção. Não publicar ranking parcial.

### [2026-09-22] Decisão: D-2026-09-22-t449-partidas-ranking-piloto — T449a (England tabelas→ranking): FASE 0 medida + parser entregue; BLOQUEADOR de resolução de entidade

Motivo (FASE 0 medida): **schema SEM gap** — `Match` já tem scores/date/round/**dedupKey**/sourceUrl/**license**; `RankingEntry` já tem **`points 0-100`**+baseMatches/baseTitles/reason/gender; **o algoritmo já existe** (`computeClubPoints`/`normalizeMinMax`/`aggregateSeason`). **Tier EMERGE** (ranking por competição separa divisões; sem migration). **Licença RSSSF = atribuição** (R3-5). Fonte parseável (eng2023: 5 divisões, tabelas com nomes **completos**).
**Entregue:** conector puro `rsssf-tables.connector.ts` (parse tabelas por divisão + `rankDivision` via `normalizeMinMax` + `rsssfSeasonUrl` + atribuição) + script `ingest-rsssf-england-tables.ts` (DRY-RUN/`--apply`) + 4 testes unit. DRY-RUN ao vivo: **5 divisões / 116 clubes**.
**BLOQUEADOR (gate de viabilidade):** a **resolução RSSSF-clube → nossa entidade** falha. Produção tem **303 clubes GB**, mas só **1/20** da Premier League casa por nome exato e **21/26** com normalização (tira "F.C./A.F.C."/pontuação). **Faltam clubes grandes** (Manchester City, Arsenal, Liverpool, Chelsea, Leeds) — a base Wikidata está **incompleta para a pirâmide inglesa**. Há também **ruído**: "1964–65 Leeds United A.F.C. season" ingerido como clube. Publicar o ranking agora = **ranking parcial** (subconjunto casado) com **gap declarado**. Alternativa = **enriquecer a base de clubes da Inglaterra** (round ETL dedicado) antes do ranking. **PAUSA para arbitragem** (o piloto não entrega ranking completo sem resolver entidade). Não inflar nem fingir cobertura.

### [2026-09-22] Decisão: D-2026-09-22-rsssf-atribuicao-correcao-planejador — Licença de fonte aberta SEMPRE lida na fonte, mesmo quando o Thinker afirma "domínio público"

Motivo (falha do PLANEJADOR, 5ª correção por query — R3-5): o dispatch (e o T448) afirmou "RSSSF domínio público"; a fonte diz "(C) Copyright RSSSF and RSSSF Brazil … free to copy … **provided that proper acknowledgement is given**" → **uso condicionado a ATRIBUIÇÃO**, não domínio público. Pior: o próprio Thinker gravou no T466 a regra "verificar licença antes; open source ≠ sem regra" (lição ODbL) e a violou ao assumir RSSSF. **Regra generalizada (espelha D-t448f-hint-e-hipotese):** a afirmação de licença do Thinker NÃO substitui a leitura da fonte; licença é lida **na fonte** antes de usar, inclusive quando o planejador diz que é aberta/domínio público. **Requisito (não opcional):** cada registro RSSSF carrega `source='rsssf'` + `sourceUrl` (URL da página) + `retrievedAt` + **crédito/atribuição no metadata**; o produto credita RSSSF onde exibe dado RSSSF (/metodologia//fontes). **NÃO** afirmar "domínio público"; afirmar "uso condicionado a atribuição adequada, conforme a licença da fonte".

### [2026-09-22] Decisão: D-2026-09-22-t448b2-reclassificacao-miscategorizacao — Miscategorização por keyword: 2 competições, corrigidas por (a)

Motivo (FASE 0 medida): o `resolveHierarchy` classifica 'continental' por **nome** (`champions league` etc.) sem exigir confederação. Universo real: das **18** competitions que batem o keyword continental, **2 têm `country` não-nulo** (miscategorizadas): `VFF Champions League` (VU, Q17632439, **1 aresta WON**) e `Afghanistan Champions League` (AF, Q124735366). Correção (**a**): `continental` por nome só vale com **`country` nulo** (confederação); ligas nacionais homônimas caem em nacional. Re-ingestão idempotente (o `won-edges.service` já atualiza metadata divergente sem duplicar — T448b-1). **Hierarquia-como-nome é frágil** → **(b)** (coluna `hierarchy` em `competitions`) fica reservada a **T449/tier** se o volume crescer.

### [2026-09-22] Decisão: D-2026-09-22-t448b2-gap-coordenada-nao-e-escopo — RSSSF não dá P625; o gap de coordenada do mapa NÃO é T448b-2

Motivo: o gap de coordenada/estado/cidade do mapa é **limitação declarada do T467** (coord direta ~3,7%, estado 4,9%, cidade 11,6%). O RSSSF **não fornece** `P625`; T448b-2 corrige **hierarquia** (estadual deixa de ser miscategorizado) e **títulos**, **não** adensa pinos. Não prometer "mapa mais denso" aqui. Densidade de coordenada viria de T448b-2/T449 se algum dia houver fonte com P625.

### [2026-09-22] Decisão: D-2026-09-22-rsssf-licenca-atribuicao — RSSSF NÃO é domínio público: exige atribuição

Motivo (FASE 0.4, verificado no artefato): a home da RSSSF Brasil declara "(C) Copyright RSSSF and RSSSF Brazil … You are free to copy this document in whole or part **provided that proper acknowledgement is given** … All rights reserved." — ou seja, **cópia permitida COM atribuição obrigatória**, não domínio público (a premissa do despacho estava imprecisa). Uso autônomo OK **desde que** cada aresta guarde `source='rsssf'` + `sourceUrl` + `retrievedAt` **e** o produto credite RSSSF/RSSSF Brasil. Fontes de licença fechada (FBref/StatsBomb/Transfermarkt) seguem fora (§2.5 Operador).

### [2026-09-22] Decisão: D-2026-09-22-t448b2-estadual-municipal-piloto — Escopo cortado: reclassificação ENTREGUE; parser RSSSF BR estadual SPLITADO (excede o round)

Motivo (FASE 0 + tentativa de FASE 2): entregue a **FASE 1 (reclassificação das 2 miscategorizadas, (a))** — contida, testada (`t448b2-hierarchy.test.ts`). O **parser RSSSF de estaduais brasileiros** (FASE 2) **estoura o round**: a RSSSF Brasil cobre ~27 estados em páginas por estado, com **layouts variados**, mantidas por autores distintos, **sem directory listing público** (403) e sem URL canônica estável por campeonato — é descoberta-de-fonte + N parsers, não 1 parser. **Corte honesto (lição WS-P):** T448b-2 = reclassificação (este PR); **parser RSSSF BR estadual = round dedicado (T448b-2b)**; municipal/outros países depois (T448b-2c/-2d se necessário). O gap 514 (estaduais/municipais = **0** no metadata) fica **DECLARADO** até o round do parser.

### [2026-09-22] Decisão: D-2026-09-22-gap-e2e-ci-nao-rodado — O CI de PR não roda Playwright E2E (achado do G1; dívida rastreada T476c)

Motivo (CONF do G1): o `security-gate` roda **unit+integração** (vitest via `pnpm --recursive test`, incluindo `apps/web` — 16 testes), **lint recursivo** (T476) e **typecheck**; **NÃO roda Playwright E2E** (`tests/e2e/**`). A bifurcação prevista no G1, aplicada: unit **roda** (a hipótese "CI não roda web" era falsa para unit); o `rights.spec.ts` obsoleto "passou" porque é Playwright → **o gap real é E2E, não unit**. Consequência: os E2E validados por round (champions-stability, oferta-honesta, galeria, acessibilidade do mapa T467, direitos titular T470, T472a en/es) **não são cobertos pelo "CI verde"**. **Dívida rastreada:** **T476c** (opcional-futuro, pré-M5) — job Playwright contra preview/staging (stack completo) OU ressalva permanente. **Não bloqueia M4.** Ressalva **PERMANENTE no HANDOFF** até T476c.

### [2026-09-22] Decisão: D-2026-09-22-t472a-checkout-flag-estado — "Pagamentos em breve" é porta fechada com fechadura provada (não regride o M3 técnico)

Motivo (CONF-1): o `CheckoutButton`/checkout fica **desativado para o PÚBLICO** (`PAYMENTS_ENABLED` off) até o Operador abrir o beta pago (gate técnico fechado + decisão dele). **Mas o código de pagamento está PROVADO em produção** (#146/#156/#168/#170/#171 — incl. smoke com cartão real). "Em breve" ≠ "quebrado" ≠ "nunca funcionou": é **porta fechada com fechadura provada**. **NÃO regride o M3 técnico já declarado** (o marco fica; a **escala** é gate do Operador). Registrado para não confundir "feature flag off" com "não implementado".

### [2026-09-22] Decisão: D-2026-09-22-t472b-condicionado-advogado — Tradução das páginas legais é CONDICIONADA (disclaimer de prevalência ou advogado)

Motivo (correção de escopo do Thinker): o Operador cortou o advogado; traduzir texto **jurídico** (termos/privacidade/cookies/segurança/direitos) para en/es sem revisão cria uma "versão que o usuário aceitou" imprecisa (risco CDC art. 6/30 e transparência LGPD), **pior** que PT-only honesto. **Salvaguarda:** só traduzir com **disclaimer visível em cada idioma** — "Versão informativa em [idioma]. A versão vigente e prevalecente é a em português (Brasil)." Sem o disclaimer, as páginas ficam **PT-only** e declaram "documentos legais vigentes em português (BR)". Se o Operador trouxer advogado, T472b vira autônomo (o disclaimer pode ser revisado/removido). **NÃO executado neste round.**

### [2026-09-22] Decisão: D-2026-09-22-t472a-checkout-i18n — i18n da UI de assinatura/checkout (pt/en/es); jurídico fica de fora

Motivo: clareza de interface (CDC art. 6) para assinante não-PT — risco autônomo nosso (flag do T465), **distinto** do gate jurídico. **Entregue:** `checkout` i18n no `Dictionary` (pt/en/es) + `CheckoutSummary` (client) + `CheckoutButton` (incluindo "Pagamentos em breve." por idioma) + modal T464 já com `L` inline pt/en/es; **catálogo `plan-features.ts` agora multi-locale** (fonte única consumida pelo checkout — anti-hardcode T465 preservado; teste itera os 3 idiomas nas regras de honestidade). **Fora:** texto jurídico (T472b condicionado) e preço/tributos do Stripe hospedado (do provedor). E2E en/es: `/planos` (botões traduzidos, sem PT vazado) + `/checkout` condicional à flag.

### [2026-09-22] Decisão: D-2026-09-22-g1-ci-web-tests — O CI JÁ roda os testes **vitest** do web; o que não roda é o Playwright (E2E)

Motivo (G1, medido — não assumido): `pnpm test:unit` no `security-gate` = `pnpm --recursive test`, que **inclui `apps/web`** (`vitest run`, `include: tests/unit/**`) — confirmado localmente (web **4 arquivos / 16 testes**). Portanto a hipótese "CI não roda testes do web" é **FALSA** para unit/component. O `rights.spec.ts` obsoleto do T470 "passou" porque é **Playwright** (`tests/e2e/**`), **excluído do vitest** e **sem passo de Playwright no `ci.yml`** → nunca foi executado. **Conclusão:** não há 2º ponto-cego de unit (T476b desnecessário nesse escopo); o gap real e já conhecido é **Playwright E2E não rodar no CI de PR** (exige base URL viva — fora do escopo declarado do T476b). **Ressalva:** "verde do web (vitest)" é confiável; "verde de E2E web" **não** é coberto pelo CI de PR.

### [2026-09-22] Decisão: D-2026-09-22-t467-geostats-cache-ttl — Cache do geo-stats é TTL-only (por que é seguro aqui)

Motivo (ressalva C2): `clubs:geo-stats` usa `cache.remember` com **TTL curto (300 s)** e **sem invalidação explícita**. A regra T448d (invalidação fail-loud) só se aplica onde há caminho de escrita que deva invalidation; aqui **não há**: a contagem é **derivada**, muda **somente** quando a ingestão geo muda (raro, via T466/M4), é **não-sensível**, **não-destrutiva** e **não é de dinheiro**. Logo TTL-only é seguro e **não existe caminho de invalidação silenciosa** a temer. Registrado o **porquê** (disciplina da fail-open do blocklist: registrar o porquê é seguro, não deixar padrão cego). Se um dia a contagem passar a mudar por ação de usuário, revisar para invalidação explícita fail-loud.

### [2026-09-22] Decisão: D-2026-09-22-m1-ws-c-fechado-por-t467 — T467 fecha a ponta M1·WS-C (mapa) que ficou [ ] quando declarei M1 fechado

Motivo (correção de processo, 2ª instância após T448′/T465): o M1 foi declarado em 2026-09-15 com "Mapa-múndi interativo" ainda `[ ]` em Features Core. **Marco não se declara fechado com ponta visível aberta.** T467 fecha M1·WS-C (mapa read-only sobre a hierarquia geo real). Registrado para o critério de declaração de marco.
**Smoke pós-deploy (C1, 2026-09-22) — [x] de fato:** `GET /api/v1/clubs/geo-stats` **200** `source=derived` (3.808 clubes/168 países/97 estados; 7 continentes EU 2246 · SA 769 · AS 380 · AF 194 · NA 174 · ZZ 31 · OC 14; sem segredos); `GET /map` **200** com lista de regiões SSR + "Europa"; asset `/geo/ne_110m_admin_0_countries.geojson` **200** (815.562 B). Nota: o mapa é decorativo (`aria-hidden`); a navegação acessível é a lista de regiões (aria-live/breadcrumb).

### [2026-09-22] Decisão: D-2026-09-22-t467-falha-open-blocklist-justificada — Por que o fail-open da LEITURA da blocklist (#180) é seguro AQUI

Motivo: o `authenticate` (#180) faz **fail-open na leitura** da blocklist Redis. Isso só é aceitável **porque**: (a) a anonimização PRECEDE o bloqueio (o banco já está sem PII quando o Redis cai), e (b) o access expira em 15 min (janela máxima). **Não** vira padrão cego: em outro contexto (ex.: blocklist de credencial sensível), fail-open seria inaceitável. A escrita continua **fail-loud** (502, nada muda).

### [2026-09-22] Decisão: D-2026-09-22-t467-licenca-fronteiras — Fronteiras: Natural Earth (domínio público) só até país; estado/cidade vazio-honesto

Motivo (FASE 0.3, verificada antes de baixar — não "open source = ok"): 
| nível | fonte | licença | decisão |
|---|---|---|---|
| continente/país | Natural Earth 1:110m | **domínio público** | **usar** (asset versionado + `LICENSE.md`/proveniência) |
| estado/cidade | OSM admin-borders (ODbL) / IBGE (a verificar) | **ODbL = share-alike** | **NÃO usar ODbL** (contamina o acervo); nível **vazio-honesto** via **lista clicável** |

Asset estático versionado (`apps/web/public/geo/ne_110m_admin_0_countries.geojson`, 816 KB, 177 features) + `LICENSE.md` (fonte/versão/data/URL). Teste garante presença + licença.

### [2026-09-22] Decisão: D-2026-09-22-t467-continente — Continente JÁ existe como campo (sem migration)

Motivo (FASE 0.1, contra o schema): **não existe model Continent**; é `Country.continent String? @db.VarChar(2)` (AF/AN/AS/EU/NA/OC/SA, do P30). Produção: 168 países, **3 sem continente** (bucket honesto `ZZ`); 3.777 clubes sob continente. Logo o agregado por continente é **auditável no banco** (`GROUP BY countries.continent`) ⇒ **sem migration/seed novo** (opções (b)/(c) descartadas).

### [2026-09-22] Decisão: D-2026-09-22-t467-mapa-choropleth — Choropleth por região (não pinos); vazio-honesto; offset; busca textual

Motivo (FASE 0): o Escopo 2 descreve navegação por **divisão administrativa**, não por pino. Números reais: coordenada direta ~3,7% (158/3.808), estado 4,9%, cidade 11,6% → **pino não sustenta "mapa denso"** (T465/T469: claim=verdade). Núcleo = **choropleth** (COUNT real derivado do banco, `source='derived'`); **pino = enriquecimento opcional**; onde não há coordenada/fronteira → **lista**, não invenção. Paginação = **OFFSET** (não cursor). Busca = **tsvector textual** (não "preditiva"; Meilisearch = Operador). Mapa é acessório: navegação por teclado/leitor de tela é a **lista de regiões** (aria-live, breadcrumb, foco). Cache read-through curto; sem migration.

### [2026-09-22] Decisão: D-2026-09-22-t470b-revoke-access-on-deletion — Fecha o gap dos 15 min do access token pós-exclusão (blocklist fail-loud)

Motivo (R3-PROD-GATE do T470): o `DELETE /legal/rights/me/account` anonimizava o banco + revogava o refresh, mas o **access token (JWT stateless, 15 min)** da sessão que excluiu **continuava aceito** → usuário "excluído" seguia logado por até 15 min.
**FASE 0 (R3, medida):** `authenticate.middleware.ts:58` faz **`jwt.verify` puro, sem hit no banco** (não carrega user/sessão). Logo **Opção A inviável** (não há select existente onde pendurar `deletedAt IS NULL`; pendurá-lo custaria DB em toda rota autenticada) → **Opção B**: blocklist `userId` no **Redis** (TTL = 15 min, vida máx do access), checada no `authenticate`; cobre **todos os devices**.
**Fail-loud (inegociável):** a escrita da blocklist é parte do "excluído com sucesso" → escrita **ANTES da anonimização**; se o Redis falhar, **aborta com 502 e NADA muda** (nunca "anonimizei mas não bloqueei"). Leitura: **fail-open COM log alto** se o Redis cair (não derruba toda a autenticação num outage; reabre o gap só durante o outage). `maxRetriesPerRequest` + offline queue default (evita falso fail-loud no cold-start).
**Reversível:** guarda no `authenticate` + blocklist (TTL auto-expira); **sem migration**.
**Verificação:** unit (block/reconhece; escrita lança com Redis fora; leitura fail-open) + integração E2E (register→login→`/auth/me` 200→DELETE→**mesmo access → 401 imediato**). Fecha a ressalva **R3-PROD-GATE** do T470 (agora por construção, não follow-up).

### [2026-09-22] Decisão: D-2026-09-22-t464-confirm-destructiva — Confirmação de ação destrutiva (reembolso/cancel) + consistência billing↔refund

Motivo (WS-P, hardening pré-beta pago): reembolso e cancelamento coexistem no `SubscriptionManager` **sem fricção nem distinção visível**; o usuário podia executar ação irreversível por engano. Subjacente, o achado (print 4): linha R$ 4,90 **PAID** mesmo com protocolo de refund emitido.
**Causa-raiz F2 (medida, R3):** o servidor **certa** — `withdrawSubscription` faz `billing.updateMany(status: 'REFUNDED')` no mesmo transação do cancelamento. O defeito era de **UI**: o `SubscriptionManager` carregava `/billing/invoices` uma única vez no mount e **não re-sincronizava** após o refund → linha PAID obsoleta.
**Correção:** F1 **modal acessível** (`role=dialog`, `aria-modal`, foco preso em Tab, Esc fecha, foco inicial no botão SEGURO = Voltar, `aria-haspopup`), com **distinção visível** (reembolso = devolve {valor} + encerra agora; cancel = interrompe renovação, mantém acesso até {data}, sem devolução) → só então `POST /billing/{kind}`. F2 **re-sincroniza** o histórico (`loadData()` após a ação). F3 mantém o **fail-loud** (erros do provedor chegam como exceção; estado local nunca é limpo/fingido) — o retry com CSRF novo já existe no client (`api` re-lê token em 403).
**Sem migration** (UI + client). Backend withdraw/cancel intocado (provado #146/#156). Docs reconciliados.
**Limitação:** E2E de produção do modal exige assinatura paga (PRO/ELITE) de teste — declarado; a lógica de fechar-sem-agir é inerente (a ação só roda no `Confirmar`).

### [2026-09-22] Decisão: D-2026-09-22-consentimento-export-gap — Consentimento fora do export do titular (gap LGPD art. 18; direção de correção)

Motivo (ressalva R1-CONSENT da revisão do #177, aceita e não bloqueante): o `/legal/rights/me/export` **não inclui** os consentimentos de cookies, porque `cookie_consents` é chaveado por `visitorId` (client-side) e **não há vínculo `visitorId ↔ userId`** no schema. Forçar um join agora inventaria vínculo inexistente (viola 1.3/R3). É **gap real** de acesso (art. 18) para titular autenticado.
**Direção de correção (follow-up WS-L pequeno, NÃO no T470):** (a) ao registrar consentimento **autenticado**, gravar também `userId` em `cookie_consents` (nova coluna nullable + migration); (b) migração retrospectiva **somente se** houver log de consentimento com identificador de conta correlacionável — sem inventar vínculo. Até lá, declarado como limitação.

### [2026-09-22] Decisão: D-2026-09-22-t470-ressalvas-rastreadas — Cobertura de integração do admin (R2) e o gate de produção que fecha o T470 (R3)

Motivo (ressalvas R2/R3 da revisão do #177): 
**R2-ADMIN:** a cobertura de **integração** dos endpoints admin (`/admin/legal/*` — HTTP + RBAC `USERS_MANAGE` + audit + transições de status) é **unit-only**. O caminho de escrita do **titular** (o que protege o usuário) está coberto por **RLS real como `app_user`**. O admin é interno → aceito, mas **não declarar T470 “completo em admin”** até o E2E do gate de produção (ou follow-up WS-L) cobrir admin HTTP+RBAC+audit.
**R3-PROD-GATE:** o **merge do #177 não fecha o T470 em produção** — a página ao vivo ainda é a antiga até o gate de produção passar. Ordem obrigatória (trava destrutiva): (1) deploy + fingerprint SHA + rota `/legal/rights/*` viva; (2) **E2E de leitura** em produção (cookies reais) + confirmar que a página saiu do “resposta imediata”; (3) **E2E destrutivo** (DELETE account) em **staging/preview**, 2× (idempotência), verde; (4) só então `LEGAL_PAGES_ENABLED=true` em produção + smoke destrutivo em conta de teste dedicada (nunca a do Operador). **Passo 4 depende do passo 3 verde** — expor caminho destrutivo sem prova isolada repete o erro do T462 (logout que fingia sucesso).

### [2026-09-22] Decisão: D-2026-09-22-t470-direitos-titular-dmca — Processo real de direitos do titular + notificação autoral (WS-L)

Motivo: `/direitos-titular` e `/direitos-autorais` eram páginas rasas (T445), com formulário público sem protocolo rastreável; site já público = exposição. T470 substitui por processo mínimo e auditável.
**FASE 0 (R3, medida):** **SMTP AUSENTE** (`env.ts` sem SMTP/RESEND; mailer dry-run) → fluxo automatizado **só autenticado**; não-logado = canal manual (gmail), sem POST público. Primitivos reusados: `revokeAllUserSessions` (T456), `verifyPassword`, `auditLog` (append-only), `withRlsContext`. Produção: users **42** (4 ativos) · sessions 127 · subscriptions 41 · billings 2 · favorites 20 · audit_logs 174 · cookie_consents 8 · privacy_requests **0** · copyright_claims **0**.
**Modelo:** tabelas **NOVAS** `data_subject_requests` + `copyright_notices` (protocolo, enums, `userId NOT NULL`, deadline, internalNote, deletedAt) + `User.deletedAt`. T445 público **aposentado na superfície** (páginas → manual); tabelas/rotas legadas mantidas (deprecadas, 0 linhas) por reversibilidade.
**Grants/RLS:** no **próprio SQL da migration** (PG-only, role-guarded, idempotente) + espelho `rls_legal_setup.sql`/`create_app_user.sql` para o CI. Owner SELECT/INSERT; **UPDATE/DELETE só SERVICE**. Adicionado `GRANT USAGE ON SCHEMA public` (faltava; sem ele `app_user` dá `permission denied for schema public`).
**Endpoints:** `/legal/rights/requests` (POST/GET/GET :protocol/POST :protocol/cancel) · `/legal/rights/me/export` (json/csv) · `DELETE /legal/rights/me/account` (confirmação exata **EXCLUIR CONTA** + senha) · `PATCH /legal/rights/me/profile` · `/legal/copyright/notices` (+`:protocol/counter`, GET) · admin `/admin/legal/*` (RBAC `USERS_MANAGE`). **Sem safe harbor formal** (Lei 9.610/98 + análoga). **Sem age gate**. **Sem e-mail automático**.
**Exclusão:** soft (`deletedAt`) + e-mail **anonimizado** (`deleted_<id>@almanaquedosclubes.invalid`; `userId` mantido p/ integridade; billings/audit preservados) + sessões revogadas + hash invalidado + DSR `completed` + audit.
**Verificação:** 11 testes (unit + integração **Postgres real com RLS como `app_user`** + export sem segredos + exclusão). RLS: titular lê o próprio; **não lê de terceiro**; UPDATE direto negado; SERVICE atualiza.
**Limitações declaradas:** tradução legal = T472 · SMTP = Operador · remoção total das rotas T445 legadas = follow-up · consentimento fora do export (sem vínculo userId↔visitorId).

### [2026-09-22] Decisão: D-2026-09-22-t476-ci-glob-recursivo — O glob do lint expandia só 1 nível no CI (falso verde); corrigido + triagem dos 122

Motivo: o script `pnpm lint` era `eslint apps/api/**/*.ts apps/worker/**/*.ts packages/**/*.ts` **sem aspas**. No bash do runner (sem `globstar`), `**` age como `*` e o shell expande **um** nível (`apps/api/*/*.ts`): **27 arquivos varridos de 186** em `apps/api`; o eslint recebia a lista explícita e **não recursava**. Logo `apps/api/src/modules/**`, `apps/api/tests/**` e `apps/api/src/scripts/**` **nunca eram lintados no CI** — "CI verde" escondendo **122 erros** (viola R1 na infraestrutura).
**Correção:** aspas nos globs → o shell entrega o padrão literal e o **eslint expande recursivamente** (portável; sem `shopt`/`find`). `lint:fix` idem. `prettier --check` já estava entre aspas (recursivo) → sem mudança. `tsc` usa `tsconfig include` (não glob de shell) → verificado: `apps/api` cobre `src/**`; `scripts/**` fora é **intencional** (T448/#160 — senão o `rootDir` vira `dist/src`).
**Triagem (glob recursivo; 20 arquivos com problema):** 122 erros → **118 `prettier/prettier`** (18 arquivos; **formatação**, auto-fixados via `eslint --fix`), **3 `no-undef`** (`NodeJS.ProcessEnv` como **tipo** em `src/scripts/backup-to-r2.ts`/`restore-drill.ts` = **FP** de core `no-undef` com TS → regra desligada p/ TS, conforme recomendação typescript-eslint), **1 `preserve-caught-error`** (`privacy-copyright.test.ts` → `{ cause: e }`). **98 warnings registrados** (security/detect-object-injection 57, @typescript-eslint/no-explicit-any 26, detect-non-literal-fs-filename 14, detect-unsafe-regex 1) — não bloqueiam; dívida rastreada.
**Artefato novo:** `.gitattributes` (`* text=auto eol=lf`) — **faltava** (lição T448d); evita falso-diff prettier CRLF (Windows) vs LF (CI).
**Fora / dívida rastreada:** o `format:check` standalone **não roda no CI** e cobre 954 arquivos (majoritariamente `apps/web/**`, que o eslint **ignora** por configuração `ignores: ['apps/web/', …]`) — gap separado, não deste round; avaliar em round WS-S futuro (adicionar `apps/web` ao lint/prettier de CI). Os 98 warnings ficam como dívida de estilo/segurança-FP.
**R1 (CI verde real):** a partir de T476, "CI verde" **cobre** lint recursivo de `apps/api`/`apps/worker`/`packages`; antes, era confiável só para os arquivos de 1º nível — a ressalva fica no HANDOFF.

### [2026-09-22] Decisão: D-2026-09-22-t466-dado-geografico — WS-D: hierarquia geográfica normalizada + coordenadas P625

Motivo: o mapa-múndi (M1·WS-C) e os rankings por jogo (M2) dependem de dado geográfico; o conector de clubes gravava `country/city` como TEXTO e não havia hierarquia continente→país→estado→cidade nem coordenadas em massa.
**FASE 0 (R3, medida — não assumida):** **veredicto (a)** — NÃO existiam models geográficos (só `Club.city/state/country` texto + `latitude/longitude`; `Stadium` idem). Produção: clubs 3.857 · com `country` 3.857 (100%, 169 distintos) · com `city` **463** · com `state` **10** · com coordenada **113 (2,9%)**; `stadiums` **0 linhas**; **PostGIS ausente** em produção (`20260905_stadiums_postgis` é no-op documentado — não é drift).
**Entregas:** migration versionada/reversível `20261001120000_t466_geo_hierarchy` (models `Country`/`State`/`City` + FKs **nullable** em `clubs`/`stadiums`; PostgreSQL **e** paridade SQLite; grants em `create_app_user.sql`). Seed `ingest-geo-wikidata.ts` (DRY-RUN/`--apply`) via conector puro `wikidata-geo.connector.ts`: **país** = P17 (ISO-2 via P297, continente via P30); **cidade** = P131 (QID + label + P625); **estado** = P131 da cidade quando tem ISO 3166-2 (P300). Chaves de dedup: `countries.iso2`, `states.code`, `cities.qid`; proveniência por registro (`importedFrom='wikidata-geo'`, `sourceUrl`, `importedAt`); Zod no payload externo. Coordenadas de clube via `enrich-club-coords.ts` (P625; **reuso**, não recriado).
**API:** `GET /clubs/:id/geo` (contrato do T467) — hierarquia resolvida + coordenadas; nulos = dado ausente (honesto).
**Validação viva (amostra real de produção, 60 clubes, Wikidata ao vivo):** 60/60 país vinculado · 23 países · 6 estados · 17 cidades · **re-run ⇒ ZERO escrita** (2ª execução `created=0 updated=0`, `links unchanged=60`) · **spot-check** 20 clubes (P625 e ISO via P17→P297) 20/20 · 17 cidades 17/17 · 6 estados (P300==code) 6/6 · **bbox** fora=0 · **órfão/ciclo**=0.
**GAP DECLARADO (honesto):** só ~3% dos clubes têm P625 direto no item Wikidata (produção 113/3.857; amostra 2/60) — o mapa (T467) será esparso por clube e poderá plotar **cidades** (que têm P625 via P131) como fallback; decidir no T467, sem inventar coordenada. `stadiums` fica vazio (sem seed nesta rodada; proxy de estádio = T467/Operador).
**Reversível:** por proveniência (`DELETE ... WHERE "importedFrom"='wikidata-geo'`) + drop da migration. FKs nullable não reescrevem as 3.857 linhas.
**Ativação em produção = pós-deploy** (a migration aplica no boot via `migrate deploy`; NÃO foi aplicada à mão em produção — regra T430). Comando de seed: `ingest-geo-wikidata.ts --apply` + `enrich-club-coords.ts --apply`.

### [2026-09-22] Decisão: D-2026-09-22-m1-ws-c-map-gap — M1 declarado com o mapa-múndi ainda [ ] ; T466 (dado) + T467 (pinta) fecham o gap

Motivo: o STATUS/Features Core lista "Mapa-múndi interativo" como `[ ]` embora o M1 tenha sido declarado em 2026-09-15, e o §8 ordena mapa-múndi (M1·WS-C) ANTES de rankings (M2). Sem afirmar a intenção da rodada de M1 (não lida): a leitura do fonte/produção confirma que o dado geográfico necessário **não existia** — logo o mapa não poderia estar pintado. O gap é de **dado**, fechado por T466 (hierarquia + coordenadas) e T467 (render). `mapa-múndi` permanece `[ ]` em Features Core até o T467.

### [2026-09-22] Decisão: D-2026-09-22-t465-aprovado-codigo-morto — T465 aprovado: "alinhar texto" virou "fechar a raiz por construção"

Motivo: aprovação do T465 (#171). A FASE 0 leu o FONTE do deploy (não prints/memória) e achou pior que os prints: `plan-features.ts` era **código morto** (zero consumidores) e o `/checkout` hardcodava listas já divergentes. Em vez de alinhar texto, a divergência foi morta na raiz: fonte única (`plan-features.ts` consumido pelo `/checkout`) + **teste anti-hardcode** que lê o `page.tsx` e rejeita listas paralelas. Learning registrado: "alinhar texto" → "fechar raiz por construção"; R3 aplicada à oferta. Registrada também a regra de branch na prática (caiu na main local; procedimento registrado funcionou; zero perda).

### [2026-09-22] Decisão: D-2026-09-22-checkout-pt-only-pre-beta — (já registrada) i18n do checkout = T468, autônomo nosso, pré-beta

Nota de encadeamento: esta decisão já existe acima (T465). Mantida a distinção para não confundir gates: i18n do checkout (WS-F, T468) é **correção autônoma nossa**, pré-abertura do beta pago; o gate do Operador é o **jurídico** (advogado/DPO/provedores/domínio). T468 vem depois de T466/T467.

### [2026-09-22] Decisão: D-2026-09-22-gate-beta-pago-ajustado — Gate do beta PAGO após os deltas do Operador (age gate, advogado, rep UE e T471 cortados)

Motivo: o gate anterior (D-2026-09-22-gate-legal-m3-produto-corrigido) tratava advogado/DPO/provedores/domínio como bloqueantes. O Operador decidiu cortar expressamente. Novo gate do M3 de produto (abrir beta pago): **[x] T465 no ar** (oferta honesta, #171) · **[x] T469 no ar SEM age gate** e com texto de menores honesto (este round) · **[ ] T470** (direitos do titular + DMCA reais — LGPD art. 18, independe de advogado/idade/UE) · **[ ] T472** (checkout pt/en/es — clareza CDC art. 6) · **[—] advogado NÃO exigido** (decisão do Operador; texto publicado sem revisão externa) · **[—] representante UE NÃO exigido** (risco aceito) · **[—] age gate NÃO existe** (decisão do Operador) · **[—] T471 geobloqueio NÃO aplicado** (opcional-futuro).
**Risco residual ACEITO e registrado (não é esquecimento):** canal único é gmail (domínio próprio = M5 do Operador); sem razão social/endereço de rua públicos (decisão de privacidade); checkout UE não travado. PAYMENTS segue provado (#146/#156/#168/#170/#171) e **dormente no sentido de não escalar além do gate**.
**W3 ajustada:** PR e docs declaram o pacote "autônomo consistente e honesto, lançado por decisão do Operador SEM revisão jurídica externa e SEM representante UE". NUNCA "conforme/LGPD-compliant/GDPR-ready/pronto para público global".

### [2026-09-22] Decisão: D-2026-09-22-t471-nao-aplicado — Geobloqueio/Opção B da UE NÃO é aplicado (opcional-futuro)

Motivo: o Operador não pediu restrição de acesso comercial. O T471 (geobloqueio UE + supressão de EUR até representante UE + cláusulas + advogado) sai do caminho crítico e vira **opcional-futuro**: só volta à fila se um dia o produto cobrar em EUR ou fizer marketing direcionado à UE. Nota técnica de risco aceito: enquanto o checkout for só BRL e não houver direcionamento ativo à UE, a aplicabilidade do GDPR art. 3(2) é fraca; o risco residual (usuário UE pagando sem representante UE) é aceito pelo Operador. Substitui o roteamento "Opção B geo-restrição → T471" do D-2026-09-22-t469-legal-p0-autonomo.

### [2026-09-22] Decisão: D-2026-09-22-sem-age-gate — A plataforma NÃO restringe idade

Motivo: decisão explícita do Operador ("não tem restrição de idade"; conteúdo de futebol, não sensível). NÃO se implementa checkbox de maioridade, verificação documental nem campo de idade. O texto legal reflete a **AUSÊNCIA de verificação** em vez de prometer proteção inexistente (mesma lógica do T465: claim = verdade): "A plataforma não realiza verificação de idade e não coleta intencionalmente dados de crianças… Caso um responsável identifique coleta inadequada, contate o canal de privacidade para análise e providências." Revoga a "declaração proporcional de 18 anos no cadastro" (`auth.ageDeclaration`) e o §9 Menores anterior do T469.

### [2026-09-22] Decisão: D-2026-09-22-t469b-legal-deltas — Correção dos 3 deltas do Operador + fechamento dos achados da FASE 0 do T469

Motivo: o T469 (#172) foi mergeado antes de o Operador publicar os três deltas que resolvem parâmetros antes "[a confirmar]". A re-auditoria de FASE 0 (fonte + produção) mediu:
- **Delta 1 (age gate)** — removido conforme D-2026-09-22-sem-age-gate.
- **Delta 2 (T471)** — fora do crítico conforme D-2026-09-22-t471-nao-aplicado.
- **Delta 3 (gate beta pago)** — ajustado conforme D-2026-09-22-gate-beta-pago-ajustado.
- **G-W2 (caixa de domínio inexistente):** `reembolso@almanaquedosclubes.com` estava publicado em `/checkout` e `SubscriptionManager` (×3 locales) → trocado pelo canal único `endart.studios@gmail.com` (migração p/ domínio = M5 do Operador; não afirmar caixa inexistente).
- **G-W1/FASE 4 (claims públicas):** EN/ES mantinham "largest/mayor colección … with artificial intelligence"; e o grid `home.features` (renderizado em `HeroSection.tsx`, público) seguia com "História Completa", "IA com Citações" e "paginação cursor-based" nos 3 idiomas → "acervo em construção"/proveniência documentada, IA "(em breve)", "cursor-based"→"paginação" (a API usa OFFSET, não cursor).
**Counts re-ancorados em produção (W1):** clubs **3.857** · players **2.396** · competitions **1.563**; o "5.157" é comentário de código (`plan-features.ts` — arestas do grafo), NÃO claim público.
**Fora da superfície legal (registrado):** `pnpm lint` local acusa 122 erros **pré-existentes** em `apps/api`/`apps/worker` (o script `eslint apps/api/**/*.ts` expande no bash do CI só até 1 nível de diretório, por isso o CI fica verde; nenhum arquivo fora de `apps/web` foi tocado neste round) — não é regressão do T469b.

### [2026-09-22] Decisão: D-2026-09-22-t469-legal-p0-autonomo — P0 jurídico-autônomo: re-ancoragem na produção, W1/W2/W3 e roteamento dos 21 achados

Motivo: a auditoria jurídica externa (22/09/2026) cometeu o MESMO erro R3 que a regra combate: leu o snapshot "dados 1%" do PLANO_MESTRE 02/09 em vez de consultar produção ("10 clubes" vs 3.857 medidos). Lição registrada como caso-estudo: **review externo também precisa de query, não de documento**.
**Três avisos inegociáveis executados:** W1 — cada claim re-ancorada em query/fonte (a numeração 5→7 da privacidade apontada pela auditoria NÃO existe na versão atual: medido, 1-12 contínuo; "v2.0 órfã" também não existe no fonte); W2 — NENHUM PII da auditoria publicado (razão social/endereço/e-mail do DPO = escalado ao Operador; bloco de identificação intocado); W3 — o pacote segue "para revisão de advogado habilitado", NUNCA declarado "conforme".
**Entregas:** prazos harmonizados (15d LGPD / 1 mês GDPR, recebimento imediato); retenção com períodos concretos ancorados em config real (backups 30d T446, pagamento 5y fiscal); comunicação de incidentes (ANPD 3 dias úteis ref. / GDPR 72h); menores com declaração proporcional no cadastro (sem KYC); cláusula de transferência internacional + fornecedores nomeados com DPAs públicos citados (Stripe/Cloudflare) e não-públicos marcados "Operador coleta"; **Google Fonts auto-hospedado** (27 woff2 OFL — fornecedor eliminado); ipwho.is MANTIDO (invariante "moeda pela localização REAL" documentado; substituição mudaria comportamento de pagamento = T471) e exaustivamente documentado; consentimento provado em produção 11/11 (T436 suite) + inventário verificado (ZERO cookies antes da escolha — evidência de ouro do design T436); almanaque_locale = estritamente necessário (set só em escolha explícita, zero auto-detect — achado 14); claims da home re-ancoradas ×3 locales; **/metodologia publicada** ("fontes verificadas" = verdade-por-método-publicado).
**Roteamento declarado:** direitos do titular + DMCA reais → T470 (reusa protocolo/export/soft-delete/audit) · Opção B geo-restrição → T471 · i18n legal+checkout → T472/T468 · cursor-based → WS-S/C · disclosure cheio de IA → quando IA shippar · identidade/DPO/DPAs/advogado/agente-EUA/age-gate-profundo → OPERADOR.

### [2026-09-22] Decisão: D-2026-09-22-checkout-pt-only-pre-beta — i18n do checkout é nosso (T468, pré-beta); o gate do Operador é o jurídico

Motivo: flag levantado no T465 e incorporado pelo Thinker: o checkout PT-only expõe risco de clareza (CDC art. 6, informação adequada) para assinante não-PT. Distinção registrada para não confundir gates: a **correção de i18n do checkout é AUTÔNOMA nossa (WS-F, T468), pré-abertura do beta pago**; o gate do Operador é o JURÍDICO (advogado/DPO/provedores/domínio — D-2026-09-22-gate-legal-m3-produto-corrigido). Ambos pré-requisitos do beta; de donos diferentes.
Até o T468: checkout permanece PT-only (estado atual honesto e conhecido; os termos/privacidade referenciados são o contrato vigente em pt).

### [2026-09-22] Decisão: D-2026-09-22-t465-oferta-honesta — A oferta descreve o que roda; o resto é "em breve"; fonte única do catálogo

Motivo: a oferta tinha três superfícies divergentes — `plan-features.ts` (T444) era CÓDIGO MORTO sem consumidor, o `/checkout` hardcodava listas que já tinham divergido (Pro sem suporte; Elite sem exportação estendida) e o `/planos` delegava ao checkout. Cobrar recurso não-operacional é risco CDC art. 30/37 (oferta vincula; publicidade enganosa).
Tabela-veredicto completa no REPORT §22 (adendum 4). Veredictos: busca = "Busca textual avançada" (o "ilimitada" violava a política do próprio /planos de não anunciar ilimitado sem alcance); **IA assistida com citações e API de dados = "(em breve)"** (não operacionais — IA 8.9 [ ]; emissão de key inexistente no backend); exportação precisa ("CSV e JSON" — formatos reais do GET /export); suporte = "canal dedicado" (sem SLA publicado); duplicatas removidas da ELITE ("Tudo do Pro" cobre).
**Knowledge Graph entra como ENTREGUE na ELITE** (autorizado no despacho: promessa do Escopo 6.6 tornada verdade pelo T448 — 5.157 arestas com fonte por aresta; não é promessa nova, é a antiga que virou verdade). Preço/periodicidade INTACTOS; nenhuma promessa ADICIONADA além do KG autorizado.
Fonte única: `plan-features.ts` consumido pelo /checkout (hardcode removido — divergência morta por construção); contrato testado por unit (anti-"ilimitado", marcador "(em breve)", anti-hardcode no page.tsx) + E2E `oferta-honesta.spec.ts`. Flags seguidas (fora do escopo): home hero "com inteligência artificial" (marketing, decisão de conteúdo) e checkout PT-only para falantes não-PT (gate legal do Operador).

### [2026-09-22] Decisão: D-2026-09-22-gate-legal-m3-produto-corrigido — O bloqueante legal do M3 de produto é advogado/DPO/provedores/domínio, não T465+preço

Motivo: correção de ERRO do planejamento, registrado por ele próprio: por duas rodadas o bloqueante do M3 de produto foi tratado como "T465 + preço/periodicidade". Os documentos (pacote de publicação + PLANO-ACAO §5) mostram que o bloqueante LEGAL é outro: advogado revisando o pacote, DPO nomeado, provedores + transferência internacional confirmados, alcance internacional (GDPR se UE), e-mails de domínio próprio — tudo do Operador, escalado nesta rodada.
Os DOIS gates são distintos e ambos necessários para abrir o beta pago a 1.000: **T465 (oferta honesta) mata CDC art. 30/37 — técnico, autônomo, FECHADO neste PR. Pacote jurídico mata LGPD/GDPR — Operador.** Um sem o outro não abre. Preço/periodicidade já estão no ar como decisão do Operador (mensal/anual 15% off) — não são bloqueante.

### [2026-09-22] Decisão: D-2026-09-22-t448f-type-first-condicional — Type-first só onde a liga é flagship; mundial/continental voltam a vigência-primeiro

Motivo: a verificação viva do T448e (checkpoint FASE 3) expôs a interação nº 4 do round — o type-first GLOBAL derrubou a UEFA Champions League (CUP, 2025, 54 edições) abaixo da VFF Champions League (LEAGUE, 2012, 1 edição) no card continental: a regra "liga vence copa" só faz sentido ONDE A LIGA É O FLAGSHIP da hierarquia. Falha do planejamento (type-first GLOBAL sem particionar por hierarquia), não da execução — que parou no checkpoint com evidência viva em vez de expandir escopo.
Arbitragem: **GRUPO-LIGA (flagship = liga): nacional, estadual, municipal → type-first (LEAGUE > CUP > outros/NULL) → vigência → edições → campeões → nome → id. GRUPO-COPA (flagship = copa): mundial, continental → vigência-primeiro (T448c puro) → edições → campeões → nome → id.** Mapeamento dos valores REAIS de `RANKING_HIERARCHIES` lidos do fonte nesta tarefa (mundial, continental, nacional, estadual, municipal — conjunto completo, sem órfãos); hierarquia fora do mapa (futuro do enum) cai no default GRUPO-COPA (vigência-first, sem demotion por tipo) — registrado, nunca em silêncio. Comportamentos intactos: guarda T448d (ambas as branches), gender-blind, anti-findMany, `type` exposto na resposta, backfill de type do T448e, dado do VFF intocado.
Evidência: unit de TRANSIÇÃO (mesma entrada, hierarquia nacional → liga vence; hierarquia continental → copa vence — prova que a partição é por hierarquia, não global) + reescrita dos testes type-first-globais do T448e para GRUPO-COPA (não ficaram verdes mentindo) + regressão continental como teste (UCL 2025 > VFF 2012 por vigência). Live verify: os 3 cards na vitrine com `generatedAt` fresco.

### [2026-09-22] Decisão: D-2026-09-22-divida-tier-flagship — "copa secundária vs copa principal" em GRUPO-COPA é dívida do T449 (declarada, não observada)

Motivo: com a vigência-primeiro restaurada em mundial/continental (T448f), uma SUPERCOPA continental com edição mais recente que a UCL/Libertadores venceria o card continental — NÃO observado no acervo atual (a supertroféu mais recente é anterior), mas possível a qualquer ingestão. A solução geral é campo `tier`/flagship, que o dado NÃO tem hoje — inventar seria fabricar dado (mesma lógica da dívida 1ª-vs-2ª divisão).
Registro: dívida ligada EXPLICITAMENTE ao T449 (partidas → tier/flagship → resolve supertaça-vs-UCL e 1ª-vs-2ª divisão com dado real). Não é hotfix de vitrine; não é campo inventado agora.

### [2026-09-22] Decisão: D-2026-09-22-raiz-vff-miscategorizacao — Miscategorização por keyword de nome é DADO; corrigir é T448b-2/T449, com auditoria R3 antes de qualquer re-ingestão

Motivo: a VFF Champions League é a LIGA nacional de Vanuatu, mas `resolveHierarchy` por keyword de nome (`/champions league/`) a classificou como continental — e o T448 CONGELOU o erro na escrita (`metadata.hierarchy`). Com o type-first condicional (T448f), o card continental voltou à UCL; o VFF permanece no acervo como dado (importedFrom='wikidata', type corrigido para LEAGUE no backfill do T448e, hierarchy congelada 'continental').
Registro: reclassificação de hierarquia é trabalho de DADO (T448b-2/T449) — NÃO hotfix de vitrine. Antes de qualquer re-ingestão/reclassificação: **auditar quantas competições do acervo estão miscategorizadas pelo mesmo keyword** (R3 contra o dado, não contra a memória) — o VFF pode ser um de vários.

### [2026-09-22] Decisão: D-2026-09-22-t448e-representante-por-tipo — LEAGUE representa o país antes de CUP (tipo = campo objetivo, antes da vigência)

Motivo: a interação T448b-1 (copas semeadas) × T448c (vigência-primeiro) colocou o Johan Cruijff Shield (supercopa, `type='CUP'`, ano 2026) acima da Eredivisie (`type='LEAGUE'`, ano 2025) no card nacional da Holanda — a supercopa de agosto bate a liga cuja temporada é registrada pelo ano de início (convenção do colapso cross-year). Mesmo defeito que o T448c matou (competição secundária representando o país), agora pela porta do calendário.
A LINHA que define o escopo: **LEAGUE-vs-CUP é campo objetivo JÁ EXISTENTE no dado** (seed T429 = LEAGUE; T448b-1 marcou as copas = CUP) — usá-lo é ler metadado, não inventar hierarquia. **1ª-vs-2ª divisão DENTRO de LEAGUE não tem campo** — inventar tier seria fabricar dado; segue dívida honesta do T449. Não confundir as duas.
FASE 0 (R3): types populados em produção (LEAGUE 893 · CUP 301 · nulo 368); competições COM arestas WON: LEAGUE 218 · CUP 183 · **nulo 18** — as 18 eram ligas reais com aresta (Allsvenskan 75, Eliteserien 50, Scottish Premiership, 2. Bundesliga, Elitettan, VFF CL…) → **backfill idempotente `type='LEAGUE'` executado em produção antes da regra (0 nulas restantes com aresta; proveniência preservada)** — implementar a regra sobre type nulo teria sido falso verde (NULL iria para o fim da ordem sem mudar nada visível). Spot-check: Eredivisie=LEAGUE, Cruijff=CUP.
Regra: dentro de cada hierarquia, o comparador passa a ordenar **(0) tipo LEAGUE→CUP→outros/NULL, (1) vigência (guarda T448d intacta), (2) edições, (3) campeões distintos, (4) nome asc, (5) id asc**. Preferir LEAGUE SE houver; hierarquia só com CUP continua representada (vazio-honesto ≠ nada). Gender-blind e anti-findMany intactos (unit embaralha). `type` exposto na resposta (auditoria). **Nuance documentada: LEAGUE antiga (2020) representa antes de CUP recente (2026) — tipo vem antes de ano, é o preço de "liga = campeonato principal".** Reversível: ordenação apenas.

### [2026-09-22] Decisão: D-2026-09-22-regra-processo-branch — Commit nasce NA branch do PR; stash alheio não se toca (3ª ocorrência do mesmo risco)

Motivo: 3ª ocorrência de risco de perda de trabalho por commit fora da branch do PR — T453 perdeu conteúdo em cherry-pick · T462 comitou na main por engano · T448d comitou em branch errada (docs já merged) e o `stash pop` atingiu stash alheio de outra sessão (t435-work — preservado, não tocado). O trabalho foi recuperado nas três, por sorte e por disciplina de verificação — não por processo.
Regra permanente: (1) todo commit de feature nasce NA branch do PR — nunca commit direto em main local; (2) se caiu na main local: `git reset --hard origin/main` ANTES de qualquer outra operação, depois cherry-pick para a branch, depois verificação de conteúdo no main (R3 aplicada ao git: "merged" não certifica conteúdo — diff do main sim, regra T463); (3) stash é de sessão: antes de `stash pop`, `git stash list` e confirmar que o topo é teu; stash alheio preserva-se, não se toca; (4) após qualquer recuperação, conferir `git status`/`git log`/`gh pr view` antes de continuar (a branch pode ter recebido trabalho de outra sessão — lição T445).

### [2026-09-22] Decisão: D-2026-09-22-t448d-vigencia-nao-futura — Guarda de vigência: edição futura não existe para o carrossel + cache fail-loud

Motivo: a interação T448c×T448b-1 produziu um caso ao vivo do defeito que o T448c nasceu para matar — a semeadura de supercopas trouxe o Johan Cruijff Shield com edição `year=2026`, que bateu a Ligue 1 2025 na recência e virou o card nacional. **Correção de registro (R3 contra o próprio relator):** a query de produção provou que NÃO há aresta com `year > 2026` (o "universo futuro" está vazio hoje) e a edição 2026 do Cruijff Shield já foi disputada (agosto/2026 < setembro/2026) — ou seja, o card atual é dado real do ano corrente, não "campeão do futuro"; a guarda protege a CLASSE (pré-atribuições de 2027+ que os bots do Wikidata criarão a partir de janeiro), não o card visível de hoje. A pergunta "supercopa vs liga como representante" é prestígio/tier, conceito que o acervo não tem — adiada HONESTAMENTE para revisão com T449 (dívida registrada no D-2026-09-22-t448c).
Guarda implementada: em `selectRepresentatives`, aresta com `year > currentYear` (UTC, calculado no momento da comparação — nunca hardcode) não vira "vigente" e não conta em nenhuma métrica do representante (edições/campeões/ano). Demais níveis intactos; gender-blind intacto; anti-findMany intacto (unit embaralha com arestas futuras na entrada). Unit 14/14 no arquivo do tie-break; guardá parametrizada (`currentYear` injetável) para teste sem relógio.

### [2026-09-22] Decisão: D-2026-09-22-cache-fail-loud — Caminho de escrita/invalidação nunca engole erro (3ª instância da classe)

Motivo: a invalidação de cache por padrão (`cache.invalidate('champions:*')`) falhou SILENCIOSAMENTE 2× seguidas — o catch do `cache.ts` engolia a falha de Redis e a função retornava como se tivesse invalidado. Resultado: vitrine de campeões stale por 2 rodadas, só detectada porque o `generatedAt` na resposta não bater com o esperado. **Anti-padrão nomeado (3ª instância nesta base): catch silencioso em caminho de escrita/invalidação = logout-400 (#156/T462) + refund-skip (#146) + cache-stale (este).** Regra permanente: **write/invalidation paths nunca engolem erro — propagam ou retornam erro estruturado que é logado em warn+.** Leitura (cache get) segue tolerante (miss é benigno).
Implementação: `cache.invalidate` retorna `CacheInvalidationResult {ok, keysDeleted, error?}` e LOGA em warn no próprio módulo — os 12 call sites existentes ganham visibilidade sem churn; chamadores que quiserem escalar verificam `ok`. Teste com Redis mockado lançando em `keys` e em `del` → `ok:false` + warn chamado; caminho feliz reporta contador. **Operação pós-ingestão até nova ordem: DEL com chave exata (`DEL champions:all`) — invalidação por padrão só volta a ser confiável com o fail-loud no ar.**

### [2026-09-22] Decisão: D-2026-09-22-planejador-corrigido-hint-e-hipotese — Hint de planner é hipótese, não resposta (R3 generalizada para as próprias sugestões)

Motivo: no dispatch do T448c, os proxies que o Thinker sugeriu como primários ("mais edições" / "mais campeões distintos") foram REPROVADOS contra o dado real de produção pelo Doer — "mais edições" elegeria Campeonato Paulista (estadual mascarado, 2020) e "mais campeões distintos" elegeria Serie B (paridade de acesso). A frase "valida contra o dado e escolhe; sugiro, não imponho" estava certa e foi honrada — e o learning registrado é do PLANEJADOR: não tratar a própria sugestão como a resposta mentalmente; a sugestão é hipótese a ser derrubada ou confirmada por query. **R3 generalizada: dispatch ancora em query — inclusive as sugestões que o próprio dispatch faz.**

### [2026-09-22] Decisão: D-2026-09-22-t448b1-escopo-copas — T448b-1 semeia mães-COPA (gap real); estaduais/municipais = T448b-2

Motivo: o gap real de produção do T448 (2.832 mães ausentes) é dominado por COPAS — o seed T429 importou `competitions` só de ligas (Q15991303, 893 LEAGUE e ~1 CUP), então FA Cup, Coppa Italia, DFB-Pokal, Copa del Rey, Libertadores, Champions, FIFA Club World Cup, Supercopas etc. nunca entraram como mães. O gargalo da vitrine é COPA, não estadual — por isso o T448b foi fatiado: **T448b-1 = copas (este round)**; T448b-2 = estaduais/municipais via RSSSF (próximo round, parser HTML variável).
Seleção de copa (R3 — classe descoberta/validada AO VIVO, não de memória): P31/P279* de **Q8463186** (national cup — FA Cup, DFB-Pokal, del Rey), **Q1824674** (league cup), **Q34262807** (super cup — Supercopa de España, Trophée des Champions), **Q34542757** (international clubs cup — UCL), **Q123856943** (club world championship — FIFA Club World Cup). **Fallback por rótulo** (cup/copa/coppa/pokal/cupen/trophy/trofeo/trophée/recopa/super cup) é obrigatório porque parte do gap está modelada com classe genérica no Wikidata (Coppa Italia = "sports competition"; Libertadores = "recurring sporting event"). Campeonato Carioca (liga, 85 no gap) fica de fora por design — T448b-2.
Proveniência/reversibilidade: mães-copa gravadas com `importedFrom='wikidata-cups'` (marcador dedicado — purge limpo), `type='CUP'`, `sourceUrl`, dedup por QID (existentes intocados). Hierarquia/gênero NÃO ganham coluna (premissa da FASE 0 mantida): continuam derivados pelas mesmas `resolveHierarchy`/`resolveGender` no momento da escrita das arestas (já congelados no T448).
Meta mensurável: gap continental 286→~0 e mundial 16→~0; copas nacionais na vitrine. Contagem POR HIERARQUIA antes/depois + re-run idempotente + spot-check independente no mesmo pacote.

### [2026-09-22] Decisão: D-2026-09-22-correcao-premissa-cli-ingestao-autonoma — Ingestão de fonte aberta e deploy da API são autônomos do Doer

Motivo: o GATE 1 do T448 foi despachado como se dependesse do Operador (Console do painel como fallback), mas a execução provou o contrário: a CLI do Railway está instalada e autenticada nesta máquina (`railway whoami`), `railway up` faz o deploy da API e `railway ssh` executa comandos dentro do container de produção. O Operador NÃO é necessário para ingestão de fonte aberta (Wikidata CC0) nem para deploy/verificação da API.
Decisões: (1) ingestão de fonte aberta = fluxo autônomo Doer (branch → merge → deploy → execução in-container → evidência); (2) identidade, dinheiro, domínio e credenciais continuam sendo terreno exclusivo do Operador; (3) toda verificação de deploy é por FINGERPRINT no container (`RAILWAY_GIT_COMMIT_SHA` + handler da rota), nunca por "fiz o merge".
Correção de premissa registrada pelo Thinker (o despacho original previa 4 cliques do Operador como caminho primário).

### [2026-09-22] Decisão: D-2026-09-22-t448c-criterio-tiebreak — Carrossel: representante por hierarquia = vigência → longevidade → diversidade → nome → id (proxy até T449)

Motivo: com 2.825 arestas WON "nacionais" de ligas do mundo inteiro, o desempate do campeão vigente por ano-mais-recente empata com frequência (vários 2025) e a ordem implícita do `findMany` decidia — a vitrine expôs a Elitettan (2ª divisão sueca feminina) como campeã nacional. Defeito de APRESENTAÇÃO sobre dado correto (a aresta está certa; a escolha do representante é que não tinha critério).
Critério adotado (validado contra o dado de produção ANTES da escolha, como a diretriz exigiu): cada hierarquia é representada pela competição com o comparador total **(1) maior ano no arquivo (vigência) → (2) mais edições registradas (longevidade) → (3) mais campeões distintos → (4) nome asc (bytes, sem locale) → (5) id asc**; campeão exibido = aresta vigente da competição (ano desc → clubId asc). Restrições honradas: seleção NUNCA lê gênero (filtro `?gender=` é parâmetro que aplica a MESMA regra ao conjunto filtrado) e NUNCA depende de ordem de banco (unit embaralha a entrada e prova resultado idêntico). Auditável: a resposta expõe `editions` da competição representante.
Proxies sugeridos como primários e REPROVADOS contra o dado real (por isso a ordem invertida): "mais edições" elegeria o Campeonato Paulista (102 edições — estadual congelado como nacional pela ausência de keyword estadual em `resolveHierarchy`, arquivo parado em 2020) e "mais campeões distintos" elegeria a Serie B (38 campeões — paridade é característica de divisão de acesso, não prestígio). Vigência primeiro corrige ambos: Paulistão perde por recência (2020 < 2025), Serie B perde por recência/edições.
**Dívida consciente (não esquecimento):** o critério é proxy enquanto não existe ranking/força de liga (T449); quando existir, reavaliar em DECISOES. Limitação correlata registrada: `resolveHierarchy` não tem keywords estaduais/municipais — ligas estaduais caem em "nacional" (T448b-2/ranking devem tratar).
Evidência: unit 10/10 (`champions-tiebreak.test.ts`) com entrada embaralhada; verificação viva em produção pós-deploy (carrossel estável entre recargas; representante nacional = Ligue 1, campeão 2025). Reversível: mudança de ordenação apenas, sem migration.

### [2026-09-22] Decisão: D-2026-09-22-t448-arestas-won — Arestas WON no Knowledge Graph (T448) + regra R3 (dispatch ancora em query)

Motivo: a FASE 0 do T448 (auditoria em query, não em documento) enterrou a premissa do T448′ (seed) com dado: `competitions` NÃO tem coluna hierarchy/gender (hierarquia é derivada por `resolveHierarchy({name})` no ranking), o KG nasce vazio por design e nenhum conector gravava `WON`. O T448 completa o circuito T420 (conector de títulos existia; `upsertTitle` era stub): conector `wikidata-won-edges` (edições com P1346 sobre mães de futebol Q1478437, validada ao vivo contra o endpoint) + `syncWonEdges` (dedup `(competitionId, year, clubId, WON)`, hierarquia/gênero CONGELADOS em metadata na escrita, proveniência POR ARESTA com sourceUrl da EDIÇÃO) + script one-shot DRY-RUN/--apply + job BullMQ (`wikidata-titles`, retry+backoff) + leitura congelada no `/champions` + `GET /clubs/:id/titles` (galeria de honra) + fonte por título no frontend.
Decisões do dispatch honradas: (1) hierarquia derivada por `resolveHierarchy` (mesma fonte do ranking) e CONGELADA em `metadata.hierarchy` — carrossel lê, não re-deriva (unit prova a não-re-derivação); mitigação de staleness: re-run com metadata divergente atualiza sem duplicar; (2) gênero derivado do nome da mãe com default masculino; (3) mãe ausente = aresta NÃO gravada + gap CONTADO por hierarquia (input do T448b) — nunca semear mães; (4) RSSSF estadual/municipal + semeadura de mães = T448b; (5) QID-only — NADA de fuzzy-match de nome.
Adaptações registradas (R3 em ação — produção > letra do dispatch): (a) vocabulário de gênero em `metadata.gender` é `'men'|'women'` (WOMENS_GENDER_VALUE), não 'Masculino'/'Feminino' — o campo já tem vocabulário estabelecido e dois leitores (ranking, champions) já o consomem; (b) proveniência da aresta vive DENTRO de `metadata` (`dataSource/sourceUrl/license/importedAt`) — é o contrato do KG neste acervo (o dispatch citou colunas do padrão de `clubs`; o KG não as tem); (c) SPARQL ancorada em P3450+P1346 com classe de mãe Q1478437 (verificada ao vivo, amostra FA Cup) — label service na query janelada dá 504 no endpoint, então labels vêm em consulta própria VALUES-bounded com chunk 200 (GET com URL > ~4k chars → HTTP 431, medido); (d) uma edição = um ano: a UNION sobre P585/P580/P582 fazia temporada cross-year (ex. 2. Bundesliga 2022-23) virar DOIS títulos — colapso para o ano inicial derrubou 424→235 arestas no piloto; (e) corpus local = piloto DECLARADO (12 mães mais frequentes dos candidatos reais + 101 clubes vencedores) porque esta máquina não alcança o Postgres de produção (host railway.internal, sem CLI) — o gap é medido contra o corpus em que o script roda; rodada definitiva = mesmo comando pelo Operador em produção.
**Regra R3 (permanente):** nenhum dispatch de estado se ancora em documento/snapshot/checklist `[x]` — ancora-se em query de produção. Terceira validação: a FASE 0 do T448 pegou "dados 1%" velho e a premissa de hierarquia-como-coluna; a execução pegou o `upsertTitle`-stub e o 431/504 do endpoint que nenhum documento registrava.
Evidência (corpus-piloto local, 2005–2026): 7.681 candidatos únicos · 235 arestas criadas (continental 40 · nacional 195) · gap 277 (mundial 17 · continental 18 · nacional 242) · órfãos 5.681 (vencedor fora do piloto/seleções) · re-run `0 criar · 235 skip` (idempotência provada) · spot-check independente 20/20 (re-busca da EDIÇÃO na API do Wikidata confere P1346+P3450+ano) · `/champions` ao vivo: PSG (Champions League, fonte Q124024430) e Arsenal (Premier League, fonte Q132674557) · E2E da galeria com dado real (SSR + fonte). Unit 24/24 · integração 5/5 (Postgres real). Produção: roda o MESMO script via Railway — runbook no REPORT §22.
Regras permanentes: D-2026-09-18-testes-sem-skip-silencioso · D-2026-09-20-fixtures-escopados (a aresta do fixture usa ano 1901 para não desbancar o campeão vigente do T441 em DB compartilhado; a leitura congelada do /champions é testada com prisma mockado — classe R2) · R3-t448-dispatch-ancora-em-query.

### [2026-09-21] Decisão: D-2026-09-21-m3-declarado — M3 Open Beta (monetizar) DECLARADO

Motivo: gateway + checkout + webhook HMAC idempotente + assinatura funcional + CDC art. 49 (estorno real com fail-loud) + compliance completo (T445 direitos do titular + políticas v1.2) + smoke live verde (compra real Pro R$4,90 + estorno pelo painel com protocolo re_3UHwb…).
Decisões: (1) produção live = apenas cartão real (4242 é test-mode only); (2) /planos = vitrine pública, área do usuário = gestão (duas entradas, uma função); (3) caminho de dinheiro é fail-loud — nunca marca local sem efeito externo; (4) rate-limit de auth endpoints tem bucket próprio (600/15min) separado do global (100/min); (5) toda gate de auth tem teto de loading (8s) — nunca spinner perpétuo; (6) PR merged não certifica conteúdo no main — verificar diff do main contra o esperado.
Regras permanentes: D-2026-09-18-testes-sem-skip-silencioso · D-2026-09-20-fixtures-escopados · D-2026-09-20-refund-fail-loud · D-2026-09-20-sessao-sempre-assenta · D-2026-09-21-pr-merged-nao-certifica-conteudo · D-2026-09-21-t463-checkout-entradas · D-2026-09-21-t462-logout-efetivo · D-2026-09-20-conteudo-antes-pagamentos (adendo: ativação prossegue, conteúdo como próxima prioridade pós-M3).
Saga de sessão: oito PRs (#142–#154), uma causa por camada — postmortem completo no PLANO_MESTRE (seção M3).

### [2026-09-20] Decisão: D-2026-09-20-sessao-sempre-assenta — Cadeia de sessão no client sempre resolve (teto 8s; nunca spinner perpétuo) + postmortem da saga

Motivo: P0 — site inavegável em 3 navegadores ("Verificando sessão…" infinito). Forense: /auth/me respondia **429** (rate-limit global 100/15min por IP — os 3 navegadores do Operador compartilham o bucket) e a semântica do T455 ("só 401 resolve anon") transformava não-401 em spinner eterno. Probes do Doer (IP próprio) respondiam limpo — a divergência de IP foi o dado que fechou.
Decisões: (1) `AuthProvider.refresh` — qualquer resposta HTTP assenta o estado (2xx authed; 401/403/429/5xx anon navegável), teto duro de 8s via AbortController, re-verificação por navegação/focus; (2) postmortem da saga de sessão: **uma causa (contrato de refresh + semântica de loading), cinco sintomas** (pill vazio, área indisponível logado, não-desloga, login sem renderizar, site inavegável) — sintomas em cadeia pedem forense única do contrato, não fixes por sintoma; (3) regra: **todo gate de auth tem teto de loading**; (4) refresh já responde 401 para anônimo (contrato correto — probe); (5) rate-limit de auth endpoints: bucket próprio mais folgado é follow-up de config do Operador.
Evidência: PR #151; probes curl (IP limpo 401/200 vs IP do Operador 429).

### [2026-09-20] Decisão: D-2026-09-20-t452-t453-logout-e-historico — Logout validado server-side + histórico de cobranças no painel (T452/T453)

Motivo: uso real reportou (1) 'Sair não desloga' (P1 suspeito) e (2) painel sem histórico de cobranças/reembolsos nem condições de estorno — transparência insuficiente pós-incidente do refund.
Forense T452: o logout server-side SEMPRE revogou (revokeSession) e limpou cookies (Path=/ casa); prova em produção: me com cookies antigos pós-logout = **401**; reuso isolado = 401 pontual sem cascata. Causa raiz do sintoma = **indicador de sessão inexistente no client** (T450, PR #145) — o usuário ESTAVA logado e a interface dizia que não.
T453: painel /dashboard/subscription agora lista o histórico de cobranças do próprio usuário (GET /billing/invoices, owner-scoped server-side; usuário A nunca vê dados de B) com valor/moeda, status (PAID/REFUNDED) e externalId, além de bloco permanente de condições de reembolso (CDC art. 49, prazo de crédito do adquirente 3–10 dias úteis, canal reembolso@) em pt/en/es.
Registro de pendência (não é falha do fluxo): e-mail transacional de confirmação aguarda provider SMTP (decisão do Operador: Resend/SendGrid/SMTP próprio; free tier basta) — até lá, Termos 3.5 é satisfeito pelo protocolo na tela + histórico.
Evidência: PR #146 (fail-loud) + PR #145 (indicador) + este PR (histórico/condições); refund real re_3UHZeZPvpIyYKAjl1F3q0gaw (succeeded, R$9,90).

### [2026-09-20] Decisão: D-2026-09-20-refund-fail-loud — Caminho de estorno nunca mente: refund real antes de REFUNDED local

Motivo: primeira compra real (Elite mensal R$9,90) foi estornada pelo painel e o site disse "Feito." **sem criar refund no Stripe** — ledger interno marcando REFUNDED sem efeito externo (risco CDC art. 49 + contabilidade falsa). Causa raiz (linha exata, `stripe.service.ts` refundStripeSubscription): `invoices.list({subscription, limit:1})` no **formato novo do Checkout** retorna fatura paga **sem `payment_intent` e sem `charge`** (validado em produção: o PI só é alcançável por `charges.list({customer}).payment_intent`) → `if (invoice && pi)` falso → refund pulado silenciosamente dentro de `catch {}` vazio → a rota marcava o estado local de qualquer jeito. A assunção do T447 ("funcionaria em dados limpos") era não-testada.
Decisões: (1) **caminho de dinheiro é fail-loud** — `refundStripeSubscription` lança (`RefundNotPossibleError`/erros do provedor) em vez de engolir; a rota `/billing/withdraw` só executa `withdrawSubscription` (REFUNDED/CANCELLED locais) **após** o refund bem-sucedido no provedor; erro → 502 `REFUND_NOT_RESOLVED`/`PROVIDER_ERROR` com estado local inalterado; (2) resolver em cascata com fixture real de produção: `invoice.payment_intent` (formato antigo) → `charges.list({customer})` com `payment_intent` e não-reembolsado (formato novo); (3) UI devolve protocolo do refund ("Reembolso solicitado em {data} — protocolo {id}"), nunca "Feito." solto; (4) e-mail de confirmação permanece gap conhecido (sem provider SMTP) — registrado, não escondido.
Regra de método (Thinker/Doer, 09-20): **caminho de dinheiro (cobrança, estorno, cancelamento) só é certificado por teste que exercita o caminho de produção com fixture realista — nunca por workaround manual + assunção.**
Evidência: refund real executado manualmente `re_3UHZeZPvpIyYKAjl1F3q0gaw` (succeeded, R$9,90 — o titular foi reembolsado antes do fix); unit tests do resolver 6/6 (fixtures live).

### [2026-09-20] Decisão: D-2026-09-20-checkout-app-url-e-guard-live — Pós-pagamento aterrissou em localhost (Cadeia A) + keys live sob guard de boot

Motivo: primeira compra real (Elite mensal R$9,90, `cs_live_a1RZNPAENd`, paid) processou o webhook e ativou a assinatura em produção, mas o pós-pagamento aterrissou em `localhost:3001` — `APP_URL` ausente no env de produção e o código cai no fallback `localhost:3001`. O Operador citou a sessão anual (`cs_live_a1Pwe…`, R$100,98) que na verdade estava `open/unpaid` (abandonada). Forense C1–C4 classificou como **Cadeia A** (compra na produção, redirect errado); Cadeia B (dev com keys live) foi descartada por evidência.
Decisões: (1) `APP_URL=https://almanaquedosclubes.com` setada em produção e **obrigatória + https** quando `NODE_ENV=production` (guard no boot via env.ts); (2) **key live fora de produção falha o boot** (`sk_live_` + `NODE_ENV≠production` → erro no carregamento de `config/stripe.ts` — dev nunca cobra dinheiro real); (3) higiene verificada: nenhum `.env` local contém `sk_live`.
Follow-ups: página pós-checkout resiliente (poll de "processando pagamento" quando a assinatura ainda não chegou) e `currentPeriodEnd` local respeitar ciclo anual (hoje o handler grava +30 dias para qualquer plano — a Stripe é a fonte da verdade do período).
Evidência: `payment_events` gravou `checkout.succeeded` + `customer.subscription.created` em LIVE; `audit_logs` registrou a transição; zero erros no horário. Incidente documentado como o teste de fogo do pipeline #138 (primeira compra real processada idempotentemente).

### [2026-09-18] Decisão: D-2026-09-18-t445-direitos-titular — Direitos do titular (LGPD art. 18) e copyright claims (DMCA) COMPLETOS (F1–F5)

Motivo: M3 (monetização live) é bloqueado pelo checklist jurídico — sem canal de direitos do titular e de copyright claims publicado, a ativação do Stripe viola o §4 do pacote jurídico. T444/T447 deixaram o pagante coberto; T445 cobre o titular.
Escopo entregue: (F1) schema `privacy_requests`/`copyright_claims` + migration reversível + GRANTs (regra mesmo-PR) + rollback; (F2) API — POST/GET públicos com token de acompanhamento (auth opcional), SLA imediato/15d ANPD, cadeia ESTRITA de transições auditadas, decisão motivada obrigatória (indeferido/deferida-indeferida), fulfillment de eliminação = anonimização + revogação de sessões com preservação de workflow e financeiro (soft-delete sempre, sem rota DELETE), honeypot + rate-limit 5/h no DMCA; (F3) UI `/direitos-titular` + `/direitos-autorais` (gate `LEGAL_PAGES_ENABLED`, padrão WS-L), rodapé com 2 links, políticas v1.1 com links cruzados e histórico de versões, i18n pt/en/es; (F4) E2E manual em preview: protocolo → status → atendimento, honeypot descarta (0 registros), 409 em atalho, transições auditadas; 12 testes de integração reais no CI. (F5) esta reconciliação.
Alternativas consideradas: RLS nas novas tabelas (rejeitada — workflow interno SERVICE/admin, decisão do header da migration); hard-delete na eliminação (rejeitado — auditoria e obrigações legais exigem preservação do registro).
Evidência: PR #137 (CI verde), commits `b7563aa`..`c3b6b42`; HANDOFF-T445.md com critérios de aceite aprovados.

### [2026-09-18] Regra: D-2026-09-18-testes-sem-skip-silencioso — Em CI, banco ausente é FALHA, não skip

Motivo: o guard `dbOk` que pula testes sem banco produziu "verde vazio" 3× neste fio (T439, T444, T445) — suites passavam localmente sem tocar no banco, e o skip silencioso esconderia regressões no CI se o service de Postgres falhasse.
Decisão: em CI (`TEST_REQUIRE_DB=true` no workflow), a sonda de banco dos testes lança em vez de pular. Skip silencioso só é permitido local, e o padrão novo loga o estado (`[t445] dbOk=…`). Aplicado nos 8 arquivos de integração com guard.
Alternativas consideradas: setupFiles global (rejeitada — o probe é por-arquivo e o throw precisa abortar o arquivo certo).

### [2026-09-18] Regra: D-2026-09-18-fixtures-escopados — Fixtures de teste usam marcadores únicos e cleanups não cruzam fronteiras

Motivo: o cleanup do `ranking-algorithm.test` (`name contains 'Ranking 0-100'`) apagava o fixture do `rankings-read` (mesmo prefixo, mesma temporada 2023) quando os workers paralelos sobrepunham — flake determinístico sob mudança de agendamento (atingiu 2 runs de PRs não relacionados).
Decisão: fixture usa marcador/temporada únicos (padrão: temporada `2038` no read) e cleanups scopados ao próprio fixture (com exclusão explícita do marcador alheio quando o prefixo é compartilhado). Ao criar teste novo com cleanup amplo, verificar colisão com fixtures existentes.

### [2026-09-16] Decisão: D-2026-09-16-t437-rotacao-app-user — Credencial do app_user rotacionada via papel duplo (zero downtime) + encerramento do incidente de credenciais ecoadas

Motivo: fechar a pendência de higiene do incidente de eco de segredos (T436/T440): a senha do `app_user` teve prefixo ecoado em output. Rotação executada com **papel duplo** (zero downtime): (1) `CREATE ROLE app_user_v2 LOGIN PASSWORD <nova>` + **mesmos grants** do `create_app_user.sql` aplicados com o script parametrizado via `sed` remoto (s/app_user/app_user_v2/) + `GRANT EXECUTE` na função pre-auth; policies RLS não têm cláusula `TO` → aplicam-se a qualquer role não-superuser, nada a ajustar. (2) Troca do `DATABASE_URL_APP` para a URL da v2 → redeploy. (3) Corte: zero conexões do papel velho em `pg_stat_activity`, nenhum objeto owned, `DROP ROLE app_user` + `ALTER ROLE app_user_v2 RENAME TO app_user` (mantém repo/policies/scripts coerentes), atualização do `DATABASE_URL_APP` para a URL com o papel renomeado (mesma senha) → redeploy.
Incidente durante a execução (registro honesto): a primeira troca de variável usou uma senha gerada em uma chamada de shell ANTERIOR à que criou a role → mismatch de senha → deploy CRASHED (entrypoint fail-fast funcionou como desenhado) e, sem fallback de deployment ativo na config atual, **a API ficou fora do ar por ~8 minutos**. Correção: alinhamento da senha via `psql` no container do Postgres (ALTER ROLE) + variável + redeploy → SUCCESS. Lição: gerar senha e usá-la na MESMA chamada de shell; a janela sem fallback é o custo da config atual de deploy do Railway (mitigar com a camada de deploy blue-green do M3+).
Smoke: pós-v2 (health/register/login/me/favoritos 200) e pós-rename (idem) + sonda de conexões (`pg_stat_activity`: zero conexões do papel velho) + cleanup das contas de teste t437 (INACTIVE). **Encerra o item de higiene das credenciais ecoadas**: `postgres` rotacionado em 09-15, `app_user` agora; o prefixo do `app_user` ecoado no diagnóstico tinha risco baixo e hoje a credencial inteira é nova.
Rollback (documentado): antes do DROP, reverter `DATABASE_URL_APP` ao papel anterior (existente); após o DROP, recriar o papel com senha nova. Não foi necessário.
Próximo: T443 (WS-O: backup diário 30d + alertas) · M3 gateway (Operador).

### [2026-09-16] Regra: D-2026-09-16-regra-no-echo — Credenciais nunca atravessam shell local

Motivo: terceiro eco de segredo no fio (DSN completa do Postgres no incidente T437; prefixos de app_user/postgres no diagnóstico). Notas por incidente não são controle — o controle é sistêmico.
Regra: **credenciais nunca atravessam shell local.** Operações que tocam segredo rodam in-container (`railway ssh`/`run`) lendo env LÁ DENTRO; diagnósticos locais usam apenas formas redigidas (comprimentos, prefixos de nome de role); nenhum `echo`/`cut`/pipe sobre variável de credencial; pipelines exibem somente referências (`$VAR`), nunca valores. Re-rotação do `app_user` executada sob esta regra em 09-16 (FASE 0 do T443). Reincidência → re-rotação imediata com o procedimento consolidado (T437/T443, ~10min).
Evidência: FASE 0 do T443 executada sem eco (ALTER via stdin pipe + variável + redeploy SUCCESS + health 200).

### [2026-09-17] Decisão: D-2026-09-17-t446-backup-silencioso — Backup vazio em produção (tsvector/P2010) + pg_dump primário + drill semanal

Motivo: o restore drill do T446 (download do R2 → counts comparados) revelou que o backup JSON/Prisma tinha `clubs:0`, `players:0` — o `.catch(() => [])` engoliu o erro P2010 (tsvector não serializável pelo Prisma) e o backup subiu "ok:true" com arrays vazios. Backup mentiroso é pior que nenhum: confiança falsa. A causa raiz é estrutural — o caminho Prisma-SELECT * é incapaz de backupar o schema (colunas Unsupported("tsvector") da busca full-text). **Decisão: pg_dump (formato custom) é o ÚNICO mecanismo de backup de produção**; o caminho Prisma-por-tabela é DESATIVADO como backup (mantido apenas como manifest de counts, se útil).
Correções: (1) `backup-to-r2.ts` reescrito — pg_dump format custom via `spawnSync` com env herdado (credencial nunca em argv — D-2026-09-16-eco-4); (2) auto-validação — clubs=0 aborta antes do upload, dump < 400KB aborta (formato custom comprime; 457KB real); (3) HEAD pós-upload (tamanho R2 == local); (4) gauge `backup_last_size_bytes` — alerta se < 400KB ou < 50% do anterior; (5) postgresql-client-18 via PGDG repo no Dockerfile (server 18.6 requer client >= 18; Debian bookworm tem apenas client 15); (6) restore-drill.ts in-container (baixa do R2 → pg_restore em DB efêmero → counts comparados → drop); (7) drill semanal automatizado (workflow GitHub Actions).
Registro do eco-4: a rotação do owner foi executada em 2026-09-16 ~19:15 UTC (ALTER ROLE via psql in-container no Postgres), DATABASE_URL atualizada, redeploy SUCCESS (a88abc0f), health 200, register 201. Timestamp confirmado nos logs do Railway.
Janela inválida: do primeiro upload R2 (21KB, vazio — backup-to-r2.ts sem pg_dump) até o backup pg_dump verificado de 457KB — ninguém pode restaurar desse intervalo sem ler esta nota. O objeto de 21KB no R2 foi SUBSTITUÍDO pelo backup pg_dump de 457KB.
Evidência: restore drill in-container — counts idênticos (clubs 3857=3857, players 2396=2396, competitions 1263=1263, users 40=40, rankings 2=2), DRILL-OK, exit 0, executado in-container via node dist/scripts/restore-drill.js sobre o objeto R2 de 457KB.
Próximo: T445 (WS-L 2ª camada: direitos do titular + DMCA) · M3 gateway (Operador: Stripe/Mercado Pago/PagSeguro) · T447 (Stripe test-mode E2E quando keys disponíveis).

### [2026-09-16] Decisão: D-2026-09-16-t443-wso — WS-O: deploy seguro (healthcheck gate), backup diário automatizado, alertas externos e re-rotação no-echo

Motivo: fechar o pilar de confiabilidade exigido pelo premortem antes de monetizar. Quatro entregas:
(1) **FASE 0 — re-rotação do `app_user` sob a regra no-echo** (senha gerada em variável, nunca impressa; aplicada via stdin pipe; variável trocada na mesma chamada; redeploy SUCCESS; health 200).
(2) **FASE 1 — cutover de deploy seguro**: `railway.json` com `deploy.healthcheckPath=/api/v1/health` (timeout 120s) — o tráfego só troca se o novo deployment passar no healthcheck; falha mantém o anterior servindo. **Teste de fogo executado**: replay do modo de falha do T437 (DATABASE_URL_APP inválida) → deployment novo FAILED **isolado**, produção 200 em toda a janela (23:05–23:07 UTC), variável revertida → SUCCESS. Runbook `docs/DEPLOY-ROLLBACK.md`. Fecha o multiplicador do gap 9.3.
(3) **FASE 2 — backup diário automatizado**: `POST /api/v1/admin/backup` (autenticado por `x-backup-secret` dedicado) despeja JSON auditável (clubs/players/competitions/seasons/rankings/rankingEntries/favorites/users SEM passwordHash; sessions excluídas); workflow `backup.yml` diário 04:00 UTC + artifact privado retenção 30d + validação estrutural; loader `scripts/restore-json-backup.ts` (upsert por id, datas normalizadas, users com senha redefinível via forgot). **RESTORE DRILL executado** (pg_dump in-container → restore_drill → counts idênticos: clubs 3857/players 2396/users 39/rankings 2 → DRILL-OK). Nota: o repo já tinha `backup-db.ts`/`backup-to-s3.ts` (T422, S3-compatível) — caminho preferido quando o Operador configurar storage; o endpoint/workflow cobre o intervalo sem S3.
(4) **FASE 3/4 — alertas**: workflow `alerts.yml` 5min (uptime externo via GitHub Actions — health; deltas de `http_5xx_total`/`auth_failures_total` com cache; rankings_last_run >25h; backup stale = falha do backup.yml) → falha do job = e-mail ao Operador. Alerta real recebido: rankings-stale disparou no primeiro run (gauge zerado pós-redeploy) → tratado como warning quando inconclusivo.
Correções no ciclo: `/admin/backup` isento do CSRF (autenticado por segredo dedicado; POST cai no 403 CSRF global — PR #125); gauge zerado pós-redeploy vira warning; `users_find_by_email` v2 com EXECUTE.
Alternativas consideradas: Loki/Grafana (M5); S3/R2 para dumps (aguarda storage do Operador — os scripts T422 já suportam); backup via pg_dump agendado externo (impossível — postgres.railway.internal não resolve fora da rede; executado via ssh nos drills).
Evidência: PRs #123 (gate+runbook), #124 (backup/alertas/workflows), #125 (CSRF exempt); fire-test `docs/evidence/t443/fire-test.md`; backup 3.2MB SUCCESS + artifact expira 2026-10-17; alerts green.
Próximo: T444 (checkout provider-agnostic) · M3 gateway (Operador) · WS-L 2ª camada.

### [2026-09-16] Decisão: D-2026-09-16-t442-rls-users — RLS ENABLE+FORCE em users (fecha o gap de PII do premortem) + padrão INSERT documentado

Motivo: o premortem apontava "RLS só em sessions → Exposição de PII" como risco de segurança máximo. `users` (email, hash de senha, status) agora tem **ENABLE + FORCE RLS** com: SELECT/UPDATE owner-only (`id = current_user_id`), **DELETE para ninguém** (soft-disable via status é SERVICE), INSERT com **WITH CHECK id = current_user_id** — o fluxo de registro gera o uuid NO SERVIDOR e seta o contexto antes do INSERT (padrão documentado; evita SECURITY DEFINER para escrita). SERVICE role com acesso pleno (admin/jobs).
Pre-auth (SELECT por email sem contexto — login, checagem de duplicidade, forgot-password): função **SECURITY DEFINER `users_find_by_email(email)`**, criada pelo superuser que aplica o script (FORCE não se aplica a superuser), executável por app_user. Nenhum SELECT direto pré-auth.
Código: 14 pontos de acesso à tabela users auditados e migrados — register (uuid no server + contexto owner), login (definer + lastLoginAt com contexto owner), refresh, /auth/me, forgot/reset password, verify-email, rbac (getUserRoles/Permissions como SERVICE — lookup interno), admin (4 rotas como SERVICE). GRANTs já existentes (regra grants).
Rollback: `DROP POLICY` + `ALTER TABLE users NO FORCE/NO ROW LEVEL SECURITY` (<5min) — não foi necessário.
Evidência: PR #120 (CI verde — matriz cross-user em Postgres como `app_user` via SET LOCAL ROLE: owner lê/atualiza próprio; A→B leitura/atualização/INSERT de terceiro negados no banco; SERVICE vê tudo; função pre-auth OK; register→/auth/me 200 sob FORCE RLS). Produção: SQL aplicado via ssh (idempotente), smoke register 201/login 200/me 200/health 200; sonda negada ao app_user sem contexto (mesma query retorna linhas para o owner e zero para o app_user — prova viva do RLS).
Rollout seguro: código (com contextos) deployado ANTES do apply do SQL; qualquer caminho esquecido teria virado 42501 imediato — nenhum ocorreu (auditoria de 14 pontos completa).
Próximo: T437 (rotação do app_user) · T443 (WS-O) · M3 gateway (Operador).

### [2026-09-16] Decisão: D-2026-09-16-t441-champions-carousel — Carrossel de campeões ATIVO e M2 COMPLETO (4/4)

Motivo: fechar o M2. `GET /api/v1/champions` retorna o campeão vigente de CADA hierarquia (mundial→municipal) a partir das arestas KnowledgeGraph `WON` — **o ano mais recente vence**, gênero via metadata/competição, badge do ranking vigente, `trophy` null até o acervo ter imagens. **Honestidade 1.3**: hierarquia sem aresta auditável → `champion: null` com reason "sem dados auditáveis" (em produção hoje: matches=0/wonEdges=0 → as 5 hierarquias voltam null e a home exibe o estado vazio explícito; quando o ETL M4 popular, os cards aparecem sem deploy adicional — cache 1h). Frontend: carrossel **scroll-snap em CSS puro** (sem biblioteca), setas + teclado (ArrowLeft/Right) + dots indicadores, `role="region"` + `aria-live="polite"` + foco visível, placeholder SVG de troféu (sem HAS_TROPHY no acervo), cards linkam para `/clubs/[id]?season=[ano]`, i18n 3 idiomas. Sem autoplay deliberado (prefers-reduced-motion + foco).
Alternativas consideradas: biblioteca de slider (descartada — CSS scroll-snap cobre e evita dependência); autoplay (descartado — acessibilidade); inventar campeão simbólico para "encher" o carrossel (violaria 1.3).
Evidência: PR #118 (CI verde incl. integração champions em Postgres: ano mais recente vence, badge de ranking, gender filter, 400 gender inválido, nulls honestos); E2E 3/3 — estado vazio honesto AO VIVO em produção + fluxo com cards via mock de rota (cards, teclado, dots, link, mobile).
Decisão: **M2 — Beta Fechada (engajar) COMPLETO (4/4)**: rankings ✅ T438 · favoritos ✅ T439 · comparadores ✅ T440 · carrossel ✅ T441.
Próximo: fila pós-M2 (M3 gateway [Operador] · T437 rotação app_user · WS-S/WS-O paralelos).

### [2026-09-16] Decisão: D-2026-09-16-t440-comparators — Comparadores clube×clube e jogador×jogador (métricas auditáveis, honestas e cacheadas)

Motivo: terceiro item do M2. `GET /compare/clubs?ids=a,b` e `GET /compare/players?ids=a,b` (Zod: exatamente 2 uuids separados por vírgula; 422 formato, 400 um id só, 404 inexistente) com **cache Redis 5min** via `cache.remember`. Métricas de clube AUDITÁVEIS do acervo: títulos por hierarquia (arestas KnowledgeGraph WON com a MESMA resolução de hierarquia do Ranking 0-100 — mundial 5.0→municipal 1.0), histórico de rankings publicados (por temporada), fundação, estádio representativo (maior capacidade — o schema guarda N estádios por clube) e líder calculado por linha (empate → sem líder). **Honestidade 1.3**: partidas/gols e métricas de carreira de jogador vêm `null` com `reason` (sem fonte no schema — jogador-ano NULL documentado T425 §8); contrato pronto para o ETL M4. Jogador×jogador hoje compara PERFIS (clube, posição, país) com nota honesta.
Frontend: `/compare` com 2 autocompletes (busca no acervo), botão habilita com 2 seleções distintas, tabela com indicador ✓ de líder, gráficos recharts (timeline de pontos por temporada + barras de títulos por hierarquia) responsivos com `role="img"` + aria-label + descrição textual, deep-link `?type&a&b` com comparação automática e `generateMetadata` dinâmico (SEO "Comparar A vs B"), i18n 3 idiomas, mobile-first.
Alternativas consideradas: inventar métricas de partidas/gols (violaria 1.3 — aguardar M4); gráfico de títulos sempre renderizado (com 0 títulos mostra estado honesto de vazio — E2E aceita ambos); stadium "dono" único (schema tem N estádios — representativo = maior capacidade).
Evidência: PR #115 (CI verde) + #116 (E2E 4/4 contra produção: seleção por autocomplete, deep-link, mobile 375px, teclado); smoke /compare/clubs em produção (Palmeiras vs Flamengo com histórico de rankings real do seed).
Próximo: T441 (carrossel de campeões) — último item do M2.

### [2026-09-15] Decisão: D-2026-09-15-t439-favorites — Favoritos em tempo real (RLS owner-only FORCE, /ws com ticket curto) + 3 gaps de produção corrigidos

Motivo: segundo item do M2. Favoritos com soft-delete (princípio 1.1 — sem hard-delete de dado de usuário), índice parcial único `(userId, clubId) WHERE deletedAt IS NULL` (migrations; Prisma não expressa índice parcial), **GRANT ao app_user no mesmo PR** (regra grants — desta vez aplicado), **RLS owner-only ENABLE+FORCE** (`rls_favorites_setup.sql`, padrão sessions; acesso exclusivamente via `withRlsContext`; matriz cross-user testada em CI como `app_user` via `SET LOCAL ROLE` — o user-dono no CI é superuser e escaparia do FORCE). API idempotente (ativo→no-op; removido→reativa a mesma linha), rate-limit por usuário (30/min) nos writes, eventos `favorite_added`/`favorite_removed` no canal WS do próprio usuário.
Tempo real: **reuso do /ws existente** (sem canal paralelo) com 3 correções de segurança/robustez: (1) o /ws aceitava `userId` por query SEM verificação — qualquer um conectava como qualquer usuário; trocado por **ticket de 32B single-use com TTL 60s** (`POST /ws/ticket` autenticado); (2) `POST /ws/ticket` com `Content-Type: application/json` e corpo vazio → 400 do parser (FST_ERR_CTP_EMPTY_JSON_BODY) — cliente envia `{}`; (3) **CSP `connect-src` não incluía `wss://api.almanaquedosclubes.com`** — o navegador bloqueava o upgrade (painel preso em "Conectando…"). Hook cliente com reconexão exponencial (cap 30s) + heartbeat 25s; métricas `ws_connections` e `favorites_events_total`.
Gaps de produção achados e corrigidos no ciclo: (a) GRANT do `favorites` faltou no deploy (aplicado via ssh — a regra grants cobre o PR, mas o SQL manual de produção continua passível de esquecimento; ver Próximo); (b) **`GET /auth/me` não existia** — `ProtectedRoute` redirecionava QUALQUER usuário autenticado ao login (nenhuma página protegida havia sido exposta antes; dashboard também se beneficia); (c) CSP wss (acima). E2E cross-user em produção: A favorita pela UI → painel atualiza via WS SEM reload (prova de no-reload) → B não vê e não remove (removed:false; favorito de A permanece). 12 contas de teste criadas no processo → soft-disable INACTIVE + favoritos removidos (convenção CLEANUP-TEST-ACCOUNTS).
Alternativas consideradas: Supabase Realtime/SSE (spec abria; escolhido WebSocket próprio já existente); DELETE hard (violaria 1.1); confiar só no service para isolamento (RLS no banco como segunda barreira, testada por matriz).
Evidência: PRs #109 (feature), #110 (/auth/me), #111 (body {}), #112 (CSP wss), #113 (E2E hardening) — todos merged com CI verde; matriz RLS passando em Postgres no security-gate; E2E cross-user 1/1 em produção; cleanup de contas de teste registrado.
Próximo: T440 (comparadores clube×clube/jogador×jogador) · T441 (carrossel de campeões). Fortalecer automação do SQL de grants/RFS em produção (hoje manual via ssh).

### [2026-09-15] Decisão: D-2026-09-15-t438-rankings-cron — Pipeline de Rankings 0-100 ATIVO (cron 03:00 UTC, MinMax, idempotente, observável)

Motivo: fechar o primeiro item do M2. Descoberta-chave: o núcleo já existia (T425 — algoritmo puro com pesos Mundial 5.0→Municipal 1.0, MinMax com isolamento por gênero, amostra mínima e proveniência; job BullMQ idempotente) mas estava DORMENTE — nada registrava o cron, não havia CLI, métricas nem endpoints de leitura otimizados. O T438 completou e ATIVOU o pipeline: (1) guarda anti-ranking-vazio (princípio 1.3: sem clubes ranqueáveis o Ranking NÃO é publicado); (2) filtro de linhas por gênero no job — **bug latente do T425 exposto pelos novos testes de integração**: posições recomeçam em 1 por gênero e colidiam em @@unique([rankingId, position]) quando men+women iam para o mesmo ranking rotulado; (3) Pino estruturado + gauges rankings_last_run_timestamp/_duration_seconds/_clubs_processed e counter _errors_total (via runRankingCronOnce, compartilhado por cron e CLI); (4) registro no boot (server.ts, RANKING_CRON_AUTO=1 — setada no Railway, deploy 8058f8f4, log "Ranking cron agendado (UTC) pattern=0 3 * * *"); (5) CLI src/scripts/calculate-rankings.js (dist) — execução manual em produção via railway ssh: honestamente vazio (matches=0, wonEdges=0), exit 0, guarda disparou nos dois gêneros; (6) endpoints públicos GET /rankings/entries (cursor por position; filtros year/competitionId/gender/country/state/city) e GET /rankings/clube/:clubId (histórico; 404 se clube não existe); (7) página /rankings real (tabela, filtros ano/gênero/país, cursor "carregar mais", links para /clubs/[id], i18n 3 idiomas, SEO) — E2E 3/3 contra produção.
Alternativas consideradas: cron via GitHub Actions + railway run (descartado — postgres.railway.internal não resolve fora da rede Railway); publicar rankings vazios para "provar vida" (descartado — viola princípio 1.3); alterar algoritmo para a fórmula rascunhada da spec (gols×0.2×peso — descartado: spec veda alterar pesos; vale o documentado em RANKING-ALGORITHM.md, títulos×50×peso); script em apps/api/scripts/ (movido para src/scripts/ para compilar ao dist e rodar em produção).
Evidência: PR #107 (CI verde incl. job tests em Postgres); deploy 8058f8f4 com cron agendado; execução manual exit 0 com guarda de vazio; /rankings ao vivo com rankings de seed (E2E 3/3); smoke de endpoints (entries cursor, histórico, 404).
Honesto: **conteúdo computado vazio até existir ETL de partidas/títulos (M4)** — rankings visíveis hoje são os de seed (entrada manual). Pipeline pronto: quando a ingesting chegar, o cron publica automaticamente.
Próximo: T439 (favoritos em tempo real) · T440 (comparadores) · T441 (carrossel).

### [2026-09-15] Decisão: D-2026-09-15-m1-declarado — M1 (Beta Fechada ler/navegar) formalmente declarado

Motivo: primeiro marco de produto do Almanaque dos Clubes, com os 7 critérios atendidos e provados em produção: seed ≥1.000 clubes via Wikidata (3.857 clubes, 100% proveniência); mapa-múndi read-only (/map, 113 coords); perfis clube/jogador com sourceUrl auditável; busca global (tsvector); hero dinâmico (Server Component, revalidate 3600); cookie banner + consentimento publicado (PR #101 + flags ativadas); políticas publicadas (/privacidade /termos /cookies /seguranca, 200 com dados reais — CNPJ 45.370.930/0001-75, Osasco/SP, endart.studios@gmail.com, fornecedores reais).
Evidência: smoke de produção verde (PR #105 merged) — banner visível (screenshot commitado), prova gravando (POST /consent 201; cookie_consents count=3 via railway ssh), 0 analytics antes do consentimento, regressões OK (hero totals no HTML; /cookies com inventário real). Nota operacional: as flags haviam sido registradas só com alvo Preview (primeiro smoke veio vermelho — falso-negativo previsto pelo protocolo); corrigidas para Production+Preview via API (upsert) + redeploy, com prova pelo comportamento.
Decisão: M1 formalmente declarado em 2026-09-15. Plataforma pronta para Beta Fechada (100 usuários).
Próximo: M2 — Beta Fechada engajar (T438 rankings 0-100 em cron · T439 favoritos · T440 comparadores · T441 carrossel de campeões; T437 rotação do app_user em paralelo, não bloqueante).

### [2026-09-15] Decisão: D-2026-09-15-rotacao-senha-postgres — Rotação da senha do user `postgres` executada (fecha higiene do eco do T430)

Motivo: durante o diagnóstico pós-merge do T436, a `DATABASE_URL` de produção (senha completa do `postgres`) foi ecoada em output de comando. Higiene de segredo exige rotação. Executada via mecanismo oficial do Railway (**Postgres → Database → Config → Connection → Regenerate Password**), escopo = user `postgres` apenas.
Execução: o check referência-vs-literal (`railway variables --json` expõe valores raw) mostrou que `DATABASE_URL` da API é **literal** — após o Regenerate, a variável foi atualizada manualmente com a URL nova do serviço Postgres e o redeploy automático subiu o deployment `35bc558f` (SUCCESS; o fail-fast do entrypoint prova que o `prisma migrate deploy` autenticou com a senha nova: "No pending migrations"). Smoke pós-rotação: health 200 · POST /consent 201 (canário de escrita, prova `61bbac89`) · GET /consent/current 200. `DATABASE_URL_APP` (user `app_user`, runtime/RLS) **não foi tocado** — o runtime nunca deixou de servir.
Registro associado — **D-2026-09-15-diagnostico-prefixos-ecoados**: durante o mesmo diagnóstico, `railway variables --json` ecoou prefixos de 8 chars das senhas de `postgres` e `app_user`. Risco baixo (prefixo ≠ senha; acesso exige sessão Railway); mitigação = esta rotação (fecha o risco do T430) + **T437** (round separado) para rotação do `app_user` via `ALTER USER` + variável + redeploy — não bloqueia M1. Aprendizado: `railway variables --json` expõe valores raw; usar com redação de output em logs/scripts (mesmo padrão do `entrypoint.sh`).
Alternativas consideradas: `ALTER ROLE postgres WITH PASSWORD` via ssh + `prisma db execute` (descartado — deixaria a variável do serviço Postgres stale, divergindo do mecanismo suportado); rotação do `app_user` no mesmo round (adiada para T437 — risco menor e mais passos; separação de mudanças).
Evidência: deployment `35bc558f` SUCCESS com "No pending migrations"; smoke 200/201/200; variável `DATABASE_URL` da API sem a senha antiga (sanity check).
Próximo: Operador ativa as flags da Vercel (`LEGAL_PAGES_ENABLED` + `COOKIE_BANNER_ENABLED`) → smoke do M1 → statement formal.

### [2026-09-15] Decisão: D-2026-09-15-migration-grants-rule — Toda migration que cria tabela nova inclui GRANT no create_app_user.sql no mesmo PR

Motivo: o PR #101 (T436) criou `cookie_consents` + `cookie_policy_versions` via migration; a migration aplicou com sucesso em produção, mas os endpoints /consent retornavam 500 (`42501 permission denied`). Causa raiz: a app conecta como role `app_user` (`DATABASE_URL_APP`); tabelas criadas por migration não herdam grants automaticamente, e o padrão do repo mantém grants em `apps/api/scripts/sql/create_app_user.sql`, fora de migrations (aplicado manualmente em novos ambientes). Descoberto pelo smoke de produção pós-merge, antes do Operador ativar qualquer feature.
Decisão: toda migration que **cria tabela nova** deve incluir os GRANTs correspondentes no `create_app_user.sql` **no mesmo PR**. Garante consistência automática em novos ambientes e evita o gap de permissão em produção. Se esquecido, o smoke de produção pega antes do Operador (como ocorreu). Não é dívida técnica: é regra de processo documentada e automatizável (pode virar check de CI no futuro: "migration cria tabela? create_app_user.sql atualizado?").
Mitigação imediata: PR #102 — GRANTs das duas tabelas no `create_app_user.sql` + aplicados em produção via `railway ssh` + `prisma db execute` (o banco é DNS interno Railway; execução local não alcança).
Alternativas consideradas: GRANT dentro da migration (descartado — quebra em ambientes onde `app_user` ainda não existe, como o scratch DB do job migration-drift, e viola a convenção de RLS/grants fora de migrations); conceder `GRANT ALL ON ALL TABLES IN SCHEMA public` genérico (descartado — expansão silenciosa de privilégio contraria o menor privilégio).
Evidência: logs do deployment Railway 502a0417 (migration aplicada + prisma:error 42501); POST /consent 201 e GET /consent/current 200 em produção após os grants; PR #102 merged (CI verde).
Próximo: considerar check de CI que detecte `CREATE TABLE` em migration sem linha correspondente no create_app_user.sql.

### [2026-09-15] Decisão: D-2026-09-15-t436-fechamento — T436 fechado: consentimento LGPD (schema+API+banner+páginas legais) com flags default OFF

Motivo: fechar a 1ª camada WS-L sem dark pattern e com prova auditável. (1) **Prova de consentimento**: `cookie_consents` + `cookie_policy_versions` (migration 20260914120000, reversível; validada pelo job migration-drift) e API `POST /api/v1/consent` (201 com prova; categorias com `necessary: true` inegociável) + `GET /consent/current`; IP nunca em claro — apenas SHA-256 com salt (`CONSENT_IP_SALT` → fallback JWT_SECRET); CSRF de uso único obrigatório (aprendizado do teste: token não é reutilizável — helper gera token por chamada). (2) **Banner**: 3 ações com classes idênticas (aceitar/rejeitar/gerenciar) — mesmo destaque verificado por teste E2E de computed styles (same-visual-weight); centro de preferências granular sem checkbox "necessary" (não recusável). (3) **Script loader**: gate puro `resolveScripts` injeta apenas categorias autorizadas; registry vazio de opcionais (nenhum vendor contratado) — 4 testes unitários travam a regressão "esquecer o gate"; ao contratar PostHog/Plausible: adicionar entrada no registry + linha no inventário de /cookies. (4) **Páginas legais com dados reais**: privacidade lista fornecedores atuais (Vercel, Railway, Cloudflare, Google Fonts; Stripe para pagamento), /termos referencia /planos (sem valores hardcoded — evita divergência de preço), /cookies traz inventário REAL (access_token, refresh_token, almanaque_locale, consent_v; CSRF via header sem cookie) e /seguranca lista medidas implementadas (CSP/Helmet, argon2id, rate-limit em camadas, RLS de sessões, audit log append-only, CI security). Tudo em 3 idiomas (pt-br/en-us/es-es). (5) **Flags**: `LEGAL_PAGES_ENABLED`/`COOKIE_BANNER_ENABLED` default OFF; default provado em build de produção (legais 404, banner ausente); ON provado localmente e no preview (envs aplicadas apenas no escopo **preview** — produção intocada, ativação é do Operador pós-merge, reiterando D-2026-09-14-ws-l-gated-by-operator); páginas legais são dinâmicas — a flag é avaliada por request, sem bake no build.
Alternativas consideradas: cookies de consentimento só no localStorage (descartado — prova server-side é a fonte da verdade LGPD; storage local permanece para UX do banner); reutilizar o cookie legado `almanaque_consent` (descartado como escrita — mantido como leitura/fallback para quem já escolheu no deploy anterior); tabelas de cookies estáticas fora do i18n (descartado — conteúdo precisa dos 3 idiomas).
Evidência: tsc 0 (api+domain+web) · lint 0 erros · prettier ok · unit web 4/4 · integração API 8/8 (sqlite local; Postgres via CI) · E2E Playwright 11/11 · build produção verde com flags OFF e ON · preview Vercel READY (status success) · evidências em docs/evidence/t436/.
Próximo: Operador ativa as flags em produção (runbook, Passo 3) → smoke → M1 formalmente declarado no PLANO_MESTRE.

### [2026-09-15] Decisão: D-2026-09-15-ws-l-identity-confirmed — Identidade do controlador confirmada pelo Operador ("END ART Studios")

Motivo: única pendência do Operador para o T436 era a identificação legal do controlador. Confirmado: controlador **END ART Studios**, CNPJ 45.370.930/0001-75, Osasco/SP-Brasil, e-mail geral e do titular endart.studios@gmail.com; planos Pro R$ 4,90 e Elite R$ 9,90 com periodicidade mensal e anual (15% off no anual) conforme /planos em produção. Nome fantasia é aceitável em políticas públicas (MEI/ME) — sem necessidade de consultar a Receita Federal. Políticas e rodapé já usam exatamente esses dados.
Alternativas consideradas: razão social completa da Receita (descartada — irrelevante para consumidor final e indisponível nesta janela).
Evidência: mensagem de autorização do Operador (2026-09-15); dados já visíveis no rodapé e nas páginas legais publicadas no preview.
Próximo: ver D-2026-09-15-t436-fechamento.

### [2026-09-14] Decisão: D-2026-09-14-t435-fechamento — T435 fechado: build web + gate + testes + hero Server Component + reconciliação

Motivo: fechar o audit com 5 blocos. Bloco A corrigiu TS2322 em players/[id]/page.tsx:74 (InfoItem value: ReactNode) — next build local verde e preview Vercel READY (antes Error 13s). Bloco B fechou o gap estrutural: root typecheck inclui web + scripts/ci/check-entrypoint.mjs como gate no security-gate (prova positiva e negativa nos paths críticos do entrypoint.sh, que havia causado P0 com ./node_modules/.bin/prisma fora da imagem). Bloco C reconciliou a suíte: unit 60/60 (11 arquivos, incluindo T428/T431); integração 2 falhas em routes.test.ts são pré-existentes no origin/main (sem DB/Redis local — git stash + checkout main + vitest → mesmos 2 falhos; não é regressão do T435). Bloco D trocou o hero client (useEffect) por Server Component (app/page.tsx busca total de clubs/competitions/rankings com revalidate 3600; HeroSection recebe initialTotals como prop e renderiza String(total) ou fallback em crescimento — número real no HTML, sem layout shift, como no /map). Bloco E consolidou a tabela T433 (fase → commit/PR) no corpo do PR #99 e esta nota.
Evidência: next build verde (10.5s) + pnpm typecheck (api+domain+web) 0 + migration-drift verde + security-gate verde + preview Vercel READY + smoke prod (hero 3857/1263/2 no HTML, /players/[id] com sourceUrl clicável, /map 113 de 3857 inalterado). PR #99 merged (ae3e057); PR #97 fechado como superseded; main com _prisma_migrations 15 linhas e API health/clubs/rankings/matches 200.
Próximo: WS-L 1ª camada (banner + prova de consentimento) → M2.

### [2026-09-13] Decisão: D-2026-09-13-t431-fechamento — T431 parcial: stadiums entregue (#95), players adiado por instabilidade Wikidata

Motivo: FASE 3 (stadiums) executável offline-first foi entregue e merged (#95): assessment SPARQL contou **3.606 estádios com P625** (> 100 threshold); em vez de criar script duplicado, o `seed-stadiums.ts` (T423) foi elevado ao padrão dos irmãos (`sourceUrl` via `WIKIDATA_ITEM_URL_BASE` + override `sourceUrlBase` antes morto, guard de importação, 6 testes com repo fake: sourceUrl/dedup/anti-órfão/idempotência). ORDER BY deliberadamente NÃO aplicado no seed (documentado no código: transitiva Q483110 + ORDER BY = HTTP 504; amostragem + dedup QID resolve).
FASE 1 (players DRY-RUN) **adiada por causa externa**: endpoint SPARQL pesado (DISTINCT + label service, 1000 linhas) retornou 502/429/timeout em 4 janelas distintas (~1h); retry/backoff comportou-se conforme o contrato em todas (throw limpo, zero escrita parcial). Endpoint trivial responde 200 — é carga da query, não queda do serviço. Decisão: não queimar mais quota nem mascarar com timeout maior; players novos entram em janela futura (idempotente, sem risco).
Evidência: vitest 34/34; tsc 0 (cliente PG); lint 0; prettier ok; CI do #95 verde incl. migration-drift; PR #95 merged.
Fora do escopo (inalterado): enrich-coords, competições, migrations, WS-C/WS-L. Próximo: WS-C restante (drill-down/perfis/busca) — players novos viram janela FASE 1 quando o endpoint estabilizar.

### [2026-09-13] Decisão: D-2026-09-13-t432-higiene — T432: working tree limpa (graft-tools commitado, notas descartadas com justificativa)

Motivo: ao fechar o T430 restaram 5 itens não-commitados violando "working tree limpa". Destino decidido por conteúdo, não por inércia:

- `scripts/graft-tools/` (graft-dead.mjs, graft-impact.mjs, README.md) → **COMMITADO**: ferramentas reais, testadas localmente (dead:1 verdadeiro + 3 dead-files verificados via grep; impact com blast radius exato em mudança sintética). Origem: ideias do codebase-memory-mcp adaptadas aos dados do `graft/` (decisão consciente de não instalar segundo indexador).
- `T430-CLOSING-NOTES.md` → **DELETADO**: checklist integralmente resolvido (PR #91 merged, entrada T430 em DECISOES, deploy com entrypoint verificado). Registrar checklist morto seria ruído.
- `T430-POST-MERGE-ACTIONS.md` → **DELETADO**: item 2 (CSP) resolvido via PR #92 merged; item 3 (scaffold vago) sem conteúdo acionável; item 1 (hero stats hardcoded) permanece vivo e é carregado adiante como follow-up T-vis-01 (não se perde nada: está rastreado na auditoria visual).
  Evidência: re-run `graft-dead --json` idêntico ao baseline validado (dead:1, suspect:206, sameFileRef:38, methodRef:124, deadFiles:3); `graft-impact` funcional; tsc/lint/prettier verdes; CI do PR como gate.
  Carry-forward explícito: **hero stats hardcoded na home** (`HeroSection` 10/3/2 vs 3857/895/2396) continua aberto — candidato a fast-follow (padrão T428-FASE 1, meia hora).

### [2026-09-09] Decisão: D-2026-09-09-t430-fechamento — T430 fechado: migration automation + drift check + job-runnability

Motivo: o incidente P2022 (coluna no schema sem migration em prod, ~30min de `/clubs` 500) exigia automação, não disciplina manual. Entregas: entrypoint com `migrate deploy` fail-fast (D2: `set -e`, SKIP_MIGRATIONS só-incidente, forward-only, advisory lock notado); job `migration-drift` no CI (baseline dump + resolve pinado + deploy + diff, com 1 exceção documentada); job-runnability (scripts na imagem + dry-run in-container sem upload).
Evidência: baseline md5 idêntica origem→repo; scratch validou resolve 8 + deploy das 4 + colunas; entrypoint real executado (migrate limpo + boot até EADDRINUSE esperado); drift job verde no CI + teste negativo vermelho-proposital (PR #90, `driftProbe`, fechado sem merge); deploy prod com entrypoint: `_prisma_migrations` 15 linhas, API health/clubs/rankings/matches 200, zero 5xx.
Notas registradas nesta entrada: (1) advisory lock do Prisma guarda deploy concorrente (1 réplica hoje — revisitar ao replicar); (2) revert de código não reverte migrations aditivas (colunas órfãs seguras); (3) SKIP_MIGRATIONS=true exige registro em DECISOES quando usado; (4) `apps/api/Dockerfile` morto removido (referenciava entrypoint inexistente; Railway usa `./Dockerfile`); (5) devDeps no stage prod (prisma/tsx em runtime) é smell registrado, não mexido.
Próximo: T431 (janela players/stadiums) → WS-C restante → WS-L 1ª camada → triagem Dependabot.

### [2026-09-09] Decisão: D-2026-09-08-migration-history-debt — Histórico de migrations indeployável do zero (dívida documentada)

Motivo: T430 FASE 1 provou que `20260720000001_phase2_final` foi gerada como baseline completo e conflita com `20260716154544_init` (`relation "clubs" already exists`, P3018/P3006 em banco vazio) — por isso o projeto sempre usou `db push` + SQL manual + `resolve`. Decidido (Q2): DEIXAR COMO ESTÁ. Squash/re-baseline tocaria checksums com linhas `t` (applied) em produção e faria o deploy recusar tudo — risco alto, benefício estético.
Caminho canônico de provisionamento: baseline dump (`apps/api/prisma/baseline/`, imutável por convenção) + `resolve --applied` pinado + `deploy`. Migrations aplicadas são imutáveis (checksum é feature). Exceção registrada uma única vez: guarda `DO $$` em `20260905_stadiums_postgis` (nunca aplicada via deploy em nenhum ambiente — só `db push` em CI e SQL manual em prod); sem ela, o entrypoint fail-fast impediria o boot em bancos sem PostGIS.

### [2026-09-08] Decisão: D-2026-09-08-t429-fechamento — T429 fechado: sourceUrl 100% em produção (Doer-first)

Motivo: baseline prod mostrava `sourceUrl = 0%` em clubs (1889), competitions (895) e players (2396). Execução integralmente pelo Doer sob a diretriz D-2026-09-08-atribuicao-doer-first (zero ações do Operador no round): merge do #87 via `gh`, scripts rodados em prod via `railway ssh` no container da API, smoke via `curl` + SQL.
Evidência (antes → depois, banco de produção Railway):

- clubs: 1889 → 3857 total (1968 novos via --apply + 10 backfilled); `sourceUrl` 0 → 3847 (100% das linhas com qid; 10 linhas sem qid, impossíveis de preencher — dado honesto)
- competitions: 895 → 1263 total (368 novos + 334 backfilled); `sourceUrl` 0 → 1260 (100% das com qid; 3 sem qid)
- players: 2396 total, `sourceUrl` 0 → 2396 (100%; SPARQL da Wikidata instável na janela — 502/429/timeout — então o backfill SQL determinístico cobriu as linhas existentes; ETL cobre linhas novas em round futuro)
- API: `GET /clubs?limit=1` 200 com `sourceUrl` presente; health 200; zero 5xx nos logs Railway durante os jobs
  Método híbrido (documentado, não improvisado): (1) scripts `--apply` para linhas novas + backfill das linhas na janela do fetch; (2) `UPDATE ... SET "sourceUrl" = base || "qid" WHERE "qid" IS NOT NULL AND "sourceUrl" IS NULL` para o resíduo fora da janela (valor byte-idêntico ao que o script escreve; contagem antes/depois auditada por tabela). Rollback pré-documentado e não acionado: `UPDATE ... SET "sourceUrl"=NULL WHERE "importedFrom"='wikidata'`.
  Nota operacional: queries ad-hoc em psql via `railway ssh` exigem escape `\"` para identificadores case-sensitive (ver D-railway-ssh-quotes); sem escape o Postgres folda para minúsculo e a query falha ou mira a coluna errada.
  Addendum N1 (T430, condição de registro do review T429): (a) decisão do SQL direto + motivo — SPARQL de players instável na janela (502/429/timeout sustained ~20min) bloqueava o `--apply`; o UPDATE determinístico cobre exatamente as linhas existentes com `qid` sem tocar em mais nada; (b) transporte base64 dos 4 scripts (3 ingest + lib) para o container com validação byte-a-byte (md5 origem == destino em todos); (c) regen do Prisma Client in-container com backup prévio em `/tmp/prisma-client-backup` (client da imagem estava stale, sem `sourceUrl` — sem o regen, os `createMany`/`update` com o campo falhariam em validação client-side).
  M1 segue NÃO declarado (faltam WS-C restante + WS-L). Próximo: T430 (migration automation).

### [2026-09-06] Decisão: D-2026-09-06-image-hardening — Hardening defensivo de Image Optimization + CSP libera tiles OSM

Motivo: auditoria do código real (via graft + leitura direta) provou que `apps/web` tem **zero `<Image>`** — ClubCard/herói/perfil usam iniciais CSS e ícones lucide; tiles do mapa são `<img>` puro do Leaflet (bypassam o otimizador por construção); k6 mira só `/api/v1` (nunca toca `/_next/image`); sem config ZAP no repo. Logo, eventual consumo Vercel de Image Optimization **vem de fora deste código** (outro projeto/deploy/stale) — passo do Operador identificar a origem no dashboard antes de qualquer "mitigação" de produto. Fase 3 do plano (sharp/ETL) adiada como prematura; AlmanaqueImage adiado (sem imagem real para justificar).
Mudanças (reversíveis, `apps/web/next.config.ts` apenas): bloco `images` defensivo — `minimumCacheTTL` 30d, `deviceSizes [640,1080,1920]`, `imageSizes [64,128,256]`, `formats avif/webp`, `remotePatterns` whitelist mínima (`upload.wikimedia.org` — fecha o otimizador como proxy aberto), `unoptimized` via `DISABLE_IMAGE_OPTIMIZATION=1`; CSP `img-src` passa a incluir `https://a|b|c.tile.openstreetmap.org` (hosts explícitos, sem wildcard — Leaflet usa `{s}.tile.openstreetmap.org` com subdomínios default abc, cf. `WorldMap.tsx:21`; tile layer é `<img>`, sem fetch → `connect-src` inalterado). Sem esse fix o mapa quebrava em produção (CSP anterior só permitia `self/data:/blob:`).
Alternativas consideradas: (a) wildcard `*.tile.openstreetmap.org` — descartada por abrir subdomínio arbitrário; hosts explícitos cobrem os 3 usados; (b) mexer no ETL/criar AlmanaqueImage agora — descartado como prematuro.
Evidência: `tsc --noEmit` exit 0; `pnpm lint` 0 erros (3 warnings pré-existentes em arquivos não tocados); `prettier --check` ok; boot `next dev` ok; `GET /_next/image?url=https://malicious.example/...` → **400** (proxy fechado); header CSP ao vivo contém os 3 hosts OSM; boot com `DISABLE_IMAGE_OPTIMIZATION=1` ok.
FECHAMENTO 2026-09-07: merged (`261aa62`); smoke em produção OK — `almanaquedosclubes.com/map` renderiza tiles OSM (zoom mundial e cidade, popup funcional); CSP de produção contém `a/b/c.tile.openstreetmap.org`.
Aprendizado metodológico: hipóteses de consumo/custo devem partir da **auditoria do código real**, não do produto descrito no Escopo — o PLANO_MESTRE já marcava o produto como "ainda não é o Almanaque" (5% features core). Assumir escudos/carrossel/home densa sem verificar violou "nunca assumir que uma solução existente é a melhor" e o DoD do menor teste relevante.

### [2026-09-07] Decisão: D-2026-09-07-t428-fechamento — Fechamento do T428 (5 fases + FASE 9) — WS-C/WS-D/ETL

Motivo: PR único do T428 fecha 5 fases (FASE 1–5) + reconciliação, auditável por counts reais em banco de teste (1.626 clubes · 892 competições · 2.458 jogadores, 100% proveniência, idempotência 3× provada, 113 coords em produção). M1 continua **não declarado** — faltam T429 (seed prod, operacional), WS-C restante (drill-down/perfis/busca), WS-L 1ª camada.
Alternativas consideradas: (a) PRs por fase — rejeitada por rebase artificial + risco de cherry-pick caro; (b) PRs por escopo de negócio (WS-C / WS-D / ETL) — não-escolhido porque o review por checkpoint (1→5) já mitigou risco de PR monstro; (c) fechar só o código e reconciliar em PR à parte — não-escolhido porque a reconciliação **é** o que torna o round auditável, e DECISOES viaja por PR (regime PR-only com enforce_admins).
Evidência: gates em ambiente equivalente ao CI (cliente Prisma PG gerado) — `tsc --noEmit` 0, `pnpm lint` 0, `prettier --check` ok, `vitest` 28/28. Counts reais: ingest-clubs 1.626 (teste)/113 (produção pós-enrich), ingest-competitions 892, ingest-players 2.458 — todos com `sourceUrl` 100%.

### [2026-09-07] Decisão: D-2026-09-07-t426-fechamento-metodologia — Aprendizados de método do T426

Motivo: dois aprendizados viram **padrão de casa** após o T426:

1. **Evidência válida = ambiente equivalente ao CI.** Stash-prova em ambiente diferente (cliente Prisma SQLite gerado localmente) não vale para passos do CI que geram cliente PG (e.g. typecheck no `security-gate`). Erro original: afirmei "3 erros tsc pré-existentes no main" com cliente errado; retratação na mesma mensagem após gerar o cliente PG e ver exit 0. Padrão daqui em diante: reproduzir o passo local com o **mesmo provider/schema** que o CI usa.
2. **`no-undef`/tipos DOM em Node → tipar estruturalmente.** O ESLint root (globals Node, sem lib DOM) sinaliza `RequestInit` (tipo) como variável indefinida. Solução rejeitada: `/* eslint-disable no-undef */` (fabrica verde). Solução aceita: tipo estrutural local `FetchInit = { headers: Record<string, string> }` (mais `signal?: AbortSignal` quando o helper injeta o timeout). Custo: limita a API; virtude: se um dia `fetchWithTimeout` precisar de `method`/`body`, o `FetchInit` força a extensão explícita (erro de compilação, não silenciosa).
   Aplicação: T428 generalizou o padrão para todos os 3 scripts (clubs/competitions/players) e para o worker via helper compartilhado.

### [2026-09-07] Decisão: D-2026-09-07-schema-migration-gap — Incidente P2022 (mitigação sistêmica = T430, não T429)

Motivo: o merge do #85 (T426, `aec2750`) adicionou a coluna `sourceUrl` ao `schema.prisma` e ao `migration.sql`, mas o deploy de produção do Railway **nunca aplicou a migration**. Sintoma: 30 minutos após o deploy, `GET /api/v1/clubs?limit=1` → **HTTP 500 `P2022`** (coluna inexistente). Diagnóstico: o `security-gate` no CI roda `prisma db push` no Postgres de **teste** (cria a coluna lá), mas o deploy em produção é estático e não há step de `migrate deploy` no Railway.
Alternativas consideradas: (a) `prisma migrate deploy` no start do container Railway (precisa DB admin reachable) — funciona mas acopla deploy a DB; (b) step manual do Operador pós-merge (o que aconteceu) — não escala e foi esquecido; (c) `prisma migrate diff` no CI contra banco de staging — versão executada no T430.
Decidido: **a partir de agora, qualquer PR com migration tem o T430 (ou seu equivalente manual documentado + smoke pós-deploy) como pré-requisito**. T430 sobe na fila imediatamente se outro WS-C precisar de migration antes. **T429 (seed prod) não repete o incidente porque é INSERT de dados via job existente, não alteração de schema.**
Evidência: incidente resolvido em produção via `railway ssh --service Postgres -- psql -c "ALTER TABLE ... ADD COLUMN"` (4 tabelas), com gotcha documentado (SSH do Railway stripa aspas duplas — ver D-railway-ssh-quotes); 3 endpoints da API validados 200 após fix.

### [2026-09-07] Decisão: D-2026-09-07-railway-ssh-quotes — Túnel SSH do Railway stripa aspas duplas

Motivo: durante a correção do incidente P2022, o comando `ALTER TABLE clubs ADD COLUMN "sourceUrl" TEXT` executado via `railway ssh --service Postgres -- psql -c '...'` criou a coluna com nome `sourceurl` (minúsculo, folded) em vez de `sourceUrl` (case-sensitive esperado pelo Prisma). Investigação: probe `SELECT 1 AS \"xY\"` retornou header `xY` (não `xy`) — com escape `\` antes das aspas duplas, o shell remoto (sh) preserva as aspas para o psql; sem o escape, o sh do Railway come aspas. Resultado: 4 colunas nasceram com nome errado e o `RENAME COLUMN ... TO \"sourceUrl\"` reverteu com retry para o túnel transiente ("Failed to fetch").
Mitigações:

1. **Descobrir a regra empiricamente** (probe com identificador quoted) antes de DDL crítico.
2. **Preferir `prisma migrate deploy` via container da API** (não via SSH no Postgres) para migrations versionadas — o container da API está na rede interna Railway e tem as tools Prisma já instaladas; sem SSH, sem gotcha de shell.
3. Workaround documentado: escape `\"` para aspas duplas em comandos via `railway ssh ... -- psql -c '...'`.
   Trigger de revisão: se Railway alterar o transporte do SSH ou o shell default, revalidar com probe antes de qualquer DDL em produção.

### [2026-09-07] Decisão: D-2026-09-07-helper-resiliencia-localizacao — Helper vive em `apps/api/scripts/lib`; migração para `packages/` é follow-up

Motivo: o helper `fetchWithRetry` (T428 FASE 2) vive em `apps/api/scripts/lib/http-resilience.ts` e é consumido por (1) `ingest-clubs/competitions/players` (apps/api) via path relativo e (2) `wikidata-connector` (worker) via path relativo **cross-package** (`apps/worker/src/jobs/` → `apps/api/scripts/lib/`). Funciona via tsx porque o worker não compila para `dist/`; é frágil se o worker ganhar bundler próprio.
Decidido: **aceitar acoplamento cross-package enquanto o cenário permanecer o atual**; migrar o helper para `packages/http-resilience/` (novo pacote interno) **quando**:

1. o worker ganhar build/bundler próprio, **ou**
2. aparecer um 3º consumidor do helper.
   Até lá, o risco é documentado e o guard do path é trivial de auditar.

### [2026-09-07] Decisão: D-2026-09-07-segredos-por-categoria — Política de segredos + retratações do incidente `.env`/Vercel

Motivo: durante o T426 → T428, um token morto (`GITHUB_TOKEN`, 40 chars) persistia no registry `HKCU:\Environment` do Windows da máquina do Operador — antes do registry ser limpo, o token sabotava `gh` em qualquer subshell. O Operador também removeu a chave equivalente da Vercel (que não era consumida pela integração OAuth nativa Vercel↔GitHub; era pura superfície de ataque). O ciclo deixou 2 aprendizados:

1. **Segredos por categoria de superfície:** cada plataforma (Windows registry, `.env` local, `.env.local` em `apps/web`, Vercel env, Railway env, GitHub Actions secrets) tem seu próprio ciclo de vida. Mapear quem é consumidor de cada um e manter o paralelo.
2. **Workaround não é fix:** o `Remove-Item Env:GITHUB_TOKEN` por chamada é aceitável como mitigação transitória, mas o fix permanente é **reiniciar o processo hospedeiro** (a variável herdada no `opencode` continua presente até o processo morrer). Registrar em hygiene runbook.
   Retração (condução): durante o round, tentei comparar o estado do CI via stash em ambiente local com cliente Prisma SQLite — a evidência gerada **não era equivalente** ao CI (cliente PG). A conclusão "main está vermelho" estava errada; a real é "o gate pegou defeito real do meu PR". A retratação foi registrada na mesma mensagem em que a evidência corrigida apareceu. Aprendizado: validar equivalência de ambiente **antes** de tirar conclusões, não depois.

### [2026-09-07] Decisão: D-2026-09-07-proveniencia-convencional — Oficializar convenção de proveniência vigente; sourceUrl canônico

Motivo: inventário T426 (Passo 0) provou que `data_sources`/`entity_revisions` **não existem** no schema (o STATUS CONSOLIDADO afirmava que existiam sem popular — corrigido no PLANO_MESTRE em T426). A convenção construída por T420–T425 (`qid` unique + `importedFrom` + `importedAt`) já entrega dedup por chave estável + proveniência + trilha temporal.
Decidimos oficializar a convenção vigente em vez de criar `data_sources`/`entity_revisions` (YAGNI; tabela órfã sem ganho claro). Gap real de auditabilidade fechado com `sourceUrl String?` adicionado a Club/Player/Competition/Stadium (Match já tinha) — sem NOT NULL (Wikidata nem sempre expõe URL; ausência é dado, não defeito). Tabelas de governança adiadas até necessidade concreta não atendida pela convenção.
Alternativas consideradas: (a) criar `data_sources` + FK — descartada por adicionar complexidade sem ganho (o campo `importedFrom` já enumera as fontes); (b) manter sem `sourceUrl` — descartada por impedir o usuário de auditar a fonte (viola princípio 1.3).
Evidência: migration `20260907_add_source_url` (+ down.sql); `prisma validate` ok nos dois schemas; testes `tests/unit/ingest/clubs-wikidata.test.ts` 9/9; counts reais no corpo do PR T426.

### [2026-09-02] Decisão: D-2026-09-02-path-b-5-executada — T391 — Caminho B (5ª exceção): merge da branch consolidada chore/redis-localhost-forense

Motivo: Operador autorizou merge imediato (Caminho B #5) — manter o bug da fila Redis ativo em produção (emails de recuperação quebrados) era pior que o merge; instrução permanente "Prossiga" + 4 precedentes + R388 aprovado. Merge via PR #47 (squash) → commit `b180bc8` em main.

Before (proteção de main): GET /branches/main/protection → required_status_checks=[security-gate] strict=true; required_approving_review_count=0; enforce_admins=true; allow_force_pushes=false; allow_deletions=false (JSON em docs/protection-before.json).
Execução: status check `security-gate` ausente do PR (CI ainda não publica o check-run no PR) → exceção Caminho B #5: relaxou APENAS required_status_checks (mantendo enforce_admins=true), merge, restauração imediata (security-gate strict, approvals=0, enforce_admins=true), sem force push/deletion.
After: proteção restaurada na mesma sessão (idêntica ao before).
Verificação pós-deploy: railway health 200; web 200; /clubs 200; POST /api/v1/auth/forgot-password → 200 (sem erro CSRF); boot fresco sem ECONNREFUSED 127.0.0.1:6379 (BullMQ agora usa REDIS_URL); Vercel Ready.
Nenhuma migration aplicada. RLS permanece INERTE (T390 pendente Operador). chore/t387-verify-hardening superseded.

### [2026-09-02] Decisão: D-2026-09-02-f09-f15-encerramento — F09 (CI/CD) e F15 (gaps de produto) fechadas

Motivo: estado consolidado (D-2026-09-02-f09-f15-estado-consolidado + D-2026-09-02-regime-padrao-efetivo).

Estado:

- **F09 (CI/CD) fechada quanto aos gates de segurança**: `security-gate`/`gitleaks`/`dependency-audit` verdes; regime padrão (branch → PR → CI verde → merge) operacional (D-2026-09-02-regime-padrao-efetivo). Pendência de job `deploy-docker-api` (redundante/quebrado) tratada em T396.
- **F15 (gaps de produto) fechada**: hero com números reais/auditáveis (T394); contas de teste identificadas + script de soft-disable (T395).

Pendências do Operador:

1. Executar o cleanup das 2 contas de teste (T395 `--apply`).
2. Decisão CTA/linha "em crescimento" no hero.
3. T390 (app_user + RLS efetiva).
4. Revogação do token antigo.

Próximo marco: depende de autorização do Operador.

### [2026-09-02] Decisão: D-2026-09-02-v5c-rls-inerte — V5 fechado como RLS instalada mas INERTE em produção (V5-C)

Motivo: A forense (T389) provou que a pré-condição (a) do caminho V5-A é falsa: não existe role `app_user` e a API conecta como `postgres` (superusuário). Como o PostgreSQL dispensa RLS para superusuário, a RLS instalada (`sessions` com `relrowsecurity=true` + `relforcerowsecurity=true`) está **INERTE** em produção. A regra de decisão autorizada era "V5-A se app_user verificável; V5-C se não" — logo, aplicar V5-C é executar a regra já autorizada, não uma decisão nova.

Forense (produção, 2026-09-02):

- `pg_roles`: apenas `postgres` (rolsuper=true) + roles padrão `pg_*`; **sem `app_user`**.
- `current_user`/et `session_user` = `postgres`.
- `sessions` (pg_class): owner=`postgres`, `relrowsecurity=true`, `relforcerowsecurity=true` (migrações `20260824/25` aplicadas manualmente).
- `role_table_grants` (sessions): somente `postgres` (SELECT/INSERT/UPDATE/DELETE/etc).

Conclusões:

1. Gate **D-2026-08-24-rls-enforcement-exige-app-user NÃO aberto**.
2. RLS de produção = **instalada mas INERTE** (conexão superusuária dispensa RLS). A defesa em profundidade não está ativa; o isolamento efetivo atual é o da camada de aplicação (`withRlsContext` + validações RBAC), validado em T387.
3. **Risco operacional**: qualquer troca futura de conexão para role não-superusuária exige validação prévia em banco de teste (matriz A≠B), sob pena de quebrar auth.
4. **T390 (app_user + switch de conexão)** fica **pendente de autorização explícita do Operador** — é mudança de credencial de produção (CREATE ROLE + grants + `DATABASE_URL` + redeploy).

Alternativas consideradas:

- Registrar V5-A como cumprido sem app_user (rejeitada: falsa sensação de segurança; viola "nenhuma conclusão sem evidência real").
- Construir app_user agora sem nova autorização (rejeitada: credencial de produção + grants + redeploy = autoridade do Operador).
- Aplicar V5-C (registro honesto) e escalonar app_user como T390 (escolhida).

### [2026-09-02] Decisão: D-2026-09-02-t388-redis-url — T388: BullMQ passa a usar REDIS_URL (fail-fast em produção)

Motivo: forense (T388) mostrou que `apps/api/src/services/queue.ts` (BullMQ) montava a conexão apenas com `REDIS_HOST`/`REDIS_PORT` (default `localhost:6379`), ignorando `REDIS_URL` — em produção a fila caía em `127.0.0.1:6379` (ECONNREFUSED), afetando as filas etl/email/export (incl. envio do email de recuperação de senha).

Correção: usar `REDIS_URL`/`REDIS_PRIVATE_URL` (parse de URL → `{host, port, username, password}`) quando presentes + **fail-fast em produção** (`NODE_ENV=production` sem `REDIS_URL`/`REDIS_HOST` → `throw`). Fallback `host/port` apenas fora de produção. Sem credenciais no código (URL via env).

### [2026-08-28] Decisão: D-2026-08-28-path-b-4-executada — T386 — Caminho B (3ª exceção) executado: merge do pacote de hardening (5 branches) sem Actions

Motivo: Operador instruiu "Prossiga com os próximos passos do projeto" (D-2026-08-28-path-b-4-autorizacao-implicita) após ESCALATE entre Caminho A e Caminho B #3. Terceira exceção governada nos moldes de D-2026-08-24 e D-2026-08-27 (T380), para entregar em produção o pacote de hardening T382–T385.

Alternativas consideradas: (a) aguardar Caminho A — descartada por ordem do Operador; (b) exceção com escopo fechado (5 branches) e restauração imediata — escolhida.

Evidência:

- Proteção BEFORE: `security-gate` (strict), `approvals=0`, `enforce_admins=true`, sem force/delete.
- Relaxamento: removidos `required_status_checks` e `required_pull_request_reviews` (necessário para push direto); `enforce_admins=true` mantido, sem force/delete.
- Merges (git local, janela de relaxamento) na ordem de dependência:
  - `feat/plano-reconciliation` → fast-forward (main avança para `a9e78f0`, T381).
  - `feat/security-regression` → no-ff merge commit `706283d` (T382).
  - `feat/security-config-central` → no-ff merge commit `dad0df9` (T383).
  - `feat/rate-limit-avancado` → no-ff merge commit `614409b` (T384).
  - `feat/request-hardening` → no-ff merge commit `5c49180` (T385). `origin/main = 5c49180`.
- Proteção AFTER: idêntica à BEFORE (restaurada na mesma sessão).
- Produção: **verificada** — Vercel `almanaquedosclubes.com` HEAD → 200; Railway `api.almanaquedosclubes.com/api/v1/health` GET → 200 (uptime fresco = deploy novo do HEAD `5c49180`, hardening T385 ativo). HEAD na API → 405 por design, **não re-habilitado** (nenhum probe de infra falhou).

Observações: **nenhuma migration RLS nova no intervalo** (diff sem `prisma/migrations`); FORCE RLS permanece OFF (gateado por `D-2026-08-24-rls-enforcement-exige-app-user`). Regime PR-only restaurado. Revogação do token antigo e Caminho A seguem pendências do Operador.

### [2026-08-27] Decisão: T381 — Reconciliação do PLANO_MESTRE com o estado real

Motivo: Com a fila técnica de T3xx zerada, reconciliar o `PLANO_MESTRE.md` com a realidade para dar visibilidade real de progresso ao Operador.
Metodologia: cada item cruzado com (a) T3xx executadas, (b) arquivos reais, (c) evidência. `[x]` só com evidência; `[~]` com gap; `[ ]` sem evidência.
Achados principais:

- Estado real: **111 `[x]`, 7 `[~]`, 6 `[ ]`** (o handoff citava "~80 `[ ]`" — premissa incorreta).
- `9.4 Plataforma de deploy` marcada `[x]` (Railway + Vercel em produção, T366–T380).
- `9.9 MANUAL_DO_OPERADOR.md` reescrito (v2.0, T379).
- Seção "Próximas tarefas" do plano marcada como obsoleta (todos os itens já concluídos).
- Gaps reais consolidados em `docs/RECONCILIATION-REPORT.md` §6 (2.7, 2.10, 7.9, 7.10, 9.3, 8.8/8.9, Caminho A, FORCE RLS).
  Evidência: contagem de checkboxes e leitura integral do plano; commits T341–T380 no histórico.
  Observação: o projeto está funcionalmente completo para os marcos Beta/Open Beta; as pendências restantes são decisões do Operador, não implementação.

### [2026-08-27] Decisão: T380 — Caminho B (2ª exceção) executado: merge de 4 branches sem Actions

Motivo: Operador ordenou prosseguir sem o GitHub Actions (bloqueio account-level persiste). Segunda exceção governada nos moldes de `D-2026-08-24-caminho-b-aprovado-operador`.
Alternativas consideradas: (a) aguardar Caminho A — descartada por ordem do Operador; (b) merge sem restauração — descartada por enfraquecer o regime; (c) exceção com escopo fechado e restauração imediata — escolhida.
Evidência:

- Proteção BEFORE: `security-gate` (strict), `approvals=0`, `enforce_admins=true`, sem force/delete.
- Merges (git local, janela de relaxamento): `docs/manual-operador` ff (`c435050`); `feat/ci-hardening` no-ff (`0f85430`); `feat/rls-sessions-policies` no-ff (`1538be3`); `feat/rls-bulk-adoption` no-ff (`bbc5e8d`). `origin/main = bbc5e8d`.
- Proteção AFTER: idêntica à BEFORE (restaurada na mesma sessão).
- Produção: Vercel Ready (`8ux78y2as`, commit novo) + API health 200 (`uptime` fresco = deploy novo do Railway).
  Observações: **nenhuma migration RLS aplicada em produção** (FORCE RLS OFF, gateado por `D-2026-08-24-rls-enforcement-exige-app-user`). Regime PR-only restaurado para branches futuras. Revogação do token e Caminho A seguem pendências do Operador.

### [2026-08-26] Decisão: T376 — Caminho B executado (merges #28/#27/#26 via exceção governada)

Motivo: GitHub Actions bloqueado no nível da conta (falha pré-runner confirmada em T375); Operador autorizou o Caminho B para destravar a cadeia congelada.
Alternativas consideradas: (a) Caminho A (resolver billing) — não escolhido agora; (b) Caminho B (exceção documentada, escopo fechado) — escolhido.
Evidência:

- Proteção BEFORE: `security-gate` (strict), `approvals=1`, `enforce_admins=true`, sem force push/deletion.
- Relaxamento: removidos required checks e reviews; `enforce_admins=true` mantido.
- Merges (git local, durante o relaxamento): `fix/ci-security-gate` ff (`0a7a1d7..b5db076`); `feat/rls-sessions` no-ff (merge commit `ccab894`).
- `origin/main = ccab894` contém: #28 (fix CI Redis + diag + oracle), #27 (T344/T345/T370 + T363 docs), #26 (T363 docs via `7f9a7a1`).
- Proteção AFTER: `security-gate` (strict), `approvals=0` (repo single-contributor), `enforce_admins=true`, sem force push/deletion.
  Observações: revogação do token antigo permanece pendência do Operador. PRs futuros aguardam CI verde ou novo Caminho B/A. Ajuste estrutural: `approvals=0` porque 1 aprovação humana é insatisfatível com um único contribuidor.

### [2026-08-23] Decisão: Marco de produção ratificado pelo Operador (D-2026-08-23-marco-ratificado-operador)

Motivo: Fechar o drift de produção e registrar o estado real do ambiente após os deploys.
Evidência (ratificada com capturas do Operador):

- Vercel Production **Ready** para os commits `0a7a1d7`/`8d52bcb`; `https://almanaquedosclubes.com` → 200 servindo o HEAD novo.
- Railway: `https://api.almanaquedosclubes.com/api/v1/health` → **200** (uptime coerente com o deploy T367), serviço `Almanaque-dos-Clubes`.
- Branch protection aplicada em `main` (T363): `security-gate` required + PR com 1 aprovação + `enforce_admins` + sem force push/delete.
  Observação: a partir de T363, **push direto em main deixa de existir**; o fluxo vira branch + PR aprovado + CI verde. O token usado em T363 deve ser rotacionado após o handoff (foi exposto em texto claro no chat).

### [2026-08-23] Decisão: Cancelar linhagem de reparo de órfãos (D-2026-08-23-cancela-linhagem-orfaos)

Motivo: A linhagem de reparo de órfãos (T322/T358/T360) não tem alvo legítimo no repositório real: `watchlist_entry` e `usuario_midia_interacao` são domínio estrangeiro (mesma contaminação tratada em T349) e as entidades reais (`Session`, `RankingEntry`) usam `onDelete: Cascade`, tornando órfãos de banco impossíveis.
Alternativas consideradas: (a) re-especificar contra tabelas inexistentes — descartada por fabricar escopo estrangeiro; (b) implementar auditoria de integridade sem pedido de produto — descartada por escopo novo sem aprovação; (c) cancelar e limpar artefatos — escolhida.
Evidência: `schema.prisma`/`schema.sqlite.prisma` sem `watchlist_entry`/`usuario_midia_interacao`; `Session.userId` e `RankingEntry.rankingId` com `onDelete: Cascade`. `scripts/deploy-t322.sh` removido; referências limpas em `docs/DEPLOY-INSTRUCTIONS.md`.
Observação: **Não existe run de produção de reparo de órfãos a executar.** Auditoria de integridade lógica (soft delete/stale refs) só como feature futura, se o Operador solicitar explicitamente.

### [2026-08-23] Decisão: Auditoria de integridade lógica — NÃO implementar (D-2026-08-23-auditoria-integridade-nao)

Motivo: O item 2 da ESCALATE pedia decisão sobre auditoria de integridade lógica como feature futura; o padrão declarado era "não".
Alternativas consideradas: (a) implementar agora — descartada por escopo novo sem pedido de produto; (b) aplicar padrão "não" e registrar — escolhida.
Observação: Reabrir apenas por solicitação explícita do Operador no futuro.

### [2026-08-23] Decisão: T349 — Executar quarentena (remoção de uml.ts e rbac-matrix.ts)

Motivo: Aprovação implícita da exclusão já consolidada no PRD.md §9 e na lista de quarentena aprovada em T348-v2. Os dois arquivos contaminados (domínio de outro projeto: Album/Streak/Favorite/ApiKey/PipelineRun e permissões album/favorites/streak) estavam exportados pelo barrel sem consumidores.
Alternativas consideradas: (a) manter os arquivos marcados como "não-fonte" — descartada por deixar superfície pública contaminada e risco de colisão de nomes (`Subscription`/`Billing`); (b) remover apenas exports do barrel — descartada por deixar os arquivos órfãos; (c) remover arquivos + exports — escolhida.
Evidência:

- `git rm` de `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts`; removidos os `export *` das linhas 16-17 de `packages/domain/src/index.ts`.
- Grep de imports contaminados (Uml*/Album/Streak/Favorite/PipelineRun/ApiKey/rbac-matrix/uml) em apps/ e packages/: zero (as ocorrências de `isApiKeyMissing` em workers são checks de conectores externos, não o tipo `ApiKey`).
- `pnpm typecheck` exit 0; domain 4/4; api unit 22/22.
  Observação: Nenhuma alteração em apps/api ou apps/web. A documentação de referência (`docs/UML-GAP-ANALYSIS.md`, `docs/UML-QUARANTINE-LIST.md`) permanece para consulta futura.

### [2026-08-22] Decisão: T348-v2 — Gap analysis do UML e lista de quarentena de símbolos contaminados

Motivo: Destravar a fase F12 com uma análise ancorada nas fontes autorizadas (PRD.md consolidado em T347, schema.prisma, rbac.service.ts), classificando cada símbolo de `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts` em EXISTENTE / PARCIAL / FALTANTE-ESCOPO / FORA-ESCOPO / CONTAMINANTE.
Alternativas consideradas: (a) adoção incremental dos arquivos — descartada por 100% do conteúdo ser contaminante, conflitante ou sem consumidor; (b) remoção imediata nesta tarefa — descartada por violar o escopo docs-only; (c) gap analysis + lista de quarentena para remoção em tarefa futura de código — escolhida.
Evidência:

- Grep de consumidores: nenhum import em `apps/` usa símbolos de `uml.ts`/`rbac-matrix.ts`; barrel `packages/domain/src/index.ts:16-17` é a única superfície exposta.
- Classificação: 9 EXISTENTE, 28 PARCIAL, 8 FALTANTE-ESCOPO, 5 FORA-ESCOPO, 24 CONTAMINANTE (ver `docs/UML-GAP-ANALYSIS.md` §7).
- Quarentena especificada com caminho+linha+motivo+prioridade em `docs/UML-QUARANTINE-LIST.md`.
  Observações:
- Recomendação global: remover `uml.ts` e `rbac-matrix.ts` inteiros + 2 linhas de export do barrel, em tarefa futura de código com verificação `pnpm typecheck` + `pnpm test` + grep de imports.
- Gaps legítimos (FALTANTE-ESCOPO) viram backlog futuro via migration aditiva, nunca por importação dos arquivos contaminados.
- Execução da remoção permanece pendente da confirmação formal do Operador ao ESCALATE (quarentena).

### [2026-08-22] Decisão: T347 — Reconciliação documental ancorada no HEAD 7a50d99; uml.ts e rbac-matrix.ts declarados contaminados

Motivo: O estado do protocolo divergia do repositório real (evidências citavam commit `f0b5c87`, inexistente no git). Auditoria localizou em `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts` entidades de outro projeto (Album, AlbumItem, Streak, Favorite, ApiKey, PipelineRun; permissões `favorites:*`, `album:*`, `collection:streak:*`), exportadas pelo barrel mas sem consumidores em `apps/` e sem correspondência em `schema.prisma`, no Discovery ou no `rbac.service.ts` real.
Alternativas consideradas: (a) adotar o UML contaminado como fonte de verdade — descartada por incorporar produto estranho ao escopo; (b) remover os arquivos imediatamente — descartada por ser mudança de código fora do escopo docs-only e depender de aprovação de quarentena; (c) documentar com fontes reais e declarar a contaminação — escolhida.
Evidência:

- `git cat-file -t f0b5c87` → inválido; HEAD real `7a50d99` (árvore limpa).
- Glob `**/*UML*.md` → vazio (`UML.md` não existe no repo).
- Grep: entidades estrangeiras aparecem apenas em `packages/domain` (uml.ts, rbac-matrix.ts).
- `rbac.service.ts` real: roles `admin/pro/free`, 19 permissões; `rbac-matrix.ts` contradiz com permissões de álbum/streak/favoritos.
  Observações:
- Criados `docs/PRD.md`, `docs/UML-DIAGRAMS.md`, `docs/RBAC-MATRIX.md`, `docs/RLS-POLICIES.md`, `docs/ARCHITECTURE-CATALOG.md`; `docs/CRITERIOS_DESENVOLVIMENTO.md` permaneceu inalterado (não foi criado `docs/DEV-CRITERIA.md` paralelo).
- RLS documentada como SPEC PENDENTE (T344/T345 bloqueadas por ambiente PostgreSQL de teste).
- Quarentena/remoção dos exports contaminados será tarefa de código futura, após resposta do Operador ao ESCALATE e execução de T348-v2 (gap analysis do UML com fontes autorizadas).

### [2026-08-12] Decisão: Instalar @fastify/compress (gzip + brotli) — Fase 13.1

Motivo: Redução de ~70% no payload de respostas JSON, melhora LCP e tempo de carregamento. Marcado como 🔴 no ROADMAP.md, esforço 1h.
Alternativas consideradas: (a) proxy reverso (Cloudflare) — descartada por só funcionar em produção e pós-domínio; (b) compressão nativa do Node — descartada por não ter negociação de encoding automática.
Evidência:

- `@fastify/compress@9.2.0` instalado, registrado `{ global: true, threshold: 1024, encodings: ['gzip', 'deflate', 'br'] }`
- Teste real: resposta /clubs?limit=20 de **3.542 bytes → 996 bytes** (-72%)
- Typecheck ✅ | Sem alteração de lógica de negócio
  Observação: `threshold: 1024` evita comprimir respostas muito pequenas (health, errors), onde o overhead de compressão não compensa.

### [2026-08-12] Decisão: T003 — Executar E2E + k6 e fechar Fase 8

Motivo: Fase 8 itens 8.3 (E2E) e 8.7 (k6) estavam `[~]` por falta de execução evidenciada. T003 rodou ambos com infraestrutura real.
Resultados (evidência executável, 2026-08-12):

- **Playwright E2E:** 5/5 passando (home, navegação /clubs, login, registro, 404). Correção: `playwright.config.ts` baseURL 3000→3001 (apontava para a API, não para o frontend Next.js).
- **k6 load-test (200 VUs, 3m30s):** 48.850 reqs, **0% erros**, p95=4.5ms. Check de login ajustado para aceitar 401 **ou 429** (rate-limit de brute-force ativo é comportamento esperado, não falha).
- **k6 stress-test (1000 VUs, 7min):** 1.559.595 reqs, **0% erros**, p95=78ms, **3.710 req/s** sustentados.
- **Brute-force login validado em produção-like:** 5 tentativas 401 → 6ª retorna 429 com lockout de 1h.
  Mudanças de suporte:

1. **`env.ts`:** adicionada flag `RATE_LIMIT_DISABLED` (desliga rate-limit global por IP para k6 de máquina única; **não** afeta brute-force de login, que é por IP+email).
2. **`app.ts`:** rate-limit global condicionado a `!env.rateLimitDisabled`.
3. **Cache Redis em clubs:** p95 de 5ms sob 200 VUs (item 6.3 validado em carga).
4. **Migration PostgreSQL baselineada:** 4 migrations marcadas como aplicadas (`migrate resolve`); `prisma migrate status` → "up to date". Descoberta: as 17 tabelas já existiam no PG.
   Limitação documentada (infra, não código): conexão **host Windows → container PostgreSQL** falha com P1000 (auth) por bug do proxy de porta do Docker Desktop; dentro da rede Docker funciona perfeitamente. Testes rodaram contra SQLite sandbox (oficial, `db push` sincronizado). Isso não bloqueia produção (deploy é 100% em containers).

### [2026-08-11] Decisão: T002 — Correção de gaps de qualidade (lint + typecheck + testes)

Motivo: A reconciliação T001 identificou que lint (4 erros), typecheck (10 erros) e `pnpm test` recursivo (exit 1 em feature-flags) falhavam, bloqueando o security gate do CI/CD.
Alternativas consideradas: (a) deletar código morto — descartada por perder trabalho já feito e contrariar o plano; (b) corrigir e registrar os serviços (CSRF, WebSocket, cache, rate-limit) — escolhida, transforma código morto em funcionalidade real.
Mudanças realizadas:

1. **Deps:** ioredis 6.0.0 → 5.11.1 (v6 incompatível com `moduleResolution: NodeNext` — barrels sem extensão `.js`; alinha com BullMQ que usa 5.x transitivo). Adicionados `ws` + `@types/ws` (websocket.ts importava pacote inexistente).
2. **ioredis import:** `import Redis from` → `import { Redis } from` (named import contorna o barrel quebrado).
3. **rate-limit.service.ts:** stub órfão → serviço real de brute-force (5 tentativas/15min, lockout 1h, Redis com fallback memória), integrado em `POST /auth/login` — implementa item 3.8/7.5.
4. **csrf.ts:** registrado como hook global `onRequest` em app.ts, com exceções para `/auth/login|register|refresh|logout` e health/metrics. Novo endpoint `GET /api/v1/auth/csrf-token`.
5. **websocket.ts:** tipos explícitos (`WebSocket`, `IncomingMessage`), `setupWebSocket(app)` registrado em server.ts após `listen`.
6. **cache.ts:** integrado em clubs.service — `remember()` em list (TTL 60s) e getById (TTL 300s), invalidação `clubs:list:*` no create — implementa item 6.3 conforme declarado.
7. **feature-flags:** 6 testes Vitest criados; eslint-disable justificado no FP de `security/detect-object-injection` (Record com chaves de união de literais).
   Evidência pós-correção: `pnpm lint` → 0 erros (12 warnings FP documentados) | `pnpm typecheck` → 0 erros | `pnpm test` → 27/27 (API 17 + Domain 4 + FeatureFlags 6).
   Observação: 87 erros Prettier auto-fixados via `lint:fix` — mudança puramente cosmética (formatação), zero alteração de lógica.

### [2026-08-11] Decisão: Reconciliar PLANO_MESTRE.md com evidência executável (T001)

Motivo: PLANO_MESTRE.md afirmava `[x]` e verificações "passando" sem que comandos reais tivessem sido executados nesta sessão. A Seção 6 do Protocolo exige evidência executável antes de `[x]`.
Alternativas consideradas: (a) aceitar o documento como estava — descartada por violar o protocolo; (b) rodar todos os comandos de verificação e corrigir o documento com base no resultado — escolhida.
Evidência coletada (2026-08-11, Node 24 / pnpm 11.13.1):

- `pnpm install --frozen-lockfile` — ✅ passa.
- `pnpm --filter @almanaque/api test` + `pnpm --filter @almanaque/domain test` — ✅ 21/21 (API 17 + Domain 4).
- `pnpm test` (recursivo) — ❌ falha em `@almanaque/feature-flags` (packages/feature-flags não tem arquivos de teste; vitest sai com exit 1).
- `pnpm lint` — ❌ inicialmente 91 erros (87 Prettier auto-fixáveis via `--fix`); restam 4 erros @typescript-eslint/no-unused-vars (`apps/api/src/modules/auth/rate-limit.service.ts`, `apps/api/src/middleware/csrf.ts`) + 13 warnings security/detect-object-injection (`packages/feature-flags/src/index.ts`).
- `pnpm typecheck` — ❌ 10 erros em @almanaque/api: `csrf.ts:7` (userId não usado), `rate-limit.service.ts` (ioredis import não-construtível, vars não usadas), `cache.ts:3` (ioredis), `websocket.ts` (módulo `ws` indisponível/indisponível tipagem, params implicit any), mais TS6196/7006. `@almanaque/domain` não alcançado (API falha antes).
- `prisma migrate status` — não executável sem `.env`/DATABASE_URL (arquivo é gitignored e não está configurado local).
  Gaps registrados no PLANO_MESTRE.md:

1. Fase 2 itens 2.7 (`data_sources`, `entity_revisions`) e 2.10 (criptografia na coluna) estavam `[x]` com texto "pendente" — demovidos para `[ ]`; tabelas realmente não existem no schema.
2. Fase 8: SAST/E2E/k6 marcavam `[x]` sem execução — demovidos para `[~]`.
3. Fase 9.1.1/9.1.6: security gate não passaria hoje — `[~]`.
   Observação: Nenhum código de produto foi alterado (restrição T001). Estes gaps viram pendências do Doer para a próxima tarefa de correção (lint + typecheck).

Motivo: Após reconstrução completa (repositório GitHub estava em estado pré-protocolo), todas as tarefas 2.3–2.13 foram implementadas com evidência real de verificação (PROTOCOLO_MESTRE.md Seção 6).
Alternativas consideradas: (a) aceitar a conversa compartilhada como prova de trabalho — descartada após auditoria revelar que commits `482e394`, `09ff0c6`, `1dbb1ec` não existiam no repositório real; (b) reconstruir tudo do zero sobre o commit `8cb9b67` (baseline MVP) — escolhida.
Observação: 164 asserções distribuídas em 5 scripts de smoke test (audit, crypto, session, rbac, billing) validam a implementação. Migration PostgreSQL consolidada (379 linhas, 63 CREATE statements) gerada e armazenada em `prisma/migrations-postgres/20260720000001_phase2_final/migration.sql`. Pendência: Operador executar `pwsh ./scripts/migrate.ps1` no Windows para aplicar no PostgreSQL.

### [2026-07-20] Decisão: AuditLog polimórfico (entityType + entityId) em vez de FKs separadas

Motivo: AuditLog rastreia mudanças em múltiplas entidades (User, Club, Subscription, etc.). FK explícita para cada uma geraria N colunas opcionais. Solução polimórfica com índice composto `@@index([entityType, entityId])` cobre todos os casos.
Alternativas consideradas: (a) tabela `audit_logs` separada por entidade (audit_user_logs, audit_club_logs, ...) — descartada por explosão de tabelas; (b) JSON column com `entity` embutido — descartada por perder indexação.
Trade-off: Perde integridade referencial ao nível do banco (FK), mas ganha flexibilidade. Aplicação garante que `entityType` seja válido.

### [2026-07-20] Decisão: SHA-256 para tokens, argon2id para senhas

Motivo: Senhas são baixa-entropia (escolhidas por humanos) — precisam de KDF memory-hard (argon2id). Tokens já são 32 bytes aleatórios (256 bits) — não precisam de KDF; SHA-256 é rápido (~1μs vs ~100ms do argon2) e adequado para hot path `/auth/refresh`.
Alternativas consideradas: (a) argon2id para ambos — descartada por latência excessiva em refresh; (b) SHA-256 para ambos — descartada por vulnerabilidade a rainbow tables em senhas.

### [2026-07-20] Decisão: Cache de permissões RBAC em memória (TTL 5 min), não Redis

Motivo: Cache local por processo é suficiente para estágio atual (monolito modular, instância única). TTL 5 min é trade-off aceitável entre latência e consistência. Multi-instance + invalidação cross-instance via Redis pub/sub será adicionada na Fase 6.3.
Alternativas consideradas: (a) Redis desde já — descartada por adicionar complexidade desnecessária antes do produto estar em produção; (b) sem cache (query a cada request) — descartada por latência 5-10ms em hot path.

### [2026-07-20] Decisão: índices full-text via SQL raw, não declarativos no Prisma

Motivo: Prisma 5.22 não suporta declarativamente índices GIN em colunas tsvector, índices trigram (pg_trgm), ou triggers. Solução: colunas `Unsupported("tsvector")?` no schema (Prisma Client sabe que existem) + arquivo `fulltext-indexes.sql` aplicado separadamente via `migrate.ps1`.
Alternativas consideradas: (a) usar apenas `LIKE`/`ILIKE` — descartada por não escalar em 50k+ clubes; (b) biblioteca externa (ex.: MeiliSearch, Typesense) — descartada por adicionar infraestrutura externa (PROTOCOLO_MESTRE.md Seção 3 item 1: custo zero).

### [2026-07-20] Decisão: valores monetários em centavos (int), não reais (float)

Motivo: Float tem problema de precisão (0.1 + 0.2 = 0.30000000000000004). Centavos (int) são exatos e aceitos por todos os provedores de pagamento (Stripe, PagSeguro).
Alternativas consideradas: (a) Decimal/numeric no PostgreSQL — descartada por não ter tipo equivalente nativo em TypeScript; (b) float com arredondamento — descartada por acumular erro.
Aplicação: `Billing.amountCents` é `Int` (centavos de BRL). Preços: FREE=0, PRO=2900, ELITE=9900.

### [2026-07-16] Decisão: Adoção do Protocolo Mestre v2.0 e retrofit do projeto

Motivo: O Operador publicou o PROTOCOLO_MESTRE.md v2.0 como nova lei suprema do processo. O projeto já continha código do MVP (Fastify + Prisma + SQLite/PostgreSQL) e um PLANO_MESTRE.md anterior, ambos produzidos antes do protocolo existir.
Alternativas consideradas: (a) descartar o MVP e refazer do zero sob o protocolo — descartada por desperdício; (b) aceitar o MVP como baseline e prosseguir sob o protocolo a partir de agora — escolhida.
Observação: O PLANO_MESTRE.md existente será revisado e reconstruído a partir do Discovery (Seção 4) e do Anexo A. Itens já implementados no MVP serão marcados `[x]` apenas após verificação de evidência (Seção 6).

### [2026-07-16] Decisão: Stack técnica inicial (mantida do pré-protocolo)

Motivo: TypeScript + Node.js + Fastify + Prisma + PostgreSQL/SQLite já estavam em uso, todos gratuitos e open-source, em conformidade com a Seção 3, item 1.
Alternativas consideradas: NestJS (mais pesado, scaffolding maior); Express (sem validação/schema nativos). Fastify venceu por ser leve, ter TypeScript first-class e plugins oficiais para helmet/cors/rate-limit.

---

## Discovery (Seção 4 do Protocolo) — Respostas do Operador

### [2026-07-16] Decisão: Definição de produto (Discovery Q1)

**Resposta:** O Almanaque dos Clubes é uma plataforma mundial de pesquisa e inteligência sobre futebol que reúne a história completa de clubes, jogadores e competições, enriquecida por rankings, estatísticas e IA com respostas fundamentadas em dados.
Motivo: Estabelece o escopo funcional do produto: não é só um diretório — é uma plataforma de inteligência com IA. Justifica a inclusão de Fase 6 (Knowledge Graph, RAG) e Fase 8 (auditoria de IA) no plano.

### [2026-07-16] Decisão: Público-alvo e escala esperada (Discovery Q2)

**Resposta:** Torcedores, jornalistas, pesquisadores, criadores de conteúdo, analistas, clubes/federações (B2B). Crescimento: Beta Fechada 100 → Open Beta 1.000 → Ano 1: 10.000–50.000 cadastrados. Arquitetura deve escalar além disso.
Motivo: Escala prevista justifica monolito modular (não microsserviços —_COMPLEXIDADE extra não justificada em <50k usuários), mas exige desde já: paginação correta, índices, cache (Fase 6), rate-limit por usuário (Fase 7), observabilidade (Fase 9). 50k usuários não pede microsserviços, mas pede CI/CD sólido e zero downtime.
Alternativas consideradas: microsserviços desde o início (descartada — Seção 3 item 6: solução mais simples vence entre equivalentes).

### [2026-07-16] Decisão: Referências de produto (Discovery Q3)

**Resposta:** ZeroZero, Transfermarkt, Soccerway, WorldFootball.net, RSSSF, FBref, Wikipedia, Sofascore, Flashscore. Diferencial: combinar acervo histórico + rankings auditáveis + IA RAG com citações + Knowledge Graph + curadoria.
Motivo: Define o padrão de qualidade esperado. Acervo histórico extenso (RSSSF-like) exige modelagem de dados flexível e versionamento de fontes (Fase 2 avançada + auditoria). IA com citações exige pipeline RAG rastreável (Fase 6). Rankings "auditáveis" exige imutabilidade/versionamento (Fase 2 — soft delete + audit_logs).

### [2026-07-16] Decisão: Funcionalidades sensíveis (Discovery Q4)

**Resposta:**

- Login: **Sim**
- Pagamento (assinatura): **Sim**
- Dado sensível: **Não** (apenas dados básicos de conta + cobrança por provedores externos)
- Upload de arquivo: **Sim** (administradores + importação/exportação de dados)
  Motivo (impacto no plano):
- Login → Fase 3 vira `[OBRIGATÓRIO]` (gatilho do Anexo A atendido).
- Pagamento → adiciona sub-fase de billing (Stripe/provedor gratuito — Seção 3 item 1: usar stripe.com é gratuito para usar, cobra apenas taxa por transação; alternativas open-source são PagSeguro/Pix direto — decidir em Fase 4).
- Sem dado sensível → 2FA TOTP vira `[CONDICIONAL]` (não é saúde/financeiro/documento). Mesmo assim, recomendado para contas pagas — deixaremos como item opcional dentro da Fase 3.
- Upload → Fase 6 upload vira `[OBRIGATÓRIO]` (administradores vão importar CSV).

### [2026-07-16] Decisão: Prazo (Discovery Q5)

**Resposta:** Não. Prioriza qualidade, consistência arquitetural e estabilidade. Marcos: Beta Fechada → Open Beta → v1.0, sem data fixa.
Motivo: Permite não pular etapas de segurança (Seção 3 item 3 — nada fecha sem evidência). Remove pressão de "lançar antes do seguro". Fases 7 (hardening) e 8 (testes/DAST) podem ser feitas com calma.

### [2026-07-16] Decisão: Marca e domínio (Discovery Q6)

**Resposta:** Nome "Almanaque dos Clubes" definido. Marca definida. Domínio registrado: `almanaquedosclubes.com` (14/08/2026), comprado na Vercel.
Motivo: Fase 7 (DNSSEC/CAA/HSTS preload) agora pode prosseguir com domínio próprio em produção. Frontend na Vercel, API no Railway (`api.almanaquedosclubes.com`).

### [2026-07-16] Decisão: Definição de "pronto" (Discovery Q7)

**Resposta:** Pronto = usuário consegue: pesquisar entidades do futebol mundial, navegar histórico, comparar informações, usar IA com citações — com infraestrutura de ETL, governança e operação funcionando em segundo plano. Planos Free/Pro/Elite ativos.
Motivo: Estabelece o critério de aceitação global do projeto (Seção 9 do Protocolo). Tudo abaixo disso é "em progresso", não "pronto". Afeta profundamente a estrutura do plano:

- Exige Fase 6 com ETL pipeline (atualização automática) — vira `[OBRIGATÓRIO]`.
- Exige Fase 6 com IA/RAG — vira `[OBRIGATÓRIO]`.
- Exige Fase 4 com billing (Free/Pro/Elite) — adicionada como sub-fase.
- Exige Fase 9 com observabilidade real — `[OBRIGATÓRIO]`.

---

## Classificação de fases (Anexo A) após Discovery

| Fase                 | Classificação                                                                                                                                 | Justificativa                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| 0 – Setup            | OBRIGATÓRIO                                                                                                                                   | sempre                              |
| 1 – Infra base       | OBRIGATÓRIO                                                                                                                                   | sempre                              |
| 2 – Dados            | OBRIGATÓRIO + tabelas de auth/billing/audit                                                                                                   | login + assinatura                  |
| 3 – Auth             | OBRIGATÓRIO (2FA TOTP OPCIONAL)                                                                                                               | login confirmado; sem dado sensível |
| 4 – APIs/CRUDs       | OBRIGATÓRIO + módulo de billing                                                                                                               | assinatura confirmada               |
| 5 – Frontend         | OBRIGATÓRIO                                                                                                                                   | sempre                              |
| 6 – Avançado         | UPLOAD OBRIGATÓRIO; FILA OBRIGATÓRIO (ETL); CACHE OBRIGATÓRIO (50k users); IA/RAG OBRIGATÓRIO (diferencial de produto); WEBSOCKET CONDICIONAL | confirmado por Q4+Q7                |
| 7 – Hardening        | VAULT CONDICIONAL (deploy nativo basta); DNSSEC/HSTS CONDICIONAL (sem domínio ainda)                                                          | Q6                                  |
| 8 – Testes/segurança | OBRIGATÓRIO + DAST OBRIGATÓRIO (superfície pública grande)                                                                                    | sempre + Q2                         |
| 9 – CI/CD e deploy   | OBRIGATÓRIO                                                                                                                                   | sempre                              |

---

### [2026-09-02] Decisão: D-2026-09-02-t401-rls-efetiva-abre-gate — RLS ativa em produção (T401) ✅

**Estado:** Gate **D-2026-08-24-rls-enforcement-exige-app-user ABERTO** (evidência real em produção).

**Motivo:** T390/T400/T401 executadas na ordem Regime Padrão (T400 aprovado por CI verde na PR #56 antes do switch T401).
A role `app_user` (não-superusuária) foi criada em produção e a conexão da API foi trocada para ela — com isso o
`FORCE ROW LEVEL SECURITY` em `sessions` passa a valer (superuser dispensa RLS; `app_user` não).

**Evidência de produção (2026-09-02):**

- `app_user` criada: `CREATE ROLE app_user NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS` + `LOGIN` + grants DML nas 18 tabelas da API + `USAGE` esquema/sequences (via `apps/api/scripts/sql/create_app_user.sql` + `ALTER ROLE`).
- Segredo **`DATABASE_URL_APP`** no Railway (user=app_user, mesmo host/DB) — nunca commitado (+ `.gitignore` para `.rollback-db-url`/`.appuser-pwd`).
- Código: `apps/api/src/config/prisma.ts` conecta com `process.env.DATABASE_URL_APP ?? process.env.DATABASE_URL` (fallback) — merge `39c95ae`.
- Smoke (pós-deploy): `GET /api/v1/health` → **200**; register → **201**; login → **200**; refresh → **200**; logout → **200**.
- Verificação RLS como `app_user` (banco de produção):`current_user=app_user`; `SELECT count(*) FROM sessions` sem contexto → **0** (deny-by-default); com contexto owner → ≥1 (vê a própria); contexto de outro user lendo sessões do smoke-user → **0** (cross-user deny).
- `pg_stat_activity`: API conectada como **`app_user`** (sem `postgres` da aplicação).

**Rollback (pronto):** `railway variable unset DATABASE_URL_APP` OU restaurar `DATABASE_URL_APP` para a URL `postgres` (a `DATABASE_URL` postgres permanece intacta como fallback) + redeploy (< 5 min). A role `app_user` permanece (DROP ROLE se desejado).

**Pós-estado:** RLS **efetiva** em produção (defesa em profundidade ativa em `sessions`); gate **D-2026-08-24 aberto**;
`D-2026-08-24-v5c-rls-inerte` superado. Conta de teste do smoke (`smoke.t401.*@example.com`) soft-desabilitada (INACTIVE).
