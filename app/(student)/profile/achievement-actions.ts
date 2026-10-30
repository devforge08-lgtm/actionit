"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { checkAchievement, type AchievementInput } from "@/lib/achievements";

function friendly(message: string) {
  if (message.includes("achievement_limit")) return "You can add up to 20 achievements";
  return message;
}

export async function addAchievement(input: AchievementInput) {
  const checked = checkAchievement(input);
  if (!checked.value) return { error: checked.error };

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };

  const { error } = await supabase
    .from("achievements")
    .insert({ ...checked.value, student_id: user.id });
  if (error) return { error: friendly(error.message) };

  revalidatePath("/profile");
  return { ok: true };
}

export async function updateAchievement(id: string, input: AchievementInput) {
  const checked = checkAchievement(input);
  if (!checked.value) return { error: checked.error };

  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };

  const { error } = await supabase
    .from("achievements")
    .update(checked.value)
    .eq("id", id)
    .eq("student_id", user.id);
  if (error) return { error: friendly(error.message) };

  revalidatePath("/profile");
  return { ok: true };
}

export async function deleteAchievement(id: string) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };

  const { error } = await supabase
    .from("achievements")
    .delete()
    .eq("id", id)
    .eq("student_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}
