"use client";

import { useActionState, useState, useTransition } from "react";
import { rateSubmission, chooseWinner, markPaid, type ReviewState } from "./actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Trophy } from "lucide-react";

export default function ReviewControls({
  gigId,
  submissionId,
  rating,
  feedback,
  isWinner,
  paid,
  rewardIsPaid,
  winnerPicked,
  canPickWinner,
}: {
  gigId: string;
  submissionId: string;
  rating: number | null;
  feedback: string | null;
  isWinner: boolean;
  paid: boolean;
  rewardIsPaid: boolean;
  winnerPicked: boolean;
  canPickWinner: boolean;
}) {
  const [picked, setPicked] = useState<number | null>(rating);
  const [rateState, rateAction, saving] = useActionState(rateSubmission, null);
  const [actionState, setActionState] = useState<ReviewState>(null);
  const [busy, startTransition] = useTransition();

  function run(fn: () => Promise<ReviewState>) {
    startTransition(async () => setActionState(await fn()));
  }

  const message = actionState ?? rateState;

  return (
    <div className="space-y-4 border-t border-white/[0.06] pt-4">
      <form action={rateAction} className="space-y-3">
        <input type="hidden" name="id" value={submissionId} />
        <input type="hidden" name="gig_id" value={gigId} />
        <input type="hidden" name="rating" value={picked ?? ""} />

        <div className="space-y-2">
          <div className="flex items-baseline justify-between">
            <span className="brand-eyebrow text-muted-foreground">
              {winnerPicked ? "Rating (locked once a winner is picked)" : "Rate this work"}
            </span>
            <span className="brand-num text-sm text-green">{picked ? `${picked}/10` : "–/10"}</span>
          </div>
          <div className="grid grid-cols-10 gap-1" role="radiogroup" aria-label="Rating out of 10">
            {Array.from({ length: 10 }, (_, i) => i + 1).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={picked === v}
                disabled={winnerPicked}
                onClick={() => setPicked(v)}
                className={`brand-num h-9 rounded-lg border text-sm transition-colors ${
                  picked && v <= picked
                    ? "border-green/40 bg-green/15 text-green"
                    : "border-white/[0.06] bg-white/[0.02] text-muted-foreground hover:border-green/20"
                } disabled:cursor-not-allowed disabled:hover:border-white/[0.06]`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <Textarea
          name="feedback"
          rows={2}
          defaultValue={feedback ?? ""}
          placeholder="Feedback for the student (they'll see this)"
          className="border-white/[0.06] bg-white/[0.03] focus-visible:ring-green/30 focus-visible:border-green/20"
        />

        <div className="flex gap-2 flex-wrap items-center">
          <Button
            type="submit"
            size="sm"
            variant="outline"
            disabled={!picked || saving}
            className="border-green/15 hover:bg-green/5"
          >
            {saving ? "Saving…" : winnerPicked ? "Update feedback" : rating ? "Update rating" : "Save rating"}
          </Button>

          {!winnerPicked && (
            <Button
              type="button"
              size="sm"
              disabled={!canPickWinner || busy}
              onClick={() => run(() => chooseWinner(gigId, submissionId))}
              className="bg-green text-green-foreground hover:bg-green/90"
            >
              <Trophy className="h-3.5 w-3.5 mr-1.5" />
              {busy ? "Picking…" : "Pick as winner"}
            </Button>
          )}

          {isWinner && !paid && (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => run(() => markPaid(gigId, submissionId))}
              className="bg-green text-green-foreground hover:bg-green/90"
            >
              {busy ? "Saving…" : rewardIsPaid ? "Mark as paid" : "Mark reward as given"}
            </Button>
          )}
        </div>
      </form>

      {message?.error && <p className="text-sm text-red-400">{message.error}</p>}
      {message?.ok && <p className="text-sm text-green">{message.ok}</p>}
    </div>
  );
}
