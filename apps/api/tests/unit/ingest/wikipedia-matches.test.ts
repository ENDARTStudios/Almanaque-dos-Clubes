import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  parseWikipediaMatchesEn,
  parseWikipediaMatchesPt,
  mergePtEnrichment,
  parseWikipediaGroupMatches,
  parseScoreCell,
  parseEnBoxDate,
  parsePtDateCell,
  teamFromCell,
  type WikiMatchParsed,
} from '../../../src/modules/etl/connectors/wikipedia-matches.connector.js';
import {
  CLUB_QID_MAP,
  resolveTeamQid,
  normalizeTeamKey,
  buildIngestPlan,
  applyExisting,
  DEFAULT_SOURCE_URL,
  LICENSE,
  IMPORTED_FROM,
  type PlanContext,
} from '../../../src/scripts/ingest-wikipedia-matches.js';

// T606 — parser de partidas de grupos da Libertadores 2021 (funções puras).
// Fixtures = RECORTE real dos artigos EN (oldid 1363263442) e PT: grupos A e B
// completos (24 jogos). Fatos externos afirmados abaixo foram verificados nas
// DUAS fontes (EN × PT) e no site da CONMEBOL (link "Report" de cada caixa).

const here = dirname(fileURLToPath(import.meta.url));
const enHtml = readFileSync(
  join(here, '../../fixtures/wikipedia-matches-lib2021-group-stage.html'),
  'utf8',
);
const ptHtml = readFileSync(
  join(here, '../../fixtures/wikipedia-matches-lib2021-group-stage-pt.html'),
  'utf8',
);

describe('T606 — parseWikipediaMatchesEn (footballbox)', () => {
  const { matches, warnings } = parseWikipediaMatchesEn(enHtml);

  it('extrai os 24 jogos dos grupos A e B (12 por grupo)', () => {
    expect(matches).toHaveLength(24);
    expect(matches.filter((m) => m.group === 'Group A')).toHaveLength(12);
    expect(matches.filter((m) => m.group === 'Group B')).toHaveLength(12);
    expect(warnings).toEqual([]);
  });

  it('1º jogo do Grupo A: Independiente del Valle 1–1 Defensa y Justicia (21/04/2021)', () => {
    const m = matches[0]!;
    expect(m.group).toBe('Group A');
    expect(m.homeTeam).toBe('Independiente del Valle');
    expect(m.homeArticle).toBe('C.S.D. Independiente del Valle');
    expect(m.awayTeam).toBe('Defensa y Justicia');
    expect(m.homeScore).toBe(1);
    expect(m.awayScore).toBe(1);
    expect(m.dateIso).toBe('2021-04-21');
  });

  it('arma da bandeira: o visitante NÃO é o link da bandeira (federation)', () => {
    // No box do jogo 1 a célula faway abre com o link da bandeira argentina
    // ("Argentine Football Association") ANTES do clube — o parser pega o
    // primeiro link COM texto visível.
    for (const m of matches) {
      expect(m.awayArticle).not.toMatch(/Football Federation|Football Association/);
      expect(m.homeArticle).not.toMatch(/Football Federation|Football Association/);
    }
  });

  it('todos os jogos têm data ISO e placar', () => {
    for (const m of matches) {
      expect(m.dateIso).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(m.homeScore).not.toBeNull();
      expect(m.awayScore).not.toBeNull();
    }
  });

  it('datas do Grupo B: rodadas em 20/04, 27-28/04, 5-6/05 (conferidas PT↔EN)', () => {
    const b = matches.filter((m) => m.group === 'Group B');
    const dates = b.map((m) => m.dateIso).sort();
    expect(dates[0]).toBe('2021-04-20');
    expect(dates).toContain('2021-04-27');
    expect(dates).toContain('2021-05-05');
    expect(dates).toHaveLength(12);
  });
});

