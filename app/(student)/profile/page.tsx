import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import ProfileForm from "./profile-form";

export default async function ProfilePage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login");

  const [{ data: profile }, { data: submissions }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("submissions").select("status").eq("student_id", user.id),
  ]);
  if (!profile) redirect("/onboarding");
  if (profile.role === "company") redirect("/company");

  const stats = {
    total: submissions?.length ?? 0,
    selected: submissions?.filter((s) => s.status === "selected").length ?? 0,
  };

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      {/* Profile header card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-green/[0.06] to-transparent p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(123,196,127,0.06),transparent_60%)]" />
        <div className="relative flex items-start gap-4">
          <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-green/20 to-emerald-900/20 flex items-center justify-center text-2xl font-semibold text-green shrink-0 shadow-[0_0_20px_rgba(123,196,127,0.1)]">
            {(profile.full_name || profile.username || "?")
              .charAt(0)
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">
              {profile.full_name || profile.username}
            </h2>
            <p className="text-sm text-muted-foreground">
              @{profile.username}
            </p>
            {profile.college && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {profile.college}
              </p>
            )}
            <div className="flex gap-4 mt-3">
              <div className="text-center">
                <div className="text-lg font-semibold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">
                  Submissions
                </div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green">
                  {stats.selected}
                </div>
                <div className="text-xs text-muted-foreground">Selected</div>
              </div>
            </div>
          </div>
        </div>

        {profile.skills?.length > 0 && (
          <div className="relative flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/[0.06]">
            {profile.skills.map((skill: string) => (
              <span
                key={skill}
                className="px-2.5 py-1 rounded-lg bg-green/10 text-green text-xs font-medium"
              >
                {skill}
              </span>
            ))}
          </div>
        )}

        {profile.bio && (
          <p className="relative text-sm text-muted-foreground mt-4 pt-4 border-t border-white/[0.06]">
            {profile.bio}
          </p>
        )}
      </div>

      {/* Public link */}
      <div className="rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent px-5 py-3 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs text-muted-foreground">
            Your public profile
          </div>
          <div className="text-sm font-medium text-green truncate">
            actionit.in/@{profile.username}
          </div>
        </div>
        <span className="text-xs text-muted-foreground bg-white/[0.03] border border-white/[0.06] rounded-lg px-2.5 py-1">
          Coming soon
        </span>
      </div>

      <ProfileForm profile={profile} />
    </div>
  );
}
