export type Notification = {
  id: string;
  gig_id: string | null;
  kind: string;
  title: string;
  body: string;
  link: string | null;
  important: boolean;
  read_at: string | null;
  created_at: string;
};

export const NOTIFICATION_FIELDS = "id, gig_id, kind, title, body, link, important, read_at, created_at";

/** Older business notifications were saved before links existed. */
export function notificationLink(n: Notification, fallbackBase: string) {
  if (n.link) return n.link;
  return n.gig_id ? `${fallbackBase}/${n.gig_id}/submissions` : "";
}

/** Deadline-type alerts get the clock icon and the warning colour. */
export function isDeadline(kind: string) {
  return /deadline|due|no_applicants/.test(kind);
}

export function timeAgo(date: string) {
  const mins = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(date).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "Asia/Kolkata" });
}
