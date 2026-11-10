// Genera logos, paletas, páginas de logos, SUPUESTOS e index. Las pantallas y capturas las genera shots.mjs.
import fs from 'fs';
import path from 'path';
import { DIR, PAIRS, verify } from './tokens.mjs';
import { logos } from './logos.mjs';
import { ratio } from './lib.mjs';

const ROOT = path.resolve('.');
const w = (f, s) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); };

const USE = {
  accentInk: 'Acento cuando se usa como texto (palabra destacada)', bg: 'Fondo de la app y de la landing', surface: 'Tarjetas, paneles y barras', surface2: 'Columnas del pipeline, fondo del plano, controles suaves',
  ink: 'Texto principal', muted: 'Texto secundario y etiquetas', line: 'Bordes y divisores (decorativos, no cuentan como texto)',
  primary: 'Acción principal, enlaces, selección activa', onPrimary: 'Texto e íconos sobre el color primario', accent: 'Acento propio de Tlalli: etiquetas, avisos, botón de llamado',
  onAccent: 'Texto sobre el acento', ok: 'Lote disponible · todo bien', warn: 'Lote apartado · atención', sold: 'Lote vendido', danger: 'Lead frío · urgente · error',
  okBg: 'Fondo de "disponible"', warnBg: 'Fondo de "apartado"', soldBg: 'Fondo de "vendido"', dangerBg: 'Fondo de avisos de frío',
};
const WHY = {
  A: {
    si: 'Es la evolución natural de lo que ya usa la app (azul cianotipo, naranja de estaca, esquinas casi rectas): se lee como instrumento de trabajo, encaja con el tono mono y la rejilla de KoatlCyber y se ve bien a pleno sol.',
    no: 'Es la más cercana a un SaaS "serio" conocido: el azul con rejilla puede sentirse frío y menos memorable que B o C, y el acento arcilla comparte familia con el rojo de "frío".',
  },
  B: {
    si: 'La más memorable y la más "KoatlCyber": oscura, técnica, con el plano brillando; el amarillo-limón da identidad propia a Tlalli y se ve moderna.',
    no: 'En la caseta, con sol directo, un fondo oscuro se lee peor y cansa más; además queda más lejos del "sólido sin parecer financiero frío" que pidieron: se siente de consola, no de obra.',
  },
  C: {
    si: 'La más cálida y cercana: serif amable, esquinas generosas, verde de campo y amarillo flor; es la que mejor cumple "confiable sin frialdad" y la más legible al aire libre.',
    no: 'Las ondas del logo pueden leerse como "agua" y no como "tierra", y la serif con esquinas grandes se aleja del aire técnico de KoatlCyber: riesgo de verse demasiado amigable para directores comerciales.',
  },
};

const fmt = (n) => n.toFixed(1) + ':1';
const rows = verify();

