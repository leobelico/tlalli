import { z } from "zod";

export type ActionState = {
  ok?: boolean;
  message?: string;
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Free-form payload for the client (e.g. a generated invitation link). */
  data?: Record<string, string>;
};

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Correo electrónico inválido." }));

export const passwordSchema = z
  .string()
  .min(8, { error: "La contraseña debe tener al menos 8 caracteres." })
  .max(72, { error: "La contraseña es demasiado larga." });

export const nameSchema = z
  .string()
  .trim()
  .min(2, { error: "Escribe un nombre válido." })
  .max(120, { error: "Máximo 120 caracteres." });

export const uuidSchema = z.uuid({ error: "Identificador inválido." });

/** Empty strings from HTML forms become undefined. */
export const optionalText = (max = 500) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().trim().max(max).optional(),
  );

export const moneySchema = z.coerce
  .number({ error: "Monto inválido." })
  .finite()
  .min(0, { error: "El monto no puede ser negativo." })
  .max(1_000_000_000, { error: "Monto demasiado grande." });

export const optionalMoney = z.preprocess(
  (v) => (v === "" || v === null || v === undefined ? undefined : v),
  moneySchema.optional(),
);

/** Parses FormData with a zod schema, returning either data or an ActionState with field errors. */
export function parseForm<S extends z.ZodType>(
  schema: S,
  formData: FormData,
): { data: z.infer<S>; error?: undefined } | { data?: undefined; error: ActionState } {
  const raw: Record<string, FormDataEntryValue | FormDataEntryValue[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = formData.getAll(key);
    raw[key] = all.length > 1 ? all : all[0];
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      error: {
        error: "Revisa los datos marcados.",
        fieldErrors: z.flattenError(parsed.error).fieldErrors as Record<string, string[]>,
      },
    };
  }
  return { data: parsed.data };
}

export function isUuid(v: unknown): v is string {
  return uuidSchema.safeParse(v).success;
}
