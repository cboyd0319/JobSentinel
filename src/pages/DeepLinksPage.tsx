/**
 * Deep Links Page
 *
 * Dedicated page for the Deep Link Generator feature.
 */

import { DeepLinkGenerator } from "../components/DeepLinkGenerator";

export function DeepLinksPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <DeepLinkGenerator />
    </div>
  );
}

export default DeepLinksPage;
