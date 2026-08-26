"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, X } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase-client";

const guestNavItems = [
  { label: "About", href: "/about" },
  { label: "For Talent", href: "/talent" },
  { label: "For Employers", href: "/employers" },
  { label: "Pricing", href: "/pricing" },
  { label: "Talent Sign In", href: "/login", kind: "talent-auth" as const },
  { label: "Employer Sign In", href: "/employer/auth", kind: "employer-auth" as const },
];

const talentNavItems = [
  { label: "Home", href: "/" },
  { label: "Notifications", href: "/notifications" },
  { label: "Connections", href: "/connections" },
  { label: "Privacy & Visibility", href: "/settings/privacy" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [accountType, setAccountType] = useState<"talent" | "employer" | null>(null);
  const [isSystemAdmin, setIsSystemAdmin] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let mounted = true;

    async function loadCurrentSession(currentSession: Session | null) {
      if (!currentSession) {
        if (mounted) {
          setNotificationCount(0);
          setAccountType(null);
          setIsSystemAdmin(false);
        }
        return;
      }

      const { data: profileRow } = await supabase
        .from("profiles")
        .select("account_type")
        .eq("user_id", currentSession.user.id)
        .maybeSingle();
      const rowAccountType = (profileRow as { account_type?: string } | null | undefined)?.account_type;
      let count = 0;

      if (currentSession.access_token) {
        const response = await fetch("/api/notifications/unread-count", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as
          | { ok?: boolean; unreadCount?: number }
          | null;

        if (payload?.ok && typeof payload.unreadCount === "number") {
          count = Math.max(0, payload.unreadCount);
        }
      }

      if (mounted) {
        setNotificationCount(count);
        setAccountType(rowAccountType === "employer" ? "employer" : "talent");
      }

      if (currentSession.access_token) {
        const response = await fetch("/api/admin/status", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
          cache: "no-store",
        });

        const payload = (await response.json().catch(() => null)) as { ok?: boolean; isSystemAdmin?: boolean } | null;

        if (mounted) {
          setIsSystemAdmin(Boolean(payload?.ok && payload.isSystemAdmin));
        }
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) {
        return;
      }
      setSession(data.session);
      loadCurrentSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_, currentSession) => {
      if (!mounted) {
        return;
      }
      setSession(currentSession);
      loadCurrentSession(currentSession);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const isEmployerSession = Boolean(session) && accountType === "employer";
  const isAdminSession = Boolean(session) && isSystemAdmin;
  const isTalentSession = Boolean(session) && accountType !== "employer";
  const visibleNavItems = isEmployerSession
    ? [
        { label: "Notifications", href: "/notifications" },
        { label: "Find talent", href: "/find-talent" },
        { label: "Saved talent", href: "/saved-talent" },
        { label: "Connections", href: "/connections" },
        { label: "Dashboard", href: "/dashboard" },
        { label: "Employer account", href: "/onboarding/employer" },
      ]
    : isAdminSession
      ? [
          { label: "Admin", href: "/admin" },
          { label: "Dashboard", href: "/dashboard" },
        ]
    : isTalentSession
      ? talentNavItems
      : guestNavItems;

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
                "kind" in item && item.kind === "talent-auth"
                  ? "rounded-full bg-[#aff546] px-4 py-2 text-sm font-semibold text-[#071321] hover:bg-[#9fea37]"
                  : "kind" in item && item.kind === "employer-auth"
                    ? "rounded-full bg-[#2bd7ef] px-4 py-2 text-sm font-semibold text-[#071321] hover:bg-[#1fcce7]"
                    : ""
              } ${
                pathname === item.href && item.href === "/talent"
                  ? "font-semibold text-[#8fdc3a]"
                  : pathname === item.href && item.href === "/employers"
                    ? "font-semibold text-[#1bc8e4]"
                    : "text-[#071321]/92"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          {session ? (
            <Link
              href="/notifications"
              className="hidden rounded-full border border-[#2bd7ef]/45 p-2 text-[#0b2a45] transition hover:border-[#2bd7ef]/75 hover:text-[#2bd7ef] sm:inline-flex"
              aria-label="Notifications"
            >
              <Bell className="h-4 w-4" />
              {notificationCount > 0 ? (
                <span className="ml-1 rounded-full bg-[#aff546] px-1.5 text-[10px] font-black text-[#071426]">{notificationCount}</span>
              ) : null}
            </Link>
          ) : null}

          {isAdminSession ? (
            <Link
              href="/admin"
              className="hidden rounded-xl bg-[#071321] px-5 py-2 text-sm font-semibold text-white transition hover:-translate-y-0.5 lg:inline-flex"
            >
              Admin
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
                "kind" in item && item.kind === "talent-auth"
                  ? "bg-[#aff546] text-[#071321] hover:bg-[#9fea37] hover:text-[#071321]"
                  : "kind" in item && item.kind === "employer-auth"
                    ? "bg-[#2bd7ef] text-[#071321] hover:bg-[#1fcce7] hover:text-[#071321]"
                    : ""
              } ${
                pathname === item.href ? "text-[#8fdc3a]" : "text-[#071321]/92"
              }`}
              onClick={() => setMenuOpen(false)}
            >
              <span>{item.label}</span>
            </Link>
          ))}
          {isAdminSession ? (
            <Link
              href="/admin"
              className="block rounded-2xl bg-[#071321] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#17355f]"
              onClick={() => setMenuOpen(false)}
            >
              Admin
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
