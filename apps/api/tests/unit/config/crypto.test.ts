import { describe, it, expect } from 'vitest';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  hashToken,
  verifyToken,
} from '../../../src/config/crypto.js';

describe('Crypto', () => {
  it('hashPassword gera hash argon2id', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    expect(hash).toContain('$argon2id$');
  });

  it('verifyPassword valida hash correto', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    const valid = await verifyPassword('Str0ng!Pass', hash);
    expect(valid).toBe(true);
  });

  it('verifyPassword rejeita senha errada', async () => {
    const hash = await hashPassword('Str0ng!Pass');
    const valid = await verifyPassword('WrongPass', hash);
    expect(valid).toBe(false);
  });

  it('generateToken gera string base64url', () => {
    const token = generateToken();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });

  it('hashToken gera hash SHA-256', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifyToken valida timing-safe', () => {
    const token = generateToken();
    const hash = hashToken(token);
    expect(verifyToken(token, hash)).toBe(true);
    expect(verifyToken('wrong-token', hash)).toBe(false);
  });
});
