/**
 * T506 — service de enriquecimento de MÍDIA em lotes (usado pelo CLI e pelo
 * cron T451). Idempotente: só preenche NULL (re-run = noop).
 *
 * Cores (corrigido no T506): o briefing dizia P1423, mas P1423 é "template has
 * topic" — a propriedade real é **P462 (color)** e, melhor ainda, **P465
 * (sRGB hex triplet)** que já traz o hex. Validado na Wikidata em 09/10:
 * 87 clubes com P465 e 143 com P462 (white/blue/black/red/green/yellow/gold/orange).
 * Sem mapeamento arbitrário: hex direto (P465) e, quando só há entidade de cor,
 * mapa de NOMES de cor validados; cor desconhecida é logada (nunca inventada).
 */
import { PrismaClient, Prisma } from '@prisma/client';
import {
  fetchEntities,
  commonsFilePath,
  claimScalar,
  claimAll,
  bestLabel,
  MEDIA_USER_AGENT,
  type EntityShape,
} from './connectors/wikidata-media.connector.js';

/** Nomes de cor do Wikidata (label EN) → hex. Só cores observadas na fonte
 * (consulta SPARQL em 09/10) + complementos universais de kit esportivo. */
export const COLOR_NAME_HEX: Record<string, string> = {
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  gold: '#FFD700',
  orange: '#FFA500',
  navy: '#000080',
  'navy blue': '#000080',
  'sky blue': '#87CEEB',
  'light blue': '#ADD8E6',
  'royal blue': '#4169E1',
  maroon: '#800000',
  claret: '#7F1734',
  purple: '#800080',
  grey: '#808080',
  gray: '#808080',
  silver: '#C0C0C0',
  brown: '#A52A2A',
  crimson: '#DC143C',
  burgundy: '#800020',
  teal: '#008080',
  violet: '#EE82EE',
  pink: '#FFC0CB',
};

/** Normaliza P465 ("7FFFD4" ou "#7FFFD4") → "#RRGGBB" válido, senão null. */
export function normalizeHex(raw: string | null): string | null {
  if (!raw) return null;
  const m = /^#?([0-9A-Fa-f]{6})$/.exec(raw.trim());
  return m ? `#${m[1].toUpperCase()}` : null;
}

