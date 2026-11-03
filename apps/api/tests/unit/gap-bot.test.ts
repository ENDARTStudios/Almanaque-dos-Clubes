/**
 * T600 — gap-bot: plano de execução e registro de dimensões (puros).
 *
 * O que os testes travam:
 *  1. dimensão SEM bot NUNCA entra no plano (não se promete cobertura que não existe);
 *  2. dimensão sem pendência não entra (não se queima orçamento à toa);
 *  3. a ordem é a do registro — `scorers` primeiro, porque é o que destrava o
 *     ranking de jogador;
 *  4. `--run` com chave desconhecida falha alto em vez de rodar nada em silêncio.
 */
import { describe, it, expect } from 'vitest';
import { GAP_DIMENSIONS, buildGapPlan, dimensionsWithoutBot } from '../../src/scripts/gap-bot.js';

const pendente = {
  scorers: 100,
  crest: 50,
  coords: 10,
  'club-media': 5,
  'club-editorial': 0,
  'club-details': 0,
  'player-media': 7,
  'player-profile': 3,
};

describe('gap-bot — registro de dimensões', () => {
  it('declara `scorers` como dimensão sem bot (lacuna escrita)', () => {
    const semBot = dimensionsWithoutBot();
    expect(semBot.map((d) => d.key)).toContain('scorers');
    expect(semBot[0].reason).toBeTruthy();
  });

  it('toda dimensão com bot aponta para um script .js do dist', () => {
    for (const d of GAP_DIMENSIONS) {
      if (d.bot) expect(d.bot.script.endsWith('.js')).toBe(true);
    }
  });
});

describe('gap-bot — buildGapPlan', () => {
  it('nunca inclui dimensão sem bot, nem dimensão sem pendência', () => {
    const plano = buildGapPlan(pendente);
    const chaves = plano.map((d) => d.key);
    expect(chaves).not.toContain('scorers'); // sem bot
    expect(chaves).not.toContain('club-editorial'); // zero pendente
    expect(chaves).toContain('crest');
    expect(chaves).toContain('player-profile');
  });

  it('preserva a ordem de prioridade do registro', () => {
    const chaves = buildGapPlan(pendente).map((d) => d.key);
    expect(chaves[0]).toBe('crest'); // scorers (1º do registro) não tem bot
    expect(chaves.indexOf('player-profile')).toBeGreaterThan(chaves.indexOf('crest'));
  });

  it('--run filtra uma dimensão com bot', () => {
    const plano = buildGapPlan(pendente, { only: 'coords' });
    expect(plano).toHaveLength(1);
    expect(plano[0].key).toBe('coords');
  });

  it('--run de dimensão SEM bot (scorers) falha alto', () => {
    expect(() => buildGapPlan(pendente, { only: 'scorers' })).toThrow(/--run inválido/);
  });

  it('inventário vazio não gera plano', () => {
    expect(buildGapPlan({})).toHaveLength(0);
  });

  it('--all não força dimensão sem pendência', () => {
    const chaves = buildGapPlan(pendente, { all: true }).map((d) => d.key);
    expect(chaves).not.toContain('club-editorial');
  });
});
