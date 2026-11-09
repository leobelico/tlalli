import { browser, login, shot, BASE } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const A = { lead: '506c187c-5970-4bcb-944c-605d61b282ef', dev: 'ac8d122c-22ac-40b2-a079-6a07c78a07f4', quote: '792307d8-d33f-45c7-bd4c-dcc9d3299aee', unit: 'ffd40e6a-7330-4425-b094-c6f7733c71d2', demoDevWithPlan: '72fdc014-bba9-4e4e-8d14-1f8c9aec31e0' };
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
const orgA = (await (await import('pg')).default.Client.prototype.constructor) ; // placeholder
await b.close();
