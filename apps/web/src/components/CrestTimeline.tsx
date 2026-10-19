/**
 * LINHA DO TEMPO DOS ESCUDOS — T32.
 *
 * ── O QUE ESTA SEÇÃO MOSTRA, E O QUE ELA NÃO ESCONDE ────────────────────────────────────
 * Mostra cada escudo com o PERÍODO em que foi usado, quando o período é conhecido. Quando não
 * é, o rótulo diz "período não catalogado" em vez de inventar uma faixa: "1902–?" e "?" são
 * respostas honestas; "1902–1970" sem fonte é invenção.
 *
 * A LICENÇA E A ORIGEM aparecem em cada item, com link para a página de onde a licença foi lida.
 * Escudo de clube é marca registrada — mostrar sem procedência não é exibir acervo, é exibir
 * risco.
 *
 * ── POR QUE A IMAGEM É `<img>` E NÃO `next/image` ────────────────────────────────────────
 * `next/image` exige que o domínio esteja liberado em `images.remotePatterns`; as URLs de escudo
 * vêm de `upload.wikimedia.org` e mudam por arquivo. Usar `<img>` com `loading="lazy"` e
 * dimensões explícitas evita uma configuração de infraestrutura para um conjunto pequeno e
 * heterogêneo de imagens — e evita que um domínio novo quebre a página inteira.
 */
'use client';

import { useState } from 'react';

export interface CrestItem {
  id: string;
  imageUrl: string;
  sourceUrl: string;
  license: string;
  attribution: string | null;
  yearFrom: number | null;
  yearTo: number | null;
  isCurrent: boolean;
  periodLabel: string | null;
}

export interface CrestTimelineStrings {
  title: string;
  current: string;
  unknownPeriod: string;
  licenseLabel: string;
  sourceLabel: string;
  attributionLabel: string;
  singleNote: string;
  imageAlt: (period: string) => string;
}

export function CrestTimeline({
  crests,
  strings,
}: {
  crests: CrestItem[];
  strings: CrestTimelineStrings;
}) {
  /* Item aberto para os detalhes de licença. Começa no vigente: é o que a pessoa procurou. */
  const [aberto, setAberto] = useState<string | null>(
    crests.find((c) => c.isCurrent)?.id ?? crests[0]?.id ?? null,
  );

  if (crests.length === 0) return null;

  const periodoDe = (c: CrestItem): string => {
    if (c.periodLabel) return c.periodLabel;
    if (c.isCurrent) return strings.current;
    return strings.unknownPeriod;
  };

  return (
    <section aria-labelledby="club-crests" className="mt-10" data-testid="club-crests">
      <h2 id="club-crests" className="text-xl font-heading font-bold mb-1">
        {strings.title}
      </h2>
      {/* Com um escudo só não existe evolução — e dizer "evolução" para um item seria promessa
          vazia. A nota explica por que a lista tem o tamanho que tem. */}
      {crests.length === 1 ? (
        <p className="text-sm text-foreground/60 mb-4" data-testid="club-crests-single-note">
          {strings.singleNote}
        </p>
      ) : null}

      <ol className="mt-4 flex gap-4 overflow-x-auto pb-2" data-testid="club-crests-list">
        {crests.map((c) => {
          const periodo = periodoDe(c);
          const selecionado = aberto === c.id;
          return (
            <li key={c.id} className="shrink-0">
              <button
                type="button"
                onClick={() => setAberto(selecionado ? null : c.id)}
                aria-expanded={selecionado}
                aria-controls={`crest-detail-${c.id}`}
                className={`flex w-32 flex-col items-center rounded-xl border p-3 text-center transition-colors ${
                  selecionado ? 'border-primary' : 'border-border hover:border-foreground/40'
                }`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- ver cabeçalho: domínio
                    de origem variável, conjunto pequeno, e `next/image` exigiria liberar cada
                    host em `images.remotePatterns`. */}
                <img
                  src={c.imageUrl}
                  alt={strings.imageAlt(periodo)}
                  width={80}
                  height={80}
                  loading="lazy"
                  className="h-20 w-20 object-contain"
                />
                <span className="mt-2 text-xs font-semibold">{periodo}</span>
                {c.isCurrent ? (
                  <span className="mt-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {strings.current}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ol>

      {aberto
        ? (() => {
            const c = crests.find((x) => x.id === aberto);
            if (!c) return null;
            return (
              <dl
                id={`crest-detail-${c.id}`}
                className="mt-3 grid gap-1 rounded-xl border border-border p-3 text-xs sm:grid-cols-2"
                data-testid="club-crests-detail"
              >
                <div>
                  <dt className="font-semibold">{strings.licenseLabel}</dt>
                  <dd className="text-foreground/70">{c.license}</dd>
                </div>
                {c.attribution ? (
                  <div>
                    <dt className="font-semibold">{strings.attributionLabel}</dt>
                    <dd className="text-foreground/70">{c.attribution}</dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2">
                  <dt className="font-semibold">{strings.sourceLabel}</dt>
                  <dd>
                    <a
                      href={c.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline break-all"
                    >
                      {c.sourceUrl}
                    </a>
                  </dd>
                </div>
              </dl>
            );
          })()
        : null}
    </section>
  );
}
