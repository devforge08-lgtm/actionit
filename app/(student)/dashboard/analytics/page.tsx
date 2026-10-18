import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  IndianRupee,
  CheckCircle2,
  Target,
  TrendingUp,
  Star,
  Clock,
  Briefcase,
  Award,
} from "lucide-react";

export default async function StudentAnalytics() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/onboarding");
  if (profile.role === "company") redirect("/company");

  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, status, created_at, gigs(id, title, deadline, reward_type, reward_amount, companies(name), created_at)"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const subs = submissions ?? [];
  const selectedSubs = subs.filter((s) => s.status === "selected");
  const rejectedSubs = subs.filter((s) => s.status === "rejected");
  const shortlistedSubs = subs.filter((s) => s.status === "shortlisted");

  const totalEarned = selectedSubs.reduce((sum, s) => {
    const gig = s.gigs as any;
    return sum + (gig?.reward_type === "paid" ? (gig?.reward_amount ?? 0) : 0);
  }, 0);

  const avgPerGig =
    selectedSubs.length > 0 ? Math.round(totalEarned / selectedSubs.length) : 0;

  const decidedSubs = selectedSubs.length + rejectedSubs.length;
  const acceptanceRate =
    decidedSubs > 0 ? Math.round((selectedSubs.length / decidedSubs) * 100) : 0;

  const certificatesEarned = selectedSubs.filter(
    (s) => (s.gigs as any)?.reward_type === "certificate"
  ).length;
  const interviewsEarned = selectedSubs.filter(
    (s) => (s.gigs as any)?.reward_type === "interview"
  ).length;

  const months: { label: string; count: number; earnings: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = d.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
    const year = d.getFullYear();
    const month = d.getMonth();
    const monthSubs = subs.filter((s) => {
      const created = new Date(s.created_at);
      return created.getFullYear() === year && created.getMonth() === month;
    });
    const earnings = monthSubs
      .filter(
        (s) =>
          s.status === "selected" &&
          (s.gigs as any)?.reward_type === "paid"
      )
      .reduce((sum, s) => sum + ((s.gigs as any)?.reward_amount ?? 0), 0);
    months.push({ label, count: monthSubs.length, earnings });
  }

  const maxCount = Math.max(...months.map((m) => m.count), 1);
  const maxEarnings = Math.max(...months.map((m) => m.earnings), 1);

  const companyMap = new Map<string, number>();
  selectedSubs.forEach((s) => {
    const name = (s.gigs as any)?.companies?.name;
    if (name) companyMap.set(name, (companyMap.get(name) ?? 0) + 1);
  });
  const topCompanies = [...companyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const hasData = subs.length > 0;

  if (!hasData) {
    return (
      <div className="flex flex-col items-center text-center py-20 space-y-4">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-green/15 to-emerald-900/10 shadow-[0_0_40px_rgba(123,196,127,0.08)]">
          <TrendingUp className="h-8 w-8 text-green" />
        </div>
        <h2 className="text-xl font-semibold">No analytics yet</h2>
        <p className="text-muted-foreground max-w-md text-sm">
          Submit to gigs and your analytics will show up here — earnings,
          acceptance rate, and more.
        </p>
      </div>
    );
  }

  const metricGradients = [
    "from-amber-500/20 to-orange-900/20",
    "from-green/20 to-emerald-900/20",
    "from-blue-500/20 to-indigo-900/20",
    "from-purple-500/20 to-violet-900/20",
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Analytics</h1>

      {/* Key metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          {
            label: "Total Earned",
            value: `₹${totalEarned.toLocaleString("en-IN")}`,
            sub: avgPerGig > 0 ? `₹${avgPerGig.toLocaleString("en-IN")} avg/gig` : "No paid gigs yet",
            icon: IndianRupee,
            color: "text-amber-400",
            bg: "bg-amber-400/15",
            gradient: metricGradients[0],
          },
          {
            label: "Gigs Completed",
            value: selectedSubs.length,
            sub: `${subs.length} total submissions`,
            icon: CheckCircle2,
            color: "text-green",
            bg: "bg-green/15",
            gradient: metricGradients[1],
          },
          {
            label: "Acceptance Rate",
            value: `${acceptanceRate}%`,
            sub: `${selectedSubs.length} selected / ${decidedSubs} decided`,
            icon: Target,
            color: "text-blue-400",
            bg: "bg-blue-400/15",
            gradient: metricGradients[2],
          },
          {
            label: "Shortlisted",
            value: shortlistedSubs.length,
            sub: "Currently under review",
            icon: Star,
            color: "text-purple-400",
            bg: "bg-purple-400/15",
            gradient: metricGradients[3],
          },
        ].map((m) => (
          <div
            key={m.label}
            className={`relative overflow-hidden rounded-2xl border border-white/[0.06] p-4 space-y-2 bg-gradient-to-br ${m.gradient}`}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,196,127,0.04),transparent_70%)]" />
            <div className="relative">
              <div className={`inline-flex p-2 rounded-xl ${m.bg}`}>
                <m.icon className={`h-4 w-4 ${m.color}`} />
              </div>
              <p className="text-2xl font-semibold mt-2">{m.value}</p>
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className="text-xs text-muted-foreground/70 mt-0.5">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-4">
          <h3 className="text-sm font-semibold">Submissions (Last 6 months)</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {months.map((m) => (
              <div
                key={m.label}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs font-medium text-green">
                  {m.count || ""}
                </span>
                <div
                  className="w-full rounded-t-lg bg-green/10 transition-all duration-500 min-h-[4px]"
                  style={{
                    height: `${(m.count / maxCount) * 100}%`,
                  }}
                >
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-green/60 to-green transition-all duration-500"
                    style={{
                      height: "100%",
                      opacity: m.count > 0 ? 1 : 0,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-4">
          <h3 className="text-sm font-semibold">Earnings (Last 6 months)</h3>
          <div className="flex items-end justify-between gap-2 h-40">
            {months.map((m) => (
              <div
                key={m.label}
                className="flex-1 flex flex-col items-center gap-1"
              >
                <span className="text-xs font-medium text-amber-400">
                  {m.earnings > 0 ? `₹${m.earnings.toLocaleString("en-IN")}` : ""}
                </span>
                <div
                  className="w-full rounded-t-lg bg-amber-400/10 transition-all duration-500 min-h-[4px]"
                  style={{
                    height: `${(m.earnings / maxEarnings) * 100}%`,
                  }}
                >
                  <div
                    className="w-full rounded-t-lg bg-gradient-to-t from-amber-500/60 to-amber-400 transition-all duration-500"
                    style={{
                      height: "100%",
                      opacity: m.earnings > 0 ? 1 : 0,
                    }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {m.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-4">
          <h3 className="text-sm font-semibold">Rewards Earned</h3>
          <div className="space-y-3">
            {[
              {
                label: "Paid gigs",
                value: `₹${totalEarned.toLocaleString("en-IN")}`,
                count: selectedSubs.filter(
                  (s) => (s.gigs as any)?.reward_type === "paid"
                ).length,
                color: "bg-amber-400",
              },
              {
                label: "Certificates",
                value: certificatesEarned,
                count: certificatesEarned,
                color: "bg-blue-400",
              },
              {
                label: "Interview offers",
                value: interviewsEarned,
                count: interviewsEarned,
                color: "bg-purple-400",
              },
            ].map((r) => (
              <div key={r.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${r.color}`}
                  />
                  <span className="text-sm text-muted-foreground">
                    {r.label}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {r.value} ({r.count} gig{r.count !== 1 ? "s" : ""})
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-5 space-y-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <Award className="h-4 w-4 text-green" />
            Top Companies
          </h3>
          {topCompanies.length > 0 ? (
            <div className="space-y-3">
              {topCompanies.map(([name, count], i) => (
                <div key={name} className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground w-4">
                    {i + 1}.
                  </span>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm">{name}</span>
                    <span className="text-xs text-muted-foreground">
                      {count} gig{count !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete gigs to see your top companies
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
