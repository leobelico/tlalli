// Pasada 2, punto 6: alerta de frío con datos controlados (umbral por etapa, cita/tarea futura, 5 más urgentes).
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const adminId = (await sql('select id from users where email=$1', [acc.A.email]))[0].id;
const org = (await sql('select organization_id id from memberships where user_id=$1', [adminId]))[0].id;
await sql("update organizations set stale_lead_hours=24, stale_hours_by_stage='{}'::jsonb where id=$1", [org]);
await sql('delete from tasks where organization_id=$1', [org]);
await sql("update memberships set active=true where organization_id=$1 and user_id<>$2", [org, adminId]);
const ids = (await sql('select id from leads where organization_id=$1 order by id', [org])).map((r) => r.id);
while (ids.length < 14) { // completa hasta 14 por si faltan
  await sql("insert into leads (id, organization_id, first_name, phone, stage, source, created_at, updated_at, assigned_to_id) values (gen_random_uuid(), $1, 'Extra'||$2::text, '+52444700'||lpad($2::text,4,'0'), 'NUEVO', 'MANUAL', now(), now(), $3)", [org, ids.length, adminId]).catch(() => {});
  break;
}
const rows = [
  // [etiqueta, etapa, horas desde último contacto (null = nunca), horas desde creación, tarea]
  ['L1 nuevo 30h sin contacto', 'NUEVO', null, 30, null, true],
  ['L2 nuevo 10h', 'NUEVO', null, 10, null, false],
  ['L3 contactado 80h', 'CONTACTADO', 80, 300, null, true],
  ['L4 contactado 60h', 'CONTACTADO', 60, 300, null, false],
  ['L5 cita 100h', 'CITA_AGENDADA', 100, 300, null, false],
  ['L6 cita 200h', 'CITA_AGENDADA', 200, 400, null, true],
  ['L7 contactado 200h con tarea futura', 'CONTACTADO', 200, 400, '+48 hours', false],
  ['L8 cotización 130h', 'COTIZACION', 130, 400, null, true],
  ['L9 visita 73h', 'VISITA_REALIZADA', 73, 300, null, true],
  ['L10 nuevo 100h', 'NUEVO', null, 100, null, true],
  ['L11 contactado 90h', 'CONTACTADO', 90, 300, null, true],
  ['L12 vendido 900h', 'VENDIDO', 900, 1000, null, false],
  ['L13 perdido 900h', 'PERDIDO', 900, 1000, null, false],
  ['L14 contactado 1000h, tarea vencida', 'CONTACTADO', 1000, 1100, '-24 hours', true],
];
const all = (await sql('select id from leads where organization_id=$1 order by id', [org])).map((r) => r.id);
const names = {};
for (let i = 0; i < rows.length && i < all.length; i++) {
  const [label, stage, lastH, createdH, task] = rows[i];
  await sql(`update leads set first_name=$2, last_name=null, stage=$3::"Stage", assigned_to_id=$6,
    last_contact_at = case when $4::int is null then null else now() - ($4::int || ' hours')::interval end,
    created_at = now() - ($5::int || ' hours')::interval, unit_id=null where id=$1`, [all[i], label.split(' ')[0], stage, lastH, createdH, adminId]);
  if (task) await sql(`insert into tasks (id, organization_id, lead_id, assigned_to_id, created_by_id, title, due_at) values (gen_random_uuid(), $1, $2, $3, $3, 'Seguimiento', now() + $4::interval)`, [org, all[i], adminId, task]);
  names[label.split(' ')[0]] = label;
}
const expected = rows.filter((r) => r[5]).map((r) => r[0].split(' ')[0]);
log('esperados fríos con los umbrales por defecto:', expected.join(','), `(${expected.length})`);
const extra = all.slice(rows.length);
if (extra.length) await sql("update leads set stage='PERDIDO' where id = any($1)", [extra]);

