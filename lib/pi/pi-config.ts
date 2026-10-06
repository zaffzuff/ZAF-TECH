import type { PiEnvironment } from "./types";

const environment = process.env.NEXT_PUBLIC_PI_ENVIRONMENT;

export const PI_ENVIRONMENT: PiEnvironment =
  environment === "mainnet" ? "mainnet" : "testnet";

export const PI_FEATURES_ENABLED = false;
