// Capturas extra: logotipos, modo alterno (claro/oscuro) de la app y el celular, y el índice.
import path from 'path';
import { pathToFileURL } from 'url';
import { chromium } from '../../qa/node_modules/playwright/index.mjs';

const ROOT = path.resolve('.');
const browser = await chromium.launch();
const shoot = async (file, query, w, h, out, full) => {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, locale: 'es-MX' });
  const page = await ctx.newPage();
  await page.goto(pathToFileURL(path.join(ROOT, file)).href + query, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(300);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  await page.screenshot({ path: path.join(ROOT, 'capturas', out), fullPage: full });
  console.log(out, 'desborde:', overflow);
  await ctx.close();
};
const KEYS = process.argv.slice(2).length ? process.argv.slice(2) : ['A', 'B', 'C'];
for (const k of KEYS) {
  await shoot(`${k}/logos.html`, '', 1200, 800, `${k}-logos.png`, true);
  const alt = k === 'B' ? ['?tema=claro', 'claro'] : ['?tema=oscuro', 'oscuro'];
  await shoot(`${k}/app.html`, alt[0], 1280, 900, `${k}-app-1280-${alt[1]}.png`, false);
  await shoot(`${k}/celular.html`, alt[0], 390, 844, `${k}-celular-390-${alt[1]}.png`, false);
}
if (!process.argv.slice(2).length) await shoot('index.html', '', 1500, 900, 'indice.png', true);
await browser.close();
