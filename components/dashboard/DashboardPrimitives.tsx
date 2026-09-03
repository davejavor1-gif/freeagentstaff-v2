"use client";

import Link from "next/link";
import {
  Activity,
  ArrowUpRight,
  Check,
} from "lucide-react";
import type { ReactNode } from "react";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

type Audience = "talent" | "employer";

const audienceStyles = {
  talent: {
    accent: "#AFF546",
    accentSoft: "rgba(175,245,70,0.12)",
    glow: "rgba(175,245,70,0.28)",
  },
  employer: {
    accent: "#2BD7EF",
    accentSoft: "rgba(43,215,239,0.12)",
    glow: "rgba(43,215,239,0.26)",
  },
} as const;

export function DashboardShell({
  audience,
  children,
}: {
  audience: Audience;
  children: ReactNode;
}) {
  const style = audienceStyles[audience];

  return (
    <div className="min-h-screen bg-[#08111F]" style={{ "--dashboard-accent": style.accent, "--dashboard-glow": style.glow } as React.CSSProperties}>
      <Navbar />
      <main className="mx-auto max-w-[1280px] px-5 py-8 sm:px-8 sm:py-10 lg:py-12">{children}</main>
      <Footer />
    </div>
  );
}

export function DashboardHeader({ audience, name, status, children }: { audience: Audience; name: string; status: string; children?: ReactNode }) {
  return (
    <section className="dashboard-hero">
      <div>
        <p className="dashboard-kicker">{audience === "employer" ? "Employer command centre" : "Talent command centre"}</p>
        <h1 className="mt-3 max-w-3xl font-serif text-4xl font-normal leading-[1.05] tracking-tight text-[#08111F] sm:text-5xl"><span className="block">Hello!</span><span className="block">{name}</span></h1>
        <p className="mt-4 max-w-xl text-lg leading-8 text-[#08111F]/65">{audience === "employer" ? "Your next hire could already be here." : "Your career is live. Stay ready to be discovered."}</p>
      </div>
      <div className={`flex flex-wrap items-center gap-3 lg:justify-end ${audience === "employer" ? "lg:flex-nowrap lg:gap-2" : ""}`}>
        <div className="dashboard-status"><span className="h-2 w-2 rounded-full bg-[var(--dashboard-accent)] shadow-[0_0_12px_var(--dashboard-glow)]" />{status}</div>
        {children}
      </div>
    </section>
  );
}

