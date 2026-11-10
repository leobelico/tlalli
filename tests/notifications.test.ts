import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { emailOutbox, emailProviderFor, resetOutbox, sendEmail } from "@/server/notify/email";
import { digestEmail, invitationEmail, leadAssignedEmail } from "@/server/notify/templates";
import { createInvitation } from "@/server/auth/invitations";
import { createLeadManual, updateLead } from "@/server/services/leads";
import { importLeadsCsv } from "@/server/services/lead-import";
import { createTask } from "@/server/services/tasks";
import { intakeWebLead } from "@/server/public/lead-intake";
import { runDailyDigest } from "@/server/public/digest";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const to = (email: string) => emailOutbox.filter((m) => m.to === email);

describe("email providers (QA plan #3)", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("mock provider records messages", async () => {
    resetOutbox();
    expect(await sendEmail({ to: "a@x.test", subject: "Hola", text: "t", html: "<p>t</p>" })).toBe(true);
    expect(emailOutbox).toHaveLength(1);
  });

  it("resend provider posts to the Resend API with the key", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const p = emailProviderFor("resend", { RESEND_API_KEY: "re_test", EMAIL_FROM: "Tlalli <hola@x.mx>" });
    await p.send({ to: "a@x.test", subject: "S", text: "t", html: "<p>t</p>" });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test");
    expect(JSON.parse(String(init.body))).toMatchObject({ from: "Tlalli <hola@x.mx>", to: ["a@x.test"], subject: "S" });
  });

  it("mailpit provider posts to the local Mailpit API", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await emailProviderFor("mailpit", { MAILPIT_URL: "http://127.0.0.1:54324", EMAIL_FROM: "hola@x.mx" }).send({
      to: "a@x.test",
      subject: "S",
      text: "t",
      html: "<p>t</p>",
    });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe("http://127.0.0.1:54324/api/v1/send");
  });

  it("a failing provider never throws into the business flow", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 500 })));
    const p = emailProviderFor("resend", { RESEND_API_KEY: "k", EMAIL_FROM: "a@b.mx" });
    await expect(p.send({ to: "a@x.test", subject: "S", text: "t", html: "t" })).rejects.toThrow();
    const prev = process.env.EMAIL_PROVIDER;
    process.env.EMAIL_PROVIDER = "resend";
    process.env.RESEND_API_KEY = "k";
    try {
      expect(await sendEmail({ to: "a@x.test", subject: "S", text: "t", html: "t" })).toBe(false);
    } finally {
      if (prev === undefined) delete process.env.EMAIL_PROVIDER;
      else process.env.EMAIL_PROVIDER = prev;
    }
  });
});

describe("templates", () => {
  it("escape user-provided text in HTML and keep Spanish copy", () => {
    const m = leadAssignedEmail({
      leadName: "<script>alert(1)</script> Ñoño",
      phone: "444 123 4567",
      origin: "Radio",
      link: "http://x/app/leads/1",
    });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.subject).toMatch(/nuevo lead|lead asignado/i);
    expect(m.text).toContain("444 123 4567");
    expect(
      invitationEmail({ orgName: "Peña & Núñez", inviterName: "José", role: "ASESOR", link: "http://x/i/1" }).html,
    ).toContain("Peña &amp; Núñez");
    expect(digestEmail({ name: "Ana", overdueTasks: 2, staleLeads: 5, link: "http://x/app" }).text).toMatch(
      /2 tareas vencidas/,
    );
  });
});

