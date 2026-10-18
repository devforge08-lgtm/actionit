"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateProfile } from "./actions";
import {
  Save,
  CheckCircle2,
  X,
} from "lucide-react";

interface Profile {
  full_name: string | null;
  username: string;
  bio: string | null;
  college: string | null;
  skills: string[] | null;
  github: string | null;
  linkedin: string | null;
  portfolio: string | null;
}

export default function ProfileForm({ profile }: { profile: Profile }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [skillInput, setSkillInput] = useState("");
  const [skills, setSkills] = useState<string[]>(profile.skills ?? []);

  function addSkill() {
    const s = skillInput.trim();
    if (!s || skills.length >= 15 || skills.includes(s)) return;
    setSkills([...skills, s]);
    setSkillInput("");
  }

  function removeSkill(skill: string) {
    setSkills(skills.filter((s) => s !== skill));
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addSkill();
    }
  }

  function onSubmit(formData: FormData) {
    formData.set("skills", skills.join(","));
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const res = await updateProfile(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        setSaved(true);
        router.refresh();
        setTimeout(() => setSaved(false), 3000);
      }
    });
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 focus:border-green/20";

  return (
    <form action={onSubmit} className="space-y-6">
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 space-y-5">
        <h2 className="font-semibold">Edit profile</h2>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label
              htmlFor="full_name"
              className="text-sm font-medium text-foreground"
            >
              Full name
            </label>
            <input
              id="full_name"
              name="full_name"
              defaultValue={profile.full_name ?? ""}
              required
              className={inputClass}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="username"
              className="text-sm font-medium text-foreground"
            >
              Username
            </label>
            <input
              id="username"
              name="username"
              defaultValue={profile.username}
              required
              className={inputClass}
              placeholder="username"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="college"
            className="text-sm font-medium text-foreground"
          >
            College / University
          </label>
          <input
            id="college"
            name="college"
            defaultValue={profile.college ?? ""}
            className={inputClass}
            placeholder="e.g. IIT Bombay"
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="bio"
            className="text-sm font-medium text-foreground"
          >
            Bio
          </label>
          <textarea
            id="bio"
            name="bio"
            rows={3}
            defaultValue={profile.bio ?? ""}
            className={`${inputClass} resize-none`}
            placeholder="A short intro — what you're into, what you're looking for"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">
            Skills{" "}
            <span className="text-muted-foreground font-normal">
              ({skills.length}/15)
            </span>
          </label>
          <div className="flex gap-2">
            <input
              value={skillInput}
              onChange={(e) => setSkillInput(e.target.value)}
              onKeyDown={onKeyDown}
              className={`${inputClass} flex-1`}
              placeholder="Type a skill and press Enter"
            />
            <button
              type="button"
              onClick={addSkill}
              disabled={!skillInput.trim() || skills.length >= 15}
              className="px-4 py-2.5 rounded-xl border border-white/[0.06] text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-colors disabled:opacity-40"
            >
              Add
            </button>
          </div>
          {skills.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {skills.map((s) => (
                <span
                  key={s}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-green/10 text-green text-xs font-medium group"
                >
                  {s}
                  <button
                    type="button"
                    onClick={() => removeSkill(s)}
                    className="opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <input type="hidden" name="skills" value={skills.join(",")} />
        </div>
      </div>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 space-y-5">
        <h2 className="font-semibold">Links</h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">GitHub</span>
            <input
              name="github"
              defaultValue={profile.github ?? ""}
              className={inputClass}
              placeholder="https://github.com/username"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">LinkedIn</span>
            <input
              name="linkedin"
              defaultValue={profile.linkedin ?? ""}
              className={inputClass}
              placeholder="https://linkedin.com/in/username"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">Portfolio</span>
            <input
              name="portfolio"
              defaultValue={profile.portfolio ?? ""}
              className={inputClass}
              placeholder="https://your-portfolio.com"
            />
          </div>
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}
      {saved && (
        <p className="text-sm text-green bg-green/10 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Profile saved
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-green to-emerald-500 text-green-foreground text-sm font-medium hover:shadow-[0_0_20px_rgba(123,196,127,0.3)] transition-all disabled:opacity-50"
      >
        <Save className="h-4 w-4" />
        {pending ? "Saving…" : "Save changes"}
      </button>
    </form>
  );
}
