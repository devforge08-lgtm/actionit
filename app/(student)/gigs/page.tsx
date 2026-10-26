import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatReward, formatDeadline } from "@/lib/format";
import { Num, SectionLabel } from "@/components/brand/primitives";
import {
  MapPin,
  Clock,
  Wifi,
  Search,
  Briefcase,
  Users,
} from "lucide-react";

export const metadata = {
  title: "Gigs for students | ActionIT",
  description:
    "Real tasks from real companies. Prove your skills and get hired.",
};

export default async function GigBoard() {
  const supabase = await createClient();
  const { data: gigs } = await supabase
    .from("gigs")
    .select(
      "id, title, description, reward_type, reward_amount, deadline, is_remote, location, max_applicants, companies(name, verified), submissions(count)"
    )
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-4">
        <SectionLabel index="01">Browse</SectionLabel>
        <h1 className="brand-display text-3xl sm:text-4xl">Open gigs</h1>
      </div>
        <p className="text-sm text-muted-foreground mt-1">
          Do real work. Build proof. Get noticed.
        </p>
      </div>

      {!gigs?.length ? (
        <div className="flex flex-col items-center text-center py-16 space-y-4">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-green/15 to-emerald-900/10 shadow-[0_0_40px_rgba(123,196,127,0.08)]">
            <Search className="h-8 w-8 text-green" />
          </div>
          <h2 className="text-lg font-semibold">No open gigs right now</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            Check back soon — businesses are always posting new tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {gigs.map((g) => {
            const company = g.companies as unknown as {
              name: string;
              verified: boolean;
            } | null;

            return (
              <Link
                key={g.id}
                href={`/gigs/${g.id}`}
                className="block rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent p-5 transition-all duration-200 hover:from-green/[0.04] hover:border-green/15 hover:shadow-[0_0_30px_rgba(123,196,127,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1 min-w-0 flex-1">
                    <h2 className="font-medium truncate">{g.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {company?.name}
                      {company?.verified && (
                        <span className="text-green ml-1">✓</span>
                      )}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-green whitespace-nowrap">
                    <Num>{formatReward(g.reward_type, g.reward_amount)}</Num>
                  </span>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                  {g.description}
                </p>
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    {g.is_remote ? (
                      <Wifi className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    {g.is_remote ? "Remote" : g.location}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDeadline(g.deadline)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {(() => {
                      const count = (g.submissions as unknown as { count: number }[])?.[0]?.count ?? 0;
                      const left = g.max_applicants - count;
                      return left <= 1
                        ? <span className="text-amber-400">{left} spot left</span>
                        : `${left} spots left`;
                    })()}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
