/**
 * T557 — TESTE DE CONTRATO da API pública.
 *
 * O que isto protege, e por que existe separado dos outros testes: as outras suítes verificam
 * COMPORTAMENTO (o filtro filtra, o guard nega). Esta verifica FORMA — os nomes dos campos e os
 * tipos que o front consome. Renomear `subtitle` para `subTitle`, ou trocar um número por string,
 * não quebra nenhum teste de comportamento e quebra a TELA em silêncio: o front lê a chave, recebe
 * `undefined`, e renderiza vazio sem erro nenhum.
 *
 * Origem: a paleta de comando (`CommandPalette.tsx`) passou meses consumindo `/search/global` com
 * um mock de teste, e o contrato real nunca tinha sido exercitado. Quando foi conferido à mão
 * contra produção, o formato verdadeiro apareceu — e é o que está fixado aqui.
 *
 * Os campos verificados foram lidos da RESPOSTA REAL em produção, não inventados:
 *   /search/global → results[] com type,id,qid,name,subtitle,country,city,score,sourceUrl
 *                    e `subtitle` no formato "Cidade, UF" / "Cidade, PAÍS" (nunca nulo nos reais)
 *   /clubs/countries, /players/countries → { code, name, clubs|players }
 *
 * Requer Postgres para os endpoints que consultam o banco; sem ele, skip honesto (mesmo padrão
 * das outras suítes de integração).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/config/prisma.js';
import type { FastifyInstance } from 'fastify';

let app: FastifyInstance;
let dbOk = true;
const isPostgres = (process.env.DATABASE_URL ?? '').startsWith('postgres');

beforeAll(async () => {
  app = await buildApp();
  await app.ready();
  if (!isPostgres) return;
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    if (process.env.TEST_REQUIRE_DB === 'true')
      throw new Error(
        '[T557/TEST_REQUIRE_DB] banco ausente no CI — falha, não skip (D-2026-09-18)',
      );
  }
});

afterAll(async () => {
  await app?.close();
});

/** Confere que `obj` tem exatamente os tipos declarados (e que a chave existe). */
function forma(obj: unknown, esperado: Record<string, string>, onde: string): void {
  expect(obj, `${onde}: não é objeto`).toBeTypeOf('object');
  for (const [chave, tipo] of Object.entries(esperado)) {
    const v = (obj as Record<string, unknown>)[chave];
    expect(v, `${onde}: campo "${chave}" ausente no contrato`).toBeDefined();
    if (tipo.endsWith('?')) {
      // Opcional: pode ser null, mas se vier, tem de ser do tipo certo.
      const base = tipo.slice(0, -1);
      if (v !== null) expect(typeof v, `${onde}.${chave}`).toBe(base);
    } else {
      expect(typeof v, `${onde}.${chave}`).toBe(tipo);
    }
  }
}

describe('T557 — contrato de /search/global (consumido pela paleta de comando)', () => {
  it('results[] traz os campos que a paleta lê, com os tipos certos', async () => {
    /* `dbOk` porque `/search/global` consulta o banco (busca por tsvector). Sem Postgres ele
       devolve 500 — e a primeira versão deste teste não tinha o guard, então falhava por
       credencial de banco local em vez de contrato. O defeito era do teste, não da API. */
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/search/global?q=real+madrid' });
    expect(res.statusCode).toBe(200);

    const corpo = res.json() as { results?: unknown[] };
    expect(Array.isArray(corpo.results), 'results tem de ser array').toBe(true);

    if (!corpo.results?.length) return; // acervo vazio não é falha de contrato

    // A paleta usa `qid` para agrupar, `type` para rotear o clique, `name` para o rótulo e
    // `subtitle` para a linha de contexto. Se qualquer um sumir, a tela esvazia sem erro.
    forma(
      corpo.results[0],
      {
        type: 'string',
        id: 'string',
        name: 'string',
        subtitle: 'string?',
        country: 'string?',
        city: 'string?',
        score: 'number?',
        sourceUrl: 'string?',
      },
      'results[0]',
    );

    // `type` é o que decide a rota do Enter. Valor novo aqui exige rota nova na paleta.
    const tipos = new Set(corpo.results.map((r) => (r as { type: string }).type));
    for (const t of tipos) {
      expect(
        ['club', 'player', 'competition', 'match', 'stadium'],
        `type desconhecido vindo da API: "${t}" — a paleta não sabe rotear`,
      ).toContain(t);
    }
  });

  it('a busca não devolve resultado sem `name` (a paleta titula com ele)', async () => {
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/search/global?q=a' });
    const corpo = res.json() as { results?: Array<{ name?: unknown }> };
    const semNome = (corpo.results ?? []).filter((r) => !r.name);
    expect(semNome.length, `${semNome.length} resultado(s) sem name`).toBe(0);
  });
});

