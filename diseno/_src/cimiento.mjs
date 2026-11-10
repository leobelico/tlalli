// Página que compara las 3 variantes de color de Cimiento: diseno/cimiento.html
import fs from 'fs';
import path from 'path';
import { DIR, verify } from './tokens.mjs';
import { logos } from './logos.mjs';

const ROOT = path.resolve('.');
const KEYS = ['A', 'A2', 'A3'];
const TXT = {
  A: { titulo: '1 · Cianotipo', frase: 'Azul de plano y arcilla. La más cercana a la app actual: sobria, técnica, confiable.', si: 'Continuidad total con lo que ya conocen los usuarios; se siente instrumento de trabajo.', no: 'Es la más "SaaS serio" de las tres; puede sentirse fría.' },
  A2: { titulo: '2 · Pino', frase: 'Verde de pino y ocre. Habla de terreno, campo y crecimiento sin dejar de ser sobria.', si: 'Diferencia al producto de casi todo el software inmobiliario (que es azul) y evoca terreno sin clichés.', no: 'El verde + rojo de "frío" pide cuidado para personas con daltonismo (por eso el plano también usa texturas).' },
  A3: { titulo: '3 · Tierra', frase: 'Terracota y verde turquesa sobre arena. La más literal con "tlalli": tierra cocida.', si: 'La más cálida y memorable; el fondo arena baja el brillo y se lee bien a pleno sol.', no: 'El café-terracota se aleja del aire "cyber" de KoatlCyber y exige cuidar que no se vea anticuado.' },
};
const bad = verify().filter((r) => KEYS.includes(r.dir) && !r.pass);
const card = (k) => {
  const d = DIR[k]; const L = logos(k); const t = d.light; const dk = d.dark;
  const sw = (m) => ['bg', 'surface2', 'ink', 'primary', 'accent', 'ok', 'warn', 'sold', 'danger'].map((key) => `<i title="${key} ${m[key]}" style="background:${m[key]}"></i>`).join('');
  const shot = (n, w) => `capturas/${k}-${n}-${w}.png`;
  return `<article class="dir">
  <header><span class="letter">${TXT[k].titulo.split(' ')[0]}</span><div><h2>${TXT[k].titulo.split('· ')[1]}</h2><p>${TXT[k].frase}</p></div></header>
  <div class="logos"><div class="lb light">${L.principal}</div><div class="lb dark" style="background:${dk.bg}">${L.oscuro.replace(/<rect width="100%" height="100%"[^>]*\/>/, '')}</div></div>
  <div class="icons">${L.icono.replace(/width="512" height="512"/, 'width="56" height="56"')}${L.iconoOscuro.replace(/width="512" height="512"/, 'width="56" height="56"')}<span class="mono">ícono · favicon · app icon</span></div>
  <p class="mono lab">Claro</p><div class="pal">${sw(t)}</div><p class="mono lab">Oscuro</p><div class="pal">${sw(dk)}</div>
  <table class="hex"><tr><td>Primario</td><td><code>${t.primary}</code></td><td>Acento</td><td><code>${t.accent}</code></td></tr><tr><td>Fondo</td><td><code>${t.bg}</code></td><td>Texto</td><td><code>${t.ink}</code></td></tr></table>
  <div class="thumbs">
    <a href="${k}/landing.html"><img loading="lazy" src="${shot('landing', 1280)}" alt="Landing"><span>Landing</span></a>
    <a href="${k}/app.html"><img loading="lazy" src="${shot('app', 1280)}" alt="App"><span>App · pipeline</span></a>
    <a href="${k}/celular.html"><img loading="lazy" src="${shot('celular', 390)}" alt="Celular"><span>Celular</span></a>
  </div>
  <ul class="links"><li><a href="${k}/landing.html">Landing</a> (<a href="${shot('landing', 1280)}">1280</a> · <a href="${shot('landing', 390)}">390</a>)</li><li><a href="${k}/app.html">App escritorio</a> (<a href="${shot('app', 1280)}">PNG</a> · <a href="${k}/app.html?tema=oscuro">modo oscuro</a>)</li><li><a href="${k}/celular.html">Celular</a> (<a href="${shot('celular', 390)}">PNG</a> · <a href="${k}/celular.html?tema=oscuro">modo oscuro</a>)</li><li><a href="${k}/logos.html">Logotipos</a> · <a href="${k}/paleta.html">Paleta y contraste</a> · <a href="${k}/PALETA.md">PALETA.md</a></li></ul>
  <p class="why si"><b>Por qué sí.</b> ${TXT[k].si}</p><p class="why no"><b>Por qué no.</b> ${TXT[k].no}</p>
</article>`;
};
fs.writeFileSync(path.join(ROOT, 'cimiento.html'), `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tlalli · Cimiento en tres colores</title>
<style>
:root{--bg:#F1EFE9;--ink:#15191C;--muted:#4A5258;--line:#CFCBC0}*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}main{max-width:1500px;margin:0 auto;padding:36px 28px 64px}
h1{margin:0 0 6px;font-size:38px;letter-spacing:-.02em}.lead{max-width:62em;color:var(--muted);margin:0 0 26px}.mono{font:12px ui-monospace,Consolas,monospace;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:start}
.dir{background:#fff;border:1.5px solid var(--ink);border-radius:6px;padding:20px;display:flex;flex-direction:column;gap:12px}
.dir header{display:flex;gap:14px;align-items:flex-start}.letter{flex:none;width:46px;height:46px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 22px system-ui}
.dir h2{margin:0;font-size:26px;line-height:1.1}.dir header p{margin:4px 0 0;color:var(--muted);font-size:15px}
.logos{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lb{border-radius:8px;padding:16px 10px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);min-height:92px}.lb svg{max-width:100%;height:auto;max-height:60px}.lb.dark{border-color:transparent}
.icons{display:flex;gap:12px;align-items:center}.icons svg{border-radius:12px}
.lab{margin:2px 0 -6px}.pal{display:flex;height:30px;border-radius:6px;overflow:hidden;border:1px solid var(--line)}.pal i{flex:1}
.hex{width:100%;border-collapse:collapse;font-size:13px}.hex td{padding:3px 6px;border-bottom:1px solid var(--line)}.hex td:nth-child(odd){color:var(--muted)}
.thumbs{display:grid;grid-template-columns:1.6fr 1.6fr .8fr;gap:8px;align-items:start}.thumbs a{text-decoration:none;color:var(--muted);display:flex;flex-direction:column;gap:4px;font-size:12px}
.thumbs img{width:100%;height:auto;border:1px solid var(--line);border-radius:4px;display:block;max-height:230px;object-fit:cover;object-position:top}
.links{margin:0;padding-left:18px;font-size:14px}.links a{color:#0B4F8A}
.why{margin:0;padding:10px 12px;border-radius:6px;font-size:14.5px}.si{background:#E4F2E9}.no{background:#F8E7DF}
.note{margin-top:22px;color:var(--muted);max-width:62em}
@media(max-width:1100px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Tlalli · Cimiento en tres colores</h1>
<p class="lead">Mismo diseño (sidebar fija, rejilla, etiquetas en mono, tipografía Bricolage Grotesque + Geist), tres paletas. Cada una trae su logotipo en SVG (principal, monocromo, ícono, sobre oscuro), modo claro y oscuro, y las tres pantallas. Contraste WCAG AA verificado en todos los pares: ${bad.length ? bad.length + ' NO PASAN' : 'todos pasan'}.</p>
<div class="grid">${KEYS.map(card).join('\n')}</div>
<p class="note">Abre cada landing, app o celular en su enlace; agrega <code>?tema=oscuro</code> a la dirección para ver el modo oscuro. Volver a <a href="index.html">las tres direcciones</a>.</p>
</main></body></html>`);
console.log('cimiento.html listo; pares que no pasan:', bad.length);
