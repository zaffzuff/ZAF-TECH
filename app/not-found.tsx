import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 text-foreground">
      <section className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 text-center shadow-sm">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</p>
        <h1 className="mt-3 text-xl font-semibold">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          The requested page does not exist or is no longer available.
        </p>
        <Link href="/" className="mt-5 inline-flex max-w-full items-center justify-center rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
          Return to ZAF TECH
        </Link>
      </section>
    </main>
  );
}
