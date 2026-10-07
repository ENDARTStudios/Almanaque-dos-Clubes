/**
 * T450 Wave 3 — testes do connector puro wikipedia-women-br (fetch mockado).
 * Cobre: parsers (categorias, tabelas de temporada, predefinições, WDQS),
 * dedup por slug (sufixo feminino preservado), merge cross-source,
 * plano contra o acervo (zero overwrite + política de sufixo), proveniência
 * obrigatória e o guard de ToS (fonte descartada nunca é processada).
 */
import { describe, expect, it } from 'vitest';
import {
  W3_SEASON_PAGES,
  W3UnapprovedSourceError,
  assertSourceApproved,
  buildClubInputFromCategory,
  buildClubInputFromWikidata,
  clubSlug,
  filterApprovedSources,
  mergeW3Inputs,
  parseCategoryMembers,
  parseSeasonParticipants,
  parseTemplateBatch,
  parseWdqs,
  parseWktPoint,
  planW3Competitions,
  planW3Seed,
  resolveTemplateToArticle,
  seasonRowsToInputs,
  stateFromCategoryTitle,
  stripFeminineSuffix,
  type ExistingClubRow,
} from '../../../src/modules/etl/connectors/wikipedia-women-br.connector.js';

const categoryPayload = JSON.stringify({
  query: {
    categorymembers: [
      { pageid: 1, ns: 0, title: 'Associação Ferroviária de Esportes (futebol feminino)' },
      { pageid: 2, ns: 0, title: 'CEPE-Caxias' },
      { pageid: 3, ns: 14, title: 'Categoria:Clubes de futebol feminino do Ceará' },
      { pageid: 4, ns: 10, title: 'Predefinição:Futebol Ferroviária Feminino' },
    ],
  },
});

describe('T450 wave 3 — parser de categorias', () => {
  it('separa páginas ns=0 de subcategorias e ignora namespaces de manutenção', () => {
    const { pages, subcats } = parseCategoryMembers(categoryPayload);
    expect(pages).toHaveLength(2);
    expect(pages[0]!.title).toBe('Associação Ferroviária de Esportes (futebol feminino)');
    expect(subcats).toEqual(['Categoria:Clubes de futebol feminino do Ceará']);
  });

  it('payload vazio não explode', () => {
    const { pages, subcats } = parseCategoryMembers(JSON.stringify({ query: {} }));
    expect(pages).toEqual([]);
    expect(subcats).toEqual([]);
  });
});

describe('T450 wave 3 — UF por subcategoria', () => {
  it('resolve as subcategorias reais do levantamento', () => {
    expect(stateFromCategoryTitle('Clubes de futebol feminino do Ceará')).toBe('CE');
    expect(stateFromCategoryTitle('Clubes de futebol feminino do estado de São Paulo')).toBe('SP');
    expect(stateFromCategoryTitle('Clubes de futebol feminino de Mato Grosso do Sul')).toBe('MS');
    expect(stateFromCategoryTitle('Clubes de futebol feminino de Minas Gerais')).toBe('MG');
  });

  it('categoria sem estado → null (honesto)', () => {
    expect(stateFromCategoryTitle('Clubes de futebol feminino do Brasil')).toBeNull();
    expect(stateFromCategoryTitle('Botucatu Futebol Clube')).toBeNull();
  });
});

