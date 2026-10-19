/**
 * HIERARQUIA DE IMPORTÂNCIA DAS COMPETIÇÕES — os degraus de "Destaques".
 *
 * ── O PROBLEMA QUE ISTO RESOLVE ───────────────────────────────────────────────────────────
 * A seção "Destaques" mostrava três blocos de chips idênticos: CONTINENTAIS, INTERNACIONAIS e
 * FEMININO. Três defeitos medidos:
 *
 *   1. DUPLICATAS. UEFA Champions League, Copa Libertadores e AFC Champions League Elite
 *      apareciam nos DOIS primeiros blocos — mesmo `id`, duas entradas. 25 entradas, 22 distintas.
 *      Quem lê vê a mesma competição duas vezes e não sabe se são duas coisas.
 *
 *   2. GRANULARIDADES MISTURADAS. "FIFA World Cup" e "Campeonato Cearense" tinham o MESMO peso
 *      visual. São escalas incomparáveis: uma é o mundo, a outra é um estado brasileiro.
 *
 *   3. PESO ÚNICO. Todo chip era igual, então a seção não respondia a pergunta que ela mesma
 *      provoca: "qual dessas importa mais?".
 *
 * ── O EIXO ESCOLHIDO: ALCANCE ─────────────────────────────────────────────────────────────
 * Hierarquia por ALCANCE da competição, e não por "qual liga é melhor". Alcance é objetivo, é o
 * que o torcedor usa para se orientar, e não exige que o produto emita juízo de valor sobre
 * futebol:
 *
 *   MUNDIAL .............. decide o mundo (Copa do Mundo, Mundial de Clubes, Mundial Sub-20)
 *   CONTINENTAL .......... decide um continente (Champions, Libertadores, Eurocopa, Copa América)
 *   CONTINENTAL · 2º ..... segundo escalão continental (Sudamericana, Conference, Supercopa)
 *   NACIONAL ............. decide um país (FA Cup, Copa do Brasil, Bundesliga feminina)
 *
 * ── O QUE SAIU DE "DESTAQUES", E POR QUÊ ──────────────────────────────────────────────────
 * Os seis campeonatos ESTADUAIS femininos (Carioca, Paulista, Baiano, Catarinense, Gaúcho,
 * Mineiro) saíram. Não é despriorizar o futebol feminino — é corrigir a mistura de escalas:
 * um campeonato estadual não é "destaque" no sentido de alcance, e continuam alcançáveis pelo
 * índice de países (`?country=BR`). A representação feminina em Destaques fica com o que tem
 * alcance real: Copa América Femenina (continental), Brasileirão Feminino A1/A2 e
 * Frauen-Bundesliga (nacionais).
 *
 * ── POR QUE UM MAPA POR `id` E NÃO UM CAMPO NOS DADOS ─────────────────────────────────────
 * As âncoras já são uma lista CURADA (ids confirmados no banco). O degrau também é curadoria, e
 * fica separado para que a lista de dados continue sendo só dados. O `id` local é a chave de
 * deduplicação correta aqui: o bloco internacional não carrega `qid`, então qid não serviria.
 */
import type { AnchorCompetition } from './competition-anchors';

export type DegrauId = 'mundial' | 'continentalTop' | 'continentalSecundaria' | 'nacional';

/** Ordem de exibição: do maior alcance para o menor. */
export const ORDEM_DEGRAUS: DegrauId[] = [
  'mundial',
  'continentalTop',
  'continentalSecundaria',
  'nacional',
];

/**
 * Degrau de cada competição curada, por `id` local (UUID do acervo).
 * Competição que não esteja aqui cai em `nacional` — o degrau mais conservador, para uma âncora
 * nova nunca aparecer promovida a "mundial" por omissão.
 */
