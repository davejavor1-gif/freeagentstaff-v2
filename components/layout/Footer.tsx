import Link from "next/link";
import Image from "next/image";

export default function Footer() {
  return (
    <footer className="bg-[#f7e8c6] text-[#0f2744]">
      <div className="mx-auto max-w-7xl px-6 py-0.5 sm:px-8 sm:py-1 lg:px-12">
        <div className="flex flex-col gap-0 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
          <div className="flex items-center">
            <Image
              src="/FullLogo-clean-v2.png"
              alt="Free Agent Staff"
              width={320}
              height={256}
              className="h-auto w-[105px] shrink-0 object-contain object-left sm:w-[128px]"
            />
          </div>

          <div className="flex flex-col gap-0 sm:flex-row sm:items-center sm:gap-5">
            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-5 gap-y-1 text-[1rem] font-semibold">
              <Link href="/privacy" className="inline-flex min-h-7 items-center rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7e8c6] sm:min-h-0">
                Privacy Policy
              </Link>
              <Link href="/terms" className="inline-flex min-h-7 items-center rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7e8c6] sm:min-h-0">
                Terms & Conditions
              </Link>
              <Link href="/support" className="inline-flex min-h-7 items-center rounded-sm transition hover:text-[#4f9f4e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4f9f4e] focus-visible:ring-offset-4 focus-visible:ring-offset-[#f7e8c6] sm:min-h-0">
                Support
              </Link>
            </nav>
          </div>
        </div>

        <div className="flex flex-col text-[0.9rem] text-[#27405f] sm:flex-row sm:items-center sm:justify-end">
          <p>© 2026 Freeagentstaff</p>
        </div>
      </div>
    </footer>
  );
}