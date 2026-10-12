import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  parseRsssfMatches,
  parseLeagueBlock,
  parseScorers,
  resolveMatchYear,
  matchDate,
  stripNotes,
} from '../../../src/lib/rsssf/match-parser.js';
import { decodeLegacyBytes, htmlToText } from '../../../src/lib/rsssf/decode-legacy-table.js';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (f: string) => readFileSync(join(here, '../../fixtures/rsssf/matches', f), 'utf8');

describe('match-parser T519 — ligas (RSSSF)', () => {
  const braz = parseRsssfMatches(fx('braz2023-table-rounds12.txt'), { kind: 'league' });

  it('lê as rodadas e ignora a tabela final que as antecede', () => {
    // Rodadas 1 e 2 do Brasileirão: 10 jogos cada.
    expect(braz.matches).toHaveLength(20);
    expect(new Set(braz.matches.map((m) => m.round))).toEqual(new Set(['1', '2']));
    // A tabela final ("1.Manchester City ... 96-34 91") NÃO pode virar partida:
    // o único 96-34 do fixture é placar-agregado de tabela, não de jogo.
    expect(braz.matches.some((m) => m.homeGoals === 64 || m.homeGoals === 96)).toBe(false);
  });

  it('extrai data, placar e nomes do primeiro jogo', () => {
    const m = braz.matches[0];
    expect(m).toMatchObject({
      round: '1',
      dateRaw: 'Apr 15',
      month: 4,
      day: 15,
      homeName: 'Palmeiras',
      awayName: 'Cuiabá',
      homeGoals: 2,
      awayGoals: 1,
      extraTime: false,
      sourceNote: null,
    });
  });

  it('parseia autores dos gols e VALIDA a contagem contra o placar', () => {
    const m = braz.matches[0];
    expect(m.scorers?.raw).toBe('Endrick 4, Flaco López 64; Raniele 45+5');
    expect(m.scorers?.home).toEqual([
      { player: 'Endrick', minute: '4' },
      { player: 'Flaco López', minute: '64' },
    ]);
    expect(m.scorers?.away).toEqual([{ player: 'Raniele', minute: '45+5' }]);
    expect(m.scorers?.sidesVerified).toBe(true);
  });

  it('reconstrói o ano pela temporada de ano civil (BR)', () => {
    const d = matchDate(braz.matches[0], { mode: 'single', year: 2023 });
    expect(d.toISOString()).toBe('2023-04-15T00:00:00.000Z');
  });
});

describe('match-parser T519 — Premier League (padding de 1 espaço e temporada cruzada)', () => {
  const eng = parseRsssfMatches(fx('eng2024-table-rounds12.txt'), { kind: 'league' });

  it('captura o time cujo nome longo deixa UM espaço antes do placar', () => {
    // "Wolverhampton 1-4 Brighton" — 13 letras na coluna de 14. Com `\s{2,}`
    // antes do placar essa linha era perdida (19 jogos por temporada na fonte).
    const wolves = eng.matches.find((m) => m.homeName === 'Wolverhampton');
    expect(wolves).toBeDefined();
    expect(wolves).toMatchObject({ awayName: 'Brighton', homeGoals: 1, awayGoals: 4 });
  });

  it('resolve o ano em temporada cruzada: ago→ano inicial, mai→ano final', () => {
    expect(resolveMatchYear(8, { mode: 'cross', year: 2023 })).toBe(2023); // [Aug 11]
    expect(resolveMatchYear(5, { mode: 'cross', year: 2023 })).toBe(2024); // [May 19]
    const first = eng.matches[0];
    expect(matchDate(first, { mode: 'cross', year: 2023 }).toISOString().slice(0, 10)).toBe(
      '2023-08-11',
    );
  });
});

