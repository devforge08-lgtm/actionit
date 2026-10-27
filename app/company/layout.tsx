"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  PlusCircle,
  Briefcase,
  BarChart3,
  Bell,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const navItems = [
  { label: "Dashboard", href: "/company", icon: LayoutDashboard },
  { label: "Post a Gig", href: "/company/gigs/new", icon: PlusCircle },
  { label: "My Gigs", href: "/company/gigs", icon: Briefcase },
  { label: "Analytics", href: "/company/analytics", icon: BarChart3 },
  { label: "Notifications", href: "/company/notifications", icon: Bell },
];

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [supabase] = useState(createClient);
  const [unread, setUnread] = useState(0);

  // Send any due "no applicants" messages once per visit, not on every click
  useEffect(() => {
    supabase.rpc("notify_unfilled_gigs").then(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .is("read_at", null)
      .then(({ count }) => {
        if (!cancelled) setUnread(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  async function handleSignOut() {
    await supabase.auth.signOut();
    // Full page load so no cached logged-in pages survive the sign-out
    window.location.assign("/login");
  }

  return (
    <div className="min-h-screen flex">
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[linear-gradient(180deg,#060b07_0%,#080d09_40%,#060b07_100%)] border-r border-white/[0.06] flex flex-col transition-transform duration-300 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <Link
            href="/company"
            className="flex items-center gap-2"
            onClick={() => setOpen(false)}
          >
            <span className="h-2.5 w-2.5 rounded-full bg-green shadow-[0_0_8px_rgba(123,196,127,0.5)]" />
            <span className="font-semibold tracking-tight">ActionIT</span>
          </Link>
          <button
            onClick={() => setOpen(false)}
            className="lg:hidden p-1 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            <X className="h-5 w-5 text-muted-foreground" />
          </button>
        </div>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-green/15 to-green/5 text-green"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
                {item.href === "/company/notifications" && unread > 0 && (
                  <span className="brand-num ml-auto min-w-5 h-5 px-1.5 rounded-full bg-green text-green-foreground text-[11px] flex items-center justify-center">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Sign out */}
        <div className="px-3 py-4 border-t border-white/[0.06]">
          <button
            onClick={handleSignOut}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-white/[0.03] transition-all w-full"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 bg-[#050806]/90 backdrop-blur-md border-b border-white/[0.06] lg:hidden">
          <button
            onClick={() => setOpen(true)}
            className="p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link href="/company" className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-green shadow-[0_0_8px_rgba(123,196,127,0.5)]" />
            <span className="font-semibold text-sm tracking-tight">
              ActionIT
            </span>
          </Link>
          <Link
            href="/company/notifications"
            aria-label="Notifications"
            className="ml-auto relative p-1.5 rounded-md hover:bg-white/[0.04] transition-colors"
          >
            <Bell className="h-5 w-5 text-muted-foreground" />
            {unread > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-green" />
            )}
          </Link>
        </header>

        <div className="p-4 sm:p-6 lg:p-8 animate-in fade-in duration-300">{children}</div>
      </div>
    </div>
  );
}
