import { getObservationHistory, type ObservationHistoryRecord } from "@/lib/zaf/observation-history";

export type ProtocolHistoryPoint = {
  generatedAt: string;
  protocolVersion: number;
  networkLedger: string | null;
};

export type ProtocolTransition = {
  from: number;
  to: number;
  observedAt: string;
  previousObservedAt: string | null;
};

export type ProtocolHistorySummary = {
  points: ProtocolHistoryPoint[];
  transitions: ProtocolTransition[];
  latestStoredProtocol: number | null;
  previousStoredProtocol: number | null;
};

function buildProtocolHistory(records: ObservationHistoryRecord[]): ProtocolHistorySummary {
  const points = records
    .filter((record): record is ObservationHistoryRecord & { protocolVersion: number } => Number.isFinite(record.protocolVersion))
    .map(record => ({
      generatedAt: record.generatedAt,
      protocolVersion: record.protocolVersion,
      networkLedger: record.networkLedger,
    }));

  const chronological = [...points].reverse();
  const transitions: ProtocolTransition[] = [];
  let previous: ProtocolHistoryPoint | null = null;

  for (const point of chronological) {
    if (previous && previous.protocolVersion !== point.protocolVersion) {
      transitions.push({
        from: previous.protocolVersion,
        to: point.protocolVersion,
        observedAt: point.generatedAt,
        previousObservedAt: previous.generatedAt,
      });
    }
    previous = point;
  }

  const latestStoredProtocol = points[0]?.protocolVersion ?? null;
  let previousStoredProtocol: number | null = null;

  if (latestStoredProtocol != null) {
    for (const point of points.slice(1)) {
      if (point.protocolVersion !== latestStoredProtocol) {
        previousStoredProtocol = point.protocolVersion;
        break;
      }
    }
  }

  return {
    points,
    transitions,
    latestStoredProtocol,
    previousStoredProtocol,
  };
}

export async function getProtocolHistory(limit = 120) {
  const records = await getObservationHistory(limit);
  return buildProtocolHistory(records);
}

export { buildProtocolHistory };
