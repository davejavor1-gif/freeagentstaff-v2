import Link from "next/link";
import Image from "next/image";

const SUPPORT_EMAIL = "support@freeagentstaff.com";

export default function Footer() {
  return (
    <footer className="border-t border-[#0f2744]/12 bg-[#f7ebcf] text-[#0f2744]">
      <div className="mx-auto max-w-7xl px-6 py-2 sm:px-8 sm:py-3 lg:px-12 lg:py-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
          <div className="max-w-md">
            <Image
              src="/FullLogo-clean-v2.png"
              alt="Free Agent Staff"
              width={320}
              height={256}
              className="h-auto w-[190px] object-contain object-left sm:w-[220px]"
            />
            <p className="mt-0.5 max-w-[32rem] text-[1.0625rem] leading-7 text-[#27405f]">
              Premium talent search, secure employer verification, and curated introduction workflows.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-7 lg:pt-2">
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-7 gap-y-2 text-[1rem] font-semibold">
              <Link href="/privacy" className="rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7ebcf]">
                Privacy Policy
              </Link>
              <Link href="/terms" className="rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7ebcf]">
                Terms of Use
              </Link>
              <Link href="/support" className="rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7ebcf]">
                Support
              </Link>
            </nav>

            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="w-fit border-b border-[#4f9f4e]/60 pb-1 text-[1rem] font-semibold text-[#0f2744] transition hover:border-[#4f9f4e] hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7ebcf]"
            >
              {SUPPORT_EMAIL}
            </a>
          </div>
        </div>

        <div className="mt-2 flex flex-col gap-2 border-t border-[#0f2744]/15 pt-3 text-[0.9rem] text-[#27405f] sm:flex-row sm:items-center sm:justify-between">
          <span className="h-px w-10 bg-[#4f9f4e]" aria-hidden="true" />
          <p>© 2026 Freeagentstaff</p>
        </div>
      </div>
    </footer>
  );
}