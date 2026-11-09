// E2E (QA B14): at 390 px every private page fits the screen and every section is reachable.
// Exit code 0 only if everything passes. Screenshots go to qa/capturas/movil-*.png.
import { browser, login, shot, BASE, sql, orgOf } from './lib.mjs';
import fs from 'fs';

const SECTIONS = ['Inicio', 'Pipeline', 'Leads', 'Tareas', 'Desarrollos', 'Cotizador', 'Autorizaciones', 'Campañas', 'Equipo', 'Configuración'];
let failures = 0;
const fail = (m) => { failures++; console.error('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const b = await browser();
const { p } = await login(b, 'admin@potosi.ejemplo.test', { width: 390, height: 844 });
const orgId = await orgOf('admin@potosi.ejemplo.test');
const lead = (await sql('select id from leads where organization_id=$1 order by created_at limit 1', [orgId]))[0].id;
const dev = (await sql('select id from developments where organization_id=$1 order by name limit 1', [orgId]))[0].id;
const quote = (await sql('select id from quotes where organization_id=$1 limit 1', [orgId]))[0]?.id;
const pages = ['/app', '/app/leads', '/app/leads/nuevo', '/app/leads/importar', `/app/leads/${lead}`, '/app/pipeline', '/app/tareas',
  '/app/desarrollos', `/app/desarrollos/${dev}`, '/app/campanas', '/app/cotizador', '/app/autorizaciones', ...(quote ? [`/app/cotizador/${quote}`] : []),
  '/app/equipo', '/app/configuracion'];

for (const path of pages) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  const r = await p.evaluate(() => {
    const docOverflow = document.documentElement.scrollWidth - window.innerWidth;
    const scrollers = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const s = getComputedStyle(el);
        return (s.overflowX === 'auto' || s.overflowX === 'scroll') && el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0;
      })
      // A row of filter chips/tabs that scrolls on purpose is marked with data-scroll-ok.
      .filter((el) => !el.closest('[data-scroll-ok]'))
      .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 3).join('.')} (+${el.scrollWidth - el.clientWidth}px)`);
    return { docOverflow, scrollers };
  });
  const name = 'movil-' + (path.replace(/\/app\/?/, '').replace(/[0-9a-f-]{36}/, 'detalle').replace(/\//g, '_') || 'inicio');
  await shot(p, name);
  if (r.docOverflow > 0) fail(`${path}: la página se desborda ${r.docOverflow}px`);
  else if (r.scrollers.length) fail(`${path}: desplazamiento horizontal interno en ${r.scrollers.join(', ')}`);
  else ok(`${path}: cabe en 390 px`);
}

// Every section must be reachable from the mobile navigation, visible inside the viewport.
await p.goto(BASE + '/app');
const menuButton = p.getByRole('button', { name: /menú/i });
if (await menuButton.count()) await menuButton.first().click();
await p.waitForTimeout(400);
for (const s of SECTIONS) {
  const link = p.getByRole('link', { name: s, exact: true });
  let visible = false;
  for (let i = 0; i < (await link.count()); i++) {
    const box = await link.nth(i).boundingBox();
    if (box && (await link.nth(i).isVisible()) && box.x >= 0 && box.x + box.width <= 390 && box.y >= 0 && box.y + box.height <= 844) visible = true;
  }
  if (!visible) fail(`la sección "${s}" no se ve en la navegación del celular`);
}
if (!failures) ok('las 10 secciones están a la vista en el menú del celular');
await shot(p, 'movil-menu-abierto', false);

// The pipeline must be a grouped list (no horizontal board) on a phone.
await p.goto(BASE + '/app/pipeline');
const board = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
if (!board) fail('el pipeline se desborda en el celular');

await b.close();
console.log(failures ? `\n${failures} fallas` : '\nTodo OK');
process.exitCode = failures ? 1 : 0;
