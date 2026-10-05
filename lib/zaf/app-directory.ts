import type { ZafNetworkScope } from "@/lib/zaf/network-scope";

export const APP_CATEGORIES = [
  "AI",
  "Business",
  "Commerce",
  "Community",
  "DeFi",
  "Education",
  "Games",
  "Social",
  "Tools",
  "Other",
] as const;

export type AppCategory = (typeof APP_CATEGORIES)[number];
export type AppVerification = "verified" | "unknown";

export type DirectoryApp = {
  name: string;
  slug: string;
  url: string;
  category: AppCategory;
  categoryBasis: "name-signal" | "unclassified";
  piAuthentication: AppVerification;
  piPayments: AppVerification;
  piNet: AppVerification;
  networkScope: ZafNetworkScope;
  status: "online" | "offline" | "unknown";
  lastChecked: string;
};

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "app";
}

function classify(name: string, url: string): { category: AppCategory; basis: DirectoryApp["categoryBasis"] } {
  const value = `${name} ${url}`.toLowerCase();

  if (/\b(ai|artificial-intelligence|artificial intelligence|agent|llm|gpt)\b/.test(value)) return { category: "AI", basis: "name-signal" };
  if (/\b(defi|dex|amm|swap|liquidity|staking|token)\b/.test(value)) return { category: "DeFi", basis: "name-signal" };
  if (/\b(game|gaming|arcade|play)\b/.test(value)) return { category: "Games", basis: "name-signal" };
  if (/\b(shop|market|store|commerce|shopping|pay)\b/.test(value)) return { category: "Commerce", basis: "name-signal" };
  if (/\b(learn|education|academy|school|course)\b/.test(value)) return { category: "Education", basis: "name-signal" };
  if (/\b(social|community|chat|forum|friends)\b/.test(value)) return { category: "Social", basis: "name-signal" };
  if (/\b(business|company|enterprise|work)\b/.test(value)) return { category: "Business", basis: "name-signal" };
  if (/\b(tool|utility|explorer|scan|node|developer|dev|data)\b/.test(value)) return { category: "Tools", basis: "name-signal" };

  return { category: "Other", basis: "unclassified" };
}

export function toDirectoryApp(app: { name: string; url: string }, checkedAt: string): DirectoryApp {
  const classification = classify(app.name, app.url);
  return {
    name: app.name,
    slug: slugify(app.name),
    url: app.url,
    category: classification.category,
    categoryBasis: classification.basis,
    piAuthentication: "unknown",
    piPayments: "unknown",
    piNet: "unknown",
    networkScope: "unknown",
    status: "unknown",
    lastChecked: checkedAt,
  };
}
