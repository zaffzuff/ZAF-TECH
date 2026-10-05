export type EcosystemStakingAvailability = {
  network: "mainnet";
  rankingRelation: "stake-influences-ecosystem-directory-ranking";
  broadPublicFeed: "not-observed";
  developerApiScope: "app-specific-whitelist";
};

export type PublishedStakingEvidence = {
  app: string;
  amountPi: number;
  observedAt: string;
  sourceUrl: string;
  note: string;
};

export function getEcosystemStakingOverview() {
  const publishedEvidence: PublishedStakingEvidence[] = [
    {
      app: "CiDi Games",
      amountPi: 3_190_000,
      observedAt: "2026-06-18",
      sourceUrl: "https://minepi.com/blog/ecosystem-directory-staking/",
      note: "Official Pi publication reported 3.19 million Pi in staking support shortly after the app's beta launch.",
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    availability: {
      network: "mainnet",
      rankingRelation: "stake-influences-ecosystem-directory-ranking",
      broadPublicFeed: "not-observed",
      developerApiScope: "app-specific-whitelist",
    } satisfies EcosystemStakingAvailability,
    publishedEvidence,
    nextDataTargets: [
      "Per-app total stake",
      "Effective stake",
      "Directory ranking",
      "Ranking change",
      "Stake change over time",
    ],
  };
}
