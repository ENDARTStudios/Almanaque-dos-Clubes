import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../../../src/config/prisma.js', () => ({
  prisma: { user: { update: vi.fn().mockResolvedValue({ id: 'user-1' }) } },
}));

import { prisma } from '../../../src/config/prisma.js';
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
    expect(prisma.user.update).toHaveBeenCalledWith({
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
