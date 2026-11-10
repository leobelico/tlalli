import { sql, BASE, shot } from './lib.mjs';
export { sql, BASE, shot };
export const log = (...a) => console.log('===', ...a);
let failures = 0;
export const fail = (m) => { failures++; console.log('HALLAZGO:', m); };
export const ok = (m) => console.log('ok  :', m);
export const finish = () => { console.log(failures ? `\n${failures} hallazgos` : '\nSin hallazgos'); };
export const hallazgos = () => failures;

export async function demo() {
  const org = (await sql("select id from organizations where slug='demo-potosi'"))[0].id;
  const users = Object.fromEntries((await sql("select u.id, u.email from users u join memberships m on m.user_id=u.id where m.organization_id=$1", [org])).map(r => [r.email.split('@')[0], r.id]));
  const units = await sql("select u.id, u.code, u.price from units u join developments d on d.id=u.development_id where u.organization_id=$1 and d.name='Residencial Los Pinos' order by u.code limit 6 offset 3", [org]);
  return { org, users, units };
}
/** Units whose status disagrees with the leads that hold them. */
export async function invariants(org, ids) {
  return sql(`select u.code, u.status, count(l.*) filter (where l.stage='APARTADO')::int apartados, count(l.*) filter (where l.stage='VENDIDO')::int vendidos
    from units u left join leads l on l.unit_id=u.id
    where u.organization_id=$1 and ($2::uuid[] is null or u.id = any($2::uuid[]))
    group by u.id, u.code, u.status
    having (u.status='APARTADO' and count(l.*) filter (where l.stage='APARTADO')<>1)
        or (u.status='VENDIDO' and count(l.*) filter (where l.stage='VENDIDO')<>1)
        or (u.status='DISPONIBLE' and count(l.*) filter (where l.stage in ('APARTADO','VENDIDO'))>0)`, [org, ids ?? null]);
}
export async function resetRace({ org, units }, leadIds, unitId) {
  await sql("update units set status='DISPONIBLE' where organization_id=$1 and id = any($2)", [org, units.map(u => u.id)]);
  // restos de corridas anteriores: ningún otro lead debe tener esos lotes apartados o vendidos
  await sql("update leads set stage='CONTACTADO', sale_amount=null where organization_id=$1 and unit_id = any($2) and stage in ('APARTADO','VENDIDO')", [org, units.map(u => u.id)]);
  for (const id of leadIds) await sql("update leads set stage='CONTACTADO', unit_id=$2, sale_amount=null where id=$1", [id, unitId]);
}
export async function pickLeads(org, users) {
  const get = async (uid, skip = 0) => (await sql("select id, first_name from leads where organization_id=$1 and assigned_to_id=$2 and stage in ('NUEVO','CONTACTADO','CITA_AGENDADA') order by id limit 1 offset $3", [org, uid, skip]))[0];
  return { L1: await get(users.asesor1), L2: await get(users.asesor2), L1b: await get(users.asesor1, 1) };
}
export async function openMove(p, leadId, label) {
  await p.goto(`${BASE}/app/leads/${leadId}`, { waitUntil: 'load' });
  await p.waitForSelector('#stage-control');
  await p.waitForTimeout(400);
  await p.selectOption('#stage-control', { label });
  await p.locator('dialog[open]').waitFor({ timeout: 8000 });
}
export const confirmBtn = (p) => p.locator('dialog[open]').getByRole('button', { name: 'Mover' });
export const stageErr = async (p) => (await p.locator('#stage-control ~ span.text-red-600').allInnerTexts()).join(' | ');
export async function setUnitUI(p, leadId, label) {
  await p.goto(`${BASE}/app/leads/${leadId}`);
  await p.locator('summary', { hasText: 'Editar datos' }).click();
  await p.locator('select[name=developmentId]').selectOption({ label: 'Residencial Los Pinos' }).catch(() => {});
  await p.waitForTimeout(300);
  const opts = await p.locator('select[name=unitId] option').allInnerTexts();
  const o = opts.find(t => t.startsWith(label + ' '));
  if (!o) throw new Error('no hay unidad ' + label + ' entre ' + opts.slice(0, 5));
  await p.locator('select[name=unitId]').selectOption({ label: o });
  await p.getByRole('button', { name: /guardar/i }).last().click();
  await p.waitForTimeout(1800);
  return (await p.locator('[role=alert], .text-red-600, .text-red-700').allInnerTexts()).join(' | ');
}
