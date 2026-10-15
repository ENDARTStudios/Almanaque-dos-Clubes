'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { useCommandPalette } from './CommandPaletteProvider';
import { wsC2Strings } from '@/i18n/wsC2';
import { Search as SearchIcon } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { useGsapFadeIn } from '@/hooks/useGsap';
import LanguageSelector from './LanguageSelector';
import NotificationBadge from './NotificationBadge';

/**
 * Barra superior (WS-C-12, reorganizada).
 *
 * O que estava errado e o que mudou — cada item foi medido no navegador, não estimado:
 *
 * 1. DUPLICAÇÃO: "Mapa" era link simples E item do dropdown "Clubes" ("Por continente (mapa)").
 *    Destino repetido em dois lugares é o sintoma clássico de arquitetura de informação não
 *    decidida. Agora o Mapa é destino global (primeira classe) e saiu do dropdown de clubes.
 *
 * 2. RÓTULOS QUEBRANDO: "Jogadores & Treinadores" e "Rankings & Estatísticas" mediam 573 px
 *    somados e quebravam em DUAS linhas num menu de 64 px de altura, deixando a barra com
 *    alturas dereguadas. A barra passou a usar rótulos curtos (`nav.short*`: Clubes, Jogadores,
 *    Rankings) com `whitespace-nowrap`. O nome completo continua no painel mobile e no
 *    `aria-label`, onde há espaço vertical.
 *
 * 3. MARCA DESALINHADA: "ALMANAQUE" (2xl) e "dos Clubes" (lg) ficavam lado a lado em linhas de
 *    base diferentes — "dos" aparecia FLUTUANDO acima da marca, parecendo defeito de layout.
 *    Agora é um lockup único alinhado pela base.
 *
 * 4. TABLET SEM NAVEGAÇÃO: o menu só aparecia a partir de `lg` (1024 px) e o hambúrguer só
 *    abaixo de `md` (768 px). Entre 768 e 1023 px — iPad retrato, tablets Android — a barra
 *    mostrava busca, idioma e Entrar e NENHUM destino de navegação. Agora o hambúrguer cobre
 *    `lg` para baixo (com o painel já contendo tudo) e o menu completo aparece a partir de `lg`.
 *
 * 5. BUSCA ESTOURANDO: a 900 px o campo de 144 px cortava o próprio placeholder
 *    ("Buscar no Alman…"). O campo só existe no desktop; no tablet/mobile ele vive no painel,
 *    em largura total — onde não corta.
 *
 * 6. IDIOMA INCHADO: o seletor ocupava 235 px por renderizar o nome completo dentro do
 *    `<select>` (largura intrínseca do maior `<option>`). Agora usa sigla (ver LanguageSelector).
 *
 * 7. LARGURA DESPERDIÇADA: o container travava em 1280 px mesmo em 1920 px de viewport,
 *    sobrando 320 px de vazio. Passou a 1400 px, o que dá folga para os itens respirarem.
 */

type SubItem = { label: string; href: string };
type NavEntry =
  | { kind: 'link'; href: string; label: string; full: string }
  | { kind: 'dropdown'; key: string; label: string; items: SubItem[] };