describe("notifications are sent on the right events", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let other: Awaited<ReturnType<typeof makeOrg>>;
  let a1: Awaited<ReturnType<typeof addMember>>;
  let a2: Awaited<ReturnType<typeof addMember>>;
  let a1Email = "";
  let a2Email = "";
  let n = 0;
  const phone = () => `+52444930${String(++n).padStart(4, "0")}`;

  beforeAll(async () => {
    org = await makeOrg("Notif Org");
    other = await makeOrg("Notif Otra");
    a1 = await addMember(org.org.id, "ASESOR");
    a2 = await addMember(org.org.id, "ASESOR");
    a1Email = (await rootPrisma.user.findUniqueOrThrow({ where: { id: a1.user.id } })).email;
    a2Email = (await rootPrisma.user.findUniqueOrThrow({ where: { id: a2.user.id } })).email;
  });
  beforeEach(() => resetOutbox());
  afterAll(cleanup);

  it("invitation: emails the invitee the one-time link", async () => {
    const token = await createInvitation(org.adminCtx, { email: "Nuevo.Asesor@Ejemplo.test", role: "ASESOR" });
    const mail = to("nuevo.asesor@ejemplo.test");
    expect(mail).toHaveLength(1);
    expect(mail[0].text).toContain(`/invitacion/${token}`);
    expect(mail[0].subject).toContain("Notif Org");
  });

  it("manual capture assigned to someone else notifies the assignee; self-assignment does not", async () => {
    await createLeadManual(org.adminCtx, { firstName: "Para Uno", phone: phone(), assignedToId: a1.user.id });
    expect(to(a1Email)).toHaveLength(1);
    expect(to(a1Email)[0].text).toContain("Para Uno");
    resetOutbox();
    await createLeadManual(a1.ctx, { firstName: "Mío", phone: phone() });
    expect(emailOutbox).toHaveLength(0);
  });

  it("a duplicate capture does not re-notify", async () => {
    const p = phone();
    await createLeadManual(org.adminCtx, { firstName: "Dup", phone: p, assignedToId: a1.user.id });
    resetOutbox();
    await createLeadManual(org.adminCtx, { firstName: "Dup", phone: p, assignedToId: a1.user.id });
    expect(emailOutbox).toHaveLength(0);
  });

  it("web form lead auto-assigned notifies the assignee", async () => {
    const res = await intakeWebLead(org.org.id, { nombre: "Web Lead", telefono: phone(), acepta_privacidad: true }, {});
    expect(res.ok).toBe(true);
    const lead = await rootPrisma.lead.findUniqueOrThrow({ where: { id: (res as { leadId: string }).leadId } });
    const assignee = await rootPrisma.user.findUniqueOrThrow({ where: { id: lead.assignedToId! } });
    expect(to(assignee.email).some((m) => m.text.includes("Web Lead"))).toBe(true);
  });

  it("reassigning notifies the new owner only", async () => {
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Reasigna", phone: phone(), assignedToId: a1.user.id });
    resetOutbox();
    await updateLead(org.adminCtx, lead.id, { firstName: "Reasigna", phone: lead.phone, assignedToId: a2.user.id });
    expect(to(a2Email)).toHaveLength(1);
    expect(to(a1Email)).toHaveLength(0);
  });

  it("CSV import sends one summary per assignee, not one email per lead", async () => {
    const rows = Array.from({ length: 6 }, (_, i) => `Csv ${i},${phone()}`).join("\n");
    await importLeadsCsv(org.adminCtx, `nombre,telefono\n${rows}\n`, { consentConfirmed: true, assign: "auto" });
    const asesorMails = emailOutbox.filter((m) => m.to === a1Email || m.to === a2Email);
    expect(asesorMails.length).toBeLessThanOrEqual(2);
    expect(asesorMails.length).toBeGreaterThan(0);
    expect(asesorMails[0].subject).toMatch(/leads/i);
  });

  it("daily digest emails only people with pending work, scoped to their own organization", async () => {
    const { lead } = await createLeadManual(org.adminCtx, { firstName: "Vencido", phone: phone(), assignedToId: a1.user.id });
    await createTask(org.adminCtx, lead.id, { title: "Llamar", dueAt: new Date(Date.now() - 3_600_000), assignedToId: a1.user.id });
    await rootPrisma.lead.update({ where: { id: lead.id }, data: { createdAt: new Date(Date.now() - 5 * 86_400_000) } });
    resetOutbox();
    const r = await runDailyDigest();
    expect(r.sent).toBeGreaterThanOrEqual(1);
    const mail = to(a1Email);
    expect(mail).toHaveLength(1);
    expect(mail[0].text).toMatch(/1 tarea vencida/);
    const otherAdminEmail = (await rootPrisma.user.findUniqueOrThrow({ where: { id: other.admin.id } })).email;
    expect(to(otherAdminEmail)).toHaveLength(0);
  });
});
