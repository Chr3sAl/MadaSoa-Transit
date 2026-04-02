export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="glass-card w-full max-w-lg rounded-[2rem] p-8 text-center">
        <div className="mx-auto h-14 w-14 animate-pulse rounded-full bg-[var(--accent-soft)]" />
        <p className="mt-6 text-xs uppercase tracking-[0.3em] text-[var(--brand)]">
          MadaSoa Transit
        </p>
        <h1 className="mt-3 text-3xl font-black">Loading workspace</h1>
        <p className="mt-3 text-sm leading-6 text-[var(--muted)]">
          Preparing the current page and fetching the latest shipment data.
        </p>
      </div>
    </main>
  );
}
