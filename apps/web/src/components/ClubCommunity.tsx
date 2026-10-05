'use client';
/**
 * WS-C-9 Modo Clube — seção "Comunidade" do perfil do clube (client).
 * Uma única fonte de dados: GET /clubs/:id (auth opcional → userDescription +
 * isOwner) e GET /clubs/:id/owners (público). Renderiza:
 * - "Sobre (comunidade)" quando há userDescription;
 * - editor de descrição para owners ativos;
 * - botão "Sou editor" para quem não é (e chamada para login se anônimo);
 * - lista de editores.
 * Sessão: o GET público com cookies resolve isOwner no servidor da API.
 */
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useI18n } from '@/i18n/Provider';
import { wsC9Strings } from '@/i18n/wsC9';
import ClubOwnerButton from './ClubOwnerButton';
import ClubDescriptionEditor from './ClubDescriptionEditor';
import ClubOwnersList, { type OwnerView } from './ClubOwnersList';

interface Props {
  clubId: string;
}

export default function ClubCommunity({ clubId }: Props) {
  const { status } = useAuth();
  const { locale } = useI18n();
  const s = wsC9Strings[locale]?.community ?? wsC9Strings['pt-br'].community;
  const loggedIn = status === 'authed';

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [owners, setOwners] = useState<OwnerView[]>([]);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [clubRes, ownersRes] = await Promise.all([
        api.get<{ data: { userDescription: string | null; isOwner: boolean } }>(`/clubs/${clubId}`),
        api.get<{ data: { owners: OwnerView[] } }>(`/clubs/${clubId}/owners`).catch(() => null),
      ]);
      setUserDescription(clubRes.data.userDescription ?? null);
      setIsOwner(clubRes.data.isOwner === true);
      setOwners(ownersRes?.data.owners ?? []);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [clubId]);

  useEffect(() => {
    // Recarrega quando a sessão muda (login/logout altera isOwner).
    if (status !== 'loading') void load();
  }, [status, load]);

  return (
    <section aria-label={s.title} className="mt-8" data-testid="club-community">
      <h2 className="text-xl font-heading font-semibold text-foreground mb-3">{s.title}</h2>

      {loading && <p className="text-sm text-foreground/50">…</p>}
      {failed && !loading && <p className="text-sm text-foreground/50">{s.empty}</p>}

      {!loading && !failed && (
        <div className="rounded-2xl border border-border/50 bg-background p-5 space-y-4">
          {userDescription ? (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-1">{s.aboutCommunity}</h3>
              <p
                className="text-sm text-foreground/80 whitespace-pre-line"
                data-testid="club-user-description"
              >
                {userDescription}
              </p>
            </div>
          ) : (
            <p className="text-sm text-foreground/50">{s.empty}</p>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border/50">
            <div>
              <h3 className="text-xs uppercase tracking-wide text-foreground/40 mb-1">
                {s.owners}
              </h3>
              <ClubOwnersList owners={owners} s={s} />
            </div>
            <div className="ml-auto">
              <ClubOwnerButton
                clubId={clubId}
                isOwner={isOwner}
                s={s}
                loggedIn={loggedIn}
                onChanged={(now) => {
                  setIsOwner(now);
                  void load();
                }}
              />
            </div>
          </div>

          {isOwner && (
            <div className="pt-2 border-t border-border/50">
              <ClubDescriptionEditor
                clubId={clubId}
                initial={userDescription ?? ''}
                s={s}
                onSaved={(text) => setUserDescription(text)}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
