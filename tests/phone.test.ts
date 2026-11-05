import { describe, expect, it } from "vitest";
import { formatPhone, normalizePhone } from "@/lib/phone";

describe("normalizePhone (MX default)", () => {
  it.each([
    ["444 123 4567", "+524441234567"],
    ["(444) 123-4567", "+524441234567"],
    ["4441234567", "+524441234567"],
    ["524441234567", "+524441234567"],
    ["+52 444 123 4567", "+524441234567"],
    ["+52 1 444 123 4567", "+524441234567"],
    ["5214441234567", "+524441234567"],
    ["0052 444 123 4567", "+524441234567"],
    ["+1 (415) 555-0100", "+14155550100"],
  ])("%s -> %s", (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it.each(["", "123", "444-123", "+52 444 12", "abcdefghij", "12345678901234567"])("rejects %s", (input) => {
    expect(normalizePhone(input)).toBeNull();
  });

  it("formats MX numbers for display", () => {
    expect(formatPhone("+524441234567")).toBe("444 123 4567");
  });
});
