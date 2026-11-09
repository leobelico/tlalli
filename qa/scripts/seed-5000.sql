-- 5,000 synthetic leads for org A (QA). Run once.
WITH org AS (SELECT m.organization_id oid FROM memberships m JOIN users u ON u.id=m.user_id WHERE u.email LIKE 'qa-a-%' LIMIT 1),
 people AS (SELECT array_agg(m.user_id) ids FROM memberships m, org WHERE m.organization_id=org.oid AND m.active),
 ins AS (
 INSERT INTO leads (id, organization_id, first_name, last_name, phone, channel, source, assigned_to_id, stage, budget, created_at, updated_at, stage_changed_at, last_contact_at, first_contact_at, consent_at)
 SELECT gen_random_uuid(), org.oid,
   (ARRAY['José','María','Juan','Guadalupe','Ñoño','Lucía','Héctor','Fernanda'])[1+g%8] || ' ' || g,
   (ARRAY['Pérez','Núñez','García','Hernández','López'])[1+g%5],
   '+52449' || lpad(g::text,7,'0'),
   (ARRAY['RADIO','ESPECTACULAR','FACEBOOK','REFERIDO','SITIO_WEB']::"Channel"[])[1+g%5], 'CSV',
   people.ids[1+g%array_length(people.ids,1)],
   (ARRAY['NUEVO','CONTACTADO','CITA_AGENDADA','VISITA_REALIZADA','COTIZACION','APARTADO','VENDIDO','PERDIDO','PERDIDO','CONTACTADO']::"Stage"[])[1+g%10],
   300000 + (g%50)*20000,
   now() - (g%180 || ' days')::interval, now(), now() - (g%60 || ' days')::interval,
   CASE WHEN g%3=0 THEN NULL ELSE now() - (g%30 || ' days')::interval END,
   CASE WHEN g%3=0 THEN NULL ELSE now() - (g%170 || ' days')::interval END, now()
 FROM generate_series(1,5000) g, org, people RETURNING id, organization_id, stage, created_at)
INSERT INTO lead_stage_events (id, organization_id, lead_id, to_stage, created_at)
SELECT gen_random_uuid(), organization_id, id, stage, created_at FROM ins;
