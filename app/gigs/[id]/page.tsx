import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatReward, formatDeadline } from "@/lib/format";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: gig } = await supabase
    .from("gigs").select("title, description, companies(name)").eq("id", id).single();
  if (!gig) return {};
  const company = gig.companies as unknown as { name: string } | null;
  return {
    title: `${gig.title} at ${company?.name} | ActionIT`,
    description: gig.description.slice(0, 155),
  };
}

export default async function GigPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: gig } = await supabase
    .from("gigs")
    .select("*, companies(name, verified, website, owner_id)")
    .eq("id", id)
    .single();
  if (!gig) notFound();

  const company = gig.companies as unknown as {
    name: string; verified: boolean; website: string | null; owner_id: string;
  };
  const { data: { user } } = await supabase.auth.getUser();

  let role: string | null = null;
  let alreadySubmitted = false;
  if (user) {
    const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    role = p?.role ?? null;
    if (role === "student") {
      const { data: s } = await supabase
        .from("submissions").select("id").eq("gig_id", id).eq("student_id", user.id).maybeSingle();
      alreadySubmitted = !!s;
    }
  }
  const isOwner = user?.id === company.owner_id;
  const open = gig.status === "published" && (!gig.deadline || new Date(gig.deadline) > new Date());

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-6">
      <Link href="/gigs" className="text-sm text-muted-foreground hover:underline">← All gigs</Link>

      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">{gig.title}</h1>
        <p className="text-muted-foreground">
          {company.name}{company.verified && " ✓"}
          {company.website && (
            <> · <a href={company.website} target="_blank" rel="noopener noreferrer" className="hover:underline">website</a></>
          )}
        </p>
        <div className="flex gap-4 text-sm flex-wrap">
          <span className="font-semibold">{formatReward(gig.reward_type, gig.reward_amount)}</span>
          <span>{gig.is_remote ? "Remote" : gig.location}</span>
          <span>{formatDeadline(gig.deadline)}</span>
          {gig.status !== "published" && <span className="uppercase font-semibold">{gig.status}</span>}
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">The task</h2>
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{gig.description}</p>
      </section>

      {gig.deliverables && (
        <section className="space-y-2">
          <h2 className="font-semibold">What to submit</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{gig.deliverables}</p>
        </section>
      )}

      <div className="pt-2">
        {isOwner ? (
          <Button asChild><Link href={`/company/gigs/${gig.id}/submissions`}>View submissions</Link></Button>
        ) : alreadySubmitted ? (
          <Button asChild variant="outline"><Link href="/submissions">You've submitted. View status</Link></Button>
        ) : !open ? (
          <Button disabled>This gig is closed</Button>
        ) : !user ? (
          <Button asChild><Link href={`/login?next=/gigs/${gig.id}`}>Log in to submit</Link></Button>
        ) : role === "student" ? (
          <Button asChild><Link href={`/gigs/${gig.id}/submit`}>Submit your work</Link></Button>
        ) : null}
      </div>
    </main>
  );
}
