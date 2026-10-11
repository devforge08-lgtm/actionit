import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { setGigStatus } from "./new/actions";
import { formatReward, formatDeadline } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function MyGigsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies").select("id, name").eq("owner_id", user.id).single();
  if (!company) redirect("/dashboard");

  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title, status, reward_type, reward_amount, deadline, created_at, submissions(count)")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your gigs</h1>
          <p className="text-sm text-muted-foreground">{company.name}</p>
        </div>
        <Button asChild><Link href="/company/gigs/new">+ Post a gig</Link></Button>
      </div>

      {!gigs?.length && <p className="text-muted-foreground">No gigs yet. Post your first one!</p>}

      <div className="space-y-3">
        {gigs?.map((g) => {
          const count = (g.submissions as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <Card key={g.id}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <Link href={`/gigs/${g.id}`} className="font-medium hover:underline">{g.title}</Link>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span className="uppercase font-semibold">{g.status}</span>
                    <span>{formatReward(g.reward_type, g.reward_amount)}</span>
                    <span>{formatDeadline(g.deadline)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button asChild size="sm" variant="outline">
                    <Link href={`/company/gigs/${g.id}/submissions`}>{count} submission{count === 1 ? "" : "s"}</Link>
                  </Button>
                  {g.status === "draft" && (
                    <form action={async () => { "use server"; await setGigStatus(g.id, "published"); }}>
                      <Button size="sm">Publish</Button>
                    </form>
                  )}
                  {g.status === "published" && (
                    <form action={async () => { "use server"; await setGigStatus(g.id, "closed"); }}>
                      <Button size="sm" variant="outline">Close</Button>
                    </form>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
