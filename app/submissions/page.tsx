import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withdrawSubmission } from "../gigs/[id]/submit/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-muted text-foreground",
  shortlisted: "bg-blue-100 text-blue-800",
  selected: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};

export default async function MySubmissions({
  searchParams,
}: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subs } = await supabase
    .from("submissions")
    .select("id, status, feedback, created_at, gigs(id, title, companies(name))")
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My submissions</h1>
        <Button asChild variant="outline"><Link href="/gigs">Browse gigs</Link></Button>
      </div>

      {sent && (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-800">
          Submitted! The company will review it and you'll see the status here.
        </div>
      )}

      {!subs?.length && <p className="text-muted-foreground">You haven't submitted to any gigs yet.</p>}

      <div className="space-y-3">
        {subs?.map((s) => {
          const gig = s.gigs as unknown as { id: string; title: string; companies: { name: string } | null };
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/gigs/${gig.id}`} className="font-medium hover:underline">{gig.title}</Link>
                    <p className="text-sm text-muted-foreground">{gig.companies?.name}</p>
                  </div>
                  <span className={`text-xs font-semibold uppercase rounded px-2 py-1 ${STATUS_STYLE[s.status]}`}>
                    {s.status}
                  </span>
                </div>
                {s.feedback && (
                  <div className="text-sm rounded bg-muted p-3">
                    <span className="font-medium">Feedback: </span>{s.feedback}
                  </div>
                )}
                {s.status === "submitted" && (
                  <form action={async () => { "use server"; await withdrawSubmission(s.id); }}>
                    <Button size="sm" variant="ghost" className="text-muted-foreground px-0">Withdraw</Button>
                  </form>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
