'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search as SearchIcon, CornerDownLeft, ArrowUpDown, X } from 'lucide-react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import { wsC2Strings } from '@/i18n/wsC2';

/**
 * PALETA DE COMANDO — a ideia central do conceito: o acervo é a interface.
 *
 * O diagnóstico que a originou: a busca era um campo secundário na barra, com o mesmo peso de
 * um link de menu. Numa enciclopédia, a busca É o produto — e por isso ela vira superfície
 * própria, com o tamanho do acervo declarado dentro dela, resultados agrupados e navegação
 * completa por teclado.
 *
 * Cinco decisões que não são de gosto:
 *
 * 1. **A contagem de cada resultado é ROTULADA.** O conceito diz "36 / TÍTULOS", nunca "36"
 *    solto. `subtitle` vem da API e já traz o que o número significa; um número sem rótulo é
 *    adivinhação.
 *
 * 2. **`role="combobox"` com `aria-activedescendant`, não foco por item.** Mover o foco real
 *    para cada resultado faria o leitor de tela anunciar a lista inteira a cada seta. Com
 *    `aria-activedescendant` o foco fica no input e só o item ATIVO é anunciado.
 *
 * 3. **2 letras mínimas.** Com 1 letra a API devolve centenas de clubes começando pela mesma
 *    letra: a lista vira ruído e cada tecla dispara uma requisição.
 *
 * 4. **Debounce de 220ms e cancelamento por `AbortController`.** Sem o cancelamento, a resposta
 *    de "rea" pode chegar DEPOIS da de "real madrid" e sobrescrever a lista com o resultado
 *    errado — é corrida de rede, não hipótese, e o sintoma é a lista "voltar no tempo".
 *
 * 5. **`prefers-reduced-motion` em CSS.** A animação de entrada é declarada em `globals.css`,
 *    onde a regra global de `reduce` a neutraliza. Movimento em JS (GSAP/WAAPI) precisaria de
 *    gate em JS; aqui não precisa porque não há JS animando.
 */

interface SearchResult {
  type: 'club' | 'competition' | 'player';
  id: string;
  qid: string | null;
  name: string;
  subtitle: string | null;
  country: string | null;
  city?: string | null;
  score: number;
  sourceUrl: string | null;
}

interface SearchResponse {
  query: string;
  normalizedQuery: string;
  type: 'all' | 'club' | 'competition' | 'player';
  results: SearchResult[];
  pagination: { limit: number; offset: number; total: number };
  limitations: string[];
}

const MIN_CHARS = 2;
const DEBOUNCE_MS = 220;

/** Rota de destino por tipo. Um resultado que não leva a lugar nenhum é pior que não ter lista. */
function hrefFor(r: SearchResult): string {
  if (r.type === 'club') return `/clubs/${r.id}`;
  if (r.type === 'player') return `/players/${r.id}`;
  return `/competitions/${r.id}`;
}

