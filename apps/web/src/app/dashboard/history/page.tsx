'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';
import FichaHead from '@/components/ficha/FichaHead';
import { EmptyState, ErrorState, SkeletonFicha } from '@/components/ficha/States';
import { fichaStrings } from '@/i18n/wsFicha';

/**
 * HISTÓRICO DE ATIVIDADE (T559).
 *
 * O QUE ESTA PÁGINA DIZIA, E POR QUE ESTAVA ERRADO
 *   Ela imprimia "Nenhuma atividade registrada ainda" — texto FIXO, sem consultar nada. Isso é uma
 *   afirmação sobre a conta do usuário que a página não tinha como fazer: ela nunca perguntou.
 *
 *   E a afirmação é FALSA. O endpoint existe (`GET /dashboard/activity`) e responde:
 *     404 { code: 'TRACKING_DISABLED' } — o recurso está desligado por decisão de produto.
 *   Ou seja: não há histórico porque o RECURSO está desligado, não porque a conta está vazia.
 *
 * ── O QUE MUDOU AGORA ──────────────────────────────────────────────────────────────────────
 * 1. Os quatro estados passaram a usar os componentes do sistema, em vez de um `<p>` que
 *    imprimia texto diferente conforme o caso:
 *      carregando → SkeletonFicha (antes: NADA — a tela ficava em branco)
 *      desligado  → EmptyState  (lacuna declarada, com o motivo)
 *      vazio      → EmptyState  (a conta realmente não tem atividade)
 *      erro       → ErrorState  (não foi possível saber — e isso NÃO é "vazio")
 * 2. `tem-dados` era um bug adormecido: imprimia o PRÓPRIO TÍTULO da página como se fosse a
 *    mensagem de estado, e nunca listava nada. O endpoint devolve 404 hoje, então o caso não
 *    acontece em produção — mas quando o tracking for ligado, a página mostraria o título. Agora
 *    ela lista as buscas de verdade.
 */
type Estado = 'carregando' | 'desligado' | 'vazio' | 'tem-dados' | 'erro';

interface BuscaRecente {
  id?: string;
  query?: string;
  q?: string;
  createdAt?: string;
}

export default function HistoryPage() {
  const { t, locale } = useI18n();
  const [estado, setEstado] = useState<Estado>('carregando');
  const [buscas, setBuscas] = useState<BuscaRecente[]>([]);

  useEffect(() => {
    let vivo = true;
    api
      .get<{ data?: { recentSearches?: BuscaRecente[] } }>('/dashboard/activity')
      .then((r) => {
        if (!vivo) return;
        const itens = r.data?.recentSearches ?? [];
        setBuscas(itens);
        setEstado(itens.length > 0 ? 'tem-dados' : 'vazio');
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        /* O 404 é o caso ESPERADO hoje: é o gate `TRACKING_DISABLED` do backend, desligado até a
         * publicação das políticas de cookies (WS-L). Diferente de erro de rede, que é lacuna de
         * informação e não pode ser lido como "conta vazia".
         *
         * A discriminação olha o `status` E o texto: um 404 de rota inexistente não deve virar
         * "recurso desligado". */
        const err = e as { status?: number; message?: string };
        const ehGate =
          err.status === 404 || /tracking de atividade desativado/i.test(err.message ?? '');
        setEstado(ehGate ? 'desligado' : 'erro');
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {t('pages.dashboard.historyBack')}
      </Link>

      <FichaHead title={t('pages.dashboard.historyTitle')} />

      {/* o testid e o `data-estado` continuam aqui: são contrato com os testes existentes */}
      <div data-testid="history-state" data-estado={estado}>
        {estado === 'carregando' ? (
          <SkeletonFicha rows={4} label={fichaStrings[locale].states.loading} />
        ) : estado === 'desligado' ? (
          <EmptyState
            title={t('pages.dashboard.historyPending')}
            body={fichaStrings[locale].states.emptyBody}
          />
        ) : estado === 'vazio' ? (
          <EmptyState
            title={t('pages.dashboard.historyEmpty')}
            body={fichaStrings[locale].states.emptyBody}
          />
        ) : estado === 'erro' ? (
          <ErrorState
            title={fichaStrings[locale].states.errorTitle}
            body={fichaStrings[locale].states.errorBody}
            retryLabel={fichaStrings[locale].states.retry}
            retryHref="/dashboard/history"
          />
        ) : (
          <ul className="space-y-2" data-testid="history-list">
            {buscas.map((b, i) => (
              <li
                key={b.id ?? `${i}`}
                className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-2 text-sm last:border-0"
              >
                <span className="text-foreground">{b.query ?? b.q ?? '—'}</span>
                {b.createdAt ? (
                  <time dateTime={b.createdAt} className="text-xs text-ink-3">
                    {new Date(b.createdAt).toLocaleDateString(locale)}
                  </time>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
