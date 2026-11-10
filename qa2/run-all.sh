#!/usr/bin/env bash
# Pasada 3 (después de cerrar QA2): recorrido completo sobre el build de producción.
# Uso: QA_BASE=http://localhost:3300 QA_CRON_SECRET=<el CRON_SECRET del servidor> bash qa2/run-all.sh
cd "$(dirname "$0")" || exit 1
mkdir -p run4
out="$(pwd)/run4"
export QA_BASE="${QA_BASE:-http://localhost:3300}" PYTHONIOENCODING=utf-8
step() { name=$1; shift; echo ">>> $name"; ( "$@" ) > "$out/$name.txt" 2>&1; echo "exit=$?" >> "$out/$name.txt"; }
rm -f accounts.json devA.json asesor.json
step 10-registro     node scripts/f1-registro.mjs
step 11-inventario   node scripts/f2-inventario.mjs
step 12-equipo-leads node scripts/f3-equipo-leads.mjs
step 13-csv          node scripts/f4-csv.mjs csv-utf8 csv-excel-1252 csv-facebook csv-vacio csv-binario csv-2500 csv-puntoycoma csv-ansi-sin-acento-header
step 14-apartado     node scripts/f5-apartado.mjs
step 15-asesor       node scripts/f6-asesor.mjs
step 16-venta        node scripts/f6b-venta.mjs
step 17-concurrencia node scripts/n1-concurrencia.mjs
step 18-autorizar    node scripts/n2-autorizaciones.mjs
step 19-baja         node scripts/n3-baja.mjs
step 20-masiva       node scripts/n3b-filtro.mjs
step 21-publico      node scripts/n4-publico.mjs
step 22-cabeceras    node scripts/n8-cabeceras.mjs
step 23-aislamiento  node scripts/f7-aislamiento.mjs
step 24-tamper       node scripts/f8-tamper.mjs
step 25-roles        node scripts/f9-roles.mjs
step 26-secretos     node scripts/f10-secretos.mjs
step 27-frio         node scripts/n6-frio.mjs
step 28-movil        node scripts/m9-tactil.mjs
step 29-movil-menu   node scripts/e2e-movil.mjs
step 30-etapa        node scripts/e2e-etapa.mjs
step 31-lenguaje     node scripts/e2e-lenguaje.mjs
step 32-formulario   node scripts/v-form.mjs
step 33-recuperar    node scripts/e2e-recuperar.mjs
step 34-offline      node scripts/v-b06.mjs
step 35-b10          node scripts/v-b10.mjs
step 36-cliente-nuevo node scripts/n7-cliente-nuevo.mjs
export QA_CRON_SECRET="${QA_CRON_SECRET:-qa2-cron-secret-0123456789abcdef}"
step 37-produccion   node scripts/prod-checks.mjs
echo ">>> terminado"
