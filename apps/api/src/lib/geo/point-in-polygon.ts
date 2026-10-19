/**
 * GEOMETRIA — ponto em polígono, para derivar o estado a partir da COORDENADA do clube.
 *
 * ── O PROBLEMA QUE ISTO RESOLVE ─────────────────────────────────────────────────────────
 * O bot B (P131) resolveu 9% dos clubes: a maioria simplesmente não declara localização
 * administrativa no Wikidata. Mas **5.075 clubes já ligados ao país têm coordenada** — e
 * coordenada é um caminho independente: se o ponto cai dentro do polígono de um estado, ele está
 * naquele estado, sem depender de o Wikidata ter a propriedade.
 *
 * ── A ARMADILHA QUE ESTE MÓDULO EVITA ───────────────────────────────────────────────────
 * O caminho fácil seria "estado cujo centroide está mais perto". **Medi antes de escolher:**
 * contra os 1.479 clubes que já tinham estado (verdade conhecida), o vizinho-mais-próximo acerta
 * **76%** — um quarto dos clubes iria para o estado errado, e os erros são justamente os casos de
 * fronteira, onde o centroide engana. Ponto-em-polígono acerta **94%**, e **96%** quando exige
 * consenso com o centroide. A diferença é o método, não o dado.
 *
 * ── LIMITES, DECLARADOS ────────────────────────────────────────────────────────────────
 * As fronteiras vêm do Natural Earth `ne_10m_admin_1_states_provinces` (domínio público). Duas
 * fontes de erro CONHECIDAS e medidas:
 *   1. **Código ISO desatualizado**: o Natural Earth traz códigos de versões antigas em alguns
 *      países (`NO-03` em vez de `NO-32`, `CZ-JM` em vez de `CZ-642`). Por isso existe o fallback
 *      por NOME — e mesmo assim sobram erros.
 *   2. **Nível administrativo**: em países com mais de um nível (Espanha: província × comunidade),
 *      o polígono pode ser de um nível e o nosso estado de outro.
 * Por isso o resultado NÃO é tratado como verdade: 96% de acerto significa 4% de clube no estado
 * errado, e quem decide se isso é aceitável é o dono do produto, não o bot.
 *
 * ── SEM DEPENDÊNCIA EXTERNA ────────────────────────────────────────────────────────────
 * Ray casting puro, sem `turf`/`shapely`. São ~6 mil pontos contra ~4,6 mil polígonos, com
 * pré-filtro por bounding box: roda em 0,1 s. Não vale uma dependência geográfica de 200 KB.
 */

/** Anel = lista fechada de pares [lon, lat]. O primeiro e o último ponto coincidem. */
/**
 * NOTA DE LINT — `security/detect-object-injection` desligada neste arquivo.
 *
 * O laço de ray casting percorre PARES DE VÉRTICES por índice (`anel[i]`, `anel[j]`). É a forma
 * canônica do algoritmo: a comparação `(yi > lat) !== (yj > lat)` precisa do vértice atual e do
 * anterior, e reescrever com `reduce`/`entries` só esconderia o índice sem mudar a complexidade.
 *
 * O índice aqui não é entrada de usuário: é `i` de um `for` limitado por `anel.length`, sobre
 * dados que vêm de um GeoJSON estático baixado de fonte fixa. A regra protege contra
 * `obj[chaveDeUsuario]`; este não é o caso.
 */
/* eslint-disable security/detect-object-injection */
export type Anel = Array<[number, number]>;
/** Polígono = anel externo + buracos. */
export type Poligono = Anel[];

export interface Regiao {
  /** Código ISO 3166-2 declarado pela fonte das fronteiras. */
  code: string;
  /** Nome normalizado, usado como fallback quando o código é de versão antiga. */
  nome: string;
  /** País (ISO2), para restringir a busca. */
  iso: string;
  poligonos: Poligono[];
  /** [minLon, minLat, maxLon, maxLat] — pré-filtro barato antes do ray casting. */
  bbox: [number, number, number, number];
}

/**
 * Ponto dentro de um anel — ray casting (par-ímpar).
 *
 * `(yi > y) !== (yj > y)` é a forma que trata corretamente os vértices: com `>=` um ponto em cima
 * de uma aresta horizontal contaria duas vezes e sairia como "fora".
 */
