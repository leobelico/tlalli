// Pasada 2, punto 1: B01-B05 con concurrencia y con "Deshacer". Build de producción, dos asesores reales.
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, demo, invariants, resetRace, pickLeads, openMove, confirmBtn, stageErr, sql, shot, setUnitUI, BASE } from './n-lib.mjs';
const d = await demo();
const b = await browser();
const a1 = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
const a2 = await login(b, 'asesor2@potosi.ejemplo.test', { width: 1280, height: 800 });
const adm = await login(b, 'admin@potosi.ejemplo.test');
const { L1, L2 } = await pickLeads(d.org, d.users);
const [U, U2] = d.units;
log('lotes', U.code, U2.code, '| leads', L1.first_name, L2.first_name);
const holders = async (unit) => sql("select l.first_name, l.stage from leads l where l.unit_id=$1 and l.stage in ('APARTADO','VENDIDO')", [unit.id]);
const unitStatus = async (unit) => (await sql('select status from units where id=$1', [unit.id]))[0].status;
const undoBtn = (p) => p.getByRole('button', { name: /Deshacer/ });

// ---------- A) carrera: dos asesores apartan el mismo lote en el mismo segundo
log('A) carrera de apartado, 8 rondas');
let doubles = 0, bothFail = 0; const rawErrors = [];
for (let i = 0; i < 8; i++) {
  await resetRace(d, [L1.id, L2.id], U.id);
  await openMove(a1.p, L1.id, 'Apartado');
  await openMove(a2.p, L2.id, 'Apartado');
  await Promise.all([confirmBtn(a1.p).click(), confirmBtn(a2.p).click()]);
  await Promise.all([a1.p.waitForTimeout(2500), a2.p.waitForTimeout(2500)]);
  const h = await holders(U), st = await unitStatus(U);
  const e1 = await stageErr(a1.p), e2 = await stageErr(a2.p);
  if (h.length > 1) doubles++;
  if (h.length === 0) bothFail++;
  for (const e of [e1, e2]) if (e && (!/ya fue apartada por otro cliente|vendid/i.test(e) || /inesperado/i.test(e))) rawErrors.push(e);
  console.log(`   ronda ${i + 1}: titulares=${h.length} (${h.map(x => x.first_name).join(',')}) unidad=${st} errores: [${e1}] [${e2}]`);
  if (i === 0) { await shot(a1.p, 'n1-carrera-asesor1-cel', false); await shot(a2.p, 'n1-carrera-asesor2', false); }
}
if (doubles) fail(`B01 doble apartado en carrera: ${doubles} de 8 rondas dejaron 2 titulares`); else ok('B01 carrera: nunca hubo 2 titulares en 8 rondas');
if (bothFail) fail(`carrera: en ${bothFail} rondas ninguno pudo apartar`);
if (rawErrors.length) fail('mensaje de error no amable en la carrera: ' + rawErrors.join(' || ')); else ok('el perdedor de la carrera ve un mensaje en español');

// ---------- B) deshacer un apartado y que el otro asesor lo tome enseguida
log('B) asesor1 aparta, deshace; asesor2 aparta de inmediato');
await resetRace(d, [L1.id, L2.id], U.id);
await openMove(a1.p, L1.id, 'Apartado'); await confirmBtn(a1.p).click();
await undoBtn(a1.p).waitFor({ timeout: 8000 });
await openMove(a2.p, L2.id, 'Apartado'); await confirmBtn(a2.p).click(); await a2.p.waitForTimeout(2000);
log('asesor2 intenta mientras asesor1 aún puede deshacer ->', (await stageErr(a2.p)) || '(sin error)', '| titulares', JSON.stringify(await holders(U)));
await a1.p.bringToFront();
if (await undoBtn(a1.p).count()) { await undoBtn(a1.p).click(); await a1.p.waitForTimeout(2000); }
await openMove(a2.p, L2.id, 'Apartado'); await confirmBtn(a2.p).click(); await a2.p.waitForTimeout(2200);
const hB = await holders(U);
if (hB.length === 1 && hB[0].first_name === L2.first_name) ok('tras deshacer, el otro asesor apartó el lote'); else fail('B) tras deshacer, el lote no quedó con asesor2: ' + JSON.stringify(hB) + ' ' + (await stageErr(a2.p)));

