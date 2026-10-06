'use client';
/**
 * WS-C-13 — editor de site oficial + redes + seguidores declarados
 * (só owners ativos do clube, via PATCH /clubs/:id/social — WS-C-9 gate).
 */
import { useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

interface SocialState {
  officialSite: string | null;
  socialLinks: {
    youtube?: { handle: string; url: string } | null;
    twitter?: { handle: string; url: string } | null;
    facebook?: { handle: string; url: string } | null;
    instagram?: { handle: string; url: string } | null;
  } | null;
  followersSnapshot: {
    youtube?: number | null;
    twitter?: number | null;
    facebook?: number | null;
    instagram?: number | null;
    updatedAt?: string;
  } | null;
}

const NETWORKS = ['youtube', 'twitter', 'facebook', 'instagram'] as const;

function handleOf(entry: { handle: string; url: string } | null | undefined): string {
  return entry?.handle ?? '';
}
function countOf(
  snap: SocialState['followersSnapshot'] | undefined,
  net: (typeof NETWORKS)[number],
): string {
  const v = snap?.[net];
  return v == null ? '' : String(v);
}

export default function SocialEditor({
  clubId,
  social,
  onSaved,
}: {
  clubId: string;
  social: SocialState | null;
  onSaved: () => void;
}) {
  const { locale } = useI18n();
  const labels: Record<string, string> = {
    'pt-br': 'Site oficial',
    'en-us': 'Official site',
    'es-es': 'Sitio oficial',
  };
  const [officialSite, setOfficialSite] = useState(social?.officialSite ?? '');
  const [handles, setHandles] = useState<Record<string, string>>(
    Object.fromEntries(NETWORKS.map((n) => [n, handleOf(social?.socialLinks?.[n])])),
  );
  const [counts, setCounts] = useState<Record<string, string>>(
    Object.fromEntries(NETWORKS.map((n) => [n, countOf(social?.followersSnapshot, n)])),
  );
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function save(): Promise<void> {
    setBusy(true);
    setMsg(null);
    try {
      const num = (v: string): number | null =>
        v.trim() === '' ? null : Number(v.replace(/\D/g, ''));
      await api.patch(`/clubs/${clubId}/social`, {
        ...(officialSite.trim() ? { officialSite: officialSite.trim() } : { officialSite: null }),
        socialLinks: Object.fromEntries(
          NETWORKS.map((n) => {
            const h = handles[n]?.trim();
            if (!h) return [n, null];
            const url =
              n === 'youtube'
                ? h.startsWith('UC')
                  ? `https://www.youtube.com/channel/${h}`
                  : `https://www.youtube.com/@${h.replace(/^@/, '')}`
                : n === 'twitter'
                  ? `https://x.com/${h.replace(/^@/, '')}`
                  : n === 'facebook'
                    ? `https://www.facebook.com/${h}`
                    : `https://www.instagram.com/${h.replace(/^@/, '')}`;
            return [n, { handle: h, url }];
          }),
        ),
        ...(NETWORKS.some((n) => counts[n]?.trim()) || true
          ? {
              followersSnapshot: Object.fromEntries(
                NETWORKS.map((n) => [
                  n,
                  counts[n]?.trim() === '' ? null : Number(counts[n].replace(/\D/g, '')),
                ]),
              ),
            }
          : {}),
      });
      setMsg({ ok: true, text: 'Salvo' });
      onSaved();
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Erro' });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 pt-2 border-t border-border/50" data-testid="social-editor">
      <input
        value={officialSite}
        onChange={(e) => setOfficialSite(e.target.value)}
        placeholder={labels[locale] ?? labels['pt-br']}
        className="w-full border border-border rounded-lg px-3 py-1.5 text-xs"
      />
      {NETWORKS.map((n) => (
        <div key={n} className="flex gap-2">
          <input
            value={handles[n]}
            onChange={(e) => setHandles((h) => ({ ...h, [n]: e.target.value }))}
            placeholder={`${n} handle`}
            className="flex-1 border border-border rounded-lg px-3 py-1.5 text-xs"
          />
          <input
            value={counts[n]}
            onChange={(e) => setCounts((c) => ({ ...c, [n]: e.target.value }))}
            placeholder="seguidores"
            inputMode="numeric"
            className="w-28 border border-border rounded-lg px-3 py-1.5 text-xs"
          />
        </div>
      ))}
      <button
        type="button"
        onClick={() => void save()}
        disabled={busy}
        data-testid="social-save"
        className="text-xs bg-primary text-on-primary px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50"
      >
        {busy ? '…' : 'Salvar redes'}
      </button>
      {msg && (
        <p role="status" className={`text-xs ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
          {msg.text}
        </p>
      )}
    </div>
  );
}
