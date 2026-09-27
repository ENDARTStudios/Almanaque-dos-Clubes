# docs/ — Índice da documentação

> Almanaque dos Clubes — plataforma de inteligência histórica do futebol com proveniência auditável.
> Documentação em pt-BR. Cada arquivo abaixo aponta para a fonte canônica quando existe — este índice
> **NÃO duplica** conteúdo que drifta; ele **roteia**.

## Como navegar (9 domínios)

| Domínio                                               | Propósito                                               |
| ----------------------------------------------------- | ------------------------------------------------------- |
| [01-product-discovery](./01-product-discovery/)       | Problema, usuário, PRD, roadmap, preço, termos          |
| [02-architecture-design](./02-architecture-design/)   | Arquitetura, ADRs, stack, modelo de dados, UML, design  |
| [03-development-process](./03-development-process/)   | Setup, regras, tarefas, testes, critérios               |
| [04-api-integrations](./04-api-integrations/)         | API, conteúdo, integrações                              |
| [05-security-compliance](./05-security-compliance/)   | Segurança, LGPD/compliance, IAM, RBAC/RLS, incidentes   |
| [06-devops-deployment](./06-devops-deployment/)       | CI/CD, deploy, backup/DR, code review, evidências       |
| [07-operations-marketing](./07-operations-marketing/) | Operação, monitoramento, performance, SEO/AEO/GEO/AIO   |
| [08-knowledge-management](./08-knowledge-management/) | Changelog, memória, onboarding, conduta/contribuição    |
| [09-references](./09-references/)                     | Histórico técnico estático (tasks/descobertas passadas) |

## 01-product-discovery

- [PRD.md](./01-product-discovery/PRD.md) — requisitos de produto
- [DEFINE_THE_USER.md](./01-product-discovery/DEFINE_THE_USER.md) — persona/usuário-alvo
- [ROADMAP.md](./01-product-discovery/ROADMAP.md) — o que vem a seguir
- [LEGAL_TERMS.md](./01-product-discovery/LEGAL_TERMS.md) · [LEGAL-FIELDS.md](./01-product-discovery/LEGAL-FIELDS.md) — termos/campos legais
- [PRICING_MONETIZATION.md](./01-product-discovery/PRICING_MONETIZATION.md) — preço/monetização

## 02-architecture-design

- [ARCHITECTURE.md](./02-architecture-design/ARCHITECTURE.md) — arquitetura (⊕ catálogo de componentes)
- [UML.md](./02-architecture-design/UML.md) — UML (⊕ gap analysis ⊕ quarentena)
- [ADR.md](./02-architecture-design/ADR.md) · [CHOOSE_TECH_STACK.md](./02-architecture-design/CHOOSE_TECH_STACK.md) — decisões/stack
- [DATA_MODEL.md](./02-architecture-design/DATA_MODEL.md) · [DESIGN.md](./02-architecture-design/DESIGN.md) · [STYLE_GUIDE.md](./02-architecture-design/STYLE_GUIDE.md)
- [GREEN_COMPUTING.md](./02-architecture-design/GREEN_COMPUTING.md) · [diagrams/](./02-architecture-design/diagrams/)
- Ranking: [METODOLOGIA_RANKING.md](./02-architecture-design/METODOLOGIA_RANKING.md) · [RANKING-ALGORITHM.md](./02-architecture-design/RANKING-ALGORITHM.md)

## 03-development-process

- [DEVELOPMENT.md](./03-development-process/DEVELOPMENT.md) · [SETUP.md](./03-development-process/SETUP.md) · [RULES.md](./03-development-process/RULES.md)
- [TASKS.md](./03-development-process/TASKS.md) · [TASK_BREAKING_DOWN.md](./03-development-process/TASK_BREAKING_DOWN.md) · [TESTING.md](./03-development-process/TESTING.md)
- [CRITERIOS_DESENVOLVIMENTO.md](./03-development-process/CRITERIOS_DESENVOLVIMENTO.md) · [CLEANUP-TEST-ACCOUNTS.md](./03-development-process/CLEANUP-TEST-ACCOUNTS.md)

## 04-api-integrations

- [API.md](./04-api-integrations/API.md) — contrato da API (⊕ auth)
- [CONTENT.md](./04-api-integrations/CONTENT.md) · [INTEGRATIONS.md](./04-api-integrations/INTEGRATIONS.md)

## 05-security-compliance

- [COMPLIANCE.md](./05-security-compliance/COMPLIANCE.md) · [SECURITY_REVIEW.md](./05-security-compliance/SECURITY_REVIEW.md) · [INCIDENT_RESPONSE.md](./05-security-compliance/INCIDENT_RESPONSE.md)
- [RBAC.md](./05-security-compliance/RBAC.md) · [RLS.md](./05-security-compliance/RLS.md) · [BRANCH-PROTECTION.md](./05-security-compliance/BRANCH-PROTECTION.md)
- [IAM_IGA.md](./05-security-compliance/IAM_IGA.md) · [MFA.md](./05-security-compliance/MFA.md) · [NAC.md](./05-security-compliance/NAC.md) · [ZTNA.md](./05-security-compliance/ZTNA.md)
- [THREAT_MODELING.md](./05-security-compliance/THREAT_MODELING.md) · [VULNERABILITY_DISCLOSURE.md](./05-security-compliance/VULNERABILITY_DISCLOSURE.md)
- [AUDITORIA_LICENCA_FONTES.md](./05-security-compliance/AUDITORIA_LICENCA_FONTES.md) · [protection-before.json](./05-security-compliance/protection-before.json)

## 06-devops-deployment

