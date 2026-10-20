/** Pi wallet convention: dot grouping, decimal comma, up to seven decimal places. */
export function formatAmount(value: number | null | undefined, unit: string): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return value.toLocaleString("tr-TR", { maximumFractionDigits: 7 }) + " " + unit;
}
export function formatAssetAmount(value: number | null | undefined, asset: { assetType: string | null; assetCode: string | null; label: string }): string {
  return formatAmount(value, asset.assetType === "native" ? "π" : asset.assetCode ?? asset.label);
}
