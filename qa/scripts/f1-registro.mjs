import { browser, shot, BASE } from './lib.mjs';
import fs from 'fs';
const b = await browser();
const ts = Date.now().toString(36);
const log = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 800 } });
const p = await ctx.newPage();
await p.goto(BASE + '/registro');
// 1. empty submit
await p.click('button[type=submit]');
await p.waitForTimeout(800);
log.push(['registro vacío', p.url(), (await p.innerText('body')).slice(0, 400)]);
await shot(p, 'f1-registro-vacio');
// 2. bad email, short pass, no terms
await p.fill('input[name=name]', 'A');
await p.fill('input[name=email]', 'correo-malo');
await p.fill('input[name=password]', '123');
await p.fill('input[name=orgName]', 'x');
await p.click('button[type=submit]');
await p.waitForTimeout(1500);
log.push(['registro inválido', p.url(), (await p.innerText('body')).slice(0, 600)]);
await shot(p, 'f1-registro-invalido');
// 3. valid with ñ emoji
const accounts = {};
for (const [k, org] of [['A', 'Fraccionamientos Peña & Núñez 🏡'], ['B', 'Competencia Inmobiliaria S.A. de C.V.']]) {
  const c2 = await b.newContext({ viewport: { width: 1280, height: 800 } });
  const q = await c2.newPage();
  await q.goto(BASE + '/registro');
  const email = `qa-${k.toLowerCase()}-${ts}@ejemplo.test`;
  await q.fill('input[name=name]', k === 'A' ? 'José Ñúñez Peña' : 'Rival Admin');
  await q.fill('input[name=email]', email);
  await q.fill('input[name=password]', 'Prueba123!');
  await q.fill('input[name=orgName]', org);
  await q.check('input[name=terms]');
  const t = Date.now();
  await q.click('button[type=submit]');
  await q.waitForURL(/\/app/, { timeout: 30000 }).catch(() => {});
  log.push([`registro ${k}`, q.url(), `${Date.now() - t}ms`, (await q.innerText('body')).slice(0, 1500)]);
  await q.waitForLoadState('networkidle');
  await shot(q, `f1-registro-ok-${k}`);
  accounts[k] = { email, password: 'Prueba123!' };
  await c2.close();
}
// 4. duplicate registration
await p.goto(BASE + '/registro');
await p.fill('input[name=name]', 'Dup');
await p.fill('input[name=email]', accounts.A.email);
await p.fill('input[name=password]', 'Prueba123!');
await p.fill('input[name=orgName]', 'Dup org');
await p.check('input[name=terms]');
await p.click('button[type=submit]');
await p.waitForTimeout(2500);
log.push(['registro duplicado', p.url(), (await p.innerText('body')).slice(0, 400)]);
// 5. login wrong password x7 (rate limit?)
for (let i = 0; i < 7; i++) {
  await p.goto(BASE + '/login');
  await p.fill('input[name=email]', accounts.A.email);
  await p.fill('input[name=password]', 'mala' + i);
  await p.click('button[type=submit]');
  await p.waitForTimeout(1200);
}
log.push(['login 7 intentos fallidos', (await p.innerText('body')).slice(0, 300)]);
// forgot password link?
log.push(['login tiene olvidé', (await p.content()).toLowerCase().includes('olvid')]);
fs.writeFileSync('accounts.json', JSON.stringify(accounts));
for (const l of log) console.log('=== ' + l.join('\n'));
await b.close();
