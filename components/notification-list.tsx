import { Bell, Clock, AlertTriangle } from "lucide-react";
import { openNotification } from "@/lib/notification-actions";
import { isDeadline, notificationLink, timeAgo, type Notification } from "@/lib/notifications";

/** The full inbox, shared by the student and business notification pages. */
export default function NotificationList({ notes }: { notes: Notification[] }) {
  if (!notes.length) {
    return (
      <div className="text-center py-16 space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
          <Bell className="h-7 w-7 text-green" />
        </div>
        <p className="text-muted-foreground">Nothing here yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {notes.map((n) => {
        const link = notificationLink(n, "/company/gigs");
        const Icon = n.important ? (isDeadline(n.kind) ? Clock : AlertTriangle) : null;
        return (
          <form key={n.id} action={openNotification}>
            <input type="hidden" name="id" value={n.id} />
            <input type="hidden" name="link" value={link} />
            <button
              type="submit"
              disabled={!link}
              className={`w-full text-left rounded-2xl border p-5 space-y-2 transition-colors enabled:hover:border-green/25 ${
                n.read_at
                  ? "border-white/[0.06] bg-white/[0.01]"
                  : n.important
                  ? "border-amber-400/25 bg-gradient-to-r from-amber-400/[0.06] to-transparent"
                  : "border-green/15 bg-gradient-to-r from-green/[0.05] to-transparent"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <h2 className="font-medium flex items-center gap-2">
                  {!n.read_at && <span className="h-2 w-2 rounded-full bg-green shrink-0" />}
                  {Icon && <Icon className="h-4 w-4 text-amber-400 shrink-0" />}
                  {n.title}
                </h2>
                <span className="brand-num text-xs text-muted-foreground shrink-0">{timeAgo(n.created_at)}</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">{n.body}</p>
            </button>
          </form>
        );
      })}
    </div>
  );
}
