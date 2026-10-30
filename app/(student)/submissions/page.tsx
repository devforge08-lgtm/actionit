import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { withdrawSubmission } from "../gigs/[id]/submit/actions";
import { Num, SectionLabel } from "@/components/brand/primitives";
import { formatReward, formatDeadline } from "@/lib/format";
import { FileText, ExternalLink, Clock } from "lucide-react";

const TABS = [
  { id: "ongoing", label: "Ongoing", statuses: ["accepted", "submitted", "shortlisted"] },
  { id: "completed", label: "Completed", statuses: ["selected", "rejected"] },
  { id: "applied", label: "Applied", statuses: ["applied", "declined"] },
] as const;
type TabId = (typeof TABS)[number]["id"];

const STATUS_STYLE: Record<string, string> = {
  applied: "text-muted-foreground bg-muted",
  declined: "text-muted-foreground bg-muted",
  accepted: "text-amber-400 bg-amber-400/10",
  submitted: "text-green bg-green/10",
  shortlisted: "text-green bg-green/10",
  selected: "text-green bg-green/10",
  rejected: "text-muted-foreground bg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  applied: "waiting for the business",
  declined: "not accepted",
  accepted: "to do",
  submitted: "work sent",
  shortlisted: "work sent",
  selected: "winner",
  rejected: "not selected",
};

const EMPTY: Record<TabId, string> = {
  ongoing: "Nothing on the go. Once a business accepts you for a gig, it shows up here.",
  completed: "No finished gigs yet. A gig is done once the business picks the winner.",
  applied: "You haven't applied to anything that's waiting on a decision.",
};

