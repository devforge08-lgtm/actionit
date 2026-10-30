import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { formatReward } from "@/lib/format";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  IndianRupee,
  Search,
  ArrowRight,
  Trophy,
  Zap,
  Target,
} from "lucide-react";
import DeadlineReminder from "./deadline-reminder";
import { Num, ProofRing, SectionLabel } from "@/components/brand/primitives";
import { nextTierProgress, tierInfo } from "@/lib/proof-score";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  // Fetch everything at once instead of one query after another
  const [{ data: profile }, { data: submissions }, { data: points }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("role, full_name, username, proof_score, proof_tier, proof_gigs, proof_wins, proof_rating")
        .eq("id", user.id)
        .single(),
      supabase
        .from("submissions")
        .select(
          "id, status, created_at, gigs(id, title, deadline, reward_type, reward_amount, status, companies(name))"
        )
        .eq("student_id", user.id)
        .order("created_at", { ascending: false }),
      supabase
        .from("proof_points")
        .select("id, gig_title, company_name, rating, won, points, created_at")
        .eq("student_id", user.id)
        .order("created_at", { ascending: false })
        .limit(6),
    ]);
  if (!profile?.role) redirect("/onboarding");
  if (profile.role === "company") redirect("/company");

  const tier = tierInfo(profile.proof_tier);
  const progress = nextTierProgress(profile.proof_tier, {
    score: profile.proof_score,
    gigs: profile.proof_gigs,
    wins: profile.proof_wins,
    rating: profile.proof_rating,
  });

  const subs = submissions ?? [];
  const totalSubmissions = subs.length;
  // Ongoing: accepted by the business and the winner isn't picked yet
  const activeSubs = subs.filter(
    (s) => s.status === "accepted" || s.status === "submitted" || s.status === "shortlisted"
  );
  const selectedSubs = subs.filter((s) => s.status === "selected");
  const totalEarned = selectedSubs.reduce((sum, s) => {
    const gig = s.gigs as any;
    return sum + (gig?.reward_type === "paid" ? (gig?.reward_amount ?? 0) : 0);
  }, 0);

  const now = Date.now();
  const upcomingDeadlines = activeSubs
    .filter((s) => {
      const gig = s.gigs as any;
      return gig?.deadline && new Date(gig.deadline).getTime() > now;
    })
    .map((s) => {
      const gig = s.gigs as any;
      const deadline = new Date(gig.deadline);
      const daysLeft = Math.ceil((deadline.getTime() - now) / 86400000);
      return {
        gigId: gig.id,
        title: gig.title,
        company: gig.companies?.name ?? "Unknown",
        deadline: gig.deadline,
        daysLeft,
        status: s.status,
      };
    })
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const urgentDeadlines = upcomingDeadlines.filter((d) => d.daysLeft <= 1);

  const stats = [
    {
      label: "Active Gigs",
      value: activeSubs.length,
      icon: Briefcase,
    },
    {
      label: "Completed",
      value: selectedSubs.length,
      icon: CheckCircle2,
    },
    {
      label: "Total Earned",
      value: `₹${totalEarned.toLocaleString("en-IN")}`,
      icon: IndianRupee,
    },
    {
      label: "Applications",
      value: totalSubmissions,
      icon: Target,
    },
  ];

  return (
    <>
      {urgentDeadlines.length > 0 && (
        <DeadlineReminder deadlines={urgentDeadlines} />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <SectionLabel index="01">Dashboard</SectionLabel>
          <div>
            <h1 className="brand-display text-3xl sm:text-4xl">
              Hey {profile.full_name?.split(" ")[0]}
            </h1>
            <p className="brand-eyebrow text-muted-foreground mt-2">
              @{profile.username} · Student
            </p>
          </div>
        </div>

        {/* Proof Score */}
        <div className="brand-panel relative overflow-hidden rounded-2xl p-5 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,196,127,0.06),transparent_70%)]" />
          <div className="relative grid gap-6 lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1fr)] lg:items-center lg:gap-10">
            <div className="flex items-center gap-5">
              <ProofRing value={profile.proof_score} size={112} />
              <div className="space-y-1">
                <p className="brand-eyebrow text-muted-foreground">Tier</p>
                <p className={`brand-display text-2xl ${tier.color}`}>{tier.name}</p>
                <p className="text-xs text-muted-foreground brand-num">
                  {profile.proof_gigs} rated gig{profile.proof_gigs === 1 ? "" : "s"} · {profile.proof_wins} win
                  {profile.proof_wins === 1 ? "" : "s"}
                  {profile.proof_rating != null && ` · avg ${profile.proof_rating}/10`}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {progress ? (
                <>
                  <div className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted-foreground whitespace-nowrap">Progress to {progress.next.name}</span>
                    <Num className="text-green font-medium">{progress.percent}%</Num>
                  </div>
                  <div className="h-2 rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-green/70 to-green"
                      style={{ width: `${progress.percent}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Needs {progress.missing.join(", ")}.
                  </p>
                </>
              ) : (
                <p className="text-sm text-amber-400">You&apos;re at the top tier. Keep the ratings high.</p>
              )}
              <p className="text-xs text-muted-foreground">
                Every rated gig earns points (rating × 5, +25 if you win), more for bigger gigs.
              </p>
            </div>

            <div className="space-y-2">
              <p className="brand-eyebrow text-muted-foreground">Recent points</p>
              {points?.length ? (
                <ul className="space-y-1.5">
                  {points.map((pt) => (
                    <li key={pt.id} className="flex items-center justify-between gap-3 text-sm">
                      <span className="min-w-0 truncate">
                        {pt.gig_title}
                        <span className="text-muted-foreground">
                          {" "}· {pt.rating}/10{pt.won && " · won"}
                        </span>
                      </span>
                      <Num className="text-green shrink-0">+{pt.points}</Num>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Points show up here once a business rates your work and picks a winner.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="brand-panel group relative overflow-hidden rounded-2xl p-4 transition-all duration-500 hover:border-green/20 hover:shadow-[0_0_40px_rgba(123,196,127,0.07)]"
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,196,127,0.06),transparent_70%)]" />
              <div className="relative space-y-2">
                <div className="inline-flex rounded-xl bg-green/10 p-2">
                  <stat.icon className="h-4 w-4 text-green" />
                </div>
                <Num className="block text-3xl font-semibold">{stat.value}</Num>
                <p className="brand-eyebrow text-muted-foreground">
                  {stat.label}
                </p>
              </div>
            </div>
          ))}
        </div>

        {totalSubmissions === 0 ? (
          <div className="flex flex-col items-center text-center py-16 space-y-6">
            <div className="p-4 rounded-2xl bg-gradient-to-br from-green/15 to-emerald-900/10 shadow-[0_0_40px_rgba(123,196,127,0.08)]">
              <Search className="h-8 w-8 text-green" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Find your first gig</h2>
              <p className="text-muted-foreground max-w-md text-sm">
                Browse real tasks from businesses. Submit your work, build
                your Proof Score, and start earning.
              </p>
            </div>
            <Link
              href="/gigs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-green to-emerald-500 text-green-foreground font-medium text-sm hover:shadow-[0_0_20px_rgba(123,196,127,0.3)] transition-all"
            >
              Browse Gigs
              <ArrowRight className="h-4 w-4" />
            </Link>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-xl mt-4">
              {[
                {
                  icon: Trophy,
                  title: "Build Proof",
                  desc: "Every completed gig adds to your Proof Score",
                },
                {
                  icon: Zap,
                  title: "Earn Money",
                  desc: "Get paid for real work — zero commission",
                },
                {
                  icon: Target,
                  title: "Get Noticed",
                  desc: "Companies can find and hire proven talent",
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 text-center space-y-2"
                >
                  <item.icon className="h-5 w-5 text-green mx-auto" />
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {upcomingDeadlines.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-green" />
                  Upcoming Deadlines
                </h2>
                <div className="space-y-2">
                  {upcomingDeadlines.slice(0, 5).map((d) => (
                    <Link
                      key={d.gigId}
                      href={`/gigs/${d.gigId}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-4 hover:from-green/[0.04] hover:border-green/15 transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">{d.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {d.company}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className={`text-sm font-semibold ${
                            d.daysLeft <= 1
                              ? "text-red-400"
                              : d.daysLeft <= 3
                              ? "text-amber-400"
                              : "text-green"
                          }`}
                        >
                          {d.daysLeft === 0
                            ? "Due today"
                            : d.daysLeft === 1
                            ? "1 day left"
                            : `${d.daysLeft} days left`}
                        </span>
                        <p className="text-xs text-muted-foreground capitalize">
                          {d.status}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Recent applications</h2>
                <Link
                  href="/submissions"
                  className="text-sm text-green hover:underline"
                >
                  View all
                </Link>
              </div>
              <div className="space-y-2">
                {subs.slice(0, 5).map((s) => {
                  const gig = s.gigs as any;
                  const statusColors: Record<string, string> = {
                    accepted: "text-green bg-green/10",
                    submitted: "text-blue-400 bg-blue-400/10",
                    shortlisted: "text-amber-400 bg-amber-400/10",
                    selected: "text-green bg-green/10",
                    rejected: "text-red-400 bg-red-400/10",
                  };
                  return (
                    <Link
                      key={s.id}
                      href={`/gigs/${gig?.id}`}
                      className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-4 hover:from-green/[0.04] hover:border-green/15 transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {gig?.title ?? "Unknown Gig"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gig?.companies?.name ?? "Unknown"} ·{" "}
                          {formatReward(gig?.reward_type, gig?.reward_amount)}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-semibold uppercase rounded-full px-2.5 py-1 ${
                          statusColors[s.status] ?? "text-muted-foreground bg-muted"
                        }`}
                      >
                        {s.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
