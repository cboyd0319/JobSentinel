/** Renders the optional, read-only device readiness check during first-run setup. */

import { useState } from "react";
import { invoke } from "../../platform/tauri";
import { Button } from "../../ui/Button";

type DoctorState =
  | "looks_good"
  | "needs_attention"
  | "paused_for_safety"
  | "optional_improvement"
  | "not_checked";

interface FirstRunReadiness {
  storage: DoctorState;
  vault: DoctorState;
  permissions: DoctorState;
  browser: DoctorState;
  sources: DoctorState;
  modelSummary: string;
}

const PRIVACY_STATES = new Set<DoctorState>([
  "looks_good",
  "needs_attention",
  "paused_for_safety",
  "optional_improvement",
]);
const STORAGE_STATES = new Set(["ready", "restore_from_backup_required", "unavailable"]);
const PERMISSION_STATES = new Set([
  "private",
  "missing",
  "needs_repair",
  "manual_review",
  "unchecked",
]);
const PERMISSION_AREAS = new Set(["application_data", "configuration", "cache"]);
const MODEL_STATUSES = new Set([
  "ready",
  "needs_model_download",
  "disabled_in_this_build",
  "misconfigured",
]);

export function FirstRunDoctor() {
  const [readiness, setReadiness] = useState<FirstRunReadiness | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkFailed, setCheckFailed] = useState(false);

  const checkDevice = async () => {
    if (checking) return;

    setChecking(true);
    setCheckFailed(false);
    try {
      const [recovery, matching] = await Promise.all([
        invoke<unknown>("get_local_recovery_report"),
        invoke<unknown>("get_semantic_matching_diagnostics"),
      ]);
      setReadiness(parseFirstRunReadiness(recovery, matching));
    } catch {
      setReadiness(null);
      setCheckFailed(true);
    } finally {
      setChecking(false);
    }
  };

  return (
    <section
      className="mt-5 rounded-lg border border-surface-200 bg-surface-50 p-4 text-left dark:border-surface-700 dark:bg-surface-800"
      aria-labelledby="first-run-doctor-heading"
    >
      <h2 id="first-run-doctor-heading" className="font-medium text-surface-800 dark:text-surface-100">
        Optional device check
      </h2>
      <p className="mt-1 text-sm text-surface-500 dark:text-surface-400">
        Check local setup before you continue. It reads local status only and does not change anything.
      </p>
      <Button
        className="mt-3"
        variant="secondary"
        size="sm"
        loading={checking}
        loadingText="Checking this device..."
        onClick={() => void checkDevice()}
      >
        Check this device
      </Button>

      {checkFailed && (
        <div className="mt-3" role="status" aria-live="polite">
          <p className="text-sm text-surface-700 dark:text-surface-200">
            This device check could not finish. Setup can continue.
          </p>
          <Button
            className="mt-2"
            variant="secondary"
            size="sm"
            onClick={() => void checkDevice()}
          >
            Try device check again
          </Button>
        </div>
      )}

      {readiness && <ReadinessSummary readiness={readiness} />}
    </section>
  );
}

function ReadinessSummary({ readiness }: { readiness: FirstRunReadiness }) {
  return (
    <div className="mt-4" role="status" aria-live="polite">
      <dl className="grid grid-cols-1 gap-x-4 gap-y-1 text-sm sm:grid-cols-2">
        <ReadinessItem label="Storage" value={stateLabel(readiness.storage)} />
        <ReadinessItem label="Vault" value={stateLabel(readiness.vault)} />
        <ReadinessItem label="Permissions" value={stateLabel(readiness.permissions)} />
        <ReadinessItem label="Browser Import" value={stateLabel(readiness.browser)} />
        <ReadinessItem label="Source permissions" value={stateLabel(readiness.sources)} />
        <ReadinessItem label="Local models" value={readiness.modelSummary} />
      </dl>
      <p className="mt-3 text-xs text-surface-500 dark:text-surface-400">
        This check does not contact job sources, unlock a vault, pair a browser, repair permissions, or download models.
      </p>
      <p className="mt-1 text-xs text-surface-500 dark:text-surface-400">
        You can finish setup now. If a line needs attention, open Settings for review or repair options.
      </p>
    </div>
  );
}

function ReadinessItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-1 text-surface-700 dark:text-surface-200">
      <dt className="font-medium">{label}:</dt>
      <dd>{value}</dd>
    </div>
  );
}

function stateLabel(state: DoctorState): string {
  switch (state) {
    case "looks_good":
      return "Looks good";
    case "needs_attention":
      return "Needs attention";
    case "paused_for_safety":
      return "Paused for safety";
    case "optional_improvement":
      return "Optional improvement";
    case "not_checked":
      return "Not checked";
  }
}

function parseFirstRunReadiness(
  recoveryValue: unknown,
  matchingValue: unknown,
): FirstRunReadiness {
  const recovery = record(recoveryValue);
  if (recovery.schema_version !== 2) {
    throw new Error("Unreadable local recovery response.");
  }

  const storage = record(recovery.storage);
  const storageState = string(storage, "state");
  if (!STORAGE_STATES.has(storageState)) {
    throw new Error("Unreadable local storage state.");
  }

  const privacyDoctor = record(recovery.privacy_doctor);
  if (privacyDoctor.schema_version !== 1) {
    throw new Error("Unreadable privacy check response.");
  }

  const platformHealth = record(recovery.platform_health);
  if (platformHealth.schema_version !== 1) {
    throw new Error("Unreadable permission check response.");
  }

  const permissions = array(platformHealth, "permissions");
  const permissionStates = permissions.map((permission) => {
    const area = string(record(permission), "area");
    const state = string(record(permission), "state");
    if (!PERMISSION_AREAS.has(area) || !PERMISSION_STATES.has(state)) {
      throw new Error("Unreadable local permission state.");
    }
    return { area, state };
  });
  if (permissionStates.length > 0 && (
    permissionStates.length !== PERMISSION_AREAS.size
    || new Set(permissionStates.map(({ area }) => area)).size !== PERMISSION_AREAS.size
  )) {
    throw new Error("Unreadable local permission areas.");
  }

  const checks = array(privacyDoctor, "checks");
  const privacyById = new Map<string, DoctorState>();
  for (const check of checks) {
    const parsedCheck = record(check);
    const id = string(parsedCheck, "id");
    const state = string(parsedCheck, "state");
    if (!PRIVACY_STATES.has(state as DoctorState)) {
      throw new Error("Unreadable privacy check state.");
    }
    if (privacyById.has(id)) {
      throw new Error("Unreadable duplicate privacy check.");
    }
    privacyById.set(id, state as DoctorState);
  }

  const matching = record(matchingValue);
  if (typeof matching.build_enabled !== "boolean") {
    throw new Error("Unreadable local model diagnostics.");
  }
  const runtimeStatus = string(matching, "runtime_status");
  if (!MODEL_STATUSES.has(runtimeStatus)) {
    throw new Error("Unreadable local model status.");
  }
  if (
    (matching.build_enabled && runtimeStatus === "disabled_in_this_build")
    || (!matching.build_enabled && runtimeStatus !== "disabled_in_this_build")
  ) {
    throw new Error("Inconsistent local model diagnostics.");
  }

  return {
    storage: storageState === "ready" ? "looks_good" : "needs_attention",
    vault: privacyById.get("credential_vault") ?? "not_checked",
    permissions: permissionStates.length === 0
      ? "not_checked"
      : permissionStates.every(({ state }) => state === "private")
      ? "looks_good"
      : "needs_attention",
    browser: privacyById.get("browser_import") ?? "not_checked",
    sources: privacyById.get("sources") ?? "not_checked",
    modelSummary: modelSummary(runtimeStatus),
  };
}

function modelSummary(status: string): string {
  if (status === "ready") return "Looks good";
  if (status === "needs_model_download") return "Optional download";
  if (status === "disabled_in_this_build") return "Built-in matching";
  return "Needs attention";
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Unreadable device check response.");
  }
  return value as Record<string, unknown>;
}

function array(recordValue: Record<string, unknown>, key: string): unknown[] {
  const value = recordValue[key];
  if (!Array.isArray(value)) {
    throw new Error("Unreadable device check response.");
  }
  return value;
}

function string(recordValue: Record<string, unknown>, key: string): string {
  const value = recordValue[key];
  if (typeof value !== "string") {
    throw new Error("Unreadable device check response.");
  }
  return value;
}