export function DashboardJourney({ title, stages, compact = false }: { title: string; stages: { label: string; detail: string; state: "complete" | "current" | "upcoming" }[]; compact?: boolean }) {
  const completedStages = stages.filter((stage) => stage.state !== "upcoming").length;
  const progressWidth = `${Math.max(0, completedStages - 1) * (75 / (stages.length - 1))}%`;

  return (
    <section className={`dashboard-panel ${compact ? "p-5 sm:p-6" : "p-7 sm:p-9"}`}>
      <p className="dashboard-kicker">{title}</p>
      <div className={`relative grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 ${compact ? "mt-5" : "mt-8"}`}>
        <span className="absolute left-[12.5%] right-[12.5%] top-5 hidden h-px bg-[#08111F]/15 lg:block" />
        <span className="absolute left-[12.5%] top-5 hidden h-px bg-[var(--dashboard-accent)] shadow-[0_0_8px_var(--dashboard-glow)] lg:block" style={{ width: progressWidth }} />
        {stages.map((stage, index) => (
          <div key={stage.label} className="relative flex gap-3 lg:flex-col lg:items-center lg:text-center">
            <span className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${stage.state === "upcoming" ? "border-[#08111F]/20 bg-[#F7F4EC] text-[#08111F]/40" : "border-[var(--dashboard-accent)] bg-[var(--dashboard-accent)] text-[#08111F] shadow-[0_0_16px_var(--dashboard-glow)]"}`}>
              {stage.state === "complete" ? <Check className="h-4 w-4" /> : index + 1}
            </span>
            <div className="lg:mt-3"><p className={`text-sm font-bold uppercase tracking-[0.12em] ${stage.state === "upcoming" ? "text-[#08111F]/40" : "text-[#08111F]"}`}>{stage.label}</p><p className="mt-0.5 text-sm leading-5 text-[#08111F]/55">{stage.detail}</p></div>
          </div>
        ))}
      </div>
    </section>
  );
}

export function DashboardMetricCard({ href, label, value, detail, icon: Icon = Activity, compact = false, action, middle, inlineAction }: { href?: string; label: string; value: number | string; detail: string; icon?: typeof Activity; compact?: boolean; action?: ReactNode; middle?: ReactNode; inlineAction?: boolean }) {
  const content = <div className={`dashboard-metric group ${compact ? "dashboard-metric-compact" : ""}`}><div className="flex items-start justify-between"><span className="dashboard-kicker text-[#08111F]/60">{label}</span><Icon className="h-5 w-5 text-[var(--dashboard-accent)]" /></div><div className={`${compact ? "mt-2 min-h-8" : "mt-4 min-h-10"} flex items-center ${inlineAction ? "w-full justify-between gap-2" : ""}`}>{middle ?? <p className={`${compact ? "text-3xl" : "text-4xl"} font-semibold tracking-tight text-[var(--dashboard-accent)]`}>{value}</p>}{inlineAction ? <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.12em] text-[var(--dashboard-accent)] transition group-hover:gap-2">View <ArrowUpRight className="h-4 w-4" /></span> : null}</div><div className="mt-auto"><p className={`${compact ? "text-sm" : "text-base"} text-[#08111F]/70`}>{detail}</p>{action ? <div className={`${compact ? "mt-2" : "mt-4"}`}>{action}</div> : href && !inlineAction ? <span className={`${compact ? "mt-2 text-xs" : "mt-4 text-sm"} inline-flex items-center gap-1 font-bold uppercase tracking-[0.12em] text-[var(--dashboard-accent)] transition group-hover:gap-2`}>View <ArrowUpRight className="h-4 w-4" /></span> : null}</div></div>;
  return href ? <Link href={href}>{content}</Link> : content;
}

export function DashboardPanel({ title, eyebrow, action, children, className = "" }: { title: string; eyebrow?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`dashboard-panel p-6 sm:p-7 ${className}`}><div className="flex flex-wrap items-end justify-between gap-3"><div>{eyebrow ? <p className="dashboard-kicker">{eyebrow}</p> : null}<h2 className="mt-2 font-serif text-2xl tracking-tight text-[#08111F]">{title}</h2></div>{action}</div>{children}</section>;
}

export function DashboardActivity({ items, empty }: { items: { title: string; detail: string; state?: string }[]; empty: string }) {
  if (items.length === 0) return <p className="mt-6 border-t border-[#08111F]/15 pt-5 text-base leading-7 text-[#08111F]/60">{empty}</p>;
  return <div className="relative mt-6 space-y-6 border-t border-[#08111F]/15 pt-5 before:absolute before:bottom-5 before:left-[5px] before:top-7 before:w-px before:bg-[var(--dashboard-accent)]/60">{items.map((item, index) => <div key={`${item.title}-${index}`} className="relative flex gap-4"><span className="relative z-10 mt-1.5 flex h-3 w-3 shrink-0 rounded-full bg-[var(--dashboard-accent)] shadow-[0_0_12px_var(--dashboard-glow)]" /> <div><p className="text-lg font-semibold text-[#08111F]">{item.title}</p><p className="mt-1 text-sm text-[#08111F]/60">{item.detail}{item.state ? ` / ${item.state}` : ""}</p></div></div>)}</div>;
}

export function DashboardAction({ href, children, variant = "accent" }: { href: string; children: ReactNode; variant?: "accent" | "outline" | "green" }) {
  return <Link href={href} className={variant === "green" ? "dashboard-talent-green-action" : `dashboard-action ${variant === "outline" ? "dashboard-action-outline" : ""}`}>{children}<ArrowUpRight className="h-4 w-4" /></Link>;
}

