import { describe, it, expect } from 'vitest';
import {
  decideFlagLicense,
  fetchFlagClaims,
  fetchFlagImageInfo,
  flagExtension,
  flagFileTitle,
  localFlagName,
  parseFlagImageInfo,
  pickFlagFile,
  resolveQidsByIso2,
  respostaTruncada,
  splitFlagRestrictions,
  type ChosenFlag,
} from '../../../../src/modules/etl/connectors/flags.connector.js';

// T579b — BANDEIRAS DO ACERVO (Wikidata P41 → Commons). Os testes cobrem o que é PURO
// (escolha do statement P41, política de licença com nota de uso, leitura do `imageinfo`) e
// o que é determinístico com `fetch` INJETADO (lote de claims, watchdog de truncamento).
// Nada aqui toca a rede — e é por isso que a suíte roda no CI.

/** Claim do P41 no formato do `wbgetentities`. */
function claim(
  file: string,
  extra: { rank?: string; inicio?: string; fim?: string; id?: string } = {},
) {
  return {
    id: extra.id,
    rank: extra.rank ?? 'normal',
    mainsnak: { datavalue: { value: file, type: 'string' } },
    qualifiers: {
      ...(extra.inicio
        ? { P580: [{ datavalue: { value: { time: `+${extra.inicio}T00:00:00Z` } } }] }
        : {}),
      ...(extra.fim
        ? { P582: [{ datavalue: { value: { time: `+${extra.fim}T00:00:00Z` } } }] }
        : {}),
    },
  };
}

function extmetadata(campos: Record<string, string>) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, { value: v }]));
}

describe('pickFlagFile — qual arquivo do Commons é a bandeira de HOJE', () => {
  it('prefere o statement de rank `preferred` (é ele que declara a bandeira atual)', () => {
    // Medido: o P41 do Brasil tem 7 statements — `Flag of Brazil.svg` é o preferred e os
    // outros seis são versões históricas.
    const escolha = pickFlagFile([
      claim('Flag of Brazil (1822–1853).svg', { inicio: '1822-09-07' }),
      claim('Flag of Brazil.svg', { rank: 'preferred', inicio: '1992-05-11', id: 'q155$X' }),
      claim('Flag of Brazil (1968–1992).svg', { inicio: '1968-02-28' }),
    ]) as ChosenFlag;
    expect(escolha.file).toBe('Flag of Brazil.svg');
    expect(escolha.rank).toBe('preferred');
    expect(escolha.claimId).toBe('q155$X');
  });

  it('entre os vigentes, escolhe o P580 mais RECENTE (a bandeira em vigor)', () => {
    const escolha = pickFlagFile([
      claim('antiga.svg', { inicio: '1900-01-01' }),
      claim('atual.svg', { inicio: '1990-01-01' }),
    ]) as ChosenFlag;
    expect(escolha.file).toBe('atual.svg');
  });

  it('DESCARTA o que tem P582 (fim): bandeira que acabou não é a de hoje', () => {
    const escolha = pickFlagFile([
      claim('acabou.svg', { rank: 'preferred', inicio: '1900-01-01', fim: '1975-01-01' }),
      claim('vigente.svg', { rank: 'normal', inicio: '1975-01-02' }),
    ]) as ChosenFlag;
    expect(escolha.file).toBe('vigente.svg');
  });

  it('sem rank preferido e sem datas, mantém a ordem da API (resposta estável, sem sorteio)', () => {
    const escolha = pickFlagFile([
      claim('primeira.svg', { id: 'q1$1' }),
      claim('segunda.svg', { id: 'q1$2' }),
    ]) as ChosenFlag;
    expect(escolha.file).toBe('primeira.svg');
  });

  it('devolve null quando não há P41 com valor de arquivo', () => {
    expect(pickFlagFile(undefined)).toBeNull();
    expect(pickFlagFile([])).toBeNull();
    expect(pickFlagFile([{ mainsnak: {} }])).toBeNull();
    // Snak de "algum valor" (datavalue ausente) não é nome de arquivo.
    expect(pickFlagFile([{ mainsnak: { datavalue: { value: { id: 'Q1' } } } }])).toBeNull();
    expect(pickFlagFile([claim('   ')])).toBeNull();
  });
});

