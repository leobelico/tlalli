/**
 * Seed with INVENTED demo data (no real people): 2 organizations, 3 developments, 40 leads.
 *
 *   npm run db:seed
 *
 * Requires the local Supabase stack (it creates demo auth users through the admin API).
 * Idempotent: re-running wipes and recreates the two demo organizations.
 * Demo logins (password for all: Demo1234!):
 *   admin@potosi.ejemplo.test   asesor1@potosi.ejemplo.test   asesor2@potosi.ejemplo.test
 *   admin@lomas.ejemplo.test    asesor@lomas.ejemplo.test
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import type { Channel, Stage } from "../src/generated/prisma/enums";

config({ path: [".env.local", ".env"], quiet: true });

const PASSWORD = "Demo1234!";
const DAY = 86_400_000;
const H = 3_600_000;

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
if (!/localhost|127\.0\.0\.1/.test(url)) throw new Error("Seed only runs against a local Supabase instance");
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

// Deterministic pseudo-random so the demo looks the same every run.
let seed = 42;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(rnd() * xs.length)];

const FIRST = ["Alejandra", "Bruno", "Carmen", "Diego", "Elena", "Fernando", "Gloria", "Héctor", "Irma", "Joaquín", "Karla", "Luis", "Mariana", "Nicolás", "Olga", "Pablo", "Regina", "Sergio", "Tania", "Ulises"];
const LAST = ["Aguilar", "Barrios", "Cervantes", "Domínguez", "Espinosa", "Fuentes", "Galván", "Hernández", "Ibarra", "Juárez", "Lara", "Medina", "Návar", "Ortega", "Palacios", "Quintero", "Rangel", "Salazar", "Treviño", "Uribe"];

async function ensureAuthUser(email: string, name: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { name },
  });
  if (error || !data.user) throw new Error(`createUser ${email}: ${error?.message}`);
  await prisma.user.upsert({
    where: { id: data.user.id },
    update: { name, email },
    create: { id: data.user.id, email, name },
  });
  return data.user.id;
}

async function wipe(slug: string, emails: string[]) {
  await prisma.organization.deleteMany({ where: { slug } });
  const users = await prisma.user.findMany({ where: { email: { in: emails } }, select: { id: true } });
  for (const u of users) await admin.auth.admin.deleteUser(u.id);
  await prisma.user.deleteMany({ where: { email: { in: emails } } });
  // Leftover auth users without a profile row (e.g. from a failed earlier run).
  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  for (const au of data?.users ?? []) if (au.email && emails.includes(au.email)) await admin.auth.admin.deleteUser(au.id);
}

type LeadPlan = { n: number; stages: Stage[] };

async function seedOrg(opts: {
  name: string;
  slug: string;
  plan: "BASICO" | "PROFESIONAL";
  people: { email: string; name: string; role: "ADMIN" | "ASESOR" }[];
  developments: { name: string; address: string; units: { prefix: string; count: number; type: "LOTE" | "CASA" | "DEPARTAMENTO"; area: number; price: number }[] }[];
  campaigns: { name: string; channel: Channel; code: string; spend?: number }[];
  leads: LeadPlan;
  phoneBase: number;
}) {
  await wipe(opts.slug, opts.people.map((p) => p.email));
  const ids = new Map<string, string>();
  for (const p of opts.people) ids.set(p.email, await ensureAuthUser(p.email, p.name));
  const asesores = opts.people.filter((p) => p.role === "ASESOR").map((p) => ids.get(p.email)!);
  const adminId = ids.get(opts.people.find((p) => p.role === "ADMIN")!.email)!;

  const org = await prisma.organization.create({
    data: { name: opts.name, slug: opts.slug, plan: opts.plan, leadFormKey: `lfk_demo_${opts.slug}_0123456789abcdef`, staleLeadHours: 24, waDisplayPhone: "+52 444 555 0100" },
  });
  for (const p of opts.people) {
    await prisma.membership.create({ data: { organizationId: org.id, userId: ids.get(p.email)!, role: p.role } });
  }
  await prisma.privacyNotice.create({
    data: {
      organizationId: org.id,
      version: 1,
      createdById: adminId,
      content: `AVISO DE PRIVACIDAD SIMPLIFICADO (DEMO)\n\n${opts.name} (datos ficticios) trata los datos personales que usted proporcione para contactarle sobre desarrollos inmobiliarios, agendar visitas y elaborar cotizaciones. Puede ejercer sus derechos ARCO escribiendo a privacidad@ejemplo.test. Texto de ejemplo: sustitúyalo por su aviso legal.`,
    },
  });

  const unitIds: { id: string; developmentId: string; price: number }[] = [];
  const devIds: string[] = [];
  for (const d of opts.developments) {
    const dev = await prisma.development.create({ data: { organizationId: org.id, name: d.name, address: d.address, city: "San Luis Potosí" } });
    devIds.push(dev.id);
    for (const u of d.units) {
      for (let i = 1; i <= u.count; i++) {
        const price = Math.round((u.price * (0.9 + rnd() * 0.25)) / 1000) * 1000;
        const created = await prisma.unit.create({
          data: { organizationId: org.id, developmentId: dev.id, code: `${u.prefix}${i}`, type: u.type, areaM2: Math.round(u.area * (0.9 + rnd() * 0.3)), price },
        });
        unitIds.push({ id: created.id, developmentId: dev.id, price });
      }
    }
  }

  const campaigns = [];
  for (const c of opts.campaigns) {
    campaigns.push(
      await prisma.campaign.create({
        data: { organizationId: org.id, name: c.name, channel: c.channel, code: c.code, spend: c.spend, developmentId: pick(devIds), startDate: new Date(Date.now() - 28 * DAY) },
      }),
    );
  }

  const notice = await prisma.privacyNotice.findFirstOrThrow({ where: { organizationId: org.id } });
  for (let i = 0; i < opts.leads.n; i++) {
    const stage = opts.leads.stages[i % opts.leads.stages.length];
    const campaign = rnd() < 0.85 ? pick(campaigns) : null;
    const createdAt = new Date(Date.now() - (1 + rnd() * 25) * DAY);
    const unit = pick(unitIds);
    const touched = stage !== "NUEVO";
    const firstContactAt = touched ? new Date(createdAt.getTime() + (0.2 + rnd() * 20) * H) : null;
    const lastContactAt = touched ? new Date(Math.min(Date.now(), firstContactAt!.getTime() + rnd() * 6 * DAY)) : null;
    const assignee = pick(asesores);
    const phone = `+52444555${String(opts.phoneBase + i).padStart(4, "0")}`;
    const closed = stage === "VENDIDO" || stage === "APARTADO";
    const lead = await prisma.lead.create({
      data: {
        organizationId: org.id,
        firstName: pick(FIRST),
        lastName: `${pick(LAST)} ${pick(LAST)}`,
        phone,
        email: rnd() < 0.5 ? `prospecto${opts.phoneBase + i}@ejemplo.test` : null,
        channel: campaign?.channel ?? "OTRO",
        source: "SEED",
        campaignId: campaign?.id,
        developmentId: unit.developmentId,
        unitId: closed ? unit.id : null,
        assignedToId: assignee,
        stage,
        lostReason: stage === "PERDIDO" ? pick(["PRECIO", "UBICACION", "FINANCIAMIENTO", "NO_CONTESTA", "COMPRO_OTRO"] as const) : null,
        budget: Math.round((300 + rnd() * 900) * 1000),
        saleAmount: stage === "VENDIDO" ? unit.price : null,
        soldAt: stage === "VENDIDO" ? new Date(createdAt.getTime() + (3 + rnd() * 10) * DAY) : null,
        firstContactAt,
        lastContactAt,
        stageChangedAt: lastContactAt ?? createdAt,
        consentAt: createdAt,
        createdAt,
      },
    });
    // Stage history (for the funnel): NUEVO plus every step up to the current stage.
    const path: Stage[] = ["NUEVO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA", "COTIZACION", "APARTADO", "VENDIDO"];
    const reach = stage === "PERDIDO" ? path.slice(0, 1 + Math.floor(rnd() * 3)) : path.slice(0, path.indexOf(stage) + 1);
    if (stage === "PERDIDO") reach.push("PERDIDO");
    let at = createdAt.getTime();
    for (let k = 0; k < reach.length; k++) {
      await prisma.leadStageEvent.create({
        data: { organizationId: org.id, leadId: lead.id, fromStage: k ? reach[k - 1] : null, toStage: reach[k], userId: k ? assignee : null, createdAt: new Date(at) },
      });
      at += (4 + rnd() * 40) * H;
    }
    await prisma.consentRecord.create({
      data: { organizationId: org.id, leadId: lead.id, granted: true, source: "SEED", privacyNoticeId: notice.id, createdAt },
    });
    await prisma.activity.create({
      data: { organizationId: org.id, leadId: lead.id, type: "SISTEMA", body: `Lead creado (datos de prueba${campaign ? ` · campaña ${campaign.code}` : ""}).`, createdAt },
    });
    if (touched && rnd() < 0.7) {
      await prisma.activity.create({
        data: { organizationId: org.id, leadId: lead.id, userId: assignee, type: "LLAMADA", body: "Primera llamada: pidió información de precios y formas de pago.", createdAt: firstContactAt! },
      });
    }
    if (stage === "CITA_AGENDADA" || stage === "COTIZACION" || (stage === "CONTACTADO" && rnd() < 0.5)) {
      await prisma.task.create({
        data: {
          organizationId: org.id,
          leadId: lead.id,
          assignedToId: assignee,
          createdById: assignee,
          title: stage === "CITA_AGENDADA" ? "Confirmar visita al desarrollo" : "Dar seguimiento por WhatsApp",
          dueAt: new Date(Date.now() + (rnd() * 4 - 1.5) * DAY),
        },
      });
    }
  }
  return org;
}

async function main() {
  const p = ["NUEVO", "NUEVO", "CONTACTADO", "CONTACTADO", "CITA_AGENDADA", "VISITA_REALIZADA", "COTIZACION", "COTIZACION", "APARTADO", "VENDIDO", "VENDIDO", "PERDIDO", "PERDIDO", "PERDIDO"] as Stage[];
  await seedOrg({
    name: "Desarrollos del Potosí (demo)",
    slug: "demo-potosi",
    plan: "PROFESIONAL",
    people: [
      { email: "admin@potosi.ejemplo.test", name: "Andrea Admin", role: "ADMIN" },
      { email: "asesor1@potosi.ejemplo.test", name: "Beto Asesor", role: "ASESOR" },
      { email: "asesor2@potosi.ejemplo.test", name: "Carla Asesora", role: "ASESOR" },
    ],
    developments: [
      { name: "Residencial Los Pinos", address: "Carretera a Guadalajara km 4", units: [{ prefix: "Lote ", count: 24, type: "LOTE", area: 160, price: 520000 }] },
      { name: "Torre Alameda", address: "Av. Universidad 1200", units: [{ prefix: "Depto ", count: 10, type: "DEPARTAMENTO", area: 78, price: 2350000 }] },
    ],
    campaigns: [
      { name: "Radio Exa octubre", channel: "RADIO", code: "RAD-EXA", spend: 18000 },
      { name: "Espectacular Carretera 57", channel: "ESPECTACULAR", code: "ESP-57", spend: 32000 },
      { name: "Facebook Los Pinos", channel: "FACEBOOK", code: "FB-PINOS", spend: 9500 },
      { name: "Google Torre Alameda", channel: "GOOGLE", code: "GOO-TORRE", spend: 12000 },
      { name: "Referidos clientes", channel: "REFERIDO", code: "REF-2026" },
    ],
    leads: { n: 30, stages: p },
    phoneBase: 100,
  });
  await seedOrg({
    name: "Casas Lomas del Valle (demo)",
    slug: "demo-lomas",
    plan: "BASICO",
    people: [
      { email: "admin@lomas.ejemplo.test", name: "Daniel Admin", role: "ADMIN" },
      { email: "asesor@lomas.ejemplo.test", name: "Elisa Asesora", role: "ASESOR" },
    ],
    developments: [
      { name: "Fraccionamiento Las Lomas", address: "Camino a Soledad 88", units: [{ prefix: "Casa ", count: 12, type: "CASA", area: 120, price: 1650000 }] },
    ],
    campaigns: [
      { name: "Volantes y expo", channel: "EVENTO", code: "EXPO-1", spend: 6000 },
      { name: "Instagram Lomas", channel: "INSTAGRAM", code: "IG-LOMAS", spend: 7000 },
    ],
    leads: { n: 10, stages: p },
    phoneBase: 300,
  });
  const [orgs, devs, leads] = await Promise.all([
    prisma.organization.count({ where: { slug: { startsWith: "demo-" } } }),
    prisma.development.count({ where: { organization: { slug: { startsWith: "demo-" } } } }),
    prisma.lead.count({ where: { organization: { slug: { startsWith: "demo-" } } } }),
  ]);
  console.log(`Seed listo: ${orgs} organizaciones, ${devs} desarrollos, ${leads} leads. Contraseña de todos: ${PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
