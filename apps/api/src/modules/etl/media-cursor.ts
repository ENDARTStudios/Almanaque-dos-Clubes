/**
 * T547 — CURSOR COMPARTILHADO de enriquecimento de mídia.
 *
 * O `clubs.mediaEnrichment` guarda um registro por mídia tentada:
 * `{ "<media>": { at, status } }` (T528). Ele é o cursor que faz o lote AVANÇAR em vez de
 * reprocessar o mesmo alfabeto — o defeito que congelou escudo em 2,4% e editorial na
 * letra E.
 *
 * Dois cuidados que este módulo centraliza:
 *
 * 1. **A FORMA DO `where` não é `campo IS NULL`.** Mídia tentada e sem resultado (fonte
 *    não tem o dado) precisa SAIR da fila, senão o lote nunca anda (T528). A seleção é
 *    `NOT (mediaEnrichment ? '<media>')` — em SQL explícito, porque filtro de negação em
 *    campo JSON do Prisma não é confiável (medido no T528: pegou os PRÓXIMOS clubes).
 *
 * 2. **A ESCRITA TEM DE MESCLAR.** Cada job grava as SUAS chaves; se gravar o objeto
 *    inteiro, apaga as chaves dos outros jobs e os cursores vizinhos voltam ao início.
 *    `stampMediaAttempt` faz um `||` atômico no JSONB — uma instrução, sem
 *    read-modify-write, sem corrida entre os jobs que rodam em horários próximos.
 */
import { Prisma, PrismaClient } from '@prisma/client';

/** Chaves de mídia do acervo. `logo` cobre escudo+estádio+cores; `editorial`, o texto. */
export type MediaKey = 'logo' | 'editorial' | 'kits' | 'anthem' | 'pennants';

export type MediaAttemptStatus = 'enriched' | 'no_source' | 'already_present' | 'error';

export interface PendingClubQueryOptions {
  limit: number;
  /** Mídias que o clube precisa ter AINDA NÃO TENTADAS (basta não ter nenhuma delas). */
  media: MediaKey[];
  country?: string;
  /**
   * T547 (opt-in) — reprocessar o que foi tentado há mais de N dias (atualização).
   * DESLIGADO por padrão: com ele ligado o lote deixa de ser noop no re-run, o que
   * quebra a prova de idempotência. Frescor é uma decisão à parte, não o conserto do
   * congelamento.
   */
  refreshDays?: number;
}

/**
 * Cláusula "esta entidade ainda NÃO teve a tentativa registrada" — o coração do cursor.
 * Em SQL explícito porque filtro de negação em campo JSON pelo Prisma não é confiável
 * (medido no T528: a seleção pegava os PRÓXIMOS em vez dos tentados).
 *
 * ATENÇÃO à lógica de três valores: `NULL ? 'logo'` é NULL, e `NOT NULL` continua NULL —
 * sem o guarda `IS NULL` a linha NÃO é selecionada, ou seja, o cursor excluía exatamente
 * quem nunca foi tentado (medido no CI: a seleção voltava vazia).
 */
function clausulaNaoTentada(media: string[], refreshDays?: number): Prisma.Sql {
  const precisa = Prisma.join(
    media.map((m) => Prisma.sql`("mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? ${m}))`),
    ' OR ',
  );
  const estagnado =
    refreshDays != null
      ? Prisma.sql` OR EXISTS (
          SELECT 1 FROM jsonb_each("mediaEnrichment") AS e(k, v)
          WHERE e.k IN (${Prisma.join(media)}) AND (e.v->>'at')::timestamptz < now() - ${Prisma.sql`(${refreshDays} || ' days')::interval`}
        )`
      : Prisma.empty;
  return Prisma.sql`(${precisa}${estagnado})`;
}

/**
 * Carimba a tentativa MESCLANDO no registro existente (não sobrescreve as chaves dos
 * outros jobs). Uma instrução só, atômica: sem read-modify-write, sem corrida entre os
 * jobs que rodam em horários próximos.
 *
 * O nome da tabela vem de chamador fechado (whitelist) — identificador SQL não é
 * parametrizável em `Prisma.sql`, então NUNCA recebe valor externo.
 */
async function carimbarTentativa(
  prisma: PrismaClient,
  tabela: Prisma.Sql,
  id: string,
  patch: Record<string, { at: string; status: MediaAttemptStatus }>,
): Promise<void> {
  if (Object.keys(patch).length === 0) return;
  await prisma.$executeRaw`
    UPDATE ${tabela}
    SET "mediaEnrichment" = coalesce("mediaEnrichment", '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
    WHERE id = ${id}
  `;
}

/**
 * Clubes pendentes para as mídias pedidas, em ordem alfabética (a ordem estável mantém
 * a leitura dos relatórios comparável entre execuções).
 */
