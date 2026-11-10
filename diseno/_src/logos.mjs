// Logotipos: todo dibujado con trazos y formas propias (sin fuentes), para que el SVG se vea igual en cualquier lugar.
// Letras de trazo constante en una caja con línea base y=44, altura de x en y=18, ascendente y=4.

function glyphsLower(sw, cap, join) {
  // devuelve { d: string de trazos, w: ancho total }
  const parts = []; let x = sw / 2 + 2;
  const adv = { t: 22, l: 16, a: 36, i: 16 };
  const add = (k) => {
    if (k === 't') parts.push(`M${x + 7},8V44M${x},18H${x + 15}`);
    if (k === 'l') parts.push(`M${x + 5},4V44`);
    if (k === 'i') parts.push(`M${x + 5},18V44M${x + 5},6V8`);
    if (k === 'a') parts.push(`M${x + 26},18V44M${x + 26},31A13,13 0 1 0 ${x + 26},31.01`);
    x += adv[k];
  };
  [...'tlalli'].forEach(add);
  return { d: parts.join(''), w: x + sw };
}
function glyphsUpper(sw) {
  const parts = []; let x = sw / 2 + 2;
  const add = (k) => {
    if (k === 'T') { parts.push(`M${x},6H${x + 34}M${x + 17},6V44`); x += 44; }
    if (k === 'L') { parts.push(`M${x + 3},6V44H${x + 28}`); x += 38; }
    if (k === 'A') { parts.push(`M${x},44L${x + 17},6L${x + 34},44M${x + 7},30H${x + 27}`); x += 46; }
    if (k === 'I') { parts.push(`M${x + 3},6V44`); x += 16; }
  };
  [...'TLALLI'].forEach(add);
  return { d: parts.join(''), w: x + sw };
}

// ---------- Icono de cada dirección ----------
// c = { bg, a, b }  (a = trazo/relleno principal, b = acento)
const iconA = (c) => `<rect width="64" height="64" rx="7" fill="${c.bg}"/>`
  + [[10, 10], [26, 10], [42, 10], [26, 26], [26, 42]].map(([x, y]) => `<rect x="${x}" y="${y}" width="12" height="12" fill="${c.a}"/>`).join('')
  + `<rect x="42" y="42" width="12" height="12" fill="${c.b}"/>`;
const iconB = (c) => `<rect width="64" height="64" rx="10" fill="${c.bg}"/>`
  + `<polygon points="32,6 58,32 32,58 6,32" fill="${c.a}"/>`
  + `<path d="M32,32H58L32,58Z" fill="${c.b}"/>`
  + `<path d="M32,6V58M6,32H58" stroke="${c.bg}" stroke-width="2.4"/>`;
const furrow = (y, col) => `<path d="M11,${y} Q21.5,${y - 11} 32,${y} T53,${y}" fill="none" stroke="${col}" stroke-width="6.5" stroke-linecap="round"/>`;
const iconC = (c) => `<rect width="64" height="64" rx="18" fill="${c.bg}"/>` + furrow(22, c.b) + furrow(35, c.a) + furrow(48, c.a);

const SPEC = {
  A: { icon: iconA, mark: (sw) => glyphsLower(sw), sw: 6, cap: 'square', join: 'miter', gap: 14,
    light: { bg: '#1B4B82', a: '#FFFFFF', b: '#E58A5B', word: '#14202B' },
    dark: { bg: '#7FB0EE', a: '#0F1720', b: '#E58A5B', word: '#E8EDF2' },
    mono: '#14202B', monoDark: '#E8EDF2', surfaceDark: '#0F1720' },
  B: { icon: iconB, mark: (sw) => glyphsUpper(sw), sw: 5, cap: 'butt', join: 'miter', gap: 16,
    light: { bg: '#0C1110', a: '#D9F24F', b: '#3DDBB0', word: '#0C1110' },
    dark: { bg: '#D9F24F', a: '#0C1110', b: '#0C1110', word: '#ECF2EE' },
    mono: '#0C1110', monoDark: '#ECF2EE', surfaceDark: '#0C1110' },
  C: { icon: iconC, mark: (sw) => glyphsLower(sw), sw: 7, cap: 'round', join: 'round', gap: 12,
    light: { bg: '#0E5A4E', a: '#FBF6EC', b: '#F4A300', word: '#0E5A4E' },
    dark: { bg: '#5FD0B8', a: '#0F1A17', b: '#F7B733', word: '#F3EDE0' },
    mono: '#1F2A26', monoDark: '#F3EDE0', surfaceDark: '#0F1A17' },
};

const wrapIcon = (inner, size = 64) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="${size}" height="${size}" role="img" aria-label="Tlalli">${inner}</svg>`;

function horizontal(k, theme, bgRect = null) {
  const s = SPEC[k]; const c = s[theme]; const g = s.mark(s.sw);
  const iconSize = 56; const wordScale = 1.0;
  const W = iconSize + s.gap + g.w * wordScale + 8;
  const H = 64;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(W)} ${H}" width="${Math.ceil(W * 1.6)}" height="${H * 1.6}" role="img" aria-label="Tlalli">`
    + (bgRect ? `<rect width="100%" height="100%" fill="${bgRect}"/>` : '')
    + `<g transform="translate(4,4) scale(${iconSize / 64})">${s.icon(c)}</g>`
    + `<g transform="translate(${4 + iconSize + s.gap},8)"><path d="${g.d}" fill="none" stroke="${c.word}" stroke-width="${s.sw}" stroke-linecap="${s.cap}" stroke-linejoin="${s.join}"/></g>`
    + `</svg>`;
}

export function logos(k) {
  const s = SPEC[k];
  const monoC = { bg: s.mono, a: s.surfaceDark === '#0F1720' ? '#FFFFFF' : '#FFFFFF', b: s.mono };
  const monoIcon = (col, bgc) => {
    // monocromo: una sola tinta, el acento se vuelve hueco
    const c = { bg: col, a: bgc, b: bgc };
    return k === 'A' ? s.icon(c).replace(/fill="[^"]*"\/>$/, `fill="${bgc}" opacity="0.55"/>`) : s.icon(c);
  };
  const g = s.mark(s.sw);
  const mono = (col, bgc) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${Math.ceil(56 + s.gap + g.w + 8)} 64" width="${Math.ceil((56 + s.gap + g.w + 8) * 1.6)}" height="102" role="img" aria-label="Tlalli (una tinta)">`
    + (bgc && bgc !== 'none' ? `<rect width="100%" height="100%" fill="${bgc}"/>` : '')
    + `<g transform="translate(4,4) scale(${56 / 64})">${monoIcon(col, bgc && bgc !== 'none' ? bgc : '#FFFFFF')}</g>`
    + `<g transform="translate(${4 + 56 + s.gap},8)"><path d="${g.d}" fill="none" stroke="${col}" stroke-width="${s.sw}" stroke-linecap="${s.cap}" stroke-linejoin="${s.join}"/></g></svg>`;
  return {
    principal: horizontal(k, 'light'),
    monocroma: mono(s.mono, 'none'),
    icono: wrapIcon(s.icon(s.light), 512),
    oscuro: horizontal(k, 'dark', s.surfaceDark),
    iconoOscuro: wrapIcon(s.icon(s.dark), 512),
    // para incrustar en las pantallas
    inline: (theme = 'light', h = 32) => {
      const sv = horizontal(k, theme);
      return sv.replace(/width="[\d.]+" height="[\d.]+"/, `height="${h}"`);
    },
    iconInline: (theme = 'light', size = 32) => wrapIcon(s.icon(s[theme]), size),
  };
}
