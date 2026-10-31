/** Validates native update discovery, review, and restart status at the renderer boundary. */
export interface LocalUpdateStatus {
  trustedPublisherConfigured: boolean;
  pendingReview: boolean;
  restartRequired: boolean;
}
export interface LocalUpdateReview {
  reviewId: string;
  currentVersion: string;
  targetVersion: string;
  direction: "update" | "rollback";
  packageName: string;
  packageBytes: number;
  platform: string;
  architecture: string;
  edition: string;
  compatibilitySummary: string;
  componentSummary: string[];
  recoverySummary: string;
  requiresRestart: true;
}
export interface UpdateAvailability {
  status: "available" | "current" | "unavailable";
  currentVersion: string;
  availableVersion: string | null;
  releaseUrl: string | null;
}
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 4096;
}
export function isLocalUpdateStatus(value: unknown): value is LocalUpdateStatus {
  return record(value) && typeof value.trustedPublisherConfigured === "boolean" &&
    typeof value.pendingReview === "boolean" && typeof value.restartRequired === "boolean";
}
export function isLocalUpdateReview(value: unknown): value is LocalUpdateReview {
  return record(value) &&
    ["reviewId", "currentVersion", "targetVersion", "packageName", "platform",
      "architecture", "edition", "compatibilitySummary", "recoverySummary"].every((key) => text(value[key])) &&
    (value.direction === "update" || value.direction === "rollback") &&
    typeof value.packageBytes === "number" && Number.isSafeInteger(value.packageBytes) && value.packageBytes > 0 &&
    Array.isArray(value.componentSummary) && value.componentSummary.length <= 100 &&
    value.componentSummary.every(text) && value.requiresRestart === true;
}
export function isUpdateAvailability(value: unknown): value is UpdateAvailability {
  return record(value) && (value.status === "available" || value.status === "current" || value.status === "unavailable") &&
    text(value.currentVersion) && (value.availableVersion === null || text(value.availableVersion)) &&
    (value.releaseUrl === null || text(value.releaseUrl)) &&
    (value.status !== "available" || text(value.availableVersion));
}
export function isInstallerOpened(value: unknown): boolean {
  return record(value) && value.outcome === "installer_opened" && value.restartRequired === true;
}
