// Pasada 2, punto 7: un cliente nuevo de principio a fin, en celular donde cabe y en escritorio donde conviene.
import { browser, login, submitForm } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
import fs from 'fs';
import { execFileSync } from 'child_process';
const ts = Date.now().toString(36);
const email = `nuevo-${ts}@ejemplo.test`, pass = 'Prueba123!';
const b = await browser();
const t0 = Date.now();
const guide = async (page, expect) => {
  await page.goto(BASE + '/app'); await page.waitForTimeout(700);
  const sec = page.locator('section[aria-label="Primeros pasos"]');
  const txt = (await sec.count()) ? (await sec.innerText()).replace(/\s+/g, ' ') : '(sin guía)';
  const got = (txt.match(/(\d) de 4 listos/) || [])[1] ?? (txt === '(sin guía)' ? 'fin' : '?');
  log('guía del primer día:', got === 'fin' ? 'ya no aparece' : `${got} de 4`, '|', txt.slice(0, 90));
  if (String(expect) !== got) fail(`la guía debía mostrar ${expect} de 4 y muestra ${got}`);
};
const step = (n) => log(`--- paso ${n} (+${((Date.now() - t0) / 1000).toFixed(0)} s)`);

// 1) registro en celular
step('1 registro (celular)');
let ctx = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX' });
let p = await ctx.newPage();
await p.goto(BASE + '/registro');
await p.fill('input[name=name]', 'Ximena Güemes Núñez');
await p.fill('input[name=email]', email);
await p.fill('input[name=password]', pass);
await p.fill('input[name=orgName]', 'Desarrollos del Bajío Ñandú');
await p.check('input[name=terms]');
await shot(p, 'n7-01-registro-cel', false);
await p.click('button[type=submit]');
await p.waitForURL(/\/app/, { timeout: 30000 }).catch(() => {});
await p.waitForLoadState('load'); await p.waitForTimeout(1500);
log('tras registrarse:', p.url().replace(BASE, ''), '|', (await p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 200));
await shot(p, 'n7-02-inicio-nuevo-cel', false);
await guide(p, 0);
await shot(p, 'r7-guia-cel', false);
const emptyHome = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
if (!/desarrollo|primer|empez|comienza|configura/i.test(emptyHome)) fail('el inicio de un cliente nuevo no le dice qué hacer primero: ' + emptyHome.slice(0, 160));
// 2) desarrollo y unidades (escritorio)
step('2 desarrollo y unidades (escritorio)');
await p.setViewportSize({ width: 1280, height: 800 });
await p.goto(BASE + '/app/desarrollos');
await p.fill('input[name=name]', 'Fraccionamiento Los Álamos');
await p.fill('input[name=city]', 'San Luis Potosí');
await submitForm(p, /crear|guardar|agregar/i);
await p.goto(BASE + '/app/desarrollos');
const devHref = (await p.locator('a[href^="/app/desarrollos/"]').evaluateAll((as) => as.map((a) => a.getAttribute('href'))))[0];
await p.goto(BASE + devHref);
const bulk = 'form:has(input[name=prefix])';
await p.locator(bulk).locator('input[name=prefix]').fill('Lote ');
await p.locator(bulk).locator('input[name=from]').fill('1');
await p.locator(bulk).locator('input[name=to]').fill('30');
await p.locator(bulk).locator('input[name=price]').fill('485000');
await p.locator(bulk).locator('input[name=areaM2]').fill('160');
await submitForm(p, /crear unidades/i, bulk);
const units = (await sql("select count(*)::int n from units u join developments d on d.id=u.development_id join organizations o on o.id=u.organization_id join memberships m on m.organization_id=o.id join users x on x.id=m.user_id where x.email=$1", [email]))[0].n;
log('unidades creadas:', units);
if (units !== 30) fail('se esperaban 30 unidades y hay ' + units);
await guide(p, 1);
await shot(p, 'n7-03-unidades', false);

// 3) CSV guardado desde Excel en español (Windows-1252, punto y coma, acentos y ñ)
step('3 importar CSV de Excel (Windows-1252)');
const rows = [['Nombre', 'Apellido', 'Teléfono', 'Correo', 'Campaña'],
  ['José', 'Ñúñez Peña', '444 200 0001', 'jose@ejemplo.test', ''],
  ['María', 'Núñez Gómez', '(444) 200-0002', '', ''],
  ['Ángel', 'Güemes', '4442000003', 'angel@ejemplo.test', ''],
  ['Zoë', 'Łukasz', '4442000004', '', ''],
  ['Renée', 'Müller–Ortiz', '+52 444 200 0005', '', '']];
