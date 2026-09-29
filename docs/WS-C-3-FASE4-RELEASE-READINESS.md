# WS-C-3 FASE 4 — Release readiness do mapa público (LOCAL/OFF, não publicado)

> **Estado:** readiness preparada **localmente**. **Nada publicado.** O mapa público permanece **PROIBIDO**
> até readiness verde + **aprovação explícita do Operador** + **janela Vercel segura**. `noindex` intacto,
> fora do nav, fora do sitemap. Banco intocado · scheduler off · beta pago dormente.

## 1. Estado atual

- **FASE 2** — `GET /api/v1/geo/points` **viva** (`rulesVersion=ws-c3-geo-v1`): features só com coord válida,
  `attribution` por origem (OSM/Nominatim→ODbL; Wikidata→null/CC0), `withoutLocation`, `attributions` por camada,
  validação ISO2/bbox/limit (400), cache 300s, rate limit global.
- **FASE 3** — UI interna **local/off** (branch `proto/ws-c-3-fase3-map-ui-local`): `map-geo`/`map-geojson`/
  `map-viewmodel` + `GeoMapCanvas`/`GeoMapInternal` + rota `preview/mapa` **noindex/nofollow**.
- **Mapa público:** **proibido**. **Guarda de deploy:** ativa (`ci.yml` sem `deploy-vercel-frontend`;
  `deploy-web.yml` com paths; `apps/web/vercel.json` `deploymentEnabled.main=false`).

## 2. Critérios de lançamento público

**A. Conformidade de atribuição (obrigatória):** OSM/Nominatim→“© OpenStreetMap contributors (ODbL)” visível;
Wikidata→CC0/proveniência; RSSSF→autor e “não é domínio público”; Natural Earth→domínio público. **Nenhuma
camada sem atribuição resolvida** → sem atribuição ⇒ **não plotar** (degradado) + aviso.
**B. Honestidade geográfica:** clube sem coord **não é plotado**; aparece em “sem localização”; nenhuma coord
inventada; **nenhum fallback silencioso** p/ centro de país/cidade.
**C. Identidade:** homônimos separados (id/QID/cidade/estado/país); nunca colapsar por nome; links por id/QID.
**D. Performance:** não carregar ~9k markers; bbox/limit/clustering; lazy; cache; skeleton; mobile; JS inicial;
sem layout shift crítico.
**E. Acessibilidade:** lista = caminho principal; mapa acessório (`aria-hidden`/descrição); teclado; contraste;
`prefers-reduced-motion`; `aria-label`; estados loading/error/empty anunciados.
**F. SEO/AEO:** `/preview/mapa` e `/map` permanecem `noindex/nofollow`; sitemap/nav só após aprovação; perfis
de clube não canibalizados; canonical correto se rota pública criada.
**G. Segurança/infra:** rate limit; cache TTL; validação ISO2/bbox/limit; erro sem stack; sem segredo; sem
fetch externo não autorizado; **sem tiles pagos**.
**H. Rollback:** rota pública desligável por flag/`noindex`/nav; deploy reversível; **banco não tocado**; API
geo read-only.

## 3. Matriz de decisão

| Ação                                   | Permitido agora?                                        |
| -------------------------------------- | ------------------------------------------------------- |
| FASE 3 → produção como **interna/off** | Sim, mas **não** vale deploy isolado (batch com FASE 4) |
| **FASE 4 publicar mapa**               | **NÃO** (readiness + aprovação + janela)                |
| Remover `noindex`                      | **NÃO**                                                 |
| Colocar no nav                         | **NÃO**                                                 |
| Adicionar ao sitemap                   | **NÃO**                                                 |

## 4. Plano de smoke futuro (quando liberado)

`/map` (ou rota pública) + `/preview/mapa` (mantém noindex se mantida) · país **BR/PT/GB** · **bbox** · **limit**
· clube **OSM com attribution** · clube **Wikidata sem ODbL indevido** · clube **sem coord** em `withoutLocation`
· **homônimos** · **mobile** · **teclado** · API `/geo/points` · `/rankings`/`/champions`/`/search`/`/profile`
· **SQL** (hash `d2b117aa…`, estadual 7, EN pyramid 1, 0 sem QID, MG/GO/PR intactos).

## 5. Critérios de aprovação

Todos os testes verdes · atribuição visível · performance aceitável · acessibilidade mínima · **Operador aprova**
o lançamento público · **janela Vercel segura**.

## 6. Performance (checklist)

- teto de markers/viewport (`MAX_MARKERS_PER_VIEWPORT` = 500) e cluster threshold;
- fetch por país/bbox (limit ≤ 500);
- cache de GeoJSON Natural Earth (asset local, ~819 KB) + cache API (300s);
- skeleton/loading; sem dependência de rede no primeiro render da lista;
- mobile viewport; `scrollWheelZoom:false`; lazy do Leaflet (`dynamic ssr:false`).

## 7. Acessibilidade (checklist)

heading hierarchy (h1→h2) · labels em botões/controles · **lista como navegação principal** · canvas
`aria-hidden`/`role=img` com descrição · foco visível · contraste · `prefers-reduced-motion` · texto para
leitor de tela em **attribution** e **sem localização** · `aria-live` nos estados.

## 8. Segurança de dados (regras da camada)

- clube sem coord ⇒ **não** marker; sem atribuição (OSM) ⇒ **degradado, não plotado** (`missing_attribution`);
  origem desconhecida ⇒ **não plotado** (`unknown_source`);
- `points`/`degradedPoints`/`withoutLocation` expostos como **gaps declarados**;
- homônimos preservados (id/QID).

## 9. Blockers para publicação pública (atuais)

1. **Aprovação explícita do Operador** para tornar o mapa público.
2. **Janela Vercel segura** (Hobby; deploy escasso) para a release web.
3. Confirmar **atribuição visível** por camada em produção (smoke).
4. Confirmar **performance mobile** e **a11y** no ambiente real.
5. Decisão sobre **`noindex`/nav/sitemap** (permanecem off até aprovação).

## 10. Relação com a guarda

A FASE 3 toca `apps/web/**` ⇒ merge dispararia `deploy-web.yml` (por design). Portanto **não** publicar FASE 3
isoladamente; **batch** com a FASE 4 (release web legítima única), quando houver aprovação + janela.