export default async function MyGigs({
  searchParams,
}: { searchParams: Promise<{ tab?: string; sent?: string; revised?: string; applied?: string }> }) {
  const { tab: tabParam, sent, revised, applied } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "id, status, pitch, feedback, rating, paid_at, created_at, accepted_at, submitted_at, revision_note, revision_due, revision_requested_at, revised_at, gigs(id, title, deadline, reward_type, reward_amount, companies(name))"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  const all = subs ?? [];
  const tab: TabId = TABS.some((t) => t.id === tabParam) ? (tabParam as TabId) : "ongoing";
  const inTab = (id: TabId) =>
    all.filter((s) => (TABS.find((t) => t.id === id)!.statuses as readonly string[]).includes(s.status));
  const shown = inTab(tab);
  const now = new Date();

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-4">
          <SectionLabel index="02">History</SectionLabel>
          <h1 className="brand-display text-3xl sm:text-4xl">My gigs</h1>
        </div>
        <Link
          href="/gigs"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium hover:bg-green/5 hover:border-green/15 transition-all shrink-0"
        >
          Browse gigs
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {sent && <Banner>Work sent! The business will rate it and you'll see the result here.</Banner>}
      {revised && <Banner>Changes sent! The business will see them next to your original work.</Banner>}
      {applied && <Banner>Applied! The business will look at your profile and accept up to 3 students.</Banner>}

      <nav className="flex gap-1 border-b border-white/[0.06]" aria-label="My gigs">
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <Link
              key={t.id}
              href={`/submissions?tab=${t.id}`}
              aria-current={active ? "page" : undefined}
              className={`px-4 py-2.5 text-sm font-medium -mb-px border-b-2 transition-colors ${
                active
                  ? "border-green text-green"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <Num className="text-xs opacity-70">{inTab(t.id).length}</Num>
            </Link>
          );
        })}
      </nav>

      {!shown.length ? (
        <div className="flex flex-col items-center text-center py-16 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green/15 to-emerald-900/10 shadow-[0_0_40px_rgba(123,196,127,0.08)]">
            <FileText className="h-8 w-8 text-green" />
          </div>
          <p className="text-sm text-muted-foreground max-w-md">{EMPTY[tab]}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {shown.map((s) => {
            const gig = s.gigs as unknown as {
              id: string;
              title: string;
              deadline: string | null;
              reward_type: string;
              reward_amount: number | null;
              companies: { name: string } | null;
            };
            const pastDeadline = !!gig.deadline && new Date(gig.deadline) <= now;
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-5 space-y-3 transition-all hover:from-green/[0.04] hover:border-green/15"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <Link
                      href={`/gigs/${gig.id}`}
                      className="font-medium hover:text-green transition-colors truncate block"
                    >
                      {gig.title}
                    </Link>
                    <p className="text-sm text-muted-foreground">
                      {gig.companies?.name} · <Num>{formatReward(gig.reward_type, gig.reward_amount)}</Num>
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase rounded-full px-2.5 py-1 shrink-0 ${
                      STATUS_STYLE[s.status] ?? "text-muted-foreground bg-muted"
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>

                {s.status === "accepted" && (
                  <div className="text-sm rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 space-y-2">
                    {pastDeadline ? (
                      <p className="text-muted-foreground">The deadline passed before you sent your work.</p>
                    ) : (
                      <>
                        <p>
                          You're in. Send your work before the deadline{" "}
                          <span className="text-amber-400">({formatDeadline(gig.deadline).toLowerCase()})</span>.
                        </p>
                        <Link
                          href={`/gigs/${gig.id}/submit`}
                          className="inline-flex items-center px-4 py-2 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
                        >
                          Submit your work
                        </Link>
                      </>
                    )}
                  </div>
                )}

                {s.status === "applied" && s.pitch && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap line-clamp-3">“{s.pitch}”</p>
                )}

                {(s.rating || s.status === "selected") && (
                  <div className="flex items-center gap-4 text-sm">
                    {s.rating && (
                      <span className="text-muted-foreground">
                        Rated <Num className="text-green font-semibold">{s.rating}/10</Num>
                      </span>
                    )}
                    {s.status === "selected" && gig.reward_type === "paid" && (
                      <span className={s.paid_at ? "text-green" : "text-muted-foreground"}>
                        {s.paid_at ? "Paid" : "Payment on the way"}
                      </span>
                    )}
                  </div>
                )}

                {s.status === "rejected" && !s.submitted_at && (
                  <p className="text-sm text-muted-foreground">No work was sent for this gig.</p>
                )}

                {s.revision_requested_at && (() => {
                  const open = !s.revised_at && !!s.revision_due && new Date(s.revision_due) > now;
                  return (
                    <div className={`text-sm rounded-xl border p-3 space-y-2 ${open ? "border-amber-400/20 bg-amber-400/5" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className={`font-medium ${open ? "text-amber-400" : "text-muted-foreground"}`}>
                          {s.revised_at ? "Changes sent" : open ? "Changes requested" : "Change request expired"}
                        </span>
                        {s.revision_due && (
                          <span className="brand-num text-xs text-muted-foreground">
                            due {new Date(s.revision_due).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" })}
                          </span>
                        )}
                      </div>
                      <p className="whitespace-pre-wrap text-muted-foreground">{s.revision_note}</p>
                      {open && (
                        <Link
                          href={`/submissions/${s.id}/revise`}
                          className="inline-flex items-center px-4 py-2 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
                        >
                          Send your changes
                        </Link>
                      )}
                    </div>
                  );
                })()}

                {s.feedback && (
                  <div className="text-sm rounded-xl bg-green/5 border border-green/10 p-3">
                    <span className="font-medium text-green">Feedback: </span>
                    {s.feedback}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Applied{" "}
                    {new Date(s.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {(s.status === "applied" || s.status === "declined" || (s.status === "accepted" && !pastDeadline)) && (
                    <form
                      action={async () => {
                        "use server";
                        await withdrawSubmission(s.id);
                      }}
                    >
                      <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        {s.status === "declined" ? "Remove" : "Withdraw"}
                      </button>
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

function Banner({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-green/20 bg-gradient-to-r from-green/10 to-green/5 p-3 text-sm text-green">
      {children}
    </div>
  );
}
