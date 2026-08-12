import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <section className="mx-auto max-w-5xl px-6 py-12 sm:px-8 lg:px-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-lg shadow-slate-200/35 sm:p-10">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-amber-500">Terms of Use</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight text-slate-900">Draft Terms of Use</h1>
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Legal review required before production launch.
          </p>

          <div className="mt-8 space-y-6 text-sm leading-7 text-slate-600">
            <section>
              <h2 className="text-lg font-bold text-slate-900">Platform purpose</h2>
              <p className="mt-2">
                Free Agent Staff helps talent showcase a Talent Passport and allows verified employers to discover profiles, request introductions, access contact details after accepted connections, and manage those workflows securely.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Account responsibilities</h2>
              <p className="mt-2">
                Users are expected to provide accurate account information, protect their credentials, and use the platform only for legitimate professional engagement within the intended marketplace flows.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-bold text-slate-900">Launch review note</h2>
              <p className="mt-2">
                This draft route exists so launch trust surfaces are real and navigable. Final legal terms still require review and approval before production use.
              </p>
            </section>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}