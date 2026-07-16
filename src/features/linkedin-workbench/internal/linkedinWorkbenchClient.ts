import { invoke } from "../../../platform/tauri";
import type { LinkedInWorkbenchEventType } from "../linkedinWorkbenchPolicy";

export interface LinkedInWorkbenchEventInput {
  eventType: LinkedInWorkbenchEventType;
  title?: string;
  company?: string;
  url?: string;
  notes?: string;
}

export interface LinkedInWorkbenchEventResult {
  jobId: number;
  jobHash: string;
  applicationId: number | null;
  status: string;
  needsDetails: boolean;
  savedAsBookmark: boolean;
  hidden: boolean;
}

export function recordLinkedInWorkbenchEvent(
  input: LinkedInWorkbenchEventInput,
): Promise<LinkedInWorkbenchEventResult> {
  return invoke<LinkedInWorkbenchEventResult>("record_linkedin_workbench_event", {
    input,
  });
}
