"use client";

import { useState, useTransition } from "react";
import { createGig } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

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
    <main className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Post a gig</CardTitle>
          <CardDescription>Describe a real task students can prove themselves on.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" placeholder="Design a landing page hero section" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">What's the task?</Label>
              <Textarea id="description" name="description" rows={6}
                placeholder="Context, requirements, tools, anything students should know…" required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliverables">What should they submit?</Label>
              <Textarea id="deliverables" name="deliverables" rows={3}
                placeholder="e.g. Figma link + a short note explaining your choices" />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reward_type">Reward</Label>
                <select id="reward_type" name="reward_type" value={rewardType}
                  onChange={(e) => setRewardType(e.target.value)}
                  className="w-full h-9 rounded-md border bg-transparent px-3 text-sm">
                  <option value="paid">Paid</option>
                  <option value="certificate">Certificate</option>
                  <option value="interview">Interview opportunity</option>
                  <option value="unpaid">Unpaid</option>
                </select>
              </div>
              {rewardType === "paid" && (
                <div className="space-y-2">
                  <Label htmlFor="reward_amount">Amount (₹)</Label>
                  <Input id="reward_amount" name="reward_amount" type="number" min="0" placeholder="2000" />
                </div>
              )}
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="deadline">Deadline</Label>
                <Input id="deadline" name="deadline" type="date" />
              </div>
              <div className="space-y-2">
                <Label>Where</Label>
                <label className="flex items-center gap-2 h-9 text-sm">
                  <input type="checkbox" name="is_remote" checked={remote}
                    onChange={(e) => setRemote(e.target.checked)} />
                  Remote
                </label>
              </div>
            </div>

            {!remote && (
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" name="location" placeholder="Bengaluru" />
              </div>
            )}

            {error && <p className="text-sm text-red-500">{error}</p>}

            <div className="flex gap-3">
              <Button type="submit" name="intent" value="publish" disabled={pending}>
                {pending ? "Saving…" : "Publish gig"}
              </Button>
              <Button type="submit" name="intent" value="draft" variant="outline" disabled={pending}>
                Save as draft
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
