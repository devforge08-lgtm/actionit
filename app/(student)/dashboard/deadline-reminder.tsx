"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, X, Clock } from "lucide-react";

interface Deadline {
  gigId: string;
  title: string;
  company: string;
  deadline: string;
  daysLeft: number;
  status: string;
}

export default function DeadlineReminder({
  deadlines,
}: {
  deadlines: Deadline[];
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed this session
    try {
      const dismissed = sessionStorage.getItem("deadline-reminder-dismissed");
      if (!dismissed) {
        // Small delay so it feels like a natural popup
        const timer = setTimeout(() => setVisible(true), 800);
        return () => clearTimeout(timer);
      }
    } catch {
      const timer = setTimeout(() => setVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem("deadline-reminder-dismissed", "1");
    } catch {}
  }

  if (!visible) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-[60] animate-in fade-in duration-300"
        onClick={dismiss}
      />

      {/* Glass popup */}
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-300">
        <div className="w-full max-w-md rounded-2xl border border-green/20 bg-[#0a0f0b]/80 backdrop-blur-xl shadow-[0_0_60px_rgba(123,196,127,0.08)] p-6 space-y-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-red-400/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="font-semibold text-base">Deadline Alert</h3>
                <p className="text-xs text-muted-foreground">
                  {deadlines.length === 1
                    ? "1 gig needs your attention"
                    : `${deadlines.length} gigs need your attention`}
                </p>
              </div>
            </div>
            <button
              onClick={dismiss}
              className="p-1 rounded-lg hover:bg-green/10 transition-colors"
            >
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* Deadline items */}
          <div className="space-y-2">
            {deadlines.map((d) => (
              <Link
                key={d.gigId}
                href={`/gigs/${d.gigId}`}
                onClick={dismiss}
                className="flex items-center justify-between rounded-xl border border-red-400/20 bg-red-400/5 p-3 hover:bg-red-400/10 transition-colors"
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{d.title}</p>
                  <p className="text-xs text-muted-foreground">{d.company}</p>
                </div>
                <div className="flex items-center gap-1.5 text-red-400 ml-3 shrink-0">
                  <Clock className="h-3.5 w-3.5" />
                  <span className="text-sm font-semibold">
                    {d.daysLeft === 0 ? "Today!" : "Tomorrow!"}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl border border-green/15 text-sm font-medium text-muted-foreground hover:bg-green/5 transition-colors"
            >
              Dismiss
            </button>
            <Link
              href="/submissions"
              onClick={dismiss}
              className="flex-1 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium text-center hover:bg-green/90 transition-colors"
            >
              View Submissions
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
