'use client';

/**
 * 404 — a bola furada.
 *
 * ── O QUE ESTAVA ERRADO ANTES ───────────────────────────────────────────────────────────────
 * A página era: seletor de idioma no TOPO (lugar onde ninguém procura idioma numa página de
 * erro), um "404" em 8xl cinza-claro, título, descrição e um único botão "voltar ao início".
 *
 * Dois problemas, e o segundo é o que importa:
 *   1. o número do protocolo em destaque — o usuário não pediu o código, pediu o que ele estava
 *      procurando;
 *   2. UMA saída só. Quem errou o endereço de uma competição não quer a home; quer a competição.
 *      O conceito desenhou três caminhos, e é o que esta página passa a oferecer: a busca, o
 *      índice do que ele provavelmente queria, e o caminho de volta.
 *
 * ── POR QUE A BUSCA ABRE A PALETA E NÃO NAVEGA ─────────────────────────────────────────────
 * Mesma razão da navbar: buscar é a ação central de uma enciclopédia. A paleta é a superfície
 * feita para isso e já tem foco preso e navegação por teclado — uma página de busca
 * intermediária reintroduziria a mesma dúvida ("e agora, onde digito?").
 *
 * ── A ILUSTRAÇÃO ───────────────────────────────────────────────────────────────────────────
 * `PuncturedBall` desenha uma bola murcha em vetor. Ela diz "algo que devia estar cheio está
 * vazio, e é reversível" sem escrever isso — e sem depender de banco de imagens para uma página
 * que não tem assunto fotografável.
 */
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { useCommandPalette } from '@/components/CommandPaletteProvider';
import { wsC2Strings } from '@/i18n/wsC2';
import { fichaStrings } from '@/i18n/wsFicha';
import { wsLegendsStrings } from '@/i18n/wsLegends';
import FichaHead from '@/components/ficha/FichaHead';
import PuncturedBall from '@/components/ficha/PuncturedBall';

export default function NotFoundPage() {
  const { t, locale } = useI18n();
  const { open: openPalette } = useCommandPalette();
  const f = fichaStrings[locale];

  // As três saídas: o que o acervo tem de maior, na ordem em que alguém procura.
  const atalhos = [
    { href: '/competitions', label: t('nav.competitions') },
    { href: '/clubs', label: t('nav.clubs') },
    // NÃO existe `nav.legends` no dicionário: `t()` devolve a PRÓPRIA CHAVE quando não
    // encontra, e a tela mostrava o literal "nav.legends" no botão. O rótulo de Lendas
    // vive no módulo aditivo do panteão, que é de onde o Navbar o tira.
    { href: '/legends', label: wsLegendsStrings[locale].nav.short },
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
        <div>
          <FichaHead title={t('common.notFoundTitle')} subtitle={t('common.notFoundDesc')} />

          {/* Ação primária: buscar. É o que a pessoa tentava fazer quando o endereço falhou. */}
          <button
            type="button"
            onClick={() => openPalette()}
            aria-label={wsC2Strings[locale].search.palette.open}
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-lg border border-foreground bg-foreground px-5 text-sm font-semibold text-background transition-colors duration-200 hover:opacity-90"
          >
            {wsC2Strings[locale].search.palette.open}
          </button>

          {/* Saídas laterais: os três índices que cobrem quase tudo do acervo. */}
          <nav aria-label={f.states.emptyTitle} className="mt-8">
            <ul className="flex flex-wrap gap-3">
              {atalhos.map((a) => (
                <li key={a.href}>
                  <Link
                    href={a.href}
                    className="inline-flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground transition-colors duration-200 hover:border-primary/60"
                  >
                    {a.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <p className="mt-8 text-xs text-ink-3">
            {/* proveniência: a página de erro não inventa dado para preencher espaço */}
            {t('common.backHome')} · 404
          </p>
        </div>

        <div className="flex justify-center text-foreground sm:justify-end">
          <PuncturedBall size={200} />
        </div>
      </div>
    </div>
  );
}
