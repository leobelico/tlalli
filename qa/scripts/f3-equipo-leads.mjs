import { browser, login, shot, BASE, submitForm, msgs } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const log = (...a) => console.log('===', ...a);
p.on('dialog', d => { log('DIALOG', d.message()); d.accept(); });
// --- invite
await p.goto(BASE + '/app/equipo');
await shot(p, 'f3-equipo');
const asesorEmail = acc.A.email.replace('qa-a', 'qa-asesor');
await p.fill('input[name=email]', asesorEmail);
await p.selectOption('select[name=role]', 'ASESOR');
await submitForm(p, /invitar|crear|enviar/i);
const body = await p.innerText('body');
const link = (body.match(/https?:\/\/\S+\/invitacion\/\S+/) || (await p.locator('input[readonly]').inputValue().catch(() => '')).match(/\S+/) || [''])[0];
log('invitación', link, await msgs(p));
await shot(p, 'f3-invitacion');
// accept as new user
const c2 = await b.newContext({ viewport: { width: 390, height: 844 } });
const q = await c2.newPage();
await q.goto(link);
await shot(q, 'f3-invitacion-abierta-cel');
log('invitación abierta', (await q.innerText('body')).slice(0, 500));
await q.fill('input[name=name]', 'Carla Asesora QA');
await q.fill('input[name=password]', 'Prueba123!');
await q.getByRole('button').filter({ hasText: /crear|unirme|aceptar/i }).first().click();
await q.waitForURL(/\/app/, { timeout: 20000 }).catch(() => {});
log('asesor tras aceptar', q.url());
await q.waitForLoadState('networkidle');
await shot(q, 'f3-asesor-inicio-cel');
log('asesor inicio', (await q.innerText('body')).slice(0, 700));
// reuse link
const c3 = await b.newContext(); const r = await c3.newPage(); await r.goto(link);
log('reusar enlace', (await r.innerText('body')).slice(0, 200));
acc.ASESOR = { email: asesorEmail, password: 'Prueba123!' };
fs.writeFileSync('accounts.json', JSON.stringify(acc));
// --- leads
const cases = [
  ['vacío', {}],
  ['tel 9 dígitos', { firstName: 'Ana', phone: '444 123 456' }],
  ['tel letras', { firstName: 'Ana', phone: 'cuatro cuatro' }],
  ['tel 0000000000', { firstName: 'Ana', phone: '0000000000' }],
  ['tel con lada 01', { firstName: 'Ana', phone: '01 444 123 4567' }],
  ['tel +52 1', { firstName: 'Ana', phone: '+52 1 444 812 0001' }],
  ['tel con ext', { firstName: 'Ana', phone: '444 812 0002 ext 12' }],
  ['nombre 200', { firstName: 'Ñ'.repeat(200), phone: '4448120003' }],
  ['nota 5000', { firstName: 'Notas', phone: '4448120004', notes: 'x'.repeat(5000) }],
  ['correo malo', { firstName: 'Mail', phone: '4448120005', email: 'juan@' }],
  ['presupuesto negativo', { firstName: 'Neg', phone: '4448120006', budget: '-100' }],
  ['emoji y acentos', { firstName: 'María José 💃', lastName: 'Peña Ñíguez', phone: '444-812-0007', email: 'MAJO@Ejemplo.TEST', notes: '¿Quiere lote esquina? “comillas” <script>alert(1)</script>' }],
  ['sin consentimiento', { firstName: 'SinConsent', phone: '4448120008', noConsent: true }],
];
for (const [name, f] of cases) {
  await p.goto(BASE + '/app/leads/nuevo');
  for (const [k, v] of Object.entries(f)) if (k !== 'noConsent') await p.locator(`[name=${k}]`).fill(v).catch(e => log('nofill', k));
  if (!f.noConsent && Object.keys(f).length) await p.check('input[name=consent]');
  await submitForm(p, /guardar|crear|registrar/i);
  log(`lead ${name}`, p.url().replace(BASE, ''), (await msgs(p)).slice(0, 300));
  if (name === 'emoji y acentos') await shot(p, 'f3-lead-emoji');
}
// duplicate (same phone different format)
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Duplicada');
await p.fill('[name=phone]', '+52 (444) 812-0007');
await p.check('input[name=consent]');
await submitForm(p, /guardar|crear|registrar/i);
log('lead duplicado', p.url().replace(BASE, ''), (await p.innerText('body')).slice(0, 600));
await shot(p, 'f3-lead-duplicado');
// double click new lead
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'DobleClic');
await p.fill('[name=phone]', '4448120099');
await p.check('input[name=consent]');
await p.getByRole('button', { name: /guardar|crear|registrar/i }).dblclick();
await p.waitForTimeout(3000);
log('doble clic lead', p.url());
await b.close();
