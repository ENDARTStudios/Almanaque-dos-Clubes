// T465 — Fonte ÚNICA dos recursos por plano (consumido pelo /checkout e por
// qualquer comparação de oferta). Nasceu da auditoria de integridade de
// oferta: /checkout hardcodeava listas que já tinham divergido daqui.
//
// Regras do catálogo (D-2026-09-22-t465-oferta-honesta):
//  - nada de "ilimitado" sem alcance definido (política do próprio /planos);
//  - recurso não-operacional entra com o sufixo "(em breve)" — nunca cobrado
//    como entregue;
//  - descrições correspondem ao artefato real (busca textual = tsvector;
//    exportação = CSV e JSON via GET /export; suporte = canal de e-mail
//    dedicado, sem SLA publicado);
//  - Grafo do conhecimento: promessa do Escopo 6.6 que o T448 tornou verdade
//    (5.157 arestas com fonte por aresta) — autorizada a entrar como entregue.
export const PLAN_FEATURES: Record<'PRO' | 'ELITE', string[]> = {
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
};
