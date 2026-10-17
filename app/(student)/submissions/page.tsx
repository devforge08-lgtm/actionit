import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { withdrawSubmission } from "../gigs/[id]/submit/actions";
import {
  FileText,
  ExternalLink,
  Clock,
} from "lucide-react";

const STATUS_STYLE: Record<string, string> = {
  submitted: "text-blue-400 bg-blue-400/10",
  shortlisted: "text-amber-400 bg-amber-400/10",
  selected: "text-green bg-green/10",
  rejected: "text-red-400 bg-red-400/10",
};

export default async function MySubmissions({
  searchParams,
}: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "id, status, feedback, created_at, gigs(id, title, companies(name))"
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
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-green/15 text-sm font-medium hover:bg-green/5 transition-colors"
        >
          Browse gigs
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {sent && (
        <div className="rounded-xl border border-green/20 bg-green/5 p-3 text-sm text-green">
          Submitted! The company will review it and you'll see the status
          here.
        </div>
      )}

      {!subs?.length ? (
        <div className="flex flex-col items-center text-center py-16 space-y-4">
          <div className="p-4 rounded-2xl bg-green/10">
            <FileText className="h-8 w-8 text-green" />
          </div>
          <h2 className="text-lg font-semibold">No submissions yet</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Browse open gigs and submit your work to get started.
          </p>
          <Link
            href="/gigs"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
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
              companies: { name: string } | null;
            };
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-green/10 bg-card/40 p-5 space-y-3 transition-all hover:border-green/20"
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
                    {s.status}
                  </span>
                </div>

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
                  {s.status === "submitted" && (
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
