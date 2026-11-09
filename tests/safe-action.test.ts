import { describe, expect, it } from "vitest";
import { guardNetwork, NETWORK_ERROR_MESSAGE } from "@/lib/safe-action";

describe("guardNetwork (QA B06)", () => {
  it("turns a failed fetch into a Spanish error state instead of throwing", async () => {
    const action = guardNetwork(async () => {
      throw new TypeError("Failed to fetch");
    });
    const res = await action({}, new FormData());
    expect(res.error).toBe(NETWORK_ERROR_MESSAGE);
    expect(res.error).toMatch(/internet|conexión/i);
    expect(res.error).not.toMatch(/fetch/i);
  });

  it("passes successful results through untouched", async () => {
    const action = guardNetwork(async () => ({ ok: true, message: "Listo" }));
    expect(await action({}, new FormData())).toEqual({ ok: true, message: "Listo" });
  });

  it("rethrows Next.js control-flow errors (redirect / notFound) so navigation still works", async () => {
    const redirectError = Object.assign(new Error("NEXT_REDIRECT"), { digest: "NEXT_REDIRECT;push;/app;307;" });
    const action = guardNetwork(async () => {
      throw redirectError;
    });
    await expect(action({}, new FormData())).rejects.toBe(redirectError);
  });

  it("rethrows unexpected non-network errors so the error page can show them", async () => {
    const boom = new Error("boom");
    await expect(
      guardNetwork(async () => {
        throw boom;
      })({}, new FormData()),
    ).rejects.toBe(boom);
  });
});
