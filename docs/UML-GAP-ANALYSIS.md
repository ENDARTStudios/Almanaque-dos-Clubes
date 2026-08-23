# UML-GAP-ANALYSIS.md — Almanaque dos Clubes

> Gap analysis do UML de `packages/domain/src/uml.ts` e
> `packages/domain/src/rbac-matrix.ts` contra as fontes autorizadas do
> repositório. Tarefa T348-v2, fase F12-uml-reconciliacao.
>
> **Âncora:** HEAD `7a50d99` (commit anterior da T347: `652bfb4`).
>
> **Fontes autorizadas:** `docs/PRD.md` (consolidado em T347),
> `apps/api/prisma/schema.prisma` (18 models, 8 enums),
> `apps/api/src/modules/auth/rbac.service.ts` (RBAC real).
>
> **Entradas analisadas (não são fontes de verdade):** `uml.ts` (543 linhas) e
> `rbac-matrix.ts` (171 linhas), usados apenas para classificar símbolos.

## 1. Método

Cada símbolo foi classificado contra o schema real e o escopo do PRD em:

| Código | Critério |
|---|---|
| `EXISTENTE` | Existe equivalente no schema.prisma/código real |
| `PARCIAL` | Existe, mas com drift (campos/faltantes, nomes, tipos) |
| `FALTANTE-ESCOPO` | Não existe, mas o conceito está dentro do escopo do PRD |
| `FORA-ESCOPO` | Não existe e não está no escopo do PRD consolidado |
| `CONTAMINANTE` | Entidade de outro projeto (PRD §9) ou conflito com o RBAC real |

Verificação de consumidores: grep em `apps/` e `packages/` mostra que os
imports do barrel `@almanaque/domain` usam apenas símbolos legítimos
(`Club`, `Player`, `Competition`, `Ranking`, `RankingEntry`, `Match`,
`Season`, `GraphEdge`, `DomainError`, `NotFoundError`, `Create*Schema`).
**Nenhum** símbolo de `uml.ts`/`rbac-matrix.ts` é importado por código
externo — a remoção é segura do ponto de vista de consumidores.

## 2. Enums (`uml.ts` linhas 14–116)

| Enum | Linha | Classificação | Detalhe |
|---|---|---|---|
| `SubStatus` | 14 | PARCIAL | Schema `SubscriptionStatus`: ACTIVE/INACTIVE/CANCELLED/EXPIRED/PENDING. UML tem PAST_DUE/TRIALING/INCOMPLETE (ausentes) e CANCELED (nome diverge) |
| `BillingStatus` | 23 | PARCIAL | Schema: PENDING/PAID/REFUNDED/FAILED/CANCELLED. UML omite CANCELLED |
| `DataQuality` | 31 | FALTANTE-ESCOPO | Conceito ETL válido; não existe no schema |
| `Position` | 38 | PARCIAL | Schema `Player.position` é `String?` livre; UML enumera 4 posições |
| `CompType` | 46 | PARCIAL | Schema `CompetitionType`: LEAGUE/CUP/TOURNAMENT/SUPER_CUP. UML usa SUPERCUP e adiciona QUALIFIER/FRIENDLY |
| `MatchStage` | 58 | FALTANTE-ESCOPO | Schema usa `Match.round String?` livre; estágio não modelado |
| `RankingType` | 68 | FALTANTE-ESCOPO | Metodologia de ranking não existe no schema |
| `StickerRarity` | 76 | CONTAMINANTE | Figurinhas — fora de escopo (PRD §9) |
| `StickerType` | 84 | CONTAMINANTE | Figurinhas — fora de escopo (PRD §9) |
| `EntityType` | 94 | PARCIAL | Membros válidos (club/player/competition/season/stadium) como strings no schema; membro `ALBUM` (linha 100) é contaminante |
| `AuditResult` | 104 | FALTANTE-ESCOPO | Schema `AuditLog` não tem coluna de resultado |
| `PipelineStatus` | 110 | CONTAMINANTE | Acoplado a `PipelineRun`, excluído no PRD §9 |

## 3. Entidades/Interfaces (`uml.ts` linhas 119–369)

