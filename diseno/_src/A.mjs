// Dirección A · Cimiento: plano de ingeniería con calidez de tierra. Sidebar fija, rejilla visible, etiquetas en mono.
import { DIR } from './tokens.mjs';
import { doc, plano, statusLegend, logoAuto } from './common.mjs';
import { logos } from './logos.mjs';
import { cols, seguimiento, org, esc, initials } from './lib.mjs';

const L = logos('A');
const t = DIR.A.light;

const base = `
body { font-family: 'Geist', system-ui, sans-serif; font-size: 15px; line-height: 1.5; }
h1, h2, h3, .disp { font-family: 'Bricolage Grotesque', 'Geist', sans-serif; letter-spacing: -0.02em; }
.mono { font-family: 'Geist Mono', ui-monospace, monospace; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border-radius: 4px; font-weight: 600; text-decoration: none; border: 1.5px solid var(--primary); background: var(--primary); color: var(--on-primary); font-family: inherit; font-size: 15px; }
.btn.sec { background: transparent; color: var(--primary); }
.btn.acc { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.lg { display: flex; gap: 16px; list-style: none; margin: 0; padding: 0; font-size: 12.5px; color: var(--muted); }
.lg li { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 14px; height: 14px; border-radius: 2px; border: 1.5px solid; }
.sw.d { background: var(--ok-bg); border-color: var(--ok); }
.sw.a { background: repeating-linear-gradient(45deg, var(--warn-bg) 0 3px, var(--warn) 3px 5px); border-color: var(--warn); }
.sw.v { background: var(--sold); border-color: var(--sold); }
`;

