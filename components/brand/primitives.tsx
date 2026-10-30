"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Mono eyebrow with an index and a rule that runs to the edge — the editorial
 * section marker used across the marketing pages and dashboards.
 */
export function SectionLabel({
  index,
  children,
  className = "",
}: {
  index?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {index && <span className="brand-eyebrow text-green">{index}</span>}
      <span className="brand-eyebrow text-muted-foreground">{children}</span>
      <span className="h-px flex-1 bg-gradient-to-r from-green/25 to-transparent" />
    </div>
  );
}

/** Tabular mono numerals, with italic ₹ amounts and scores. */
export function Num({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={`brand-num ${className}`}>{children}</span>;
}

/** A score ring that draws itself in once it scrolls into view. */
export function ProofRing({
  value,
  max = 1000,
  size = 132,
  label = "Proof Score",
}: {
  value: number;
  max?: number;
  size?: number;
  label?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setShown(true),
      { threshold: 0.4 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const stroke = 7;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));

  return (
    <div ref={ref} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--green)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={shown ? circ * (1 - pct) : circ}
          style={{
            transition: "stroke-dashoffset 1.4s cubic-bezier(0.16,1,0.3,1)",
            filter: "drop-shadow(0 0 6px rgba(123,196,127,0.45))",
          }}
        />
      </svg>
      {/* Keep the text inside the ring's inner edge, scaled to the ring size */}
      <div
        className="absolute flex flex-col items-center justify-center text-center"
        style={{ inset: stroke + 6 }}
      >
        <span
          className="brand-num font-semibold leading-none text-green"
          style={{ fontSize: Math.round(size * 0.26) }}
        >
          {value}
        </span>
        <span
          className="brand-eyebrow text-muted-foreground mt-1.5 leading-tight"
          style={{ fontSize: Math.max(8, size * 0.072), letterSpacing: "0.14em" }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}

/** Edge-to-edge ticker band. Pauses on hover and for reduced motion. */
export function Marquee({ items }: { items: string[] }) {
  const row = [...items, ...items];
  return (
    <div className="brand-marquee border-y border-white/[0.06] bg-white/[0.02]">
      <div className="brand-marquee-track">
        {row.map((item, i) => (
          <span key={i} className="brand-marquee-item">
            <span className="text-green">/</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
