import { describe, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import {
  parseStandings,
  parseCupPlacements,
  splitTables,
} from '../../../src/lib/wikipedia/standings-parser.js';
const DIR = 'C:/Users/edina/AppData/Local/Temp/wiki517/t517';
describe('TMP t517 discovery', () => {
  it('clubes/seleções únicos por competição', () => {
    const files = readdirSync(DIR).filter((f) => /^(wc|ca|eu|olym|olyf)_\d{4}\.json$/.test(f));
    const by: Record<string, Set<string>> = {
      wc: new Set(),
      ca: new Set(),
      eu: new Set(),
      oly: new Set(),
    };
    for (const f of files) {
      const key = f.startsWith('wc')
        ? 'wc'
        : f.startsWith('ca')
          ? 'ca'
          : f.startsWith('eu')
            ? 'eu'
            : 'oly';
      const j = JSON.parse(readFileSync(join(DIR, f), 'utf8')) as {
        parse?: { text?: { '*': string } };
      };
      const html = j.parse?.text?.['*'] ?? '';
      let n = 0;
      for (const t of splitTables(html))
        for (const r of parseStandings(t, { minRows: 4 }))
          if (r.clubArticle) {
            by[key].add(r.clubArticle);
            n++;
          }
      const p = parseCupPlacements(html);
      for (const a of [p.championArticle, p.runnerUpArticle]) if (a) by[key].add(a);

      console.log(`${f}: linhas=${n} campeao=${p.champion ?? '?'}`);
    }
    for (const [k, set] of Object.entries(by)) {
      console.log(`\n### ${k} (${set.size})`);

      console.log([...set].sort().join('\n'));
    }
  });
});
