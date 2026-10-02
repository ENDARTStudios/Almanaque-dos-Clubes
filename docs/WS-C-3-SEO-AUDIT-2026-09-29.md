# Auditoria SEO do site público — evidência para a decisão de sitemap (WS-C-3 / T454)

> Data: 2026-09-29 23:48 UTC · Método: crawler próprio `scripts/local/seo-crawl.mjs`
> (sequencial, ~1 req/s, 10 URLs, sem dependências, sem segredos).
> Bruto efêmero: `/tmp/seo-audit-results.json`. Branch local, sem push.

## Estado verificado

| Verificação | Resultado |
|---|---|
| `robots.txt` | 200; declara `Sitemap: https://almanaquedosclubes.com/sitemap.xml` |
| `sitemap.xml` | 200; **6 URLs** |
| `/map` | 200 · title "Mapa-múndi \| Almanaque dos Clubes" · canonical **correto** (`https://almanaquedosclubes.com/map`) · `index, follow` |
| `/preview/mapa` | 200 · `noindex, nofollow` · fora do sitemap · fora do nav |
| Rotas internas no sitemap | `/auth/login`, `/auth/register` (ver achados) |
| Erros 4xx/5xx | **zero** em 10 URLs |
| Latência | todas < 2 s |

Sitemap atual (exato): `/`, `/clubs`, `/players`, `/rankings`, `/auth/login`, `/auth/register`.

## Achados

### [MÉDIO] Canonical auto-referente quebrado em todas as páginas, exceto `/map`

Toda página testada declara `rel=canonical` apontando para a **raiz**
(`https://almanaquedosclubes.com`): `/`, `/clubs`, `/players`, `/rankings`,
`/metodologia`, `/auth/login`, `/auth/register`, `/preview/mapa`.
Efeito: sinaliza ao buscador que essas páginas são duplicatas da home —
dilui indexação de `/rankings` e `/metodologia` (conteúdo público).
**`/map` (release WS-C-3) está correto** com self-canonical.
Correção: self-canonical por página no metadata do Next.js (`apps/web`).
Sem migration, sem banco — patch de metadata.

### [BAIXO] Páginas de auth no sitemap e indexáveis

`/auth/login` e `/auth/register` estão no `sitemap.xml` com `index, follow`
(e herdaram title/canonical da home). Recomendado: remover do sitemap +
`noindex` — páginas de sessão não pertencem a sitemap.

### [BAIXO] `/metodologia` fora do sitemap

Página pública de conteúdo essencial não está no sitemap. Adicionar na próxima
revisão do sitemap (junto com a decisão de `/map`).

## Relevância para a decisão do sitemap (T454 Fase 5)

- `/map` está **tecnicamente pronto** para entrar no sitemap: 200 estável,
  self-canonical correto, `index, follow`, performance ok.
- Os achados **não bloqueiam** a adição de `/map`, mas o bug de canonical
  ataca a mesma superfície (metadata). Recomendação de batching: corrigir o
  self-canonical **antes ou no mesmo batch** da release do sitemap, para não
  publicar o `/map` no sitemap enquanto o resto do site sinaliza duplicação
  da home.
- Mudanças propostas (todas web-only, zero banco): self-canonical; `/auth/*`
  fora do sitemap + noindex; `/metodologia` no sitemap; `/map` no sitemap.
