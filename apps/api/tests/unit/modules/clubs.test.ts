import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clubsService } from '../../../src/modules/clubs/service.js';
import * as repository from '../../../src/modules/clubs/repository.js';

vi.mock('../../../src/modules/clubs/repository.js', () => ({
  clubsRepository: {
    existsByName: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    findById: vi.fn(),
  },
}));

describe('ClubsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('create rejeita payload vazio', async () => {
    await expect(clubsService.create({})).rejects.toThrow();
  });

  it('create rejeita name muito curto', async () => {
    await expect(clubsService.create({ name: 'A' })).rejects.toThrow();
  });

  it('create rejeita clube duplicado', async () => {
    vi.mocked(repository.clubsRepository.existsByName).mockResolvedValue(true);
    await expect(clubsService.create({ name: 'Flamengo', country: 'BR' })).rejects.toThrow(
      'Já existe',
    );
  });

  it('create cria clube válido', async () => {
    vi.mocked(repository.clubsRepository.existsByName).mockResolvedValue(false);
    vi.mocked(repository.clubsRepository.create).mockResolvedValue({
      id: 'uuid',
      name: 'Flamengo',
      fullName: null,
      shortName: null,
      city: null,
      state: null,
      country: 'BR',
      foundedYear: null,
      status: 'ACTIVE',
      primaryColor: null,
      website: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const club = await clubsService.create({ name: 'Flamengo', country: 'BR' });
    expect(club.name).toBe('Flamengo');
  });

  it('getById retorna null para ID inexistente', async () => {
    vi.mocked(repository.clubsRepository.findById).mockResolvedValue(null);
    const club = await clubsService.getById('nonexistent');
    expect(club).toBeNull();
  });
});
