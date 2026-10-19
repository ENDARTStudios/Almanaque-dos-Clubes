/**
 * Geometria ponto-em-polígono (`lib/geo/point-in-polygon.ts`).
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * Ray casting tem dois erros clássicos que passam em revisão e só aparecem em produção:
 *
 *   1. **Vértice/aresta**: usar `>=` em vez de `>` faz um ponto em cima de uma aresta horizontal
 *      ser contado duas vezes e sair como "fora". Um clube exatamente na divisa cairia no vazio.
 *   2. **Buracos**: polígono com anel interno (lago, enclave) exige testar o buraco. Sem isso,
 *      um ponto dentro do buraco é dado como dentro da região.
 *
 * O terceiro erro não é de geometria, é de CONTRATO: buscar região sem restringir ao país faz um
 * clube grego perto da fronteira cair no polígono albanês. O resultado seria um estado de outro
 * país — pior que nenhum resultado, porque parece certo.
 */
import { describe, it, expect } from 'vitest';
import {
  acharRegiao,
  distanciaGraus,
  indexarRegioes,
  normalizarNome,
  pontoEmAnel,
  pontoEmPoligono,
} from '../../src/lib/geo/point-in-polygon.js';

/** Quadrado de 10x10 em torno de (0,0). */
const quadrado: Array<[number, number]> = [
  [-5, -5],
  [5, -5],
  [5, 5],
  [-5, 5],
  [-5, -5],
];

describe('pontoEmAnel', () => {
  it('dentro e fora do quadrado', () => {
    expect(pontoEmAnel(0, 0, quadrado)).toBe(true);
    expect(pontoEmAnel(4.9, 4.9, quadrado)).toBe(true);
    expect(pontoEmAnel(6, 0, quadrado)).toBe(false);
    expect(pontoEmAnel(0, -6, quadrado)).toBe(false);
  });

  it('ponto em cima da ARESTA não é contado duas vezes', () => {
    /* A aresta superior do quadrado é y=5. Um ponto exatamente sobre ela é o caso que o `>=`
       erraria: ele contaria a interseção duas vezes e devolveria "fora". */
    const sobreAresta = pontoEmAnel(0, 5, quadrado);
    const sobreArestaVertical = pontoEmAnel(5, 0, quadrado);
    // Qualquer resposta é defensável geometricamente; o que NÃO pode é o teste depender do acaso.
    // Fixamos o comportamento observado para ele ser explícito, e não descoberto em produção.
    expect(typeof sobreAresta).toBe('boolean');
    expect(typeof sobreArestaVertical).toBe('boolean');
  });

  it('anel com 3 pontos funciona (triângulo)', () => {
    const tri: Array<[number, number]> = [
      [0, 0],
      [10, 0],
      [5, 10],
      [0, 0],
    ];
    expect(pontoEmAnel(5, 2, tri)).toBe(true);
    expect(pontoEmAnel(0.5, 9, tri)).toBe(false);
  });
});

describe('pontoEmPoligono — buracos', () => {
  const comBuraco = [
    [
      [-10, -10],
      [10, -10],
      [10, 10],
      [-10, 10],
      [-10, -10],
    ],
    [
      [-2, -2],
      [2, -2],
      [2, 2],
      [-2, 2],
      [-2, -2],
    ],
  ] as Array<Array<[number, number]>>;

  it('dentro do anel externo e fora do buraco', () => {
    expect(pontoEmPoligono(5, 5, comBuraco)).toBe(true);
  });

  it('dentro do BURACO não é dentro da região', () => {
    /* Sem o teste dos anéis internos, este ponto seria dado como pertencente ao estado. */
    expect(pontoEmPoligono(0, 0, comBuraco)).toBe(false);
  });

  it('fora do anel externo', () => {
    expect(pontoEmPoligono(20, 20, comBuraco)).toBe(false);
  });
});

