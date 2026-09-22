/**
 * T448c — Unit: critério determinístico de representação do carrossel.
 *
 * Restrições do dispatch, cada uma com teste:
 *  - sem desempate por gênero (seleção nunca lê gender; filtro é parâmetro);
 *  - sem dependência da ordem implícita do findMany (entrada embaralhada
 *    produz resultado idêntico);
 *  - auditável (editions/champions/latestYear expostos no representante).
 *
 * Ordem do comparador validada contra o dado de produção (ver
 * D-2026-09-22-t448c-criterio-tiebreak): vigência → edições → campeões
 * distintos → nome → id. Proxies alternativos foram reprovados em produção
 * ("mais edições" → Campeonato Paulista; "mais campeões distintos" → Serie B).
 */
import { describe, it, expect, vi } from 'vitest';
import {
  compareRepresentatives,
  selectRepresentatives,
  typeRank,
  type CompRefInput,
  type Representative,
  type WonEdgeInput,
} from '../../../src/modules/champions/champions.service.js';
import type { RankHierarchy } from '../../../src/modules/rankings/ranking-algorithm.service.js';

// O módulo do serviço instancia o PrismaClient no import — mockado (o teste
// só exerce as funções PURAS de seleção; sem banco).
vi.mock('../../../src/config/prisma.js', () => ({ prisma: {} }));

let seq = 0;
function edge(opts: {
  compId: string;
  clubId?: string;
  year: number;
  hierarchy?: RankHierarchy;
  gender?: 'men' | 'women';
  sourceUrl?: string;
}): WonEdgeInput {
  seq += 1;
  return {
    sourceId: opts.clubId ?? `club-${seq}`,
    sourceType: 'Club',
    targetId: opts.compId,
    targetType: 'Competition',
    metadata: {
      year: opts.year,
      ...(opts.hierarchy ? { hierarchy: opts.hierarchy } : {}),
      ...(opts.gender ? { gender: opts.gender } : {}),
      ...(opts.sourceUrl ? { sourceUrl: opts.sourceUrl } : {}),
    },
  };
}

function comp(id: string, name: string, type = 'LEAGUE'): CompRefInput {
  return { id, qid: null, name, type, country: null };
}

const edgesOf = (...es: WonEdgeInput[]) => es;

