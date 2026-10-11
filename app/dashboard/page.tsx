import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";

export default async function Dashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles").select("role, full_name, username").eq("id", user.id).single();
  if (!profile?.role) redirect("/onboarding");

  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  const isCompany = profile.role === "company";

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hey {profile.full_name} 👋</h1>
        <p className="text-muted-foreground">
          {profile.role} · @{profile.username}
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        {isCompany ? (
          <>
            <Button asChild><Link href="/company/gigs/new">Post a gig</Link></Button>
            <Button asChild variant="outline"><Link href="/company/gigs">Your gigs & submissions</Link></Button>
          </>
        ) : (
          <>
            <Button asChild><Link href="/gigs">Browse gigs</Link></Button>
            <Button asChild variant="outline"><Link href="/submissions">My submissions</Link></Button>
          </>
        )}
      </div>

      <form action={signOut}>
        <Button variant="ghost">Sign out</Button>
      </form>
    </main>
  );
}
