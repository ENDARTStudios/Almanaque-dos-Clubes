import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CookieConsentBanner from '@/components/CookieConsentBanner';
import { I18nProvider } from '@/i18n/Provider';
import { LOCALE_COOKIE, normalizeLocale } from '@/i18n/config';

const siteUrl = 'https://almanaquedosclubes.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Almanaque dos Clubes — História do Futebol Mundial', template: '%s | Almanaque dos Clubes' },
  description:
    'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA e fontes verificadas.',
  keywords: ['futebol', 'clubes', 'história do futebol', 'ranking futebol', 'jogadores', 'competições', 'almanaque', 'estatísticas futebol'],
  authors: [{ name: 'Almanaque dos Clubes' }],
  creator: 'Almanaque dos Clubes',
  publisher: 'Almanaque dos Clubes',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Almanaque dos Clubes',
    title: 'Almanaque dos Clubes — História do Futebol Mundial',
    description:
      'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA.',
    url: siteUrl,
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Almanaque dos Clubes' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Almanaque dos Clubes — História do Futebol Mundial',
    description: 'O maior acervo de dados históricos do futebol mundial.',
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

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Almanaque dos Clubes',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  description:
    'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA e fontes verificadas.',
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
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-foreground antialiased">
        <I18nProvider initialLocale={locale}>
          <Navbar />
          <main className="flex-1 pt-16">{children}</main>
          <Footer />
          <CookieConsentBanner />
        </I18nProvider>
      </body>
    </html>
  );
}
