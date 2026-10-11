import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reviewSubmission } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";

export default async function ReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: gig } = await supabase
    .from("gigs").select("id, title, companies(owner_id)").eq("id", id).single();
  if (!gig) notFound();
  const owner = (gig.companies as unknown as { owner_id: string }).owner_id;
  if (owner !== user.id) redirect("/company/gigs");

  const { data: subs } = await supabase
    .from("submissions")
    .select("id, note, links, file_paths, status, feedback, created_at, profiles(full_name, username, college)")
    .eq("gig_id", id)
    .order("created_at", { ascending: true });

  // signed download links for files (valid 1 hour)
  const allPaths = subs?.flatMap((s) => s.file_paths) ?? [];
  const signed: Record<string, string> = {};
  if (allPaths.length) {
    const { data } = await supabase.storage.from("submissions").createSignedUrls(allPaths, 3600);
    data?.forEach((d) => { if (d.signedUrl && d.path) signed[d.path] = d.signedUrl; });
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <Link href="/company/gigs" className="text-sm text-muted-foreground hover:underline">← Your gigs</Link>
      <div>
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <p className="text-muted-foreground">{gig.title} · {subs?.length ?? 0} total</p>
      </div>

      {!subs?.length && <p className="text-muted-foreground">No submissions yet.</p>}

      <div className="space-y-4">
        {subs?.map((s) => {
          const p = s.profiles as unknown as { full_name: string; username: string; college: string | null };
          return (
            <Card key={s.id}>
              <CardContent className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{p.full_name}</div>
                    <div className="text-sm text-muted-foreground">
                      @{p.username}{p.college && ` · ${p.college}`}
                    </div>
                  </div>
                  <span className="text-xs uppercase font-semibold">{s.status}</span>
                </div>

                {s.note && <p className="text-sm whitespace-pre-wrap">{s.note}</p>}

                {s.links.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {s.links.map((l: string) => (
                      <li key={l}>
                        <a href={l} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{l}</a>
                      </li>
                    ))}
                  </ul>
                )}

                {s.file_paths.length > 0 && (
                  <ul className="text-sm space-y-1">
                    {s.file_paths.map((fp: string) => (
                      <li key={fp}>
                        <a href={signed[fp]} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                          📎 {fp.split("/").pop()?.replace(/^\d+-/, "")}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}

                <form action={reviewSubmission} className="space-y-2 border-t pt-4">
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="gig_id" value={id} />
                  <Textarea name="feedback" rows={2} defaultValue={s.feedback ?? ""}
                    placeholder="Feedback for the student (they'll see this)" />
                  <div className="flex gap-2 flex-wrap">
                    <Button name="status" value="shortlisted" size="sm" variant="outline">Shortlist</Button>
                    <Button name="status" value="selected" size="sm">Select</Button>
                    <Button name="status" value="rejected" size="sm" variant="outline">Reject</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </main>
  );
}
