// E2E (pilot item 7): changing a lead's stage asks for confirmation and offers "Deshacer" for 10 s.
// Exit code 0 only if everything passes.
import { browser, login, shot, BASE, sql } from './lib.mjs';

let failures = 0;
const fail = (m) => { failures++; console.error('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const b = await browser();
const { p } = await login(b, 'asesor1@potosi.ejemplo.test', { width: 1280, height: 800 });
// a lead of this asesor that has never been contacted, so we can see the contact dates come back
const lead = (await sql(`select l.id, l.first_name from leads l join users u on u.id=l.assigned_to_id
  where u.email='asesor1@potosi.ejemplo.test' and l.stage='NUEVO' and l.last_contact_at is null order by l.created_at desc limit 1`))[0];
const state = async () => (await sql('select stage, last_contact_at, first_contact_at from leads where id=$1', [lead.id]))[0];
const before = await state();

await p.goto(`${BASE}/app/leads/${lead.id}`, { waitUntil: 'networkidle' });

// 1) choosing a stage asks first; Cancelar changes nothing
await p.selectOption('#stage-control', 'CONTACTADO');
const dialog = p.locator('dialog[open]');
await dialog.waitFor({ timeout: 5000 }).catch(() => {});
if (!(await dialog.count())) fail('no apareció la confirmación al cambiar de etapa');
else {
  const text = await dialog.innerText();
  if (!/Nuevo/.test(text) || !/Contactado/.test(text) || !/10 segundos/.test(text)) fail('la confirmación no dice de qué etapa a cuál ni menciona los 10 s: ' + text.replace(/\s+/g, ' '));
  else ok('la confirmación dice "de Nuevo a Contactado" y avisa de los 10 s');
  await shot(p, 'etapa-confirmacion', false);
  await dialog.getByRole('button', { name: 'Cancelar' }).click();
  await p.waitForTimeout(800);
  if ((await state()).stage !== 'NUEVO') fail('Cancelar cambió la etapa'); else ok('Cancelar no cambia nada');
}

// 2) confirm -> moves, offers Deshacer
await p.selectOption('#stage-control', 'CONTACTADO');
await p.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click();
const undo = p.getByRole('button', { name: /Deshacer \((\d+) s\)/ });
await undo.waitFor({ timeout: 8000 }).catch(() => {});
if (!(await undo.count())) fail('no apareció el botón Deshacer');
else {
  ok('aparece "' + (await undo.innerText()) + '"');
  if ((await state()).stage !== 'CONTACTADO') fail('Mover no cambió la etapa');
  await shot(p, 'etapa-deshacer', false);
  // 3) undo restores stage AND contact dates
  await undo.click();
  await p.waitForTimeout(2000);
  const after = await state();
  if (after.stage !== 'NUEVO') fail('Deshacer no regresó la etapa: ' + after.stage);
  else if (after.last_contact_at !== null || after.first_contact_at !== null) fail('Deshacer dejó fechas de contacto que el cambio había puesto');
  else ok('Deshacer regresa la etapa y quita el contacto que el cambio había registrado');
  if (await undo.count()) fail('el aviso sigue visible tras deshacer');
}

// 4) the notice disappears by itself after ~10 s
await p.selectOption('#stage-control', 'CONTACTADO');
await p.locator('dialog[open]').getByRole('button', { name: 'Mover' }).click();
await undo.waitFor({ timeout: 8000 }).catch(() => {});
await p.waitForTimeout(11_500);
if (await undo.count()) fail('el aviso Deshacer no desapareció a los 10 s'); else ok('el aviso desaparece solo a los 10 s');
await p.goto(`${BASE}/app/leads/${lead.id}`);
await sql("update leads set stage='NUEVO', last_contact_at=null, first_contact_at=null where id=$1", [lead.id]);

// 5) pipeline: "Mover a…" asks and can be undone (phone width, where it is the only way to move)
await p.setViewportSize({ width: 390, height: 844 });
await p.goto(`${BASE}/app/pipeline`, { waitUntil: 'networkidle' });
const sel = p.locator(`select[aria-label^="Mover a ${lead.first_name}"]`).first();
await sel.selectOption('CONTACTADO');
const d2 = p.locator('dialog[open]');
await d2.waitFor({ timeout: 5000 }).catch(() => {});
if (!(await d2.count())) fail('el pipeline no pidió confirmación');
else {
  ok('el pipeline pide confirmación al mover una tarjeta');
  await d2.getByRole('button', { name: 'Mover' }).click();
  const undo2 = p.getByRole('button', { name: /Deshacer \((\d+) s\)/ });
  await undo2.waitFor({ timeout: 8000 }).catch(() => {});
  if (!(await undo2.count())) fail('el pipeline no ofreció Deshacer');
  else {
    await shot(p, 'etapa-pipeline-deshacer-cel', false);
    await undo2.click();
    await p.waitForTimeout(2000);
    if ((await state()).stage !== 'NUEVO') fail('Deshacer en el pipeline no regresó la etapa'); else ok('Deshacer en el pipeline regresa la tarjeta');
  }
}
await b.close();
console.log(failures ? `\n${failures} fallas` : '\nTodo OK');
process.exitCode = failures ? 1 : 0;
