import {
  LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
  LINKEDIN_WORKBENCH_ACK_VERSION,
} from "../linkedinWorkbenchPolicy";

interface StoredAcknowledgement {
  version: string;
  acceptedAt: string;
}

export function readLinkedInWorkbenchAcknowledgement(): boolean {
  try {
    const value = window.localStorage.getItem(
      LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
    );
    if (!value) return false;

    const acknowledgement = JSON.parse(value) as Partial<StoredAcknowledgement>;
    return acknowledgement.version === LINKEDIN_WORKBENCH_ACK_VERSION;
  } catch {
    return false;
  }
}

export function writeLinkedInWorkbenchAcknowledgement(): void {
  const acknowledgement: StoredAcknowledgement = {
    version: LINKEDIN_WORKBENCH_ACK_VERSION,
    acceptedAt: new Date().toISOString(),
  };
  window.localStorage.setItem(
    LINKEDIN_WORKBENCH_ACK_STORAGE_KEY,
    JSON.stringify(acknowledgement),
  );
}
