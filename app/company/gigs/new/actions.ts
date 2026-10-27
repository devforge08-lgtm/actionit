"use server";

import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

export async function createGig(formData: FormData) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies").select("id").eq("owner_id", user.id).single();
  if (!company) return { error: "Only company accounts can post gigs" };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const deliverables = String(formData.get("deliverables") ?? "").trim() || null;
  const reward_type = String(formData.get("reward_type") ?? "paid");
  const amountRaw = String(formData.get("reward_amount") ?? "").trim();
  const reward_amount = reward_type === "paid" && amountRaw ? Number(amountRaw) : null;
  const deadlineRaw = String(formData.get("deadline") ?? "");
  const deadline = deadlineRaw ? new Date(deadlineRaw + "T23:59:59+05:30").toISOString() : null;
  const is_remote = formData.get("is_remote") === "on";
  const location = String(formData.get("location") ?? "").trim() || null;
  const publish = formData.get("intent") === "publish";

  if (title.length < 5) return { error: "Title should be at least 5 characters" };
  if (description.length < 20) return { error: "Description should be at least 20 characters" };
  if (reward_amount !== null && (isNaN(reward_amount) || reward_amount < 0))
    return { error: "Enter a valid reward amount" };

  const slug = `${slugify(title)}-${Math.random().toString(36).slice(2, 6)}`;

  const { error } = await supabase.from("gigs").insert({
    company_id: company.id,
    title, slug, description, deliverables,
    reward_type, reward_amount, deadline, is_remote, location,
    status: publish ? "published" : "draft",
  });
  if (error) return { error: error.message };

  redirect("/company/gigs");
}

export async function setGigStatus(gigId: string, status: "draft" | "published" | "closed") {
  const supabase = await createClient();
  const { error } = await supabase.from("gigs").update({ status }).eq("id", gigId);
  if (error) return { error: error.message };
  redirect("/company/gigs");
}
