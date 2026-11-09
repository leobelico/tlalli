/**
 * Commercial guard rails. Asesores (commission sellers) may not discount or sell below this
 * percentage of the list price without an administrator (QA B04/B05). The default is 5%; each
 * organization can change it in Configuración.
 */
export const DEFAULT_MAX_DISCOUNT_PCT = 5;
/** @deprecated Each organization now sets its own cap (organizations.max_asesor_discount_pct). */
export const ASESOR_MAX_DISCOUNT_PCT = DEFAULT_MAX_DISCOUNT_PCT;