- [PRODUCTION_DEPLOY.md](./06-devops-deployment/PRODUCTION_DEPLOY.md) · [PREVIEW_DEPLOYMENT.md](./06-devops-deployment/PREVIEW_DEPLOYMENT.md) · [CI_CD_PIPELINE.md](./06-devops-deployment/CI_CD_PIPELINE.md)
- [BACKUP_DR.md](./06-devops-deployment/BACKUP_DR.md) · [FINOPS.md](./06-devops-deployment/FINOPS.md) · [CODE_REVIEW.md](./06-devops-deployment/CODE_REVIEW.md) · [QA_TESTING.md](./06-devops-deployment/QA_TESTING.md)
- [RECONCILIATION-REPORT.md](./06-devops-deployment/RECONCILIATION-REPORT.md) — snapshots de evidência por gate (§22 = WS-D/T448/T465/T469)
- [evidence/](./06-devops-deployment/evidence/) — verificações, rollbacks, prints

## 07-operations-marketing

- Operação: [MANUAL_DO_OPERADOR.md](./07-operations-marketing/MANUAL_DO_OPERADOR.md) · [PAYMENTS-RUNBOOK.md](./07-operations-marketing/PAYMENTS-RUNBOOK.md) · [DATA-INGESTION.md](./07-operations-marketing/DATA-INGESTION.md) · [DATA-POPULATION.md](./07-operations-marketing/DATA-POPULATION.md)
- Observabilidade/perf: [MONITORING.md](./07-operations-marketing/MONITORING.md) · [PERFORMANCE.md](./07-operations-marketing/PERFORMANCE.md) · [ERROR_HANDLING.md](./07-operations-marketing/ERROR_HANDLING.md) · [ANALYTICS.md](./07-operations-marketing/ANALYTICS.md)
- Marketing/SEO: [SEO.md](./07-operations-marketing/SEO.md) · [AEO.md](./07-operations-marketing/AEO.md) · [GEO.md](./07-operations-marketing/GEO.md) · [AIO.md](./07-operations-marketing/AIO.md)
- [ACCESSIBILITY.md](./07-operations-marketing/ACCESSIBILITY.md) · [HERO-NUMEROS.md](./07-operations-marketing/HERO-NUMEROS.md)

## 08-knowledge-management

- [CHANGELOG.md](./08-knowledge-management/CHANGELOG.md) · [MEMORY.md](./08-knowledge-management/MEMORY.md) · [RESEARCH.md](./08-knowledge-management/RESEARCH.md) · [ITERATION.md](./08-knowledge-management/ITERATION.md)
- [ONBOARDING.md](./08-knowledge-management/ONBOARDING.md) · [CONTRIBUTING.md](./08-knowledge-management/CONTRIBUTING.md) · [CODE_OF_CONDUCT.md](./08-knowledge-management/CODE_OF_CONDUCT.md) · [DEPRECATION_POLICY.md](./08-knowledge-management/DEPRECATION_POLICY.md)

## 09-references (histórico técnico)

- [T449C-V2-FASE0-DESIGN.md](./09-references/T449C-V2-FASE0-DESIGN.md) · [T448B2C-DISCOVERY-UFS.md](./09-references/T448B2C-DISCOVERY-UFS.md) · [T448B2D-PR-BLOCK-GO-DISCOVERY.md](./09-references/T448B2D-PR-BLOCK-GO-DISCOVERY.md)
- [FASE0-T448b-2b-rsssf-estaduais.md](./09-references/FASE0-T448b-2b-rsssf-estaduais.md) · [HANDOFF-T445.md](./09-references/HANDOFF-T445.md) · [VERIFICACAO-T387.md](./09-references/VERIFICACAO-T387.md) · [CI-ROOT-CAUSE.md](./09-references/CI-ROOT-CAUSE.md)

## Estado do produto (verificado em produção, 2026-09-22)

| Dimensão                                | Estado                                                                  |
| --------------------------------------- | ----------------------------------------------------------------------- |
| Identidade (clubs/players/competitions) | 3.857 / 2.396 / 1.563 — proveniência 100%                               |
| Conquistas (Knowledge Graph `WON`)      | 5.157 arestas, fonte por aresta (URL da EDIÇÃO), zero duplicados        |
| Vitrine                                 | carrossel + galeria de honra + comparador, corrigidos POR HIERARQUIA    |
| Oferta                                  | /planos ≡ /checkout com fonte única; IA/API = "em breve"; KG = ENTREGUE |
| Legal                                   | P0 autônomo no ar (T469); identidade/DPO/DPAs/advogado = Operador       |

## Documentos canônicos fora de docs/ (NÃO duplicar — ler lá)

- **DECISOES.md** (raiz) — registro permanente de decisões (o nosso ADR log).
- **PLANO_MESTRE.md** (raiz) — estado consolidado do projeto e Estado Final.
- **AGENTS.md** (raiz) — instruções para agentes (graft-first, navegação).
- **SECURITY.md** (raiz) — política de segurança.
- _*HANDOFF.md / PENDENCIAS_OPERADOR.md / PROMPT_* / worklog.md_* (raiz) — bastão, pendências e histórico de sessão do Operador.
- **docs/06-devops-deployment/RECONCILIATION-REPORT.md** — snapshots de evidência por gate.

## Regra de manutenção

Documento aqui que descreve ESTADO (números, features, fornecedores) tem de ser re-ancorado em
produção antes de qualquer edição (regra R3 — ver [RULES.md](./03-development-process/RULES.md)). Snapshot velho que mente
é pior que ausência: prefira apontar para a fonte canônica a copiar números.
