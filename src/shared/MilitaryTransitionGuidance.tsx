/** Provides optional, manual military-to-civilian wording guidance without personal-data collection. */

import { useState } from "react";
import veteranServiceIndex from "../../crates/jobsentinel-domain/src/fixtures/v3_veteran_public_service_index_v1.json";
import { isCredentialFreePublicHttpsUrl } from "./externalUrlPolicy";
import { openDeepLink } from "./search-links";

type ManualResource = {
  resource_id: "onet-military-crosswalk" | "dod-cool-military-occupations";
  display_name: string;
  url: string;
  reviewed_on: string;
};

function manualResources(value: unknown): ManualResource[] {
  if (typeof value !== "object" || value === null || !Array.isArray((value as { resources?: unknown }).resources)) return [];
  return (value as { resources: unknown[] }).resources.flatMap((resource) => {
    if (typeof resource !== "object" || resource === null) return [];
    const item = resource as Record<string, unknown>;
    return (item.resource_id === "onet-military-crosswalk" || item.resource_id === "dod-cool-military-occupations") &&
      typeof item.display_name === "string" && typeof item.url === "string" &&
      typeof item.reviewed_on === "string" && isCredentialFreePublicHttpsUrl(item.url)
      ? [{ resource_id: item.resource_id, display_name: item.display_name, url: item.url, reviewed_on: item.reviewed_on }]
      : [];
  });
}

const resources = manualResources(veteranServiceIndex);

export function MilitaryTransitionGuidance() {
  const [openingResource, setOpeningResource] = useState<string | null>(null);
  const [openError, setOpenError] = useState(false);

  const openReference = async (resource: ManualResource) => {
    setOpeningResource(resource.resource_id);
    setOpenError(false);
    try {
      await openDeepLink(resource.url);
    } catch {
      setOpenError(true);
    } finally {
      setOpeningResource(null);
    }
  };

  return <details className="rounded-lg border border-surface-200 p-3 text-sm dark:border-surface-700">
    <summary className="cursor-pointer font-medium text-surface-900 dark:text-white">Military-to-civilian guidance (optional)</summary>
    <div className="mt-3 space-y-3 text-surface-700 dark:text-surface-300">
      <p>Use actual service duties, occupation codes, dates, and credentials from your records. This does not automatically translate rank to a role or verify protected status, eligibility, clearance, or qualifications.</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>After setup or skipping it, use Resume Builder or a resume you already have.</li>
        <li>Export your Builder resume as DOCX, then add that file to Resume Library.</li>
        <li>Compare it with a saved job, then choose Review military wording in saved matches or the opportunity case.</li>
        <li>Confirm only your own current evidence. Review suggestions before using them; nothing is applied or submitted.</li>
      </ol>
      <p>Skip this if it is irrelevant. Work history is optional: early-career applicants can use education, projects, volunteering, and other confirmed evidence. Using these tools does not require medical or disability details.</p>
      <p>O*NET and DoD COOL are manual research references only. They do not author or verify wording, eligibility, clearance, or equivalence.</p>
      {resources.length > 0 && <ul className="space-y-2">{resources.map((resource) => <li key={resource.resource_id}><button type="button" className="text-left text-sentinel-700 underline dark:text-sentinel-300" disabled={openingResource !== null} onClick={() => void openReference(resource)}>Open {resource.display_name} in browser</button><span className="block text-xs">Reviewed {resource.reviewed_on}. Opens a public website if you choose.</span></li>)}</ul>}
      {openError && <p role="alert">Could not open this reference. Check the address in your browser or try again.</p>}
    </div>
  </details>;
}