export function landing() {
  const css = base + `
.grid-bg { background-image: linear-gradient(var(--line) 1px, transparent 1px), linear-gradient(90deg, var(--line) 1px, transparent 1px); background-size: 48px 48px; background-position: -1px -1px; }
.wrap { max-width: 1200px; margin: 0 auto; padding: 0 32px; }
nav.top { display: flex; align-items: center; justify-content: space-between; height: 76px; }
nav.top ul { display: flex; gap: 28px; list-style: none; margin: 0; padding: 0; font-weight: 500; }
nav.top a { text-decoration: none; }
.hero { display: grid; grid-template-columns: 1.02fr 1fr; gap: 56px; align-items: center; padding: 56px 0 72px; }
h1 { font-size: 68px; line-height: .98; font-weight: 800; margin: 14px 0 20px; }
h1 em { font-style: normal; color: var(--accent); }
.lead { font-size: 19px; color: var(--muted); max-width: 30em; margin: 0 0 28px; }
.cta { display: flex; gap: 12px; flex-wrap: wrap; }
.proof { display: flex; gap: 22px; margin-top: 30px; }
.sheet { background: var(--surface); border: 1.5px solid var(--ink); border-radius: 4px; padding: 14px 14px 0; position: relative; box-shadow: 8px 8px 0 var(--surface2); }
.sheet svg { width: 100%; height: auto; display: block; border: 1px solid var(--line); }
.titleblock { display: grid; grid-template-columns: 1fr; gap: 10px; border-top: 1.5px solid var(--ink); margin: 14px -14px 0; padding: 10px 14px; align-items: center; }
.titleblock b { font-family: 'Bricolage Grotesque'; font-size: 17px; }
.tip { position: absolute; right: -14px; top: 190px; width: 212px; background: var(--ink); color: var(--bg); padding: 12px 14px; border-radius: 4px; font-size: 13px; line-height: 1.4; }
.tip b { font-family: 'Geist Mono'; font-size: 12px; }
.tip .pill { display: inline-block; margin-top: 8px; background: var(--accent); color: var(--on-accent); font-weight: 600; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
.feat { border-top: 1.5px solid var(--ink); display: grid; grid-template-columns: repeat(3, 1fr); background: var(--bg); }
.feat > div { padding: 28px 28px 36px 0; }
.feat > div + div { padding-left: 28px; border-left: 1px solid var(--line); }
.feat h3 { font-size: 24px; margin: 8px 0 8px; }
.feat p { margin: 0; color: var(--muted); }
.band { background: var(--ink); color: var(--bg); }
.band .wrap { display: flex; align-items: center; justify-content: space-between; padding-top: 40px; padding-bottom: 40px; gap: 24px; }
.band h2 { font-size: 34px; line-height: 1.1; margin: 0; max-width: 18em; }
.band .btn { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
footer { padding: 22px 0; display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
@media (max-width: 760px) {
  .wrap { padding: 0 20px; } nav.top ul { display: none; } .hero { grid-template-columns: 1fr; gap: 36px; padding: 28px 0 48px; }
  h1 { font-size: 44px; } .lead { font-size: 17px; } .tip { position: static; width: auto; margin: 12px 0 0; }
  .feat { grid-template-columns: 1fr; } .feat > div, .feat > div + div { padding: 22px 0; border-left: 0; border-top: 1px solid var(--line); }
  .band .wrap { flex-direction: column; align-items: flex-start; } .proof { flex-wrap: wrap; gap: 12px 22px; } .sheet { box-shadow: 5px 5px 0 var(--surface2); }
}`;
  const body = `
<div class="grid-bg"><div class="wrap">
  <nav class="top" aria-label="Principal">
    <a href="#" aria-label="Tlalli, inicio">${logoAuto(L, 34)}</a>
    <ul><li><a href="#">Producto</a></li><li><a href="#">Plano de lotes</a></li><li><a href="#">Precios</a></li><li><a href="#">Piloto en SLP</a></li></ul>
    <a class="btn sec" href="#">Entrar</a>
  </nav>
  <section class="hero">
    <div>
      <p class="mono">CRM con WhatsApp · para desarrolladoras de San Luis Potosí</p>
      <h1>Cada contacto, un lote más cerca de la <em>escritura</em>.</h1>
      <p class="lead">Sigue a cada prospecto desde el espectacular hasta la firma. Tus asesores ven a quién llamar primero; tú ves el plano con cada lote, su estatus y quién lo trae.</p>
      <div class="cta"><a class="btn acc" href="#">Pedir demo por WhatsApp</a><a class="btn sec" href="#">Ver el plano en vivo</a></div>
      <div class="proof"><span class="mono">Hecho en SLP</span><span class="mono">14 días de prueba</span><span class="mono">Un producto de KoatlCyber</span></div>
    </div>
    <div class="sheet">
      ${plano(t, 'a1', { w: 560 })}
      <div class="tip"><b>LOTE 9 · MANZANA 1</b><br>Apartado por Pedro Alvarado hace 1 día.<br><span class="pill">Liga de pago enviada</span></div>
      <div class="titleblock"><div><span class="mono">Lámina 01 · Plano comercial</span><br><b>Fraccionamiento Los Álamos</b></div>${statusLegend()}</div>
    </div>
  </section>
  <section class="feat" aria-label="Qué hace">
    <div><span class="mono">01 · Seguimiento</span><h3>Nadie se enfría sin que lo sepas</h3><p>Alertas de leads sin respuesta, citas del día y tareas vencidas, ordenadas por urgencia.</p></div>
    <div><span class="mono">02 · Plano</span><h3>El inventario, a la vista</h3><p>Disponible, apartado o vendido en el plano real. Dos asesores no pueden apartar el mismo lote.</p></div>
    <div><span class="mono">03 · Autorización</span><h3>Descuentos con tope</h3><p>El asesor cotiza dentro de su tope; lo demás llega a tu celular para aprobarlo en un toque.</p></div>
  </section>
</div></div>
<div class="band"><div class="wrap"><h2 class="disp">Empieza con tu primer fraccionamiento esta semana.</h2><a class="btn" href="#">Hablar con nosotros</a></div></div>
<div class="wrap"><footer><span class="mono">© Tlalli · KoatlCyber</span><span class="mono">San Luis Potosí, México</span></footer></div>`;
  return doc({ dir: 'A', title: 'Tlalli · Cimiento · Landing', css, body });
}

const navItems = ['Inicio', 'Pipeline', 'Leads', 'Tareas', 'Desarrollos', 'Cotizador', 'Autorizaciones', 'Campañas', 'Equipo', 'Configuración'];
const stageTone = ['#5A8BC7', '#3A6FB0', '#1F4E8C', '#B7791F', '#A94E1F'];

