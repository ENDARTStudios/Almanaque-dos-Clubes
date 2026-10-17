import { describe, it, expect } from 'vitest';
import {
  conteudoValido,
  harvestFlags,
  renderManifest,
  type FlagRecord,
} from '../../../src/scripts/harvest-flags.js';
import {
  decideFlagLicense,
  type FlagImageInfo,
} from '../../../src/modules/etl/connectors/flags.connector.js';

// T579b — PIPELINE das bandeiras, sem rede e sem disco: `harvestFlags` recebe os `fetch*`
// falsos, roda em DRY-RUN (não baixa, não grava) e o que se testa é a DECISÃO — aceitar ou
// rejeitar por licença, detectar P41 ausente, plano de miniatura e manifesto do componente.
// A licença é decidida pela função REAL (`decideFlagLicense`), então a política testada aqui é
// a que roda em produção — o fake só entrega o `extmetadata`.

function info(
  file: string,
  opts: {
    mime?: string;
    size?: number;
    width?: number;
    height?: number;
    license?: string;
    restrictions?: string;
    author?: string;
  } = {},
): FlagImageInfo {
  const em: Record<string, { value?: string }> = {
    LicenseShortName: { value: opts.license ?? 'Public domain' },
  };
  if (opts.restrictions) em.Restrictions = { value: opts.restrictions };
  em.Artist = { value: opts.author ?? 'Fulano' };
  return {
    title: `File:${file}`,
    url: `https://upload.wikimedia.org/${file}`,
    thumbUrl: `https://thumb.wikimedia.org/${file}.png`,
    thumbWidth: 320,
    thumbHeight: 213,
    pageUrl: `https://commons.wikimedia.org/wiki/File:${file}`,
    mime: opts.mime ?? 'image/svg+xml',
    size: opts.size ?? 1_000,
    width: opts.width ?? 1000,
    height: opts.height ?? 666,
    license: decideFlagLicense(em),
  };
}

/** Roda o pipeline com a rede falsa; devolve só o relatório. */
async function rodar(
  paises: Array<{
    iso2: string;
    qid: string | null;
    name: string | null;
    source: 'countries' | 'acervo_codes';
  }>,
  files: Map<string, FlagImageInfo>,
  opts: { semP41?: string[]; resolvidos?: Record<string, string>; limiteArquivo?: number } = {},
) {
  const { report } = await harvestFlags({
    apply: false,
    paises,
    thumbWidth: 320,
    limiteTotal: 2_500_000,
    limiteArquivo: opts.limiteArquivo ?? 60_000,
    fetchClaims: async (qids) =>
      new Map(
        qids
          .filter((q) => !(opts.semP41 ?? []).includes(q))
          .map((q) => [q, [{ mainsnak: { datavalue: { value: `Flag ${q}.svg` } } }]]),
      ),
    fetchImageInfo: async () => files,
    resolveQids: async (codes) =>
      new Map(
        Object.entries(opts.resolvidos ?? {})
          .filter(([iso2]) => codes.includes(iso2))
          .map(([iso2, qid]) => [iso2, { qid, name: null }]),
      ),
  });
  return report;
}

describe('harvestFlags — decisão por país', () => {
  it('obtém a bandeira do P41 com a licença e a nota de uso registradas', async () => {
    const report = await rodar(
      [{ iso2: 'IT', qid: 'Q38', name: 'Italy', source: 'countries' }],
      new Map([
        ['File:Flag Q38.svg', info('Flag Q38.svg', { restrictions: 'insignia', author: 'Fulano' })],
      ]),
    );
    expect(report.obtidas).toHaveLength(1);
    const f = report.obtidas[0]!;
    expect(f.iso2).toBe('IT');
    expect(f.qidFrom).toBe('countries');
    expect(f.src).toBe('/flags/it.svg');
    expect(f.license).toBe('Public domain');
    expect(f.usageRestrictions).toEqual(['insignia']);
    expect(f.thumbnail).toBe(false);
  });

  it('registra o motivo quando a LICENÇA não passa (e o país cai para a sigla)', async () => {
    const report = await rodar(
      [{ iso2: 'IT', qid: 'Q38', name: 'Italy', source: 'countries' }],
      new Map([['File:Flag Q38.svg', info('Flag Q38.svg', { license: 'Fair use' })]]),
    );
    expect(report.obtidas).toHaveLength(0);
    expect(report.rejeitadas).toEqual([
      expect.objectContaining({
        iso2: 'IT',
        reason: 'licenca_restrita: Fair use',
        license: 'Fair use',
        commonsFile: 'Flag Q38.svg',
      }),
    ]);
  });

  it('conta SEM P41 e não inventa arquivo', async () => {
    const report = await rodar(
      [{ iso2: 'ZZ', qid: 'Q999', name: null, source: 'countries' }],
      new Map(),
      { semP41: ['Q999'] },
    );
    expect(report.obtidas).toHaveLength(0);
    expect(report.semP41).toEqual([{ iso2: 'ZZ', name: null, qid: 'Q999' }]);
    expect(report.rejeitadas).toHaveLength(0);
  });

  it('código sem linha em `countries` entra com QID do P297 e origem declarada', async () => {
    const report = await rodar(
      [{ iso2: 'NL', qid: null, name: null, source: 'acervo_codes' }],
      new Map([['File:Flag Q55.svg', info('Flag Q55.svg')]]),
      { resolvidos: { NL: 'Q55' } },
    );
    expect(report.semLinhaEmCountries).toEqual(['NL']);
    expect(report.obtidas[0]!.qid).toBe('Q55');
    expect(report.obtidas[0]!.qidFrom).toBe('p297');
  });

  it('código que nem a tabela nem o P297 resolvem fica declarado em `semQid`', async () => {
    const report = await rodar(
      [{ iso2: 'XX', qid: null, name: null, source: 'acervo_codes' }],
      new Map(),
    );
    expect(report.semQid).toEqual(['XX']);
    expect(report.obtidas).toHaveLength(0);
  });

  it('arquivo grande vira MINIATURA renderizada pelo Commons (e o motivo é registrado)', async () => {
    const report = await rodar(
      [{ iso2: 'MX', qid: 'Q96', name: 'Mexico', source: 'countries' }],
      new Map([
        ['File:Flag Q96.svg', info('Flag Q96.svg', { size: 117_180, width: 1400, height: 800 })],
      ]),
    );
    const f = report.obtidas[0]!;
    expect(f.thumbnail).toBe(true);
    expect(f.src).toBe('/flags/mx.png');
    expect(f.thumbnailReason).toMatch(/^tamanho:117180B>60000B$/);
  });

  it('`noresize` do Commons preserva o ORIGINAL mesmo acima do teto por arquivo', async () => {
    const report = await rodar(
      [{ iso2: 'PS', qid: 'Q219060', name: 'Palestine', source: 'countries' }],
      new Map([
        [
          'File:Flag Q219060.svg',
          info('Flag Q219060.svg', { size: 90_000, restrictions: 'insignia|noresize' }),
        ],
      ]),
    );
    const f = report.obtidas[0]!;
    expect(f.thumbnail).toBe(false);
    expect(f.src).toBe('/flags/ps.svg');
    expect(f.usageRestrictions).toEqual(['insignia', 'noresize']);
  });
});

