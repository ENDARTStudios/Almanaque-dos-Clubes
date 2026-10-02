# WS-G-1 — Orquestração ETL/cron/jobs (FASE 0: design + scaffolding read-only)

> **Estado:** SCAFFOLDING seguro (dry-run only). **Zero escrita, zero migration, zero cron ativo, zero
> deploy web, zero mapa público.** A aplicação (apply) exige um pipeline gated separado com aprovação
> explícita (§9). Branch: `feat/ws-g-1-etl-orchestration-scaffold`.

## 1. Objetivo

Preparar a automação de **ingestão/atualização de conteúdo, proveniência e refresh de ranking** de forma
auditável e idempotente — **sem alterar dados públicos** até gates específicos. Nesta fase entregamos apenas:
inventário, design, **módulos puros (planners)**, **runner dry-run**, **registry de jobs**, **handler de
worker fail-safe (flag off)**, métricas e redação de logs.

## 2. Fontes (allowlist)

| Fonte                         | Licença                                                   | Uso                                                                   |
| ----------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------- |
| **Wikidata**                  | **CC0**                                                   | identidade (QID), atributos, geo (P625/P159/P115/P131), títulos (WON) |
| **RSSSF / RSSSF Brasil**      | atribuição ao **autor da página** (não é domínio público) | campeões estaduais/histórico tabelado                                 |
| **OpenStreetMap / Nominatim** | **ODbL** (`© OpenStreetMap contributors`)                 | geocodificação aproximada (fallback)                                  |
| futuras federações            | —                                                         | **somente** com licença/ToS verificados (parada §6)                   |

## 3. Pipelines propostos

- **A. Wikidata identity/enrichment incremental** — novos clubes/competições; atributos faltantes;
  dedupe por **QID**; **skip** soft-deleted; **sem fuzzy**.
- **B. RSSSF state champions** — parsing por UF/ano; **atribuição ao autor**; apenas arestas WON com
  proveniência; **ambíguo omitido**.
- **C. Ranking refresh** — **dry-run only**; **nunca publicar** sem gate de metodologia; preservar rankings
  existentes; snapshot/hash.
- **D. Geo attribution** — garantir ODbL em qualquer dado OSM/Nominatim; **não sobrescrever** coords existentes.

## 4. Idempotência

`batchId` determinístico · `retrievedAt` estático por rodada · `importedFrom`/`sourceUrl` por item ·
**dedupe por QID** · **noop** para já processados · **manifest** por job (`ws-g-1-dry-run-v1`).

## 5. Rollback

Soft-delete **apenas** de entidades criadas por um batch e **sem referências**; **nunca** hard delete; **nunca**
reativar soft-deleted; ranking publish revertido por **unpublished/soft-hide**.

## 6. Observabilidade

Métricas por job (`metrics.ts`): `startedAt/finishedAt/durationMs/itemsProcessed/itemsCreated/itemsUpdated/
itemsSkipped/skippedByReason/errors/rateLimitBackoffs`. Logs estruturados **redigidos** (`redact.ts`) ·
dead-letter queue (fila `etl` do BullMQ já existe) · **sem SaaS pago** (cron do GitHub Actions para alertas).

## 7. Rate limit e respeito às fontes

`User-Agent` identificado (já nos clientes Wikidata/Nominatim) · backoff exponencial (`http-resilience.ts`:
1s/2s/4s + timeout 30s) · pausa entre chunks · limite de requests/hora · cache de entidades · **sem scraping
agressivo** · **sem violação de ToS**.

## 8. Segurança

Segredos apenas em env/secret manager · **nunca** em log (redação) · **nenhum** `DATABASE_URL`/`REDIS_URL` em
output · **Zod** em payloads (`schemas.ts`) · **allowlist** de fontes · **sem** fetch de URL arbitrária.

## 9. Gates futuros de aplicação (não autorizados nesta fase)

dry-run → snapshot → **apply em staging/DB teste** → SQL gate → cache cirúrgico → API smoke → docs →
**aprovação explícita** antes de **qualquer** write em produção.

## Inventário de capacidades (B.1)

| capacidade                                             | existente? | arquivo                                                           | status   | gap                                          | risco             |
| ------------------------------------------------------ | :--------: | ----------------------------------------------------------------- | -------- | -------------------------------------------- | ----------------- |
| Fila BullMQ (etl/email/export/ranking)                 |    sim     | `apps/api/src/services/queue.ts`                                  | ativo    | —                                            | baixo             |
| Worker ETL (handlers reais)                            |    sim     | `apps/worker/src/etl-worker.ts`                                   | ativo    | handlers APLICAM direto; sem dry-run por job | **médio (write)** |
| Resiliência HTTP (backoff/timeout)                     |    sim     | `apps/api/src/lib/http-resilience.ts`                             | ativo    | —                                            | baixo             |
| Conectores (wikidata/rsssf/fbref/osm/commons/sportsdb) |    sim     | `apps/api/src/modules/etl/connectors/*`, `apps/worker/src/jobs/*` | ativo    | —                                            | baixo             |
| Entity resolver (upserts)                              |    sim     | `apps/worker/src/jobs/entity-resolver.ts`                         | ativo    | write direto                                 | médio             |
| WON edges sync (idempotente)                           |    sim     | `apps/api/src/modules/etl/won-edges.service.ts`                   | ativo    | —                                            | baixo             |
| Cron de ranking                                        |  parcial   | `apps/api/src/modules/rankings/ranking-cron.job.ts`               | definido | scheduler em prod                            | médio             |
| Cache layer                                            |    sim     | `apps/api/src/services/cache.ts`                                  | ativo    | —                                            | baixo             |
| Logger/observabilidade                                 |  parcial   | pino (api/worker)                                                 | ativo    | métricas por job ausentes                    | baixo             |
| **Job registry tipado**                                |  **novo**  | `apps/api/src/lib/orchestration/registry.ts`                      | dry-run  | —                                            | baixo             |
| **Planners puros**                                     |  **novo**  | `apps/api/src/lib/orchestration/planners.ts`                      | dry-run  | —                                            | baixo             |
| **Runner dry-run**                                     |  **novo**  | `apps/api/src/lib/orchestration/runner.ts`                        | flag off | apply gated (futuro)                         | baixo             |
| **Métricas/Redação**                                   |  **novo**  | `.../metrics.ts`, `.../redact.ts`                                 | pronto   | —                                            | baixo             |
| **Flags (default OFF)**                                |  **novo**  | `.../flags.ts`                                                    | off      | —                                            | baixo             |

## Jobs propostos (dry-run only)

1. `wikidata-identity-scan` → candidatos novos/existing/skipped (dedupe por QID).
2. `wikidata-enrichment-plan` → campos faltantes + fonte (only-fill, nunca sobrescreve).
3. `rsssf-state-champions-plan` → arestas WON com proveniência; ambíguo omitido.
4. `ranking-refresh-dry-run` → diff de posições/pontos (nunca publica).
5. `geo-attribution-audit` → OSM sem/inconsistente atribuição ODbL.

## Checkpoint (B.6)

- `docs/WS-G-1-FASE0-DESIGN.md` (este);
- scaffolding em `apps/api/src/lib/orchestration/*` + testes `apps/api/tests/unit/orchestration/*`;
- **zero migration · zero escrita · zero cron ativo · zero produção alterada · zero deploy web · zero mapa
  público · integridade preservada** (`ranking_entries` hash `d2b117aa…`, estadual RSSSF 7, `country_pyramid`
  EN 1, 0 sem QID, MG/GO/PR intactos).