describe('T606 — parseWikipediaMatchesPt (tabelas sem class)', () => {
  const { matches, warnings } = parseWikipediaMatchesPt(ptHtml, 2021);

  it('extrai os 24 jogos com venue (a fonte PT traz estádio, cidade)', () => {
    expect(matches).toHaveLength(24);
    expect(warnings).toEqual([]);
    expect(matches[0]!.venue).toBe('Estádio Casa Blanca, Quito');
    expect(matches[0]!.homeScore).toBe(1);
    expect(matches[0]!.awayScore).toBe(1);
  });

  it('fecha a data ISO com o ano da temporada (a fonte imprime "21 de abril")', () => {
    expect(matches[0]!.dateIso).toBe('2021-04-21');
  });

  it('arma da bandeira na fonte PT também (visitante: bandeira antes do clube)', () => {
    expect(matches[0]!.awayArticle).toBe('Club Social y Deportivo Defensa y Justicia');
  });
});

describe('T606 — cross-check PT↔EN + venue', () => {
  const en = parseWikipediaMatchesEn(enHtml).matches;
  const pt = parseWikipediaMatchesPt(ptHtml, 2021).matches;
  const { matches, warnings } = mergePtEnrichment(en, pt);

  it('placar das duas fontes CONCORDA nos 24 jogos (fato externo) e venue preenche', () => {
    expect(warnings).toEqual([]);
    const withVenue = matches.filter((m) => m.venue !== null);
    expect(withVenue).toHaveLength(24);
    expect(matches[0]!.venue).toBe('Estádio Casa Blanca, Quito');
  });

  it('divergência de placar NÃO sobrescreve o EN (só avisa)', () => {
    const enMock: WikiMatchParsed[] = [
      {
        group: 'Group X',
        dateIso: '2021-04-21',
        homeTeam: 'A',
        homeArticle: 'A',
        awayTeam: 'B',
        awayArticle: 'B',
        homeScore: 2,
        awayScore: 0,
        venue: null,
      },
    ];
    const ptMock: WikiMatchParsed[] = [
      { ...enMock[0]!, homeScore: 1, awayScore: 0, venue: 'Estádio X' },
    ];
    const res = mergePtEnrichment(enMock, ptMock);
    expect(res.matches[0]!.homeScore).toBe(2);
    expect(res.matches[0]!.venue).toBeNull();
    expect(res.warnings[0]).toMatch(/divergência de placar/);
  });
});

describe('T606 — helpers', () => {
  it('parseScoreCell cobre – — − e -', () => {
    expect(parseScoreCell('<b>1 – 1</b>')).toEqual({ home: 1, away: 1 });
    expect(parseScoreCell('0&#8211;2')).toEqual({ home: 0, away: 2 });
    expect(parseScoreCell('3 - 0')).toEqual({ home: 3, away: 0 });
    expect(parseScoreCell('—')).toBeNull();
  });

  it('parseEnBoxDate: fonte estruturada (span escondido) e fallback textual', () => {
    expect(
      parseEnBoxDate('<span class="bday dtstart published updated itvstart">2021-04-21</span>'),
    ).toBe('2021-04-21');
    expect(parseEnBoxDate('<div class="fdate">21 April 2021</div>')).toBe('2021-04-21');
    expect(parseEnBoxDate('<div class="fdate">sem data</div>')).toBeNull();
  });

  it('parsePtDateCell: meses com acento (março) e dia de 1 dígito', () => {
    expect(parsePtDateCell('21 de abril')).toEqual({ day: 21, month: 4 });
    expect(parsePtDateCell('5 de maio')).toEqual({ day: 5, month: 5 });
    expect(parsePtDateCell('5 de março')).toEqual({ day: 5, month: 3 });
    expect(parsePtDateCell('sem data')).toBeNull();
  });

  it('teamFromCell pega o 1º link COM texto (bandeira só-imagem cai fora)', () => {
    const cell =
      '<td><b><span class="flagicon"><a href="/wiki/Argentina" title="Argentina">' +
      '<img alt="Argentina" src="flag.png" /></a></span> ' +
      '<a href="/wiki/Boca_Juniors" title="Boca Juniors">Boca Juniors</a></b></td>';
    expect(teamFromCell(cell)).toEqual({ name: 'Boca Juniors', article: 'Boca Juniors' });
  });
});

