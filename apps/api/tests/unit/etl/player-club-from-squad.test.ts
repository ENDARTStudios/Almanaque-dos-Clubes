/**
 * T582 — regra PURA da derivação jogador → clube a partir de `PLAYED_FOR`.
 *
 * Sem banco e sem rede: o teste trava o que a inferência aceita e recusa — janela de
 * recência, aresta mais recente vencendo, clube fora do acervo, empate e zero overwrite.
 */
import { describe, expect, it } from 'vitest';
import {
  deriveClubFromSquadEdges,
  edgeYear,
  SQUAD_CLUB_SOURCE,
} from '../../../src/modules/etl/player-club-from-squad.js';

const now = new Date('2026-10-17T00:00:00Z');
const acervo = new Set(['c1', 'c2']);
const edge = (targetId: string, metadata: unknown = {}) => ({ targetId, metadata });
const opts = { archiveClubIds: acervo, now };

describe('T582 — derivação do clube a partir de PLAYED_FOR', () => {
  it('a aresta MAIS RECENTE vence (não a primeira nem a última da lista)', () => {
    const d = deriveClubFromSquadEdges(
      [edge('c1', { year: 2024 }), edge('c2', { year: 2025 }), edge('c1', { year: 2023 })],
      opts,
    );
    expect(d).toEqual({ status: 'linked', clubId: 'c2', year: 2025, source: SQUAD_CLUB_SOURCE });
  });

  it('usa startYear/endYear quando metadata.year não veio (arestas antigas)', () => {
    expect(edgeYear({ startYear: 2025 }, now)).toBe(2025);
    expect(edgeYear({ endYear: 2024 }, now)).toBe(2024);
    expect(edgeYear({ year: 0, startYear: 2025 }, now)).toBe(2025);
  });

  it('elenco ANTIGO (fora da janela de 2 anos) vira `stale` — nunca "clube atual"', () => {
    const d = deriveClubFromSquadEdges([edge('c1', { year: 2015 })], opts);
    expect(d).toMatchObject({ status: 'no_source', reason: 'stale', year: 2015 });
  });

  it('fronteira da janela: 2024 (corte) vincula; 2023 fica fora', () => {
    expect(deriveClubFromSquadEdges([edge('c1', { year: 2024 })], opts).status).toBe('linked');
    expect(deriveClubFromSquadEdges([edge('c1', { year: 2023 })], opts)).toMatchObject({
      status: 'no_source',
      reason: 'stale',
    });
  });

  it('janela configurável: 5 anos alcança 2022', () => {
    const d = deriveClubFromSquadEdges([edge('c1', { year: 2022 })], {
      ...opts,
      maxAgeYears: 5,
    });
    expect(d.status).toBe('linked');
  });

  it('sem aresta: `no_edge`', () => {
    expect(deriveClubFromSquadEdges([], opts)).toMatchObject({
      status: 'no_source',
      reason: 'no_edge',
    });
  });

  it('aresta sem ano (year=0) não prova recência: `no_temporal_signal`', () => {
    expect(deriveClubFromSquadEdges([edge('c1', { year: 0 })], opts)).toMatchObject({
      status: 'no_source',
      reason: 'no_temporal_signal',
    });
    expect(deriveClubFromSquadEdges([edge('c1', null)], opts)).toMatchObject({
      status: 'no_source',
      reason: 'no_temporal_signal',
    });
  });

  it('ano fora de faixa (lixo da fonte) é ignorado', () => {
    expect(deriveClubFromSquadEdges([edge('c1', { year: 3000 })], opts)).toMatchObject({
      status: 'no_source',
      reason: 'no_temporal_signal',
    });
    expect(deriveClubFromSquadEdges([edge('c1', { year: 12 })], opts)).toMatchObject({
      status: 'no_source',
      reason: 'no_temporal_signal',
    });
  });

  it('aresta mais recente FORA do acervo NÃO cai para o clube antigo: `outside_archive`', () => {
    const d = deriveClubFromSquadEdges(
      [edge('c1', { year: 2024 }), edge('fora', { year: 2025 })],
      opts,
    );
    expect(d).toMatchObject({ status: 'no_source', reason: 'outside_archive', year: 2025 });
  });

  it('dois clubes distintos na temporada mais recente: empate = `no_source`', () => {
    const d = deriveClubFromSquadEdges(
      [edge('c1', { year: 2025 }), edge('c2', { year: 2025 })],
      opts,
    );
    expect(d).toMatchObject({ status: 'no_source', reason: 'ambiguous_latest', year: 2025 });
  });

  it('duplicata do MESMO clube no ano mais recente não é empate', () => {
    const d = deriveClubFromSquadEdges(
      [edge('c1', { year: 2025 }), edge('c1', { year: 2025 })],
      opts,
    );
    expect(d).toMatchObject({ status: 'linked', clubId: 'c1' });
  });

  it('ZERO OVERWRITE: `clubId` já preenchido (P54) nunca é reescrito', () => {
    const d = deriveClubFromSquadEdges([edge('c1', { year: 2025 })], {
      ...opts,
      currentClubId: 'p54-club',
    });
    expect(d).toMatchObject({ status: 'no_source', reason: 'already_linked' });
  });

  it('toda decisão carrega a proveniência do grafo', () => {
    const comAresta = deriveClubFromSquadEdges([edge('c1', { year: 2025 })], opts);
    const semAresta = deriveClubFromSquadEdges([], opts);
    expect(comAresta.source).toBe('knowledge_graph:PLAYED_FOR');
    expect(semAresta.source).toBe('knowledge_graph:PLAYED_FOR');
  });
});
