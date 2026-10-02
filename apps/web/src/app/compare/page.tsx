import type { Metadata } from 'next';
import PageHeading from '@/components/PageHeading';
import CompareSelector, { type CompareType } from '@/components/CompareSelector';

// T440 — página pública de comparação (clube×clube / jogador×jogador).

interface SearchParams {
  type?: string;
  a?: string;
  b?: string;
}

function validType(t?: string): CompareType | undefined {
  return t === 'clubs' || t === 'players' ? (t as CompareType) : undefined;
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}): Promise<Metadata> {
  const { type, a, b } = await searchParams;
  const names = [a, b].filter(Boolean).length === 2 ? `${a} vs ${b}` : null;
  const kind = type === 'players' ? 'jogadores' : 'clubes';
  return {
    title: names
      ? `Comparar ${names} — Almanaque dos Clubes`
      : `Comparar ${kind} — Almanaque dos Clubes`,
    description: names
      ? `Comparação lado-a-lado entre ${a} e ${b}: títulos, rankings e métricas auditáveis do acervo.`
      : 'Comparação lado-a-lado de clubes e jogadores com métricas auditáveis: títulos por hierarquia, evolução no ranking e fundação.',
  };
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { type, a, b } = await searchParams;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.compare.title" subtitleKey="pages.compare.subtitle" />
      <CompareSelector
        initialType={validType(type) ?? 'clubs'}
        initialA={a ?? ''}
        initialB={b ?? ''}
      />
    </div>
  );
}
