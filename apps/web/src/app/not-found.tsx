'use client';

/**
 * 404 — a bola furada, no conceito FICHA.
 *
 * Estrutura do quadro: kicker "Erro 404", o número em display, o título e a frase que importa,
 * um CAMPO de busca (abre a paleta), três cartões de saída e a bola murcha à direita.
 *
 * Os contadores dos cartões vêm da API (clubs/competitions/matches, limit=1 → total). Enquanto
 * não chegam, o cartão mostra só o rótulo — nunca um número inventado. Lendas não tem contador
 * público: o cartão dela não exibe número, e não inventamos um.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import { wsC2Strings } from '@/i18n/wsC2';
import { wsLegendsStrings } from '@/i18n/wsLegends';
import { wsConceito404 } from '@/i18n/wsConceito404';
import PuncturedBall from '@/components/ficha/PuncturedBall';

interface Totais {
  clubs?: number;
  competitions?: number;
}

export default function NotFoundPage() {
  const { t, locale } = useI18n();
  const { open: openPalette } = useCommandPalette();
  const c = wsConceito404[locale];
  const f = wsC2Strings[locale].search;
  const [totais, setTotais] = useState<Totais>({});

  useEffect(() => {
    let active = true;
    const total = async (path: string): Promise<number | undefined> => {
      try {
        const res = await api.get<{ total?: number }>(path);
        return typeof res.total === 'number' ? res.total : undefined;
      } catch {
        return undefined;
      }
    };
    void Promise.all([total('/clubs?limit=1'), total('/competitions?limit=1')]).then(
      ([clubs, competitions]) => {
        if (active) setTotais({ clubs, competitions });
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const atalhos = [
    { href: '/competitions', label: t('nav.competitions'), count: totais.competitions },
    { href: '/clubs', label: t('nav.clubs'), count: totais.clubs },
    {
      href: '/legends',
      label: wsLegendsStrings[locale].nav.short,
      count: undefined,
      hint: c.legendsHint,
    },
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
      <div className="grid items-start gap-12 lg:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold tracking-[0.14em] text-ink-3 uppercase">
            {c.kicker}
          </p>
          <p className="mt-4 font-heading text-[96px] leading-none font-bold text-foreground">
            404
          </p>

          <h1 className="mt-6 font-heading text-[34px] leading-[1.05] font-bold text-foreground sm:text-[42px]">
            {t('common.notFoundTitle')}
          </h1>
          <p className="mt-3 max-w-[540px] text-[15px] leading-[22px] text-ink-2">
            {t('common.notFoundDesc')}
          </p>

          <button
            type="button"
            onClick={() => openPalette()}
            aria-label={f.palette.open}
            className="mt-7 flex h-12 w-full max-w-[560px] items-center justify-between gap-4 rounded-[2px] border border-foreground bg-surface px-4 text-left text-[14px] text-ink-3 transition-colors duration-200 hover:bg-surface-2"
          >
            <span className="truncate">{f.placeholder}</span>
            <span
              aria-hidden="true"
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[2px] bg-foreground text-background"
            >
              →
            </span>
          </button>

          <nav aria-label={c.shortcutsLabel} className="mt-8">
            <ul className="grid list-none gap-3 p-0 sm:grid-cols-3">
              {atalhos.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="flex min-h-[86px] flex-col justify-between gap-3 rounded-[2px] bg-surface-2 px-4 py-3 transition-colors duration-200 hover:bg-border/40"
                  >
                    <span className="flex items-start justify-between gap-3">
                      <span className="min-w-0">
                        {a.count != null ? (
                          <span className="num block text-[26px] leading-none font-bold text-foreground">
                            {a.count.toLocaleString(
                              locale === 'en-us' ? 'en-US' : locale === 'es-es' ? 'es-ES' : 'pt-BR',
                            )}
                          </span>
                        ) : null}
                        <span className="mt-1 block text-[12px] font-semibold text-foreground">
                          {a.label}
                        </span>
                        {a.hint ? (
                          <span className="mt-0.5 block text-[10px] text-ink-3">{a.hint}</span>
                        ) : null}
                      </span>
                      <span aria-hidden="true" className="shrink-0 text-primary-ink">
                        →
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-8 max-w-[720px] border-t border-border pt-3 text-[11px] leading-snug text-ink-3">
            {c.note}
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 lg:pt-6">
          <div className="text-foreground">
            <PuncturedBall size={280} />
          </div>
          <p className="text-[11px] text-ink-3">{c.ballCaption}</p>
        </div>
      </div>
    </div>
  );
}
