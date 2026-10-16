import { describe, it, expect, beforeEach } from 'vitest';
import {
  categoryCandidates,
  cleanMetadataValue,
  collectCategoryFiles,
  commonsApi,
  evaluateLicense,
  listCategoryMembers,
  pickBestFile,
  rankFiles,
  resetCommonsCadence,
} from '../../../../src/modules/etl/connectors/commons-categories.connector.js';

// T578 — o COLETOR DE IMAGENS do Commons. Os testes cobrem o que é PURO (política de
// licença, ranking de arquivo, categorias candidatas) e o que é determinístico com
// `fetch` injetado (varredura de categorias, paginação, backoff). Nada toca a rede.

/** Stub de `fetch` do Commons: roteia pela dupla (cmtitle, cmtype) ou por `titles`. */
function stubFetch(
  responder: (params: URLSearchParams) => unknown,
  opts: { statuses?: number[] } = {},
) {
  let i = 0;
  const statuses = opts.statuses ?? [];
  const fn = async (input: string | URL) => {
    const params = new URL(input.toString()).searchParams;
    const status = statuses[i] ?? 200;
    i += 1;
    return {
      ok: status >= 200 && status < 300,
      status,
      json: async () => responder(params),
    } as unknown as Response;
  };
  return fn as unknown as typeof fetch;
}

const semEspera = async () => {};

beforeEach(() => resetCommonsCadence());

describe('evaluateLicense — política de licença livre', () => {
  const em = (o: Record<string, string>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, { value: v }]));

  it('aceita CC0', () => {
    const d = evaluateLicense(em({ LicenseShortName: 'CC0' }));
    expect(d.accepted).toBe(true);
    expect(d.license).toBe('CC0');
  });

  it('aceita CC BY-SA 4.0 (com HTML no valor)', () => {
    const d = evaluateLicense(em({ LicenseShortName: '<a href="#">CC BY-SA 4.0</a>' }));
    expect(d.accepted).toBe(true);
    expect(d.license).toBe('CC BY-SA 4.0');
  });

  it('aceita CC BY 2.0 e variações com hífen', () => {
    expect(evaluateLicense(em({ LicenseShortName: 'CC BY 2.0' })).accepted).toBe(true);
    expect(evaluateLicense(em({ LicenseShortName: 'cc-by-sa-3.0' })).accepted).toBe(true);
  });

  it('aceita domínio público (PD-*) e "Public domain"', () => {
    expect(evaluateLicense(em({ LicenseShortName: 'PD-Brazil' })).accepted).toBe(true);
    expect(evaluateLicense(em({ LicenseShortName: 'Public domain' })).accepted).toBe(true);
    expect(evaluateLicense(em({ LicenseShortName: 'Domínio público' })).accepted).toBe(true);
  });

  it('extrai o autor do Artist (limpa HTML)', () => {
    const d = evaluateLicense(
      em({ LicenseShortName: 'CC BY-SA 4.0', Artist: '<a href="/w/x">Maria <b>Silva</b></a>' }),
    );
    expect(d.accepted).toBe(true);
    expect(d.author).toBe('Maria Silva');
  });

  it('usa Credit como autor quando não há Artist', () => {
    const d = evaluateLicense(em({ LicenseShortName: 'CC0', Credit: 'Fotógrafo' }));
    expect(d.author).toBe('Fotógrafo');
  });

  it('REJEITA Fair use', () => {
    const d = evaluateLicense(em({ LicenseShortName: 'Fair use' }));
    expect(d.accepted).toBe(false);
    expect(d.reason).toMatch(/licenca_restrita/i);
  });

  it('REJEITA Non-free', () => {
    expect(evaluateLicense(em({ UsageTerms: 'Non-free' })).accepted).toBe(false);
  });

  it('REJEITA Restrictions não vazio (mesmo com CC)', () => {
    const d = evaluateLicense(
      em({ LicenseShortName: 'CC BY-SA 4.0', Restrictions: 'trademarked' }),
    );
    expect(d.accepted).toBe(false);
    expect(d.reason).toMatch(/restricao/i);
    expect(d.restrictions).toBe('trademarked');
  });

  it('REJEITA ausência de licença legível', () => {
    const d = evaluateLicense(em({ Artist: 'Fulano' }));
    expect(d.accepted).toBe(false);
    expect(d.reason).toBe('sem_licenca_legivel');
  });

  it('REJEITA licença não reconhecida', () => {
    const d = evaluateLicense(em({ LicenseShortName: 'Todos os direitos reservados' }));
    expect(d.accepted).toBe(false);
    expect(d.reason).toMatch(/licenca_nao_reconhecida/i);
  });
});

