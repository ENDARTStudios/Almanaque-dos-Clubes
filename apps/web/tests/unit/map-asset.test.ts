import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

// T467 — asset de fronteiras: presença + integridade + licença (Natural Earth,
// domínio público; ODbL explicitamente rejeitado/documentado).
const dir = resolve(process.cwd(), 'public', 'geo');

describe('T467 — asset de fronteiras', () => {
  it('GeoJSON Natural Earth presente, válido e com ISO_A2', () => {
    const p = resolve(dir, 'ne_110m_admin_0_countries.geojson');
    expect(existsSync(p)).toBe(true);
    const j = JSON.parse(readFileSync(p, 'utf8')) as {
      features: Array<{ properties: Record<string, unknown> }>;
    };
    expect(Array.isArray(j.features)).toBe(true);
    expect(j.features.length).toBeGreaterThan(150);
    expect(j.features[0].properties).toHaveProperty('ISO_A2');
  });

  it('LICENSE/PROVENIÊNCIA presente (domínio público; ODbL rejeitado)', () => {
    const md = readFileSync(resolve(dir, 'LICENSE.md'), 'utf8');
    expect(md).toMatch(/Natural Earth/i);
    expect(md).toMatch(/dom[íi]nio p[úu]blico/i);
    expect(md).toMatch(/ODbL/i);
  });
});
