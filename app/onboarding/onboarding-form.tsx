"use client";

import { useState, useTransition } from "react";
import { GraduationCap, Briefcase, ArrowRight, Plus, X } from "lucide-react";
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
  const [achievements, setAchievements] = useState<{ title: string; description: string; link: string }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function setAchievement(i: number, field: "title" | "description" | "link", value: string) {
    setAchievements(achievements.map((a, j) => (j === i ? { ...a, [field]: value } : a)));
  }

  function onSubmit(formData: FormData) {
    formData.set("achievements", JSON.stringify(achievements));
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

          {role === "student" && (
            <div className="space-y-3 border-t border-green/10 pt-4">
              <div>
                <div className="text-sm font-medium">Show what you've built (optional)</div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Projects, edits, designs. Add a GitHub repo for code or a Drive link for edits. You can do this later from your profile too.
                </p>
              </div>
              {achievements.map((a, i) => (
                <div key={i} className="relative space-y-2 rounded-xl border border-green/10 p-3 pr-9">
                  <button
                    type="button"
                    aria-label="Remove"
                    onClick={() => setAchievements(achievements.filter((_, j) => j !== i))}
                    className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                  <Input
                    value={a.title}
                    onChange={(e) => setAchievement(i, "title", e.target.value)}
                    placeholder="Title, e.g. Portfolio website"
                    maxLength={100}
                    className="h-10 border-green/15 focus-visible:ring-green/30"
                  />
                  <textarea
                    value={a.description}
                    onChange={(e) => setAchievement(i, "description", e.target.value)}
                    placeholder="What you did"
                    rows={2}
                    maxLength={1000}
                    className="w-full rounded-md border border-green/15 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 resize-none"
                  />
                  <Input
                    value={a.link}
                    onChange={(e) => setAchievement(i, "link", e.target.value)}
                    placeholder="https://github.com/… or Drive link"
                    className="h-10 border-green/15 focus-visible:ring-green/30"
                  />
                </div>
              ))}
              {achievements.length < 5 && (
                <button
                  type="button"
                  onClick={() => setAchievements([...achievements, { title: "", description: "", link: "" }])}
                  className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add an achievement
                </button>
              )}
            </div>
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