// ---------- C) deshacer vs apartar en el mismo instante
log('C) deshacer vs apartar al mismo tiempo (6 rondas)');
let incons = 0;
for (let i = 0; i < 6; i++) {
  await resetRace(d, [L1.id, L2.id], U.id);
  await openMove(a1.p, L1.id, 'Apartado'); await confirmBtn(a1.p).click();
  await undoBtn(a1.p).waitFor({ timeout: 8000 });
  await openMove(a2.p, L2.id, 'Apartado');
  await a1.p.bringToFront();
  await Promise.all([undoBtn(a1.p).click(), confirmBtn(a2.p).click()]);
  await a1.p.waitForTimeout(2800);
  const inv = await invariants(d.org, [U.id]); const h = await holders(U);
  console.log(`   ronda ${i + 1}: titulares=${h.map(x => x.first_name + ':' + x.stage)} unidad=${await unitStatus(U)} incoherencias=${JSON.stringify(inv)} err2=[${await stageErr(a2.p)}]`);
  if (inv.length) incons++;
}
if (incons) fail(`C) ${incons} rondas dejaron inventario incoherente`); else ok('C) deshacer y apartar simultáneos dejan el inventario coherente');

// ---------- D) deshacer un apartado cuyo lote cambió de manos (cambio de unidad del lead en otra pestaña)
log('D) deshacer después de que el lote fue tomado por otro');
await resetRace(d, [L1.id, L2.id], U.id);
await openMove(a1.p, L1.id, 'Apartado'); await confirmBtn(a1.p).click();
await undoBtn(a1.p).waitFor({ timeout: 8000 });
const tab = await a1.ctx.newPage();
const e = await setUnitUI(tab, L1.id, U2.code);
log('cambio de unidad del lead apartado ->', e || '(sin error)', '| lote U:', await unitStatus(U), '| lote U2:', await unitStatus(U2));
await openMove(a2.p, L2.id, 'Apartado'); await confirmBtn(a2.p).click(); await a2.p.waitForTimeout(2200);
log('asesor2 aparta U ->', (await stageErr(a2.p)) || 'ok', '| titulares U', JSON.stringify(await holders(U)));
await a1.p.bringToFront();
if (await undoBtn(a1.p).count()) { await undoBtn(a1.p).click(); await a1.p.waitForTimeout(2500); log('asesor1 deshace; error:', (await stageErr(a1.p)) || '(ninguno)'); }
else log('el botón Deshacer ya había desaparecido (toast de 10 s)');
const invD = await invariants(d.org, [U.id, U2.id]);
if ((await unitStatus(U)) !== 'APARTADO' || (await unitStatus(U2)) !== 'DISPONIBLE') fail('D) tras Deshacer: lote X=' + (await unitStatus(U)) + ' (debía seguir Apartado por el otro cliente), lote Y=' + (await unitStatus(U2)) + ' (debía quedar Disponible)');
log('estado final U:', await unitStatus(U), JSON.stringify(await holders(U)), '| U2:', await unitStatus(U2), JSON.stringify(await holders(U2)));
if (invD.length) fail('D) inventario incoherente tras deshacer un apartado cuyo lote ya cambió de manos: ' + JSON.stringify(invD)); else ok('D) coherente');
await shot(tab, 'n1-D-estado', false);

// ---------- E) doble clic en Deshacer
log('E) doble Deshacer');
await resetRace(d, [L1.id, L2.id], U.id);
await openMove(a1.p, L1.id, 'Apartado'); await confirmBtn(a1.p).click();
await undoBtn(a1.p).waitFor({ timeout: 8000 });
await Promise.all([undoBtn(a1.p).click({ timeout: 2000 }).catch(() => {}), undoBtn(a1.p).click({ timeout: 2000 }).catch(() => {})]);
await a1.p.waitForTimeout(2200);
log('tras doble clic: etapa', (await sql('select stage from leads where id=$1', [L1.id]))[0].stage, '| unidad', await unitStatus(U), '| error:', (await stageErr(a1.p)) || '(ninguno)');
log('eventos', JSON.stringify(await sql('select to_stage, undone_at is not null as deshecho from lead_stage_events where lead_id=$1 order by created_at desc limit 4', [L1.id])));

