"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const ALLOWED = ["submitted", "shortlisted", "rejected", "selected"] as const;

export async function reviewSubmission(formData: FormData) {
  const supabase = await createClient();
  const id = String(formData.get("id"));
  const gigId = String(formData.get("gig_id"));
  const status = String(formData.get("status")) as (typeof ALLOWED)[number];
  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  if (!ALLOWED.includes(status)) return;

  const { error } = await supabase.from("submissions").update({ status, feedback }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath(`/company/gigs/${gigId}/submissions`);
}
