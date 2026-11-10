// Pasada 2, punto 2: cola de autorizaciones (aprobar, rechazar, doble aprobación, evasión del tope, baja a medias).
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, demo, sql, shot, BASE } from './n-lib.mjs';
import fs from 'fs';
const d = await demo();
const b = await browser();
const as1 = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
const adm = await login(b, 'admin@potosi.ejemplo.test');
const adm2 = await login(b, 'admin@potosi.ejemplo.test');
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
const lead = (await sql("select l.id from leads l where l.organization_id=$1 and l.assigned_to_id=$2 and l.stage in ('NUEVO','CONTACTADO') limit 1", [d.org, d.users.asesor1]))[0];
const unit = (await sql("select u.id, u.code, u.price from units u where u.organization_id=$1 and u.status='DISPONIBLE' order by u.code limit 1 offset 20", [d.org]))[0];
const price = Number(unit.price);
const quotes = async () => Number((await sql('select count(*)::int n from quotes where organization_id=$1', [d.org]))[0].n);
const reqs = async () => sql('select status, kind, summary from authorization_requests where organization_id=$1 order by created_at', [d.org]);
async function quote(p, { discount, rate = '0', months = '60', pct = '20' }) {
  await p.goto(`${BASE}/app/cotizador?lead=${lead.id}&unidad=${unit.id}`);
  await p.selectOption('select[name=unitId]', unit.id);
  await p.fill('[name=discount]', String(discount));
  await p.fill('[name=downPaymentPct]', pct);
  await p.fill('[name=months]', months);
  await p.fill('[name=annualRatePct]', rate);
  await p.getByRole('button', { name: /cotiz|generar|guardar/i }).first().click();
  await p.waitForTimeout(2600);
  return { status: (await p.locator('[role=status]').allInnerTexts()).join(' | ').slice(0, 260), err: (await p.locator('[role=alert], .text-red-600').allInnerTexts()).join(' | ').slice(0, 200), url: p.url().replace(BASE, '') };
}
log('unidad', unit.code, 'precio', price, '| tope 5% =', price * 0.05);

// 1) justo en el tope pasa; un peso arriba queda pendiente
let n0 = await quotes();
let r = await quote(as1.p, { discount: price * 0.05, rate: '4', months: '24' });
log('descuento = 5.00% ->', r.url, '| cotizaciones +', (await quotes()) - n0);
if ((await quotes()) - n0 !== 1) fail('descuento exactamente en el tope no generó cotización');
n0 = await quotes();
r = await quote(as1.p, { discount: price * 0.05 + 1 });
log('descuento = 5% + $1 ->', r.status.slice(0, 120), '| cotizaciones +', (await quotes()) - n0);
if ((await quotes()) - n0 !== 0) fail('un peso arriba del tope generó cotización sin autorización');
// negativo, texto, enorme
for (const dsc of ['-100000', '99999999']) {
  n0 = await quotes();
  r = await quote(as1.p, { discount: dsc });
  log(`descuento ${dsc} ->`, (r.err || r.status).slice(0, 140), '| cotizaciones +', (await quotes()) - n0);
  if ((await quotes()) - n0 > 0) fail('descuento absurdo aceptado: ' + dsc);
}

// 2) repetir la misma solicitud no duplica
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
const big = Math.round(price * 0.2);
await quote(as1.p, { discount: big });
await quote(as1.p, { discount: big });
log('solicitudes tras pedir dos veces lo mismo:', JSON.stringify(await reqs()));
if ((await reqs()).length !== 1) fail('pedir dos veces el mismo descuento crea solicitudes duplicadas');

// 3) admin aprueba en dos pestañas al mismo tiempo (doble aprobación)
for (const p of [adm.p, adm2.p]) { await p.goto(BASE + '/app/autorizaciones'); }
n0 = await quotes();
await shot(adm.p, 'n2-admin-pendiente', false);
await Promise.all([adm.p.getByRole('button', { name: 'Autorizar' }).first().click(), adm2.p.getByRole('button', { name: 'Autorizar' }).first().click()]);
await adm.p.waitForTimeout(3500);
const msgA = (await adm.p.locator('main').innerText()).replace(/\s+/g, ' ');
const msgB = (await adm2.p.locator('main').innerText()).replace(/\s+/g, ' ');
log('cotizaciones nuevas tras doble aprobación simultánea:', (await quotes()) - n0, '| solicitudes', JSON.stringify(await reqs()));
log('pestaña 1 dice:', (msgA.match(/(ya fue resuelta|autoriz[^.]*\.)/i) || [''])[0], '| pestaña 2 dice:', (msgB.match(/(ya fue resuelta|autoriz[^.]*\.)/i) || [''])[0]);
if ((await quotes()) - n0 !== 1) fail('doble aprobación simultánea: se crearon ' + ((await quotes()) - n0) + ' cotizaciones');
else ok('doble aprobación simultánea crea una sola cotización');
// aprobar de nuevo con una página vieja
await adm2.p.reload();
const q1 = (await sql('select q.discount, u.email from quotes q join users u on u.id=q.created_by_id where q.organization_id=$1 order by q.created_at desc limit 1', [d.org]))[0];
log('cotización aprobada: descuento', q1.discount, 'a nombre de', q1.email);

