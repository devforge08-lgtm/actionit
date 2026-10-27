"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

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
  const startSignUp = params.get("signup") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(startSignUp);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`;

  async function signInWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    if (error) setError(error.message);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (isSignUp) {
      if (password.length < 8) {
        setLoading(false);
        return setError("Password must be at least 8 characters");
      }

      // Try signing up
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectTo,
        },
      });

      // Handle signup errors
      if (signUpError) {
        const msg = signUpError.message.toLowerCase();

        // User already exists → try signing them in
        if (msg.includes("already") || msg.includes("exists")) {
          const { error: loginErr } =
            await supabase.auth.signInWithPassword({ email, password });
          setLoading(false);
          if (loginErr) {
            return setError("An account with this email already exists. Check your password.");
          }
          router.push(next);
          router.refresh();
          return;
        }

        // Email sending failed — account may still have been created
        // Try signing in anyway (works when email confirmation is off)
        if (msg.includes("email") || msg.includes("confirmation") || msg.includes("sending")) {
          const { error: autoErr } =
            await supabase.auth.signInWithPassword({ email, password });
          if (!autoErr) {
            router.push("/onboarding");
            router.refresh();
            return;
          }
          // Account exists but needs confirmation — can't auto-login
          setLoading(false);
          return setError("Account created but we couldn't send a confirmation email. Try logging in — if your project has email confirmation off, it should work.");
        }

        setLoading(false);
        return setError(signUpError.message);
      }

      // If signup returned a session, user is auto-confirmed → go straight in
      if (data.session) {
        router.push("/onboarding");
        router.refresh();
        return;
      }

      // If no session but user exists (fake signup, email already taken)
      if (data.user && data.user.identities?.length === 0) {
        const { error: loginErr } =
          await supabase.auth.signInWithPassword({ email, password });
        setLoading(false);
        if (loginErr) {
          return setError("An account with this email already exists. Try logging in instead.");
        }
        router.push(next);
        router.refresh();
        return;
      }

      // Email confirmation required — auto-sign-in after confirm
      // For now, try to sign in immediately (works if email confirm is off)
      const { error: autoLoginErr } =
        await supabase.auth.signInWithPassword({ email, password });
      setLoading(false);
      if (!autoLoginErr) {
        router.push("/onboarding");
        router.refresh();
        return;
      }
      // If auto-login fails, they need to confirm email first
      setError("Check your email to confirm your account, then come back and log in.");
      setIsSignUp(false);
      return;
    }

    // Regular login
    const { error: loginErr } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (loginErr) {
      setLoading(false);
      setError(
        loginErr.message === "Invalid login credentials"
          ? "Wrong email or password"
          : loginErr.message,
      );
      return;
    }
    router.push(next);
    router.refresh();
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4 pt-20 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-green/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 right-0 w-[300px] h-[300px] bg-green/3 rounded-full blur-[80px]" />
      </div>

      <div className="relative w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-3 w-3 rounded-full bg-green inline-block" />
            <span className="text-lg font-semibold tracking-tight">ActionIT</span>
          </div>
          <h1 className="text-2xl font-bold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isSignUp
              ? "Start earning with real micro-gigs."
              : "Log in to continue where you left off."}
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-green/10 bg-card/60 backdrop-blur-sm p-6 space-y-5">
          {/* Google button */}
          <Button
            variant="outline"
            className="w-full h-11 border-green/15 hover:bg-green/5 transition-colors"
            onClick={signInWithGoogle}
          >
            <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-green/10" />
            <span className="text-xs text-muted-foreground">or with email</span>
            <div className="flex-1 h-px bg-green/10" />
          </div>

          {/* Student or business is asked once, on the next screen (onboarding) */}
          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              type="email"
              placeholder="you@college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="h-11 border-green/15 focus-visible:ring-green/30"
            />
            <Input
              type="password"
              placeholder={isSignUp ? "Create a password (8+ chars)" : "Password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={isSignUp ? "new-password" : "current-password"}
              className="h-11 border-green/15 focus-visible:ring-green/30"
            />
            <Button
              type="submit"
              className="w-full h-11 bg-green text-green-foreground hover:bg-green/90 font-medium"
              disabled={loading}
            >
              {loading ? (
                "Please wait…"
              ) : isSignUp ? (
                <>
                  Create account <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                "Log in"
              )}
            </Button>
          </form>

          {error && (
            <p className="text-sm text-red-400 bg-red-400/10 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Toggle */}
        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? "Already have an account?" : "New to ActionIT?"}{" "}
          <button
            type="button"
            className="text-green hover:underline font-medium"
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
            }}
          >
            {isSignUp ? "Log in" : "Sign up"}
          </button>
        </p>
      </div>
    </main>
  );
}
