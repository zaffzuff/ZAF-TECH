export type PiEnvironment = "testnet" | "mainnet";

export type PiAuthStatus =
  | "idle"
  | "authenticating"
  | "authenticated"
  | "unauthenticated"
  | "error";

export interface PiUser {
  uid: string;
  username: string | null;
}

/**
 * Internal credential material. Must never be exposed to UI components or
 * persisted as the ZAF application session.
 */
export interface PiCredential {
  accessToken: string;
}

export interface PiAuthResult {
  status: "authenticated";
  user: PiUser;
}

export interface PiService {
  getEnvironment(): PiEnvironment;
  isAvailable(): boolean;
  authenticate(): Promise<PiAuthResult>;
  clearSession(): Promise<void>;
}
