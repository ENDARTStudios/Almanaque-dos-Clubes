'use client';

/**
 * T596 — TIME DO CORAÇÃO: seção da área do usuário onde o usuário DECLARA o clube
 * de que é torcedor fanático.
 *
 * ── POR QUE É UMA DECLARAÇÃO, E NÃO UM FAVORITO A MAIS ────────────────────────────────
 * Favorito (WS-C-12) é o que o usuário SEGUE — plural, sem hierarquia. O Time do
 * Coração é a torcida: UMA só, declarada, exibida com destaque. Inferir a torcida a
 * partir do histórico de favoritos fabricaria um dado de identidade que o usuário
 * nunca confirmou — então a seção começa VAZIA e honesta ("Você ainda não declarou").
 *
 * Interação: busca tipada (GET /search/global?type=club, a MESMA busca da interface,
 * que já separa homônimos por QID) → PUT/DELETE em /users/me/heart-club. Trocar
 * substitui: é UMA torcida, a última declaração vale.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useI18n } from '@/i18n/Provider';
import { api } from '@/lib/api';
import { countryLabel } from '@/lib/country-flag';
import { ClubCrest } from '@/components/MediaAssets';

interface HeartClubView {
  clubId: string;
  name: string;
  qid: string | null;
  country: string | null;
  logoUrl: string | null;
}

interface SearchResults {
  results: Array<{ type: string; id: string; name: string; country: string | null }>;
}

const RESULT_LIMIT = 6;

export default function HeartClubSection() {
  const { t, locale } = useI18n();
  const [heartClub, setHeartClub] = useState<HeartClubView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [trocar, setTrocar] = useState(false);
  const [q, setQ] = useState('');
  const [opcoes, setOpcoes] = useState<SearchResults['results']>([]);
  const [buscou, setBuscou] = useState(false);
  const [erro, setErro] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let active = true;
    api
      .get<{ data: HeartClubView | null }>('/users/me/heart-club')
      .then((res) => {
        if (!active) return;
        setHeartClub(res.data ?? null);
        setLoaded(true);
      })
      .catch(() => {
        // Falha de rede: a seção some, mas não inventa estado de conta vazia.
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const termo = q.trim();
    if (termo.length < 2) {
      setOpcoes([]);
      setBuscou(false);
      return;
    }
    debounce.current = setTimeout(() => {
      api
        .get<SearchResults>(`/search/global?type=club&limit=${RESULT_LIMIT}&q=${encodeURIComponent(termo)}`)
        .then((res) => {
          setOpcoes(res.results ?? []);
          setBuscou(true);
        })
        .catch(() => {
          setOpcoes([]);
          setBuscou(true);
        });
    }, 300);
    return () => {
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, [q]);

  const definir = useCallback(async (clubId: string) => {
    setErro(false);
    try {
      const res = await api.put<{ data: HeartClubView }>('/users/me/heart-club', { clubId });
      setHeartClub(res.data ?? null);
      setTrocar(false);
      setQ('');
      setOpcoes([]);
      setBuscou(false);
    } catch {
      setErro(true);
    }
  }, []);

  const remover = useCallback(async () => {
    setErro(false);
    try {
      await api.delete('/users/me/heart-club');
      setHeartClub(null);
      setTrocar(false);
    } catch {
      setErro(true);
    }
  }, []);

  if (!loaded) return null;

  const exibir = heartClub && !trocar;

  return (
    <section aria-labelledby="heart-club-title" className="mb-10" data-testid="heart-club-section">
      <h2
        id="heart-club-title"
        className="font-heading text-lg font-bold text-foreground mb-1"
      >
        <Heart aria-hidden="true" className="inline w-4 h-4 text-primary mr-1.5 -mt-0.5" />
        {t('pages.dashboard.heartClubTitle')}
      </h2>
      <p className="text-sm text-ink-2 mb-3">{t('pages.dashboard.heartClubDesc')}</p>

      {erro && (
        <p role="alert" className="text-sm text-danger-ink mb-3">
          {t('pages.dashboard.heartClubError')}
        </p>
      )}

      {exibir ? (
        <div
          className="flex items-center gap-4 rounded-xl border border-border bg-surface p-5"
          data-testid="heart-club-card"
        >
          <ClubCrest logoUrl={heartClub.logoUrl} name={heartClub.name} size={64} />
          <div className="min-w-0">
            <p className="font-heading text-xl font-bold text-foreground truncate">
              {heartClub.name}
            </p>
            {heartClub.country && (
              <p className="text-sm text-ink-2">{countryLabel(heartClub.country, locale)}</p>
            )}
          </div>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            <Link
              href={`/clubs/${heartClub.clubId}`}
              className="rounded-lg border border-border px-3 py-2 text-sm text-primary-ink transition-colors duration-200 hover:border-primary"
            >
              {t('pages.dashboard.heartClubView')}
            </Link>
            <button
              type="button"
              onClick={() => setTrocar(true)}
              className="rounded-lg border border-border px-3 py-2 text-sm text-foreground transition-colors duration-200 hover:border-primary"
            >
              {t('pages.dashboard.heartClubChange')}
            </button>
            <button
              type="button"
              onClick={remover}
              className="rounded-lg border border-border px-3 py-2 text-sm text-danger-ink transition-colors duration-200 hover:border-primary"
              data-testid="heart-club-remove"
            >
              {t('pages.dashboard.heartClubRemove')}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-surface p-5" data-testid="heart-club-picker">
          <p className="text-sm text-ink-2 mb-3">{t('pages.dashboard.heartClubNone')}</p>
          <label htmlFor="heart-club-search" className="block text-sm text-foreground mb-1">
            {t('pages.dashboard.heartClubSearchLabel')}
          </label>
          <input
            id="heart-club-search"
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('pages.dashboard.heartClubSearchPlaceholder')}
            className="w-full max-w-md rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-ink-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            data-testid="heart-club-search"
          />
          {buscou && (
            <ul className="mt-3 grid gap-2" data-testid="heart-club-results">
              {opcoes.length === 0 && (
                <li className="text-sm text-ink-2">{t('pages.dashboard.heartClubSearchEmpty')}</li>
              )}
              {opcoes.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <span className="text-sm text-foreground min-w-0 truncate">
                    {r.name}
                    {r.country ? (
                      <span className="text-ink-3"> · {countryLabel(r.country, locale)}</span>
                    ) : null}
                  </span>
                  <button
                    type="button"
                    onClick={() => void definir(r.id)}
                    className="ml-auto shrink-0 rounded-lg border border-border px-3 py-1.5 text-sm text-primary-ink transition-colors duration-200 hover:border-primary"
                  >
                    {t('pages.dashboard.heartClubSet')}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
