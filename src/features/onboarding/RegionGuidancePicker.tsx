/** Lets setup users manually review installed regional guidance without changing setup choices. */

import { useRef, useState } from "react";
import { invoke } from "../../platform/tauri";
import { PackRegionReview } from "../../shared/PackRegionReview";
import {
  parsePackManagementReviews,
  type PackManagementReview,
} from "../../shared/packManagementProjection";
import { Button } from "../../ui/Button";

function regionalGuides(packs: PackManagementReview[]): PackManagementReview[] {
  return packs.filter((pack) =>
    pack.state === "ready" &&
    pack.currentRelease.state === "ready" &&
    pack.currentRelease.isActive &&
    pack.currentRelease.purpose === "regional_guidance",
  );
}

function guideLabel(pack: PackManagementReview): string {
  return `${pack.currentRelease.publisherName} · ${pack.currentRelease.packVersion} · ${pack.packId}`;
}

export function RegionGuidancePicker() {
  const [guides, setGuides] = useState<PackManagementReview[] | null>(null);
  const [selected, setSelected] = useState<PackManagementReview | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);
  const request = useRef(0);

  const load = async () => {
    const requestId = ++request.current;
    setLoading(true);
    setHasChecked(true);
    setHasError(false);
    setGuides(null);
    setSelected(null);
    try {
      const packs = regionalGuides(parsePackManagementReviews(
        await invoke<unknown>("list_pack_management"),
      ));
      if (request.current === requestId) setGuides(packs);
    } catch {
      if (request.current === requestId) setHasError(true);
    } finally {
      if (request.current === requestId) setLoading(false);
    }
  };

  return <details className="mt-6 rounded-lg border border-surface-200 p-3 text-sm dark:border-surface-700">
    <summary className="cursor-pointer font-medium text-surface-900 dark:text-white">Regional guidance (optional)</summary>
    <div className="mt-3 space-y-3 text-surface-700 dark:text-surface-300">
      <p>Review installed guidance only if it is useful. It does not change your location choices, search filters, source access, or eligibility.</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="secondary" aria-busy={loading} onClick={() => void load()}>
          {hasChecked ? "Refresh installed guides" : "Check installed guides"}
        </Button>
      </div>
      {hasError && <div role="alert"><p>Could not load installed regional guidance.</p><Button type="button" size="sm" variant="secondary" onClick={() => void load()}>Try again</Button></div>}
      {guides?.length === 0 && <p>No active regional guidance is installed. Continue setup without a guide.</p>}
      {guides && guides.length > 0 && <div className="space-y-2"><p>Choose an installed guide by publisher, version, and identity. Countries appear only after you open its verified review.</p>{guides.map((guide) => <Button key={`${guide.publisherKeyId}:${guide.packId}:${guide.generation}`} type="button" size="sm" variant="secondary" className="break-words [overflow-wrap:anywhere]" onClick={() => setSelected(guide)}>Use {guideLabel(guide)}</Button>)}</div>}
      {selected && <PackRegionReview pack={selected} />}
    </div>
  </details>;
}
