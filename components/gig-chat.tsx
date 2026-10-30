"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Lock, Send } from "lucide-react";

export type ChatMessage = {
  id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

const POLL_MS = 4000;

/**
 * Chat between a business and one accepted student. New messages are picked
 * up by polling every few seconds while the tab is visible and the chat is
 * open; who can read and send is enforced by the database (gig_chat.sql).
 */
export default function GigChat({
  submissionId,
  userId,
  otherName,
  open,
  initialMessages,
}: {
  submissionId: string;
  userId: string;
  otherName: string;
  open: boolean;
  initialMessages: ChatMessage[];
}) {
  const [supabase] = useState(createClient);
  const [messages, setMessages] = useState(initialMessages);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [closed, setClosed] = useState(!open);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const refresh = useCallback(async () => {
    const { data } = await supabase
      .from("gig_messages")
      .select("id, sender_id, body, created_at")
      .eq("submission_id", submissionId)
      .order("created_at", { ascending: true })
      .limit(500);
    if (data) setMessages(data);
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
    const { error } = await supabase
      .from("gig_messages")
      .insert({ submission_id: submissionId, sender_id: userId, body: body.slice(0, 2000) });
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
              placeholder={`Message ${otherName}`}
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
        </form>
      )}
    </div>
  );
}
