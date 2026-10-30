import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ReviewControls from "./review-controls";
import ApplicantActions from "./applicant-actions";
import AchievementList from "@/components/achievement-list";
import { formatReward } from "@/lib/format";
import { tierInfo } from "@/lib/proof-score";
import type { Achievement } from "@/lib/achievements";
import { ArrowLeft, FileText, ExternalLink, Paperclip, MessageSquare } from "lucide-react";

type Profile = {
  full_name: string;
  username: string;
  college: string | null;
  bio: string | null;
  skills: string[] | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
  proof_score: number;
  proof_tier: string;
  proof_gigs: number;
  proof_wins: number;
  proof_rating: number | null;
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const [{ data: gig }, { data: subs }] = await Promise.all([
    supabase
      .from("gigs")
      .select("id, title, status, deadline, max_applicants, accepted_count, reward_type, reward_amount, companies(owner_id)")
      .eq("id", id)
      .single(),
    supabase
      .from("submissions")
      .select(
        "id, student_id, pitch, note, links, file_paths, status, feedback, rating, paid_at, created_at, accepted_at, submitted_at, revision_note, revision_due, revision_requested_at, revision_reply, revision_links, revision_file_paths, revised_at, profiles(full_name, username, college, bio, skills, github, linkedin, portfolio, proof_score, proof_tier, proof_gigs, proof_wins, proof_rating)"
      )
      .eq("gig_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!gig) notFound();
  const owner = (gig.companies as unknown as { owner_id: string }).owner_id;
  if (owner !== user.id) redirect("/company/gigs");

  const all = subs ?? [];
  const applicants = all.filter((s) => s.status === "applied");
  const declined = all.filter((s) => s.status === "declined");
  const team = all.filter((s) => s.accepted_at);

  // Achievements for everyone who applied, in one query
  const { data: achievementRows } = all.length
    ? await supabase
        .from("achievements")
        .select("id, student_id, title, description, link")
        .in("student_id", all.map((s) => s.student_id))
        .order("created_at", { ascending: false })
    : { data: [] };
  const achievementsBy: Record<string, Achievement[]> = {};
  for (const a of achievementRows ?? []) (achievementsBy[a.student_id] ??= []).push(a);

  const now = new Date();
  const winner = all.find((s) => s.status === "selected");
  const pastDeadline = !!gig.deadline && new Date(gig.deadline) <= now;
  const spotsLeft = gig.max_applicants - gig.accepted_count;
  const canAccept = !winner && !pastDeadline && spotsLeft > 0;
  const sent = team.filter((s) => s.submitted_at);
  const stillWorking = team.filter((s) => s.status === "accepted").length;
  const unrated = sent.filter((s) => !s.rating).length;
  const pendingChanges = sent.filter(
    (s) => s.revision_requested_at && !s.revised_at && s.revision_due && new Date(s.revision_due) > now
  ).length;
  const canPickWinner =
    !winner && sent.length > 0 && (stillWorking === 0 || pastDeadline) && unrated === 0 && pendingChanges === 0;

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
  const allPaths = team.flatMap((s) => [...s.file_paths, ...(s.revision_file_paths ?? [])]);
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
    <div className="max-w-3xl mx-auto space-y-8">
      <Link
        href="/company/gigs"
        className="text-sm text-muted-foreground hover:text-green transition-colors inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-3 w-3" /> Back to gigs
      </Link>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">{gig.title}</h1>
        <p className="text-muted-foreground brand-num text-sm mt-1">
          {all.length} applied · {gig.accepted_count} / {gig.max_applicants} accepted
        </p>
      </div>

      {all.length > 0 && (
        <div className="rounded-2xl border border-green/15 bg-green/[0.04] p-4 text-sm">
          {winner ? (
            <span>
              Winner picked.{" "}
              {winner.paid_at
                ? "Payment is marked as sent."
                : `Send them ${formatReward(gig.reward_type, gig.reward_amount)} and mark it as paid below.`}
            </span>
          ) : team.length === 0 ? (
            <span className="text-muted-foreground">
              Look through each applicant's Proof Score, past gigs and achievements, and accept up to {gig.max_applicants}. The gig comes off Browse gigs once all spots are taken.
            </span>
          ) : stillWorking > 0 && !pastDeadline ? (
            <span className="text-muted-foreground">
              Waiting on work from {stillWorking} student{stillWorking === 1 ? "" : "s"}. Once everyone has sent it or the deadline passes, rate it out of 10 and pick the winner.
            </span>
          ) : sent.length === 0 ? (
            <span className="text-muted-foreground">Nobody sent work before the deadline.</span>
          ) : pendingChanges > 0 ? (
            <span className="text-muted-foreground">
              Waiting on changes from {pendingChanges} student{pendingChanges === 1 ? "" : "s"}. You can pick a winner once they send them or their due date passes.
            </span>
          ) : unrated > 0 ? (
            <span className="text-muted-foreground">
              Rate every piece of work out of 10 ({unrated} left), then pick the one you're happiest with. Ratings help every student build their Proof Score.
            </span>
          ) : (
            <span>All rated. Pick the winner and they get paid.</span>
          )}
        </div>
      )}

      {!all.length && (
        <div className="text-center py-16 space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
            <FileText className="h-7 w-7 text-green" />
          </div>
          <p className="text-muted-foreground">No applicants yet.</p>
        </div>
      )}

      {/* Accepted students and their work */}
      {team.length > 0 && (
        <section className="space-y-4">
          <h2 className="brand-eyebrow text-muted-foreground">Accepted · {team.length}</h2>
          {team.map((s) => {
            const p = s.profiles as unknown as Profile;
            const chatOpen = !winner && (s.status === "accepted" || s.status === "submitted" || s.status === "shortlisted");
            return (
              <div
                key={s.id}
                className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <StudentSummary p={p} />
                  <span
                    className={`text-xs uppercase font-semibold px-2 py-1 rounded-md shrink-0 ${
                      s.status === "selected" ? "bg-green/10 text-green" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status === "selected"
                      ? s.paid_at ? "winner · paid" : "winner"
                      : s.status === "rejected"
                      ? "not selected"
                      : s.status === "accepted"
                      ? "working on it"
                      : "work sent"}
                  </span>
                </div>

                <Link
                  href={`/company/gigs/${id}/chat/${s.id}`}
                  className="inline-flex items-center gap-1.5 text-sm text-green hover:underline"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  {chatOpen ? "Chat with this student" : "View chat history"}
                </Link>

                {!s.submitted_at ? (
                  <p className="text-sm text-muted-foreground">
                    {winner || pastDeadline ? "They didn't send any work." : "They haven't sent their work yet."}
                  </p>
                ) : (
                  <>
                    {s.note && (
                      <p className="text-sm whitespace-pre-wrap leading-relaxed">{s.note}</p>
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
                  </>
                )}
              </div>
            );
          })}
        </section>
      )}

      {/* Applicants waiting for a decision */}
      {applicants.length > 0 && (
        <section className="space-y-4">
          <h2 className="brand-eyebrow text-muted-foreground">
            Applicants · {applicants.length}
            {!winner && ` · ${Math.max(spotsLeft, 0)} spot${spotsLeft === 1 ? "" : "s"} left`}
          </h2>
          {applicants.map((s) => (
            <ApplicantCard
              key={s.id}
              p={s.profiles as unknown as Profile}
              pitch={s.pitch}
              achievements={achievementsBy[s.student_id] ?? []}
            >
              <ApplicantActions gigId={id} submissionId={s.id} canAccept={canAccept} canDecline={!winner} />
            </ApplicantCard>
          ))}
        </section>
      )}

      {declined.length > 0 && (
        <details className="group">
          <summary className="brand-eyebrow text-muted-foreground cursor-pointer list-none">
            Not accepted · {declined.length} <span className="group-open:hidden">(show)</span>
          </summary>
          <div className="space-y-4 pt-4">
            {declined.map((s) => (
              <ApplicantCard
                key={s.id}
                p={s.profiles as unknown as Profile}
                pitch={s.pitch}
                achievements={achievementsBy[s.student_id] ?? []}
              >
                {canAccept && (
                  <ApplicantActions gigId={id} submissionId={s.id} canAccept canDecline={false} />
                )}
              </ApplicantCard>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

function StudentSummary({ p }: { p: Profile }) {
  const tier = tierInfo(p.proof_tier);
  return (
    <div className="min-w-0">
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
  );
}

/** Everything a business needs to decide on an applicant. */
function ApplicantCard({
  p,
  pitch,
  achievements,
  children,
}: {
  p: Profile;
  pitch: string | null;
  achievements: Achievement[];
  children?: React.ReactNode;
}) {
  const links = [
    { label: "GitHub", href: p.github },
    { label: "LinkedIn", href: p.linkedin },
    { label: "Portfolio", href: p.portfolio },
  ].filter((l): l is { label: string; href: string } => !!l.href && /^https?:\/\//i.test(l.href));

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-5 space-y-4">
      <StudentSummary p={p} />

      {pitch && (
        <div className="rounded-xl border border-green/10 bg-green/[0.04] p-3 text-sm">
          <div className="brand-eyebrow text-green mb-1">Their pitch</div>
          <p className="whitespace-pre-wrap">{pitch}</p>
        </div>
      )}

      {p.bio && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{p.bio}</p>}

      {!!p.skills?.length && (
        <div className="flex flex-wrap gap-1.5">
          {p.skills.map((skill) => (
            <span key={skill} className="px-2 py-0.5 rounded-md bg-green/10 text-green text-xs">
              {skill}
            </span>
          ))}
        </div>
      )}

      {links.length > 0 && (
        <div className="flex flex-wrap gap-3 text-sm">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green hover:underline inline-flex items-center gap-1"
            >
              {l.label} <ExternalLink className="h-3 w-3" />
            </a>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <div className="brand-eyebrow text-muted-foreground">Achievements · {achievements.length}</div>
        <AchievementList items={achievements} />
      </div>

      {children}
    </div>
  );
}