| Interface | Linha | Classificação | Detalhe |
|---|---|---|---|
| `LocalizedName` | 119 | PARCIAL | Schema usa `String` simples; localização não modelada |
| `UmlUser` | 131 | PARCIAL | Schema `User` não tem `role`/`plan` como colunas (são via `UserRole` e `Subscription`); `isActive` diverge de `status UserStatus` |
| `Session` | 142 | PARCIAL | Schema tem `tokenHash`, `userAgent`, `revokedAt`; UML omite userAgent/revokedAt |
| `ApiKey` | 151 | CONTAMINANTE | Não existe no schema; excluído no PRD §9 |
| `Subscription` | 165 | PARCIAL | Schema não tem `stripeSubscriptionId`/`stripeCustomerId`; status diverge |
| `Billing` | 176 | PARCIAL | Schema usa `externalId` (não `stripePaymentIntentId`) e tem `userId` |
| `UmlClub` | 189 | PARCIAL | Drift extenso: `slug`, `logoUrl`, `colors[]`, `completenessScore`, `countryId` FK não existem; schema tem `fullName/shortName/city/state/primaryColor/qid/createdBy` |
| `UmlPlayer` | 204 | PARCIAL | Schema tem `shortName`, `country` singular, `clubId`, `qid`; UML usa `nationalities[]`, `photoUrl`, `completenessScore` |
| `ClubPlayer` | 216 | FORA-ESCOPO | Tabela separada de passagens não existe (schema: `Player.clubId` direto) e não está no PRD consolidado |
| `UmlStadium` | 225 | PARCIAL | Schema tem `city/state/surface/qid/clubId`; UML usa `slug`, `builtYear`, `countryCode` |
| `Country` | 237 | FORA-ESCOPO | Tabela não existe (schema usa código ISO `VarChar(2)` em linha); fora do PRD |
| `UmlCompetition` | 249 | PARCIAL | Schema tem `name String`, `country`, `type`, `qid`; UML usa `slug`, `confederation`, `countryCodes[]`, `tier`, `isActive` |
| `UmlSeason` | 262 | PARCIAL | Schema `Season` não tem `competitionId` nem `championClubId`; `year` diverge de `name` |
| `UmlMatch` | 271 | PARCIAL | Schema tem `date`, `round`, `venue`, `stadiumId`, `status`, `competitionId`; UML usa `matchDate`, `stage` |
| `UmlRanking` | 285 | PARCIAL | Schema tem `name`, `competitionId`, `season`, `publishedAt`; UML adiciona `authorId`, `methodology`, `formula`, `isOfficial` |
| `UmlRankingEntry` | 296 | PARCIAL | Schema usa `points` (não `score`) e não tem `breakdown` |
| `Album` | 308 | CONTAMINANTE | Figurinhas — fora de escopo (PRD §9) |
| `AlbumItem` | 316 | CONTAMINANTE | Figurinhas — fora de escopo (PRD §9) |
| `Streak` | 327 | CONTAMINANTE | Sequência de coleta — fora de escopo (PRD §9) |
| `Favorite` | 338 | CONTAMINANTE | Favoritos — fora de escopo (PRD §9) |
| `AuditLog` | 348 | PARCIAL | Schema: `entityType/entityId` (não `resource`), `changes`, `userId` nullable; UML usa `result`, `ipAddress` em coluna |
| `PipelineRun` | 359 | CONTAMINANTE | Excluído no PRD §9 |

## 4. Associações (`ClassRelationships`, linhas 373–394)

| Associação | Classificação |
|---|---|
| User → Session | EXISTENTE |
| User → Subscription (1:1 via unique) | EXISTENTE |
| User → Album | CONTAMINANTE |
| User → Streak | CONTAMINANTE |
| User → Favorite | CONTAMINANTE |
| User → ApiKey | CONTAMINANTE |
| User → Ranking (`authorId`) | FALTANTE-ESCOPO (schema não tem autor de ranking) |
| Subscription → Billing | EXISTENTE |
| Album → AlbumItem | CONTAMINANTE |
| Club → ClubPlayer | FORA-ESCOPO |
| Club → Stadium | EXISTENTE (`Stadium.clubId`) |
| Club → Country | FORA-ESCOPO |
| Club → RankingEntry | EXISTENTE |
| Player → ClubPlayer | FORA-ESCOPO |
| Competition → Season | FALTANTE-ESCOPO (schema liga via `Match`, não direto) |
| Season → Match | EXISTENTE |
| Season → Club (campeão) | FALTANTE-ESCOPO |
| Ranking → RankingEntry | EXISTENTE |
| Match → Club (home) | EXISTENTE |
| Match → Club (away) | EXISTENTE |

