# INTEGRATIONS.md — Integrações e fornecedores

> Fontes de dados (entrada) e provedores (operação). Tabela LGPD completa em /privacidade §4 e §11
> (T469). Regra: reduzir fornecedor = reduzir transferência; todo fornecedor novo entra na tabela
> com função, dados, país, base legal e mecanismo.

## Fontes de dados (entrada — autônomas do Doer)

| Fonte | Licença | Uso | Proveniência |
|---|---|---|---|
| Wikidata SPARQL | CC0 | clubs/players/competitions (T429), arestas WON (T448), copas (T448b-1), geolocalização | QID + sourceUrl + data + licença por registro |
| RSSSF (planejado T448b-2/T449) | domínio público | estaduais/municipais, partidas | a definir no conector |

Lições do endpoint Wikidata: query pesada com label service → 504; URL GET > ~4k chars → 431
(labels em consulta VALUES-bounded, chunk 200); janelas de 5 anos + union-first + range dateTime;
retry/backoff via `http-resilience` (fetcher injetável para testes).

## Provedores de operação

| Provedor | Função | Dados | País/base | DPA |
|---|---|---|---|---|
| Vercel | frontend + geo de borda (`x-vercel-ip-country`) | IP (país), tráfego | EUA + edge global | público |
| Railway | API + Postgres + Redis + worker | dados da plataforma | EUA (região do projeto) | mediante solicitação — Operador coleta |
| Cloudflare | DNS/proteção de rede | sem cookies no domínio (verificado T469) | global | público |
| Stripe | pagamentos (LIVE) | pagamento, e-mail, país | EUA | público |
| Resend | e-mail transacional (reset de senha) | e-mail | EUA | público |
| ipwho.is | geolocalização de IP SÓ no checkout | IP (país → moeda) | sem chave | documentado em /privacidade §11; remoção futura = pass-through do geo Vercel (T471/WS-S) |
| Cloudflare R2 | backups (pg_dump, 30d) | dump do banco | global | público |
| Google Fonts | **REMOVIDO** (T469 — auto-hospedado, 27 woff2 OFL) | — | — | — |

## Regras de mudança

- Fornecedor novo entra na tabela de /privacidade (×3 idiomas) ANTES de receber dado real.
- Geo por header do provedor já contratado (Vercel/Cloudflare) é preferível a terceiro novo.
- IA: NÃO operacional — disclosure cheio (provedor/país/retenção/treinamento) só quando shippar.