describe('T448c — selectRepresentatives (critério vigência → edições → campeões → nome → id)', () => {
  it('vigência primeiro: liga com ano mais recente vence mesmo com MENOS edições', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'liga-secundaria', year: 2025, hierarchy: 'nacional' }), // "Elitettan"
        edge({ compId: 'liga-principal', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'liga-principal', year: 2024, hierarchy: 'nacional' }),
      ),
      [comp('liga-principal', 'Allsvenskan'), comp('liga-secundaria', 'Elitettan')],
    );
    const nacional = reps.get('nacional')!;
    expect(nacional.compId).toBe('liga-principal');
    expect(nacional.editions).toBe(2);
    expect(nacional.champion.year).toBe(2025);
  });

  it('empate de ano: mais edições (longevidade) desempata — caso real do piloto', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'elitettan', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'premier-league', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'premier-league', year: 2024, hierarchy: 'nacional' }),
        edge({ compId: 'premier-league', year: 2023, hierarchy: 'nacional' }),
      ),
      [comp('premier-league', 'Premier League'), comp('elitettan', 'Elitettan')],
    );
    expect(reps.get('nacional')!.compId).toBe('premier-league');
    expect(reps.get('nacional')!.editions).toBe(3);
  });

  it('quedas de empate residuais: campeões distintos → nome → id (ordem total)', () => {
    const base = { year: 2020, hierarchy: 'nacional' as RankHierarchy };
    const byChampions = selectRepresentatives(
      edgesOf(
        edge({ compId: 'a', ...base }),
        edge({ compId: 'a', year: 2019, hierarchy: 'nacional' }),
        edge({ compId: 'b', ...base }),
        edge({ compId: 'b', year: 2019, hierarchy: 'nacional' }),
      ),
      [comp('a', 'Liga A'), comp('b', 'Liga B')],
    );
    expect(byChampions.get('nacional')!.compId).toBe('a'); // 2 campeões > 1

    const byName = selectRepresentatives(
      edgesOf(edge({ compId: 'z', ...base }), edge({ compId: 'a', ...base })),
      [comp('z', 'Zulu Liga'), comp('a', 'Alpha Liga')],
    );
    expect(byName.get('nacional')!.compName).toBe('Alpha Liga'); // nome asc

    const byId = selectRepresentatives(
      edgesOf(edge({ compId: 'q2', ...base }), edge({ compId: 'q1', ...base })),
      [comp('q2', null), comp('q1', null)], // sem nomes → id fecha a ordem
    );
    expect(byId.get('nacional')!.compId).toBe('q1');
  });

  it('DETERMINISMO: entradas em ordens diferentes produzem o MESMO representante (anti-findMany)', () => {
    const liga = () => [
      edge({ compId: 'liga-a', year: 2022, hierarchy: 'mundial' }),
      edge({ compId: 'liga-b', year: 2025, hierarchy: 'mundial' }),
      edge({ compId: 'liga-c', year: 2025, hierarchy: 'mundial' }),
      edge({ compId: 'liga-c', year: 2024, hierarchy: 'mundial' }),
    ];
    const comps = [comp('liga-a', 'Liga A'), comp('liga-b', 'Liga B'), comp('liga-c', 'Liga C')];
    const r1 = selectRepresentatives(liga(), comps);
    const r2 = selectRepresentatives([...liga()].reverse(), comps);
    const r3 = selectRepresentatives([liga()[3], liga()[0], liga()[2], liga()[1]], comps);
    const pick = (m: ReturnType<typeof selectRepresentatives>) => m.get('mundial')!.compId;
    expect(pick(r1)).toBe(pick(r2));
    expect(pick(r2)).toBe(pick(r3));
    // E o vencedor segue o comparador: empate em 2025, liga-c vence por edições (2 > 1).
    expect(pick(r1)).toBe('liga-c');
  });

  it('GÊNERO-CEGO: seleção nunca usa gender — mulher com mais edições no ano vigente vence, e homem não tem privilégio', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'fem-principal', year: 2025, gender: 'women', hierarchy: 'nacional' }),
        edge({ compId: 'fem-principal', year: 2024, gender: 'women', hierarchy: 'nacional' }),
        edge({ compId: 'masc-secundaria', year: 2025, gender: 'men', hierarchy: 'nacional' }),
      ),
      [comp('fem-principal', 'Liga Feminina'), comp('masc-secundaria', 'Liga Masculina B')],
    );
    expect(reps.get('nacional')!.compId).toBe('fem-principal'); // 2 edições > 1

    const reps2 = selectRepresentatives(
      edgesOf(
        edge({ compId: 'fem-secundaria', year: 2025, gender: 'women', hierarchy: 'nacional' }),
        edge({ compId: 'masc-principal', year: 2025, gender: 'men', hierarchy: 'nacional' }),
        edge({ compId: 'masc-principal', year: 2024, gender: 'men', hierarchy: 'nacional' }),
      ),
      [comp('fem-secundaria', 'Liga Feminina B'), comp('masc-principal', 'Liga Masculina')],
    );
    expect(reps2.get('nacional')!.compId).toBe('masc-principal'); // 2 edições > 1
  });

  it('filtro gender=women aplica a MESMA regra sobre o conjunto feminino', () => {
    const edges = edgesOf(
      edge({ compId: 'fem-liga', year: 2024, gender: 'women', hierarchy: 'nacional' }),
      edge({ compId: 'masc-liga', year: 2026, gender: 'men', hierarchy: 'nacional' }),
    );
    const comps = [comp('fem-liga', 'Liga Fem'), comp('masc-liga', 'Liga Masc')];
    const women = selectRepresentatives(edges, comps, 'women');
    expect(women.get('nacional')!.compId).toBe('fem-liga');
    expect(women.get('nacional')!.champion.gender).toBe('women');

    const none = selectRepresentatives(
      edgesOf(edge({ compId: 'masc-liga', year: 2026, gender: 'men', hierarchy: 'nacional' })),
      comps,
      'women',
    );
    expect(none.size).toBe(0);
  });

  it('campeão dentro da competição: ano desc → clubId asc (total, sem ordem de banco)', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'c1', year: 2025, clubId: 'club-z', hierarchy: 'mundial' }),
        edge({ compId: 'c1', year: 2025, clubId: 'club-a', hierarchy: 'mundial' }),
        edge({ compId: 'c1', year: 2024, clubId: 'club-m', hierarchy: 'mundial' }),
      ),
      [comp('c1', 'Copa Mundo')],
    );
    expect(reps.get('mundial')!.champion.clubId).toBe('club-a');
  });

  it('hierarquia congelada vence a derivação; arestas não Club→Competition são ignoradas', () => {
    const reps = selectRepresentatives(
      edgesOf(edge({ compId: 'copa', year: 2025, hierarchy: 'mundial' }), {
        sourceId: 'x',
        sourceType: 'Player',
        targetId: 'y',
        targetType: 'Club',
        metadata: {},
      }),
      [comp('copa', 'Mundial de Clubes')],
    );
    expect(reps.get('mundial')).toBeTruthy();
    expect(reps.size).toBe(1);
  });
});

