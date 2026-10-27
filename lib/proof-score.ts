/**
 * Proof Score tiers. The score itself is worked out in the database
 * (supabase/migrations/proof_score.sql); keep these numbers in sync with
 * refresh_proof_score() there.
 */
export type ProofTier = "starter" | "rising" | "proven" | "elite";

export const PROOF_MAX = 1000;

export const TIERS: {
  id: ProofTier;
  name: string;
  minScore: number;
  minGigs: number;
  minWins: number;
  minRating: number;
  color: string;
}[] = [
  { id: "starter", name: "Starter", minScore: 0, minGigs: 0, minWins: 0, minRating: 0, color: "text-zinc-400" },
  { id: "rising", name: "Rising", minScore: 200, minGigs: 10, minWins: 1, minRating: 0, color: "text-blue-400" },
  { id: "proven", name: "Proven", minScore: 500, minGigs: 15, minWins: 5, minRating: 7, color: "text-green" },
  { id: "elite", name: "Elite", minScore: 800, minGigs: 25, minWins: 7, minRating: 8, color: "text-amber-400" },
];

export function tierInfo(tier: string | null | undefined) {
  return TIERS.find((t) => t.id === tier) ?? TIERS[0];
}

export type ProofStats = {
  score: number;
  gigs: number;
  wins: number;
  rating: number | null;
};

/** What's still missing to reach the next tier, or null at Elite. */
export function nextTierProgress(tier: string | null | undefined, stats: ProofStats) {
  const i = TIERS.findIndex((t) => t.id === tierInfo(tier).id);
  const next = TIERS[i + 1];
  if (!next) return null;

  const missing: string[] = [];
  if (stats.score < next.minScore) missing.push(`${next.minScore - stats.score} more points`);
  if (stats.gigs < next.minGigs) {
    const n = next.minGigs - stats.gigs;
    missing.push(`${n} more rated gig${n === 1 ? "" : "s"}`);
  }
  if (stats.wins < next.minWins) {
    const n = next.minWins - stats.wins;
    missing.push(`${n} more win${n === 1 ? "" : "s"}`);
  }
  if (next.minRating && (stats.rating ?? 0) < next.minRating) {
    missing.push(`an average rating of ${next.minRating}+`);
  }

  const parts = [
    stats.score / next.minScore,
    next.minGigs ? stats.gigs / next.minGigs : 1,
    next.minWins ? stats.wins / next.minWins : 1,
    next.minRating ? (stats.rating ?? 0) / next.minRating : 1,
  ].map((p) => Math.min(1, p));
  const percent = Math.round((parts.reduce((a, b) => a + b, 0) / parts.length) * 100);

  return { next, missing, percent };
}
