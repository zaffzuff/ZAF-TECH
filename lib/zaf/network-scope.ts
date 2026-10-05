export const ZAF_NETWORK_SCOPES = ["mainnet", "testnet", "unknown"] as const;

export type ZafNetworkScope = (typeof ZAF_NETWORK_SCOPES)[number];

export type ZafObservationScope = {
  network: ZafNetworkScope;
  source: string;
  observedAt: string | null;
};

export function isZafNetworkScope(value: unknown): value is ZafNetworkScope {
  return value === "mainnet" || value === "testnet" || value === "unknown";
}

export function normalizeZafNetworkScope(value: unknown): ZafNetworkScope {
  if (isZafNetworkScope(value)) return value;
  return "unknown";
}
