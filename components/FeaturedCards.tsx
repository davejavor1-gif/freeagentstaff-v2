const professionals = [
  {
    name: "Sarah Chen",
    role: "Senior Software Engineer",
    strength: "Systems Architecture",
    experience: "10 years",
    initials: "SC",
  },
  {
    name: "Marcus Reid",
    role: "Construction Project Manager",
    strength: "Project Delivery",
    experience: "15 years",
    initials: "MR",
  },
  {
    name: "Priya Patel",
    role: "Financial Controller",
    strength: "Commercial Finance",
    experience: "12 years",
    initials: "PP",
  },
];

export default function FeaturedCards() {
  return (
    <section className="bg-[#f8f5ef] px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#a77f31]">
            Featured professionals
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight text-[#07111f] sm:text-5xl">
            More than a résumé.
          </h2>

          <p className="mt-4 text-lg leading-8 text-slate-600">
            Discover professionals through premium cards that make experience,
            strengths and availability easy to understand.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {professionals.map((professional) => (
            <article
              key={professional.name}
              className="group overflow-hidden rounded-[28px] border border-[#d9cfba] bg-[#f5efe2] shadow-sm transition duration-300 hover:-translate-y-2 hover:shadow-2xl"
            >
              <div className="bg-[#07111f] p-5 text-white">
                <div className="flex items-center justify-between text-xs font-bold tracking-[0.2em]">
                  <span className="text-[#c79e4f]">FREEAGENT</span>
                  <span className="text-white/60">
                    {professional.experience}
                  </span>
                </div>

                <div className="mt-8 flex h-60 items-center justify-center rounded-2xl bg-gradient-to-b from-[#26364a] to-[#101923]">
                  <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-[#c79e4f] bg-[#e2ded4] text-4xl font-black text-[#07111f]">
                    {professional.initials}
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-3xl font-black tracking-tight text-[#07111f]">
                  {professional.name}
                </h3>

                <p className="mt-1 font-bold uppercase tracking-wide text-[#a77f31]">
                  {professional.role}
                </p>

                <div className="mt-6 rounded-2xl bg-[#07111f] p-5 text-white">
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#c79e4f]">
                    Top strength
                  </p>

                  <p className="mt-2 text-xl font-bold">
                    {professional.strength}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between text-sm font-semibold text-slate-600">
                  <span>Open to opportunities</span>
                  <span className="text-[#4f965f]">● Available</span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}