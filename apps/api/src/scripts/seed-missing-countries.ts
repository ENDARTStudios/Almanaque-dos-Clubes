/**
 * T580 — COMPLETA A TABELA `countries` (a dívida de DADO que o T579b declarou, não corrigiu).
 *
 * MEDIDO (2026-10-16, produção): `Club.country` / `Player.country` / `Competition.country` /
 * `Stadium.country` usam **223 códigos ISO2 distintos** e a tabela `countries` tinha **168**
 * linhas. 168 + 55 = 223 ⇒ os conjuntos são DISJUNTOS: toda linha da tabela é usada pelo
 * acervo (nenhuma linha órfã) e **55 códigos existiam no dado sem linha de referência**
 * (AG, AS, AW … WS). O T579b resolveu o QID desses 55 pelo P297 só para achar a bandeira;
 * AQUI a linha de referência é criada.
 *
 * FONTE (CC0): Wikidata, propriedade **P297** ("ISO 3166-1 alpha-2 code") → item do país.
 * Do item vêm `iso3` (P298), `continent` (P30 → o código de 2 letras que o model `Country`
 * usa), coordenada (P625, WKT) e o `qid`. **Nenhum QID é digitado à mão**: o item é DERIVADO
 * do P297 e VALIDADO antes de gravar (guardas abaixo).
 *
 * GUARDAS (violação ⇒ NÃO grava, e o motivo entra no relatório):
 *   1. P297 respondeu 0 ou ≥ 2 itens para o mesmo código (código ausente/ambíguo);
 *   2. `P31` sem nenhuma classe de país/território (`CLASSES_DE_PAIS`, lista fechada e
 *      declarada — derivada do P31 medido dos 55 códigos nesta rodada, ver o arquivo);
 *   3. sem label utilizável (nem pt nem en).
 * O continente só entra quando resolve para UM código do modelo: P30 de rank `preferred`
 * quando existe (é o que separa o Reino dos Países Baixos da Europa — Q29999 tem P30 = EU
 * preferred + NA/AF/AS/SA normais), senão os normais; QID de P30 que o modelo não conhece é
 * seguido por **P361** (P30 = "Insular Oceania" → P361 = Oceania → `OC`).
 *
 * IDEMPOTENTE: chave natural `countries.iso2` (`@unique`). Re-run ⇒ `criados = 0`.
 * ZERO OVERWRITE: só INSERT de código SEM linha. Linha existente NÃO é tocada — nem campo
 * vazio é preenchido: medido, as 168 linhas têm `iso3` NULL e as 3 obsoletas que o acervo usa
 * (DD/YU/AN) já têm o nome HISTÓRICO ("German Democratic Republic", "Yugoslavia", "Netherlands
 * Antilles"). Preencher o `iso3` das 168 e anotar as obsoletas é OUTRA decisão — DECLARADA no
 * relatório desta rodada, não feita em silêncio.
 *
 * Uso (local, se houvesse banco — não há; ver skill `prod-railway`):
 *   node dist/scripts/seed-missing-countries.js                        # DRY-RUN (default)
 *   node dist/scripts/seed-missing-countries.js --apply                # grava
 *   node dist/scripts/seed-missing-countries.js --iso2=NL,SS --apply   # subconjunto curado
 *
 * Reversível por proveniência:
 *   DELETE FROM countries WHERE "importedFrom" = 'wikidata-p297-countries';
 */
import { z } from 'zod';
import { fetchWithRetry, type Fetcher } from '../lib/http-resilience.js';
import {
  CONTINENT_QID_TO_CODE,
  parsePoint,
} from '../modules/etl/connectors/wikidata-geo.connector.js';

/** Marcador de proveniência do lote (torna o INSERT reversível e distinguível do `wikidata-geo`). */
export const MARCADOR = 'wikidata-p297-countries';