Totais: 9 EXISTENTE, 5 CONTAMINANTE, 3 FORA-ESCOPO, 3 FALTANTE-ESCOPO.

## 5. Feature flags e sequências

| Símbolo | Linha | Classificação |
|---|---|---|
| `FeatureFlag` / `FeatureFlags` (registry) | 400–450 | PARCIAL — duplica `packages/feature-flags`; entradas `albumExclusive` (414) e `albumFoil` (420) são CONTAMINANTES |
| `isFeatureFlagEnabled` | 452 | CONTAMINANTE — acoplado a `Role`/`Plan` de `rbac-matrix.ts` |
| `signupSequence` | 471 | PARCIAL — cita Resend não integrado e `role:'user'` divergente |
| `loginSequence` | 482 | PARCIAL — cita RS256 e rate limit 10/15min (real: 5/15min) |
| `refreshSequence` | 491 | PARCIAL |
| `contentAccessSequence` | 500 | PARCIAL — cita PlanGuard; real é RBAC (`requirePermission`) |
| `collectStickerSequence` | 510 | CONTAMINANTE — coleta de figurinha (PRD §9) |
| `billingUpgradeSequence` | 520 | PARCIAL — webhook existe; Stripe pendente (decisão Operador) |
| `etlPipelineSequence` | 531 | PARCIAL — conectores/worker existem; `pipeline_run` não é tabela |
| `ragAskSequence` | 541 | PARCIAL — módulo `rag` existe; Ollama/pgvector pendentes |

## 6. rbac-matrix.ts — conflito integral com o RBAC real

| Símbolo | Linha | Classificação | Detalhe |
|---|---|---|---|
| `Permission` (27 strings) | 7 | CONTAMINANTE | Modelo `entity:read:*` difere do real `<resource>:<action>` (`clubs:read` etc.); `favorites:*` (20-21), `album:*` (22-25), `collection:streak:*` (26-27) são domínio estrangeiro |
| `Role` (`user/admin`) | 37 | CONTAMINANTE | Real: `admin/pro/free` (`ROLE_NAMES` em `rbac.service.ts:26`) |
| `Plan` | 41 | PARCIAL | Alinha com `SubscriptionPlan` (FREE/PRO/ELITE), mas é usado como coluna em `UmlUser` (inexistente) |
| `permissionPlanGate` | 55 | CONTAMINANTE | Inclui gates de álbum/favoritos/streak (68-75) |
| `anonymousPermissions` | 86 | FALTANTE-ESCOPO | Conceito de acesso anônimo não implementado no RBAC real |
| `rolePermissions` | 93 | CONTAMINANTE | Listas divergem de `ROLE_PERMISSIONS` real |
| `hasPermission` | 140 | CONTAMINANTE | Lógica RoleGate AND PlanGate não existe no código real |
| `canAccess` | 155 | CONTAMINANTE | `featureMap` contém `album-*` (160-162) |

## 7. Resumo quantitativo

Contagem por símbolo classificado (enums + interfaces + flags + sequências +
associações; membros individuais de coleções não são contados duas vezes):

| Classe | uml.ts | rbac-matrix.ts | Total |
|---|---|---|---|
| EXISTENTE | 9 | 0 | 9 |
| PARCIAL | 27 | 1 | 28 |
| FALTANTE-ESCOPO | 7 | 1 | 8 |
| FORA-ESCOPO | 5 | 0 | 5 |
| CONTAMINANTE | 18 | 6 | 24 |

## 8. Conclusão

1. **Nenhum símbolo contaminante tem consumidor.** O barrel
   (`packages/domain/src/index.ts:16-17`) exporta os dois arquivos, mas
   nenhum import em `apps/` usa esses símbolos. Risco latente: `Subscription`
   e `Billing` exportados por `uml.ts` (sem prefixo `Uml`) podem colidir com
   imports futuros do barrel.
2. **A adoção incremental não se aplica a estes arquivos.** Como 100% do
   conteúdo é contaminante, conflitante ou sem consumidor, o caminho correto
   é **quarentena total** (ver `docs/UML-QUARANTINE-LIST.md`), não adoção
   parcial.
3. **Gaps legítimos identificados** (FALTANTE-ESCOPO) podem virar backlog
   futuro do Almanaque: `DataQuality`, `MatchStage`, `RankingType`
   (metodologia), `AuditResult`, autor de ranking, `competitionId` em
   `Season`, campeão de temporada — sempre via migration aditiva e tarefa
   própria, nunca por importação destes arquivos.