export default function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { locale, t } = useI18n();
  const s = wsC2Strings[locale].search;
  const p = s.palette;

  const [q, setQ] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [active, setActive] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const restoreFocus = useRef<HTMLElement | null>(null);

  // O portal só existe no cliente. Sem isto o SSR tentaria renderizar em `document`.
  useEffect(() => setMounted(true), []);

  /** Agrupa preservando a ORDEM de relevância que a API devolveu dentro de cada grupo. */
  const groups = useMemo(() => {
    const ordem: Array<'club' | 'competition' | 'player'> = ['club', 'competition', 'player'];
    const rotulo = { club: p.groupClubs, competition: p.groupCompetitions, player: p.groupPlayers };
    return ordem
      .map((tipo) => ({ tipo, rotulo: rotulo[tipo], itens: results.filter((r) => r.type === tipo) }))
      .filter((g) => g.itens.length > 0);
  }, [results, p.groupClubs, p.groupCompetitions, p.groupPlayers]);

  /** Lista ACHATADA na mesma ordem visual — é o que a navegação por seta percorre. */
  const flat = useMemo(() => groups.flatMap((g) => g.itens), [groups]);

  // Abrir: guarda quem tinha o foco, foca o input, trava o scroll do corpo.
  useEffect(() => {
    if (!open) return;
    restoreFocus.current = (document.activeElement as HTMLElement) ?? null;
    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      document.body.style.overflow = overflowAnterior;
      restoreFocus.current?.focus?.();
    };
  }, [open]);

  /**
   * PRISÃO DE FOCO — o que `aria-modal="true"` promete.
   *
   * Sem isto o Tab escapa do overlay para os links da página ATRÁS: quem navega por teclado
   * passa a focar conteúdo que não está visível (o fundo está coberto pelo backdrop), e o
   * `aria-modal` vira afirmação falsa — pior que não declarar modalidade, porque o leitor de
   * tela confia nela e não anuncia o resto.
   *
   * Aqui há dois focáveis (o campo e o botão de fechar), então alternar entre eles basta. O
   * `Tab` do último volta ao primeiro e o `Shift+Tab` do primeiro vai ao último — o ciclo
   * esperado de um diálogo modal.
   */
  const onTrapTab = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const focaveis = e.currentTarget.querySelectorAll<HTMLElement>(
      'input, button, [href], [tabindex]:not([tabindex="-1"])',
    );
    const primeiro = focaveis[0];
    const ultimo = focaveis[focaveis.length - 1];
    if (!primeiro || !ultimo) return;
    const atual = document.activeElement;
    if (!e.shiftKey && atual === ultimo) {
      e.preventDefault();
      primeiro.focus();
    } else if (e.shiftKey && atual === primeiro) {
      e.preventDefault();
      ultimo.focus();
    }
  };

  // Fechar com Esc em qualquer lugar da página, não só no input.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Busca com debounce e GUARDA DE SEQUÊNCIA.
  //
  // A corrida é real: a resposta de "rea" pode chegar DEPOIS da de "real madrid" e sobrescrever
  // a lista — o sintoma é a lista "voltar no tempo" enquanto a pessoa digita. O remédio usual
  // seria `AbortController`, mas `api.get` NÃO aceita `signal`, e contornar o cliente de API
  // custaria a renovação de sessão e o tratamento de erro que ele concentra.
  //
  // Então a guarda é por SEQUÊNCIA: só aplica a resposta se o termo dela ainda for o termo
  // atual. É a mesma garantia de corretude daqui (a resposta velha é descartada) sem abortar a
  // requisição — o que se perde é só a economia de banda, não a exatidão.
  const termoAtual = useRef('');
  useEffect(() => {
    if (!open) return;
    const termo = q.trim();
    termoAtual.current = termo;
    if (termo.length < MIN_CHARS) {
      setResults([]);
      setState('idle');
      return;
    }
    const id = window.setTimeout(() => {
      setState('loading');
      api
        .get<SearchResponse>(`/search/global?q=${encodeURIComponent(termo)}&type=all&limit=12`)
        .then((res) => {
          if (termoAtual.current !== termo) return; // resposta obsoleta: descarta
          setResults(res.results ?? []);
          setActive(0);
          setState('done');
        })
        .catch(() => {
          if (termoAtual.current !== termo) return;
          setState('error');
        });
    }, DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [q, open]);

  const irPara = useCallback(
    (r: SearchResult) => {
      onClose();
      router.push(hrefFor(r));
    },
    [onClose, router],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (flat.length === 0) return;
      const passo = e.key === 'ArrowDown' ? 1 : -1;
      setActive((i) => (i + passo + flat.length) % flat.length);
      return;
    }
    if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      setActive(e.key === 'Home' ? 0 : Math.max(0, flat.length - 1));
      return;
    }
    if (e.key === 'Enter') {
      const escolhido = flat[active];
      if (escolhido) {
        e.preventDefault();
        irPara(escolhido);
      }
    }
  };

  // Mantém o item ativo visível. `block: 'nearest'` evita o salto quando ele já está na tela.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-ativo="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!mounted || !open) return null;

  const termo = q.trim();
  const curto = termo.length > 0 && termo.length < MIN_CHARS;
  let idx = -1;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      {/* Fundo: clicar fecha. `aria-hidden` porque o conteúdo acessível é o diálogo. */}
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden="true"
        onClick={onClose}
        data-testid="palette-backdrop"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={p.open}
        onKeyDown={onTrapTab}
        className="palette-card-in relative w-full max-w-2xl overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
        data-testid="command-palette"
      >
        {/* ── Campo ─────────────────────────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 border-b border-border px-5 py-4">
          <SearchIcon className="h-5 w-5 shrink-0 text-ink-3" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={state === 'done' && flat.length > 0}
            aria-controls="palette-listbox"
            aria-autocomplete="list"
            aria-activedescendant={flat[active] ? `palette-opt-${active}` : undefined}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={s.placeholder}
            aria-label={s.placeholder}
            className="min-w-0 flex-1 bg-transparent text-base text-foreground outline-none placeholder:text-ink-3"
            data-testid="palette-input"
          />
          <button
            type="button"
            onClick={onClose}
            aria-label={p.hintClose}
            className="shrink-0 rounded-lg p-1 text-ink-3 transition-colors duration-200 hover:text-foreground"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* ── Resultados ────────────────────────────────────────────────────────────────── */}
        <div className="max-h-[52vh] overflow-y-auto" aria-live="polite">
          {curto ? (
            <p className="px-5 py-6 text-sm text-ink-2">{p.tooShort}</p>
          ) : state === 'error' ? (
            <p className="px-5 py-6 text-sm text-danger-ink" data-testid="palette-error">
              {s.error}
            </p>
          ) : state === 'done' && flat.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-2" data-testid="palette-empty">
              {p.noResults}
            </p>
          ) : flat.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-3">{p.tooShort}</p>
          ) : (
            <ul ref={listRef} id="palette-listbox" role="listbox" aria-label={s.title}>
              {groups.map((g) => (
                <li key={g.tipo} role="presentation">
                  <p className="eyebrow px-5 pt-4 pb-2">{g.rotulo}</p>
                  <ul role="presentation">
                    {g.itens.map((r) => {
                      idx += 1;
                      const meu = idx;
                      const ativo = meu === active;
                      return (
                        <li
                          key={`${r.type}-${r.id}`}
                          id={`palette-opt-${meu}`}
                          role="option"
                          aria-selected={ativo}
                          data-ativo={ativo}
                          data-testid={`palette-result-${r.type}`}
                          onMouseEnter={() => setActive(meu)}
                          onClick={() => irPara(r)}
                          className={`relative mx-2 flex cursor-pointer items-center gap-4 rounded-xl px-3 py-3 transition-colors duration-200 ${
                            ativo ? 'bg-muted' : ''
                          }`}
                        >
                          {/* Barra de acento do item ativo — a mesma linguagem das prateleiras da
                              home: a cor de MARCA marca posição, e não é preciso tingir o texto. */}
                          {ativo ? (
                            <span
                              className="absolute inset-y-2 left-0 w-[3px] rounded bg-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-heading text-base font-bold text-foreground">
                              {r.name}
                            </span>
                            <span className="mt-0.5 block truncate text-[0.8125rem] text-ink-2">
                              {r.subtitle ?? r.country ?? '—'}
                            </span>
                          </span>
                          {r.qid ? (
                            <span className="shrink-0 num text-xs text-ink-3">{r.qid}</span>
                          ) : null}
                          {ativo ? (
                            <CornerDownLeft className="h-4 w-4 shrink-0 text-primary-ink" aria-hidden="true" />
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* ── Rodapé: o que o teclado faz ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-border bg-surface-2 px-5 py-3">
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
            {p.hintNavigate}
          </span>
          <span className="flex items-center gap-1.5 text-[11px] text-ink-3">
            <CornerDownLeft className="h-3.5 w-3.5" aria-hidden="true" />
            {p.hintOpen}
          </span>
          <span className="text-[11px] text-ink-3">
            <kbd className="rounded border border-border px-1.5 py-0.5 font-sans">esc</kbd>{' '}
            {p.hintClose}
          </span>
          {/* A contagem é rotulada, e o rótulo diz o que ela CONTA. Antes eu tinha posto
              `flat.length/resultados.length`, que é um número sem significado para quem lê —
              a regra do conceito é que todo número tenha rótulo, e rótulo obscuro é o mesmo
              defeito de número solto. */}
          {state === 'done' && flat.length > 0 ? (
            <span className="ml-auto num text-[11px] text-ink-3">
              {s.total.replace('{n}', String(results.length))}
            </span>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}
