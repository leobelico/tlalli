import { describe, expect, it } from "vitest";
import { decodeCsvBytes } from "@/lib/csv-encoding";
import { parseLeadsCsv } from "@/server/services/lead-import";
import { normalizePhone } from "@/lib/phone";

// Bytes as Excel in Spanish writes "CSV (delimitado por comas)": Windows-1252, not UTF-8.
const cp1252 = (s: string) =>
  Uint8Array.from([...s].map((c) => ({ é: 0xe9, ñ: 0xf1, Ñ: 0xd1, á: 0xe1, í: 0xed, ó: 0xf3, ú: 0xfa } as Record<string, number>)[c] ?? c.charCodeAt(0)));
const utf8 = (s: string) => new TextEncoder().encode(s);

describe("CSV encoding (QA B07)", () => {
  it("decodes Windows-1252 files from Excel without corrupting accents", () => {
    const text = decodeCsvBytes(cp1252("nombre,teléfono\r\nJosé Peña,4446000002\r\n"));
    expect(text).toContain("José Peña");
    expect(text).not.toContain("�");
    const { rows } = parseLeadsCsv(text); // accented header "teléfono" must be recognised too
    expect(rows[0].data).toMatchObject({ firstName: "José Peña", phone: "+524446000002" });
  });

  it("keeps UTF-8 (with or without BOM) intact", () => {
    expect(decodeCsvBytes(utf8("nombre,telefono\nÑoño 🌵,4441000001"))).toContain("Ñoño 🌵");
    expect(decodeCsvBytes(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8("nombre\nJosé")]))).toBe("nombre\nJosé");
  });
});

describe("CSV rows (QA B08, B09)", () => {
  it("B08: a malformed email does not discard the lead; it imports without email and warns", () => {
    const { rows, errors, warnings } = parseLeadsCsv("nombre,telefono,correo\nÑoño,4441000006,correo@malo\n");
    expect(errors).toHaveLength(0);
    expect(rows).toHaveLength(1);
    expect(rows[0].data.email).toBeUndefined();
    expect(warnings).toEqual([expect.objectContaining({ line: 2, message: expect.stringMatching(/correo/i) })]);
  });

  it("B09: recognises the Facebook Lead Ads export (full_name, phone_number)", () => {
    const csv =
      "id,created_time,ad_name,form_name,full_name,phone_number,email\n123,2026-11-01T10:00:00,Anuncio,Form1,Carlos Ruiz,+524443000001,c@x.test\n";
    const { rows, errors } = parseLeadsCsv(csv);
    expect(errors).toHaveLength(0);
    expect(rows[0].data).toMatchObject({ firstName: "Carlos Ruiz", phone: "+524443000001", email: "c@x.test" });
  });
});

describe("normalizePhone: junk and real Mexican formats (QA B13)", () => {
  it.each(["0000000000", "1111111111", "9999999999", "00000000", "+0000000000", "0123456789"])("rejects %s", (v) => {
    expect(normalizePhone(v)).toBeNull();
  });
  it.each([
    ["01 444 123 4567", "+524441234567"],
    ["01-444-123-4567", "+524441234567"],
    ["044 444 123 4567", "+524441234567"],
    ["045 444 123 4567", "+524441234567"],
  ])("accepts legacy dialing prefix %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });
});
