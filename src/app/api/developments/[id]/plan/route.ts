import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/server/auth/session";
import { isUuid } from "@/lib/validation/common";
import { MAX_PLAN_BYTES } from "@/lib/plan-shape";
import { DomainError, NotFoundError } from "@/server/errors";
import { getPlanFile, savePlan } from "@/server/services/plans";

async function authed() {
  const session = await getSession();
  if (!session?.active) return null;
  return {
    orgId: session.active.organizationId,
    userId: session.user.id,
    role: session.active.role,
  };
}

export async function GET(_req: NextRequest, { params }: RouteContext<"/api/developments/[id]/plan">) {
  const { id } = await params;
  const ctx = await authed();
  if (!ctx) return new NextResponse("No autorizado", { status: 401 });
  if (!isUuid(id)) return new NextResponse("No encontrado", { status: 404 });
  try {
    const plan = await getPlanFile(ctx, id);
    return new NextResponse(Buffer.from(plan.data), {
      headers: {
        "Content-Type": plan.contentType,
        "Cache-Control": "private, max-age=0, must-revalidate",
        ETag: `"${plan.updatedAt.getTime()}"`,
        // The file is an image we validated by magic bytes; still, never let it run as a document.
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (e) {
    if (e instanceof NotFoundError) return new NextResponse("No encontrado", { status: 404 });
    throw e;
  }
}

export async function POST(req: NextRequest, { params }: RouteContext<"/api/developments/[id]/plan">) {
  const { id } = await params;
  const ctx = await authed();
  if (!ctx) return NextResponse.json({ error: "Inicia sesión de nuevo." }, { status: 401 });
  if (!isUuid(id)) return NextResponse.json({ error: "Desarrollo no encontrado." }, { status: 404 });
  const declared = Number(req.headers.get("content-length") ?? 0);
  if (declared > MAX_PLAN_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "El plano pesa más de 5 MB. Exporta una imagen más ligera." }, { status: 413 });
  }
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "Elige un archivo." }, { status: 400 });
    await savePlan(ctx, id, new Uint8Array(await file.arrayBuffer()));
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof DomainError) {
      const status = e instanceof NotFoundError ? 404 : 400;
      return NextResponse.json({ error: e.message }, { status });
    }
    console.error(e);
    return NextResponse.json({ error: "No se pudo subir el plano." }, { status: 500 });
  }
}
