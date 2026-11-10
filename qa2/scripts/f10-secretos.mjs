import { browser, login, BASE } from './lib.mjs';
import fs from 'fs';
const acc = JSON.parse(fs.readFileSync('accounts.json'));
const env = fs.readFileSync('../.env.local', 'utf8');
const secrets = Object.fromEntries(env.split('\n').filter(l => /^[A-Z_]+=.+/.test(l)).map(l => [l.split('=')[0], l.slice(l.indexOf('=') + 1).trim().replace(/^"|"$/g, '')]).filter(([k, v]) => v.length > 6 && !k.startsWith('NEXT_PUBLIC') && !['APP_URL', 'WHATSAPP_PROVIDER'].includes(k)));
const b = await browser();
const { p } = await login(b, acc.A.email, { password: acc.A.password });
const urls = new Set();
p.on('response', r => { if (/\.js|_next/.test(r.url())) urls.add(r.url()); });
const htmls = [];
for (const path of ['/app', '/app/leads', '/app/configuracion', '/app/pipeline', '/app/cotizador', '/app/equipo', '/app/desarrollos', '/', '/f/demo-potosi']) { await p.goto(BASE + path, { waitUntil: 'networkidle' }); htmls.push(await p.content()); }
let all = htmls.join('\n');
for (const u of urls) { try { all += '\n' + await (await p.request.get(u)).text(); } catch {} }
console.log('archivos revisados', urls.size, 'bytes', all.length);
for (const [k, v] of Object.entries(secrets)) console.log(k, all.includes(v) ? 'FILTRADO!!' : 'ok');
for (const pat of [/sb_secret_[\w-]+/, /service_role/, /postgres(ql)?:\/\/[^\s"']+/, /sk-ant-[\w-]+/, /WHATSAPP_APP_SECRET/]) console.log(pat, (all.match(pat) || ['ok'])[0].slice(0, 60));
await b.close();
