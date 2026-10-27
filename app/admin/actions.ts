"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// The database checks the caller is an admin; this only passes the request on.
export async function setCompanyVerified(companyId: string, verified: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_company_verified", {
    p_company: companyId,
    p_verified: verified,
  });
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  revalidatePath("/admin");
}
