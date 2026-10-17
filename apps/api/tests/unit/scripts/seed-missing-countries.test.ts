import { describe, it, expect } from 'vitest';
import {
  CLASSES_DE_PAIS,
  construirConsulta,
  parsearArgs,
  parsearResposta,
  planejar,
  resolverContinente,
  resolverPaises,
  semear,
  type CountryStore,
  type PaisBruto,
  type PaisPlano,
} from '../../../src/scripts/seed-missing-countries.js';

// T580 — COMPLETAR A TABELA `countries`: aqui está o que é PURO (parse do SPARQL, guardas,
// planejamento) e o que é determinístico com `fetch` INJETADO. Nada toca a rede nem o banco —
// é por isso que a suíte roda no CI, onde o Postgres de produção não existe (skill prod-railway).

/** Uma linha de binding do WDQS (o que o `?var` devolve). */
function linha(campos: Record<string, string>) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, { value: v }]));
}

/** Resposta SPARQL no formato `sparql-results+json`. */
function resposta(...linhas: Array<Record<string, string>>) {
  return { results: { bindings: linhas } };
}

/** URI como o WDQS devolve num binding (`…/entity/Q183`). */
const Q = (qid: string) => `http://www.wikidata.org/entity/${qid}`;
const PREF = 'http://wikiba.se/ontology#PreferredRank';
const NORM = 'http://wikiba.se/ontology#NormalRank';

/** Bruto mínimo (forma JÁ agregada, com Q-ids puros como `parsearResposta` guarda). */
function bruto(over: Partial<PaisBruto> = {}): PaisBruto {
  return {
    iso2: 'DE',
    qids: new Set(['Q183']),
    labelsPt: new Set(['Alemanha']),
    labelsEn: new Set(['Germany']),
    iso3: new Set(['DEU']),
    pontos: new Set(),
    classes: new Set(['Q6256']),
    continentes: [{ qid: 'Q46', rank: 'norm' }],
    superiores: new Map(),
    ...over,
  };
}

describe('T580 · construirConsulta', () => {
  it('põe todos os códigos no VALUES e pede P297/P298/P30/P31/P625 com rank', () => {
    const q = construirConsulta(['DE', 'SS']);
    expect(q).toContain('VALUES ?iso2 { "DE" "SS" }');
    expect(q).toContain('?country wdt:P297 ?iso2');
    expect(q).toContain('wdt:P298 ?iso3');
    expect(q).toContain('wikibase:rank ?contRank');
    expect(q).toContain('wdt:P31 ?classe');
    expect(q).toContain('wdt:P625 ?coord');
  });
});

describe('T580 · parsearResposta', () => {
  it('agrega as linhas do cross-product em UM agregado por código', () => {
    const mapa = parsearResposta(
      resposta(
        linha({ iso2: 'JE', country: Q('Q785'), labelEn: 'Jersey', classe: Q('Q46395') }),
        linha({ iso2: 'JE', country: Q('Q785'), labelEn: 'Jersey', classe: Q('Q185086') }),
        linha({
          iso2: 'JE',
          country: Q('Q785'),
          labelEn: 'Jersey',
          coord: 'Point(-2.13 49.21)',
          continent: Q('Q46'),
          contRank: NORM,
          contSuper: Q('Q2'),
        }),
      ),
    );
    const je = mapa.get('JE');
    expect(je?.qids.size).toBe(1);
    expect([...(je?.classes ?? [])].sort()).toEqual(['Q185086', 'Q46395']);
    expect(je?.continentes).toEqual([{ qid: 'Q46', rank: 'norm' }]);
    expect(je?.superiores.get('Q46')?.has('Q2')).toBe(true);
    expect(mapa.size).toBe(1);
  });

  it('ignora código fora do formato e recusa payload que não é resposta SPARQL', () => {
    expect(parsearResposta(resposta(linha({ iso2: 'ZZZ', country: Q('Q183') }))).size).toBe(0);
    expect(() => parsearResposta({ nope: true })).toThrow(/formato inesperado/);
  });
});

