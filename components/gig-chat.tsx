"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { AlertTriangle, Lock, Send, X } from "lucide-react";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
  kind?: string;
  issue_reason?: string | null;
};

export const CHAT_FIELDS = "id, sender_id, body, created_at, kind, issue_reason";

const ISSUE_REASONS = [
  { id: "brief_unclear", label: "The brief is unclear" },
  { id: "deadline", label: "I can't make the deadline" },
  { id: "payment", label: "Payment problem" },
  { id: "other", label: "Something else" },
];

const POLL_MS = 4000;

/**
 * Chat between a business and one accepted student. New messages are picked
 * up by polling every few seconds while the tab is visible and the chat is
 * open; who can read and send is enforced by the database (gig_chat.sql).
 * Students can also raise an issue, which the business gets as an
 * important alert (notifications_and_gig_limit.sql).
 */
export default function GigChat({
  submissionId,
  userId,
  otherName,
  open,
  initialMessages,
  canRaiseIssue = false,
}: {
  submissionId: string;
  userId: string;
  otherName: string;
  open: boolean;
  initialMessages: ChatMessage[];
  canRaiseIssue?: boolean;
}) {
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closed, setClosed] = useState(!open);
  const [error, setError] = useState<string | null>(null);
  const [issueReason, setIssueReason] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("gig_messages")
      .select(CHAT_FIELDS)
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (data) {
      setMessages((prev) => {
        // Messages that arrive while the chat is open count as seen
        if (data.length !== prev.length) {
          supabase
            .from("notifications")
            .update({ read_at: new Date().toISOString() })
            .eq("submission_id", submissionId)
            .eq("kind", "chat_message")
            .is("read_at", null)
            .then(() => {});
        }
        return data;
      });
    }
  }, [supabase, submissionId]);

  useEffect(() => {
    if (closed) return;
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [closed, refresh]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    const { error } = await supabase.from("gig_messages").insert({
      submission_id: submissionId,
      sender_id: userId,
      body: body.slice(0, 2000),
      ...(issueReason ? { kind: "issue", issue_reason: issueReason } : {}),
    });
    setSending(false);
    if (error) {
      // The insert policy refuses once the gig is completed for this student
      if (error.code === "42501") {
        setClosed(true);
        setError("This chat closed because the gig is completed.");
      } else {
        setError(error.message);
      }
      return;
    }
    setDraft("");
    setIssueReason(null);
    refresh();
  }

  const fmt = (d: string) =>
    new Date(d).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    });

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent flex flex-col h-[70vh] min-h-[420px]">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {!messages.length && (
          <p className="text-sm text-muted-foreground text-center py-10">
            {closed ? "No messages were sent." : `No messages yet. Ask ${otherName} anything about the gig.`}
          </p>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          if (m.kind === "issue") {
            const reason = ISSUE_REASONS.find((r) => r.id === m.issue_reason)?.label ?? "Issue";
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm border border-amber-400/30 bg-amber-400/[0.07]">
                  <p className="brand-eyebrow text-amber-400 flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Issue raised · {reason}
                  </p>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className="brand-num text-[10px] text-muted-foreground mt-1 text-right">{fmt(m.created_at)}</p>
                </div>
              </div>
            );
          }
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                  mine
                    ? "bg-green/15 border border-green/20 rounded-br-md"
                    : "bg-white/[0.04] border border-white/[0.06] rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className="brand-num text-[10px] text-muted-foreground mt-1 text-right">{fmt(m.created_at)}</p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {closed ? (
        <div className="border-t border-white/[0.06] px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          {error ?? "This gig is completed, so the chat is closed. You can still read it."}
        </div>
      ) : (
        <form onSubmit={send} className="border-t border-white/[0.06] p-3 space-y-2">
          {issueReason !== null && (
            <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.06] p-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium flex items-center gap-1.5 text-amber-400">
                  <AlertTriangle className="h-4 w-4" />
                  Raise an issue
                </p>
                <button
                  type="button"
                  onClick={() => setIssueReason(null)}
                  aria-label="Cancel issue"
                  className="p-1 rounded-md hover:bg-white/[0.04]"
                >
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ISSUE_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setIssueReason(r.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                      issueReason === r.id
                        ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                        : "border-white/[0.08] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {otherName} gets this as an important alert. Describe the problem below.
              </p>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={issueReason !== null ? "What's wrong?" : `Message ${otherName}`}
              className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 resize-none max-h-40"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              aria-label="Send"
              className="p-3 rounded-xl bg-green text-green-foreground hover:bg-green/90 transition-colors disabled:opacity-40"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          {error && <p className="text-sm text-red-400">{error}</p>}
          {canRaiseIssue && issueReason === null && (
            <button
              type="button"
              onClick={() => setIssueReason("brief_unclear")}
              className="text-xs text-muted-foreground hover:text-amber-400 inline-flex items-center gap-1.5 transition-colors"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Something wrong? Raise an issue
            </button>
          )}
        </form>
      )}
    </div>
  );
}
