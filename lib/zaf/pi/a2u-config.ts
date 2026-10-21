import { A2uError } from "./a2u-flow";

export function a2uDatabaseUrl(env: NodeJS.ProcessEnv = process.env) {
  return env.PI_TESTNET_DATABASE_URL_UNPOOLED || env.PI_TESTNET_DATABASE_URL || "";
}

export function a2uConfig(env: NodeJS.ProcessEnv = process.env) {
  const wallets = [...new Set((env.PI_TESTNET_A2U_WALLETS || "").split(/[\s,]+/).filter(Boolean))];
  let directDatabase = false;
  try {
    const url = new URL(a2uDatabaseUrl(env));
    directDatabase = ["postgres:", "postgresql:"].includes(url.protocol) &&
      !/pooler|pgbouncer/i.test(url.hostname) && Boolean(url.hostname && url.username && url.password);
  } catch { /* Missing or malformed configuration keeps all transfers disabled. */ }
  const ready = env.PI_NETWORK === "testnet" && env.PI_TESTNET_A2U_ENABLED === "true" &&
    Boolean(env.PI_TESTNET_API_KEY?.trim()) && /^S[A-Z2-7]{55}$/.test(env.PI_TESTNET_WALLET_SECRET || "") &&
    directDatabase &&
    wallets.length > 0 && wallets.length <= 5 && wallets.every(address => /^G[A-Z2-7]{55}$/.test(address));
  return { ready, wallets };
}

export function requireA2uConfig() {
  const config = a2uConfig();
  if (!config.ready) throw new A2uError("TEST_NOT_ENABLED", 503);
  return config;
}
