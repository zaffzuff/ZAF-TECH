import { NextResponse } from "next/server";
import { readPiAuthInput, PiInputError } from "@/lib/zaf/pi/auth-input";
import { enforceRateLimit } from "@/lib/zaf/rate-limit";
import { a2uConfig } from "@/lib/zaf/pi/a2u-config";
import { A2uError } from "@/lib/zaf/pi/a2u-flow";
import { claimTestPi, verifyA2uIdentity } from "@/lib/zaf/pi/a2u-server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const headers = { "Cache-Control": "no-store, max-age=0" };

export async function GET() {
  return NextResponse.json({ enabled: a2uConfig().ready, amount: "0.01", network: "Pi Testnet", maximumRecipients: 5 }, { headers });
}

export async function POST(request: Request) {
  if (!a2uConfig().ready) return NextResponse.json({ code: "TEST_NOT_ENABLED" }, { status: 503, headers });
  const limited = await enforceRateLimit(request, "testnet-a2u", { limit: 6, windowMs: 60_000 });
  if (limited) return limited;
  try {
    // No caller-supplied UID, amount, destination, payment ID, or XDR is used.
    const accessToken = await readPiAuthInput(request);
    const uid = await verifyA2uIdentity(accessToken);
    return NextResponse.json(await claimTestPi(uid), { headers });
  } catch (error) {
    if (error instanceof A2uError) return NextResponse.json({ code: error.code }, { status: error.status, headers });
    if (error instanceof PiInputError) return NextResponse.json({ code: "INVALID_REQUEST" }, { status: error.status, headers });
    // Never log SDK errors, upstream bodies, tokens, seeds, SQL, or envelopes.
    return NextResponse.json({ code: "REVIEW_REQUIRED" }, { status: 503, headers });
  }
}
