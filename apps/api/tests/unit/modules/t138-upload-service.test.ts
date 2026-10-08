/**
 * T138 — cobertura do módulo upload (service 4% → alvo ≥80%).
 * Validação de arquivo (tamanho, MIME allowlist, magic bytes, extensão) e o
 * caminho feliz com o cliente S3 MOCKADO — sem rede/MinIO.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const sendMock = vi.fn();

vi.mock('../../../src/config/s3.js', () => ({
  s3Client: { send: (...args: unknown[]) => sendMock(...args) },
}));

import { uploadFile } from '../../../src/modules/upload/service.js';
import { env } from '../../../src/config/env.js';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);

beforeEach(() => {
  sendMock.mockReset();
  sendMock.mockResolvedValue({});
});

describe('uploadFile (T138)', () => {
  it('caminho feliz: PNG válido → key com folder/ext, url pública e sizeBytes', async () => {
    const res = await uploadFile(PNG, 'image/png', 'escudo.png', { folder: 'clubs' });
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(res.key.startsWith('clubs/')).toBe(true);
    expect(res.key.endsWith('.png')).toBe(true);
    expect(res.mimeType).toBe('image/png');
    expect(res.sizeBytes).toBe(PNG.length);
    // url = endpoint/bucket/key (ou domínio público quando S3_PUBLIC_URL definido)
    expect(res.url).toContain(res.key);
  });

  it('override de allowlist: CSV passa mesmo sem text/csv no env (#423)', async () => {
    const res = await uploadFile(Buffer.from('a,b,c'), 'text/csv', 'dados.csv', {
      folder: 'imports',
      allowedMimes: ['text/csv'],
    });
    expect(res.key.startsWith('imports/')).toBe(true);
    expect(res.mimeType).toBe('text/csv');
  });

  it('rejeita arquivo acima do limite (uploadMaxBytes)', async () => {
    const big = Buffer.alloc(env.uploadMaxBytes + 1);
    await expect(uploadFile(big, 'image/png', 'grande.png')).rejects.toThrow(/excede o limite/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejeita MIME fora da allowlist', async () => {
    await expect(uploadFile(PNG, 'application/zip', 'escudo.zip')).rejects.toThrow(
      /não permitido/i,
    );
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejeita magic bytes que não batem com o MIME declarado', async () => {
    await expect(uploadFile(JPEG, 'image/png', 'mascaramente.png')).rejects.toThrow(/magic bytes/i);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it('rejeita extensão ausente/longa demais', async () => {
    await expect(uploadFile(PNG, 'image/png', 'sem-extensao')).rejects.toThrow(/extensão/i);
    await expect(uploadFile(PNG, 'image/png', 'a.extensao ridiculousmente-longa')).rejects.toThrow(
      /extensão/i,
    );
  });

  it('CSV não tem magic bytes confiáveis — passa direto pela checagem de assinatura', async () => {
    if (!env.uploadAllowedMimes.includes('text/csv')) return; // allowlist sem CSV neste env
    const res = await uploadFile(Buffer.from('a,b,c'), 'text/csv', 'dados.csv', {
      folder: 'exports',
    });
    expect(res.key.endsWith('.csv')).toBe(true);
  });
});
