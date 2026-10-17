'use client';

import { useEffect, useRef, useState } from 'react';
import { Globe, Check } from 'lucide-react';
import { useI18n } from '@/i18n/Provider';
import { LOCALES, LOCALE_NAMES, type Locale } from '@/i18n/config';
import LocaleFlag from '@/components/LocaleFlag';

/**
 * Seletor de idioma — LISTA PRÓPRIA, com o design do site.
 *
 * O QUE ESTAVA ERRADO
 *   O controle era um `<select>` NATIVO sobreposto em `opacity-0`. O gatilho era estilizado com os
 *   tokens, mas a JANELA que abre é desenhada pelo SISTEMA OPERACIONAL — e não há CSS que a alcance.
 *   O Operador descreveu exatamente isso: "a janela que abre está sem o design do site".
 *
 *   O truque do `<select>` invisível resolvia um problema real de largura (o `<select>` nativo tem a
 *   largura do maior `<option>`, e "Português (BR)" inchava a barra para 235px). Mas trocou um
 *   problema de layout por um de identidade: o menu do sistema aparecia como um retângulo alheio ao
 *   site, sem cantos, sem borda e sem as cores da paleta.
 *
 *   Agora o gatilho continua compacto (a SIGLA, 2,25rem) e a lista é NOSSA — `rounded-xl border
 *   border-border bg-background shadow-lg`, o mesmo padrão dos outros dropdowns do projeto.
 *
 * O QUE FOI PRESERVADO DO NATIVO, porque era bom
 *   - **Teclado completo**: setas navegam, Home/End vão às pontas, Enter/Espaço escolhem, Esc fecha
 *     e devolve o foco ao gatilho.
 *   - **`aria` de listbox**: `aria-expanded`, `aria-haspopup`, `role="listbox"`/`option` e
 *     `aria-selected` no idioma atual.
 *   - **Fecha ao clicar fora**, sem roubar o foco de quem navega por teclado.
 */

/** Rótulo curto do gatilho. `pt-br` → `PT`. */
const sigla = (l: Locale) => l.split('-')[0]?.toUpperCase() ?? l.toUpperCase();

export default function LanguageSelector() {
  const { locale, setLocale } = useI18n();
  const [aberto, setAberto] = useState(false);
  /**
   * Índice destacado. `null` = o usuário ainda não navegou na lista.
   *
   * O destaque é DERIVADO: sem interação, quem aparece destacado é o idioma ATUAL. Sem isto, abrir
   * a lista destacaria o primeiro item e o usuário teria de procurar onde está antes de escolher
   * outra coisa.
   *
   * Um `useEffect` que escrevesse `setFocado` ao abrir daria no mesmo e dispararia render em
   * cascata — o lint do projeto acusa, com razão. Derivar não tem esse custo e não tem estado a
   * manter em sincronia.
   */
  const [focadoManual, setFocadoManual] = useState<number | null>(null);
  const focado = focadoManual ?? Math.max(0, LOCALES.indexOf(locale));
  const containerRef = useRef<HTMLDivElement>(null);
  const gatilhoRef = useRef<HTMLButtonElement>(null);
  const listaRef = useRef<HTMLUListElement>(null);

  /* Fecha ao clicar fora. O listener é registrado só quando aberto: um listener permanente em
     `document` para cada instância de navbar é desperdício. */
  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setAberto(false);
        // A navegação por teclado recomeça do idioma atual na próxima abertura.
        setFocadoManual(null);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  /* O item destacado precisa estar visível. São três hoje, mas se um dia forem dez, a lista rola. */
  useEffect(() => {
    if (!aberto || focado < 0) return;
    const item = listaRef.current?.children[focado] as HTMLElement | undefined;
    // `scrollIntoView` não existe em jsdom — o ambiente de teste. A guarda é do ambiente, não do
    // navegador, mas sem ela o teste quebra por um método que a plataforma real sempre tem.
    item?.scrollIntoView?.({ block: 'nearest' });
  }, [aberto, focado]);

  const escolher = (l: Locale) => {
    setLocale(l);
    setAberto(false);
    setFocadoManual(null);
    // O foco volta ao gatilho: sem isto, quem usa teclado perde o lugar na página depois de
    // escolher — o item da lista deixa de existir quando ela fecha.
    gatilhoRef.current?.focus();
  };

  const aoTeclar = (e: React.KeyboardEvent) => {
    if (!aberto) {
      // Abrir pelo teclado, como um `<select>` nativo faz.
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setAberto(true);
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocadoManual((focado + 1) % LOCALES.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocadoManual((focado - 1 + LOCALES.length) % LOCALES.length);
        break;
      case 'Home':
        e.preventDefault();
        setFocadoManual(0);
        break;
      case 'End':
        e.preventDefault();
        setFocadoManual(LOCALES.length - 1);
        break;
      case 'Enter':
      case ' ': {
        e.preventDefault();
        const alvo = LOCALES[focado];
        if (alvo) escolher(alvo);
        break;
      }
      case 'Escape':
        e.preventDefault();
        setAberto(false);
        setFocadoManual(null);
        gatilhoRef.current?.focus();
        break;
      case 'Tab':
        // Tab sai da lista e fecha — comportamento esperado de menu.
        setAberto(false);
        break;
    }
  };

  return (
    <div ref={containerRef} className="relative shrink-0" onKeyDown={aoTeclar}>
      <button
        ref={gatilhoRef}
        type="button"
        onClick={() => setAberto((a) => !a)}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-label={LOCALE_NAMES[locale]}
        title={LOCALE_NAMES[locale]}
        data-testid="language-trigger"
        className="relative inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground/80 transition-colors duration-200 hover:border-primary-ink/50 hover:text-primary-ink"
      >
        <Globe className="h-4 w-4 -translate-y-0.5" aria-hidden="true" />
        {/* O badge fica na base do controle, CENTRADO. Antes ele ficava no canto inferior direito e
            colidia com o globo em 8×2 px (medido): o globo tem 16 px num controle de 36 px, então
            sobra pouca folga lateral. Centrado e deslocado para baixo, os dois não se tocam. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0.5 text-center text-[8px] font-bold uppercase leading-none tracking-wider text-foreground/60"
        >
          {sigla(locale)}
        </span>
      </button>

      {aberto ? (
        <ul
          ref={listaRef}
          role="listbox"
          aria-label={LOCALE_NAMES[locale]}
          data-testid="language-list"
          /* `right-0`, e não `left-0`: o controle vive na ponta DIREITA da barra, e uma lista
             alinhada à esquerda sairia da tela em viewport estreita. */
          className="absolute right-0 z-50 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-background py-1 shadow-lg"
        >
          {LOCALES.map((l, i) => {
            const ativo = l === locale;
            const destacado = i === focado;
            return (
              <li key={l}>
                <button
                  type="button"
                  role="option"
                  aria-selected={ativo}
                  data-testid={`language-option-${l}`}
                  onMouseEnter={() => setFocadoManual(i)}
                  onClick={() => escolher(l)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors duration-200 ${
                    destacado ? 'bg-foreground/5 text-primary-ink' : 'text-foreground'
                  }`}
                >
                  <span aria-hidden="true">
                    <LocaleFlag locale={l} />
                  </span>
                  <span className="flex-1">{LOCALE_NAMES[l]}</span>
                  {/* O idioma em uso é MARCADO. O `<select>` nativo mostrava isso pela posição;
                      uma lista própria precisa dizer explicitamente. */}
                  {ativo ? (
                    <Check className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
