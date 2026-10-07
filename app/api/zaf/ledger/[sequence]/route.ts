import { NextResponse } from "next/server";
import { rateLimit } from "@/lib/zaf/rate-limit";

const BASE = "https://api.mainnet.minepi.com";
export const dynamic = "force-dynamic";

function validSequence(value: string) {
  return /^\d{1,12}$/.test(value) && Number(value) > 0;
}

export async function GET(request: Request, context: { params: Promise<{ sequence: string }> }) {
  const rate = rateLimit(request, { prefix: "zaf-ledger", limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": String(rate.retryAfterSeconds) } });

  const { sequence } = await context.params;
  if (!validSequence(sequence)) return NextResponse.json({ error: "Invalid ledger sequence." }, { status: 400 });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(BASE + "/ledgers/" + sequence, {
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response.ok) {
      return NextResponse.json({ error: "Pi Horizon returned HTTP " + response.status + "." }, { status: response.status === 404 ? 404 : 502 });
    }
    const raw = await response.json();
    return NextResponse.json({
      sequence,
      hash: raw.hash ?? null,
      closedAt: raw.closed_at ?? null,
      protocolVersion: raw.protocol_version ?? null,
      transactionCount: raw.transaction_count ?? null,
      operationCount: raw.operation_count ?? null,
      successfulTransactionCount: raw.successful_transaction_count ?? null,
      failedTransactionCount: raw.failed_transaction_count ?? null,
      successfulOperationCount: raw.successful_operation_count ?? null,
      baseFeeInStroops: raw.base_fee_in_stroops ?? null,
      baseReserveInStroops: raw.base_reserve_in_stroops ?? null,
      source: BASE,
    }, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120", "X-RateLimit-Limit": "30", "X-RateLimit-Remaining": String(rate.remaining) },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error && error.name === "AbortError" ? "Ledger lookup timed out." : "Ledger lookup failed." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}
