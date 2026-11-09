#!/usr/bin/env bash
# Full QA regression: static checks + every browser flow, with fresh organizations.
# Output of each step goes to qa/run2/<step>.txt. Usage: bash qa/run-all.sh (dev server on :3010, Supabase up)
cd "$(dirname "$0")/.." || exit 1
mkdir -p qa/run2
out="$(pwd)/qa/run2"

step() { name=$1; shift; echo ">>> $name"; ( "$@" ) > "$out/$name.txt" 2>&1; echo "exit=$?" >> "$out/$name.txt"; }

# static checks already captured in the first pass (00-02)

cd qa || exit 1
step 10-tour        node scripts/tour.mjs
step 11-registro    node scripts/f1-registro.mjs
step 12-inventario  node scripts/f2-inventario.mjs
step 13-equipo-leads node scripts/f3-equipo-leads.mjs
step 14-csv         node scripts/f4-csv.mjs csv-utf8 csv-excel-1252 csv-facebook csv-vacio csv-binario csv-2500 csv-puntoycoma csv-ansi-sin-acento-header
step 15-apartado    node scripts/f5-apartado.mjs
step 16-asesor      node scripts/f6-asesor.mjs
step 17-venta       node scripts/f6b-venta.mjs
step 18-aislamiento node scripts/f7-aislamiento.mjs
step 19-tamper      node scripts/f8-tamper.mjs
step 20-roles       node scripts/f9-roles.mjs
step 21-secretos    node scripts/f10-secretos.mjs
step 22-whatsapp    node scripts/f11-whatsapp.mjs
step 23-seed5000    node scripts/seed5000.mjs
step 24-rendimiento node scripts/f12-perf.mjs
step 25-misc        node scripts/f13-misc.mjs
step 26-baja        node scripts/f14-baja.mjs
step 27-recuperar   node scripts/e2e-recuperar.mjs
echo ">>> terminado"
