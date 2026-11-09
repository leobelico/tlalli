// E2E: "Olvidé mi contraseña" end to end, against local Supabase Auth + Mailpit.
// Exit code 0 only if the whole flow works. Run: node scripts/e2e-recuperar.mjs
import { browser, shot, BASE } from './lib.mjs';
import fs from 'fs';

const acc = JSON.parse(fs.readFileSync('accounts.json'));
const MAILPIT = 'http://127.0.0.1:54324';
const NEW_PASSWORD = 'NuevaClave456!';
const user = acc.B;
const fail = (m) => { console.error('FAIL:', m); process.exitCode = 1; };
const ok = (m) => console.log('ok  :', m);

async function latestMailTo(email, afterMs) {
  for (let i = 0; i < 20; i++) {
    const r = await (await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent('to:' + email)}`)).json();
    const m = (r.messages ?? []).find((x) => new Date(x.Created).getTime() >= afterMs);
    if (m) return (await (await fetch(`${MAILPIT}/api/v1/message/${m.ID}`)).json());
    await new Promise((res) => setTimeout(res, 500));
  }
  return null;
}

const b = await browser();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
const p = await ctx.newPage();

await p.goto(BASE + '/login');
const link = p.getByRole('link', { name: /olvidaste|olvidé/i });
if (!(await link.count())) { fail('el login no tiene enlace "¿Olvidaste tu contraseña?"'); await b.close(); process.exit(1); }
await link.click();
await p.waitForURL(/\/recuperar/);
ok('login -> /recuperar');

// Unknown address must look identical (no account enumeration).
await p.fill('input[name=email]', 'no-existe-' + Date.now() + '@ejemplo.test');
await p.getByRole('button', { name: /enviar|recuperar/i }).click();
await p.waitForTimeout(1500);
const genericUnknown = (await p.locator('[role=status]').allInnerTexts()).join(' ');
if (!/correo/i.test(genericUnknown)) fail('sin mensaje genérico para correo desconocido');
else ok('correo desconocido: mensaje genérico -> ' + genericUnknown.slice(0, 80));

await p.goto(BASE + '/recuperar');
const since = Date.now() - 2000;
await p.fill('input[name=email]', user.email);
await p.getByRole('button', { name: /enviar|recuperar/i }).click();
await p.waitForTimeout(1500);
const genericKnown = (await p.locator('[role=status]').allInnerTexts()).join(' ');
if (genericKnown !== genericUnknown) fail('el mensaje delata si el correo existe');
else ok('mismo mensaje para correo existente');
await shot(p, 'e2e-recuperar-enviado-cel', false);

const mail = await latestMailTo(user.email, since);
if (!mail) { fail('no llegó el correo de recuperación a Mailpit'); await b.close(); process.exit(1); }
ok('correo recibido: ' + mail.Subject);
if (!/contraseña/i.test(mail.Subject) || /reset|password/i.test(mail.Subject)) fail('el asunto del correo no está en español: ' + mail.Subject);
if (/reset your password|follow this link/i.test(mail.Text + mail.HTML)) fail('el cuerpo del correo sigue en inglés');
const url = (mail.HTML.match(/href="([^"]+)"/) ?? [])[1]?.replace(/&amp;/g, '&').replace('http://localhost:3010', BASE);
if (!url) { fail('el correo no trae enlace'); await b.close(); process.exit(1); }

const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await ctx2.newPage();
await q.goto(url);
await q.getByRole('button', { name: /continuar/i }).click();
await q.waitForURL(/\/nueva-contrasena/, { timeout: 15000 }).catch(() => {});
if (!/\/nueva-contrasena/.test(q.url())) { fail('el enlace no llevó a /nueva-contrasena: ' + q.url()); await shot(q, 'e2e-recuperar-enlace-roto', false); await b.close(); process.exit(1); }
ok('enlace del correo -> /nueva-contrasena');

await q.fill('input[name=password]', '123');
await q.getByRole('button', { name: /guardar|cambiar|actualizar/i }).click();
await q.waitForTimeout(1200);
if (!/8 caracteres/i.test(await q.innerText('body'))) fail('no valida la contraseña corta'); else ok('contraseña corta rechazada');

await q.fill('input[name=password]', NEW_PASSWORD);
await q.getByRole('button', { name: /guardar|cambiar|actualizar/i }).click();
await q.waitForURL(/\/app/, { timeout: 15000 }).catch(() => {});
if (!/\/app/.test(q.url())) fail('tras cambiar la contraseña no entró a /app: ' + q.url()); else ok('cambió la contraseña y entró a /app');

// New password works, old one does not.
for (const [pw, shouldWork] of [[NEW_PASSWORD, true], [user.password, false]]) {
  const c = await b.newContext(); const r = await c.newPage();
  await r.goto(BASE + '/login');
  await r.fill('input[name=email]', user.email); await r.fill('input[name=password]', pw);
  await r.click('button[type=submit]');
  await r.waitForTimeout(2500);
  const inside = /\/app/.test(r.url());
  if (inside !== shouldWork) fail(`login con ${shouldWork ? 'la nueva' : 'la vieja'} contraseña dio ${inside ? 'acceso' : 'rechazo'}`);
  else ok(`login con ${shouldWork ? 'la nueva' : 'la vieja'} contraseña: ${inside ? 'entra' : 'rechaza'}`);
  await c.close();
}

// The recovery link is single use.
const c3 = await b.newContext(); const s = await c3.newPage();
await s.goto(url);
if (await s.getByRole('button', { name: /continuar/i }).count()) await s.getByRole('button', { name: /continuar/i }).click();
await s.waitForTimeout(2500);
if (/\/nueva-contrasena/.test(s.url()) && !/login|recuperar/.test(s.url())) {
  const hasForm = await s.locator('input[name=password]').count();
  if (hasForm) fail('el enlace de recuperación se pudo reutilizar'); else ok('enlace reutilizado: sin formulario');
} else ok('enlace reutilizado: ' + s.url().replace(BASE, ''));

acc.B.password = NEW_PASSWORD;
fs.writeFileSync('accounts.json', JSON.stringify(acc));
await b.close();
