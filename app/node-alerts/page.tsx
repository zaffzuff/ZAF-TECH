"use client";

import { useEffect, useState } from "react";

type Alert = { severity: "warning" | "critical"; title: string; detail: string };

export default function NodeAlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let active = true;
    const check = async () => {
      try {
        const response = await fetch("http://127.0.0.1:39100/node", { cache: "no-store" });
        if (!response.ok) throw new Error();
        const data = await response.json() as Record<string, unknown>;
        const age = Number(data.ledgerAge ?? data.ledger_age ?? data.ledgerAgeSeconds);
        const peers = Number(data.authenticatedPeers ?? data.authenticated_peers ?? data.peersAuthenticated);
        const synced = Boolean(data.synced ?? data.isSynced);
        const phase = String(data.quorumPhase ?? data.quorum_phase ?? "");
        const next: Alert[] = [];
        if (!synced) next.push({ severity: "critical", title: "Node is not synced", detail: "The local Connector is not reporting a synced state." });
        if (Number.isFinite(age) && age >= 30) next.push({ severity: "critical", title: "Ledger age is high", detail: "Observed ledger age is " + age + " seconds." });
        else if (Number.isFinite(age) && age >= 10) next.push({ severity: "warning", title: "Ledger age is elevated", detail: "Observed ledger age is " + age + " seconds." });
        if (Number.isFinite(peers) && peers < 4) next.push({ severity: "warning", title: "Low authenticated peer count", detail: "Only " + peers + " authenticated peers are reported." });
        if (phase && phase !== "EXTERNALIZE") next.push({ severity: "warning", title: "SCP phase differs from EXTERNALIZE", detail: "Current reported phase: " + phase });
        if (active) { setAlerts(next); setOnline(true); }
      } catch {
        if (active) { setOnline(false); setAlerts([{ severity: "critical", title: "Node Connector unavailable", detail: "No local Node observation could be collected." }]); }
      }
    };
    void check();
    const id = window.setInterval(() => void check(), 15000);
    return () => { active = false; window.clearInterval(id); };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Node Alerts</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Local observation warnings derived from the Node Connector. These are descriptive checks, not a claim about the public network.</p>
      <section className="mt-5 rounded-xl border border-border bg-card p-4 text-xs">Connector: {online ? "Available" : "Unavailable"} · Active alerts: {alerts.length}</section>
      <section className="mt-3 space-y-2">
        {alerts.length ? alerts.map(alert => (
          <article key={alert.title} className="rounded-xl border border-border bg-card p-4">
            <div className="text-[9px] uppercase tracking-wide text-muted-foreground">{alert.severity}</div>
            <h2 className="mt-1 text-sm font-semibold text-foreground">{alert.title}</h2>
            <p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">{alert.detail}</p>
          </article>
        )) : <div className="rounded-xl border border-border bg-card p-4 text-[11px] text-muted-foreground">No current Node alerts.</div>}
      </section>
    </main>
  );
}
