// UML — Almanaque dos Clubes v1.0
// Diagrama de Classes e Sequência
// Depende de: PRD (aprovado) · RBAC (aprovado)
// Próximo artefato: Arquitetura Modular + Feature Flags
// Tipos importados de rbac-matrix.ts e season.ts (fontes únicas de verdade)

import { Role, Plan } from './rbac-matrix.js';
import type { SeasonStatus } from './season.js';

// ─────────────────────────────────────────────────────────────
// ENUMS (<<enumeration>>)
// ─────────────────────────────────────────────────────────────

export const SubStatus = {
  ACTIVE: 'active',
  PAST_DUE: 'past_due',
  CANCELED: 'canceled',
  TRIALING: 'trialing',
  INCOMPLETE: 'incomplete',
} as const;
export type SubStatus = (typeof SubStatus)[keyof typeof SubStatus];

export const BillingStatus = {
  PENDING: 'pending',
  PAID: 'paid',
  FAILED: 'failed',
  REFUNDED: 'refunded',
} as const;
export type BillingStatus = (typeof BillingStatus)[keyof typeof BillingStatus];

export const DataQuality = {
  INCOMPLETE: 'incomplete',
  COMPLETE: 'complete',
  VERIFIED: 'verified',
} as const;
export type DataQuality = (typeof DataQuality)[keyof typeof DataQuality];

export const Position = {
  GOALKEEPER: 'goalkeeper',
  DEFENDER: 'defender',
  MIDFIELDER: 'midfielder',
  FORWARD: 'forward',
} as const;
export type Position = (typeof Position)[keyof typeof Position];

export const CompType = {
  LEAGUE: 'league',
  CUP: 'cup',
  SUPERCUP: 'supercup',
  TOURNAMENT: 'tournament',
  QUALIFIER: 'qualifier',
  FRIENDLY: 'friendly',
} as const;
export type CompType = (typeof CompType)[keyof typeof CompType];

// SeasonStatus — importado de season.ts (fonte única; PLANNED|ONGOING|FINISHED)

export const MatchStage = {
  GROUP: 'group',
  ROUND_32: 'round_32',
  ROUND_16: 'round_16',
  QUARTERFINAL: 'quarterfinal',
  SEMIFINAL: 'semifinal',
  FINAL: 'final',
} as const;
export type MatchStage = (typeof MatchStage)[keyof typeof MatchStage];

export const RankingType = {
  CLUB_SCORE: 'club_score',
  PLAYER_SCORE: 'player_score',
  ELO: 'elo',
  DOMINANCE_INDEX: 'dominance_index',
} as const;
export type RankingType = (typeof RankingType)[keyof typeof RankingType];

export const StickerRarity = {
  COMMON: 'common',
  RARE: 'rare',
  EXCLUSIVE: 'exclusive',
  SECRET: 'secret',
} as const;
export type StickerRarity = (typeof StickerRarity)[keyof typeof StickerRarity];

export const StickerType = {
  CLUB: 'club',
  PLAYER: 'player',
  TROPHY: 'trophy',
  STADIUM: 'stadium',
  RIVALRY: 'rivalry',
  BADGE: 'badge',
} as const;
export type StickerType = (typeof StickerType)[keyof typeof StickerType];

export const EntityType = {
  CLUB: 'club',
  PLAYER: 'player',
  COMPETITION: 'competition',
  SEASON: 'season',
  STADIUM: 'stadium',
  ALBUM: 'album',
} as const;
export type EntityType = (typeof EntityType)[keyof typeof EntityType];

export const AuditResult = {
  SUCCESS: 'success',
  FAILURE: 'failure',
} as const;
export type AuditResult = (typeof AuditResult)[keyof typeof AuditResult];

export const PipelineStatus = {
  RUNNING: 'running',
  SUCCESS: 'success',
  PARTIAL: 'partial',
  FAILED: 'failed',
} as const;
export type PipelineStatus = (typeof PipelineStatus)[keyof typeof PipelineStatus];

