export default function OfflinePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#08111F] px-6 text-center text-slate-50">
      <div className="max-w-lg space-y-4">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-emerald-400/60 bg-emerald-400/10 text-2xl">
          📡
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">You’re offline</h1>
        <p className="text-base text-slate-300">
          Reconnect to continue using FreeAgentStaff.
        </p>
      </div>
    </main>
  );
}
