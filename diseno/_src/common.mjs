import { DIR, cssVars } from './tokens.mjs';
import { planoSvg } from './lib.mjs';

/** Documento HTML completo con tokens claro/oscuro. `defaultMode` = modo con el que se ve por defecto; ?tema=claro|oscuro lo cambia. */
export function doc({ dir, title, css, body, defaultMode = 'light', vp = 'width=device-width, initial-scale=1' }) {
  const d = DIR[dir];
  return `<!doctype html>
<html lang="es-MX" data-theme="${defaultMode === 'dark' ? 'dark' : 'light'}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="${vp}">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?${d.gf}&display=swap" rel="stylesheet">
<style>
:root, :root[data-theme="light"] { ${cssVars(d.light)}; color-scheme: light; }
:root[data-theme="dark"] { ${cssVars(d.dark)}; color-scheme: dark; }
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-text-size-adjust: 100%; }
body { margin: 0; background: var(--bg); color: var(--ink); }
a { color: inherit; }
:focus-visible { outline: 3px solid var(--primary); outline-offset: 2px; }
.lg-d { display: none; } .lg-l, .lg-d { line-height: 0; display: inline-flex; }
:root[data-theme="dark"] .lg-l { display: none; } :root:not([data-theme="dark"]) .lg-d { display: none; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); }
${css}
</style>
</head>
<body>
${body}
<script>
  var t = new URLSearchParams(location.search).get('tema');
  if (t === 'oscuro' || t === 'claro') document.documentElement.setAttribute('data-theme', t === 'oscuro' ? 'dark' : 'light');
</script>
</body>
</html>`;
}

/** Paleta del plano a partir de los tokens (estatus = color + textura + borde, no solo color). */
export function planoPal(t, id) {
  return {
    id,
    bg: t.surface2, street: t.bg, text: t.ink, mark: t.muted, sel: t.primary,
    D: { fill: t.okBg, line: t.ok },
    A: { fill: t.warnBg, line: t.warn, hatch: t.warn + '55' },
    V: { fill: t.soldFill ?? t.sold, line: t.sold, text: t.soldText ?? t.bg },
  };
}
export const plano = (t, id, opts = {}) => planoSvg({ pal: planoPal(t, id), ...opts });
export const statusLegend = (cls = 'lg') => `<ul class="${cls}" aria-label="Leyenda del plano"><li><i class="sw d"></i>Disponible</li><li><i class="sw a"></i>Apartado</li><li><i class="sw v"></i>Vendido</li></ul>`;

/** Logotipo que cambia solo con el tema (claro/oscuro). */
export const logoAuto = (L, h) => `<span class="lg-l">${L.inline('light', h)}</span><span class="lg-d">${L.inline('dark', h)}</span>`;
