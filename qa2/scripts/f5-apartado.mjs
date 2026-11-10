import { browser, login, shot, BASE, sql, orgOf, leadByPhone } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const { devHref } = JSON.parse(fs.readFileSync('devA.json'));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const log = (...a) => console.log('===', ...a);
p.on('dialog', d => d.accept());
const orgA = await orgOf(acc.A.email);
const MJ = '/app/leads/' + (await leadByPhone(orgA, '+524448120007')), ANA = '/app/leads/' + (await leadByPhone(orgA, '+524448120001'));
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
  await p.waitForTimeout(500);
  const move = p.locator('dialog[open] button:has-text("Mover")');
  if (await move.count()) await move.click(); // stage changes now ask first (pilot item 7)
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
console.log('=== BD final', JSON.stringify(await sql("select l.first_name, l.stage, u.code, u.status from leads l left join units u on u.id=l.unit_id where l.phone in ('+524448120007','+524448120001') and l.organization_id=$1", [orgA])));
console.log('=== unidades', JSON.stringify(await sql("select code,status from units where code in ('Lote 1','Lote 2') and organization_id=$1", [orgA])));
console.log('=== unidades con mas de un cliente apartado/vendido', JSON.stringify(await sql("select unit_id, count(*) from leads where organization_id=$1 and stage in ('APARTADO','VENDIDO') and unit_id is not null group by unit_id having count(*)>1", [orgA])));
await b.close();
