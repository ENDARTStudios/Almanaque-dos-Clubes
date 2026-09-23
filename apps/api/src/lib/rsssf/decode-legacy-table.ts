/**
 * T448b-2b FASE 1 — Decodificação legacy + extração de tabela final.
 * PURO (sem I/O). Tolerante a variações de layout MG, mas FALHA EXPLÍCITA
 * (warning estruturado) quando colunas essenciais faltam. Nunca "adivinha".
 */
import type { FixtureFile, ParsedTable, ParseWarning, TableRow } from './types.js';

/** Decodifica bytes legacy (RSSSF Brasil: cp1252 mascarado como utf-8). */
export function decodeLegacyBytes(bytes: Uint8Array, encoding = 'windows-1252'): string {
  try {
    return new TextDecoder(encoding).decode(bytes);
  } catch {
    return Buffer.from(bytes).toString('latin1');
  }
}

const ENTITIES: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&nbsp;': ' ',
};

/** HTML/`<pre>` → texto plano (br→\n, remove tags, resolve entidades básicas). */
export function htmlToText(html: string): string {
  let out = html.replace(/\r/g, '').replace(/<br\s*\/?>/gi, '\n');
  out = out.replace(/<\/(p|div|tr|table|pre)>/gi, '\n');
  out = out.replace(/<[^>]+>/g, '');
  for (const [k, v] of Object.entries(ENTITIES)) out = out.split(k).join(v);
  return out;
}

/** Texto do fixture (aceita texto direto ou bytes legacy em base64). */
export function fixtureToText(input: string | FixtureFile): string {
  if (typeof input === 'string') return htmlToText(input);
  if (input.rawText != null) return htmlToText(input.rawText);
  if (input.rawBase64 != null) {
    const bytes = Buffer.from(input.rawBase64, 'base64');
    return htmlToText(decodeLegacyBytes(bytes, input.encoding ?? 'windows-1252'));
  }
  return '';
}

const ROW_RE = /^\s*(\d{1,2})\.\s*(.+?)\s*$/;

/**
 * Extrai as linhas de classificação final no formato `N.Clube <números> [Saldo] [Pts] [nota]`.
 * Essencial = posição + time + ≥1 valor numérico; senão `malformed_row`.
 */
export function decodeLegacyTable(input: string | FixtureFile): ParsedTable {
  const text = fixtureToText(input);
  const rows: TableRow[] = [];
  const warnings: ParseWarning[] = [];
  const lines = text.split('\n');

  lines.forEach((line, idx) => {
    const m = ROW_RE.exec(line);
    if (!m) return;
    const position = Number(m[1]);
    const rest = m[2].trim();
    const tokens = rest.split(/\s+/);
    const firstNumeric = tokens.findIndex((t) => /^\d/.test(t));
    if (firstNumeric <= 0) {
      warnings.push({
        code: 'malformed_row',
        message: 'linha com posição sem time/valores numéricos',
        line: idx + 1,
      });
      return;
    }
    const team = tokens.slice(0, firstNumeric).join(' ');
    const numbers: number[] = [];
    let goalDiff: number | null = null;
    for (const tk of tokens.slice(firstNumeric)) {
      const hr = /^(\d+)\s*-\s*(\d+)$/.exec(tk);
      if (hr) goalDiff = Number(hr[1]) - Number(hr[2]);
      else if (/^\d+$/.test(tk)) numbers.push(Number(tk));
    }
    if (numbers.length === 0 && goalDiff === null) {
      warnings.push({ code: 'malformed_row', message: 'linha sem valores', line: idx + 1 });
      return;
    }
    rows.push({
      position,
      team,
      numbers,
      goalDiff,
      points: numbers.length ? numbers[numbers.length - 1] : null,
      raw: line.trim(),
    });
  });

  // Consistência: posições duplicadas ou ausência de posição 1 (quando há tabela).
  const positions = rows.map((r) => r.position);
  if (positions.length > 1) {
    if (new Set(positions).size !== positions.length) {
      warnings.push({ code: 'malformed_table', message: 'posições duplicadas na tabela' });
    }
    if (!positions.includes(1)) {
      warnings.push({ code: 'malformed_table', message: 'tabela sem posição 1' });
    }
  }

  return { rows, warnings };
}
