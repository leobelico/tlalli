import { browser, login, shot, BASE, sql, orgOf, leadByPhone } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const orgA = await orgOf(acc.A.email);
const A = {
  lead: await leadByPhone(orgA, '+524448120007'),
  dev: JSON.parse(fs.readFileSync('devA.json')).devHref.split('/').pop(),
  quote: (await sql('select id from quotes where organization_id=$1 limit 1', [orgA]))[0]?.id,
  demoDevWithPlan: (await sql("select d.id from developments d join organizations o on o.id=d.organization_id where o.slug='demo-potosi' limit 1"))[0].id,
};
const b = await browser();
const log = (...a) => console.log('===', ...a);
const { p } = await login(b, acc.B.email, { password: acc.B.password });
p.on('dialog', d => d.accept());
for (const path of [`/app/leads/${A.lead}`, `/app/desarrollos/${A.dev}`, `/app/cotizador/${A.quote}`, `/api/quotes/${A.quote}/pdf`, `/api/developments/${A.demoDevWithPlan}/plan`, `/app/cotizador?lead=${A.lead}`]) {
  const r = await p.goto(BASE + path);
  const t = (await p.innerText('body').catch(() => '')).replace(/\s+/g, ' ');
  log('B GET', path, r.status(), t.slice(0, 120), /María|Peña|Lote 1|Ñandú/.test(t) ? 'LEAK!!' : '');
}
await shot(p, 'f7-b-ve-lead-de-a');
// cookie switch: set org_id cookie to A's org
await b.close();
