import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { User as AuthUser } from "@supabase/supabase-js";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { rootPrisma } from "@/server/db/root";
import { can, type Ctx, type Permission } from "./permissions";

export const ACTIVE_ORG_COOKIE = "org_id";

export const getAuthUser = cache(async (): Promise<AuthUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

/** Creates the public.users mirror row on first sight of an auth user. */
export async function ensureUserProfile(authUser: AuthUser) {
  const existing = await rootPrisma.user.findUnique({ where: { id: authUser.id } });
  if (existing) return existing;
  const email = (authUser.email ?? "").toLowerCase();
  const metaName = typeof authUser.user_metadata?.name === "string" ? authUser.user_metadata.name : "";
  return rootPrisma.user.upsert({
    where: { id: authUser.id },
    update: {},
    create: { id: authUser.id, email, name: metaName.trim() || email.split("@")[0] || "Usuario" },
  });
}

export const getSession = cache(async () => {
  const authUser = await getAuthUser();
  if (!authUser) return null;
  const user = await ensureUserProfile(authUser);
  const memberships = await rootPrisma.membership.findMany({
    where: { userId: user.id, active: true },
    include: {
      organization: { select: { id: true, name: true, slug: true, plan: true, staleLeadHours: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const preferred = (await cookies()).get(ACTIVE_ORG_COOKIE)?.value;
  const active = memberships.find((m) => m.organizationId === preferred) ?? memberships[0] ?? null;
  return { user, memberships, active };
});

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;

/**
 * Resolves the authenticated tenant context or redirects.
 * Use at the top of every private page and server action.
 */
export async function requireCtx(permission?: Permission): Promise<{ ctx: Ctx; session: Session }> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!session.active) redirect("/onboarding");
  const ctx: Ctx = {
    orgId: session.active.organizationId,
    userId: session.user.id,
    role: session.active.role,
  };
  if (permission && !can(ctx.role, permission)) redirect("/app?error=permiso");
  return { ctx, session };
}
