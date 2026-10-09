import { describe, it, expect } from 'vitest';
import {
  buildLinksQuery,
  parseLinksResponse,
  extractPlayerEntity,
  enrichPlayer,
  positionFromLabel,
} from '../../../src/modules/etl/connectors/wikidata-players-squads.connector.js';

describe('buildLinksQuery (T034 fase 1)', () => {
  it('inclui VALUES de clubes e paginação', () => {
    const q = buildLinksQuery({ clubQids: ['Q2000', 'Q3000'], limit: 1000, offset: 1000 });
    expect(q).toContain('VALUES ?club { wd:Q2000 wd:Q3000 }');
    expect(q).toContain('LIMIT 1000 OFFSET 1000');
    expect(q).toContain('pq:P580');
    expect(q).toContain('pq:P582');
  });
});

describe('parseLinksResponse (T034 fase 1)', () => {
  it('extrai vínculos player→club com anos, dedup por player|club', () => {
    const links = parseLinksResponse({
      results: {
        bindings: [
          {
            player: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1000' },
            club: { type: 'uri', value: 'http://www.wikidata.org/entity/Q2000' },
            start: { type: 'literal', value: '2019-07-01T00:00:00Z' },
            end: { type: 'literal', value: '2022-06-30T00:00:00Z' },
          },
          {
            player: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1000' },
            club: { type: 'uri', value: 'http://www.wikidata.org/entity/Q2000' },
            start: { type: 'literal', value: '2019-07-01T00:00:00Z' },
          },
        ],
      },
    });
    expect(links).toHaveLength(1);
    expect(links[0]).toEqual({
      playerQid: 'Q1000',
      clubQid: 'Q2000',
      startYear: 2019,
      endYear: 2022,
    });
  });

  it('retorna vazio em payload inválido', () => {
    expect(parseLinksResponse({})).toEqual([]);
  });
});

describe('extractPlayerEntity + enrichPlayer (T034 fase 2)', () => {
  const entityJson = {
    entities: {
      Q1000: {
        labels: {
          en: { language: 'en', value: 'Player EN' },
          'pt-br': { language: 'pt-br', value: 'Jogador PT' },
        },
        claims: {
          P569: [{ mainsnak: { datavalue: { value: { time: '+1996-05-03T00:00:00Z' } } } }],
          P27: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q155' } } } }],
          P21: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q6581072' } } } }],
          P413: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q201330' } } } }],
          P106: [{ mainsnak: { datavalue: { value: { 'entity-type': 'item', id: 'Q937857' } } } }],
        },
      },
    },
  };
  const countryIso = new Map([['Q155', 'BR']]);
  const posLabels = new Map([['Q201330', 'goalkeeper']]);

  it('extrai rótulo pt>en, nascimento, país ISO, gênero e posição', () => {
    const d = extractPlayerEntity('Q1000', entityJson)!;
    expect(d.name).toBe('Jogador PT');
    expect(d.birthDate).toMatch(/1996-05-03/);
    expect(d.countryCodeQid).toBe('Q155');
    expect(d.genderQid).toBe('Q6581072');
    const r = enrichPlayer(d, countryIso, posLabels);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.player.countryCode).toBe('BR');
      expect(r.player.gender).toBe('women');
      expect(r.player.position).toBe('GOALKEEPER');
    }
  });

  it('ocupação fora do escopo → rejeitado', () => {
    const noOcc = {
      entities: {
        Q1000: {
          labels: { en: { language: 'en', value: 'Player EN' } },
          claims: {},
        },
      },
    };
    const d = extractPlayerEntity('Q1000', noOcc)!;
    const r = enrichPlayer(d, countryIso, posLabels);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('occupation_out_of_scope');
  });

  it('sem rótulo humano → rejeitado (R4)', () => {
    const noLabel = {
      entities: {
        Q1000: {
          claims: { P106: [{ mainsnak: { datavalue: { value: { id: 'Q937857' } } } }] },
        },
      },
    };
    const d = extractPlayerEntity('Q1000', noLabel)!;
    const r = enrichPlayer(d, countryIso, posLabels);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toBe('no_label');
  });
});

describe('positionFromLabel (T034)', () => {
  it('mapeia rótulos comuns e devolve null no desconhecido', () => {
    expect(positionFromLabel('goalkeeper')).toBe('GOALKEEPER');
    expect(positionFromLabel('centre-back')).toBe('DEFENDER');
    expect(positionFromLabel('attacking midfielder')).toBe('MIDFIELDER');
    expect(positionFromLabel('striker')).toBe('FORWARD');
    expect(positionFromLabel('president')).toBeNull();
    expect(positionFromLabel(null)).toBeNull();
  });
});
