import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { setGigStatus } from "./new/actions";
import { formatReward, formatDeadline } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { PlusCircle, Users, Briefcase } from "lucide-react";

export default async function MyGigsPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!company) redirect("/dashboard");

  const { data: gigs } = await supabase
    .from("gigs")
    .select(
      "id, title, status, reward_type, reward_amount, deadline, max_applicants, created_at, submissions(count)"
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your gigs</h1>
          <p className="text-sm text-muted-foreground">{company.name}</p>
        </div>
        <Button
          asChild
          className="bg-green text-green-foreground hover:bg-green/90"
        >
          <Link href="/company/gigs/new">
            <PlusCircle className="h-4 w-4 mr-2" /> Post a gig
          </Link>
        </Button>
      </div>

      {!gigs?.length ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
            <Briefcase className="h-7 w-7 text-green" />
          </div>
          <p className="text-muted-foreground">
            No gigs yet. Post your first one!
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gigs.map((g) => {
            const count =
              (g.submissions as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <div
                key={g.id}
                className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 flex items-center justify-between gap-4 hover:border-green/15 hover:from-green/[0.04] hover:shadow-[0_0_30px_rgba(123,196,127,0.06)] transition-all"
              >
                <div className="min-w-0">
                  <Link
                    href={`/company/gigs/${g.id}/submissions`}
                    className="font-medium hover:text-green transition-colors"
                  >
                    {g.title}
                  </Link>
                  <div className="text-xs text-muted-foreground mt-1 flex gap-3 flex-wrap">
                    <span
                      className={`uppercase font-semibold ${
                        g.status === "published"
                          ? "text-green"
                          : g.status === "closed"
                          ? "text-muted-foreground"
                          : "text-amber-400"
                      }`}
                    >
                      {g.status}
                    </span>
                    <span>{formatReward(g.reward_type, g.reward_amount)}</span>
                    <span>{formatDeadline(g.deadline)}</span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0 items-center">
                  <Link
                    href={`/company/gigs/${g.id}/submissions`}
                    className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {count}/{g.max_applicants}
                  </Link>
                  {g.status === "draft" && (
                    <form
                      action={async () => {
                        "use server";
                        await setGigStatus(g.id, "published");
                      }}
                    >
                      <Button
                        size="sm"
                        className="bg-green text-green-foreground hover:bg-green/90"
                      >
                        Publish
                      </Button>
                    </form>
                  )}
                  {g.status === "published" && (
                    <form
                      action={async () => {
                        "use server";
                        await setGigStatus(g.id, "closed");
                      }}
                    >
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-green/15 hover:bg-green/5"
                      >
                        Close
                      </Button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