describe('splitFlagRestrictions — nota de USO × restrição de copyright', () => {
  it('separa os tokens medidos no acervo', () => {
    // `Flag of Palestine.svg` = insignia|noresize; `Flag of Angola.svg` = communist|insignia.
    expect(splitFlagRestrictions('insignia|noresize')).toEqual({
      usage: ['insignia', 'noresize'],
      restante: null,
    });
    expect(splitFlagRestrictions('insignia|communist')).toEqual({
      usage: ['insignia', 'communist'],
      restante: null,
    });
  });

  it('token DESCONHECIDO continua sendo restrição (na dúvida, rejeita)', () => {
    const r = splitFlagRestrictions('trademarked-do-clube|personality rights');
    expect(r.usage).toEqual([]);
    expect(r.restante).toBe('trademarked-do-clube, personality rights');
  });

  it('mistura de nota de uso com restrição de verdade mantém a restrição', () => {
    expect(splitFlagRestrictions('insignia|personality rights')).toEqual({
      usage: ['insignia'],
      restante: 'personality rights',
    });
  });

  it('campo vazio ou ausente não inventa nota', () => {
    expect(splitFlagRestrictions(null)).toEqual({ usage: [], restante: null });
    expect(splitFlagRestrictions('')).toEqual({ usage: [], restante: null });
  });
});

describe('decideFlagLicense — a política do repositório, com as notas de uso separadas', () => {
  it('ACEITA domínio público com `insignia` (o caso da maioria das bandeiras)', () => {
    const d = decideFlagLicense(
      extmetadata({
        LicenseShortName: 'Public domain',
        UsageTerms: 'Public domain',
        Restrictions: 'insignia',
        Artist: 'Raimundo Teixeira Mendes',
      }),
    );
    expect(d.accepted).toBe(true);
    expect(d.license).toBe('Public domain');
    expect(d.author).toBe('Raimundo Teixeira Mendes');
    expect(d.usageRestrictions).toEqual(['insignia']);
    expect(d.reason).toBeNull();
  });

  it('ACEITA CC BY-SA (a política vale igual para bandeira e para foto)', () => {
    const d = decideFlagLicense(extmetadata({ LicenseShortName: 'CC BY-SA 4.0' }));
    expect(d.accepted).toBe(true);
    expect(d.usageRestrictions).toEqual([]);
  });

  it('REJEITA licença restrita mesmo quando o rank é high', () => {
    expect(decideFlagLicense(extmetadata({ LicenseShortName: 'Fair use' })).accepted).toBe(false);
    expect(decideFlagLicense(extmetadata({ UsageTerms: 'Non-free' })).accepted).toBe(false);
  });

  it('REJEITA restrição de verdade junto da nota de uso', () => {
    const d = decideFlagLicense(
      extmetadata({
        LicenseShortName: 'Public domain',
        Restrictions: 'insignia|personality rights',
      }),
    );
    expect(d.accepted).toBe(false);
    expect(d.reason).toMatch(/restricao/i);
    expect(d.usageRestrictions).toEqual(['insignia']);
  });

  it('REJEITA ausência de licença legível (ausência não é licença livre)', () => {
    const d = decideFlagLicense(extmetadata({ Artist: 'Fulano', Restrictions: 'insignia' }));
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('sem_licenca_legivel');
  });
});

describe('parseFlagImageInfo — leitura do `imageinfo`', () => {
  const payload = {
    query: {
      pages: [
        {
          title: 'File:Flag of Italy.svg',
          imageinfo: [
            {
              url: 'https://upload.wikimedia.org/wikipedia/commons/0/03/Flag_of_Italy.svg',
              thumburl:
                'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/03/Flag_of_Italy.svg/330px-Flag_of_Italy.svg.png',
              thumbwidth: 320,
              thumbheight: 213,
              descriptionurl: 'https://commons.wikimedia.org/wiki/File:Flag_of_Italy.svg',
              mime: 'image/svg+xml',
              size: 273,
              width: 1500,
              height: 1000,
              extmetadata: {
                LicenseShortName: { value: 'Public domain' },
                Restrictions: { value: 'insignia' },
                Artist: { value: '<a href="#">Commons</a>' },
                // Medido: o Commons mistura tipos no mesmo extmetadata — exigir string aqui
                // fazia o lote INTEIRO falhar em silêncio (nenhum arquivo encontrado).
                CommonsMetadataExtension: { value: 1.2 as unknown as string },
              },
            },
          ],
        },
        { title: 'File:Nao existe.svg', missing: true },
      ],
    },
  };

  it('lê licença, URL, miniatura renderizada e dimensões do arquivo', () => {
    const info = parseFlagImageInfo(payload).get('File:Flag of Italy.svg');
    expect(info?.mime).toBe('image/svg+xml');
    expect(info?.size).toBe(273);
    expect(info?.width).toBe(1500);
    expect(info?.thumbUrl).toContain('thumb.wikimedia.org');
    expect(info?.license.accepted).toBe(true);
    expect(info?.license.author).toBe('Commons');
    expect(info?.license.usageRestrictions).toEqual(['insignia']);
  });

  it('ignora página `missing` e payload inválido (sem explodir)', () => {
    expect(parseFlagImageInfo(payload).has('File:Nao existe.svg')).toBe(false);
    expect(parseFlagImageInfo({ nada: true }).size).toBe(0);
    expect(parseFlagImageInfo(null).size).toBe(0);
  });
});

