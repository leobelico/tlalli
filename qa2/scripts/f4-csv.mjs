import { browser, login, shot, BASE } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const log = (...a) => console.log('===', ...a);
for (const f of process.argv.slice(2)) {
  await p.goto(BASE + '/app/leads/importar');
  await p.setInputFiles('input[name=file]', `csv/${f}.csv`);
  await p.check('input[name=consent]').catch(() => {});
  const t = Date.now();
  await p.getByRole('button', { name: /importar/i }).click();
  await p.waitForFunction(() => /terminada|error|Revisa|columnas|Máximo|archivo/i.test(document.querySelector('main')?.innerText.split('Importar').slice(-1)[0] || ''), null, { timeout: 60000 }).catch(() => {});
  await p.waitForTimeout(1500);
  const txt = (await p.innerText('main')).split(/\n/).filter(l => /terminada|Fila|error|Error|columna|Máximo|archivo|ignor|reconoc/i.test(l)).join(' / ');
  log(f, `${Date.now() - t}ms`, txt.slice(0, 900));
  await shot(p, `f4-${f}`);
}
await b.close();
