// ¿Un solo bot puede dejar sin formulario a todos los clientes reales de una organización? (límite por organización)
import { log, fail, ok, finish, sql } from './n-lib.mjs';
const org = (await sql("select id, lead_form_key k from organizations where slug='demo-potosi'"))[0];
const post = (body) => fetch('http://localhost:3300/api/public/leads', { method: 'POST', headers: { 'content-type': 'application/json', 'x-form-key': org.k }, body: JSON.stringify(body) });
const before = (await sql('select count(*)::int n from leads where organization_id=$1', [org.id]))[0].n;
let codes = {};
for (let i = 0; i < 320; i++) { const r = await post({ nombre: 'x', telefono: 'abc', acepta_privacidad: false }); codes[r.status] = (codes[r.status] || 0) + 1; }
log('320 peticiones inválidas (no crean leads) desde un solo cliente ->', JSON.stringify(codes));
const legit = await post({ nombre: 'Cliente Real', telefono: '444' + String(Date.now()).slice(-7), acepta_privacidad: true });
log('un cliente real llena el formulario justo después ->', legit.status, await legit.text());
log('leads creados por el bot:', (await sql('select count(*)::int n from leads where organization_id=$1', [org.id]))[0].n - before);
if (legit.status === 429) fail('un solo bot, con peticiones que ni siquiera crean leads, bloquea el formulario de TODA la organización durante ~1 minuto, y la persona real ve "Demasiadas solicitudes" (sin límite por IP no hay forma de separarlos)');
await new Promise((r) => setTimeout(r, 62000));
const later = await post({ nombre: 'Cliente Real 2', telefono: '444' + String(Date.now()).slice(-7), acepta_privacidad: true });
log('un minuto después ->', later.status);
finish();
