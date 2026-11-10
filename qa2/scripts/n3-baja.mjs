// Pasada 2, punto 3: baja de asesor con sesión abierta, solicitud pendiente, reasignación masiva y aislamiento.
import { browser, login } from './lib.mjs';
import { log, fail, ok, finish, sql, shot, BASE } from './n-lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const ids = async (email) => (await sql('select id from users where email=$1', [email]))[0].id;
const adminId = await ids(acc.A.email), asesorId = await ids(acc.ASESOR.email);
const org = (await sql('select m.organization_id id from memberships m where user_id=$1', [adminId]))[0].id;
const orgB = (await sql('select m.organization_id id from memberships m join users u on u.id=m.user_id where u.email=$1', [acc.B.email]))[0].id;
const count = async (q, ...p) => Number((await sql(q, p))[0].n);

// preparar: el asesor tiene leads abiertos, una tarea y una solicitud de descuento pendiente
await sql("update leads set assigned_to_id=$2 where organization_id=$1 and id in (select id from leads where organization_id=$1 order by id limit 12)", [org, asesorId]);
const lead = (await sql("select id from leads where assigned_to_id=$1 and stage in ('NUEVO','CONTACTADO') limit 1", [asesorId]))[0];
const unit = (await sql("select id, code, price from units where organization_id=$1 and status='DISPONIBLE' limit 1", [org]))[0];
const as = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password, width: 390, height: 844 });
await as.p.goto(`${BASE}/app/cotizador?lead=${lead.id}&unidad=${unit.id}`);
await as.p.selectOption('select[name=unitId]', unit.id);
await as.p.fill('[name=discount]', String(Math.round(Number(unit.price) * 0.3)));
await as.p.getByRole('button', { name: /cotiz|generar|guardar/i }).first().click();
await as.p.waitForTimeout(2500);
log('solicitudes pendientes antes de la baja:', await count("select count(*)::int n from authorization_requests where organization_id=$1 and requested_by_id=$2 and status='PENDIENTE'", org, asesorId));
// una pestaña de la asesora queda abierta en un lead (sesión "a medias")
const openTab = await as.ctx.newPage();
await openTab.goto(`${BASE}/app/leads/${lead.id}`);
await openTab.waitForSelector('#stage-control');
const quoteForPdf = (await sql('select id from quotes where organization_id=$1 limit 1', [org]))[0]?.id;
const before = {
  leads: await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2 and stage not in ('VENDIDO','PERDIDO')", org, asesorId),
  tareas: await count("select count(*)::int n from tasks where organization_id=$1 and assigned_to_id=$2 and completed_at is null", org, asesorId),
};
log('antes de la baja', JSON.stringify(before));

// la baja, con el administrador y su opción de heredero
const adm = await login(b, acc.A.email, { password: acc.A.password });
await adm.p.goto(BASE + '/app/equipo');
const row = adm.p.locator('tr', { hasText: acc.ASESOR.email });
await row.locator('summary', { hasText: 'Desactivar' }).click();
const opts = await row.locator('select[name=reassignTo] option').allInnerTexts();
log('opciones de heredero:', JSON.stringify(opts));
await shot(adm.p, 'n3-baja-pregunta', false);
// intento sin elegir heredero
await row.getByRole('button', { name: 'Desactivar y reasignar' }).click();
await adm.p.waitForTimeout(1500);
log('sin elegir heredero ->', JSON.stringify(await sql('select active from memberships where user_id=$1 and organization_id=$2', [asesorId, org])));
await row.locator('select[name=reassignTo]').selectOption(adminId);
await row.getByRole('button', { name: 'Desactivar y reasignar' }).click();
await adm.p.waitForTimeout(3000);
log('mensaje:', (await adm.p.locator('.text-emerald-700, [role=status]').allInnerTexts()).join(' | ').slice(0, 220));

const after = {
  activo: (await sql('select active from memberships where user_id=$1 and organization_id=$2', [asesorId, org]))[0].active,
  leadsAbiertosDelAsesor: await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2 and stage not in ('VENDIDO','PERDIDO')", org, asesorId),
  tareasAbiertasDelAsesor: await count("select count(*)::int n from tasks where organization_id=$1 and assigned_to_id=$2 and completed_at is null", org, asesorId),
  leadsAbiertosSinDueno: await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id is null and stage not in ('VENDIDO','PERDIDO')", org),
  leadsAbiertosAInactivos: await count("select count(*)::int n from leads l join memberships m on m.user_id=l.assigned_to_id and m.organization_id=l.organization_id where l.organization_id=$1 and m.active=false and l.stage not in ('VENDIDO','PERDIDO')", org),
  solicitudesPendientesDelAsesor: await count("select count(*)::int n from authorization_requests where organization_id=$1 and requested_by_id=$2 and status='PENDIENTE'", org, asesorId),
};
log('después de la baja', JSON.stringify(after));
if (after.activo) fail('la baja no desactivó al asesor');
if (after.leadsAbiertosAInactivos || after.leadsAbiertosDelAsesor) fail('quedaron leads abiertos asignados a un usuario inactivo');
if (after.solicitudesPendientesDelAsesor) fail('B36: la solicitud del asesor dado de baja sigue a su nombre'); else ok('B36: ninguna solicitud pendiente a nombre del asesor dado de baja');

