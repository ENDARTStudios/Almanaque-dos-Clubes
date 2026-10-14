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
 * Clubes pendentes para as mídias pedidas, em ordem alfabética (a ordem estável mantém
 * a leitura dos relatórios comparável entre execuções).
 */
export async function selectPendingClubs(
  prisma: PrismaClient,
  opts: PendingClubQueryOptions,
): Promise<Array<{ id: string; qid: string; name: string }>> {
  // ATENÇÃO à lógica de três valores: `NULL ? 'logo'` é NULL, e `NOT NULL` continua NULL
  // — sem o guarda `IS NULL` a linha NÃO é selecionada, ou seja, o cursor excluía
  // exatamente quem nunca foi tentado (medido no CI: seleção voltava vazia).
  const precisa = Prisma.join(
    opts.media.map((m) => Prisma.sql`("mediaEnrichment" IS NULL OR NOT ("mediaEnrichment" ? ${m}))`),
    ' OR ',
  );
  const estagnado =
    opts.refreshDays != null
      ? Prisma.sql` OR EXISTS (
          SELECT 1 FROM jsonb_each("mediaEnrichment") AS e(k, v)
          WHERE e.k IN (${Prisma.join(opts.media)}) AND (e.v->>'at')::timestamptz < now() - ${Prisma.sql`(${opts.refreshDays} || ' days')::interval`}
        )`
      : Prisma.empty;
  const pais = opts.country ? Prisma.sql` AND country = ${opts.country}` : Prisma.empty;

  return prisma.$queryRaw<Array<{ id: string; qid: string; name: string }>>`
    SELECT id, qid, name FROM clubs
    WHERE "deletedAt" IS NULL AND qid IS NOT NULL${pais}
      AND (${precisa}${estagnado})
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
  const patch = JSON.stringify({ [media]: { at, status } });
  await prisma.$executeRaw`
    UPDATE clubs
    SET "mediaEnrichment" = coalesce("mediaEnrichment", '{}'::jsonb) || ${patch}::jsonb
    WHERE id = ${clubId}
  `;
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
  if (Object.keys(patch).length === 0) return;
  await prisma.$executeRaw`
    UPDATE clubs
    SET "mediaEnrichment" = coalesce("mediaEnrichment", '{}'::jsonb) || ${JSON.stringify(patch)}::jsonb
    WHERE id = ${clubId}
  `;
}
