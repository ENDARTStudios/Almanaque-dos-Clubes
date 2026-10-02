/**
 * T448b-2i — Unit: alinhamento 1:1 das constantes de acentos (o bug ç→u
 * só apareceu em integração com ç; este teste trava a invariante aqui).
 */
import { describe, it, expect } from 'vitest';
import { ACCENTED, PLAIN } from '../../../src/lib/search.js';

const EXPECTED: Array<[string, string]> = [
  ['á', 'a'],
  ['à', 'a'],
  ['â', 'a'],
  ['ã', 'a'],
  ['ä', 'a'],
  ['é', 'e'],
  ['è', 'e'],
  ['ê', 'e'],
  ['ë', 'e'],
  ['í', 'i'],
  ['ï', 'i'],
  ['ó', 'o'],
  ['ô', 'o'],
  ['õ', 'o'],
  ['ö', 'o'],
  ['ú', 'u'],
  ['ü', 'u'],
  ['ç', 'c'],
  ['ñ', 'n'],
  ['Á', 'A'],
  ['À', 'A'],
  ['Â', 'A'],
  ['Ã', 'A'],
  ['Ä', 'A'],
  ['É', 'E'],
  ['È', 'E'],
  ['Ê', 'E'],
  ['Ë', 'E'],
  ['Í', 'I'],
  ['Ï', 'I'],
  ['Ó', 'O'],
  ['Ô', 'O'],
  ['Õ', 'O'],
  ['Ö', 'O'],
  ['Ú', 'U'],
  ['Ü', 'U'],
  ['Ç', 'C'],
  ['Ñ', 'N'],
];

describe('T448b-2i — constantes de transliteração', () => {
  it('ACCENTED e PLAIN têm o MESMO comprimento', () => {
    expect([...ACCENTED].length).toBe([...PLAIN].length);
  });

  it.each(EXPECTED)('%s → %s (posição 1:1)', (accented, plain) => {
    const i = [...ACCENTED].indexOf(accented);
    expect(i).toBeGreaterThanOrEqual(0);
    expect([...PLAIN][i]).toBe(plain);
  });

  it('nenhum char PLAIN é acentuado', () => {
    for (const p of [...PLAIN]) {
      expect(EXPECTED.map(([a]) => a)).not.toContain(p);
    }
  });
});
