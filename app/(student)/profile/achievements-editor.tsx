"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { addAchievement, deleteAchievement, updateAchievement } from "./achievement-actions";
import { linkLabel, MAX_ACHIEVEMENTS, type Achievement } from "@/lib/achievements";

const inputClass =
  "w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 focus:border-green/20";

function AchievementForm({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial?: Achievement;
  onSave: (input: { title: string; description: string; link: string }) => Promise<{ error?: string } | undefined>;
  onCancel?: () => void;
  saveLabel: string;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [link, setLink] = useState(initial?.link ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const res = await onSave({ title, description, link });
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-4">
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className={inputClass}
        placeholder="What did you make? e.g. Expense tracker app, College fest aftermovie"
        maxLength={100}
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        className={`${inputClass} resize-none`}
        placeholder="What it is, what you did, tools you used"
        maxLength={1000}
      />
      <input
        value={link}
        onChange={(e) => setLink(e.target.value)}
        className={inputClass}
        placeholder="GitHub repo for code, Drive / YouTube link for edits"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={save}
          disabled={pending}
          className="px-4 py-2 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50"
        >
          {pending ? "Saving…" : saveLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}

export default function AchievementsEditor({ items }: { items: Achievement[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [deleting, startDelete] = useTransition();

  async function done<T extends { error?: string }>(res: T) {
    if (!res.error) {
      setAdding(false);
      setEditing(null);
      router.refresh();
    }
    return res;
  }

  return (
    <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 space-y-4">
      <div>
        <h2 className="font-semibold">
          Achievements{" "}
          <span className="text-muted-foreground font-normal text-sm">
            ({items.length}/{MAX_ACHIEVEMENTS})
          </span>
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Projects, edits and anything else you've made. Businesses see these when you apply to their gigs.
        </p>
      </div>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((a) =>
            editing === a.id ? (
              <li key={a.id}>
                <AchievementForm
                  initial={a}
                  saveLabel="Save"
                  onSave={async (input) => done(await updateAchievement(a.id, input))}
                  onCancel={() => setEditing(null)}
                />
              </li>
            ) : (
              <li key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 space-y-1.5">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-sm font-medium">{a.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditing(a.id)}
                      aria-label="Edit"
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={deleting}
                      aria-label="Delete"
                      onClick={() => {
                        if (!confirm(`Delete "${a.title}"?`)) return;
                        startDelete(async () => {
                          await deleteAchievement(a.id);
                          router.refresh();
                        });
                      }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-white/[0.04] transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                {a.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
                )}
                <a
                  href={a.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="brand-eyebrow text-green hover:underline inline-flex items-center gap-1"
                >
                  {linkLabel(a.link)}
                  <ExternalLink className="h-3 w-3" />
                </a>
              </li>
            )
          )}
        </ul>
      )}

      {adding ? (
        <AchievementForm
          saveLabel="Add"
          onSave={async (input) => done(await addAchievement(input))}
          onCancel={() => setAdding(false)}
        />
      ) : (
        items.length < MAX_ACHIEVEMENTS && (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add an achievement
          </button>
        )
      )}
    </div>
  );
}
