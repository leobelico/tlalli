// E2E (pilot item 6): a non-technical client never sees WhatsApp/Meta/webhook jargon unless they open
// the folded "Avanzado" section, which is written in Spanish. Exit code 0 only if everything passes.
import { browser, login, shot, BASE, sql } from './lib.mjs';

const JARGON = /\b(webhook|phone number id|cloud api|README|WHATSAPP\.md|endpoint|app secret|Meta for Developers|token de verificaci)/i;
const VARIABLES = /\{\{\s*\d+\s*\}\}/;
let failures = 0;
const fail = (m) => { failures++; console.error('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);
const visible = (p) => p.evaluate(() => document.body.innerText);

const b = await browser();
for (const [label, w, h] of [['escritorio', 1280, 800], ['celular', 390, 844]]) {
  const { p } = await login(b, 'admin@potosi.ejemplo.test', { width: w, height: h });

  await p.goto(BASE + '/app/configuracion', { waitUntil: 'networkidle' });
  let text = await visible(p);
  const found = text.match(JARGON);
  if (found) fail(`[${label}] Configuración muestra jerga sin abrir Avanzado: "${found[0]}"`);
  else ok(`[${label}] Configuración sin jerga con Avanzado plegado`);
  const advanced = p.locator('details', { has: p.locator('summary', { hasText: /^Avanzado/ }) });
  if (!(await advanced.count())) fail(`[${label}] no existe la sección plegada "Avanzado"`);
  else {
    if (await advanced.first().evaluate((d) => d.open)) fail(`[${label}] "Avanzado" debería empezar plegado`);
    await advanced.first().locator('summary').click();
    text = await visible(p);
    if (!/WhatsApp/.test(text) || !/formulario/i.test(text)) fail(`[${label}] "Avanzado" no explica WhatsApp y el formulario en español`);
    else ok(`[${label}] Avanzado abre con WhatsApp y formulario explicados`);
    if (/connection|provider|token|secret/i.test(await advanced.first().innerText().then((t) => t.replace(/token de/gi, '')))) fail(`[${label}] Avanzado trae palabras en inglés`);
  }
  await shot(p, `lenguaje-configuracion-${label}`);

  // Lead page: the message templates must not show {{1}} placeholders or "Plantilla aprobada".
  const lead = (await sql("select l.id from leads l join organizations o on o.id=l.organization_id where o.slug='demo-potosi' and l.consent_at is not null order by l.created_at limit 1"))[0].id;
  await p.goto(`${BASE}/app/leads/${lead}`, { waitUntil: 'networkidle' });
  const summary = p.locator('summary', { hasText: /plantilla|mensaje predefinido/i }).first();
  if (await summary.count()) {
    const open = await summary.evaluate((s) => s.parentElement.open);
    if (!open) await summary.click();
  }
  text = await visible(p);
  if (VARIABLES.test(text)) fail(`[${label}] la ficha del lead muestra variables {{n}}`);
  else ok(`[${label}] ficha del lead sin variables {{n}}`);
  if (/plantilla aprobada/i.test(text)) fail(`[${label}] sigue diciendo "Plantilla aprobada"`);
  if (JARGON.test(text)) fail(`[${label}] la ficha del lead muestra jerga: "${text.match(JARGON)[0]}"`);
  await shot(p, `lenguaje-lead-${label}`, false);
}
await b.close();
console.log(failures ? `\n${failures} fallas` : '\nTodo OK');
process.exitCode = failures ? 1 : 0;
