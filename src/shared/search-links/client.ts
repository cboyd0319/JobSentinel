/**
 * Search link client
 *
 * Typed access to the private Tauri command names used for search links.
 */

import { invoke } from "../../platform/tauri";
import type {
  DeepLink,
  SearchCriteria,
} from "./model";

/**
 * Generate deep links for all supported sites
 */
export async function generateDeepLinks(
  criteria: SearchCriteria
): Promise<DeepLink[]> {
  return invoke<DeepLink[]>("generate_deep_links", { criteria });
}

/**
 * Open a deep link URL in the default browser
 */
export async function openDeepLink(url: string): Promise<void> {
  return invoke<void>("open_deep_link", { url });
}
