import { browser, login, shot, BASE } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const b = await browser();
const pages = ['/app', '/app/leads', '/app/leads?q=Núñez', '/app/leads?q=449000', '/app/leads?frios=1', '/app/leads?page=100', '/app/pipeline', '/app/tareas', '/app/cotizador', '/app/campanas'];
const res = {};
for (const who of ['A', 'ASESOR']) {
  const { p } = await login(b, acc[who].email, { password: acc[who].password });
  for (const path of pages) {
    const times = [];
    for (let i = 0; i < 3; i++) {
      const t = Date.now();
      await p.goto(BASE + path, { waitUntil: 'load' });
      times.push(Date.now() - t);
    }
    const dom = await p.evaluate(() => document.querySelectorAll('*').length);
    const bytes = (await p.content()).length;
    res[`${who} ${path}`] = `min ${Math.min(...times)}ms / max ${Math.max(...times)}ms · DOM ${dom} nodos · HTML ${(bytes / 1024).toFixed(0)} KB`;
    if (who === 'A' && ['/app', '/app/pipeline', '/app/leads'].includes(path)) await shot(p, `f12-5000-${path.replace(/\W/g, '_')}`, false);
  }
}
console.log(JSON.stringify(res, null, 1));
await b.close();