// sesión abierta de la asesora dada de baja
await as.p.goto(BASE + '/app/leads');
log('asesora dada de baja con sesión abierta -> navega /app/leads y termina en', as.p.url().replace(BASE, ''), '|', (await as.p.locator('[role=alert]').allInnerTexts()).join(' ').slice(0, 120));
if (/\/app\/leads$/.test(as.p.url())) fail('asesora dada de baja sigue viendo /app/leads');
// la pestaña vieja intenta mover una etapa (acción de servidor con sesión aún válida)
const stageBefore = (await sql('select stage from leads where id=$1', [lead.id]))[0].stage;
await openTab.selectOption('#stage-control', { label: 'Contactado' }).catch(() => {});
await openTab.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click({ timeout: 4000 }).catch(() => {});
await openTab.waitForTimeout(2500);
const stageAfter = (await sql('select stage, assigned_to_id from leads where id=$1', [lead.id]))[0];
log('pestaña vieja intentó mover la etapa:', stageBefore, '->', stageAfter.stage, '| dueño ahora', stageAfter.assigned_to_id === adminId ? 'admin' : stageAfter.assigned_to_id, '| mensaje:', (await openTab.locator('span.text-red-600').allInnerTexts()).join(' ').slice(0, 150));
if (stageAfter.stage !== stageBefore && stageBefore !== 'CONTACTADO') fail('la pestaña de un asesor dado de baja pudo cambiar una etapa');
// API de PDF y llamadas directas con sus cookies
const cookies = await as.ctx.cookies();
const ch = cookies.map(c => `${c.name}=${c.value}`).join('; ');
for (const path of [`/api/quotes/${quoteForPdf}`, `/api/quotes/${quoteForPdf}/pdf`, '/app/leads', '/app/autorizaciones']) {
  const resp = await fetch(BASE + path, { headers: { cookie: ch }, redirect: 'manual' });
  log('con cookies de la asesora dada de baja GET', path, '->', resp.status, resp.headers.get('location') || '');
  if (resp.status === 200 && path.startsWith('/api')) fail('API entrega PDF a un usuario dado de baja: ' + path);
}
// correo de aprobación a la asesora desactivada: aprobar su solicitud (si sigue pendiente)
await adm.p.goto(BASE + '/app/autorizaciones');
log('solicitudes visibles para aprobar tras la baja:', await adm.p.getByRole('button', { name: 'Autorizar' }).count());
const nq = await count('select count(*)::int n from quotes where organization_id=$1', org);
if (await adm.p.getByRole('button', { name: 'Autorizar' }).count()) {
  await shot(adm.p, 'n3-solicitud-de-baja', false);
  await adm.p.getByRole('button', { name: 'Autorizar' }).first().click(); await adm.p.waitForTimeout(3000);
  const q = (await sql('select q.created_by_id, q.lead_id from quotes q where organization_id=$1 order by created_at desc limit 1', [org]))[0];
  if (false) {}
  if (q.created_by_id === asesorId) fail('B36: la cotización aprobada quedó a nombre del asesor dado de baja');
  log('el admin aprueba la solicitud del asesor dado de baja -> cotizaciones +', (await count('select count(*)::int n from quotes where organization_id=$1', org)) - nq, '| autor', q.created_by_id === asesorId ? 'el asesor INACTIVO' : 'otro', '| lead sigue con', (await sql('select assigned_to_id from leads where id=$1', [q.lead_id]))[0].assigned_to_id === adminId ? 'el admin (heredero)' : 'otro');
}

