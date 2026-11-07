/**
 * T-24/28 — derivação de standings a partir das partidas (`modules/bots/standings-derive.ts`).
 *
 * Três riscos que o teste trava:
 *   1. Agregação errada em silêncio (pontos, saldo, desempate) — número que ninguém confere.
 *   2. Derivar onde o formato NÃO permite (copa sem grupos = mentira estatística).
 *   3. Escrever por cima de standings existentes (zero-overwrite).
 */
import { describe, expect, it } from 'vitest';
import {
  aggregateStandings,
  checkPlausibility,
  deriveStandingsBatch,
  deriveStandingsForEdition,
  hasNoStandings,
  selectEditionMatches,
  splitByGroups,
  windowFromLabel,
  type ClubNameMap,
  type DeriveMatch,
} from '../../src/modules/bots/standings-derive.js';

const mapaABCD = { A: 'club-a', B: 'club-b', C: 'club-c', D: 'club-d' } as const;
const mapaEFGH = { A: 'club-e', B: 'club-f', C: 'club-g', D: 'club-h' } as const;
const nomes: ClubNameMap = new Map([
  ['club-a', 'América'],
  ['club-b', 'Belenenses'],
  ['club-c', 'Cruzeiro'],
  ['club-d', 'Dorense'],
  ['club-e', 'Estrela'],
  ['club-f', 'Ferroviária'],
  ['club-g', 'Guarani'],
  ['club-h', 'Horizonte'],
]);

let seq = 0;
const partida = (
  casa: string,
  fora: string,
  hg: number | null,
  ag: number | null,
  extra: Partial<DeriveMatch> = {},
): DeriveMatch => ({
  round: String(++seq),
  date: new Date('2023-08-01'),
  seasonName: '2023',
  homeClubId: casa,
  awayClubId: fora,
  homeScore: hg,
  awayScore: ag,
  status: 'FINISHED',
  ...extra,
});

type Placar = [keyof typeof mapaABCD, keyof typeof mapaABCD, number, number];

/** Turno e returno entre 4 clubes (12 partidas, 6 jogos por clube). */
const PLACARES_12: Placar[] = [
  ['A', 'B', 2, 0],
  ['A', 'C', 1, 1],
  ['A', 'D', 3, 1],
  ['B', 'A', 1, 2],
  ['B', 'C', 2, 2],
  ['B', 'D', 0, 1],
  ['C', 'A', 0, 0],
  ['C', 'B', 3, 1],
  ['C', 'D', 1, 0],
  ['D', 'A', 2, 2],
  ['D', 'B', 1, 1],
  ['D', 'C', 0, 2],
];

const rodadaEntre = (
  mapa: typeof mapaABCD | typeof mapaEFGH,
  placares: readonly Placar[],
  extra: Partial<DeriveMatch> = {},
): DeriveMatch[] => placares.map(([c, f, hg, ag]) => partida(mapa[c], mapa[f], hg, ag, extra));

const FULL_LIGA = rodadaEntre(mapaABCD, PLACARES_12);

