/**
 * Resolução clube -> estado pela cadeia `P131` (`lib/wikidata/resolve-state.ts`).
 *
 * ── POR QUE ESTE TESTE EXISTE ────────────────────────────────────────────────────────────
 * A regra que estes testes travam é uma só: **não inventar estado**. Ligar um clube ao estado
 * errado não quebra nada visível — a página continua bonita, o clube aparece na hierarquia
 * errada, e ninguém percebe. É o tipo de erro que sobrevive a revisão e a build verde.
 *
 * Por isso os casos negativos importam mais que os positivos: cadeia que não chega a estado tem
 * de terminar em "não resolvido", nunca no primeiro candidato que aparecer.
 *
 * O `buscar` é injetado — nenhum teste aqui toca a rede.
 */
import { describe, it, expect } from 'vitest';
import {
  p131DeEntidade,
  resolverClubesParaEstados,
  PROFUNDIDADE_MAX,
} from '../../src/lib/wikidata/resolve-state.js';
import type { WikidataEntity } from '../../src/lib/wikidata/wikidata-client.js';

/** Entidade mínima com os P131 pedidos. */
const ent = (...pais: string[]): WikidataEntity => ({
  id: 'Q0',
  claims: { P131: pais.map((id) => ({ mainsnak: { datavalue: { value: { id } } } })) },
});

/** `buscar` de mentira: mapa qid -> entidade. */
const buscarDe =
  (mapa: Record<string, WikidataEntity>) =>
  async (qids: string[]): Promise<Map<string, WikidataEntity | null>> => {
    const entradas = new Map(Object.entries(mapa));
    const out = new Map<string, WikidataEntity | null>();
    for (const q of qids) out.set(q, entradas.get(q) ?? null);
    return out;
  };

describe('p131DeEntidade', () => {
  it('devolve TODOS os P131, não só o primeiro', () => {
    /* `extractP131Qid` (do enrich-attributes) devolve [0] porque para cidade o primeiro basta.
       Para estado não basta: um município pode declarar mais de um pai, e o que leva ao estado
       pode ser o segundo. */
    expect(p131DeEntidade(ent('Q1', 'Q2'))).toEqual(['Q1', 'Q2']);
  });

  it('recusa o que não é QID e deduplica', () => {
    const e: WikidataEntity = {
      id: 'Q0',
      claims: {
        P131: [
          { mainsnak: { datavalue: { value: { id: 'Q1' } } } },
          { mainsnak: { datavalue: { value: { id: 'Q1' } } } },
          { mainsnak: { datavalue: { value: { id: 'P300' } } } },
          { mainsnak: { datavalue: { value: { id: 'texto' } } } },
        ],
      },
    };
    expect(p131DeEntidade(e)).toEqual(['Q1']);
  });

  it('entidade nula devolve lista vazia', () => {
    expect(p131DeEntidade(null)).toEqual([]);
    expect(p131DeEntidade(undefined)).toEqual([]);
  });
});

