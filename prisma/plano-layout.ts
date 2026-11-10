/**
 * Layout of the invented "Residencial Los Pinos" demo plan: 24 lots in 2 blocks of 6x2.
 * Used by the seed to outline each lot, and by `planoSvg()` to draw the image the seed uploads
 * (regenerate the PNG with: npx tsx prisma/seed-assets/generate-plano.ts).
 */
export const PLANO = { w: 1000, h: 760 };
const LOT = { w: 80, h: 100 };
const BLOCKS = [
  { x: 70, y: 150 },
  { x: 70, y: 420 },
];

export type PlanoLot = { n: number; x: number; y: number; w: number; h: number };

export const PLANO_LOTS: PlanoLot[] = BLOCKS.flatMap((b, bi) =>
  Array.from({ length: 12 }, (_, i) => ({
    n: bi * 12 + i + 1,
    x: b.x + (i % 6) * LOT.w,
    y: b.y + Math.floor(i / 6) * LOT.h,
    w: LOT.w,
    h: LOT.h,
  })),
);

/** Outline of a lot as fractions of the image (what units.plan_shape stores). */
export function lotShape(l: PlanoLot): [number, number][] {
  const f = (x: number, y: number): [number, number] => [+(x / PLANO.w).toFixed(4), +(y / PLANO.h).toFixed(4)];
  return [f(l.x, l.y), f(l.x + l.w, l.y), f(l.x + l.w, l.y + l.h), f(l.x, l.y + l.h)];
}

export function planoSvg(): string {
  const lots = PLANO_LOTS.map(
    (l) =>
      `<rect x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}" fill="#f7f8f5" stroke="#1c2226" stroke-width="1.5"/>` +
      `<text x="${l.x + l.w / 2}" y="${l.y + l.h / 2 + 5}" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#1c2226" fill-opacity="0.75">${l.n}</text>`,
  ).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${PLANO.w}" height="${PLANO.h}" viewBox="0 0 ${PLANO.w} ${PLANO.h}">
<rect width="${PLANO.w}" height="${PLANO.h}" fill="#f1f3ef"/>
<defs><pattern id="g" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#1c2226" stroke-opacity="0.07"/></pattern>
<pattern id="d" width="8" height="8" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.4" fill="#1c2226" fill-opacity="0.3"/></pattern></defs>
<rect width="${PLANO.w}" height="${PLANO.h}" fill="url(#g)"/>
<rect x="20" y="20" width="${PLANO.w - 40}" height="${PLANO.h - 40}" fill="none" stroke="#1c2226" stroke-width="2"/>
<rect x="40" y="355" width="${PLANO.w - 80}" height="55" fill="#e4e7e1" opacity="0"/>
<text x="300" y="392" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#1c2226" fill-opacity="0.55">CALLE CANTERA</text>
<text x="40" y="120" font-family="Arial, sans-serif" font-size="13" fill="#1c2226" fill-opacity="0.55">AV. LOS PINOS</text>
<rect x="640" y="150" width="290" height="200" fill="url(#d)" stroke="#1c2226" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="785" y="256" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#1c2226" fill-opacity="0.7">ÁREA VERDE</text>
${lots}
<g transform="translate(900 70)"><circle r="26" fill="#f7f8f5" stroke="#1c2226" stroke-width="1.5"/><path d="M0 -18 L8 11 L0 5 L-8 11 Z" fill="#1c2226"/><text y="-32" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#1c2226">N</text></g>
<g transform="translate(640 560)"><rect width="290" height="130" fill="#f7f8f5" stroke="#1c2226" stroke-width="1.5"/><line x1="0" y1="44" x2="290" y2="44" stroke="#1c2226"/>
<text x="12" y="30" font-family="Arial, sans-serif" font-size="19" font-weight="bold" fill="#1c2226">Residencial Los Pinos</text>
<text x="12" y="72" font-family="Arial, sans-serif" font-size="13" fill="#1c2226" fill-opacity="0.75">Plano de lotificación (ejemplo)</text>
<text x="12" y="94" font-family="Arial, sans-serif" font-size="13" fill="#1c2226" fill-opacity="0.75">Etapa 2 · 24 lotes · datos ficticios</text>
<text x="12" y="116" font-family="Arial, sans-serif" font-size="13" fill="#1c2226" fill-opacity="0.75">Escala gráfica</text></g>
</svg>`;
}