// 4) rechazar
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
await quote(as1.p, { discount: Math.round(price * 0.3) });
await adm.p.goto(BASE + '/app/autorizaciones');
n0 = await quotes();
await adm.p.locator('input[name=note]').first().fill('No: está muy bajo');
await adm.p.getByRole('button', { name: 'Rechazar' }).first().click();
await adm.p.waitForTimeout(2500);
log('tras rechazar: cotizaciones +', (await quotes()) - n0, JSON.stringify(await reqs()));
if ((await quotes()) - n0 !== 0) fail('un rechazo creó una cotización');
await as1.p.goto(BASE + '/app/autorizaciones');
log('asesor ve:', (await as1.p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 220));
await shot(as1.p, 'n2-asesor-rechazada-cel', false);
// el asesor repite el mismo descuento tras el rechazo
await quote(as1.p, { discount: Math.round(price * 0.3) });
log('tras repetir después de rechazo:', JSON.stringify((await reqs()).map(x => x.status)));

// 5) evasión: el asesor edita/abre la cotización aprobada; intenta URL de edición; altera parámetros
const approvedQuote = q1 && (await sql('select id from quotes where organization_id=$1 order by created_at desc limit 1', [d.org]))[0].id;
await as1.p.goto(`${BASE}/app/cotizador/${approvedQuote}`);
const txt = await as1.p.locator('main').innerText();
log('la cotización aprobada tiene botones de edición:', await as1.p.getByRole('button', { name: /editar|guardar|recalcular/i }).count(), '| enlaces a editar:', await as1.p.locator('a[href*="editar"]').count());
for (const path of [`/app/cotizador/${approvedQuote}/editar`, `/app/cotizador/${approvedQuote}/edit`]) {
  const resp = await as1.p.goto(BASE + path); log('GET', path, '->', resp.status());
}
// 6) evasión por tasa/enganche: financiamiento sin intereses a 360 meses sin autorización
n0 = await quotes();
r = await quote(as1.p, { discount: 0, rate: '0', months: '360', pct: '0' });
const hid = (await sql('select discount, down_payment_pct, months, annual_rate_pct, monthly_payment, total_paid from quotes where organization_id=$1 order by created_at desc limit 1', [d.org]))[0];
log('cotización 0% enganche, 360 meses, 0% interés sin pedir permiso ->', (await quotes()) - n0 === 1 ? JSON.stringify(hid) : r.status);
const implied = 1 - 1 / Math.pow(1 + 0.10 / 12, 360 / 2) ;
if ((await quotes()) - n0 === 1) fail('B32 sigue abierto: financiamiento a 360 meses SIN intereses y SIN enganche lo puede dar un asesor sin autorización'); else ok('B32: 360 meses, 0% enganche, 0% interés queda pendiente de autorización: ' + r.status.slice(0, 160));

// 7) venta por debajo del tope: 95% pasa, 94% queda pendiente
await sql("update leads set unit_id=$2, stage='CONTACTADO' where id=$1", [lead.id, unit.id]);
await sql("update units set status='DISPONIBLE' where id=$1", [unit.id]);
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
async function sell(amount) {
  await as1.p.goto(`${BASE}/app/leads/${lead.id}`);
  await as1.p.waitForSelector('#stage-control'); await as1.p.waitForTimeout(400);
  await as1.p.selectOption('#stage-control', { label: 'Vendido' });
  await as1.p.locator('dialog[open]').waitFor();
  await as1.p.fill('#saleAmount', String(amount));
  await as1.p.locator('dialog[open]').getByRole('button', { name: 'Confirmar' }).click();
  await as1.p.waitForTimeout(2600);
  return (await sql('select stage, sale_amount from leads where id=$1', [lead.id]))[0];
}
let s = await sell(Math.round(price * 0.94));
log('venta al 94% ->', JSON.stringify(s), '| solicitudes', JSON.stringify(await reqs()));
if (s.stage === 'VENDIDO') fail('venta al 94% (bajo el tope) pasó sin autorización');
await adm.p.goto(BASE + '/app/autorizaciones');
if (await adm.p.getByRole('button', { name: 'Autorizar' }).count()) {
  await adm.p.getByRole('button', { name: 'Autorizar' }).first().click(); await adm.p.waitForTimeout(3000);
  log('admin autoriza la venta ->', JSON.stringify((await sql('select stage, sale_amount from leads where id=$1', [lead.id]))[0]));
  // el admin autoriza una venta cuyo lote fue tomado por otro mientras tanto
}
await sql("update leads set stage='CONTACTADO', sale_amount=null where id=$1", [lead.id]);
await sql("update units set status='DISPONIBLE' where id=$1", [unit.id]);

// 8) solicitud pendiente y el lote se vende antes de la aprobación
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
await quote(as1.p, { discount: Math.round(price * 0.25) });
await sql("update units set status='VENDIDO' where id=$1", [unit.id]);
await adm.p.goto(BASE + '/app/autorizaciones');
n0 = await quotes();
await adm.p.getByRole('button', { name: 'Autorizar' }).first().click(); await adm.p.waitForTimeout(3000);
log('aprobar descuento de un lote ya vendido ->', (await adm.p.locator('[role=alert], .text-red-600, .text-red-700').allInnerTexts()).join(' | ').slice(0, 160), '| cotizaciones +', (await quotes()) - n0, JSON.stringify(await reqs()));
if ((await quotes()) - n0 > 0) fail('se aprobó un descuento sobre un lote vendido');
await sql("update units set status='DISPONIBLE' where id=$1", [unit.id]);

// 9) tope cambia después de la solicitud: el admin sube el tope a 30% y antes de aprobar el asesor repite
await sql('delete from authorization_requests where organization_id=$1', [d.org]);
await b.close();
finish();