const SPARQL_ENDPOINT = 'https://query.wikidata.org/sparql';
const USER_AGENT =
  'AlmanaqueDosClubes/0.1 (t580 countries-gap; https://github.com/ENDARTStudios/Almanaque-dos-Clubes)';
/** Códigos por requisição: a consulta vai na URL (GET) e fica curta assim. */
const LOTE = 100;

/**
 * Idioma do `name`. NÃO é preferência: **168/168** linhas da tabela estão em inglês (medido;
 * vieram do `bd:serviceParam wikibase:language "en,pt,es"` do conector `wikidata-geo`) e a
 * referência tem de ficar consistente. O brief da rodada pedia "pt quando existir, senão en" —
 * a divergência está DECLARADA no relatório (o rótulo da tabela vence o `Intl.DisplayNames`
 * do locale na UI, então trocar o idioma das 223 linhas é decisão à parte, não efeito
 * colateral deste seed).
 */
export const IDIOMA_DO_NOME: 'en' | 'pt' = 'en';

/**
 * Classes de `P31` aceitas como "país/território" (lista FECHADA e declarada).
 *
 * Derivada do P31 medido dos 55 códigos que faltavam em 2026-10-16 (todas as 55 têm ao menos
 * uma destas; nenhuma outra classe foi necessária) — ver relatório do T580. É um portão de
 * PLAUSIBILIDADE: se o P297 cair num item que não é país/território (pessoa, obra, clube,
 * divisão administrativa qualquer), o seed NÃO grava e registra o motivo.
 */
export const CLASSES_DE_PAIS: ReadonlySet<string> = new Set([
  'Q6256', // country
  'Q3624078', // sovereign state
  'Q161243', // dependent territory
  'Q46395', // British Overseas Territories
  'Q185086', // Crown Dependencies
  'Q462778', // insular area of the United States
  'Q1352230', // territory of the United States
  'Q783733', // unincorporated territory of the United States
  'Q779415', // special administrative region of China
  'Q15304003', // country of the Kingdom of the Netherlands
  'Q1138279', // associated state
  'Q66724388', // autonomous country within the Kingdom of Denmark
  'Q719487', // overseas collectivity of France
  'Q202216', // overseas department and region of France
]);

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

/** Agregado por código, do jeito que o SPARQL devolve (uma linha por combinação de OPTIONALs). */
export interface PaisBruto {
  iso2: string;
  /** Itens que responderam `P297 = iso2` (≥ 2 = código ambíguo). */
  qids: Set<string>;
  labelsPt: Set<string>;
  labelsEn: Set<string>;
  iso3: Set<string>;
  pontos: Set<string>;
  classes: Set<string>;
  /** Continentes do P30 (com o rank) e, para cada um, os P361 (superiores). */
  continentes: Array<{ qid: string; rank: 'pref' | 'norm' | 'dep' }>;
  superiores: Map<string, Set<string>>;
}

export interface PaisPlano {
  iso2: string;
  qid: string;
  iso3: string | null;
  name: string;
  continent: string | null;
  latitude: number | null;
  longitude: number | null;
  sourceUrl: string;
  /** O que a fonte NÃO deu ou deu de forma indireta (declarado, nunca silencioso). */
  notas: string[];
}

export interface PaisFora {
  iso2: string;
  qid: string | null;
  motivo: string;
}

export interface Plano {
  criar: PaisPlano[];
  fora: PaisFora[];
}

export interface SemeaduraStats {
  criados: number;
  jaExistem: number;
  qidEmUso: PaisFora[];
  dryRun: boolean;
}

/**
 * Contagens do acervo — a prova de integridade. `lote` = linhas da tabela com o NOSSO marcador
 * (é o "já-existiam" medido de verdade num re-run: `faltando` fica vazio, então o contador da
 * rodada não serve como evidência de noop).
 */
export interface Contagens {
  clubs: number;
  players: number;
  competitions: number;
  stadiums: number;
  matches: number;
  rankings: number;
  countries: number;
  lote: number;
}

