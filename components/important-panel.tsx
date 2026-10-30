import Link from "next/link";
import { AlertTriangle, Clock, X } from "lucide-react";
import { dismissNotification, openNotification } from "@/lib/notification-actions";
import { isDeadline, notificationLink, timeAgo, type Notification } from "@/lib/notifications";

/**
 * Unread important notifications (deadlines, issues, results) pinned to the
 * top of a dashboard. Each one stays until it's opened or dismissed.
 */
export default function ImportantPanel({
  notes,
  path,
  inboxHref,
}: {
  notes: Notification[];
  path: string;
  inboxHref: string;
}) {
  if (!notes.length) return null;

  return (
    <section className="rounded-2xl border border-amber-400/25 bg-gradient-to-br from-amber-400/[0.06] to-transparent p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-60 motion-safe:animate-ping" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-400" />
          </span>
          Important
          <span className="brand-num text-xs text-muted-foreground font-normal">{notes.length}</span>
        </h2>
        <Link href={inboxHref} className="text-sm text-green hover:underline">
          All notifications
        </Link>
      </div>

      <ul className="space-y-2">
        {notes.map((n) => {
          const Icon = isDeadline(n.kind) ? Clock : AlertTriangle;
          const link = notificationLink(n, "/company/gigs");
          return (
            <li key={n.id} className="flex items-stretch gap-2">
              <form action={openNotification} className="flex-1 min-w-0">
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="link" value={link} />
                <button
                  type="submit"
                  className="w-full h-full text-left flex items-start gap-3 rounded-xl border border-white/[0.06] bg-[#050806]/60 p-3 hover:border-amber-400/30 transition-colors"
                >
                  <Icon className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                  <span className="min-w-0 space-y-0.5">
                    <span className="block text-sm font-medium">{n.title}</span>
                    <span className="block text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                    <span className="block brand-num text-[11px] text-muted-foreground">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </form>
              <form action={dismissNotification}>
                <input type="hidden" name="id" value={n.id} />
                <input type="hidden" name="path" value={path} />
                <button
                  type="submit"
                  aria-label="Dismiss"
                  className="h-full px-2.5 rounded-xl border border-white/[0.06] text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
