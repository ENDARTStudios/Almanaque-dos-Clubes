/**
 * T450 wave 6b — ordinais '!N' header-styled do Carioca: são células da coluna
 * Edição (abrem linha de dados), não headers.
 */
import { describe, expect, it } from 'vitest';

describe('T450 wave 6b — ordinais !N do Carioca', () => {
  it('!N abre linha de dados; campeão no offset relativo correto', async () => {
    const mod = await import('../../../src/modules/etl/connectors/wikipedia-women-br.connector.js');
    const wt = [
      '== Edições ==',
      '{| class="toccolours" border="1"',
      '|- style="background: #C1D8FF;"',
      '!width=5%|Edição',
      '!width=5%|Ano',
      '!width=15%|Campeão',
      '!width=10%|Placar(es)',
      '!width=15%|Vice',
      '|-',
      '!1',
      "|'''1983'''<br />''[[Campeonato Carioca de Futebol Feminino de 1983|Detalhes]]''",
      "|[[imagem:x.svg|30px]]<br />'''[[Esporte Clube Radar|Radar]]'''",
      "|'''1 – 0'''",
      '|[[imagem:x.svg]]<br />[[Bangu Atlético Clube|Bangu]]',
      '|-',
      '!2',
      "|'''1984'''<br />''[[Campeonato Carioca de Futebol Feminino de 1984|Detalhes]]''",
      "|{{BR-RJ-Riob|30x27px}}<br />'''{{Futebol Flamengo Feminino}}'''",
      '|}',
    ].join('\n');
    expect(mod.parseChampionEditions(wt)).toEqual([
      { year: 1983, link: 'Esporte Clube Radar', template: null },
      { year: 1984, link: null, template: 'Futebol Flamengo Feminino' },
    ]);
  });
});
