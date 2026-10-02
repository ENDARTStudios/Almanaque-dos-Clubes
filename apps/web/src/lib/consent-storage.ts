// T436 — Persistência do consentimento: localStorage + cookie `consent_v`
// (fallback entre browsers/abas) + prova server-side via POST /api/v1/consent.
//
// O cookie `consent_v` é listado na tabela da Política de Cookies (/cookies)
// como NECESSÁRIO: armazena a própria escolha do visitante para não re-exibir
// o banner — não é usado para rastreamento.
import { api } from './api';
import { COOKIE_POLICY_VERSION, type ConsentChoice } from './consent';

const LS_KEY = 'consent_v';
const COOKIE_KEY = 'consent_v';
const VISITOR_KEY = 'almanaque_visitor_id';
// Legados do banner anterior (main antes do T436) — lidos apenas como fallback
// para não re-perguntar quem já escolheu.
const LEGACY_LS_KEY = 'almanaque_cookie_consent';
const LEGACY_COOKIE_KEY = 'almanaque_consent';

export interface StoredConsent {
  choice: ConsentChoice;
  version: string;
  ts: string;
}

function parseChoice(raw: unknown): ConsentChoice | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  if (typeof p.analytics !== 'boolean' || typeof p.marketing !== 'boolean') return null;
  return {
    necessary: true,
    preferences: p.preferences === true,
    analytics: p.analytics,
    personalization: p.personalization === true,
    marketing: p.marketing,
  };
}

function readJson(raw: string | null): StoredConsent | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const choice = parseChoice(parsed.choice ?? parsed);
    if (!choice) return null;
    return {
      choice,
      version: typeof parsed.version === 'string' ? parsed.version : '1.0',
      ts: typeof parsed.ts === 'string' ? parsed.ts : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function readCookie(name: string): string | null {
  const m = document.cookie.split('; ').find((c) => c.startsWith(name + '='));
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null;
}

export function readStoredConsent(): StoredConsent | null {
  if (typeof window === 'undefined') return null;
  try {
    return (
      readJson(window.localStorage.getItem(LS_KEY)) ??
      readJson(readCookie(COOKIE_KEY)) ??
      readJson(window.localStorage.getItem(LEGACY_LS_KEY)) ??
      readJson(readCookie(LEGACY_COOKIE_KEY))
    );
  } catch {
    return null;
  }
}

function writeCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=31536000;samesite=lax`;
}

export function writeStoredConsent(choice: ConsentChoice): StoredConsent {
  const stored: StoredConsent = {
    choice,
    version: COOKIE_POLICY_VERSION,
    ts: new Date().toISOString(),
  };
  const payload = JSON.stringify(stored);
  try {
    window.localStorage.setItem(LS_KEY, payload);
  } catch {
    /* storage pode falhar (modo privado) — o cookie abaixo cobre */
  }
  try {
    writeCookie(COOKIE_KEY, payload);
  } catch {
    /* segue sem cookie; prova server-side é a fonte da verdade */
  }
  return stored;
}

/** ID anônimo e persistente do visitante (uuid aleatório, sem PII). */
export function getOrCreateVisitorId(): string {
  try {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
  } catch {
    return 'anon-' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

/**
 * Prova de consentimento (LGPD art. 20): grava no backend quem consentiu,
 * quando, qual versão da política e quais categorias. Fire-and-forget —
 * a UI nunca bloqueia por falha de rede, mas a prova é a fonte da verdade.
 */
export function syncConsentToServer(
  choice: ConsentChoice,
  source: 'banner' | 'preferences' | 'api' = 'banner',
): void {
  void api
    .post('/consent', {
      visitorId: getOrCreateVisitorId(),
      version: COOKIE_POLICY_VERSION,
      categories: choice,
      metadata: { source, locale: document.documentElement.lang || undefined },
    })
    .catch(() => {
      /* prova reenviada na próxima escolha; sem filas no cliente */
    });
}
