import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Num, SectionLabel } from "@/components/brand/primitives";
import ImportantPanel from "@/components/important-panel";
import ImportantPopup from "@/components/important-popup";
import { NOTIFICATION_FIELDS, type Notification } from "@/lib/notifications";
import {
  Briefcase,
  Users,
  CheckCircle2,
  IndianRupee,
  PlusCircle,
  ArrowRight,
  Star,
  TrendingUp,
} from "lucide-react";

export default async function CompanyDashboard() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  // Send any due reminders first so they show up below
  await supabase.rpc("send_due_notifications");

  const [{ data: profile }, { data: company }, { data: importantData }] = await Promise.all([
    supabase.from("profiles").select("role, full_name").eq("id", user.id).single(),
    supabase.from("companies").select("id, name").eq("owner_id", user.id).single(),
    supabase
      .from("notifications")
      .select(NOTIFICATION_FIELDS)
      .eq("user_id", user.id)
      .eq("important", true)
      .is("read_at", null)
      .order("created_at", { ascending: false })
      .limit(8),
  ]);
  const important = (importantData ?? []) as Notification[];
  if (!profile?.role) redirect("/onboarding");
  if (profile.role !== "company") redirect("/dashboard");
  if (!company) redirect("/onboarding");

  // Fetch stats
  const { data: gigs } = await supabase
    .from("gigs")
    .select(
      "id, status, reward_type, reward_amount, created_at, title, submissions(count)"
    )
    .eq("company_id", company.id)
    .order("created_at", { ascending: false });

  const allGigs = gigs ?? [];
  const activeGigs = allGigs.filter(
    (g) => g.status === "published" || g.status === "draft"
  );
  const completedGigs = allGigs.filter((g) => g.status === "closed");
  const totalApplications = allGigs.reduce((sum, g) => {
    const count =
      (g.submissions as unknown as { count: number }[])?.[0]?.count ?? 0;
    return sum + count;
  }, 0);
  const totalSpent = allGigs
    .filter((g) => g.status === "closed" && g.reward_type === "paid")
    .reduce((sum, g) => sum + (g.reward_amount ?? 0), 0);

  const hasGigs = allGigs.length > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="space-y-4">
        <SectionLabel index="01">Company dashboard</SectionLabel>
        <div>
          <h1 className="brand-display text-3xl sm:text-4xl">
            Hey, {profile.full_name?.split(" ")[0] ?? "there"}
          </h1>
          <p className="brand-eyebrow text-muted-foreground mt-2">
            {company.name}
          </p>
        </div>
      </div>

      <ImportantPanel notes={important} path="/company" inboxHref="/company/notifications" />
      <ImportantPopup notes={important} inboxHref="/company/notifications" />

      {hasGigs ? (
        <>
          {/* Stats grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: "Active Gigs",
                value: activeGigs.length,
                icon: Briefcase,
              },
              {
                label: "Applications",
                value: totalApplications,
                icon: Users,
              },
              {
                label: "Completed",
                value: completedGigs.length,
                icon: CheckCircle2,
              },
              {
                label: "Total Spent",
                value: `₹${totalSpent.toLocaleString("en-IN")}`,
                icon: IndianRupee,
              },
            ].map((stat) => (
              <div
                key={stat.label}
                className="brand-panel rounded-2xl p-5 space-y-3 transition-all duration-500 hover:border-green/20 hover:shadow-[0_0_40px_rgba(123,196,127,0.07)]"
              >
                <div className="h-9 w-9 rounded-lg bg-green/10 flex items-center justify-center">
                  <stat.icon className="h-4 w-4 text-green" />
                </div>
                <div className="space-y-1">
                  <Num className="block text-3xl font-semibold">
                    {stat.value}
                  </Num>
                  <p className="brand-eyebrow text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Recent gigs */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent Gigs</h2>
              <Link
                href="/company/gigs"
                className="text-sm text-green hover:underline flex items-center gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            </div>

            <div className="space-y-3">
              {allGigs.slice(0, 5).map((g) => {
                const count =
                  (g.submissions as unknown as { count: number }[])?.[0]
                    ?.count ?? 0;
                return (
                  <Link
                    key={g.id}
                    href={`/company/gigs/${g.id}/submissions`}
                    className="flex items-center justify-between gap-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 hover:border-green/15 hover:from-green/[0.04] hover:shadow-[0_0_30px_rgba(123,196,127,0.06)] transition-all"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{g.title}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
                        {g.reward_type === "paid" && g.reward_amount && (
                          <span>
                            ₹{g.reward_amount.toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
                      <Users className="h-3.5 w-3.5" />
                      {count}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Quick action */}
          <Button asChild className="bg-green text-green-foreground hover:bg-green/90">
            <Link href="/company/gigs/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Post a new gig
            </Link>
          </Button>
        </>
      ) : (
        /* ── Empty state ──────────────────────────────────── */
        <div className="flex flex-col items-center justify-center text-center py-16 px-4 space-y-6">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center">
            <Briefcase className="h-8 w-8 text-green" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-xl font-semibold">Post your first gig</h2>
            <p className="text-muted-foreground">
              Describe a real task, set a budget, and publish. Students will
              apply with their Proof Score visible — pick the best fit and get
              it done.
            </p>
          </div>

          <Button
            asChild
            size="lg"
            className="bg-green text-green-foreground hover:bg-green/90 font-medium"
          >
            <Link href="/company/gigs/new">
              <PlusCircle className="h-4 w-4 mr-2" /> Post a gig
            </Link>
          </Button>

          {/* Quick info cards */}
          <div className="grid sm:grid-cols-3 gap-4 w-full max-w-lg mt-4">
            {[
              {
                icon: Star,
                title: "Pre-vetted talent",
                desc: "Students come with Proof Scores",
              },
              {
                icon: TrendingUp,
                title: "Fast turnaround",
                desc: "Micro-gigs done in days",
              },
              {
                icon: IndianRupee,
                title: "No fees",
                desc: "Pay only the gig budget",
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-4 space-y-2 text-left"
              >
                <card.icon className="h-4 w-4 text-green" />
                <p className="text-sm font-medium">{card.title}</p>
                <p className="text-xs text-muted-foreground">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
