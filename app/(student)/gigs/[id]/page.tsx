import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import { formatReward, formatDeadline } from "@/lib/format";
import ApplyForm from "./apply-form";
import {
  ArrowLeft,
  MapPin,
  Clock,
  Wifi,
  ExternalLink,
  CheckCircle2,
  Users,
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
  const user = await getSessionUser(supabase);

  let role: string | null = null;
  let application: { id: string; status: string } | null = null;
  let activeGigs = 0;
  if (user) {
    const [{ data: p }, { data: s }, { data: active }] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", user.id).single(),
      supabase
        .from("submissions")
        .select("id, status")
        .eq("gig_id", id)
        .eq("student_id", user.id)
        .maybeSingle(),
      supabase.rpc("my_active_gig_count"),
    ]);
    role = p?.role ?? null;
    if (role === "student") application = s;
    activeGigs = active ?? 0;
  }
  const slotsLeft = gig.max_applicants - gig.accepted_count;
  const pastDeadline = !!gig.deadline && new Date(gig.deadline) <= new Date();
  const isOwner = user?.id === company.owner_id;
  const open = gig.status === "published" && !pastDeadline && slotsLeft > 0;

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
          <span className={"inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium " + (slotsLeft <= 1 ? "bg-amber-400/10 text-amber-400" : "bg-white/[0.03] border border-white/[0.06] text-muted-foreground")}>
            <Users className="h-3.5 w-3.5" />
            {slotsLeft <= 0 ? "All spots taken" : slotsLeft === 1 ? "1 spot left" : `${slotsLeft} spots left`}
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
              Review applicants
            </Link>
          ) : application ? (
            <ApplicationStatus
              gigId={gig.id}
              submissionId={application.id}
              status={application.status}
              pastDeadline={pastDeadline}
            />          ) : !open ? (
            <button
              disabled
              className="px-5 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
            >
              {slotsLeft <= 0 ? "All spots filled" : "This gig is closed"}
            </button>
          ) : !user ? (
            <Link
              href={`/login?next=/gigs/${gig.id}`}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green text-green-foreground text-sm font-medium hover:bg-green/90 transition-colors"
            >
              Log in to apply
            </Link>
          ) : role === "student" && activeGigs >= MAX_ACTIVE_GIGS ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                You already have {MAX_ACTIVE_GIGS} gigs going, which is the most at once so you can give each one
                your best work. Finish one or withdraw from one, then you can apply here.
              </p>
              <Link href="/submissions" className={`${btn} border border-green/15 hover:bg-green/5`}>
                View My gigs
              </Link>
            </div>
          ) : role === "student" ? (
            <ApplyForm gigId={gig.id} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Kept in step with active_gig_count() in notifications_and_gig_limit.sql */
const MAX_ACTIVE_GIGS = 2;

const btn =
  "inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors";

/** What a student who already applied sees instead of the apply button. */
function ApplicationStatus({
  gigId,
  submissionId,
  status,
  pastDeadline,
}: {
  gigId: string;
  submissionId: string;
  status: string;
  pastDeadline: boolean;
}) {
  if (status === "applied") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          You've applied. The business is looking at applicants and will accept up to 3.
        </p>
        <Link href="/submissions?tab=applied" className={`${btn} border border-green/15 hover:bg-green/5`}>
          View in My gigs
        </Link>
      </div>
    );
  }
  if (status === "declined") {
    return (
      <p className="text-sm text-muted-foreground">
        The business went with other students for this one. Keep applying, every gig is a fresh shot.
      </p>
    );
  }
  if (status === "accepted") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-green">You're in! The business accepted you for this gig.</p>
        {pastDeadline && (
          <p className="text-sm text-muted-foreground">The deadline has passed without your work.</p>
        )}
        <div className="flex flex-wrap gap-2">
          {!pastDeadline && (
            <Link href={`/gigs/${gigId}/submit`} className={`${btn} bg-green text-green-foreground hover:bg-green/90`}>
              Submit your work
            </Link>
          )}
          <Link href={`/submissions/${submissionId}/chat`} className={`${btn} border border-green/15 hover:bg-green/5`}>
            Chat with the business
          </Link>
        </div>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap gap-2">
      <Link href="/submissions" className={`${btn} border border-green/15 hover:bg-green/5`}>
        You've sent your work · View status
      </Link>
      <Link href={`/submissions/${submissionId}/chat`} className={`${btn} border border-green/15 hover:bg-green/5`}>
        {status === "selected" || status === "rejected" ? "View chat history" : "Chat with the business"}
      </Link>
    </div>
  );
}
