// T444 — Recursos por plano (exibidos no /checkout antes da confirmação — CDC).
export const PLAN_FEATURES: Record<'PRO' | 'ELITE', string[]> = {
  PRO: [
    'Busca avançada ilimitada',
    'IA assistida com citações',
    'Exportações CSV',
    'Suporte prioritário por e-mail',
  ],
  ELITE: [
    'Tudo do Pro',
    'API com limites estendidos',
    'Exportações estendidas',
    'Suporte prioritário',
  ],
};
