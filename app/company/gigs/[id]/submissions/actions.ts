"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ReviewState = { error?: string; ok?: string } | null;

async function ownGig(gigId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, gig: null };
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, status, deadline, max_applicants, applicant_count, reward_type, companies(owner_id)")
    .eq("id", gigId)
    .single();
  const owner = (gig?.companies as unknown as { owner_id: string } | null)?.owner_id;
  return { supabase, gig: owner === user.id ? gig : null };
}

/** Save the 1-10 rating and feedback for one submission. */
export async function rateSubmission(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const id = String(formData.get("id"));
  const gigId = String(formData.get("gig_id"));
  const rating = Number(formData.get("rating"));
  const feedback = String(formData.get("feedback") ?? "").trim() || null;

  if (!Number.isInteger(rating) || rating < 1 || rating > 10) return { error: "Pick a rating from 1 to 10" };

  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { error } = await supabase
    .from("submissions")
    .update({ rating, feedback })
    .eq("id", id)
    .eq("gig_id", gigId);
  if (error) return { error: error.message };

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Rating saved" };
}

/**
 * Pick the winning submission. Every applicant needs a rating first, so
 * everyone gets something back for their work. The gig is closed and the
 * other submissions are marked as not selected.
 */
export async function chooseWinner(gigId: string, submissionId: string): Promise<ReviewState> {
  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const stillOpen =
    gig.status === "published" &&
    (!gig.deadline || new Date(gig.deadline) > new Date()) &&
    gig.applicant_count < gig.max_applicants;
  if (stillOpen) return { error: "Close the gig or wait for the deadline before picking a winner" };

  const { data: subs } = await supabase
    .from("submissions")
    .select("id, status, rating")
    .eq("gig_id", gigId);
  if (!subs?.some((s) => s.id === submissionId)) return { error: "Submission not found" };
  if (subs.some((s) => s.status === "selected")) return { error: "You've already picked a winner for this gig" };
  if (subs.some((s) => !s.rating)) return { error: "Rate every applicant out of 10 before picking a winner" };

  const others = subs.filter((s) => s.id !== submissionId).map((s) => s.id);
  if (others.length) {
    const { error } = await supabase.from("submissions").update({ status: "rejected" }).in("id", others);
    if (error) return { error: error.message };
  }
  const { error } = await supabase.from("submissions").update({ status: "selected" }).eq("id", submissionId);
  if (error) return { error: error.message };

  if (gig.status !== "closed") await supabase.from("gigs").update({ status: "closed" }).eq("id", gigId);

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Winner picked" };
}

/** No payment provider yet: the business marks the reward as sent. */
export async function markPaid(gigId: string, submissionId: string): Promise<ReviewState> {
  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { error } = await supabase
    .from("submissions")
    .update({ paid_at: new Date().toISOString() })
    .eq("id", submissionId)
    .eq("gig_id", gigId)
    .eq("status", "selected");
  if (error) return { error: error.message };

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Marked as paid" };
}