describe('resolverClubesParaEstados — caminho feliz', () => {
  it('resolve no nível 0 quando o P131 do clube JÁ é o estado', async () => {
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent('Q175') }),
    });
    expect(r.resolvidos.get('c1')).toEqual({ stateId: 'estado-sp', profundidade: 0 });
    expect(r.naoResolvidos).toEqual([]);
  });

  it('resolve no nível 1: clube -> município -> estado', async () => {
    /* O caso mais comum: o P131 do clube é a cidade, e o P131 da cidade é o estado. */
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent('Q174'), Q174: ent('Q175') }),
    });
    expect(r.resolvidos.get('c1')).toEqual({ stateId: 'estado-sp', profundidade: 1 });
  });

  it('resolve no nível 2 quando há distrito no meio', async () => {
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent('Q50'), Q50: ent('Q174'), Q174: ent('Q175') }),
    });
    expect(r.resolvidos.get('c1')?.profundidade).toBe(2);
  });

  it('escolhe o ramo que chega ao estado quando um dos pais não leva a nada', async () => {
    /* União de pais, não escolha do primeiro: o município declara dois pais, e só o segundo é
       estado. Escolher `[0]` cegamente deixaria este clube sem estado. */
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent('Q900', 'Q175') }),
    });
    expect(r.resolvidos.get('c1')?.stateId).toBe('estado-sp');
  });

  it('agrupa clubes do mesmo país numa única busca por nível', async () => {
    /* Todos os clubes de São Paulo apontam para Q174, que aponta para Q175. Uma busca por nível
       serve o conjunto — é o que torna 9 mil clubes viáveis em ~4 níveis de requisições. */
    const chamadas: string[][] = [];
    const buscar = async (qids: string[]) => {
      chamadas.push(qids);
      // Map em vez de objeto indexado: `obj[chaveVariavel]` é o padrão que o lint marca.
      const mapa = new Map<string, WikidataEntity>([
        ['Q100', ent('Q174')],
        ['Q101', ent('Q174')],
        ['Q174', ent('Q175')],
      ]);
      const out = new Map<string, WikidataEntity | null>();
      for (const q of qids) out.set(q, mapa.get(q) ?? null);
      return out;
    };
    const r = await resolverClubesParaEstados(
      [
        { id: 'c1', qid: 'Q100' },
        { id: 'c2', qid: 'Q101' },
      ],
      { estadosPorQid: new Map([['Q175', 'estado-sp']]), buscar },
    );
    expect(r.resolvidos.size).toBe(2);
    // 1ª chamada: os clubes. 2ª: os candidatos (Q174, deduplicado).
    expect(chamadas).toHaveLength(2);
    expect(chamadas[1]).toEqual(['Q174']);
  });
});

describe('resolverClubesParaEstados — o que NÃO pode ser ligado', () => {
  it('cadeia que não chega a estado termina como NÃO RESOLVIDO', async () => {
    /* O erro caro: ligar ao primeiro candidato só para "ter alguma coisa". Melhor não ter. */
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent('Q900'), Q900: ent('Q901'), Q901: ent('Q902') }),
    });
    expect(r.resolvidos.size).toBe(0);
    expect(r.naoResolvidos).toEqual(['c1']);
  });

  it('clube sem P131 não é resolvido', async () => {
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q100' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({ Q100: ent() }),
    });
    expect(r.naoResolvidos).toEqual(['c1']);
  });

  it('entidade inexistente no Wikidata não vira resolução', async () => {
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q404' }], {
      estadosPorQid: new Map([['Q175', 'estado-sp']]),
      buscar: buscarDe({}),
    });
    expect(r.naoResolvidos).toEqual(['c1']);
  });

  it('respeita a profundidade máxima e para — a cadeia P131 é um grafo', async () => {
    /* Sem teto, um ciclo (A -> B -> A) faria a busca não terminar. */
    // Map em vez de objeto indexado: `obj[chaveVariavel]` e o padrao que o lint marca como
    // object-injection, e o projeto ja tem centenas desses avisos.
    const ciclo = new Map<string, WikidataEntity>();
    for (let i = 0; i < 50; i++) ciclo.set(`Q${i}`, ent(`Q${(i + 1) % 50}`));
    const r = await resolverClubesParaEstados([{ id: 'c1', qid: 'Q0' }], {
      estadosPorQid: new Map(),
      buscar: async (qids) => {
        const out = new Map<string, WikidataEntity | null>();
        for (const q of qids) out.set(q, ciclo.get(q) ?? null);
        return out;
      },
      profundidadeMax: 3,
    });
    expect(r.resolvidos.size).toBe(0);
    expect(r.naoResolvidos).toEqual(['c1']);
    // nível 0..3 -> 4 entradas
    expect(r.porProfundidade).toHaveLength(4);
  });

  it('lista vazia não chama a rede', async () => {
    let chamou = false;
    const r = await resolverClubesParaEstados([], {
      estadosPorQid: new Map(),
      buscar: async () => {
        chamou = true;
        return new Map();
      },
    });
    expect(chamou).toBe(false);
    expect(r.resolvidos.size).toBe(0);
  });
});

describe('estado padrão', () => {
  it('a profundidade padrão é finita e pequena', () => {
    expect(PROFUNDIDADE_MAX).toBeGreaterThanOrEqual(2);
    expect(PROFUNDIDADE_MAX).toBeLessThanOrEqual(6);
  });
});
