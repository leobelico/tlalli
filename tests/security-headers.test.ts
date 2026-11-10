import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "../next.config";
import { contentSecurityPolicy, parseEmbedOrigins } from "@/lib/csp";
import { proxy } from "@/proxy";
import { updateFormEmbedOrigins } from "@/server/services/organization";
import { rootPrisma } from "@/server/db/root";
import { addMember, cleanup, makeOrg } from "./helpers/factory";

/** QA2 B39: a Content-Security-Policy, and the hosted form embeddable only where the customer allows. */
describe("Content-Security-Policy (QA2 B39)", () => {
  it("is restrictive by default and never allows being framed", () => {
    const csp = contentSecurityPolicy({ production: true });
    expect(csp).toMatch(/default-src 'self'/);
    expect(csp).toMatch(/object-src 'none'/);
    expect(csp).toMatch(/base-uri 'self'/);
    expect(csp).toMatch(/form-action 'self'/);
    expect(csp).toMatch(/frame-ancestors 'none'/);
    expect(csp).not.toMatch(/unsafe-eval/); // only the dev server needs it
    expect(contentSecurityPolicy({ production: false })).toMatch(/unsafe-eval/);
  });

  it("frame-ancestors lists exactly the allowed origins for the hosted form", () => {
    const csp = contentSecurityPolicy({ production: true, frameAncestors: ["https://midesarrolladora.mx", "https://www.midesarrolladora.mx"] });
    expect(csp).toMatch(/frame-ancestors https:\/\/midesarrolladora\.mx https:\/\/www\.midesarrolladora\.mx(;|$)/);
    expect(csp).not.toMatch(/frame-ancestors[^;]*'none'/);
  });

  it("next.config sends it on app pages but leaves /f (set per organization by the proxy) and /api (PDF viewer) alone", async () => {
    const rules = await nextConfig.headers!();
    const withCsp = rules.filter((r) => r.headers.some((h) => h.key === "Content-Security-Policy"));
    expect(withCsp.length).toBeGreaterThan(0);
    const re = (source: string) => {
      const m = /^\/:path\((.*)\)$/.exec(source);
      return new RegExp(m ? `^/${m[1]}$` : "^/.*$"); // "/:path*" matches everything
    };
    const covered = (path: string) => withCsp.some((r) => re(r.source).test(path));
    expect(covered("/app/leads")).toBe(true);
    expect(covered("/login")).toBe(true);
    expect(covered("/f/mi-desarrolladora")).toBe(false);
    expect(covered("/api/quotes/abc/pdf")).toBe(false);
    // the basic headers still reach everything
    const basic = rules.filter((r) => r.headers.some((h) => h.key === "X-Content-Type-Options"));
    expect(basic.some((r) => re(r.source).test("/f/mi-desarrolladora"))).toBe(true);
  });
});

describe("embedding the hosted form only where the customer allows (QA2 B39)", () => {
  it("parses a list of origins and refuses anything that could widen access", () => {
    expect(parseEmbedOrigins("https://a.mx/contacto\nhttps://A.mx\n\nhttp://localhost:3000/x")).toEqual(["https://a.mx", "http://localhost:3000"]);
    for (const bad of ["*", "https://*.a.mx", "http://a.mx", "javascript:alert(1)", "a.mx", "https://a.mx; script-src *", "data:text/html,x"]) {
      expect(() => parseEmbedOrigins(bad)).toThrow(/sitio|dirección|https/i);
    }
    expect(() => parseEmbedOrigins(Array.from({ length: 11 }, (_, i) => `https://s${i}.mx`).join("\n"))).toThrow(/10/);
    expect(parseEmbedOrigins("")).toEqual([]);
  });

  describe("per organization", () => {
    let org: Awaited<ReturnType<typeof makeOrg>>;
    let asesor: Awaited<ReturnType<typeof addMember>>;
    beforeAll(async () => {
      org = await makeOrg("Incrustar Org");
      asesor = await addMember(org.org.id, "ASESOR");
    });
    afterAll(cleanup);
    const frame = async (slug: string) => {
      const res = await proxy(new NextRequest(`http://localhost/f/${slug}`));
      return { csp: res.headers.get("content-security-policy") ?? "", xfo: res.headers.get("x-frame-options") };
    };

    it("by default nobody may frame it; once allowed, only the listed sites may", async () => {
      expect(await frame(org.org.slug)).toMatchObject({ xfo: "DENY" });
      expect((await frame(org.org.slug)).csp).toMatch(/frame-ancestors 'none'/);
      await updateFormEmbedOrigins(org.adminCtx, "https://midesarrolladora.mx");
      const allowed = await frame(org.org.slug);
      expect(allowed.csp).toMatch(/frame-ancestors https:\/\/midesarrolladora\.mx(;|$)/);
      expect(allowed.xfo).toBeNull(); // X-Frame-Options cannot express an allow-list, so it must not be there
      expect((await frame("slug-que-no-existe")).csp).toMatch(/frame-ancestors 'none'/);
    });

    it("only administrators can change it, and it is stored normalized", async () => {
      await expect(updateFormEmbedOrigins(asesor.ctx, "https://x.mx")).rejects.toThrow(/permiso/i);
      await updateFormEmbedOrigins(org.adminCtx, "https://B.mx/ruta\nhttps://c.mx");
      expect((await rootPrisma.organization.findUniqueOrThrow({ where: { id: org.org.id } })).formEmbedOrigins).toEqual(["https://b.mx", "https://c.mx"]);
      await updateFormEmbedOrigins(org.adminCtx, "");
      expect((await frame(org.org.slug)).csp).toMatch(/frame-ancestors 'none'/);
    });
  });
});
