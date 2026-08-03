export default function Hero() {
  return (
    <section className="bg-[#07111f] text-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center px-6 py-24 text-center">
        <span className="mb-6 rounded-full border border-[#c79e4f]/40 bg-[#c79e4f]/10 px-4 py-2 text-sm font-semibold text-[#d9b56c]">
          Professional Identity, Reimagined
        </span>

        <h1 className="max-w-5xl text-5xl font-black leading-tight md:text-7xl">
          Every Professional
          <span className="block text-[#c79e4f]">
            Has a Story.
          </span>
        </h1>

        <p className="mt-8 max-w-3xl text-xl leading-9 text-white/70">
          FreeAgent replaces the traditional résumé with a beautiful,
          shareable professional card that showcases your experience,
          portfolio and personality.
        </p>

        <div className="mt-12 flex gap-4">
          <button className="rounded-xl bg-[#c79e4f] px-8 py-4 font-bold text-[#07111f] transition hover:scale-105">
            Create Your FreeAgent Card
          </button>

          <button className="rounded-xl border border-white/20 px-8 py-4 font-semibold transition hover:bg-white/10">
            See How It Works
          </button>
        </div>
      </div>
    </section>
  );
}