export const DEGRAU_POR_ID: Record<string, DegrauId> = {
  // --- MUNDIAL: decide o mundo -------------------------------------------------------------
  'c94c3d26-c3a8-45e0-8f4b-c2bd19707688': 'mundial', // FIFA World Cup
  '20fd756a-e71c-495f-9f81-704ad59d3cf3': 'mundial', // FIFA Club World Cup
  '8765bfc0-da33-4b71-a7d7-8820f5edae52': 'mundial', // FIFA U-20 World Cup
  '4aeb65d0-e44a-4cd1-ae55-e201cdea9c0b': 'mundial', // FIFA Women's World Cup

  // --- CONTINENTAL: decide um continente ---------------------------------------------------
  '8fae6a29-79c5-43d8-81ee-4b569361926b': 'continentalTop', // UEFA Champions League
  '9d50e9fa-bc31-4ea8-af77-e429f451ff52': 'continentalTop', // Copa Libertadores
  '17306764-eb92-4cff-bce7-543bb7b6ebd1': 'continentalTop', // Campeonato Europeu de Futebol
  'f9c4e068-01e1-4b3b-af0b-23695ffd03cd': 'continentalTop', // Copa América
  '0eb70d7d-b029-4f29-ab64-f20dfd3fa9d1': 'continentalTop', // AFC Champions League Elite
  '6b58023b-cf08-4989-9990-87522b8d3cd0': 'continentalTop', // CAF Champions League
  '8dd93794-5aa6-4540-bc26-e0cfd9ec9059': 'continentalTop', // Copa América Femenina

  // --- CONTINENTAL · 2º escalão ------------------------------------------------------------
  '110b0da4-3426-46b2-8abe-41772ae2e200': 'continentalSecundaria', // Copa Sudamericana
  '91cf395b-9788-4494-a382-497297cc97d0': 'continentalSecundaria', // UEFA Conference League
  'c58c32d7-df63-4ed4-b868-543894c82864': 'continentalSecundaria', // UEFA Super Cup
  'a0a344a7-ec42-401d-86b9-6007a899f5e8': 'continentalSecundaria', // UEFA Women's Nations League

  // --- NACIONAL: decide um país ------------------------------------------------------------
  '9b64436e-cfd5-47dc-bf6d-3ba87d2c3486': 'nacional', // Frauen-Bundesliga
  '28b9b4a6-6ae8-4062-aec6-5f3ca127d421': 'nacional', // Brasileirão Feminino A1
  '1ddd7fbf-90b6-4aca-aea1-50f1548ada33': 'nacional', // Brasileirão Feminino A2
};

/**
 * Competições que NÃO entram em Destaques, com o motivo.
 * Declarado, e não por omissão: some da tela apenas o que tem justificativa escrita.
 */
export const FORA_DE_DESTAQUES: Record<string, string> = {
  // Estaduais/regionais, FEMININO e MASCULINO. A primeira versão só tinha excluído os femininos
  // e mantido "Campeonato Paulista de Futebol" e "Campeonato Cearense" — ou seja, aplicava aos
  // estados das mulheres um critério que não aplicava aos dos homens. A regra vale para os dois:
  // campeonato estadual não é "destaque" de ALCANCE, e continua alcançável pelo índice de países.
  '88071e41-4a66-4f0f-9afb-ec01853b8215': 'estadual (RJ) · feminino',
  'ed599b52-7fe7-4f99-82c2-ff1b6c9bddd9': 'estadual (SP) · feminino',
  '7d74e829-6222-4955-873e-9fdee9523421': 'estadual (BA) · feminino',
  '43fb460d-80a2-48c8-944c-98b2937b1643': 'estadual (SC) · feminino',
  'ba8699c7-f9a6-4e09-a36c-223f55e388a3': 'estadual (RS) · feminino',
  'ce2599a8-88a4-4820-95fe-bcc995f986fa': 'estadual (MG) · feminino',
  'a37cdeef-55de-4e7f-95ed-07efdbf334f8': 'estadual (SP) · masculino',
  'a1f21c8b-a77b-4658-9dcc-288a227dc463': 'estadual (CE) · masculino',
};

export interface DegrauComItens {
  id: DegrauId;
  itens: AnchorCompetition[];
}

/**
 * Junta todas as listas curadas, remove duplicatas e distribui por degrau.
 *
 * A deduplicação é por `id` e mantém a PRIMEIRA ocorrência. Isso é seguro porque o mesmo `id` é a
 * mesma competição: as três duplicatas medidas (UEFA Champions, Libertadores, AFC Elite) eram o
 * mesmo UUID em dois blocos.
 *
 * Degraus vazios são omitidos — a página não renderiza um título sem conteúdo.
 */
export function agruparPorDegrau(listas: AnchorCompetition[][]): DegrauComItens[] {
  const porId = new Map<string, AnchorCompetition>();
  for (const lista of listas) {
    for (const c of lista) {
      if (!porId.has(c.id)) porId.set(c.id, c);
    }
  }

  const degraus = new Map<DegrauId, AnchorCompetition[]>();
  for (const c of porId.values()) {
    if (FORA_DE_DESTAQUES[c.id]) continue;
    const degrau = DEGRAU_POR_ID[c.id] ?? 'nacional';
    if (!degraus.has(degrau)) degraus.set(degrau, []);
    degraus.get(degrau)!.push(c);
  }

  return ORDEM_DEGRAUS.filter((id) => (degraus.get(id)?.length ?? 0) > 0).map((id) => ({
    id,
    itens: degraus.get(id)!,
  }));
}
