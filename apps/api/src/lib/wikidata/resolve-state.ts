/**
 * Resolve o ESTADO de um clube caminhando a cadeia `P131` (entidade administrativa) do Wikidata.
 *
 * ── O PROBLEMA ───────────────────────────────────────────────────────────────────────────
 * 9.496 clubes estão em países que já têm estados cadastrados, mas seguem com `stateId` nulo.
 * 9.445 deles têm `qid`. O estado não vem direto no clube: o Wikidata guarda
 *   clube --P131--> município --P131--> estado
 * às vezes com um nível intermediário (distrito, região metropolitana, condado).
 *
 * ── COMO RESOLVE ────────────────────────────────────────────────────────────────────────
 * Busca em LARGURA, nivel a nivel, sobre o conjunto TODO — não clube a clube. A diferença é de
 * ordem de grandeza: resolver clube a clube faria uma requisição por clube (9.445); nivel a nivel
 * faz uma por lote de 50 QIDs, e os QIDs de um nível são compartilhados entre clubes do mesmo país
 * (todos os clubes de São Paulo apontam para Q174, que aponta para Q175).
 *
 * Para quando um candidato está em `estadosPorQid` (o mapa QID → id do estado no banco) ou quando
 * esgota a profundidade. A profundidade é LIMITADA porque a cadeia P131 é um grafo: sem teto, uma
 * inconsistência no Wikidata (ou um ciclo) faria a busca não terminar.
 *
 * ── O QUE ESTE MÓDULO NÃO FAZ ───────────────────────────────────────────────────────────
 * Não escreve no banco e não faz I/O de rede por conta própria: recebe `buscar` injetado. É o que
 * torna a lógica testável sem rede — e é justamente a parte que decide dado errado.
 */
import type { WikidataEntity } from './wikidata-client.js';

/** Profundidade máxima da caminhada. 4 cobre clube -> distrito -> município -> estado. */
export const PROFUNDIDADE_MAX = 4;

/**
 * Todos os `P131` de uma entidade (não só o primeiro).
 *
 * `extractP131Qid` (de `enrich-attributes.ts`) devolve `[0]` porque, para *cidade*, o primeiro
 * basta. Para estado não basta: um município pode ter mais de um pai administrativo declarado, e
 * escolher sempre o primeiro perderia o caminho que chega ao estado.
 */
export function p131DeEntidade(entity: WikidataEntity | null | undefined): string[] {
  const out: string[] = [];
  for (const claim of entity?.claims?.P131 ?? []) {
    const id = (claim.mainsnak?.datavalue?.value as { id?: string } | undefined)?.id;
    if (typeof id === 'string' && /^Q\d+$/.test(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

export interface ClubeAlvo {
  id: string;
  qid: string;
}

export interface OpcoesResolucao {
  /** QID do estado (Wikidata) -> id da linha em `states`. */
  estadosPorQid: Map<string, string>;
  /** Busca em lote; injetado para o teste não depender de rede. */
  buscar: (qids: string[]) => Promise<Map<string, WikidataEntity | null>>;
  profundidadeMax?: number;
}

export interface Resolucao {
  /** clubeId -> { stateId, profundidade } */
  resolvidos: Map<string, { stateId: string; profundidade: number }>;
  naoResolvidos: string[];
  /** Quantos clubes estavam pendentes em cada nível — serve para diagnosticar onde a cadeia para. */
  porProfundidade: number[];
}

export async function resolverClubesParaEstados(
  clubes: ClubeAlvo[],
  opts: OpcoesResolucao,
): Promise<Resolucao> {
  const profundidadeMax = opts.profundidadeMax ?? PROFUNDIDADE_MAX;
  const resolvidos = new Map<string, { stateId: string; profundidade: number }>();
  const porProfundidade: number[] = [];
  if (clubes.length === 0) return { resolvidos, naoResolvidos: [], porProfundidade };

  // Nível -1: a entidade do próprio clube, para descobrir o primeiro P131.
  const entidadesDoClube = await opts.buscar(clubes.map((c) => c.qid));

  /** QIDs candidatos por clube, no nível atual. */
  let frente = new Map<string, string[]>();
  for (const c of clubes) {
    const candidatos = p131DeEntidade(entidadesDoClube.get(c.qid));
    if (candidatos.length) frente.set(c.id, candidatos);
  }

  for (let profundidade = 0; profundidade <= profundidadeMax; profundidade++) {
    let resolvidosNesteNivel = 0;

    // 1. Tenta resolver com o que já está na frente.
    for (const [clubeId, candidatos] of [...frente]) {
      if (resolvidos.has(clubeId)) continue;
      const achado = candidatos.find((q) => opts.estadosPorQid.has(q));
      if (achado) {
        resolvidos.set(clubeId, { stateId: opts.estadosPorQid.get(achado)!, profundidade });
        frente.delete(clubeId);
        resolvidosNesteNivel++;
      }
    }
    porProfundidade.push(resolvidosNesteNivel);

    if (frente.size === 0 || profundidade === profundidadeMax) break;

    // 2. Sobe um nível: busca TODOS os candidatos pendentes de uma vez (deduplicados).
    const alvos = new Set<string>();
    for (const candidatos of frente.values()) for (const q of candidatos) alvos.add(q);
    if (alvos.size === 0) break;

    const entidades = await opts.buscar([...alvos]);
    const proxima = new Map<string, string[]>();
    for (const [clubeId, candidatos] of frente) {
      /* Os pais de TODOS os candidatos do clube viram a nova frente. Manter a união — em vez de
         escolher um ramo — é o que permite resolver quando um dos pais não leva ao estado. */
      const pais = candidatos.flatMap((q) => p131DeEntidade(entidades.get(q)));
      // Dedupe e remove o que já foi tentado neste clube (evita crescer sem necessidade).
      const unicos = [...new Set(pais)].filter((q) => !candidatos.includes(q));
      if (unicos.length) proxima.set(clubeId, unicos);
    }
    frente = proxima;
  }

  const naoResolvidos = clubes.filter((c) => !resolvidos.has(c.id)).map((c) => c.id);
  return { resolvidos, naoResolvidos, porProfundidade };
}
