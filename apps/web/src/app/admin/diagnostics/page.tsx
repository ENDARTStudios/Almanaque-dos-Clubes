import DiagnosticsClient from './DiagnosticsPanel';
import type { WebProcessView } from './types';

/**
 * T-ADMIN-W3 — /admin/diagnostics.
 *
 * Server Component de propósito: as flags do processo WEB (LEGAL_PAGES_ENABLED,
 * COOKIE_BANNER_ENABLED, PAYMENTS_ENABLED) só existem no ambiente do Next — a API
 * não as enxerga, e mostrar valor inventado para elas seria mentira na tela. As
 * flags da API vêm de GET /api/v1/admin/diagnostics, no Client Component.
 *
 * `dynamic = 'force-dynamic'`: sem isso o Next pré-renderiza a rota no build e o
 * valor das flags ficaria CONGELADO no instante do deploy — a leitura deixaria de
 * ser "o valor de agora" e passaria a mentir na tela. É a mesma razão pela qual
 * /checkout lê `process.env.PAYMENTS_ENABLED` em runtime.
 *
 * A leitura é ESTÁTICA no texto do código (sem `process.env[chave]` dinâmico): a
 * lista é explícita e casa por `key` com o inventário da API. Flag web que a API
 * passar a declarar sem estar nesta lista aparece como "valor em outro processo" —
 * lacuna declarada, nunca valor adivinhado.
 *
 * O `noindex`/`nocache` da área interna vem do layout de /admin e NÃO é alterado.
 */
export const dynamic = 'force-dynamic';

export default function AdminDiagnosticsPage() {
  const web: WebProcessView = {
    nodeEnv: process.env.NODE_ENV ?? null,
    commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null,
    deployment: process.env.VERCEL_ENV ?? null,
    flags: {
      LEGAL_PAGES_ENABLED: process.env.LEGAL_PAGES_ENABLED === 'true',
      COOKIE_BANNER_ENABLED: process.env.COOKIE_BANNER_ENABLED === 'true',
      PAYMENTS_ENABLED: process.env.PAYMENTS_ENABLED === 'true',
    },
  };

  return <DiagnosticsClient web={web} />;
}