describe('match-parser T519 — jogo abandonado e replay', () => {
  // Recorte da Round 17: usa `parseLeagueBlock` direto porque o excerpt não tem
  // a Round 1 (a seleção de bloco por competição exige a rodada inicial).
  const r = parseLeagueBlock(fx('eng2024-abandoned-replay.txt'));

  it('NÃO transforma o jogo abandonado em partida (placar só existe na anotação)', () => {
    // A linha do abandonado traz "1-1" DENTRO da anotação (`[abandoned at 1-1 in
    // 65' ...]`). Sem remover a anotação antes do match, esse 1-1 viraria placar.
    expect(r.matches.some((m) => m.homeGoals === 1 && m.awayGoals === 1)).toBe(false);
    expect(r.warnings.some((w) => w.startsWith('abandoned_match:'))).toBe(true);
  });

  it('ingere o REPLAY como partida real, com a nota da fonte preservada', () => {
    const replay = r.matches.find((m) => m.sourceNote === 'replay');
    expect(replay).toMatchObject({
      round: '17',
      homeName: 'Bournemouth',
      awayName: 'Luton',
      homeGoals: 4,
      awayGoals: 3,
    });
  });
});

describe('match-parser T519 — Libertadores (grupo + final)', () => {
  const lib = parseRsssfMatches(fx('copa2023-groupA-and-final.txt'), { kind: 'libertadores' });

  it('lê os jogos do grupo com data inline e marca o jogo em estádio alternativo', () => {
    const first = lib.matches.find((m) => m.homeName === 'SD Aucas');
    expect(first).toMatchObject({
      round: 'Group A',
      month: 4,
      day: 5,
      awayName: 'CR Flamengo',
      homeGoals: 2,
      awayGoals: 1,
    });
    // `0-2x` — o `x` é nota da fonte (estádio alternativo); preservado, não interpretado.
    const marked = lib.matches.find((m) => m.homeName === 'Ñublense');
    expect(marked?.sourceNote).toBe('x');
    expect(marked).toMatchObject({ homeGoals: 0, awayGoals: 2 });
  });

  it('ingere a FINAL (jogo único, com prorrogação) e descarta as agregações do mata-mata', () => {
    const final = lib.matches.find((m) => m.round === 'Final');
    expect(final).toMatchObject({
      dateRaw: 'Nov 4',
      month: 11,
      day: 4,
      homeName: 'Boca Juniors',
      awayName: 'Fluminense FC',
      homeGoals: 1,
      awayGoals: 2,
      extraTime: true,
    });
    // Linhas de agregação (`0-0  1-1  1-1  4-2p`) não viram partida.
    expect(lib.matches.every((m) => m.round !== 'Semifinals')).toBe(true);
  });
});

