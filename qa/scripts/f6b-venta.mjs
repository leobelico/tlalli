import { browser, login, shot, BASE, sql } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const { leadPath } = JSON.parse(fs.readFileSync('asesor.json'));
const leadId = leadPath.split('/').pop();
const b = await browser();
const { p } = await login(b, acc.ASESOR.email, { password: acc.ASESOR.password, width: 390, height: 844 });
const log = (...a) => console.log('===', ...a);
async function sell(amount) {
  await p.goto(BASE + leadPath);
  await p.selectOption('#stage-control', 'VENDIDO');
  await p.waitForTimeout(700);
  if (amount !== null) await p.fill('#saleAmount', String(amount));
  await p.locator('dialog button').last().click();
  await p.waitForTimeout(2500);
  const err = await p.locator('#stage-control ~ span.text-red-600').innerText().catch(() => '');
  // above the asesor's limit it is not an error any more: a pending request notice (pilot item 5)
  const aviso = await p.locator('#stage-control ~ span[role=status]').innerText().catch(() => '');
  return { etapa: await p.locator('#stage-control').inputValue(), err, aviso: aviso.slice(0, 160) };
}
log('asesor vende por $1', JSON.stringify(await sell(1)));
await shot(p, 'v2-venta-1-peso-rechazada-cel', false);
log('asesor vende a precio de lista (sin monto)', JSON.stringify(await sell(null)));
log('BD', JSON.stringify(await sql('select l.stage, l.sale_amount, u.code, u.status from leads l left join units u on u.id=l.unit_id where l.id=$1', [leadId])));
await b.close();