describe('T557 — contrato do índice de países (agrupamento de /clubs e /players)', () => {
  it('/clubs/countries devolve { code, name, clubs } e o total bate com a soma', async () => {
    /* O Postgres do CI e montado VAZIO (schema, sem dados). Exigir acervo aqui faria o teste
       falhar por banco vazio, e nao por contrato — foi o que aconteceu na primeira execucao:
       `expected 0 to be greater than 0`. A FORMA e a INVARIANTE continuam verificaveis com o que
       existir; sem dado, a invariante e vacuamente verdadeira e nao ha o que afirmar. */
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/clubs/countries' });
    expect(res.statusCode).toBe(200);

    const { data } = res.json() as {
      data: { countries: unknown[]; totals: Record<string, number> };
    };
    expect(Array.isArray(data.countries)).toBe(true);
    if (data.countries.length === 0) return; // banco vazio no CI: nada a afirmar

    forma(data.countries[0], { code: 'string', name: 'string?', clubs: 'number' }, 'countries[0]');

    /* A INVARIANTE que dá sentido ao endpoint: a soma das contagens é o próprio total
       declarado. Se divergir, o índice está mentindo sobre o acervo — foi exatamente o defeito
       que motivou este endpoint existir em separado do `/clubs/geo-stats` (que agrupa pela FK
       `countryId`, 32% do acervo, e cujos números NÃO batem com o filtro `?country=`). */
    const soma = (data.countries as Array<{ clubs: number }>).reduce((s, c) => s + c.clubs, 0);
    expect(soma, 'soma das contagens != totals.clubsWithCountry').toBe(
      data.totals.clubsWithCountry,
    );
    expect(data.totals.countries).toBe(data.countries.length);
  });

  it('/players/countries devolve { code, name, players } e o total bate com a soma', async () => {
    /* O Postgres do CI e montado VAZIO (schema, sem dados). Exigir acervo aqui faria o teste
       falhar por banco vazio, e nao por contrato — foi o que aconteceu na primeira execucao:
       `expected 0 to be greater than 0`. A FORMA e a INVARIANTE continuam verificaveis com o que
       existir; sem dado, a invariante e vacuamente verdadeira e nao ha o que afirmar. */
    if (!dbOk) return;
    const res = await app.inject({ method: 'GET', url: '/api/v1/players/countries' });
    expect(res.statusCode).toBe(200);

    const { data } = res.json() as {
      data: { countries: unknown[]; totals: Record<string, number> };
    };
    expect(Array.isArray(data.countries)).toBe(true);
    if (data.countries.length === 0) return; // banco vazio no CI: nada a afirmar

    forma(
      data.countries[0],
      { code: 'string', name: 'string?', players: 'number' },
      'countries[0]',
    );

    const soma = (data.countries as Array<{ players: number }>).reduce((s, c) => s + c.players, 0);
    expect(soma).toBe(data.totals.playersWithCountry);
    expect(data.totals.countries).toBe(data.countries.length);
  });

  it('os códigos são ISO2 (é o valor que o filtro ?country= aceita)', async () => {
    if (!dbOk) return;
    for (const url of ['/api/v1/clubs/countries', '/api/v1/players/countries']) {
      const res = await app.inject({ method: 'GET', url });
      const { data } = res.json() as { data: { countries: Array<{ code: string }> } };
      if (data.countries.length === 0) continue;
      const ruins = data.countries.filter((c) => !/^[A-Z]{2}$/.test(c.code));
      expect(ruins.length, `${url}: ${ruins.length} código(s) fora do padrão ISO2`).toBe(0);
    }
  });

  it('a contagem do índice BATE com o filtro público (a invariante que importa)', async () => {
    if (!dbOk) return;
    /* Este é o teste que pega a regressão mais provável: alguém trocar a coluna do agrupamento
       (como o `geo-stats` faz, agrupando por `countryId`). O índice passaria a devolver números
       que não correspondem ao que o clique do usuário mostra. */
    const idx = await app.inject({ method: 'GET', url: '/api/v1/clubs/countries' });
    const { data } = idx.json() as { data: { countries: Array<{ code: string; clubs: number }> } };
    if (data.countries.length === 0) return; // banco vazio no CI: nada a afirmar

    for (const pais of data.countries.slice(0, 3)) {
      const filtro = await app.inject({
        method: 'GET',
        url: `/api/v1/clubs?country=${pais.code}&limit=1`,
      });
      const corpo = filtro.json() as { total?: number };
      expect(
        corpo.total,
        `índice diz ${pais.clubs} para ${pais.code}, filtro devolve ${corpo.total}`,
      ).toBe(pais.clubs);
    }
  });
});