/** Banco, com só o que o seed usa (injetável em teste — sem Prisma). */
export interface CountryStore {
  codesDoAcervo(): Promise<string[]>;
  iso2Existentes(): Promise<Set<string>>;
  qidExistentes(): Promise<Set<string>>;
  criar(p: PaisPlano, quando: Date): Promise<void>;
  contagensDoAcervo(): Promise<Contagens>;
  fechar(): Promise<void>;
}

// ---------------------------------------------------------------------------
// Puras: consulta, parse e planejamento
// ---------------------------------------------------------------------------

/**
 * Consulta canônica: os códigos entram por `VALUES ?iso2` e o item tem de responder o MESMO
 * código em `P297` (é o guarda 1, e é a própria fonte). O `wikibase:rank` do P30 vem junto
 * porque é o que desempata continente de item transcontinental.
 */
export function construirConsulta(codes: string[]): string {
  const values = codes.map((c) => `"${c}"`).join(' ');
  return `
SELECT ?iso2 ?country ?labelPt ?labelEn ?iso3 ?coord ?classe ?contRank ?continent ?contSuper WHERE {
  VALUES ?iso2 { ${values} }
  ?country wdt:P297 ?iso2 .
  OPTIONAL { ?country wdt:P298 ?iso3 }
  OPTIONAL { ?country wdt:P625 ?coord }
  OPTIONAL { ?country wdt:P31 ?classe }
  OPTIONAL { ?country rdfs:label ?labelPt FILTER(lang(?labelPt) = "pt") }
  OPTIONAL { ?country rdfs:label ?labelEn FILTER(lang(?labelEn) = "en") }
  OPTIONAL {
    ?country p:P30 ?st .
    ?st ps:P30 ?continent .
    ?st wikibase:rank ?contRank .
    OPTIONAL { ?continent wdt:P361 ?contSuper }
  }
}`.trim();
}

const bindingSchema = z.record(
  z.string(),
  z.object({ value: z.string(), type: z.string().optional() }),
);
/** `results` é OBRIGATÓRIO: payload que não é resposta SPARQL falha alto, não vira mapa vazio. */
const respostaSchema = z.object({
  results: z.object({ bindings: z.array(bindingSchema) }),
});

/** Extrai o Q-id de uma URI do Wikidata (…/entity/Q123) — null quando não é Q-id. */
export function idDe(uri: string | undefined): string | null {
  const m = /\/(Q\d+)$/.exec(uri ?? '');
  return m ? m[1] : null;
}

/** Rank do statement, do IRI do `wikibase:rank` (`…/ontology#PreferredRank`). */
export function rankDe(uri: string | undefined): 'pref' | 'norm' | 'dep' {
  if (uri?.endsWith('PreferredRank')) return 'pref';
  if (uri?.endsWith('DeprecatedRank')) return 'dep';
  return 'norm';
}

/** Normaliza os bindings: UMA entrada por `iso2`, com os conjuntos do que a fonte respondeu. */
export function parsearResposta(json: unknown): Map<string, PaisBruto> {
  const parsed = respostaSchema.safeParse(json);
  if (!parsed.success) throw new Error('resposta SPARQL em formato inesperado');
  const out = new Map<string, PaisBruto>();

  for (const row of parsed.data.results?.bindings ?? []) {
    const iso2 = row.iso2?.value?.trim().toUpperCase();
    if (!iso2 || !/^[A-Z]{2}$/.test(iso2)) continue;

    let b = out.get(iso2);
    if (!b) {
      b = {
        iso2,
        qids: new Set(),
        labelsPt: new Set(),
        labelsEn: new Set(),
        iso3: new Set(),
        pontos: new Set(),
        classes: new Set(),
        continentes: [],
        superiores: new Map(),
      };
      out.set(iso2, b);
    }

    const qid = idDe(row.country?.value);
    if (qid) b.qids.add(qid);
    if (row.labelPt?.value) b.labelsPt.add(row.labelPt.value);
    if (row.labelEn?.value) b.labelsEn.add(row.labelEn.value);
    if (row.iso3?.value) b.iso3.add(row.iso3.value.trim().toUpperCase());
    if (row.coord?.value) b.pontos.add(row.coord.value);

    const classe = idDe(row.classe?.value);
    if (classe) b.classes.add(classe);

    const continente = idDe(row.continent?.value);
    if (continente) {
      const rank = rankDe(row.contRank?.value);
      if (!b.continentes.some((c) => c.qid === continente && c.rank === rank)) {
        b.continentes.push({ qid: continente, rank });
      }
      const superior = idDe(row.contSuper?.value);
      if (superior) {
        const atual = b.superiores.get(continente) ?? new Set<string>();
        atual.add(superior);
        b.superiores.set(continente, atual);
      }
    }
  }
  return out;
}

