import Link from "next/link";

export default function Navbar() {
  return (
    <header className="border-b border-white/10 bg-[#07111f] text-white">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="text-xl font-bold tracking-[0.2em]">
          FREEAGENT
        </Link>

        <nav className="hidden items-center gap-8 text-sm md:flex">
          <Link href="#how-it-works" className="text-white/75 hover:text-white">
            How it works
          </Link>
          <Link href="#professionals" className="text-white/75 hover:text-white">
            For professionals
          </Link>
          <Link href="#businesses" className="text-white/75 hover:text-white">
            For businesses
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden rounded-xl px-4 py-2 text-sm font-semibold text-white/80 hover:text-white sm:block"
          >
            Sign in
          </Link>

          <Link
            href="/builder"
            className="rounded-xl bg-[#c79e4f] px-4 py-2 text-sm font-bold text-[#07111f] transition hover:bg-[#d8b568]"
          >
            Create your card
          </Link>
        </div>
      </div>
    </header>
  );
}