const KEYS = process.env.KEYS ? process.env.KEYS.split(',') : ['A', 'B', 'C'];
const SOLO_VARIANTES = Boolean(process.env.KEYS);
for (const k of KEYS) {
  const d = DIR[k]; const L = logos(k);
  // ---- logos
  const dirOut = path.join(ROOT, k, 'logo');
  w(path.join(dirOut, 'tlalli-principal.svg'), L.principal);
  w(path.join(dirOut, 'tlalli-monocroma.svg'), L.monocroma);
  w(path.join(dirOut, 'tlalli-icono.svg'), L.icono);
  w(path.join(dirOut, 'tlalli-favicon.svg'), L.icono.replace('width="512" height="512"', 'width="32" height="32"'));
  w(path.join(dirOut, 'tlalli-oscuro.svg'), L.oscuro);
  w(path.join(dirOut, 'tlalli-icono-oscuro.svg'), L.iconoOscuro);

  // ---- página de logos
  const dark = d.dark ?? d.light;
  w(path.join(ROOT, k, 'logos.html'), `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tlalli ${d.name} · Logotipo</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#eceae4;color:#1b1b1b}main{max-width:1100px;margin:0 auto;padding:32px 24px}h1{margin:0 0 4px}p.s{margin:0 0 24px;color:#555}
.g{display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:16px}.c{border-radius:14px;padding:28px;display:flex;flex-direction:column;gap:14px;justify-content:space-between;min-height:190px}.c small{font:12px/1.3 ui-monospace,monospace;opacity:.75}.c svg{max-width:100%;height:auto}
.light{background:#fff}.dk{background:${d.dark ? d.dark.bg : '#0F1720'};color:#eee}.warm{background:${d.light.bg}}.row{display:flex;gap:18px;align-items:end;flex-wrap:wrap}.row img{display:block}
.tint{background:${d.light.primary}}</style></head><body><main>
<h1>Tlalli · ${d.name}</h1><p class="s">Logotipo en SVG dibujado con trazos y formas propias (no depende de ninguna fuente). Archivos en <code>logo/</code>.</p>
<div class="g">
<div class="c light"><div>${L.principal}</div><small>Principal · tlalli-principal.svg</small></div>
<div class="c light"><div>${L.monocroma}</div><small>Monocroma (una tinta) · tlalli-monocroma.svg</small></div>
<div class="c dk"><div>${L.oscuro}</div><small>Sobre fondo oscuro · tlalli-oscuro.svg</small></div>
<div class="c warm"><div class="row"><div style="width:128px">${L.icono.replace(/width="512" height="512"/, 'width="128" height="128"')}</div><div style="width:128px">${L.iconoOscuro.replace(/width="512" height="512"/, 'width="128" height="128"')}</div></div><small>Ícono cuadrado · app icon 512 (claro y oscuro)</small></div>
<div class="c light"><div class="row" id="fav">${[16, 24, 32, 48, 64].map((s) => `<div style="text-align:center"><div style="width:${s}px;height:${s}px">${L.icono.replace(/width="512" height="512"/, `width="${s}" height="${s}"`)}</div><small>${s}px</small></div>`).join('')}</div><small>Favicon: legibilidad a 16, 24, 32, 48 y 64 px</small></div>
<div class="c light"><div class="row">${['#FFFFFF', '#F3F1EC', '#D9F24F', '#0E5A4E', '#1B4B82', '#0C1110'].map((c) => `<div style="background:${c};padding:14px;border-radius:8px">${L.inline(['#0E5A4E', '#1B4B82', '#0C1110'].includes(c) ? 'dark' : 'light', 26)}</div>`).join('')}</div><small>Prueba sobre fondos distintos</small></div>
</div></main></body></html>`);

  // ---- paleta
  const modes = d.light && d.dark ? ['light', 'dark'] : [];
  const names = { light: 'Modo claro', dark: 'Modo oscuro' };
  const tbl = (mode) => {
    const t = d[mode];
    const colorRows = Object.entries(t).filter(([key]) => !['soldFill', 'soldText'].includes(key)).map(([key, hex]) => `| \`${key}\` | \`${hex}\` | ${USE[key] ?? ''} |`).join('\n');
    const pairRows = rows.filter((r) => r.dir === k && r.mode === mode).map((r) => `| ${r.label} | \`${r.fg}\` / \`${r.bg}\` | ${fmt(r.r)} | ${r.min}:1 | ${r.pass ? 'Pasa' : '**NO PASA**'} |`).join('\n');
    return `### ${names[mode]}\n\n| Token | Hex | Uso |\n|---|---|---|\n${colorRows}\n\n**Contraste verificado (WCAG 2.x AA)**\n\n| Par | Colores (texto / fondo) | Razón | Mínimo | Resultado |\n|---|---|---|---|---|\n${pairRows}\n`;
  };
  const pass = rows.filter((r) => r.dir === k).every((r) => r.pass);
  w(path.join(ROOT, k, 'PALETA.md'), `# Tlalli · ${d.name} — paleta y tipografía\n\n${d.tag}. Modo por defecto: ${k === 'B' ? 'oscuro (con variante clara)' : 'claro (con variante oscura)'}.\n\n## Tipografías (Google Fonts)\n\n${d.fonts.map((f, i) => `- **${f}** — ${['Títulos y cifras grandes', 'Texto de interfaz', 'Datos, etiquetas y códigos de campaña'][i] ?? ''}`).join('\n')}\n\nEnlace: \`https://fonts.googleapis.com/css2?${d.gf}&display=swap\`. En producción se cargarían con \`next/font\` (autoalojadas), porque el CSP de la app solo permite fuentes del mismo sitio.\n\n## Colores\n\n${modes.map(tbl).join('\n')}\n**Resultado global:** ${pass ? 'todos los pares de texto cumplen 4.5:1 y los de no-texto (bordes de lote) 3:1, en modo claro y oscuro.' : 'HAY PARES QUE NO CUMPLEN.'}\n\n**Estatus del plano (no depende solo del color):** disponible = relleno claro + borde verde; apartado = rayado diagonal + borde ámbar; vendido = relleno sólido oscuro/gris. Se distinguen en escala de grises.\n`);

  // paleta visual
  const sw = (mode) => {
    const t = d[mode]; const keys = ['bg', 'surface', 'surface2', 'ink', 'muted', 'primary', 'accent', 'ok', 'warn', 'sold', 'danger'];
    return `<h3>${names[mode]}</h3><div class="sw">${keys.map((key) => { const on = ratio(t[key], '#000000') > ratio(t[key], '#FFFFFF') ? '#000' : '#fff'; return `<div style="background:${t[key]};color:${on}"><b>${key}</b><br>${t[key]}</div>`; }).join('')}</div>`;
  };
  w(path.join(ROOT, k, 'paleta.html'), `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tlalli ${d.name} · Paleta</title>
<style>body{margin:0;font:15px/1.5 system-ui,sans-serif;background:#fafafa;color:#111}main{max-width:1100px;margin:0 auto;padding:28px 24px}.sw{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:8px}.sw div{padding:14px 12px;border-radius:10px;font:12px/1.4 ui-monospace,monospace;min-height:84px;border:1px solid rgba(0,0,0,.12)}
table{border-collapse:collapse;width:100%;font-size:13px;margin:10px 0 28px}td,th{border-bottom:1px solid #ddd;padding:6px 8px;text-align:left}.ok{color:#116a3b;font-weight:700}.no{color:#b00020;font-weight:700}</style></head><body><main>
<h1>Tlalli · ${d.name}</h1><p>${d.tag}. Tipografías: ${d.fonts.join(', ')}.</p>${modes.map(sw).join('')}
${modes.map((mode) => `<h3>Contraste · ${names[mode]}</h3><table><tr><th>Par</th><th>Texto / fondo</th><th>Razón</th><th>Mínimo</th><th></th></tr>${rows.filter((r) => r.dir === k && r.mode === mode).map((r) => `<tr><td>${r.label}</td><td><span style="background:${r.bg};color:${r.fg};padding:2px 8px;border-radius:4px;border:1px solid #0002">Aa ${r.fg}</span></td><td>${fmt(r.r)}</td><td>${r.min}:1</td><td class="${r.pass ? 'ok' : 'no'}">${r.pass ? 'Pasa' : 'NO PASA'}</td></tr>`).join('')}</table>`).join('')}
</main></body></html>`);
}

