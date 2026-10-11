/**
 * T510 (W4.1) — helpers PUROS de casamento de clube (Wikipedia → acervo).
 *
 * O seed de temporadas precisa casar nomes que variam de grafia/idioma entre a
 * fonte (Wikipedia) e o acervo ("Manchester City" × "Manchester City F.C.",
 * "Inter" × "Inter Milan", "Real Madrid C. F." × "Real Madrid Club de Fútbol").
 * Aqui ficam a normalização e a tabela de aliases — sem Prisma, para testar.
 */

/** Tokens de tipo societário/esportivo que não distinguem clubes. */
const TYPE_TOKENS = new Set([
  'fc',
  'cf',
  'ac',
  'sc',
  'ss',
  'as',
  'ssc',
  'cd',
  'rc',
  'ud',
  'sd',
  'ue',
  'ca',
  'club',
  'de',
  'do',
  'da',
  'del',
  'futbol',
  'futebol',
  'football',
  'calcio',
  'balompie',
  'sad',
  'spa',
  'srl',
  'afc',
  'basket',
]);

/**
 * Chave normalizada para comparar nomes de clube: sem acento, sem pontuação,
 * sem tokens de tipo e sem anos. Ex.: "Manchester City F.C." → "manchestercity";
 * "Real Madrid Club de Fútbol" → "realmadrid".
 */
export function normalizeClubName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\./g, '') // "F.C." → "FC" (evita virar tokens "f"+"c")
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter((w) => w.length >= 2 && !TYPE_TOKENS.has(w) && !/^\d{4}$/.test(w))
    .join('');
}

/** Nome com aparência de ruído de importação (não é um clube de verdade). */
export function isJunkClubName(name: string): boolean {
  return / and the | national (football )?team|select[ae]d|combined|all[- ]stars/i.test(name);
}

/**
 * Aliases Wikipedia → acervo, para os casos em que a grafia curta do artigo não
 * é a do acervo. Convenção do seed RSSSF (T035).
 */
export const NAME_ALIASES: Record<string, string> = {
  // Brasileirão (T508)
  'Botafogo FR': 'Botafogo F.R.',
  'Botafogo de Futebol e Regatas': 'Botafogo F.R.',
  Palmeiras: 'Sociedade Esportiva Palmeiras',
  Flamengo: 'Clube de Regatas do Flamengo',
  Corinthians: 'S.C. Corinthians Paulista',
  Fluminense: 'Fluminense F.C.',
  Cruzeiro: 'Cruzeiro E.C.',
  Grêmio: 'Grêmio FBPA',
  Internacional: 'S.C. Internacional',
  Santos: 'Santos F.C.',
  Vasco: 'Club de Regatas Vasco da Gama',
  'São Paulo': 'São Paulo FC',
  // T510 — topo europeu (o acervo usa a grafia curta em inglês)
  Inter: 'Inter Milan',
  Milan: 'AC Milan',
  Juventus: 'Juventus FC',
  Napoli: 'SSC Napoli',
  Roma: 'AS Roma',
  Lazio: 'S.S. Lazio',
  Atalanta: 'Atalanta B.C.',
  Fiorentina: 'ACF Fiorentina',
  Barcelona: 'FC Barcelona',
  'Athletic Bilbao': 'Athletic Club',
  'Real Sociedad': 'Real Sociedad de Fútbol',
  'Real Betis': 'Real Betis Balompié',
  'Celta de Vigo': 'RC Celta de Vigo',
  'Rayo Vallecano': 'Rayo Vallecano de Madrid',
  // T514 — artefato da FONTE: na tabela da Primeira Liga 2021-22 a célula do clube
  // renderiza o texto cru de um template (`{{Futebol B-SAD}}`), SEM link para o
  // artigo. O clube é o B-SAD (Q59212899), que está no acervo; sem este mapeamento
  // a linha ficaria sem clube (e "Predefinição:Futebol B-SAD" apareceria como nome).
  'Predefinição:Futebol B-SAD': 'B-SAD',
};
