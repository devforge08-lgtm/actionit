"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Briefcase, ArrowRight } from "lucide-react";
import { completeOnboarding } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function OnboardingForm({
  defaultName,
  defaultUsername,
  defaultCompany,
}: {
  defaultName: string;
  defaultUsername: string;
  defaultCompany: string;
}) {
  const [role, setRole] = useState<"student" | "company">("student");
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
    <main className="min-h-screen flex items-center justify-center p-4 pt-20">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold">Set up your account</h1>
          <p className="text-muted-foreground text-sm">
            One step and you're in. Your role can't be changed later.
          </p>
        </div>

        <form
          action={onSubmit}
          className="rounded-2xl border border-green/10 bg-card/60 backdrop-blur-sm p-6 space-y-4"
        >
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                { key: "student", label: "Student", icon: GraduationCap, desc: "Find gigs & earn" },
                { key: "company", label: "Business", icon: Briefcase, desc: "Post gigs & hire" },
              ] as const
            ).map((r) => (
              <button
                key={r.key}
                type="button"
                onClick={() => setRole(r.key)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-4 transition-all ${
                  role === r.key
                    ? "border-green bg-green/5 text-foreground"
                    : "border-green/10 text-muted-foreground hover:border-green/20 hover:bg-green/[0.02]"
                }`}
              >
                <r.icon className={`h-5 w-5 ${role === r.key ? "text-green" : ""}`} />
                <span className="text-sm font-medium">{r.label}</span>
                <span className="text-[11px] text-muted-foreground">{r.desc}</span>
              </button>
            ))}
          </div>
          <input type="hidden" name="role" value={role} />

          <Input
            name="full_name"
            placeholder="Your full name"
            defaultValue={defaultName}
            autoComplete="name"
            required
            className="h-11 border-green/15 focus-visible:ring-green/30"
          />
          <Input
            name="username"
            placeholder="username (for your public link)"
            defaultValue={defaultUsername}
            autoComplete="username"
            pattern="[a-zA-Z0-9_]{3,30}"
            title="3–30 letters, numbers or _"
            required
            className="h-11 border-green/15 focus-visible:ring-green/30"
          />
          {role === "company" && (
            <Input
              name="company_name"
              placeholder="Company / startup name"
              defaultValue={defaultCompany}
              required
              className="h-11 border-green/15 focus-visible:ring-green/30"
            />
          )}

          <Button
            type="submit"
            className="w-full h-11 bg-green text-green-foreground hover:bg-green/90 font-medium"
            disabled={pending}
          >
            {pending ? (
              "Saving…"
            ) : (
              <>
                Continue <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{error}</p>
          )}
        </form>
      </div>
    </main>
  );
}
