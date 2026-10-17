import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SubmitForm from "./submit-form";
import { ArrowLeft } from "lucide-react";

export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/gigs/${id}/submit`);

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "student") redirect(`/gigs/${id}`);

  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, deliverables, status, deadline")
    .eq("id", id)
    .single();
  if (!gig) notFound();

  const open =
    gig.status === "published" &&
    (!gig.deadline || new Date(gig.deadline) > new Date());
  if (!open) redirect(`/gigs/${id}`);

  const { data: existing } = await supabase
    .from("submissions")
    .select("id")
    .eq("gig_id", id)
    .eq("student_id", user.id)
    .maybeSingle();
  if (existing) redirect("/submissions");

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href={`/gigs/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to gig
      </Link>

      <div className="rounded-2xl border border-green/10 bg-card/40 p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Submit your work</h1>
          <p className="text-sm text-muted-foreground mt-1">{gig.title}</p>
        </div>

        {gig.deliverables && (
          <div className="rounded-xl border border-green/10 bg-green/5 p-4 text-sm space-y-1">
            <div className="font-medium text-green">What they asked for</div>
            <p className="whitespace-pre-wrap text-muted-foreground">
              {gig.deliverables}
            </p>
          </div>
        )}

        <SubmitForm gigId={gig.id} userId={user.id} />
      </div>
    </div>
  );
}
