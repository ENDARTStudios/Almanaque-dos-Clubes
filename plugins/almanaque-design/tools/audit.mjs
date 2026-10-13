import { createRequire } from 'node:module';
import { resolve } from 'node:path';

// `@playwright/test` resolve a partir de `apps/web/` (o runner roda com esse cwd).
const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('@playwright/test');

const url = process.argv[2] || 'http://localhost:3210/';
const browser = await chromium.launch();

for (const [tag, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
})) {
  const page = await browser.newPage({ viewport });
  const consoleErrors = [];
  const httpErrors = [];
  page.on('console', (m) => m.type() === 'error' && consoleErrors.push(m.text().slice(0, 160)));
  page.on('response', (r) => r.status() >= 400 && httpErrors.push(`${r.status()} ${r.url()}`));
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(3000);

  const data = await page.evaluate(() => {
    const doc = document.documentElement;
    const h1 = document.querySelector('h1');
    const rect = (el) => (el ? el.getBoundingClientRect() : null);
    const lineCount = (el) => {
      if (!el) return null;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.1;
      return Math.round(el.getBoundingClientRect().height / lh);
    };
    return {
      overflowX: doc.scrollWidth - window.innerWidth,
      h1: h1?.textContent?.trim() ?? null,
      h1Lines: lineCount(h1),
      h1Box: rect(h1) && { w: Math.round(rect(h1).width), h: Math.round(rect(h1).height) },
      headings: [...document.querySelectorAll('h1,h2,h3')].map(
        (h) => `${h.tagName}:${h.textContent.trim().slice(0, 34)}`,
      ),
      h1Count: document.querySelectorAll('h1').length,
      primaryCtas: [...document.querySelectorAll('section a')].filter((a) =>
        a.className.includes('bg-primary'),
      ).length,
      smallTargets: [...document.querySelectorAll('a,button')]
        .map((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0 && r.height < 24
            ? `${el.tagName}:${(el.textContent || '').trim().slice(0, 20) || el.getAttribute('aria-label') || '?'}(${Math.round(r.height)}px)`
            : null;
        })
        .filter(Boolean),
      heroHeight: Math.round(document.querySelector('section')?.getBoundingClientRect().height ?? 0),
      mutedLeak: [...document.querySelectorAll('.theme-dark *')]
        .filter((el) => {
          const bg = getComputedStyle(el).backgroundColor;
          return /22,\s*25,\s*23|240,\s*237,\s*241|254,\s*242,\s*242/.test(bg);
        })
        .slice(0, 5)
        .map((el) => `${el.tagName}.${(el.className || '').toString().slice(0, 40)}`),
    };
  });

  console.log(`\n=== ${tag} (${viewport.width}x${viewport.height}) ===`);
  console.log(JSON.stringify(data, null, 1));
  if (consoleErrors.length) console.log('CONSOLE ERRORS:', consoleErrors);
  if (httpErrors.length) console.log('HTTP >=400:', httpErrors.slice(0, 8));
  await page.close();
}

await browser.close();
