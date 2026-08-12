import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/35 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Privacy Policy</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Draft Privacy Policy</h1>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Legal review required before production launch.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-bold text-slate-900">What this draft covers</h2>
              <p className="mt-2">
                This draft explains the categories of profile, employer, verification, connection, contact, and notification data used by Free Agent Staff.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Core product data</h2>
              <p className="mt-2">
                Free Agent Staff stores talent profile information, employer account information, employer verification details, introduction request history, connection status, and in-app notifications needed to operate the platform.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Visibility and privacy controls</h2>
              <p className="mt-2">
                Talent users control visibility, publication state, and blocked company settings inside the authenticated Privacy & Visibility experience. Those settings influence employer access throughout discovery, Talent Passport, contact access, and related workflows.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Support and privacy requests</h2>
              <p className="mt-2">
                For support, privacy, deactivation, or account deletion requests, contact <a className="font-semibold text-slate-900 underline underline-offset-4" href="mailto:support@freeagentstaff.com">support@freeagentstaff.com</a>.
              </p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