describe('aggregateStandings', () => {
  it('agrega vitória/empate/derrota, GF, GA e pontos (3 por vitória) corretamente', () => {
    const tabela = aggregateStandings(FULL_LIGA, nomes);
    const porClube = new Map(tabela.map((r) => [r.clubId, r]));

    // América: 3V 3E 0D, GF 10 GA 5 → 12 pts (1º por saldo sobre o Cruzeiro)
    expect(porClube.get('club-a')).toMatchObject({
      played: 6,
      won: 3,
      drawn: 3,
      lost: 0,
      goalsFor: 10,
      goalsAgainst: 5,
      points: 12,
    });
    // Cruzeiro: 3V 3E 0D, GF 7 GA 6 → 12 pts
    expect(porClube.get('club-c')).toMatchObject({
      played: 6,
      won: 3,
      drawn: 3,
      lost: 0,
      points: 12,
    });
    // Dorense: 1V 2E 3D, GF 5 GA 9 → 5 pts
    expect(porClube.get('club-d')).toMatchObject({
      played: 6,
      won: 1,
      drawn: 2,
      lost: 3,
      points: 5,
    });
    // Belenenses: 0V 2E 4D, GF 5 GA 11 → 2 pts
    expect(porClube.get('club-b')).toMatchObject({
      played: 6,
      won: 0,
      drawn: 2,
      lost: 4,
      points: 2,
    });
  });

  it('desempata por pts → saldo → gols pró → nome do clube', () => {
    // Contabilidade verificada à mão:
    //   B: 3V, GF 8 GA 3, saldo +5, 9 pts
    //   C: 1V 2D, GF 6 GA 7, saldo −1, 3 pts
    //   A: 1V 2D, GF 5 GA 7, saldo −2, 3 pts · D: 1V 2D, GF 5 GA 7, saldo −2, 3 pts
    //   A e D empatam em tudo → NOME decide (América < Dorense).
    const partidas = [
      partida('club-a', 'club-c', 3, 2),
      partida('club-b', 'club-d', 3, 1),
      partida('club-a', 'club-b', 2, 3),
      partida('club-c', 'club-d', 4, 3),
      partida('club-b', 'club-a', 2, 0),
      partida('club-d', 'club-c', 1, 0),
    ];
    const tabela = aggregateStandings(partidas, nomes);
    expect(tabela.map((r) => r.clubId)).toEqual(['club-b', 'club-c', 'club-a', 'club-d']);
    expect(tabela.map((r) => r.position)).toEqual([1, 2, 3, 4]);
  });

  it('gols pró vence empate de pts+saldo mesmo contra ordem alfabética', () => {
    // América: 2V 1E, GF 9 GA 3, saldo +6, 7 pts
    // Cruzeiro: 2V 1E, GF 10 GA 4, saldo +6, 7 pts → mais GF, vem ANTES (apesar do nome).
    const partidas = [
      partida('club-a', 'club-b', 3, 0),
      partida('club-b', 'club-a', 1, 4),
      partida('club-c', 'club-d', 5, 1),
      partida('club-d', 'club-c', 2, 4),
      partida('club-c', 'club-b', 1, 1),
      partida('club-a', 'club-d', 2, 2),
    ];
    const tabela = aggregateStandings(partidas, nomes);
    // B: 1V 1E, GF 2 GA 8, saldo −6, 1 pt · D: 1V 1E, GF 5 GA 11, saldo −6, 1 pt
    // → GF de Dorense (5) vence Belenenses (2).
    expect(tabela.map((r) => r.clubId)).toEqual(['club-c', 'club-a', 'club-d', 'club-b']);
  });

  it('empate total (pts, saldo, GF) → nome real do acervo decide', () => {
    const partidas = [partida('club-a', 'club-b', 1, 0), partida('club-b', 'club-a', 0, 1)];
    const tabela = aggregateStandings(partidas, nomes);
    // Ambos 1V 1D, GF 1 GA 1, saldo 0 → "América" < "Belenenses".
    expect(tabela.map((r) => r.clubName)).toEqual(['América', 'Belenenses']);
  });

  it('partida sem placar (null) não entra em nenhum agregado', () => {
    const partidas = [partida('club-a', 'club-b', 1, 0), partida('club-c', 'club-d', null, null)];
    const tabela = aggregateStandings(partidas, nomes);
    // Clube só entra na tabela se tiver ao menos UMA partida com placar —
    // C e D não são criados com played=0 fantasma.
    expect(tabela.map((r) => r.clubId)).toEqual(['club-a', 'club-b']);
  });
});

describe('hasNoStandings (zero-overwrite)', () => {
  it('NULL, undefined e array vazio são graváveis; array com linhas e objeto NÃO', () => {
    expect(hasNoStandings(null)).toBe(true);
    expect(hasNoStandings(undefined)).toBe(true);
    expect(hasNoStandings([])).toBe(true);
    expect(hasNoStandings([{ position: 1 }])).toBe(false);
    expect(hasNoStandings({ rows: [] })).toBe(false);
  });
});

describe('windowFromLabel', () => {
  it('ano simples, faixa cruzando ano e label sem ano', () => {
    expect(windowFromLabel('2023')).toEqual([2023, 2023]);
    expect(windowFromLabel('2023-24')).toEqual([2023, 2024]);
    expect(windowFromLabel('2020-2021')).toEqual([2020, 2021]);
    expect(windowFromLabel('2021 Aper')).toEqual([2021, 2021]);
    expect(windowFromLabel('sem ano')).toBeNull();
  });
});