describe('cleanMetadataValue', () => {
  it('remove tags e colapsa espaços', () => {
    expect(cleanMetadataValue('<span>a</span>   <b>b</b>')).toBe('a b');
  });
  it('devolve null para vazio', () => {
    expect(cleanMetadataValue('')).toBeNull();
    expect(cleanMetadataValue(undefined)).toBeNull();
  });
});

describe('categoryCandidates', () => {
  it('clube/jogador → categoria homônima', () => {
    expect(categoryCandidates('club', 'Flamengo')).toEqual(['Flamengo']);
    expect(categoryCandidates('player', 'Pelé')).toEqual(['Pelé']);
  });
  it('troféu → tenta "X trophy", "Trophy of X" e o nome cru', () => {
    expect(categoryCandidates('trophy', 'Copa América')).toEqual([
      'Copa América trophy',
      'Trophy of Copa América',
      'Copa América',
    ]);
  });
  it('nome vazio → sem candidatos', () => {
    expect(categoryCandidates('club', '   ')).toEqual([]);
  });
});

describe('rankFiles / pickBestFile', () => {
  it('clube: prefere o arquivo com pista de escudo E que casa com o nome do clube', () => {
    const files = [
      'File:Estádio do Flamengo.jpg',
      'File:Flamengo logo.svg',
      'File:Escudo rival.png',
    ];
    expect(pickBestFile('club', files, 'Flamengo')).toBe('File:Flamengo logo.svg');
    expect(rankFiles('club', files, 'Flamengo')[0]).toBe('File:Flamengo logo.svg');
  });

  it('clube: SEM pista de escudo nem SVG casando com o nome → vazio (nunca imagem avulsa)', () => {
    const files = [
      'File:Alma e Corpo - 1938 - Cart.jpg',
      'File:Desempenho.PNG',
      'File:Torcida.jpg',
    ];
    expect(rankFiles('club', files, 'Clube de Regatas do Flamengo')).toEqual([]);
    expect(pickBestFile('club', files, 'Clube de Regatas do Flamengo')).toBeNull();
  });

  it('clube: SVG nomeado só com o nome do clube conta como escudo', () => {
    const alvo = 'Clube de Regatas do Flamengo';
    expect(pickBestFile('club', ['File:Clube de Regatas do Flamengo.svg'], alvo)).toBe(
      'File:Clube de Regatas do Flamengo.svg',
    );
  });

  it('clube: pista de escudo SEM casar com o nome fica atrás do que casa', () => {
    const files = ['File:Escudo de outro clube.png', 'File:Flamengo crest.png'];
    expect(pickBestFile('club', files, 'Flamengo')).toBe('File:Flamengo crest.png');
  });

  it('jogador: exige casar com o nome e descarta assinatura/estátua/arte de rua', () => {
    const files = [
      'File:Pelé autograph.png',
      'File:Pelé graffiti.jpg',
      'File:Pelé statue.jpg',
      'File:Pelé 1962.jpg',
    ];
    expect(pickBestFile('player', files, 'Pelé')).toBe('File:Pelé 1962.jpg');
  });

  it('jogador: nome de arquivo que não casa com o alvo → vazio', () => {
    const files = ['File:Match photo 2006.jpg', 'File:Team group.jpg'];
    expect(rankFiles('player', files, 'Zico')).toEqual([]);
  });

  it('troféu: exige pista de troféu/medalha e prefere casar com o nome', () => {
    const files = ['File:Team badge.svg', 'File:Copa do Brasil trophy.jpg', 'File:Copa trophy.jpg'];
    expect(pickBestFile('trophy', files, 'Copa do Brasil')).toBe('File:Copa do Brasil trophy.jpg');
  });

  it('troféu: descarta gráfico de campanhas ("X Cup appearances.png", "winners.svg")', () => {
    const files = [
      'File:AFC Challenge Cup appearances.png',
      'File:Africa Cup of Nations winners.svg',
    ];
    expect(rankFiles('trophy', files, 'AFC Challenge Cup')).toEqual([]);
    expect(
      pickBestFile('trophy', [...files, 'File:AFC Challenge Cup trophy.jpg'], 'AFC Challenge Cup'),
    ).toBe('File:AFC Challenge Cup trophy.jpg');
  });

  it('clube: descarta gráfico de desempenho ("X League Performance.svg")', () => {
    const files = ['File:Accrington Stanley FC League Performance.svg'];
    expect(rankFiles('club', files, 'Accrington Stanley F.C.')).toEqual([]);
    expect(
      pickBestFile(
        'club',
        [...files, 'File:Accrington Stanley FC crest.png'],
        'Accrington Stanley F.C.',
      ),
    ).toBe('File:Accrington Stanley FC crest.png');
  });

  it('lista vazia → null', () => {
    expect(pickBestFile('club', [], 'X')).toBeNull();
  });
});

