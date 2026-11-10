import path from 'path';
import { chromium } from '../../qa/node_modules/playwright/index.mjs';
const b = await chromium.launch();
for (const [name, url, w, h, full] of [['landing-1280', '/', 1280, 900, true], ['landing-390', '/', 390, 844, true], ['login-390', '/login', 390, 844, false], ['precios-1280', '/precios', 1280, 900, false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1.5 });
  const p = await ctx.newPage();
  await p.goto('http://localhost:3300' + url, { waitUntil: 'networkidle' });
  await p.screenshot({ path: `capturas/app-${name}.png`, fullPage: full });
  console.log(name, 'desborde', await p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'title', await p.title());
  await ctx.close();
}
await b.close();
