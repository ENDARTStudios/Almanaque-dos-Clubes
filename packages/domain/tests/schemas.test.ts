import { describe, it, expect } from 'vitest';
import { CreateClubSchema, CreatePlayerSchema, CreateCompetitionSchema } from '../src/index.js';

describe('Domain Schemas', () => {
  it('CreateClubSchema valida clube válido', () => {
    const result = CreateClubSchema.parse({ name: 'Flamengo', country: 'BR' });
    expect(result.name).toBe('Flamengo');
    expect(result.status).toBe('ACTIVE');
  });

  it('CreateClubSchema rejeita name curto', () => {
    expect(() => CreateClubSchema.parse({ name: 'A' })).toThrow();
  });

  it('CreatePlayerSchema valida jogador', () => {
    const result = CreatePlayerSchema.parse({ fullName: 'Pelé', country: 'BR' });
    expect(result.fullName).toBe('Pelé');
  });

  it('CreateCompetitionSchema valida competição', () => {
    const result = CreateCompetitionSchema.parse({ name: 'Brasileirão', country: 'BR' });
    expect(result.name).toBe('Brasileirão');
  });
});
