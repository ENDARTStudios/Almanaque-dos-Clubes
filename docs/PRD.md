# PRD — Almanaque dos Clubes

> Documento de requisitos de produto, consolidado a partir do Discovery
> (DECISOES.md, Seção 4, respostas Q1–Q7 do Operador) e reconciliado com o
> estado real do repositório.
>
> **Âncora:** HEAD `7a50d99` (main). Tarefa T347, fase F10-docs-reconciliacao.
> Em conflito entre este documento e o código/schema real, **o repositório vence**.

---

## 1. Visão do produto

O Almanaque dos Clubes é uma plataforma mundial de pesquisa e inteligência
sobre futebol que reúne a história completa de clubes, jogadores e
competições, enriquecida por rankings, estatísticas e IA com respostas
fundamentadas em dados (citações).

Não é apenas um diretório: é uma plataforma de inteligência com curadoria,
acervo histórico e conhecimento auditável.

Diferenciais definidos no Discovery:

- Acervo histórico extenso (estilo RSSSF) com modelagem flexível de fontes.
- Rankings auditáveis (imutabilidade pós-publicação + audit log).
- IA/RAG com citações (Fase 6.5).
- Knowledge Graph (Fase 6.6).
- Curadoria editorial.

## 2. Público-alvo e escala

| Segmento | Perfil |
|---|---|
| Consumidor | Torcedores, jornalistas, pesquisadores, criadores de conteúdo, analistas |
| B2B | Clubes e federações |

Escala prevista:

1. **Beta Fechada:** 100 usuários
2. **Open Beta:** 1.000 usuários
3. **Ano 1:** 10.000–50.000 cadastrados

Arquitetura-alvo: monolito modular (não microsserviços) — justificado em
< 50k usuários, mas com paginação correta, índices, cache, rate-limit por
usuário e observabilidade desde já.

## 3. Referências de produto

ZeroZero, Transfermarkt, Soccerway, WorldFootball.net, RSSSF, FBref,
Wikipedia, Sofascore, Flashscore.

Critérios herdados das referências: dados históricos completos, navegação
por entidade, comparação de informações, estatísticas e curadoria.

## 4. Funcionalidades sensíveis (Discovery Q4)

| Item | Resposta | Impacto no plano |
|---|---|---|
| Login | Sim | Fase 3 (auth) OBRIGATÓRIA; 2FA TOTP opcional |
| Pagamento (assinatura) | Sim | Sub-fase de billing (Free/Pro/Elite) |
| Dado sensível | Não | Sem obrigação de classificação extra; hardening mantido |
| Upload | Sim (admin + import/export CSV) | Fase 6.1 upload OBRIGATÓRIA |

## 5. Planos de assinatura

- **FREE** — pesquisa básica (leitura de clubes/competições/rankings).
- **PRO** — escrita + exportação CSV.
- **ELITE** — recursos completos.

> Nota: planos de billing (`SubscriptionPlan` no schema) **não** são o mesmo
> conceito que roles RBAC (`admin/pro/free` em `rbac.service.ts`). Ver
> `docs/RBAC-MATRIX.md`.

## 6. Prazo e marcos

Sem data fixa. Qualidade > velocidade. Marcos sem cronograma:

- **Beta Fechada** — pesquisa de clubes/jogadores + login + área do usuário (Fases 0–5 parcial, 6.1–6.3).
- **Open Beta** — + rankings + billing + observabilidade (Fases 0–8 parcial, 9.1–9.6).
- **v1.0** — + IA RAG com citações + ETL automático + DAST + hardening (todas as fases).

## 7. Marca e domínio

- Nome: **Almanaque dos Clubes**
- Domínio: `almanaquedosclubes.com` (registrado 14/08/2026, Vercel)
- API: `api.almanaquedosclubes.com` (Railway)

## 8. Definição de "pronto" (Discovery Q7)

Pronto = usuário consegue:

1. Pesquisar entidades do futebol mundial.
2. Navegar histórico de clubes, jogadores e competições.
3. Comparar informações entre entidades.
4. Usar IA com citações (RAG).
5. Ter ETL, governança e operação funcionando em segundo plano.
6. Assinar planos Free/Pro/Elite ativos.

## 9. Escopo explícito de exclusão (decisão de 2026-08-22)

As entidades a seguir **não fazem parte do produto** até decisão formal em
contrário do Operador. Elas aparecem apenas em artefatos contaminados
(`packages/domain/src/uml.ts`, `packages/domain/src/rbac-matrix.ts`),
originários de outro projeto sobrescrito por engano neste repositório:

- `Album`, `AlbumItem` (álbum de figurinhas)
- `Streak` (sequência de coleta)
- `Favorite` (favoritos)
- `ApiKey`, `PipelineRun`

Nenhuma dessas entidades existe em `apps/api/prisma/schema.prisma`, no
Discovery ou no RBAC real. Quarentena/remoção pendente de aprovação do
Operador (ESCALATE T347).

## 10. Requisitos não-funcionais herdados do PLANO_MESTRE.md

- Segurança: argon2id (custo ≥ 12), SHA-256 para tokens, refresh rotation
  com detecção de reuso, rate-limit 4 camadas, brute-force lockout, CSRF,
  CSP/HSTS (produção), audit log append-only.
- Performance: compressão gzip/brotli (Fase 13.1), cache Redis read-through.
- Acessibilidade: WCAG 2.1 AA.
- Qualidade: evidência executável antes de `[x]` (PROTOCOLO_MESTRE.md §6).

## 11. Rastreabilidade

- Discovery original: `DECISOES.md` (Seção 4).
- Plano de fases: `PLANO_MESTRE.md`.
- Critérios de desenvolvimento e UML: `docs/CRITERIOS_DESENVOLVIMENTO.md`.
- Roadmap pós-plano: `docs/ROADMAP.md`.
