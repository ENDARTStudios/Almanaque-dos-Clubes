import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = { title: 'Página não encontrada' };

export default function NotFoundPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-24 text-center">
      <div className="text-8xl font-heading font-bold text-primary/20 mb-4">404</div>
      <h1 className="text-4xl font-heading font-bold text-foreground mb-4">Página não encontrada</h1>
      <p className="text-foreground/60 mb-8">O conteúdo que você procura não existe ou foi movido.</p>
      <Link href="/" className="bg-primary text-on-primary px-6 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer">
        Voltar ao Início
      </Link>
    </div>
  );
}
