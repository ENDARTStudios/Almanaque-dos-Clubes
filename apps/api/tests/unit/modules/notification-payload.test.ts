import { describe, it, expect } from 'vitest';
import {
  mergeTitleIntoToday,
  startOfUtcDay,
  type NewTitlePayload,
  type TitlePayloadPart,
} from '../../../src/modules/notifications/notification.service.js';
import { buildTitleEvents } from '../../../src/modules/notifications/title-notification.generator.js';

// WS-C-8 — payloads e agregação anti-spam (puro).

const t1: TitlePayloadPart = {
  competitionId: 'k1',
  competitionName: 'Copa X',
  year: 2026,
  hierarchy: 'nacional',
};
const t2: TitlePayloadPart = {
  competitionId: 'k2',
  competitionName: 'Copa Y',
  year: 2026,
  hierarchy: 'continental',
};

describe('mergeTitleIntoToday (WS-C-8)', () => {
  it('sem notificação de hoje → null (caller cria nova)', () => {
    expect(mergeTitleIntoToday(null, t1)).toBeNull();
  });

  it('mescla título na notificação existente (agregado titles[])', () => {
    const existing: NewTitlePayload = {
      clubId: 'c1',
      clubQid: 'Q1',
      clubName: 'Clube',
      titles: [t1],
    };
    const merged = mergeTitleIntoToday(
      { id: 'n1', payload: existing as unknown as Record<string, unknown> },
      t2,
    );
    expect(merged).not.toBeNull();
    expect(merged!.id).toBe('n1');
    const payload = merged!.payload;
    expect(payload.titles).toHaveLength(2);
    expect(payload.titles[1]).toEqual(t2);
    expect(payload.clubId).toBe('c1');
  });

  it('payload legado sem titles[] trata como lista vazia', () => {
    const merged = mergeTitleIntoToday({ id: 'n1', payload: { clubId: 'c1' } }, t1);
    expect(merged!.payload.titles).toEqual([t1]);
  });
});

describe('startOfUtcDay (WS-C-8)', () => {
  it('zera para 00:00 UTC do dia', () => {
    const s = startOfUtcDay(new Date('2026-10-02T23:59:59Z'));
    expect(s.toISOString()).toBe('2026-10-02T00:00:00.000Z');
  });
});

describe('buildTitleEvents (WS-C-8)', () => {
  it('um evento por aresta com payload de competição', () => {
    const comps = new Map([['k1', { name: 'Copa X', qid: 'QX' }]]);
    const events = buildTitleEvents(
      [
        { sourceId: 'c1', targetId: 'k1', metadata: { year: 2026, hierarchy: 'nacional' } },
        { sourceId: 'c2', targetId: 'k1', metadata: {} },
      ],
      comps,
    );
    expect(events).toHaveLength(2);
    expect(events[0]).toEqual({
      clubId: 'c1',
      title: { competitionId: 'k1', competitionName: 'Copa X', year: 2026, hierarchy: 'nacional' },
    });
    expect(events[1].title.year).toBeNull();
  });
});
