import Link from "next/link";

const SUPPORT_EMAIL = "support@freeagentstaff.com";

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-700">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 sm:px-8 lg:px-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Freeagentstaff</p>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Premium talent search, secure employer verification, and curated introduction workflows.
            </p>
          </div>

          <div className="flex flex-wrap gap-4 text-sm font-semibold">
            <Link href="/privacy" className="transition hover:text-slate-900">Privacy Policy</Link>
            <Link href="/terms" className="transition hover:text-slate-900">Terms of Use</Link>
            <Link href="/support" className="transition hover:text-slate-900">Support</Link>
            <a href={`mailto:${SUPPORT_EMAIL}`} className="transition hover:text-slate-900">{SUPPORT_EMAIL}</a>
          </div>
        </div>

        <div className="border-t border-slate-200 pt-4 text-xs text-slate-500">
          <p>© 2026 Freeagentstaff</p>
        </div>
      </div>
    </footer>
  );
}