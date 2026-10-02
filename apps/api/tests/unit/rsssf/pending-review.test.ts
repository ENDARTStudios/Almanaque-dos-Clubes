import { describe, it, expect } from 'vitest';
import { countsByReason, makePending, severityFor } from '../../../src/lib/rsssf/pending-review.js';

// T448b-2b FASE 1 — pendências estruturadas. Sem rede.

describe('T448b-2b FASE 1 — severidade das pendências', () => {
  it('blockers vs review', () => {
    expect(severityFor('missing_attribution')).toBe('blocker');
    expect(severityFor('multiple_champions')).toBe('blocker');
    expect(severityFor('conflicting_champion')).toBe('blocker');
    expect(severityFor('ambiguous_club')).toBe('blocker');
    expect(severityFor('ambiguous_competition')).toBe('blocker');
    expect(severityFor('malformed_table')).toBe('blocker');
    expect(severityFor('gender_unknown')).toBe('blocker');
    expect(severityFor('champion_unconfirmed')).toBe('blocker');
    expect(severityFor('missing_club')).toBe('review');
    expect(severityFor('missing_competition')).toBe('review');
    expect(severityFor('club_inactive')).toBe('review');
  });

  it('makePending preenche contexto e severidade', () => {
    const p = makePending({
      reasonCode: 'missing_club',
      season: 2025,
      competitionName: 'Campeonato Mineiro',
      teamName: 'Tombense',
      sourceUrl: 'https://rsssfbrasil.com/tablesfq/mg2025.htm',
      details: { key: 'tombense' },
    });
    expect(p.severity).toBe('review');
    expect(p.teamName).toBe('Tombense');
    expect(p.sourceUrl).toContain('mg2025');
  });

  it('countsByReason agrupa por reasonCode', () => {
    const items = [
      makePending({
        reasonCode: 'missing_club',
        season: 2023,
        competitionName: 'c',
        teamName: 'a',
        sourceUrl: 'u',
      }),
      makePending({
        reasonCode: 'missing_club',
        season: 2024,
        competitionName: 'c',
        teamName: 'b',
        sourceUrl: 'u',
      }),
      makePending({
        reasonCode: 'missing_competition',
        season: 2025,
        competitionName: 'c',
        teamName: null,
        sourceUrl: 'u',
      }),
    ];
    expect(countsByReason(items)).toEqual({ missing_club: 2, missing_competition: 1 });
  });
});