describe('T580 · resolverContinente', () => {
  it('usa o P30 de rank preferred quando o item é transcontinental (Reino dos Países Baixos)', () => {
    const b = bruto({
      continentes: [
        { qid: 'Q46', rank: 'pref' },
        { qid: 'Q49', rank: 'norm' },
        { qid: 'Q15', rank: 'norm' },
      ],
    });
    expect(resolverContinente(b)).toEqual({
      code: 'EU',
      nota: 'continente pelo P30 de rank preferred',
    });
  });

  it('segue o P361 quando o P30 é uma sub-região fora do mapa (Insular Oceania → Oceania)', () => {
    const b = bruto({
      continentes: [{ qid: 'Q538', rank: 'norm' }],
      superiores: new Map([['Q538', new Set(['Q55643'])]]),
    });
    const r = resolverContinente(b);
    expect(r.code).toBe('OC');
    expect(r.nota).toMatch(/P361/);
  });

  it('não grava continente ambíguo — declara', () => {
    const b = bruto({
      continentes: [
        { qid: 'Q46', rank: 'norm' },
        { qid: 'Q18', rank: 'norm' },
      ],
    });
    const r = resolverContinente(b);
    expect(r.code).toBeNull();
    expect(r.nota).toMatch(/EU, SA|SA, EU/);
  });

  it('ignora P30 deprecado', () => {
    const b = bruto({
      continentes: [
        { qid: 'Q49', rank: 'dep' },
        { qid: 'Q46', rank: 'norm' },
      ],
    });
    expect(resolverContinente(b).code).toBe('EU');
  });

  it('sem P30 ⇒ null com motivo', () => {
    expect(resolverContinente(bruto({ continentes: [] }))).toEqual({
      code: null,
      nota: 'P30 ausente na fonte',
    });
  });
});

describe('T580 · planejar (as guardas)', () => {
  it('plano completo: iso3, continente, coordenada e proveniência do QID', () => {
    const b = bruto({
      iso2: 'SS',
      qids: new Set(['Q958']),
      labelsPt: new Set(['Sudão do Sul']),
      labelsEn: new Set(['South Sudan']),
      iso3: new Set(['SSD']),
      pontos: new Set(['Point(31.6 4.85)']),
      continentes: [{ qid: 'Q15', rank: 'norm' }],
    });
    const plano = planejar(['SS'], new Map([['SS', b]]));
    expect(plano.fora).toEqual([]);
    expect(plano.criar).toHaveLength(1);
    expect(plano.criar[0]).toMatchObject({
      iso2: 'SS',
      qid: 'Q958',
      iso3: 'SSD',
      name: 'South Sudan',
      continent: 'AF',
      latitude: 4.85,
      longitude: 31.6,
      sourceUrl: 'https://www.wikidata.org/wiki/Q958',
    });
  });

  it('nome em inglês por default (as 168 linhas existentes estão em EN) e pt quando pedido', () => {
    expect(planejar(['DE'], new Map([['DE', bruto()]])).criar[0]?.name).toBe('Germany');
    expect(planejar(['DE'], new Map([['DE', bruto()]]), 'pt').criar[0]?.name).toBe('Alemanha');
  });

  it('código sem item no P297 fica FORA com motivo', () => {
    const plano = planejar(['DD'], new Map());
    expect(plano.criar).toEqual([]);
    expect(plano.fora[0]?.motivo).toMatch(/nenhum item do Wikidata com P297 = DD/);
  });

  it('P297 respondendo 2 itens ⇒ FORA (código ambíguo)', () => {
    const b = bruto({
      qids: new Set(['Q1', 'Q2']),
    });
    const plano = planejar(['DE'], new Map([['DE', b]]));
    expect(plano.fora[0]?.motivo).toMatch(/respondeu 2 itens/);
  });

  it('P31 sem classe de país/território ⇒ FORA (Q5 = ser humano)', () => {
    const b = bruto({ classes: new Set(['Q5']) });
    const plano = planejar(['DE'], new Map([['DE', b]]));
    expect(plano.criar).toEqual([]);
    expect(plano.fora[0]?.motivo).toMatch(/P31 sem classe de país\/território \(P31: Q5\)/);
  });

  it('P298 com dois valores ⇒ FORA; P298 ausente ⇒ null + nota declarada', () => {
    const dois = planejar(['DE'], new Map([['DE', bruto({ iso3: new Set(['DEU', 'XXX']) })]]));
    expect(dois.fora[0]?.motivo).toMatch(/P298 com 2 valores/);

    const sem = planejar(['DE'], new Map([['DE', bruto({ iso3: new Set() })]]));
    expect(sem.criar[0]?.iso3).toBeNull();
    expect(sem.criar[0]?.notas).toContain('P298 ausente (iso3 fica null)');
  });

  it('sem label utilizável ⇒ FORA', () => {
    const b = bruto({ labelsEn: new Set(), labelsPt: new Set() });
    expect(planejar(['DE'], new Map([['DE', b]])).fora[0]?.motivo).toMatch(/sem label/);
  });

  it('sem P625 ⇒ coordenada null e nota (nada é inventado)', () => {
    const p = planejar(['DE'], new Map([['DE', bruto()]])).criar[0];
    expect(p?.latitude).toBeNull();
    expect(p?.longitude).toBeNull();
    expect(p?.notas).toContain('P625 ausente/inválido (coordenada fica null)');
  });

  it('a lista fechada de classes não contém classe que não seja de país/território', () => {
    expect(CLASSES_DE_PAIS.has('Q6256')).toBe(true);
    expect(CLASSES_DE_PAIS.has('Q5')).toBe(false);
  });
});

