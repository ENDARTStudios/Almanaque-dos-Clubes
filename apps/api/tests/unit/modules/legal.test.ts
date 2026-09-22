import { describe, it, expect } from 'vitest';
import {
  CreateRightsRequestSchema,
  DeleteAccountSchema,
  CreateNoticeSchema,
  CounterNoticeSchema,
  sanitizeText,
  DELETE_CONFIRMATION,
} from '../../../src/modules/legal/schema.js';
import { deadlineFor } from '../../../src/modules/legal/service.js';

// T470 — unit: validação Zod, prazo BR/EEA_UK, sanitização e confirmação destrutiva.

describe('CreateRightsRequestSchema', () => {
  it('aceita tipo válido e aplica default BR', () => {
    const parsed = CreateRightsRequestSchema.parse({ type: 'confirmation_access' });
    expect(parsed.jurisdiction).toBe('BR');
  });
  it('rejeita tipo/jurisdição/requestedFields inválidos', () => {
    expect(CreateRightsRequestSchema.safeParse({ type: 'nope' }).success).toBe(false);
    expect(
      CreateRightsRequestSchema.safeParse({ type: 'correction', jurisdiction: 'MARS' }).success,
    ).toBe(false);
    expect(
      CreateRightsRequestSchema.safeParse({ type: 'correction', requestedFields: ['x'] }).success,
    ).toBe(false);
  });
});

describe('deadlineFor', () => {
  it('BR = 15 dias; EEA_UK/OTHER = 30 dias', () => {
    const now = new Date('2026-09-22T00:00:00Z');
    const br = deadlineFor('BR', now);
    const eu = deadlineFor('EEA_UK', now);
    expect(Math.round((br.getTime() - now.getTime()) / 86400000)).toBe(15);
    expect(Math.round((eu.getTime() - now.getTime()) / 86400000)).toBe(30);
    expect(deadlineFor('OTHER', now).getTime()).toBe(eu.getTime());
  });
});

describe('sanitizeText', () => {
  it('remove controles, colapsa espaços, trima e limita; vazio → null', () => {
    expect(sanitizeText('  olá\u0000  mundo  ')).toBe('olá mundo');
    expect(sanitizeText('')).toBeNull();
    expect(sanitizeText(undefined)).toBeNull();
    expect(sanitizeText('x'.repeat(50), 10)?.length).toBe(10);
  });
});

describe('DeleteAccountSchema', () => {
  it('exige a string exata de confirmação e senha', () => {
    expect(DeleteAccountSchema.safeParse({ confirmation: 'apagar', password: 'x' }).success).toBe(
      false,
    );
    expect(DeleteAccountSchema.safeParse({ confirmation: DELETE_CONFIRMATION }).success).toBe(
      false,
    );
    expect(
      DeleteAccountSchema.safeParse({ confirmation: DELETE_CONFIRMATION, password: 'segredo' })
        .success,
    ).toBe(true);
  });
});

describe('notificação autoral — declarações obrigatórias (literal true)', () => {
  it('exige goodFaith/accuracy = true e URL de material válida', () => {
    const base = {
      workTitle: 'Obra',
      materialUrl: 'https://exemplo.com/material',
      description: 'Descrição suficientemente longa.',
      signatureText: 'Fulano',
    };
    expect(
      CreateNoticeSchema.safeParse({
        ...base,
        goodFaithDeclaration: false,
        accuracyDeclaration: true,
      }).success,
    ).toBe(false);
    expect(
      CreateNoticeSchema.safeParse({
        ...base,
        goodFaithDeclaration: true,
        accuracyDeclaration: true,
      }).success,
    ).toBe(true);
    expect(
      CounterNoticeSchema.safeParse({
        ...base,
        goodFaithDeclaration: true,
        accuracyDeclaration: true,
      }).success,
    ).toBe(true);
  });
});
