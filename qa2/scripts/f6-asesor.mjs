import { browser, login, shot, BASE, submitForm, msgs } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const { p } = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password, width: 390, height: 844 });
const log = (...a) => console.log('===', ...a);
p.on('dialog', d => d.accept());
// lead as asesor
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Cliente del Asesor');
await p.fill('[name=phone]', '4447000001');
await p.check('input[name=consent]');
await submitForm(p, /guardar|crear|registrar/i);
const leadPath = new URL(p.url()).pathname;
log('lead asesor', leadPath);
fs.writeFileSync('asesor.json', JSON.stringify({ leadPath }));
// asesor captures phone that already belongs to admin's lead (María José)
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Robado');
await p.fill('[name=phone]', '4448120007');
await p.check('input[name=consent]');
await submitForm(p, /guardar|crear|registrar/i);
log('asesor dup de otro', p.url().replace(BASE, ''), (await p.innerText('body')).slice(0, 300).replace(/\n+/g, ' / '));
await shot(p, 'f6-asesor-duplicado-ajeno');
// task past date
await p.goto(BASE + leadPath);
await p.fill('input[name=title]', 'Llamar ayer');
await p.fill('input[name=dueAt]', '2020-01-01T10:00');
await submitForm(p, /agendar/i);
log('tarea fecha pasada', await msgs(p));
await p.fill('input[name=title]', '');
await submitForm(p, /agendar/i);
log('tarea vacía', await msgs(p));
// quote
const quoteCases = [
  { discount: '-1000', downPaymentPct: '20', months: '24', annualRatePct: '0' },
  { discount: '479999', downPaymentPct: '10', months: '12', annualRatePct: '0' },
  { discount: '0', downPaymentPct: '150', months: '12', annualRatePct: '0' },
  { discount: '0', downPaymentPct: '20', months: '0', annualRatePct: '0' },
  { discount: '0', downPaymentPct: '100', months: '0', annualRatePct: '0' },
  { discount: '0', downPaymentPct: '20', months: '36', annualRatePct: '12' },
];
const quoteUrls = [];
for (const c of quoteCases) {
  await p.goto(BASE + '/app/cotizador?lead=' + leadPath.split('/').pop());
  await p.selectOption('select[name=unitId]', { index: 3 });
  for (const [k, v] of Object.entries(c)) await p.fill(`[name=${k}]`, v);
  await submitForm(p, /cotiz|generar|guardar/i);
  log('cotización', JSON.stringify(c), p.url().replace(BASE, ''), (await msgs(p)).slice(0, 300));
  if (p.url().match(/cotizador\/[0-9a-f-]{36}/)) quoteUrls.push(p.url());
}
await shot(p, 'f6-cotizacion-cel');
// download pdf
const last = quoteUrls[quoteUrls.length - 1];
const id = last.split('/').pop();
const r = await p.request.get(BASE + `/api/quotes/${id}/pdf`);
fs.writeFileSync('cotizacion.pdf', await r.body());
log('pdf', r.status(), r.headers()['content-type'], (await r.body()).length);
await b.close();