const b = await browser();
const adm = await login(b, acc.A.email, { password: acc.A.password, width: 390, height: 844 });
await adm.p.goto(BASE + '/app');
const bannerText = async () => (await adm.p.locator('[role=status]').first().innerText()).replace(/\s+/g, ' ');
let t = await bannerText();
log('banner (celular):', t);
await shot(adm.p, 'n6-banner-cel', false);
const shown = [...t.matchAll(/L\d+/g)].map((m) => m[0]);
const total = Number((t.match(/ver los (\d+) fríos/) || [])[1] ?? NaN);
log('nombres en el banner:', shown.join(','), '| total declarado:', total);
if (shown.length !== 5) fail('el banner no lista exactamente 5 nombres: ' + shown.length);
if (total !== expected.length) fail(`el total de fríos declarado (${total}) no coincide con el esperado (${expected.length})`); else ok('total de fríos = ' + total + ' según umbrales por etapa');
// los que NO deben aparecer
for (const n of ['L2', 'L4', 'L5', 'L7', 'L12', 'L13']) if (shown.includes(n)) fail(`${n} aparece como frío y no debería (${names[n]})`);
// orden esperado por el producto: sin contacto primero y luego el más antiguo
const expOrder = (await sql(`select first_name from leads where organization_id=$1 and first_name in (${expected.map((e) => `'${e}'`).join(',')}) order by last_contact_at asc nulls first, created_at asc limit 5`, [org])).map((r) => r.first_name);
log('orden por contacto más antiguo (lo que implementa el producto):', expOrder.join(','), '| el banner:', shown.join(','));
// ¿"más urgente" respeta el umbral de cada etapa? exceso sobre el umbral
const over = { L1: 30 - 24, L3: 80 - 72, L6: 200 - 168, L8: 130 - 120, L9: 73 - 72, L10: 100 - 24, L11: 90 - 72, L14: 1000 - 72 };
const byOver = Object.entries(over).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k]) => k);
log('orden por horas de atraso respecto al umbral de su etapa:', byOver.join(','));
const lst = await (async () => { await adm.p.goto(BASE + '/app/leads?frios=1'); return (await adm.p.locator('main').innerText()).match(/L\d+/g) ?? []; })();
const lstU = [...new Set(lst)];
log('lista "fríos":', lstU.join(','), `(${lstU.length})`);
if (lstU.length !== expected.length) fail(`la lista de fríos tiene ${lstU.length} y se esperaban ${expected.length}`);
await shot(adm.p, 'n6-lista-frios-cel', false);
// tarea futura creada ahora para un frío -> deja de ser frío (L10)
await sql(`insert into tasks (id, organization_id, lead_id, assigned_to_id, created_by_id, title, due_at) select gen_random_uuid(), organization_id, id, $2, $2, 'Llamar mañana', now() + interval '1 day' from leads where organization_id=$1 and first_name='L10'`, [org, adminId]);
await adm.p.goto(BASE + '/app');
t = await bannerText();
log('tras agendar tarea futura a L10:', t.slice(0, 200));
if (/L10\b/.test(t)) fail('un lead con tarea futura sigue apareciendo como urgente');
// umbral por etapa desde la pantalla de Configuración: CONTACTADO 48 h -> L4 (60h) se vuelve frío
const d = await login(b, acc.A.email, { password: acc.A.password });
await d.p.goto(BASE + '/app/configuracion');
const f = d.p.locator('input[name=hours_CONTACTADO], input[name*=CONTACTADO]').first();
log('campo de umbral por etapa visible:', await f.count());
if (await f.count()) {
  await f.fill('48');
  await f.locator('xpath=ancestor::form').getByRole('button').first().click();
  await d.p.waitForTimeout(2200);
  await d.p.goto(BASE + '/app/leads?frios=1');
  const l2 = [...new Set((await d.p.locator('main').innerText()).match(/L\d+/g) ?? [])];
  log('con CONTACTADO=48 h, fríos:', l2.join(','));
  if (!l2.includes('L4')) fail('el umbral por etapa configurado (48 h) no hizo frío a un lead de 60 h');
  else ok('el umbral por etapa configurado desde la pantalla surte efecto');
  await shot(d.p, 'n6-lista-frios-umbral48', false);
}
// ruido: 0 ó 1 fríos; texto sin "(0)"
await sql("update leads set last_contact_at=now() where organization_id=$1", [org]);
await adm.p.goto(BASE + '/app');
log('sin fríos el banner dice:', await adm.p.locator('[role=status]').count() ? (await bannerText()).slice(0, 160) : '(sin banner)');
await b.close();
finish();
