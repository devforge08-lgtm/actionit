"use client";

import { useState, useTransition } from "react";
import { createGig } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NewGigPage() {
  const [rewardType, setRewardType] = useState("paid");
  const [remote, setRemote] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await createGig(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Post a gig</h1>
        <p className="text-muted-foreground mt-1">
          Describe a real task students can prove themselves on.
        </p>
      </div>

      <div className="rounded-2xl border border-green/10 bg-card/40 p-6">
        <form action={onSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              placeholder="Design a landing page hero section"
              required
              className="border-green/15 focus-visible:ring-green/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">What's the task?</Label>
            <Textarea
              id="description"
              name="description"
              rows={6}
              placeholder="Context, requirements, tools, anything students should know…"
              required
              className="border-green/15 focus-visible:ring-green/30"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="deliverables">What should they submit?</Label>
            <Textarea
              id="deliverables"
              name="deliverables"
              rows={3}
              placeholder="e.g. Figma link + a short note explaining your choices"
              className="border-green/15 focus-visible:ring-green/30"
            />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reward_type">Reward</Label>
              <select
                id="reward_type"
                name="reward_type"
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value)}
                className="w-full h-9 rounded-md border border-green/15 bg-transparent px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green/30"
              >
                <option value="paid">Paid</option>
                <option value="certificate">Certificate</option>
                <option value="interview">Interview opportunity</option>
                <option value="unpaid">Unpaid</option>
              </select>
            </div>
            {rewardType === "paid" && (
              <div className="space-y-2">
                <Label htmlFor="reward_amount">Amount (₹)</Label>
                <Input
                  id="reward_amount"
                  name="reward_amount"
                  type="number"
                  min="0"
                  placeholder="2000"
                  className="border-green/15 focus-visible:ring-green/30"
                />
              </div>
            )}
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input
                id="deadline"
                name="deadline"
                type="date"
                className="border-green/15 focus-visible:ring-green/30"
              />
            </div>
            <div className="space-y-2">
              <Label>Where</Label>
              <label className="flex items-center gap-2 h-9 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  name="is_remote"
                  checked={remote}
                  onChange={(e) => setRemote(e.target.checked)}
                  className="accent-green"
                />
                Remote
              </label>
            </div>
          </div>

          {!remote && (
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                placeholder="Bengaluru"
                className="border-green/15 focus-visible:ring-green/30"
              />
            </div>
          )}

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <div className="flex gap-3">
            <Button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending}
              className="bg-green text-green-foreground hover:bg-green/90"
            >
              {pending ? "Saving…" : "Publish gig"}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="draft"
              variant="outline"
              disabled={pending}
              className="border-green/15 hover:bg-green/5"
            >
              Save as draft
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
