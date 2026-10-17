import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  Briefcase,
  Users,
  CheckCircle2,
  IndianRupee,
  TrendingUp,
  Star,
  Clock,
  Target,
} from "lucide-react";

export default async function AnalyticsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: company } = await supabase
    .from("companies")
    .select("id, name")
    .eq("owner_id", user.id)
    .single();
  if (!company) redirect("/onboarding");

  // Fetch all gigs with submissions
  const { data: gigs } = await supabase
    .from("gigs")
    .select(
      "id, title, status, reward_type, reward_amount, created_at, deadline, submissions(id, status, created_at)"
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const allGigs = gigs ?? [];
  const publishedGigs = allGigs.filter((g) => g.status === "published");
  const closedGigs = allGigs.filter((g) => g.status === "closed");
  const draftGigs = allGigs.filter((g) => g.status === "draft");

  // Flatten submissions
  const allSubs = allGigs.flatMap(
    (g) => (g.submissions as unknown as { id: string; status: string; created_at: string }[]) ?? []
  );
  const selectedSubs = allSubs.filter((s) => s.status === "selected");
  const rejectedSubs = allSubs.filter((s) => s.status === "rejected");

  const totalSpent = closedGigs
    .filter((g) => g.reward_type === "paid")
    .reduce((sum, g) => sum + (g.reward_amount ?? 0), 0);

  const avgBudget =
    allGigs.filter((g) => g.reward_type === "paid" && g.reward_amount).length > 0
      ? Math.round(
          allGigs
            .filter((g) => g.reward_type === "paid" && g.reward_amount)
            .reduce((sum, g) => sum + (g.reward_amount ?? 0), 0) /
            allGigs.filter((g) => g.reward_type === "paid" && g.reward_amount).length
        )
      : 0;

  const completionRate =
    allGigs.length > 0
      ? Math.round((closedGigs.length / allGigs.length) * 100)
      : 0;

  const selectionRate =
    allSubs.length > 0
      ? Math.round((selectedSubs.length / allSubs.length) * 100)
      : 0;

  // Gigs by month (last 6 months)
  const months: { label: string; count: number; spend: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const label = d.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthGigs = allGigs.filter((g) => {
      const created = new Date(g.created_at);
      return created.getFullYear() === year && created.getMonth() === month;
    });
    const spend = monthGigs
      .filter((g) => g.reward_type === "paid")
      .reduce((sum, g) => sum + (g.reward_amount ?? 0), 0);
    months.push({ label, count: monthGigs.length, spend });
  }

  const maxCount = Math.max(...months.map((m) => m.count), 1);

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="text-muted-foreground mt-1">{company.name}</p>
      </div>

      {allGigs.length === 0 ? (
        <div className="text-center py-16">
          <div className="h-14 w-14 rounded-2xl bg-green/10 flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="h-7 w-7 text-green" />
          </div>
          <h2 className="text-lg font-semibold">No data yet</h2>
          <p className="text-muted-foreground mt-1 max-w-sm mx-auto">
            Post your first gig to start seeing analytics here.
          </p>
        </div>
      ) : (
        <>
          {/* Key metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Total Gigs",
                value: allGigs.length,
                sub: `${publishedGigs.length} active · ${draftGigs.length} draft`,
                icon: Briefcase,
                color: "text-green",
                bg: "bg-green/10",
              },
              {
                label: "Total Applications",
                value: allSubs.length,
                sub: `${selectedSubs.length} selected · ${rejectedSubs.length} rejected`,
                icon: Users,
                color: "text-blue-400",
                bg: "bg-blue-400/10",
              },
              {
                label: "Total Spent",
                value: `₹${totalSpent.toLocaleString("en-IN")}`,
                sub: `Avg ₹${avgBudget.toLocaleString("en-IN")} per gig`,
                icon: IndianRupee,
                color: "text-amber-400",
                bg: "bg-amber-400/10",
              },
              {
                label: "Completion Rate",
                value: `${completionRate}%`,
                sub: `${closedGigs.length} of ${allGigs.length} gigs completed`,
                icon: Target,
                color: "text-emerald-400",
                bg: "bg-emerald-400/10",
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-3"
              >
                <div
                  className={`h-9 w-9 rounded-lg ${stat.bg} flex items-center justify-center`}
                >
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    {stat.sub}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Gigs over time - simple bar chart */}
          <div className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green" />
              <h3 className="font-semibold">Gigs posted — last 6 months</h3>
            </div>
            <div className="flex items-end gap-3 h-32">
              {months.map((m) => (
                <div
                  key={m.label}
                  className="flex-1 flex flex-col items-center gap-2"
                >
                  <span className="text-xs font-medium text-muted-foreground">
                    {m.count}
                  </span>
                  <div
                    className="w-full bg-green/20 rounded-md transition-all hover:bg-green/30"
                    style={{
                      height: `${(m.count / maxCount) * 100}%`,
                      minHeight: m.count > 0 ? "8px" : "2px",
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground">
                    {m.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional stats */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-amber-400" />
                <h3 className="font-semibold">Selection Rate</h3>
              </div>
              <p className="text-3xl font-bold">{selectionRate}%</p>
              <p className="text-sm text-muted-foreground">
                {selectedSubs.length} students selected out of {allSubs.length}{" "}
                applications
              </p>
            </div>

            <div className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-400" />
                <h3 className="font-semibold">Avg per Gig</h3>
              </div>
              <p className="text-3xl font-bold">
                {allGigs.length > 0
                  ? (allSubs.length / allGigs.length).toFixed(1)
                  : "0"}
              </p>
              <p className="text-sm text-muted-foreground">
                Applications per gig on average
              </p>
            </div>
          </div>

          {/* Top gigs by applications */}
          {allGigs.length > 0 && (
            <div className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-4">
              <h3 className="font-semibold">Top gigs by applications</h3>
              <div className="space-y-3">
                {[...allGigs]
                  .sort((a, b) => {
                    const aCount =
                      ((a.submissions as unknown as { id: string }[])?.length ?? 0);
                    const bCount =
                      ((b.submissions as unknown as { id: string }[])?.length ?? 0);
                    return bCount - aCount;
                  })
                  .slice(0, 5)
                  .map((g) => {
                    const count =
                      (g.submissions as unknown as { id: string }[])?.length ?? 0;
                    const maxSubs = Math.max(
                      ...[...allGigs].map(
                        (gg) =>
                          ((gg.submissions as unknown as { id: string }[])
                            ?.length ?? 0)
                      ),
                      1
                    );
                    return (
                      <div key={g.id} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate font-medium">
                            {g.title}
                          </span>
                          <span className="text-muted-foreground shrink-0 ml-2">
                            {count} applications
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-green/40"
                            style={{
                              width: `${(count / maxSubs) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
