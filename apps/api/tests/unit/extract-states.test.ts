/**
 * Extração de estados do Wikidata (`lib/wikidata/extract-states.ts`).
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * O bot A grava em `states`, que é tabela de referência: `code` e `qid` são ÚNICOS, e um erro de
 * normalização derruba o lote inteiro por violação de constraint (ou pior, cria duplicata
 * silenciosa que quebra a hierarquia Estado → Cidade depois).
 *
 * As três peças que podem errar em silêncio:
 *   1. `montarQuery` interpola o código do país em SPARQL — é o único ponto com risco de injeção;
 *   2. `parseCoord` lê `Point(lon lat)` — a ordem é invertida em relação ao hábito, e trocar
 *      lat/lon coloca São Paulo no oceano Índico sem nenhum erro aparecer;
 *   3. `normalizarEstados` decide o que descartar — descartar demais perde estado, descartar de
 *      menos grava lixo ou duplicata.
 */
import { describe, it, expect } from 'vitest';
import {
  montarQuery,
  normalizarEstados,
  parseCoord,
  qidDeUri,
  LIMITE_POR_PAIS,
} from '../../src/lib/wikidata/extract-states.js';

const b = (campos: Record<string, string>) =>
  Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, { type: 'literal', value: v }]));

describe('montarQuery', () => {
  it('monta a consulta com o prefixo ISO do país', () => {
    const q = montarQuery('BR');
    expect(q).toContain('STRSTARTS(?code, "BR-")');
    expect(q).toContain('wdt:P300');
    expect(q).toContain(`LIMIT ${LIMITE_POR_PAIS}`);
  });

  it('RECUSA código que não é ISO2 alfabético — é interpolação em consulta', () => {
    /* Sem esta validação, um valor como `BR" } UNION { ?x ?y ?z` mudaria a consulta. */
    for (const ruim of ['br', 'B', 'BRA', 'B1', '', 'BR"', 'B R', 'BR;']) {
      expect(() => montarQuery(ruim), `aceitou "${ruim}"`).toThrow();
    }
  });

  it('pede coordenada como OPTIONAL — exigir perderia estado válido sem P625', () => {
    expect(montarQuery('AU')).toContain('OPTIONAL');
  });
});

describe('parseCoord', () => {
  it('lê Point(lon lat) na ordem correta', () => {
    // Sydney: lon 151.2, lat -33.87
    expect(parseCoord('Point(151.209 -33.8688)')).toEqual({ lat: -33.8688, lon: 151.209 });
  });

  it('aceita coordenada com sinal e inteiro', () => {
    expect(parseCoord('Point(121.0 -26.0)')).toEqual({ lat: -26, lon: 121 });
  });

  it('devolve null para ausente ou malformado', () => {
    expect(parseCoord(undefined)).toBeNull();
    expect(parseCoord('')).toBeNull();
    expect(parseCoord('não é ponto')).toBeNull();
    expect(parseCoord('Point(a b)')).toBeNull();
  });

  it('RECUSA coordenada fora da faixa — lat/lon trocados caem aqui', () => {
    /* O caso que importa: se alguém inverter a leitura, Sydney vira lat 151 — fora de [-90,90].
       É melhor não gravar do que gravar a cidade no lugar errado do planeta. */
    expect(parseCoord('Point(151.2 -33.8)')).not.toBeNull();
    expect(parseCoord('Point(-33.8 151.2)')).toBeNull();
  });
});

describe('qidDeUri', () => {
  it('extrai o QID da URL canônica', () => {
    expect(qidDeUri('http://www.wikidata.org/entity/Q175')).toBe('Q175');
  });
  it('recusa o que não é QID', () => {
    expect(qidDeUri(undefined)).toBeNull();
    expect(qidDeUri('http://www.wikidata.org/entity/P300')).toBeNull();
    expect(qidDeUri('qualquer coisa')).toBeNull();
  });
});

describe('normalizarEstados', () => {
  const linhas = [
    b({
      item: 'http://www.wikidata.org/entity/Q175',
      itemLabel: 'São Paulo',
      code: 'BR-SP',
      coord: 'Point(-46.6333 -23.5505)',
    }),
    b({
      item: 'http://www.wikidata.org/entity/Q15499',
      itemLabel: 'Paraná',
      code: 'BR-PR',
    }),
  ];

  it('normaliza linhas válidas com nome, coordenada e URL de origem', () => {
    const { estados } = normalizarEstados(linhas, 'BR');
    expect(estados).toHaveLength(2);
    const sp = estados.find((e) => e.code === 'BR-SP')!;
    expect(sp.name).toBe('São Paulo');
    expect(sp.qid).toBe('Q175');
    expect(sp.latitude).toBeCloseTo(-23.5505);
    expect(sp.longitude).toBeCloseTo(-46.6333);
    expect(sp.sourceUrl).toBe('https://www.wikidata.org/wiki/Q175');
  });

  it('estado sem coordenada continua entrando (coordenada é opcional)', () => {
    const { estados } = normalizarEstados([linhas[1]], 'BR');
    expect(estados).toHaveLength(1);
    expect(estados[0].latitude).toBeNull();
  });

  it('descarta e CONTA o motivo de cada descarte', () => {
    const { estados, descartados } = normalizarEstados(
      [
        b({ itemLabel: 'Sem QID', code: 'BR-X' }), // sem qid
        b({ item: 'http://www.wikidata.org/entity/Q1', itemLabel: 'Sem código' }), // sem code
        b({
          item: 'http://www.wikidata.org/entity/Q2',
          itemLabel: 'Outro país',
          code: 'AR-C',
        }), // código de outro país
        b({
          item: 'http://www.wikidata.org/entity/Q3',
          itemLabel: 'Q3',
          code: 'BR-Y',
        }), // rótulo é o próprio QID
      ],
      'BR',
    );
    expect(estados).toHaveLength(0);
    expect(descartados.sem_qid).toBe(1);
    expect(descartados.sem_codigo_iso).toBe(1);
    expect(descartados.codigo_de_outro_pais).toBe(1);
    expect(descartados.sem_rotulo_legivel).toBe(1);
  });

  it('DEDUPLICA por código — o mesmo estado com duas coordenadas entra uma vez', () => {
    /* Acontece de verdade: o item tem mais de um valor de P625, e o SPARQL devolve uma linha por
       valor. Sem dedupe, a criação viola a constraint única de `code` e o lote inteiro falha. */
    const { estados, descartados } = normalizarEstados(
      [
        b({
          item: 'http://www.wikidata.org/entity/Q175',
          itemLabel: 'São Paulo',
          code: 'BR-SP',
          coord: 'Point(-46.6 -23.5)',
        }),
        b({
          item: 'http://www.wikidata.org/entity/Q175',
          itemLabel: 'São Paulo',
          code: 'BR-SP',
          coord: 'Point(-47.0 -22.0)',
        }),
      ],
      'BR',
    );
    expect(estados).toHaveLength(1);
    expect(descartados.codigo_repetido).toBe(1);
    // Fica a PRIMEIRA — a ordem do Wikidata não é garantida, então o teste fixa o comportamento.
    expect(estados[0].latitude).toBeCloseTo(-23.5);
  });

  it('normaliza o código para maiúsculas', () => {
    const { estados } = normalizarEstados(
      [b({ item: 'http://www.wikidata.org/entity/Q175', itemLabel: 'São Paulo', code: 'br-sp' })],
      'BR',
    );
    expect(estados[0].code).toBe('BR-SP');
  });
});
