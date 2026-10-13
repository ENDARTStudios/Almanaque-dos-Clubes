import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// `@playwright/test` resolve a partir de `apps/web/` (o runner roda com esse cwd).
const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('@playwright/test');

const outDir = resolve(process.env.QA_REPO_ROOT ?? resolve(process.cwd(), '..', '..'), '.tmp', 'shots');
mkdirSync(outDir, { recursive: true });
const url = process.argv[2] || 'http://localhost:3210/';

const browser = await chromium.launch();
for (const locale of ['pt-br', 'en-us', 'es-es']) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: 'almanaque_locale', value: locale, url: 'http://localhost:3210' }]);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, `locale-${locale}.png`) });

  const info = await page.evaluate(() => {
    const h1 = document.querySelector('h1');
    const sub = document.querySelector('section p.mt-6');
    const cta = document.querySelector('section a');
    return {
      htmlLang: document.documentElement.lang,
      h1: h1?.textContent?.trim(),
      h1Height: Math.round(h1?.getBoundingClientRect().height ?? 0),
      sub: sub?.textContent?.trim()?.slice(0, 90),
      cta: cta?.textContent?.trim(),
      overflowX: document.documentElement.scrollWidth - window.innerWidth,
    };
  });
  console.log(locale, JSON.stringify(info));
  await ctx.close();
}
await browser.close();
