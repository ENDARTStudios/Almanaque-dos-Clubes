import { describe, it, expect } from 'vitest';
import { ANTHEMS, canonicalJson } from '../../../src/scripts/seed-anthems.js';

// T524 — a curadoria de hinos é ESTÁTICA (fatos copiados das seções "Hino" da
// pt.Wikipédia). O que os testes travam são as REGRAS do despacho:
// letra NUNCA publicada sem licença livre; áudio só com licença; campos factuais.

describe('seed-anthems (T524) — regras do despacho', () => {
  const entries = Object.entries(ANTHEMS);

  it('cobre 13 clubes do escopo (gate: meta 5+)', () => {
    expect(entries.length).toBe(13);
  });

  it('NENHUMA letra é publicada — null em todos, com lyricsRestricted', () => {
    // Restrição crítica: os próprios artigos avisam que a letra viola direitos
    // autorais; o pt.wikisource não tem nenhuma. Nunca publicar sem licença livre.
    for (const [name, a] of entries) {
      expect(a.lyrics ?? null, name).toBeNull();
    }
  });

  it('Só o São Paulo tem áudio esperado — e a URL só entra após verificação ao vivo', () => {
    const withAudio = entries.filter(([, a]) => a.audioUrl !== null);
    expect(withAudio).toHaveLength(0); // no mapa estático a URL é null até verifyAudio
    expect(ANTHEMS['São Paulo FC'].sourceUrl).toContain('Hino-do-S');
  });

  it('cada entrada tem fonte (pt.wiki, exceto a de áudio do SPFC no Commons)', () => {
    for (const [name, a] of entries) {
      const ok =
        a.sourceUrl.startsWith('https://pt.wikipedia.org/wiki/') ||
        (name === 'São Paulo FC' && a.sourceUrl.includes('commons.wikimedia.org'));
      expect(ok, name).toBe(true);
    }
  });

  it('metadados factuais presentes (compositor OU rótulo)', () => {
    for (const [name, a] of entries) {
      expect(a.composer != null || a.label != null, name).toBe(true);
    }
  });

  it('hinos não-oficiais estão marcados (Botafogo/Lamartine Babo)', () => {
    expect(ANTHEMS['Botafogo F.R.'].official).toBe(false);
    expect(ANTHEMS['Botafogo F.R.'].composer).toBe('Lamartine Babo');
  });

  it('canonicalJson é estável para o formato gravado', () => {
    const sample = { b: 1, a: { d: null, c: 'x' } };
    expect(canonicalJson(sample)).toBe('{"a":{"c":"x","d":null},"b":1}');
    expect(canonicalJson([sample, null])).toBe('[{"a":{"c":"x","d":null},"b":1},null]');
  });
});
