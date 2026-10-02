# WS-C FASE 0 — Design read-only da Experiência Core (mapa, perfis, busca, carrossel)

> **Estado:** FASE 0 (read-only). **Zero escrita, zero migration, zero produção alterada, zero UI pública nova.**
> Objetivo: desenhar a camada de produto sobre a base expandida (WS-D M1b/M1a-3) e o maior gap do
> `PLANO_MESTRE` (Features Core ~5%).
> **Trava de conformidade:** nenhuma UI que consuma dados geo OSM/Nominatim pode ser **publicada** antes de
> `/metodologia` conter a atribuição ODbL viva (pendência Vercel — `PENDENCIAS_OPERADOR.md` item [2]).

## 3.1 Bootstrap read-only (medido ao vivo, 2026-09-27)

**Git/CI:** `main` = `7ae31b8` (após #260). Required check = `security-gate` (verde). PRs abertos: nenhum.

**Site (produção):** `https://almanaquedosclubes.com` 200 · `/rankings` 200 · `/metodologia` 200
(**ODbL ainda ausente** — bloqueio Vercel). `/map`, `/clubs`, `/search`, `/compare` existem como rotas.

**API (produção):** `/api/v1/health` 200 · `/clubs` 200 · `/clubs/:id` 200 · `/clubs/:id/geo` 200 ·
`/clubs/geo-stats` 200 · `/competitions` 200 · `/rankings` 200 · `/champions` 200.

**Banco (read-only):**

| Métrica | Valor |
| --- | --- |
| Clubes ativos | **9.291** |
| Com coordenada | **6.366** (68,5%) |
| Sem coordenada | **2.925** (31,5%) |
| `coordSource` | none 5.865 · nominatim 451 · P115_P131 34 · P276 12 · P159_P131 4 |
| Competições ativas | **1.905** (com `level` = 5 — só o piloto EN) |
| Rankings | 9 escopos por divisão + 1 `country_pyramid` |
| `ranking_entries` | **256** (hash `d2b117aa…`) |
| KG `WON` (não soft-deleted) | nacional 4.874 · continental 267 · mundial 16 · **estadual 7** |
| Players / Stadiums / Matches | 2.396 / **0** / **0** |

**Integridade:** estadual RSSSF = 7; agregado Inglaterra intacto; 0 clubes ativos sem QID; 0 duplicatas de QID.

## 3.2 Inventário de capacidades existentes (repo)

**Web (Next.js 16, `apps/web/src`):**
- Páginas: `/` (`page.tsx`), `/clubs`, `/clubs/[id]`, `/competitions`, `/competitions/[id]`, `/players`,
  `/players/[id]`, `/rankings`, `/map`, `/search`, `/compare`, `/favoritos`, `/dashboard`(+`/history`,`/subscription`),
  `/planos`, `/checkout`, `/auth/*`, páginas legais.
- Componentes: `MapExplorer`, `WorldChoropleth`, `WorldMap`, `MapSection`, `ChampionsCarousel`, `ClubCard`,
  `SearchBar`, `SearchResults`, `RankingsTable`, `Compare*`, `FavoriteButton`, `Navbar`, `Footer`, `HeroSection`.
- Libs: `lib/api.ts` (cliente), `lib/api-base.ts`, `lib/flags.ts` (feature flags: páginas legais/cookies),
  `lib/consent*.ts`, `lib/pricing.ts`, `lib/plan-features.ts`, `lib/sanitize.ts`.
- i18n: `i18n/{config,types,Provider,getDictionary}` + `dictionaries/{pt-br,en-us,es-es}`.
- SEO: `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`. Motion: `hooks/useGsap.ts`.
- Favoritos: `hooks/useFavorites.ts` + `/favoritos`.
- **Sem E2E** (nenhum Playwright/Cypress). Testes web: `vitest run`.

**API (Fastify, `apps/api/src`):**
- Módulos: `clubs` (list/detail/geo/geo-stats/titles), `competitions`, `players`, `rankings`
  (divisão + `country_pyramid`), `champions`, `etl` (conectores Wikidata/RSSSF + geo), `auth`, `graph`.
- Busca: helper `lib/search.ts` (`translate()+lower()` nativo do Postgres, **sem extensão**), aplicado a
  clubs/players/competitions; `prisma/fulltext-indexes.sql` (coluna `search_vector tsvector`) e
  `prisma/extensions.sql` (documenta extensões; produção só tem `plpgsql`).
- Geo: `clubs/:id/geo` (`ClubGeoView`) + `clubs/geo-stats` (agregado). **Atribuição ODbL já exposta**
  (PR #259) quando `metadata.coordSource` ∈ OSM/Nominatim.
- `clubs.metadata` (JSONB) com `coordSource/coordPrecision/coordAttribution`.
- Cache Redis read-through (`clubs:list:*`, `clubs:byId:*`, `clubs:geo:*`, `clubs:geo-stats`,
  `rankings:*`, `champions:*`).

**Dados:** players 2.396; **stadiums/matches = 0** (gaps declarados). Competições com `level` só no piloto EN.

## 3.3 Mapa-múndi — opções (sem implementar)

| Opção | Prós | Contras | Veredito |
| --- | --- | --- | --- |
| **Leaflet** (já usado: `WorldChoropleth`/`WorldMap`) | Já integrado, leve, OSS, mobile | Precisa de tiles (OSM → atribuição) ou GeoJSON local | **Preferida** para o ponto |
| **MapLibre GL** | Vetorial, GPU, bom zoom | Bundle maior, estilo hospedado | 2ª opção |
| **OpenLayers** | Completo | Pesado p/ o caso | Não |
| **D3 + GeoJSON/TopoJSON** | Zero tile externo; já há `public/geo/ne_110m_admin_0_countries.geojson` (Natural Earth, domínio público) | Menos "slippy map" | **Preferida p/ o choropleth** (já é o padrão atual) |
| **React Simple Maps** | Simples | Menos flexível | Fallback |

**Recomendação:** manter o par atual — **choropleth com Natural Earth local** (sem OSM, sem atribuição ODbL
obrigatória) + **drill-down por listas** (continente→país→estado→cidade), que já funciona em `MapExplorer`.
O "ponto no mapa" (Leaflet + tiles OSM) fica **atrás do gate ODbL**.

**Critérios de produto:** open source, custo zero, mobile-first, acessível (navegação por teclado/leitor de
tela via lista; o mapa é acessório), sem carregamento visível sempre que possível, busca global, atribuições
visíveis (Wikidata CC0; RSSSF por autor; OSM/Nominatim © OpenStreetMap contributors (ODbL)).

**Regras de dado:** clubes **sem coordenada não são plotados como ponto falso** (vazio-honesto); podem
aparecer na listagem por país/cidade quando houver hierarquia confiável (T466).

**Gate de conformidade:** a camada de pontos OSM só pode ser **publicada** após `/metodologia` conter ODbL.
Enquanto pendente: desenvolvimento local/staging permitido; **sem promoção pública**.

## 3.4 Perfil de clube — MVP (sobre dados existentes)

**Já disponível:** nome, `fullName`, país/estado/cidade (texto + hierarquia T466), `foundedYear`, QID,
`sourceUrl`, `importedFrom`, títulos (KG `WON` via `/clubs/:id/titles`), coordenada (`/clubs/:id/geo` com
atribuição), competições relacionadas, e `compare` (métricas/timeline/títulos).

**Gaps de schema/API:** estádio (0 registros), matches (0), "correlações KG" além de WON, paginação de
títulos por ano, i18n do detalhe (PT/EN/ES), SEO/AEO das páginas dinâmicas (`generateMetadata`), e bloco
visual de atribuição por card.

## 3.5 Busca global

**Estado:** `/search` + `SearchBar`/`SearchResults`; API casa por `translate()+lower()` (case/acento) em
clubs/players/competitions; existe `search_vector` (tsvector) e `fulltext-indexes.sql`.

**Proposta (Postgres, custo zero):** unificar em `GET /search?q=&types=&limit=` (clubs+competitions+players),
ranqueamento simples (match exato > prefixo > contém; boost por país/liga), homônimos desambiguados por
QID/contexto (nunca por nome), rate limit + cache read-through. **Não** autorizar Meilisearch/OpenSearch
(pago) sem o Operador; se necessário, fase posterior auto-hospedada.

## 3.6 Carrossel de campeões

**Já existe** `ChampionsCarousel` + `/champions`. **Regras determinísticas propostas:** hierarquia
mundial→continental→nacional→estadual (municipal só se houver dado); usar **somente** arestas KG `WON` com
proveniência; não escolher campeão ambíguo (se empate/ausência → omite); não misturar gênero sem escopo
explícito; exibir fonte/atribuição; **MG/GO/PR/EN intactos** (estadual = 7).

## 3.7 Sequenciamento recomendado

1. **Contratos geo + atribuição** (feito parcialmente no #259) e robustez de `/clubs/:id/geo`.
2. **Perfil de clube read-only** sobre dados existentes (fechar gaps visuais/i18n/SEO; sem novo schema).
3. **Busca global** unificada em Postgres.
4. **Carrossel de campeões** (regras determinísticas + atribuição).
5. **Mapa-múndi UI** — **somente após ODbL live** em `/metodologia`.
6. **Timeline/comparações** (evolução sobre `Compare*`).
7. **Feminino / jogadores / estádios / mídias** em rounds posteriores.

## 3.8 Riscos

ODbL pendente (bloqueia a camada de pontos) · cobertura geográfica incompleta (31,5% sem coord) · homônimos ·
performance de listagem global (9.291 clubes) · invalidação de cache · acessibilidade do mapa · SEO de páginas
dinâmicas · dependência do limite Vercel (deploy) · legal/pagamento dependente do Operador.

## 3.9 Checkpoint WS-C FASE 0

1. Este documento (`docs/WS-C-FASE0-DESIGN.md`);
2. inventário vivo (§3.1–3.2);
3. opções técnicas comparadas (§3.3);
4. sequência recomendada (§3.7);
5. gates de conformidade (§3.3/§3.6);
6. **confirmação:** zero escrita · zero migration · zero produção alterada · **zero UI pública de mapa OSM** ·
   MG/GO/PR intactos · estadual RSSSF = 7 · `ranking_entries` intactos.
