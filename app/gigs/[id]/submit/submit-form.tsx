"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createSubmission } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const MAX_FILES = 5;
const MAX_MB = 10;

function safeName(name: string) {
  const dot = name.lastIndexOf(".");
  const base = (dot > 0 ? name.slice(0, dot) : name).replace(/[^a-zA-Z0-9-_]+/g, "-").slice(0, 50);
  const ext = dot > 0 ? name.slice(dot).replace(/[^a-zA-Z0-9.]/g, "") : "";
  return `${Date.now()}-${base}${ext}`;
}

export default function SubmitForm({ gigId, userId }: { gigId: string; userId: string }) {
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
    if (picked.length + files.length > MAX_FILES) return setError(`Max ${MAX_FILES} files`);
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
        const { error: upErr } = await supabase.storage.from("submissions").upload(path, file);
        if (upErr) throw new Error(`Upload failed for ${file.name}: ${upErr.message}`);
        uploaded.push(path);
      }
      setStatus("Submitting…");
      const res = await createSubmission({ gigId, note: note.trim(), links: cleanLinks, filePaths: uploaded });
      if (res?.error) throw new Error(res.error);
    } catch (err) {
      // clean up any uploaded files if the submission failed
      if (uploaded.length) await supabase.storage.from("submissions").remove(uploaded);
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
      setStatus(null);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="note">Your note</Label>
        <Textarea id="note" rows={6} value={note} onChange={(e) => setNote(e.target.value)}
          placeholder="Explain your approach, decisions, what you'd do with more time…" />
      </div>

      <div className="space-y-2">
        <Label>Links</Label>
        {links.map((l, i) => (
          <div key={i} className="flex gap-2">
            <Input value={l} placeholder="https://github.com/… or Figma / Drive link"
              onChange={(e) => setLinks(links.map((x, j) => (j === i ? e.target.value : x)))} />
            {links.length > 1 && (
              <Button type="button" variant="ghost" onClick={() => setLinks(links.filter((_, j) => j !== i))}>✕</Button>
            )}
          </div>
        ))}
        {links.length < 5 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setLinks([...links, ""])}>+ Add link</Button>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="files">Files (up to {MAX_FILES}, {MAX_MB}MB each)</Label>
        <Input id="files" type="file" multiple onChange={onFiles} />
        {files.length > 0 && (
          <ul className="text-sm space-y-1">
            {files.map((f, i) => (
              <li key={i} className="flex items-center justify-between rounded border px-3 py-1">
                <span className="truncate">{f.name}</span>
                <button type="button" className="text-muted-foreground hover:text-foreground"
                  onClick={() => setFiles(files.filter((_, j) => j !== i))}>remove</button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <Button type="submit" disabled={busy} className="w-full">
        {busy ? status ?? "Submitting…" : "Submit proof-of-work"}
      </Button>
    </form>
  );
}