/**
 * Continente do modelo, a partir do P30. Ordem: rank `preferred` quando existe → normais;
 * cada QID é traduzido por `CONTINENT_QID_TO_CODE` e, se o modelo não conhecer, pelos P361
 * dele. Resolve para 1 código (grava) ou não resolve (null + motivo declarado).
 */
export function resolverContinente(b: PaisBruto): { code: string | null; nota: string | null } {
  const vivos = b.continentes.filter((c) => c.rank !== 'dep');
  const preferidos = vivos.filter((c) => c.rank === 'pref');
  const base = preferidos.length > 0 ? preferidos : vivos;
  if (base.length === 0) return { code: null, nota: 'P30 ausente na fonte' };

  const diretos = new Set(
    base.map((c) => CONTINENT_QID_TO_CODE[c.qid]).filter((v): v is string => Boolean(v)),
  );
  if (diretos.size === 1) {
    const code = [...diretos][0] as string;
    return {
      code,
      nota: preferidos.length > 0 ? 'continente pelo P30 de rank preferred' : null,
    };
  }
  if (diretos.size > 1) {
    return {
      code: null,
      nota: `P30 com ${diretos.size} continentes distintos (${[...diretos].sort().join(', ')})`,
    };
  }

  const indiretos = new Set(
    base
      .flatMap((c) => [...(b.superiores.get(c.qid) ?? [])])
      .map((s) => CONTINENT_QID_TO_CODE[s])
      .filter((v): v is string => Boolean(v)),
  );
  if (indiretos.size === 1) {
    const code = [...indiretos][0] as string;
    const origem = base.map((c) => c.qid).join(', ');
    return { code, nota: `continente via P30 (${origem}) → P361 no modelo` };
  }
  return {
    code: null,
    nota: indiretos.size > 1 ? 'P30/P361 com vários continentes possíveis' : 'P30 fora do modelo',
  };
}

