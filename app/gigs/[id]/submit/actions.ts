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

  const { error } = await supabase.from("submissions").insert({
    gig_id: input.gigId,
    student_id: user.id,
    note: input.note || null,
    links: input.links.slice(0, 5),
    file_paths: input.filePaths.slice(0, 5),
  });

  if (error) {
    if (error.code === "23505") return { error: "You've already submitted to this gig" };
    if (error.code === "42501") return { error: "This gig isn't accepting submissions" };
    return { error: error.message };
  }
  redirect("/submissions?sent=1");
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
