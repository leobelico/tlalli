// QA2 B40/B41/B42 sobre el build de producción: campos >=16 px, controles principales >=44 px, Deshacer, "Lote Lote".
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
const b = await browser();
const { ctx, p } = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
const adm = await login(b, 'admin@potosi.ejemplo.test', { width: 390, height: 844 });
const measure = (page) => page.evaluate(() => {
  const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
  const label = (e) => (e.textContent || e.getAttribute('aria-label') || e.getAttribute('name') || e.tagName).trim().replace(/\s+/g, ' ').slice(0, 28);
  const fields = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select, textarea')].filter(vis);
  const smallFont = fields.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map(label);
  const controls = [...document.querySelectorAll('.btn, .btn-primary, .btn-secondary, .btn-danger, .btn-ghost, button[type=submit], summary, input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=file]), select')].filter(vis);
  const smallTarget = controls.filter((e) => e.getBoundingClientRect().height < 43.5).map((e) => `${label(e)} (${Math.round(e.getBoundingClientRect().height)}px)`);
  return { smallFont, smallTarget, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
});
const pages = [['asesor', p, ['/app', '/app/leads', '/app/pipeline', '/app/tareas', '/app/cotizador', '/app/autorizaciones', '/app/desarrollos']], ['admin', adm.p, ['/app/equipo', '/app/configuracion', '/app/leads']]];
for (const [who, page, paths] of pages) {
  for (const path of paths) {
    await page.goto(BASE + path); await page.waitForTimeout(700);
    if (who === 'admin' && path === '/app/leads') { await page.locator('summary', { hasText: 'Reasignar' }).click().catch(() => {}); }
    const r = await measure(page);
    console.log(`   ${who} ${path.padEnd(22)} ancho ${r.sw}/${r.cw} | fuente<16: ${r.smallFont.length} ${JSON.stringify(r.smallFont.slice(0, 3))} | controles<44px: ${r.smallTarget.length} ${JSON.stringify(r.smallTarget.slice(0, 4))}`);
    if (r.smallFont.length) fail(`${who} ${path}: campos con fuente <16 px: ${r.smallFont.join(', ')}`);
    if (r.smallTarget.length) fail(`${who} ${path}: controles de menos de 44 px: ${r.smallTarget.slice(0, 6).join(', ')}`);
    if (r.sw > r.cw) fail(`${who} ${path}: desplazamiento horizontal`);
  }
}
// menú y Deshacer
await p.goto(BASE + '/app'); await p.getByRole('button', { name: /^Menú/ }).click();
const items = await p.locator('#menu-movil a').evaluateAll((as) => as.map((a) => Math.round(a.getBoundingClientRect().height)));
log('alto de los enlaces del menú:', JSON.stringify(items));
if (items.some((h) => h < 44)) fail('enlaces del menú de menos de 44 px');
await shot(p, 'm9-menu-cel', false);
const lead = (await sql("select l.id from leads l join users u on u.id=l.assigned_to_id where u.email='asesor1@potosi.ejemplo.test' and l.stage='NUEVO' limit 1"))[0];
await p.goto(`${BASE}/app/leads/${lead.id}`); await p.waitForSelector('#stage-control'); await p.waitForTimeout(400);
await p.selectOption('#stage-control', { label: 'Contactado' });
await p.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click();
const undo = p.getByRole('button', { name: /Deshacer/ }); await undo.waitFor({ timeout: 8000 });
const box = await undo.boundingBox();
log('botón Deshacer:', JSON.stringify(box));
if (box.height < 44) fail('Deshacer mide ' + box.height + ' px'); else ok('Deshacer mide ' + Math.round(box.height) + ' px de alto');
await shot(p, 'm9-deshacer-cel', false);
await undo.click(); await p.waitForTimeout(1500);
await b.close();
finish();