/** A decisão: o que CRIA e o que fica FORA (com motivo). Nada é inventado para preencher. */
export function planejar(
  codes: string[],
  brutos: Map<string, PaisBruto>,
  idioma: 'en' | 'pt' = IDIOMA_DO_NOME,
): Plano {
  const criar: PaisPlano[] = [];
  const fora: PaisFora[] = [];

  for (const iso2 of codes) {
    const b = brutos.get(iso2);
    if (!b) {
      fora.push({ iso2, qid: null, motivo: `nenhum item do Wikidata com P297 = ${iso2}` });
      continue;
    }
    if (b.qids.size !== 1) {
      fora.push({
        iso2,
        qid: null,
        motivo: `P297 = ${iso2} respondeu ${b.qids.size} itens (${[...b.qids].sort().join(', ')})`,
      });
      continue;
    }
    const qid = [...b.qids][0] as string;

    const aceitas = [...b.classes].filter((c) => CLASSES_DE_PAIS.has(c)).sort();
    if (aceitas.length === 0) {
      fora.push({
        iso2,
        qid,
        motivo: `P31 sem classe de país/território (P31: ${[...b.classes].sort().join(', ') || 'ausente'})`,
      });
      continue;
    }

    const primario = idioma === 'pt' ? [...b.labelsPt].sort()[0] : [...b.labelsEn].sort()[0];
    const secundario = idioma === 'pt' ? [...b.labelsEn].sort()[0] : [...b.labelsPt].sort()[0];
    const name = primario ?? secundario;
    if (!name) {
      fora.push({ iso2, qid, motivo: 'sem label pt nem en na fonte' });
      continue;
    }

    const notas: string[] = [];
    if (!primario) notas.push(`sem label ${idioma} na fonte (usado o outro idioma)`);

    if (b.iso3.size > 1) {
      fora.push({
        iso2,
        qid,
        motivo: `P298 com ${b.iso3.size} valores (${[...b.iso3].sort().join(', ')})`,
      });
      continue;
    }
    const iso3 = [...b.iso3][0] ?? null;
    if (!iso3) notas.push('P298 ausente (iso3 fica null)');
    else if (!/^[A-Z]{3}$/.test(iso3)) notas.push(`P298 fora do formato ISO3: ${iso3}`);

    const continente = resolverContinente(b);
    if (continente.nota) notas.push(continente.nota);

    const ponto =
      [...b.pontos]
        .sort()
        .map((p) => parsePoint(p))
        .find((p) => p !== null) ?? null;
    if (!ponto) notas.push('P625 ausente/inválido (coordenada fica null)');

    criar.push({
      iso2,
      qid,
      iso3: iso3 && /^[A-Z]{3}$/.test(iso3) ? iso3 : null,
      name,
      continent: continente.code,
      latitude: ponto?.lat ?? null,
      longitude: ponto?.lng ?? null,
      sourceUrl: `https://www.wikidata.org/wiki/${qid}`,
      notas,
    });
  }

  return { criar, fora };
}

// ---------------------------------------------------------------------------
// Rede (SPARQL) — QID derivado do P297
// ---------------------------------------------------------------------------

export interface ResolverOptions {
  fetcher?: Fetcher;
  /** Pausa entre lotes (rate limit educado com o WDQS). */
  sleep?: (ms: number) => Promise<void>;
}

