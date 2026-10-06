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
  accessToken: string | null;
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
