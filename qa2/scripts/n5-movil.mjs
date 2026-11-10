// Pasada 2, punto 5: celular a 390 px con clics reales; objetivos táctiles, zoom de iOS, pipeline por etapa, confirmación + Deshacer.
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
const b = await browser();
for (const [who, email, role] of [['admin', 'admin@potosi.ejemplo.test', 'ADMIN'], ['asesor', 'asesor1@potosi.ejemplo.test', 'ASESOR']]) {
  const { ctx, p } = await login(b, email, { width: 390, height: 844 });
  await p.goto(BASE + '/app'); await p.waitForTimeout(800);
  log(`==== ${who} (celular)`);
  // menú
  const menuBtn = p.getByRole('button', { name: /^Menú/ }).first();
  await menuBtn.click(); await p.waitForTimeout(400);
  const links = await p.locator('nav a, [role=dialog] a, dialog a').evaluateAll((as) => [...new Set(as.filter((a) => a.offsetParent !== null).map((a) => a.textContent.trim()).filter(Boolean))]);
  log('secciones en el menú:', links.length, JSON.stringify(links));
  await shot(p, `n5-${who}-menu-cel`, false);
  await p.keyboard.press('Escape').catch(() => {});
  // objetivos táctiles y zoom por tamaño de fuente en cada pantalla
  const pages = ['/app', '/app/leads', '/app/pipeline', '/app/tareas', '/app/cotizador', '/app/autorizaciones', ...(role === 'ADMIN' ? ['/app/equipo', '/app/configuracion', '/app/desarrollos'] : ['/app/desarrollos'])];
  for (const path of pages) {
    await p.goto(BASE + path); await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const vis = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== 'hidden' && s.display !== 'none'; };
      const small = [...document.querySelectorAll('a, button, select, summary, [role=button]')].filter(vis).filter((e) => { const r = e.getBoundingClientRect(); return r.height < 36 || r.width < 36; }).map((e) => (e.textContent || e.getAttribute('aria-label') || e.tagName).trim().slice(0, 24));
      const zoom = [...document.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), select, textarea')].filter(vis).filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.getAttribute('name') || e.id || e.tagName);
      return { small, zoom, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    });
    console.log(`   ${path.padEnd(22)} ancho ${r.sw}/${r.cw} | objetivos <36px: ${r.small.length} ${JSON.stringify(r.small.slice(0, 5))} | campos con fuente <16px (iOS hace zoom): ${r.zoom.length} ${JSON.stringify(r.zoom.slice(0, 4))}`);
    if (r.sw > r.cw) fail(`${who} ${path}: desplazamiento horizontal ${r.sw}>${r.cw}`);
  }
  await ctx.close();
}
// pipeline como lista por etapa, con datos reales
const { ctx, p } = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
await p.goto(BASE + '/app/pipeline'); await p.waitForTimeout(900);
const heads = await p.locator('details > summary, h2, h3').allInnerTexts();
log('encabezados del pipeline en celular:', JSON.stringify(heads.map((h) => h.replace(/\s+/g, ' ')).slice(0, 14)));
const openCount = (await sql("select count(*)::int n from leads l join users u on u.id=l.assigned_to_id where u.email='asesor1@potosi.ejemplo.test' and l.stage in ('NUEVO','CONTACTADO','CITA_AGENDADA','VISITA_REALIZADA','COTIZACION','APARTADO')"))[0].n;
const cards = await p.locator('select[aria-label^="Mover a"]').count();
log('tarjetas con selector "Mover a…":', cards, '| leads abiertos del asesor en BD:', openCount);
await shot(p, 'n5-pipeline-cel', true);
// abrir etapas plegadas
const sums = p.locator('details > summary');
for (let i = 0; i < await sums.count(); i++) { const d = sums.nth(i); if (!(await d.evaluate((e) => e.parentElement.open))) await d.click().catch(() => {}); }
await p.waitForTimeout(400);
const cards2 = await p.locator('select[aria-label^="Mover a"]').count();
log('tarjetas tras abrir todas las etapas:', cards2);
// mover una tarjeta con confirmación y Deshacer en celular
const sel = p.locator('select[aria-label^="Mover a"]').first();
const label = await sel.getAttribute('aria-label');
const lead = (await sql("select l.id, l.stage from leads l join users u on u.id=l.assigned_to_id where u.email='asesor1@potosi.ejemplo.test' and l.stage='NUEVO' limit 1"))[0];
const sel2 = p.locator(`select[aria-label^="Mover a"]`).filter({ has: p.locator('option[value=CONTACTADO]') }).first();
await sel2.selectOption('CONTACTADO');
await p.locator('dialog[open]').waitFor({ timeout: 5000 });
await shot(p, 'n5-pipeline-confirmacion-cel', false);
const dlgBox = await p.locator('dialog[open]').boundingBox();
log('diálogo de confirmación dentro del viewport:', dlgBox && dlgBox.x >= 0 && dlgBox.x + dlgBox.width <= 390 ? 'sí' : 'NO ' + JSON.stringify(dlgBox));
if (!dlgBox || dlgBox.x < 0 || dlgBox.x + dlgBox.width > 390) fail('el diálogo de confirmación se sale del celular');
await p.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click();
const undo = p.getByRole('button', { name: /Deshacer/ });
await undo.waitFor({ timeout: 8000 });
const ub = await undo.boundingBox();
log('botón Deshacer visible en celular:', JSON.stringify(ub), '| alto', ub?.height);
await shot(p, 'n5-pipeline-deshacer-cel', false);
if (ub && ub.height < 36) fail('el botón Deshacer mide ' + ub.height + ' px de alto: difícil de tocar con el pulgar en 10 segundos');
await undo.click(); await p.waitForTimeout(1800);
log('tras deshacer, no quedan avisos:', await undo.count());
await b.close();
finish();
