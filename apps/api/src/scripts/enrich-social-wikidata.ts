/**
 * WS-C-13 — enriquecimento de site oficial + redes sociais via Wikidata (CC0).
 *
 * Alvos: clubs/players/competitions COM qid e SEM os campos (zero overwrite:
 * campos preenchidos — inclusive por editor no PATCH social — nunca são
 * sobrescritos; re-run é noop).
 *
 * Extração: P856 (site) · P2397 (YouTube) · P2002 (Twitter/X) · P2013
 * (Facebook) · P2003 (Instagram) → URLs canônicas em socialLinks JSONB.
 * followersSnapshot NÃO é preenchido aqui (sem fonte de contagem confiável
 * sem APIs pagas) — fica null para input de editor (WS-C-9).
 *
 * Uso (produção, no container):
 *   node dist/scripts/enrich-social-wikidata.js --target=club --limit=20        # DRY-RUN
 *   node dist/scripts/enrich-social-wikidata.js --apply --allow-production --target=all
 */
import { PrismaClient } from '@prisma/client';
import { extractSocial } from '../modules/social/social-links.js';

const UA = 'AlmanaqueDosClubes-WikidataBot/1.0 (+https://almanaquedosclubes.com)';
const ENTITY_URL = (qids: string[]) =>
  `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qids.join('|')}&props=claims&format=json`;

const APPLY = process.argv.includes('--apply');
const ALLOW_PRODUCTION = process.argv.includes('--allow-production');
const TARGET = (process.argv.find((a) => a.startsWith('--target=')) ?? '--target=club').split(
  '=',
)[1] as 'club' | 'player' | 'competition' | 'all';
const LIMIT = Number(
  (process.argv.find((a) => a.startsWith('--limit=')) ?? '--limit=50').split('=')[1],
);
const PAUSE_MS = 1000;

if (APPLY && !ALLOW_PRODUCTION) {
  console.error('--apply exige --allow-production (gate explícito de escrita em produção)');
  process.exit(1);
}

interface ClaimValue {
  mainsnak?: { datavalue?: { value?: unknown } };
}
interface EntityPayload {
  claims?: Record<string, ClaimValue[]>;
}