/** Resolve os códigos no Wikidata, em lotes. Sem item ⇒ o código nem aparece no mapa. */
export async function resolverPaises(
  codes: string[],
  opts: ResolverOptions = {},
): Promise<Map<string, PaisBruto>> {
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const out = new Map<string, PaisBruto>();

  for (let i = 0; i < codes.length; i += LOTE) {
    const lote = codes.slice(i, i + LOTE);
    const url = `${SPARQL_ENDPOINT}?query=${encodeURIComponent(construirConsulta(lote))}&format=json`;
    const res = await fetchWithRetry(
      url,
      { headers: { Accept: 'application/sparql-results+json', 'User-Agent': USER_AGENT } },
      { label: 'seed-missing-countries', fetcher: opts.fetcher },
    );
    for (const [iso2, bruto] of parsearResposta(await res.json())) out.set(iso2, bruto);
    if (i + LOTE < codes.length) await sleep(2000);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Gravação idempotente
// ---------------------------------------------------------------------------

/** Insere só o que falta. `apply=false` (default) MEDE e não escreve. */
export async function semear(
  store: CountryStore,
  criar: PaisPlano[],
  opts: { apply: boolean; agora: Date },
): Promise<SemeaduraStats> {
  const existentes = await store.iso2Existentes();
  const qidsExistentes = await store.qidExistentes();
  const stats: SemeaduraStats = {
    criados: 0,
    jaExistem: 0,
    qidEmUso: [],
    dryRun: !opts.apply,
  };

  for (const p of criar) {
    if (existentes.has(p.iso2)) {
      stats.jaExistem += 1; // ZERO OVERWRITE: a linha existente não é tocada nem "completada"
      continue;
    }
    if (qidsExistentes.has(p.qid)) {
      stats.qidEmUso.push({
        iso2: p.iso2,
        qid: p.qid,
        motivo: `QID ${p.qid} já pertence a outra linha de countries (qid é @unique)`,
      });
      continue;
    }
    if (opts.apply) await store.criar(p, opts.agora);
    stats.criados += 1;
  }
  return stats;
}

// ---------------------------------------------------------------------------
// Banco (Prisma) — só o que o seed usa
// ---------------------------------------------------------------------------

export async function storePrisma(): Promise<CountryStore> {
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();

  return {
    /**
     * Os códigos vêm do DADO (as 4 colunas `country` do acervo), nunca de lista escrita à mão.
     */
    async codesDoAcervo() {
      const linhas = await prisma.$queryRaw<Array<{ iso2: string }>>`
        SELECT DISTINCT upper(country) AS iso2 FROM clubs WHERE country IS NOT NULL AND country <> ''
        UNION SELECT DISTINCT upper(country) FROM players WHERE country IS NOT NULL AND country <> ''
        UNION SELECT DISTINCT upper(country) FROM competitions WHERE country IS NOT NULL AND country <> ''
        UNION SELECT DISTINCT upper(country) FROM stadiums WHERE country IS NOT NULL AND country <> ''
      `;
      return linhas.map((r) => r.iso2.trim().toUpperCase());
    },
    async iso2Existentes() {
      const rows = await prisma.country.findMany({ select: { iso2: true } });
      return new Set(rows.map((r) => r.iso2.trim().toUpperCase()));
    },
    async qidExistentes() {
      const rows = await prisma.country.findMany({
        where: { qid: { not: null } },
        select: { qid: true },
      });
      return new Set(rows.map((r) => r.qid as string));
    },
    async criar(p, quando) {
      await prisma.country.create({
        data: {
          iso2: p.iso2,
          iso3: p.iso3,
          name: p.name,
          continent: p.continent,
          latitude: p.latitude,
          longitude: p.longitude,
          qid: p.qid,
          importedFrom: MARCADOR,
          importedAt: quando,
          sourceUrl: p.sourceUrl,
        },
      });
    },
    async contagensDoAcervo() {
      const [clubs, players, competitions, stadiums, matches, rankings, countries, lote] =
        await Promise.all([
          prisma.club.count(),
          prisma.player.count(),
          prisma.competition.count(),
          prisma.stadium.count(),
          prisma.match.count(),
          prisma.rankingEntry.count(),
          prisma.country.count(),
          prisma.country.count({ where: { importedFrom: MARCADOR } }),
        ]);
      return { clubs, players, competitions, stadiums, matches, rankings, countries, lote };
    },
    async fechar() {
      await prisma.$disconnect();
    },
  };
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

export function parsearArgs(argv: string[]): { apply: boolean; only: Set<string> | null } {
  const iso2 = argv.find((a) => a.startsWith('--iso2='));
  const only = iso2
    ? new Set(
        iso2
          .slice('--iso2='.length)
          .split(',')
          .map((c) => c.trim().toUpperCase())
          .filter((c) => /^[A-Z]{2}$/.test(c)),
      )
    : null;
  return { apply: argv.includes('--apply'), only };
}

function imprimirPlano(
  plano: Plano,
  brutos: Map<string, PaisBruto>,
  faltando: string[],
  stats: SemeaduraStats,
  apply: boolean,
  antes: Contagens,
  depois: Contagens,
): void {
  console.log(
    `faltavam na tabela: ${faltando.length}${faltando.length ? ` (${faltando.join(', ')})` : ''}`,
  );
  console.log(`resolvidos pela fonte (P297): ${plano.criar.length + plano.fora.length}`);
  console.log(`  com plano de INSERT: ${plano.criar.length}`);
  console.log(`  recusados pela guarda: ${plano.fora.length}`);
  for (const f of plano.fora)
    console.log(`    FORA ${f.iso2} (${f.qid ?? 'sem QID'}): ${f.motivo}`);
  console.log(`  sem resposta do P297: ${faltando.length - brutos.size}`);

  const notas = plano.criar.filter((p) => p.notas.length > 0);
  console.log(`declarados (nota registrada): ${notas.length}`);
  for (const p of notas) console.log(`    ${p.iso2}: ${p.notas.join(' · ')}`);

  for (const p of plano.criar) {
    console.log(
      `${apply ? 'CRIADO ' : 'criaria'} ${p.iso2} ${p.qid} iso3=${p.iso3 ?? '-'} ` +
        `continente=${p.continent ?? '-'} coord=${p.latitude !== null ? 'sim' : 'nao'} ` +
        `"${p.name}"`,
    );
  }
  for (const f of stats.qidEmUso) console.log(`PULADO ${f.iso2}: ${f.motivo}`);

  console.log(
    `${apply ? 'APPLY' : 'DRY-RUN'} → ${apply ? 'criados' : 'criaria'}=${stats.criados} · ` +
      `já-existiam=${stats.jaExistem} · qid-em-uso=${stats.qidEmUso.length}`,
  );

  // INTEGRIDADE: só a tabela de referência pode mudar. Qualquer outra contagem que mexa aqui
  // é bug de escopo, não "efeito colateral aceitável".
  const campos: Array<[string, number, number]> = [
    ['clubs', antes.clubs, depois.clubs],
    ['players', antes.players, depois.players],
    ['competitions', antes.competitions, depois.competitions],
    ['stadiums', antes.stadiums, depois.stadiums],
    ['matches', antes.matches, depois.matches],
    ['rankings', antes.rankings, depois.rankings],
  ];
  const estavel = campos.every(([, a, b]) => a === b);
  console.log(
    `integridade do acervo: ${estavel ? 'OK' : 'FALHOU'} — ` +
      `${campos.map(([k, a, b]) => `${k} ${a}→${b}`).join(' · ')} · ` +
      `countries ${antes.countries}→${depois.countries} · lote(${MARCADOR}) ${antes.lote}→${depois.lote}`,
  );
  if (!estavel) throw new Error('integridade do acervo violada');
}

async function main(): Promise<void> {
  const { apply, only } = parsearArgs(process.argv.slice(2));
  const store = await storePrisma();
  try {
    const antes = await store.contagensDoAcervo();
    const codes = (await store.codesDoAcervo()).filter((c) => /^[A-Z]{2}$/.test(c)).sort();
    const existentes = await store.iso2Existentes();
    const faltando = codes.filter((c) => !existentes.has(c));
    const alvo = only ? faltando.filter((c) => only.has(c)) : faltando;

    console.log(`acervo: ${codes.length} códigos ISO2 usados · tabela: ${existentes.size} linhas`);
    if (only) console.log(`--iso2 restringe a ${alvo.length} de ${faltando.length} faltantes`);

    const brutos = await resolverPaises(alvo);
    const plano = planejar(alvo, brutos, IDIOMA_DO_NOME);
    const stats = await semear(store, plano.criar, { apply, agora: new Date() });
    const depois = await store.contagensDoAcervo();

    imprimirPlano(plano, brutos, alvo, stats, apply, antes, depois);
    if (!apply) console.log('DRY-RUN — nada gravado. Rode com --apply.');
  } finally {
    await store.fechar();
  }
}

// Guarda de importação: em testes (vitest) o módulo é importado sem executar.
// Casa a fonte (`…scripts/seed-missing-countries.ts`, tsx local) e o build (`…dist/…js`).
const invokedAsScript = /scripts[\\/]seed-missing-countries\.(ts|js)$/.test(process.argv[1] ?? '');
if (invokedAsScript) {
  main().catch((err) => {
    console.error('Erro:', (err as Error).message);
    process.exit(1);
  });
}
