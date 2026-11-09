import { browser, login, shot, BASE, submitForm, msgs, sql, orgOf, leadByPhone } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const orgA = await orgOf(acc.A.email);
const A = {
  lead: await leadByPhone(orgA, '+524448120007'),
  leadAna: await leadByPhone(orgA, '+524448120001'),
  unit: (await sql("select id from units where organization_id=$1 and code='Lote 1'", [orgA]))[0].id,
};
const probe = 'select (select stage from leads where id=$1) etapa_mj, (select status from units where id=$2) lote1, (select count(*) from leads where id=$3) ana_existe';
const before = JSON.stringify(await sql(probe, [A.lead, A.unit, A.leadAna]));
const b = await browser();
const log = (...a) => console.log('===', ...a);
const { p } = await login(b, acc.B.email, { password: acc.B.password });
p.on('dialog', d => d.accept());
// setup B data
await p.goto(BASE + '/app/desarrollos');
if (!(await p.locator('a[href^="/app/desarrollos/"]').count())) {
  await p.fill('input[name=name]', 'Dev B'); await p.fill('input[name=city]', 'SLP');
  await submitForm(p, /crear|guardar|agregar/i);
} else await p.locator('a[href^="/app/desarrollos/"]').first().click();
await p.waitForURL(/desarrollos\/[0-9a-f-]{36}/);
const devB = new URL(p.url()).pathname;
const add = 'form:has(input[name=code])';
await p.locator(add).locator('input[name=code]').fill('B1'); await p.locator(add).locator('input[name=price]').fill('100000');
await submitForm(p, /^agregar$/i, add);
const unitB = await p.locator('form input[name=id]').first().inputValue();
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Lead B'); await p.fill('[name=phone]', '4449000' + String(Date.now()).slice(-3)); await p.check('[name=consent]');
await submitForm(p, /guardar|crear|registrar/i);
const leadB = new URL(p.url()).pathname.split('/').pop();
log('B setup', devB, unitB, leadB);
// interception helper
let swap = null;
await p.route('**/*', async (route) => {
  const req = route.request();
  if (swap && req.method() === 'POST' && req.headers()['next-action']) {
    let body = req.postDataBuffer().toString('latin1');
    const before = body;
    for (const [from, to] of swap) body = body.split(from).join(to);
    log('  interceptado', req.url().replace(BASE, ''), before === body ? 'SIN CAMBIO' : 'IDs sustituidos');
    return route.continue({ postData: Buffer.from(body, 'latin1') });
  }
  return route.continue();
});
const leadPath = '/app/leads/' + leadB;
// 1 activity on A's lead
swap = [[leadB, A.lead]];
await p.goto(BASE + leadPath);
await p.fill('textarea[name=body]', 'NOTA INYECTADA POR ORG B');
await p.getByRole('button', { name: 'Guardar' }).first().click(); await p.waitForTimeout(2000);
log('1 actividad en lead de A', await msgs(p));
// 2 task on A's lead
await p.goto(BASE + leadPath);
await p.fill('input[name=title]', 'TAREA INYECTADA B'); await p.getByRole('button', { name: /agendar/i }).click(); await p.waitForTimeout(2000);
log('2 tarea en lead de A', await msgs(p));
// 3 stage change on A's lead
await p.goto(BASE + leadPath);
await p.selectOption('#stage-control', 'CONTACTADO'); await p.waitForTimeout(2000);
log('3 etapa lead A', await p.locator('#stage-control ~ span').innerText().catch(() => 'sin error visible'));
// 4 unit status on A's unit
swap = [[unitB, A.unit]];
await p.goto(BASE + devB);
await p.locator('select[name=status]').first().selectOption('VENDIDO'); await p.waitForTimeout(2000);
log('4 status unidad A', await msgs(p));
// 5 quote on A's unit
await p.goto(BASE + '/app/cotizador');
await p.selectOption('select[name=unitId]', unitB);
await p.fill('[name=downPaymentPct]', '20'); await p.fill('[name=months]', '12');
await p.getByRole('button', { name: /cotiz|generar|guardar/i }).first().click(); await p.waitForTimeout(2500);
log('5 cotizar unidad A', p.url().replace(BASE, ''), await msgs(p));
// 6 update own lead pointing to A's unit
swap = [[unitB, A.unit]];
await p.goto(BASE + leadPath);
await p.locator('summary', { hasText: 'Editar datos' }).click();
await p.locator('select[name=developmentId]').selectOption({ index: 1 }); await p.waitForTimeout(300);
await p.locator('select[name=unitId]').selectOption(unitB);
await p.getByRole('button', { name: /guardar/i }).last().click(); await p.waitForTimeout(2000);
log('6 lead B -> unidad A', await msgs(p));
// 7 delete A's lead
swap = [[leadB, A.leadAna]];
await p.goto(BASE + leadPath);
await p.getByRole('button', { name: /eliminar lead/i }).click(); await p.waitForTimeout(2500);
log('7 borrar lead A', p.url().replace(BASE, ''), (await p.innerText('body')).slice(0, 100).replace(/\s+/g, ' '));
await shot(p, 'f8-borrar-lead-ajeno');
swap = null;
// 8 forge org cookie
await p.context().addCookies([{ name: 'org_id', value: orgA, url: BASE }]);
await p.goto(BASE + '/app/leads');
log('8 cookie org_id de A', (await p.innerText('body')).slice(0, 150).replace(/\s+/g, ' '));
log('BD antes  ', before);
log('BD despues', JSON.stringify(await sql(probe, [A.lead, A.unit, A.leadAna])));
log('inyectado en A', JSON.stringify(await sql("select (select count(*) from activities where body like '%INYECTADA%') actividades, (select count(*) from tasks where title like '%INYECTADA%') tareas, (select count(*) from quotes where organization_id=$1 and unit_id=$2) cotizaciones_en_unidad_de_A", [orgA, A.unit])));
await b.close();
