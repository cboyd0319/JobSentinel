/** Adapts shared public-host policy for browser-development external URL checks. */

import { isLocalOrPrivateHost } from "../../shared/externalUrlPolicy";

export { isLocalOrPrivateHost } from "../../shared/externalUrlPolicy";

export function isSafeExternalHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !isLocalOrPrivateHost(url.hostname);
  } catch {
    return false;
  }
}
