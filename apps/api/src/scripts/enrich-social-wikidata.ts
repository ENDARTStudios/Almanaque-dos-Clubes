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

/**
 * A REGRA POR ALVO, num lugar só: tabela, coluna do site e o `WHERE` de elegibilidade.
 *
 * As três colunas divergem de verdade, e cada divergência já causou (ou quase causou) defeito:
 *   `clubs.website`              contra `officialSite` nos outros dois — escrever no campo errado
 *                                criaria coluna inexistente;
 *   `deletedAt` existe em clubs e competitions, NÃO existe em players — era o `42703` silencioso;
 *   a elegibilidade pergunta pela coluna de site DAQUELE alvo.
 *
 * Antes isto estava escrito à mão em cada ramo, e o ramo `all` ficou para trás usando a base de
 * clube para jogadores. Uma tabela por alvo não pode divergir de si mesma.
 */
const ALVO = {
  club: { tabela: 'clubs', site: 'website' },
  player: { tabela: 'players', site: '"officialSite"' },
  competition: { tabela: 'competitions', site: '"officialSite"' },
} as const;

/** `WHERE` de elegibilidade de um alvo. Exportada para o teste cobrir os três. */
export function baseDeSelecao(target: 'club' | 'player' | 'competition'): string {
  const { site } = ALVO[target];
  const colunas = `qid IS NOT NULL AND ("socialLinks" IS NULL OR ${site} IS NULL)`;
  // `players` NÃO tem `deletedAt` no modelo: incluí-lo ali é `42703` (undefined_column).
  const softDelete = target === 'competition' || target === 'club' ? '"deletedAt" IS NULL AND ' : '';
  return `${softDelete}${colunas}`;
}

/** Colunas do SELECT de um alvo. */
function colunasDe(target: 'club' | 'player' | 'competition'): string {
  return `id, qid, ${ALVO[target].site}, "socialLinks"`;
}

/**
 * Monta o patch de UPDATE a partir do extraído do Wikidata, respeitando ZERO OVERWRITE.
 *
 * Devolve `{}` quando não há nada a escrever — o chamador usa isso para pular o alvo.
 *
 * Duas regras que custaram bug, e por isso estão nomeadas e testadas:
 *
 * 1. **`socialLinks` vazio é `null`, `undefined` OU `{}`.** A coluna é Json e 127 jogadores em
 *    produção a tinham como OBJETO VAZIO. `{}` é TRUTHY em JavaScript, então o teste antigo
 *    (`if (!t.socialLinks)`) PULAVA esses registros: o patch saía vazio, o alvo era cortado, e
 *    o `--apply` reportava `updated=0` depois de ter extraído dados do Wikidata com sucesso.
 *    "Não tem nenhuma chave" é a pergunta certa.
 * 2. **O campo do site muda de nome por alvo**: `clubs.website` contra
 *    `players/competitions.officialSite`. Escrever no campo errado criaria coluna inexistente.
 */
export function montarPatch(
  alvo: { officialSite?: string | null; socialLinks?: unknown; website?: string | null },
  extraido: { officialSite: string | null; socialLinks: Record<string, unknown> },
  target: 'club' | 'player' | 'competition',
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  const ehClube = target === 'club' || 'website' in alvo;

  if (extraido.officialSite && !alvo.officialSite) {
    if (ehClube) patch.website = extraido.officialSite;
    else patch.officialSite = extraido.officialSite;
  }

  const socialLinksVazio =
    alvo.socialLinks == null ||
    (typeof alvo.socialLinks === 'object' &&
      Object.keys(alvo.socialLinks as object).length === 0);
  if (socialLinksVazio) patch.socialLinks = extraido.socialLinks;

  return patch;
}

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
  /** Qual tabela este alvo veio. No ramo `all` os três tipos vêm juntos, e o tipo decide
   *  o campo do site (`website` vs `officialSite`) E a tabela do UPDATE. */
  kind: 'club' | 'player' | 'competition';
}

async function loadTargets(prisma: PrismaClient): Promise<Target[]> {
  // Raw SQL: filtros null em Json via shorthand/sentinels tem comportamento inconsistente nesta
  // instalacao — SQL direto e deterministico. A regra de cada alvo vem de `baseDeSelecao` e
  // `colunasDe`, e nao e reescrita aqui: era a duplicacao que deixava o ramo `all` para tras.
  const consultar = async (
    kind: 'club' | 'player' | 'competition',
  ): Promise<Target[]> => {
    const linhas = (await prisma.$queryRawUnsafe(
      `SELECT ${colunasDe(kind)} FROM ${ALVO[kind].tabela} WHERE ${baseDeSelecao(kind)} ORDER BY "createdAt" ASC LIMIT ${LIMIT}`,
    )) as unknown as Array<Record<string, unknown>>;
    return linhas.map((l) => ({ ...l, kind }) as unknown as Target);
  };

  if (TARGET === 'club' || TARGET === 'player' || TARGET === 'competition') {
    return consultar(TARGET);
  }

  // `all`: os tres tipos convivem na mesma lista, cada um com o seu `kind`. O ramo anterior
  // consultava jogadores com a base de clube (coluna `deletedAt` inexistente) e devolvia alvos
  // SEM tipo, o que fazia o UPDATE cair na tabela errada.
  const [clubs, players, comps] = await Promise.all([
    consultar('club'),
    consultar('player'),
    consultar('competition'),
  ]);
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

      // Estatística por plataforma (informativa, não decide escrita).
      if (ex.officialSite) stats.officialSite++;
      if (ex.socialLinks.youtube) stats.youtube++;
      if (ex.socialLinks.twitter) stats.twitter++;
      if (ex.socialLinks.facebook) stats.facebook++;
      if (ex.socialLinks.instagram) stats.instagram++;

      // A montagem do patch vive em `montarPatch`, exportada e testada — ver o comentário dela
      // sobre o `{}` truthy, que é o bug que fazia `--apply` reportar `updated=0`.
      const patch = montarPatch(t, ex, t.kind);

      if (Object.keys(patch).length === 0) continue;
      wouldUpdate++;
      if (!APPLY) continue;

      // A tabela vem do `kind` do ALVO, não do TARGET da execução: no ramo `all` os três tipos
      // convivem na mesma lista, e usar o TARGET mandaria jogador para a tabela de clube.
      if (t.kind === 'club') {
        await prisma.club.update({ where: { id: t.id }, data: patch });
      } else if (t.kind === 'player') {
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