/** Banco em memória: as MESMAS chaves naturais (`iso2`, `qid`) do Postgres. */
function storeFake(inicial: PaisPlano[] = []) {
  const linhas = [...inicial];
  const gravados: PaisPlano[] = [];
  const store: CountryStore = {
    codesDoAcervo: async () => [],
    iso2Existentes: async () => new Set(linhas.map((l) => l.iso2)),
    qidExistentes: async () => new Set(linhas.map((l) => l.qid)),
    criar: async (p) => {
      linhas.push(p);
      gravados.push(p);
    },
    contagensDoAcervo: async () => ({
      clubs: 1,
      players: 2,
      competitions: 3,
      stadiums: 4,
      matches: 5,
      rankings: 6,
      countries: linhas.length,
      lote: gravados.length,
    }),
    fechar: async () => undefined,
  };
  return { store, gravados, linhas };
}

describe('T580 · semear (idempotência e zero overwrite)', () => {
  const pais: PaisPlano = {
    iso2: 'SS',
    qid: 'Q958',
    iso3: 'SSD',
    name: 'South Sudan',
    continent: 'AF',
    latitude: 4.85,
    longitude: 31.6,
    sourceUrl: 'https://www.wikidata.org/wiki/Q958',
    notas: [],
  };

  it('dry-run não escreve nada (só MEDE)', async () => {
    const { store, gravados } = storeFake();
    const stats = await semear(store, [pais], { apply: false, agora: new Date(0) });
    expect(stats).toMatchObject({ criados: 1, jaExistem: 0, dryRun: true });
    expect(gravados).toEqual([]);
  });

  it('--apply cria; re-run é NOOP (dedup por iso2)', async () => {
    const { store, gravados } = storeFake();
    const primeira = await semear(store, [pais], { apply: true, agora: new Date(0) });
    const segunda = await semear(store, [pais], { apply: true, agora: new Date(0) });
    expect(primeira).toMatchObject({ criados: 1, jaExistem: 0, dryRun: false });
    expect(segunda).toMatchObject({ criados: 0, jaExistem: 1, dryRun: false });
    expect(gravados).toHaveLength(1);
  });

  it('linha existente não é tocada (zero overwrite), mesmo com campo diferente', async () => {
    const existente = { ...pais, iso3: null, name: 'Antigo', continent: null };
    const { store, gravados } = storeFake([existente]);
    const stats = await semear(store, [pais], { apply: true, agora: new Date(0) });
    expect(stats).toMatchObject({ criados: 0, jaExistem: 1 });
    expect(gravados).toEqual([]);
  });

  it('QID já pertencente a outra linha não é inserido (qid é @unique)', async () => {
    const outra = { ...pais, iso2: 'XX' };
    const { store, gravados } = storeFake([outra]);
    const stats = await semear(store, [pais], { apply: true, agora: new Date(0) });
    expect(stats.criados).toBe(0);
    expect(stats.qidEmUso[0]?.iso2).toBe('SS');
    expect(stats.qidEmUso[0]?.motivo).toMatch(/@unique/);
    expect(gravados).toEqual([]);
  });
});

describe('T580 · resolverPaises (fetch injetado)', () => {
  it('parseia a resposta e não consulta código que a fonte não devolveu', async () => {
    const chamadas: string[] = [];
    const fetcher = (url: string) => {
      chamadas.push(url);
      return Promise.resolve(
        new Response(
          JSON.stringify(
            resposta(
              linha({
                iso2: 'NL',
                country: Q('Q29999'),
                labelEn: 'Kingdom of the Netherlands',
                iso3: 'NLD',
                classe: Q('Q6256'),
                continent: Q('Q46'),
                contRank: PREF,
              }),
            ),
          ),
          { status: 200 },
        ),
      );
    };
    const mapa = await resolverPaises(['NL', 'XX'], { fetcher });
    expect(chamadas).toHaveLength(1);
    expect(decodeURIComponent(chamadas[0] ?? '')).toContain('VALUES ?iso2 { "NL" "XX" }');
    expect(mapa.has('NL')).toBe(true);
    expect(mapa.has('XX')).toBe(false);
    expect(planejar(['NL', 'XX'], mapa).criar[0]).toMatchObject({
      iso2: 'NL',
      qid: 'Q29999',
      continent: 'EU',
    });
  });
});

describe('T580 · parsearArgs', () => {
  it('dry-run é o default e --iso2 aceita lista', () => {
    expect(parsearArgs([])).toEqual({ apply: false, only: null });
    expect(parsearArgs(['--apply'])).toEqual({ apply: true, only: null });
    expect(parsearArgs(['--iso2=nl, ss ,zzz'])).toEqual({
      apply: false,
      only: new Set(['NL', 'SS']),
    });
  });
});
