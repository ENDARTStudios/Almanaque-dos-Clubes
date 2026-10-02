import { describe, it, expect } from 'vitest';
import {
  buildPatch,
  extractP625,
  type IncrementalCandidate,
} from '../../../src/jobs/wikidata-incremental.js';
import { isSchedulerEnabled } from '../../../src/jobs/data-refresh.scheduler.js';

// T451 — job wikidata-incremental: patch APENAS de campos nulos (zero overwrite)
// com provider MOCKADO (nunca API real); scheduler OFF por padrão.

function club(over: Partial<IncrementalCandidate> = {}): IncrementalCandidate {
  return {
    id: 'c1',
    qid: 'Q1',
    name: 'Clube',
    latitude: null,
    longitude: null,
    city: null,
    ...over,
  };
}

describe('buildPatch (T451)', () => {
  it('P625 direto preenche coords nulas', () => {
    const patch = buildPatch(
      club(),
      {
        claims: {
          P625: [{ mainsnak: { datavalue: { value: { latitude: -23.5, longitude: -46.6 } } } }],
        },
      },
      undefined,
      undefined,
    );
    expect(patch.fields).toEqual({ latitude: -23.5, longitude: -46.6 });
    expect(patch.source).toBe('P625');
  });

  it('fallback P131: coords do território + label como city', () => {
    const patch = buildPatch(
      club(),
      { claims: {} },
      {
        claims: {
          P625: [{ mainsnak: { datavalue: { value: { latitude: 51.5, longitude: -0.1 } } } }],
        },
        labels: { en: { value: 'Greater London' } },
      },
      undefined,
    );
    expect(patch.fields).toEqual({ latitude: 51.5, longitude: -0.1, city: 'Greater London' });
    expect(patch.source).toBe('P131');
  });

  it('fallback P115 (venue) quando P625/P131 sem coords', () => {
    const patch = buildPatch(
      club(),
      { claims: { P115: [{ mainsnak: { datavalue: { value: { id: 'QV' } } } }] } },
      { claims: {} },
      {
        claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 10, longitude: 20 } } } }] },
      },
    );
    expect(patch.fields).toEqual({ latitude: 10, longitude: 20 });
    expect(patch.source).toBe('P115');
  });

  it('ZERO OVERWRITE: clube com coords e city preenchidas → patch vazio', () => {
    const patch = buildPatch(
      club({ latitude: 1, longitude: 2, city: 'Já tem' }),
      {
        claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: 99, longitude: 99 } } } }] },
      },
      { labels: { en: { value: 'Outra' } } },
      undefined,
    );
    expect(patch.fields).toEqual({});
    expect(patch.source).toBeNull();
  });

  it('sobrescrita parcial: preenche só o campo nulo', () => {
    const patch = buildPatch(
      club({ city: 'Já tem' }),
      {
        claims: { P625: [{ mainsnak: { datavalue: { value: { latitude: -1, longitude: -2 } } } }] },
      },
      { labels: { en: { value: 'Ignorar' } } },
      undefined,
    );
    expect(patch.fields).toEqual({ latitude: -1, longitude: -2 });
  });

  it('entidade inválida/ausente → patch vazio (nada inventado)', () => {
    expect(buildPatch(club(), undefined, undefined, undefined).fields).toEqual({});
    expect(
      extractP625({
        claims: {
          P625: [{ mainsnak: { datavalue: { value: { latitude: 999, longitude: 999 } } } }],
        },
      }),
    ).toBeNull();
  });
});

describe('isSchedulerEnabled (T451)', () => {
  it('OFF por padrão e com valores não-"1"', () => {
    const prev = process.env.ETL_SCHEDULER_ENABLED;
    delete process.env.ETL_SCHEDULER_ENABLED;
    expect(isSchedulerEnabled()).toBe(false);
    process.env.ETL_SCHEDULER_ENABLED = '0';
    expect(isSchedulerEnabled()).toBe(false);
    process.env.ETL_SCHEDULER_ENABLED = 'true';
    expect(isSchedulerEnabled()).toBe(false); // só '1' liga (padrão RANKING_CRON_AUTO)
    process.env.ETL_SCHEDULER_ENABLED = prev;
  });
});