describe('renderManifest — o que o componente lê', () => {
  it('emite só `src` + `ratio`, ordenado por ISO2, com aviso de arquivo gerado', () => {
    const registros: FlagRecord[] = [
      {
        iso2: 'IT',
        name: 'Italy',
        qid: 'Q38',
        qidFrom: 'countries',
        commonsFile: 'Flag of Italy.svg',
        claimId: null,
        rank: 'preferred',
        pageUrl: null,
        license: 'Public domain',
        author: null,
        credit: null,
        usageTerms: null,
        usageRestrictions: [],
        src: '/flags/it.svg',
        thumbnail: false,
        bytes: 273,
        width: 1500,
        height: 1000,
        thumbnailReason: null,
      },
      {
        iso2: 'BR',
        name: 'Brazil',
        qid: 'Q155',
        qidFrom: 'countries',
        commonsFile: 'Flag of Brazil.svg',
        claimId: null,
        rank: 'preferred',
        pageUrl: null,
        license: 'Public domain',
        author: null,
        credit: null,
        usageTerms: null,
        usageRestrictions: ['insignia'],
        src: '/flags/br.svg',
        thumbnail: false,
        bytes: 4243,
        width: 1000,
        height: 700,
        thumbnailReason: null,
      },
    ];
    const saida = renderManifest(registros);
    expect(saida).toContain('NÃO EDITE À MÃO');
    expect(saida.indexOf("BR: { src: '/flags/br.svg', ratio: 1.4286 }")).toBeLessThan(
      saida.indexOf("IT: { src: '/flags/it.svg', ratio: 1.5 }"),
    );
  });

  it('sem dimensão informada pelo Commons assume 3:2 (default declarado)', () => {
    const saida = renderManifest([
      {
        iso2: 'AA',
        name: null,
        qid: 'Q1',
        qidFrom: 'p297',
        commonsFile: 'x.svg',
        claimId: null,
        rank: 'normal',
        pageUrl: null,
        license: 'Public domain',
        author: null,
        credit: null,
        usageTerms: null,
        usageRestrictions: [],
        src: '/flags/aa.svg',
        thumbnail: false,
        bytes: 1,
        width: 0,
        height: 0,
        thumbnailReason: null,
      },
    ]);
    expect(saida).toContain("AA: { src: '/flags/aa.svg', ratio: 1.5 }");
  });
});

describe('conteudoValido — o que foi baixado é mesmo o tipo prometido', () => {
  it('aceita SVG de verdade e recusa HTML de erro com nome de .svg', () => {
    expect(conteudoValido(Buffer.from('<?xml version="1.0"?><svg xmlns="..."/>'), 'svg')).toBe(
      true,
    );
    expect(conteudoValido(Buffer.from('<svg viewBox="0 0 1 1"></svg>'), 'svg')).toBe(true);
    expect(conteudoValido(Buffer.from('<!DOCTYPE html><html>404</html>'), 'svg')).toBe(false);
    expect(conteudoValido(Buffer.from(''), 'svg')).toBe(false);
  });

  it('exige a assinatura PNG (8 bytes) para .png', () => {
    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.from('IHDR'),
    ]);
    expect(conteudoValido(png, 'png')).toBe(true);
    expect(conteudoValido(Buffer.from('<svg/>'), 'png')).toBe(false);
  });
});
