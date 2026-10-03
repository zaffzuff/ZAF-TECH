"use client";

import { useEffect, useState } from "react";
import { calculateNodeHealth, type NodeHealthScore } from "@/lib/zaf/node-health";

type NodePayload = Record<string, unknown>;

function value(obj: NodePayload | null, keys: string[]) {
  if (!obj) return null;
  for (const key of keys) {
    const current = obj[key];
    if (current !== undefined && current !== null) return current;
  }
  return null;
}

export default function NodeHealthPage() {
  const [score, setScore] = useState<NodeHealthScore | null>(null);
  const [payload, setPayload] = useState<NodePayload | null>(null);
  const [online, setOnline] = useState(false);

  useEffect(() => {
    let active = true;
    fetch("http://127.0.0.1:39100/node", { cache: "no-store" })
      .then(async response => {
        if (!response.ok) throw new Error();
        const data = await response.json() as NodePayload;
        if (!active) return;
        setPayload(data);
        setOnline(true);
        const peers = Number(value(data, ["authenticatedPeers", "authenticated_peers", "peersAuthenticated"]));
        const age = Number(value(data, ["ledgerAge", "ledger_age", "ledgerAgeSeconds"]));
        const ports = Number(value(data, ["listeningPorts", "listening_ports"]));
        const restarts = Number(value(data, ["restarts", "restartCount", "restart_count"]));
        setScore(calculateNodeHealth({
          available: true,
          synced: Boolean(value(data, ["synced", "isSynced", "sync"])),
          ledgerAgeSeconds: Number.isFinite(age) ? age : null,
          authenticatedPeers: Number.isFinite(peers) ? peers : null,
          listeningPorts: Number.isFinite(ports) ? ports : null,
          quorumPhase: String(value(data, ["quorumPhase", "quorum_phase"]) ?? ""),
          intersection: value(data, ["intersection", "quorumIntersection"]) === true,
          restarts: Number.isFinite(restarts) ? restarts : null,
        }));
      })
      .catch(() => {
        if (!active) return;
        setOnline(false);
        setScore(calculateNodeHealth({ available: false, synced: false, ledgerAgeSeconds: null, authenticatedPeers: null, listeningPorts: null, quorumPhase: null, intersection: null, restarts: null }));
      });
    return () => { active = false; };
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Node Health Score</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">A descriptive score derived only from the local ZAF TECH Node Connector observation. It is not an Internet-wide Node ranking.</p>
      <section className="mt-5 rounded-xl border border-border bg-card p-5">
        <div className="text-4xl font-bold text-foreground">{score?.score ?? "—"}</div>
        <div className="mt-1 text-sm font-semibold text-foreground">{score?.status ?? "collecting"}</div>
        <div className="mt-1 text-[10px] text-muted-foreground">Connector {online ? "available" : "unavailable"}</div>
      </section>
      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Score Basis</h2>
        <div className="mt-3 space-y-2">
          {(score?.reasons ?? ["Waiting for local Node Connector data."]).map(reason => <div key={reason} className="rounded-lg border border-border px-3 py-2 text-[10px] text-muted-foreground">{reason}</div>)}
        </div>
      </section>
      <section className="mt-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Raw Connector Observation</h2>
        <pre className="mt-3 max-h-96 overflow-auto rounded-lg border border-border bg-background p-3 text-[10px] text-foreground">{payload ? JSON.stringify(payload, null, 2) : "No local observation available."}</pre>
      </section>
    </main>
  );
}
