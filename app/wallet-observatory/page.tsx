"use client";

import { useState } from "react";

type WalletResponse = {
  address: string;
  network: string;
  exists: boolean | null;
  accountBalancePi: number | null;
  observableClaimablePi: number | null;
  lastActivity: string | null;
  analytics?: {
    transactionCount: number;
    operationCount: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number | null;
    totalObservedFeesPi: number;
    firstObservedAt: string | null;
    lastObservedAt: string | null;
    activeLedgerCount: number;
    operationTypeCounts: Array<{ type: string; count: number }>;
  };
};

export default function WalletObservatoryPage() {
  const [address, setAddress] = useState("");
  const [network, setNetwork] = useState("mainnet");
  const [data, setData] = useState<WalletResponse | null>(null);
  const [error, setError] = useState("");

  async function inspect() {
    setError("");
    setData(null);
    const normalized = address.trim().toUpperCase();
    const response = await fetch("/api/zaf/wallet?address=" + encodeURIComponent(normalized) + "&network=" + network, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error ?? "Wallet inspection failed.");
      return;
    }
    setData(result);
  }

  return (
    <main className="mx-auto max-w-3xl px-4 pb-12 pt-8">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">ZAF TECH</div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">Wallet Observatory 2.0</h1>
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Public read-only wallet observations and activity analytics. No private keys or wallet credentials are requested.</p>
      <section className="mt-5 rounded-xl border border-border bg-card p-4">
        <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Pi wallet address (G…)" className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none" />
        <div className="mt-2 flex gap-2">
          <select value={network} onChange={e => setNetwork(e.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-xs"><option value="mainnet">Mainnet</option><option value="testnet">Testnet</option></select>
          <button type="button" onClick={() => void inspect()} className="rounded-lg bg-foreground px-4 py-2 text-xs font-medium text-background">Inspect</button>
        </div>
        {error ? <div className="mt-3 text-[10px] text-muted-foreground">{error}</div> : null}
      </section>
      {data ? <section className="mt-3 space-y-2">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-xl font-bold">{data.accountBalancePi ?? "—"}</div><div className="mt-1 text-xs">Balance Pi</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-xl font-bold">{data.analytics?.transactionCount ?? "—"}</div><div className="mt-1 text-xs">Transactions</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-xl font-bold">{data.analytics?.operationCount ?? "—"}</div><div className="mt-1 text-xs">Operations</div></div>
          <div className="rounded-xl border border-border bg-card p-4"><div className="text-xl font-bold">{data.analytics?.successRate == null ? "—" : data.analytics.successRate.toFixed(1) + "%"}</div><div className="mt-1 text-xs">Success Rate</div></div>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 text-[10px] text-muted-foreground">
          Observed Fees: {data.analytics?.totalObservedFeesPi ?? "—"} Pi · Active Ledgers: {data.analytics?.activeLedgerCount ?? "—"} · Network: {data.network}
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Operation Types</h2>
          <div className="mt-3 space-y-1.5">{(data.analytics?.operationTypeCounts ?? []).map(item => <div key={item.type} className="flex justify-between border-b border-border py-1.5 text-[10px]"><span>{item.type}</span><span>{item.count}</span></div>)}</div>
        </div>
      </section> : null}
    </main>
  );
}
