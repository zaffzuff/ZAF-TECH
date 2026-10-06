import { NextRequest, NextResponse } from "next/server";
import { getEcosystemGraph } from "@/lib/zaf/ecosystem-graph";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  const maxNodes = Number(request.nextUrl.searchParams.get("maxNodes") ?? "120");
  const limit = Number.isFinite(maxNodes) ? maxNodes : 120;
  const network = request.nextUrl.searchParams.get("network")?.trim().toLowerCase();
  if (network && !["mainnet", "testnet", "unknown", "all"].includes(network)) {
    return NextResponse.json({ error: "Invalid network filter.", networkScope: "unknown" }, { status: 400 });
  }
  const data = await getEcosystemGraph({ maxNodes: limit });
  const filtered = network && network !== "all"
    ? { ...data, nodes: data.nodes.filter(node => node.networkScope === network || node.type === "network"), edges: data.edges.filter(edge => data.nodes.some(node => node.id === edge.from && (node.networkScope === network || node.type === "network")) && data.nodes.some(node => node.id === edge.to && (node.networkScope === network || node.type === "network"))) }
    : data;
  return NextResponse.json(filtered, { headers: { "Cache-Control": "no-store, max-age=0" } });
}
