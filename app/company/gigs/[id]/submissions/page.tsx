import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ReviewControls from "./review-controls";
import { formatReward } from "@/lib/format";
import { tierInfo } from "@/lib/proof-score";
import { ArrowLeft, FileText, ExternalLink, Paperclip } from "lucide-react";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gig } = await supabase
    .from("gigs")
    .select("id, title, status, deadline, max_applicants, applicant_count, reward_type, reward_amount, companies(owner_id)")
    .eq("id", id)
    .single();
  if (!gig) notFound();
  const owner = (gig.companies as unknown as { owner_id: string }).owner_id;
  if (owner !== user.id) redirect("/company/gigs");

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "id, note, links, file_paths, status, feedback, rating, paid_at, created_at, revision_note, revision_due, revision_requested_at, revision_reply, revision_links, revision_file_paths, revised_at, profiles(full_name, username, college, proof_score, proof_tier, proof_gigs, proof_wins, proof_rating)"
    )
    .eq("gig_id", id)
    .order("created_at", { ascending: true });

  const winner = subs?.find((s) => s.status === "selected");
  const acceptingWork =
    gig.status === "published" &&
    (!gig.deadline || new Date(gig.deadline) > new Date()) &&
    gig.applicant_count < gig.max_applicants;
  const unrated = subs?.filter((s) => !s.rating).length ?? 0;
  const now = new Date();
  const pendingChanges =
    subs?.filter(
      (s) => s.revision_requested_at && !s.revised_at && s.revision_due && new Date(s.revision_due) > now
    ).length ?? 0;
  const canPickWinner = !winner && !acceptingWork && unrated === 0 && pendingChanges === 0;

  // Dates for the change-request picker, in India time like gig deadlines.
  // The gig deadline is the default due date while there's more than a day
  // left; otherwise the business picks a later one themselves.
  const istDate = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const minDue = istDate(now);
  const defaultDue =
    gig.deadline && new Date(gig.deadline).getTime() - now.getTime() > 86400000
      ? istDate(new Date(gig.deadline))
      : "";
  const fmtDue = (d: string) =>
    new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });

  // signed download links for files
  const allPaths = subs?.flatMap((s) => [...s.file_paths, ...(s.revision_file_paths ?? [])]) ?? [];
  const signed: Record<string, string> = {};
  if (allPaths.length) {
    const { data } = await supabase.storage
      .from("submissions")
      .createSignedUrls(allPaths, 3600);
    data?.forEach((d) => {
      if (d.signedUrl && d.path) signed[d.path] = d.signedUrl;
    });
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link
        href="/company/gigs"
        className="text-sm text-muted-foreground hover:text-green transition-colors inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to gigs
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Submissions</h1>
        <p className="text-muted-foreground">
          {gig.title} · {subs?.length ?? 0} / {gig.max_applicants} applicants
        </p>
      </div>

      {!!subs?.length && (
        <div className="rounded-2xl border border-green/15 bg-green/[0.04] p-4 text-sm">
          {winner ? (
            <span>
              Winner picked.{" "}
              {winner.paid_at
                ? "Payment is marked as sent."
                : `Send them ${formatReward(gig.reward_type, gig.reward_amount)} and mark it as paid below.`}
            </span>
          ) : acceptingWork ? (
            <span className="text-muted-foreground">
              Students can still apply. Once all spots fill or the deadline passes, rate everyone out of 10 and pick the work you're happiest with.
            </span>
          ) : pendingChanges > 0 ? (
            <span className="text-muted-foreground">
              Waiting on changes from {pendingChanges} applicant{pendingChanges === 1 ? "" : "s"}. You can pick a winner once they send them or their due date passes.
            </span>
          ) : unrated > 0 ? (
            <span className="text-muted-foreground">
              Rate every applicant out of 10 ({unrated} left), then pick the work you're happiest with. Ratings help every student build their Proof Score.
            </span>
          ) : (
            <span>All rated. Pick the winner and they get paid.</span>
          )}
        </div>
      )}

      {!subs?.length ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
            <FileText className="h-7 w-7 text-green" />
          </div>
          <p className="text-muted-foreground">No submissions yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {subs.map((s) => {
            const p = s.profiles as unknown as {
              full_name: string;
              username: string;
              college: string | null;
              proof_score: number;
              proof_tier: string;
              proof_gigs: number;
              proof_wins: number;
              proof_rating: number | null;
            };
            const tier = tierInfo(p.proof_tier);
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      @{p.username}
                      {p.college && ` · ${p.college}`}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1 brand-num">
                      <span className="text-green">Proof Score {p.proof_score}</span>
                      {" · "}
                      <span className={tier.color}>{tier.name}</span>
                      {" · "}
                      {p.proof_gigs} gig{p.proof_gigs === 1 ? "" : "s"}, {p.proof_wins} win{p.proof_wins === 1 ? "" : "s"}
                      {p.proof_rating != null && ` · avg ${p.proof_rating}/10`}
                    </div>
                  </div>
                  <span
                    className={`text-xs uppercase font-semibold px-2 py-1 rounded-md ${
                      s.status === "selected"
                        ? "bg-green/10 text-green"
                        : s.status === "rejected"
                        ? "bg-muted text-muted-foreground"
                        : s.status === "shortlisted"
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "selected" ? (s.paid_at ? "winner · paid" : "winner") : s.status === "rejected" ? "not selected" : s.status}
                  </span>
                </div>

                {s.note && (
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">
                    {s.note}
                  </p>
                )}

                {s.links.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {s.links.map((l: string) => (
                      <li key={l}>
                        <a
                          href={l}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green hover:underline break-all inline-flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3 shrink-0" /> {l}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {s.file_paths.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {s.file_paths.map((fp: string) => (
                      <li key={fp}>
                        <a
                          href={signed[fp]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green hover:underline inline-flex items-center gap-1"
                        >
                          <Paperclip className="h-3 w-3 shrink-0" />
                          {fp.split("/").pop()?.replace(/^\d+-/, "")}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                {s.revision_requested_at && (
                  <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-4 space-y-3 text-sm">
                    <div>
                      <div className="brand-eyebrow text-muted-foreground">
                        You asked for changes · due {s.revision_due && fmtDue(s.revision_due)}
                      </div>
                      <p className="whitespace-pre-wrap mt-1 text-muted-foreground">{s.revision_note}</p>
                    </div>
                    {s.revised_at ? (
                      <div className="border-t border-white/[0.06] pt-3 space-y-2">
                        <div className="brand-eyebrow text-green">Revised work</div>
                        {s.revision_reply && <p className="whitespace-pre-wrap leading-relaxed">{s.revision_reply}</p>}
                        {(s.revision_links ?? []).map((l: string) => (
                          <a
                            key={l}
                            href={l}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green hover:underline break-all flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" /> {l}
                          </a>
                        ))}
                        {(s.revision_file_paths ?? []).map((fp: string) => (
                          <a
                            key={fp}
                            href={signed[fp]}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-green hover:underline flex items-center gap-1"
                          >
                            <Paperclip className="h-3 w-3 shrink-0" />
                            {fp.split("/").pop()?.replace(/^\d+-/, "")}
                          </a>
                        ))}
                      </div>
                    ) : s.revision_due && new Date(s.revision_due) > now ? (
                      <p className="text-amber-400">Waiting for their changes.</p>
                    ) : (
                      <p className="text-muted-foreground">The due date passed without changes. Rate the original work.</p>
                    )}
                  </div>
                )}

                <ReviewControls
                  gigId={id}
                  submissionId={s.id}
                  rating={s.rating}
                  feedback={s.feedback}
                  isWinner={s.status === "selected"}
                  paid={!!s.paid_at}
                  rewardIsPaid={gig.reward_type === "paid"}
                  winnerPicked={!!winner}
                  canPickWinner={canPickWinner}
                  canRequestChanges={!winner && !s.revision_requested_at}
                  defaultDue={defaultDue}
                  minDue={minDue}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
