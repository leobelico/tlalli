import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont } from "pdf-lib";
import { calculateQuote } from "@/lib/quote";
import { formatDate, formatMoney, toNumber } from "@/lib/format";
import { UNIT_TYPE_LABEL } from "@/lib/labels";
import { formatPhone } from "@/lib/phone";
import type { QuoteDetail } from "@/server/services/quotes";

const BRAND = rgb(0.07, 0.5, 0.42);
const INK = rgb(0.08, 0.12, 0.11);
const MUTED = rgb(0.42, 0.42, 0.4);
const LINE = rgb(0.88, 0.87, 0.85);
export const QUOTE_VALID_DAYS = 15;

/** Standard PDF fonts use WinAnsi: drop characters it cannot encode instead of crashing. */
function safe(text: string): string {
  return text.replace(/[^\x20-\x7E -ÿ–—‘’“”•…€]/g, "");
}

export async function renderQuotePdf({ quote, org, author }: QuoteDetail): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Cotización ${quote.unit.code} — ${org.name}`);
  pdf.setAuthor(org.name);
  pdf.setCreationDate(quote.createdAt);
  const page = pdf.addPage([612, 792]); // US Letter
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const { width } = page.getSize();
  const M = 50;
  let y = 742;

  const text = (s: string, x: number, yy: number, opts: { f?: PDFFont; size?: number; color?: ReturnType<typeof rgb> } = {}) =>
    page.drawText(safe(s), { x, y: yy, font: opts.f ?? font, size: opts.size ?? 10, color: opts.color ?? INK });
  const right = (s: string, xRight: number, yy: number, f: PDFFont = font, size = 10, color = INK) =>
    page.drawText(safe(s), { x: xRight - f.widthOfTextAtSize(safe(s), size), y: yy, font: f, size, color });
  const hr = (yy: number) => page.drawLine({ start: { x: M, y: yy }, end: { x: width - M, y: yy }, thickness: 0.7, color: LINE });

  // Header
  page.drawRectangle({ x: 0, y: 772, width, height: 20, color: BRAND });
  text(org.name, M, y, { f: bold, size: 18 });
  right("COTIZACIÓN", width - M, y, bold, 14, BRAND);
  y -= 16;
  text(org.waDisplayPhone ? `WhatsApp ${org.waDisplayPhone}` : "", M, y, { color: MUTED });
  right(`Folio ${quote.id.slice(0, 8).toUpperCase()}`, width - M, y, font, 10, MUTED);
  y -= 14;
  right(`Fecha: ${formatDate(quote.createdAt)}`, width - M, y, font, 10, MUTED);
  y -= 20;
  hr(y);
  y -= 24;

  // Client & unit
  const colX = width / 2 + 10;
  text("CLIENTE", M, y, { f: bold, size: 9, color: MUTED });
  text("UNIDAD", colX, y, { f: bold, size: 9, color: MUTED });
  y -= 16;
  const clientLines = quote.lead
    ? [
        [quote.lead.firstName, quote.lead.lastName].filter(Boolean).join(" "),
        formatPhone(quote.lead.phone),
        quote.lead.email ?? "",
      ]
    : ["Público en general"];
  const area = toNumber(quote.unit.areaM2);
  const unitLines = [
    quote.unit.development.name,
    `${UNIT_TYPE_LABEL[quote.unit.type]} ${quote.unit.code}`,
    area ? `Superficie: ${area.toLocaleString("es-MX")} m²` : "",
    [quote.unit.development.address, quote.unit.development.city].filter(Boolean).join(", "),
  ];
  for (let i = 0; i < Math.max(clientLines.length, unitLines.length); i++) {
    if (clientLines[i]) text(clientLines[i], M, y, { f: i === 0 ? bold : font, size: i === 0 ? 11 : 10 });
    if (unitLines[i]) text(unitLines[i], colX, y, { f: i === 0 ? bold : font, size: i === 0 ? 11 : 10 });
    y -= 15;
  }
  y -= 12;

  // Recompute from stored inputs to show the last installment exactly.
  const calc = calculateQuote({
    price: toNumber(quote.price),
    discount: toNumber(quote.discount),
    downPaymentPct: toNumber(quote.downPaymentPct),
    months: quote.months,
    annualRatePct: toNumber(quote.annualRatePct),
  });

  page.drawRectangle({ x: M, y: y - 6, width: width - 2 * M, height: 22, color: rgb(0.95, 0.97, 0.96) });
  text("PLAN DE PAGOS", M + 10, y, { f: bold, size: 10, color: BRAND });
  y -= 28;

  const rows: [string, string, boolean?][] = [
    ["Precio de lista", formatMoney(calc.price)],
  ];
  if (calc.discount > 0) rows.push(["Descuento", `- ${formatMoney(calc.discount)}`], ["Precio final", formatMoney(calc.netPrice), true]);
  rows.push([`Enganche (${calc.downPaymentPct}%)`, formatMoney(calc.downPayment), true]);
  if (calc.financed > 0) {
    rows.push(["Saldo a financiar", formatMoney(calc.financed)]);
    rows.push(["Plazo", `${calc.months} ${calc.months === 1 ? "mes" : "meses"}`]);
    rows.push(["Tasa de interés anual", calc.annualRatePct ? `${calc.annualRatePct}%` : "Sin intereses"]);
    rows.push([
      calc.lastPayment !== calc.monthlyPayment && calc.months > 1 ? `Mensualidad (${calc.months - 1} pagos)` : "Mensualidad",
      formatMoney(calc.monthlyPayment),
      true,
    ]);
    if (calc.lastPayment !== calc.monthlyPayment && calc.months > 1) rows.push(["Última mensualidad", formatMoney(calc.lastPayment)]);
    if (calc.totalInterest > 0) rows.push(["Intereses totales", formatMoney(calc.totalInterest)]);
  }
  rows.push(["Total a pagar", formatMoney(calc.totalPaid), true]);

  for (const [label, value, strong] of rows) {
    text(label, M + 10, y, { f: strong ? bold : font, size: 11 });
    right(value, width - M - 10, y, strong ? bold : font, 11);
    y -= 8;
    hr(y);
    y -= 16;
  }

  y -= 10;
  const notes = [
    `Cotización válida por ${QUOTE_VALID_DAYS} días naturales a partir de la fecha de emisión, sujeta a disponibilidad.`,
    "Precios en pesos mexicanos. No incluye gastos notariales, escrituración, impuestos ni avalúo.",
    "Las mensualidades son con financiamiento directo del desarrollador, salvo que se indique otra cosa.",
    "Este documento es informativo y no constituye una oferta vinculante ni un contrato.",
  ];
  for (const n of notes) {
    text(`• ${n}`, M, y, { size: 8.5, color: MUTED });
    y -= 13;
  }

  // Footer
  hr(70);
  text(`Atendido por: ${author?.name ?? ""}${author?.email ? ` · ${author.email}` : ""}`, M, 54, { size: 9, color: MUTED });
  right(`${org.name}`, width - M, 54, bold, 9, MUTED);

  return pdf.save();
}
