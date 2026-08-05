"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell, Menu, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { IntroductionRequest } from "@/types/freeagent";

const baseNavItems = [
  { label: "Home", href: "/" },
  { label: "Find talent", href: "/find-talent" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy", href: "/privacy" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    let mounted = true;

    async function loadNotifications(currentSession: Session | null) {
      if (!currentSession) {
        if (mounted) {
          setNotificationCount(0);
        }
        return;
      }

      const { data: profileRow } = await supabase.from("profiles").select("profile").eq("user_id", currentSession.user.id).maybeSingle();
      const profilePayload = (profileRow as { profile?: unknown } | null | undefined)?.profile as
        | { introductionRequests?: IntroductionRequest[] }
        | undefined;
      const count = Array.isArray(profilePayload?.introductionRequests)
        ? profilePayload.introductionRequests.filter((request) => request.status === "pending").length
        : 0;

      if (mounted) {
        setNotificationCount(count);
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      loadNotifications(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }
      setSession(currentSession);
      loadNotifications(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const navItems = baseNavItems.filter((item) => (item.href === "/dashboard" ? Boolean(session) : true));

  return (
    <header className="border-b border-white/10 bg-[#07111f] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-[0.2em]">
          FREEAGENT
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-2 text-white/75 transition hover:text-white">
              <span>{item.label}</span>
              {item.href === "/dashboard" && notificationCount > 0 ? (
                <span className="rounded-full bg-[#f2cc63] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#07111f]">
                  {notificationCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={session ? "/dashboard" : "/login"}
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:flex sm:items-center sm:gap-2"
          >
            <Bell className="h-4 w-4" />
            {session ? "Dashboard" : "Sign in"}
          </Link>

          <Link
            href="/builder"
            className="hidden rounded-xl bg-[#c79e4f] px-4 py-2 text-sm font-bold text-[#07111f] transition hover:bg-[#d8b568] md:inline-flex"
          >
            Create your card
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#06101f]/90 text-white transition hover:border-white/20 md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={`${menuOpen ? "block" : "hidden"} border-t border-white/10 bg-[#06111f] md:hidden`}>
        <div className="space-y-1 px-6 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
              {item.href === "/dashboard" && notificationCount > 0 ? (
                <span className="rounded-full bg-[#f2cc63] px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#07111f]">
                  {notificationCount}
                </span>
              ) : null}
            </Link>
          ))}
          <Link
            href="/builder"
            className="block rounded-2xl bg-[#c79e4f] px-4 py-3 text-sm font-bold text-[#07111f] transition hover:bg-[#d8b568]"
            onClick={() => setMenuOpen(false)}
          >
            Create your card
          </Link>
          <Link
            href={session ? "/dashboard" : "/login"}
            className="block rounded-2xl border border-white/10 px-4 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/5"
            onClick={() => setMenuOpen(false)}
          >
            {session ? "Open dashboard" : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}
