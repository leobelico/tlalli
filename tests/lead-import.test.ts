import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { importLeadsCsv, parseChannel, parseLeadsCsv } from "@/server/services/lead-import";
import { createCampaign } from "@/server/services/campaigns";
import { createLeadManual, listLeads, updateLead } from "@/server/services/leads";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

const CSV = `﻿Nombre;Apellido;Teléfono;Correo;Campaña;Origen;Notas
Juan;Pérez;444 100 0001;juan@ejemplo.test;ESP-57;;Vio el espectacular
Lucía;;(444) 100-0002;;;Facebook;
Sin teléfono;;;;;;
Repetido;;4441000001;;;;
Correo malo;;4441000003;no-es-correo;;;
`;

describe("CSV parsing", () => {
  it("parses semicolon CSV with Spanish headers, BOM and accents", () => {
    const { rows, errors, warnings } = parseLeadsCsv(CSV);
    // QA B08: the row with a malformed email is imported (without email) instead of being discarded.
    expect(rows.map((r) => r.data.phone)).toEqual(["+524441000001", "+524441000002", "+524441000003"]);
    expect(rows[2].data.email).toBeUndefined();
    expect(warnings.map((w) => w.line)).toEqual([6]);
    expect(rows[0].data).toMatchObject({ firstName: "Juan", lastName: "Pérez", campaignCode: "ESP-57" });
    expect(rows[1].data.channel).toBe("FACEBOOK");
    expect(errors.map((e) => e.line)).toEqual([4, 5]);
  });

  it("requires name and phone columns", () => {
    expect(() => parseLeadsCsv("correo\na@b.mx")).toThrow(/nombre/);
  });

  it("maps channel labels", () => {
    expect(parseChannel("Espectacular")).toBe("ESPECTACULAR");
    expect(parseChannel("Sitio web")).toBe("SITIO_WEB");
    expect(parseChannel("algo raro")).toBe("OTRO");
  });
});

describe("CSV import and lead access", () => {
  let org: Awaited<ReturnType<typeof makeOrg>>;
  let asesor: Awaited<ReturnType<typeof addMember>>;
  let asesor2: Awaited<ReturnType<typeof addMember>>;

  beforeAll(async () => {
    org = await makeOrg("CSV Org");
    asesor = await addMember(org.org.id, "ASESOR");
    asesor2 = await addMember(org.org.id, "ASESOR");
    await createCampaign(org.adminCtx, { name: "Carretera 57", channel: "ESPECTACULAR", code: "ESP-57" });
  });
  afterAll(cleanup);

  it("requires explicit consent confirmation", async () => {
    await expect(importLeadsCsv(org.adminCtx, CSV, { consentConfirmed: false, assign: "auto" })).rejects.toThrow(
      /aviso de privacidad/,
    );
  });

  it("asesores cannot import", async () => {
    await expect(importLeadsCsv(asesor.ctx, CSV, { consentConfirmed: true, assign: "auto" })).rejects.toThrow(/permiso/);
  });

  it("imports valid rows, reports errors and dedupes on re-import", async () => {
    const first = await importLeadsCsv(org.adminCtx, CSV, { consentConfirmed: true, assign: "auto" });
    expect(first).toMatchObject({ created: 3, duplicates: 0 });
    expect(first.errors).toHaveLength(2);
    expect(first.warnings).toHaveLength(1);
    const juan = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: org.org.id, phone: "+524441000001" },
      include: { campaign: true, consents: true },
    });
    expect(juan.campaign?.code).toBe("ESP-57");
    expect(juan.channel).toBe("ESPECTACULAR");
    expect(juan.consents[0].source).toBe("CSV");
    // round-robin spreads the two leads across both asesores
    const assignees = await rootPrisma.lead.findMany({
      where: { organizationId: org.org.id },
      select: { assignedToId: true },
    });
    expect(new Set(assignees.map((a) => a.assignedToId))).toEqual(new Set([asesor.user.id, asesor2.user.id]));

    const again = await importLeadsCsv(org.adminCtx, CSV, { consentConfirmed: true, assign: "auto" });
    expect(again).toMatchObject({ created: 0, duplicates: 3 }); // 3 valid rows now (QA B08)
  });

  it("asesor only lists own leads and cannot open or reassign others", async () => {
    const own = await createLeadManual(asesor.ctx, { firstName: "Propio", phone: "+524449990001" });
    expect(own.lead.assignedToId).toBe(asesor.user.id);
    const { leads } = await listLeads(asesor.ctx, {});
    expect(leads.every((l) => l.assignedToId === asesor.user.id)).toBe(true);

    const other = await rootPrisma.lead.findFirstOrThrow({
      where: { organizationId: org.org.id, assignedToId: asesor2.user.id },
    });
    await expect(
      updateLead(asesor.ctx, other.id, { firstName: "X", phone: other.phone }),
    ).rejects.toThrow(/no encontrado/i);
    await expect(
      updateLead(asesor.ctx, own.lead.id, { firstName: "Propio", phone: own.lead.phone, assignedToId: asesor2.user.id }),
    ).rejects.toThrow(/administrador/);
  });

  it("asesor cannot assign a manual lead to someone else", async () => {
    const res = await createLeadManual(asesor.ctx, {
      firstName: "Intento",
      phone: "+524449990002",
      assignedToId: asesor2.user.id,
    });
    expect(res.lead.assignedToId).toBe(asesor.user.id);
  });
});
