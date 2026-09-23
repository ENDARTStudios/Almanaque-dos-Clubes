# docs/ — Índice da documentação

> Almanaque dos Clubes — plataforma de inteligência histórica do futebol com proveniência auditável.
> Documentação em pt-BR. Cada arquivo abaixo aponta para a fonte canônica quando existe — este índice
> NÃO duplica conteúdo que drifta; ele roteia.

## Estado do produto (verificado em produção, 2026-09-22)

| Dimensão                                | Estado                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Identidade (clubs/players/competitions) | 3.857 / 2.396 / 1.563 — proveniência 100%                               |
| Conquistas (Knowledge Graph `WON`)      | 5.157 arestas, fonte por aresta (URL da EDIÇÃO), zero duplicados        |
| Vitrine                                 | carrossel + galeria de honra + comparador, corrigidos POR HIERARQUIA    |
| Oferta                                  | /planos ≡ /checkout com fonte única; IA/API = "em breve"; KG = ENTREGUE |
| Legal                                   | P0 autônomo no ar (T469); identidade/DPO/DPAs/advogado = Operador       |

## Mapa da documentação

| Área                      | Arquivos                                                                                                                                                                                                                            |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Produto e roadmap         | [PRD.md](./PRD.md) · [ROADMAP.md](./ROADMAP.md) · [TASKS.md](./TASKS.md) · [DEFINE_THE_USER.md](./DEFINE_THE_USER.md)                                                                                                               |
| Arquitetura e decisões    | [ARCHITECTURE.md](./ARCHITECTURE.md) · [ADR.md](./ADR.md) · [CHOOSE_TECH_STACK.md](./CHOOSE_TECH_STACK.md) · [API.md](./API.md) · [INTEGRATIONS.md](./INTEGRATIONS.md)                                                              |
| Regras e processo         | [RULES.md](./RULES.md) · [TASK_BREAKING_DOWN.md](./TASK_BREAKING_DOWN.md) · [CODE_REVIEW.md](./CODE_REVIEW.md) · [ITERATION.md](./ITERATION.md)                                                                                     |
| Desenvolvimento           | [SETUP.md](./SETUP.md) · [DEVELOPMENT.md](./DEVELOPMENT.md) · [ONBOARDING.md](./ONBOARDING.md) · [STYLE_GUIDE.md](./STYLE_GUIDE.md) · [CONTENT.md](./CONTENT.md)                                                                    |
| Qualidade                 | [TESTING.md](./TESTING.md) · [QA_TESTING.md](./QA_TESTING.md) · [SECURITY_REVIEW.md](./SECURITY_REVIEW.md) · [ERROR_HANDLING.md](./ERROR_HANDLING.md)                                                                               |
| Operação                  | [PRODUCTION_DEPLOY.md](./PRODUCTION_DEPLOY.md) · [PREVIEW_DEPLOYMENT.md](./PREVIEW_DEPLOYMENT.md) · [MONITORING.md](./MONITORING.md) · [BACKUP_DR.md](./BACKUP_DR.md)                                                               |
| Qualidades não-funcionais | [PERFORMANCE.md](./PERFORMANCE.md) · [ACCESSIBILITY.md](./ACCESSIBILITY.md) · [SEO.md](./SEO.md) · [AEO.md](./AEO.md) · [GEO.md](./GEO.md) · [AIO.md](./AIO.md) · [COMPLIANCE.md](./COMPLIANCE.md) · [ANALYTICS.md](./ANALYTICS.md) |
| História e memória        | [CHANGELOG.md](./CHANGELOG.md) · [MEMORY.md](./MEMORY.md) · [RESEARCH.md](./RESEARCH.md) · [DESIGN.md](./DESIGN.md)                                                                                                                 |

## Documentos canônicos fora de docs/ (NÃO duplicar — ler lá)

- **DECISOES.md** (raiz) — registro permanente de decisões (o nosso ADR log).
- **PLANO_MESTRE.md** (raiz) — estado consolidado do projeto e Estado Final.
- **docs/RECONCILIATION-REPORT.md** — snapshots de evidência por gate (§22 = WS-D/T448/T465/T469).
- **AGENTS.md** (raiz) — instruções para agentes (graft-first, navegação).
- **SECURITY.md** (raiz) — política de segurança.
- **HANDOFF.md / PENDENCIAS_OPERADOR.md** (raiz) — bastão e pendências do Operador.
- **docs/DATA-INGESTION.md / RANKING-ALGORITHM.md / RBAC-MATRIX.md / RLS-POLICIES.md / OBSERVABILITY.md / PAYMENTS-RUNBOOK.md / BACKUP-RESTORE.md / MANUAL_DO_OPERADOR.md** — domínios específicos.

## Regra de manutenção

Documento aqui que descreve ESTADO (números, features, fornecedores) tem de ser re-ancorado em
produção antes de qualquer edição (regra R3 — ver [RULES.md](./RULES.md)). Snapshot velho que mente
é pior que ausência: prefira apontar para a fonte canônica a copiar números.
