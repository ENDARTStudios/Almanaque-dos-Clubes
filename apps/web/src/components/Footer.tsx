'use client';
import Link from 'next/link';
import { useI18n } from '@/i18n/Provider';
import { LOCALE_FLAGS, type Locale } from '@/i18n/config';
import { Mail, Send } from 'lucide-react';
import { openCookieConsent } from '@/components/CookieConsentBanner';

export default function Footer() {
  const { t, locale, setLocale } = useI18n();

  const platformLinks = [
    { href: '/clubs', label: t('footer.platformClubs') },
    { href: '/players', label: t('footer.platformPlayers') },
    { href: '/competitions', label: t('footer.platformCompetitions') },
    { href: '/rankings', label: t('footer.platformRankings') },
    { href: '/search', label: t('footer.platformSearch') },
  ];

  const aboutLinks = [
    { href: '/sobre', label: t('footer.aboutUs') },
    { href: '/planos', label: t('footer.plans') },
  ];

  const legalLinks = [
    { href: '/privacidade', label: t('footer.privacy') },
    { href: '/termos', label: t('footer.terms') },
    { href: '/cookies', label: t('footer.cookies') },
    { href: '/seguranca', label: t('footer.security') },
    { href: '/direitos-titular', label: t('footer.dataSubjectRights') },
    { href: '/direitos-autorais', label: t('footer.copyrightClaims') },
  ];

  return (
    <footer className="bg-foreground text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <span className="text-2xl font-heading font-bold text-primary">ALMANAQUE</span>
            <p className="mt-2 text-sm text-white/60 max-w-xs">{t('footer.tagline')}</p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3">
              {t('footer.platformTitle')}
            </h3>
            <ul className="space-y-2">
              {platformLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3">{t('footer.aboutTitle')}</h3>
            <ul className="space-y-2">
              {aboutLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li>
                <a
                  href="mailto:endart.studios@gmail.com"
                  className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors duration-200"
                >
                  <Mail className="w-3.5 h-3.5" /> {t('footer.contact')}
                </a>
              </li>
              <li>
                <a
                  href="https://t.me/AlmanaqueDosClubes"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors duration-200"
                >
                  <Send className="w-3.5 h-3.5" /> {t('footer.telegram')}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white/80 mb-3">{t('footer.legalTitle')}</h3>
            <ul className="space-y-2">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/50 hover:text-white transition-colors duration-200 cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <button
              onClick={openCookieConsent}
              className="mt-4 text-xs text-white/40 underline hover:text-white transition-colors duration-200 cursor-pointer"
            >
              {t('common.cookieBanner.footerManage')}
            </button>
            <div className="mt-6 flex items-center gap-2">
              {(['pt-br', 'en-us', 'es-es'] as Locale[]).map((l) => (
                <button
                  key={l}
                  onClick={() => setLocale(l)}
                  aria-label={l}
                  className={`text-lg leading-none cursor-pointer ${locale === l ? 'opacity-100' : 'opacity-40 hover:opacity-70'} transition-opacity duration-150`}
                  title={l}
                >
                  {LOCALE_FLAGS[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-white/40">
          <span>{t('footer.copyright')}</span>
          <span className="text-center sm:text-right">
            END ART Studios · CNPJ 45.370.930/0001-75 · Osasco, SP — Brasil
          </span>
        </div>
      </div>
    </footer>
  );
}