describe('T450 wave 3 — parser de tabelas de temporada', () => {
  const a1 = `
{| class="wikitable sortable"
!Equipe
!Cidade
!Estado
|-
| {{Futebol América-MG Feminino}} || [[Belo Horizonte]] || {{BR-MG}} || align="center" |9.º || Arena Frimisa
|-
|{{Futebol Botafogo Feminino}} || [[Rio de Janeiro]] || {{BR-RJ}} || align="center" |2.º
|}`;

  const a2 = `
{| class="wikitable"
!Equipe
!Estado
|-
| {{Futebol 3B da Amazônia}} || {{BR-AM}} || align="center"|15.º || [[Arena da Amazônia]]
|-
| {{Futebol Doce Mel}}/{{Futebol Jequié EC}} || {{BR-BA}} || align="center" |4.º || [[Estádio Waldomiro Borges|Waldomirão]]
|}`;

  it('A1: template + cidade + UF por linha', () => {
    const rows = parseSeasonParticipants(a1);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      templates: ['Futebol América-MG Feminino'],
      uf: 'MG',
      city: 'Belo Horizonte',
    });
    expect(rows[1]!.uf).toBe('RJ');
  });

  it('A2: template duplo vira dois clubes; estádio NÃO vira cidade', () => {
    const rows = parseSeasonParticipants(a2);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ templates: ['Futebol 3B da Amazônia'], uf: 'AM', city: null });
    expect(rows[1]!.templates).toEqual(['Futebol Doce Mel', 'Futebol Jequié EC']);
    expect(rows[1]!.city).toBeNull();
    expect(rows[1]!.uf).toBe('BA');
  });
});

describe('T450 wave 3 — resolução de predefinições', () => {
  it('primeiro link interno vira artigo; display vira shortName', () => {
    const res = resolveTemplateToArticle(
      '[[Associação Ferroviária de Esportes (futebol feminino)|Ferroviária]]<br>ver {{Futebol Ferroviária}}',
    );
    expect(res.target).toBe('Associação Ferroviária de Esportes (futebol feminino)');
    expect(res.display).toBe('Ferroviária');
  });

  it('interwiki/namespace são pulados; sem link → null (recusa honesta)', () => {
    expect(
      resolveTemplateToArticle('[[:en:Grêmio FBPA|Grêmio]] e [[:Categoria:X]]').target,
    ).toBeNull();
    expect(resolveTemplateToArticle('sem links aqui').target).toBeNull();
  });

  it('batch de predefinições: página ausente é ignorada', () => {
    const map = parseTemplateBatch(
      JSON.stringify({
        query: {
          pages: [
            {
              title: 'Predefinição:Futebol Ferroviária Feminino',
              revisions: [{ slots: { main: { content: '[[Clube A|Ferrão]]' } } }],
            },
            { title: 'Predefinição:Futebol Inexistente', missing: true },
          ],
        },
      }),
    );
    expect(map.get('Futebol Ferroviária Feminino')).toEqual({
      target: 'Clube A',
      display: 'Ferrão',
    });
    expect(map.has('Futebol Inexistente')).toBe(false);
  });
});

describe('T450 wave 3 — Wikidata (WDQS, CC0)', () => {
  it('parseia QID, label, WKT Point(lon lat), ano de fundação e cidade', () => {
    const clubs = parseWdqs(
      JSON.stringify({
        results: {
          bindings: [
            {
              item: { value: 'https://www.wikidata.org/entity/Q2931266' },
              itemLabel: { value: 'CEPE-Caxias' },
              coord: { value: 'Point(-46.577 -23.545)' },
              founded: { value: '1997-05-01T00:00:00Z' },
              cityLabel: { value: 'Duque de Caxias' },
            },
          ],
        },
      }),
    );
    expect(clubs).toHaveLength(1);
    expect(clubs[0]).toEqual({
      qid: 'Q2931266',
      label: 'CEPE-Caxias',
      city: 'Duque de Caxias',
      foundedYear: 1997,
      latitude: -23.545,
      longitude: -46.577,
    });
  });

  it('WKT inválido → null (não lança)', () => {
    expect(parseWktPoint('não é wkt')).toBeNull();
  });
});

