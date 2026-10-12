export const PI_SDK_VERSION = "2.0";
export const PI_SDK_SCRIPT_URL = "https://sdk.minepi.com/pi-sdk.js";
export const PI_PLATFORM_API_DEFAULT = "https://api.minepi.com/v2";

export const PI_RUNTIME_ENVIRONMENTS = ["sandbox", "production"] as const;
export type PiRuntimeEnvironment = (typeof PI_RUNTIME_ENVIRONMENTS)[number];

export const PI_NETWORKS = ["testnet", "mainnet"] as const;
export type PiNetwork = (typeof PI_NETWORKS)[number];

const HORIZON_DEFAULTS: Record<PiNetwork, string> = {
  testnet: "https://api.testnet.minepi.com",
  mainnet: "https://api.mainnet.minepi.com",
};

export type PiRuntimeConfig = {
  environment: PiRuntimeEnvironment;
  network: PiNetwork;
  sdkSandbox: boolean;
  sdkVersion: string;
  sdkScriptUrl: string;
  platformApiBaseUrl: string;
  horizonBaseUrl: string;
  apiKeyConfigured: boolean;
  compatible: boolean;
  configurationError: string | null;
};

function normalizeEnvironment(value: string | undefined): PiRuntimeEnvironment {
  return value?.trim().toLowerCase() === "production" ? "production" : "sandbox";
}

function normalizeNetwork(value: string | undefined, environment: PiRuntimeEnvironment): PiNetwork {
  if (value?.trim().toLowerCase() === "mainnet") return "mainnet";
  if (value?.trim().toLowerCase() === "testnet") return "testnet";
  return environment === "production" ? "mainnet" : "testnet";
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

function isTrustedPiPlatformApiBaseUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:"
      && url.hostname === "api.minepi.com"
      && !url.port
      && !url.username
      && !url.password
      && url.pathname === "/v2"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

export function getPiRuntimeConfig(): PiRuntimeConfig {
  const environment = normalizeEnvironment(process.env.PI_ENVIRONMENT);
  const network = normalizeNetwork(process.env.PI_NETWORK, environment);
  const networkCompatible = environment === "sandbox" ? network === "testnet" : network === "mainnet";
  const platformApiBaseUrl = cleanBaseUrl(process.env.PI_PLATFORM_API_BASE_URL?.trim() || PI_PLATFORM_API_DEFAULT);
  const platformApiCompatible = isTrustedPiPlatformApiBaseUrl(platformApiBaseUrl);
  const compatible = networkCompatible && platformApiCompatible;
  const configurationError = !networkCompatible
    ? `Pi runtime mismatch: ${environment} must use ${environment === "sandbox" ? "testnet" : "mainnet"}.`
    : !platformApiCompatible
      ? "Pi Platform API must use the trusted HTTPS endpoint https://api.minepi.com/v2."
      : null;

  return {
    environment,
    network,
    sdkSandbox: environment === "sandbox",
    sdkVersion: PI_SDK_VERSION,
    sdkScriptUrl: PI_SDK_SCRIPT_URL,
    platformApiBaseUrl,
    horizonBaseUrl: cleanBaseUrl(process.env.PI_HORIZON_BASE_URL?.trim() || HORIZON_DEFAULTS[network]),
    apiKeyConfigured: Boolean(process.env.PI_API_KEY),
    compatible,
    configurationError,
  };
}

export function assertPiRuntimeCompatible(config = getPiRuntimeConfig()): asserts config is PiRuntimeConfig & { compatible: true } {
  if (!config.compatible) throw new Error(config.configurationError ?? "Pi runtime configuration is incompatible.");
}

export function isPiProductionReady(config = getPiRuntimeConfig()) {
  return config.environment === "production" && config.network === "mainnet" && config.compatible && config.apiKeyConfigured;
}