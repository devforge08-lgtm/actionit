"use server";

import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";

/** Apply to a gig. The business looks at the profile and decides who to accept. */
export async function applyToGig(gigId: string, pitch: string) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };
  if (pitch.length > 1000) return { error: "Keep your message under 1000 characters" };

  // The database trigger does the real checks; this just gives a friendlier message
  const { data: gig } = await supabase
    .from("gigs")
    .select("max_applicants, accepted_count, status, deadline")
    .eq("id", gigId)
    .single();
  if (!gig || gig.status !== "published" || (gig.deadline && new Date(gig.deadline) <= new Date()))
    return { error: "This gig is no longer taking applications" };
  if (gig.accepted_count >= gig.max_applicants) return { error: "All spots for this gig have been filled" };

  const { error } = await supabase.from("submissions").insert({
    gig_id: gigId,
    student_id: user.id,
    pitch: pitch.trim() || null,
  });

  if (error) {
    if (error.code === "23505") return { error: "You've already applied to this gig" };
    if (error.message.includes("gig_full")) return { error: "All spots for this gig have been filled" };
    if (error.message.includes("not_student")) return { error: "Only student accounts can apply" };
    if (error.message.includes("gig_closed") || error.code === "42501")
      return { error: "This gig isn't taking applications" };
    return { error: error.message };
  }
  redirect("/submissions?tab=applied&applied=1");
}

/** Send the work for a gig the student was accepted on, through submit_work(). */
export async function submitWork(input: {
  submissionId: string; gigId: string; note: string; links: string[]; filePaths: string[];
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };

  // only accept file paths inside this student's folder for this gig
  const prefix = `${user.id}/${input.gigId}/`;
  if (input.filePaths.some((p) => !p.startsWith(prefix))) return { error: "Invalid file path" };
  if (input.links.some((l) => !/^https?:\/\//i.test(l))) return { error: "Invalid link" };

  const { error } = await supabase.rpc("submit_work", {
    p_submission: input.submissionId,
    p_note: input.note,
    p_links: input.links.slice(0, 5),
    p_file_paths: input.filePaths.slice(0, 5),
  });
  if (error) {
    if (error.message.includes("not_accepted")) return { error: "You can only send work once the business accepts you, and only once" };
    if (error.message.includes("gig_closed")) return { error: "The deadline for this gig has passed" };
    if (error.message.includes("decision_locked")) return { error: "The business has already picked a winner" };
    if (error.message.includes("empty_submission")) return { error: "Add a note, a link or a file so they can see your work" };
    return { error: error.message };
  }
  redirect("/submissions?sent=1");
}

/** The student's answer to a change request, sent through submit_revision(). */
export async function submitRevision(input: {
  submissionId: string; gigId: string; note: string; links: string[]; filePaths: string[];
}) {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) return { error: "Please log in again" };

  const prefix = `${user.id}/${input.gigId}/`;
  if (input.filePaths.some((p) => !p.startsWith(prefix))) return { error: "Invalid file path" };
  if (input.links.some((l) => !/^https?:\/\//i.test(l))) return { error: "Invalid link" };

  const { error } = await supabase.rpc("submit_revision", {
    p_submission: input.submissionId,
    p_reply: input.note,
    p_links: input.links.slice(0, 5),
    p_file_paths: input.filePaths.slice(0, 5),
  });
  if (error) {
    if (error.message.includes("revision_late")) return { error: "The due date for these changes has passed" };
    if (error.message.includes("no_revision_open")) return { error: "You've already sent your changes" };
    if (error.message.includes("decision_locked")) return { error: "The business has already picked a winner" };
    return { error: error.message };
  }
  redirect("/submissions?revised=1");
}

export async function withdrawSubmission(submissionId: string) {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("submissions").select("file_paths").eq("id", submissionId).single();
  const { error } = await supabase.from("submissions").delete().eq("id", submissionId);
  if (error) return { error: error.message };
  if (sub?.file_paths?.length) await supabase.storage.from("submissions").remove(sub.file_paths);
  redirect("/submissions?tab=applied");
}