// reasignación masiva por filtros (admin): pasar los leads de la lista filtrada a otra persona; con filtro de etapa
await sql("update leads set assigned_to_id=$2 where organization_id=$1", [org, adminId]);
await adm.p.goto(BASE + '/app/leads?etapa=NUEVO');
const total = await count("select count(*)::int n from leads where organization_id=$1 and stage='NUEVO'", org);
await adm.p.locator('summary', { hasText: 'Reasignar los leads de esta lista' }).click();
const heirs = await adm.p.locator('select[name=to] option').allInnerTexts();
log('opciones del reasignador masivo:', JSON.stringify(heirs), '| leads NUEVO en la lista:', total);
await shot(adm.p, 'n3-reasignacion-masiva', false);
// aislamiento: el reasignador masivo no ofrece usuarios inactivos ni de otra organización
if (heirs.some(h => h.includes(acc.ASESOR.email) || /Rival/.test(h))) fail('el reasignador masivo ofrece a un usuario inactivo o de otra organización: ' + JSON.stringify(heirs));
// reasignación a la propia lista: las otras etapas no deben moverse
await sql("update leads set assigned_to_id=$2 where organization_id=$1 and stage<>'NUEVO'", [org, asesorId]);
const target = adminId;
await adm.p.locator('select[name=to]').selectOption(target);
await adm.p.getByRole('button', { name: /^Reasignar$/ }).click(); await adm.p.locator('dialog[open]').getByRole('button', { name: /^Reasignar \d+$/ }).click();
await adm.p.waitForTimeout(3000);
log('mensaje:', (await adm.p.locator('.text-emerald-700, [role=status]').allInnerTexts()).join(' | ').slice(0, 200));
log('NUEVO ahora con el admin:', await count("select count(*)::int n from leads where organization_id=$1 and stage='NUEVO' and assigned_to_id=$2", org, adminId), 'de', total, '| otras etapas siguen con el asesor:', await count("select count(*)::int n from leads where organization_id=$1 and stage<>'NUEVO' and assigned_to_id=$2", org, asesorId));
if (await count("select count(*)::int n from leads where organization_id=$1 and stage<>'NUEVO' and assigned_to_id=$2", org, asesorId) === 0) fail('la reasignación masiva con filtro movió leads fuera del filtro');
// aislamiento: ningún lead de la organización B cambió
log('leads de la organización B asignados a usuarios de A:', await count('select count(*)::int n from leads l join memberships m on m.user_id=l.assigned_to_id and m.organization_id=$2 where l.organization_id=$1', orgB, org));
// el reasignador no ofrece heredar a un usuario inactivo (asesorId inactivo): intento forzado cambiando el valor de la opción
await adm.p.goto(BASE + '/app/leads?stage=CONTACTADO');
await adm.p.locator('summary', { hasText: 'Reasignar los leads de esta lista' }).click();
const rival = (await sql("select id from users where email=$1", [acc.B.email]))[0].id;
await adm.p.evaluate(({ rival }) => { const s = document.querySelector('select[name=to]'); const o = document.createElement('option'); o.value = rival; o.text = 'rival'; s.add(o); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, rival); s.dispatchEvent(new Event('change', { bubbles: true })); }, { rival });
const beforeB = await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, rival);
await adm.p.getByRole('button', { name: /^Reasignar$/ }).click(); await adm.p.locator('dialog[open]').getByRole('button', { name: /^Reasignar \d+$/ }).click(); await adm.p.waitForTimeout(2500);
log('reasignar a un usuario de OTRA organización (valor forzado) ->', (await adm.p.locator('[role=alert], .text-red-600, .text-red-700').allInnerTexts()).join(' | ').slice(0, 160), '| leads de A en manos del rival:', await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, rival));
if (await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, rival) > beforeB) fail('se reasignaron leads a un usuario de otra organización');
// y a un usuario inactivo
await adm.p.goto(BASE + '/app/leads?stage=CONTACTADO');
await adm.p.locator('summary', { hasText: 'Reasignar los leads de esta lista' }).click();
await adm.p.evaluate(({ id }) => { const s = document.querySelector('select[name=to]'); const o = document.createElement('option'); o.value = id; o.text = 'inactivo'; s.add(o); Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value').set.call(s, id); s.dispatchEvent(new Event('change', { bubbles: true })); }, { id: asesorId });
const nBefore = await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, asesorId);
await adm.p.getByRole('button', { name: /^Reasignar$/ }).click(); await adm.p.locator('dialog[open]').getByRole('button', { name: /^Reasignar \d+$/ }).click(); await adm.p.waitForTimeout(2500);
log('reasignar a un usuario INACTIVO (valor forzado) ->', (await adm.p.locator('[role=alert], .text-red-600, .text-red-700').allInnerTexts()).join(' | ').slice(0, 160), '| leads del inactivo antes/después:', nBefore, await count("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2", org, asesorId));
await b.close();
finish();
