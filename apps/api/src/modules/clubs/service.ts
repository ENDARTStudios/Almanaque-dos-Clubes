/**
 * Camada de serviço — regras de negócio.
 * Não conhece Fastify; recebe e retorna entidades de domínio.
 */
import {
  CreateClubSchema,
  ConflictError,
  type Club,
  type CreateClubInput,
} from '@almanaque/domain';
import {
  CityIndex,
  CountryIndex,
  clubsRepository,
  type ClubGeoView,
  type ClubTitleView,
  type GeoStats,
  type ListClubsParams,
  type StateIndex,
} from './repository.js';
import { cache } from '../../services/cache.js';
import { decideClubUniqueness } from './club-uniqueness.js';

const CLUBS_LIST_TTL_SECONDS = 60;
const CLUBS_BY_ID_TTL_SECONDS = 300;

function listCacheKey(params: ListClubsParams): string {
  return `clubs:list:${JSON.stringify(params)}`;
}

export const clubsService = {
  async create(input: unknown): Promise<Club> {
    // 1. Validação de entrada (Zod)
    const parsed = CreateClubSchema.parse(input);

    // 2. Regra de negócio (T448b-2f): unicidade CONTEXTUAL — bloqueia só duplicata
    //    EXATA (name+country+state+city); permite homônimos nacionais legítimos
    //    (ex.: Vila Nova/GO vs /RN). Identidade canônica = QID.
    const candidates = await clubsRepository.listActiveForDedup(parsed.country ?? null);
    const verdict = decideClubUniqueness(
      { name: parsed.name, country: parsed.country, state: parsed.state, city: parsed.city },
      candidates,
    );
    if (verdict.decision === 'block') {
      throw new ConflictError(
        `Já existe um clube com o mesmo nome/país/estado/cidade (id ${verdict.conflictingClubId}).`,
      );
    }
    if (verdict.decision === 'ambiguous') {
      console.warn(
        `[clubs.create] possível duplicata ambígua (id ${verdict.conflictingClubId}) — permitido, revisar.`,
      );
    }

    // 3. Persistência
    const club = await clubsRepository.create({
      name: parsed.name,
      fullName: parsed.fullName ?? null,
      shortName: parsed.shortName ?? null,
      city: parsed.city ?? null,
      state: parsed.state ?? null,
      country: parsed.country ?? null,
      foundedYear: parsed.foundedYear ?? null,
      status: parsed.status,
      primaryColor: parsed.primaryColor ?? null,
      website: parsed.website ?? null,
      qid: parsed.qid ?? null,
      importedFrom: parsed.importedFrom ?? null,
      latitude: parsed.latitude ?? null,
      longitude: parsed.longitude ?? null,
      importedAt: null,
    });

    // 4. Invalida cache de listagens (escrita invalida — item 6.3)
    await cache.invalidate('clubs:list:*');
    return club;
  },

  async list(
    params: ListClubsParams,
  ): Promise<{ data: Club[]; total: number; limit: number; offset: number }> {
    return cache.remember(listCacheKey(params), CLUBS_LIST_TTL_SECONDS, async () => {
      const [data, total] = await Promise.all([
        clubsRepository.findMany(params),
        clubsRepository.count(params),
      ]);
      return {
        data,
        total,
        limit: params.limit ?? 50,
        offset: params.offset ?? 0,
      };
    });
  },

  async getById(id: string): Promise<Club | null> {
    return cache.remember(`clubs:byId:${id}`, CLUBS_BY_ID_TTL_SECONDS, () =>
      clubsRepository.findById(id),
    );
  },

  /**
   * T467 — agregação por região (COUNT real) para o mapa. Cache read-through
   * curto; leitura derivada do banco (não é fonte de terceiro).
   */
  async geoStats(): Promise<GeoStats> {
    return cache.remember('clubs:geo-stats', CLUBS_LIST_TTL_SECONDS, () =>
      clubsRepository.geoStats(),
    );
  },

  /** T466 — geografia resolvida (país/estado/cidade + coordenadas) para o mapa T467. */
  async geo(id: string): Promise<ClubGeoView | null> {
    return cache.remember(`clubs:geo:${id}`, CLUBS_BY_ID_TTL_SECONDS, () =>
      clubsRepository.findGeoById(id),
    );
  },

  /**
   * T3 — índice de ESTADOS do país (nível intermediário da hierarquia de `/clubs`).
   *
   * Mesmo TTL da lista: o índice muda quando um clube entra ou muda de estado, não a cada
   * requisição. `withCity` por estado vem junto porque é ele que decide, com número, se o
   * terceiro nível da tela tem dado para abrir.
   */
  async stateIndex(country: string): Promise<StateIndex> {
    const iso = country.toUpperCase();
    return cache.remember(`clubs:state-index:${iso}`, CLUBS_LIST_TTL_SECONDS, () =>
      clubsRepository.stateIndex(iso),
    );
  },

  /**
   * Cidades de um país — segundo nível do agrupamento de `/clubs`.
   *
   * Devolve também `totals.withoutCity`. A tela usa isso para DECLARAR a lacuna: o campo `city`
   * cobre 93% na Alemanha e 26% na Suécia (medido), então uma lista curta de cidades não
   * significa acervo pequeno — significa dado faltando.
   */
  async cityIndex(country: string, stateId?: string): Promise<CityIndex> {
    const iso = country.toUpperCase();
    /* Chave de cache inclui o estado: sem isso, pedir as cidades de SP devolveria o cache das
       cidades do país inteiro — resposta errada com aparência de certa. */
    const chave = stateId ? `clubs:city-index:${iso}:${stateId}` : `clubs:city-index:${iso}`;
    return cache.remember(chave, CLUBS_LIST_TTL_SECONDS, () =>
      clubsRepository.cityIndex(iso, stateId),
    );
  },

  /**
   * Índice de países para o AGRUPAMENTO da página `/clubs`.
   *
   * NÃO reaproveita `geoStats` de propósito: aquele agrupa por `countryId` (FK, 32% dos clubes)
   * e este agrupa por `country` (ISO2, 96%) — a MESMA coluna do filtro público. Usar o
   * `geoStats` daria um índice cujos números não batem com o resultado do clique.
   *
   * Mesmo TTL da lista: o índice muda quando um clube entra ou muda de país, não a cada request.
   */
  async countryIndex(): Promise<CountryIndex> {
    return cache.remember('clubs:country-index', CLUBS_LIST_TTL_SECONDS, () =>
      clubsRepository.countryIndex(),
    );
  },

  /**
   * T448 — Galeria de honra do clube (arestas WON do KnowledgeGraph).
   * Lista vazia = ainda não há conquista auditável (honestidade 1.3).
   */
  async titles(id: string): Promise<ClubTitleView[]> {
    return cache.remember(`clubs:titles:${id}`, CLUBS_BY_ID_TTL_SECONDS, () =>
      clubsRepository.listTitlesByClub(id),
    );
  },
};

// Reexporta o schema para uso nos controllers
export { CreateClubSchema };
export type { CreateClubInput };
