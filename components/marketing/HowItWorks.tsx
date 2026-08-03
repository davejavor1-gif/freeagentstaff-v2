import { BriefcaseBusiness, QrCode, Sparkles } from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Create your card",
    description:
      "Build a premium professional identity with your experience, strengths, portfolio and availability.",
    icon: Sparkles,
  },
  {
    number: "02",
    title: "Share it anywhere",
    description:
      "Send your card by link, QR code or mobile so employers can understand your story instantly.",
    icon: QrCode,
  },
  {
    number: "03",
    title: "Create opportunities",
    description:
      "Get discovered, make a memorable first impression and start better professional conversations.",
    icon: BriefcaseBusiness,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#07111f] px-6 py-24 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-[#c79e4f]">
            How it works
          </p>

          <h2 className="mt-4 text-4xl font-black tracking-tight sm:text-5xl">
            Build it once. Share it everywhere.
          </h2>

          <p className="mt-5 text-lg leading-8 text-white/65">
            FreeAgent turns your professional experience into a clear,
            memorable identity that is easy to create and effortless to share.
          </p>
        </div>

        <div className="mt-16 grid gap-8 lg:grid-cols-3">
          {steps.map((step) => {
            const Icon = step.icon;

            return (
              <article
                key={step.number}
                className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8 transition hover:-translate-y-2 hover:border-[#c79e4f]/60 hover:bg-white/[0.07]"
              >
                <div className="flex items-center justify-between">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#c79e4f] text-[#07111f]">
                    <Icon size={26} strokeWidth={2.2} />
                  </div>

                  <span className="text-5xl font-black text-white/10">
                    {step.number}
                  </span>
                </div>

                <h3 className="mt-10 text-2xl font-bold">{step.title}</h3>

                <p className="mt-4 leading-7 text-white/60">
                  {step.description}
                </p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}