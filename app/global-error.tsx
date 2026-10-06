"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="bg-[#f7f8fa] text-[#1f2430]">
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "24px" }}>
          <section style={{ width: "100%", maxWidth: "520px", border: "1px solid #d9dde5", borderRadius: "16px", background: "#fff", padding: "24px", textAlign: "center" }}>
            <p style={{ margin: 0, fontSize: "12px", letterSpacing: "0.18em", fontWeight: 600 }}>ZAF TECH</p>
            <h1 style={{ margin: "14px 0 0", fontSize: "22px" }}>Application error</h1>
            <p style={{ margin: "8px 0 0", color: "#626a78", lineHeight: 1.6 }}>
              ZAF TECH could not render this page. Please try again.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{ marginTop: "20px", border: 0, borderRadius: "10px", background: "#1f2430", color: "#fff", padding: "10px 16px", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </section>
        </main>
      </body>
    </html>
  );
}
