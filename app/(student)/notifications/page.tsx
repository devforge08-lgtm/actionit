import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { SectionLabel } from "@/components/brand/primitives";
import { Button } from "@/components/ui/button";
import NotificationList from "@/components/notification-list";
import { markAllRead } from "@/lib/notification-actions";
import { NOTIFICATION_FIELDS, type Notification } from "@/lib/notifications";

export default async function StudentNotificationsPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login?next=/notifications");

  // Sends any due reminders before listing them
  await supabase.rpc("send_due_notifications");

  const { data } = await supabase
    .from("notifications")
    .select(NOTIFICATION_FIELDS)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  const notes = (data ?? []) as Notification[];
  const unread = notes.filter((n) => !n.read_at).length;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-4">
          <SectionLabel index="01">Inbox</SectionLabel>
          <h1 className="brand-display text-3xl sm:text-4xl">Notifications</h1>
        </div>
        {unread > 0 && (
          <form action={markAllRead}>
            <input type="hidden" name="path" value="/dashboard" />
            <Button size="sm" variant="outline" className="border-green/15 hover:bg-green/5">
              Mark all as read
            </Button>
          </form>
        )}
      </div>
      <NotificationList notes={notes} />
    </div>
  );
}