describe('match-parser T519 — casos de borda', () => {
  it('htmlToText não engole texto após um `<` órfão (regressão)', () => {
    // A página da Libertadores 2023 tem `(<i>Sep 28 & Oct 5</i><)` e, na linha
    // seguinte, `Final (<i>Nov 4, Rio de Janeiro</i>)`. Com `<[^>]+>` o "tag"
    // começava no `<` órfão e apagava o cabeçalho da final.
    const html = '(<i>Sep 28 & Oct 5</i><)\nFinal (<i>Nov 4, Rio de Janeiro</i>)\nX 1-2 Y';
    const text = htmlToText(html);
    expect(text).toContain('Final (Nov 4, Rio de Janeiro)');
    expect(text).toContain('Sep 28 & Oct 5');
  });

  it('stripNotes separa a anotação de local do nome do time', () => {
    const { clean, notes } = stripNotes(
      'Atlético/MG     [played in Uberlândia-MG]      2-0 Santos',
    );
    // A anotação sai (vira nota) e o espaço em volta permanece — o que importa é
    // que o placar e os dois nomes seguem intactos e sem brackets.
    expect(clean).toMatch(/^Atlético\/MG\s+2-0 Santos$/);
    expect(clean).not.toContain('[');
    expect(notes).toEqual(['played in Uberlândia-MG']);
  });

  it('parseScorers infere o lado quando a fonte omite o `;` de um time que não marcou', () => {
    const s = parseScorers('Cano 51, Kennedy 59, Lelê 71', 3, 0);
    expect(s.home.map((x) => x.player)).toEqual(['Cano', 'Kennedy', 'Lelê']);
    expect(s.away).toEqual([]);
    expect(s.sidesVerified).toBe(true);
  });

  it('gramática v2: sufixo pen/og vai no MINUTO, não no nome', () => {
    // Antes, "Tiquinho Soares 29pen" virava um "jogador" distinto de
    // "Tiquinho Soares" (inflava os nomes distintos e perdia o pênalti).
    const s = parseScorers('Tiquinho Soares 29pen, 60pen', 2, 0);
    expect(s.home.map((x) => x.player)).toEqual(['Tiquinho Soares', 'Tiquinho Soares']);
    expect(s.home[0].penalty).toBe(true);
    // Minuto solto = o MESMO jogador marcou de novo (fonte: `[Pedro 7pen, 90]`).
    const p2 = parseScorers('Pedro 7pen, 90', 2, 0);
    expect(p2.home.map((x) => ({ p: x.player, m: x.minute }))).toEqual([
      { p: 'Pedro', m: '7' },
      { p: 'Pedro', m: '90' },
    ]);
  });

  it('marca gol contra (og) — o gol é do adversário, não do autor', () => {
    const s = parseScorers('Sidimar 48og', 0, 1);
    expect(s.away[0].ownGoal).toBe(true);
    expect(s.away[0].player).toBe('Sidimar');
  });

  it('parseScorers não atribui lado quando o placar não permite inferir', () => {
    const s = parseScorers('Cano 51, Kennedy 59', 2, 1);
    expect(s.home).toEqual([]);
    expect(s.away).toEqual([]);
    expect(s.sidesVerified).toBe(false);
    expect(s.raw).toBe('Cano 51, Kennedy 59');
  });

  it('decodeLegacyBytes reconstrói acentos do windows-1252', () => {
    // "Atlético" e "Ñublense" em cp1252 — a página não é UTF-8.
    const bytes = Buffer.from([0x41, 0x74, 0x6c, 0xe9, 0x74, 0x69, 0x63, 0x6f, 0x20, 0xd1, 0x75]);
    expect(decodeLegacyBytes(bytes)).toBe('Atlético Ñu');
  });

  it('parseLeagueBlock ignora linhas sem data em vez de inventar', () => {
    const text = 'Round 1\nPalmeiras       2-1 Cuiabá\n';
    const r = parseLeagueBlock(text);
    expect(r.matches).toHaveLength(0);
    expect(r.warnings[0]).toMatch(/^match_without_date:/);
  });
});

describe('match-parser T519 — contagem do recorte', () => {
  it('o grupo A da Libertadores rende 12 jogos (6 rodadas × 2)', () => {
    const lib = parseRsssfMatches(fx('copa2023-groupA-and-final.txt'), { kind: 'libertadores' });
    expect(lib.matches.filter((m) => m.round === 'Group A')).toHaveLength(12);
  });
});

