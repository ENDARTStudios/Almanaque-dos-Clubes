/**
 * T547 — o invariante que permite QUATRO jobs de mídia conviverem: gravar a tentativa de
 * uma mídia MESCLA no registro, nunca substitui o objeto. Se um job apagasse as chaves do
 * outro, cada um voltaria ao início da fila (o defeito do T536).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '../../src/config/prisma.js';
import {
  selectPendingClubs,
  stampMediaAttempt,
  stampMediaAttempts,
} from '../../src/modules/etl/media-cursor.js';

let dbOk = true;
const suf = Date.now();
let aId = '';
let bId = '';

beforeAll(async () => {
  try {
    await prisma.club.count();
  } catch {
    dbOk = false;
    return;
  }
  const a = await prisma.club.create({
    data: { name: `T547 A ${suf}`, qid: `Q99${suf}`, importedFrom: 't547-test' },
  });
  const b = await prisma.club.create({
    data: { name: `T547 B ${suf}`, qid: `Q98${suf}`, importedFrom: 't547-test' },
  });
  aId = a.id;
  bId = b.id;
});

afterAll(async () => {
  if (dbOk) await prisma.club.deleteMany({ where: { importedFrom: 't547-test' } });
});

describe('T547 — cursor de mídia', () => {
  it('gravar uma mídia NÃO apaga a chave das outras (mescla, não substituição)', async () => {
    if (!dbOk) return;
    await stampMediaAttempt(prisma, aId, 'logo', 'no_source');
    await stampMediaAttempt(prisma, aId, 'editorial', 'enriched');
    await stampMediaAttempts(prisma, aId, { kits: 'enriched', anthem: 'no_source' });

    const row = await prisma.club.findUnique({
      where: { id: aId },
      select: { mediaEnrichment: true },
    });
    const reg = (row?.mediaEnrichment ?? {}) as Record<string, { status?: string }>;
    expect(Object.keys(reg).sort()).toEqual(['anthem', 'editorial', 'kits', 'logo']);
    expect(reg.logo?.status).toBe('no_source');
    expect(reg.editorial?.status).toBe('enriched');
  });

  it('quem já foi tentado SAI da fila; quem não foi entra (é o que faz o lote avançar)', async () => {
    if (!dbOk) return;
    const pendentes = await selectPendingClubs(prisma, { limit: 5000, media: ['logo'] });
    const ids = pendentes.map((p) => p.id);
    expect(ids).not.toContain(aId); // já tentado (mesmo sem dado na fonte)
    expect(ids).toContain(bId); // ainda não tentado
  });

  it('mídias diferentes têm filas independentes', async () => {
    if (!dbOk) return;
    await prisma.club.update({
      where: { id: bId },
      data: { mediaEnrichment: { logo: { at: new Date().toISOString(), status: 'no_source' } } },
    });
    const soEditorial = await selectPendingClubs(prisma, { limit: 5000, media: ['editorial'] });
    expect(soEditorial.map((p) => p.id)).toContain(bId); // 'editorial' ainda pendente
    const soLogo = await selectPendingClubs(prisma, { limit: 5000, media: ['logo'] });
    expect(soLogo.map((p) => p.id)).not.toContain(bId); // 'logo' já tentado
  });
});
