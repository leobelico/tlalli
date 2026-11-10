// Dirección B · Obsidiana: oscuro primero, técnico, tipografía grande, acento maíz-limón. Barra superior, sin sidebar.
import { DIR } from './tokens.mjs';
import { doc, plano, statusLegend, logoAuto } from './common.mjs';
import { logos } from './logos.mjs';
import { cols, seguimiento, org, esc } from './lib.mjs';

const L = logos('B');
const t = DIR.B.dark;

const base = `
body { font-family: 'Space Grotesk', system-ui, sans-serif; font-size: 15px; line-height: 1.5; }
h1, h2, h3 { font-weight: 700; letter-spacing: -0.035em; margin: 0; }
.mono { font-family: 'Space Mono', ui-monospace, monospace; font-size: 11.5px; letter-spacing: .04em; color: var(--muted); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 22px; border-radius: 999px; font-weight: 700; text-decoration: none; background: var(--primary); color: var(--on-primary); border: 0; font-family: inherit; font-size: 15px; }
.btn.ghost { background: transparent; color: var(--ink); box-shadow: inset 0 0 0 1.5px var(--line); }
.lg { display: flex; gap: 16px; list-style: none; margin: 0; padding: 0; font-size: 12.5px; color: var(--muted); font-family: 'Space Mono'; }
.lg li { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 14px; height: 14px; border-radius: 3px; border: 1.5px solid; }
.sw.d { background: var(--ok-bg); border-color: var(--ok); }
.sw.a { background: repeating-linear-gradient(45deg, var(--warn-bg) 0 3px, var(--warn) 3px 5px); border-color: var(--warn); }
.sw.v { background: var(--sold); border-color: var(--sold); }
.dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--ok); box-shadow: 0 0 0 3px var(--ok-bg); }
`;

