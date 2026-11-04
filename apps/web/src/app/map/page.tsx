import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import FichaHead from '@/components/ficha/FichaHead';
import MapaFicha from '@/components/conceito/mapa/MapaFicha';
import { getApiBase } from '@/lib/api-base';
import { formatCount } from '@/lib/format';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { wsConceitoMapa } from '@/i18n/wsConceitoMapa';
import { metadataStrings } from '@/i18n/wsMetadata';

// WS-C-3 FASE 3+4 — /map como rota PÚBLICA do mapa (configuração aplicada na release).
// Honestidade geográfica: só clubes com coordenada são plotados; a lista é o caminho principal;
// atribuição por camada visível. Fonte dos pontos: GET /api/v1/geo/points (read-only).
//
// T579c — a TELA responde ao idioma escolhido: o idioma é lido do MESMO lugar que as outras telas
// de servidor (normalizeLocale sobre o cookie, como /players e /competitions).
// T583 — título/descrição por idioma; o locale é o MESMO cookie lido pela página.
//
// ── MIGRAÇÃO PARA O CONCEITO FICHA ────────────────────────────────────────────────────────────
// O cabeçalho passou a ser o da composição (FichaHead "O futebol no mapa"), com o TOTAL REAL de
// clubes como âncora. A âncora sai de GET /clubs?limit=1 (campo total, o mesmo que a listagem
// pública devolve) e, se a API não responde, NÃO há âncora: número não verificado não vira
// manchete. O resto da tela (filtros, mapa Leaflet, índice por estado/cidade, lista acessível,
// atribuição) vive no Client Component MapaFicha.
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].map;
  return {
    title: t.title,
    description: t.description,
    alternates: { canonical: '/map' },
  };
}

/** Total de clubes do acervo — a âncora da ficha. Falha → null (sem manchete inventada). */
async function getTotalClubs(): Promise<number | null> {
  try {
    const res = await fetch(`${getApiBase()}/clubs?limit=1`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { total?: number };
    return typeof body.total === 'number' ? body.total : null;
  } catch {
    return null;
  }
}

export default async function MapPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const s = wsConceitoMapa[locale];
  const total = await getTotalClubs();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <FichaHead
        title={s.title}
        subtitle={`${s.kicker}. ${s.subtitle}`}
        // A âncora é manchete: contagem zero (ou falha de rede) não vira "0" gigante.
        anchor={total !== null && total > 0 ? formatCount(total, locale) : undefined}
        anchorLabel={s.anchorLabel}
      />
      <MapaFicha />
    </div>
  );
}
