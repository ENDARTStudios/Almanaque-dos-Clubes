import { describe, it, expect } from 'vitest';
import {
  buildPlayersSquadsQuery,
  parsePlayersSquadsResponse,
  positionFromLabel,
} from '../../../src/modules/etl/connectors/wikidata-players-squads.connector.js';

// T034 — parse do SPARQL de jogadores (P54 + dados do jogador).

function sparqlJson(bindings: Array<Record<string, unknown>>) {
  return { results: { bindings } };
}
function uri(q: string) {
  return `http://www.wikidata.org/entity/${q}`;
}
function row(overrides: Record<string, unknown>) {
  return {
    player: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1000' },
    club: { type: 'uri', value: 'http://www.wikidata.org/entity/Q2000' },
    ...overrides,
  };
}

describe('parsePlayersSquadsResponse (T034)', () => {
  it('agrupa bindings multi-idioma por jogador (pt vence en)', () => {
    const out = parsePlayersSquadsResponse(
      sparqlJson([
        row({ label: { type: 'literal', value: 'Player EN', 'xml:lang': 'en' } }),
        row({ label: { type: 'literal', value: 'Jogador PT', 'xml:lang': 'pt' } }),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].name).toBe('Jogador PT');
    expect(out[0].qid).toBe('Q1000');
  });

  it('extrai gênero (P21→men/women), país (P297 ISO), nascimento (P569)', () => {
    const out = parsePlayersSquadsResponse(
      sparqlJson([
        row({
          genderQ: { type: 'uri', value: uri('Q6581072') },
          cc: { type: 'literal', value: 'br' },
          birth: { type: 'literal', value: '1996-05-03T00:00:00Z' },
          label: { type: 'literal', value: 'Jogadora', 'xml:lang': 'pt' },
        }),
      ]),
    );
    expect(out[0].gender).toBe('women');
    expect(out[0].countryCode).toBe('BR');
    expect(out[0].birthDate).toBe('1996-05-03');
  });

  it('posição por rótulo EN (P413): goalkeeper→GOALKEEPER; rótulo desconhecido→null', () => {
    const [gk] = parsePlayersSquadsResponse(
      sparqlJson([
        row({
          posLabel: { type: 'literal', value: 'goalkeeper', 'xml:lang': 'en' },
          label: { type: 'literal', value: 'Goleiro', 'xml:lang': 'pt' },
        }),
      ]),
    );
    expect(gk.position).toBe('GOALKEEPER');

    const [unk] = parsePlayersSquadsResponse(
      sparqlJson([
        row({
          posLabel: { type: 'literal', value: 'left winger', 'xml:lang': 'en' },
          label: { type: 'literal', value: 'Ponta', 'xml:lang': 'pt' },
        }),
      ]),
    );
    expect(unk.position).toBe('FORWARD'); // winger ⇒ FORWARD

    const [none] = parsePlayersSquadsResponse(
      sparqlJson([
        row({
          posLabel: { type: 'literal', value: 'coach', 'xml:lang': 'en' },
          label: { type: 'literal', value: 'Técnico', 'xml:lang': 'pt' },
        }),
      ]),
    );
    expect(none.position).toBeNull();
  });

  it('P54 com P580/P582 vira link com anos; sem qualificadores → link sem ano (honesto)', () => {
    const out = parsePlayersSquadsResponse(
      sparqlJson([
        row({
          label: { type: 'literal', value: 'Jogador', 'xml:lang': 'pt' },
          start: { type: 'literal', value: '2019-07-01T00:00:00Z' },
          end: { type: 'literal', value: '2022-06-30T00:00:00Z' },
        }),
        row({
          player: { type: 'uri', value: 'http://www.wikidata.org/entity/Q1000' },
          club: { type: 'uri', value: 'http://www.wikidata.org/entity/Q3000' },
          label: { type: 'literal', value: 'Jogador', 'xml:lang': 'pt' },
        }),
      ]),
    );
    expect(out).toHaveLength(1);
    expect(out[0].teams).toHaveLength(2);
    const withYears = out[0].teams.find((t) => t.clubQid === 'Q2000');
    const yearless = out[0].teams.find((t) => t.clubQid === 'Q3000');
    expect(withYears).toEqual({ clubQid: 'Q2000', startYear: 2019, endYear: 2022 });
    expect(yearless).toEqual({ clubQid: 'Q3000', startYear: null, endYear: null });
  });

  it('linhas sem rótulo humano não entram (R4: dado sem label não entra)', () => {
    const out = parsePlayersSquadsResponse(sparqlJson([row({})]));
    expect(out).toHaveLength(0);
  });
});

describe('buildPlayersSquadsQuery (T034)', () => {
  it('inclui VALUES de clubes, ocupações P106 e paginação', () => {
    const q = buildPlayersSquadsQuery({ clubQids: ['Q2000', 'Q3000'], limit: 500, offset: 500 });
    expect(q).toContain('VALUES ?club { wd:Q2000 wd:Q3000 }');
    expect(q).toContain('wd:Q11513337');
    expect(q).toContain('wd:Q1920462');
    expect(q).toContain('LIMIT 500 OFFSET 500');
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
