"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "How it Works", href: "#how-it-works" },
  { label: "For Students", href: "#for-students" },
  { label: "For Businesses", href: "#for-businesses" },
  { label: "Proof Score", href: "#proof-score" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const isLogin = pathname === "/login";
  const isCompany = pathname.startsWith("/company");
  const isDashboard = pathname.startsWith("/dashboard") || pathname.startsWith("/gigs") || pathname.startsWith("/submissions") || pathname.startsWith("/profile");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Pages with their own sidebar — no navbar needed
  if (isCompany || isDashboard) return null;

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#050806]/80 backdrop-blur-xl border-b border-white/[0.06] shadow-[0_1px_30px_rgba(123,196,127,0.05)]"
          : "bg-transparent"
      }`}
    >
      <nav className="max-w-6xl mx-auto flex items-center justify-between px-5 py-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="relative inline-flex h-3 w-3 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-green/30 blur-[6px] transition-all duration-500 group-hover:bg-green/60" />
            <span className="relative h-2 w-2 rounded-full bg-green" />
          </span>
          <span className="text-lg font-semibold tracking-tight text-foreground">
            ActionIT
          </span>
        </Link>

        {/* Desktop links — only on landing page */}
        {isHome && (
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="brand-eyebrow relative text-muted-foreground transition-colors hover:text-green after:absolute after:-bottom-1.5 after:left-0 after:h-px after:w-0 after:bg-green after:transition-all after:duration-300 hover:after:w-full"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Auth buttons — hide on login page */}
        {!isLogin && (
          <div className="hidden md:flex items-center gap-3">
            <Button variant="ghost" asChild className="text-sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              className="bg-green text-green-foreground hover:bg-green/90 text-sm font-medium"
            >
              <Link href="/login?signup=1">Get Started</Link>
            </Button>
          </div>
        )}

        {/* Mobile toggle — only on landing page */}
        {isHome && (
          <button
            className="md:hidden p-2 text-foreground"
            onClick={() => setOpen(!open)}
            aria-label="Toggle menu"
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        )}

        {/* Mobile CTA — non-home, non-login pages */}
        {!isHome && !isLogin && (
          <div className="md:hidden flex items-center gap-2">
            <Button variant="ghost" asChild className="text-sm h-8 px-3">
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              className="bg-green text-green-foreground hover:bg-green/90 text-sm font-medium h-8 px-3"
            >
              <Link href="/login?signup=1">Get Started</Link>
            </Button>
          </div>
        )}
      </nav>

      {/* Mobile menu — only on landing page */}
      {isHome && open && (
        <div className="md:hidden bg-[#050806]/95 backdrop-blur-md border-t border-white/[0.06] px-5 pb-6 pt-2 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="brand-eyebrow block py-2 text-muted-foreground transition-colors hover:text-green"
            >
              {link.label}
            </a>
          ))}
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="ghost" asChild className="w-full justify-center text-sm">
              <Link href="/login">Log in</Link>
            </Button>
            <Button
              asChild
              className="w-full bg-green text-green-foreground hover:bg-green/90 text-sm font-medium"
            >
              <Link href="/login?signup=1">Get Started</Link>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}
