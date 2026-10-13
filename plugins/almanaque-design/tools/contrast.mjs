import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// `@playwright/test` resolve a partir de `apps/web/` (o runner roda com esse cwd).
const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('@playwright/test');

const url = process.argv[2] || 'http://localhost:3210/';
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
await page.waitForTimeout(2500);

const out = await page.evaluate(() => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  /** Pinta `fgCss` sobre `bgCss` e devolve o sRGB realmente renderizado (com alfa). */
  const composite = (fgCss, bgCss) => {
    const bg2 = document.createElement('canvas');
    bg2.width = bg2.height = 4;
    const c2 = bg2.getContext('2d', { willReadFrequently: true });
    c2.fillStyle = bgCss;
    c2.fillRect(0, 0, 4, 4);
    const p0 = c2.getImageData(0, 0, 1, 1).data;
    const bgHex = `rgb(${p0[0]},${p0[1]},${p0[2]})`;

    ctx.clearRect(0, 0, 8, 8);
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, 8, 8);
    ctx.fillStyle = fgCss;
    ctx.fillRect(0, 0, 8, 8);
    const p = ctx.getImageData(0, 0, 1, 1).data;
    return { c: [p[0], p[1], p[2]], bgHex };
  };

  const lin = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const lum = (c) => 0.2126 * lin(c[0] / 255) + 0.7152 * lin(c[1] / 255) + 0.0722 * lin(c[2] / 255);
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };

  const samples = [
    ['h1', 'section h1'],
    ['promise', '[data-testid="hero-promise"]'],
    ['promiseNote', '[data-testid="hero-promise-note"]'],
    ['eyebrow', '[data-testid="hero-eyebrow"]'],
    ['eyebrowInline', '[data-testid="hero-promise"] span'],
    ['ctaNote', '[data-testid="hero-cta-note"]'],
    ['ctaPrimaryLabel', 'section a[href="/search"]'],
    ['ctaSecondaryLabel', 'section a[href="/auth/register"]'],
    ['proofLabel', '[data-testid="hero-proof-label"]'],
    ['proofDisclaimer', '[data-testid="hero-proof-disclaimer"]'],
    ['ctaNote', '[data-testid="hero-cta-note"]'],
    ['promiseNote', '[data-testid="hero-promise-note"]'],
    ['statsGap', '[data-testid="hero-stats-gap"]'],
    ['statLabel', 'dl dt'],
    ['statValue', 'dl dd'],
    ['statsNote', 'dl + p'],
    ['featuresSubtitle', 'section h2 ~ p'],
    ['howStepDesc', 'ol li p'],
    ['stepNumber', 'ol li span'],
    ['closingDesc', 'section:last-of-type p'],
    ['statsGap', '[data-testid="hero-stats-gap"]'],
    ['championsHeading', 'section[aria-label] h2'],
    ['championsEmpty', '[data-testid="champions-empty"]'],
    ['championsGapsNote', 'section[aria-label] > p:last-child'],
  ];

  return samples.map(([name, sel]) => {
    const el = document.querySelector(sel);
    if (!el) return { name, sel, missing: true };
    const cs = getComputedStyle(el);

    // fundo acumulado (o próprio + ancestrais), resolvido em sRGB de baixo para cima
    const stack = [];
    let node = el;
    while (node) {
      const bg = getComputedStyle(node).backgroundColor;
      const m = bg && bg.match(/[\d.]+/g);
      if (m && m.length >= 3) {
        const a = m.length >= 4 ? Number(m[3]) : 1;
        if (a > 0) stack.push({ css: bg, a });
        if (a >= 0.999) break;
      }
      node = node.parentElement;
    }
    stack.reverse();
    let bgRgb = [255, 255, 255];
    for (const { css } of stack) {
      const r = composite(css, `rgb(${bgRgb.join(',')})`);
      bgRgb = r.c;
    }

    const fg = composite(cs.color, `rgb(${bgRgb.join(',')})`).c;
    return {
      name,
      text: (el.textContent || '').trim().slice(0, 26),
      declared: cs.color,
      fg,
      bg: bgRgb,
      ratio: Number(ratio(fg, bgRgb).toFixed(2)),
      fontSize: cs.fontSize,
      fontWeight: cs.fontWeight,
    };
  });
});

let fails = 0;
for (const row of out) {
  if (row.missing) {
    console.log(`?      ${row.name.padEnd(18)} SELETOR AUSENTE: ${row.sel}`);
    continue;
  }
  const size = parseFloat(row.fontSize);
  const big = size >= 24 || (size >= 18.66 && Number(row.fontWeight) >= 700);
  const need = big ? 3 : 4.5;
  const ok = row.ratio >= need;
  if (!ok) fails++;
  console.log(
    `${ok ? 'OK   ' : 'FALHA'} ${row.ratio.toFixed(2).padStart(6)} / ${need}  ${row.name.padEnd(18)} ${row.fontSize.padStart(5)} w${row.fontWeight}  rgbfg=${row.fg.join(',')} rgbbg=${row.bg.join(',')}  "${row.text}"`,
  );
}
console.log(`\n${fails} reprovacao(oes) de contraste`);
await browser.close();
