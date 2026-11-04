/**
 * T-24/28 — o registry precisa cobrir os 12 domínios pedidos, sem id duplicado e
 * com uma função `run` real em cada entrada (nada de casca vazia).
 */
import { describe, expect, it } from 'vitest';
import { BOTS, botIds, getBot } from '../../src/modules/bots/registry.js';

const DOMAINS = [
  'players',
  'clubs',
  'matches',
  'geo',
  'history',
  'charts',
  'seasons',
  'stadiums',
  'rankings',
  'comparison',
  'tables',
  'competitions',
] as const;

describe('registry de bots', () => {
  it('tem exatamente 12 bots e cobre os 12 domínios', () => {
    expect(BOTS).toHaveLength(12);
    expect(new Set(BOTS.map((b) => b.domain))).toEqual(new Set(DOMAINS));
  });

  it('ids únicos e função run em todos', () => {
    const ids = botIds();
    expect(new Set(ids).size).toBe(ids.length);
    for (const bot of BOTS) {
      expect(typeof bot.run).toBe('function');
      expect(bot.label.length).toBeGreaterThan(0);
    }
  });

  it('getBot resolve id existente e devolve undefined para inexistente', () => {
    expect(getBot('players')?.domain).toBe('players');
    expect(getBot('nao-existe')).toBeUndefined();
  });
});
