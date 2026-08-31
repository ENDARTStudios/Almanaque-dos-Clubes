'use client';
import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useGsapFadeIn } from '@/hooks/useGsap';
import { useI18n } from '@/i18n/Provider';

export default function SearchBar({ placeholderKey = 'pages.search.placeholder' }: { placeholderKey?: string }) {
  const [query, setQuery] = useState('');
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  useGsapFadeIn(ref);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) router.push('/search?q=' + encodeURIComponent(query.trim()));
  }

  return (
    <div ref={ref} className="w-full max-w-2xl mx-auto">
      <form onSubmit={handleSubmit}>
        <div className="relative">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-foreground/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(placeholderKey)}
            className="w-full pl-12 pr-4 py-3 bg-white border border-border rounded-xl text-foreground placeholder:text-foreground/40 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 outline-none"
          />
        </div>
      </form>
    </div>
  );
}
