"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const supabase = createClient();
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";

  const [mode, setMode] = useState<"link" | "password">("link");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [sent, setSent] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({ provider: "google", options: { redirectTo } });
    if (error) setError(error.message);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  async function signInWithPassword(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      if (password.length < 8) {
        setLoading(false);
        return setError("Password must be at least 8 characters");
      }
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      setLoading(false);
      if (error) return setError(error.message);
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
      } else {
        setSent(true); // email confirmation is on: user must click the link first
      }
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      setError(error.message === "Invalid login credentials" ? "Wrong email or password" : error.message);
      return;
    }
    // dashboard sends users without a role to /onboarding
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle className="text-2xl">Welcome to ActionIT</CardTitle>
          <CardDescription>Prove your skills. Get hired.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full" onClick={signInWithGoogle}>
            Continue with Google
          </Button>

          <div className="text-center text-xs text-muted-foreground">or</div>

          <div className="grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
            {(["link", "password"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setSent(false); }}
                className={`rounded py-1.5 transition ${mode === m ? "bg-background shadow-sm font-medium" : "text-muted-foreground"}`}
              >
                {m === "link" ? "Email link" : "Password"}
              </button>
            ))}
          </div>

          {mode === "link" ? (
            sent ? (
              <p className="text-sm text-center">
                Check <strong>{email}</strong> for a login link.
              </p>
            ) : (
              <form onSubmit={sendMagicLink} className="space-y-3">
                <Input type="email" placeholder="you@college.edu" value={email}
                  onChange={(e) => setEmail(e.target.value)} required />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending…" : "Email me a login link"}
                </Button>
              </form>
            )
          ) : sent ? (
            <p className="text-sm text-center">
              Account created! Check <strong>{email}</strong> to confirm it, then log in.
            </p>
          ) : (
            <form onSubmit={signInWithPassword} className="space-y-3">
              <Input type="email" placeholder="you@college.edu" value={email}
                onChange={(e) => setEmail(e.target.value)} required />
              <Input type="password" placeholder={isSignUp ? "Create a password (8+ characters)" : "Password"}
                value={password} onChange={(e) => setPassword(e.target.value)} required
                autoComplete={isSignUp ? "new-password" : "current-password"} />
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Please wait…" : isSignUp ? "Create account" : "Log in"}
              </Button>
              <p className="text-center text-sm text-muted-foreground">
                {isSignUp ? "Already have an account?" : "New to ActionIT?"}{" "}
                <button type="button" className="underline text-foreground"
                  onClick={() => { setIsSignUp(!isSignUp); setError(null); }}>
                  {isSignUp ? "Log in" : "Sign up"}
                </button>
              </p>
            </form>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </CardContent>
      </Card>
    </main>
  );
}
