import { RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES } from "./restrictedSourceTaxonomy";

export const LINKEDIN_WORKBENCH_ACK_VERSION = "2026-06-19.linkedin-workbench.v1";
export const LINKEDIN_WORKBENCH_ACK_STORAGE_KEY =
  "jobsentinel.linkedinWorkbenchAcknowledgement";
export const LINKEDIN_WORKBENCH_PRIVACY_REMINDER_MINUTES =
  RESTRICTED_INTERACTIVE_SESSION_REMINDER_MINUTES;

export type LinkedInWorkbenchEventType =
  | "applied"
  | "saved"
  | "tracking"
  | "note"
  | "not_interested";

export interface LinkedInWorkbenchPrefill {
  title: string;
  company: string;
  url: string;
  notes: string;
}

export function defaultLinkedInWorkbenchPrefill(): LinkedInWorkbenchPrefill {
  return {
    title: "",
    company: "",
    url: "",
    notes: "",
  };
}

export function parseUserProvidedLinkedInText(text: string): LinkedInWorkbenchPrefill {
  const cleaned = text.trim();
  if (!cleaned) {
    return defaultLinkedInWorkbenchPrefill();
  }

  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const url = extractFirstHttpsUrl(cleaned);
  const nonUrlLines = lines.filter((line) => line !== url);
  const titleAndCompany = splitTitleAndCompany(nonUrlLines[0] ?? "");

  return {
    title: titleAndCompany.title,
    company: titleAndCompany.company || nonUrlLines[1] || "",
    url,
    notes: cleaned,
  };
}

export function shouldShowLinkedInWorkbenchPrivacyReminder(
  sessionStartedAt: number | null,
  now: number = Date.now(),
): boolean {
  if (sessionStartedAt === null) {
    return false;
  }

  return now - sessionStartedAt >= LINKEDIN_WORKBENCH_PRIVACY_REMINDER_MINUTES * 60_000;
}

function extractFirstHttpsUrl(text: string): string {
  const match = text.match(/https:\/\/[^\s<>"']+/i);
  return match?.[0]?.replace(/[),.;]+$/, "") ?? "";
}

function splitTitleAndCompany(line: string): Pick<LinkedInWorkbenchPrefill, "title" | "company"> {
  const separator = /\s+(?:at|@|-|–|—)\s+/i;
  const parts = line.split(separator).map((part) => part.trim()).filter(Boolean);

  if (parts.length >= 2) {
    return {
      title: parts[0] ?? "",
      company: parts.slice(1).join(" "),
    };
  }

  return {
    title: line,
    company: "",
  };
}