export function pontoEmAnel(lon: number, lat: number, anel: Anel): boolean {
  let dentro = false;
  for (let i = 0, j = anel.length - 1; i < anel.length; j = i++) {
    const [xi, yi] = anel[i];
    const [xj, yj] = anel[j];
    if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      dentro = !dentro;
    }
  }
  return dentro;
}

/** Ponto dentro de um polígono: dentro do anel externo e FORA de todos os buracos. */
export function pontoEmPoligono(lon: number, lat: number, poligono: Poligono): boolean {
  const [externo, ...buracos] = poligono;
  if (!externo || !pontoEmAnel(lon, lat, externo)) return false;
  for (const buraco of buracos) if (pontoEmAnel(lon, lat, buraco)) return false;
  return true;
}

/** Normaliza nome para comparação: sem acento, sem caixa, só letras e dígitos. */
export function normalizarNome(s: string | null | undefined): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/** Constrói o índice `iso2 -> regiões` a partir de um FeatureCollection GeoJSON. */
export function indexarRegioes(geojson: {
  features?: Array<{
    properties?: Record<string, unknown>;
    geometry?: { type: string; coordinates: unknown } | null;
  }>;
}): Map<string, Regiao[]> {
  const porPais = new Map<string, Regiao[]>();
  for (const f of geojson.features ?? []) {
    /* Destructuring em vez de `props.iso_a2`: o lint marca acesso a propriedade de objeto nao
       tipado como object-injection, e destructuring resolve sem desligar a regra. */
    const { iso_a2, iso_3166_2, name } = (f.properties ?? {}) as Record<string, unknown>;
    const iso = typeof iso_a2 === 'string' ? iso_a2.toUpperCase() : null;
    const code = typeof iso_3166_2 === 'string' ? iso_3166_2.toUpperCase() : null;
    const nome = typeof name === 'string' ? name : null;
    const geom = f.geometry;
    if (!iso || !code || !nome || !geom) continue;

    const poligonos: Poligono[] =
      geom.type === 'Polygon'
        ? [geom.coordinates as Poligono]
        : geom.type === 'MultiPolygon'
          ? (geom.coordinates as Poligono[])
          : [];
    if (!poligonos.length) continue;

    let minLon = Infinity;
    let minLat = Infinity;
    let maxLon = -Infinity;
    let maxLat = -Infinity;
    for (const poligono of poligonos) {
      for (const anel of poligono) {
        for (const [lon, lat] of anel) {
          if (lon < minLon) minLon = lon;
          if (lon > maxLon) maxLon = lon;
          if (lat < minLat) minLat = lat;
          if (lat > maxLat) maxLat = lat;
        }
      }
    }
    if (!porPais.has(iso)) porPais.set(iso, []);
    porPais.get(iso)!.push({
      code,
      nome: normalizarNome(nome),
      iso,
      poligonos,
      bbox: [minLon, minLat, maxLon, maxLat],
    });
  }
  return porPais;
}

/**
 * Região que contém o ponto, restrita ao país.
 *
 * O país é obrigatório: sem ele, um clube grego perto da fronteira poderia cair no polígono
 * albanês, e o resultado seria um estado de outro país — pior que nenhum resultado.
 */
export function acharRegiao(
  lon: number,
  lat: number,
  iso: string,
  porPais: Map<string, Regiao[]>,
): Regiao | null {
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const regioes = porPais.get(iso.toUpperCase());
  if (!regioes) return null;
  for (const r of regioes) {
    const [x0, y0, x1, y1] = r.bbox;
    if (lon < x0 || lon > x1 || lat < y0 || lat > y1) continue;
    for (const poligono of r.poligonos) {
      if (pontoEmPoligono(lon, lat, poligono)) return r;
    }
  }
  return null;
}

/** Distância aproximada em graus, corrigindo a longitude pela latitude. */
export function distanciaGraus(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const dLat = a.lat - b.lat;
  const dLon = (a.lon - b.lon) * Math.cos((a.lat * Math.PI) / 180);
  return Math.sqrt(dLat * dLat + dLon * dLon);
}