// ---------- F) ventas: $1, sin unidad, sobre precio de lista; deshacer venta
async function sellAs(page, leadId, amount) {
  await page.goto(`${BASE}/app/leads/${leadId}`);
  await page.waitForSelector('#stage-control');
  await page.waitForTimeout(400);
  await page.selectOption('#stage-control', { label: 'Vendido' });
  await page.locator('dialog[open]').waitFor();
  if (amount != null) await page.fill('#saleAmount', String(amount)).catch(() => {});
  await page.locator('dialog[open]').getByRole('button', { name: 'Confirmar' }).click();
  await page.waitForTimeout(2600);
  return { err: await stageErr(page), notice: (await page.locator('[role=status]').allInnerTexts()).join(' ').slice(0, 200) };
}
log('F) ventas');
await resetRace(d, [L1.id, L2.id], U.id);
let r = await sellAs(a1.p, L1.id, 1);
let row = (await sql('select stage, sale_amount from leads where id=$1', [L1.id]))[0];
log('B04 asesor vende por $1 ->', JSON.stringify(row), r);
if (row.stage === 'VENDIDO' && Number(row.sale_amount) < Number(U.price) * 0.5) fail('B04 un asesor vendió por $1');
await resetRace(d, [L1.id, L2.id], U.id);
await sql('update leads set unit_id=null where id=$1', [L1.id]);
r = await sellAs(a1.p, L1.id, 500000);
row = (await sql('select stage from leads where id=$1', [L1.id]))[0];
log('B03 venta sin unidad ->', row.stage, r);
if (row.stage === 'VENDIDO') fail('B03 se permitió vender sin unidad');
await resetRace(d, [L1.id, L2.id], U.id);
r = await sellAs(a1.p, L1.id, Math.round(Number(U.price)));
row = (await sql('select stage, sale_amount from leads where id=$1', [L1.id]))[0];
log('venta al precio de lista (asesor) ->', JSON.stringify(row), '| unidad', await unitStatus(U), '| botón Deshacer visible:', await undoBtn(a1.p).count());
await shot(a1.p, 'n1-F-venta-deshacer-cel', false);
// F2) otro asesor intenta apartar mientras la venta puede deshacerse; luego se deshace
await openMove(a2.p, L2.id, 'Apartado'); await confirmBtn(a2.p).click(); await a2.p.waitForTimeout(2000);
log('asesor2 aparta lote vendido ->', (await stageErr(a2.p)) || '(¡sin error!)');
// G) deshacer una VENTA: otro asesor no puede apartar mientras tanto; tras deshacer sí puede
log('G) deshacer una venta');
await resetRace(d, [L1.id, L2.id], U.id);
await sellAs(a1.p, L1.id, Math.round(Number(U.price)));
await openMove(a2.p, L2.id, 'Apartado'); await confirmBtn(a2.p).click(); await a2.p.waitForTimeout(1800);
const gErr = await stageErr(a2.p);
log('asesor2 intenta apartar el lote vendido ->', gErr || '(¡sin error!)');
await a1.p.goto(`${BASE}/app/leads/${L1.id}`); // la página recargada ya no trae el aviso: se usa la ruta de datos
const soldRow = (await sql("select e.id from lead_stage_events e where e.lead_id=$1 and e.to_stage='VENDIDO' and e.undone_at is null order by e.created_at desc limit 1", [L1.id]))[0];
log('venta registrada (evento deshacible):', !!soldRow);
const gInv = await invariants(d.org, [U.id]);
if (gInv.length) fail('G) incoherencia tras vender: ' + JSON.stringify(gInv));
await b.close();
finish();