export function landing() {
  const css = base + `
.wrap { max-width: 1240px; margin: 0 auto; padding: 0 36px; }
nav.top { display: flex; align-items: center; justify-content: space-between; height: 80px; border-bottom: 1px solid var(--line); }
nav.top ul { display: flex; gap: 6px; list-style: none; margin: 0; padding: 0; }
nav.top ul a { text-decoration: none; padding: 8px 14px; border-radius: 999px; color: var(--muted); font-family: 'Space Mono'; font-size: 13px; }
nav.top ul a:hover { color: var(--ink); }
.hero { padding: 76px 0 40px; text-align: left; position: relative; }
.hero h1 { font-size: 100px; line-height: .92; max-width: 8.4em; }
.hero h1 span { color: var(--primary); }
.hero .lead { font-size: 20px; color: var(--muted); max-width: 34em; margin: 28px 0 32px; }
.hero .row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
.feed { position: absolute; right: 0; top: 96px; width: 330px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; padding: 16px; }
.feed li { list-style: none; display: flex; gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); font-size: 13.5px; }
.feed li:last-child { border: 0; } .feed ul { margin: 8px 0 0; padding: 0; }
.feed b { font-weight: 600; } .feed .mono { margin-left: auto; white-space: nowrap; }
.stage { margin: 28px 0 0; background: var(--surface); border: 1px solid var(--line); border-radius: 20px; padding: 22px; }
.stage .bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.stage svg { width: 100%; height: auto; border-radius: 12px; display: block; }
.stats { display: grid; grid-template-columns: repeat(4, 1fr); border-top: 1px solid var(--line); margin-top: 36px; }
.stats div { padding: 26px 24px 26px 0; } .stats div + div { padding-left: 24px; border-left: 1px solid var(--line); }
.stats b { display: block; font-size: 52px; letter-spacing: -0.04em; line-height: 1; color: var(--primary); }
.cta { margin: 56px 0 24px; background: var(--primary); color: var(--on-primary); border-radius: 24px; padding: 44px; display: flex; justify-content: space-between; align-items: center; gap: 24px; }
.cta h2 { font-size: 44px; line-height: 1; max-width: 14em; } .cta .btn { background: var(--on-primary); color: var(--primary); }
footer { padding: 20px 0 32px; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
@media (max-width: 760px) {
  .wrap { padding: 0 18px; } nav.top ul { display: none; } nav.top { height: 68px; }
  .hero { padding: 40px 0 20px; } .hero h1 { font-size: 54px; } .hero .lead { font-size: 17px; }
  .feed { position: static; width: auto; margin-top: 28px; } .stats { grid-template-columns: 1fr 1fr; }
  .stats div, .stats div + div { padding: 18px 12px 18px 0; border-left: 0; } .stats b { font-size: 38px; }
  .cta { flex-direction: column; align-items: flex-start; padding: 28px; } .cta h2 { font-size: 32px; } .stage { padding: 12px; border-radius: 14px; }
}`;
  const body = `
<div class="wrap">
  <nav class="top" aria-label="Principal">
    <a href="#" aria-label="Tlalli, inicio">${logoAuto(L, 32)}</a>
    <ul><li><a href="#">/producto</a></li><li><a href="#">/plano</a></li><li><a href="#">/precios</a></li><li><a href="#">/piloto-slp</a></li></ul>
    <a class="btn ghost" href="#" style="min-height:42px">Entrar</a>
  </nav>
  <section class="hero">
    <p class="mono">CRM CON WHATSAPP · SAN LUIS POTOSÍ · UN PRODUCTO DE KOATLCYBER</p>
    <h1 style="margin-top:18px">Cada contacto, un lote más cerca de la <span>escritura.</span></h1>
    <p class="lead">Tus asesores ven a quién llamar primero. Tú ves el plano completo: qué lote está libre, apartado o vendido, y quién lo trae en la mano.</p>
    <div class="row"><a class="btn" href="#">Pedir demo por WhatsApp</a><a class="btn ghost" href="#">Ver el plano en vivo</a><span class="mono">14 días de prueba · sin tarjeta</span></div>
    <aside class="feed" aria-label="Actividad reciente">
      <span class="mono">EN VIVO · LOMAS DEL ALTIPLANO</span>
      <ul>
        <li><span class="dot"></span><span><b>Nuevo lead</b><br>RADIO-EXA · Lote 14</span><span class="mono">2 min</span></li>
        <li><span class="dot"></span><span><b>Cita agendada</b><br>Familia Treviño · 5:30 pm</span><span class="mono">1 h</span></li>
        <li><span class="dot"></span><span><b>Lote 9 apartado</b><br>Pedro Alvarado</span><span class="mono">1 d</span></li>
      </ul>
    </aside>
  </section>
  <section class="stage" aria-label="Plano de lotes">
    <div class="bar"><span class="mono">LÁMINA 01 · FRACCIONAMIENTO LOS ÁLAMOS · 72 LOTES</span>${statusLegend()}</div>
    ${plano(t, 'b1', { w: 560, font: "'Space Mono', monospace" })}
  </section>
  <section class="stats" aria-label="Cifras de ejemplo">
    <div><b>29 h</b><span class="mono">LEAD SIN CONTACTAR → ALERTA</span></div>
    <div><b>1</b><span class="mono">ASESOR POR LOTE APARTADO</span></div>
    <div><b>5 %</b><span class="mono">TOPE DE DESCUENTO, TUYO</span></div>
    <div><b>10 s</b><span class="mono">PARA DESHACER UN ERROR</span></div>
  </section>
  <section class="cta"><h2>Empieza con tu primer fraccionamiento esta semana.</h2><a class="btn" href="#">Hablar con nosotros</a></section>
  <footer><span class="mono">© TLALLI · KOATLCYBER</span><span class="mono">SAN LUIS POTOSÍ, MX</span></footer>
</div>`;
  return doc({ dir: 'B', title: 'Tlalli · Obsidiana · Landing', css, body, defaultMode: 'dark' });
}

