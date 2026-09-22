import { describe, it, expect } from 'vitest';
import {
  buildGeoQuery,
  continentCode,
  parseGeoBindings,
  parsePoint,
  planGeo,
  qidFromUri,
  validateGeoRow,
  GEO_DATASOURCE,
} from '../../../src/modules/etl/connectors/wikidata-geo.connector.js';

// T466 — testes PUROS do conector geográfico (zero rede, zero banco).

function binding(uri: string, value: string) {
  return { value, type: 'literal' };
}
function uri(qid: string) {
  return { value: `http://www.wikidata.org/entity/${qid}`, type: 'uri' };
}

describe('qidFromUri', () => {
  it('extrai o Q-id de uma URI do Wikidata', () => {
    expect(qidFromUri('http://www.wikidata.org/entity/Q12345')).toBe('Q12345');
  });
  it('retorna null para URI/ausência inválida', () => {
    expect(qidFromUri(undefined)).toBeNull();
    expect(qidFromUri('http://example.com/Q1')).toBeNull();
  });
});

describe('continentCode (P30)', () => {
  it('mapeia QIDs conhecidos para código de 2 letras', () => {
    expect(continentCode('http://www.wikidata.org/entity/Q46')).toBe('EU');
    expect(continentCode('http://www.wikidata.org/entity/Q18')).toBe('SA');
    expect(continentCode('http://www.wikidata.org/entity/Q15')).toBe('AF');
  });
  it('retorna null para desconhecido/ausente', () => {
    expect(continentCode('http://www.wikidata.org/entity/Q999')).toBeNull();
    expect(continentCode(undefined)).toBeNull();
  });
});

describe('parsePoint (WKT Point(lon lat))', () => {
  it('converte WKT válido', () => {
    expect(parsePoint('Point(-46.6 -23.5)')).toEqual({ lat: -23.5, lng: -46.6 });
  });
  it('rejeita malformado e fora de faixa', () => {
    expect(parsePoint(undefined)).toBeNull();
    expect(parsePoint('not-a-point')).toBeNull();
    expect(parsePoint('Point(200 100)')).toBeNull();
  });
});

describe('buildGeoQuery', () => {
  it('inclui os QIDs em VALUES e as propriedades P17/P297/P30/P131/P300/P625', () => {
    const q = buildGeoQuery(['Q1', 'Q2']);
    expect(q).toContain('VALUES ?club { wd:Q1 wd:Q2 }');
    expect(q).toContain('wdt:P17');
    expect(q).toContain('wdt:P297');
    expect(q).toContain('wdt:P30');
    expect(q).toContain('wdt:P131');
    expect(q).toContain('wdt:P300');
    expect(q).toContain('wdt:P625');
  });
});

describe('parseGeoBindings', () => {
  it('resolve país + cidade (P131) + estado (P131 pai com ISO 3166-2)', () => {
    const json = {
      results: {
        bindings: [
          {
            club: uri('Q100'),
            country: uri('Q155'),
            countryLabel: binding('', 'Brazil'),
            iso: binding('', 'BR'),
            continentQid: uri('Q18'),
            admin: uri('Q8678'),
            adminLabel: binding('', 'Rio de Janeiro'),
            adminPoint: binding('', 'Point(-43.2 -22.9)'),
            parent: uri('Q41428'),
            parentLabel: binding('', 'Rio de Janeiro'),
            parentIso: binding('', 'BR-RJ'),
            clubPoint: binding('', 'Point(-43.21 -22.91)'),
          },
        ],
      },
    };
    const rows = parseGeoBindings(json);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      clubQid: 'Q100',
      countryIso2: 'BR',
      countryName: 'Brazil',
      continent: 'SA',
      adminQid: 'Q8678',
      adminName: 'Rio de Janeiro',
      stateQid: 'Q41428',
      stateCode: 'BR-RJ',
      cityPoint: { lat: -22.9, lng: -43.2 },
      clubPoint: { lat: -22.91, lng: -43.21 },
    });
  });

  it('descarta linhas sem país/ISO-2 válido', () => {
    const json = {
      results: { bindings: [{ club: uri('Q1'), country: uri('Q2') }] },
    };
    expect(parseGeoBindings(json)).toEqual([]);
  });

  it('deduplica por clube (1 linha por clube) e tolera P31/duplicatas', () => {
    const json = {
      results: {
        bindings: [
          { club: uri('Q1'), country: uri('Q2'), iso: binding('', 'PT') },
          {
            club: uri('Q1'),
            country: uri('Q2'),
            iso: binding('', 'PT'),
            admin: uri('Q3'),
            adminLabel: binding('', 'Lisboa'),
          },
        ],
      },
    };
    const rows = parseGeoBindings(json);
    expect(rows).toHaveLength(1);
    expect(rows[0].adminQid).toBe('Q3');
  });
});

describe('planGeo (dedup por chave estável)', () => {
  const base = {
    countryQid: 'Q155',
    countryIso2: 'BR',
    countryName: 'Brazil',
    continent: 'SA',
    adminQid: 'Q8678',
    adminName: 'Rio de Janeiro',
    stateQid: 'Q41428',
    stateName: 'Rio de Janeiro',
    stateCode: 'BR-RJ',
    cityPoint: null,
    clubPoint: null,
  };

  it('deduplica países/estados/cidades e mantém 1 link por clube', () => {
    const rows = [
      { ...base, clubQid: 'Q100' },
      { ...base, clubQid: 'Q101', adminQid: 'Q999', adminName: 'Niterói' },
    ];
    const plan = planGeo(rows as never);
    expect(plan.countries).toHaveLength(1);
    expect(plan.states).toHaveLength(1);
    expect(plan.cities).toHaveLength(2);
    expect(plan.links).toHaveLength(2);
    expect(plan.links[1]).toMatchObject({ clubQid: 'Q101', cityQid: 'Q999', stateCode: 'BR-RJ' });
  });
});

describe('validateGeoRow (Zod — payload externo hostil)', () => {
  it('aceita linha válida e rejeita iso2/ qid malformados', () => {
    const ok = {
      clubQid: 'Q1',
      countryQid: 'Q2',
      countryIso2: 'BR',
      countryName: 'Brazil',
      continent: 'SA',
      adminQid: null,
      adminName: null,
      stateQid: null,
      stateName: null,
      stateCode: null,
      cityPoint: null,
      clubPoint: null,
    };
    expect(validateGeoRow(ok)).not.toBeNull();
    expect(validateGeoRow({ ...ok, countryIso2: 'BRA' })).toBeNull();
    expect(validateGeoRow({ ...ok, clubQid: 'nope' })).toBeNull();
  });
});

describe('GEO_DATASOURCE', () => {
  it('é a constante de proveniência usada no seed', () => {
    expect(GEO_DATASOURCE).toBe('wikidata-geo');
  });
});
