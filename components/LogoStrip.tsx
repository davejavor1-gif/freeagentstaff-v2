export default function LogoStrip() {
  const companies = [
    "Google",
    "Canva",
    "Atlassian",
    "Microsoft",
    "Qantas",
    "Salesforce",
  ];

  return (
    <section className="border-y border-black/5 bg-white py-10">
      <div className="mx-auto max-w-7xl px-6">
        <p className="mb-8 text-center text-sm font-semibold uppercase tracking-[0.3em] text-slate-500">
          Trusted by professionals from
        </p>

        <div className="flex flex-wrap items-center justify-center gap-10 text-2xl font-bold text-slate-400">
          {companies.map((company) => (
            <span
              key={company}
              className="transition hover:text-slate-700"
            >
              {company}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}