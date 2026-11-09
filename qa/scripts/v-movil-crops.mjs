import { browser, login, BASE, SHOTS } from './lib.mjs';
const b = await browser();
const { p } = await login(b, 'admin@potosi.ejemplo.test', { width: 390, height: 844 });
const dev = (await p.goto(BASE + '/app/desarrollos') && await p.locator('a[href^="/app/desarrollos/"]').first().getAttribute('href'));
for (const [name, path] of [['leads', '/app/leads'], ['pipeline', '/app/pipeline'], ['equipo', '/app/equipo'], ['inicio', '/app'], ['inventario', dev]]) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.screenshot({ path: SHOTS + `movil-crop-${name}.png`, fullPage: false });
}
await b.close();