export function app() {
  const css = base + `
.shell { display: grid; grid-template-columns: 224px 1fr; min-height: 100vh; }
aside { background: var(--surface); border-right: 1.5px solid var(--ink); padding: 18px 14px; display: flex; flex-direction: column; }
aside nav { margin-top: 22px; display: flex; flex-direction: column; gap: 2px; }
aside nav a { text-decoration: none; padding: 9px 12px; border-radius: 4px; font-weight: 500; color: var(--muted); display: flex; justify-content: space-between; align-items: center; }
aside nav a.on { background: var(--primary); color: var(--on-primary); }
aside nav a .ct { font-family: 'Geist Mono'; font-size: 11px; background: var(--accent); color: var(--on-accent); border-radius: 3px; padding: 0 6px; }
aside .who { margin-top: auto; border-top: 1px solid var(--line); padding-top: 14px; font-size: 13px; }
main { padding: 22px 28px 28px; overflow: hidden; }
.head { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
.head h1 { margin: 2px 0 0; font-size: 34px; font-weight: 800; }
.filters { display: flex; gap: 8px; }
.field { background: var(--surface); border: 1.5px solid var(--line); border-radius: 4px; padding: 0 12px; height: 40px; display: inline-flex; align-items: center; color: var(--muted); font-size: 14px; min-width: 150px; }
.alert { margin: 16px 0; background: var(--danger-bg); color: var(--danger); border: 1.5px solid var(--danger); border-radius: 4px; padding: 10px 14px; font-size: 14px; }
.alert b { color: var(--ink); } .alert a { color: var(--danger); font-weight: 600; }
.board { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; align-items: start; }
.col { background: var(--surface2); border-radius: 4px; border-top: 5px solid var(--tone); padding-bottom: 8px; }
.col header { display: flex; justify-content: space-between; align-items: center; padding: 11px 12px 9px; }
.col h2 { margin: 0; font-size: 16px; font-weight: 700; }
.col .n { font-family: 'Geist Mono'; font-size: 12px; background: var(--surface); border-radius: 3px; padding: 1px 8px; }
.card { background: var(--surface); border: 1.5px solid var(--line); border-radius: 4px; margin: 0 8px 8px; padding: 11px 12px; }
.card.cold { border-color: var(--danger); }
.card .nm { font-weight: 600; font-size: 14.5px; }
.card .dv { color: var(--muted); font-size: 12.5px; margin-top: 1px; }
.card .meta { display: flex; justify-content: space-between; align-items: center; margin-top: 9px; font-size: 12px; gap: 6px; }
.tag { font-family: 'Geist Mono'; font-size: 10.5px; background: var(--surface2); border-radius: 3px; padding: 1px 6px; }
.cold-t { color: var(--danger); font-weight: 600; } .ok-t { color: var(--muted); }
.mv { margin-top: 9px; display: flex; justify-content: space-between; align-items: center; font-size: 12px; color: var(--muted); }
.mv span.sel { border: 1.5px solid var(--line); border-radius: 3px; padding: 1px 8px; }
.toast { position: fixed; left: 252px; bottom: 22px; background: var(--ink); color: var(--bg); border-radius: 4px; padding: 11px 14px; display: flex; gap: 18px; align-items: center; font-size: 14px; }
.toast b { background: var(--bg); color: var(--ink); border-radius: 3px; padding: 6px 12px; min-height: 32px; display: inline-flex; align-items: center; }
`;
  const colsHtml = cols.map((c, i) => `
<section class="col" style="--tone:${stageTone[i]}" aria-label="${c.name}">
  <header><h2>${c.name}</h2><span class="n">${c.n}</span></header>
  ${c.cards.map((k) => `
  <article class="card ${k.stale ? 'cold' : ''}">
    <div class="nm">${esc(k.who)}</div><div class="dv">${esc(k.dev)}</div>
    <div class="meta"><span class="tag">${k.camp}</span><span class="${k.stale ? 'cold-t' : 'ok-t'}">${k.last}</span></div>
    <div class="mv"><span>${k.asg}</span><span class="sel">Mover a…</span></div>
  </article>`).join('')}
</section>`).join('');
  const body = `
<div class="shell">
  <aside>
    <a href="#" aria-label="Tlalli">${logoAuto(L, 32)}</a>
    <nav aria-label="Secciones">${navItems.map((n) => `<a href="#" class="${n === 'Pipeline' ? 'on' : ''}">${n}${n === 'Autorizaciones' ? '<span class="ct">2</span>' : ''}</a>`).join('')}</nav>
    <div class="who"><b>${org.user}</b><br><span class="mono">${org.role}</span><br><span style="color:var(--muted)">${org.name}</span></div>
  </aside>
  <main>
    <div class="alert" role="status"><b>Contacta primero:</b> <a href="#">Sergio Medina (4 d)</a> · <a href="#">Daniela Cuéllar (29 h)</a> · <a href="#">Regina Treviño (6 d)</a> · <a href="#">ver los 8 fríos</a> · 2 solicitudes por autorizar</div>
    <div class="head"><div><span class="mono">Ventas · 12 abiertos esta semana</span><h1>Pipeline</h1></div>
      <div class="filters"><span class="field">Buscar lead o teléfono</span><span class="field">Todos los desarrollos</span><span class="field">Todos los asesores</span></div></div>
    <div style="height:14px"></div>
    <div class="board">${colsHtml}</div>
    <div class="toast" role="status">Moviste a Pedro Alvarado a Apartado. <b>Deshacer (8 s)</b></div>
  </main>
</div>`;
  return doc({ dir: 'A', title: 'Tlalli · Cimiento · App', css, body });
}

