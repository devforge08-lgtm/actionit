"use client";

import { useState, useTransition } from "react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function OnboardingPage() {
  const [role, setRole] = useState<"student" | "company" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await completeOnboarding(formData);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Let's set you up</CardTitle>
          <CardDescription>You can't change this later, so pick carefully.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {(["student", "company"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`rounded-lg border p-4 text-left transition ${
                    role === r ? "border-primary ring-2 ring-primary" : "hover:bg-muted"
                  }`}
                >
                  <div className="font-medium">{r === "student" ? "I'm a student" : "I'm hiring"}</div>
                  <div className="text-xs text-muted-foreground">
                    {r === "student" ? "Do gigs, build proof-of-work" : "Post gigs, find talent"}
                  </div>
                </button>
              ))}
            </div>
            <input type="hidden" name="role" value={role ?? ""} />

            {role && (
              <>
                <Input name="full_name" placeholder="Your full name" required />
                <Input name="username" placeholder="username (for your public link)" required />
                {role === "company" && (
                  <Input name="company_name" placeholder="Company / startup name" required />
                )}
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Saving…" : "Continue"}
                </Button>
              </>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
