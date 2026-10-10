import { describe, it, expect } from 'vitest';
import { TROPHY_MAP, fetchCommonsFileInfo } from '../../../src/scripts/enrich-trophies.js';

// T511 — invariantes da CURADORIA de troféus. A lição do T509 (revertido) foi
// que busca textual aberta gera falso positivo de outro esporte; por isso o
// mapa é curado e aqui se garante que ele não regride.

describe('TROPHY_MAP (curadoria)', () => {
  it('toda entrada aponta para uma categoria de TROFÉU do Commons', () => {
    for (const e of TROPHY_MAP) {
      expect(e.category, `${e.name} (${e.qid})`).toMatch(/troph/i);
    }
  });

  it('todo arquivo é imagem (extensão) e nome não vazio', () => {
    for (const e of TROPHY_MAP) {
      expect(e.file, `${e.name}`).toMatch(/\.(jpe?g|png|webp)$/i);
      expect(e.file.length).toBeGreaterThan(5);
    }
  });

  it('QIDs são únicos e válidos (Q+digits)', () => {
    const qids = TROPHY_MAP.map((e) => e.qid);
    expect(new Set(qids).size).toBe(qids.length);
    for (const q of qids) expect(q).toMatch(/^Q\d+$/);
  });

  it('não contém falsos positivos conhecidos do T509 (outros esportes)', () => {
    const files = TROPHY_MAP.map((e) => e.file).join(' | ');
    expect(files).not.toMatch(/grey cup|rugby|ranji|cricket/i);
  });

  it('cobre ao menos 10 competições (meta do operador)', () => {
    expect(TROPHY_MAP.length).toBeGreaterThanOrEqual(10);
  });
});

describe('fetchCommonsFileInfo', () => {
  const okFetch = async () =>
    ({
      ok: true,
      json: async () => ({
        query: {
          pages: [
            {
              imageinfo: [
                {
                  mime: 'image/jpeg',
                  width: 100,
                  height: 200,
                  extmetadata: { ImageDescription: { value: 'Troféu <b>X</b>' } },
                },
              ],
            },
          ],
        },
      }),
    }) as unknown as Response;

  const missingFetch = async () =>
    ({
      ok: true,
      json: async () => ({ query: { pages: [{ missing: true }] } }),
    }) as unknown as Response;

  it('arquivo existente → exists=true + mime/descrição limpos', async () => {
    const info = await fetchCommonsFileInfo('Foo.jpg', { fetchImpl: okFetch as typeof fetch });
    expect(info.exists).toBe(true);
    expect(info.mime).toBe('image/jpeg');
    expect(info.description).toBe('Troféu X');
  });

  it('arquivo ausente → exists=false', async () => {
    const info = await fetchCommonsFileInfo('Foo.jpg', { fetchImpl: missingFetch as typeof fetch });
    expect(info.exists).toBe(false);
  });

  it('falha de rede → exists=false (nunca grava em erro)', async () => {
    const boom = async () => {
      throw new Error('network');
    };
    const info = await fetchCommonsFileInfo('Foo.jpg', {
      fetchImpl: boom as unknown as typeof fetch,
    });
    expect(info.exists).toBe(false);
  });
});