describe('T448d — guarda de vigência (edição futura não existe para o carrossel)', () => {
  it('competição cuja ÚNICA edição é futura não vira representante', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'copa-futura', year: 2027, hierarchy: 'mundial' }),
        edge({ compId: 'liga-real', year: 2026, hierarchy: 'mundial' }),
      ),
      [comp('copa-futura', 'Copa Pré-Atribuída'), comp('liga-real', 'Liga Real')],
      undefined,
      2026, // currentYear (UTC) injetado — sem relógio no teste
    );
    expect(reps.get('mundial')!.compId).toBe('liga-real');
    expect(reps.get('mundial')!.editions).toBe(1); // a futura não conta
  });

  it('liga do ano corrente vence supercopa com edição futura (caso Cruijff, generalizado)', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'supercopa', year: 2027, hierarchy: 'nacional' }),
        edge({ compId: 'supercopa', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'liga', year: 2026, hierarchy: 'nacional' }),
        edge({ compId: 'liga', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'liga', year: 2024, hierarchy: 'nacional' }),
      ),
      [comp('supercopa', 'Supercopa Real'), comp('liga', 'Liga Real')],
      undefined,
      2026,
    );
    expect(reps.get('nacional')!.compId).toBe('liga'); // 2026 vigente > 2025; a 2027 não existe
    expect(reps.get('nacional')!.latestYear).toBe(2026);
  });

  it('edição futura não infla o contador de edições (auditoria honesta)', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'liga', year: 2026, hierarchy: 'nacional' }),
        edge({ compId: 'liga', year: 2026, hierarchy: 'nacional' }),
        edge({ compId: 'liga', year: 2027, hierarchy: 'nacional' }), // pré-atribuída
      ),
      [comp('liga', 'Liga Real')],
      undefined,
      2026,
    );
    expect(reps.get('nacional')!.editions).toBe(2);
  });

  it('determinismo se mantém com arestas futuras na entrada (shuffle → mesmo resultado)', () => {
    const build = () => [
      edge({ compId: 'b', year: 2027, hierarchy: 'nacional' }),
      edge({ compId: 'b', year: 2025, hierarchy: 'nacional' }),
      edge({ compId: 'a', year: 2026, hierarchy: 'nacional' }),
      edge({ compId: 'a', year: 2026, hierarchy: 'nacional' }),
    ];
    const comps = [comp('a', 'Liga A'), comp('b', 'Liga B')];
    const r1 = selectRepresentatives(build(), comps, undefined, 2026);
    const r2 = selectRepresentatives([...build()].reverse(), comps, undefined, 2026);
    expect(r1.get('nacional')!.compId).toBe(r2.get('nacional')!.compId);
    expect(r1.get('nacional')!.compId).toBe('a'); // 2026 vigente > 2025; a 2027 não conta
  });
});

