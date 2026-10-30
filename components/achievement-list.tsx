import { ExternalLink } from "lucide-react";
import { linkLabel, type Achievement } from "@/lib/achievements";

/** Read-only list of a student's achievements, used where businesses review them. */
export default function AchievementList({ items }: { items: Achievement[] }) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">No achievements added yet.</p>;
  }
  return (
    <ul className="space-y-2">
      {items.map((a) => (
        <li key={a.id} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-1">
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium">{a.title}</span>
            <a
              href={a.link}
              target="_blank"
              rel="noopener noreferrer"
              className="brand-eyebrow text-green hover:underline inline-flex items-center gap-1 shrink-0"
            >
              {linkLabel(a.link)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          {a.description && (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{a.description}</p>
          )}
        </li>
      ))}
    </ul>
  );
}
