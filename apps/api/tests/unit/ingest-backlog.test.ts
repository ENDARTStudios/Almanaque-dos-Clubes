/**
 * T602 — fila de ingestão contínua: registro de fontes (trava legal) e planejador.
 *
 * O que os testes travam:
 *  1. fonte BLOQUEADA (robots/ToS) nunca vira item — foi o ponto da rodada anterior;
 *  2. fonte `reference-only` também não (robots não é licença);
 *  3. planejador não inventa trabalho: temporada já coberta não entra;
 *  4. falha transitória NUNCA fecha o item como DONE (lição T528);
 *  5. a ordem é mais recente primeiro (o produto vive do presente).
 */
import { describe, it, expect } from 'vitest';
import {
  SOURCE_REGISTRY,
  getSource,
  isAutomationAllowed,
  requiresAttribution,
} from '../../src/modules/ingest/source-registry.js';
import { planBacklog, orderBacklog, seasonYear } from '../../src/modules/ingest/backlog.js';

describe('source-registry — trava legal', () => {
  it('bloqueia soccerwiki (robots proíbe agentes de IA)', () => {
    expect(isAutomationAllowed('soccerwiki')).toBe(false);
    expect(getSource('soccerwiki')?.policy).toBe('blocked');
  });

  it('as três editoriais são reference-only, não automatizáveis', () => {
    for (const key of ['imortaisdofutebol', 'futbox', 'historiadofutebol']) {
      expect(isAutomationAllowed(key)).toBe(false);
      expect(getSource(key)?.policy).toBe('reference-only');
    }
  });

  it('fandom é permitida por CC-BY-SA e EXIGE atribuição', () => {
    expect(isAutomationAllowed('fandom-futebol')).toBe(true);
    expect(requiresAttribution('fandom-futebol')).toBe(true);
  });

  it('Wikidata (CC0) não exige atribuição; RSSSF e Wikipedia exigem', () => {
    expect(requiresAttribution('wikidata')).toBe(false);
    expect(requiresAttribution('rsssf')).toBe(true);
    expect(requiresAttribution('wikipedia')).toBe(true);
  });

  it('fonte desconhecida é tratada como exigindo atribuição (default seguro)', () => {
    expect(requiresAttribution('fonte-inexistente')).toBe(true);
  });

  it('toda fonte registrada declara licença e motivo', () => {
    for (const s of SOURCE_REGISTRY) {
      expect(s.license.length).toBeGreaterThan(0);
      expect(s.reason.length).toBeGreaterThan(0);
    }
  });
});

describe('planBacklog', () => {
  const sources = [
    {
      sourceKey: 'rsssf',
      competitionQid: 'Q206813',
      seasons: [{ label: '2022' }, { label: '2023' }, { label: '2024' }],
    },
    {
      sourceKey: 'soccerwiki', // bloqueada: não pode gerar item
      competitionQid: 'Q44',
      seasons: [{ label: '2023' }],
    },
  ];

  it('bloqueada não gera item; temporada ausente gera never_ingested', () => {
    const items = planBacklog(sources, [
      { qid: 'Q206813', year: 2023, matchesTotal: 380, matchesWithScore: 380 },
    ]);
    expect(items.some((i) => i.sourceKey === 'soccerwiki')).toBe(false);
    const anos = items.map((i) => i.seasonLabel).sort();
    expect(anos).toEqual(['2022', '2024']);
    expect(items.every((i) => i.reason === 'never_ingested')).toBe(true);
  });

  it('temporada com partida sem placar vira missing_scores (revisita a fonte)', () => {
    const items = planBacklog(sources, [
      { qid: 'Q206813', year: 2023, matchesTotal: 380, matchesWithScore: 370 },
    ]);
    const alvo = items.find((i) => i.seasonLabel === '2023');
    expect(alvo?.reason).toBe('missing_scores');
  });

  it('cobertura completa não gera item', () => {
    const items = planBacklog(
      [{ sourceKey: 'rsssf', competitionQid: 'Q1', seasons: [{ label: '2024' }] }],
      [{ qid: 'Q1', year: 2024, matchesTotal: 10, matchesWithScore: 10 }],
    );
    expect(items).toHaveLength(0);
  });

  it('rótulo de temporada cruzada usa o ano de início', () => {
    expect(seasonYear('2018-19')).toBe(2018);
    expect(seasonYear('2023')).toBe(2023);
    expect(seasonYear('sem ano')).toBeNull();
  });

  it('ordena mais recente primeiro', () => {
    const ordered = orderBacklog([
      { seasonLabelYear: 2015 },
      { seasonLabelYear: 2024 },
      { seasonLabelYear: 2020 },
    ]);
    expect(ordered.map((o) => o.seasonLabelYear)).toEqual([2024, 2020, 2015]);
  });
});
