import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import FichaHead from '@/components/ficha/FichaHead';
import RankingsIndex from '@/components/conceito/rankings/RankingsIndex';
import { getApiBase } from '@/lib/api-base';
import { formatCount } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale, type Locale } from '@/i18n/config';
import { wsConceitoRankings } from '@/i18n/wsConceitoRankings';
import { metadataStrings } from '@/i18n/wsMetadata';

/**
 * /rankings — ÍNDICE DE RANKINGS no conceito FICHA.
 *
 * ── POR QUE ESTA PÁGINA CONTINUA NO SERVIDOR ─────────────────────────────────────────────────
 * `generateMetadata` (T583) e o número-âncora da ficha saem do SERVIDOR: o título/descrição
 * por idioma e a contagem de edições publicadas precisam existir antes da hidratação. A
 * interatividade (filtros + cursor + tabela) vive no Client Component `RankingsIndex`, que é a
 * mesma divisão de trabalho que a página já usava (Server wrapper + tabela client).
 *
 * ── O NÚMERO-ÂNCORA É O DADO REAL ───────────────────────────────────────────────────────────
 * A âncora à direita ("20 / edições publicadas" no desenho) vem de `/rankings?published=true`,
 * campo `total` — a contagem que a API informa, formatada com `formatCount` no idioma do
 * usuário. Se a API não responde, NÃO há âncora: número que não foi verificado não vira manchete
 * (a lacuna é declarada no conteúdo, pelo estado de erro da tabela).
 *
 * ── O SUBTÍTULO FUNDE O KICKER E O CRITÉRIO ────────────────────────────────────────────────
 * O desenho pede o kicker "Ranking · temporada 2025" fundido à frase do critério. A temporada é
 * a MAIS RECENTE publicada que a API devolveu — quando não há nenhuma, o kicker perde a
 * temporada em vez de inventá-la.
 */
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].rankings;
  return { title: t.title, description: t.description };
}

interface PublishedSummary {
  /** Total de rankings publicados (campo `total` da API) — a âncora da ficha. */
  total: number;
  /** Temporada mais recente publicada, para o kicker do subtítulo. */
  latestSeason: string | null;
}

async function getPublishedSummary(): Promise<PublishedSummary | null> {
  try {
    const res = await fetch(`${getApiBase()}/rankings?published=true&limit=100`, {
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const body = (await res.json()) as {
      data?: Array<{ season?: string | null }>;
      total?: number;
    };
    const data = Array.isArray(body.data) ? body.data : [];
    const total = typeof body.total === 'number' ? body.total : data.length;
    const seasons = [
      ...new Set(data.map((r) => r.season).filter((value): value is string => !!value)),
    ].sort((a, b) => b.localeCompare(a));
    return { total, latestSeason: seasons[0] ?? null };
  } catch {
    return null;
  }
}

/** "Ranking · temporada {season} · {frase do critério}" — ou sem temporada, se não houver. */
function buildSubtitle(locale: Locale, summary: PublishedSummary | null): string {
  const s = wsConceitoRankings[locale];
  const kicker = summary?.latestSeason
    ? s.kicker.replace('{season}', summary.latestSeason)
    : s.kickerPlain;
  return `${kicker} · ${s.subtitle}`;
}

export default async function RankingsPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoRankings[locale];
  const summary = await getPublishedSummary();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <FichaHead
        title={s.title}
        subtitle={buildSubtitle(locale, summary)}
        // A âncora é manchete: contagem zero (ou falha de rede) não vira "0" gigante.
        anchor={summary && summary.total > 0 ? formatCount(summary.total, locale) : undefined}
        anchorLabel={s.anchorLabel}
      />
      <RankingsIndex />
    </div>
  );
}