describe('T448e — tipo antes de vigência: LEAGUE representa o país, CUP não', () => {
  it('caso Holanda: Eredivisie (LEAGUE, 2025) vence Cruijff Shield (CUP, 2026)', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'cruijff', year: 2026, hierarchy: 'nacional' }),
        edge({ compId: 'eredivisie', year: 2025, hierarchy: 'nacional' }),
        edge({ compId: 'eredivisie', year: 2024, hierarchy: 'nacional' }),
      ),
      [comp('eredivisie', 'Eredivisie', 'LEAGUE'), comp('cruijff', 'Johan Cruijff Shield', 'CUP')],
    );
    const nacional = reps.get('nacional')!;
    expect(nacional.compId).toBe('eredivisie');
    expect(nacional.compType).toBe('LEAGUE');
    expect(nacional.champion.year).toBe(2025);
  });

  it('hierarquia só com CUP: a CUP representa (preferir LEAGUE se houver, não excluir CUP)', () => {
    const reps = selectRepresentatives(
      edgesOf(edge({ compId: 'copa-isolada', year: 2015, hierarchy: 'mundial' })),
      [comp('copa-isolada', 'Copa Isolada', 'CUP')],
    );
    expect(reps.get('mundial')!.compId).toBe('copa-isolada');
    expect(reps.get('mundial')!.compType).toBe('CUP');
  });

  it('NUANCE documentada: LEAGUE antiga (2020) representa antes de CUP recente (2026) — tipo vem antes de ano', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'liga-antiga', year: 2020, hierarchy: 'nacional' }),
        edge({ compId: 'supercopa-recente', year: 2026, hierarchy: 'nacional' }),
      ),
      [comp('liga-antiga', 'Liga Antiga', 'LEAGUE'), comp('supercopa-recente', 'Supercopa 2026', 'CUP')],
    );
    expect(reps.get('nacional')!.compId).toBe('liga-antiga');
  });

  it('gender-blind sob a nova ordem: LEAGUE feminina vence CUP masculina', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'fem-liga', year: 2025, gender: 'women', hierarchy: 'nacional' }),
        edge({ compId: 'masc-copa', year: 2026, gender: 'men', hierarchy: 'nacional' }),
      ),
      [comp('fem-liga', 'Liga Fem', 'LEAGUE'), comp('masc-copa', 'Cupa Masc', 'CUP')],
    );
    expect(reps.get('nacional')!.compId).toBe('fem-liga');
  });

  it('anti-findMany mantido: entrada embaralhada LEAGUE+CUP → mesmo resultado', () => {
    const build = () => [
      edge({ compId: 'cruijff', year: 2026, hierarchy: 'nacional' }),
      edge({ compId: 'eredivisie', year: 2025, hierarchy: 'nacional' }),
      edge({ compId: 'eredivisie', year: 2024, hierarchy: 'nacional' }),
    ];
    const comps = [comp('eredivisie', 'Eredivisie', 'LEAGUE'), comp('cruijff', 'Cruijff', 'CUP')];
    const r1 = selectRepresentatives(build(), comps);
    const r2 = selectRepresentatives([...build()].reverse(), comps);
    expect(r1.get('nacional')!.compId).toBe(r2.get('nacional')!.compId);
    expect(r1.get('nacional')!.compId).toBe('eredivisie');
  });

  it('guarda de futuro T448d INTACTA: CUP 2027 não vence LEAGUE 2025', () => {
    const reps = selectRepresentatives(
      edgesOf(
        edge({ compId: 'copa-2027', year: 2027, hierarchy: 'mundial' }),
        edge({ compId: 'liga-2025', year: 2025, hierarchy: 'mundial' }),
      ),
      [comp('copa-2027', 'Copa Futura', 'CUP'), comp('liga-2025', 'Liga 2025', 'LEAGUE')],
      undefined,
      2026,
    );
    // A CUP 2027 é excluída pela guarda; a LEAGUE 2025 representa (única elegível).
    expect(reps.get('mundial')!.compId).toBe('liga-2025');
  });

  it('typeRank: LEAGUE 0 < CUP 1 < outros/NULL 2 (regressão do backfill)', () => {
    expect(typeRank('LEAGUE')).toBe(0);
    expect(typeRank('CUP')).toBe(1);
    expect(typeRank('TOURNAMENT')).toBe(2);
    expect(typeRank(null)).toBe(2);
    expect(typeRank(undefined)).toBe(2);
  });
});

describe('T448c — compareRepresentatives (reprovações registradas no DECISOES)', () => {
  it('"mais edições" como critério PRIMÁRIO elegeria Campeonato Paulista (estadual, 2020) — reprovado', () => {
    const paulistao: Representative = rep('paulistao', 'Campeonato Paulista', 102, 9, 2020);
    const ligue1: Representative = rep('ligue1', 'Ligue 1', 75, 14, 2025);
    // No critério adotado, vigência vence longevidade.
    expect(compareRepresentatives(ligue1, paulistao) < 0).toBe(true);
  });

  it('"mais campeões distintos" como critério PRIMÁRIO elegeria Serie B (paridade de acesso) — reprovado', () => {
    const serieB: Representative = rep('serie-b', 'Serie B', 74, 38, 2019);
    const ligue1: Representative = rep('ligue1', 'Ligue 1', 75, 14, 2025);
    expect(compareRepresentatives(ligue1, serieB) < 0).toBe(true);
  });
});

function rep(
  compId: string,
  compName: string,
  editions: number,
  distinctChampions: number,
  latestYear: number,
): Representative {
  return {
    hierarchy: 'nacional',
    compId,
    compName,
    editions,
    distinctChampions,
    latestYear,
    champion: { clubId: `${compId}-club`, year: latestYear, gender: 'men', sourceUrl: null },
  };
}
