import { getUnifiedObservation } from "@/lib/zaf/observation-engine";
import { getObservationHistory, isObservationHistoryConfigured } from "@/lib/zaf/observation-history";

export const dynamic = "force-dynamic";

function num(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? "—" : value.toLocaleString("en-US");
}

export default async function ObservatoryPage() {
  const observation = await getUnifiedObservation();
  const history = await getObservationHistory(24);
  const network = observation.network;
  const ecosystem = observation.ecosystem;
  const latest = network?.latestLedger;

  return (
    <main className="mx-auto max-w-4xl px-4 pb-12 pt-8">
      <header className="border-b border-border pb-5">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</div>
        <h1 className="mt-2 text-2xl font-bold text-foreground">Observatory 2.0</h1>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          Unified public observations for Pi Network and the Pi ecosystem. Read-only measurement with explicit freshness and confidence boundaries.
        </p>
      </header>

      <section className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Observation Health", String(observation.health.score), observation.health.status],
          ["Signal Confidence", String(observation.confidence.score), observation.confidence.level],
          ["Freshness", observation.freshness.state, observation.freshness.ageSeconds + "s age"],
          ["Source Coverage", String((ecosystem?.sources.filter(s => s.status === "available").length ?? 0) + "/" + (ecosystem?.sources.length ?? 0)), "public sources"],
        ].map(([title, value, detail]) => (
          <div key={title} className="rounded-xl border border-border bg-card p-4">
            <div className="text-xl font-bold text-foreground">{value}</div>
            <div className="mt-1 text-xs font-medium text-foreground">{title}</div>
            <div className="mt-1 text-[10px] text-muted-foreground">{detail}</div>
          </div>
        ))}
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Confidence Basis</h2>
        <div className="mt-3 space-y-2">
          {observation.confidence.reasons.map(reason => (
            <div key={reason} className="rounded-lg border border-border px-3 py-2 text-[10px] text-muted-foreground">{reason}</div>
          ))}
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Network Deep View</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Protocol</div><div className="mt-1 text-sm font-semibold">v{network?.metrics.latestProtocolVersion ?? "—"}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Latest Ledger</div><div className="mt-1 text-sm font-semibold">{latest?.sequence ?? "—"}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Daily Transactions</div><div className="mt-1 text-sm font-semibold">{num(network?.metrics.observedTransactionsPerDay)}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Daily Operations</div><div className="mt-1 text-sm font-semibold">{num(network?.metrics.observedOperationsPerDay)}</div></div>
        </div>
        {latest ? <div className="mt-3 break-all rounded-lg border border-border p-3 text-[10px] text-muted-foreground">Hash: {latest.hash}<br />Closed: {latest.closedAt}</div> : null}
        {latest ? <a className="mt-3 inline-block text-[10px] underline underline-offset-2" href={"/api/zaf/ledger/" + latest.sequence} target="_blank" rel="noreferrer">Open Ledger JSON</a> : null}
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Ecosystem Observatory</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Observed Apps</div><div className="mt-1 text-sm font-semibold">{num(ecosystem?.apps.totalCount)}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Signals</div><div className="mt-1 text-sm font-semibold">{num(ecosystem?.signals.length)}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Sources</div><div className="mt-1 text-sm font-semibold">{ecosystem?.sources.length ?? 0}</div></div>
          <div className="rounded-lg border border-border p-3"><div className="text-[10px] text-muted-foreground">Apps Source</div><div className="mt-1 text-sm font-semibold">{ecosystem?.apps.sourceAvailable ? "Available" : "Unavailable"}</div></div>
        </div>
      </section>

      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Historical Observation Timeline</h2>
        <p className="mt-1 text-[10px] text-muted-foreground">
          {isObservationHistoryConfigured() ? "5-minute observation buckets are stored when DATABASE_URL is configured." : "Historical storage is not configured on this deployment; live observations remain available."}
        </p>
        <div className="mt-3 space-y-1.5">
          {history.map(point => (
            <div key={point.generatedAt} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 rounded-md border border-border px-2 py-2 text-[10px]">
              <span className="text-muted-foreground">{new Date(point.generatedAt).toLocaleString()}</span>
              <span>Confidence {point.confidenceScore ?? "—"}</span>
              <span>Ledger {point.networkLedger ?? "—"}</span>
              <span>{point.availableSources}/{point.totalSources}</span>
            </div>
          ))}
          {!history.length ? <div className="rounded-lg border border-border p-3 text-[10px] text-muted-foreground">No stored observation points yet.</div> : null}
        </div>
      </section>

      <footer className="mt-6 border-t border-border pt-4 text-[10px] leading-relaxed text-muted-foreground">
        Read-only public observations. ZAF TECH does not infer missing signals or claim full-network coverage.
      </footer>
    </main>
  );
}
