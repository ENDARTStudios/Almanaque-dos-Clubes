# SEO.md — SEO/AEO/GEO

## Implementado

- `app/sitemap.ts` + `app/robots.ts` (rotas públicas indexáveis; checkout/dashboards fora).
- Metadata por página (title/description/OpenGraph/Twitter) — home re-ancorada nas claims honestas
  do T469 ("acervo histórico em construção, com proveniência documentada"; sem "maior acervo",
  sem IA operacional).
- Dados estruturados JSON-LD (`SportsTeam`) nas páginas de clube.
- Páginas legais/planos com `metadata` própria; checkout com `robots: noindex`.
- Estratégia estratégica em [docs/seo-aeo-aio-geo-strategy.md](./seo-aeo-aio-geo-strategy.md).

## Diferencial AEO/GEO (answer engines)

A proveniência por registro (QID/URL da fonte em cada dado) e a página /metodologia são o
diferencial: resposta citável com fonte verificável é o que answer engines e usuários citam.
Regra: toda superfície nova pública deve expor a fonte do dado (padrão da galeria de honra).

## Pendências

- [ ] hreflang pt/en/es por página (interface é tri-idioma; legais hoje PT — claim honesto já no
      rodapé/texto; T472).
- [ ] JSON-LD para conquistas/títulos (hoje só SportsTeam).
- [ ] Sitemap dinâmico com clubes/competições (hoje rotas estáticas).

## Regras

Claim pública (home, metadados, marketing) é OFERTA — vale a regra do T465: só descreve o que roda;
"em breve" explícito; nada de "maior/completo/ilimitado" sem comparação/alcance auditáveis.
