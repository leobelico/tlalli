// Dirección C · Milpa: cálida y cercana. Serif amable, esquinas grandes, riel lateral de íconos, verde de campo + cempasúchil.
import { DIR } from './tokens.mjs';
import { doc, plano, statusLegend, logoAuto } from './common.mjs';
import { logos } from './logos.mjs';
import { cols, seguimiento, org, esc, initials } from './lib.mjs';

const L = logos('C');
const t = DIR.C.light;

const base = `
body { font-family: 'DM Sans', system-ui, sans-serif; font-size: 16px; line-height: 1.5; }
h1, h2, h3, .serif { font-family: 'Fraunces', Georgia, serif; font-weight: 600; letter-spacing: -0.02em; margin: 0; font-optical-sizing: auto; }
.mono { font-family: 'DM Mono', ui-monospace, monospace; font-size: 12px; letter-spacing: .02em; color: var(--muted); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 50px; padding: 0 24px; border-radius: 16px; font-weight: 700; text-decoration: none; background: var(--primary); color: var(--on-primary); font-family: inherit; font-size: 16px; border: 0; }
.btn.acc { background: var(--accent); color: var(--on-accent); }
.btn.soft { background: var(--surface2); color: var(--ink); }
.lg { display: flex; gap: 16px; list-style: none; margin: 0; padding: 0; font-size: 13.5px; color: var(--muted); flex-wrap: wrap; }
.lg li { display: inline-flex; align-items: center; gap: 7px; }
.sw { display: inline-block; width: 16px; height: 16px; border-radius: 6px; border: 2px solid; }
.sw.d { background: var(--ok-bg); border-color: var(--ok); }
.sw.a { background: repeating-linear-gradient(45deg, var(--warn-bg) 0 3px, var(--warn) 3px 5px); border-color: var(--warn); }
.sw.v { background: var(--sold); border-color: var(--sold); }
`;

const wave = (fill) => `<svg viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true" style="display:block;width:100%;height:56px"><path d="M0,40 C240,80 480,0 720,36 C960,72 1200,8 1440,44 L1440,80 L0,80Z" fill="${fill}"/></svg>`;

