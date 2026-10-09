/**
 * T035 — parser de páginas de CAMPEÕES do RSSSF Brasil (rsssfbrasil.com).
 *
 * As páginas de palmares (ex.: tablesae/brcuphst.htm, tablesr/rgpcamp.htm,
 * tablesr/rjspcamp.htm) listam `ANO - Nome do Clube (Cidade)` separados por
 * quebras de tags. Anos sem torneio vêm como "not realized"/"not decided"/
 * "no effect" — pulados com status (honesto).
 *
 * Charset: páginas em windows-1252 (não UTF-8).
 * PURO: entra texto decodificado, sai lista de campeões. Sem rede/Prisma.
 */

export interface RsssfChampionEntry {
  year: number;
  championName: string;
  city: string | null;
  /** Ano sem torneio realizado/decidido — declarado, não contabiliza como edição. */
  status: 'champion' | 'not_realized' | 'not_decided' | 'no_effect';
}

const SKIP_STATUSES: Array<[RegExp, RsssfChampionEntry['status']]> = [
  [/not realized/i, 'not_realized'],
  [/not decided/i, 'not_decided'],
  [/no effect/i, 'no_effect'],
];

/** Decodifica bytes latin1/windows-1252 para string. */
export function decodeLatin1(buf: Uint8Array): string {
  return new TextDecoder('windows-1252').decode(buf);
}

/** Remove tags/scripts e normaliza separadores em tokens por '|' (vazios descartados). */
export function htmlToTokens(html: string): string[] {
  const stripped = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, '|')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&amp;/gi, '&')
    .replace(/\|{2,}/g, '|');
  return stripped
    .split('|')
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

/**
 * Extrai os campeões de uma página de palmares RSSSF.
 * Formato de linha: token `ANO` seguido (após 0-N tokens decorativos) de
 * `- Nome do Clube (Cidade)` ou `- not realized|decided|no effect`.
 */
export function parseChampionsPage(html: string): RsssfChampionEntry[] {
  const tokens = htmlToTokens(html);
  const out: RsssfChampionEntry[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const yearMatch = /^(\d{4})$/.exec(tok);
    if (!yearMatch) continue;
    const year = Number.parseInt(yearMatch[1], 10);
    if (year < 1850 || year > 2100) continue;

    // próximo token é o conteúdo do ano (vazios já filtrados). Se for outro
    // ano, este ano não tem dados — não registra (não adota o próximo como campeão).
    const content = i + 1 < tokens.length ? tokens[i + 1] : null;
    if (!content || /^\d{4}$/.test(content)) continue;

    const clean = content.replace(/^[-–—]\s*/, '').trim();
    if (!clean) continue;

    const skip = SKIP_STATUSES.find(([re]) => re.test(clean));
    if (skip) {
      const key = `${year}|skip`;
      if (!seen.has(key)) {
        seen.add(key);
        out.push({ year, championName: clean, city: null, status: skip[1] });
      }
      continue;
    }

    // `- Nome do Clube (Cidade)` → nome + cidade opcional
    const m = /^(.+?)\s*\(([^()]+)\)\s*$/.exec(clean);
    const championName = (m ? m[1] : clean).replace(/\s+/g, ' ').trim();
    const city = m ? m[2].trim() : null;
    if (!championName || championName.length < 2) continue;

    const key = `${year}|${championName}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ year, championName, city, status: 'champion' });
  }
  return out;
}
