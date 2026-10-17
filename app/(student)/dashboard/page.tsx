import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatReward } from "@/lib/format";
import {
  Briefcase,
  Clock,
  CheckCircle2,
  IndianRupee,
  Search,
  AlertTriangle,
  ArrowRight,
  Trophy,
  Zap,
  Target,
} from "lucide-react";
import DeadlineReminder from "./deadline-reminder";

export default async function StudentDashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, full_name, username")
    .eq("id", user.id)
    .single();
  if (!profile?.role) redirect("/onboarding");
  if (profile.role === "company") redirect("/company");

  // Fetch all submissions with gig details
  const { data: submissions } = await supabase
    .from("submissions")
    .select(
      "id, status, created_at, gigs(id, title, deadline, reward_type, reward_amount, status, companies(name))"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const subs = submissions ?? [];

  // Stats
  const totalSubmissions = subs.length;
  const activeSubs = subs.filter((s) => s.status === "submitted" || s.status === "shortlisted");
  const selectedSubs = subs.filter((s) => s.status === "selected");
  const totalEarned = selectedSubs.reduce((sum, s) => {
    const gig = s.gigs as any;
    return sum + (gig?.reward_type === "paid" ? (gig?.reward_amount ?? 0) : 0);
  }, 0);

  // Upcoming deadlines (gigs you've submitted to that still have deadlines)
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

  // Urgent deadlines (due within 1 day)
  const urgentDeadlines = upcomingDeadlines.filter((d) => d.daysLeft <= 1);

  const stats = [
    {
      label: "Active Gigs",
      value: activeSubs.length,
      icon: Briefcase,
      color: "text-green",
      bgColor: "bg-green/10",
    },
    {
      label: "Completed",
      value: selectedSubs.length,
      icon: CheckCircle2,
      color: "text-emerald-400",
      bgColor: "bg-emerald-400/10",
    },
    {
      label: "Total Earned",
      value: `₹${totalEarned.toLocaleString("en-IN")}`,
      icon: IndianRupee,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
    },
    {
      label: "Submissions",
      value: totalSubmissions,
      icon: Target,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
    },
  ];

  return (
    <>
      {/* Deadline reminder popup */}
      {urgentDeadlines.length > 0 && (
        <DeadlineReminder deadlines={urgentDeadlines} />
      )}

      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold">
            Hey {profile.full_name?.split(" ")[0]} 👋
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            @{profile.username} · Student
          </p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-2xl border border-green/10 bg-card/40 p-4 space-y-2"
            >
              <div
                className={`inline-flex p-2 rounded-xl ${stat.bgColor}`}
              >
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
              <p className="text-2xl font-semibold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          ))}
        </div>

        {totalSubmissions === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center text-center py-16 space-y-6">
            <div className="p-4 rounded-2xl bg-green/10">
              <Search className="h-8 w-8 text-green" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">
                Find your first gig
              </h2>
              <p className="text-muted-foreground max-w-md text-sm">
                Browse real tasks from businesses. Submit your work, build
                your Proof Score, and start earning.
              </p>
            </div>
            <Link
              href="/gigs"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-green text-green-foreground font-medium text-sm hover:bg-green/90 transition-colors"
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
                  className="rounded-xl border border-green/10 bg-card/40 p-4 text-center space-y-2"
                >
                  <item.icon className="h-5 w-5 text-green mx-auto" />
                  <p className="text-sm font-medium">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Upcoming deadlines */}
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
                      className="flex items-center justify-between rounded-xl border border-green/10 bg-card/40 p-4 hover:border-green/25 hover:bg-green/[0.03] transition-all"
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

            {/* Recent submissions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  Recent Submissions
                </h2>
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
                    submitted: "text-blue-400 bg-blue-400/10",
                    shortlisted: "text-amber-400 bg-amber-400/10",
                    selected: "text-green bg-green/10",
                    rejected: "text-red-400 bg-red-400/10",
                  };
                  return (
                    <Link
                      key={s.id}
                      href={`/gigs/${gig?.id}`}
                      className="flex items-center justify-between rounded-xl border border-green/10 bg-card/40 p-4 hover:border-green/25 hover:bg-green/[0.03] transition-all"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium">
                          {gig?.title ?? "Unknown Gig"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gig?.companies?.name ?? "Unknown"} ·{" "}
                          {formatReward(
                            gig?.reward_type,
                            gig?.reward_amount
                          )}
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
