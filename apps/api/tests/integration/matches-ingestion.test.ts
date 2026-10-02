/**
 * T420 — Testes do conector RSSSF + serviço de ingestão (HTTP/banco mockados).
 *
 * Cobrem: normalização de datas/placar, validação Zod, chave estável de dedup,
 * idempotência (rodar 2x não duplica) e não-criação de entidades órfãs. Nenhum
 * acesso a rede ou banco real: repositório fake em memória + sem fetch.
 */
import { describe, it, expect } from 'vitest';
import {
  parseRsssfMatches,
  MatchCandidateSchema,
  normalizeClubName,
} from '../../src/modules/etl/connectors/rsssf-matches.connector.js';
import {
  computeMatchDedupKey,
  resolveMatchCandidate,
  ingestMatches,
  type LookupClub,
  type LookupCompetition,
  type LookupSeason,
  type MatchProvenance,
  type MatchIngestRepo,
} from '../../src/modules/etl/ingestion.service.js';
import {
  buildTitlesQuery,
  parseTitlesResponse,
} from '../../src/modules/etl/connectors/wikidata-titles.connector.js';

const PROVENANCE: Omit<MatchProvenance, 'importedAt'> = {
  dataSource: 'rsssf',
  sourceUrl: 'https://www.rsssf.org/tablesb/bras2025.html',
  license: 'RSSSF (texto público, citar fonte)',
};

describe('RSSSF connector — parse', () => {
  const fixture = [
    '# Campeonato Brasileiro 2025 (exemplo)',
    '[26.01.25] Flamengo - Fluminense 2-1',
    '15/02/2025 Palmeiras vs Corinthians 0:0',
    '2025-03-01 Santos - São Paulo 3-2  (Round 5)',
    'linha sem data e sem placar',
  ].join('\n');

  it('parseia linhas válidas e normaliza data/placar', () => {
    const res = parseRsssfMatches(fixture, {
      competitionName: 'Brasileirão',
      season: '2025',
      sourceUrl: PROVENANCE.sourceUrl,
    });
    expect(res.matches).toHaveLength(3);
    expect(res.matches[0]).toMatchObject({
      homeName: 'Flamengo',
      awayName: 'Fluminense',
      homeScore: 2,
      awayScore: 1,
      date: '2025-01-26',
    });
    expect(res.matches[1]).toMatchObject({
      homeName: 'Palmeiras',
      awayName: 'Corinthians',
      homeScore: 0,
      awayScore: 0,
      date: '2025-02-15',
    });
    expect(res.matches[2]).toMatchObject({
      homeName: 'Santos',
      awayName: 'São Paulo',
      homeScore: 3,
      awayScore: 2,
      round: '5',
      date: '2025-03-01',
    });
  });

  it('manda linha não reconhecida para skipped (com motivo), nunca descarta silenciosamente', () => {
    const res = parseRsssfMatches(fixture, {
      competitionName: 'Brasileirão',
      season: '2025',
      sourceUrl: PROVENANCE.sourceUrl,
    });
    expect(res.skipped.length).toBeGreaterThanOrEqual(1);
    expect(res.skipped.some((s) => s.line.includes('linha sem data'))).toBe(true);
  });

  it('normaliza nomes de clube (aclara acentos e caixa)', () => {
    expect(normalizeClubName('São Paulo')).toBe('sao paulo');
    expect(normalizeClubName('Atlético-MG')).toBe('atletico-mg');
  });
});

describe('Validation Zod', () => {
  it('rejeita placar negativo e data malformada', () => {
    const bad = MatchCandidateSchema.safeParse({
      homeName: 'A',
      awayName: 'B',
      date: '2025-13-01',
      homeScore: -1,
      awayScore: 0,
      round: null,
      competitionName: 'C',
      season: '2025',
    });
    expect(bad.success).toBe(false);
  });
});