const tabs = ['Pipeline', 'Leads', 'Tareas', 'Desarrollos', 'Cotizador', 'Autorizaciones', 'Equipo', 'Configuración'];
const led = ['#7FB3FF', '#B49CFF', '#D9F24F', '#F5B83D', '#3DDBB0'];

export function app() {
  const css = base + `
header.bar { display: flex; align-items: center; gap: 14px; height: 64px; padding: 0 20px; border-bottom: 1px solid var(--line); background: var(--surface); }
header.bar ul { display: flex; gap: 2px; list-style: none; margin: 0; padding: 0; }
header.bar ul a { text-decoration: none; padding: 7px 10px; border-radius: 8px; color: var(--muted); font-size: 14px; display: inline-flex; gap: 6px; align-items: center; }
header.bar ul a.on { background: var(--surface2); color: var(--ink); box-shadow: inset 0 -2px 0 var(--primary); }
header.bar .ct { background: var(--primary); color: var(--on-primary); border-radius: 999px; padding: 0 7px; font-family: 'Space Mono'; font-size: 11px; font-weight: 700; }
.cmd { margin-left: auto; min-width: 220px; height: 38px; border-radius: 10px; background: var(--bg); border: 1px solid var(--line); color: var(--muted); display: flex; align-items: center; justify-content: space-between; padding: 0 12px; font-size: 13.5px; }
.me { width: 36px; height: 36px; border-radius: 50%; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; font-weight: 700; }
main { padding: 20px 24px; }
.alert { display: flex; align-items: center; gap: 12px; border: 1px solid var(--danger); background: var(--danger-bg); border-radius: 12px; padding: 10px 14px; font-size: 14px; }
.alert b { color: var(--danger); font-family: 'Space Mono'; font-size: 12px; letter-spacing: .04em; }
.alert a { color: var(--ink); text-underline-offset: 3px; }
.title { display: flex; align-items: baseline; justify-content: space-between; margin: 20px 0 14px; }
.title h1 { font-size: 40px; } .chips { display: flex; gap: 8px; }
.chip { font-family: 'Space Mono'; font-size: 12px; border: 1px solid var(--line); border-radius: 999px; padding: 6px 12px; color: var(--muted); background: var(--surface); }
.chip.on { color: var(--on-primary); background: var(--primary); border-color: var(--primary); font-weight: 700; }
.board { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; align-items: start; }
.col { background: var(--surface); border: 1px solid var(--line); border-radius: 16px; padding: 4px 4px 6px; }
.col header { display: flex; align-items: center; gap: 8px; padding: 12px 10px 10px; }
.led { width: 9px; height: 9px; border-radius: 2px; background: var(--led); box-shadow: 0 0 0 3px color-mix(in srgb, var(--led) 25%, transparent); }
.col h2 { font-size: 15px; letter-spacing: -0.01em; } .col .n { margin-left: auto; font-family: 'Space Mono'; font-size: 12px; color: var(--muted); }
.card { background: var(--surface2); border-radius: 11px; padding: 11px 12px; margin: 0 4px 6px; border: 1px solid transparent; }
.card.cold { border-color: var(--danger); background: color-mix(in srgb, var(--danger-bg) 70%, var(--surface2)); }
.nm { font-weight: 600; font-size: 14.5px; line-height: 1.25; } .dv { color: var(--muted); font-size: 12.5px; margin-top: 2px; }
.meta { display: flex; justify-content: space-between; align-items: center; margin-top: 9px; gap: 6px; }
.tag { font-family: 'Space Mono'; font-size: 10.5px; color: var(--ink); background: var(--bg); border-radius: 6px; padding: 2px 7px; }
.when { font-family: 'Space Mono'; font-size: 11px; color: var(--muted); white-space: nowrap; } .cold .when { color: var(--danger); font-weight: 700; }
.who { margin-top: 9px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); }
.who i { font-style: normal; border: 1px solid var(--line); border-radius: 6px; padding: 1px 8px; }
.toast { position: fixed; left: 50%; transform: translateX(-50%); bottom: 22px; background: var(--ink); color: var(--bg); border-radius: 999px; padding: 8px 8px 8px 20px; display: flex; gap: 18px; align-items: center; font-size: 14px; }
.toast b { background: var(--primary); color: var(--on-primary); border-radius: 999px; padding: 0 16px; min-height: 36px; display: inline-flex; align-items: center; }
`;
  const colsHtml = cols.map((c, i) => `
<section class="col" style="--led:${led[i]}" aria-label="${c.name}">
  <header><span class="led"></span><h2>${c.name}</h2><span class="n">${String(c.n).padStart(2, '0')}</span></header>
  ${c.cards.map((k) => `<article class="card ${k.stale ? 'cold' : ''}"><div class="nm">${esc(k.who)}</div><div class="dv">${esc(k.dev)}</div>
  <div class="meta"><span class="tag">${k.camp}</span><span class="when">${k.last}</span></div>
  <div class="who"><span>${k.asg}</span><i>Mover a…</i></div></article>`).join('')}
</section>`).join('');
  const body = `
<header class="bar">
  <a href="#" aria-label="Tlalli">${logoAuto(L, 28)}</a>
  <nav aria-label="Secciones"><ul>${tabs.map((n) => `<li><a href="#" class="${n === 'Pipeline' ? 'on' : ''}">${n}${n === 'Autorizaciones' ? '<span class="ct">2</span>' : ''}</a></li>`).join('')}</ul></nav>
  <div class="cmd"><span>Buscar lead o lote…</span><span class="mono">⌘K</span></div>
  <span class="me" title="${org.user}">MO</span>
</header>
<main>
  <div class="alert" role="status"><b>CONTACTA PRIMERO</b><span><a href="#">Sergio Medina · 4 d</a> &nbsp;·&nbsp; <a href="#">Daniela Cuéllar · 29 h</a> &nbsp;·&nbsp; <a href="#">Regina Treviño · 6 d</a> &nbsp;·&nbsp; <a href="#">ver los 8 fríos</a></span></div>
  <div class="title"><div><span class="mono">${org.name.toUpperCase()} · 12 ABIERTOS</span><h1>Pipeline</h1></div>
    <div class="chips"><span class="chip on">Todos</span><span class="chip">Los Álamos</span><span class="chip">Vista Real</span><span class="chip">Solo fríos</span></div></div>
  <div class="board">${colsHtml}</div>
  <div class="toast" role="status">Moviste a Pedro Alvarado a Apartado <b>Deshacer · 8 s</b></div>
</main>`;
  return doc({ dir: 'B', title: 'Tlalli · Obsidiana · App', css, body, defaultMode: 'dark' });
}

