import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// T442 — o update do usuário agora roda dentro de withRlsContext (transação):
// o mock repassa $transaction para o próprio mock (o set_config de
// rls-context cai no $executeRawUnsafe do tx mockado, que é no-op).
const mocks = vi.hoisted(() => ({
  txUserUpdate: vi.fn().mockResolvedValue({ id: 'user-1' }),
}));
vi.mock('../../../src/config/prisma.js', () => ({
  prisma: {
    user: { update: vi.fn().mockResolvedValue({ id: 'user-1' }) },
    $transaction: async (fn: (t: unknown) => Promise<unknown>) =>
      fn({
        user: { update: mocks.txUserUpdate },
        $executeRawUnsafe: vi.fn().mockResolvedValue(0),
      }),
  },
}));

import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  VERIFICATION_TOKEN_TTL_MS,
  VERIFICATION_COOLDOWN_MS,
} from '../../../src/modules/auth/email-verification.service.js';

describe('EmailVerificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('gera token que consome com hash e single-use', async () => {
    const token = await createEmailVerificationToken('user-a');
    expect(token).toBeTruthy();

    const userId = await consumeEmailVerificationToken(token!);
    expect(userId).toBe('user-a');
    expect(mocks.txUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-a' },
      data: { emailVerified: expect.any(Date) },
    });

    await expect(consumeEmailVerificationToken(token!)).resolves.toBeNull();
  });

  it('revoga token anterior do mesmo usuário após o cooldown', async () => {
    vi.useFakeTimers();
    const first = await createEmailVerificationToken('user-b');
    expect(first).toBeTruthy();

    vi.advanceTimersByTime(VERIFICATION_COOLDOWN_MS + 1);
    const second = await createEmailVerificationToken('user-b');
    expect(second).toBeTruthy();
    expect(second).not.toBe(first);

    await expect(consumeEmailVerificationToken(first!)).resolves.toBeNull();
  });

  it('aplica cooldown entre emissões para o mesmo usuário', async () => {
    const first = await createEmailVerificationToken('user-c');
    expect(first).toBeTruthy();

    const second = await createEmailVerificationToken('user-c');
    expect(second).toBeNull();
  });

  it('rejeita token inexistente', async () => {
    await expect(consumeEmailVerificationToken('token-inexistente')).resolves.toBeNull();
  });

  it('rejeita token expirado (TTL)', async () => {
    vi.useFakeTimers();
    const token = await createEmailVerificationToken('user-d');
    expect(token).toBeTruthy();

    vi.advanceTimersByTime(VERIFICATION_TOKEN_TTL_MS + 1);
    await expect(consumeEmailVerificationToken(token!)).resolves.toBeNull();
  });
});
