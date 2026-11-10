// Datos inventados, contraste WCAG y el plano de lotes que comparten las tres direcciones.

// ---------- contraste WCAG 2.x ----------
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
export const lum = (h) => { const [r, g, b] = rgb(h).map(lin); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// ---------- datos de la demo (inventados) ----------
export const org = { name: 'Desarrollos Lomas del Altiplano', user: 'Mariana Ortega', role: 'Directora comercial' };
export const cols = [
  { name: 'Nuevo', n: 7, cards: [
    { who: 'Jorge Ramírez Ibarra', dev: 'Los Álamos · Lote 14', camp: 'RADIO-EXA', last: 'hace 2 h', stale: false, asg: 'Beto' },
    { who: 'Daniela Cuéllar', dev: 'Los Álamos · Lote 9', camp: 'FB-LOMAS', last: 'Frío · 29 h', stale: true, asg: 'Lupita' },
    { who: 'Héctor Salazar', dev: 'Sin desarrollo', camp: 'ESPECTACULAR', last: 'hace 1 h', stale: false, asg: 'Beto' },
  ] },
  { name: 'Contactado', n: 5, cards: [
    { who: 'Ana Karen Montoya', dev: 'Vista Real · Casa 3', camp: 'IG-VISTA', last: 'ayer', stale: false, asg: 'Lupita' },
    { who: 'Sergio Medina Fuentes', dev: 'Los Álamos · Lote 21', camp: 'RADIO-EXA', last: 'Frío · 4 d', stale: true, asg: 'Beto' },
  ] },
  { name: 'Cita agendada', n: 4, cards: [
    { who: 'Familia Treviño', dev: 'Los Álamos · Lote 6', camp: 'FB-LOMAS', last: 'hoy 5:30 pm', stale: false, asg: 'Lupita' },
    { who: 'Elena Ortega Salazar', dev: 'Vista Real · Casa 8', camp: 'WEB', last: 'mañana 11:00', stale: false, asg: 'Beto' },
  ] },
  { name: 'Cotización', n: 3, cards: [
    { who: 'Ulises Galván', dev: 'Los Álamos · Lote 18', camp: 'RADIO-EXA', last: 'hace 3 d', stale: false, asg: 'Beto' },
    { who: 'Regina Treviño', dev: 'Vista Real · Casa 2', camp: 'WEB', last: 'Frío · 6 d', stale: true, asg: 'Lupita' },
  ] },
  { name: 'Apartado', n: 2, cards: [
    { who: 'Pedro Alvarado', dev: 'Los Álamos · Lote 12', camp: 'FB-LOMAS', last: 'hace 1 d', stale: false, asg: 'Lupita' },
  ] },
];
export const seguimiento = [
  { who: 'Familia Treviño', why: 'Cita hoy a las 5:30 pm', det: 'Los Álamos · Lote 6', tone: 'hoy', stale: false },
  { who: 'Sergio Medina Fuentes', why: 'Sin respuesta desde hace 4 días', det: 'Los Álamos · Lote 21', tone: 'frio', stale: true },
  { who: 'Daniela Cuéllar', why: 'Nuevo lead sin contactar: 29 h', det: 'Los Álamos · Lote 9', tone: 'frio', stale: true },
  { who: 'Regina Treviño', why: 'Mandar cotización (tarea vencida)', det: 'Vista Real · Casa 2', tone: 'tarea', stale: true },
  { who: 'Jorge Ramírez Ibarra', why: 'Llamar mañana 10:00', det: 'Los Álamos · Lote 14', tone: 'luego', stale: false },
];

// ---------- plano de lotes: 3 manzanas con calles, estatus con color Y textura ----------
// estatus: D disponible, A apartado, V vendido. Determinista.
const PLAN = [
  'DDVVAD', 'DAVVDD', 'VVDADD',
];
export function planoSvg({ pal, w = 560, labels = true, rx = 2, stroke = 1.2, font = 'ui-monospace, monospace', rowsOfBlocks = 2 }) {
  // pal: { D:{fill,line}, A:{fill,line,hatch}, V:{fill,line,text}, street, bg, text, mark, sel, id }
  const cw = 40, ch = 44, bw = 6 * cw, bh = 3 * ch, gapX = 44, gapY = 62, pad = 24;
  const blocks = [];
  for (let r = 0; r < rowsOfBlocks; r++) for (let c = 0; c < 2; c++) blocks.push({ x: pad + c * (bw + gapX), y: pad + r * (bh + gapY), tag: r * 2 + c + 1 });
  const h = pad * 2 + rowsOfBlocks * bh + (rowsOfBlocks - 1) * gapY;
  let id = 0;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" role="img" aria-label="Plano de lotes de Los Álamos con estatus por color y textura">`;
  out += `<defs><pattern id="hatch-${pal.id}" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="7" height="7" fill="${pal.A.fill}"/><line x1="0" y1="0" x2="0" y2="7" stroke="${pal.A.hatch}" stroke-width="2.4"/></pattern></defs>`;
  out += `<rect width="${w}" height="${h}" fill="${pal.bg}"/>`;
  for (let r = 0; r < rowsOfBlocks - 1; r++) out += `<rect x="0" y="${pad + (r + 1) * bh + r * gapY + 24}" width="${w}" height="${gapY - 32}" fill="${pal.street}"/>`;
  out += `<rect x="${pad + bw + 8}" y="0" width="${gapX - 16}" height="${h}" fill="${pal.street}"/>`;
  blocks.forEach((b) => {
    for (let r = 0; r < 3; r++) for (let c = 0; c < 6; c++) {
      const st = PLAN[(r + b.tag) % 3][(c + b.tag * 2) % 6];
      const p = pal[st];
      const fill = st === 'A' ? `url(#hatch-${pal.id})` : p.fill;
      id++;
      out += `<rect x="${b.x + c * cw}" y="${b.y + r * ch}" width="${cw - 3}" height="${ch - 3}" rx="${rx}" fill="${fill}" stroke="${p.line}" stroke-width="${stroke}"/>`;
      if (labels) out += `<text x="${b.x + c * cw + (cw - 3) / 2}" y="${b.y + r * ch + (ch - 3) / 2 + 3.5}" text-anchor="middle" font-family="${font}" font-size="10" font-weight="600" fill="${st === 'V' ? pal.V.text : pal.text}" paint-order="stroke" stroke="${st === 'A' ? pal.A.fill : 'none'}" stroke-width="3">${id}</text>`;
    }
    out += `<text x="${b.x}" y="${b.y + bh + 14}" font-family="${font}" font-size="9.5" letter-spacing="1" fill="${pal.mark}">MANZANA ${b.tag}</text>`;
  });
  const sx = blocks[0].x + 2 * cw, sy = blocks[0].y + 1 * ch; // lote 9 seleccionado
  out += `<rect x="${sx - 2}" y="${sy - 2}" width="${cw + 1}" height="${ch + 1}" rx="${rx + 2}" fill="none" stroke="${pal.sel}" stroke-width="3"/>`;
  out += `</svg>`;
  return out;
}

export const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
export const initials = (n) => n.split(' ').filter(Boolean).slice(0, 2).map((x) => x[0]).join('');
