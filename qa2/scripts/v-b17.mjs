// B17 verification: rescue orphaned leads via bulk reassignment, then deactivate with an heir.
import { browser, login, shot, BASE, sql, orgOf } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const orgA = await orgOf(acc.A.email);
const uid = async (email) => (await sql('select id from users where email=$1', [email]))[0].id;
const [adminId, asesorId] = [await uid(acc.A.email), await uid(acc.ASESOR.email)];
const openOf = async (id) => (await sql("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2 and stage not in ('VENDIDO','PERDIDO')", [orgA, id]))[0].n;
const log = (...a) => console.log('===', ...a);
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
p.on('dialog', (d) => d.accept());

// 1) Orphans from before the fix: filter by the inactive asesor and hand them to the admin.
log('abiertos de la asesora inactiva (antes)', await openOf(asesorId));
await p.goto(BASE + `/app/leads?asesor=${asesorId}`);
const opt = await p.locator('select[name=asesor] option:checked').innerText();
log('filtro muestra', opt);
await p.locator('summary', { hasText: 'Reasignar los leads de esta lista' }).click();
await p.selectOption('select[name=to]', adminId);
await p.getByRole('button', { name: 'Reasignar' }).click();
await p.getByText(/se reasignaron|No había leads/).waitFor({ timeout: 60000 });
log('mensaje', await p.getByText(/se reasignaron|No había leads/).innerText());
log('abiertos de la asesora inactiva (después)', await openOf(asesorId), '| del admin', await openOf(adminId));
await shot(p, 'v3-b17-reasignacion-masiva', false);

// 2) New flow: reactivate, give her 2 leads back, deactivate choosing an heir.
await p.goto(BASE + '/app/equipo');
const row = p.locator('tr', { hasText: acc.ASESOR.email });
await row.getByRole('button', { name: 'Reactivar' }).click();
await p.waitForTimeout(1500);
await sql("update leads set assigned_to_id=$1 where id in (select id from leads where organization_id=$2 and stage='NUEVO' limit 2)", [asesorId, orgA]);
await p.reload();
await row.locator('summary', { hasText: 'Desactivar' }).click();
log('panel', (await row.locator('details form').innerText()).replace(/\s+/g, ' '));
await shot(p, 'v3-b17-panel-baja', false);
await row.locator('select[name=reassignTo]').selectOption(adminId);
await row.getByRole('button', { name: 'Desactivar y reasignar' }).click();
await p.waitForTimeout(2500);
log('resultado', await p.locator('.text-emerald-700').allInnerTexts(), '| abiertos de ella', await openOf(asesorId));

// 3) She no longer gets in.
const as = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password }).catch(() => null);
const c = as ?? { p: await (await b.newContext()).newPage() };
if (!as) { await c.p.goto(BASE + '/login'); await c.p.fill('input[name=email]', acc.ASESOR.email); await c.p.fill('input[name=password]', acc.ASESOR.password); await c.p.click('button[type=submit]'); await c.p.waitForTimeout(3000); }
await c.p.goto(BASE + '/app/leads');
log('asesora dada de baja termina en', c.p.url().replace(BASE, ''), '|', (await c.p.locator('[role=alert]').allInnerTexts()).join(' '));
await shot(c.p, 'v3-b17-asesora-sin-acceso', false);
await b.close();
