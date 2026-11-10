import { browser, login, shot, BASE } from './lib.mjs';
import fs from 'fs';
const b = await browser();
const out = { timings: {}, console: [], texts: {} };
const pages = ['/app', '/app/leads', '/app/leads/nuevo', '/app/leads/importar', '/app/pipeline', '/app/tareas', '/app/desarrollos', '/app/campanas', '/app/cotizador', '/app/autorizaciones', '/app/equipo', '/app/configuracion'];
for (const [label, w, h] of [['desk', 1280, 800], ['cel', 390, 844]]) {
  const { ctx, p } = await login(b, 'admin@potosi.ejemplo.test', { width: w, height: h });
  p.on('console', m => { if (['error', 'warning'].includes(m.type())) out.console.push(`${label} ${p.url()} ${m.type()}: ${m.text().slice(0, 300)}`); });
  p.on('pageerror', e => out.console.push(`${label} ${p.url()} PAGEERROR ${e.message}`));
  const extra = [];
  for (const path of pages) {
    const t = Date.now();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    out.timings[`${label} ${path}`] = Date.now() - t;
    const name = `${label}-${path.replace(/\//g, '_').replace(/^_/, '') || 'root'}`;
    await shot(p, name);
    if (label === 'desk') out.texts[path] = await p.innerText('body');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) out.console.push(`${label} ${path} HORIZONTAL OVERFLOW ${ov}px`);
    if (path === '/app/leads') { const href = await p.locator('a[href^="/app/leads/"]').evaluateAll(as => as.map(a => a.getAttribute('href')).filter(h => /[0-9a-f-]{36}/.test(h))); extra.push(href[0]); }
    if (path === '/app/desarrollos') { const href = await p.locator('a[href^="/app/desarrollos/"]').evaluateAll(as => as.map(a => a.getAttribute('href'))); extra.push(href[0]); }
  }
  for (const path of extra.filter(Boolean)) {
    const t = Date.now();
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    out.timings[`${label} ${path}`] = Date.now() - t;
    await shot(p, `${label}-${path.split('/')[2]}-detalle`);
    if (label === 'desk') out.texts[path] = await p.innerText('body');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) out.console.push(`${label} ${path} HORIZONTAL OVERFLOW ${ov}px`);
  }
  await ctx.close();
}
// public pages
for (const [label, w, h] of [['desk', 1280, 800], ['cel', 390, 844]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h } });
  const p = await ctx.newPage();
  p.on('pageerror', e => out.console.push(`${label} ${p.url()} PAGEERROR ${e.message}`));
  for (const path of ['/', '/precios', '/privacidad', '/terminos', '/login', '/registro', '/f/demo-potosi', '/aviso-privacidad/demo-potosi']) {
    const t = Date.now();
    const r = await p.goto(BASE + path, { waitUntil: 'networkidle' });
    out.timings[`pub ${label} ${path}`] = `${Date.now() - t} (${r.status()})`;
    await shot(p, `pub-${label}-${path.replace(/\//g, '_').replace(/^_/, '') || 'home'}`);
    if (label === 'desk') out.texts['PUB ' + path] = await p.innerText('body');
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 0) out.console.push(`${label} ${path} HORIZONTAL OVERFLOW ${ov}px`);
  }
  await ctx.close();
}
fs.writeFileSync('tour.json', JSON.stringify(out, null, 1));
console.log(JSON.stringify(out.timings, null, 1)); console.log(out.console.join('\n'));
await b.close();
