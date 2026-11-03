import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatDate } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { temporadasStrings, rotuloDaSituacao } from '@/i18n/wsTemporadas';
import { fichaStrings } from '@/i18n/wsFicha';
import FichaHead from '@/components/ficha/FichaHead';
import SectionHeading from '@/components/ficha/SectionHeading';
import SourceNote from '@/components/SourceNote';

/**
 * FICHA DA TEMPORADA.
 *
 * ── O QUE ELA FAZ DE ÚTIL ─────────────────────────────────────────────────────────────────
 * Uma temporada sozinha é um nome e duas datas. O que a torna útil é o que se pode ABRIR a partir
 * dela: as partidas daquele recorte. O `Season` não tem agregados (não há "quantos jogos"), mas a
 * API de partidas aceita `seasonId` — então a ficha leva para `/matches?seasonId=<id>`, onde os
 * números existem de verdade, em vez de repetir aqui um resumo que a página teria de inventar.
 *
 * ── O QUE ELA NÃO DIZ ────────────────────────────────────────────────────────────────────
 * Não diz campeão, artilheiro nem total de jogos: esses dados exigem agregação que a rota de
 * temporada não faz. Escrever "0 partidas" quando não se consultou seria a mesma mentira que a
 * página de histórico cometia antes de perguntar ao backend.
 */
export const metadata: Metadata = {
  title: 'Temporada · Almanaque dos Clubes',
};

interface Temporada {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

async function getTemporada(id: string): Promise<Temporada | null> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/seasons/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = (await r.json()) as { data?: Temporada };
    return j.data ?? null;
  } catch {
    return null;
  }
}

export default async function TemporadaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = temporadasStrings[locale];
  const f = fichaStrings[locale].states;

  const t = await getTemporada(id);
  if (t === null) notFound();

  const atributos: Array<{ rotulo: string; valor: string }> = [
    { rotulo: s.colStatus, valor: rotuloDaSituacao(t.status, locale) },
    { rotulo: s.startDate, valor: t.startDate ? formatDate(t.startDate, locale) : '—' },
    { rotulo: s.endDate, valor: t.endDate ? formatDate(t.endDate, locale) : '—' },
  ];

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/temporadas"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToList}
      </Link>

      <FichaHead title={t.name} subtitle={rotuloDaSituacao(t.status, locale)} />

      <div className="mt-8">
        <SectionHeading>{t.name}</SectionHeading>
        <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
          {atributos.map((a) => (
            <div
              key={a.rotulo}
              className="flex items-baseline justify-between gap-4 border-b border-border py-2"
            >
              <dt className="text-xs text-ink-3">{a.rotulo}</dt>
              <dd className="text-sm text-foreground tabular-nums">{a.valor}</dd>
            </div>
          ))}
        </dl>

        {/* a saída para onde os números existem de fato */}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href={`/matches?seasonId=${encodeURIComponent(t.id)}`}
            className="inline-flex min-h-11 items-center rounded-lg border border-foreground bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-200 hover:opacity-90"
          >
            {s.colSeason}: {t.name}
          </Link>
        </div>

        <div className="mt-6">
          <SourceNote label="Acervo" detail={s.provenance} />
        </div>
      </div>
    </div>
  );
}
