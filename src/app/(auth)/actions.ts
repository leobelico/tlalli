"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  emailSchema,
  nameSchema,
  parseForm,
  passwordSchema,
  type ActionState,
} from "@/lib/validation/common";
import { ACTIVE_ORG_COOKIE, ensureUserProfile, getAuthUser, getSession } from "@/server/auth/session";
import { createOrganization } from "@/server/auth/organizations";
import { acceptInvitation, findValidInvitation, InvitationError } from "@/server/auth/invitations";
import { ForbiddenError } from "@/server/auth/permissions";

const COOKIE_OPTS = { httpOnly: true, sameSite: "lax" as const, secure: process.env.NODE_ENV === "production", path: "/" };

function safeNext(next: unknown): string {
  if (typeof next !== "string") return "/app";
  if (/^\/(app|invitacion)(\/[\w\-/?=&.%]*)?$/.test(next) && !next.startsWith("//")) return next;
  return "/app";
}

export async function loginAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({ email: emailSchema, password: z.string().min(1, { error: "Escribe tu contraseña." }), next: z.string().optional() }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { error: "Confirma tu correo antes de entrar. Revisa tu bandeja de entrada." };
    }
    return { error: "Correo o contraseña incorrectos." };
  }
  redirect(safeNext(parsed.data.next));
}

const signupSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  password: passwordSchema,
  orgName: nameSchema,
  terms: z.literal("on", { error: "Debes aceptar los términos y el aviso de privacidad." }),
});

export async function signupAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(signupSchema, formData);
  if (parsed.error) return parsed.error;
  const { name, email, password, orgName } = parsed.data;
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, pending_org_name: orgName },
      emailRedirectTo: `${process.env.APP_URL ?? ""}/onboarding`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists") return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };
    if (error.code === "weak_password") return { error: "La contraseña es demasiado débil." };
    return { error: "No pudimos crear tu cuenta. Intenta de nuevo." };
  }
  if (!data.user || data.user.identities?.length === 0) {
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión." };
  }
  if (!data.session) {
    return { ok: true, message: "Te enviamos un correo para confirmar tu cuenta. Después inicia sesión." };
  }
  await ensureUserProfile(data.user);
  const org = await createOrganization({ name: orgName, ownerId: data.user.id });
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, COOKIE_OPTS);
  redirect("/app");
}

export async function onboardingAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const authUser = await getAuthUser();
  if (!authUser) redirect("/login");
  const parsed = parseForm(z.object({ orgName: nameSchema }), formData);
  if (parsed.error) return parsed.error;
  const user = await ensureUserProfile(authUser);
  const org = await createOrganization({ name: parsed.data.orgName, ownerId: user.id });
  (await cookies()).set(ACTIVE_ORG_COOKIE, org.id, COOKIE_OPTS);
  redirect("/app");
}

export async function logoutAction() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  (await cookies()).delete(ACTIVE_ORG_COOKIE);
  redirect("/login");
}

export async function switchOrgAction(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/login");
  const orgId = String(formData.get("orgId") ?? "");
  if (session.memberships.some((m) => m.organizationId === orgId)) {
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, COOKIE_OPTS);
  }
  redirect("/app");
}

async function joinWithToken(token: string, user: { id: string; email: string }): Promise<ActionState> {
  try {
    const orgId = await acceptInvitation(token, user);
    (await cookies()).set(ACTIVE_ORG_COOKIE, orgId, COOKIE_OPTS);
  } catch (e) {
    if (e instanceof InvitationError || e instanceof ForbiddenError) return { error: e.message };
    throw e;
  }
  redirect("/app");
}

export async function acceptInvitationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const token = String(formData.get("token") ?? "");
  const authUser = await getAuthUser();
  if (!authUser) redirect(`/login?next=/invitacion/${encodeURIComponent(token)}`);
  const user = await ensureUserProfile(authUser);
  return joinWithToken(token, { id: user.id, email: user.email });
}

export async function signupFromInvitationAction(_: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = parseForm(
    z.object({ token: z.string().min(10).max(200), name: nameSchema, password: passwordSchema }),
    formData,
  );
  if (parsed.error) return parsed.error;
  const inv = await findValidInvitation(parsed.data.token);
  if (!inv) return { error: "La invitación no es válida o ya expiró." };
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email: inv.email,
    password: parsed.data.password,
    options: { data: { name: parsed.data.name } },
  });
  if (error || !data.user || data.user.identities?.length === 0) {
    return { error: "Ya existe una cuenta con ese correo. Inicia sesión para aceptar la invitación." };
  }
  if (!data.session) {
    return { ok: true, message: "Confirma tu correo y vuelve a abrir este enlace para unirte." };
  }
  const user = await ensureUserProfile(data.user);
  return joinWithToken(parsed.data.token, { id: user.id, email: user.email });
}
