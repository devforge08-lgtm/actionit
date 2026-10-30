"use client";

import { useState, useTransition } from "react";
import { acceptApplicant, declineApplicant, type ReviewState } from "./actions";
import { Button } from "@/components/ui/button";
import { Check, X } from "lucide-react";

export default function ApplicantActions({
  gigId,
  submissionId,
  canAccept,
  canDecline,
}: {
  gigId: string;
  submissionId: string;
  canAccept: boolean;
  canDecline: boolean;
}) {
  const [state, setState] = useState<ReviewState>(null);
  const [busy, startTransition] = useTransition();

  function run(fn: () => Promise<ReviewState>) {
    startTransition(async () => setState(await fn()));
  }

  return (
    <div className="space-y-2 border-t border-white/[0.06] pt-4">
      <div className="flex gap-2 flex-wrap">
        <Button
          type="button"
          size="sm"
          disabled={!canAccept || busy}
          onClick={() => run(() => acceptApplicant(gigId, submissionId))}
          className="bg-green text-green-foreground hover:bg-green/90"
        >
          <Check className="h-3.5 w-3.5 mr-1.5" />
          {busy ? "Saving…" : "Accept"}
        </Button>
        {canDecline && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => run(() => declineApplicant(gigId, submissionId))}
            className="border-white/[0.08] hover:bg-white/[0.04]"
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            Decline
          </Button>
        )}
      </div>
      {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
    </div>
  );
}