// Nome localizado (JSONB em Prisma)
export interface LocalizedName {
  pt: string;
  en: string;
  [lang: string]: string;
}

// ─────────────────────────────────────────────────────────────
// DIAGRAMA DE CLASSES — Entidades de domínio
// ─────────────────────────────────────────────────────────────

// ── IDENTIDADE ──────────────────────────────────────────────

export interface UmlUser {
  id: string;
  email: string;
  passwordHash: string;
  role: Role; // <<enumeration>> user | admin
  plan: Plan; // <<enumeration>> free | pro | elite
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Session {
  id: string;
  userId: string;
  refreshTokenHash: string;
  ipAddress: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface ApiKey {
  id: string;
  userId: string;
  keyHash: string;
  label: string;
  dailyLimit: number; // ELITE: 1000 req/dia
  usageToday: number;
  usageResetDate: Date;
  isActive: boolean;
  createdAt: Date;
}

// ── ASSINATURA ──────────────────────────────────────────────

export interface Subscription {
  id: string;
  userId: string;
  plan: Plan;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: SubStatus;
  currentPeriodEnd: Date;
  createdAt: Date;
}

export interface Billing {
  id: string;
  subscriptionId: string;
  amountCents: number;
  currency: string;
  status: BillingStatus;
  stripePaymentIntentId: string;
  paidAt: Date | null;
}

// ── DOMÍNIO: CLUBES ─────────────────────────────────────────
// Club 1 --> 0..* ClubPlayer | Club 1 --> 0..1 Stadium | Club 1 --> 1 Country

export interface UmlClub {
  id: string;
  wikidataId: string;
  slug: string;
  name: LocalizedName;
  foundedYear: number;
  countryId: string;
  stadiumId: string | null;
  logoUrl: string | null;
  colors: string[];
  completenessScore: number; // 0..1
  dataQuality: DataQuality;
  updatedAt: Date;
}

export interface UmlPlayer {
  id: string;
  wikidataId: string;
  slug: string;
  name: LocalizedName;
  nationalities: string[];
  position: Position;
  birthDate: Date;
  photoUrl: string | null;
  completenessScore: number; // 0..1
}

export interface ClubPlayer {
  clubId: string;
  playerId: string;
  fromYear: number;
  toYear: number | null;
  isLegend: boolean;
  isCurrent: boolean;
}

export interface UmlStadium {
  id: string;
  wikidataId: string;
  slug: string;
  name: LocalizedName;
  capacity: number;
  builtYear: number;
  latitude: number;
  longitude: number;
  countryCode: string;
}

export interface Country {
  id: string;
  iso2: string;
  iso3: string;
  name: LocalizedName;
  flagUrl: string | null;
  confederation: string;
}

// ── DOMÍNIO: COMPETIÇÕES ────────────────────────────────────
// Competition 1 --> 0..* Season | Season 1 --> 0..* Match

export interface UmlCompetition {
  id: string;
  wikidataId: string;
  slug: string;
  name: LocalizedName;
  type: CompType;
  confederation: string;
  countryCodes: string[];
  tier: number;
  isActive: boolean;
}

// Season 0..1 --> 1 Club (campeão)
export interface UmlSeason {
  id: string;
  competitionId: string;
  year: string;
  championClubId: string | null;
  status: SeasonStatus;
}

// Match --> Club (home) | Match --> Club (away)
export interface UmlMatch {
  id: string;
  seasonId: string;
  homeClubId: string;
  awayClubId: string;
  homeScore: number;
  awayScore: number;
  matchDate: Date;
  stage: MatchStage;
}

// ── DOMÍNIO: RANKINGS ───────────────────────────────────────
// Ranking 1 --> 1..* RankingEntry

export interface UmlRanking {
  id: string;
  authorId: string; // User
  methodology: RankingType;
  name: LocalizedName;
  formula: Record<string, unknown>; // JSONB
  isPublished: boolean;
  isOfficial: boolean;
  publishedAt: Date | null;
}

export interface UmlRankingEntry {
  id: string;
  rankingId: string;
  clubId: string;
  position: number;
  score: number;
  breakdown: Record<string, unknown>; // JSONB
}

// ── DOMÍNIO: ÁLBUM ──────────────────────────────────────────
// Album 1 --> 0..* AlbumItem

export interface Album {
  id: string;
  userId: string;
  totalCollected: number;
  totalAvailable: number;
  createdAt: Date;
}

export interface AlbumItem {
  id: string;
  albumId: string;
  stickerType: StickerType;
  entityId: string;
  rarity: StickerRarity;
  isSecret: boolean;
  isFoil: boolean;
  collectedAt: Date;
}

export interface Streak {
  id: string;
  userId: string;
  currentDays: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  bonusStickersEarned: number;
}

// ── DOMÍNIO: FAVORITOS ──────────────────────────────────────

export interface Favorite {
  id: string;
  userId: string;
  entityType: EntityType;
  entityId: string;
  createdAt: Date;
}

// ── OPERAÇÕES ──────────────────────────────────────────────

export interface AuditLog {
  id: string;
  userId: string;
  action: string; // ex: 'auth.login', 'album.collect', 'billing.upgrade'
  resource: string;
  ipAddress: string;
  result: AuditResult;
  metadata: Record<string, unknown> | null; // JSONB
  createdAt: Date;
}

export interface PipelineRun {
  id: string;
  pipelineName: string;
  status: PipelineStatus;
  recordsExtracted: number;
  recordsLoaded: number;
  recordsFailed: number;
  errorLog: Record<string, unknown> | null; // JSONB
  startedAt: Date;
  finishedAt: Date | null;
}

// ── RELACIONAMENTOS (documentação) ──────────────────────────

export const ClassRelationships: string[] = [
  'User 1 --> 0..* Session',
  'User 1 --> 0..1 Subscription',
  'User 1 --> 0..1 Album',
  'User 1 --> 0..1 Streak',
  'User 1 --> 0..* Favorite',
  'User 1 --> 0..* ApiKey',
  'User 1 --> 0..* Ranking',
  'Subscription 1 --> 0..* Billing',
  'Album 1 --> 0..* AlbumItem',
  'Club 1 --> 0..* ClubPlayer',
  'Club 1 --> 0..1 Stadium',
  'Club 1 --> 1 Country',
  'Club 1 --> 0..* RankingEntry',
  'Player 1 --> 0..* ClubPlayer',
  'Competition 1 --> 0..* Season',
  'Season 1 --> 0..* Match',
  'Season 0..1 --> 1 Club champion',
  'Ranking 1 --> 1..* RankingEntry',
  'Match --> Club home',
  'Match --> Club away',
];

// ─────────────────────────────────────────────────────────────
// FEATURE FLAGS (gating por funcionalidade — próximo artefato)
// ─────────────────────────────────────────────────────────────

export interface FeatureFlag {
  key: string;
  enabledFor: Plan;
  expiresAt: Date | null;
  metadata: Record<string, unknown> | null;
}

export const FeatureFlags: Record<string, FeatureFlag> = {
  rankingCustomFormula: {
    key: 'ranking-custom-formula',
    enabledFor: Plan.ELITE,
    expiresAt: null,
    metadata: null,
  },
  albumExclusive: {
    key: 'album-exclusive',
    enabledFor: Plan.ELITE,
    expiresAt: null,
    metadata: null,
  },
  albumFoil: {
    key: 'album-foil',
    enabledFor: Plan.PRO,
    expiresAt: null,
    metadata: null,
  },
  rankingFilters: {
    key: 'ranking-filters',
    enabledFor: Plan.PRO,
    expiresAt: null,
    metadata: null,
  },
  apiAccess: {
    key: 'api-access',
    enabledFor: Plan.ELITE,
    expiresAt: null,
    metadata: null,
  },
  noAds: {
    key: 'no-ads',
    enabledFor: Plan.PRO,
    expiresAt: null,
    metadata: null,
  },
  prioritySupport: {
    key: 'priority-support',
    enabledFor: Plan.ELITE,
    expiresAt: null,
    metadata: null,
  },
};

export function isFeatureFlagEnabled(user: { role: Role; plan: Plan }, key: string): boolean {
  if (user.role === Role.ADMIN) return true;
  const flag = Object.values(FeatureFlags).find((f) => f.key === key);
  if (!flag) return false;
  const planOrder: Record<Plan, number> = { [Plan.FREE]: 0, [Plan.PRO]: 1, [Plan.ELITE]: 2 };
  return planOrder[user.plan] >= planOrder[flag.enabledFor];
}

// ─────────────────────────────────────────────────────────────
// DIAGRAMAS DE SEQUÊNCIA
// ─────────────────────────────────────────────────────────────

/**
 * 2.1 Registro
 * Usuário → Frontend → API → PostgreSQL → Resend
 * POST /auth/register {email, password}; valida Zod; check email único;
 * hash argon2id; INSERT user (plan:'free', role:'user'); audit_log auth.register;
 * email de boas-vindas via BullMQ/Resend; responde 201.
 */
export function signupSequence(): void {
  // Diagrama documentado em UML v1.0 §2.1
}

/**
 * 2.2 Login + emissão de tokens
 * Rate limit 10/15min por IP; SELECT user; argon2id.verify;
 * access_token JWT RS256 (15min, payload {sub, role, plan});
 * refresh_token secureRandom(64) salvo como SHA-256 na Session (+30d);
 * Set-Cookie HttpOnly/Secure/SameSite=Strict; access_token em memória.
 */
export function loginSequence(): void {
  // Diagrama documentado em UML v1.0 §2.2
}

/**
 * 2.3 Refresh de token
 * Lê refresh_token do cookie; SHA-256; busca session válida;
 * emite novo par de tokens e faz rotate do refreshTokenHash (30d).
 */
export function refreshSequence(): void {
  // Diagrama documentado em UML v1.0 §2.3
}

/**
 * 3. Acesso a conteúdo com gate de plano
 * GET /api/v1/clubs/:slug — anônimo recebe preview (blur + CTA);
 * autenticado passa pelo PlanGuard: role AND plan iguais ou superiores.
 */
export function contentAccessSequence(): void {
  // Diagrama documentado em UML v1.0 §3
}

/**
 * 4. Coleta de figurinha
 * POST /api/v1/album/collect {stickerType, entityId};
 * dedup por albumId+entityId; INSERT album_item; totalCollected+1;
 * StreakService: ++currentDays se ativo, senão reset=1; audit_log.
 */
export function collectStickerSequence(): void {
  // Diagrama documentado em UML v1.0 §4
}

/**
 * 5. Upgrade de plano (Stripe)
 * Checkout session; webhook checkout.session.completed (assinatura
 * STRIPE_WEBHOOK_SECRET); UPDATE user.plan; INSERT subscription/billing;
 * email de confirmação; próximo refresh emite JWT com novo plano.
 */
export function billingUpgradeSequence(): void {
  // Diagrama documentado em UML v1.0 §5
}

/**
 * 6. Pipeline ETL
 * GitHub Actions cron → worker → Wikidata/TheSportsDB → raw_* →
 * EntityResolver (source_id → wikidata_id) → Normalizer → completenessScore;
 * score >= 0.5: UPSERT clubs + upload logo R2; senão data_quality 'incomplete';
 * RankingCalculator recalcula entries; pipeline_run success/partial/failed.
 */
export function etlPipelineSequence(): void {
  // Diagrama documentado em UML v1.0 §6
}

/**
 * 7. Consulta IA (RAG)
 * POST /api/v1/ai/ask; JWT plan pro/elite; rate limit 20/h;
 * embeddings via Ollama; busca top-10 chunks por proximidade pgvector;
 * chat com contexto; resposta com fontes citadas; audit_log ai.ask.
 */
export function ragAskSequence(): void {
  // Diagrama documentado em UML v1.0 §7
}