const csv = rows.map((r) => r.join(';')).join('\r\n') + '\r\n';
const lossy = []; // Windows-1252 no puede guardar "Ł": Excel lo convierte en "?"
const cp = Buffer.from(csv.replace('Ł', 'L').replace('–', '-'), 'latin1');
fs.writeFileSync('csv/n7-excel-1252.csv', cp);
await p.goto(BASE + '/app/leads/importar');
await p.setInputFiles('input[name=file]', 'csv/n7-excel-1252.csv');
await p.check('input[name=consent]').catch(() => {});
await p.getByRole('button', { name: /importar/i }).click();
await p.waitForTimeout(3500);
log('resultado del importador:', (await p.locator('main').innerText()).split('\n').filter((l) => /terminada|Fila|error|aviso/i.test(l)).join(' / ').slice(0, 300));
await shot(p, 'n7-04-importacion', false);
const got = await sql("select l.first_name, l.last_name, l.phone, l.email from leads l join memberships m on m.organization_id=l.organization_id join users x on x.id=m.user_id where x.email=$1 order by phone", [email]);
log('en la base:', JSON.stringify(got));
const expect = ['José|Ñúñez Peña', 'María|Núñez Gómez', 'Ángel|Güemes', 'Zoë|Lukasz', 'Renée|Müller-Ortiz'];
for (const e of expect) { const [f, l] = e.split('|'); if (!got.some((g) => g.first_name === f && g.last_name === l)) fail(`el CSV de Excel perdió/estropeó "${e}"`); }
if (got.some((g) => /�|Ã/.test(g.first_name + (g.last_name ?? '')))) fail('hay caracteres corruptos en los nombres importados');
await guide(p, 2);
// y un UTF-8 con BOM y comillas, como "CSV UTF-8" de Excel
fs.writeFileSync('csv/n7-utf8-bom.csv', '﻿Nombre,Teléfono\r\n"Ñandú, Jr.",4442000009\r\n');
await p.goto(BASE + '/app/leads/importar');
await p.setInputFiles('input[name=file]', 'csv/n7-utf8-bom.csv'); await p.check('input[name=consent]').catch(() => {});
await p.getByRole('button', { name: /importar/i }).click(); await p.waitForTimeout(3000);
log('UTF-8 con BOM y coma dentro de comillas ->', JSON.stringify((await sql("select first_name,last_name from leads where phone='+524442000009'"))));

