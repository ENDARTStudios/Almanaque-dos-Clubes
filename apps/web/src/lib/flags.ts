// T436 — Feature flags de superfície legal (default OFF).
//
// Ativação em produção (Passo 3 do runbook, pós-merge):
//   vercel env add LEGAL_PAGES_ENABLED production true
//   vercel env add COOKIE_BANNER_ENABLED production true
//   vercel redeploy

/** Páginas legais (/privacidade /termos /cookies /seguranca /termos-assinatura). */
export function legalPagesEnabled(): boolean {
  return process.env.LEGAL_PAGES_ENABLED === 'true';
}

/** Banner de cookies + centro de preferências. */
export function cookieBannerEnabled(): boolean {
  return process.env.COOKIE_BANNER_ENABLED === 'true';
}
