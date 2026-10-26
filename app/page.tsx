"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import ShaderField from "@/components/brand/shader-field";
import {
  Num,
  ProofRing,
  SectionLabel,
} from "@/components/brand/primitives";
import {
  ArrowRight,
  Briefcase,
  GraduationCap,
  Star,
  TrendingUp,
  Award,
  Crown,
  ChevronDown,
  Zap,
  Shield,
  Users,
  CheckCircle2,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Scroll-reveal hook
   ───────────────────────────────────────────────────────────────── */
function useReveal(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true); },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);

  return { ref, visible };
}

function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal(0.12);
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(32px)",
        transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      }}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Magnetic button — subtle pull toward cursor
   ───────────────────────────────────────────────────────────────── */
function MagneticButton({
  children,
  href,
  className = "",
}: {
  children: React.ReactNode;
  href: string;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    setOffset({
      x: (e.clientX - cx) * 0.2,
      y: (e.clientY - cy) * 0.2,
    });
  }

  function onLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return (
    <Link
      ref={ref}
      href={href}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={{
        transform: `translate(${offset.x}px, ${offset.y}px)`,
        transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      }}
    >
      {children}
    </Link>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Interactive tilt card
   ───────────────────────────────────────────────────────────────── */
function TiltCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState({});

  function onMove(e: React.MouseEvent) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setStyle({
      transform: `perspective(600px) rotateY(${x * 8}deg) rotateX(${-y * 8}deg) scale(1.02)`,
      transition: "transform 0.15s ease",
    });
  }

  function onLeave() {
    setStyle({
      transform: "perspective(600px) rotateY(0deg) rotateX(0deg) scale(1)",
      transition: "transform 0.5s ease",
    });
  }

  return (
    <div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      className={className}
      style={style}
    >
      {children}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────
   Animated counter
   ───────────────────────────────────────────────────────────────── */
function Counter({ value, suffix = "" }: { value: number; suffix?: string }) {
  const { ref, visible } = useReveal(0.3);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!visible) return;
    let start = 0;
    const step = Math.max(1, Math.floor(value / 40));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(start);
      }
    }, 30);
    return () => clearInterval(timer);
  }, [visible, value]);

  return (
    <span ref={ref}>
      {count}
      {suffix}
    </span>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HERO
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <ShaderField />

      <div className="relative z-10 text-center px-5 space-y-8 max-w-4xl mx-auto">
        <Reveal>
          <h1 className="brand-display text-[clamp(3rem,13vw,8.5rem)]">
            Small work.
            <br />
            <span className="bg-gradient-to-r from-green via-emerald-300 to-green bg-clip-text text-transparent">
              Real proof.
            </span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="text-muted-foreground text-lg sm:text-xl max-w-xl mx-auto leading-relaxed">
            ActionIT connects college students with businesses for real
            micro-gigs. Complete tasks, build your Proof Score, and let your
            work speak louder than any resume.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="flex flex-wrap justify-center gap-4 pt-2">
            <MagneticButton
              href="/login?signup=1"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-green to-emerald-500 text-green-foreground font-semibold text-base hover:shadow-[0_0_40px_rgba(123,196,127,0.35)] transition-all duration-500"
            >
              Start earning
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
            <MagneticButton
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.08] text-foreground font-medium text-base hover:bg-white/[0.04] hover:border-green/20 transition-all duration-500"
            >
              See how it works
            </MagneticButton>
          </div>
        </Reveal>

        {/* Scroll indicator */}
        <Reveal delay={0.5}>
          <div className="pt-12 flex flex-col items-center gap-2 text-muted-foreground/50">
            <span className="text-xs tracking-widest uppercase">Scroll</span>
            <div className="h-10 w-[1px] bg-gradient-to-b from-green/40 to-transparent animate-pulse" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   STATS BAR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StatsBar() {
  return (
    <section className="py-16 px-5 flex justify-center">
      <div className="brand-panel w-fit rounded-2xl backdrop-blur-xl shadow-[0_0_40px_rgba(123,196,127,0.04)] px-10 sm:px-16 py-8">
        <div className="flex flex-col sm:flex-row items-center gap-10 sm:gap-16 text-center">
          {[
            { value: 100, suffix: "+", label: "Gig Types", note: "Design to code to data" },
            { value: 5, suffix: " min", label: "To Post", note: "Businesses go live fast" },
            { value: 1000, suffix: "", label: "Proof Score Max", note: "Your verified reputation" },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 0.1}>
              <div className="space-y-1">
                <p className="text-4xl sm:text-5xl font-semibold text-green">
                  <Num>
                    <Counter value={s.value} suffix={s.suffix} />
                  </Num>
                </p>
                <p className="brand-eyebrow">{s.label}</p>
                <p className="text-xs text-muted-foreground">{s.note}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   WHAT IS ACTIONIT
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function WhatIs() {
  const cards = [
    {
      icon: Briefcase,
      title: "Real micro-gigs",
      desc: "Short, scoped tasks from real businesses — design, development, writing, data entry, and more.",
    },
    {
      icon: Shield,
      title: "Verified proof of work",
      desc: "Every completed gig is recorded on your Proof Score. No faking it — businesses can verify instantly.",
    },
    {
      icon: Zap,
      title: "0% commission under \u20B91000",
      desc: "Gigs paying under \u20B91,000 are completely free for students. Above that, a small platform fee applies — you still keep the majority.",
    },
  ];

  return (
    <section id="for-students" className="py-24 px-5">
      <div className="max-w-5xl mx-auto space-y-16">
        <Reveal>
          <div className="max-w-2xl mx-auto space-y-5 text-center">
            <SectionLabel index="01" className="text-left">
              What it is
            </SectionLabel>
            <h2 className="brand-display text-4xl sm:text-5xl lg:text-6xl text-left">
              What is ActionIT?
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed text-left">
              A platform where college students take on real micro-gigs,
              earn real money, and build a portfolio backed by a verifiable
              Proof Score.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {cards.map((c, i) => (
            <Reveal key={c.title} delay={i * 0.12}>
              <TiltCard className="h-full rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 space-y-4 hover:border-green/15 hover:shadow-[0_0_40px_rgba(123,196,127,0.06)] transition-all duration-500">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center">
                  <c.icon className="h-5 w-5 text-green" />
                </div>
                <h3 className="font-semibold text-lg">{c.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {c.desc}
                </p>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   HOW IT WORKS — interactive tabs with animated steps
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function HowItWorks() {
  const [tab, setTab] = useState<"student" | "business">("student");
  const [activeStep, setActiveStep] = useState(0);

  const studentSteps = [
    { num: "01", title: "Sign up & set your skills", desc: "Create your profile and tag the skills you want to prove — from React to Canva to content writing." },
    { num: "02", title: "Browse & apply to gigs", desc: "Find real micro-tasks posted by businesses. Filter by skill, reward, or deadline." },
    { num: "03", title: "Complete & get paid", desc: "Deliver your work, get reviewed, and receive payment. 0% commission on gigs under \u20B91,000 — you keep every rupee." },
    { num: "04", title: "Build your Proof Score", desc: "Every completed gig raises your score. Companies can verify your track record instantly." },
  ];

  const businessSteps = [
    { num: "01", title: "Post a gig", desc: "Describe the task, set a budget, and publish. It takes under 2 minutes." },
    { num: "02", title: "Review applications", desc: "Students apply with their Proof Score visible. Pick the best fit for your task." },
    { num: "03", title: "Get it done", desc: "The student delivers. You review, give feedback, and release payment." },
    { num: "04", title: "Build your talent pool", desc: "Bookmark top performers. Rehire them for future tasks — no recruitment fees." },
  ];

  const steps = tab === "student" ? studentSteps : businessSteps;

  useEffect(() => {
    setActiveStep(0);
    const timer = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % 4);
    }, 6000);
    return () => clearInterval(timer);
  }, [tab]);

  return (
    <section id="how-it-works" className="py-24 px-5">
      <div className="max-w-5xl mx-auto space-y-12">
        <Reveal>
          <div className="space-y-5">
            <SectionLabel index="02">The loop</SectionLabel>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6">
              <h2 className="brand-display text-4xl sm:text-5xl lg:text-6xl">
                How it works
              </h2>
            <div className="flex rounded-2xl bg-white/[0.03] p-1.5 text-sm w-fit border border-white/[0.06]">
              {(["student", "business"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-300 font-medium ${
                    tab === t
                      ? "bg-gradient-to-r from-green to-emerald-500 text-green-foreground shadow-[0_0_20px_rgba(123,196,127,0.2)]"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t === "student" ? (
                    <GraduationCap className="h-4 w-4" />
                  ) : (
                    <Briefcase className="h-4 w-4" />
                  )}
                  {t === "student" ? "Students" : "Businesses"}
                </button>
              ))}
              </div>
            </div>
          </div>
        </Reveal>

        <div className="grid lg:grid-cols-2 gap-8 items-center">
          {/* Steps list */}
          <div className="space-y-3">
            {steps.map((step, i) => (
              <button
                key={step.num}
                onClick={() => setActiveStep(i)}
                className={`w-full text-left rounded-2xl border p-5 transition-all duration-500 ${
                  activeStep === i
                    ? "border-green/20 bg-gradient-to-r from-green/[0.06] to-transparent shadow-[0_0_30px_rgba(123,196,127,0.06)]"
                    : "border-white/[0.04] hover:border-white/[0.08] bg-transparent"
                }`}
              >
                <div className="flex items-start gap-4">
                  <Num
                    className={`text-2xl font-semibold transition-colors duration-500 ${
                      activeStep === i ? "text-green" : "text-white/10"
                    }`}
                  >
                    {step.num}
                  </Num>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p
                      className={`text-sm leading-relaxed mt-1 transition-all duration-500 ${
                        activeStep === i
                          ? "text-muted-foreground max-h-20 opacity-100"
                          : "max-h-0 opacity-0 overflow-hidden"
                      }`}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
                {/* Progress bar */}
                {activeStep === i && (
                  <div className="mt-3 ml-10 h-[2px] rounded-full bg-white/[0.06] overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green to-emerald-400 rounded-full"
                      style={{
                        animation: "progress 6s linear",
                      }}
                    />
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* Visual — animated proof score card */}
          <Reveal delay={0.2}>
            <TiltCard className="rounded-3xl border border-white/[0.06] bg-gradient-to-br from-white/[0.04] to-transparent p-8 space-y-6 relative overflow-hidden">
              <div className="absolute -top-12 -right-12 w-40 h-40 bg-green/[0.08] rounded-full blur-[60px] pointer-events-none" />
              <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-emerald-500/[0.05] rounded-full blur-[50px] pointer-events-none" />

              <div className="relative flex items-center gap-5">
                <ProofRing value={742} />
                <div className="space-y-1">
                  <p className="brand-eyebrow text-muted-foreground">Tier</p>
                  <p className="brand-display text-2xl text-green">Proven</p>
                  <p className="text-xs text-muted-foreground">
                    Verified from 23 completed gigs
                  </p>
                </div>
              </div>

              <div className="relative space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Progress to Elite</span>
                    <Num className="text-green font-medium">74%</Num>
                  </div>
                  <div className="h-2.5 rounded-full bg-white/[0.06] overflow-hidden">
                    <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-green/70 to-green shadow-[0_0_10px_rgba(123,196,127,0.3)]" />
                  </div>
                </div>

                {[
                  { label: "Tier", value: "Proven", color: "text-green" },
                  { label: "Gigs completed", value: "23", color: "" },
                  { label: "Avg rating", value: "4.8 ★", color: "text-green" },
                  { label: "This month", value: "+48 pts", color: "text-emerald-400" },
                ].map((row) => (
                  <div key={row.label} className="flex justify-between text-sm">
                    <span className="brand-eyebrow text-muted-foreground">
                      {row.label}
                    </span>
                    <Num className={`font-medium ${row.color}`}>{row.value}</Num>
                  </div>
                ))}
              </div>

              <div className="relative flex flex-wrap gap-2 pt-2">
                {["React", "Figma", "Python", "Writing"].map((s) => (
                  <span
                    key={s}
                    className="px-3 py-1.5 rounded-lg bg-green/10 text-green text-xs font-medium"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </TiltCard>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PROOF SCORE TIERS
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ProofScore() {
  const [activeTier, setActiveTier] = useState<number | null>(null);

  const tiers = [
    {
      name: "Starter", range: "0 \u2013 199", icon: Star, color: "text-zinc-400",
      gradient: "from-zinc-500/15 to-zinc-800/10", border: "border-zinc-500/20",
      details: [
        "Complete your first 3 gigs to unlock Rising tier",
        "Basic profile badge visible to businesses",
        "Access to all open gig categories",
        "Build your portfolio from day one",
      ],
    },
    {
      name: "Rising", range: "200 \u2013 499", icon: TrendingUp, color: "text-blue-400",
      gradient: "from-blue-500/15 to-blue-900/10", border: "border-blue-500/20",
      details: [
        "Priority placement in gig search results",
        "Rising badge on your public profile",
        "Eligible for repeat-hire invitations",
        "Unlock skill endorsements from businesses",
      ],
    },
    {
      name: "Proven", range: "500 \u2013 799", icon: Award, color: "text-green",
      gradient: "from-green/15 to-emerald-900/10", border: "border-green/20",
      details: [
        "Verified badge \u2014 businesses trust your track record",
        "Featured in \u201cTop Talent\u201d recommendations",
        "Priority access to high-value gigs (\u20B91,000+)",
        "Analytics dashboard with performance insights",
      ],
    },
    {
      name: "Elite", range: "800 \u2013 1000", icon: Crown, color: "text-amber-400",
      gradient: "from-amber-500/15 to-orange-900/10", border: "border-amber-500/20",
      details: [
        "Exclusive access to premium gigs",
        "Elite verified badge \u2014 the gold standard",
        "Direct invitations from partner companies",
        "Eligible for ActionIT ambassador program",
      ],
    },
  ];

  return (
    <section id="proof-score" className="py-24 px-5">
      <div className="max-w-5xl mx-auto space-y-16">
        <Reveal>
          <div className="max-w-2xl mx-auto space-y-5 text-center">
            <SectionLabel index="03" className="text-left">
              The score
            </SectionLabel>
            <h2 className="brand-display text-4xl sm:text-5xl lg:text-6xl text-left">
              Proof Score
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed text-left">
              A single number that captures your reliability, skill, and
              track record \u2014 built from real completed work, not
              self-reported claims. Click a tier to explore.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * 0.1}>
              <button
                onClick={() => setActiveTier(activeTier === i ? null : i)}
                className="w-full text-left"
              >
                <TiltCard
                  className={`h-full rounded-2xl border bg-gradient-to-br ${tier.gradient} p-5 flex flex-col gap-3 transition-all duration-500 ${
                    activeTier === i
                      ? `${tier.border} shadow-[0_0_40px_rgba(123,196,127,0.1)] scale-[1.03]`
                      : "border-white/[0.06] hover:border-green/10"
                  }`}
                >
                  <div className="h-12 w-12 rounded-xl bg-white/[0.06] flex items-center justify-center">
                    <tier.icon className={`h-5 w-5 ${tier.color}`} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">{tier.name}</h3>
                    <Num className={`text-sm font-medium ${tier.color}`}>
                      {tier.range}
                    </Num>
                  </div>
                  <p className="text-muted-foreground text-xs leading-relaxed">
                    {tier.name === "Starter" && "Just getting started. Complete your first gigs to begin climbing."}
                    {tier.name === "Rising" && "Showing consistency. Businesses start noticing your profile."}
                    {tier.name === "Proven" && "Strong track record. Priority visibility in gig matching."}
                    {tier.name === "Elite" && "Top performer. Exclusive gigs and verified badge."}
                  </p>
                  <span className={`inline-flex items-center gap-1 text-xs ${tier.color} mt-auto`}>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-300 ${activeTier === i ? "rotate-180" : ""}`} />
                  </span>
                </TiltCard>
              </button>
            </Reveal>
          ))}
        </div>

        {/* Interactive tier detail panel */}
        <div
          className={`grid transition-all duration-700 ease-out ${
            activeTier !== null ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            {activeTier !== null && (
              <div className="rounded-3xl border border-white/[0.06] bg-white/[0.02] backdrop-blur-md overflow-hidden">
                <div className={`p-5 sm:p-8 bg-gradient-to-br ${tiers[activeTier].gradient} relative`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.02] to-transparent pointer-events-none" />
                  <div className="absolute -top-16 -right-16 w-40 h-40 bg-green/[0.06] rounded-full blur-[60px] pointer-events-none" />

                  <div className="relative flex flex-col sm:flex-row items-start gap-6">
                    <div className={`h-12 w-12 rounded-xl bg-white/[0.06] backdrop-blur-sm flex items-center justify-center border ${tiers[activeTier].border}`}>
                      {(() => {
                        const Icon = tiers[activeTier].icon;
                        return <Icon className={`h-7 w-7 ${tiers[activeTier].color}`} />;
                      })()}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-baseline gap-3">
                        <h3 className="text-xl font-bold">{tiers[activeTier].name}</h3>
                        <Num className={`text-sm font-medium ${tiers[activeTier].color}`}>
                          {tiers[activeTier].range} pts
                        </Num>
                      </div>
                      <p className="text-muted-foreground text-sm max-w-lg">
                        Here&apos;s what you unlock at the {tiers[activeTier].name} tier:
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-6 grid sm:grid-cols-2 gap-2.5">
                    {tiers[activeTier].details.map((detail, j) => (
                      <div
                        key={j}
                        className="flex items-start gap-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.06] p-3 hover:bg-white/[0.06] transition-all duration-300"
                        style={{
                          opacity: 1,
                          animation: `fadeSlideIn 0.4s ease ${j * 0.1}s both`,
                        }}
                      >
                        <CheckCircle2 className={`h-4 w-4 mt-0.5 shrink-0 ${tiers[activeTier].color}`} />
                        <span className="text-sm leading-relaxed">{detail}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FOR BUSINESSES
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function ForBusinesses() {
  const benefits = [
    { icon: Users, title: "Pre-vetted talent", desc: "Every student has a transparent Proof Score. No guesswork — just verified track records." },
    { icon: Zap, title: "Fast turnaround", desc: "Micro-gigs are scoped and small. Get results in days, not weeks." },
    { icon: Shield, title: "No recruitment overhead", desc: "Post a gig, pick a student, get it done. No agencies, no contracts, no hassle." },
  ];

  return (
    <section id="for-businesses" className="py-24 px-5">
      <div className="max-w-5xl mx-auto space-y-16">
        <Reveal>
          <div className="max-w-2xl mx-auto space-y-5 text-center">
            <SectionLabel index="04" className="text-left">
              For businesses
            </SectionLabel>
            <h2 className="brand-display text-4xl sm:text-5xl lg:text-6xl text-left">
              For businesses
            </h2>
            <p className="text-muted-foreground text-lg leading-relaxed text-left">
              Get real work done by motivated students with verified skills.
              Hiring for small tasks, as simple as posting a tweet.
            </p>
          </div>
        </Reveal>

        <div className="grid sm:grid-cols-3 gap-5">
          {benefits.map((b, i) => (
            <Reveal key={b.title} delay={i * 0.12}>
              <TiltCard className="h-full rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 space-y-4 hover:border-green/15 hover:shadow-[0_0_40px_rgba(123,196,127,0.06)] transition-all duration-500">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-green/20 to-green/5 flex items-center justify-center">
                  <b.icon className="h-5 w-5 text-green" />
                </div>
                <h3 className="font-semibold text-lg">{b.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {b.desc}
                </p>
              </TiltCard>
            </Reveal>
          ))}
        </div>

        <Reveal delay={0.2}>
          <div className="text-center">
            <MagneticButton
              href="/login?signup=1"
              className="group inline-flex items-center gap-2 px-8 py-4 rounded-2xl border border-white/[0.08] font-semibold text-base hover:bg-green/[0.06] hover:border-green/20 hover:shadow-[0_0_30px_rgba(123,196,127,0.1)] transition-all duration-500"
            >
              Post your first gig
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FAQ
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    { q: "Is ActionIT free for students?", a: "Yes. Signing up is free and we charge zero commission on gigs paying under \u20B91,000. For higher-paying gigs, a small platform fee applies — but you always keep the majority." },
    { q: "What kind of gigs are available?", a: "Everything from social media design and website tweaks to data entry, content writing, video editing, and more. Gigs are real tasks from real businesses." },
    { q: "How does the Proof Score work?", a: "Your Proof Score is calculated from the number of gigs you complete, ratings from businesses, consistency, and the complexity of tasks. It is a verifiable metric — businesses can check it before hiring you." },
    { q: "How do businesses post gigs?", a: "Sign up as a business, describe your task, set a budget, and publish. Students can apply within minutes." },
    { q: "Can I use ActionIT while in college?", a: "Absolutely. ActionIT is built for college students. Gigs are scoped to be manageable alongside your coursework." },
  ];

  return (
    <section className="py-24 px-5">
      <div className="max-w-3xl mx-auto space-y-10">
        <Reveal>
          <div className="space-y-5">
            <SectionLabel index="05">FAQ</SectionLabel>
            <h2 className="brand-display text-4xl sm:text-5xl">
              Questions? Answered.
            </h2>
          </div>
        </Reveal>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Reveal key={i} delay={i * 0.06}>
              <div
                className={`rounded-2xl border overflow-hidden transition-all duration-500 ${
                  openIndex === i
                    ? "border-green/15 bg-gradient-to-r from-green/[0.04] to-transparent shadow-[0_0_30px_rgba(123,196,127,0.06)]"
                    : "border-white/[0.06] hover:border-white/[0.1]"
                }`}
              >
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="flex items-center justify-between w-full px-6 py-5 text-left"
                >
                  <span className="font-medium pr-4">{faq.q}</span>
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-500 ${
                      openIndex === i ? "rotate-180 text-green" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-500 ${
                    openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-6 pb-5 text-muted-foreground text-sm leading-relaxed">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FOOTER CTA
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function FooterCTA() {
  return (
    <section className="py-24 px-5">
      <Reveal>
        <div className="relative max-w-4xl mx-auto text-center space-y-8 rounded-3xl border border-white/[0.06] bg-gradient-to-br from-green/[0.06] to-transparent p-12 sm:p-16 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-green/[0.08] rounded-full blur-[100px]" />
            <div className="absolute bottom-0 right-1/4 w-[300px] h-[200px] bg-emerald-500/[0.05] rounded-full blur-[80px]" />
          </div>

          <h2 className="relative brand-display text-4xl sm:text-6xl">
            Ready to prove yourself?
          </h2>
          <p className="relative text-muted-foreground text-lg max-w-lg mx-auto">
            Join ActionIT and start building a portfolio that actually
            matters. Your first gig is one click away.
          </p>
          <div className="relative">
            <MagneticButton
              href="/login?signup=1"
              className="group inline-flex items-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-green to-emerald-500 text-green-foreground font-semibold text-base hover:shadow-[0_0_50px_rgba(123,196,127,0.4)] transition-all duration-500"
            >
              Get started free
              <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </MagneticButton>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   FOOTER
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function Footer() {
  return (
    <footer className="border-t border-white/[0.04] py-8 px-5">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p>&copy; 2026 ActionIT. All rights reserved.</p>
        <div className="flex items-center gap-6">
          <a
            href="https://instagram.com/actionit.in"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-green transition-colors"
          >
            Instagram
          </a>
          <Link href="/login" className="hover:text-green transition-colors">
            Log in
          </Link>
        </div>
      </div>
    </footer>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   PAGE — with keyframe for progress bar
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function HomePage() {
  return (
    <>
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes progress {
          from { width: 0; }
          to { width: 100%; }
        }
      `}</style>
      <main className="overflow-x-hidden">
        <Hero />
        <StatsBar />
        <WhatIs />
        <HowItWorks />
        <ProofScore />
        <ForBusinesses />
        <FAQ />
        <FooterCTA />
        <Footer />
      </main>
    </>
  );
}