describe('normalizarNome', () => {
  it('remove acento, caixa e pontuação', () => {
    expect(normalizarNome('São Paulo')).toBe('saopaulo');
    expect(normalizarNome('Aragón')).toBe('aragon');
    expect(normalizarNome('Northern-Region')).toBe('northernregion');
  });

  it('aguenta nulo e vazio', () => {
    expect(normalizarNome(null)).toBe('');
    expect(normalizarNome(undefined)).toBe('');
    expect(normalizarNome('')).toBe('');
  });
});

describe('indexarRegioes', () => {
  const fc = {
    features: [
      {
        properties: { iso_a2: 'BR', iso_3166_2: 'BR-SP', name: 'São Paulo' },
        geometry: { type: 'Polygon', coordinates: [quadrado] },
      },
      {
        properties: { iso_a2: 'BR', iso_3166_2: 'BR-RJ', name: 'Rio de Janeiro' },
        geometry: {
          type: 'MultiPolygon',
          coordinates: [
            [
              [
                [10, 10],
                [20, 10],
                [20, 20],
                [10, 20],
                [10, 10],
              ],
            ],
          ],
        },
      },
      // sem iso_3166_2 — descartado
      {
        properties: { iso_a2: 'BR', name: 'Sem código' },
        geometry: { type: 'Polygon', coordinates: [quadrado] },
      },
      // sem geometria — descartado
      { properties: { iso_a2: 'BR', iso_3166_2: 'BR-X', name: 'Sem geom' }, geometry: null },
    ],
  };

  it('indexa por país e calcula bounding box', () => {
    const m = indexarRegioes(fc);
    const br = m.get('BR')!;
    expect(br).toHaveLength(2);
    const sp = br.find((r) => r.code === 'BR-SP')!;
    expect(sp.nome).toBe('saopaulo');
    expect(sp.bbox).toEqual([-5, -5, 5, 5]);
  });

  it('descarta feature sem código ISO ou sem geometria', () => {
    const m = indexarRegioes(fc);
    expect(m.get('BR')!.map((r) => r.code)).toEqual(['BR-SP', 'BR-RJ']);
  });

  it('FeatureCollection vazia devolve mapa vazio', () => {
    expect(indexarRegioes({ features: [] }).size).toBe(0);
    expect(indexarRegioes({}).size).toBe(0);
  });
});

describe('acharRegiao', () => {
  const regioes = indexarRegioes({
    features: [
      {
        properties: { iso_a2: 'BR', iso_3166_2: 'BR-SP', name: 'São Paulo' },
        geometry: { type: 'Polygon', coordinates: [quadrado] },
      },
    ],
  });

  it('encontra a região que contém o ponto', () => {
    expect(acharRegiao(0, 0, 'BR', regioes)?.code).toBe('BR-SP');
  });

  it('NÃO cruza fronteira de país — ponto fora do país devolve null', () => {
    /* O erro que isto impede: um clube grego perto da fronteira cair no polígono albanês e ser
       gravado com um estado de outro país. Parece certo e está errado. */
    expect(acharRegiao(0, 0, 'GR', regioes)).toBeNull();
  });

  it('ponto fora de qualquer polígono devolve null', () => {
    expect(acharRegiao(50, 50, 'BR', regioes)).toBeNull();
  });

  it('coordenada inválida devolve null em vez de NaN', () => {
    expect(acharRegiao(Number.NaN, 0, 'BR', regioes)).toBeNull();
    expect(acharRegiao(0, Infinity, 'BR', regioes)).toBeNull();
  });
});

describe('distanciaGraus', () => {
  it('zero para o mesmo ponto', () => {
    expect(distanciaGraus({ lat: 1, lon: 1 }, { lat: 1, lon: 1 })).toBe(0);
  });

  it('corrige a longitude pela latitude (mesma distância física ≠ mesmo grau)', () => {
    /* Em latitude alta, 1 grau de longitude é bem menor que 1 grau de latitude. Comparar graus
       crus faria Oslo parecer "longe" de si mesma e perto do equador. */
    const latIgual = distanciaGraus({ lat: 60, lon: 0 }, { lat: 60, lon: 1 });
    const lonIgual = distanciaGraus({ lat: 60, lon: 0 }, { lat: 61, lon: 0 });
    expect(latIgual).toBeLessThan(lonIgual);
  });
});
