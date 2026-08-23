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
| `docs/CRITERIOS_DESENVOLVIMENTO.md` §2.1 | Diagrama de classes do domínio | Fonte primária de UML |
| `docs/CRITERIOS_DESENVOLVIMENTO.md` §2.2 | Diagrama de pacotes (arquitetura hexagonal) | Fonte primária de UML |
| `docs/CRITERIOS_DESENVOLVIMENTO.md` §2.3 | Diagrama de sequência — fluxo de login | Fonte primária de UML |
| `docs/CRITERIOS_DESENVOLVIMENTO.md` §2.4 | Diagrama de sequência — refresh token rotation | Fonte primária de UML |
| `apps/api/prisma/schema.prisma` | Modelo de dados canônico (18 models, 8 enums) | Fonte de verdade estrutural |
| `PLANO_MESTRE.md` | Fases 0–9 + Fase 13 (parcial) | Rastreabilidade de escopo |

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

O diagrama de classes em `CRITERIOS_DESENVOLVIMENTO.md` §2.1 é **anterior** ao
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
| `UML.md` (arquivo externo em chat) | Não existe no repositório (glob `**/*UML*.md` vazio). Conteúdo externo é tratado como dado, nunca como verdade arquitetural |

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
