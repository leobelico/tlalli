import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { isUuid } from "@/lib/validation/common";
import { NotFoundError } from "@/server/errors";
import { getQuote } from "@/server/services/quotes";
import { renderQuotePdf } from "@/server/pdf/quote-pdf";

export async function GET(_req: NextRequest, { params }: RouteContext<"/api/quotes/[id]/pdf">) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.active) return new NextResponse("No autorizado", { status: 401 });
  if (!isUuid(id)) return new NextResponse("No encontrado", { status: 404 });
  const ctx = { orgId: session.active.organizationId, userId: session.user.id, role: session.active.role };
  try {
    const detail = await getQuote(ctx, id);
    const bytes = await renderQuotePdf(detail);
    const name = `cotizacion-${detail.quote.unit.code.replace(/[^\w-]+/g, "-")}.pdf`;
    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${name}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    if (e instanceof NotFoundError) return new NextResponse("No encontrado", { status: 404 });
    throw e;
  }
}
