import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const siteUrl = 'https://almanaque.app';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: 'Almanaque dos Clubes — História do Futebol Mundial', template: '%s | Almanaque dos Clubes' },
  description: 'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA e fontes verificadas.',
  keywords: ['futebol', 'clubes', 'história do futebol', 'ranking futebol', 'jogadores', 'competições', 'almanaque', 'estatísticas futebol'],
  authors: [{ name: 'Almanaque dos Clubes' }],
  creator: 'Almanaque dos Clubes',
  publisher: 'Almanaque dos Clubes',
  openGraph: {
    type: 'website',
    locale: 'pt_BR',
    siteName: 'Almanaque dos Clubes',
    title: 'Almanaque dos Clubes — História do Futebol Mundial',
    description: 'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA.',
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
  alternates: { canonical: siteUrl },
  category: 'sports',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'Almanaque dos Clubes',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'Web',
  description: 'O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores, competições e rankings com IA e fontes verificadas.',
  url: siteUrl,
  author: { '@type': 'Organization', name: 'Almanaque dos Clubes' },
  offers: { '@type': 'AggregateOffer', lowPrice: '0', highPrice: '99', priceCurrency: 'BRL' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full scroll-smooth">
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="min-h-full flex flex-col bg-white text-foreground antialiased">
        <Navbar />
        <main className="flex-1 pt-16">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
