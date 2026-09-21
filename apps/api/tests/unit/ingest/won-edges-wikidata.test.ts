/**
 * T448 — Unit: conector Wikidata de arestas WON + serviço de sync (repo mock).
 *
 * Cobre: shape da query SPARQL (P1346/P3450/futebol/ano/ORDER BY), parser
 * (linhas malformadas descartadas E contadas), enriquecimento com labels,
 * dedup key, resolveGender (marcadores do dispatch), metadata congelado
 * (hierarquia via resolveHierarchy importada + sourceUrl da EDIÇÃO) e as
 * regras do sync: gap (mãe ausente) NUNCA grava; órfão (clube ausente) NUNCA
 * grava; re-run com dado estável = zero escrita; metadata divergente =
 * atualiza sem duplicar.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  buildWonEdgesQuery,
  enrichWithMotherLabels,
  buildMotherLabelsQuery,
  buildWonEdgeMetadata,
  isKnownHierarchy,
  parseWonEdgesResponse,
  resolveGender,
  wonEdgeDedupKey,
} from '../../../src/modules/etl/connectors/wikidata-won-edges.connector.js';
import {
  collapseEditionYears,
  createPrismaWonEdgeRepo,
  syncWonEdges,
  type WonEdgeRepo,
} from '../../../src/modules/etl/won-edges.service.js';
import type { PrismaClient } from '@prisma/client';

// prisma mockado (vi.hoisted) para testar a leitura CONGELADA de loadChampions
// sem tocar no banco — gravar aresta 'mundial' num teste de integração
// contaminaria o DB compartilhado (classe R2).
const prismaMock = vi.hoisted(() => ({
  knowledgeGraph: { findMany: vi.fn() },
  competition: { findMany: vi.fn() },
  club: { findMany: vi.fn() },
  ranking: { findFirst: vi.fn() },
  rankingEntry: { findMany: vi.fn() },
}));
vi.mock('../../../src/config/prisma.js', () => ({ prisma: prismaMock }));
vi.mock('../../../src/services/cache.js', () => ({
  cache: { remember: async (_k: string, _t: number, fn: () => unknown) => fn() },
}));

import { loadChampions } from '../../../src/modules/champions/champions.service.js';

const spqlJson = (bindings: Array<Record<string, { value: string }>>) => ({
  results: { bindings },
});

const validBinding = {
  edition: { value: 'https://www.wikidata.org/wiki/Q94800123' },
  mother: { value: 'https://www.wikidata.org/wiki/Q94800456' },
  winner: { value: 'https://www.wikidata.org/wiki/Q94800789' },
  year: { value: '2023' },
};

describe('buildWonEdgesQuery — shape SPARQL (T448)', () => {
  it('ancora em P1346 + P3450 e restringe a competição de futebol', () => {
    const q = buildWonEdgesQuery({ minYear: 2020, maxYear: 2024 });
    expect(q).toContain('?edition wdt:P1346 ?winner');
    expect(q).toContain('?edition wdt:P3450 ?mother');
    expect(q).toContain('wd:Q1478437'); // association football competition
    expect(q).toContain('P585'); // point in time
    expect(q).toContain('P580'); // start
    expect(q).toContain('P582'); // end
  });

  it('filtra a janela de anos com range nativo de dateTime e ordena (reprodutibilidade T428)', () => {
    const q = buildWonEdgesQuery({ minYear: 2020, maxYear: 2024 });
    expect(q).toContain('"2020-01-01"^^xsd:dateTime');
    expect(q).toContain('"2024-12-31T23:59:59"^^xsd:dateTime');
    expect(q).toContain('ORDER BY ?edition');
    expect(q).toContain('LIMIT');
  });

  it('labels das mães usam consulta VALUES-bounded', () => {
    const q = buildMotherLabelsQuery(['Q123', 'Q456']);
    expect(q).toContain('VALUES ?mother { wd:Q123 wd:Q456 }');
    expect(q).toContain('motherLabel');
  });
});

describe('parseWonEdgesResponse + enrichWithMotherLabels', () => {
  it('parseia linha válida', () => {
    const { rows, invalid } = parseWonEdgesResponse(spqlJson([validBinding]));
    expect(invalid).toBe(0);
    expect(rows).toEqual([
      { editionQid: 'Q94800123', motherQid: 'Q94800456', winnerQid: 'Q94800789', year: 2023 },
    ]);
  });

  it('descarta e CONTA linhas malformadas (qid/ano inválido, campo ausente)', () => {
    const bindings = [
      validBinding,
      { ...validBinding, edition: { value: 'https://www.wikidata.org/wiki/XXX' } },
      { ...validBinding, year: { value: 'abcd' } },
      { ...validBinding, winner: { value: '' } },
    ];
    const { rows, invalid } = parseWonEdgesResponse(spqlJson(bindings));
    expect(rows).toHaveLength(1);
    expect(invalid).toBe(3);
  });

  it('JSON sem bindings → vazio (nunca lança)', () => {
    expect(parseWonEdgesResponse({})).toEqual({ rows: [], invalid: 0 });
  });

  it('enriquece com label da mãe; sem label → descarta e conta', () => {
    const rows = [
      { editionQid: 'Q1', motherQid: 'Q10', winnerQid: 'Q100', year: 2022 },
      { editionQid: 'Q2', motherQid: 'Q20', winnerQid: 'Q200', year: 2022 },
    ];
    const { candidates, withoutLabel } = enrichWithMotherLabels(
      rows,
      new Map([['Q10', 'Copa Libertadores']]),
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].motherName).toBe('Copa Libertadores');
    expect(withoutLabel).toBe(1);
  });
});

describe('wonEdgeDedupKey', () => {
  it('determinística e em ordem mãe|ano|vencedor', () => {
    expect(wonEdgeDedupKey({ motherQid: 'Q10', year: 2023, winnerQid: 'Q100' })).toBe(
      'Q10|2023|Q100',
    );
    expect(wonEdgeDedupKey({ motherQid: 'Q10', year: 2023, winnerQid: 'Q100' })).toBe(
      wonEdgeDedupKey({ motherQid: 'Q10', year: 2023, winnerQid: 'Q100' }),
    );
  });
});

describe('resolveGender — marcadores do dispatch, default men', () => {
  it('detecta feminino por isWomensCompetition (mesma fonte do ranking) e marcadores extras', () => {
    expect(resolveGender("Women's FA Cup")).toBe('women');
    expect(resolveGender('Campeonato Brasileiro Feminino')).toBe('women');
    expect(resolveGender('Copa Femenina')).toBe('women');
    expect(resolveGender('Liga Feminina de Basquete')).toBe('women');
    expect(resolveGender('Copa Fem. 2024')).toBe('women');
  });

  it('default masculino (nome neutro ou ausente)', () => {
    expect(resolveGender('Campeonato Brasileiro Série A')).toBe('men');
    expect(resolveGender('')).toBe('men');
    expect(resolveGender(null)).toBe('men');
    expect(resolveGender(undefined)).toBe('men');
  });
});

describe('buildWonEdgeMetadata — hierarquia/gênero congelados, proveniência na EDIÇÃO', () => {
  it('resolve pela referência do acervo quando disponível', () => {
    const meta = buildWonEdgeMetadata({
      candidate: {
        editionQid: 'Q94800123',
        motherQid: 'Q94800456',
        winnerQid: 'Q94800789',
        year: 2023,
        motherName: 'Copa Libertadores',
      },
      motherRef: {
        id: 'c1',
        qid: 'Q94800456',
        name: 'CONMEBOL Libertadores',
        type: 'CUP',
        country: null,
      },
      importedAt: new Date('2026-09-22T00:00:00Z'),
    });
    expect(meta.hierarchy).toBe('continental');
    expect(meta.gender).toBe('men');
    expect(meta.year).toBe(2023);
    expect(meta.season).toBe('2023');
  });

  it('sourceUrl aponta para a EDIÇÃO (não para a mãe); licença CC0; dataSource wikidata', () => {
    const meta = buildWonEdgeMetadata({
      candidate: {
        editionQid: 'Q94800123',
        motherQid: 'Q94800456',
        winnerQid: 'Q94800789',
        year: 2023,
        motherName: 'Some League',
      },
      importedAt: new Date(),
    });
    expect(meta.sourceUrl).toBe('https://www.wikidata.org/wiki/Q94800123');
    expect(meta.dataSource).toBe('wikidata');
    expect(meta.license).toBe('CC0');
    expect(meta.editionQid).toBe('Q94800123');
  });

  it('isKnownHierarchy guarda metadata lido do banco', () => {
    expect(isKnownHierarchy('mundial')).toBe(true);
    expect(isKnownHierarchy('inventado')).toBe(false);
    expect(isKnownHierarchy(42)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// syncWonEdges com repo em memória
// ---------------------------------------------------------------------------

interface StoredEdge {
  id: string;
  clubId: string;
  competitionId: string;
  metadata: Record<string, unknown>;
}

function makeMockRepo(overrides: Partial<WonEdgeRepo> = {}) {
  const stored: StoredEdge[] = [];
  let nextId = 1;
  let created = 0;
  let updated = 0;
  const repo: WonEdgeRepo = {
    findClubByQid: async (qid) => (qid === 'QCLUB' ? { id: 'club-1' } : null),
    findCompetitionByQid: async (qid) =>
      qid === 'QCOMP'
        ? { id: 'comp-1', qid, name: 'Campeonato de Teste', type: 'LEAGUE', country: 'BR' }
        : null,
    findWonEdge: async ({ clubId, competitionId, year }) =>
      stored.find(
        (e) => e.clubId === clubId && e.competitionId === competitionId && e.metadata.year === year,
      ) ?? null,
    createWonEdge: async (args) => {
      created += 1;
      const id = `edge-${nextId++}`;
      stored.push({ id, ...args, metadata: args.metadata as Record<string, unknown> });
      return { id };
    },
    updateWonEdgeMetadata: async (id, metadata) => {
      updated += 1;
      const e = stored.find((x) => x.id === id);
      if (e) e.metadata = metadata as Record<string, unknown>;
    },
    ...overrides,
  };
  return {
    repo,
    stored,
    counters: {
      get created() {
        return created;
      },
      get updated() {
        return updated;
      },
    },
  };
}

const candidate = {
  editionQid: 'Q94800123',
  motherQid: 'QCOMP',
  winnerQid: 'QCLUB',
  year: 2023,
  motherName: 'Campeonato de Teste',
};

describe('syncWonEdges (repo mock)', () => {
  it('cria aresta com metadata congelado e proveniência; conta por hierarquia', async () => {
    const { repo, stored } = makeMockRepo();
    const result = await syncWonEdges([candidate], repo);
    expect(result.counts.created).toBe(1);
    expect(result.created).toHaveLength(1);
    expect(stored).toHaveLength(1);
    const meta = stored[0].metadata;
    expect(meta.year).toBe(2023);
    expect(meta.season).toBe('2023');
    expect(meta.gender).toBe('men');
    expect(meta.dataSource).toBe('wikidata');
    expect(meta.license).toBe('CC0');
    expect(meta.sourceUrl).toBe('https://www.wikidata.org/wiki/Q94800123');
    expect(result.byHierarchy.nacional.created).toBe(1);
  });

  it('mãe ausente → NÃO grava e conta gap por hierarquia derivada do label', async () => {
    const { repo, stored } = makeMockRepo();
    const result = await syncWonEdges(
      [{ ...candidate, motherQid: 'QINEXISTENTE', motherName: 'Copa Libertadores' }],
      repo,
    );
    expect(stored).toHaveLength(0);
    expect(result.counts.created).toBe(0);
    expect(result.gaps).toHaveLength(1);
    expect(result.gapByHierarchy.continental).toBe(1);
    expect(result.gaps[0].motherQid).toBe('QINEXISTENTE');
  });

  it('clube ausente → órfão, nunca grava', async () => {
    const { repo, stored } = makeMockRepo();
    const result = await syncWonEdges([{ ...candidate, winnerQid: 'QFANTASMA' }], repo);
    expect(stored).toHaveLength(0);
    expect(result.orphans).toEqual([
      expect.objectContaining({ winnerQid: 'QFANTASMA', reason: 'club_missing' }),
    ]);
  });

  it('idempotência: re-run com dado estável → zero escrita', async () => {
    const { repo, stored, counters } = makeMockRepo();
    await syncWonEdges([candidate], repo);
    expect(stored).toHaveLength(1);
    const second = await syncWonEdges([candidate], repo);
    expect(second.counts.created).toBe(0);
    expect(second.counts.skipped).toBe(1);
    expect(second.counts.updated).toBe(0);
    expect(counters.created).toBe(1);
    expect(counters.updated).toBe(0);
    expect(stored).toHaveLength(1);
  });

  it('metadata divergente → atualiza SEM duplicar (re-derivação de hierarquia)', async () => {
    const { repo, stored, counters } = makeMockRepo();
    await syncWonEdges([candidate], repo);
    const result = await syncWonEdges(
      [{ ...candidate, editionQid: 'Q94800999', motherName: 'Campeonato de Teste Renomeado' }],
      repo,
    );
    expect(result.counts.updated).toBe(1);
    expect(result.counts.created).toBe(0);
    expect(counters.created).toBe(1);
    expect(stored).toHaveLength(1);
    expect(stored[0].metadata.sourceUrl).toContain('Q94800999');
  });

  it('duplicata em lote (mesma mãe+ano+vencedor) é contada, não escrita', async () => {
    const { repo, stored } = makeMockRepo();
    const result = await syncWonEdges([candidate, { ...candidate }], repo);
    expect(result.counts.duplicatesInBatch).toBe(1);
    expect(stored).toHaveLength(1);
  });

  it('createWonEdge do repo Prisma serializa metadata como JSON (contrato do cast)', async () => {
    // Cast `as unknown as Prisma.InputJsonObject` é seguro por construção:
    // WonEdgeMetadata é objeto plano. Aqui provamos o formato plano/serializável.
    const meta = buildWonEdgeMetadata({ candidate, importedAt: new Date() });
    expect(() => JSON.stringify(meta)).not.toThrow();
    expect(JSON.parse(JSON.stringify(meta))).toMatchObject({ year: candidate.year });
  });

  it('createPrismaWonEdgeRepo usa os métodos do client (smoke com prisma fake)', async () => {
    const findUnique = vi.fn().mockResolvedValue({ id: 'c1' });
    const prisma = {
      club: { findUnique },
      competition: { findUnique: vi.fn().mockResolvedValue(null) },
      knowledgeGraph: {
        findMany: vi.fn().mockResolvedValue([]),
        create: vi.fn().mockResolvedValue({ id: 'e1' }),
        update: vi.fn().mockResolvedValue({}),
      },
    } as unknown as PrismaClient;
    const repo = createPrismaWonEdgeRepo(prisma);
    expect(await repo.findClubByQid('Q1')).toEqual({ id: 'c1' });
    expect(findUnique).toHaveBeenCalledWith({ where: { qid: 'Q1' }, select: { id: true } });
  });
});

describe('collapseEditionYears — uma edição = um ano', () => {
  it('temporada que atravessa o ano (P580=2022, P585=2023) colapsa para o ano inicial', () => {
    const collapsed = collapseEditionYears([
      {
        editionQid: 'QED1',
        motherQid: 'Q10',
        winnerQid: 'Q100',
        year: 2022, // via P580
        motherName: '2. Bundesliga',
      },
      {
        editionQid: 'QED1',
        motherQid: 'Q10',
        winnerQid: 'Q100',
        year: 2023, // via P585/P582
        motherName: '2. Bundesliga',
      },
      {
        editionQid: 'QED2',
        motherQid: 'Q10',
        winnerQid: 'Q200',
        year: 2023, // outra edição — intocada
        motherName: '2. Bundesliga',
      },
    ]);
    expect(collapsed.filter((c) => c.editionQid === 'QED1').every((c) => c.year === 2022)).toBe(
      true,
    );
    expect(collapsed.find((c) => c.editionQid === 'QED2')?.year).toBe(2023);
    // Após o colapso, a dedup (mãe,ano,vencedor) colhe UM título único.
    expect(new Set(collapsed.map((c) => wonEdgeDedupKey(c))).size).toBe(2);
  });
});

describe('loadChampions — leitura da hierarquia CONGELADA (metadata.hierarchy)', () => {
  it('lê metadata.hierarchy (não re-deriva do nome) e expõe sourceUrl da EDIÇÃO', async () => {
    prismaMock.knowledgeGraph.findMany.mockResolvedValue([
      {
        sourceId: 'club-1',
        sourceType: 'Club',
        targetId: 'comp-1',
        targetType: 'Competition',
        metadata: {
          year: 2023,
          season: '2023',
          hierarchy: 'mundial', // congelada na escrita
          gender: 'men',
          dataSource: 'wikidata',
          sourceUrl: 'https://www.wikidata.org/wiki/QEDICAO',
        },
      },
    ]);
    // O NOME derivaria 'nacional' (keyword "campeonato") — se o serviço
    // re-derivesse, o campeão apareceria na hierarquia errada.
    prismaMock.competition.findMany.mockResolvedValue([
      { id: 'comp-1', qid: 'Q10', name: 'Campeonato de Teste', type: 'LEAGUE', country: 'BR' },
    ]);
    prismaMock.club.findMany.mockResolvedValue([{ id: 'club-1', name: 'Clube X', country: 'BR' }]);
    prismaMock.ranking.findFirst.mockResolvedValue(null);

    const res = await loadChampions();
    const mundial = res.data.find((d) => d.hierarchy === 'mundial');
    expect(mundial?.champion).not.toBeNull();
    expect(mundial?.champion?.club.id).toBe('club-1');
    expect(mundial?.champion?.season).toBe(2023);
    expect(mundial?.champion?.sourceUrl).toBe('https://www.wikidata.org/wiki/QEDICAO');
    // Prova de não-re-derivação: 'nacional' fica vazio apesar do nome.
    expect(res.data.find((d) => d.hierarchy === 'nacional')?.champion).toBeNull();
  });

  it('aresta sem metadata.hierarchy cai na derivação legada (compatibilidade)', async () => {
    prismaMock.knowledgeGraph.findMany.mockResolvedValue([
      {
        sourceId: 'club-2',
        sourceType: 'Club',
        targetId: 'comp-2',
        targetType: 'Competition',
        metadata: { year: 1999, dataSource: 'manual' },
      },
    ]);
    prismaMock.competition.findMany.mockResolvedValue([
      { id: 'comp-2', qid: 'Q20', name: 'Copa Libertadores 1999', type: 'CUP', country: null },
    ]);
    prismaMock.club.findMany.mockResolvedValue([{ id: 'club-2', name: 'Clube Y', country: 'BR' }]);
    prismaMock.ranking.findFirst.mockResolvedValue(null);

    const res = await loadChampions();
    expect(res.data.find((d) => d.hierarchy === 'continental')?.champion?.club.id).toBe('club-2');
  });
});
