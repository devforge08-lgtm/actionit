"use server";

import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { checkAchievement, type AchievementInput } from "@/lib/achievements";

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

  // Optional for students: things they've already built, sent as JSON
  const achievements: { title: string; description: string | null; link: string }[] = [];
  if (role === "student") {
    let raw: AchievementInput[] = [];
    try {
      raw = JSON.parse(String(formData.get("achievements") ?? "[]"));
    } catch {
      return { error: "Couldn't read your achievements, please try again" };
    }
    for (const a of Array.isArray(raw) ? raw.slice(0, 5) : []) {
      // skip entries left completely empty
      if (!a?.title?.trim() && !a?.description?.trim() && !a?.link?.trim()) continue;
      const { value, error: invalid } = checkAchievement({
        title: String(a.title ?? ""),
        description: String(a.description ?? ""),
        link: String(a.link ?? ""),
      });
      if (!value) return { error: `Achievement "${a.title || "untitled"}": ${invalid}` };
      achievements.push(value);
    }
  }

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

  if (achievements.length) {
    const { error: aErr } = await supabase
      .from("achievements")
      .insert(achievements.map((a) => ({ ...a, student_id: user.id })));
    // The account is set up by now, so don't hold the student here over this;
    // they can add them again from their profile
    if (aErr) console.error("onboarding achievements", aErr.message);
  }

  redirect(role === "company" ? "/company" : "/dashboard");
}
