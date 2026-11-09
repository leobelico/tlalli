import { requireCtx } from "@/server/auth/session";
import { Logo } from "@/components/ui";
import { can } from "@/server/auth/permissions";
import { SideNav } from "./side-nav";
import { MobileNav } from "./mobile-nav";
import { ResponsiveTables } from "@/components/responsive-tables";
import { AlertsBanner } from "./alerts-banner";
import { logoutAction, switchOrgAction } from "../(auth)/actions";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const { ctx, session } = await requireCtx();
  const isAdmin = can(ctx.role, "org:settings");

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-stone-200 bg-white px-3 py-4 md:flex">
        <div className="px-2">
          <Logo />
        </div>
        <div className="mt-4 px-2">
          {session.memberships.length > 1 ? (
            <form action={switchOrgAction}>
              <select
                name="orgId"
                defaultValue={ctx.orgId}
                className="input py-1.5 text-xs"
                aria-label="Organización activa"
              >
                {session.memberships.map((m) => (
                  <option key={m.organizationId} value={m.organizationId}>
                    {m.organization.name}
                  </option>
                ))}
              </select>
              <button className="mt-1 text-xs text-brand-700 hover:underline">Cambiar organización</button>
            </form>
          ) : (
            <p className="truncate text-xs font-medium text-stone-500">{session.active!.organization.name}</p>
          )}
        </div>
        <SideNav isAdmin={isAdmin} />
        <div className="mt-auto border-t border-stone-200 px-2 pt-3">
          <p className="truncate text-sm font-medium">{session.user.name}</p>
          <p className="truncate text-xs text-stone-500">
            {session.user.email} · {ctx.role === "ADMIN" ? "Administrador" : "Asesor"}
          </p>
          <form action={logoutAction}>
            <button className="mt-2 text-xs text-stone-500 hover:text-stone-800 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <MobileNav
          isAdmin={isAdmin}
          orgName={session.active!.organization.name}
          userName={session.user.name}
          logout={logoutAction}
        />
        <AlertsBanner ctx={ctx} />
        <main className="app-main flex-1 px-4 py-6 sm:px-8">{children}</main>
        <ResponsiveTables />
      </div>
    </div>
  );
}
