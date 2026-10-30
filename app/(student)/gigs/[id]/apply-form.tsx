"use client";

import { useState, useTransition } from "react";
import { applyToGig } from "./submit/actions";

export default function ApplyForm({ gigId }: { gigId: string }) {
  const [pitch, setPitch] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function apply() {
    setError(null);
    startTransition(async () => {
      const res = await applyToGig(gigId, pitch);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3">
      <textarea
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Why you? A line or two on how you'd approach this (optional)"
        className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 resize-none"
      />
      <p className="text-xs text-muted-foreground">
        The business sees your Proof Score, past gigs and achievements, and accepts up to 3 students. You do the work once you're accepted.
      </p>
      {error && <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5">{error}</p>}
      <button
        type="button"
        onClick={apply}
        disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50"
      >
        {pending ? "Applying…" : "Apply to this gig"}
      </button>
    </div>
  );
}
