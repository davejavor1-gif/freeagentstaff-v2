"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, Play } from "lucide-react";

export default function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#07111f] text-white">
      <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-[#c79e4f]/15 blur-[140px]" />

      <div className="relative mx-auto grid min-h-[720px] max-w-7xl items-center gap-16 px-6 py-20 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-6 inline-flex rounded-full border border-[#c79e4f]/40 bg-[#c79e4f]/10 px-4 py-2 text-sm font-semibold text-[#d8b568]">
            Your career deserves better than a PDF
          </div>

          <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
            Every professional
            <span className="block text-[#c79e4f]">has a story.</span>
          </h1>

          <p className="mt-7 max-w-xl text-lg leading-8 text-white/70">
            Create a premium, shareable FreeAgent Card that brings your
            experience, strengths and personality together in one memorable
            professional identity.
          </p>

          <div className="mt-10 flex flex-col gap-4 sm:flex-row">
            <Link
              href="/builder"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#c79e4f] px-7 py-4 font-bold text-[#07111f] transition hover:-translate-y-1 hover:bg-[#d8b568]"
            >
              Create your FreeAgent Card
              <ArrowRight size={18} />
            </Link>

            <Link
              href="#how-it-works"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 px-7 py-4 font-semibold transition hover:bg-white/10"
            >
              <Play size={18} />
              See how it works
            </Link>
          </div>

          <div className="mt-10 flex flex-wrap gap-6 text-sm text-white/55">
            <span>✓ Free to create</span>
            <span>✓ Share by link or QR</span>
            <span>✓ Built for mobile</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.94, rotate: 2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto w-full max-w-[430px]"
        >
          <div className="absolute -inset-10 rounded-full bg-[#c79e4f]/20 blur-3xl" />

          <div className="relative overflow-hidden rounded-[32px] border border-[#c79e4f]/70 bg-[#f5efe2] p-5 text-[#07111f] shadow-2xl">
            <div className="rounded-[24px] bg-[#0b1828] p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold tracking-[0.25em] text-[#c79e4f]">
                  FREEAGENT
                </div>
                <div className="text-xs font-semibold text-white/70">
                  FA · 7SC1
                </div>
              </div>

              <div className="mt-8 flex h-64 items-center justify-center rounded-2xl bg-gradient-to-b from-[#243448] to-[#111b28]">
                <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-[#c79e4f] bg-[#d9d9d9] text-5xl font-bold text-[#07111f]">
                  SC
                </div>
              </div>
            </div>

            <div className="px-3 pb-3 pt-6 text-center">
              <h2 className="text-4xl font-black tracking-tight">SARAH CHEN</h2>
              <p className="mt-1 font-bold tracking-wide text-[#9d792e]">
                SENIOR SOFTWARE ENGINEER
              </p>

              <div className="mt-6 flex items-center justify-between rounded-xl border border-[#d8cfbb] px-4 py-3 text-sm font-semibold">
                <span>🟢 Open to opportunities</span>
                <span>Available now</span>
              </div>

              <div className="mt-4 rounded-2xl bg-[#07111f] px-5 py-5 text-left text-white">
                <div className="text-xs font-bold tracking-widest text-[#c79e4f]">
                  TOP STRENGTH
                </div>
                <div className="mt-1 text-xl font-bold">
                  Systems Architecture
                </div>
                <p className="mt-2 text-sm leading-6 text-white/65">
                  Designing scalable systems that solve complex problems and
                  deliver real impact.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}