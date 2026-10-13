import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

// `@playwright/test` resolve a partir de `apps/web/` (o runner roda com esse cwd),
// não da pasta do plugin.
const { chromium } = createRequire(resolve(process.cwd(), 'package.json'))('@playwright/test');

const outDir = resolve(
  process.env.QA_REPO_ROOT ?? resolve(process.cwd(), '..', '..'),
  '.tmp',
  'shots',
);
mkdirSync(outDir, { recursive: true });

const url = process.argv[2] || 'http://localhost:3210/';
const out = process.argv[3] || 'home';
const browser = await chromium.launch();

for (const [tag, viewport] of Object.entries({
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
})) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {});
  await page.waitForTimeout(2500);
  await page.screenshot({ path: resolve(outDir, `${out}-${tag}.png`) });
  if (tag === 'desktop') {
    await page.screenshot({ path: resolve(outDir, `${out}-full.png`), fullPage: true });
  }
  await page.close();
}

await browser.close();
console.log('done ->', outDir);
