import { ratio } from './lib.mjs';

// Cada dirección: tokens para modo claro y oscuro. Los pares de "texto" se verifican a 4.5:1 (AA); los de
// "no texto" (bordes de lote, contornos de control) a 3:1.
export const DIR = {
  A: {
    id: 'A', name: 'Cimiento · 1 Cianotipo', tag: 'Azul de plano y arcilla', fonts: ['Bricolage Grotesque', 'Geist', 'Geist Mono'],
    gf: 'family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600',
    light: { bg: '#F3F1EC', surface: '#FFFFFF', surface2: '#E9E6DE', ink: '#14202B', muted: '#4C5964', line: '#CFCABD', primary: '#1B4B82', onPrimary: '#FFFFFF', accent: '#A94E1F', onAccent: '#FFFFFF', accentInk: '#A94E1F', ok: '#17694A', warn: '#835400', sold: '#3B4A5A', danger: '#B3361A', okBg: '#DDF0E7', warnBg: '#F7E7C4', soldBg: '#DCE2E8', dangerBg: '#FBE3DC' },
    dark: { bg: '#0F1720', surface: '#17212C', surface2: '#1F2C39', ink: '#E8EDF2', muted: '#A3B1BE', line: '#2F3E4D', primary: '#7FB0EE', onPrimary: '#0B1620', accent: '#E58A5B', onAccent: '#1A0E07', accentInk: '#E58A5B', ok: '#58C79B', warn: '#E8B04A', sold: '#9FB0C0', danger: '#FF8A68', okBg: '#12372B', warnBg: '#3A2B0B', soldBg: '#27323E', dangerBg: '#40201A' },
  },
  A2: {
    id: 'A2', name: 'Cimiento · 2 Pino', tag: 'Verde de pino y ocre', fonts: ['Bricolage Grotesque', 'Geist', 'Geist Mono'],
    gf: 'family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600',
    light: { bg: '#F1F2EA', surface: '#FFFFFF', surface2: '#E4E7DA', ink: '#14241C', muted: '#4A5B50', line: '#C9CDB9', primary: '#1F5C45', onPrimary: '#FFFFFF', accent: '#E0A526', onAccent: '#1F1400', accentInk: '#8A5A00', ok: '#17694A', warn: '#835400', sold: '#3F4C45', danger: '#B3361A', okBg: '#DCEFE3', warnBg: '#F7E7C4', soldBg: '#DEE3DC', dangerBg: '#FBE3DC' },
    dark: { bg: '#0F1A15', surface: '#17261F', surface2: '#1F3329', ink: '#E7EEE9', muted: '#A2B5AA', line: '#2E4639', primary: '#6FCB9F', onPrimary: '#07180F', accent: '#E6B33F', onAccent: '#1F1400', accentInk: '#E6B33F', ok: '#58C79B', warn: '#E8B04A', sold: '#9DB0A5', danger: '#FF8A68', okBg: '#12372B', warnBg: '#3A2B0B', soldBg: '#26332C', dangerBg: '#40201A' },
  },
  A3: {
    id: 'A3', name: 'Cimiento · 3 Tierra', tag: 'Terracota y verde turquesa', fonts: ['Bricolage Grotesque', 'Geist', 'Geist Mono'],
    gf: 'family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500;600',
    light: { bg: '#F6F0E7', surface: '#FFFFFF', surface2: '#ECE3D5', ink: '#25190F', muted: '#5E4E41', line: '#D6C9B6', primary: '#8A3F1E', onPrimary: '#FFFFFF', accent: '#0F766E', onAccent: '#FFFFFF', accentInk: '#0F766E', ok: '#17694A', warn: '#835400', sold: '#5A4B3E', danger: '#B0243A', okBg: '#DDF0E7', warnBg: '#F7E7C4', soldBg: '#E6DDD2', dangerBg: '#F9DDE1' },
    dark: { bg: '#1A130F', surface: '#241B15', surface2: '#2F241C', ink: '#F2E9E0', muted: '#BBAA9C', line: '#43332A', primary: '#E58A5B', onPrimary: '#1A0E07', accent: '#4FD1C5', onAccent: '#04201D', accentInk: '#4FD1C5', ok: '#58C79B', warn: '#E8B04A', sold: '#B3A59A', danger: '#FF8A9A', okBg: '#12372B', warnBg: '#3A2B0B', soldBg: '#3A2E26', dangerBg: '#40181F' },
  },
  B: {
    id: 'B', name: 'Obsidiana', tag: 'Oscuro, técnico, de noche', fonts: ['Space Grotesk', 'Space Mono'],
    gf: 'family=Space+Grotesk:wght@400;500;600;700&family=Space+Mono:wght@400;700',
    dark: { bg: '#0C1110', surface: '#151C1A', surface2: '#1D2623', ink: '#ECF2EE', muted: '#9DB0A7', line: '#2A3631', primary: '#D9F24F', onPrimary: '#0C1110', accent: '#3DDBB0', onAccent: '#04130E', ok: '#3DDBB0', warn: '#F5B83D', sold: '#8FA19A', soldFill: '#55645E', soldText: '#ECF2EE', danger: '#FF7A59', okBg: '#0F3329', warnBg: '#3A2C0A', soldBg: '#242E2A', dangerBg: '#3F1E16' },
    light: { bg: '#F4F6F2', surface: '#FFFFFF', surface2: '#E7ECE6', ink: '#0F1A17', muted: '#475852', line: '#CBD5CE', primary: '#1F3B33', onPrimary: '#FFFFFF', accent: '#0B6B55', onAccent: '#FFFFFF', ok: '#0B6B55', warn: '#7A5200', sold: '#4A5A54', danger: '#B23A1E', okBg: '#D8F0E8', warnBg: '#F6E5BE', soldBg: '#DDE4E0', dangerBg: '#FBE2DB' },
  },
  C: {
    id: 'C', name: 'Milpa', tag: 'Cálido, cercano, de campo', fonts: ['Fraunces', 'DM Sans', 'DM Mono'],
    gf: 'family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500',
    light: { bg: '#FBF6EC', surface: '#FFFFFF', surface2: '#F2E9D8', ink: '#1F2A26', muted: '#55625C', line: '#E0D4BC', primary: '#0E5A4E', onPrimary: '#FFFFFF', accent: '#F4A300', onAccent: '#1F1500', ok: '#176B45', warn: '#7A4F00', sold: '#4A5568', danger: '#B8301F', okBg: '#DDF0E4', warnBg: '#FBE8BE', soldBg: '#E4E7EC', dangerBg: '#FADDD7' },
    dark: { bg: '#0F1A17', surface: '#172421', surface2: '#20312D', ink: '#F3EDE0', muted: '#A9B8B0', line: '#2D4039', primary: '#5FD0B8', onPrimary: '#06201A', accent: '#F7B733', onAccent: '#1F1500', ok: '#5FD0A0', warn: '#F0BD4F', sold: '#A8B4C2', danger: '#FF8D78', okBg: '#12372B', warnBg: '#3A2B0B', soldBg: '#28333D', dangerBg: '#40201A' },
  },
};

