/**
 * T600 — GAP BOT: bot de INGESTÃO DE DADOS FALTANTES E PENDENTES.
 *
 * ── POR QUE ELE EXISTE ───────────────────────────────────────────────────────────
 * O acervo tem enrichers bons, mas espalhados: cada dimensão (escudo, coordenada,
 * mídia de clube, perfil de jogador…) é um script com fila e cursor próprios, e
 * NÃO existe um lugar que responda "o que está faltando e o que eu faço com isso?".
 * Medido em 2026-11-02: escudo em 807 de 12.003 clubes, foto em 28,5% dos
 * jogadores, `position` em 84,7%, e `matches.scorers` em 126 de 17.265 partidas —
 * e é o `scorers` que alimenta o ranking de jogador (a KPI que estava zerada).
 *
 * Este bot é um SUPERVISOR, não um novo scraper: ele
 *   1. INVENTARIA o pendente por dimensão (SQL, com prioridade do piloto MVP);
 *   2. EXECUTA o enricher correspondente (os scripts já testados, idempotentes e
 *      com cursor de tentativa) com `--apply` + limite da rodada;
 *   3. DECLARA as dimensões sem bot — lacuna escrita, nunca "cobertura completa".
 *
 * ── REGRAS (as mesmas do idempotent-seed) ────────────────────────────────────────
 * - DRY-RUN por default; `--apply` para escrever. Em produção, `--apply` também
 *   exige `--allow-production` (mesma dupla guarda dos demais bots).
 * - Spawn com LISTA de args — nunca `shell: true` (injeção de comando).
 * - Re-run é seguro: os enrichers usam cursor (`mediaEnrichment`,
 *   `profileEnrichment`) e zero overwrite; re-executar não duplica.
 *
 * ── USO ──────────────────────────────────────────────────────────────────────────
 *   node dist/scripts/gap-bot.js                     # inventário (o que falta)
 *   node dist/scripts/gap-bot.js --run=crest --apply --limit=300
 *   node dist/scripts/gap-bot.js --all --apply --allow-production --limit=200
 *   node dist/scripts/gap-bot.js --inventory --json  # mesma leitura, em JSON
 */
import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Prisma, PrismaClient } from '@prisma/client';

/** QIDs do piloto MVP (Série A, Premier League, Libertadores) — lidos do acervo. */
export const PILOT_QIDS = ['Q206813', 'Q9448', 'Q184795'] as const;

export interface GapDimension {
  key: string;
  label: string;
  /** Dimensão que o bot sabe preencher (tem enricher). */
  bot: { script: string; args: string[] } | null;
  /** Por que não há bot, quando `bot === null`. */
  reason?: string;
}

/**
 * Registro das dimensões. A ORDEM é a prioridade de execução: o que destrava
 * produto/KPI vem primeiro (escudo e coordenada são visíveis; perfil de jogador
 * habilita o ranking; `scorers` habilita o ranking de jogador e não tem bot).
 */
export const GAP_DIMENSIONS: readonly GapDimension[] = [
  {
    key: 'scorers',
    label: 'Partidas com autores dos gols (`matches.scorers` → ranking de jogador)',
    bot: null,
    reason:
      'A fonte é o HTML do RSSSF por temporada e o parse é feito por `seed-matches-rsssf` ' +
      '(CLI com --source/--seasons). Automatizar exige baixar e versionar as páginas: pendente ' +
      'até a decisão de cache de fonte (DATA-01). Medido: 126 de 17.265 partidas.',
  },
  {
    key: 'crest',
    label: 'Clubes sem escudo vigente (`club_crests.isCurrent`)',
    bot: { script: 'enrich-club-crests-p18.js', args: [] },
  },
  {
    key: 'coords',
    label: 'Clubes sem coordenada (`clubs.latitude IS NULL`)',
    bot: { script: 'enrich-clubs-geo-wikidata.js', args: [] },
  },
  {
    key: 'club-media',
    label: 'Clubes sem logo/estádio/cores',
    bot: { script: 'enrich-clubs-media.js', args: [] },
  },
  {
    key: 'club-editorial',
    label: 'Clubes sem texto editorial',
    bot: { script: 'enrich-clubs-editorial.js', args: [] },
  },
  {
    key: 'club-details',
    label: 'Clubes sem uniformes/hino/flâmula',
    bot: { script: 'enrich-all-media.js', args: [] },
  },
  {
    key: 'player-media',
    label: 'Jogadores sem foto',
    bot: { script: 'enrich-players-media.js', args: [] },
  },
  {
    key: 'player-profile',
    label: 'Jogadores sem posição (perfil Wikidata; `nickname` é opcional)',
    bot: { script: 'enrich-player-profiles.js', args: [] },
  },
] as const;

