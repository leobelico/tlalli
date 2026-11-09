import type { CookieOptions } from "@supabase/ssr";

/**
 * Options for the Supabase session cookies. This app only talks to Supabase from the server (there is
 * no browser client), so page scripts never need to read the session: HttpOnly keeps it out of reach of
 * any script injected into a page, and Secure keeps it off plain http in production.
 */
export function hardenCookieOptions(options: CookieOptions | undefined, isProduction = process.env.NODE_ENV === "production"): CookieOptions {
  return {
    ...options,
    path: options?.path ?? "/",
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction ? true : options?.secure,
  };
}