// Pares que se usan de verdad en las pantallas.
export const PAIRS = [
  ['Texto principal sobre fondo', 'ink', 'bg', 4.5],
  ['Texto principal sobre tarjeta', 'ink', 'surface', 4.5],
  ['Texto secundario sobre fondo', 'muted', 'bg', 4.5],
  ['Texto secundario sobre tarjeta', 'muted', 'surface', 4.5],
  ['Texto sobre color primario (botón)', 'onPrimary', 'primary', 4.5],
  ['Color primario como texto/enlace sobre fondo', 'primary', 'bg', 4.5],
  ['Texto sobre acento (etiqueta, botón secundario)', 'onAccent', 'accent', 4.5],
  ['Acento usado como texto (palabra destacada) sobre fondo', 'accentInk', 'bg', 4.5],
  ['Disponible (texto) sobre su fondo', 'ok', 'okBg', 4.5],
  ['Apartado (texto) sobre su fondo', 'warn', 'warnBg', 4.5],
  ['Vendido (texto) sobre su fondo', 'sold', 'soldBg', 4.5],
  ['Frío / urgente (texto) sobre su fondo', 'danger', 'dangerBg', 4.5],
  ['Frío / urgente (texto) sobre tarjeta', 'danger', 'surface', 4.5],
  ['Plano: borde de lote Disponible sobre el plano (no texto)', 'ok', 'surface2', 3],
  ['Plano: borde de lote Apartado sobre el plano (no texto)', 'warn', 'surface2', 3],
  ['Plano: borde de lote Vendido sobre el plano (no texto)', 'sold', 'surface2', 3],
  ['Plano: número de lote sobre Disponible', 'ink', 'okBg', 4.5],
  ['Plano: número de lote sobre Apartado (con halo)', 'ink', 'warnBg', 4.5],
  ['Plano: número de lote sobre Vendido', 'soldText', 'soldFill', 4.5],
];

function withSold(t) { return { soldFill: t.sold, soldText: t.bg, ...t }; }
export function verify() {
  const rows = [];
  for (const k of Object.keys(DIR)) for (const mode of ['light', 'dark']) {
    const t = withSold(DIR[k][mode]);
    for (const [label, a, b, min] of PAIRS) {
      if (!t[a] || !t[b]) continue;
      const r = ratio(t[a], t[b]);
      rows.push({ dir: k, mode, label, a, b, fg: t[a], bg: t[b], r, min, pass: r >= min });
    }
  }
  return rows;
}

export const cssVars = (t) => Object.entries(t).map(([k, v]) => `--${k.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase())}:${v}`).join(';');