describe('fetchFlagImageInfo — lote com `iiurlwidth`', () => {
  it('pede a miniatura renderizada e casa pelo título `File:...`', async () => {
    const urls: string[] = [];
    const fetchImpl = (async (input: string | URL) => {
      const url = new URL(input.toString());
      urls.push(url.search);
      return {
        ok: true,
        status: 200,
        json: async () => ({
          query: {
            pages: [
              {
                title: 'File:Flag_of_Italy.svg',
                imageinfo: [
                  {
                    url: 'https://upload.wikimedia.org/x.svg',
                    thumburl: 'https://thumb.wikimedia.org/x.png',
                    size: 10,
                    mime: 'image/svg+xml',
                    extmetadata: { LicenseShortName: { value: 'Public domain' } },
                  },
                ],
              },
            ],
          },
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const info = await fetchFlagImageInfo(['Flag of Italy.svg'], {
      fetchImpl,
      minIntervalMs: 0,
      thumbWidth: 320,
    });
    expect(info.get('File:Flag_of_Italy.svg')?.thumbUrl).toBe('https://thumb.wikimedia.org/x.png');
    const params = new URLSearchParams(urls[0]);
    expect(params.get('iiurlwidth')).toBe('320');
    expect(params.get('titles')).toBe('File:Flag of Italy.svg');
    expect(params.get('iiprop')).toContain('extmetadata');
  });
});

describe('fetchFlagClaims — P41 em lote, com watchdog de TRUNCAMENTO', () => {
  it('lê só o P41 de cada QID', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        entities: {
          Q38: { claims: { P41: [claim('Flag of Italy.svg', { rank: 'preferred' })] } },
          Q155: { claims: { P41: [claim('Flag of Brazil.svg', { rank: 'preferred' })] } },
          Q39: { claims: {} },
        },
      }),
    })) as unknown as typeof fetch;

    const claims = await fetchFlagClaims(['Q38', 'Q155', 'Q39'], { fetchImpl, minIntervalMs: 0 });
    expect(pickFlagFile(claims.get('Q38'))?.file).toBe('Flag of Italy.svg');
    expect(claims.get('Q39')).toEqual([]);
  });

  it('reduz o lote e RE-REQUISITA quando o Wikidata trunca a resposta', async () => {
    // Medido: com `props=labels|claims` e 50 QIDs, o Wikidata corta a resposta em 12 MB e
    // devolve os últimos itens ausentes COM `success:1` — nada grita, e o resultado seria
    // "seis países sem P41", que é falso. O watchdog transforma o silêncio em erro.
    let chamadas = 0;
    const tamanhos: number[] = [];
    const fetchImpl = (async (input: string | URL) => {
      chamadas += 1;
      const ids = new URL(input.toString()).searchParams.get('ids')?.split('|') ?? [];
      tamanhos.push(ids.length);
      if (ids.length > 2) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            warnings: {
              result: {
                '*': 'This result was truncated because it would otherwise be larger than the limit.',
              },
            },
            entities: {},
            success: 1,
          }),
        } as unknown as Response;
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          entities: Object.fromEntries(
            ids.map((id) => [id, { claims: { P41: [claim(`Flag ${id}.svg`)] } }]),
          ),
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;

    const claims = await fetchFlagClaims(['Q1', 'Q2', 'Q3', 'Q4'], {
      fetchImpl,
      minIntervalMs: 0,
      batchSize: 4,
    });
    expect(chamadas).toBeGreaterThan(1);
    expect(tamanhos[0]).toBe(4);
    expect(tamanhos[1]).toBe(2);
    expect([...claims.keys()]).toEqual(['Q1', 'Q2', 'Q3', 'Q4']);
  });

  it('resposta truncada com lote de 1 id FALHA em vez de devolver lista incompleta', async () => {
    const fetchImpl = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({
        warnings: { result: { '*': 'This result was truncated …' } },
        entities: {},
      }),
    })) as unknown as typeof fetch;

    await expect(fetchFlagClaims(['Q1'], { fetchImpl, minIntervalMs: 0 })).rejects.toThrow(
      /truncado/i,
    );
  });

  it('reconhece o aviso de truncamento (e ignora outro aviso)', () => {
    expect(respostaTruncada({ result: { '*': 'This result was truncated …' } })).toBe(true);
    expect(respostaTruncada({ result: { '*': 'Unrecognized parameter: foo' } })).toBe(false);
    expect(respostaTruncada(undefined)).toBe(false);
  });
});