export function mobile() {
  const css = base + `
body { font-size: 16px; padding-bottom: 76px; }
header.top { position: sticky; top: 0; z-index: 3; background: var(--surface); border-bottom: 1.5px solid var(--ink); display: flex; justify-content: space-between; align-items: center; padding: 8px 16px; }
.menu { min-height: 44px; padding: 0 16px; border: 1.5px solid var(--ink); border-radius: 4px; background: transparent; font: 600 15px 'Geist'; color: var(--ink); display: inline-flex; align-items: center; }
.pad { padding: 18px 16px 0; }
h1 { margin: 2px 0 0; font-size: 36px; font-weight: 800; line-height: 1; }
.sub { color: var(--muted); margin: 6px 0 14px; }
.alert { background: var(--danger-bg); color: var(--danger); border: 1.5px solid var(--danger); border-radius: 4px; padding: 10px 12px; font-size: 14.5px; margin-bottom: 14px; }
.alert b { color: var(--ink); }
.prog { display: flex; align-items: center; gap: 10px; margin: 0 0 16px; }
.bar { flex: 1; height: 8px; background: var(--surface2); border-radius: 2px; overflow: hidden; border: 1px solid var(--line); } .bar i { display: block; width: 40%; height: 100%; background: var(--primary); }
.item { background: var(--surface); border: 1.5px solid var(--line); border-left: 6px solid var(--tone); border-radius: 4px; padding: 14px 14px 12px; margin-bottom: 12px; }
.item.frio { --tone: var(--danger); } .item.hoy { --tone: var(--primary); } .item.tarea { --tone: var(--accent); } .item.luego { --tone: var(--line); }
.item h2 { margin: 0; font-size: 20px; font-weight: 700; }
.why { font-weight: 600; margin-top: 4px; } .item.frio .why, .item.tarea .why { color: var(--danger); } .item.hoy .why { color: var(--primary); }
.det { color: var(--muted); font-size: 14px; margin-top: 2px; }
.acts { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 8px; margin-top: 12px; }
.acts a { min-height: 48px; border-radius: 4px; display: inline-flex; align-items: center; justify-content: center; font-weight: 600; text-decoration: none; border: 1.5px solid var(--ink); color: var(--ink); background: var(--surface); font-size: 15px; }
.acts a.wa { background: var(--primary); border-color: var(--primary); color: var(--on-primary); }
.tabs { position: fixed; bottom: 0; left: 0; right: 0; background: var(--surface); border-top: 1.5px solid var(--ink); display: grid; grid-template-columns: repeat(5, 1fr); }
.tabs a { min-height: 64px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; text-decoration: none; font-size: 12px; color: var(--muted); font-weight: 500; }
.tabs a.on { color: var(--primary); font-weight: 700; box-shadow: inset 0 3px 0 var(--primary); }
.tabs svg { width: 22px; height: 22px; }
.toast { position: fixed; left: 12px; right: 12px; bottom: 76px; background: var(--ink); color: var(--bg); border-radius: 4px; padding: 10px 12px; display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; }
.toast b { background: var(--bg); color: var(--ink); border-radius: 3px; min-height: 44px; padding: 0 14px; display: inline-flex; align-items: center; }
`;
  const ico = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square"><path d="${d}"/></svg>`;
  const body = `
<header class="top"><a href="#" aria-label="Tlalli">${logoAuto(L, 30)}</a><button class="menu">Menú</button></header>
<div class="pad">
  <span class="mono">Lunes 9 de noviembre</span>
  <h1>Hoy te toca</h1>
  <p class="sub">5 seguimientos · Hola, Beto</p>
  <div class="alert" role="status"><b>Contacta primero:</b> Sergio Medina (4 d) · Daniela Cuéllar (29 h)</div>
  <div class="prog"><span class="mono">2 de 5 listos</span><span class="bar"><i></i></span></div>
  ${seguimiento.map((s) => `
  <article class="item ${s.tone}">
    <h2>${esc(s.who)}</h2><div class="why">${esc(s.why)}</div><div class="det">${esc(s.det)}</div>
    <div class="acts"><a class="wa" href="#">WhatsApp</a><a href="#">Llamar</a><a href="#">Mover</a></div>
  </article>`).join('')}
</div>
<div class="toast" role="status"><span>Moviste a Jorge a Contactado.</span><b>Deshacer (7 s)</b></div>
<nav class="tabs" aria-label="Secciones">
  <a href="#" class="on">${ico('M3 11l9-8 9 8M5 10v10h14V10')}Hoy</a><a href="#">${ico('M4 5h4v14H4zM10 5h4v10h-4zM16 5h4v7h-4z')}Pipeline</a><a href="#">${ico('M4 6h16M4 12h16M4 18h16')}Leads</a><a href="#">${ico('M5 12l4 4L19 6')}Tareas</a><a href="#">${ico('M4 7h16M4 12h16M4 17h16')}Menú</a>
</nav>`;
  return doc({ dir: 'A', title: 'Tlalli · Cimiento · Celular', css, body });
}