if (SOLO_VARIANTES) { console.log('listo (solo variantes)'); process.exit(0); }
// ---------- SUPUESTOS ----------
w(path.join(ROOT, 'SUPUESTOS.md'), `# Supuestos (no hubo preguntas; esto es lo que di por cierto)

## Sobre KoatlCyber
- **No encontré ningún activo de KoatlCyber** (logotipo, guía de marca, tipografías) en el repositorio ni en la carpeta del proyecto. Por eso la "familia" la definí yo con tres rasgos compartidos por las tres direcciones, para que se sientan hermanas de un mismo estudio de tecnología: (1) **etiquetas en monoespaciada** pequeña para datos, códigos y secciones; (2) **rejilla visible y ordenada** (módulos de 8 px, tablas y columnas alineadas a ella); (3) **tono directo en español de México**, sin tecnicismos. Si KoatlCyber ya tiene tipografía o color propios, hay que reemplazar estos tres rasgos por los reales.
- "Un producto de KoatlCyber" aparece como sello discreto, siempre en monoespaciada.
- Cada dirección tiene un **acento propio** que no pertenece a la familia: arcilla (A), amarillo-limón (B), amarillo flor (C).

## Sobre la app real (de donde partí)
- Leí los componentes actuales: columnas y tarjetas del pipeline (\`pipeline/board.tsx\`), banner "Contacta primero", aviso "Deshacer (n s)", menú del celular de 10 secciones, leyenda y colores del plano de lotes (\`plan-board.tsx\`), y los tokens de \`globals.css\` (azul cianotipo, naranja de estaca para "frío", ocre para "apartado", esquinas pequeñas, Bricolage Grotesque + Geist). Las pantallas del diseño usan las mismas piezas: columnas Nuevo → Apartado, tarjetas con campaña, última interacción y "Mover a…", y los avisos de frío.
- No toqué \`src/\`, \`prisma/\` ni \`tests/\`. No apliqué el cambio de nombre.
- Todos los datos son **inventados** (personas, desarrollos "Los Álamos" y "Vista Real", "Desarrollos Lomas del Altiplano", códigos de campaña). La cita de la landing es de ejemplo y está marcada como tal.

## Sobre el nombre y el logotipo
- Tlalli (náhuatl: tierra, terreno). **No hice búsqueda de marca ni de dominio**; no puedo garantizar que no exista un logotipo parecido, solo que ninguno copia uno que yo conozca. Antes de adoptarlo hay que hacer búsqueda en IMPI y en dominios.
- Inspiración náhuatl, sutil y sin símbolos sagrados ni deidades: **A** usa el ritmo de una retícula de parcelas (una "T" hecha de lotes con uno marcado); **B** usa la geometría del mojón de topografía, un rombo partido en cuatro triángulos; **C** usa los surcos del campo como tres líneas onduladas. Ninguno usa grecas, pirámides escalonadas, serpientes, soles ni calendarios.
- Los logotipos están **dibujados con trazos propios, sin fuentes**, para que el SVG se vea igual en cualquier lugar. Las letras de A y C son minúsculas de trazo constante; las de B son mayúsculas angulares.

## Sobre accesibilidad
- Verifiqué con la fórmula WCAG 2.x todos los pares de texto a **4.5:1** y los bordes de lote del plano a **3:1**, en claro y oscuro, para las tres direcciones (tablas en \`A|B|C/PALETA.md\` y \`paleta.html\`). Texto grande no se usó para relajar ningún par.
- El estatus del plano nunca depende solo del color: disponible (relleno claro), apartado (rayado), vendido (relleno sólido).
- Objetivos táctiles de 44 px o más y campos de 16 px en las pantallas de celular.
- Verifiqué contraste y desbordes, no usé lectores de pantalla ni probé daltonismo con simulador; el rayado se eligió por eso.

## Sobre las pantallas
- Cada dirección tiene tres pantallas en HTML/CSS: **landing** (1280 y 390), **app de escritorio** (pipeline, 1280) y **celular** (lista de seguimiento del asesor, 390). El plano de lotes aparece en la landing; el plano de lotes interactivo de la app real no se rediseñó como pantalla aparte porque pidieron tres.
- Las capturas son PNG con deviceScaleFactor 2: las landings en página completa y las pantallas de la app en la ventana visible (las barras fijas y avisos de "Deshacer" se ven donde estarían en el uso real).
- Las fuentes se cargan de Google Fonts al abrir el HTML (necesita internet); las capturas se generaron con las fuentes cargadas (lo comprobé en cada una).
- El modo alterno se ve agregando \`?tema=oscuro\` o \`?tema=claro\` a la dirección de cada pantalla; hay capturas del modo alterno de la app de escritorio en \`capturas/\`.
- En producción las fuentes irían autoalojadas con \`next/font\` (como ya hace la app): el CSP que agregamos solo permite fuentes del mismo sitio.

## Qué dejé fuera
- Pantalla de plano a tamaño completo, estados vacíos, formularios y diálogos; pantallas de inicio de sesión; un sistema completo de componentes. Son siguiente paso después de elegir.
`);

