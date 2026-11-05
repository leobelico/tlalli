import type { ActionState } from "@/lib/validation/common";

/** Errors whose message is safe to show to the user (in Spanish). */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "No tienes permiso para realizar esta acción.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "No encontrado.") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** Runs a mutation and converts domain errors into ActionState; unexpected errors are logged and hidden. */
export async function runAction(fn: () => Promise<ActionState | void>): Promise<ActionState> {
  try {
    return (await fn()) ?? { ok: true };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    // Next.js redirect()/notFound() throw special errors that must propagate.
    if (e && typeof e === "object" && "digest" in e) throw e;
    console.error(e);
    return { error: "Ocurrió un error inesperado. Intenta de nuevo." };
  }
}
