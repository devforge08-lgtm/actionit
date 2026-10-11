import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatReward, formatDeadline } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = {
  title: "Gigs for students | ActionIT",
  description: "Real tasks from real companies. Prove your skills and get hired.",
};

export default async function GigBoard() {
  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select("id, title, description, reward_type, reward_amount, deadline, is_remote, location, companies(name, verified)")
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-semibold">Open gigs</h1>
        <p className="text-muted-foreground">Do real work. Build proof. Get noticed.</p>
      </div>

      {!gigs?.length && <p className="text-muted-foreground">No open gigs right now. Check back soon!</p>}

      <div className="space-y-3">
        {gigs?.map((g) => {
          const company = g.companies as unknown as { name: string; verified: boolean } | null;
          return (
            <Link key={g.id} href={`/gigs/${g.id}`} className="block">
              <Card className="hover:border-primary transition">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="font-medium">{g.title}</h2>
                      <p className="text-sm text-muted-foreground">
                        {company?.name}{company?.verified && " ✓"}
                      </p>
                    </div>
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatReward(g.reward_type, g.reward_amount)}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-2">{g.description}</p>
                  <div className="text-xs text-muted-foreground flex gap-3">
                    <span>{g.is_remote ? "Remote" : g.location}</span>
                    <span>{formatDeadline(g.deadline)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </main>
  );
}
