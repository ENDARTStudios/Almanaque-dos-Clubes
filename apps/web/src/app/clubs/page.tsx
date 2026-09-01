import type { Metadata } from 'next';
import { Suspense } from 'react';
import ClubGrid from '@/components/ClubCard';
import SearchBar from '@/components/SearchBar';
import PageHeading from '@/components/PageHeading';

export const metadata: Metadata = {
  title: 'Clubes',
  description: 'Explore milhares de clubes de futebol do mundo inteiro. Pesquise por nome, país, cidade e status.',
  openGraph: { title: 'Clubes de Futebol | Almanaque dos Clubes' },
};

async function getClubs(searchParams: { [key: string]: string | undefined }) {
  const params = new URLSearchParams();
  [['country'], ['city'], ['search'], ['status']].forEach(([key]) => {
    const v = searchParams[key];
    if (v) params.set(key, v);
  });
  params.set('limit', '50');
  try {
    const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    const res = await fetch(base + '/clubs?' + params.toString(), { cache: 'no-store' });
    if (!res.ok) return { data: [], total: 0 };
    return await res.json();
  } catch { return { data: [], total: 0 }; }
}

export default async function ClubsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | undefined }> }) {
  const sp = await searchParams;
  const { data: clubs, total } = await getClubs(sp);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <PageHeading titleKey="pages.clubs.title" subtitleKey="pages.clubs.subtitle" subtitleParams={{ n: total }} />
      <div className="mb-8">
        <Suspense fallback={<div className="h-12 bg-gray-100 rounded-xl animate-pulse" />}>
          <SearchBar placeholderKey="pages.clubs.placeholder" />
        </Suspense>
      </div>
      <Suspense fallback={<div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6"><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /><div className="h-48 bg-gray-100 rounded-xl animate-pulse" /></div>}>
        <ClubGrid clubs={clubs} />
      </Suspense>
    </div>
  );
}
