// Next.js 16: this file is `proxy.ts` exporting `proxy`.
// On Next.js 15, rename the file to `middleware.ts` and the function to `middleware`.
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
