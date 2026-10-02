// T436 — Gate de carregamento de scripts por categoria de consentimento (LGPD).
//
// Contrato: NENHUM script opcional (analytics/marketing/preferences/personali-
// zação) pode ser injetado sem escolha explícita do visitante. Necessários
// (primeira-party: sessão, auth, CSRF) não são gateados — são o próprio app.
//
// ⚠️ Ao contratar PostHog/Plausible (ou qualquer vendor), registre a entrada
// aqui COM a categoria correta E atualize a tabela da Política de Cookies
// (/cookies). O gate abaixo impede carregamento acidental sem consentimento —
// os 4 testes unitários de tests/unit/consent-loader.test.ts travam regressão.

export type ConsentCategory =
  'necessary' | 'preferences' | 'analytics' | 'personalization' | 'marketing';

export type OptionalCategory = Exclude<ConsentCategory, 'necessary'>;

export interface ConsentChoice {
  necessary: true;
  preferences: boolean;
  analytics: boolean;
  personalization: boolean;
  marketing: boolean;
}

export const OPTIONAL_CATEGORIES: OptionalCategory[] = [
  'preferences',
  'analytics',
  'personalization',
  'marketing',
];

export const COOKIE_POLICY_VERSION = '1.0';

export function choiceAllOptional(accept: boolean): ConsentChoice {
  return {
    necessary: true,
    preferences: accept,
    analytics: accept,
    personalization: accept,
    marketing: accept,
  };
}

export interface ScriptDescriptor {
  id: string;
  category: ConsentCategory;
  src: string;
}

/**
 * Registry de scripts de terceiros. Hoje está VAZIO de opcionais: o Operador
 * ainda não contratou vendor de analytics/marketing (ver /cookies). Necessários
 * não vivem aqui — são código do próprio Next.js, não tags injetadas.
 */
export const SCRIPT_REGISTRY: ScriptDescriptor[] = [];

/**
 * Gate puro (testável sem DOM): dado um registro de escolha (ou null = nunca
 * consentiu), retorna apenas os scripts cuja categoria foi autorizada.
 * `necessary` passa SEMPRE — com ou sem escolha.
 */
export function resolveScripts(
  choice: ConsentChoice | null,
  registry: ScriptDescriptor[] = SCRIPT_REGISTRY,
): ScriptDescriptor[] {
  return registry.filter((s) => {
    if (s.category === 'necessary') return true;
    return choice?.[s.category] === true;
  });
}

/** Injeta no DOM os scripts liberados pelo gate. Chamar após cada escolha. */
export function loadConsentScripts(choice: ConsentChoice | null): void {
  if (typeof document === 'undefined') return;
  for (const s of resolveScripts(choice)) {
    if (document.getElementById(`consent-script-${s.id}`)) continue;
    const el = document.createElement('script');
    el.id = `consent-script-${s.id}`;
    el.src = s.src;
    el.async = true;
    document.head.appendChild(el);
  }
}
