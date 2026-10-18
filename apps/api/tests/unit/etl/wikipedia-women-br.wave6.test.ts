/**
 * T450 wave 6 — formatos header-driven do parseChampionEditions.
 * Fixtures derivadas dos artigos reais (Mineiro/Gaúcho/Paranaense, 10-07).
 */
import { describe, expect, it } from 'vitest';

describe('T450 wave 6 — formatos header-driven', () => {
  it('Mineiro: campeão SEM negrito na coluna imediatamente após o ano', async () => {
    const mod = await import('../../../src/modules/etl/connectors/wikipedia-women-br.connector.js');
    const wt = [
      '== Finais ==',
      '{| class="wikitable" style="text-align:center"',
      '!Ano',
      '!Campeão',
      '!Placar',
      '!Vice-campeão',
      '|-',
      "|'''2006'''<br /> ''Detalhes''",
      '|{{BR-MG-BHEb|tamanho=35px}} <br /> {{Futebol Atlético-MG}}',
      '| align=center|3 – 1',
      '|[[imagem:x.png|borda|35x35px]] <br /> [[Garra Esporte Clube|Garra]]',
      '|-',
      "|'''2007'''<br /> ''Detalhes''",
      '|{{BR-MG-BHEb|tamanho=35px}} <br /> [[Garra Esporte Clube|Garra]]',
      '|}',
    ].join('\n');
    expect(mod.parseChampionEditions(wt)).toEqual([
      { year: 2006, link: null, template: 'Futebol Atlético-MG' },
      { year: 2007, link: 'Garra Esporte Clube', template: null },
    ]);
  });

  it('Gaúcho: organizador antes do campeão negrito não vira campeão', async () => {
    const mod = await import('../../../src/modules/etl/connectors/wikipedia-women-br.connector.js');
    const wt = [
      '== Edições ==',
      '=== Campeonato Gaúcho ===',
      '{| class="wikitable"',
      '!width=6%|Ano',
      '!width=11%|Org.',
      '!width=18%|Campeão',
      '|-',
      '|1983 <br /> <ref>{{Citar web|url=https://x}}</ref>',
      '|[[Federação Gaúcha de Futebol|FGF]]',
      "|'''{{Futebol Internacional Feminino|cidade=antes}}''' <small>(1)</small>",
      '|}',
    ].join('\n');
    expect(mod.parseChampionEditions(wt)).toEqual([
      { year: 1983, link: null, template: 'Futebol Internacional Feminino' },
    ]);
  });

  it('Paranaense: tooltip + rowspan carrega o campeão para a linha sem célula', async () => {
    const mod = await import('../../../src/modules/etl/connectors/wikipedia-women-br.connector.js');
    const wt = [
      '== Campeãs ==',
      '{| class="wikitable"',
      '! Edição',
      '! Ano',
      '! Campeão',
      '! Vice',
      '|-',
      '| 1ª',
      '| 1995<ref name=":0">{{citar web|url=https://x}}</ref>',
      "| [[Ficheiro:b.png|30x27px]] <br> '''{{tooltip|União Ahú|União Ahú Futebol Clube}}'''",
      '| [[Ficheiro:c.png|30x27px]] <br> Cianorte',
      '|-',
      '| 2ª',
      '| 1996',
      '|-',
      '| 3ª',
      '| 1997',
      "| '''{{Futebol Foz Cataratas}}'''",
      '|}',
    ].join('\n');
    expect(mod.parseChampionEditions(wt)).toEqual([
      { year: 1995, link: 'União Ahú Futebol Clube', template: null },
      // 1996: rowspan do campeão anterior (célula ausente) — carregado
      { year: 1996, link: 'União Ahú Futebol Clube', template: null },
      { year: 1997, link: null, template: 'Futebol Foz Cataratas' },
    ]);
  });
});

describe('T450 wave 10 — Sports table (WDL)', () => {
  it('extrai win/draw/loss/gf/ga por código, computa pontos e ordena', async () => {
    const mod = await import(
      '../../../src/modules/etl/connectors/wikipedia-women-br.connector.js'
    );
    const wt = [
      '{{#invoke:Sports table|main|style=WDL',
      '|team1=JUV |team2=PLA',
      '|win_JUV=11 |draw_JUV=1 |loss_JUV=2 |gf_JUV=28 |ga_JUV=7',
      '|win_PLA=10 |draw_PLA=3 |loss_PLA=1 |gf_PLA=28 |ga_PLA=7',
      '|name_JUV={{Futebol Juventude Feminino}}',
      '|name_PLA={{Futebol Palmeiras Feminino}}',
      '}}',
    ].join('\n');
    const block = mod.extractSportsTableBlock(wt)!;
    const rows = mod.parseSportsTable(block);
    expect(rows).toHaveLength(2);
    expect(rows[0]!.template).toBe('Futebol Juventude Feminino');
    expect(rows[0]!.points).toBe(34); // 11*3+1
    expect(rows[0]!.won).toBe(11);
    expect(rows[1]!.template).toBe('Futebol Palmeiras Feminino');
    expect(rows[1]!.points).toBe(33); // 10*3+3
  });
});
