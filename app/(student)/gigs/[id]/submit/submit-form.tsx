"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { submitWork, submitRevision } from "./actions";
import { Plus, X, Upload } from "lucide-react";

const MAX_FILES = 5;
const MAX_MB = 10;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^a-zA-Z0-9-_]+/g, "-")
    .slice(0, 50);
  const ext = dot > 0 ? name.slice(dot).replace(/[^a-zA-Z0-9.]/g, "") : "";
  return `${Date.now()}-${base}${ext}`;
}

export default function SubmitForm({
  gigId,
  userId,
  submissionId,
  revisionOf,
}: {
  gigId: string;
  userId: string;
  /** The accepted application this work is for */
  submissionId?: string;
  /** When set, this form sends changes for that submission instead */
  revisionOf?: string;
}) {
  const supabase = createClient();
  const [note, setNote] = useState("");
  const [links, setLinks] = useState<string[]>([""]);
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    const tooBig = picked.find((f) => f.size > MAX_MB * 1024 * 1024);
    if (tooBig) return setError(`${tooBig.name} is over ${MAX_MB}MB`);
    if (picked.length + files.length > MAX_FILES)
      return setError(`Max ${MAX_FILES} files`);
    setError(null);
    setFiles([...files, ...picked]);
    e.target.value = "";
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const cleanLinks = links.map((l) => l.trim()).filter(Boolean);
    if (cleanLinks.some((l) => !/^https?:\/\//i.test(l)))
      return setError("Links must start with http:// or https://");
    if (!note.trim() && !cleanLinks.length && !files.length)
      return setError("Add a note, a link or a file so they can see your work");

    setBusy(true);
    const uploaded: string[] = [];
    try {
      for (const [i, file] of files.entries()) {
        setStatus(`Uploading ${i + 1}/${files.length}…`);
        const path = `${userId}/${gigId}/${safeName(file.name)}`;
        const { error: upErr } = await supabase.storage
          .from("submissions")
          .upload(path, file);
        if (upErr)
          throw new Error(
            `Upload failed for ${file.name}: ${upErr.message}`
          );
        uploaded.push(path);
      }
      setStatus("Submitting…");
      const payload = { gigId, note: note.trim(), links: cleanLinks, filePaths: uploaded };
      const res = revisionOf
        ? await submitRevision({ ...payload, submissionId: revisionOf })
        : await submitWork({ ...payload, submissionId: submissionId! });
      if (res?.error) throw new Error(res.error);
    } catch (err) {
      if (uploaded.length)
        await supabase.storage.from("submissions").remove(uploaded);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Note */}
      <div className="space-y-2">
        <label
          htmlFor="note"
          className="text-sm font-medium text-foreground"
        >
          Your note
        </label>
        <textarea
          id="note"
          rows={6}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={
            revisionOf
              ? "What did you change? Add new links or files below."
              : "Explain your approach, decisions, what you'd do with more time…"
          }
          className="w-full rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30 resize-none"
        />
      </div>

      {/* Links */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">Links</label>
        {links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <input
              value={l}
              placeholder="https://github.com/… or Figma / Drive link"
              onChange={(e) =>
                setLinks(
                  links.map((x, j) => (j === i ? e.target.value : x))
                )
              }
              className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-green/30"
            />
            {links.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLinks(links.filter((_, j) => j !== i))
                }
                className="p-2.5 rounded-xl border border-green/10 text-muted-foreground hover:text-foreground hover:bg-card transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
        {links.length < 5 && (
          <button
            type="button"
            onClick={() => setLinks([...links, ""])}
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add link
          </button>
        )}
      </div>

      {/* Files */}
      <div className="space-y-2">
        <label
          htmlFor="files"
          className="text-sm font-medium text-foreground"
        >
          Files (up to {MAX_FILES}, {MAX_MB}MB each)
        </label>
        <label
          htmlFor="files"
          className="flex items-center justify-center gap-2 w-full rounded-xl border border-dashed border-green/15 bg-card/40 px-4 py-4 text-sm text-muted-foreground hover:border-green/30 hover:text-foreground transition-colors cursor-pointer"
        >
          <Upload className="h-4 w-4" />
          Choose files
        </label>
        <input
          id="files"
          type="file"
          multiple
          onChange={onFiles}
          className="hidden"
        />
        {files.length > 0 && (
          <ul className="text-sm space-y-1.5">
            {files.map((f, i) => (
              <li
                key={i}
                className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.03] px-4 py-2"
              >
                <span className="truncate text-foreground">{f.name}</span>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-red-400 transition-colors ml-2"
                  onClick={() =>
                    setFiles(files.filter((_, j) => j !== i))
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-400 bg-red-400/10 rounded-xl px-4 py-2.5">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy}
        className="w-full py-3 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? status ?? "Submitting…" : revisionOf ? "Send changes" : "Submit proof-of-work"}
      </button>
    </form>
  );
}
