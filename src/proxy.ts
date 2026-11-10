import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabaseEnv } from "@/lib/supabase/env";
import { hardenCookieOptions } from "@/lib/supabase/cookies";
import { contentSecurityPolicy } from "@/lib/csp";
import { embedOriginsForSlug } from "@/server/public/embed";

/**
 * Refreshes the Supabase session cookie on every app request and performs an
 * optimistic redirect to /login for the private area. Real authorization happens
 * server-side in requireCtx().
 */
export async function proxy(request: NextRequest) {
  // Public hosted form: public, no session. It may be framed only by the sites its organization allowed (QA2 B39).
  if (request.nextUrl.pathname.startsWith("/f/")) {
    const origins = await embedOriginsForSlug(request.nextUrl.pathname.split("/")[2] ?? "");
    const res = NextResponse.next({ request });
    res.headers.set("Content-Security-Policy", contentSecurityPolicy({ production: process.env.NODE_ENV === "production", frameAncestors: origins }));
    // X-Frame-Options cannot express an allow-list; with allowed sites it must not be present.
    if (!origins.length) res.headers.set("X-Frame-Options", "DENY");
    return res;
  }
  let response = NextResponse.next({ request });
  const { url, anonKey } = supabaseEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, hardenCookieOptions(options)));
      },
    },
  });

  const { data } = await supabase.auth.getUser();

  if (!data.user && request.nextUrl.pathname.startsWith("/app")) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/f/:path*", "/login", "/registro", "/invitacion/:path*", "/onboarding"],
};
