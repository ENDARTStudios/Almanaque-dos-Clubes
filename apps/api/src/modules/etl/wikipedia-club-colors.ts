/**
 * T553 — cores do clube a partir do INFOBOX (mesma leitura de artigo que o escudo usa,
 * então não custa requisição extra).
 *
 * Três esquemas coexistem nas wikis, medidos em artigos reais (15-10-2026):
 *  - EN/ES/DE/IT usam o esquema de uniforme em **HEX**: `leftarm1`, `body1`, `rightarm1`,
 *    `shorts1`, `socks1` (N=1 é o titular). Juventus: `body1=FFFFFF`, `shorts1=000000`;
 *  - PT usa **nomes de cor**: `corpo1`, `braçoesquerdo1`, `braçodireito1`, `calções1`,
 *    `meias1` (os `skin*` são padrões, não cores);
 *  - alguns infoboxes têm campo explícito: `cor1`/`cor2`, `colores`, `colori`, `farbe1`.
 *
 * O que sai daqui é a cor do uniforme PRINCIPAL, que é a cor do clube. **Nada é inferido**:
 * nome de cor desconhecido não vira chute, e valor malformado é descartado (o acervo não
 * aceita cor inventada).
 */

/** Nomes de cor que aparecem em infobox de futebol (pt/es/it/en) → hex. */
const NOME_COR_HEX: Record<string, string> = {
  // pt-BR / pt
  branco: '#FFFFFF',
  preto: '#000000',
  vermelho: '#FF0000',
  azul: '#0000FF',
  verde: '#008000',
  amarelo: '#FFFF00',
  laranja: '#FFA500',
  roxo: '#800080',
  grená: '#800000',
  vinho: '#800000',
  marrom: '#8B4513',
  cinza: '#808080',
  dourado: '#FFD700',
  prata: '#C0C0C0',
  bege: '#F5F5DC',
  rosa: '#FFC0CB',
  // es
  blanco: '#FFFFFF',
  negro: '#000000',
  rojo: '#FF0000',
  amarillo: '#FFFF00',
  naranja: '#FFA500',
  morado: '#800080',
  granate: '#800000',
  gris: '#808080',
  dorado: '#FFD700',
  // it
  bianco: '#FFFFFF',
  nero: '#000000',
  rosso: '#FF0000',
  blu: '#0000FF',
  giallo: '#FFFF00',
  arancione: '#FFA500',
  viola: '#800080',
  grigio: '#808080',
  // en (infobox em inglês)
  white: '#FFFFFF',
  black: '#000000',
  red: '#FF0000',
  blue: '#0000FF',
  green: '#008000',
  yellow: '#FFFF00',
  orange: '#FFA500',
  navy: '#000080',
  maroon: '#800000',
  grey: '#808080',
  gray: '#808080',
  gold: '#FFD700',
  silver: '#C0C0C0',
};

/** Esquema de uniforme em HEX (EN/ES/DE/IT): N=1 é o titular. */
const CAMPOS_HEX_KIT = ['leftarm1', 'body1', 'rightarm1', 'shorts1', 'socks1'];
/** Esquema PT: nomes de cor do titular (com e sem acento — os artigos variam). */
const CAMPOS_PT_COR = [
  'corpo1',
  'braçoesquerdo1',
  'braçodireito1',
  'calções1',
  'meias1',
  'bracoesquerdo1',
  'bracodireito1',
  'calcoes1',
];
/** Campos explícitos de cor do CLUBE. */
const CAMPOS_COR_CLUBE = ['cor1', 'cor2', 'cor3', 'cores', 'colores', 'colori', 'farbe1', 'farbe2'];

const HEX_RE = /^#?([0-9a-f]{6})$/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Valor cru de um campo `|nome = valor` (o campo pode estar em qualquer ponto do artigo). */
function campoValor(wikitext: string, nome: string): string | null {
  const re = new RegExp(`^[ \\t]*\\|[ \\t]*${escapeRe(nome)}[ \\t]*=[ \\t]*([^\\n|]*)`, 'im');
  const m = re.exec(wikitext);
  const v = m?.[1]?.trim();
  return v ? v : null;
}

/** `#RRGGBB` (ou `RRGGBB`, `ffffff`) → `#FFFFFF`; qualquer outra coisa → null. */
export function normalizarHex(valor: string | null | undefined): string | null {
  if (!valor) return null;
  const achado = HEX_RE.exec(valor.trim());
  return achado ? `#${achado[1]!.toUpperCase()}` : null;
}

/** Nomes de cor (aceita lista: "preto e vermelho", "azul/vermelho", "blanco y negro"). */
export function nomesParaHex(valor: string | null | undefined): string[] {
  if (!valor) return [];
  const partes = valor
    .split(/\s*(?:,|;|\/|\be\b|\by\b|\band\b)\s*/i)
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
  const out: string[] = [];
  for (const p of partes) {
    const hex = NOME_COR_HEX[p];
    if (hex && !out.includes(hex)) out.push(hex);
  }
  return out;
}

/** Cores do clube extraídas do wikitexto do artigo (máximo 3, sem repetição). */
export function coresDoWikitext(wikitext: string): string[] {
  const out: string[] = [];
  const add = (hex: string | null | undefined) => {
    if (hex && !out.includes(hex)) out.push(hex);
  };
  // 1) hex do esquema de uniforme (EN/ES/DE/IT)
  for (const campo of CAMPOS_HEX_KIT) add(normalizarHex(campoValor(wikitext, campo)));
  // 2) esquema PT — o valor pode ser nome de cor OU hex
  for (const campo of CAMPOS_PT_COR) {
    const valor = campoValor(wikitext, campo);
    add(normalizarHex(valor));
    for (const hex of nomesParaHex(valor)) add(hex);
  }
  // 3) campos explícitos de cor do clube
  for (const campo of CAMPOS_COR_CLUBE) {
    const valor = campoValor(wikitext, campo);
    add(normalizarHex(valor));
    for (const hex of nomesParaHex(valor)) add(hex);
  }
  return out.slice(0, 3);
}
