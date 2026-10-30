import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { withdrawSubmission } from "../gigs/[id]/submit/actions";
import { Num } from "@/components/brand/primitives";
import {
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  applied: "text-muted-foreground bg-muted",
  accepted: "text-green bg-green/10",
  declined: "text-muted-foreground bg-muted",
  submitted: "text-blue-400 bg-blue-400/10",
  shortlisted: "text-amber-400 bg-amber-400/10",
  selected: "text-green bg-green/10",
  rejected: "text-muted-foreground bg-muted",
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "work sent",
  declined: "not accepted",
  selected: "winner",
  rejected: "not selected",
};

export default async function MySubmissions({
  searchParams,
}: { searchParams: Promise<{ sent?: string; revised?: string }> }) {
  const { sent, revised } = await searchParams;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "id, status, feedback, rating, paid_at, created_at, revision_note, revision_due, revision_requested_at, revised_at, gigs(id, title, reward_type, companies(name))"
    )
    .eq("student_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">My Submissions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track the status of your gig submissions
          </p>
        </div>
        <Link
          href="/gigs"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/[0.06] text-sm font-medium hover:bg-green/5 hover:border-green/15 transition-all"
        >
          Browse gigs
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {sent && (
        <div className="rounded-xl border border-green/20 bg-gradient-to-r from-green/10 to-green/5 p-3 text-sm text-green">
          Submitted! The company will review it and you'll see the status
          here.
        </div>
      )}

      {revised && (
        <div className="rounded-xl border border-green/20 bg-gradient-to-r from-green/10 to-green/5 p-3 text-sm text-green">
          Changes sent! The business will see them next to your original work.
        </div>
      )}

      {!subs?.length ? (
        <div className="flex flex-col items-center text-center py-16 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green/15 to-emerald-900/10 shadow-[0_0_40px_rgba(123,196,127,0.08)]">
            <FileText className="h-8 w-8 text-green" />
          </div>
          <h2 className="text-lg font-semibold">No submissions yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Browse open gigs and submit your work to get started.
          </p>
          <Link
            href="/gigs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green to-emerald-500 text-green-foreground text-sm font-medium hover:shadow-[0_0_20px_rgba(123,196,127,0.3)] transition-all"
          >
            Browse Gigs
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map((s) => {
            const gig = s.gigs as unknown as {
              id: string;
              title: string;
              reward_type: string;
              companies: { name: string } | null;
            };
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
                      {gig.companies?.name}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold uppercase rounded-full px-2.5 py-1 shrink-0 ${
                      STATUS_STYLE[s.status] ??
                      "text-muted-foreground bg-muted"
                    }`}
                  >
                    {STATUS_LABEL[s.status] ?? s.status}
                  </span>
                </div>

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

                {s.revision_requested_at && (() => {
                  const open = !s.revised_at && !!s.revision_due && new Date(s.revision_due) > new Date();
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
                    <span className="font-medium text-green">
                      Feedback:{" "}
                    </span>
                    {s.feedback}
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(s.created_at).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </span>
                  {s.status === "accepted" && (
                    <Link
                      href={`/gigs/${gig.id}/submit`}
                      className="inline-flex items-center px-4 py-2 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
                    >
                      Submit your work
                    </Link>
                  )}
                  {(s.status === "applied" || s.status === "accepted" || s.status === "declined") && (
                    <form
                      action={async () => {
                        "use server";
                        await withdrawSubmission(s.id);
                      }}
                    >
                      <button className="text-xs text-red-400 hover:text-red-300 transition-colors">
                        Withdraw
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
