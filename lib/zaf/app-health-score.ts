export type AppHealthStatus = "healthy" | "degraded" | "limited" | "offline";

export type AppHealthScore = {
  score: number;
  status: AppHealthStatus;
  factors: {
    reachability: number;
    https: number;
    response: number;
    redirect: number;
  };
};

export function calculateAppHealthScore(input: {
  reachable: boolean;
  ok: boolean;
  responseTimeMs: number;
  https: boolean;
  redirect: boolean;
}): AppHealthScore {
  if (!input.reachable) {
    return {
      score: 0,
      status: "offline",
      factors: { reachability: 0, https: input.https ? 5 : 0, response: 0, redirect: input.redirect ? 0 : 5 },
    };
  }

  const reachability = input.ok ? 60 : 45;
  const https = input.https ? 15 : 0;
  const response = input.responseTimeMs <= 500 ? 15 : input.responseTimeMs <= 1500 ? 10 : input.responseTimeMs <= 3000 ? 5 : 0;
  const redirect = input.redirect ? 5 : 10;
  const score = Math.max(0, Math.min(100, reachability + https + response + redirect));
  return {
    score,
    status: score >= 80 ? "healthy" : score >= 55 ? "degraded" : "limited",
    factors: { reachability, https, response, redirect },
  };
}
