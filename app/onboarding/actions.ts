"use server";

import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";

export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const role = formData.get("role") as "student" | "company";
  const fullName = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!["student", "company"].includes(role)) return { error: "Pick a role" };
  if (!fullName) return { error: "Name is required" };
  if (!/^[a-z0-9_]{3,30}$/.test(username))
    return { error: "Username: 3–30 chars, lowercase letters, numbers, _" };
  if (role === "company" && !companyName) return { error: "Company name is required" };

  // Create the company before setting the role, so a failed insert can't
  // leave a business account with no company (which would loop back here)
  if (role === "company") {
    const { data: existing } = await supabase
      .from("companies")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!existing) {
      const slug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const { error: cErr } = await supabase
        .from("companies")
        .insert({ owner_id: user.id, name: companyName, slug });
      if (cErr) return { error: cErr.code === "23505" ? "Company name already registered" : cErr.message };
    }
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role, full_name: fullName, username })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is taken" };
    return { error: error.message };
  }

  redirect(role === "company" ? "/company" : "/dashboard");
}
