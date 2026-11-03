import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { getApiBase } from '@/lib/api-base';
import { formatDate } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { temporadasStrings, rotuloDaSituacao } from '@/i18n/wsTemporadas';
import { fichaStrings } from '@/i18n/wsFicha';
import FichaHead from '@/components/ficha/FichaHead';
import DataTable from '@/components/ficha/DataTable';
import SectionHeading from '@/components/ficha/SectionHeading';
import { EmptyState, ErrorState } from '@/components/ficha/States';
import SourceNote from '@/components/SourceNote';

/**
 * TEMPORADAS — a rota que não existia.
 *
 * ── O QUE ESTAVA FALTANDO ──────────────────────────────────────────────────────────────────
 * O model `Season` existe, a API serve `GET /seasons` desde antes, e o acervo tem 32 temporadas.
 * Não havia página. O efeito é silencioso: "campeão de 1950" é uma frase que o produto não
 * conseguia sustentar, porque não havia onde ver o que é a temporada de 1950.
 *
 * ── POR QUE TABELA ────────────────────────────────────────────────────────────────────────
 * Temporada é dado comparável: nome, situação, início, fim. Trinta e duas linhas alinhadas se leem
 * de cima a baixo; trinta e dois cartões exigem que o olho reencontre a mesma coluna a cada um.
 *
 * ── O ENUM NÃO VAI PARA A TELA ────────────────────────────────────────────────────────────
 * `PLANNED | ONGOING | FINISHED` é código. `rotuloDaSituacao` traduz nos três idiomas, e o valor
 * desconhecido devolve o próprio código em vez de sumir — se o banco ganhar um estado novo, a
 * tabela mostra o código e é possível descobrir que falta tradução, em vez de receber célula
 * vazia e não saber por quê.
 */
export const metadata: Metadata = {
  title: 'Temporadas · Almanaque dos Clubes',
};

interface Temporada {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  status: string;
}

async function getTemporadas(): Promise<{ itens: Temporada[]; total: number } | null> {
  try {
    const base = getApiBase();
    const r = await fetch(`${base}/seasons?limit=100`, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const j = (await r.json()) as { data?: Temporada[]; total?: number };
    return { itens: j.data ?? [], total: j.total ?? 0 };
  } catch {
    return null;
  }
}

export default async function TemporadasPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = temporadasStrings[locale];
  const f = fichaStrings[locale].states;

  const dados = await getTemporadas();

  // falha de rede não é "nenhuma temporada"
  if (dados === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <FichaHead title={s.title} subtitle={s.subtitle} />
        <div className="mt-8">
          <ErrorState
            title={f.errorTitle}
            body={f.errorBody}
            retryLabel={f.retry}
            retryHref="/temporadas"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
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
              { header: s.colSeason, align: 'left' },
              { header: s.colStatus, align: 'left' },
              { header: s.colStart, align: 'left' },
              { header: s.colEnd, align: 'left' },
            ]}
            rows={dados.itens.map((t) => [
              <Link
                key={t.id}
                href={`/temporadas/${t.id}`}
                className="text-primary-ink hover:underline"
              >
                {t.name}
              </Link>,
              // situação como TEXTO traduzido, nunca o enum cru
              <span key={`s-${t.id}`} className="text-ink-2">
                {rotuloDaSituacao(t.status, locale)}
              </span>,
              // data ausente mostra "—": o campo é lacuna, não o dia 1º de janeiro
              <span key={`i-${t.id}`} className="text-ink-3 tabular-nums">
                {t.startDate ? formatDate(t.startDate, locale) : '—'}
              </span>,
              <span key={`f-${t.id}`} className="text-ink-3 tabular-nums">
                {t.endDate ? formatDate(t.endDate, locale) : '—'}
              </span>,
            ])}
          />
        )}

        <div className="mt-6">
          <SourceNote label="Acervo" detail={s.provenance} />
        </div>
      </div>
    </div>
  );
}