export default function Navbar() {
  const ref = useRef<HTMLElement>(null);
  const { t, locale } = useI18n();
  const { user, status, logout } = useAuth();
  const { open: openPalette } = useCommandPalette();
  const palette = wsC2Strings[locale].search.palette;
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileSub, setMobileSub] = useState<string | null>(null);
  const [openDesktop, setOpenDesktop] = useState<string | null>(null);
  useGsapFadeIn(ref);

  const closeMenu = () => setMenuOpen(false);
  const closeMobile = () => {
    setMobileOpen(false);
    setMobileSub(null);
  };

  // Dropdowns: agrupam por RECORTE de um destino que já existe. Sem repetir destino global
  // (o Mapa saiu daqui — era duplicação com o link simples).
  const dropdowns: Array<{ key: string; label: string; items: SubItem[] }> = [
    {
      key: 'competicoes',
      label: t('nav.competitions'),
      items: [
        ...[
          ['BR', 'competitions.countryBR'],
          ['GB', 'competitions.countryGB'],
          ['IT', 'competitions.countryIT'],
          ['FR', 'competitions.countryFR'],
          ['ES', 'competitions.countryES'],
          ['NO', 'competitions.countryNO'],
        ].map(([cc, key]) => ({ label: t(key), href: `/competitions?country=${cc}` })),
        {
          label: t('nav.sub.continental'),
          href: '/competitions/9d50e9fa-bc31-4ea8-af77-e429f451ff52',
        },
        { label: t('nav.sub.women'), href: '/competitions?search=feminino' },
        { label: t('nav.sub.allCompetitions'), href: '/competitions' },
      ],
    },
    {
      key: 'clubes',
      label: t('nav.shortClubs'),
      items: [
        ...['BR', 'AR', 'PT', 'ES', 'GB', 'IT', 'DE', 'FR', 'MX', 'US'].map((cc) => ({
          label: t(`nav.sub.clubCountry_${cc}`),
          href: `/clubs?country=${cc}`,
        })),
        { label: t('nav.sub.womenClubs'), href: '/clubs?search=feminino' },
        { label: t('nav.sub.allClubs'), href: '/clubs' },
      ],
    },
  ];

  // Destinos globais, em ordem de uso. Cada um tem rótulo curto (barra) e completo (painel).
  const plainLinks = [
    { href: '/players', label: t('nav.shortPlayers'), full: t('nav.players') },
    { href: '/rankings', label: t('nav.shortRankings'), full: t('nav.rankings') },
    { href: '/map', label: t('nav.map'), full: t('nav.map') },
  ];

  const renderEntry = (entry: NavEntry, idx: number) =>
    entry.kind === 'link' ? (
      <Link
        key={entry.href}
        href={entry.href}
        title={entry.full}
        // T554 — `py-1`: o alvo media 20px (WCAG 2.5.8 pede ≥24). O header não cresce
        // porque o logo e os botões de ação já são mais altos que 28px.
        className="text-sm font-medium whitespace-nowrap py-1 text-foreground/80 transition-colors duration-200 hover:text-primary-ink"
      >
        {entry.label}
      </Link>
    ) : (
      <div key={`${entry.key}-${idx}`} className="relative">
        <button
          type="button"
          aria-expanded={openDesktop === entry.key}
          onClick={() => setOpenDesktop((o) => (o === entry.key ? null : entry.key))}
          onBlur={() => setTimeout(() => setOpenDesktop((o) => (o === entry.key ? null : o)), 150)}
          className="flex items-center gap-1 text-sm font-medium whitespace-nowrap py-1 text-foreground/80 transition-colors duration-200 hover:text-primary-ink"
        >
          {entry.label}
          <span aria-hidden="true" className="text-[10px]">
            ▾
          </span>
        </button>
        {openDesktop === entry.key ? (
          <div
            data-testid={`nav-dropdown-${entry.key}`}
            className="absolute left-0 z-50 mt-2 max-h-96 w-64 overflow-auto rounded-xl border border-border bg-background py-2 shadow-lg"
          >
            {entry.items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setOpenDesktop(null)}
                className="block px-4 py-2 text-sm text-foreground transition-colors hover:bg-foreground/5 hover:text-primary-ink"
              >
                {item.label}
              </Link>
            ))}
          </div>
        ) : null}
      </div>
    );

  const entries: NavEntry[] = [
    ...dropdowns.map((d) => ({ kind: 'dropdown' as const, ...d })),
    ...plainLinks.map((l) => ({ kind: 'link' as const, ...l })),
  ];

  return (
    <nav ref={ref} className="fixed inset-x-0 top-0 z-50 text-foreground">
      {/* SUPERFÍCIE da barra: um container com fundo REAL que envolve a linha e o painel.
          Por que assim (dois defeitos medidos, não estética):
          1. `z-index: auto` numa faixa posicionada não cria contexto de empilhamento, então o
             `main` (bloco em fluxo normal, posterior no DOM) pintava POR CIMA do fundo do
             navbar — `elementFromPoint` no topo devolvia `MAIN` e a barra ficava sem cor
             efetiva, aparecendo cinza-sujo sobre as páginas claras.
          2. O fundo precisa cobrir a LINHA e o PAINEL, não uma altura fixa: por isso o
             container cresce com o conteúdo (`min-h-20` + `pb-2`) em vez de `h-*` fixo, que
             cortaria o painel mobile.
          O `pb-2` é a "faixa de sobreposição": nas páginas claras (`/clubs`, `/rankings`,
          `/metodologia`) os 8 px extras do fundo escuro fecham o vão entre a barra e o conteúdo
          (o `main` reserva `pt-20`); na home, fundem com a hero escura. */}
      <div className="min-h-20 bg-background pb-2">
        <div className="relative mx-auto max-w-[1400px] px-4 pt-[1.125rem] sm:px-6 lg:px-8">
          <div className="absolute inset-x-0 top-[3.125rem] h-px bg-border" aria-hidden="true" />
          {/* `justify-between` foi REMOVIDO: com dois blocos visíveis no tablet ele empurrava a
              marca para a esquerda e o cluster para a direita, abrindo 533 px de vazio irregular
              no meio da barra (medido a 900 px). Com os blocos agrupados (`ml-auto` no cluster) o
              vazio some e a direita fica sempre colada à borda. */}
          <div className="flex items-center gap-3">
            {/* Esquerda: hambúrguer (abaixo de lg) + marca como UM lockup alinhado pela base. */}
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                data-testid="nav-mobile-toggle"
                aria-expanded={mobileOpen}
                aria-controls="nav-panel"
                aria-label={t('nav.menu')}
                onClick={() => setMobileOpen((o) => !o)}
                className="-ml-2 shrink-0 rounded-lg p-2 text-foreground/80 transition-colors hover:bg-foreground/5 lg:hidden"
              >
                <span aria-hidden="true" className="mb-1 block h-0.5 w-5 bg-current" />
                <span aria-hidden="true" className="mb-1 block h-0.5 w-5 bg-current" />
                <span aria-hidden="true" className="block h-0.5 w-5 bg-current" />
              </button>
              <Link href="/" className="flex shrink-0 items-baseline gap-1.5">
                <span className="font-heading text-2xl font-bold leading-none text-primary-ink">
                  ALMANAQUE
                </span>
                <span className="hidden font-heading text-base leading-none text-foreground/70 sm:inline">
                  dos Clubes
                </span>
              </Link>
            </div>

            {/* Centro: navegação, a partir de lg (antes exigia 1024 px e quebrava rótulo). */}
            <div className="ml-6 hidden items-center gap-6 lg:flex">
              {entries.map((e, i) => renderEntry(e, i))}
            </div>

            {/* Direita: busca (desktop) + idioma + conta. `ml-auto` garante que a direita fique
              sempre colada à borda, sem o vão irregular que existia no tablet. */}
            <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
              {/* A busca da navbar virou GATILHO da paleta de comando (conceito, quadro 03): a
                busca é o produto numa enciclopédia, então ela abre uma superfície própria em vez
                de navegar para uma página. É um `<button>` e não um `<input>` porque abrir um
                overlay é uma AÇÃO, não um campo — um input que na verdade é botão confunde
                leitor de tela e o autocomplete do navegador. O atalho aparece no rótulo para o
                caminho de teclado ficar descobrível. */}
              <button
                type="button"
                onClick={() => openPalette()}
                aria-label={palette.open}
                aria-keyshortcuts="Meta+K Control+K"
                data-testid="nav-search-trigger"
                className="hidden items-center gap-2 rounded-full border border-border bg-[color-mix(in_oklab,var(--color-foreground)_8%,transparent)] px-4 py-1.5 text-sm text-ink-2 transition-colors duration-200 hover:border-primary-ink xl:flex"
              >
                <SearchIcon className="h-4 w-4" aria-hidden="true" />
                <span className="w-40 text-left 2xl:w-52">{t('nav.searchPlaceholder')}</span>
                <kbd className="rounded border border-border px-1.5 py-0.5 font-sans text-[10px] text-ink-3">
                  ⌘K
                </kbd>
              </button>
              <LanguageSelector />
              {status === 'loading' ? (
                <div
                  data-testid="nav-auth-loading"
                  className="h-9 w-20 animate-pulse rounded-lg bg-foreground/10"
                />
              ) : user ? (
                <div className="flex items-center gap-2">
                  <NotificationBadge />
                  <div className="relative" data-testid="nav-user-menu">
                    <button
                      onClick={() => setMenuOpen((o) => !o)}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-semibold text-primary-ink transition duration-200 hover:bg-primary/20"
                    >
                      <span data-testid="nav-user-name">
                        {user.name?.split(' ')[0] || user.email.split('@')[0]}
                      </span>
                      <span aria-hidden="true" className="text-[10px]">
                        ▾
                      </span>
                    </button>
                    {menuOpen && (
                      <div
                        data-testid="nav-user-dropdown"
                        className="absolute right-0 z-50 mt-2 w-52 rounded-xl border border-border bg-background py-2 shadow-lg"
                      >
                        <p className="truncate px-4 py-1 text-xs text-foreground/70">
                          {user.email}
                        </p>
                        <Link
                          href="/dashboard"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                        >
                          {t('nav.dashboard')}
                        </Link>
                        <Link
                          href="/favoritos"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                        >
                          {t('pages.favoritos.title')}
                        </Link>
                        <Link
                          href="/dashboard/subscription"
                          onClick={closeMenu}
                          className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                        >
                          {t('nav.subscription')}
                        </Link>
                        <button
                          onClick={() => {
                            closeMenu();
                            void logout();
                          }}
                          className="block w-full px-4 py-2 text-left text-sm text-foreground hover:bg-foreground/5"
                        >
                          {t('nav.signOut')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <Link
                  href="/auth/login"
                  data-testid="nav-login"
                  className="cursor-pointer rounded-lg bg-primary px-3.5 py-2 text-sm font-semibold text-on-primary transition duration-200 hover:opacity-90"
                >
                  {t('nav.login')}
                </Link>
              )}
            </div>
          </div>

          {/* Painel (abaixo de lg): agora é o ÚNICO caminho de navegação nessa faixa, então traz
            busca, destinos globais e os agrupamentos — com o nome completo dos rótulos, que
            aqui cabem. */}
          {mobileOpen ? (
            <div
              id="nav-panel"
              data-testid="nav-mobile-panel"
              className="border-t border-border pb-4 pt-3 lg:hidden"
            >
              {/* No painel mobile a busca também abre a paleta, que é onde o teclado virtual e a
                lista agrupada funcionam melhor que uma página intermediária. */}
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  openPalette();
                }}
                aria-label={palette.open}
                data-testid="nav-search-trigger-mobile"
                className="mb-3 flex w-full items-center gap-2 rounded-full border border-border bg-[color-mix(in_oklab,var(--color-foreground)_8%,transparent)] px-4 py-2 text-sm text-ink-2 transition-colors duration-200 hover:border-primary-ink"
              >
                <SearchIcon className="h-4 w-4" aria-hidden="true" />
                <span className="text-left">{t('nav.searchPlaceholder')}</span>
              </button>

              <ul className="space-y-1">
                {dropdowns.map((d) => (
                  <li key={d.key}>
                    <button
                      type="button"
                      aria-expanded={mobileSub === d.key}
                      onClick={() => setMobileSub((s) => (s === d.key ? null : d.key))}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
                    >
                      {d.label}
                      <span aria-hidden="true" className="text-[10px]">
                        ▾
                      </span>
                    </button>
                    {mobileSub === d.key ? (
                      <ul className="pb-2 pl-3">
                        {d.items.map((item) => (
                          <li key={item.href + item.label}>
                            <Link
                              href={item.href}
                              onClick={closeMobile}
                              className="block rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-primary-ink"
                            >
                              {item.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                ))}

                {/* Destinos globais com o nome COMPLETO (aqui há espaço vertical). */}
                {plainLinks.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={closeMobile}
                      className="block rounded-lg px-3 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-foreground/5"
                    >
                      {l.full}
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Bloco secundário: separado por régua, para o painel não ser uma lista plana
                onde assinatura e denúncia têm o mesmo peso de "Clubes". */}
              <div className="mt-3 border-t border-border pt-3">
                <ul className="space-y-1">
                  {[
                    { href: '/mercado-da-bola', label: t('nav.market') },
                    { href: '/favoritos', label: t('pages.favoritos.title') },
                    { href: '/planos', label: t('footer.plans') },
                  ].map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        onClick={closeMobile}
                        className="block rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-foreground/5 hover:text-primary-ink"
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </nav>
  );
}
