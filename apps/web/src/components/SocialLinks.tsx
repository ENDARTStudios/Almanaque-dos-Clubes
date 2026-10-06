import Link from 'next/link';

// WS-C-13 — seção "Site oficial e redes sociais". Presentacional (server-safe).

export interface SocialEntry {
  handle: string;
  url: string;
}
export interface SocialLinksData {
  youtube?: { handle: string; url: string } | null;
  twitter?: { handle: string; url: string } | null;
  facebook?: { handle: string; url: string } | null;
  instagram?: { handle: string; url: string } | null;
}
export interface FollowersSnapshotData {
  youtube?: number | null;
  twitter?: number | null;
  facebook?: number | null;
  instagram?: number | null;
  updatedAt?: string;
}

const ICONS: Record<string, string> = {
  youtube: '▶',
  twitter: '𝕏',
  facebook: 'f',
  instagram: '◎',
};

const LABELS: Record<string, Record<'pt-br' | 'en-us' | 'es-es', string>> = {
  youtube: { 'pt-br': 'YouTube', 'en-us': 'YouTube', 'es-es': 'YouTube' },
  twitter: { 'pt-br': 'X (Twitter)', 'en-us': 'X (Twitter)', 'es-es': 'X (Twitter)' },
  facebook: { 'pt-br': 'Facebook', 'en-us': 'Facebook', 'es-es': 'Facebook' },
  instagram: { 'pt-br': 'Instagram', 'en-us': 'Instagram', 'es-es': 'Instagram' },
};

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace('.0', '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

export default function SocialLinks({
  officialSite,
  socialLinks,
  followersSnapshot,
  locale = 'pt-br',
}: {
  officialSite: string | null;
  socialLinks: SocialLinksData | null;
  followersSnapshot: FollowersSnapshotData | null;
  locale?: 'pt-br' | 'en-us' | 'es-es';
}) {
  const entries = socialLinks
    ? (Object.keys(ICONS) as Array<keyof SocialLinksData>)
        .map((k) => ({ k: k as string, v: socialLinks[k] }))
        .filter((e): e is { k: string; v: { handle: string; url: string } } => !!e.v)
    : [];
  if (!officialSite && entries.length === 0) return null;

  const followersFor = (k: string): number | null =>
    (followersSnapshot?.[k as keyof FollowersSnapshotData] as number | null | undefined) ?? null;

  const updatedLabel =
    followersSnapshot?.updatedAt
      ? locale === 'en-us'
        ? `Updated ${new Date(followersSnapshot.updatedAt).toLocaleDateString('en-US')}`
        : locale === 'es-es'
          ? `Actualizado el ${new Date(followersSnapshot.updatedAt).toLocaleDateString('es-ES')}`
          : `Atualizado em ${new Date(followersSnapshot.updatedAt).toLocaleDateString('pt-BR')}`
      : null;

  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="social-links">
      {officialSite && (
        <a
          href={officialSite}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline inline-flex items-center gap-1"
        >
          🌐 {new URL(officialSite).hostname.replace(/^www\./, '')}
        </a>
      )}
      {entries.map(({ k, v }) => {
        const fc = followersFor(k);
        return (
          <a
            key={k}
            href={v.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs text-foreground/80 hover:border-primary/50 transition-colors"
          >
            <span
              aria-hidden="true"
              className="w-4 h-4 rounded-full bg-foreground/10 flex items-center justify-center text-[10px]"
            >
              {ICONS[k]}
            </span>
            {LABELS[k][locale]}
            {fc !== null && <span className="font-semibold text-foreground">{fmt(fc)}</span>}
          </a>
        );
      })}
      {updatedLabel && (
        <span className="text-[10px] text-foreground/30 w-full">{updatedLabel}</span>
      )}
    </div>
  );
}
