/**
 * Hero illustration: a subdivision plan (plano de lotificación). Lots are painted by sales status and
 * three new leads are pinned with the campaign code that brought them. Static SVG, no client JS.
 */
const LOT_W = 34;
const LOT_H = 40;
const COLS = 4;
const ROWS = 2;
const STREET = 26;
const MZ_W = COLS * LOT_W;
const MZ_H = ROWS * LOT_H;
const ORIGIN = { x: 50, y: 58 };

type Status = "disponible" | "apartado" | "vendido";

function statusFor(m: number, r: number, c: number): Status {
  const v = (m * 7 + r * 13 + c * 5 + m * c * 3) % 10;
  if (v < 4) return "disponible";
  if (v < 6) return "apartado";
  return "vendido";
}

const PINS: { m: number; r: number; c: number; code: string; box: { dx: number; dy: number } }[] = [
  { m: 1, r: 0, c: 2, code: "RAD-EXA", box: { dx: 18, dy: -50 } },
  { m: 4, r: 0, c: 3, code: "FB-PINOS", box: { dx: 50, dy: -10 } }, // callout sits inside the green area
  { m: 8, r: 0, c: 1, code: "ESP-57", box: { dx: 24, dy: -44 } },
];

const PARK = 5; // manzana index used as green area

export function Plano({ className = "" }: { className?: string }) {
  const lots: { x: number; y: number; status: Status; n: number; m: number; r: number; c: number }[] = [];
  let n = 0;
  for (let m = 0; m < 9; m++) {
    if (m === PARK) continue;
    const mx = ORIGIN.x + (m % 3) * (MZ_W + STREET);
    const my = ORIGIN.y + Math.floor(m / 3) * (MZ_H + STREET);
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        n += 1;
        lots.push({ x: mx + c * LOT_W, y: my + r * LOT_H, status: statusFor(m, r, c), n, m, r, c });
      }
    }
  }
  const parkX = ORIGIN.x + (PARK % 3) * (MZ_W + STREET);
  const parkY = ORIGIN.y + Math.floor(PARK / 3) * (MZ_H + STREET);
  const pins = PINS.map((p) => {
    const lot = lots.find((l) => l.m === p.m && l.r === p.r && l.c === p.c)!;
    return { ...p, cx: lot.x + LOT_W / 2, cy: lot.y + LOT_H / 2 };
  });

  return (
    <svg
      viewBox="0 0 580 456"
      role="img"
      aria-label="Plano de un fraccionamiento: los lotes se pintan según estén disponibles, apartados o vendidos, y tres leads nuevos aparecen marcados con el código de la campaña que los trajo."
      className={className}
    >
      <defs>
        <pattern id="plano-grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M20 0H0V20" fill="none" stroke="#1c2226" strokeOpacity="0.07" strokeWidth="1" />
        </pattern>
        <pattern id="plano-hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="5" height="5" fill="#fbf3e0" />
          <line x1="0" y1="0" x2="0" y2="5" stroke="#d9a441" strokeWidth="2.2" />
        </pattern>
        <pattern id="plano-green" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="1" fill="#1c2226" fillOpacity="0.25" />
        </pattern>
      </defs>

      <rect width="580" height="456" fill="url(#plano-grid)" />

      {/* Lots */}
      {lots.map((l) => (
        <g key={l.n}>
          <rect
            x={l.x}
            y={l.y}
            width={LOT_W}
            height={LOT_H}
            fill={l.status === "vendido" ? "#1f4e8c" : l.status === "apartado" ? "url(#plano-hatch)" : "#f7f8f5"}
            stroke="#1c2226"
            strokeWidth="1"
            className={l.status === "vendido" ? "lot-in" : undefined}
            style={l.status === "vendido" ? { animationDelay: `${(l.n % 9) * 70 + Math.floor(l.n / 9) * 40}ms` } : undefined}
          />
          <text
            x={l.x + 3}
            y={l.y + 9}
            fontSize="7"
            fill={l.status === "vendido" ? "#dbe6f5" : "#1c2226"}
            fillOpacity={l.status === "vendido" ? 0.9 : 0.55}
            style={{ fontFamily: "var(--font-geist-mono), monospace" }}
          >
            {l.n}
          </text>
        </g>
      ))}

      {/* Green area */}
      <rect x={parkX} y={parkY} width={MZ_W} height={MZ_H} fill="url(#plano-green)" stroke="#1c2226" strokeWidth="1" strokeDasharray="4 3" />
      <text x={parkX + MZ_W / 2} y={parkY + MZ_H / 2 + 3} textAnchor="middle" fontSize="10" fill="#1c2226" fillOpacity="0.7">
        Área verde
      </text>

      {/* Street names */}
      <text x={ORIGIN.x + MZ_W + STREET / 2} y={ORIGIN.y - 8} textAnchor="middle" fontSize="8" fill="#1c2226" fillOpacity="0.55">
        Calle Cantera
      </text>
      <text
        x={ORIGIN.x - 14}
        y={ORIGIN.y + MZ_H + STREET / 2}
        textAnchor="middle"
        fontSize="8"
        fill="#1c2226"
        fillOpacity="0.55"
        transform={`rotate(-90 ${ORIGIN.x - 14} ${ORIGIN.y + MZ_H + STREET / 2})`}
      >
        Av. Los Pinos
      </text>

      {/* Lead pins */}
      {pins.map((p) => {
        const bx = p.cx + p.box.dx;
        const by = p.cy + p.box.dy;
        const lx = p.box.dx > 0 ? bx : bx + 90;
        return (
          <g key={p.code}>
            <line x1={p.cx} y1={p.cy} x2={lx} y2={by + 17} stroke="#f0531c" strokeWidth="1.2" />
            <circle cx={p.cx} cy={p.cy} r="9" fill="#f0531c" fillOpacity="0.2" />
            <circle cx={p.cx} cy={p.cy} r="4.5" fill="#f0531c" stroke="#f7f8f5" strokeWidth="1.5" />
            <rect x={bx} y={by} width="90" height="34" fill="#f7f8f5" stroke="#f0531c" strokeWidth="1.2" />
            <text x={bx + 6} y={by + 14} fontSize="9" fontWeight="600" fill="#1c2226" style={{ fontFamily: "var(--font-geist-mono), monospace" }}>
              {p.code}
            </text>
            <text x={bx + 6} y={by + 27} fontSize="8.5" fill="#1c2226" fillOpacity="0.7">
              Lead nuevo, hoy
            </text>
          </g>
        );
      })}

      {/* North arrow */}
      <g transform="translate(528 52)">
        <circle r="17" fill="#f7f8f5" stroke="#1c2226" strokeWidth="1" />
        <path d="M0 -12 L5 7 L0 3 L-5 7 Z" fill="#1c2226" />
        <text y="-20" textAnchor="middle" fontSize="9" fontWeight="600" fill="#1c2226">
          N
        </text>
      </g>

      {/* Title block */}
      <g transform="translate(310 376)">
        <rect width="236" height="62" fill="#f7f8f5" stroke="#1c2226" strokeWidth="1.2" />
        <line x1="0" y1="24" x2="236" y2="24" stroke="#1c2226" strokeWidth="1" />
        <line x1="150" y1="24" x2="150" y2="62" stroke="#1c2226" strokeWidth="1" />
        <text x="8" y="16" fontSize="11" fontWeight="600" fill="#1c2226" style={{ fontFamily: "var(--font-display)" }}>
          Residencial Los Pinos
        </text>
        <text x="8" y="40" fontSize="8.5" fill="#1c2226" fillOpacity="0.7">
          Plano de lotificación
        </text>
        <text x="8" y="53" fontSize="8.5" fill="#1c2226" fillOpacity="0.7">
          Etapa 2 · escala gráfica
        </text>
        <text x="158" y="40" fontSize="8.5" fill="#1c2226" fillOpacity="0.7">
          {lots.filter((l) => l.status === "vendido").length} vendidos
        </text>
        <text x="158" y="53" fontSize="8.5" fill="#1c2226" fillOpacity="0.7">
          {lots.filter((l) => l.status === "apartado").length} apartados
        </text>
      </g>

      {/* Legend */}
      <g transform="translate(50 376)" fontSize="9" fill="#1c2226">
        <rect width="14" height="14" fill="#f7f8f5" stroke="#1c2226" />
        <text x="22" y="11">Disponible</text>
        <rect y="22" width="14" height="14" fill="url(#plano-hatch)" stroke="#1c2226" />
        <text x="22" y="33">Apartado</text>
        <rect y="44" width="14" height="14" fill="#1f4e8c" stroke="#1c2226" />
        <text x="22" y="55">Vendido</text>
        <circle cx="120" cy="7" r="4.5" fill="#f0531c" stroke="#f7f8f5" strokeWidth="1.5" />
        <text x="132" y="11">Lead nuevo</text>
      </g>
    </svg>
  );
}
