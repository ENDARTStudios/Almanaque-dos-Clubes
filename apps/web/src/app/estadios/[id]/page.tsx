import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { estadiosStrings } from '@/i18n/wsEstadios';
import { fichaStrings } from '@/i18n/wsFicha';
import FichaHead from '@/components/ficha/FichaHead';
import Pillar from '@/components/ficha/Pillar';
import SectionHeading from '@/components/ficha/SectionHeading';
import SourceNote from '@/components/SourceNote';

/**
 * FICHA DO ESTÁDIO.
 *
 * ── O QUE A PÁGINA DIZ, E O QUE ELA NÃO DIZ ───────────────────────────────────────────────
 * Diz: nome, cidade, país, capacidade, piso, coordenadas e o clube mandante. São os campos que o
 * banco tem, com procedência.
 *
 * NÃO diz: história, ano de inauguração, recorde de público. O `Stadium` não tem essas colunas, e
 * inventar uma seção "História" com texto genérico seria preencher a página com o que não se
 * sabe — o oposto do que o sistema de proveniência existe para garantir.
 *
 * ── POR QUE PILLAR E NÃO TABELA ───────────────────────────────────────────────────────────
 * Num estádio, a capacidade é O número: ela responde sozinha "que estádio é este". Vai em
 * `Pillar` (display, grande) porque ali o número é imagem. Cidade, país e piso são atributos
 * comparáveis — vão em `<dl>`, que é a marcação correta para par chave/valor.
 */
export const metadata: Metadata = {
  title: 'Estádio · Almanaque dos Clubes',
};

interface Estadio {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  latitude: number | null;
  longitude: number | null;
  clubName: string | null;
  sourceUrl: string | null;
}

async function getEstadio(id: string): Promise<Estadio | null> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/stadiums/${encodeURIComponent(id)}`, {
      next: { revalidate: 3600 },
    });
    if (r.status === 404) return null;
    if (!r.ok) throw new Error(`status ${r.status}`);
    const j = (await r.json()) as { data?: Estadio };
    return j.data ?? null;
  } catch {
    return null;
  }
}

export default async function EstadioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = estadiosStrings[locale];
  const f = fichaStrings[locale].states;

  const e = await getEstadio(id);
  // 404 de verdade: o recurso não existe, e a página de erro do produto assume daqui
  if (e === null) notFound();

  const atributos: Array<{ rotulo: string; valor: string }> = [
    { rotulo: s.colCity, valor: e.city ?? '—' },
    { rotulo: s.colCountry, valor: e.country ?? '—' },
    { rotulo: s.surface, valor: e.surface ?? '—' },
    {
      rotulo: s.coordinates,
      valor:
        e.latitude != null && e.longitude != null
          ? `${e.latitude.toFixed(4)}, ${e.longitude.toFixed(4)}`
          : '—',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/estadios"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {s.backToList}
      </Link>

      <FichaHead title={e.name} subtitle={e.clubName ?? s.noClub} />

      {/* a capacidade é O número deste registro: display, não célula de tabela */}
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Pillar
          label={s.capacity}
          value={e.capacity != null ? e.capacity.toLocaleString(locale) : '—'}
          accent
          note={e.capacity == null ? f.emptyBody : undefined}
        />
      </div>

      <div className="mt-10">
        <SectionHeading>{e.name}</SectionHeading>
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
          <div className="flex items-baseline justify-between gap-4 border-b border-border py-2">
            <dt className="text-xs text-ink-3">{s.homeClub}</dt>
            <dd className="text-sm text-foreground">{e.clubName ?? s.noClub}</dd>
          </div>
        </dl>

        <div className="mt-6">
          <SourceNote
            href={e.sourceUrl}
            label="Wikidata"
            detail={e.sourceUrl ? undefined : s.provenance}
          />
        </div>
      </div>
    </div>
  );
}