describe('T450 wave 3 — slug e merge cross-source', () => {
  it('sufixo feminino faz parte do slug (time feminino ≠ clube masculino homônimo)', () => {
    expect(clubSlug('Ceará Sporting Club (futebol feminino)', 'CE')).not.toBe(
      clubSlug('Ceará Sporting Club', 'CE'),
    );
    expect(clubSlug('São José Esporte Clube (futebol feminino)', 'SP')).toBe(
      clubSlug('sao jose esporte clube (futebol feminino)', 'sp'),
    );
  });

  it('merge: WD casa com Wikipedia por label → qid anexado, fonte de identidade preservada', () => {
    const wp = [
      buildClubInputFromCategory('CEPE-Caxias', 'RJ'),
      { ...buildClubInputFromCategory('Clube X', null), city: 'Cidade X' },
    ];
    const wd = [
      buildClubInputFromWikidata({
        qid: 'Q2931266',
        label: 'CEPE-Caxias',
        city: 'Duque de Caxias',
        foundedYear: 1997,
        latitude: -22.7,
        longitude: -43.3,
      }),
    ];
    const { merged, stats } = mergeW3Inputs(wp, wd);
    expect(stats.crossMatched).toBe(1);
    expect(merged).toHaveLength(2);
    const cepe = merged.find((m) => m.name === 'CEPE-Caxias')!;
    expect(cepe.qid).toBe('Q2931266');
    expect(cepe.foundedYear).toBe(1997);
    expect(cepe.state).toBe('RJ'); // wikipedia vence onde já tem dado
    expect(cepe.source).toBe('wikipedia-pt');
  });

  it('merge: clube só-WD entra com proveniência wikidata', () => {
    const { merged, stats } = mergeW3Inputs(
      [buildClubInputFromCategory('Clube X', null)],
      [
        buildClubInputFromWikidata({
          qid: 'Q123',
          label: 'Clube Só WD',
          city: null,
          foundedYear: null,
          latitude: null,
          longitude: null,
        }),
      ],
    );
    expect(stats.wikidataOnly).toBe(1);
    expect(merged.find((m) => m.name === 'Clube Só WD')!.source).toBe('wikidata');
  });
});

describe('T450 wave 3 — proveniência obrigatória', () => {
  it('categoria: source + sourceUrl + wave implícita no contrato', () => {
    const input = buildClubInputFromCategory('CEPE-Caxias', 'RJ');
    expect(input.source).toBe('wikipedia-pt');
    expect(input.sourceUrl).toBe('https://pt.wikipedia.org/wiki/CEPE-Caxias');
    expect(input.country).toBe('BR');
  });

  it('temporada: vínculo de competição com season/level/sourceUrl', () => {
    const rows = parseSeasonParticipants(
      '| {{Futebol Botafogo Feminino}} || [[Rio de Janeiro]] || {{BR-RJ}} || x',
    );
    const inputs = seasonRowsToInputs(
      rows,
      new Map([
        [
          'Futebol Botafogo Feminino',
          { target: 'Botafogo de Futebol e Regatas (futebol feminino)', display: 'Botafogo' },
        ],
      ]),
      {
        name: W3_SEASON_PAGES[0]!.competition,
        level: W3_SEASON_PAGES[0]!.level,
        season: W3_SEASON_PAGES[0]!.season,
        sourceUrl: 'https://pt.wikipedia.org/wiki/CBFF_2026',
      },
      [],
    );
    expect(inputs).toHaveLength(1);
    expect(inputs[0]!.shortName).toBe('Botafogo');
    expect(inputs[0]!.competitions[0]).toEqual({
      name: 'Campeonato Brasileiro de Futebol Feminino - Série A1',
      level: 1,
      season: '2026',
      sourceUrl: 'https://pt.wikipedia.org/wiki/CBFF_2026',
    });
  });

  it('template sem artigo resolvido vira recusa honesta, não clube', () => {
    const refusals: Array<{ name: string; reason: string }> = [];
    const inputs = seasonRowsToInputs(
      [{ templates: ['Futebol Sem Artigo'], uf: 'SP', city: null }],
      new Map(),
      { name: 'Comp', level: 1, season: '2026', sourceUrl: 'u' },
      refusals,
    );
    expect(inputs).toHaveLength(0);
    expect(refusals).toEqual([
      { name: 'Futebol Sem Artigo', reason: 'template_sem_artigo_resolvido' },
    ]);
  });
});

