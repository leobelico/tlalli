import { browser, login, shot, BASE, submitForm, msgs } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const log = (...a) => console.log('===', ...a);
// B12 + B21 as asesor of A (was deactivated earlier -> use demo asesor)
const as = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
let r = await as.p.goto(BASE + '/app/leads/506c187c-5970-4bcb-944c-605d61b282ef');
log('B12 lead ajeno', r.status(), (await as.p.innerText('main').catch(()=>'')).replace(/\s+/g,' ').slice(0,160));
await shot(as.p, 'fix-b12-404-app-cel', false);
await as.p.goto(BASE + '/app/equipo');
log('B21 banner', await as.p.locator('[role=alert]').allInnerTexts());
await shot(as.p, 'fix-b21-permiso-cel', false);
const anon = await b.newContext(); const q = await anon.newPage();
r = await q.goto(BASE + '/esto-no-existe');
log('B12 URL inexistente', r.status(), (await q.innerText('body')).replace(/\s+/g,' ').slice(0,140));
// B10: asesor2 captures a phone owned by asesor1 (demo)
await as.p.goto(BASE + '/app/leads');
const own = await as.p.locator('tbody tr td:nth-child(2)').first().innerText();
const as2 = await login(b, 'asesor2@potosi.ejemplo.test', { width: 390, height: 844 });
await as2.p.goto(BASE + '/app/leads/nuevo');
await as2.p.fill('[name=firstName]', 'Intento'); await as2.p.fill('[name=phone]', own); await as2.p.check('[name=consent]');
await submitForm(as2.p, /guardar|crear|registrar/i);
log('B10', as2.p.url().replace(BASE, ''), await msgs(as2.p).then(t => t.split('|').filter(s => /atiende/.test(s))));
await shot(as2.p, 'fix-b10-duplicado-ajeno-cel', false);
// B11 in the UI
const adm = await login(b, acc.A.email, { password: acc.A.password });
await adm.p.goto(BASE + '/app/leads/nuevo');
await adm.p.fill('[name=firstName]', 'Ñ'.repeat(200)); await adm.p.fill('[name=phone]', '4441230000'); await adm.p.fill('[name=notes]', 'x'.repeat(2500)); await adm.p.check('[name=consent]');
await submitForm(adm.p, /guardar|crear|registrar/i);
log('B11', await adm.p.locator('p.text-red-600').allInnerTexts());
await b.close();
