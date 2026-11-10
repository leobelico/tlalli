// Genera HTML + capturas (deviceScaleFactor 2) de las direcciones indicadas: node _src/shots.mjs A B C
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from '../../qa/node_modules/playwright/index.mjs';

const ROOT = path.resolve('.');
const dirs = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C'];
fs.mkdirSync(path.join(ROOT, 'capturas'), { recursive: true });
const browser = await chromium.launch();
for (const k of dirs) {
  const mod = await import(`./${k.startsWith('A') ? 'A' : k}.mjs`);
  if (mod.setVariant) mod.setVariant(k);
  fs.mkdirSync(path.join(ROOT, k), { recursive: true });
  const screens = [
    ['landing', mod.landing, [[1280, 800], [390, 844]], true],
    ['app', mod.app, [[1280, 900]], false],
    ['celular', mod.mobile, [[390, 844]], false],
  ];
  for (const [name, fn, sizes, full] of screens) {
    const file = path.join(ROOT, k, `${name}.html`);
    fs.writeFileSync(file, fn());
    for (const [w, h] of sizes) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'es-MX' });
      const page = await ctx.newPage();
      await page.goto(pathToFileURL(file).href, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(400);
      const fonts = await page.evaluate(() => [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family.replace(/"/g, '')).filter((v, i, a) => a.indexOf(v) === i));
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) console.log('   culpables:', JSON.stringify(await page.evaluate((w) => [...document.querySelectorAll('body *')].filter((e) => e.getBoundingClientRect().right > w + 1).slice(0, 6).map((e) => e.tagName + '.' + String(e.className).slice(0, 24) + ':' + Math.round(e.getBoundingClientRect().right)), w)));
      await page.screenshot({ path: path.join(ROOT, 'capturas', `${k}-${name}-${w}.png`), fullPage: full });
      console.log(`${k} ${name} ${w}px  fuentes cargadas: ${fonts.join(', ') || '(ninguna: sin red)'}  desborde horizontal: ${overflow}px`);
      await ctx.close();
    }
  }
}
await browser.close();