// ---------- INDEX ----------
const card = (k) => {
  const d = DIR[k]; const L = logos(k); const t = d.light; const dk = d.dark ?? d.light;
  const mainMode = k === 'B' ? dk : t;
  const sw = ['bg', 'surface', 'ink', 'primary', 'accent', 'ok', 'warn', 'sold', 'danger'].map((key) => `<i title="${key} ${mainMode[key]}" style="background:${mainMode[key]}"></i>`).join('');
  const shot = (n, wd) => `capturas/${k}-${n}-${wd}.png`;
  return `<article class="dir" id="dir-${k}">
  <header><span class="letter">${k}</span><div><h2>${d.name}</h2><p>${d.tag}</p></div></header>
  <div class="logos"><div class="lb light">${L.principal}</div><div class="lb dark" style="background:${dk.bg}">${L.oscuro.replace(/<rect width="100%" height="100%"[^>]*\/>/, '')}</div></div>
  <div class="icons">${L.icono.replace(/width="512" height="512"/, 'width="56" height="56"')}${L.iconoOscuro.replace(/width="512" height="512"/, 'width="56" height="56"')}<span class="mono">ícono · favicon · app icon</span></div>
  <div class="pal">${sw}</div>
  <p class="fonts">${d.fonts.join(' · ')}</p>
  <div class="thumbs">
    <a href="${k}/landing.html"><img loading="lazy" src="${shot('landing', 1280)}" alt="Landing ${d.name} en escritorio"><span>Landing · 1280</span></a>
    <a href="${k}/app.html"><img loading="lazy" src="${shot('app', 1280)}" alt="App ${d.name} en escritorio"><span>App · pipeline</span></a>
    <a href="${k}/celular.html"><img loading="lazy" src="${shot('celular', 390)}" alt="Celular ${d.name}"><span>Celular · seguimiento</span></a>
  </div>
  <ul class="links"><li><a href="${k}/landing.html">Landing</a> (<a href="${shot('landing', 1280)}">1280</a> · <a href="${shot('landing', 390)}">390</a>)</li><li><a href="${k}/app.html">App escritorio</a> (<a href="${shot('app', 1280)}">PNG</a>${k === 'B' ? ' · <a href="' + k + '/app.html?tema=claro">claro</a>' : ' · <a href="' + k + '/app.html?tema=oscuro">oscuro</a>'})</li><li><a href="${k}/celular.html">Celular</a> (<a href="${shot('celular', 390)}">PNG</a>${k === 'B' ? ' · <a href="' + k + '/celular.html?tema=claro">claro</a>' : ' · <a href="' + k + '/celular.html?tema=oscuro">oscuro</a>'})</li><li><a href="${k}/logos.html">Logotipos</a> · <a href="${k}/paleta.html">Paleta y contraste</a> · <a href="${k}/PALETA.md">PALETA.md</a></li></ul>
  <p class="why si"><b>Por qué sí.</b> ${WHY[k].si}</p>
  <p class="why no"><b>Por qué no.</b> ${WHY[k].no}</p>
</article>`;
};
w(path.join(ROOT, 'index.html'), `<!doctype html><html lang="es-MX"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Tlalli · tres direcciones visuales</title>
<style>
:root{--bg:#F1EFE9;--ink:#15191C;--muted:#4A5258;--line:#CFCBC0}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,-apple-system,'Segoe UI',sans-serif}
main{max-width:1500px;margin:0 auto;padding:36px 28px 64px}h1{margin:0 0 6px;font-size:40px;letter-spacing:-.02em}.lead{max-width:60em;color:var(--muted);margin:0 0 28px}
.mono{font:12px ui-monospace,Consolas,monospace;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:22px;align-items:start}
.dir{background:#fff;border:1.5px solid var(--ink);border-radius:6px;padding:20px;display:flex;flex-direction:column;gap:14px}
.dir header{display:flex;gap:14px;align-items:center}.letter{width:46px;height:46px;border-radius:50%;background:var(--ink);color:#fff;display:grid;place-items:center;font:700 22px system-ui}
.dir h2{margin:0;font-size:26px;line-height:1.1}.dir header p{margin:0;color:var(--muted)}
.logos{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lb{border-radius:8px;padding:16px 10px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);min-height:92px}.lb svg{max-width:100%;height:auto;max-height:64px}.lb.dark{border-color:transparent}
.icons{display:flex;gap:12px;align-items:center}.icons svg{border-radius:12px}
.pal{display:flex;height:34px;border-radius:6px;overflow:hidden;border:1px solid var(--line)}.pal i{flex:1}
.fonts{margin:0;font:13px ui-monospace,Consolas,monospace;color:var(--muted)}
.thumbs{display:grid;grid-template-columns:1.6fr 1.6fr .8fr;gap:8px;align-items:start}.thumbs a{text-decoration:none;color:inherit;display:flex;flex-direction:column;gap:4px;font-size:12px;color:var(--muted)}
.thumbs img{width:100%;height:auto;border:1px solid var(--line);border-radius:4px;display:block;aspect-ratio:auto;max-height:230px;object-fit:cover;object-position:top}
.links{margin:0;padding-left:18px;font-size:14px}.links a{color:#0B4F8A}
.why{margin:0;padding:10px 12px;border-radius:6px;font-size:14.5px}.si{background:#E4F2E9}.no{background:#F8E7DF}
.rec{margin-top:30px;background:#fff;border:1.5px solid var(--ink);border-radius:6px;padding:18px 22px}
@media(max-width:1100px){.grid{grid-template-columns:1fr}}
</style></head><body><main>
<h1>Tlalli · tres direcciones visuales</h1>
<p class="lead">Tierra, terreno. CRM con WhatsApp para desarrolladoras e inmobiliarias de San Luis Potosí, un producto de KoatlCyber. Cada dirección trae logotipo propio (principal, monocromo, ícono, sobre oscuro), paleta con contraste verificado, y tres pantallas en HTML/CSS con datos inventados. Supuestos en <a href="SUPUESTOS.md">SUPUESTOS.md</a>. Nada de la app real se tocó.</p>
<div class="grid">${['A', 'B', 'C'].map(card).join('\n')}</div>
</main></body></html>`);
console.log('listo');