describe('Dedup key + idempotência', () => {
  it('computeMatchDedupKey é determinística e estável', () => {
    const a = computeMatchDedupKey({
      competitionId: 'c1',
      season: '2025',
      dateISO: '2025-01-26',
      homeClubId: 'h1',
      awayClubId: 'a1',
    });
    const b = computeMatchDedupKey({
      competitionId: 'c1',
      season: '2025',
      dateISO: '2025-01-26',
      homeClubId: 'h1',
      awayClubId: 'a1',
    });
    expect(a).toBe(b);
    expect(a).toContain('c1|2025|2025-01-26|h1|a1');
  });

  it('ingestMatches é idempotente: rodar 2x não duplica', async () => {
    const clubs: LookupClub[] = [
      { id: 'h1', name: 'Flamengo', qid: 'Q80970' },
      { id: 'a1', name: 'Fluminense', qid: 'Q80891' },
    ];
    const comp: LookupCompetition = { id: 'c1', name: 'Brasileirão', qid: 'Q110635' };
    const seasons: LookupSeason[] = [{ id: 's2025', name: '2025' }];
    const stored = new Map<string, number>();
    const repo: MatchIngestRepo = {
      findClubByQid: async () => null,
      findClubByName: async (n) =>
        clubs.find((c) => c.name.toLowerCase() === n.toLowerCase()) || null,
      findCompetitionByQid: async () => null,
      findCompetitionByName: async (n) => (n === comp.name ? comp : null),
      findSeasonByName: async (n) => seasons.find((s) => s.name === n) || null,
      upsertMatch: async (row, prov) => {
        expect(prov.dataSource).toBe('rsssf');
        expect(prov.license).toBe(PROVENANCE.license);
        if (stored.has(row.dedupKey)) return { created: false };
        stored.set(row.dedupKey, 1);
        return { created: true };
      },
      upsertTitle: async () => ({ created: true }),
    };
    const candidate = {
      homeName: 'Flamengo',
      awayName: 'Fluminense',
      date: '2025-01-26',
      homeScore: 2,
      awayScore: 1,
      round: null,
      competitionName: 'Brasileirão',
      season: '2025',
    };
    const candidates = [candidate, candidate]; // mesmo par → dedupKey idêntico
    const first = await ingestMatches(candidates, repo, PROVENANCE);
    const second = await ingestMatches(candidates, repo, PROVENANCE);
    expect(first.inserted).toBe(1);
    expect(first.alreadyExists).toBe(1);
    expect(second.inserted).toBe(0);
    expect(second.alreadyExists).toBe(2);
    expect(stored.size).toBe(1);
  });

  it('não cria órfãos: clube não resolvido → rejected (nunca inserido)', async () => {
    const repo: MatchIngestRepo = {
      findClubByQid: async () => null,
      findClubByName: async () => null,
      findCompetitionByQid: async () => null,
      findCompetitionByName: async () => ({ id: 'c1', name: 'Brasileirão', qid: null }),
      findSeasonByName: async () => null,
      upsertMatch: async () => ({ created: true }),
      upsertTitle: async () => ({ created: true }),
    };
    const candidate = {
      homeName: 'ClubeInexistente',
      awayName: 'Outro',
      date: '2025-01-26',
      homeScore: 1,
      awayScore: 0,
      round: null,
      competitionName: 'Brasileirão',
      season: '2025',
    };
    const res = await resolveMatchCandidate(candidate, repo);
    expect(res.rejected).toHaveLength(1);
    expect(res.rejected[0].reason).toContain('casa não resolvido');
  });
});

describe('Wikidata titles connector', () => {
  it('buildTitlesQuery contém VALUES + P3450 + P1346 + filtro de ano', () => {
    const q = buildTitlesQuery({ competitionQids: ['Q110635'], minYear: 2015, maxYear: 2026 });
    expect(q).toContain('VALUES ?comp { wd:Q110635 }');
    expect(q).toContain('wdt:P3450');
    expect(q).toContain('wdt:P1346');
    expect(q).toContain('?year >= 2015');
  });

  it('parseTitlesResponse extrai títulos e descarta linhas malformadas', () => {
    const json = {
      results: {
        bindings: [
          {
            winner: { value: 'http://www.wikidata.org/entity/Q80970' },
            comp: { value: 'http://www.wikidata.org/entity/Q110635' },
            year: { value: '2027' },
            winnerLabel: { value: 'Flamengo' },
            compLabel: { value: 'Brasileirão' },
          },
          {
            winner: { value: 'http://www.wikidata.org/entity/Q80891' },
            comp: { value: 'http://www.wikidata.org/entity/Q108339' },
            year: { value: '2025' },
            winnerLabel: { value: 'Fluminense' },
            compLabel: { value: 'Série A' },
          },
          {
            winner: { value: 'http://www.wikidata.org/entity/Q1' },
            comp: { value: 'http://www.wikidata.org/entity/Q2' },
          }, // sem ano → descartado
          { comp: { value: 'http://www.wikidata.org/entity/Q3' }, year: { value: '2020' } }, // sem winner → descartado
        ],
      },
    };
    const titles = parseTitlesResponse(json);
    expect(titles).toHaveLength(2);
    expect(titles[0]).toMatchObject({
      clubQid: 'Q80970',
      competitionQid: 'Q110635',
      year: 2027,
      clubName: 'Flamengo',
    });
  });
});
