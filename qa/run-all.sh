#!/usr/bin/env bash
# Full QA regression: static checks + every browser flow, with fresh organizations.
# Usage: QA_BASE=http://localhost:3300 bash qa/run-all.sh
#   - the app must be running at QA_BASE (use `npm run build && next start` to test the PRODUCTION build)
#   - Supabase must be up; output of each step goes to qa/run3/<step>.txt
cd "$(dirname "$0")/.." || exit 1
mkdir -p qa/run3
out="$(pwd)/qa/run3"
export QA_BASE="${QA_BASE:-http://localhost:3010}"

step() { name=$1; shift; echo ">>> $name"; ( "$@" ) > "$out/$name.txt" 2>&1; echo "exit=$?" >> "$out/$name.txt"; }

if [ "${SKIP_STATIC:-0}" != "1" ]; then
  step 00-lint        npm run lint
  step 01-typecheck   npm run typecheck
  step 02-tests       npx vitest run
fi

cd qa || exit 1
rm -f accounts.json devA.json asesor.json
step 10-tour         node scripts/tour.mjs
step 11-registro     node scripts/f1-registro.mjs
step 12-inventario   node scripts/f2-inventario.mjs
step 13-equipo-leads node scripts/f3-equipo-leads.mjs
step 14-csv          node scripts/f4-csv.mjs csv-utf8 csv-excel-1252 csv-facebook csv-vacio csv-binario csv-2500 csv-puntoycoma csv-ansi-sin-acento-header
step 15-apartado     node scripts/f5-apartado.mjs
step 16-asesor       node scripts/f6-asesor.mjs
step 17-venta        node scripts/f6b-venta.mjs
step 18-aislamiento  node scripts/f7-aislamiento.mjs
step 19-tamper       node scripts/f8-tamper.mjs
step 20-roles        node scripts/f9-roles.mjs
step 21-secretos     node scripts/f10-secretos.mjs
step 22-whatsapp     node scripts/f11-whatsapp.mjs
step 23-seed5000     node scripts/seed5000.mjs
step 24-rendimiento  node scripts/f12-perf.mjs
step 25-misc         node scripts/f13-misc.mjs
step 25b-offline     node scripts/v-b06.mjs
step 26-frio         node scripts/v-b18.mjs
step 27-baja         node scripts/f14-baja.mjs
step 28-recuperar    node scripts/e2e-recuperar.mjs
step 30-movil        node scripts/e2e-movil.mjs
step 31-lenguaje     node scripts/e2e-lenguaje.mjs
step 32-etapa        node scripts/e2e-etapa.mjs
step 33-autorizaciones node scripts/v-autorizaciones.mjs
step 34-formulario   node scripts/v-form.mjs
# QA_CRON_SECRET must be the CRON_SECRET the server under test was started with (16+ characters)
step 35-produccion   node scripts/prod-checks.mjs
step 36-b10          node scripts/v-b10.mjs
echo ">>> terminado"
