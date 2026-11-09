// Authorization queue, end to end in the browser: asesor asks -> admin sees it -> approves -> asesor gets the quote.
import { browser, login, shot, BASE, sql } from './lib.mjs';
const log = (...a) => console.log('===', ...a);
const b = await browser();
const asesor = await login(b, 'asesor1@potosi.ejemplo.test', { width: 390, height: 844 });
const admin = await login(b, 'admin@potosi.ejemplo.test', { width: 1280, height: 800 });

// the demo org keeps the default 5%; pick a quotable unit and a lead of this asesor
const lead = (await sql("select l.id, l.first_name from leads l join users u on u.id=l.assigned_to_id where u.email='asesor1@potosi.ejemplo.test' and l.stage in ('NUEVO','CONTACTADO') limit 1"))[0];
const unit = (await sql("select u.id, u.code, u.price from units u join organizations o on o.id=u.organization_id where o.slug='demo-potosi' and u.status='DISPONIBLE' limit 1"))[0];
await sql("delete from authorization_requests where organization_id=(select id from organizations where slug='demo-potosi')");

await asesor.p.goto(`${BASE}/app/cotizador?lead=${lead.id}&unidad=${unit.id}`);
await asesor.p.selectOption('select[name=unitId]', unit.id);
await asesor.p.fill('[name=discount]', String(Math.round(Number(unit.price) * 0.2)));
await shot(asesor.p, 'v3-auth-asesor-pista-tope', false);
await asesor.p.getByRole('button', { name: /cotiz|generar|guardar/i }).first().click();
await asesor.p.waitForTimeout(2500);
log('asesor ve (no es error)', (await asesor.p.locator('[role=status]').allInnerTexts()).filter((t) => /descuento m/i.test(t)));
log('alertas en rojo', await asesor.p.locator('[role=alert]').count());
await shot(asesor.p, 'v3-auth-asesor-pendiente-cel', false);

await admin.p.goto(BASE + '/app');
log('banner del admin', (await admin.p.locator('[role=status]').first().innerText()).replace(/\s+/g, ' ').match(/\d+ solicitud[^·]*/)?.[0]);
await admin.p.goto(BASE + '/app/autorizaciones');
await shot(admin.p, 'v3-auth-admin-pendientes', false);
await admin.p.locator('input[name=note]').first().fill('Autorizado, cierra esta semana');
await admin.p.getByRole('button', { name: 'Autorizar' }).first().click();
await admin.p.waitForTimeout(3000);
log('admin', await admin.p.locator('.text-emerald-700').allInnerTexts());
const q = (await sql("select q.id, q.discount, u.email from quotes q join users u on u.id=q.created_by_id where q.lead_id=$1 order by q.created_at desc limit 1", [lead.id]))[0];
log('cotización creada a nombre del asesor', q.email, 'descuento', q.discount);

await asesor.p.goto(BASE + '/app/autorizaciones');
log('asesor ve el resultado', (await asesor.p.locator('main').innerText()).replace(/\s+/g, ' ').slice(0, 260));
await shot(asesor.p, 'v3-auth-asesor-historial-cel', false);
await b.close();
