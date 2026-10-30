import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

export async function createClient() {
  // Every page that talks to Supabase renders per request. Since Next 16.4.3
  // cookies() alone no longer covers Date.now() / new Date() during
  // prefetching, so this marks the render as request-time explicitly.
  await connection();
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component — safe to ignore; proxy refreshes the session.
          }
        },
      },
    }
  );
}

// Reads the signed-in user from the session cookie. getClaims() verifies the
// JWT locally when the project uses asymmetric signing keys, so it skips the
// round trip to the Auth server that getUser() makes on every page load.
export async function getSessionUser(
  supabase: Awaited<ReturnType<typeof createClient>>
): Promise<{ id: string } | null> {
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub ? { id: data.claims.sub } : null;
}
