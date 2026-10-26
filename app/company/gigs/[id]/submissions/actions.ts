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
  const ratingRaw = formData.get("rating");
  const rating = ratingRaw ? Number(ratingRaw) : null;

  if (!ALLOWED.includes(status)) return;

  const updateData: Record<string, unknown> = { status, feedback };
  if (rating !== null && rating >= 1 && rating <= 5) {
    updateData.rating = rating;
  }

  const { error } = await supabase.from("submissions").update(updateData).eq("id", id);
  if (error) throw new Error(error.message);

  // If selecting a winner, update proof scores for all submissions on this gig
  if (status === "selected") {
    // Get all submissions for this gig to update proof scores
    const { data: allSubs } = await supabase
      .from("submissions")
      .select("id, student_id, status, rating")
      .eq("gig_id", gigId);

    if (allSubs) {
      for (const sub of allSubs) {
        let scoreIncrease = 0;
        if (sub.id === id) {
          // Selected winner gets base 100 + rating bonus
          scoreIncrease = 100 + (rating ? rating * 20 : 0);
        } else if (sub.rating) {
          // Others get score based on their rating (10-50 points)
          scoreIncrease = sub.rating * 10;
        } else {
          // Participated but no rating yet — base participation points
          scoreIncrease = 10;
        }

        if (scoreIncrease > 0) {
          await supabase.rpc("increment_proof_score", {
            user_id: sub.student_id,
            amount: scoreIncrease,
          });
        }
      }
    }
  }

  revalidatePath(`/company/gigs/${gigId}/submissions`);
}
