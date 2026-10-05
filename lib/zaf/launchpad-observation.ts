export type LaunchpadSourceState = "published-evidence" | "unavailable";

export type LaunchpadEvidence = {
  id: string;
  token: string;
  project: string;
  networkScope: "testnet";
  phase: "completed-testnet-launch";
  publishedAt: string;
  participationSummary: string;
  tokenSupplySummary: string;
  observedDesignNotes: string[];
  sourceUrl: string;
};

export type LaunchpadObservation = {
  generatedAt: string;
  networkScope: "testnet";
  sourceState: LaunchpadSourceState;
  live: {
    available: false;
    source: null;
    note: string;
  };
  currentOfficialStatus: {
    stage: "testnet-iteration";
    mainnetStatus: "not-observed";
    sourceUrl: string;
    sourceDate: string;
  };
  launches: LaunchpadEvidence[];
  notes: string[];
};

export function getLaunchpadObservation(): LaunchpadObservation {
  return {
    generatedAt: new Date().toISOString(),
    networkScope: "testnet",
    sourceState: "published-evidence",
    live: {
      available: false,
      source: null,
      note: "No direct public Launchpad API or live event feed is wired into ZAF TECH in this phase. Published official evidence is separated from live observations.",
    },
    currentOfficialStatus: {
      stage: "testnet-iteration",
      mainnetStatus: "not-observed",
      sourceUrl: "https://minepi.com/blog/pi-for-ai/",
      sourceDate: "2026-09-04",
    },
    launches: [
      {
        id: "irra-testnet",
        token: "IRRA",
        project: "Pi Launchpad first Testnet token",
        networkScope: "testnet",
        phase: "completed-testnet-launch",
        publishedAt: "2026-06-11",
        participationSummary: "478,000+ Pioneers staked 36.05M Test-Pi; 198,000+ committed 14.72M Test-Pi; 11.71M Test-Pi applied toward acquisition.",
        tokenSupplySummary: "10M IRRA test tokens were the acquisition target described by Pi.",
        observedDesignNotes: [
          "Launchpad participation used staking and commitment mechanics.",
          "The launch was introduced as a Testnet learning and feedback phase.",
          "The model was intended to support product-first ecosystem token design."
        ],
        sourceUrl: "https://minepi.com/blog/launchpad-update-flow/",
      },
      {
        id: "slice-testnet",
        token: "SLICE",
        project: "Slice of Pi",
        networkScope: "testnet",
        phase: "completed-testnet-launch",
        publishedAt: "2026-07-24",
        participationSummary: "242,000+ participating Pioneers committed 15.92M Test-Pi toward 10M SLICE Test tokens.",
        tokenSupplySummary: "10M SLICE Test tokens were distributed through the second Testnet launch; Pi states SLICE will never go to Mainnet.",
        observedDesignNotes: [
          "The updated flow centered on the amount of Test-Pi committed.",
          "The launch introduced fair-access hold calculations and an engagement bonus.",
          "The post-launch interface exposed allocation, launch/effective token prices and a SLICE liquidity-pool price chart."
        ],
        sourceUrl: "https://minepi.com/blog/launchpad-liquidity-pool/",
      }
    ],
    notes: [
      "Launchpad observations in this phase are scoped to Pi Testnet.",
      "Published official figures are evidence records, not live blockchain measurements.",
      "The current official source describes Pi Launchpad as being iterated on Testnet.",
      "No Mainnet Launchpad activation is inferred from the existence of Testnet launches.",
      "No token price, market cap, or network-wide volume is inferred without a separate observable source."
    ]
  };
}
