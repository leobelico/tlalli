import { browser, login, shot, BASE, msgs } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const log = (...a) => console.log('===', ...a);
const { p, ctx } = await login(b, acc.A.email, { password: acc.A.password, width: 390, height: 844 });
p.on('pageerror', e => log('PAGEERROR', e.message.slice(0, 200)));
// offline mid-save
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Sin Internet'); await p.fill('[name=phone]', '4441239876'); await p.fill('[name=notes]', 'Nota larga que no quiero perder');
await p.check('[name=consent]');
await ctx.setOffline(true);
await p.getByRole('button', { name: /guardar|crear|registrar/i }).click();
await p.waitForTimeout(4000);
await shot(p, 'f13-sin-internet-cel');
log('offline', p.url(), (await p.innerText('body').catch(() => '')).slice(-400).replace(/\s+/g, ' '), 'nombre conservado:', await p.inputValue('[name=firstName]').catch(() => '?'));
await ctx.setOffline(false);
// stale hours edge
await p.setViewportSize({ width: 1280, height: 800 });
for (const v of ['0', '-5', '100000', '1.5', '']) {
  await p.goto(BASE + '/app/configuracion');
  await p.fill('input[name=staleLeadHours]', v);
  await p.locator('form:has(input[name=staleLeadHours]) button').first().click(); await p.waitForTimeout(1500);
  log(`staleLeadHours=${v}`, (await msgs(p)).split('|').filter(s => /hora|Revisa|guard|actualiz|inválid|mayor|menor|Expected|number/i.test(s)).join('|'));
}
// privacy notice empty
await p.goto(BASE + '/app/configuracion');
await p.fill('textarea[name=content]', '');
await p.locator('form:has(textarea[name=content]) button').first().click(); await p.waitForTimeout(1500);
log('aviso vacío', (await msgs(p)).split('|').filter(s => /aviso|Revisa|caracter|Too|publicad/i.test(s)).join('|'));
// plan upload invalid
const { devHref } = JSON.parse(fs.readFileSync('devA.json'));
await p.goto(BASE + devHref + '?tab=plano');
await p.getByText('Plano', { exact: true }).click().catch(() => {});
await p.waitForTimeout(800);
const fi = p.locator('input[type=file]');
log('input plano', await fi.count());
if (await fi.count()) { await fi.setInputFiles('csv/falso.png'); await p.waitForTimeout(800); await p.getByRole('button', { name: /subir/i }).click().catch(() => {}); await p.waitForTimeout(2500); log('plano falso', (await msgs(p)).slice(-300)); }
await shot(p, 'f13-plano-falso');
// demo plan board
const d = await login(b, 'admin@potosi.ejemplo.test', { width: 1280, height: 900 });
await d.p.goto(BASE + '/app/desarrollos/72fdc014-bba9-4e4e-8d14-1f8c9aec31e0');
await d.p.getByText('Plano', { exact: true }).click(); await d.p.waitForTimeout(2000);
await shot(d.p, 'f13-plano-demo', false);
await d.p.setViewportSize({ width: 390, height: 844 }); await d.p.waitForTimeout(800);
await shot(d.p, 'f13-plano-demo-cel', false);
await b.close();
