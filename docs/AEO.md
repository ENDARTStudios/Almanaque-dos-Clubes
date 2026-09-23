# AEO.md — Answer Engine Optimization

> Página operacional; estratégia completa: [docs/seo-aeo-aio-geo-strategy.md](./seo-aeo-aio-geo-strategy.md)
> (§3). Atualizada ao estado real de 2026-09-22.

## O que somos para answer engines

Featured snippets / People Also Ask / answer boxes respondem **perguntas factuais** — e o nosso
diferencial estrutural é exatamente isso: **dado factual com fonte citável por registro** (QID +
URL da EDIÇÃO em cada conquista; proveniência 100% no acervo).

## Ativo AEO já em produção

| Ativo | Estado |
|---|---|
| Pergunta-resposta nas páginas de clube (fundação, cidade, país, títulos com ano) | ✅ dados estruturados nas páginas |
| `/champions` (campeão vigente por hierarquia com ano + fonte) | ✅ resposta canônica por pergunta "quem é o campeão de X" |
| Galeria de honra com fonte por título | ✅ T448 |
| JSON-LD `SportsTeam` por clube | ✅ |
| /metodologia (por que a resposta é confiável) | ✅ T469 |

## Regras AEO (da casa)

1. **Formato pergunta→resposta nas superfícies novas**: título/heading = a pergunta; primeiro
   parágrafo = a resposta seca (ano/entidade); fonte logo abaixo (o link do Wikidata).
2. **Dado sem fonte não vira conteúdo público** (honestidade 1.3) — snippet nunca é inventado.
3. **Datas canônicas**: "temporada 2022-23" = ano INICIAL (2022) — convenção do colapso cross-year
   do T448; manter em todo texto para consistência entre páginas e KG.
4. Nomes de entidade: o label do acervo (consistente com o QID) — evita snippet divergente do dado.

## Pendências AEO

- [ ] JSON-LD de conquistas (`SportsEvent`/`winner`) — hoje só SportsTeam.
- [ ] Páginas de competição com "campeão mais recente + lista de vencedores" (resposta canônica
      por competição — o dado já está no KG, falta a superfície).
- [ ] FAQ operacional nas páginas de competição/clube (perguntas reais de PAA, ancoradas no dado).