/** Resolve nomes de cor → hex; desconhecidos são reportados (nunca inventados). */
export function resolveColors(
  hexClaims: string[],
  colorNames: string[],
): { colors: string[]; unknown: string[] } {
  const colors: string[] = [];
  for (const h of hexClaims) {
    const hex = normalizeHex(h);
    if (hex && !colors.includes(hex)) colors.push(hex);
  }
  const unknown: string[] = [];
  for (const name of colorNames) {
    const key = name.trim().toLowerCase();
    const hex = COLOR_NAME_HEX[key];
    if (hex) {
      if (!colors.includes(hex)) colors.push(hex);
    } else {
      unknown.push(name);
    }
  }
  return { colors, unknown };
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface MediaBatchResult {
  processed: number;
  updated: number;
  skipped: number;
  unknownColors: string[];
}

/** W1 — enriquece até `limit` clubes com logo/estádio/cores (só NULL). */
export async function enrichClubsMediaBatch(
  limit: number,
  opts: { country?: string; apply: boolean; prisma?: PrismaClient } = { apply: false },
): Promise<MediaBatchResult> {
  const prisma = opts.prisma ?? new PrismaClient();
  const own = !opts.prisma;
  try {
    const clubs = await prisma.club.findMany({
      where: {
        qid: { not: null },
        deletedAt: null,
        ...(opts.country ? { country: opts.country } : {}),
        OR: [
          { logoUrl: null },
          { stadiumName: null },
          { stadiumImage: null },
          { stadiumCapacity: null },
          { teamColors: { equals: Prisma.DbNull } },
        ],
      },
      select: {
        id: true,
        qid: true,
        logoUrl: true,
        stadiumName: true,
        stadiumImage: true,
        stadiumCapacity: true,
        teamColors: true,
      },
      take: limit,
      orderBy: { name: 'asc' },
    });
    if (clubs.length === 0) return { processed: 0, updated: 0, skipped: 0, unknownColors: [] };

    // Fase A — clubes
    const clubEntities = new Map<string, EntityShape>();
    const qids = clubs.map((c) => c.qid!);
    for (let i = 0; i < qids.length; i += 50) {
      const res = await fetchEntities(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) clubEntities.set(qid, e);
    }

    // Fase B — estádios + cores (QIDs de cor para label EN)
    const stadiumQids = new Set<string>();
    const colorQids = new Set<string>();
    for (const e of clubEntities.values()) {
      const st = qidOf(e, 'P115');
      if (st) stadiumQids.add(st);
      for (const cq of claimAll(e, 'P462')) if (/^Q\d+$/.test(cq)) colorQids.add(cq);
    }
    const stadiumEntities = new Map<string, EntityShape>();
    const stList = [...stadiumQids];
    for (let i = 0; i < stList.length; i += 50) {
      const res = await fetchEntities(stList.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) stadiumEntities.set(qid, e);
    }
    const colorLabels = new Map<string, string>();
    const cList = [...colorQids];
    for (let i = 0; i < cList.length; i += 50) {
      const res = await fetchEntities(cList.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) {
        const l = bestLabel(e);
        if (l) colorLabels.set(qid, l);
      }
    }

    let updated = 0;
    let skipped = 0;
    const unknownColors: string[] = [];
    for (const club of clubs) {
      const e = clubEntities.get(club.qid!);
      if (!e) {
        skipped += 1;
        continue;
      }
      const data: Record<string, unknown> = {};
      if (!club.logoUrl) {
        const f = claimScalar(e, 'P154');
        if (f) data.logoUrl = commonsFilePath(f, 300);
      }
      // Cores: P465 (hex) tem precedência; P462 (entidade) via label EN.
      if (club.teamColors == null) {
        const names = claimAll(e, 'P462')
          .map((q: string) => colorLabels.get(q))
          .filter((n: string | undefined): n is string => !!n);
        const { colors, unknown } = resolveColors(claimAll(e, 'P465'), names);
        unknownColors.push(...unknown);
        if (colors.length > 0) data.teamColors = colors as Prisma.InputJsonValue;
      }
      const stQid = qidOf(e, 'P115');
      const st = stQid ? stadiumEntities.get(stQid) : undefined;
      if (st) {
        if (!club.stadiumName) {
          const n = bestLabel(st);
          if (n) data.stadiumName = n;
        }
        if (club.stadiumCapacity == null) {
          const cap = claimScalar(st, 'P1083');
          const parsed = cap ? parseInt(cap, 10) : NaN;
          if (!Number.isNaN(parsed)) data.stadiumCapacity = parsed;
        }
        if (!club.stadiumImage) {
          const img = claimAll(st, 'P18')[0];
          if (img) data.stadiumImage = commonsFilePath(img, 600);
        }
        const coord = (
          st.claims?.P625?.[0] as
            | { mainsnak?: { datavalue?: { value?: { latitude?: number; longitude?: number } } } }
            | undefined
        )?.mainsnak?.datavalue?.value;
        if (coord && typeof coord.latitude === 'number') {
          data.stadiumLat = coord.latitude;
          data.stadiumLng = coord.longitude ?? null;
        }
      }
      if (Object.keys(data).length === 0) {
        skipped += 1;
        continue;
      }
      if (opts.apply) {
        await prisma.club.update({ where: { id: club.id }, data: data as Prisma.ClubUpdateInput });
        updated += 1;
      }
    }
    return { processed: clubs.length, updated, skipped, unknownColors };
  } finally {
    if (own) await prisma.$disconnect();
  }
}

/** W2 — enriquece até `limit` jogadores com foto/país/posição (só NULL). */
export async function enrichPlayersMediaBatch(
  limit: number,
  opts: { apply: boolean; prisma?: PrismaClient } = { apply: false },
): Promise<MediaBatchResult> {
  const prisma = opts.prisma ?? new PrismaClient();
  const own = !opts.prisma;
  try {
    const players = await prisma.player.findMany({
      where: {
        qid: { not: null },
        OR: [{ photoUrl: null }, { country: null }, { position: null }],
      },
      select: { id: true, qid: true, photoUrl: true, country: true, position: true },
      take: limit,
      orderBy: { fullName: 'asc' },
    });
    if (players.length === 0) return { processed: 0, updated: 0, skipped: 0, unknownColors: [] };

    const entities = new Map<string, EntityShape>();
    const qids = players.map((p) => p.qid!);
    for (let i = 0; i < qids.length; i += 50) {
      const res = await fetchEntities(qids.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) entities.set(qid, e);
    }

    // Posições distintas → rótulo EN
    const posQids = new Set<string>();
    for (const e of entities.values()) {
      for (const q of claimAll(e, 'P413')) if (/^Q\d+$/.test(q)) posQids.add(q);
    }
    const posLabels = new Map<string, string>();
    const posList = [...posQids];
    for (let i = 0; i < posList.length; i += 50) {
      const res = await fetchEntities(posList.slice(i, i + 50), {
        userAgent: MEDIA_USER_AGENT,
        sleep,
      });
      for (const [qid, e] of res) {
        const l = bestLabel(e);
        if (l) posLabels.set(qid, l);
      }
    }

    let updated = 0;
    let skipped = 0;
    for (const p of players) {
      const e = entities.get(p.qid!);
      if (!e) {
        skipped += 1;
        continue;
      }
      const data: Record<string, unknown> = {};
      if (!p.photoUrl) {
        const img = claimScalar(e, 'P18');
        if (img) data.photoUrl = commonsFilePath(img, 400);
      }
      if (!p.country) {
        const countryQid = claimAll(e, 'P27')[0];
        if (countryQid) {
          const row = await prisma.country.findFirst({
            where: { qid: countryQid },
            select: { iso2: true },
          });
          if (row?.iso2) data.country = row.iso2;
        }
      }
      if (!p.position) {
        const names = claimAll(e, 'P413')
          .map((q: string) => posLabels.get(q))
          .filter((n: string | undefined): n is string => !!n);
        const pos = names.map(positionFromLabel).find((x) => x) ?? null;
        if (pos) data.position = pos;
      }
      if (Object.keys(data).length === 0) {
        skipped += 1;
        continue;
      }
      if (opts.apply) {
        await prisma.player.update({ where: { id: p.id }, data: data as Prisma.PlayerUpdateInput });
        updated += 1;
      }
    }
    return { processed: players.length, updated, skipped, unknownColors: [] };
  } finally {
    if (own) await prisma.$disconnect();
  }
}

function qidOf(e: EntityShape, pid: string): string | null {
  const v = (
    e.claims?.[pid]?.[0] as { mainsnak?: { datavalue?: { value?: { id?: string } } } } | undefined
  )?.mainsnak?.datavalue?.value;
  return v?.id ?? null;
}

function positionFromLabel(label: string): string | null {
  const l = label.toLowerCase();
  if (l.includes('goalkeeper')) return 'GOALKEEPER';
  if (l.includes('defender') || l.includes('centre-back') || l.includes('fullback'))
    return 'DEFENDER';
  if (l.includes('midfielder')) return 'MIDFIELDER';
  if (l.includes('forward') || l.includes('striker') || l.includes('winger')) return 'FORWARD';
  return null;
}
