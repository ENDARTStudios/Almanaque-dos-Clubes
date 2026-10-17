import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { Fragment } from 'react';
import GeoMapInternal from '@/components/GeoMapInternal';
import { getDictionary } from '@/i18n/getDictionary';
import { mapPageStrings } from '@/i18n/wsMapPage';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';

// WS-C-3 FASE 3+4 — /map como rota PÚBLICA do mapa (configuração aplicada na release).
// Honestidade geográfica: só clubes com coordenada são plotados; a lista é o caminho principal;
// atribuição por camada visível. Fonte dos pontos: GET /api/v1/geo/points (read-only).
//
// T579c — a TELA responde ao idioma escolhido. Medido em produção (auditoria de 16/10): o `h1`
// era o literal "Mapa-múndi" nos três idiomas, e todo o corpo da tela (rótulos, atribuição,
// listas) também. O idioma é lido do MESMO lugar que as outras telas de servidor
// (`normalizeLocale` sobre o cookie, como `/players` e `/competitions`), e o `h1` reusa a
// chave que o site já tem para "mapa-múndi" (`home.explore.map`) — nenhum texto novo para a
// mesma frase. As strings próprias desta tela vivem no módulo aditivo `i18n/wsMapPage.ts`.
// T583 — título/descrição por idioma; o locale é o MESMO cookie lido pela página.
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

export default async function MapPage() {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const dict = getDictionary(locale);
  const s = mapPageStrings[locale];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground">
        {dict.home.explore.map}
      </h1>
      <p className="text-foreground/60 measure-readable mt-2 mb-6">
        {s.intro.map((segmento, i) =>
          segmento.strong ? (
            <strong key={i}>{segmento.text}</strong>
          ) : (
            <Fragment key={i}>{segmento.text}</Fragment>
          ),
        )}
      </p>
      <GeoMapInternal />
    </div>
  );
}
