"use server";

import { revalidatePath } from "next/cache";
import { createClient, getSessionUser } from "@/lib/supabase/server";

export type ReviewState = { error?: string; ok?: string } | null;

async function ownGig(gigId: string) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { supabase, gig: null };
  const { data: gig } = await supabase
    .from("gigs")
    .select("id, status, deadline, reward_type, companies(owner_id)")
    .eq("id", gigId)
    .single();
  const owner = (gig?.companies as unknown as { owner_id: string } | null)?.owner_id;
  return { supabase, gig: owner === user.id ? gig : null };
}

/** A change request that's been sent but not answered, and isn't overdue yet. */
function revisionPending(s: { revision_requested_at: string | null; revision_due: string | null; revised_at: string | null }) {
  return !!s.revision_requested_at && !s.revised_at && !!s.revision_due && new Date(s.revision_due) > new Date();
}

/**
 * Send a submission back once for changes. The business picks the due date
 * (the end of that day, India time), which can run past the gig deadline.
 */
export async function requestChanges(_prev: ReviewState, formData: FormData): Promise<ReviewState> {
  const id = String(formData.get("id"));
  const gigId = String(formData.get("gig_id"));
  const note = String(formData.get("revision_note") ?? "").trim();
  const dueRaw = String(formData.get("revision_due") ?? "");

  if (note.length < 10) return { error: "Tell the student what to change (at least a sentence)" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueRaw)) return { error: "Pick a due date for the changes" };
  const due = new Date(dueRaw + "T23:59:59+05:30");
  if (due <= new Date()) return { error: "The due date has to be today or later" };

  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { error } = await supabase
    .from("submissions")
    .update({
      revision_note: note,
      revision_due: due.toISOString(),
      revision_requested_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("gig_id", gigId);
  if (error?.message.includes("revision_used")) return { error: "You've already asked this student for changes once" };
  if (error?.message.includes("decision_locked")) return { error: "A winner has already been picked" };
  if (error) return { error: error.message };

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Change request sent" };
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
  if (error?.message.includes("decision_locked")) {
    return { error: "Ratings are locked once a winner is picked" };
  }
  if (error) return { error: error.message };

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Rating saved" };
}

/** Accept an applicant onto the gig. Takes one of the 3 spots. */
export async function acceptApplicant(gigId: string, submissionId: string): Promise<ReviewState> {
  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { error } = await supabase.rpc("accept_applicant", { p_submission: submissionId });
  if (error) {
    if (error.message.includes("gig_full")) return { error: "All spots are taken. Someone has to drop out before you can accept more" };
    if (error.message.includes("gig_closed")) return { error: "The deadline has passed" };
    if (error.message.includes("already_accepted")) return { error: "This student is already on the gig" };
    if (error.message.includes("decision_locked")) return { error: "A winner has already been picked" };
    if (error.message.includes("student_busy"))
      return { error: "This student is already on 2 other gigs, which is the most a student can take on at once" };
    return { error: error.message };
  }

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Accepted" };
}

/** Turn down an applicant who's still waiting. They can be accepted later if a spot opens. */
export async function declineApplicant(gigId: string, submissionId: string): Promise<ReviewState> {
  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { error } = await supabase
    .from("submissions")
    .update({ status: "declined" })
    .eq("id", submissionId)
    .eq("gig_id", gigId)
    .eq("status", "applied");
  if (error) return { error: error.message };

  revalidatePath(`/company/gigs/${gigId}/submissions`);
  return { ok: "Declined" };
}

/**
 * Pick the winning work. Everyone accepted has to have sent their work (or
 * the deadline has passed), and every piece of work needs a rating first,
 * so everyone gets something back for it. The gig closes, the other
 * accepted students are marked as not selected, and anyone still waiting
 * on their application is marked as not accepted.
 */
export async function chooseWinner(gigId: string, submissionId: string): Promise<ReviewState> {
  const { supabase, gig } = await ownGig(gigId);
  if (!gig) return { error: "You can only review your own gigs" };

  const { data: subs } = await supabase
    .from("submissions")
    .select("id, status, rating, accepted_at, submitted_at, revision_requested_at, revision_due, revised_at")
    .eq("gig_id", gigId);
  if (!subs?.some((s) => s.id === submissionId && s.submitted_at)) return { error: "Only work that was sent can win" };
  if (subs.some((s) => s.status === "selected")) return { error: "You've already picked a winner for this gig" };

  const pastDeadline = !!gig.deadline && new Date(gig.deadline) <= new Date();
  if (!pastDeadline && subs.some((s) => s.status === "accepted"))
    return { error: "Wait until everyone you accepted sends their work, or the deadline passes" };

  const sent = subs.filter((s) => s.submitted_at);
  if (sent.some(revisionPending)) return { error: "Wait for the changes you asked for, or until their due date passes" };
  if (sent.some((s) => !s.rating)) return { error: "Rate every piece of work out of 10 before picking a winner" };

  const waiting = subs.filter((s) => s.status === "applied").map((s) => s.id);
  if (waiting.length) {
    const { error } = await supabase.from("submissions").update({ status: "declined" }).in("id", waiting);
    if (error) return { error: error.message };
  }
  const others = subs
    .filter((s) => s.id !== submissionId && s.accepted_at && s.status !== "rejected")
    .map((s) => s.id);
  if (others.length) {
    const { error } = await supabase.from("submissions").update({ status: "rejected" }).in("id", others);
    if (error) return { error: error.message };
  }
  // Selecting the winner also awards Proof Score points to every rated
  // applicant (trg_award_points_on_winner in proof_score.sql).
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