function chunked<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchEntities(qids: string[]): Promise<Map<string, EntityPayload>> {
  const out = new Map<string, EntityPayload>();
  for (const part of chunked(qids, 50)) {
    let attempts = 0;
    for (;;) {
      attempts++;
      try {
        const res = await fetch(ENTITY_URL(part), {
          headers: { 'user-agent': UA, Accept: 'application/json' },
          signal: AbortSignal.timeout(30_000),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as { entities?: Record<string, EntityPayload> };
        for (const [qid, ent] of Object.entries(json.entities ?? {})) out.set(qid, ent);
        break;
      } catch (err) {
        if (attempts >= 3) {
          console.error(`  batch falhou após 3 tentativas: ${(err as Error).message.slice(0, 80)}`);
          break;
        }
        console.log(`  retry ${attempts}/3 (${(err as Error).message.slice(0, 60)})`);
        await sleep(PAUSE_MS * attempts);
      }
    }
    await sleep(PAUSE_MS);
  }
  return out;
}

interface Target {
  id: string;
  qid: string;
  website?: string | null;
  officialSite?: string | null;
  socialLinks: unknown;
}

async function loadTargets(prisma: PrismaClient): Promise<Target[]> {
  // Raw SQL: filtros null em Json via shorthand/sentinels têm comportamento
  // inconsistente nesta instalação — SQL direto é determinístico.
  const base = `"deletedAt" IS NULL AND qid IS NOT NULL AND ("socialLinks" IS NULL OR website IS NULL)`;
  // competitions tem soft-delete (T448b-2i); players NÃO tem deletedAt no
  // modelo — usar base própria (a coluna inexistente derrubava o enrich de
  // players com 42703; o branch nunca tinha rodado em produção).
  const baseOther = `"deletedAt" IS NULL AND qid IS NOT NULL AND ("socialLinks" IS NULL OR "officialSite" IS NULL)`;
  const basePlayer = `qid IS NOT NULL AND ("socialLinks" IS NULL OR "officialSite" IS NULL)`;
  const select = `id, qid, website, "socialLinks"`;
  const selectOther = `id, qid, "officialSite", "socialLinks"`;
  if (TARGET === 'club') {
    return prisma.$queryRawUnsafe(
      `SELECT ${select} FROM clubs WHERE ${base} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ) as unknown as Promise<Target[]>;
  }
  if (TARGET === 'player') {
    return prisma.$queryRawUnsafe(
      `SELECT ${selectOther} FROM players WHERE ${basePlayer} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ) as unknown as Promise<Target[]>;
  }
  if (TARGET === 'competition') {
    return prisma.$queryRawUnsafe(
      `SELECT ${selectOther} FROM competitions WHERE ${baseOther} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ) as unknown as Promise<Target[]>;
  }
  const [clubs, players, comps] = (await Promise.all([
    prisma.$queryRawUnsafe(
      `SELECT ${select} FROM clubs WHERE ${base} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT ${selectOther} FROM players WHERE ${baseOther} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ),
    prisma.$queryRawUnsafe(
      `SELECT ${selectOther} FROM competitions WHERE ${baseOther} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    ),
  ])) as unknown as Target[][];
  return [...clubs, ...players, ...comps];
}

async function main(): Promise<void> {
  console.log(
    `WS-C-13 — social links via Wikidata (${APPLY ? 'APPLY' : 'DRY-RUN'}) · target=${TARGET} · limit=${LIMIT}`,
  );
  const prisma = new PrismaClient();

  try {
    const all = (await loadTargets(prisma)).filter((t): t is Target & { qid: string } => !!t.qid);
    const targets = all.slice(0, LIMIT || 50);
    console.log(`  alvos com qid e campos vazios: ${targets.length} (de ${all.length} elegíveis)`);

    const qids = [...new Set(targets.map((t) => t.qid))];
    const entities = await fetchEntities(qids);

    let wouldUpdate = 0;
    let updated = 0;
    const stats = { officialSite: 0, youtube: 0, twitter: 0, facebook: 0, instagram: 0 };

    for (const t of targets) {
      const ent = entities.get(t.qid);
      if (!ent?.claims) continue;
      const ex = extractSocial(ent.claims as never);
      if (!ex.hasAnything) continue;

      // Zero overwrite: nenhum campo não-nulo é sobrescrito.
      const patch: Record<string, unknown> = {};
      const isClub = 'website' in t || TARGET === 'club';
      if (ex.officialSite && !t.officialSite) {
        if (isClub) patch.website = ex.officialSite;
        else patch.officialSite = ex.officialSite;
        stats.officialSite++;
      }
      if (ex.socialLinks.youtube) stats.youtube++;
      if (ex.socialLinks.twitter) stats.twitter++;
      if (ex.socialLinks.facebook) stats.facebook++;
      if (ex.socialLinks.instagram) stats.instagram++;

      if (!t.socialLinks) patch.socialLinks = ex.socialLinks;

      if (Object.keys(patch).length === 0) continue;
      wouldUpdate++;
      if (!APPLY) continue;

      if (isClub) {
        await prisma.club.update({ where: { id: t.id }, data: patch });
      } else if (TARGET === 'player') {
        await prisma.player.update({ where: { id: t.id }, data: patch });
      } else {
        await prisma.competition.update({ where: { id: t.id }, data: patch });
      }
      updated++;
    }

    console.log(
      `  extração (alvos processados): site=${stats.officialSite} youtube=${stats.youtube} twitter=${stats.twitter} facebook=${stats.facebook} instagram=${stats.instagram}`,
    );
    if (!APPLY) {
      console.log(`  DRY-RUN — wouldUpdate=${wouldUpdate}. Rode com --apply --allow-production.`);
    } else {
      console.log(`  APPLY — updated=${updated} (zero overwrite de campos preenchidos)`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Erro:', (err as Error).message);
  process.exit(1);
});
