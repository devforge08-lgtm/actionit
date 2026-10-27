"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createSubmission(input: {
  gigId: string; note: string; links: string[]; filePaths: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Please log in again" };

  // only accept file paths inside this student's folder for this gig
  const prefix = `${user.id}/${input.gigId}/`;
  if (input.filePaths.some((p) => !p.startsWith(prefix))) return { error: "Invalid file path" };
  if (input.links.some((l) => !/^https?:\/\//i.test(l))) return { error: "Invalid link" };

  // Quick check for a friendlier message; the database trigger is what
  // actually holds the 3-applicant cap
  const { data: gig } = await supabase
    .from("gigs")
    .select("max_applicants, applicant_count, status, deadline")
    .eq("id", input.gigId)
    .single();
  if (!gig || gig.status !== "published" || (gig.deadline && new Date(gig.deadline) <= new Date()))
    return { error: "This gig is no longer accepting submissions" };
  if (gig.applicant_count >= gig.max_applicants) return { error: "All spots for this gig have been filled" };

  const { error } = await supabase.from("submissions").insert({
    gig_id: input.gigId,
    student_id: user.id,
    note: input.note || null,
    links: input.links.slice(0, 5),
    file_paths: input.filePaths.slice(0, 5),
  });

  if (error) {
    if (error.code === "23505") return { error: "You've already submitted to this gig" };
    if (error.message.includes("gig_full")) return { error: "All spots for this gig have been filled" };
    if (error.message.includes("gig_closed") || error.code === "42501")
      return { error: "This gig isn't accepting submissions" };
    return { error: error.message };
  }
  redirect("/submissions?sent=1");
}

/** The student's answer to a change request, sent through submit_revision(). */
export async function submitRevision(input: {
  submissionId: string; gigId: string; note: string; links: string[]; filePaths: string[];
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
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
  redirect("/submissions");
}
