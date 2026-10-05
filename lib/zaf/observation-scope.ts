import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

export type ZafScopedEntity = {
  networkScope: ZafNetworkScope;
};

export function scopeLabel(scope: ZafNetworkScope, locale: "en" | "tr" = "en") {
  if (scope === "mainnet") return locale === "tr" ? "Mainnet" : "Mainnet";
  if (scope === "testnet") return locale === "tr" ? "Testnet" : "Testnet";
  return locale === "tr" ? "Bilinmiyor" : "Unknown";
}
