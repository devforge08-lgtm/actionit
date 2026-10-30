import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import GigChat from "@/components/gig-chat";
import { ArrowLeft } from "lucide-react";

const ONGOING = ["accepted", "submitted", "shortlisted"];

export default async function StudentChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect(`/login?next=/submissions/${id}/chat`);

  const [{ data: sub }, { data: messages }] = await Promise.all([
    supabase
      .from("submissions")
      .select("id, student_id, status, accepted_at, gigs(id, title, companies(name))")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("gig_messages")
      .select("id, sender_id, body, created_at")
      .eq("submission_id", id)
      .order("created_at", { ascending: true })
      .limit(500),
  ]);
  if (!sub || sub.student_id !== user.id) notFound();
  // Chat only exists once the business has accepted the student
  if (!sub.accepted_at) redirect("/submissions?tab=applied");

  const gig = sub.gigs as unknown as { id: string; title: string; companies: { name: string } | null };
  const open = ONGOING.includes(sub.status);
  const company = gig.companies?.name ?? "the business";

  return (
    <div className="max-w-2xl space-y-4">
      <Link
        href={`/submissions?tab=${open ? "ongoing" : "completed"}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        My gigs
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Chat with {company}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          <Link href={`/gigs/${gig.id}`} className="hover:text-green transition-colors">
            {gig.title}
          </Link>
        </p>
      </div>
      <GigChat
        submissionId={sub.id}
        userId={user.id}
        otherName={company}
        open={open}
        initialMessages={messages ?? []}
      />
    </div>
  );
}
