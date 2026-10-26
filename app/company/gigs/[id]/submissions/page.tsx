import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewSubmission } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, FileText, ExternalLink, Paperclip, Star } from "lucide-react";

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
    .select("id, title, max_applicants, companies(owner_id)")
    .eq("id", id)
    .single();
  if (!gig) notFound();
  const owner = (gig.companies as unknown as { owner_id: string }).owner_id;
  if (owner !== user.id) redirect("/company/gigs");

  const { data: subs } = await supabase
    .from("submissions")
    .select(
      "id, note, links, file_paths, status, feedback, rating, created_at, profiles(full_name, username, college)"
    )
    .eq("gig_id", id)
    .order("created_at", { ascending: true });

  // signed download links for files
  const allPaths = subs?.flatMap((s) => s.file_paths) ?? [];
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
            };
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
                  </div>
                  <span
                    className={`text-xs uppercase font-semibold px-2 py-1 rounded-md ${
                      s.status === "selected"
                        ? "bg-green/10 text-green"
                        : s.status === "rejected"
                        ? "bg-red-400/10 text-red-400"
                        : s.status === "shortlisted"
                        ? "bg-amber-400/10 text-amber-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.status}
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

                <form
                  action={reviewSubmission}
                  className="space-y-3 border-t border-white/[0.06] pt-4"
                >
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="gig_id" value={id} />
                  <Textarea
                    name="feedback"
                    rows={2}
                    defaultValue={s.feedback ?? ""}
                    placeholder="Feedback for the student (they'll see this)"
                    className="border-white/[0.06] bg-white/[0.03] focus-visible:ring-green/30 focus-visible:border-green/20"
                  />
                  <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Rate this submission (1-5)</label>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map((v) => (
                        <label key={v} className="cursor-pointer">
                          <input type="radio" name="rating" value={v} defaultChecked={s.rating === v} className="sr-only peer" />
                          <Star className="h-5 w-5 text-muted-foreground/30 peer-checked:text-amber-400 peer-checked:fill-amber-400 hover:text-amber-400/60 transition-colors" />
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      name="status"
                      value="shortlisted"
                      size="sm"
                      variant="outline"
                      className="border-amber-400/20 text-amber-400 hover:bg-amber-400/10"
                    >
                      Shortlist
                    </Button>
                    <Button
                      name="status"
                      value="selected"
                      size="sm"
                      className="bg-green text-green-foreground hover:bg-green/90"
                    >
                      Select
                    </Button>
                    <Button
                      name="status"
                      value="rejected"
                      size="sm"
                      variant="outline"
                      className="border-red-400/20 text-red-400 hover:bg-red-400/10"
                    >
                      Reject
                    </Button>
                  </div>
                </form>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
