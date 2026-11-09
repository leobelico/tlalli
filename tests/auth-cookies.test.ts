import { describe, expect, it } from "vitest";
import { hardenCookieOptions } from "@/lib/supabase/cookies";

/** Pilot item 9: the Supabase session cookie was readable by page scripts and sent over plain http. */
describe("session cookie options", () => {
  it("always HttpOnly and SameSite=Lax, whatever the library asked for", () => {
    const o = hardenCookieOptions({ httpOnly: false, sameSite: "none", maxAge: 400 * 86_400, path: "/" }, true);
    expect(o).toMatchObject({ httpOnly: true, sameSite: "lax", maxAge: 400 * 86_400, path: "/" });
  });

  it("Secure in production, left alone on http://localhost in development", () => {
    expect(hardenCookieOptions({}, true).secure).toBe(true);
    expect(hardenCookieOptions({}, false).secure).toBeFalsy();
    expect(hardenCookieOptions({ secure: true }, false).secure).toBe(true); // never downgrade
  });

  it("copes with missing options and keeps a sane path", () => {
    expect(hardenCookieOptions(undefined, true)).toMatchObject({ httpOnly: true, sameSite: "lax", secure: true, path: "/" });
  });

  it("keeps expiry so the user is not logged out early", () => {
    const expires = new Date("2027-01-01T00:00:00Z");
    expect(hardenCookieOptions({ expires }, true).expires).toEqual(expires);
  });
});
