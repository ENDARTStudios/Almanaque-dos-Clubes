/**
 * T602 — REGISTRO DE FONTES com TRAVA LEGAL.
 *
 * ── POR QUE UM REGISTRO, E NÃO UMA LISTA NO SCRIPT ───────────────────────────────
 * A rodada anterior pediu "todos os meios, legais ou não, sem citar a fonte". Isso não
 * se executa — e o jeito de garantir que não volte por descuido é o próprio bot
 * RECUSAR fonte sem licença verificada. Cada fonte entra aqui com:
 *
 *   - `license`: licença do CONTEÚDO (não do robots.txt);
 *   - `attributionRequired`: se exige crédito (CC BY/BY-SA) — sem crédito não é uso
 *     licenciado, é infração (o direito moral de atribuição é inalienável, art. 24
 *     da Lei 9.610/98);
 *   - `policy`: `allowed` (pode automatizar) | `reference-only` (só curadoria
 *     humana; o bot não extrai) | `blocked` (robots/ToS proíbem);
 *   - `reason`: o fato medido que sustenta a decisão, para auditoria.
 *
 * O bot consulta `isAutomationAllowed(key)` antes de qualquer requisição. Fonte nova
 * só entra depois de ler a licença de verdade — não por parecer pública.
 */

export type SourcePolicy = 'allowed' | 'reference-only' | 'blocked';

export interface SourceEntry {
  key: string;
  name: string;
  baseUrl: string;
  /** Licença do conteúdo, como lida na fonte. */
  license: string;
  attributionRequired: boolean;
  policy: SourcePolicy;
  /** Como o dado entra (API oficial, dataset, HTML com parser próprio). */
  access: 'api' | 'dataset' | 'html';
  reason: string;
}

/**
 * Medições de 2026-11-02 (licença lida na API/robots de cada site). Não altere um
 * `policy` sem registrar a nova medição no `reason`.
 */
export const SOURCE_REGISTRY: readonly SourceEntry[] = [
  {
    key: 'wikidata',
    name: 'Wikidata',
    baseUrl: 'https://www.wikidata.org',
    license: 'CC0',
    attributionRequired: false,
    policy: 'allowed',
    access: 'api',
    reason: 'CC0 declarado no rodapé da entidade; API wbgetentities/WDQS pública.',
  },
  {
    key: 'wikipedia',
    name: 'Wikipédia',
    baseUrl: 'https://pt.wikipedia.org',
    license: 'CC BY-SA 4.0',
    attributionRequired: true,
    policy: 'allowed',
    access: 'api',
    reason: 'Licença do rodapé + API MediaWiki oficial (action=parse/query).',
  },
  {
    key: 'commons',
    name: 'Wikimedia Commons',
    baseUrl: 'https://commons.wikimedia.org',
    license: 'Licença por arquivo (livre/CC, incluindo NC desde D-2026-11-02)',
    attributionRequired: true,
    policy: 'allowed',
    access: 'api',
    reason: 'extmetadata.LicenseShortName lido e gravado por arquivo.',
  },
  {
    key: 'rsssf',
    name: 'RSSSF',
    baseUrl: 'https://www.rsssf.org',
    license: 'Uso livre com crédito (compiladores citados na página)',
    attributionRequired: true,
    policy: 'allowed',
    access: 'html',
    reason: 'Sem robots.txt restritivo; parser próprio já em produção (17.265 partidas).',
  },
  {
    key: 'fandom-futebol',
    name: 'Futebol Wiki (Fandom)',
    baseUrl: 'https://futebol.fandom.com/pt-br',
    license: 'CC-BY-SA',
    attributionRequired: true,
    policy: 'allowed',
    access: 'api',
    reason:
      'siteinfo rightsinfo = {"url":".../licensing-pt-br","text":"CC-BY-SA"} medido em 2026-11-02; ' +
      'acesso pela API MediaWiki oficial (/pt-br/api.php), nunca raspagem de HTML.',
  },
  {
    key: 'soccerwiki',
    name: 'SoccerWiki (pt-br)',
    baseUrl: 'https://pt-br.soccerwiki.org',
    license: 'Não declarada para reuso',
    attributionRequired: true,
    policy: 'blocked',
    access: 'html',
    reason:
      'robots.txt bloqueia explicitamente agentes de IA (GPTBot, anthropic-ai, ChatGPT-User) — ' +
      'medido em 2026-11-02. Sem licença de conteúdo e com robots fechado: não se automatiza.',
  },
  {
    key: 'imortaisdofutebol',
    name: 'Imortais do Futebol',
    baseUrl: 'https://imortaisdofutebol.com',
    license: 'Todos os direitos reservados (editorial)',
    attributionRequired: true,
    policy: 'reference-only',
    access: 'html',
    reason:
      'robots permite crawl, mas robots NÃO é licença: o texto é editorial. Serve de pista de ' +
      'curadoria; o FATO descoberto é buscado em fonte aberta.',
  },
  {
    key: 'futbox',
    name: 'Futbox',
    baseUrl: 'https://www.futbox.com',
    license: 'Todos os direitos reservados (produto proprietário)',
    attributionRequired: true,
    policy: 'reference-only',
    access: 'html',
    reason: 'Produto proprietário sem licença de reuso; robots não é autorização.',
  },
  {
    key: 'historiadofutebol',
    name: 'História do Futebol',
    baseUrl: 'https://historiadofutebol.com',
    license: 'Todos os direitos reservados (editorial)',
    attributionRequired: true,
    policy: 'reference-only',
    access: 'html',
    reason: 'Sem robots.txt utilizável (redireciona por JS, padrão de bloqueio ativo).',
  },
];

export function getSource(key: string): SourceEntry | undefined {
  return SOURCE_REGISTRY.find((s) => s.key === key);
}

/** A trava que o bot consulta: false ⇒ NÃO se faz requisição automática. */
export function isAutomationAllowed(key: string): boolean {
  return getSource(key)?.policy === 'allowed';
}

/** Fontes que exigem crédito — o pipeline precisa gravar atribuição junto do dado. */
export function requiresAttribution(key: string): boolean {
  const s = getSource(key);
  return s ? s.attributionRequired : true; // desconhecida ⇒ tratar como exigida
}
