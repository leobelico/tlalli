// B37: reasignación masiva con filtro (?etapa=) y sin filtro: confirmación con el número de leads y Deshacer 10 s.
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const adminId = (await sql('select id from users where email=$1', [acc.A.email]))[0].id;
const org = (await sql('select organization_id id from memberships where user_id=$1', [adminId]))[0].id;
const other = (await sql("select id from users where email=$1", [acc.ASESOR.email]))[0].id;
await sql("update memberships set active=true where user_id=$1 and organization_id=$2", [other, org]);
const count = async (q, ...p) => Number((await sql(q, p))[0].n);
await sql("update leads set assigned_to_id=$2 where organization_id=$1", [org, adminId]);
const adm = await login(b, acc.A.email, { password: acc.A.password, width: 390, height: 844 });
let dialogsNative = 0; adm.p.on('dialog', (d) => { dialogsNative++; d.accept(); });
async function bulk(url, to) {
  await adm.p.goto(BASE + url);
  await adm.p.locator('summary', { hasText: 'Reasignar los leads de esta lista' }).click();
  await adm.p.locator('select[name=to]').selectOption(to);
  await adm.p.getByRole('button', { name: /^Reasignar$/ }).click();
  const dlg = adm.p.locator('dialog[open]');
  await dlg.waitFor({ timeout: 5000 });
  return dlg;
}
// 1) con filtro: el diálogo dice cuántos y a quién; Cancelar no cambia nada
let dlg = await bulk('/app/leads?etapa=COTIZACION', other);
const txt = (await dlg.innerText()).replace(/\s+/g, ' ');
log('diálogo (filtro):', txt);
const inStage = await count("select count(*)::int n from leads where organization_id=$1 and stage='COTIZACION'", org);
if (!txt.includes(String(inStage)) || !/Carla|\S+/.test(txt) || !/10 segundos/.test(txt)) fail('el diálogo no dice cuántos leads ni los 10 s: ' + txt);
await shot(adm.p, 'r4-reasignar-confirmacion-cel', false);
await dlg.getByRole('button', { name: 'Cancelar' }).click(); await adm.p.waitForTimeout(800);
if ((await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, other)) !== 0) fail('Cancelar movió leads'); else ok('Cancelar no mueve nada');
// 2) confirmar: se mueven solo los del filtro y aparece Deshacer; Deshacer los regresa
dlg = await bulk('/app/leads?etapa=COTIZACION', other);
await dlg.getByRole('button', { name: /^Reasignar \d+$/ }).click();
const undo = adm.p.getByRole('button', { name: /Deshacer/ }); await undo.waitFor({ timeout: 8000 });
const moved = await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, other);
log('con filtro etapa=COTIZACION se movieron', moved, 'de', inStage);
if (moved !== inStage) fail('el filtro de etapa no se respetó'); else ok('la reasignación respeta el filtro de etapa');
await shot(adm.p, 'r4-reasignar-deshacer-cel', false);
const ub = await undo.boundingBox(); if (ub.height < 44) fail('Deshacer mide ' + ub.height);
await undo.click(); await adm.p.waitForTimeout(2000);
const back = await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, other);
log('tras Deshacer, leads con el asesor:', back, '|', (await adm.p.locator('[role=status]').allInnerTexts()).join(' | ').slice(0, 160));
if (back !== 0) fail('Deshacer no regresó los leads'); else ok('Deshacer regresa los leads a su asesor anterior');
// 3) sin filtro: confirmación con el total de la organización y Deshacer
dlg = await bulk('/app/leads', 'none');
const t3 = (await dlg.innerText()).replace(/\s+/g, ' ');
log('diálogo (sin filtro):', t3);
const open = await count("select count(*)::int n from leads where organization_id=$1 and stage not in ('VENDIDO','PERDIDO')", org);
if (!t3.includes(String(open)) || !/todos los leads abiertos de la organización/.test(t3)) fail('el diálogo sin filtro no advierte que son todos: ' + t3); else ok('sin filtro: el diálogo avisa que son todos y cuántos (' + open + ')');
await dlg.getByRole('button', { name: /^Reasignar \d+$/ }).click();
await undo.waitFor({ timeout: 8000 });
log('sin dueño tras confirmar:', await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id is null", org));
await undo.click(); await adm.p.waitForTimeout(2000);
const sin = await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id is null", org);
log('sin dueño tras Deshacer:', sin);
if (sin !== 0) fail('Deshacer de toda la lista no restauró'); else ok('Deshacer restaura la lista completa');
if (dialogsNative) log('(diálogos nativos del navegador:', dialogsNative, ')');
await sql("update leads set assigned_to_id=$2 where organization_id=$1", [org, adminId]);
await sql("update memberships set active=false where user_id=$1 and organization_id=$2", [other, org]);
await b.close();
finish();
