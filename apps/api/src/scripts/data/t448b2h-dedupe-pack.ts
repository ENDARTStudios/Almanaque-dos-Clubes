// T448b-2h — pack determinístico versionado (inline como TS: tsc não copia assets
// JSON para dist/ — lição do container; o pack compila junto e nunca falta).

export const T448B2H_PACK: T448B2HPack = {
  task: 'T448b-2h',
  description:
    'Resolução de duplicatas de identidade: 9 linhas de clube sem QID são duplicatas internas de linhas canônicas com QID Wikidata. Redirect de referências (ranking_entries, favorites) para o canônico + soft-delete reversível das duplicatas. Sem hard delete, sem renomeação, homônimos intocados.',
  retrievedAt: '2026-09-26',
  evidence: {
    discovery:
      'FASE 0 read-only em produção (railway ssh psql) em 2026-09-26: 9 clubes ativos sem qid; QIDs-alvo confirmados via wbsearchentities + P31 futebol + P17=Brasil; ocupação 9/9 por linhas canônicas ativas; 0 refs em knowledge_graph/matches; 18 em ranking_entries; 1 em favorites; 0 colisões de (ranking, clube canônico).',
  },
  mappings: [
    {
      name: 'Corinthians',
      dupId: '3d211df5-cf75-424f-b165-1c5ea8af25f9',
      canonId: 'd1304450-f073-4df5-8814-08e49abb7a51',
      canonName: 'S.C. Corinthians Paulista',
      qid: 'Q35933',
    },
    {
      name: 'Cruzeiro',
      dupId: 'a4a3cfff-8e7f-43e8-9b0c-eace4c903e80',
      canonId: '9f228ee0-9f4f-4ba6-8d6b-4e2f510cbfb8',
      canonName: 'Cruzeiro E.C.',
      qid: 'Q188277',
    },
    {
      name: 'Flamengo',
      dupId: '08743cbf-4a08-4fc7-a4b8-d3090953d38a',
      canonId: '7560b4db-31e4-4e13-97fb-14b74aedd85a',
      canonName: 'Clube de Regatas do Flamengo',
      qid: 'Q17479',
    },
    {
      name: 'Fluminense',
      dupId: '7ae28fac-c145-4c85-bafa-04a841468d3a',
      canonId: 'dcc5c227-563c-49e9-8b52-3f98b1bfe6de',
      canonName: 'Fluminense F.C.',
      qid: 'Q80987',
    },
    {
      name: 'Grêmio',
      dupId: '58b174fd-bcf0-42a6-82a1-fe08050ae953',
      canonId: '84c1ae23-0791-45bf-9786-14e40294cd87',
      canonName: 'Grêmio FBPA',
      qid: 'Q221695',
    },
    {
      name: 'Internacional',
      dupId: '7a20f18a-862d-4656-8218-814c8f53d7b2',
      canonId: '109daefd-5947-430b-9b56-39e85339fc4d',
      canonName: 'S.C. Internacional',
      qid: 'Q80845',
    },
    {
      name: 'Palmeiras',
      dupId: '8ef59ed0-4efd-47a7-8be4-20a14249a0c0',
      canonId: '6869ded0-1cee-4962-814f-fd5f57557ed8',
      canonName: 'Sociedade Esportiva Palmeiras',
      qid: 'Q80964',
    },
    {
      name: 'Santos',
      dupId: 'c86687a5-5ee2-45d8-ba1b-b0223baedb58',
      canonId: 'e3637164-1ed5-4c46-90d2-34abba60ffe0',
      canonName: 'Santos F.C.',
      qid: 'Q80955',
    },
    {
      name: 'São Paulo',
      dupId: '35bae4c2-93fd-46a8-9eea-59531bb91136',
      canonId: '14dd8386-62a5-40e4-8608-d92dace55336',
      canonName: 'São Paulo FC',
      qid: 'Q38568',
    },
  ],
} as const;

export interface T448B2HMapping {
  name: string;
  dupId: string;
  canonId: string;
  canonName: string;
  qid: string;
}

export interface T448B2HPack {
  task: string;
  description: string;
  retrievedAt: string;
  evidence: { discovery: string };
  mappings: T448B2HMapping[];
}