describe('listCategoryMembers', () => {
  it('normaliza o título para Category: e separa files/subcats', async () => {
    const fetchImpl = stubFetch((p) => {
      if (p.get('cmtype') === 'file') {
        return { query: { categorymembers: [{ title: 'File:A.jpg' }] } };
      }
      return { query: { categorymembers: [{ title: 'Category:Sub' }] } };
    });
    const files = await listCategoryMembers('Flamengo', 'file', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
    });
    expect(files.files).toEqual(['File:A.jpg']);
    const subs = await listCategoryMembers('Category:Flamengo', 'subcat', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
    });
    expect(subs.subcategories).toEqual(['Category:Sub']);
  });

  it('propaga o token cmcontinue', async () => {
    const fetchImpl = stubFetch(() => ({
      query: { categorymembers: [{ title: 'File:A.jpg' }] },
      continue: { cmcontinue: 'abc123' },
    }));
    const r = await listCategoryMembers('X', 'file', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
    });
    expect(r.next).toBe('abc123');
  });
});

describe('collectCategoryFiles', () => {
  const fetchImpl = stubFetch((p) => {
    const titulo = p.get('cmtitle');
    const tipo = p.get('cmtype');
    const mapa: Record<string, { file?: string[]; sub?: string[] }> = {
      'Category:Flamengo': { file: ['File:CRF logo.svg'], sub: ['Category:Flamengo players'] },
      'Category:Flamengo players': { file: ['File:Pele.jpg'], sub: [] },
    };
    const e = mapa[titulo ?? ''] ?? {};
    return {
      query: {
        categorymembers: (tipo === 'file' ? (e.file ?? []) : (e.sub ?? [])).map((t) => ({
          title: t,
        })),
      },
    };
  });

  it('depth=1 inclui arquivos da categoria e das subcategorias', async () => {
    const r = await collectCategoryFiles('Category:Flamengo', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
      depth: 1,
    });
    expect(r.files.sort()).toEqual(['File:CRF logo.svg', 'File:Pele.jpg']);
    expect(r.categoriesVisited).toBe(2);
  });

  it('depth=0 fica só na categoria dada', async () => {
    const r = await collectCategoryFiles('Category:Flamengo', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
      depth: 0,
    });
    expect(r.files).toEqual(['File:CRF logo.svg']);
  });

  it('respeita maxFiles (truncated)', async () => {
    const r = await collectCategoryFiles('Category:Flamengo', {
      fetchImpl,
      sleep: semEspera,
      minIntervalMs: 0,
      depth: 1,
      maxFiles: 1,
    });
    expect(r.files.length).toBe(1);
    expect(r.truncated).toBe(true);
  });
});

describe('commonsApi — cadência e backoff', () => {
  it('retorna o JSON em caso de sucesso', async () => {
    const fetchImpl = stubFetch(() => ({ ok: true }));
    const out = await commonsApi(
      { action: 'query' },
      { fetchImpl, sleep: semEspera, minIntervalMs: 0 },
    );
    expect(out).toEqual({ ok: true });
  });

  it('429 seguido de 200 → devolve o resultado', async () => {
    const fetchImpl = stubFetch(() => ({ ok: true }), { statuses: [429, 200] });
    const out = await commonsApi(
      { action: 'query' },
      { fetchImpl, sleep: semEspera, minIntervalMs: 0 },
    );
    expect(out).toEqual({ ok: true });
  });

  it('429 em todas as tentativas → LANÇA (não pode carimbar sem fonte)', async () => {
    const fetchImpl = stubFetch(() => ({ ok: false }), { statuses: [429, 429, 429, 429] });
    await expect(
      commonsApi(
        { action: 'query' },
        { fetchImpl, sleep: semEspera, minIntervalMs: 0, maxAttempts: 4 },
      ),
    ).rejects.toThrow(/falhou apos 4 tentativas/);
  });
});
