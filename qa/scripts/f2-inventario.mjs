import { browser, login, shot, BASE, submitForm, msgs } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const log = (...a) => console.log('===', ...a);
p.on('dialog', d => { log('DIALOG', d.message()); d.accept(); });
await p.goto(BASE + '/app/desarrollos');
// empty
await submitForm(p, /crear|guardar|agregar/i);
log('desarrollo vacío', await msgs(p));
// long name 200 chars
await p.fill('input[name=name]', 'Residencial '.repeat(20));
await p.fill('input[name=city]', 'San Luis Potosí');
await submitForm(p, /crear|guardar|agregar/i);
log('desarrollo nombre 240', await msgs(p));
await p.fill('input[name=name]', 'Fraccionamiento La Peñita 🌵 Ñandú');
await p.fill('input[name=city]', 'Soledad de Graciano Sánchez');
await submitForm(p, /crear|guardar|agregar/i);
log('desarrollo emoji', p.url(), await msgs(p));
await shot(p, 'f2-desarrollo-creado');
// second development (plan básico limit)
await p.goto(BASE + '/app/desarrollos');
await p.fill('input[name=name]', 'Segundo Fraccionamiento');
await p.fill('input[name=city]', 'SLP');
await submitForm(p, /crear|guardar|agregar/i);
log('segundo desarrollo', await msgs(p));
await shot(p, 'f2-limite-plan');
await p.goto(BASE + '/app/desarrollos');
const devHref = (await p.locator('a[href^="/app/desarrollos/"]').evaluateAll(as => as.map(a => a.getAttribute('href'))))[0];
log('dev', devHref);
await p.goto(BASE + devHref);
const add = 'form:has(input[name=code])';
for (const [code, price, area] of [['', '500000', '120'], ['Lote 1', '-500000', '120'], ['Lote 1', '0', '120'], ['Lote 1', 'abc', '120'], ['Lote 1', '450000', '-5'], ['Mz 3 Lt 1', '450000', '120'], ['Mz 3 Lt 1', '450000', '120'], ['L'.repeat(60), '450000', '120'], ['Lote 🏠 Ñ', '99999999999', '120']]) {
  await p.goto(BASE + devHref);
  await p.locator(add).locator('input[name=code]').fill(code);
  await p.locator(add).locator('input[name=price]').fill(price).catch(e => log('fill price fail', price));
  await p.locator(add).locator('input[name=areaM2]').fill(area).catch(() => {});
  await submitForm(p, /^agregar$/i, add);
  log(`unidad code=${code.slice(0, 20)} price=${price} area=${area}`, await msgs(p));
}
// bulk
const bulk = 'form:has(input[name=prefix])';
for (const [from, to] of [['1', '600'], ['5', '1'], ['1', '40']]) {
  await p.goto(BASE + devHref);
  await p.locator(bulk).locator('input[name=prefix]').fill('Lote ');
  await p.locator(bulk).locator('input[name=from]').fill(from);
  await p.locator(bulk).locator('input[name=to]').fill(to);
  await p.locator(bulk).locator('input[name=price]').fill('480000');
  await p.locator(bulk).locator('input[name=areaM2]').fill('160');
  await submitForm(p, /crear unidades/i, bulk);
  log(`bulk ${from}-${to}`, await msgs(p));
}
await shot(p, 'f2-inventario');
// double click add unit
await p.goto(BASE + devHref);
await p.locator(add).locator('input[name=code]').fill('Doble clic');
await p.locator(add).locator('input[name=price]').fill('300000');
await p.locator(add).getByRole('button', { name: /^agregar$/i }).dblclick();
await p.waitForTimeout(2500);
log('doble clic', await msgs(p));
fs.writeFileSync('devA.json', JSON.stringify({ devHref }));
await b.close();