describe('T450 wave 3 — plano contra o acervo (zero overwrite)', () => {
  const existing: ExistingClubRow[] = [
    {
      id: 'c1',
      qid: 'Q2931266',
      name: 'CEPE-Caxias',
      state: 'RJ',
      gender: 'women',
      deletedAt: null,
    },
    {
      id: 'c2',
      qid: 'Q777',
      name: 'Ceará Sporting Club',
      state: 'CE',
      gender: 'men',
      deletedAt: null,
    },
    {
      id: 'c3',
      qid: null,
      name: 'América Futebol Clube (Belo Horizonte) (futebol feminino)',
      state: 'MG',
      gender: 'women',
      deletedAt: null,
    },
  ];

  function input(name: string, opts: Partial<{ state: string | null; qid: string | null }> = {}) {
    return { ...buildClubInputFromCategory(name, opts.state ?? null), qid: opts.qid ?? null };
  }

  it('cria, pula por QID, pula por slug e aplica sufixo em colisão homônima', () => {
    const plan = planW3Seed(
      [
        input('Clube Novo FC', { state: 'SP' }),
        input('CEPE-Caxias', { state: 'RJ', qid: 'Q2931266' }),
        input('CEPE-Caxias', { state: 'RJ' }),
        input('Ceará Sporting Club', { state: 'CE' }),
        input('América Futebol Clube (Belo Horizonte) (futebol feminino)', { state: 'MG' }),
      ],
      existing,
    );
    expect(plan.wouldCreate).toBe(2);
    // CEPE(qid) e CEPE(slug) batem identidade; a 2ª entrada CEPE idêntica do
    // lote é duplicata (contada à parte) e América fem bate slug.
    expect(plan.skips).toBe(2);
    expect(plan.duplicatesInBatch).toBe(1);
    const novo = plan.plan.find((e) => e.finalName === 'Clube Novo FC')!;
    expect(novo.action).toBe('create');
    const ceara = plan.plan.find((e) => e.input.name === 'Ceará Sporting Club')!;
    expect(ceara.finalName).toBe('Ceará Sporting Club (futebol feminino)');
    expect(ceara.action).toBe('create');
  });

  it('nome vazio é recusado; duplicatas do lote são contadas', () => {
    const plan = planW3Seed(
      [
        input('  ', { state: null }),
        input('Dup X', { state: 'SP' }),
        input('Dup X', { state: 'SP' }),
      ],
      [],
    );
    expect(plan.refusals).toHaveLength(1);
    expect(plan.duplicatesInBatch).toBe(1);
    expect(plan.wouldCreate).toBe(1);
  });

  it('stripFeminineSuffix remove exatamente o sufixo canônico', () => {
    expect(stripFeminineSuffix('X (Futebol Feminino)')).toBe('X');
    expect(stripFeminineSuffix('X (Belo Horizonte) (futebol feminino)')).toBe('X (Belo Horizonte)');
    expect(stripFeminineSuffix('Y (Belo Horizonte)')).toBe('Y (Belo Horizonte)');
  });
});

describe('T450 wave 3 — plano de competições e arestas', () => {
  it('18 clubes na mesma competição = 1 criação, 18 arestas, 0 duplicatas', () => {
    const comp = {
      name: 'Campeonato Brasileiro de Futebol Feminino - Série A1',
      level: 1,
      season: '2026',
      sourceUrl: 'u',
    };
    const inputs = ['A', 'B', 'C'].map((n) => ({
      ...buildClubInputFromCategory(n, 'SP'),
      competitions: [comp],
    }));
    const plan = planW3Competitions(inputs, []);
    expect(plan.compsToCreate).toHaveLength(1);
    expect(plan.edges).toHaveLength(3);
    expect(plan.duplicatesInBatch).toBe(0);
    expect(new Set(plan.edges.map((e) => e.compSlugKey)).size).toBe(1);
  });

  it('competição já existente (women, BR) não é duplicada', () => {
    const comp = { name: 'Série A2', level: 2, season: '2026', sourceUrl: 'u' };
    const inputs = [{ ...buildClubInputFromCategory('A', 'SP'), competitions: [comp] }];
    const plan = planW3Competitions(inputs, [
      { id: 'k1', name: 'Série A2', country: 'BR', gender: 'women', deletedAt: null },
      { id: 'k2', name: 'Série A2', country: 'BR', gender: 'men', deletedAt: null }, // homônima masculina ignora
    ]);
    expect(plan.compsToCreate).toHaveLength(0);
    expect(plan.edges).toHaveLength(1);
  });

  it('aresta (clube,comp,season) repetida é dedup com contador honesto', () => {
    const comp = { name: 'C', level: 1, season: '2026', sourceUrl: 'u' };
    const inputs = [
      { ...buildClubInputFromCategory('A', 'SP'), competitions: [comp] },
      { ...buildClubInputFromCategory('A', 'SP'), competitions: [{ ...comp }] },
    ];
    const plan = planW3Competitions(inputs, []);
    expect(plan.edges).toHaveLength(1);
    expect(plan.duplicatesInBatch).toBe(1);
  });
});