describe('nomes de arquivo', () => {
  it('ISO2 minúsculo no nosso domínio e `File:` canônico no Commons', () => {
    expect(localFlagName('BR', 'svg')).toBe('br.svg');
    expect(localFlagName(' br ', 'png')).toBe('br.png');
    expect(flagFileTitle('Flag of Italy.svg')).toBe('File:Flag of Italy.svg');
    expect(flagFileTitle('File:Flag of Italy.svg')).toBe('File:Flag of Italy.svg');
  });

  it('extensão pelo mime: SVG continua vetor, raster entra como PNG (é o thumb que baixamos)', () => {
    expect(flagExtension('image/svg+xml')).toBe('svg');
    expect(flagExtension('image/png')).toBe('png');
    expect(flagExtension(null)).toBe('png');
  });
});

describe('resolveQidsByIso2 — ISO2 → item pelo P297 (código usado no acervo sem linha na tabela)', () => {
  /** Resposta do SPARQL de `wdt:P297`: bindings com `iso2`/`country`/`countryLabel`. */
  function sparqlStub(linhas: Array<{ iso2: string; qid: string; label?: string }>) {
    const query: string[] = [];
    const fetchImpl = (async (input: string | URL) => {
      query.push(decodeURIComponent(new URL(input.toString()).searchParams.get('query') ?? ''));
      return {
        ok: true,
        status: 200,
        json: async () => ({
          results: {
            bindings: linhas.map((l) => ({
              iso2: { value: l.iso2 },
              country: { value: `http://www.wikidata.org/entity/${l.qid}` },
              ...(l.label ? { countryLabel: { value: l.label } } : {}),
            })),
          },
        }),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    return { fetchImpl, query };
  }

  it('devolve QID e rótulo por código, consultando pelo P297', async () => {
    const { fetchImpl, query } = sparqlStub([
      { iso2: 'NL', qid: 'Q55', label: 'Países Baixos' },
      { iso2: 'SS', qid: 'Q958', label: 'Sudão do Sul' },
    ]);
    const r = await resolveQidsByIso2(['nl', 'SS'], { fetchImpl, sleep: async () => {} });
    expect(r.get('NL')).toEqual({ qid: 'Q55', name: 'Países Baixos' });
    expect(r.get('SS')).toEqual({ qid: 'Q958', name: 'Sudão do Sul' });
    expect(query[0]).toContain('wdt:P297');
    expect(query[0]).toContain('"NL" "SS"');
  });

  it('ignora entrada que não é par de letras e mantém o primeiro item em caso de empate', async () => {
    const { fetchImpl } = sparqlStub([
      { iso2: 'AA', qid: 'Q2' },
      { iso2: 'AA', qid: 'Q1' },
    ]);
    const r = await resolveQidsByIso2(['AA', 'BR1', ''], { fetchImpl, sleep: async () => {} });
    expect([...r.keys()]).toEqual(['AA']);
    expect(r.get('AA')?.qid).toBe('Q2');
  });

  it('sem código válido nem chama o SPARQL', async () => {
    const { fetchImpl, query } = sparqlStub([]);
    const r = await resolveQidsByIso2(['BR1'], { fetchImpl, sleep: async () => {} });
    expect(r.size).toBe(0);
    expect(query).toHaveLength(0);
  });
});
