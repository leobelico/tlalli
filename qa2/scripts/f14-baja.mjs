// B17: deactivating an asesor now asks who inherits the leads; afterwards they lose access.
import { browser, login, shot, BASE, sql, orgOf } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const log = (...a) => console.log('===', ...a);
const orgA = await orgOf(acc.A.email);
const asesorId = (await sql('select id from users where email=$1', [acc.ASESOR.email]))[0].id;
const adminId = (await sql('select id from users where email=$1', [acc.A.email]))[0].id;
const open = async (id) => (await sql("select count(*)::int n from leads where organization_id=$1 and assigned_to_id=$2 and stage not in ('VENDIDO','PERDIDO')", [orgA, id]))[0].n;

const as = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password });
const { p } = await login(b, acc.A.email, { password: acc.A.password });
log('leads abiertos de la asesora antes de la baja', await open(asesorId));
await p.goto(BASE + '/app/equipo');
const row = p.locator('tr', { hasText: acc.ASESOR.email });
await row.locator('summary', { hasText: 'Desactivar' }).click();
log('pregunta', (await row.locator('details form').innerText()).replace(/\s+/g, ' ').slice(0, 170));
await shot(p, 'f14-baja-asesor', false);
await row.locator('select[name=reassignTo]').selectOption(adminId);
await row.getByRole('button', { name: 'Desactivar y reasignar' }).click();
await p.waitForTimeout(3000);
log('resultado', await p.locator('.text-emerald-700').allInnerTexts());
log('leads abiertos de la asesora después', await open(asesorId), '| del admin', await open(adminId));
await as.p.goto(BASE + '/app/leads');
log('asesora dada de baja termina en', as.p.url().replace(BASE, ''), '|', (await as.p.locator('[role=alert]').allInnerTexts()).join(' ').slice(0, 140));
await shot(as.p, 'f14-asesor-dado-de-baja', false);
await b.close();
