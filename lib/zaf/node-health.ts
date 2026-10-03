export type NodeHealthInput = {
  available: boolean;
  synced: boolean;
  ledgerAgeSeconds: number | null;
  authenticatedPeers: number | null;
  listeningPorts: number | null;
  quorumPhase: string | null;
  intersection: boolean | null;
  restarts: number | null;
};

export type NodeHealthScore = {
  score: number;
  status: "healthy" | "degraded" | "limited" | "offline";
  reasons: string[];
};

export function calculateNodeHealth(input: NodeHealthInput): NodeHealthScore {
  if (!input.available) return { score: 0, status: "offline", reasons: ["Connector did not report an available Node."] };

  let score = 35;
  const reasons: string[] = [];

  if (input.synced) { score += 20; reasons.push("Node reports synced state."); }
  else reasons.push("Node is not currently reporting synced state.");

  if (input.ledgerAgeSeconds != null) {
    if (input.ledgerAgeSeconds < 10) { score += 15; reasons.push("Ledger age is under 10 seconds."); }
    else if (input.ledgerAgeSeconds < 30) { score += 8; reasons.push("Ledger age is elevated but still observable."); }
    else reasons.push("Ledger age is above the preferred threshold.");
  }

  if (input.authenticatedPeers != null) {
    if (input.authenticatedPeers >= 8) { score += 10; reasons.push("At least 8 authenticated peers are observed."); }
    else if (input.authenticatedPeers >= 4) { score += 5; reasons.push("Some authenticated peers are observed, but below the preferred level."); }
    else reasons.push("Authenticated peer count is low.");
  }

  if (input.quorumPhase === "EXTERNALIZE") { score += 5; reasons.push("SCP phase is EXTERNALIZE."); }
  if (input.intersection === true) { score += 5; reasons.push("Quorum intersection is reported true."); }
  if (input.listeningPorts != null && input.listeningPorts >= 4) { score += 5; reasons.push("Multiple local Node listeners are active."); }
  if (input.restarts != null && input.restarts > 0) reasons.push("One or more restarts were observed.");

  const bounded = Math.max(0, Math.min(100, score));
  return {
    score: bounded,
    status: bounded >= 80 ? "healthy" : bounded >= 55 ? "degraded" : "limited",
    reasons,
  };
}
