# CHANGELOG.md — Mudanças por release/round

> Formato: round/task → PRs merged → o que mudou em produção. Detalhe completo:
> [docs/RECONCILIATION-REPORT.md](./RECONCILIATION-REPORT.md) (§ por gate).

## 2026-09-22 — Round WS-D completo + oferta honesta + legal P0

- **#159–#163 (T448)**: arestas WON no Knowledge Graph — conector Wikidata (P1346), sync
  idempotente, hierarquia/gênero congelados, fonte por aresta (EDIÇÃO), vitrine viva
  (Real Madrid/PSG/PSG·Ligue 1), 3 camadas de fix de build Docker (`src/scripts` padrão T430).
- **#164 (T448c)**: tie-break determinístico do carrossel (proxies "mais edições"/"mais campeões"
  reprovados contra o dado — Campeonato Paulista/Serie B).
- **#165 (T448b-1)**: 300 mães-copa semeadas (1.263→1.563 competições; classes validadas ao vivo
  + fallback por rótulo).
- **#166/#167 (docs)**: evidência GATE 1/2 + Estado Final em duas camadas.
- **#168 (T448d)**: guarda de vigência (edição futura não vira vigente) + cache invalidate
  fail-loud (anti-padrão catch-silencioso nomeado: 3ª instância).
- **#169 (T448e)**: representante nacional = LEAGUE (type-first; backfill das 18 ligas nulas).
- **#170 (T448f)**: type-first CONDICIONAL por grupo de flagship (mundial/continental voltam a
  vigência-first — continental restaurado para UCL 2025).
- **#171 (T465)**: oferta honesta — fonte única do catálogo (checkout consome plan-features),
  IA/API "(em breve)", KG ENTREGUE na ELITE, "ilimitada" = 0, preço intocado.
- **#172 (T469)**: legal P0 — prazos LGPD/GDPR, retenção concreta, incidentes, menores,
  fornecedores + transferência + DPAs públicos, **Google Fonts auto-hospedado**, consent E2E
  produção 11/11, **ZERO cookies antes da escolha**, claims re-ancoradas, /metodologia.

## 2026-09-21 — M3 + GATE 1 do WS-D

- #158: M3 Open Beta (monetizar) DECLARADO — Stripe live, checkout, webhook HMAC idempotente,
  CDC art. 49 (estorno real fail-loud), compliance T445, histórico de cobranças.
- #159–#163 (T448 GATE 1): 2.826 arestas WON em produção, spot-check 20/20, re-run idempotente.

## Anteriores

M2 (rankings/favoritos/comparadores/carrossel) #107–#119 · M1 (banner + legais) #101–#106 ·
fundação #1–#100 — detalhe no PLANO_MESTRE e no histórico de PRs.
