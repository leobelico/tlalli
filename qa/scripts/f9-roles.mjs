import { browser, login, shot, BASE, sql, orgOf, leadByPhone } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const { devHref } = JSON.parse(fs.readFileSync('devA.json'));
const orgA = await orgOf(acc.A.email);
const asesorLead = await leadByPhone(orgA, '+524447000001');
const mjLead = await leadByPhone(orgA, '+524448120007');
const b = await browser();
const log = (...a) => console.log('===', ...a);
const adm = await login(b, acc.A.email, { password: acc.A.password });
const p = adm.p;
p.on('dialog', d => d.accept());
const captured = {};
let label = null;
await p.route('**/*', async (route) => {
  const r = route.request();
  if (label && r.method() === 'POST' && r.headers()['next-action']) {
    captured[label] = { url: r.url(), headers: r.headers(), body: r.postDataBuffer() };
    log('capturado', label); label = null;
    return route.abort();
  }
  return route.continue();
});
label = 'borrarLead'; await p.goto(BASE + '/app/leads/' + asesorLead); await p.getByRole('button', { name: /eliminar lead/i }).click(); await p.waitForTimeout(1500);
label = 'hacerAdmin'; await p.goto(BASE + '/app/equipo'); await p.getByRole('button', { name: 'Hacer admin' }).first().click(); await p.waitForTimeout(1500);
label = 'statusUnidad'; await p.goto(BASE + devHref); await p.locator('select[name=status]').nth(5).selectOption('VENDIDO'); await p.waitForTimeout(1500);
label = 'config'; await p.goto(BASE + '/app/configuracion'); await p.fill('input[name=staleLeadHours]', '999'); await p.locator('form:has(input[name=staleLeadHours]) button').first().click(); await p.waitForTimeout(1500);
label = 'invitarAdmin'; await p.goto(BASE + '/app/equipo'); await p.fill('input[name=email]', 'intruso@ejemplo.test'); await p.selectOption('select[name=role]', 'ADMIN'); await p.locator('form:has(input[name=email]) button').first().click(); await p.waitForTimeout(1500);
const as = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password });
for (const path of ['/app/equipo', '/app/configuracion', '/app/leads/importar', '/app/campanas', '/app/leads/' + mjLead]) {
  const r = await as.p.goto(BASE + path);
  log('asesor GET', path, '->', as.p.url().replace(BASE, ''), r.status(), (await as.p.innerText('body')).replace(/\s+/g, ' ').slice(0, 80));
}
await shot(as.p, 'f9-asesor-lead-ajeno');
for (const [k, c] of Object.entries(captured)) {
  const h = { ...c.headers }; delete h.cookie; delete h['content-length'];
  const r = await as.ctx.request.post(c.url, { headers: h, data: c.body, maxRedirects: 0 });
  const t = (await r.text()).slice(0, 200).replace(/\s+/g, ' ');
  log('asesor replay', k, r.status(), r.headers()['x-action-redirect'] || '', t);
}
log('BD', JSON.stringify(await sql("select (select count(*) from leads where id=$1) lead_del_asesor_sigue, (select m.role from memberships m join users u on u.id=m.user_id where u.email=$2 and m.organization_id=$3) rol_asesor, (select stale_lead_hours from organizations where id=$3) horas, (select count(*) from invitations where email='intruso@ejemplo.test') invitaciones_intruso", [asesorLead, acc.ASESOR.email, orgA])));
await b.close();