/** Dimensões que NÃO têm bot — declaradas para não parecerem cobertas. */
export function dimensionsWithoutBot(): GapDimension[] {
  return GAP_DIMENSIONS.filter((d) => d.bot === null);
}

/**
 * PURA — monta o plano da rodada: só dimensões COM bot e com pendência, na ordem
 * de prioridade do registro. `--run=<key>` filtra uma; `--all` usa tudo.
 * Não inventa trabalho: dimensão sem pendência fica de fora.
 */
export function buildGapPlan(
  inventory: Record<string, number>,
  opts: { only?: string | null; all?: boolean } = {},
): GapDimension[] {
  const todos = GAP_DIMENSIONS.filter((d) => d.bot !== null);
  if (opts.only) {
    const alvo = todos.filter((d) => d.key === opts.only);
    if (alvo.length === 0) {
      throw new Error(
        `--run inválido: "${opts.only}". Sem bot para esta dimensão ou chave inexistente ` +
          `(disponíveis: ${todos.map((d) => d.key).join(', ')})`,
      );
    }
    return alvo;
  }
  return todos.filter((d) => (inventory[d.key] ?? 0) > 0);
}

/**
 * Inventário por dimensão. SQL direto (os campos JSONB e os FILTER são caros de
 * expressar em Prisma e não há ganho de tipagem aqui). `pilot` separa o recorte
 * do MVP para o operador ver onde o trabalho rende produto.
 */
