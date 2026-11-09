/**
 * Decodes CSV bytes. Excel in Spanish saves "CSV (delimitado por comas)" as Windows-1252, and
 * reading that as UTF-8 silently turns every accent into "�" (QA B07). Try strict UTF-8
 * first (also handles the BOM) and fall back to Windows-1252.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1252").decode(bytes);
  }
}
