import Navbar from "@/components/layout/Navbar";
import EmployerTalentSearch from "@/components/EmployerTalentSearch";

export default function FindTalentPage() {
  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_#f7ebcf_0%,_#f4e4bf_40%,_#e7d7a7_100%)] text-[#071426]">
      <Navbar />
      <section className="mx-auto max-w-7xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_0.95fr] lg:items-center">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-[0.32em] text-[#9a6d15]">
              Premium hiring
            </p>
            <h1 className="mt-4 text-4xl font-black uppercase tracking-[0.14em] text-[#0f2744] sm:text-5xl">
              Discover curated talent in one premium place.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-[#27405f]">
              Search public talent profiles built for hiring teams. Access is reserved for verified employer accounts, with premium filters for availability, skills, focus area and location.
            </p>
          </div>

          <div className="rounded-[36px] border border-[#cda64d]/60 bg-[#0f2744] p-6 shadow-[0_18px_55px_rgba(6,16,33,0.18)] sm:p-8">
            <div className="rounded-[28px] bg-[#f7ebcf]/95 p-5 text-[#071426] shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#9a6d15]">
                Search premium talent
              </p>
              <p className="mt-3 text-sm leading-7">
                Browse only public profiles that are ready to share, review and hire once employer verification is complete.
              </p>
            </div>
            <div className="mt-4 rounded-[28px] border border-[#f2cc63]/20 bg-[#0f2744]/80 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">
                Ready for teams
              </p>
              <p className="mt-3 text-sm leading-7 text-[#dfe7ef]">
                Get rich candidate insights, polished career narratives, and straightforward contact details all in one place.
              </p>
            </div>
          </div>
        </div>
      </section>

      <EmployerTalentSearch />
    </main>
  );
}
