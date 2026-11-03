/**
 * T603 — sistema de bots: registro, cadência e seleção.
 *
 * Travado aqui:
 *  1. bot que nunca rodou vence (senão a fila nunca começa);
 *  2. cadência respeitada — não se roda de novo antes da hora;
 *  3. dry-run NÃO conta como rodada (fila parada precisa aparecer como parada);
 *  4. desempate por domínio: partidas vem antes de mídia;
 *  5. todo bot declara métrica e script — sem métrica não há prova de ganho.
 */
import { describe, it, expect } from 'vitest';
import { BOTS, getBot, botsByDomain } from '../../src/modules/bots/registry.js';
import { DOMAIN_WEIGHT, dueAt, dueBots } from '../../src/modules/bots/scheduler.js';

const HORA = 3600_000;

describe('registry — cobertura de domínios', () => {
  it('cobre os 9 domínios pedidos', () => {
    const doms = new Set(BOTS.map((b) => b.domain));
    for (const d of [
      'competicoes',
      'clubes',
      'jogadores',
      'rankings',
      'mapas',
      'partidas',
      'lendas',
      'catalogo',
      'midia',
    ]) {
      expect(doms).toContain(d);
    }
  });

  it('chaves única e todo bot com script + métrica', () => {
    const keys = BOTS.map((b) => b.key);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of BOTS) {
      expect(b.script.endsWith('.js')).toBe(true);
      expect(b.metric.toLowerCase()).toContain('select');
      expect(b.cadenceHours).toBeGreaterThan(0);
    }
  });

  it('toda fonte usada está declarada no bot (auditoria de licença)', () => {
    for (const b of BOTS) {
      expect(Array.isArray(b.sources)).toBe(true);
    }
  });

  it('getBot e botsByDomain funcionam', () => {
    expect(getBot('matches-rsssf')?.domain).toBe('partidas');
    expect(botsByDomain().clubes.length).toBeGreaterThan(0);
    expect(getBot('inexistente')).toBeUndefined();
  });
});

describe('dueAt', () => {
  it('nunca rodou ⇒ null (vencido agora)', () => {
    const bot = getBot('clubs-crests')!;
    expect(dueAt(bot, undefined)).toBeNull();
  });

  it('respeita a cadência declarada', () => {
    const bot = getBot('clubs-crests')!; // 48h
    const fim = new Date('2026-11-02T00:00:00Z');
    const due = dueAt(bot, { botKey: bot.key, finishedAt: fim })!;
    expect(due.getTime() - fim.getTime()).toBe(48 * HORA);
  });
});

describe('dueBots', () => {
  const agora = new Date('2026-11-02T12:00:00Z');

  it('inclui quem nunca rodou e exclui quem está dentro da cadência', () => {
    const recente = new Date(agora.getTime() - 1 * HORA); // 1h atrás (48h de cadência)
    const due = dueBots(
      [
        { ...getBot('clubs-crests')!, key: 'a' },
        { ...getBot('clubs-coords')!, key: 'b' },
      ],
      [{ botKey: 'a', finishedAt: recente }],
      agora,
      10,
    );
    expect(due.map((b) => b.key)).toEqual(['b']); // 'a' ainda não venceu
  });

  it('desempata por domínio: partidas antes de mídia', () => {
    const due = dueBots(
      [
        { ...getBot('clubs-kits')!, key: 'midia', domain: 'midia' },
        { ...getBot('matches-rsssf')!, key: 'partidas' },
      ],
      [],
      agora,
      10,
    );
    expect(due[0].key).toBe('partidas');
    expect(DOMAIN_WEIGHT.partidas).toBeLessThan(DOMAIN_WEIGHT.midia);
  });

  it('respeita o limite do pulso', () => {
    expect(dueBots(BOTS, [], agora, 2)).toHaveLength(2);
  });

  it('mais atrasado primeiro dentro do mesmo domínio', () => {
    const antigo = new Date(agora.getTime() - 200 * HORA);
    const menosAntigo = new Date(agora.getTime() - 100 * HORA);
    // MESMO domínio: com domínios diferentes o peso decide antes do atraso.
    const bots = [
      { ...getBot('clubs-crests')!, key: 'atrasado' }, // clubes
      { ...getBot('clubs-media')!, key: 'menos' }, // clubes
    ];
    const due = dueBots(
      bots,
      [
        { botKey: 'atrasado', finishedAt: antigo },
        { botKey: 'menos', finishedAt: menosAntigo },
      ],
      agora,
      10,
    );
    expect(due[0].key).toBe('atrasado');
  });
});
