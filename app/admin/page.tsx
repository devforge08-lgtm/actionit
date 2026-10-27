import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Num, SectionLabel } from "@/components/brand/primitives";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Building2, ExternalLink } from "lucide-react";
import { setCompanyVerified } from "./actions";

type AdminCompany = {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  verified: boolean;
  verified_at: string | null;
  created_at: string;
  owner_name: string | null;
  owner_email: string | null;
  gig_count: number;
  live_gig_count: number;
};

const FILTERS = [
  { key: "pending", label: "Not verified" },
  { key: "verified", label: "Verified" },
  { key: "all", label: "All" },
] as const;

type Filter = (typeof FILTERS)[number]["key"];

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; error?: string }>;
}) {
  const { show, error } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/admin");

  // Non-admins get a 404 so the page doesn't advertise itself
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) notFound();

  const { data, error: loadError } = await supabase.rpc("admin_list_companies");
  const companies = (data ?? []) as AdminCompany[];

  const filter: Filter = FILTERS.some((f) => f.key === show) ? (show as Filter) : "pending";
  const counts: Record<Filter, number> = {
    pending: companies.filter((c) => !c.verified).length,
    verified: companies.filter((c) => c.verified).length,
    all: companies.length,
  };
  const shown = companies.filter((c) =>
    filter === "all" ? true : filter === "verified" ? c.verified : !c.verified
  );

  return (
    <main className="flex-1 px-4 sm:px-6 lg:px-8 pt-24 pb-16">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="space-y-4">
          <SectionLabel index="01">Admin</SectionLabel>
          <h1 className="brand-display text-3xl sm:text-4xl">Companies</h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
            Students earn half the Proof Score points on gigs from companies that
            aren&apos;t verified. Verify a company once you&apos;ve confirmed it&apos;s real.
          </p>
        </div>

        {(error || loadError) && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm">
            Something went wrong: {error ?? loadError?.message}
          </div>
        )}

        <nav className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "pending" ? "/admin" : `/admin?show=${f.key}`}
              className={`flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition-colors ${
                filter === f.key
                  ? "border-green/30 bg-green/10 text-green"
                  : "border-white/[0.08] text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              {f.label}
              <Num className="text-xs">{counts[f.key]}</Num>
            </Link>
          ))}
        </nav>

        {shown.length === 0 ? (
          <div className="text-center py-16 space-y-3">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center mx-auto">
              <Building2 className="h-7 w-7 text-green" />
            </div>
            <p className="text-muted-foreground">
              {filter === "pending" ? "Every company is verified." : "No companies here."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {shown.map((c) => (
              <div
                key={c.id}
                className="brand-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-medium truncate">{c.name}</h2>
                    {c.verified ? (
                      <span className="brand-eyebrow inline-flex items-center gap-1 text-green">
                        <BadgeCheck className="h-3.5 w-3.5" />
                        Verified
                      </span>
                    ) : (
                      <span className="brand-eyebrow text-muted-foreground">Not verified</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {c.owner_name ?? "No name"}
                    {c.owner_email && <> · {c.owner_email}</>}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>
                      Joined <Num>{formatDate(c.created_at)}</Num>
                    </span>
                    <span>
                      <Num>{c.gig_count}</Num> gigs · <Num>{c.live_gig_count}</Num> live
                    </span>
                    {c.verified && c.verified_at && (
                      <span>
                        Verified <Num>{formatDate(c.verified_at)}</Num>
                      </span>
                    )}
                    {c.website && (
                      <a
                        href={c.website.startsWith("http") ? c.website : `https://${c.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-green hover:underline"
                      >
                        Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>

                <form action={setCompanyVerified.bind(null, c.id, !c.verified)}>
                  {c.verified ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-white/10 hover:bg-white/[0.04]"
                    >
                      Unverify
                    </Button>
                  ) : (
                    <Button size="sm" className="bg-green text-green-foreground hover:bg-green/90">
                      Verify
                    </Button>
                  )}
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
