import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/layout/Navbar";
import { IdCard, Lock, ShieldCheck, CheckCircle2, MapPin } from "lucide-react";

const featureCards = [
  {
    title: "Talent Passport",
    description: "Showcase your skills, experience and achievements in one powerful profile.",
    icon: IdCard,
    tone: "lime",
  },
  {
    title: "Confidential Mode",
    description: "Explore opportunities privately. You control who sees what and when.",
    icon: Lock,
    tone: "cyan",
  },
  {
    title: "Verified Employers",
    description: "Connect with trusted employers who are verified for your peace of mind.",
    icon: ShieldCheck,
    tone: "lime",
  },
];

export default function Home() {
  return (
    <main className="bg-[#071426] text-[#f7e8c6]">
      <Navbar />

      <section className="relative isolate overflow-hidden border-b border-[#2bd7ef]/16">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(40,214,239,0.16)_0%,rgba(7,20,38,0)_50%),radial-gradient(circle_at_86%_18%,rgba(175,245,70,0.1)_0%,rgba(7,20,38,0)_42%),linear-gradient(180deg,#071426_0%,#071426_100%)]" />
        <div className="absolute -left-36 bottom-6 h-[340px] w-[340px] rounded-full border border-[#2bd7ef]/16" />
        <div className="absolute right-[-120px] top-1/2 h-[300px] w-[300px] -translate-y-1/2 rounded-full border-2 border-[#aaf54f]/85 opacity-75" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-6 pb-10 pt-8 sm:px-8 lg:min-h-[calc(100vh-80px)] lg:grid-cols-[44fr_56fr] lg:px-12 lg:py-6">
          <div className="max-w-xl">
            <Image
              src="/FullLogo (4).jpg"
              alt="FreeAgent Staff"
              width={960}
              height={768}
              className="h-auto w-[220px] object-contain sm:w-[280px] lg:w-[330px]"
              priority
            />

            <h1 className="mt-3 font-serif text-[clamp(4rem,6vw,6.5rem)] font-semibold uppercase leading-[0.9] tracking-[0.01em] text-[#f7e8c6]">
              <span className="block">YOUR CAREER DESERVES</span>
              <span className="block">BETTER THAN A PDF.</span>
            </h1>

            <p className="mt-5 max-w-lg text-[1.1rem] leading-8 text-[#f7e8c6]/88">
              Create a Talent Passport that showcases your skills, experience and value, and get discovered by verified employers, on
              your terms.
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/builder"
                className="inline-flex items-center justify-center rounded-full bg-[#aff546] px-7 py-3 text-sm font-semibold text-[#071426] transition duration-300 hover:-translate-y-0.5 hover:bg-[#9fea37]"
              >
                Create Your Talent Passport
              </Link>
              <Link
                href="/find-talent"
                className="inline-flex items-center justify-center rounded-full border border-[#2bd7ef]/70 bg-transparent px-7 py-3 text-sm font-semibold text-[#dff9ff] transition duration-300 hover:-translate-y-0.5 hover:bg-[#2bd7ef]/16"
              >
                Find Talent
              </Link>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-10 w-10 overflow-hidden rounded-full border-2 border-[#071426] bg-[#0b1f38]">
                    <Image src="/placeholder-avatar.svg" alt="Professional" width={40} height={40} className="h-full w-full object-cover" />
                  </div>
                ))}
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[#071426] bg-[#1a2d45] text-xs font-semibold text-[#f7e8c6]">
                  +2K
                </div>
              </div>
              <p className="max-w-xs text-sm leading-6 text-[#f7e8c6]/86">Join 2,000+ professionals taking control of their careers.</p>
            </div>
          </div>

          <div className="relative mx-auto flex w-full max-w-[470px] items-center justify-center lg:max-w-[560px]">
            <div className="absolute -inset-8 rounded-[48px] bg-[radial-gradient(circle_at_50%_45%,rgba(43,215,239,0.36),rgba(7,20,38,0)_62%)] blur-[45px]" />
            <div className="absolute -inset-6 rounded-[48px] bg-[radial-gradient(circle_at_56%_38%,rgba(175,245,70,0.16),rgba(7,20,38,0)_66%)] blur-[35px]" />

            <article className="fa-float relative origin-center rotate-[2deg] rounded-[34px] border border-[#f7e8c6]/90 bg-[#f7e8c6] p-3 shadow-[0_35px_95px_rgba(2,10,24,0.58)] transition duration-500 hover:-translate-y-1 hover:rotate-[4deg] sm:rotate-[5deg]">
              <div className="overflow-hidden rounded-[26px] border border-[#2bd7ef]/24 bg-[#061a33]">
                <div className="border-b border-[#2bd7ef]/20 px-6 py-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <div className="absolute -inset-1 rounded-full border-2 border-[#aff546] [border-right-color:transparent] [border-bottom-color:transparent]" />
                        <div className="h-16 w-16 overflow-hidden rounded-full border border-[#c6d4e8]/40">
                          <Image
                            src="/placeholder-avatar.svg"
                            alt="Sarah Chen"
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#2bd7ef]">Talent Passport</p>
                        <h3 className="mt-1 font-serif text-[2.9rem] font-semibold leading-none text-[#f7e8c6]">Sarah Chen</h3>
                        <p className="mt-1 text-[1.65rem] font-medium leading-tight text-[#2bd7ef]">Senior Software Engineer</p>
                        <p className="mt-2 inline-flex items-center gap-1.5 text-xl font-semibold text-[#aff546]">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified
                        </p>
                      </div>
                    </div>
                    <span className="rounded-full border border-[#aff546]/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#aff546]">
                      Visible
                    </span>
                  </div>
                </div>

                <div className="space-y-5 px-6 py-5 text-[#f7e8c6]">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">Expertise</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {["React", "TypeScript", "Node.js", "AWS", "Python"].map((skill) => (
                        <span key={skill} className="rounded-full border border-[#f7e8c6]/28 px-3 py-1 text-xs text-[#f7e8c6]/92">
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">Experience</p>
                    <div className="mt-4 space-y-4">
                      {[
                        { title: "Senior Software Engineer", company: "Fintech Co.", years: "2021 - Present" },
                        { title: "Software Engineer", company: "Tech Solutions", years: "2019 - 2021" },
                        { title: "Junior Developer", company: "Webcraft", years: "2017 - 2019" },
                      ].map((role) => (
                        <div key={role.title} className="grid grid-cols-[20px_1fr] gap-3">
                          <div className="relative mt-1">
                            <span className="absolute left-[8px] top-0 h-full w-px bg-[#f7e8c6]/20" />
                            <span className="relative block h-4 w-4 rounded-full border border-[#f7e8c6]/35 bg-[#2bd7ef]/22" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-[#f7e8c6]">{role.title}</p>
                            <p className="text-sm text-[#f7e8c6]/74">
                              {role.company} • {role.years}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-3 border-t border-[#f7e8c6]/15 pt-4 sm:grid-cols-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">Location</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#f7e8c6]">
                        <MapPin className="h-4 w-4" />
                        Sydney, Australia
                      </p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#2bd7ef]">Availability</p>
                      <p className="mt-2 inline-flex items-center gap-2 text-sm text-[#f7e8c6]">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#aff546]" />
                        Open to opportunities
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </div>
        </div>
      </section>

      <section className="bg-[#f7e8c6] text-[#071426]">
        <div className="mx-auto grid max-w-7xl gap-8 px-6 py-10 sm:px-8 lg:grid-cols-3 lg:gap-0 lg:px-12">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            const iconClass = feature.tone === "lime" ? "text-[#8fdc3a] border-[#9be645]/45" : "text-[#2bd7ef] border-[#2bd7ef]/45";
            const linkClass = feature.tone === "lime" ? "text-[#8fdc3a]" : "text-[#2bd7ef]";

            return (
              <article
                key={feature.title}
                className={`px-0 lg:px-10 ${index < featureCards.length - 1 ? "lg:border-r lg:border-[#0d233c]/18" : ""}`}
              >
                <div className={`inline-flex h-16 w-16 items-center justify-center rounded-full border ${iconClass}`}>
                  <Icon className="h-7 w-7" />
                </div>
                <h3 className="mt-5 font-serif text-4xl font-semibold leading-tight text-[#071426]">{feature.title}</h3>
                <p className="mt-3 text-lg leading-8 text-[#071426]/86">{feature.description}</p>
                <Link href="#" className={`mt-5 inline-flex items-center text-lg font-medium ${linkClass}`}>
                  Learn more
                  <span className="ml-2">→</span>
                </Link>
              </article>
            );
          })}
        </div>
      </section>
    </main>
  );
}