export async function selectPendingClubs(
  prisma: PrismaClient,
  opts: PendingClubQueryOptions,
): Promise<Array<{ id: string; qid: string; name: string }>> {
  const pais = opts.country ? Prisma.sql` AND country = ${opts.country}` : Prisma.empty;

  return prisma.$queryRaw<Array<{ id: string; qid: string; name: string }>>`
    SELECT id, qid, name FROM clubs
    WHERE "deletedAt" IS NULL AND qid IS NOT NULL${pais}
      AND ${clausulaNaoTentada(opts.media, opts.refreshDays)}
    ORDER BY name ASC
    LIMIT ${opts.limit}
  `;
}

/**
 * Marca a TENTATIVA de uma mídia no clube, MESCLANDO no registro existente (não
 * sobrescreve as chaves dos outros jobs). Uma instrução atômica.
 */
export async function stampMediaAttempt(
  prisma: PrismaClient,
  clubId: string,
  media: MediaKey,
  status: MediaAttemptStatus,
  at = new Date().toISOString(),
): Promise<void> {
  await carimbarTentativa(prisma, Prisma.raw('clubs'), clubId, { [media]: { at, status } });
}

/** Mescla VÁRIAS mídias de uma vez (o job unificado grava kit/hino/flâmula juntos). */
export async function stampMediaAttempts(
  prisma: PrismaClient,
  clubId: string,
  media: Partial<Record<MediaKey, MediaAttemptStatus>>,
  at = new Date().toISOString(),
): Promise<void> {
  const patch: Record<string, { at: string; status: MediaAttemptStatus }> = {};
  for (const [k, status] of Object.entries(media)) {
    if (status) patch[k] = { at, status };
  }
  await carimbarTentativa(prisma, Prisma.raw('clubs'), clubId, patch);
}

// ---------------------------------------------------------------------------
// T550 — cursor de JOGADOR (perfil: foto P18 / país P27 / posição P413)
// ---------------------------------------------------------------------------
//
// Mesmo defeito que o T528 consertou nos clubes: `enrichPlayersMediaBatch` selecionava
// por `photoUrl/country/position IS NULL` ordenado por nome, então relia o MESMO começo
// do alfabeto toda noite (105.211 jogadores — o lote nunca saía da letra A). A chave é
// uma só, `profile`, porque o job cobre os três campos numa passada.
//
// Reusa `clausulaNaoTentada`/`carimbarTentativa` de propósito: duas implementações do
// mesmo cursor divergem — foi o que congelou a mídia no T536 (CLI e service com lógicas
// separadas) e o que travou o editorial no T549.

/** Chave de mídia do jogador. */
export type PlayerMediaKey = 'profile';

export interface PendingPlayerQueryOptions {
  limit: number;
  /** Reprocessar quem foi tentado há mais de N dias (foto/posição podem aparecer depois). */
  refreshDays?: number;
}

/** Linha da fila de perfil (a coluna vem do SQL, daí não usar o tipo do Prisma). */
export interface PendingPlayerRow {
  id: string;
  qid: string;
  photoUrl: string | null;
  country: string | null;
  position: string | null;
  name: string;
}

/**
 * Jogadores pendentes de perfil. Além do cursor, a entidade precisa ainda ter algo a
 * preencher (`photoUrl`/`country`/`position` nulo) — condição do PRÓPRIO job, mantida como
 * estava: restringir a `photoUrl IS NULL` pararia de preencher país/posição de quem já
 * tem foto.
 *
 * Ordem: NUNCA tentado primeiro, depois o mais antigo. Ordenar só por nome faria a
 * atualização semanal (`refreshDays`) reprocessar a cabeça do alfabeto e nunca chegar ao
 * fim da fila — inanição do rabo.
 */
export async function selectPendingPlayers(
  prisma: PrismaClient,
  opts: PendingPlayerQueryOptions,
): Promise<PendingPlayerRow[]> {
  return prisma.$queryRaw<PendingPlayerRow[]>`
    SELECT id, qid, "photoUrl", country, position, "fullName" AS name
    FROM players
    WHERE qid IS NOT NULL
      AND ("photoUrl" IS NULL OR country IS NULL OR position IS NULL)
      AND ${clausulaNaoTentada(['profile'], opts.refreshDays)}
    ORDER BY coalesce("mediaEnrichment"->'profile'->>'at', '1970-01-01T00:00:00Z') ASC,
             "fullName" ASC
    LIMIT ${opts.limit}
  `;
}

/** Marca a TENTATIVA de perfil do jogador (mescla no registro existente). */
export async function stampPlayerAttempt(
  prisma: PrismaClient,
  playerId: string,
  status: MediaAttemptStatus,
  at = new Date().toISOString(),
): Promise<void> {
  await carimbarTentativa(prisma, Prisma.raw('players'), playerId, {
    profile: { at, status },
  });
}
