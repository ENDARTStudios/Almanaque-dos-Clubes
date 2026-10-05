'use client';
/**
 * WS-C-9 — lista pública de editores do clube (GET /clubs/:id/owners).
 * userId NUNCA exposto pela API — só nome público (se houver), role e desde.
 */
import type { ClubCommunityStrings } from '@/i18n/wsC9';

export interface OwnerView {
  name: string | null;
  role: string;
  since: string;
}

interface Props {
  owners: OwnerView[];
  s: ClubCommunityStrings;
}

export default function ClubOwnersList({ owners, s }: Props) {
  if (owners.length === 0) {
    return (
      <p className="text-sm text-foreground/50" data-testid="club-owners-empty">
        {s.noOwners}
      </p>
    );
  }
  return (
    <ul className="flex flex-wrap gap-2" data-testid="club-owners-list">
      {owners.map((o, i) => (
        <li
          key={`${o.name ?? 'editor'}-${i}`}
          className="text-xs bg-foreground/5 border border-border/50 rounded-full px-3 py-1"
        >
          {o.name ?? 'editor'} · {o.role}
        </li>
      ))}
    </ul>
  );
}
