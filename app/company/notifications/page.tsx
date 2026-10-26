import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/brand/primitives";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { markAllRead } from "./actions";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Sends any due "no applicants" messages before listing them
  await supabase.rpc("notify_unfilled_gigs");

  const { data: notes } = await supabase
    .from("notifications")
    .select("id, gig_id, title, body, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const unread = notes?.filter((n) => !n.read_at).length ?? 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-4">
          <SectionLabel index="01">Inbox</SectionLabel>
          <h1 className="brand-display text-3xl sm:text-4xl">Notifications</h1>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <Button size="sm" variant="outline" className="border-green/15 hover:bg-green/5">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {!notes?.length ? (
        <div className="text-center py-16 space-y-3">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
            <Bell className="h-7 w-7 text-green" />
          </div>
          <p className="text-muted-foreground">Nothing here yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((n) => (
            <div
              key={n.id}
              className={`rounded-2xl border p-5 space-y-2 ${
                n.read_at
                  ? "border-white/[0.06] bg-white/[0.01]"
                  : "border-green/15 bg-gradient-to-r from-green/[0.05] to-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-medium flex items-center gap-2">
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-green shrink-0" />}
                  {n.title}
                </h2>
                <span className="brand-num text-xs text-muted-foreground shrink-0">
                  {new Date(n.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
              {n.gig_id && (
                <Link
                  href={`/company/gigs/${n.gig_id}/submissions`}
                  className="inline-block text-sm text-green hover:underline"
                >
                  View gig
                </Link>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
