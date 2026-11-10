// B10 on the production build: an asesor re-capturing a phone another asesor handles gets an explanation, not a 404.
import { browser, login, BASE, sql } from './lib.mjs';
const b = await browser();
const phone = (await sql("select l.phone from leads l join users u on u.id=l.assigned_to_id where u.email='asesor1@potosi.ejemplo.test' limit 1"))[0].phone.replace('+52', '');
const { p } = await login(b, 'asesor2@potosi.ejemplo.test', { width: 390, height: 844 });
await p.goto(BASE + '/app/leads/nuevo');
await p.fill('[name=firstName]', 'Intento'); await p.fill('[name=phone]', phone); await p.check('[name=consent]');
await p.getByRole('button', { name: /guardar|crear|registrar/i }).click();
await p.waitForTimeout(2500);
const alerts = (await p.locator('[role=alert]').allInnerTexts()).filter((t) => t.trim());
console.log('url:', p.url().replace(BASE, ''));
console.log('aviso:', alerts.join(' | '));
const ok = /lo atiende otro asesor/.test(alerts.join(' ')) && p.url().endsWith('/app/leads/nuevo');
console.log(ok ? 'OK' : 'FALLA');
await b.close();
process.exitCode = ok ? 0 : 1;
