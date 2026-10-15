/**
 * T554 — allowlist de origem ÚNICA do CORS.
 *
 * Vive fora do `app.ts` porque dois lugares precisam dela: o plugin `@fastify/cors`
 * (que responde preflight e põe os cabeçalhos) e o portão de métodos do T385, que
 * ENCERRA a resposta antes do plugin — sem esta função compartilhada, a lista seria
 * duplicada e divergiria.
 */
const ORIGENS_PROD = ['https://almanaquedosclubes.com', 'https://www.almanaquedosclubes.com'];

/** `undefined` = server-to-server (ex.: webhook Stripe) — permitido por desenho. */
export function isAllowedOrigin(origin: string | undefined): boolean {
  if (!origin) return true;
  if (ORIGENS_PROD.includes(origin)) return true;
  if (/^https:\/\/[\w-]+\.vercel\.app$/.test(origin)) return true; // preview da Vercel
  if (origin === 'http://localhost:3000' || origin === 'http://localhost:3001') return true;
  return false;
}