describe('match-parser T527 — expansão (spill, playoff, guard de tabela)', () => {
  it('resolveMatchYear com spillAfter: jan-fev da temporada Covid vira ano seguinte', () => {
    expect(resolveMatchYear(8, { mode: 'single', year: 2020 })).toBe(2020);
    expect(resolveMatchYear(1, { mode: 'single', year: 2020, spillAfter: 5 })).toBe(2021);
    expect(resolveMatchYear(2, { mode: 'single', year: 2020, spillAfter: 5 })).toBe(2021);
    expect(resolveMatchYear(6, { mode: 'single', year: 2020, spillAfter: 5 })).toBe(2020);
    const m = { month: 2, day: 25 } as never;
    expect(
      matchDate(m, { mode: 'single', year: 2020, spillAfter: 5 }).toISOString().slice(0, 10),
    ).toBe('2021-02-25');
  });

  it('guard de tabela aceita time cujo nome começa com dígito e rejeita linha de tabela', () => {
    const r = parseLeagueBlock(
      'Final Table:\n 1.Manchester City         38  28  7  3  96-34  91  [C]  Champions\n' +
        'Round 1\n[Aug 18]\n1.FC Koeln        2-1 Werder Bremen\n',
    );
    // a linha da tabela NÃO vira partida; o jogo do clube de Köln SIM
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ homeName: '1.FC Koeln', homeGoals: 2, awayGoals: 1 });
    expect(r.warnings).toHaveLength(0);
  });

  it('cabeçalho Round com anotação no colchete (Round 7 [postponed...]) é aceito', () => {
    const r = parseLeagueBlock(
      'Round 6\n[Sep 1]\nA 1-0 B\nRound 7 [postponed from Sep 10-12 due to mourning]\n[Jan 12]\nC 2-2 D\n',
    );
    expect(r.matches.map((m) => m.round)).toEqual(['6', '7']);
    expect(r.matches[1]).toMatchObject({ dateRaw: 'Jan 12' });
  });

  it('Round repetido após a última rodada vira fase de playoff (P{N})', () => {
    const r = parseLeagueBlock(
      'Round 34\n[May 19]\nA 1-0 B\nRound 1 [May 21]\nC 2-1 D\nRound 2 [May 24]\nE 0-0 F\n',
    );
    expect(r.matches.map((m) => m.round)).toEqual(['34', 'P1', 'P2']);
    expect(r.matches[1].dateRaw).toBe('May 21');
  });

  it('a tabela final ENCERRA o bloco: barragem/playoff depois dela fica fora', () => {
    // Ligue 1 2023-24: após a rodada 34 vem a tabela final e, depois, a barragem
    // de acesso/rebaixamento — que envolve clubes da divisão de baixo (Rodez).
    const r = parseLeagueBlock(
      'Final Table:\n 1.Paris-Saint-Germain FC 34 22 10 2 81-33 76 [C]\n' +
        'Round 34\n[May 19]\nMetz 0-2 Paris-SG\n' +
        'Final Table:\n 1.Paris-Saint-Germain FC 34 22 10 2 81-33 76 [C]  Champions\n' +
        '16.FC Metz 34 8 5 21 35-58 29 [P] Relegation Playoff\n' +
        'Promotion/Relegation Playoff 1st/2nd Level\nRound 1 [May 21]\nRodez 2-2 Paris FC\n' +
        'Final\nFirst Leg [May 30]\nSaint-Etienne 2-1 Metz\n',
    );
    expect(r.matches).toHaveLength(1);
    expect(r.matches[0]).toMatchObject({ round: '34', homeName: 'Metz', awayGoals: 2 });
  });

  it('nota quebrada em 2 linhas não contamina nomes (placar impresso = partida)', () => {
    // Ligue 1 2024-25: a notação do jogo abandonado atravessa a quebra de linha e
    // a sobra (`crowd trouble; result stood]`) entra na linha do jogo SEGUINTE.
    const r = parseLeagueBlock(
      'Round 26\n[Mar 16]\n' +
        "Montpellier   0-2 Saint-Etienne [abandoned at 0-2 in 62' due to\n" +
        'Strasbourg    2-1 Toulouse       crowd trouble; result stood]\n',
    );
    expect(
      r.matches.map((m) => `${m.homeName} ${m.homeGoals}-${m.awayGoals} ${m.awayName}`),
    ).toEqual(['Montpellier 0-2 Saint-Etienne', 'Strasbourg 2-1 Toulouse']);
    expect(r.matches[0].sourceNote).toContain('abandoned');
    expect(r.warnings).toHaveLength(0);
  });

  it('marcador no lugar do placar (abd/awd) fica fora, como gap declarado', () => {
    const r = parseLeagueBlock(
      'Round 8\n[Oct 8]\nMontpellier   abd Clermont      [abandoned at 4-2 in 90+2]\n' +
        'Round 12\n[Dec 14]\nUnion  awd Bochum [awarded 0-2; originally 1-1]\n',
    );
    expect(r.matches).toHaveLength(0);
    expect(r.warnings.filter((w) => w.startsWith('abandoned_match:'))).toHaveLength(2);
  });
});
