/**
 * T-24/28 — funções puras do bot `seed-states` (matcher local, parse SPARQL,
 * formato do code). O módulo do bot NÃO instancia PrismaClient no import
 * (guarda de invocação direta) — o teste importa sem mock de banco.
 */
import { describe, it, expect } from 'vitest';
import {
  normalizeStateKey,
  looksLikeCode,
  buildStateCode,
  matchLocalState,
  parseSparqlHits,
  resolveHits,
  sparqlString,
  p300Query,
  nameFallbackQuery,
  type LocalStateRow,
  type SparqlHit,
} from '../../../src/scripts/seed-states.js';

const LOCAL: LocalStateRow[] = [
  { id: 's1', code: 'BR-MS', name: 'Mato Grosso do Sul', countryIso2: 'BR' },
  { id: 's2', code: 'BR-SP', name: 'São Paulo', countryIso2: 'BR' },
  { id: 's3', code: 'US-CA', name: 'California', countryIso2: 'US' },
];

describe('T-24/28 — normalizeStateKey', () => {
  it('maiúsculas + sem acento + espaços colapsados', () => {
    expect(normalizeStateKey('São Paulo')).toBe('SAO PAULO');
    expect(normalizeStateKey('  minas   gerais ')).toBe('MINAS GERAIS');
    expect(normalizeStateKey('ms')).toBe('MS');
  });
});

describe('T-24/28 — looksLikeCode (rota P300 vs fallback por nome)', () => {
  it('sigla 2–3 letras sem acento/espaço = código', () => {
    expect(looksLikeCode('MS')).toBe(true);
    expect(looksLikeCode('sp')).toBe(true);
    expect(looksLikeCode('ABC')).toBe(true);
  });
  it('acento, espaço ou len>3 = NÃO é código (fallback por nome)', () => {
    expect(looksLikeCode('São Paulo')).toBe(false);
    expect(looksLikeCode('ESPÍRITO SANTO')).toBe(false);
    expect(looksLikeCode('Rio Grande do Sul')).toBe(false);
  });
});

describe('T-24/28 — buildStateCode (ISO 3166-2)', () => {
  it('monta <ISO2>-<STATE> normalizado', () => {
    expect(buildStateCode('br', 'ms')).toBe('BR-MS');
    expect(buildStateCode('BR', 'Sp')).toBe('BR-SP');
  });
  it('guards: país inválido ou state vazio = null (nunca inventa)', () => {
    expect(buildStateCode('BRA', 'MS')).toBeNull();
    expect(buildStateCode('', 'MS')).toBeNull();
    expect(buildStateCode('BR', '')).toBeNull();
  });
});

describe('T-24/28 — matchLocalState (fase 1: só linka, não cria)', () => {
  it('casa por CODE case-insensitive no MESMO país', () => {
    expect(matchLocalState(LOCAL, 'BR', 'ms')?.id).toBe('s1');
    expect(matchLocalState(LOCAL, 'br', 'SP')?.id).toBe('s2');
  });
  it('casa por NAME case/acento-insensitive', () => {
    expect(matchLocalState(LOCAL, 'BR', 'são paulo')?.id).toBe('s2');
    expect(matchLocalState(LOCAL, 'BR', 'mato grosso do sul')?.id).toBe('s1');
  });
  it('NUNCA casa state de OUTRO país (guard de país)', () => {
    expect(matchLocalState(LOCAL, 'US', 'MS')).toBeNull(); // BR-MS ≠ US
    expect(matchLocalState(LOCAL, 'AR', 'California')).toBeNull();
  });
  it('sem match = null (par segue para o Wikidata)', () => {
    expect(matchLocalState(LOCAL, 'BR', 'CE')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseSparqlHits / resolveHits — payload externo é hostil
// ---------------------------------------------------------------------------
const binding = (qid: number, label?: string) => ({
  item: { type: 'uri', value: `http://www.wikidata.org/entity/Q${qid}` },
  ...(label === undefined ? {} : { label: { 'xml:lang': 'en', type: 'literal', value: label } }),
});

describe('T-24/28 — parseSparqlHits', () => {
  it('1 hit → [{qid, label}] (forma real: BR-MS → Q43319)', () => {
    expect(
      parseSparqlHits({ results: { bindings: [binding(43319, 'Mato Grosso do Sul')] } }),
    ).toEqual([{ qid: 'Q43319', label: 'Mato Grosso do Sul' }]);
  });
  it('0 bindings → []', () => {
    expect(parseSparqlHits({ results: { bindings: [] } })).toEqual([]);
    expect(parseSparqlHits({})).toEqual([]);
    expect(parseSparqlHits(null)).toEqual([]);
  });
  it('multi hits preservados na ordem', () => {
    expect(parseSparqlHits({ results: { bindings: [binding(1, 'A'), binding(2, 'B')] } })).toEqual([
      { qid: 'Q1', label: 'A' },
      { qid: 'Q2', label: 'B' },
    ]);
  });
  it('binding sem item-URI válido é descartado; label ausente = null', () => {
    expect(
      parseSparqlHits({
        results: {
          bindings: [
            { item: { value: 'http://example.com/nope' } },
            { other: { value: 'x' } },
            binding(7),
          ],
        },
      }),
    ).toEqual([{ qid: 'Q7', label: null }]);
  });
});

describe('T-24/28 — resolveHits (determinística: só exatamente 1)', () => {
  it('1 hit → o hit', () => {
    const hits: SparqlHit[] = [{ qid: 'Q43319', label: 'Mato Grosso do Sul' }];
    expect(resolveHits(hits)?.qid).toBe('Q43319');
  });
  it('0 hits → null (gap declarado)', () => {
    expect(resolveHits([])).toBeNull();
  });
  it('>1 QIDs distintos → null (nunca escolhe "o mais provável")', () => {
    expect(
      resolveHits([
        { qid: 'Q1', label: 'A' },
        { qid: 'Q2', label: 'B' },
      ]),
    ).toBeNull();
  });
  it('linhas duplicadas do MESMO qid colapsam para 1 hit', () => {
    expect(
      resolveHits([
        { qid: 'Q175', label: 'São Paulo' },
        { qid: 'Q175', label: 'São Paulo' },
      ])?.qid,
    ).toBe('Q175');
  });
});

describe('T-24/28 — queries SPARQL (formato)', () => {
  it('P300 embute o code canônico entre aspas', () => {
    expect(p300Query('BR-MS')).toContain('wdt:P300 "BR-MS"');
    expect(p300Query('BR-MS')).toContain("FILTER(lang(?label)='en')");
  });
  it('fallback por nome usa Q10864048 + guarda de país P297', () => {
    expect(nameFallbackQuery('São Paulo', 'BR')).toContain('wd:Q10864048');
    expect(nameFallbackQuery('São Paulo', 'BR')).toContain('"São Paulo"@en');
    expect(nameFallbackQuery('São Paulo', 'BR')).toContain('wdt:P297 "BR"');
  });
  it('sparqlString escapa aspas/backslash (entrada do banco é hostil)', () => {
    expect(sparqlString('o"state')).toBe('"o\\"state"');
    expect(sparqlString('a\\b')).toBe('"a\\\\b"');
  });
});
