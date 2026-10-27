import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitForm from "../../../gigs/[id]/submit/submit-form";
import { ArrowLeft } from "lucide-react";

export default async function RevisePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/submissions/${id}/revise`);

  const { data: sub } = await supabase
    .from("submissions")
    .select("id, gig_id, student_id, revision_note, revision_due, revision_requested_at, revised_at, gigs(title)")
    .eq("id", id)
    .maybeSingle();
  if (!sub || sub.student_id !== user.id) notFound();

  const open =
    !!sub.revision_requested_at &&
    !sub.revised_at &&
    !!sub.revision_due &&
    new Date(sub.revision_due) > new Date();
  if (!open) redirect("/submissions");

  const gig = sub.gigs as unknown as { title: string };

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/submissions"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        My submissions
      </Link>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Send your changes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {gig.title} · due{" "}
            {new Date(sub.revision_due!).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              timeZone: "Asia/Kolkata",
            })}
          </p>
        </div>

        <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm space-y-1">
          <div className="font-medium text-amber-400">What the business asked for</div>
          <p className="whitespace-pre-wrap text-muted-foreground">{sub.revision_note}</p>
          <p className="text-xs text-muted-foreground pt-1">
            This is the only round of changes, and your original work stays visible to them.
          </p>
        </div>

        <SubmitForm gigId={sub.gig_id} userId={user.id} revisionOf={sub.id} />
      </div>
    </div>
  );
}
