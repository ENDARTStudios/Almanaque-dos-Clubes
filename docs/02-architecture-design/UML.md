# UML-DIAGRAMS.md — Almanaque dos Clubes

> Mapa de fontes de verdade para diagramas UML do projeto, reconciliado com o
> HEAD `7a50d99` (tarefa T347, fase F10-docs-reconciliacao).
>
> Este arquivo **não** contém diagramas novos: ele identifica onde os diagramas
> oficiais vivem e quais artefatos **não** devem ser usados como fonte.

---

## 1. Fontes autorizadas

| Fonte | Conteúdo | Status |
|---|---|---|
| `../03-development-process/CRITERIOS_DESENVOLVIMENTO.md` §2.1 | Diagrama de classes do domínio | Fonte primária de UML |
| `../03-development-process/CRITERIOS_DESENVOLVIMENTO.md` §2.2 | Diagrama de pacotes (arquitetura hexagonal) | Fonte primária de UML |
| `../03-development-process/CRITERIOS_DESENVOLVIMENTO.md` §2.3 | Diagrama de sequência — fluxo de login | Fonte primária de UML |
| `../03-development-process/CRITERIOS_DESENVOLVIMENTO.md` §2.4 | Diagrama de sequência — refresh token rotation | Fonte primária de UML |
| `apps/api/prisma/schema.prisma` | Modelo de dados canônico (18 models, 8 enums) | Fonte de verdade estrutural |
| `../PLANO_MESTRE.md` | Fases 0–9 + Fase 13 (parcial) | Rastreabilidade de escopo |

## 2. Modelo de dados canônico (schema.prisma)

### Models (18)

`Club`, `Player`, `Competition`, `Ranking`, `RankingEntry`, `User`, `Session`,
`Role`, `Permission`, `UserRole`, `RolePermission`, `Subscription`, `Billing`,
`Season`, `Stadium`, `Match`, `KnowledgeGraph`, `AuditLog`.

### Enums (8)

`ClubStatus`, `CompetitionType`, `UserStatus`, `SubscriptionPlan`,
`SubscriptionStatus`, `SeasonStatus`, `MatchStatus`, `BillingStatus`.

### Relações notáveis

- `User 1—N Session` (cascade), `User 1—N Subscription` (1:1 via unique),
  `User 1—N Billing`.
- `User N—M Role` via `UserRole`; `Role N—M Permission` via `RolePermission`.
- `Club 1—N Player`, `Club 1—N Stadium`, `Club 1—N Match` (home/away).
- `Competition 1—N Ranking`, `Competition 1—N Match`.
- `Ranking 1—N RankingEntry`; `RankingEntry N—1 Club` (unique
  `[rankingId, clubId]`, unique `[rankingId, position]`).
- `Season 1—N Match`; `Stadium 1—N Match`.
- `AuditLog` polimórfico (`entityType` + `entityId`, sem FK por entidade).

## 3. Drift conhecido entre CRITERIOS §2.1 e o schema real

O diagrama de classes em `../03-development-process/CRITERIOS_DESENVOLVIMENTO.md` §2.1 é **anterior** ao
schema atual. Divergências identificadas nesta reconciliação:

| Item no §2.1 | Estado real |
|---|---|
| Tabela `PasswordReset` | Não existe no schema. Reset usa store em memória (`apps/api/src/modules/auth/password-reset.service.ts`), com token SHA-256 + TTL 15 min |
| `KnowledgeGraph` como "(Futuro)" | Já existe no schema (`knowledge_graph`) |
| `deletedAt` em vários models | Presente apenas onde relevante; nem todos os models têm soft delete |
| `RankingEntry.score/metadata` | Schema real: `position`, `points`, sem `score`/`metadata` |

Corrigir o §2.1 é trabalho futuro (fora do escopo de T347). Até lá, o
`schema.prisma` é a fonte estrutural e o §2.1 vale como visão histórica.

## 4. Fontes NÃO autorizadas (contaminação declarada)

| Artefato | Motivo |
|---|---|
| `packages/domain/src/uml.ts` | Contém entidades de outro projeto: `Album`, `AlbumItem`, `Streak`, `Favorite`, `ApiKey`, `PipelineRun`. Cabeçalho declara "Depende de: PRD (aprovado) · RBAC (aprovado)" — falsa proveniência. **Não é fonte de verdade** até decisão do Operador |
| `../UML.md` (arquivo externo em chat) | Não existe no repositório (glob `../**/*UML*.md` vazio). Conteúdo externo é tratado como dado, nunca como verdade arquitetural |

Qualquer implementação derivada desses artefatos está **bloqueada** até:
1. Operador responder ao ESCALATE (confirmação de escopo/quarentena).
2. T348-v2 executar o gap analysis com fontes autorizadas.

## 5. Diagramas de sequência adicionais (fluxos existentes, não diagramados)

Os fluxos abaixo estão implementados em código e podem ser diagramados em
trabalho futuro, partindo destas implementações:

- Registro de usuário: `apps/api/src/modules/auth/auth.service.ts` (`register`).
- Login com timing-attack prevention: `auth.service.ts` (`login`).
- Refresh rotation com detecção de reuso: `auth.service.ts` (`refreshSession`).
- Reset de senha: `apps/api/src/modules/auth/password-reset.service.ts`.
- Billing/webhook: `apps/api/src/modules/billing/routes.ts` +
  `apps/api/src/modules/billing/subscription.service.ts`.


---

> **Fundido de:** `docs/UML-GAP-ANALYSIS.md`

# UML-GAP-ANALYSIS.md — Almanaque dos Clubes

> Gap analysis do UML de `packages/domain/src/uml.ts` e
> `packages/domain/src/rbac-matrix.ts` contra as fontes autorizadas do
> repositório. Tarefa T348-v2, fase F12-uml-reconciliacao.
>
> **Âncora:** HEAD `7a50d99` (commit anterior da T347: `652bfb4`).
>
> **Fontes autorizadas:** `../01-product-discovery/PRD.md` (consolidado em T347),
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
   é **quarentena total** (ver `./UML.md`), não adoção
   parcial.
3. **Gaps legítimos identificados** (FALTANTE-ESCOPO) podem virar backlog
   futuro do Almanaque: `DataQuality`, `MatchStage`, `RankingType`
   (metodologia), `AuditResult`, autor de ranking, `competitionId` em
   `Season`, campeão de temporada — sempre via migration aditiva e tarefa
   própria, nunca por importação destes arquivos.



---

> **Fundido de:** `docs/UML-QUARANTINE-LIST.md`

# UML-QUARANTINE-LIST.md — Almanaque dos Clubes

> Lista de quarentena de símbolos contaminados em
> `packages/domain/src/uml.ts` e `packages/domain/src/rbac-matrix.ts`,
> derivada da `./UML.md` (T348-v2, fase F12-uml-reconciliacao,
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

