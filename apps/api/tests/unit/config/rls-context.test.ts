import { describe, it, expect, vi, beforeEach } from 'vitest';

const execUnsafe = vi.fn();
const tx = { $executeRawUnsafe: execUnsafe, $queryRawUnsafe: vi.fn() };

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
  },
}));

import { withRlsContext } from '../../../src/config/rls-context.js';

describe('withRlsContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    execUnsafe.mockResolvedValue(1);
  });

  it('seta app.current_user_id e app.current_user_role com is_local=true', async () => {
    const result = await withRlsContext({ userId: 'u1', role: 'USER' }, async () => 'ok');

    expect(result).toBe('ok');
    expect(execUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_id', $1, true)`,
      'u1',
    );
    expect(execUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_role', $1, true)`,
      'USER',
    );
  });

  it('omite contexto ausente e apenas executa o callback', async () => {
    const result = await withRlsContext({}, async () => 42);

    expect(result).toBe(42);
    expect(execUnsafe).not.toHaveBeenCalled();
  });

  it('suporta role SERVICE isolada (webhooks/jobs)', async () => {
    await withRlsContext({ role: 'SERVICE' }, async () => undefined);

    expect(execUnsafe).toHaveBeenCalledTimes(1);
    expect(execUnsafe).toHaveBeenCalledWith(
      `SELECT set_config('app.current_user_role', $1, true)`,
      'SERVICE',
    );
  });

  it('propaga erro do callback', async () => {
    await expect(
      withRlsContext({ userId: 'u1' }, async () => {
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
  });
});
