import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { estadiosStrings } from '@/i18n/wsEstadios';
import { fichaStrings } from '@/i18n/wsFicha';
import FichaHead from '@/components/ficha/FichaHead';
import DataTable from '@/components/ficha/DataTable';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';

/**
 * ESTÁDIOS — a rota que não existia.
 *
 * ── O QUE ESTAVA FALTANDO ──────────────────────────────────────────────────────────────────
 * A tabela `stadiums` existe desde a migration `20260905_stadiums_postgis`, com geografia
 * normalizada (Country/State/City), capacidade, piso, QID do Wikidata e vínculo com o clube
 * mandante. O acervo tem 84 estádios cadastrados e 3.475 clubes com `stadiumName`. Não havia
 * **nenhuma** superfície pública para lê-los: o dado estava no banco e não no produto.
 *
 * ── POR QUE TABELA, E NÃO CARDS ───────────────────────────────────────────────────────────
 * Estádio é dado comparável: capacidade, cidade, país. Uma grade de cartões obrigaria o olho a
 * reencontrar o mesmo campo em cada retângulo. A `DataTable` alinha as colunas e permite ler a
 * lista de cima a baixo — que é o que se faz com 84 estádios ordenados por capacidade.
 *
 * ── ORDENAÇÃO ─────────────────────────────────────────────────────────────────────────────
 * Capacidade decrescente, decidida na API. O Maracanã e o Camp Nou são a razão de a página
 * existir; o estádio de 5 mil lugares é a cauda. Sem capacidade, o registro vai ao fim em vez de
 * ser escondido: dado ausente não é dado inexistente.
 */
export const metadata: Metadata = {
  title: 'Estádios · Almanaque dos Clubes',
};

interface Estadio {
  id: string;
  name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  capacity: number | null;
  surface: string | null;
  clubName: string | null;
}

async function getEstadios(): Promise<{ itens: Estadio[]; total: number } | null> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/stadiums?limit=100`, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Estadio[]; total?: number };
    return { itens: j.data ?? [], total: j.total ?? 0 };
  } catch {
    return null;
  }
}

export default async function EstadiosPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = estadiosStrings[locale];
  const f = fichaStrings[locale].states;

  const dados = await getEstadios();

  // falha de rede NÃO é "nenhum estádio": são coisas diferentes e o usuário precisa saber qual
  if (dados === null) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <FichaHead title={s.title} subtitle={s.subtitle} />
        <div className="mt-8">
          <ErrorState
            title={f.errorTitle}
            body={f.errorBody}
            retryLabel={f.retry}
            retryHref="/estadios"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <FichaHead
        title={s.title}
        subtitle={s.subtitle}
        anchor={dados.total > 0 ? String(dados.total) : undefined}
      />

      <div className="mt-8">
        <SectionHeading aside={dados.total > 0 ? String(dados.total) : undefined}>
          {s.title}
        </SectionHeading>

        {dados.itens.length === 0 ? (
          <div className="mt-4">
            <EmptyState title={s.title} body={f.emptyBody} />
          </div>
        ) : (
          <DataTable
            caption={s.title}
            columns={[
              { header: s.colName, align: 'left' },
              { header: s.colCity, align: 'left' },
              { header: s.colCountry, align: 'left' },
              { header: s.colCapacity, align: 'right' },
              { header: s.colClub, align: 'left' },
            ]}
            rows={dados.itens.map((e) => [
              <Link
                key={e.id}
                href={`/estadios/${e.id}`}
                className="text-primary-ink hover:underline"
              >
                {e.name}
              </Link>,
              <span key={`c-${e.id}`} className="text-ink-2">
                {e.city ?? '—'}
              </span>,
              <span key={`p-${e.id}`} className="text-ink-3">
                {e.country ?? '—'}
              </span>,
              // capacidade ausente mostra "—", nunca 0: 0 é uma afirmação, "—" é uma lacuna
              <span key={`k-${e.id}`} className="tabular-nums">
                {e.capacity != null ? e.capacity.toLocaleString(locale) : '—'}
              </span>,
              <span key={`m-${e.id}`} className="text-ink-2">
                {e.clubName ?? '—'}
              </span>,
            ])}
          />
        )}

        {/* proveniência pelo componente do projeto — a URL fica para a curadoria preencher */}
        <div className="mt-6">
          <SourceNote label="Wikidata" detail={s.provenance} />
        </div>
      </div>
    </div>
  );
}
