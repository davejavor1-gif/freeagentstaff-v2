import type { ReactNode } from "react";
import Footer from "@/components/layout/Footer";
import Navbar from "@/components/layout/Navbar";

type InformationPageProps = {
  eyebrow?: string;
  title: string;
  titleColor?: string;
  description: string;
  children: ReactNode;
};

export default function InformationPage({
  eyebrow,
  title,
  titleColor = "#08111F",
  description,
  children,
}: InformationPageProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[#08111F] text-[#f7ebcf]">
      <Navbar />
      <section className="relative overflow-hidden bg-[#08111F] px-6 pt-14 pb-6 sm:px-8 sm:pt-18 sm:pb-8 lg:px-12">
        <div className="relative mx-auto max-w-5xl rounded-[28px] border border-[#cda64d]/45 bg-[#f7e8c6] p-6 shadow-[0_8px_24px_rgba(6,16,33,0.12)] sm:p-10">
          {eyebrow ? (
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#f2cc63]">{eyebrow}</p>
          ) : null}
          <h1
            className={`${eyebrow ? "mt-4" : ""} max-w-3xl text-4xl font-black uppercase leading-[1.05] tracking-[0.04em] sm:text-5xl`}
            style={{ color: titleColor }}
          >
            {title}
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-[#08111F] sm:text-lg">
            {description}
          </p>
        </div>
      </section>
      <section className="flex-1 px-6 pt-6 pb-10 sm:px-8 sm:pt-8 sm:pb-14 lg:px-12">
        <div className="mx-auto max-w-5xl rounded-[28px] border border-[#cda64d]/45 bg-[#f7ebcf] p-6 text-[#0f2744] shadow-[0_8px_24px_rgba(6,16,33,0.12)] [&_a]:!text-[#0f2744] [&_a]:decoration-[#4f9f4e] [&_h2]:font-bold [&_h2]:!text-[#0f2744] [&_p]:!text-[#0f2744] [&_li]:!text-[#0f2744] [&_section]:border-[#cda64d]/30 sm:p-10">
          {children}
        </div>
      </section>
      <Footer />
    </main>
  );
}