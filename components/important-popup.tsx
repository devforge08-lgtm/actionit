"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Clock, X } from "lucide-react";
import { openNotification } from "@/lib/notification-actions";
import { isDeadline, notificationLink, type Notification } from "@/lib/notifications";

const SEEN_KEY = "important-popup-seen";

/**
 * Pops up over the dashboard when there are important notifications the
 * person hasn't seen in this visit yet. Closing it only hides the popup;
 * the items stay in the Important section until opened or dismissed.
 */
export default function ImportantPopup({
  notes,
  inboxHref,
}: {
  notes: Notification[];
  inboxHref: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!notes.length) return;
    let seen: string[] = [];
    try {
      seen = JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "[]");
    } catch {}
    if (notes.every((n) => seen.includes(n.id))) return;
    // Small delay so it feels like a natural popup
    const timer = setTimeout(() => setVisible(true), 600);
    return () => clearTimeout(timer);
  }, [notes]);

  function close() {
    setVisible(false);
    try {
      sessionStorage.setItem(SEEN_KEY, JSON.stringify(notes.map((n) => n.id)));
    } catch {}
  }

  if (!visible) return null;
  const shown = notes.slice(0, 3);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60] animate-in fade-in duration-300" onClick={close} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 pointer-events-none animate-in fade-in zoom-in-95 duration-300">
        <div
          role="dialog"
          aria-label="Important notifications"
          className="pointer-events-auto w-full max-w-md rounded-2xl border border-amber-400/25 bg-[#0a0f0b]/85 backdrop-blur-xl shadow-[0_0_60px_rgba(123,196,127,0.08)] p-6 space-y-4"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-amber-400/10">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Needs your attention</h3>
                <p className="text-xs text-muted-foreground">
                  {notes.length === 1 ? "1 important update" : `${notes.length} important updates`}
                </p>
              </div>
            </div>
            <button onClick={close} aria-label="Close" className="p-1 rounded-lg hover:bg-green/10 transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          <div className="space-y-2">
            {shown.map((n) => {
              const Icon = isDeadline(n.kind) ? Clock : AlertTriangle;
              return (
                <form key={n.id} action={openNotification}>
                  <input type="hidden" name="id" value={n.id} />
                  <input type="hidden" name="link" value={notificationLink(n, "/company/gigs")} />
                  <button
                    type="submit"
                    onClick={close}
                    className="w-full text-left flex items-start gap-3 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 hover:bg-amber-400/10 transition-colors"
                  >
                    <Icon className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">{n.title}</span>
                      <span className="block text-xs text-muted-foreground line-clamp-2">{n.body}</span>
                    </span>
                  </button>
                </form>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button
              onClick={close}
              className="flex-1 py-2.5 rounded-xl border border-green/15 text-sm font-medium text-muted-foreground hover:bg-green/5 transition-colors"
            >
              Later
            </button>
            <Link
              href={inboxHref}
              onClick={close}
              className="flex-1 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium text-center hover:bg-green/90 transition-colors"
            >
              See all
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