describe('selectEditionMatches', () => {
  it('prefere vínculo exato de season-name; sem vínculo usa janela de ano excluindo outras edições', () => {
    const matches = [
      partida('club-a', 'club-b', 1, 0, { seasonName: '2023' }),
      partida('club-a', 'club-c', 1, 0, { seasonName: '2024' }),
      partida('club-a', 'club-d', 2, 1, { seasonName: null }),
    ];
    const porNome = selectEditionMatches('2023', new Set(['2024']), matches);
    expect(porNome.linkage).toBe('season-name');
    expect(porNome.matches).toHaveLength(1);

    // Label "2023-24" sem season-name correspondente → janela [2023,2024]; a partida
    // nomeada "2024" pertence a OUTRA edição da mesma competição e é excluída.
    const porAno = selectEditionMatches('2023-24', new Set(['2024']), matches);
    expect(porAno.linkage).toBe('year-window');
    expect(porAno.matches).toHaveLength(2);

    const semAno = selectEditionMatches('edicao-sem-numero', new Set(), matches);
    expect(semAno).toEqual({ linkage: 'none', matches: [] });
  });
});

describe('deriveStandingsForEdition', () => {
  it('liga com jogos suficientes → deriva tabela única com proveniência por linha', () => {
    const d = deriveStandingsForEdition({
      competitionType: 'LEAGUE',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: FULL_LIGA,
      clubNames: nomes,
      derivedAt: new Date('2026-11-07T00:00:00Z'),
    });
    if (d.status !== 'derived') throw new Error(`esperado derived, veio ${d.status}`);
    expect(d.rows).toHaveLength(4);
    expect(d.matchesConsidered).toBe(12);
    expect(d.groups).toBeNull();
    const primeiro = d.rows[0];
    expect(primeiro.clubId).toBe('club-a');
    expect(primeiro.matchedName).toBe(primeiro.clubName);
    expect(primeiro.provenance).toEqual({
      source: 'matches-derived',
      matchesConsidered: 12,
      derivedAt: '2026-11-07T00:00:00.000Z',
      note: expect.any(String),
    });
  });

  it('recorte incompleto (uns com 8 jogos, outros com 3) → skip declarado com contagens', () => {
    const incompleto = [
      ...FULL_LIGA, // A–D com 6 jogos cada
      partida('club-a', 'club-b', 1, 0), // A e B vão a 7/8
      partida('club-a', 'club-c', 1, 0),
      partida('club-c', 'club-d', 1, 0),
      // E–H com 3 jogos cada (rodada única)
      ...rodadaEntre(mapaEFGH, [
        ['A', 'B', 1, 0],
        ['A', 'C', 2, 0],
        ['A', 'D', 1, 1],
        ['B', 'C', 1, 1],
        ['B', 'D', 2, 1],
        ['C', 'D', 1, 0],
      ]),
    ];
    const d = deriveStandingsForEdition({
      competitionType: 'LEAGUE',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: incompleto,
      clubNames: nomes,
      derivedAt: new Date(),
    });
    expect(d).toMatchObject({ status: 'skip', reason: 'recorte-incompleto' });
    if (d.status !== 'skip') return;
    expect(d.detail.maxPlayed).toBe(8);
    expect(d.detail.minPlayed).toBe(3);
  });

  it('poucos jogos por clube → skip clubes-ou-jogos-insuficientes', () => {
    const d = deriveStandingsForEdition({
      competitionType: 'LEAGUE',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: FULL_LIGA.slice(0, 3), // 1 rodada: cada clube com 1–3 jogos
      clubNames: nomes,
      derivedAt: new Date(),
    });
    expect(d).toMatchObject({ status: 'skip', reason: 'clubes-ou-jogos-insuficientes' });
  });

  it('copa sem fase de grupos identificável → skip (não inventa tabela de mata-mata)', () => {
    const mataMata = rodadaEntre(
      mapaABCD,
      [
        ['A', 'B', 2, 0],
        ['B', 'A', 1, 2],
        ['C', 'D', 1, 1],
        ['D', 'C', 0, 1],
      ],
      { round: 'semifinal' },
    );
    const d = deriveStandingsForEdition({
      competitionType: 'CUP',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: mataMata,
      clubNames: nomes,
      derivedAt: new Date(),
    });
    expect(d).toMatchObject({ status: 'skip', reason: 'copa-sem-grupos-identificaveis' });
  });

  it('copa com grupos identificáveis pela rodada → deriva tabela POR GRUPO com campo group', () => {
    const grupoA = rodadaEntre(mapaABCD, PLACARES_12, { round: 'Group A' });
    const grupoB = rodadaEntre(mapaEFGH, PLACARES_12, { round: 'Grupo B' });
    const knockout = partida('club-a', 'club-e', 2, 1, { round: 'final' });
    const d = deriveStandingsForEdition({
      competitionType: 'CUP',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: [...grupoA, ...grupoB, knockout],
      clubNames: nomes,
      derivedAt: new Date(),
    });
    if (d.status !== 'derived') throw new Error(`esperado derived, veio ${d.status}`);
    expect(d.groups).toEqual(['A', 'B']);
    expect(new Set(d.rows.map((r) => r.group))).toEqual(new Set(['A', 'B']));
    // 24 partidas em grupos + 1 final (com placar): 24/25 ≥ 60% → deriva.
    expect(d.matchesConsidered).toBe(24);
    const primeiroA = d.rows.find((r) => r.group === 'A' && r.position === 1);
    expect(primeiroA?.clubId).toBe('club-a');
    expect(primeiroA?.provenance.source).toBe('matches-derived');
    expect(primeiroA?.provenance.matchesConsidered).toBe(12);
  });

  it('tipo de competição desconhecido → skip honesto', () => {
    const d = deriveStandingsForEdition({
      competitionType: null,
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: FULL_LIGA,
      clubNames: nomes,
      derivedAt: new Date(),
    });
    expect(d).toMatchObject({ status: 'skip', reason: 'tipo-competicao-desconhecido' });
  });

  it('label sem ano e sem vínculo com as partidas → skip label-sem-ano', () => {
    const d = deriveStandingsForEdition({
      competitionType: 'LEAGUE',
      seasonLabel: 'edicao estranha',
      otherLabels: new Set(),
      matches: FULL_LIGA,
      clubNames: nomes,
      derivedAt: new Date(),
    });
    expect(d).toMatchObject({ status: 'skip', reason: 'label-sem-ano' });
  });

  it('partidas de status diferente de FINISHED não entram', () => {
    // Mantém FINISHED exatamente as 6 partidas em que cada clube fica com 3 jogos.
    const indices = new Set([0, 1, 2, 5, 7, 11]);
    const d = deriveStandingsForEdition({
      competitionType: 'LEAGUE',
      seasonLabel: '2023',
      otherLabels: new Set(),
      matches: FULL_LIGA.map((m, i) =>
        indices.has(i) ? m : { ...m, status: 'SCHEDULED' as const },
      ),
      clubNames: nomes,
      derivedAt: new Date(),
    });
    if (d.status !== 'derived') throw new Error(`esperado derived, veio ${d.status}`);
    expect(d.matchesConsidered).toBe(6);
    expect(d.rows.every((r) => r.played === 3)).toBe(true);
  });
});