describe('T606 — mapa QID (nome→QID, SEM fuzzy)', () => {
  it('os 32 clubes da fase de grupos estão no mapa com QID distinto', () => {
    const qids = new Set(Object.values(CLUB_QID_MAP));
    expect(qids.size).toBe(32);
    // QIDs validados pelo scout T606:
    expect(resolveTeamQid('Sociedade Esportiva Palmeiras')).toBe('Q80964');
    expect(resolveTeamQid('Clube de Regatas do Flamengo')).toBe('Q413160');
    expect(resolveTeamQid('C.S.D. Independiente del Valle')).toBe('Q249648');
    expect(resolveTeamQid('Club Universitario de Deportes')).toBe('Q19066');
    expect(resolveTeamQid('Clube Atlético Mineiro')).toBe('Q270995');
    expect(resolveTeamQid('Club Atlético Boca Juniors')).toBe('Q170703');
    expect(resolveTeamQid('Club Cerro Porteño')).toBe('Q914086');
    expect(resolveTeamQid('Fluminense FC')).toBe('Q80987');
    expect(resolveTeamQid('Barcelona S.C.')).toBe('Q248782');
    expect(resolveTeamQid('Club Atlético Vélez Sarsfield')).toBe('Q215163');
    expect(resolveTeamQid('São PauloFC')).toBe('Q38568');
    expect(resolveTeamQid('Racing Club de Avellaneda')).toBe('Q276533');
    expect(resolveTeamQid('Club Atlético River Plate')).toBe('Q15799');
    expect(resolveTeamQid('Club Olimpia')).toBe('Q604589');
    expect(resolveTeamQid('Sport Club Internacional')).toBe('Q80845');
    expect(resolveTeamQid('Argentinos Juniors')).toBe('Q220621');
    expect(resolveTeamQid('Defensa y Justicia')).toBe('Q1024338');
    expect(resolveTeamQid('L.D.U. Quito')).toBe('Q249643');
  });

  it('variantes de acento/pontuação normalizam para a mesma chave', () => {
    expect(normalizeTeamKey('São Paulo FC')).toBe(normalizeTeamKey('sao paulofc'));
    expect(resolveTeamQid('Atlético-MG')).toBe('Q270995');
    expect(resolveTeamQid('Cerro Porteño')).toBe('Q914086');
  });

  it('NUNCA fuzzy: clube fora do mapa → null (mesmo parecido)', () => {
    expect(resolveTeamQid('Palmeiras Sub-20')).toBeNull();
    expect(resolveTeamQid('América de Natal')).toBeNull();
    expect(resolveTeamQid('Argentine Football Association')).toBeNull();
    expect(resolveTeamQid('Boca Unidos')).toBeNull();
  });

  it('os 32 artigos dos fixtures resolvem para QID', () => {
    const { matches } = parseWikipediaMatchesEn(enHtml);
    const missing: string[] = [];
    for (const m of matches) {
      for (const article of [m.homeArticle, m.awayArticle]) {
        if (article && !resolveTeamQid(article)) missing.push(article);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('T606 — buildIngestPlan (fake prisma: clubByQid)', () => {
  const ctx: PlanContext = {
    competitionId: 'comp-1',
    seasonLabel: '2021',
    seasonId: 'season-1',
    sourceUrl: DEFAULT_SOURCE_URL,
    clubByQid: new Map([
      ['Q249648', { id: 'club-idv', name: 'Independiente del Valle' }],
      ['Q1024338', { id: 'club-dyj', name: 'Defensa y Justicia' }],
      ['Q914086', { id: 'club-cp', name: 'Cerro Porteño' }],
    ]),
  };

  it('monta dedupKey/round/venue/licença e NÃO grava proveniência errada', () => {
    const matches: WikiMatchParsed[] = [
      {
        group: 'Group A',
        dateIso: '2021-04-21',
        homeTeam: 'Independiente del Valle',
        homeArticle: 'C.S.D. Independiente del Valle',
        awayTeam: 'Defensa y Justicia',
        awayArticle: 'Defensa y Justicia',
        homeScore: 1,
        awayScore: 1,
        venue: 'Estádio Casa Blanca, Quito',
      },
    ];
    const plan = buildIngestPlan(matches, ctx);
    expect(plan.creates).toHaveLength(1);
    const p = plan.creates[0]!;
    expect(p.dedupKey).toBe('wikipedia|comp-1|2021|2021-04-21|club-idv|club-dyj');
    expect(p.round).toBe('Group A');
    expect(p.venue).toBe('Estádio Casa Blanca, Quito');
    expect(p.date.toISOString()).toBe('2021-04-21T00:00:00.000Z');
    expect(p.sourceUrl).toBe(DEFAULT_SOURCE_URL);
    expect(plan.skipped.size).toBe(0);
    // constantes de proveniência (licença CC BY-SA 4.0, lote reversível)
    expect(LICENSE).toBe('Wikipedia CC BY-SA 4.0');
    expect(IMPORTED_FROM).toBe('wikipedia');
  });

  it('jogo sem data = skip contado; clube fora do mapa = skip contado (nunca fuzzy)', () => {
    const matches: WikiMatchParsed[] = [
      {
        group: 'Group A',
        dateIso: null,
        homeTeam: 'Independiente del Valle',
        homeArticle: null,
        awayTeam: 'Defensa y Justicia',
        awayArticle: 'Defensa y Justicia',
        homeScore: 1,
        awayScore: 0,
        venue: null,
      },
      {
        group: 'Group A',
        dateIso: '2021-05-05',
        homeTeam: 'Cerro Porteño',
        homeArticle: 'Club Cerro Porteño',
        awayTeam: 'Clube Inventado FC',
        awayArticle: 'Clube Inventado FC',
        homeScore: 2,
        awayScore: 2,
        venue: null,
      },
    ];
    const plan = buildIngestPlan(matches, ctx);
    expect(plan.creates).toHaveLength(0);
    const reasons = [...plan.skipped.keys()].join(' | ');
    expect(reasons).toMatch(/sem data na fonte/);
    expect(reasons).toMatch(/clube sem QID no mapa: Clube Inventado FC/);
  });

  it('applyExisting: existente com placar = noop; sem placar = update honesto (só NULL)', () => {
    const matches: WikiMatchParsed[] = [
      {
        group: 'Group A',
        dateIso: '2021-04-21',
        homeTeam: 'Independiente del Valle',
        homeArticle: null,
        awayTeam: 'Defensa y Justicia',
        awayArticle: 'Defensa y Justicia',
        homeScore: 1,
        awayScore: 1,
        venue: null,
      },
      {
        group: 'Group A',
        dateIso: '2021-04-28',
        homeTeam: 'Cerro Porteño',
        homeArticle: null,
        awayTeam: 'Defensa y Justicia',
        awayArticle: 'Defensa y Justicia',
        homeScore: 0,
        awayScore: 2,
        venue: 'La Nueva Olla',
      },
    ];
    const plan = buildIngestPlan(matches, ctx);
    const final = applyExisting(plan, [
      // jogo 1 já existe COM placar → noop
      {
        id: 'm1',
        dedupKey: 'wikipedia|comp-1|2021|2021-04-21|club-idv|club-dyj',
        homeScore: 1,
        awayScore: 1,
        round: null,
        venue: null,
      },
      // jogo 2 existe SEM placar (parcial) → update preenche só NULL
      {
        id: 'm2',
        dedupKey: 'wikipedia|comp-1|2021|2021-04-28|club-cp|club-dyj',
        homeScore: null,
        awayScore: null,
        round: 'Group A',
        venue: null,
      },
    ]);
    expect(final.noops).toBe(1);
    expect(final.creates).toHaveLength(0);
    expect(final.updates).toHaveLength(1);
    expect(final.updates[0]!.id).toBe('m2');
    expect(final.updates[0]!.data).toEqual({ homeScore: 0, awayScore: 2, venue: 'La Nueva Olla' });
  });
});

describe('T606 — orquestrador parseWikipediaGroupMatches', () => {
  it('EN + PT juntos: 24 jogos, venue preenchido, zero avisos nos grupos A/B', () => {
    const { matches, warnings } = parseWikipediaGroupMatches(enHtml, {
      ptHtml,
      seasonYear: 2021,
    });
    expect(matches).toHaveLength(24);
    expect(warnings).toEqual([]);
    expect(matches.every((m) => m.venue !== null)).toBe(true);
  });

  it('só EN (sem PT): 24 jogos com venue null', () => {
    const { matches, warnings } = parseWikipediaGroupMatches(enHtml);
    expect(matches).toHaveLength(24);
    expect(warnings).toEqual([]);
    expect(matches.every((m) => m.venue === null)).toBe(true);
  });
});
