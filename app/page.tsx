"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Briefcase,
  GraduationCap,
  Star,
  TrendingUp,
  Award,
  Crown,
  ChevronDown,
  ArrowRight,
  Zap,
  Shield,
  Users,
} from "lucide-react";

/* ── Shared glass card style ─────────────────────────────────────── */
const glassCard =
  "group relative overflow-hidden rounded-2xl border border-white/[0.06] bg-gradient-to-br from-white/[0.03] to-transparent p-6 transition-all duration-300 hover:border-green/15 hover:from-green/[0.04] hover:shadow-[0_0_30px_rgba(123,196,127,0.06)]";

/* ── Hero ────────────────────────────────────────────────────────── */
function Hero() {
  return (
    <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 px-5 overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-green/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-green/3 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-green/20 bg-gradient-to-r from-green/10 to-green/5 text-green text-xs font-medium backdrop-blur-sm">
            <Zap className="h-3 w-3" /> Zero commission — students keep 100%
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] tracking-tight">
            Small work.
            <br />
            <span className="text-green">Real pay.</span>
            <br />
            Real proof.
          </h1>

          <p className="text-muted-foreground text-lg max-w-md leading-relaxed">
            ActionIT connects college students with businesses for real
            micro-gigs. Complete tasks, build your Proof Score, and create a
            verified portfolio that speaks louder than any resume.
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button
              asChild
              size="lg"
              className="bg-green text-green-foreground hover:bg-green/90 font-medium text-base px-6"
            >
              <Link href="/login?signup=1">
                Start earning <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-green/20 hover:bg-green/5 text-base px-6"
            >
              <a href="#how-it-works">See how it works</a>
            </Button>
          </div>
        </div>

        {/* Proof Score preview card */}
        <div className="hidden lg:block">
          <div className={`relative mx-auto w-80 backdrop-blur-sm p-6 space-y-5 ${glassCard}`}>
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-green/10 flex items-center justify-center">
                <Award className="h-6 w-6 text-green" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Proof Score</p>
                <p className="text-2xl font-bold text-green">742</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tier</span>
                <span className="text-green font-medium">Proven</span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div className="h-full w-[74%] rounded-full bg-gradient-to-r from-green/60 to-green" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Gigs completed</span>
                <span className="font-medium">23</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Avg rating</span>
                <span className="font-medium flex items-center gap-1">
                  4.8 <Star className="h-3 w-3 text-green fill-green" />
                </span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {["React", "Figma", "Python"].map((s) => (
                <span
                  key={s}
                  className="px-2.5 py-1 rounded-md bg-green/10 text-green text-xs font-medium"
                >
                  {s}
                </span>
              ))}
            </div>
            {/* Decorative glow behind card */}
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-green/10 rounded-full blur-3xl pointer-events-none" />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── What is ActionIT ────────────────────────────────────────────── */
function WhatIs() {
  const points = [
    {
      icon: Briefcase,
      title: "Real micro-gigs",
      desc: "Short, scoped tasks from real businesses — design, development, writing, data entry, and more.",
    },
    {
      icon: Shield,
      title: "Verified proof of work",
      desc: "Every completed gig is recorded on your Proof Score. No faking it.",
    },
    {
      icon: Zap,
      title: "Zero commission",
      desc: "You keep 100% of what you earn. We never take a cut from students.",
    },
  ];

  return (
    <section id="for-students" className="py-20 px-5">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            What is ActionIT?
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            A platform where college students take on real micro-gigs from
            businesses, earn real money, and build a portfolio backed by a
            verifiable Proof Score — not just words on a resume.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {points.map((p) => (
            <div key={p.title} className={glassCard}>
              <div className="h-10 w-10 rounded-lg bg-green/10 flex items-center justify-center mb-3 group-hover:bg-green/15 transition-colors">
                <p.icon className="h-5 w-5 text-green" />
              </div>
              <h3 className="font-semibold text-lg">{p.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                {p.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── How It Works ────────────────────────────────────────────────── */
function HowItWorks() {
  const [tab, setTab] = useState<"student" | "business">("student");

  const studentSteps = [
    {
      num: "01",
      title: "Sign up & set your skills",
      desc: "Create your profile and tag the skills you want to prove — from React to Canva.",
    },
    {
      num: "02",
      title: "Browse & apply to gigs",
      desc: "Find real micro-tasks posted by businesses. Apply to the ones that match your skills.",
    },
    {
      num: "03",
      title: "Complete & get paid",
      desc: "Deliver your work, get reviewed, and receive payment. Zero commission — you keep every rupee.",
    },
    {
      num: "04",
      title: "Build your Proof Score",
      desc: "Every completed gig raises your score. Companies can verify your track record instantly.",
    },
  ];

  const businessSteps = [
    {
      num: "01",
      title: "Post a gig",
      desc: "Describe the task, set a budget, and publish. It takes under 2 minutes.",
    },
    {
      num: "02",
      title: "Review applications",
      desc: "Students apply with their Proof Score visible. Pick the best fit for your task.",
    },
    {
      num: "03",
      title: "Get it done",
      desc: "The student delivers. You review, give feedback, and release payment.",
    },
    {
      num: "04",
      title: "Build your talent pool",
      desc: "Bookmark top performers. Rehire them for future tasks — no recruitment fees.",
    },
  ];

  const steps = tab === "student" ? studentSteps : businessSteps;

  return (
    <section id="how-it-works" className="py-20 px-5">
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            How it works
          </h2>
          <div className="flex rounded-xl bg-white/[0.03] backdrop-blur-sm p-1 text-sm w-fit border border-white/[0.06]">
            {(["student", "business"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all font-medium ${
                  tab === t
                    ? "bg-green text-green-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "student" ? (
                  <GraduationCap className="h-4 w-4" />
                ) : (
                  <Briefcase className="h-4 w-4" />
                )}
                {t === "student" ? "For Students" : "For Businesses"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {steps.map((step) => (
            <div key={step.num} className={`${glassCard} space-y-3`}>
              <span className="text-green/30 text-3xl font-bold group-hover:text-green/50 transition-colors">
                {step.num}
              </span>
              <h3 className="font-semibold text-lg">{step.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Proof Score ─────────────────────────────────────────────────── */
function ProofScore() {
  const tiers = [
    {
      name: "Starter",
      range: "0 – 199",
      icon: Star,
      color: "text-zinc-400",
      bgColor: "bg-zinc-400/10",
      hoverBg: "group-hover:bg-zinc-400/15",
      desc: "Just getting started. Complete your first gigs to begin climbing.",
    },
    {
      name: "Rising",
      range: "200 – 499",
      icon: TrendingUp,
      color: "text-blue-400",
      bgColor: "bg-blue-400/10",
      hoverBg: "group-hover:bg-blue-400/15",
      desc: "Showing consistency. Businesses start noticing your profile.",
    },
    {
      name: "Proven",
      range: "500 – 799",
      icon: Award,
      color: "text-green",
      bgColor: "bg-green/10",
      hoverBg: "group-hover:bg-green/15",
      desc: "Strong track record. Priority visibility in gig matching.",
    },
    {
      name: "Elite",
      range: "800 – 1000",
      icon: Crown,
      color: "text-amber-400",
      bgColor: "bg-amber-400/10",
      hoverBg: "group-hover:bg-amber-400/15",
      desc: "Top performer. Exclusive gigs and verified badge.",
    },
  ];

  return (
    <section id="proof-score" className="py-20 px-5">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            Proof Score
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Your Proof Score is a single number that captures your reliability,
            skill, and track record. It is built from real completed work — not
            self-reported claims.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {tiers.map((tier) => (
            <div key={tier.name} className={`${glassCard} space-y-4`}>
              <div
                className={`h-10 w-10 rounded-lg ${tier.bgColor} ${tier.hoverBg} flex items-center justify-center transition-colors`}
              >
                <tier.icon className={`h-5 w-5 ${tier.color}`} />
              </div>
              <div>
                <h3 className="font-semibold text-lg">{tier.name}</h3>
                <p className={`text-sm font-medium ${tier.color}`}>
                  {tier.range}
                </p>
              </div>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {tier.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── For Businesses ──────────────────────────────────────────────── */
function ForBusinesses() {
  const benefits = [
    {
      icon: Users,
      title: "Pre-vetted talent",
      desc: "Every student has a transparent Proof Score. No guesswork — just verified track records.",
    },
    {
      icon: Zap,
      title: "Fast turnaround",
      desc: "Micro-gigs are scoped and small. Get results in days, not weeks.",
    },
    {
      icon: Shield,
      title: "No recruitment overhead",
      desc: "Post a gig, pick a student, get it done. No agencies, no contracts, no hassle.",
    },
  ];

  return (
    <section id="for-businesses" className="py-20 px-5">
      <div className="max-w-6xl mx-auto space-y-12">
        <div className="max-w-2xl">
          <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
            For businesses
          </h2>
          <p className="mt-4 text-muted-foreground text-lg leading-relaxed">
            Get real work done by motivated students with verified skills.
            ActionIT makes hiring for small tasks as simple as posting a tweet.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-6">
          {benefits.map((b) => (
            <div key={b.title} className={glassCard}>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-green/15 to-green/5 group-hover:from-green/20 flex items-center justify-center transition-colors mb-3">
                <b.icon className="h-5 w-5 text-green" />
              </div>
              <h3 className="font-semibold text-lg">{b.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed mt-2">
                {b.desc}
              </p>
            </div>
          ))}
        </div>

        <Button
          asChild
          size="lg"
          className="bg-green text-green-foreground hover:bg-green/90 font-medium"
        >
          <Link href="/login?signup=1">
            Post your first gig <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

/* ── FAQ ─────────────────────────────────────────────────────────── */
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const faqs = [
    {
      q: "Is ActionIT free for students?",
      a: "Yes. Signing up is free and we charge zero commission on your earnings. You keep 100% of what you make.",
    },
    {
      q: "What kind of gigs are available?",
      a: "Everything from social media design and website tweaks to data entry, content writing, video editing, and more. Gigs are real tasks from real businesses.",
    },
    {
      q: "How does the Proof Score work?",
      a: "Your Proof Score is calculated from the number of gigs you complete, ratings from businesses, consistency, and the complexity of tasks. It is a verifiable metric — businesses can check it before hiring you.",
    },
    {
      q: "How do businesses post gigs?",
      a: "Sign up as a business, describe your task, set a budget, and publish. Students can apply within minutes.",
    },
    {
      q: "Can I use ActionIT while in college?",
      a: "Absolutely. ActionIT is built for college students. Gigs are scoped to be manageable alongside your coursework.",
    },
  ];

  return (
    <section className="py-20 px-5">
      <div className="max-w-3xl mx-auto space-y-8">
        <h2 className="text-3xl sm:text-4xl font-bold tracking-tight">
          Questions? Answered.
        </h2>

        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <div
              key={i}
              className={`rounded-2xl border border-white/[0.06] bg-gradient-to-r from-white/[0.02] to-transparent overflow-hidden transition-all duration-300 ${
                openIndex === i
                  ? "border-green/15 from-green/[0.04] shadow-[0_0_30px_rgba(123,196,127,0.06)]"
                  : "hover:border-green/10 hover:from-green/[0.03]"
              }`}
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="flex items-center justify-between w-full px-6 py-4 text-left"
              >
                <span className="font-medium pr-4">{faq.q}</span>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-300 ${
                    openIndex === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`grid transition-all duration-300 ${
                  openIndex === i ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                }`}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-4 text-muted-foreground text-sm leading-relaxed">
                    {faq.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Footer CTA ──────────────────────────────────────────────────── */
function FooterCTA() {
  return (
    <section className="py-20 px-5">
      <div className="relative max-w-4xl mx-auto text-center space-y-6 rounded-2xl border border-white/[0.06] bg-gradient-to-br from-green/[0.05] to-transparent backdrop-blur-sm p-10 sm:p-14 overflow-hidden">
        {/* Glow behind CTA */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-green/8 rounded-full blur-[80px]" />
        </div>

        <h2 className="relative text-3xl sm:text-4xl font-bold tracking-tight">
          Ready to prove yourself?
        </h2>
        <p className="relative text-muted-foreground text-lg max-w-lg mx-auto">
          Join ActionIT and start building a portfolio that actually matters.
          Your first gig is one click away.
        </p>
        <div className="relative flex flex-wrap justify-center gap-3 pt-2">
          <Button
            asChild
            size="lg"
            className="bg-green text-green-foreground hover:bg-green/90 font-medium text-base px-8"
          >
            <Link href="/login?signup=1">
              Get started free <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/* ── Footer ──────────────────────────────────────────────────────── */
function Footer() {
  return (
    <footer className="border-t border-white/[0.06] py-8 px-5">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
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

/* ── Page ─────────────────────────────────────────────────────────── */
export default function HomePage() {
  return (
    <main>
      <Hero />
      <WhatIs />
      <HowItWorks />
      <ProofScore />
      <ForBusinesses />
      <FAQ />
      <FooterCTA />
      <Footer />
    </main>
  );
}
