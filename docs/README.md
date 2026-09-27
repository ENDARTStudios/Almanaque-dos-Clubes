# docs/ — Índice da documentação

> Almanaque dos Clubes — plataforma de inteligência histórica do futebol com proveniência auditável.
> Documentação em pt-BR. Cada arquivo abaixo aponta para a fonte canônica quando existe — este índice
> NÃO duplica conteúdo que drifta; ele roteia.

## Estado do produto (verificado em produção, 2026-09-22)

| Dimensão | Estado |
|---|---|
| Identidade (clubs/players/competitions) | 3.857 / 2.396 / 1.563 — proveniência 100% |
| Conquistas (Knowledge Graph `WON`) | 5.157 arestas, fonte por aresta (URL da EDIÇÃO), zero duplicados |
| Vitrine | carrossel + galeria de honra + comparador, corrigidos POR HIERARQUIA |
| Oferta | /planos ≡ /checkout com fonte única; IA/API = "em breve"; KG = ENTREGUE |
| Legal | P0 autônomo no ar (T469); identidade/DPO/DPAs/advogado = Operador |

## Mapa da documentação

| Área | Arquivos |
|---|---|
| Produto e roadmap | [PRD.md](./01-product-discovery/PRD.md) · [ROADMAP.md](./01-product-discovery/ROADMAP.md) · [TASKS.md](./03-development-process/TASKS.md) · [DEFINE_THE_USER.md](./01-product-discovery/DEFINE_THE_USER.md) |
| Arquitetura e decisões | [ARCHITECTURE.md](./02-architecture-design/ARCHITECTURE.md) · [ADR.md](./02-architecture-design/ADR.md) · [CHOOSE_TECH_STACK.md](./02-architecture-design/CHOOSE_TECH_STACK.md) · [API.md](./04-api-integrations/API.md) · [INTEGRATIONS.md](./04-api-integrations/INTEGRATIONS.md) |
| Regras e processo | [RULES.md](./03-development-process/RULES.md) · [TASK_BREAKING_DOWN.md](./03-development-process/TASK_BREAKING_DOWN.md) · [CODE_REVIEW.md](./06-devops-deployment/CODE_REVIEW.md) · [ITERATION.md](./08-knowledge-management/ITERATION.md) |
| Desenvolvimento | [SETUP.md](./03-development-process/SETUP.md) · [DEVELOPMENT.md](./03-development-process/DEVELOPMENT.md) · [ONBOARDING.md](./08-knowledge-management/ONBOARDING.md) · [STYLE_GUIDE.md](./02-architecture-design/STYLE_GUIDE.md) · [CONTENT.md](./04-api-integrations/CONTENT.md) |
| Qualidade | [TESTING.md](./03-development-process/TESTING.md) · [QA_TESTING.md](./06-devops-deployment/QA_TESTING.md) · [SECURITY_REVIEW.md](./05-security-compliance/SECURITY_REVIEW.md) · [ERROR_HANDLING.md](./07-operations-marketing/ERROR_HANDLING.md) |
| Operação | [PRODUCTION_DEPLOY.md](./06-devops-deployment/PRODUCTION_DEPLOY.md) · [PREVIEW_DEPLOYMENT.md](./06-devops-deployment/PREVIEW_DEPLOYMENT.md) · [MONITORING.md](./07-operations-marketing/MONITORING.md) · [BACKUP_DR.md](./06-devops-deployment/BACKUP_DR.md) |
| Qualidades não-funcionais | [PERFORMANCE.md](./07-operations-marketing/PERFORMANCE.md) · [ACCESSIBILITY.md](./07-operations-marketing/ACCESSIBILITY.md) · [SEO.md](./07-operations-marketing/SEO.md) · [AEO.md](./07-operations-marketing/AEO.md) · [GEO.md](./07-operations-marketing/GEO.md) · [AIO.md](./07-operations-marketing/AIO.md) · [COMPLIANCE.md](./05-security-compliance/COMPLIANCE.md) · [ANALYTICS.md](./07-operations-marketing/ANALYTICS.md) |
| História e memória | [CHANGELOG.md](./08-knowledge-management/CHANGELOG.md) · [MEMORY.md](./08-knowledge-management/MEMORY.md) · [RESEARCH.md](./08-knowledge-management/RESEARCH.md) · [DESIGN.md](./02-architecture-design/DESIGN.md) |

## Documentos canônicos fora de docs/ (NÃO duplicar — ler lá)

- **DECISOES.md** (raiz) — registro permanente de decisões (o nosso ADR log).
- **PLANO_MESTRE.md** (raiz) — estado consolidado do projeto e Estado Final.
- **docs/06-devops-deployment/RECONCILIATION-REPORT.md** — snapshots de evidência por gate (§22 = WS-D/T448/T465/T469).
- **AGENTS.md** (raiz) — instruções para agentes (graft-first, navegação).
- **SECURITY.md** (raiz) — política de segurança.
- **HANDOFF.md / PENDENCIAS_OPERADOR.md** (raiz) — bastão e pendências do Operador.
- **docs/07-operations-marketing/DATA-INGESTION.md / RANKING-ALGORITHM.md / RBAC-MATRIX.md / RLS-POLICIES.md / OBSERVABILITY.md / PAYMENTS-RUNBOOK.md / BACKUP-RESTORE.md / MANUAL_DO_OPERADOR.md** — domínios específicos.

## Regra de manutenção

Documento aqui que descreve ESTADO (números, features, fornecedores) tem de ser re-ancorado em
produção antes de qualquer edição (regra R3 — ver [RULES.md](./03-development-process/RULES.md)). Snapshot velho que mente
é pior que ausência: prefira apontar para a fonte canônica a copiar números.
