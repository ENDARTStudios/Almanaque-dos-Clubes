import type { Locale } from '@/i18n/config';

// T465/T472a — Fonte ÚNICA dos recursos por plano, AGORA multi-idioma (o /checkout
// e qualquer comparação de oferta consomem daqui; nada de lista paralela).
//
// Regras do catálogo (D-2026-09-22-t465-oferta-honesta):
//  - nada de "ilimitado"/"unlimited" sem alcance definido (política do /planos);
//  - recurso não-operacional entra com o marcador de "em breve" no idioma —
//    nunca cobrado como entregue;
//  - descrições correspondem ao artefato real (busca textual = tsvector;
//    exportação = CSV e JSON via GET /export; suporte = canal de e-mail);
//  - Grafo do conhecimento: promessa do Escopo 6.6 que o T448 tornou verdade.
export type PlanKey = 'PRO' | 'ELITE';

export const PLAN_FEATURES: Record<Locale, Record<PlanKey, string[]>> = {
  'pt-br': {
    PRO: [
      'Busca textual avançada',
      'Exportações CSV',
      'Suporte por e-mail dedicado',
      'IA assistida com citações (em breve)',
    ],
    ELITE: [
      'Tudo do Pro',
      'Grafo do conhecimento: conquistas com fonte auditável',
      'Exportações em CSV e JSON',
      'API de dados (em breve)',
    ],
  },
  'en-us': {
    PRO: [
      'Advanced text search',
      'CSV exports',
      'Dedicated email support',
      'AI-assisted with citations (coming soon)',
    ],
    ELITE: [
      'Everything in Pro',
      'Knowledge graph: honours with auditable source',
      'CSV and JSON exports',
      'Data API (coming soon)',
    ],
  },
  'es-es': {
    PRO: [
      'Búsqueda textual avanzada',
      'Exportaciones CSV',
      'Soporte por correo dedicado',
      'IA asistida con citas (próximamente)',
    ],
    ELITE: [
      'Todo lo del Pro',
      'Grafo de conocimiento: títulos con fuente auditable',
      'Exportaciones en CSV y JSON',
      'API de datos (próximamente)',
    ],
  },
};

/** Marcadores de "não operacional" por idioma (contrato de honestidade). */
export const COMING_SOON_MARKERS = ['(em breve)', '(coming soon)', '(próximamente)'] as const;
