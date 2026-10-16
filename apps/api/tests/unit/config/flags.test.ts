/**
 * T568 — o parser único de feature flags.
 *
 * O painel de diagnóstico achou o mesmo bug em três lugares: cada consumidor comparava a
 * variável do seu jeito, e `BIRTHDAY_GIFT_ENABLED='1'` fazia o job rodar sem conceder nada
 * (o boot aceitava '1', o gate do handler exigia 'true'). Estes casos travam a tolerância
 * e, principalmente, o que NÃO pode contar como ligado.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { envFlag } from '../../../src/config/flags.js';

const NOME = 'TESTE_FLAG_T568';
afterEach(() => {
  delete process.env[NOME];
});

describe('T568 — envFlag', () => {
  it('aceita as formas que as pessoas escrevem', () => {
    for (const v of ['1', 'true', 'TRUE', ' yes ', 'On', 'sim']) {
      process.env[NOME] = v;
      expect(envFlag(NOME), `valor ${JSON.stringify(v)}`).toBe(true);
    }
  });

  it('NÃO considera ligado o que é falso ou desconhecido', () => {
    for (const v of ['0', 'false', 'no', 'off', 'talvez']) {
      process.env[NOME] = v;
      expect(envFlag(NOME), `valor ${JSON.stringify(v)}`).toBe(false);
    }
  });

  it('vazio e ausente usam o padrão (e o padrão pode ser ligado)', () => {
    process.env[NOME] = '';
    expect(envFlag(NOME)).toBe(false);
    expect(envFlag(NOME, true)).toBe(true);
    delete process.env[NOME];
    expect(envFlag(NOME)).toBe(false);
    expect(envFlag(NOME, true)).toBe(true);
  });
});
