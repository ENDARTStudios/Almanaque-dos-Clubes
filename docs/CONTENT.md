# CONTENT.md — Conteúdo e i18n

## Idiomas

Interface: **pt-br, en-us, es-es** (dicionários em `apps/web/src/i18n/dictionaries/`, tipados por
`src/i18n/types.ts` — Dictionary interface; toda chave nova entra nos 3 idiomas E no tipo).
Documentos legais: hoje **PT** (claim honesto no rodapé/texto: "legais em pt, expansão em curso" —
tradução cheia = T472). Checkout: PT-only hoje (T468 = i18n do checkout, pré-beta).

## Estrutura

- `dict.pages.<namespace>` — documentos institucionais (planos, seguranca, cookiePolicy,
  termosAssinatura, ia, sobre) renderizados por `ContentDocument`.
- `dict.legal.terms | legal.privacy` — documentos legais v1.3 (22/09/2026) com
  `version`/`updated` POR documento (renderizados por `LegalDocument`).
- Fontes: **Barlow/Barlow Condensed auto-hospedadas** (`public/fonts/`, OFL) — sem Google Fonts.
- Preços nos textos: tokens `{free}/{proMonthly}/{eliteMonthly}` resolvidos pela moeda da
  localização (nunca pelo idioma).

## Regras de conteúdo (oferta é conteúdo)

1. Claims ancoradas no estado real (T469): sem "maior/completo/ilimitado"; "fontes verificadas"
   amarrado a /metodologia; IA só como "em breve".
2. Toda chave nova: ×3 idiomas + `types.ts` + prettier. Falta de paridade = falha de build no
   melhor caso e claim inconsistente no pior.
3. Texto legal: parágrafo novo em PT **com tradução en/es no mesmo PR** (as seções existem nos 3).
4. Placeholders de identidade: `[a confirmar pelo Operador]` — nunca PII de auditoria/terceiro (W2).
5. `version`/`updated` do documento legal bumpam a cada edição de conteúdo (histórico dentro do doc).

## Catálogo da oferta

FONTE ÚNICA: `src/lib/plan-features.ts` (consumido pelo /checkout). Recurso não-operacional só
aparece com "(em breve)"; nada de "ilimitado". Alterar catálogo = alterar oferta (reduzir é
autônomo; adicionar = Operador).
