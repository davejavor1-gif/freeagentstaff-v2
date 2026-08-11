"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";
import type { IntroductionRequest } from "@/types/freeagent";

const baseNavItems = [
  { label: "Home", href: "/" },
  { label: "Find talent", href: "/find-talent" },
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy & Visibility", href: "/settings/privacy" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [accountType, setAccountType] = useState<"talent" | "employer" | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadNotifications(currentSession: Session | null) {
      if (!currentSession) {
        if (mounted) {
          setNotificationCount(0);
          setAccountType(null);
        }
        return;
      }

      const { data: profileRow } = await supabase.from("profiles").select("profile, account_type").eq("user_id", currentSession.user.id).maybeSingle();
      const profilePayload = (profileRow as { profile?: unknown } | null | undefined)?.profile as
        | { introductionRequests?: IntroductionRequest[] }
        | undefined;
      const rowAccountType = (profileRow as { account_type?: string } | null | undefined)?.account_type;
      const count = Array.isArray(profilePayload?.introductionRequests)
        ? profilePayload.introductionRequests.filter((request) => request.status === "pending").length
        : 0;

      if (mounted) {
        setNotificationCount(count);
        setAccountType(rowAccountType === "employer" ? "employer" : "talent");
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
  const isEmployerSession = Boolean(session) && accountType === "employer";
  const visibleNavItems = isEmployerSession
    ? [
        { label: "Find talent", href: "/find-talent" },
        { label: "Saved talent", href: "/saved-talent" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Employer account", href: "/onboarding/employer" },
      ]
    : navItems;

  async function handleEmployerSignOut() {
    if (signingOut) {
      return;
    }

    setSigningOut(true);
    try {
      await supabase.auth.signOut();
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
      router.push("/employer/auth");
      router.refresh();
    }
  }

  return (
    <header className="border-b border-[#e8d9b6] bg-[#f7e8c6] text-[#071321]">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="inline-flex items-center">
          <Image
            src="/FullLogo-clean-v2.png"
            alt="FreeAgent Staff"
            width={960}
            height={768}
            className="h-auto w-[136px] object-contain"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-[1.04rem] transition hover:text-[#2bd7ef] ${
                pathname === item.href ? "font-semibold text-[#8fdc3a]" : "text-[#071321]/92"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {!isEmployerSession ? (
            <Link
              href="/dashboard"
              className="hidden rounded-full border border-[#2bd7ef]/45 p-2 text-[#0b2a45] transition hover:border-[#2bd7ef]/75 hover:text-[#2bd7ef] sm:inline-flex"
              aria-label="Dashboard notifications"
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 ? (
                <span className="ml-1 rounded-full bg-[#aff546] px-1.5 text-[10px] font-black text-[#071426]">{notificationCount}</span>
              ) : null}
            </Link>
          ) : null}

          {!session ? (
            <Link
              href="/employer/auth"
              className="hidden text-[1.04rem] text-[#071321]/92 transition hover:text-[#2bd7ef] lg:inline-flex"
            >
              Employer sign in
            </Link>
          ) : null}

          {!isEmployerSession ? (
            <Link
              href={session ? "/dashboard" : "/login"}
              className="hidden text-[1.04rem] text-[#071321]/92 transition hover:text-[#2bd7ef] lg:inline-flex"
            >
              {session ? "Dashboard" : "Sign in"}
            </Link>
          ) : null}

          {!isEmployerSession ? (
            <Link
              href="/builder"
              className="hidden rounded-xl bg-[#aff546] px-5 py-2 text-sm font-semibold text-[#071426] transition hover:-translate-y-0.5 hover:bg-[#9fea37] md:inline-flex"
            >
              Create your card
            </Link>
          ) : null}

          {isEmployerSession ? (
            <button
              type="button"
              onClick={() => {
                void handleEmployerSignOut();
              }}
              className="hidden rounded-full border border-[#0f2744]/25 bg-[#0f2744] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#17355f] lg:inline-flex"
              disabled={signingOut}
            >
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#2bd7ef]/45 bg-[#f7e8c6] text-[#0b2a45] transition hover:border-[#2cd3e8]/70 md:hidden"
            aria-label="Toggle navigation"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      <div className={`${menuOpen ? "block" : "hidden"} border-t border-[#e8d9b6] bg-[#f7e8c6] md:hidden`}>
        <div className="space-y-1 px-6 py-4">
          {visibleNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-semibold transition hover:bg-[#2cd3e8]/12 hover:text-[#2cd3e8] ${
                pathname === item.href ? "text-[#8fdc3a]" : "text-[#071321]/92"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
            </Link>
          ))}
          {!isEmployerSession ? (
            <Link
              href="/builder"
              className="block rounded-2xl bg-[#acf75a] px-4 py-3 text-sm font-bold text-[#07111f] transition hover:bg-[#98eb46]"
              onClick={() => setMenuOpen(false)}
            >
              Create your card
            </Link>
          ) : null}
          {!session ? (
            <Link
              href="/employer/auth"
              className="block rounded-2xl border border-[#d7c79f] px-4 py-3 text-sm font-semibold text-[#071321]/92 transition hover:bg-[#2cd3e8]/8"
              onClick={() => setMenuOpen(false)}
            >
              Employer sign in
            </Link>
          ) : null}
          {!isEmployerSession ? (
            <Link
              href={session ? "/dashboard" : "/login"}
              className="block rounded-2xl border border-[#d7c79f] px-4 py-3 text-sm font-semibold text-[#071321]/92 transition hover:bg-[#2cd3e8]/8"
              onClick={() => setMenuOpen(false)}
            >
              {session ? "Open dashboard" : "Sign in"}
            </Link>
          ) : null}
          {isEmployerSession ? (
            <button
              type="button"
              onClick={() => {
                void handleEmployerSignOut();
              }}
              className="block w-full rounded-2xl border border-[#0f2744]/20 bg-[#0f2744] px-4 py-3 text-sm font-semibold uppercase tracking-[0.2em] text-[#f7ebcf] transition hover:bg-[#17355f]"
              disabled={signingOut}
            >
              {signingOut ? "Signing out" : "Sign out"}
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
