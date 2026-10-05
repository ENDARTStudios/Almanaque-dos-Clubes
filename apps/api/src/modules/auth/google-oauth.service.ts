/**
 * Login social Google (10-05) — Authorization Code flow server-side.
 *
 * GET /auth/google  → 302 para o consent screen (state em cookie httpOnly,
 *                     SameSite=Lax — sobrevive ao redirect de volta do Google).
 * GET /auth/google/callback → valida state, troca o código por token e obtém
 *                     o perfil via userinfo; a sessão (cookies __Host-) é a
 *                     MESMA do /auth/login — nenhum token do Google é
 *                     persistido.
 *
 * Segurança: state aleatório 128 bits comparado timing-safe; somente e-mails
 * verificados pelo Google (email_verified=true) são aceitos — é o que
 * autoriza o link automático por e-mail com conta local existente.
 */
import { timingSafeEqual, randomBytes } from 'node:crypto';
import { env } from '../../config/env.js';

export const GOOGLE_STATE_COOKIE = 'g_state';
const GOOGLE_AUTH_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export interface GoogleProfile {
  sub: string;
  email: string;
  name: string | null;
  emailVerified: boolean;
}

export class GoogleAuthError extends Error {
  readonly statusCode = 502;
  constructor(message = 'Falha na autenticação com o Google') {
    super(message);
    this.name = 'GoogleAuthError';
  }
}

export function isGoogleLoginEnabled(): boolean {
  return Boolean(env.googleClientId && env.googleClientSecret);
}

/** Redirect URI registrada no Google Console (precisa casar EXATAMENTE). */
export function googleRedirectUri(): string {
  if (env.googleRedirectUri) return env.googleRedirectUri;
  const domain = process.env.RAILWAY_PUBLIC_DOMAIN;
  if (domain) return `https://${domain}/api/v1/auth/google/callback`;
  // Dev local: exposto pela própria API.
  return `http://localhost:${env.port}/api/v1/auth/google/callback`;
}

export function generateState(): string {
  return randomBytes(16).toString('hex');
}

/** Comparação timing-safe entre o state do cookie e o da query. */
export function statesMatch(a: string | undefined, b: string | undefined): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export function buildGoogleAuthUrl(state: string, redirectUri: string): string {
  const url = new URL(GOOGLE_AUTH_ENDPOINT);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('client_id', env.googleClientId ?? '');
  url.searchParams.set('redirect_uri', redirectUri);
  // openid é suficiente para id_token; email+profile dão o userinfo.
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('state', state);
  // Força o seletor de conta — evita login silencioso na conta errada.
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

/**
 * Troca o código de autorização por access token e busca o perfil.
 * Erros de rede/resposta do Google viram GoogleAuthError (502 no callback).
 */
export async function exchangeCodeForProfile(
  code: string,
  redirectUri: string,
): Promise<GoogleProfile> {
  const tokenRes = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: env.googleClientId ?? '',
      client_secret: env.googleClientSecret ?? '',
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!tokenRes.ok) {
    throw new GoogleAuthError(`Token endpoint do Google respondeu ${tokenRes.status}`);
  }
  const tokens = (await tokenRes.json()) as { access_token?: string };
  if (!tokens.access_token) {
    throw new GoogleAuthError('Resposta do Google sem access_token');
  }

  const userinfoRes = await fetch(GOOGLE_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userinfoRes.ok) {
    throw new GoogleAuthError(`Userinfo do Google respondeu ${userinfoRes.status}`);
  }
  const info = (await userinfoRes.json()) as {
    sub?: string;
    email?: string;
    name?: string;
    email_verified?: boolean;
  };
  if (!info.sub || !info.email) {
    throw new GoogleAuthError('Perfil do Google sem sub/email');
  }
  return {
    sub: info.sub,
    email: info.email,
    name: info.name ?? null,
    emailVerified: info.email_verified === true,
  };
}
