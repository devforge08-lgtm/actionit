import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import GigChat from "@/components/gig-chat";
import { ArrowLeft } from "lucide-react";

const ONGOING = ["accepted", "submitted", "shortlisted"];

export default async function CompanyChatPage({
  params,
}: {
  params: Promise<{ id: string; submissionId: string }>;
}) {
  const { id, submissionId } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const [{ data: sub }, { data: messages }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, gig_id, status, accepted_at, profiles(full_name, username), gigs(title, companies(owner_id))")
      .eq("id", submissionId)
      .eq("gig_id", id)
      .maybeSingle(),
    supabase
      .from("gig_messages")
      .select("id, sender_id, body, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);
  if (!sub) notFound();
  const gig = sub.gigs as unknown as { title: string; companies: { owner_id: string } | null };
  if (gig.companies?.owner_id !== user.id) redirect("/company/gigs");
  // Chat only exists for students the business accepted
  if (!sub.accepted_at) redirect(`/company/gigs/${id}/submissions`);

  const student = sub.profiles as unknown as { full_name: string | null; username: string | null };
  const name = student.full_name || `@${student.username}`;

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Link
        href={`/company/gigs/${id}/submissions`}
        className="text-sm text-muted-foreground hover:text-green transition-colors inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to applicants
      </Link>
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Chat with {name}</h1>
        <p className="text-sm text-muted-foreground mt-1">{gig.title}</p>
      </div>
      <GigChat
        submissionId={sub.id}
        userId={user.id}
        otherName={name}
        open={ONGOING.includes(sub.status)}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