export function mobile() {
  const css = base + `
body { font-size: 16px; padding-bottom: 92px; }
header.top { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--line); background: var(--surface); position: sticky; top: 0; z-index: 3; }
.menu { min-height: 44px; min-width: 44px; padding: 0 16px; border-radius: 999px; border: 1px solid var(--line); background: transparent; color: var(--ink); font: 600 15px 'Space Grotesk'; display: inline-flex; align-items: center; }
.pad { padding: 20px 16px 0; }
h1 { font-size: 48px; line-height: .95; margin-top: 8px; }
.sum { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 16px 0; }
.sum div { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; padding: 10px 12px; } .sum b { display: block; font-size: 28px; letter-spacing: -.03em; } .sum b.r { color: var(--danger); } .sum b.p { color: var(--primary); }
.alert { border: 1px solid var(--danger); background: var(--danger-bg); border-radius: 12px; padding: 10px 12px; font-size: 14.5px; margin-bottom: 14px; } .alert b { color: var(--danger); font-family: 'Space Mono'; font-size: 11.5px; }
.item { background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 16px; margin-bottom: 12px; position: relative; }
.item::before { content: ''; position: absolute; left: 0; top: 18px; bottom: 18px; width: 4px; border-radius: 0 4px 4px 0; background: var(--tone); }
.item.frio { --tone: var(--danger); } .item.hoy { --tone: var(--primary); } .item.tarea { --tone: var(--warn); } .item.luego { --tone: var(--line); }
.item h2 { font-size: 22px; letter-spacing: -.02em; } .why { font-family: 'Space Mono'; font-size: 12.5px; margin-top: 6px; color: var(--ink); } .item.frio .why { color: var(--danger); } .item.hoy .why { color: var(--primary); } .item.tarea .why { color: var(--warn); }
.det { color: var(--muted); font-size: 14px; margin-top: 4px; }
.acts { display: grid; grid-template-columns: 1fr 56px 56px; gap: 8px; margin-top: 14px; }
.acts a { min-height: 52px; border-radius: 14px; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; font-weight: 700; background: var(--surface2); color: var(--ink); }
.acts a.wa { background: var(--primary); color: var(--on-primary); font-size: 16px; }
.acts svg { width: 22px; height: 22px; }
.tabs { position: fixed; left: 12px; right: 12px; bottom: 12px; background: var(--surface2); border: 1px solid var(--line); border-radius: 20px; display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px; }
.tabs a { min-height: 56px; border-radius: 14px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-decoration: none; color: var(--muted); font-size: 12px; font-weight: 500; }
.tabs a.on { background: var(--primary); color: var(--on-primary); font-weight: 700; } .tabs svg { width: 22px; height: 22px; }
.toast { position: fixed; left: 12px; right: 12px; bottom: 96px; background: var(--ink); color: var(--bg); border-radius: 16px; padding: 8px 8px 8px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; }
.toast b { background: var(--primary); color: var(--on-primary); border-radius: 12px; min-height: 44px; padding: 0 14px; display: inline-flex; align-items: center; }
`;
  const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const body = `
<header class="top"><a href="#" aria-label="Tlalli">${logoAuto(L, 28)}</a><button class="menu">Menú</button></header>
<div class="pad">
  <span class="mono">LUN 9 NOV · BETO</span>
  <h1>Hoy te toca</h1>
  <div class="sum"><div><b class="r">3</b><span class="mono">FRÍOS</span></div><div><b class="p">1</b><span class="mono">CITA HOY</span></div><div><b>2</b><span class="mono">LISTOS</span></div></div>
  <div class="alert" role="status"><b>CONTACTA PRIMERO</b><br>Sergio Medina · 4 d &nbsp;·&nbsp; Daniela Cuéllar · 29 h</div>
  ${seguimiento.map((s) => `
  <article class="item ${s.tone}"><h2>${esc(s.who)}</h2><div class="why">${esc(s.why)}</div><div class="det">${esc(s.det)}</div>
    <div class="acts"><a class="wa" href="#">${ico('M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.9A8 8 0 1 1 21 12z')}&nbsp;WhatsApp</a><a href="#" aria-label="Llamar">${ico('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z')}</a><a href="#" aria-label="Mover de etapa">${ico('M5 12h14M13 6l6 6-6 6')}</a></div></article>`).join('')}
</div>
<div class="toast" role="status"><span>Moviste a Jorge a Contactado</span><b>Deshacer · 7 s</b></div>
<nav class="tabs" aria-label="Secciones"><a href="#" class="on">${ico('M3 11l9-8 9 8M5 10v10h14V10')}Hoy</a><a href="#">${ico('M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z')}Pipeline</a><a href="#">${ico('M4 6h16M4 12h16M4 18h16')}Leads</a><a href="#">${ico('M5 12l4 4L19 6')}Tareas</a></nav>`;
  return doc({ dir: 'B', title: 'Tlalli · Obsidiana · Celular', css, body, defaultMode: 'dark' });
}
