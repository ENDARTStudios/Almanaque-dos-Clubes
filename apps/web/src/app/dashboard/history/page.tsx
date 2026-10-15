'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/i18n/Provider';

/**
 * HISTÓRICO DE ATIVIDADE (T559).
 *
 * O QUE ESTA PÁGINA DIZIA, E POR QUE ESTAVA ERRADO
 *   Ela imprimia "Nenhuma atividade registrada ainda" e "Comece a pesquisar clubes e jogadores
 *   para ver seu histórico aqui" — texto FIXO, sem consultar nada. Isso é uma afirmação sobre a
 *   conta do usuário que a página não tinha como fazer: ela nunca perguntou.
 *
 *   E a afirmação é FALSA. O endpoint existe (`GET /dashboard/activity`) e responde:
 *     404 { code: 'TRACKING_DISABLED', message: 'Tracking de atividade desativado até a
 *           publicação das políticas de cookies (WS-L).' }
 *
 *   Ou seja: não há histórico porque o RECURSO está desligado por decisão de produto, não porque
 *   a conta está vazia. Dizer "nada registrado" mandaria o usuário pesquisar para "gerar"
 *   histórico que nunca seria gravado — e ele concluiria que o produto não funciona.
 *
 *   Agora a página PERGUNTA, e declara o que recebeu. Os três estados são distinguidos:
 *     TRACKING_DISABLED  → o recurso está desligado, com o motivo real
 *     lista vazia        → a conta realmente não tem atividade
 *     erro de rede       → não foi possível saber (lacuna declarada, não "vazio")
 */

type Estado = 'carregando' | 'desligado' | 'vazio' | 'tem-dados' | 'erro';

export default function HistoryPage() {
  const { t } = useI18n();
  const [estado, setEstado] = useState<Estado>('carregando');

  useEffect(() => {
    let vivo = true;
    api
      .get<{ data?: { recentSearches?: unknown[] } }>('/dashboard/activity')
      .then((r) => {
        if (!vivo) return;
        const buscas = r.data?.recentSearches?.length ?? 0;
        setEstado(buscas > 0 ? 'tem-dados' : 'vazio');
      })
      .catch((e: unknown) => {
        if (!vivo) return;
        /* O 404 é o caso ESPERADO hoje, não uma falha: é o gate `TRACKING_DISABLED` do próprio
         * backend, desligado até a publicação das políticas de cookies (WS-L). Diferente de erro
         * de rede, que é lacuna de informação e não pode ser lido como "conta vazia".
         *
         * A discriminação olha o `status` E o texto: o `status` é o sinal direto, e a mensagem do
         * backend ("Tracking de atividade desativado…") confirma que é o gate, e não outro 404
         * qualquer — um 404 de rota inexistente não deve virar "recurso desligado". */
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
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <Link
        href="/dashboard"
        className="mb-6 inline-block text-sm text-primary-ink underline decoration-dotted underline-offset-2"
      >
        &larr; {t('pages.dashboard.historyBack')}
      </Link>
      <h1 className="mb-2 font-heading text-3xl font-bold text-foreground sm:text-4xl">
        {t('pages.dashboard.historyTitle')}
      </h1>

      {estado === 'carregando' ? null : (
        <p
          className="rounded-xl border border-dashed border-border bg-surface-2 p-6 text-sm text-ink-2"
          data-testid="history-state"
          data-estado={estado}
        >
          {estado === 'desligado'
            ? t('pages.dashboard.historyPending')
            : estado === 'vazio'
              ? t('pages.dashboard.historyEmpty')
              : estado === 'tem-dados'
                ? t('pages.dashboard.historyTitle')
                : t('pages.clubs.loadError')}
        </p>
      )}
    </div>
  );
}
