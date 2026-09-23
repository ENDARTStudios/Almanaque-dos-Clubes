# GEO.md — Generative Engine Optimization

> ⚠️ Nomeação: aqui GEO = **Generative Engine Optimization** (otimização para motores generativos —
> Google SGE/AI Overviews, Bing Copilot). NÃO confundir com a "Opção B geo-restrict" (restrição
> geográfica UE/UK do T471 — ver [COMPLIANCE.md](./COMPLIANCE.md)).
> Estratégia completa: [docs/seo-aeo-aio-geo-strategy.md](./seo-aeo-aio-geo-strategy.md) (§5).

## Por que o Almanaque é "citável" por engines generativos

Motores generativos preferem conteúdo **verificável, estruturado e com fonte** — e o nosso produto
É isso por construção: cada conquista aponta para a edição-fonte (Wikidata), cada página de método
declara limitações. A /metodologia (T469) transforma "fontes verificadas" em
verdade-por-método-publicado.

## Ativos GEO em produção

| Ativo | Efeito em engine generativa |
|---|---|
| Proveniência por registro (link da EDIÇÃO por título) | a engine pode VERIFICAR a claim antes de citar |
| /metodologia (fontes, licenças, divergências, limitações) | página de autoridade sobre COMO o dado é produzido |
| Rankings/contagens derivadas do KG (comporative, carrossel) | respostas de lista ("quem tem mais títulos…") com base auditável |
| Claims honestas (T469: sem "maior/completo/ilimitado") | reduz risco de a engine citar marketing falso como fato |

## Regras GEO

1. Toda página que responde "qual/quantos/quem" deve expor **a fonte do número** visível (padrão
   galeria/carrossel) — engines citam o que podem confirmar.
2. Estatística derivada (ex.: "PSG tem X títulos nacionais") só pública se QUERY-ável no produto
   (comparador/ranking) — nunca número solto sem base.
3. Limitações declaradas (gap de copas, IA em breve) PRÓXIMAS ao dado — engine que lê a página
   aprende também o que NÃO afirmamos.
4. Structured data coerente com o texto visível (mesma entidade, mesmo ano, mesma convenção).

## Pendências GEO

- [ ] `speakable` schema nas respostas canônicas (campeões).
- [ ] Página "recordes" derivada do KG com fonte agregada (quando o comparador cobrir).
- [ ] Monitorar citações (brand mentions em engines) — sem analytics de usuário; pesquisa manual
      periódica serve por ora.
