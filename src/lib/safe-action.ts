import type { ActionState } from "@/lib/validation/common";

export const NETWORK_ERROR_MESSAGE =
  "No hay conexión con el servidor. Revisa tu internet y vuelve a intentar: lo que escribiste sigue aquí.";

type Action<S = ActionState> = (prev: S, formData: FormData) => Promise<S>;

/**
 * Wraps a server action so a dropped connection becomes a normal error message (and the form keeps
 * what the user typed) instead of crashing the screen (QA B06). Redirects and other Next.js
 * control-flow errors carry a `digest` and are rethrown untouched.
 */
export function guardNetwork(action: Action): Action {
  return async (prev, formData) => {
    try {
      return await action(prev, formData);
    } catch (e) {
      if (e && typeof e === "object" && "digest" in e) throw e;
      if (e instanceof TypeError) return { error: NETWORK_ERROR_MESSAGE };
      throw e;
    }
  };
}
