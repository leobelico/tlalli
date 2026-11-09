/**
 * Normalizes a phone number to E.164. Defaults to Mexico (+52).
 *  - "444 123 4567"        -> +524441234567
 *  - "+52 1 444 123 4567"  -> +524441234567 (legacy mobile "1" removed)
 *  - "52 444 123 4567"     -> +524441234567
 *  - "+1 (415) 555-0100"   -> +14155550100
 * Returns null when it cannot be a valid number.
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  const raw = String(input).trim();
  if (!raw) return null;
  const hasPlus = raw.startsWith("+") || raw.startsWith("00");
  let digits = raw.replace(/\D/g, "");
  if (raw.startsWith("00")) digits = digits.slice(2);

  if (!hasPlus) {
    // Legacy dialing prefixes still written by hand: 01 (long distance), 044/045 (mobile).
    if (digits.length === 12 && digits.startsWith("01")) digits = digits.slice(2);
    else if (digits.length === 13 && (digits.startsWith("044") || digits.startsWith("045"))) digits = digits.slice(3);
    if (digits.length === 10) return isPlausibleMxNational(digits) ? `+52${digits}` : null;
    if (digits.length === 12 && digits.startsWith("52")) return `+${digits}`;
    if (digits.length === 13 && digits.startsWith("521")) return `+52${digits.slice(3)}`;
    return null;
  }
  if (digits.startsWith("52")) {
    const national = digits.length === 13 && digits[2] === "1" ? digits.slice(3) : digits.slice(2);
    return national.length === 10 && isPlausibleMxNational(national) ? `+52${national}` : null;
  }
  // E.164 country codes never start with 0 ("0000000000" is not a number).
  if (digits.startsWith("0")) return null;
  return digits.length >= 8 && digits.length <= 15 ? `+${digits}` : null;
}

/** Mexican area codes never start with 0 or 1, and a number of one repeated digit is a placeholder. */
function isPlausibleMxNational(digits: string): boolean {
  return /^[2-9]/.test(digits) && !/^(\d)\1{9}$/.test(digits);
}

/** "+524441234567" -> "444 123 4567" for display. */
export function formatPhone(e164: string): string {
  const m = /^\+52(\d{3})(\d{3})(\d{4})$/.exec(e164);
  return m ? `${m[1]} ${m[2]} ${m[3]}` : e164;
}

/** Digits for wa.me links / WhatsApp Cloud API ("524441234567"). */
export function waDigits(e164: string): string {
  return e164.replace(/\D/g, "");
}