describe('T450 wave 3 — guard de ToS (fonte descartada nunca é processada)', () => {
  it('assertSourceApproved lança para fontes descartadas no levantamento', () => {
    expect(() => assertSourceApproved('wikipedia-pt')).not.toThrow();
    expect(() => assertSourceApproved('wikidata')).not.toThrow();
    expect(() => assertSourceApproved('cbf-public')).toThrow(W3UnapprovedSourceError);
    expect(() => assertSourceApproved('thesportsdb')).toThrow(W3UnapprovedSourceError);
  });

  it('filterApprovedSources descarta sem lançar — o script nunca busca a fonte', () => {
    const kept = filterApprovedSources([
      { source: 'wikipedia-pt', url: 'a' },
      { source: 'cbf-public', url: 'b' },
      { source: 'thesportsdb', url: 'c' },
      { source: 'wikidata', url: 'd' },
    ]);
    expect(kept.map((k) => k.source)).toEqual(['wikipedia-pt', 'wikidata']);
  });
});

describe('T450 wave 4 — estaduais femininos', () => {
  it('W4_STATE_PAGES: 8 estados do despacho, level 4, edições 2026→2025', async () => {
    const { W4_STATE_PAGES } = await import(
      '../../../src/modules/etl/connectors/wikipedia-women-br.connector.js'
    );
    expect(W4_STATE_PAGES).toHaveLength(8);
    for (const s of W4_STATE_PAGES) {
      expect(s.level).toBe(4);
      expect(s.editions).toHaveLength(2);
      expect(s.editions[0]).toContain('2026');
      expect(s.editions[1]).toContain('2025');
      expect(s.competition).not.toMatch(/de \d{4}$/);
    }
    expect(W4_STATE_PAGES.map((s) => s.uf)).toEqual(['SP', 'RJ', 'MG', 'RS', 'PR', 'BA', 'SC', 'PE']);
  });

  it('stateCompetitionName remove o ano da edição; stateEditionYear extrai', async () => {
    const mod = await import(
      '../../../src/modules/etl/connectors/wikipedia-women-br.connector.js'
    );
    expect(mod.stateCompetitionName('Campeonato Paulista de Futebol Feminino de 2025')).toBe(
      'Campeonato Paulista de Futebol Feminino',
    );
    expect(mod.stateCompetitionName('Campeonato Gaúcho de Futebol Feminino de 2026')).toBe(
      'Campeonato Gaúcho de Futebol Feminino',
    );
    expect(mod.stateEditionYear('Campeonato Mineiro de Futebol Feminino de 2025')).toBe('2025');
    expect(mod.stateEditionYear('sem ano')).toBe('');
  });

  it('estaduais sem estado na linha usam a UF da tabela ({{BR-UF}}) e competição level 4', async () => {
    const mod = await import(
      '../../../src/modules/etl/connectors/wikipedia-women-br.connector.js'
    );
    const rows = mod.parseSeasonParticipants('| {{Futebol São José Feminino}} || [[São José dos Campos]] || {{BR-SP}} || x');
    const inputs = mod.seasonRowsToInputs(
      rows,
      new Map([['Futebol São José Feminino', { target: 'São José Esporte Clube (futebol feminino)', display: 'São José' }]]),
      { name: 'Campeonato Paulista de Futebol Feminino', level: 4, season: '2025', sourceUrl: 'u' },
      [],
    );
    expect(inputs[0]!.state).toBe('SP');
    expect(inputs[0]!.competitions[0]!.level).toBe(4);
  });
});
