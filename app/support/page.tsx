import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

const SUPPORT_EMAIL = "support@freeagentstaff.com";

export default function SupportPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/35 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Support</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Get help with your account</h1>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            Contact <a className="font-semibold text-slate-900 underline underline-offset-4" href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for product support, account access issues, privacy or correction questions, or manual account deactivation and deletion requests.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-bold text-slate-900">Support scope</h2>
              <p className="mt-2">
                Support currently covers general product questions, account access problems, employer verification questions, privacy and correction requests, contact-access issues, and manual account deletion or deactivation requests.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Security and privacy concerns</h2>
              <p className="mt-2">
                If you believe your account has been compromised, or if you need to report a security or privacy concern, contact support and include as much relevant detail as possible.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Account deletion and deactivation</h2>
              <p className="mt-2">
                Self-serve account deletion is not part of V1. Users should contact support to request account deactivation or deletion review.
              </p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}