# HERO-NUMEROS.md — Números reais e auditáveis do hero

## Decisão (T394)
O hero exibia **"50k+ clubes / 200k+ jogadores / 10k+ competições / 1M+ partidas"** — inflados vs. o acervo real, configurando **risco de publicidade enganosa** (CDC, art. 37, §1º). Corrigido para os valores reais e auditáveis.

## Contagem real (produção, 2026-09-02)
- **Clubes: 10** — `SELECT COUNT(*) FROM clubs WHERE deleted_at IS NULL`
- **Competições: 3**
- **Rankings: 2**
- Jogadores: 0 (módulo ainda sem dados → métrica removida do hero)
- Partidas: 0 (→ métrica removida do hero)

## Alteração
- `apps/web/src/components/HeroSection.tsx`: 4 stats inflados → **3 stats reais** (clubes **10**, competições **3**, rankings **2**); grid `md:grid-cols-4` → `md:grid-cols-3`. Removidas as métricas de jogadores/partidas (0).
- `apps/web/src/i18n/*`: adicionado `home.stats.rankings` (pt/en/es).

## Critério
- **Números exatos** (sem arredondamento para cima; "10"/"3"/"2", não "10k+").
- Ao crescer o acervo, atualizar os valores **e este doc** — revisar o hero a cada atualização de dados para não reintroduzir overclaim.

## Auditoria
- Contagem via API pública (2026-09-02): `/api/v1/clubs?limit=1` → `total:10` · `/competitions` → `total:3` · `/rankings` → `total:2`.
- Fonte: banco de produção (Postgres Railway).
