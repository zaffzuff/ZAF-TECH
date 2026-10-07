export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm" aria-live="polite">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</p>
        <div className="mx-auto mt-5 h-7 w-7 animate-spin rounded-full border-2 border-border border-t-foreground" />
        <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
      </section>
    </main>
  );
}
