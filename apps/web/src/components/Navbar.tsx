'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { useAuth } from './AuthProvider';
import { useGsapFadeIn } from '@/hooks/useGsap';
import LanguageSelector from './LanguageSelector';
import NotificationBadge from './NotificationBadge';

/**
 * Mapeamento do portal (Operador, 08/10 — Entrega 1): menu horizontal com
 * dropdowns (Competições/Clubes), busca global sempre visível à direita e
 * mobile com submenus expansíveis (2 níveis).
 */

type SubItem = { label: string; href: string };
type NavEntry =
  | { kind: 'link'; href: string; label: string }
  | { kind: 'dropdown'; key: string; label: string; items: SubItem[] };

export default function Navbar() {
  const ref = useRef<HTMLElement>(null);
  const { t } = useI18n();
  const { user, status, logout } = useAuth();
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

  const dropdowns: Array<{ key: string; label: string; items: SubItem[] }> = [
    {
      key: 'competicoes',
      label: t('nav.competitions'),
      items: [
        ...[['BR', 'competitions.countryBR'], ['GB', 'competitions.countryGB'], ['IT', 'competitions.countryIT'], ['FR', 'competitions.countryFR'], ['ES', 'competitions.countryES'], ['NO', 'competitions.countryNO']].map(
          ([cc, key]) => ({ label: t(key), href: `/competitions?country=${cc}` }),
        ),
        { label: t('nav.sub.continental'), href: '/competitions/9d50e9fa-bc31-4ea8-af77-e429f451ff52' },
        { label: t('nav.sub.women'), href: '/competitions?search=feminino' },
        { label: t('nav.sub.allCompetitions'), href: '/competitions' },
      ],
    },
    {
      key: 'clubes',
      label: t('nav.clubs'),
      items: [
        ...['BR', 'AR', 'PT', 'ES', 'GB', 'IT', 'DE', 'FR', 'MX', 'US'].map((cc) => ({
          label: t(`nav.sub.clubCountry_${cc}`),
          href: `/clubs?country=${cc}`,
        })),
        { label: t('nav.sub.byContinent'), href: '/map' },
        { label: t('nav.sub.womenClubs'), href: '/clubs?search=feminino' },
        { label: t('nav.sub.allClubs'), href: '/clubs' },
      ],
    },
  ];

  const plainLinks = [
    { href: '/players', label: t('nav.players') },
    { href: '/rankings', label: t('nav.rankings') },
    { href: '/map', label: t('nav.map') },
  ];

  const renderEntry = (entry: NavEntry, idx: number) =>
    entry.kind === 'link' ? (
      <Link
        key={entry.href}
        href={entry.href}
        className="hidden lg:block text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 cursor-pointer"
      >
        {entry.label}
      </Link>
    ) : (
      <div key={`${entry.key}-${idx}`} className="relative hidden lg:block">
        <button
          type="button"
          aria-expanded={openDesktop === entry.key}
          onClick={() => setOpenDesktop((o) => (o === entry.key ? null : entry.key))}
          onBlur={() => setTimeout(() => setOpenDesktop((o) => (o === entry.key ? null : o)), 150)}
          className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 cursor-pointer"
        >
          {entry.label} <span aria-hidden="true">▾</span>
        </button>
        {openDesktop === entry.key ? (
          <div
            data-testid={`nav-dropdown-${entry.key}`}
            className="absolute left-0 mt-2 w-64 rounded-xl border border-border bg-background shadow-lg py-2 z-50 max-h-96 overflow-auto"
          >
            {entry.items.map((item) => (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setOpenDesktop(null)}
                className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
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
    <nav
      ref={ref}
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="nav-mobile-toggle"
              aria-expanded={mobileOpen}
              aria-label={t('nav.menu')}
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden p-2 rounded-lg text-foreground/80 hover:bg-foreground/5"
            >
              <span aria-hidden="true" className="block w-5 h-0.5 bg-current mb-1" />
              <span aria-hidden="true" className="block w-5 h-0.5 bg-current mb-1" />
              <span aria-hidden="true" className="block w-5 h-0.5 bg-current" />
            </button>
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl font-heading font-bold text-primary">ALMANAQUE</span>
              <span className="text-lg font-heading text-foreground hidden sm:inline">
                dos Clubes
              </span>
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-4">
            {entries.map((e, i) => renderEntry(e, i))}
          </div>

          {/* Busca global SEMPRE visível à direita (md+); navega para /search?q= */}
          <form action="/search" method="get" className="hidden md:block" role="search">
            <input
              type="search"
              name="q"
              placeholder={t('nav.searchPlaceholder')}
              aria-label={t('nav.search')}
              className="w-36 xl:w-52 rounded-full border border-border bg-white px-4 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            />
          </form>

          <div className="flex items-center gap-3">
            <LanguageSelector />
            {status === 'loading' ? (
              <div
                data-testid="nav-auth-loading"
                className="w-20 h-8 rounded-lg bg-foreground/10 animate-pulse"
              />
            ) : user ? (
              <div className="flex items-center gap-2">
                <NotificationBadge />
                <div className="relative" data-testid="nav-user-menu">
                  <button
                    onClick={() => setMenuOpen((o) => !o)}
                    className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/20 transition-all duration-200 cursor-pointer"
                  >
                    <span data-testid="nav-user-name">
                      {user.name?.split(' ')[0] || user.email.split('@')[0]}
                    </span>
                    <span aria-hidden="true">▾</span>
                  </button>
                  {menuOpen && (
                    <div
                      data-testid="nav-user-dropdown"
                      className="absolute right-0 mt-2 w-52 rounded-xl border border-border bg-background shadow-lg py-2 z-50"
                    >
                      <p className="px-4 py-1 text-xs text-foreground/50 truncate">{user.email}</p>
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
                        className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
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
                className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer"
              >
                {t('nav.login')}
              </Link>
            )}
          </div>
        </div>

        {/* Mobile: painel com submenus expansíveis (2 níveis) */}
        {mobileOpen ? (
          <div data-testid="nav-mobile-panel" className="lg:hidden border-t border-border py-3">
            <form action="/search" method="get" role="search" className="px-2 pb-3">
              <input
                type="search"
                name="q"
                placeholder={t('nav.searchPlaceholder')}
                aria-label={t('nav.search')}
                className="w-full rounded-full border border-border bg-white px-4 py-2 text-sm"
              />
            </form>
            <ul className="space-y-1">
              {dropdowns.map((d) => (
                <li key={d.key}>
                  <button
                    type="button"
                    aria-expanded={mobileSub === d.key}
                    onClick={() => setMobileSub((s) => (s === d.key ? null : d.key))}
                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-foreground/5"
                  >
                    {d.label}
                    <span aria-hidden="true">▾</span>
                  </button>
                  {mobileSub === d.key ? (
                    <ul className="pl-4 pb-2">
                      {d.items.map((item) => (
                        <li key={item.href + item.label}>
                          <Link
                            href={item.href}
                            onClick={closeMobile}
                            className="block px-2 py-2 text-sm text-foreground/80 hover:bg-foreground/5 rounded-lg"
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              ))}
              <li>
                <Link
                  href="/players"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-foreground/5"
                >
                  {t('nav.players')}
                </Link>
              </li>
              <li>
                <Link
                  href="/rankings"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-foreground/5"
                >
                  {t('nav.rankings')}
                </Link>
              </li>
              <li>
                <Link
                  href="/map"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-semibold text-foreground hover:bg-foreground/5"
                >
                  {t('nav.map')}
                </Link>
              </li>
              <li>
                <Link
                  href="/mercado-da-bola"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5"
                >
                  {t('nav.market')}
                </Link>
              </li>
              <li>
                <Link
                  href="/favoritos"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5"
                >
                  {t('pages.favoritos.title')}
                </Link>
              </li>
              <li>
                <Link
                  href="/planos"
                  onClick={closeMobile}
                  className="block px-2 py-2 rounded-lg text-sm font-medium text-foreground hover:bg-foreground/5"
                >
                  {t('footer.plans')}
                </Link>
              </li>
            </ul>
          </div>
        ) : null}
      </div>
    </nav>
  );
}
