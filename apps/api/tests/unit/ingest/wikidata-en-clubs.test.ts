import { describe, it, expect } from 'vitest';
import {
  normalizeClubName,
  matchByNormalizedName,
  parseEnClubs,
  buildEnClubsQuery,
} from '../../../src/modules/etl/connectors/wikidata-en-clubs.connector.js';

// T449EN — normalização de nome (match, não chave), dedup por QID (Zod).

describe('T449EN — normalizeClubName', () => {
  it('remove acento/pontuação/sufixo legal; & → and', () => {
    expect(normalizeClubName('Manchester City F.C.')).toBe('manchester city');
    expect(normalizeClubName('Brighton & Hove Albion')).toBe('brighton and hove albion');
    expect(normalizeClubName('AFC Bournemouth')).toBe('bournemouth');
    expect(normalizeClubName('Sheffield Wednesday')).toBe('sheffield wednesday');
  });
});

describe('T449EN — matchByNormalizedName', () => {
  it('casa por nome normalizado e lista faltantes', () => {
    const clubs = [
      { qid: 'Q1', label: 'Arsenal F.C.' },
      { qid: 'Q2', label: 'Chelsea Football Club' },
    ];
    const { matched, missing } = matchByNormalizedName(['Arsenal', 'Chelsea', 'Foo Town'], clubs);
    expect(matched).toEqual({ Arsenal: 'Q1', Chelsea: 'Q2' });
    expect(missing).toEqual(['Foo Town']);
  });
});

describe('T449EN — parseEnClubs (dedup por QID + Zod)', () => {
  it('extrai qid/label/iso2/fundação e deduplica', () => {
    const json = {
      results: {
        bindings: [
          {
            qid: { value: 'Q9617' },
            label: { value: 'Arsenal F.C.' },
            iso2: { value: 'gb' },
            inception: { value: '1886-01-01T00:00:00Z' },
          },
          { qid: { value: 'Q9617' }, label: { value: 'Arsenal F.C.' } },
          { qid: { value: 'bad' }, label: { value: 'Nope' } },
        ],
      },
    };
    const clubs = parseEnClubs(json);
    expect(clubs).toHaveLength(1);
    expect(clubs[0]).toMatchObject({
      qid: 'Q9617',
      label: 'Arsenal F.C.',
      country: 'GB',
      foundedYear: 1886,
    });
  });
});

describe('T449EN — buildEnClubsQuery', () => {
  it('filtra clube de futebol (P31) e país (P17) com labels', () => {
    const q = buildEnClubsQuery();
    expect(q).toContain('wdt:P641'); // association football
    expect(q).toContain('wdt:P17');
    expect(q).toContain('rdfs:label');
  });
});
