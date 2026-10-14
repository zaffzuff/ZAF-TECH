export const PI_SDK_VERSION = "2.0";
export const PI_SDK_SCRIPT_URL = "https://sdk.minepi.com/pi-sdk.js";
export const PI_PLATFORM_API_DEFAULT = "https://api.minepi.com/v2";

/**
 * The app's blockchain network is selected in the Pi Developer Portal and
 * cannot be changed for a registered app. Keep it separate from the SDK mode:
 * Sandbox is a browser/testing environment, not another name for Testnet.
 */
export const PI_NETWORKS = ["testnet", "mainnet"] as const;
export type PiNetwork = (typeof PI_NETWORKS)[number];

/**
 * "sandbox" is for an app opened through Pi's Sandbox environment.
 * "hosted" is for the app's configured URL opened as a normal Pi app.
 *
 * Both Testnet and Mainnet apps can be hosted. Only Testnet may use Sandbox.
 */
export const PI_SDK_MODES = ["sandbox", "hosted"] as const;
export type PiSdkMode = (typeof PI_SDK_MODES)[number];

const HORIZON_DEFAULTS: Record<PiNetwork, string> = {
  testnet: "https://api.testnet.minepi.com",
  mainnet: "https://api.mainnet.minepi.com",
};

export type PiRuntimeConfig = {
  network: PiNetwork;
  sdkMode: PiSdkMode;
  sdkSandbox: boolean;
  sdkVersion: string;
  sdkScriptUrl: string;
  platformApiBaseUrl: string;
  horizonBaseUrl: string;
  compatible: boolean;
  configurationError: string | null;
};

function normalizeNetwork(value: string | undefined): PiNetwork {
  return value?.trim().toLowerCase() === "mainnet" ? "mainnet" : "testnet";
}

function normalizeSdkMode(value: string | undefined): PiSdkMode {
  return value?.trim().toLowerCase() === "sandbox" ? "sandbox" : "hosted";
}

function cleanBaseUrl(value: string) {
  return value.replace(/\/+$/, "");
}

export function getPiRuntimeConfig(): PiRuntimeConfig {
  const network = normalizeNetwork(process.env.PI_NETWORK);
  const sdkMode = normalizeSdkMode(process.env.PI_SDK_MODE || process.env.NEXT_PUBLIC_PI_SDK_MODE);
  const sdkSandbox = sdkMode === "sandbox";

  // Sandbox uses Testnet. A hosted Testnet app is valid with sandbox:false.
  const compatible = !(sdkSandbox && network === "mainnet");
  const configurationError = compatible
    ? null
    : "Pi SDK Sandbox mode cannot be used with a Mainnet app.";
  const configuredNetwork = process.env.PI_NETWORK?.trim().toLowerCase();
  const configuredMode = process.env.PI_SDK_MODE?.trim().toLowerCase();
  const clientMode = process.env.NEXT_PUBLIC_PI_SDK_MODE?.trim().toLowerCase();
  const invalidSetting = (configuredNetwork && !PI_NETWORKS.includes(configuredNetwork as PiNetwork)) ||
    (configuredMode && !PI_SDK_MODES.includes(configuredMode as PiSdkMode)) ||
    (clientMode && (!PI_SDK_MODES.includes(clientMode as PiSdkMode) || clientMode !== sdkMode));

  return {
    network,
    sdkMode,
    sdkSandbox,
    sdkVersion: PI_SDK_VERSION,
    sdkScriptUrl: PI_SDK_SCRIPT_URL,
    platformApiBaseUrl: cleanBaseUrl(process.env.PI_PLATFORM_API_BASE_URL?.trim() || PI_PLATFORM_API_DEFAULT),
    horizonBaseUrl: cleanBaseUrl(process.env.PI_HORIZON_BASE_URL?.trim() || HORIZON_DEFAULTS[network]),
    compatible: compatible && !invalidSetting,
    configurationError: invalidSetting ? "Pi network or SDK mode configuration is invalid or inconsistent." : configurationError,
  };
}

export function assertPiRuntimeCompatible(
  config = getPiRuntimeConfig(),
): asserts config is PiRuntimeConfig & { compatible: true } {
  if (!config.compatible) {
    throw new Error(config.configurationError ?? "Pi runtime configuration is incompatible.");
  }
}

/** True when the configured runtime targets the Mainnet app outside Sandbox. */
export function isPiMainnetRuntimeReady(config = getPiRuntimeConfig()) {
  return config.network === "mainnet" && config.sdkMode === "hosted" && config.compatible;
}
