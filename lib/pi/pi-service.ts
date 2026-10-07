import { PI_ENVIRONMENT, PI_FEATURES_ENABLED } from "./pi-config";
import type { PiAuthResult, PiService } from "./types";

class DisabledPiService implements PiService {
  getEnvironment() {
    return PI_ENVIRONMENT;
  }

  isAvailable() {
    return false;
  }

  async authenticate(): Promise<PiAuthResult> {
    throw new Error("Pi integration is not enabled yet.");
  }

  async clearSession() {
    return;
  }
}

export const piService: PiService = new DisabledPiService();

export { PI_FEATURES_ENABLED };
