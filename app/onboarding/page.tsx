import { redirect } from "next/navigation";
import { createClient, getSessionUser } from "@/lib/supabase/server";
import OnboardingForm from "./onboarding-form";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const user = await getSessionUser(supabase);
  if (!user) redirect("/login?next=/onboarding");

  const [{ data: profile }, { data: company }] = await Promise.all([
    supabase.from("profiles").select("role, full_name, username").eq("id", user.id).single(),
    supabase.from("companies").select("name").eq("owner_id", user.id).maybeSingle(),
  ]);

  // Already set up: skip straight to the right dashboard
  if (profile?.role === "student") redirect("/dashboard");
  if (profile?.role === "company" && company) redirect("/company");

  return (
    <OnboardingForm
      defaultName={profile?.full_name ?? ""}
      defaultUsername={profile?.username ?? ""}
      defaultCompany={company?.name ?? ""}
    />
  );
}
