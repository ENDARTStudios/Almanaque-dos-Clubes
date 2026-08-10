'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { useGsapFadeIn } from '@/hooks/useGsap';

const navLinks = [
  { href: '/clubs', label: 'Clubes' },
  { href: '/players', label: 'Jogadores' },
  { href: '/rankings', label: 'Rankings' },
  { href: '/search', label: 'Busca' },
];

export default function Navbar() {
  const ref = useRef<HTMLElement>(null);
  useGsapFadeIn(ref);

  return (
    <nav ref={ref} className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-heading font-bold text-primary">ALMANAQUE</span>
            <span className="text-lg font-heading text-foreground hidden sm:inline">dos Clubes</span>
          </Link>
          <div className="flex items-center gap-6">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-foreground/80 hover:text-primary transition-colors duration-200 cursor-pointer"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/auth/login"
              className="bg-primary text-on-primary px-4 py-2 rounded-lg text-sm font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer"
            >
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
