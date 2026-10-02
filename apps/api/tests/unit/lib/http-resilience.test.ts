import { describe, it, expect, vi, afterEach } from 'vitest';
import { fetchWithRetry } from '../../../scripts/lib/http-resilience.js';

// T428 — helper compartilhado de resiliência HTTP (CI nunca faz rede externa:
// o fetcher é injetado; nenhum mock toca a rede real).

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchWithRetry (helper http-resilience)', () => {
  it('retorna a resposta na 1ª tentativa quando ok', async () => {
    const fetcher = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    const res = await fetchWithRetry(
      'https://example.org/x',
      { headers: {} },
      { fetcher, retryDelaysMs: [1, 1, 1], timeoutMs: 1000 },
    );
    expect(res.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('faz retry com backoff e sucede na 3ª tentativa', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockRejectedValueOnce(new Error('HTTP 503'))
      .mockResolvedValue({ ok: true, status: 200 });
    const res = await fetchWithRetry(
      'https://example.org/x',
      { headers: {} },
      { fetcher, retryDelaysMs: [1, 1, 1], timeoutMs: 1000 },
    );
    expect(res.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(3);
  });

  it('lança o último erro após esgotar as tentativas', async () => {
    const fetcher = vi.fn().mockRejectedValue(new Error('HTTP 500'));
    await expect(
      fetchWithRetry(
        'https://example.org/x',
        { headers: {} },
        { fetcher, retryDelaysMs: [1, 1, 1], timeoutMs: 1000 },
      ),
    ).rejects.toThrow('HTTP 500');
    expect(fetcher).toHaveBeenCalledTimes(4); // 1 + 3 retries
  });

  it('HTTP não-ok conta como falha (dispara retry)', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValue({ ok: true, status: 200 });
    const res = await fetchWithRetry(
      'https://example.org/x',
      { headers: {} },
      { fetcher, retryDelaysMs: [1, 1, 1], timeoutMs: 1000 },
    );
    expect(res.ok).toBe(true);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});
