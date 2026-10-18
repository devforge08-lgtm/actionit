"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in" };

  const full_name = String(formData.get("full_name") ?? "").trim();
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const bio = String(formData.get("bio") ?? "").trim();
  const college = String(formData.get("college") ?? "").trim();
  const skillsRaw = String(formData.get("skills") ?? "").trim();
  const github = String(formData.get("github") ?? "").trim();
  const linkedin = String(formData.get("linkedin") ?? "").trim();
  const portfolio = String(formData.get("portfolio") ?? "").trim();

  if (!full_name) return { error: "Name is required" };
  if (!/^[a-z0-9_]{3,30}$/.test(username))
    return { error: "Username: 3–30 chars, lowercase letters, numbers, _" };

  const skills = skillsRaw
    ? skillsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 15)
    : [];

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name,
      username,
      bio: bio || null,
      college: college || null,
      skills,
      github: github || null,
      linkedin: linkedin || null,
      portfolio: portfolio || null,
    })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") return { error: "That username is taken" };
    return { error: error.message };
  }

  revalidatePath("/profile");
  return { success: true };
}