export function landing() {
  const css = base + `
.wrap { max-width: 1180px; margin: 0 auto; padding: 0 32px; }
nav.top { display: flex; align-items: center; justify-content: space-between; height: 84px; }
nav.top ul { display: flex; gap: 30px; list-style: none; margin: 0; padding: 0; font-weight: 500; } nav.top a { text-decoration: none; }
.hero { display: grid; grid-template-columns: 1.05fr 1fr; gap: 48px; align-items: center; padding: 30px 0 90px; }
.pill { display: inline-flex; align-items: center; gap: 8px; background: var(--accent); color: var(--on-accent); font-weight: 700; font-size: 14px; border-radius: 999px; padding: 6px 14px; }
h1 { font-size: 66px; line-height: 1.02; margin: 18px 0 20px; }
h1 em { font-style: italic; color: var(--primary); }
.lead { font-size: 20px; color: var(--muted); max-width: 29em; margin: 0 0 30px; }
.cta { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; }
.card3d { background: var(--surface); border-radius: 28px; padding: 18px; box-shadow: 0 2px 0 var(--line), 0 24px 50px -24px rgba(31,42,38,.35); transform: rotate(1.4deg); position: relative; }
.card3d svg { width: 100%; height: auto; display: block; border-radius: 18px; }
.card3d .cap { display: flex; justify-content: space-between; align-items: center; margin: 14px 4px 4px; gap: 12px; flex-wrap: wrap; }
.card3d .cap b { font-family: 'Fraunces'; font-size: 20px; font-weight: 600; }
.note { position: absolute; right: 26px; bottom: -52px; background: var(--primary); color: var(--on-primary); border-radius: 18px; padding: 12px 16px; max-width: 230px; font-size: 14px; transform: rotate(-3deg); box-shadow: 0 14px 30px -12px rgba(0,0,0,.4); }
.note b { font-family: 'Fraunces'; font-size: 17px; display: block; }
.soil { background: var(--surface2); }
.feat { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding: 56px 0 40px; }
.feat article { background: var(--surface); border-radius: 24px; padding: 28px; }
.feat .ic { width: 52px; height: 52px; border-radius: 16px; background: var(--primary); display: grid; place-items: center; margin-bottom: 18px; }
.feat h3 { font-size: 25px; margin-bottom: 8px; } .feat p { margin: 0; color: var(--muted); }
.quote { padding: 20px 0 64px; display: grid; grid-template-columns: auto 1fr; gap: 24px; align-items: center; }
.quote .av { width: 84px; height: 84px; border-radius: 50%; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; font: 600 32px 'Fraunces'; }
.quote blockquote { margin: 0; font: 500 27px/1.25 'Fraunces', serif; } .quote cite { display: block; margin-top: 8px; font-style: normal; color: var(--muted); font-size: 15px; }
.close { background: var(--primary); color: var(--on-primary); }
.close .wrap { display: flex; justify-content: space-between; align-items: center; gap: 24px; padding-top: 52px; padding-bottom: 52px; }
.close h2 { font-size: 40px; line-height: 1.1; max-width: 15em; } .close .btn { background: var(--accent); color: var(--on-accent); }
footer { padding: 22px 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
@media (max-width: 760px) {
  .wrap { padding: 0 20px; } nav.top ul { display: none; } nav.top { height: 70px; }
  .hero { grid-template-columns: 1fr; padding: 16px 0 56px; gap: 36px; } h1 { font-size: 42px; } .lead { font-size: 17px; }
  .card3d { transform: none; padding: 12px; border-radius: 22px; } .note { position: static; transform: none; margin-top: 12px; max-width: none; }
  .feat { grid-template-columns: 1fr; } .quote { grid-template-columns: 1fr; } .quote blockquote { font-size: 22px; }
  .close .wrap { flex-direction: column; align-items: flex-start; } .close h2 { font-size: 30px; }
}`;
  const ic = (d) => `<svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="${t.onPrimary}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const body = `
<div class="wrap">
  <nav class="top" aria-label="Principal">
    <a href="#" aria-label="Tlalli, inicio">${logoAuto(L, 38)}</a>
    <ul><li><a href="#">Producto</a></li><li><a href="#">Plano de lotes</a></li><li><a href="#">Precios</a></li><li><a href="#">Piloto en SLP</a></li></ul>
    <a class="btn soft" href="#" style="min-height:44px;padding:0 20px">Entrar</a>
  </nav>
  <section class="hero">
    <div>
      <span class="pill">Hecho en San Luis Potosí</span>
      <h1>Cada contacto, un lote más cerca de la <em>escritura</em>.</h1>
      <p class="lead">Tlalli es el CRM con WhatsApp para desarrolladoras e inmobiliarias. Tus asesores saben a quién llamar primero, y tú ves en el plano qué lote sigue.</p>
      <div class="cta"><a class="btn acc" href="#">Pedir demo por WhatsApp</a><a class="btn soft" href="#">Ver el plano en vivo</a></div>
      <p class="mono" style="margin-top:22px">14 días de prueba · sin tarjeta · un producto de KoatlCyber</p>
    </div>
    <div class="card3d">
      ${plano(t, 'c1', { w: 560, rx: 6, font: "'DM Mono', monospace" })}
      <div class="cap"><b>Los Álamos · 72 lotes</b>${statusLegend()}</div>
      <div class="note"><b>Lote 9 apartado</b>Pedro Alvarado · hace 1 día. Liga de pago enviada.</div>
    </div>
  </section>
</div>
${wave(t.surface2)}
<div class="soil"><div class="wrap">
  <section class="feat" aria-label="Qué hace">
    <article><div class="ic">${ic('M12 8v4l3 2M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z')}</div><h3>Nadie se enfría</h3><p>Te avisamos de los leads sin respuesta, las citas de hoy y las tareas vencidas. Primero lo urgente.</p></article>
    <article><div class="ic">${ic('M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z')}</div><h3>Tu plano, siempre al día</h3><p>Disponible, apartado o vendido, con color y con textura. Dos asesores no pueden apartar el mismo lote.</p></article>
    <article><div class="ic">${ic('M5 12l4 4L19 7')}</div><h3>Descuentos con tope</h3><p>Cada asesor cotiza dentro de su tope. Lo demás llega a tu celular y lo apruebas en un toque.</p></article>
  </section>
  <section class="quote"><div class="av">M</div><div><blockquote>“Antes me enteraba de un lote apartado por WhatsApp, al final del día. Ahora lo veo en el plano al momento.”</blockquote><cite>Mariana Ortega · Directora comercial, Lomas del Altiplano (ejemplo)</cite></div></section>
</div></div>
<div class="close"><div class="wrap"><h2 class="serif">Empieza con tu primer fraccionamiento esta semana.</h2><a class="btn" href="#">Hablar con nosotros</a></div></div>
<div class="wrap"><footer><span class="mono">© Tlalli · KoatlCyber</span><span class="mono">San Luis Potosí, México</span></footer></div>`;
  return doc({ dir: 'C', title: 'Tlalli · Milpa · Landing', css, body });
}

const stageDot = ['#5B8DEF', '#8C6BD9', '#2E9E8A', '#E39B00', '#C4552D'];
const rail = [['Inicio', 'M3 11l9-8 9 8M5 10v10h14V10'], ['Pipeline', 'M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z'], ['Leads', 'M4 6h16M4 12h16M4 18h16'], ['Tareas', 'M5 12l4 4L19 7'], ['Lotes', 'M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z'], ['Equipo', 'M16 11a4 4 0 1 0-8 0M4 20a8 8 0 0 1 16 0']];

export function app() {
  const css = base + `
.shell { display: grid; grid-template-columns: 92px 1fr; min-height: 100vh; }
.rail { background: var(--primary); color: var(--on-primary); display: flex; flex-direction: column; align-items: center; padding: 18px 0; gap: 4px; }
.rail a { width: 70px; padding: 9px 0 7px; border-radius: 16px; text-decoration: none; display: flex; flex-direction: column; align-items: center; gap: 3px; font-size: 11.5px; font-weight: 600; color: var(--on-primary); opacity: .85; }
.rail a.on { background: color-mix(in srgb, var(--on-primary) 18%, transparent); opacity: 1; }
.rail svg { width: 22px; height: 22px; } .rail .lg0 { margin-bottom: 14px; }
.rail .ct { position: absolute; margin: -2px 0 0 26px; background: var(--accent); color: var(--on-accent); border-radius: 999px; font-size: 11px; padding: 0 6px; font-weight: 700; }
main { padding: 26px 32px; }
.top { display: flex; justify-content: space-between; align-items: flex-start; gap: 20px; }
.top h1 { font-size: 40px; } .top p { margin: 2px 0 0; color: var(--muted); }
.sum { display: flex; gap: 10px; }
.sum div { background: var(--surface); border-radius: 18px; padding: 10px 18px; min-width: 120px; box-shadow: 0 1px 0 var(--line); } .sum b { display: block; font: 600 28px 'Fraunces'; line-height: 1.1; } .sum b.r { color: var(--danger); } .sum span { font-size: 13px; color: var(--muted); }
.alert { margin: 18px 0 18px; background: var(--danger-bg); color: var(--ink); border-radius: 18px; padding: 12px 18px; display: flex; gap: 12px; align-items: center; font-size: 15px; }
.alert i { font-style: normal; background: var(--danger); color: #fff; border-radius: 999px; padding: 2px 12px; font-weight: 700; font-size: 13px; } .alert a { color: var(--danger); font-weight: 700; }
.board { display: grid; grid-template-columns: repeat(5, 1fr); gap: 14px; align-items: start; }
.col h2 { font: 700 16px 'DM Sans'; letter-spacing: 0; display: flex; align-items: center; gap: 8px; padding: 0 4px 10px; }
.col h2 i { width: 11px; height: 11px; border-radius: 50%; background: var(--dot); } .col h2 span { margin-left: auto; background: var(--surface2); border-radius: 999px; padding: 0 10px; font-size: 13px; }
.card { background: var(--surface); border-radius: 20px; padding: 14px; margin-bottom: 10px; box-shadow: 0 1px 0 var(--line); }
.card.cold { box-shadow: inset 0 0 0 2px var(--danger); }
.card .nm { font: 600 17px/1.2 'Fraunces'; } .card .dv { color: var(--muted); font-size: 13.5px; margin-top: 3px; }
.row { display: flex; justify-content: space-between; align-items: center; margin-top: 10px; gap: 8px; }
.tag { font-family: 'DM Mono'; font-size: 11px; background: var(--surface2); border-radius: 8px; padding: 2px 8px; }
.when { font-size: 13px; color: var(--muted); white-space: nowrap; } .cold .when { color: var(--danger); font-weight: 700; }
.who { display: flex; align-items: center; gap: 7px; font-size: 13px; color: var(--muted); }
.av { width: 26px; height: 26px; border-radius: 50%; background: var(--accent); color: var(--on-accent); display: grid; place-items: center; font-weight: 700; font-size: 12px; }
.mv { background: var(--surface2); border-radius: 10px; padding: 5px 10px; font-size: 12.5px; font-weight: 600; color: var(--ink); }
.toast { position: fixed; right: 28px; bottom: 24px; background: var(--ink); color: var(--bg); border-radius: 18px; padding: 8px 8px 8px 20px; display: flex; gap: 16px; align-items: center; font-size: 15px; }
.toast b { background: var(--accent); color: var(--on-accent); border-radius: 12px; min-height: 40px; padding: 0 16px; display: inline-flex; align-items: center; }
`;
  const colsHtml = cols.map((c, i) => `
<section class="col" style="--dot:${stageDot[i]}" aria-label="${c.name}">
  <h2><i></i>${c.name}<span>${c.n}</span></h2>
  ${c.cards.map((k) => `<article class="card ${k.stale ? 'cold' : ''}"><div class="nm">${esc(k.who)}</div><div class="dv">${esc(k.dev)}</div>
  <div class="row"><span class="tag">${k.camp}</span><span class="when">${k.last}</span></div>
  <div class="row"><span class="who"><span class="av">${k.asg[0]}</span>${k.asg}</span><span class="mv">Mover a…</span></div></article>`).join('')}
</section>`).join('');
  const icon = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const body = `
<div class="shell">
  <nav class="rail" aria-label="Secciones"><a href="#" class="lg0" aria-label="Tlalli">${L.iconInline('dark', 44)}</a>
    ${rail.map(([n, d]) => `<a href="#" class="${n === 'Pipeline' ? 'on' : ''}">${icon(d)}${n}</a>`).join('')}
    <a href="#" style="margin-top:auto">${icon('M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19 12l2 1-2 3-2-.5-1.5 1V20h-3l-.5-2-2-1-2 1-2-2 1-2-1-2-2-.5v-3l2-.5 1-2-1-2 2-2 2 1 2-1 .5-2h3l.5 2 2 1 2-1z')}Ajustes</a>
  </nav>
  <main>
    <div class="top"><div><span class="mono">${org.name}</span><h1>Buenos días, ${org.user.split(' ')[0]}</h1><p>Así va tu pipeline esta semana.</p></div>
      <div class="sum"><div><b>12</b><span>leads abiertos</span></div><div><b class="r">8</b><span>fríos</span></div><div><b>2</b><span>por autorizar</span></div></div></div>
    <div class="alert" role="status"><i>Contacta primero</i><span><a href="#">Sergio Medina (4 d)</a> · <a href="#">Daniela Cuéllar (29 h)</a> · <a href="#">Regina Treviño (6 d)</a></span></div>
    <div class="board">${colsHtml}</div>
    <div class="toast" role="status">Moviste a Pedro Alvarado a Apartado <b>Deshacer (8 s)</b></div>
  </main>
</div>`;
  return doc({ dir: 'C', title: 'Tlalli · Milpa · App', css, body });
}

export function mobile() {
  const css = base + `
body { padding-bottom: 92px; }
header.top { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; }
.menu { min-height: 44px; padding: 0 18px; border-radius: 14px; border: 0; background: var(--surface2); color: var(--ink); font: 700 15px 'DM Sans'; }
.pad { padding: 4px 16px 0; }
h1 { font-size: 36px; line-height: 1.05; margin: 4px 0 4px; }
.hello { color: var(--muted); margin: 0 0 16px; }
.ring { display: flex; align-items: center; gap: 16px; background: var(--primary); color: var(--on-primary); border-radius: 24px; padding: 16px 18px; margin-bottom: 14px; }
.ring svg { flex: none; } .ring b { font: 600 20px/1.2 'Fraunces'; display: block; } .ring span { font-size: 14px; opacity: .92; }
.alert { background: var(--danger-bg); border-radius: 18px; padding: 11px 14px; font-size: 15px; margin-bottom: 18px; } .alert b { color: var(--danger); }
.sec { font: 700 13px 'DM Sans'; letter-spacing: .06em; text-transform: uppercase; color: var(--muted); margin: 6px 4px 10px; }
.item { background: var(--surface); border-radius: 24px; padding: 16px; margin-bottom: 12px; box-shadow: 0 1px 0 var(--line); }
.item .top2 { display: flex; gap: 12px; align-items: center; }
.av { flex: none; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center; font: 600 18px 'Fraunces'; background: var(--surface2); color: var(--ink); }
.item.frio .av, .item.tarea .av { background: var(--danger-bg); color: var(--danger); } .item.hoy .av { background: var(--accent); color: var(--on-accent); }
.item h2 { font-size: 20px; } .why { font-weight: 700; font-size: 15px; margin-top: 1px; } .item.frio .why, .item.tarea .why { color: var(--danger); } .item.hoy .why { color: var(--primary); }
.det { color: var(--muted); font-size: 14px; margin: 10px 0 0 58px; }
.acts { display: grid; grid-template-columns: 1.5fr 1fr; gap: 10px; margin-top: 14px; }
.acts a { min-height: 54px; border-radius: 16px; display: inline-flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; font-weight: 700; background: var(--surface2); color: var(--ink); font-size: 16px; }
.acts a.wa { background: var(--primary); color: var(--on-primary); }
.acts svg { width: 22px; height: 22px; flex: none; }
.tabs { position: fixed; left: 0; right: 0; bottom: 0; background: var(--surface); border-radius: 24px 24px 0 0; box-shadow: 0 -8px 24px -12px rgba(31,42,38,.3); display: grid; grid-template-columns: repeat(4, 1fr); padding: 6px 8px 10px; }
.tabs a { min-height: 56px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; text-decoration: none; font-size: 12px; font-weight: 600; color: var(--muted); border-radius: 16px; }
.tabs a.on { color: var(--primary); background: var(--surface2); } .tabs svg { width: 24px; height: 24px; }
.toast { position: fixed; left: 12px; right: 12px; bottom: 90px; background: var(--ink); color: var(--bg); border-radius: 18px; padding: 8px 8px 8px 16px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14.5px; }
.toast b { background: var(--accent); color: var(--on-accent); border-radius: 12px; min-height: 44px; padding: 0 14px; display: inline-flex; align-items: center; white-space: nowrap; }
`;
  const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${d}"/></svg>`;
  const ringSvg = `<svg width="64" height="64" viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="none" stroke="${t.onPrimary}" stroke-opacity=".28" stroke-width="8"/><circle cx="32" cy="32" r="26" fill="none" stroke="${t.accent}" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * 26 * 0.4).toFixed(1)} 200" transform="rotate(-90 32 32)"/><text x="32" y="38" text-anchor="middle" font-family="Fraunces" font-weight="600" font-size="18" fill="${t.onPrimary}">2/5</text></svg>`;
  const groups = [['Primero', seguimiento.slice(0, 3)], ['Después', seguimiento.slice(3)]];
  const body = `
<header class="top"><a href="#" aria-label="Tlalli">${logoAuto(L, 32)}</a><button class="menu">Menú</button></header>
<div class="pad">
  <h1>Hola, Beto</h1><p class="hello">Lunes 9 de noviembre · tu día</p>
  <div class="ring">${ringSvg}<div><b>Llevas 2 de 5 seguimientos</b><span>Te faltan 3. Empieza por los fríos.</span></div></div>
  <div class="alert" role="status"><b>Contacta primero:</b> Sergio Medina (4 d) y Daniela Cuéllar (29 h)</div>
  ${groups.map(([g, items]) => `<p class="sec">${g}</p>` + items.map((s) => `
  <article class="item ${s.tone}"><div class="top2"><span class="av">${initials(s.who)}</span><div><h2>${esc(s.who)}</h2><div class="why">${esc(s.why)}</div></div></div>
    <div class="det">${esc(s.det)}</div>
    <div class="acts"><a class="wa" href="#">${ico('M21 12a8 8 0 0 1-11.8 7L4 20l1.1-4.9A8 8 0 1 1 21 12z')}WhatsApp</a><a href="#">${ico('M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z')}Llamar</a></div></article>`).join('')).join('')}
</div>
<div class="toast" role="status"><span>Moviste a Jorge a Contactado.</span><b>Deshacer (7 s)</b></div>
<nav class="tabs" aria-label="Secciones"><a href="#" class="on">${ico('M3 11l9-8 9 8M5 10v10h14V10')}Hoy</a><a href="#">${ico('M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z')}Pipeline</a><a href="#">${ico('M4 6h16M4 12h16M4 18h16')}Leads</a><a href="#">${ico('M4 5h6v6H4zM14 5h6v6h-6zM4 15h6v4H4zM14 15h6v4h-6z')}Lotes</a></nav>`;
  return doc({ dir: 'C', title: 'Tlalli · Milpa · Celular', css, body });
}
