import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from '@/components/Navbar';
import { AuthProvider } from '@/components/AuthProvider';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import SpeedInsightsGate from '@/components/SpeedInsightsGate';
import { CommandPaletteProvider } from '@/components/CommandPaletteProvider';
import { cookieBannerEnabled } from '@/lib/flags';
import { safeJsonLd } from '@/lib/json-ld';
import { I18nProvider } from '@/i18n/Provider';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';
import { metadataStrings } from '@/i18n/wsMetadata';

const siteUrl = 'https://almanaquedosclubes.com';

/**
 * T583 — o metadado padrão (home e fallback) segue o idioma do cookie. Antes o `title` e
 * a `description` eram literais em pt e apareciam assim em en-us/es-es. O locale é o
 * MESMO lido pelo `RootLayout` (uma fonte só).
 */
export async function generateMetadata(): Promise<Metadata> {
  const store = await cookies();
  const locale = normalizeLocale(store.get(LOCALE_COOKIE)?.value);
  const t = metadataStrings[locale].home;

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: t.title,
      template: '%s | Almanaque dos Clubes',
    },
    description: t.description,
    keywords: [
      'futebol',
      'clubes',
      'história do futebol',
      'ranking futebol',
      'jogadores',
      'competições',
      'almanaque',
      'estatísticas futebol',
    ],
    authors: [{ name: 'Almanaque dos Clubes' }],
    creator: 'Almanaque dos Clubes',
    publisher: 'Almanaque dos Clubes',
    openGraph: {
      type: 'website',
      locale: locale === 'pt-br' ? 'pt_BR' : locale === 'en-us' ? 'en_US' : 'es_ES',
      siteName: 'Almanaque dos Clubes',
      title: t.title,
      description: t.description,
      url: siteUrl,
      images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Almanaque dos Clubes' }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.description,
      images: ['/og-image.png'],
    },
    robots: { index: true, follow: true },
    alternates: {
      canonical: siteUrl,
      languages: {
        'pt-BR': '/',
        'en-US': '/',
        'es-ES': '/',
      },
    },
    category: 'sports',
  };
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Almanaque dos Clubes',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  description:
    'Acervo histórico do futebol em construção, com proveniência documentada. Pesquise clubes, jogadores, competições e rankings com fontes verificadas.',
  url: siteUrl,
  author: { '@type': 'Organization', name: 'END ART Studios' },
  publisher: { '@type': 'Organization', name: 'END ART Studios' },
  offers: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '99', priceCurrency: 'BRL' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale = normalizeLocale(cookieStore.get(LOCALE_COOKIE)?.value);

  return (
    <html lang={locale} className="h-full scroll-smooth">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground antialiased">
        <I18nProvider initialLocale={locale}>
          <AuthProvider>
            {/* A paleta é montada UMA vez, aqui, e não em cada página: o atalho ⌘K/Ctrl+K tem de
              funcionar em qualquer rota, e a navbar precisa do mesmo gatilho que o atalho.
              Duas instâncias dariam duas buscas concorrentes e dois `aria-modal` na árvore. */}
            <CommandPaletteProvider>
              <Navbar />
              <main className="flex-1 pt-20">{children}</main>
              <Footer />
              {cookieBannerEnabled() && <CookieConsentBanner />}
              {/* Core Web Vitals — gateado na categoria analytics do consentimento */}
              <SpeedInsightsGate />
            </CommandPaletteProvider>
          </AuthProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