export async function readInventory(prisma: PrismaClient): Promise<{
  totals: Record<string, number>;
  pilot: Record<string, number>;
}> {
  const rows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    SELECT
      (SELECT count(*) FROM matches WHERE scorers IS NULL)::int                              AS scorers,
      (SELECT count(*) FROM clubs c WHERE c."deletedAt" IS NULL
         AND NOT EXISTS (SELECT 1 FROM club_crests cc WHERE cc."clubId" = c.id AND cc."isCurrent"))::int AS crest,
      (SELECT count(*) FROM clubs WHERE "deletedAt" IS NULL AND latitude IS NULL)::int        AS coords,
      (SELECT count(*) FROM clubs WHERE "deletedAt" IS NULL
         AND ("logoUrl" IS NULL OR "stadiumName" IS NULL OR "teamColors" IS NULL))::int       AS "club-media",
      (SELECT count(*) FROM clubs WHERE "deletedAt" IS NULL AND "editorialText" IS NULL)::int AS "club-editorial",
      (SELECT count(*) FROM clubs WHERE "deletedAt" IS NULL
         AND ("kitHistory" IS NULL OR anthem IS NULL OR pennants IS NULL))::int                AS "club-details",
      (SELECT count(*) FROM players WHERE "photoUrl" IS NULL)::int                            AS "player-media",
      -- position é o dado que o produto usa; nickname é OPCIONAL e nunca foi
      -- preenchido em massa — contá-lo junto inflava a pendência para 105.211
      -- (medido em 02-11: position nulo = 16.037; nickname = 0 preenchidos).
      -- ATENÇÃO: nada de backtick neste comentário — fecha o template do SQL.
      (SELECT count(*) FROM players WHERE position IS NULL)::int                              AS "player-profile"
  `;
  const totals = (rows[0] ?? {}) as Record<string, number>;
  const asNum = (o: Record<string, unknown>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Number(v ?? 0)]));

  // Recorte do piloto: clubes cuja competição está no escopo (via partidas). Só
  // as dimensões de CLUBE têm esse recorte; jogador/partida não têm vínculo barato.
  const pilotRows = await prisma.$queryRaw<Array<Record<string, unknown>>>`
    WITH pilot_clubs AS (
      SELECT DISTINCT c.id FROM clubs c
      WHERE c."deletedAt" IS NULL AND c.id IN (
        SELECT m."homeClubId" FROM matches m JOIN competitions comp ON comp.id = m."competitionId"
        WHERE comp.qid = ANY(${PILOT_QIDS as unknown as string[]}::text[])
        UNION
        SELECT m."awayClubId" FROM matches m JOIN competitions comp ON comp.id = m."competitionId"
        WHERE comp.qid = ANY(${PILOT_QIDS as unknown as string[]}::text[])
      )
    )
    SELECT
      (SELECT count(*) FROM pilot_clubs p WHERE NOT EXISTS (
         SELECT 1 FROM club_crests cc WHERE cc."clubId" = p.id AND cc."isCurrent"))::int      AS crest,
      (SELECT count(*) FROM clubs c JOIN pilot_clubs p ON p.id = c.id WHERE c.latitude IS NULL)::int AS coords,
      (SELECT count(*) FROM clubs c JOIN pilot_clubs p ON p.id = c.id
         AND (c."logoUrl" IS NULL OR c."stadiumName" IS NULL OR c."teamColors" IS NULL))::int AS "club-media",
      (SELECT count(*) FROM clubs c JOIN pilot_clubs p ON p.id = c.id AND c."editorialText" IS NULL)::int AS "club-editorial",
      (SELECT count(*) FROM clubs c JOIN pilot_clubs p ON p.id = c.id
         AND (c."kitHistory" IS NULL OR c.anthem IS NULL OR c.pennants IS NULL))::int          AS "club-details"
  `;
  return { totals: asNum(totals), pilot: asNum(pilotRows[0] ?? {}) };
}

function argValue(name: string): string | null {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.slice(name.length + 3) : null;
}

/** Executa um enricher por spawn (lista de args — nunca shell). */
function runScript(script: string, extra: string[]): Promise<{ code: number; tail: string }> {
  const here = dirname(fileURLToPath(import.meta.url));
  const full = join(here, script);
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [full, ...extra], { stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const collect = (chunk: Buffer) => {
      out += chunk.toString();
      if (out.length > 20_000) out = out.slice(-20_000); // memória limitada
    };
    child.stdout?.on('data', collect);
    child.stderr?.on('data', collect);
    child.on('close', (code) => resolve({ code: code ?? 1, tail: out }));
  });
}

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const allowProduction = process.argv.includes('--allow-production');
  const json = process.argv.includes('--json');
  const only = argValue('run');
  const limit = argValue('limit');
  const all = process.argv.includes('--all');

  if (!(process.env.DATABASE_URL ?? '').startsWith('postgres')) {
    console.error('BLOQUEADO: exige DATABASE_URL postgres.');
    process.exit(1);
  }
  if (apply && process.env.NODE_ENV === 'production' && !allowProduction) {
    console.error('BLOQUEADO: --apply em produção exige --allow-production explícito.');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const inventory = await readInventory(prisma);
    // `scorers` é Json: `DbNull` é o "SQL NULL" (o `null` do Prisma é o JSON null).
    const pendencias = await prisma.match.count({ where: { scorers: { equals: Prisma.DbNull } } });

    if (json) {
      console.log(
        JSON.stringify(
          {
            measuredAt: new Date().toISOString(),
            dimensions: GAP_DIMENSIONS.map((d) => ({
              key: d.key,
              label: d.label,
              pending: inventory.totals[d.key] ?? null,
              pendingPilot: inventory.pilot[d.key] ?? null,
              hasBot: d.bot !== null,
              reason: d.reason ?? null,
            })),
            matchesWithoutScorers: pendencias,
          },
          null,
          2,
        ),
      );
      return;
    }

    console.log(`\nGAP BOT · ${apply ? 'APLICANDO' : 'DRY-RUN'} · ${new Date().toISOString()}`);
    console.log('\nPendências por dimensão (total · piloto MVP):');
    for (const d of GAP_DIMENSIONS) {
      const total = inventory.totals[d.key];
      const pilot = inventory.pilot[d.key];
      const marca = d.bot ? 'bot' : 'SEM BOT';
      console.log(
        `  ${d.key.padEnd(15)} ${String(total ?? '—').padStart(8)} · ` +
          `${String(pilot ?? '—').padStart(5)}  [${marca}]`,
      );
    }
    const semBot = dimensionsWithoutBot();
    if (semBot.length > 0) {
      console.log('\nDimensões SEM bot (lacuna declarada, não coberta por esta rodada):');
      for (const d of semBot) console.log(`  - ${d.key}: ${d.reason ?? ''}`);
    }

    const plan = buildGapPlan(inventory.totals, { only, all });
    if (plan.length === 0) {
      console.log('\nNada a executar: nenhuma dimensão com bot tem pendência.');
      return;
    }

    console.log(`\nPlano: ${plan.map((d) => d.key).join(' → ')}`);
    if (!apply) {
      console.log('\nDRY-RUN: nada foi executado. Use --apply para rodar os enrichers.');
      return;
    }

    let falhas = 0;
    for (const dim of plan) {
      if (!dim.bot) continue;
      const args = [...dim.bot.args, '--apply'];
      if (limit) args.push(`--limit=${limit}`);
      if (allowProduction) args.push('--allow-production');
      console.log(`\n▶ ${dim.key} → ${dim.bot.script} ${args.join(' ')}`);
      const r = await runScript(dim.bot.script, args);
      const linhas = r.tail.trim().split('\n').slice(-3).join(' | ');
      console.log(`  exit=${r.code} · ${linhas}`);
      if (r.code !== 0) falhas += 1;
    }
    console.log(`\nConcluído: ${plan.length - falhas}/${plan.length} dimensão(ões) com exit 0.`);
    if (falhas > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const invokedDirectly =
  process.argv[1] !== undefined && /gap-bot\.(ts|js)$/.test(process.argv[1].replace(/\\/g, '/'));
if (invokedDirectly) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
