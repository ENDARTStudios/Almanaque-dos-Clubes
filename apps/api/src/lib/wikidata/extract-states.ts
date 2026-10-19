/**
 * Extração de SUBDIVISÕES (estados/províncias) do Wikidata — a lógica do bot A.
 *
 * ── O PROBLEMA DE DADO QUE ISTO RESOLVE ──────────────────────────────────────────────────
 * Medido no banco de produção antes de escrever:
 *
 *   clubes com `stateId` ......... 707 de 12.017  (5,9%)
 *   linhas na tabela `states` .... 114            (23 do Brasil)
 *   países com clubes ............ 220
 *   países com ZERO estados ...... a maioria (AU 554 clubes, GR 404, JP 359, BE 281, PE 278)
 *
 * Sem as subdivisões cadastradas, não existe hierarquia Estado → Cidade a oferecer: a tela
 * mostraria quase nada. Este extrator popula a tabela `states` a partir do Wikidata (CC0).
 *
 * ── POR QUE ISO 3166-2 (P300) COMO CHAVE ────────────────────────────────────────────────
 * O modelo `State` já tem `code String @unique` documentado como "ISO 3166-2 (P300) — chave de
 * dedup". É a chave certa por três motivos:
 *   - é estável e oficial (não é um rótulo que muda de idioma ou de grafia);
 *   - já prefixa o país (`BR-SP`), então a consulta é `STRSTARTS(?code, "BR-")` — uma por país;
 *   - casa com a coluna única que o schema já declarou, sem migração.
 *
 * ── O QUE NÃO É FEITO AQUI ──────────────────────────────────────────────────────────────
 * Não se decide o que é "primeiro nível". O filtro é o código ISO 3166-2, que por definição
 * cobre as subdivisões de primeiro nível — inclusive quando o país é uma federação (BR, AU, DE)
 * e quando não é (PT tem regiões, GB tem nações constituintes). Deixar o Wikidata responder
 * "qual é a divisão de topo" com uma classe (`P31`) exigiria escolher entre Q10864048 e as
 * dezenas de subclasses, e erraria em países cuja divisão de topo não usa essa classe.
 */
import type { SparqlBinding } from './sparql-client.js';

export interface EstadoWikidata {
  /** QID do Wikidata, ex.: `Q175` */
  qid: string;
  /** Código ISO 3166-2, ex.: `BR-SP`. É a chave de dedup declarada no schema. */
  code: string;
  /** Rótulo no idioma preferido. */
  name: string;
  latitude: number | null;
  longitude: number | null;
  /** URL canônica da entidade — grava-se como `sourceUrl` (o dado tem de citar a origem). */
  sourceUrl: string;
}

/** Quantas subdivisões pedir por país. 400 cobre com folga o maior caso (RU ~85, PH ~80). */
export const LIMITE_POR_PAIS = 400;

/**
 * Monta a consulta de um país.
 *
 * `STRSTARTS` no código é o filtro inteiro: não há como pedir "estados do Brasil" sem já saber
 * o QID do Brasil, e o código ISO evita essa dependência.
 *
 * `OPTIONAL { ?item wdt:P625 ?coord }` porque coordenada é útil mas NÃO é obrigatória: exigir
 * coordenada descartaria subdivisões válidas que simplesmente não a declaram.
 */
export function montarQuery(iso2: string): string {
  // Sanidade: só ISO2 alfabético entra na consulta. Isto é uma string interpolada em SPARQL, e
  // interpolação sem validação é como se injeta consulta.
  if (!/^[A-Z]{2}$/.test(iso2)) {
    throw new Error(`código ISO2 inválido: "${iso2}"`);
  }
  return `SELECT ?item ?itemLabel ?code ?coord WHERE {
  ?item wdt:P300 ?code .
  FILTER(STRSTARTS(?code, "${iso2}-"))
  OPTIONAL { ?item wdt:P625 ?coord }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "pt,en,es". }
}
LIMIT ${LIMITE_POR_PAIS}`;
}

/** `Point(147.0 -32.0)` → `{ lat: -32, lon: 147 }`. O formato é `lon lat`, nessa ordem. */
export function parseCoord(valor: string | undefined): { lat: number; lon: number } | null {
  if (!valor) return null;
  // Forma simples de propósito: `[\d.]+` não tem quantificador aninhado, e quem valida o numero
  // e o `Number.isFinite` abaixo. A versão anterior (`-?\d+(?:\.\d+)?`) disparava
  // security/detect-unsafe-regex — e regex com aninhamento é justamente o que trava com entrada
  // hostil.
  const m = /Point\(\s*(-?[\d.]+)\s+(-?[\d.]+)\s*\)/.exec(valor);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  // Fora da faixa não é coordenada: é dado corrompido. Melhor não gravar.
  if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  return { lat, lon };
}

/** `http://www.wikidata.org/entity/Q175` → `Q175` */
export function qidDeUri(uri: string | undefined): string | null {
  if (!uri) return null;
  const m = /\/entity\/(Q\d+)$/.exec(uri);
  return m ? m[1] : null;
}

/**
 * Normaliza as linhas do SPARQL em subdivisões utilizáveis.
 *
 * Descarta, e cada descarte tem motivo:
 *   - sem QID ou sem código ISO: não há como deduplicar nem identificar. Entrar assim criaria
 *     linha duplicada a cada execução;
 *   - código que não é do país pedido (o `FILTER` já garante, mas conferir é barato e protege
 *     contra resposta de cache de outra consulta);
 *   - código repetido: o mesmo estado pode aparecer em mais de uma linha se tiver mais de um
 *     valor de P625. Fica a PRIMEIRA ocorrência.
 */
export function normalizarEstados(
  bindings: SparqlBinding[],
  iso2: string,
): { estados: EstadoWikidata[]; descartados: Record<string, number> } {
  // Map em vez de objeto indexado: escrever `obj[chaveVariavel]` é o padrão que o lint marca
  // como object-injection (`security/detect-object-injection`) e o projeto já tem 250 avisos
  // desses. `Map` resolve sem desligar a regra.
  const contagem = new Map<string, number>();
  const contar = (motivo: string) => contagem.set(motivo, (contagem.get(motivo) ?? 0) + 1);

  const porCode = new Map<string, EstadoWikidata>();
  for (const b of bindings) {
    const qid = qidDeUri(b.item?.value);
    const code = b.code?.value?.trim().toUpperCase();
    const name = b.itemLabel?.value?.trim();

    if (!qid) {
      contar('sem_qid');
      continue;
    }
    if (!code) {
      contar('sem_codigo_iso');
      continue;
    }
    if (!code.startsWith(`${iso2}-`)) {
      contar('codigo_de_outro_pais');
      continue;
    }
    // Rótulo que é o próprio código (`Q123` sem label) não serve como nome legível.
    if (!name || name === code || /^Q\d+$/.test(name)) {
      contar('sem_rotulo_legivel');
      continue;
    }
    if (porCode.has(code)) {
      contar('codigo_repetido');
      continue;
    }

    const coord = parseCoord(b.coord?.value);
    porCode.set(code, {
      qid,
      code,
      name,
      latitude: coord?.lat ?? null,
      longitude: coord?.lon ?? null,
      sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
    });
  }

  return { estados: [...porCode.values()], descartados: Object.fromEntries(contagem) };
}
