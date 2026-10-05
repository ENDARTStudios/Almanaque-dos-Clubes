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
import ProposalButton from './ProposalButton';
import ProposalDashboard from './ProposalDashboard';
import { wsC10Strings } from '@/i18n/wsC10';

interface Props {
  clubId: string;
}

export default function ClubCommunity({ clubId }: Props) {
  const { status } = useAuth();
  const { locale } = useI18n();
  const s = wsC9Strings[locale]?.community ?? wsC9Strings['pt-br'].community;
  const p10 = wsC10Strings[locale]?.proposals ?? wsC10Strings['pt-br'].proposals;
  const loggedIn = status === 'authed';

  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [userDescription, setUserDescription] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [owners, setOwners] = useState<OwnerView[]>([]);
  const [proposalStatus, setProposalStatus] = useState<
    'none' | 'pending' | 'approved' | 'rejected' | null
  >(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [dashboardKey, setDashboardKey] = useState(0);

  const load = useCallback(async (): Promise<void> => {
    try {
      const [clubRes, ownersRes] = await Promise.all([
        api.get<{
          data: {
            userDescription: string | null;
            isOwner: boolean;
            proposalStatus?: 'none' | 'pending' | 'approved' | 'rejected';
            pendingProposalsCount?: number;
          };
        }>(`/clubs/${clubId}`),
        api.get<{ data: { owners: OwnerView[] } }>(`/clubs/${clubId}/owners`).catch(() => null),
      ]);
      setUserDescription(clubRes.data.userDescription ?? null);
      setIsOwner(clubRes.data.isOwner === true);
      setProposalStatus(clubRes.data.proposalStatus ?? null);
      setPendingCount(clubRes.data.pendingProposalsCount ?? 0);
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
                {isOwner && pendingCount > 0 && (
                  <span
                    className="ml-2 bg-primary text-on-primary rounded-full px-2 py-0.5 text-[10px]"
                    data-testid="proposals-pending-count"
                  >
                    {pendingCount}
                  </span>
                )}
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

          {isOwner ? (
            <>
              <div className="pt-2 border-t border-border/50">
                <ClubDescriptionEditor
                  clubId={clubId}
                  initial={userDescription ?? ''}
                  s={s}
                  onSaved={(text) => setUserDescription(text)}
                />
              </div>
              {/* WS-C-10 — propostas pendentes da comunidade (aba do editor) */}
              <div className="pt-2 border-t border-border/50">
                <ProposalDashboard
                  clubId={clubId}
                  s={p10}
                  refreshKey={dashboardKey}
                  onReviewed={() => {
                    setDashboardKey((k) => k + 1);
                    void load();
                  }}
                />
              </div>
            </>
          ) : (
            <div className="pt-2 border-t border-border/50">
              {/* WS-C-10 — propor edição (não-editors) */}
              <ProposalButton
                clubId={clubId}
                proposalStatus={proposalStatus}
                s={p10}
                loggedIn={loggedIn}
                onProposalChange={() => void load()}
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
