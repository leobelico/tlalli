import { browser, login, shot, BASE } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const { devHref } = JSON.parse(fs.readFileSync('devA.json'));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const log = (...a) => console.log('===', ...a);
p.on('dialog', d => d.accept());
const MJ = '/app/leads/506c187c-5970-4bcb-944c-605d61b282ef', ANA = '/app/leads/b72d68d0-8ece-4a8c-8b78-135c903ce163';
async function setUnit(path, unitLabel) {
  await p.goto(BASE + path);
  await p.locator('summary', { hasText: 'Editar datos' }).click();
  const devSel = p.locator('select[name=developmentId]');
  await devSel.selectOption({ index: 1 });
  await p.waitForTimeout(300);
  const opts = await p.locator('select[name=unitId] option').allInnerTexts();
  const o = opts.find(t => t.startsWith(unitLabel + ' ') || t.startsWith(unitLabel + ' ·') || t.includes(unitLabel + ' ')) ;
  await p.locator('select[name=unitId]').selectOption({ label: o });
  await p.getByRole('button', { name: /guardar/i }).last().click();
  await p.waitForTimeout(1500);
  log('unit set', path, o);
}
async function stage(path, label) {
  await p.goto(BASE + path);
  await p.selectOption('#stage-control', { label });
  await p.waitForTimeout(2000);
  const err = await p.locator('#stage-control ~ span.text-red-600').innerText().catch(() => '');
  log(`stage ${path.slice(-6)} -> ${label}`, 'valor:', await p.locator('#stage-control').inputValue(), 'err:', err);
}
await setUnit(MJ, 'Lote 1');
await stage(MJ, 'Apartado');
await shot(p, 'f5-apartado-mj');
await setUnit(ANA, 'Lote 1');
await stage(ANA, 'Apartado');
await shot(p, 'f5-apartado-ana-bloqueado');
// admin releases lot manually in inventory
await p.goto(BASE + devHref);
const row = p.locator('tr', { has: p.locator('td', { hasText: /^Lote 1$/ }) });
await row.locator('select[name=status]').selectOption('DISPONIBLE');
await p.waitForTimeout(2000);
log('inventario Lote 1 manual -> DISPONIBLE');
await stage(ANA, 'Apartado');
await shot(p, 'f5-doble-apartado');
// change MJ unit to Lote 2 while apartado
await setUnit(MJ, 'Lote 2');
await b.close();
