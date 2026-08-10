'use client';
import { useRef } from 'react';
import Link from 'next/link';
import { BookOpen, Trophy, Search, Brain, BarChart3, Globe } from 'lucide-react';
import { useGsapFadeIn, useGsapStagger } from '@/hooks/useGsap';

const stats = [
  { value: '50k+', label: 'Clubes cadastrados' },
  { value: '200k+', label: 'Jogadores registrados' },
  { value: '10k+', label: 'Competições históricas' },
  { value: '1M+', label: 'Partidas catalogadas' },
] as const;

const features = [
  { title: 'História Completa', desc: 'Acesse o acervo completo de clubes, jogadores e competições desde o século XIX.', icon: BookOpen },
  { title: 'Rankings Auditáveis', desc: 'Rankings históricos com fontes verificadas e data de publicação.', icon: Trophy },
  { title: 'Busca Inteligente', desc: 'Busca textual avançada com índices full-text e fuzzy search.', icon: Search },
  { title: 'IA com Citações', desc: 'Pergunte sobre futebol e receba respostas com fontes verificáveis.', icon: Brain },
  { title: 'Dados Estruturados', desc: 'API REST com dados normalizados e paginação cursor-based.', icon: BarChart3 },
  { title: 'Multi-idioma', desc: 'Suporte a clubes e competições de todos os países e federações.', icon: Globe },
] as const;

export default function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);

  useGsapFadeIn(heroRef);
  useGsapStagger(statsRef, '.stat-item');
  useGsapStagger(featuresRef, '.feature-card');

  return (
    <>
      <section ref={heroRef} className="relative pt-24 pb-16 sm:pt-32 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-background pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-heading font-bold text-foreground text-balance leading-tight">
              A História do Futebol<br />
              <span className="text-primary">num Só Lugar</span>
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-foreground/70 max-w-2xl mx-auto text-balance">
              O maior acervo de dados históricos do futebol mundial. Pesquise clubes, jogadores,
              competições e rankings com inteligência artificial e fontes verificadas.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/search" className="bg-primary text-on-primary px-8 py-3 rounded-lg text-base font-semibold hover:opacity-90 transition-all duration-200 cursor-pointer shadow-md hover:shadow-lg">
                Começar Pesquisa
              </Link>
              <Link href="/auth/register" className="border-2 border-primary text-primary px-8 py-3 rounded-lg text-base font-semibold hover:bg-primary/5 transition-all duration-200 cursor-pointer">
                Criar Conta Gratuita
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y border-border">
        <div ref={statsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 md:grid-cols-4 gap-8">
          {stats.map((stat) => (
            <div key={stat.label} className="stat-item text-center">
              <div className="text-3xl sm:text-4xl font-heading font-bold text-primary">{stat.value}</div>
              <div className="text-sm text-foreground/60 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl sm:text-4xl font-heading font-bold text-center text-foreground mb-4">
            Tudo sobre o Futebol Mundial
          </h2>
          <p className="text-center text-foreground/60 max-w-xl mx-auto mb-12">
            Dados históricos completos com ferramentas modernas de busca e análise.
          </p>
          <div ref={featuresRef} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => {
              const Icon = feat.icon;
              return (
                <div
                  key={feat.title}
                  className="feature-card bg-background rounded-xl p-6 shadow-md hover:shadow-lg transition-all duration-200 cursor-pointer border border-border/50"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4">
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-heading font-semibold text-foreground mb-2">{feat.title}</h3>
                  <p className="text-sm text-foreground/60 leading-relaxed">{feat.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