describe('splitByGroups / checkPlausibility (unidade)', () => {
  it('detecta "Group A"/"Grupo B" com chave canônica maiúscula', () => {
    const { groups } = splitByGroups([
      partida('club-a', 'club-b', 1, 0, { round: 'Group A' }),
      partida('club-a', 'club-b', 1, 0, { round: 'group a' }),
      partida('club-a', 'club-b', 1, 0, { round: 'Grupo B' }),
      partida('club-a', 'club-b', 1, 0, { round: 'semifinal' }),
    ]);
    expect(groups.get('A')).toHaveLength(2);
    expect(groups.get('B')).toHaveLength(1);
  });

  it('checkPlausibility: 4+ clubes, ≥3 jogos e razão ≤ 2×', () => {
    expect(checkPlausibility([{ played: 6 }, { played: 6 }, { played: 6 }, { played: 6 }]).ok).toBe(
      true,
    );
    expect(checkPlausibility([{ played: 6 }, { played: 6 }, { played: 6 }]).ok).toBe(false);
    expect(
      checkPlausibility([{ played: 30 }, { played: 4 }, { played: 30 }, { played: 4 }]).ok,
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Lote (prisma falso — sem banco)
// ---------------------------------------------------------------------------
function prismaFalso(
  edicoes: Array<{
    id: string;
    competitionId: string;
    season: string;
    type: string | null;
    standings: unknown;
  }>,
  matches: DeriveMatch[],
) {
  const estados = new Map<string, { standings: unknown }>(
    edicoes.map((e) => [e.id, { standings: e.standings }]),
  );
  let overwriteExterno = false;
  return {
    setOverwriteExterno(v: boolean) {
      overwriteExterno = v;
    },
    estados,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $queryRaw: async (_sql: any) =>
      // Emula o WHERE do lote: só edições com standings vazio entram na fila.
      edicoes
        .filter((e) => hasNoStandings(e.standings))
        .map((e) => ({
          id: e.id,
          competitionId: e.competitionId,
          season: e.season,
          competitionType: e.type,
        })),
    match: {
      findMany: async () => matches,
    },
    club: {
      findMany: async ({ where }: { where: { id: { in: string[] } } }) =>
        where.id.in.map((id) => ({ id, name: nomes.get(id) ?? `Clube ${id}` })),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    $executeRaw: async (_sql: any, ...params: any[]) => {
      // Ordem dos placeholders no SQL: ${rows} no SET vem primeiro, ${id} no WHERE depois.
      const id = params[1] as string;
      const estado = estados.get(id);
      if (!estado) return 0;
      // Emula a condição WHERE: se outro processo preencheu, o UPDATE não alcança.
      if (overwriteExterno || !hasNoStandings(estado.standings)) return 0;
      estado.standings = [{ escrito: true }];
      return 1;
    },
  };
}

type FakePrisma = ReturnType<typeof prismaFalso>;
const asPrisma = (fake: FakePrisma) =>
  fake as unknown as Parameters<typeof deriveStandingsBatch>[0];

describe('deriveStandingsBatch (prisma falso)', () => {
  const edicoes = [
    { id: 'e1', competitionId: 'c1', season: '2023', type: 'LEAGUE', standings: null },
    {
      id: 'e2',
      competitionId: 'c1',
      season: '2022',
      type: 'LEAGUE',
      standings: [{ position: 1, clubName: 'x' }],
    },
    { id: 'e3', competitionId: 'c2', season: '2023', type: 'CUP', standings: null },
  ];

  it('deriva a liga, respeita zero-overwrite (e2) e declara os skips', async () => {
    const fake = prismaFalso(edicoes, FULL_LIGA);
    const out = await deriveStandingsBatch(asPrisma(fake), {
      now: new Date('2026-11-07T00:00:00Z'),
    });
    // e2 (standings preenchidos) nem entra na fila — só e1 e e3 são processados.
    expect(out.processed).toBe(2);
    expect(out.updated).toBe(1);
    expect(out.skipped).toBe(1);
    expect(out.errors).toBe(0);
    expect(fake.estados.get('e1')?.standings).toEqual([{ escrito: true }]);
    expect(fake.estados.get('e2')?.standings).toEqual([{ position: 1, clubName: 'x' }]);
    expect(out.message).toContain('matches-derived');
  });

  it('re-run = noop: edição preenchida sai da fila; corrida com outro processo vira skip', async () => {
    const preenchida = [
      {
        id: 'e1',
        competitionId: 'c1',
        season: '2023',
        type: 'LEAGUE',
        standings: [{ position: 1 }],
      },
    ];
    const fake1 = prismaFalso(preenchida, FULL_LIGA);
    const out1 = await deriveStandingsBatch(asPrisma(fake1), {});
    // Fila vazia: a edição preenchida não é selecionada pelo WHERE do lote.
    expect(out1.processed).toBe(0);
    expect(out1.message).toContain('nada a derivar');

    // Corrida: edição na fila, mas preenchida entre o SELECT e o UPDATE → noop.
    const corrida = prismaFalso(
      [{ id: 'e1', competitionId: 'c1', season: '2023', type: 'LEAGUE', standings: null }],
      FULL_LIGA,
    );
    corrida.setOverwriteExterno(true);
    const out2 = await deriveStandingsBatch(asPrisma(corrida), {});
    expect(out2.updated).toBe(0);
    expect(out2.skipped).toBe(1);
    expect(out2.message).toContain('standings-preenchido-em-corrida');
  });
});
