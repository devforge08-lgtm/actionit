import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatReward, formatDeadline } from "@/lib/format";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wifi,
  ExternalLink,
  CheckCircle2,
} from "lucide-react";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: gig } = await supabase
    .from("gigs")
    .select("title, description, companies(name)")
    .eq("id", id)
    .single();
  if (!gig) return {};
  const company = gig.companies as unknown as { name: string } | null;
  return {
    title: `${gig.title} at ${company?.name} | ActionIT`,
    description: gig.description.slice(0, 155),
  };
}

export default async function GigPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: gig } = await supabase
    .from("gigs")
    .select("*, companies(name, verified, website, owner_id)")
    .eq("id", id)
    .single();
  if (!gig) notFound();

  const company = gig.companies as unknown as {
    name: string;
    verified: boolean;
    website: string | null;
    owner_id: string;
  };
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let role: string | null = null;
  let alreadySubmitted = false;
  if (user) {
    const { data: p } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    role = p?.role ?? null;
    if (role === "student") {
      const { data: s } = await supabase
        .from("submissions")
        .select("id")
        .eq("gig_id", id)
        .eq("student_id", user.id)
        .maybeSingle();
      alreadySubmitted = !!s;
    }
  }
  const isOwner = user?.id === company.owner_id;
  const open =
    gig.status === "published" &&
    (!gig.deadline || new Date(gig.deadline) > new Date());

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/gigs"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-green transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        All gigs
      </Link>

      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.02] to-transparent p-6 space-y-5">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold">{gig.title}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">
              {company.name}
            </span>
            {company.verified && (
              <CheckCircle2 className="h-4 w-4 text-green" />
            )}
            {company.website && (
              <>
                <span>·</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-green transition-colors inline-flex items-center gap-1"
                >
                  website
                  <ExternalLink className="h-3 w-3" />
                </a>
              </>
            )}
          </div>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green/10 text-green text-sm font-medium">
            {formatReward(gig.reward_type, gig.reward_amount)}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-muted-foreground">
            {gig.is_remote ? (
              <Wifi className="h-3.5 w-3.5" />
            ) : (
              <MapPin className="h-3.5 w-3.5" />
            )}
            {gig.is_remote ? "Remote" : gig.location}
          </span>
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {formatDeadline(gig.deadline)}
          </span>
          {gig.status !== "published" && (
            <span className="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-400/10 text-amber-400 text-sm font-medium uppercase">
              {gig.status}
            </span>
          )}
        </div>

        {/* Description */}
        <div className="space-y-2 border-t border-white/[0.06] pt-5">
          <h2 className="font-semibold">The task</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {gig.description}
          </p>
        </div>

        {gig.deliverables && (
          <div className="space-y-2 border-t border-white/[0.06] pt-5">
            <h2 className="font-semibold">What to submit</h2>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {gig.deliverables}
            </p>
          </div>
        )}

        {/* CTA */}
        <div className="border-t border-white/[0.06] pt-5">
          {isOwner ? (
            <Link
              href={`/company/gigs/${gig.id}/submissions`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
            >
              View submissions
            </Link>
          ) : alreadySubmitted ? (
            <Link
              href="/submissions"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-green/15 text-sm font-medium hover:bg-green/5 transition-colors"
            >
              You've submitted — View status
            </Link>
          ) : !open ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
            >
              This gig is closed
            </button>
          ) : !user ? (
            <Link
              href={`/login?next=/gigs/${gig.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
            >
              Log in to submit
            </Link>
          ) : role === "student" ? (
            <Link
              href={`/gigs/${gig.id}/submit`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
            >
              Submit your work
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
