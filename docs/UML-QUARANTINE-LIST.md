# UML-QUARANTINE-LIST.md — Almanaque dos Clubes

> Lista de quarentena de símbolos contaminados em
> `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts`,
> derivada da `docs/UML-GAP-ANALYSIS.md` (T348-v2, fase F12-uml-reconciliacao,
> âncora HEAD `7a50d99`).
>
> **Prioridade:** P1 = remove a contaminação da superfície pública (barrel);
> P2 = remove artefato obsoleto/duplicado; P3 = remove documentação morta.
>
> **Regra de ouro:** nenhum símbolo abaixo tem consumidor externo (grep
> verificado). A remoção é tarefa de CÓDIGO futura — este documento apenas a
> especifica. Nada é removido nesta tarefa (docs-only).

## 1. Recomendação global

Remover os arquivos inteiros e suas exportações do barrel:

1. `packages/domain/src/uml.ts` (543 linhas) — 100% dos símbolos são
   contaminantes, conflitantes, duplicatas ou sem consumidor; cabeçalho com
   falsa proveniência ("Depende de: PRD (aprovado) · RBAC (aprovado)").
2. `packages/domain/src/rbac-matrix.ts` (171 linhas) — modelo de RBAC
   integralmente conflitante com `rbac.service.ts` real.
3. `packages/domain/src/index.ts:16-17` — remover `export * from
   './rbac-matrix.js'` e `export * from './uml.js'`.

Se a remoção total for vetada pelo Operador, a quarentena mínima é a lista
P1 abaixo + remoção dos exports do barrel.

## 2. Quarentena — `packages/domain/src/uml.ts`

| # | Símbolo | Linha(s) | Motivo | Prioridade |
|---|---|---|---|---|
| 1 | `StickerRarity` | 76–82 | Domínio de figurinhas — fora de escopo (PRD §9) | P1 |
| 2 | `StickerType` | 84–92 | Domínio de figurinhas — fora de escopo (PRD §9) | P1 |
| 3 | `EntityType.ALBUM` (membro) | 100 | Membro de álbum em enum de entidades — fora de escopo | P1 |
| 4 | `PipelineStatus` | 110–116 | Acoplado a `PipelineRun`, excluído (PRD §9) | P1 |
| 5 | `ApiKey` | 151–161 | Excluído (PRD §9); inexistente no schema | P1 |
| 6 | `ClubPlayer` | 216–223 | Tabela separada de passagens — fora do escopo; schema usa `Player.clubId` | P1 |
| 7 | `Country` | 237–244 | Tabela inexistente; schema usa código ISO `VarChar(2)` | P1 |
| 8 | `Album` | 308–314 | Fora de escopo (PRD §9) | P1 |
| 9 | `AlbumItem` | 316–325 | Fora de escopo (PRD §9) | P1 |
| 10 | `Streak` | 327–334 | Fora de escopo (PRD §9) | P1 |
| 11 | `Favorite` | 338–344 | Fora de escopo (PRD §9) | P1 |
| 12 | `PipelineRun` | 359–369 | Excluído (PRD §9) | P1 |
| 13 | `ClassRelationships` (membros: `User→Album`, `User→Streak`, `User→Favorite`, `User→ApiKey`, `Album→AlbumItem`) | 376–379, 382 | Associações de entidades fora de escopo | P1 |
| 14 | `ClassRelationships` (membros: `Club→ClubPlayer`, `Club→Country`, `Player→ClubPlayer`) | 383, 385, 387 | Associações a tabelas fora do escopo | P1 |
| 15 | `FeatureFlags.albumExclusive` | 414–419 | Flag de álbum — fora de escopo | P1 |
| 16 | `FeatureFlags.albumFoil` | 420–425 | Flag de álbum — fora de escopo | P1 |
| 17 | `isFeatureFlagEnabled` | 452–458 | Acoplado a `Role`/`Plan` de `rbac-matrix.ts` | P1 |
| 18 | `collectStickerSequence` | 510–512 | Sequência de coleta de figurinha — fora de escopo | P1 |
| 19 | Demais exports (`SubStatus`, `BillingStatus`, `DataQuality`, `Position`, `CompType`, `MatchStage`, `RankingType`, `AuditResult`, `LocalizedName`, `UmlUser`, `Session`, `Subscription`, `Billing`, `UmlClub`, `UmlPlayer`, `UmlStadium`, `UmlCompetition`, `UmlSeason`, `UmlMatch`, `UmlRanking`, `UmlRankingEntry`, `AuditLog`, `FeatureFlag`, `FeatureFlags`, sequências de documentação restantes) | todo o arquivo | PARCIAL com drift vs schema ou sem consumidor; colisão latente de nomes no barrel (`Subscription`, `Billing`, `Session`, `AuditLog`) | P2 |
| 20 | Cabeçalho com falsa proveniência | 1–5 | Declara dependência de "PRD aprovado" inexistente à época | P3 |

## 3. Quarentena — `packages/domain/src/rbac-matrix.ts`

| # | Símbolo | Linha(s) | Motivo | Prioridade |
|---|---|---|---|---|
| 1 | `Permission` (membros `favorites:*`, `album:*`, `collection:streak:*`) | 7–34 (20–27) | Domínio estrangeiro; modelo diverge do real (`clubs:read` etc.) | P1 |
| 2 | `Role` (`user/admin`) | 37–38 | Conflito direto com `ROLE_NAMES` real (`admin/pro/free`) | P1 |
| 3 | `permissionPlanGate` | 55–83 | Gates de álbum/favoritos/streak (68–75); modelo não usado | P1 |
| 4 | `rolePermissions` | 93–137 | Conflito com `ROLE_PERMISSIONS` real | P1 |
| 5 | `hasPermission` | 140–152 | Lógica RoleGate AND PlanGate inexistente no código real | P1 |
| 6 | `canAccess` | 155–171 | `featureMap` com `album-*` (160–162) | P1 |
| 7 | `Plan` / `PLAN_ORDER` / `Principal` / `anonymousPermissions` | 41–52, 86–90 | Parcialmente alinhados a `SubscriptionPlan`, mas só existem para sustentar o modelo rejeitado; sem consumidor | P2 |

## 4. Barrels

| Arquivo | Linha | Ação |
|---|---|---|
| `packages/domain/src/index.ts` | 16 | Remover `export * from './rbac-matrix.js';` |
| `packages/domain/src/index.ts` | 17 | Remover `export * from './uml.js';` |

> Verificação pós-remoção (tarefa futura): `pnpm typecheck` +
> `pnpm test` + grep confirmando zero imports dos símbolos removidos.

## 5. Fora da quarentena (backlog legítimo, futuro)

Símbolos FALTANTE-ESCOPO da gap analysis **não** entram na quarentena; são
candidatos a backlog futuro do Almanaque, sempre via schema/migration
aditiva e tarefa própria: `DataQuality`, `MatchStage`, `RankingType`
(metodologia), `AuditResult`, autor de ranking, `competitionId` em `Season`,
campeão de temporada.
