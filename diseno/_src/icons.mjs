// Íconos de la app a partir del logotipo A3 (Tierra): src/app/icon.svg, apple-icon.png y favicon.ico (PNG dentro de ICO).
import fs from 'fs';
import { logos } from './logos.mjs';
import { chromium } from '../../qa/node_modules/playwright/index.mjs';
const svg = logos('A3').icono;
const out = '../src/app';
fs.writeFileSync(`${out}/icon.svg`, svg.replace(/width="512" height="512"/, 'width="64" height="64"'));
const b = await chromium.launch();
const render = async (size) => {
  const p = await b.newPage({ viewport: { width: size, height: size } });
  await p.setContent(`<body style="margin:0;background:transparent">${svg.replace(/width="512" height="512"/, `width="${size}" height="${size}"`)}</body>`);
  const buf = await p.screenshot({ omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
  await p.close();
  return buf;
};
fs.writeFileSync(`${out}/apple-icon.png`, await render(180));
const png32 = await render(32);
const ico = Buffer.alloc(22 + png32.length);
ico.writeUInt16LE(0, 0); ico.writeUInt16LE(1, 2); ico.writeUInt16LE(1, 4);
ico.writeUInt8(32, 6); ico.writeUInt8(32, 7); ico.writeUInt8(0, 8); ico.writeUInt8(0, 9);
ico.writeUInt16LE(1, 10); ico.writeUInt16LE(32, 12); ico.writeUInt32LE(png32.length, 14); ico.writeUInt32LE(22, 18);
png32.copy(ico, 22);
fs.writeFileSync(`${out}/favicon.ico`, ico);
await b.close();
console.log('íconos listos');
