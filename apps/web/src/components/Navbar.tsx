'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useGsapFadeIn } from '@/hooks/useGsap';
import LanguageSelector from '@/components/LanguageSelector';
import { useI18n } from '@/i18n/Provider';
import { useAuth } from '@/components/AuthProvider';

export default function Navbar() {
  const ref = useRef<HTMLElement>(null);
  const { t } = useI18n();
  const { user, status, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  useGsapFadeIn(ref);

  const closeMenu = () => setMenuOpen(false);

  const navLinks = [
    { href: '/clubs', label: t('nav.clubs') },
    { href: '/players', label: t('nav.players') },
    { href: '/competitions', label: t('nav.competitions') },
    { href: '/map', label: t('nav.map') },
    { href: '/rankings', label: t('nav.rankings') },
    { href: '/favoritos', label: t('pages.favoritos.title') },
    { href: '/search', label: t('nav.search') },
    { href: '/planos', label: t('footer.plans') },
  ];

  return (
    <nav
      ref={ref}
      className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-heading font-bold text-primary">ALMANAQUE</span>
            <span className="text-lg font-heading text-foreground hidden sm:inline">
              dos Clubes
            </span>
          </Link>
          <div className="flex items-center gap-4 sm:gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hidden sm:block text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <LanguageSelector />
            {/* T450 — indicador de sessão: fonte única é o AuthProvider */}
            {status === 'loading' ? (
              <div
                data-testid="nav-auth-loading"
                className="w-20 h-8 rounded-lg bg-foreground/10 animate-pulse"
              />
            ) : user ? (
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
                    <Link
                      href="/dashboard"
                      onClick={closeMenu}
                      className="block px-4 py-2 text-sm text-foreground hover:bg-foreground/5"
                    >
                      {t('nav.dashboard')}
                    </Link>
                    <button
                      data-testid="nav-signout"
                      onClick={async () => {
                        closeMenu();
                        await logout();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-foreground/5 cursor-pointer"
                    >
                      {t('nav.signOut')}
                    </button>
                  </div>
                )}
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
      </div>
    </nav>
  );
}