// 4) invitar asesor, aceptarlo en celular
step('4 invitar asesor');
await p.goto(BASE + '/app/equipo');
const asesorEmail = `asesor-${ts}@ejemplo.test`;
await p.fill('input[name=email]', asesorEmail);
await p.selectOption('select[name=role]', 'ASESOR');
await submitForm(p, /invitar|crear|enviar/i);
const link = ((await p.innerText('body')).match(/https?:\/\/\S+\/invitacion\/\S+/) || [''])[0];
log('enlace de invitación:', link ? 'generado' : 'NO apareció');
await guide(p, 3);
const c2 = await b.newContext({ viewport: { width: 390, height: 844 }, locale: 'es-MX' });
const q = await c2.newPage();
await q.goto(link);
await q.fill('input[name=name]', 'Beto Asesor');
await q.fill('input[name=password]', pass);
await q.getByRole('button').filter({ hasText: /crear|unirme|aceptar/i }).first().click();
await q.waitForURL(/\/app/, { timeout: 20000 }).catch(() => {});
await q.waitForLoadState('load'); await q.waitForTimeout(1200);
log('el asesor entra a:', q.url().replace(BASE, ''));
await shot(q, 'n7-05-asesor-inicio-cel', false);
// 5) el administrador reparte y el asesor captura y mueve
step('5 captura y movimiento');
await p.goto(BASE + '/app/leads?asesor=none');
log('leads sin asignar tras el CSV:', (await p.locator('main').innerText()).match(/sin asignar/gi)?.length ?? 0);
await q.goto(BASE + '/app/leads/nuevo');
await q.fill('[name=firstName]', 'María José 💃'); await q.fill('[name=lastName]', 'Peña Ñíguez'); await q.fill('[name=phone]', '444-812-0007'); await q.fill('[name=email]', 'majo@ejemplo.test');
await q.check('input[name=consent]');
await q.getByRole('button', { name: /guardar|crear|registrar/i }).click(); await q.waitForTimeout(2000);
const leadPath = q.url().replace(BASE, '');
log('lead capturado por el asesor en celular:', leadPath);
await shot(q, 'n7-06-lead-cel', false);
await q.selectOption('#stage-control', { label: 'Contactado' });
await q.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click();
await q.waitForTimeout(1500);
// 6) cotizar y PDF
step('6 cotizar y PDF');
const unit = (await sql("select u.id, u.code, u.price from units u join memberships m on m.organization_id=u.organization_id join users x on x.id=m.user_id where x.email=$1 and u.status='DISPONIBLE' order by u.code limit 1", [email]))[0];
const leadId = leadPath.split('/').pop();
await q.goto(`${BASE}/app/cotizador?lead=${leadId}&unidad=${unit.id}`);
await q.selectOption('select[name=unitId]', unit.id);
await q.fill('[name=discount]', '0'); await q.fill('[name=downPaymentPct]', '20'); await q.fill('[name=months]', '24'); await q.fill('[name=annualRatePct]', '0');
await shot(q, 'n7-07-cotizador-cel', true);
await q.getByRole('button', { name: /cotiz|generar|guardar/i }).first().click();
await q.waitForURL(/\/app\/cotizador\/[0-9a-f-]{36}/, { timeout: 15000 }).catch(() => {});
log('cotización:', q.url().replace(BASE, ''));
await shot(q, 'n7-08-cotizacion-cel', true);
const quoteId = q.url().split('/').pop();
const pdfResp = await q.request.get(`${BASE}/api/quotes/${quoteId}/pdf`);
const pdf = await pdfResp.body();
fs.writeFileSync('salidas/n7-cotizacion.pdf', pdf);
log('PDF:', pdfResp.status(), pdfResp.headers()['content-type'], pdf.length, 'bytes', '| cabecera', pdf.slice(0, 5).toString());
let text = '';
try { text = execFileSync('pdftotext', ['-enc', 'UTF-8', '-layout', 'salidas/n7-cotizacion.pdf', '-'], { encoding: 'utf8' }); } catch (e) { text = 'pdftotext no disponible: ' + e.message; }
fs.writeFileSync('salidas/n7-cotizacion.txt', text);
log('texto del PDF (resumen):', text.replace(/\s+/g, ' ').slice(0, 700));
// cálculo: precio 485,000 - 10,000 = 475,000; enganche 10% = 47,500; saldo 427,500 / 48 = 8,906.25
if (/Lote Lote/.test(text)) fail('B42: el PDF repite "Lote Lote"'); else ok('B42: el PDF dice "' + ((text.match(/Lote [^A-Z]{0,12}/) || [''])[0]).trim() + '" sin repetir el tipo');
for (const must of ['485,000', '97,000', '16,166.66', unit.code, 'María José', 'Ñíguez']) if (!text.includes(must)) fail(`el PDF no contiene "${must}"`);
if (/💃/.test(text)) log('(el emoji aparece en el PDF)'); else log('el emoji del nombre no se imprime en el PDF (se omite o sustituye):', (text.match(/Mar[^\n]{0,30}Jos[^\n]{0,30}/) || [''])[0]);
await q.goto(BASE + '/app/leads/' + leadId);
log('etapa final del lead tras cotizar:', await q.locator('#stage-control').inputValue());
log('tiempo total del recorrido:', ((Date.now() - t0) / 1000).toFixed(0), 's');
// WhatsApp del PDF / compartir
await q.goto(`${BASE}/app/cotizador/${quoteId}`);
log('acciones en la cotización:', JSON.stringify(await q.locator('main a, main button').allInnerTexts()));
// el administrador define su tope (guarda la configuración): la guía desaparece
await p.goto(BASE + '/app/configuracion');
await p.getByRole('button', { name: 'Guardar' }).first().click(); await p.waitForTimeout(2000);
await guide(p, 'fin');
await b.close();
fs.writeFileSync('n7-cuenta.json', JSON.stringify({ email, pass, asesorEmail }));
finish();
