/** Verifies the optional, read-only first-run device check. */

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { invoke } from "@tauri-apps/api/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { FirstRunDoctor } from "./FirstRunDoctor";

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

const mockInvoke = vi.mocked(invoke);

const recoveryReport = {
  schema_version: 2,
  connectivity_required: false,
  queued_local_work: {
    pending_url_imports: 0,
    capacity: 20,
    available_offline: true,
    connectivity_required: false,
  },
  storage: {
    state: "ready",
    reclaimable_bytes: 0,
    wal_bytes: null,
    incremental_vacuum_supported: true,
    cleanup_available: true,
    connectivity_required: false,
  },
  privacy_doctor: {
    schema_version: 1,
    overall: "optional_improvement",
    checks: [
      {
        id: "credential_vault",
        state: "optional_improvement",
        message: "Private detail omitted from this test.",
        action: null,
        connectivity_required: false,
      },
      {
        id: "browser_import",
        state: "looks_good",
        message: "Private detail omitted from this test.",
        action: null,
        connectivity_required: false,
      },
      {
        id: "sources",
        state: "looks_good",
        message: "Private detail omitted from this test.",
        action: null,
        connectivity_required: false,
      },
    ],
    connectivity_required: false,
  },
  platform_health: {
    schema_version: 1,
    permissions: [
      {
        area: "application_data",
        state: "private",
        action: null,
        connectivity_required: false,
      },
      {
        area: "configuration",
        state: "private",
        action: null,
        connectivity_required: false,
      },
      {
        area: "cache",
        state: "missing",
        action: "repair_locally",
        connectivity_required: false,
      },
    ],
    package_repair: { mode: "guidance_only", actions: [] },
  },
};

const matchingDiagnostics = {
  build_enabled: true,
  runtime_status: "needs_model_download",
  active_profile: "Local matching",
  privacy_mode: "Local only.",
  manifest_hash: null,
  models: [],
  scoring_signals: [],
  eval_contract: [],
  user_action: "Download models in Settings if you want stronger local matching.",
};

function respondWithChecks(
  recovery: unknown = recoveryReport,
  matching: unknown = matchingDiagnostics,
) {
  mockInvoke.mockImplementation((command) => {
    if (command === "get_local_recovery_report") return Promise.resolve(recovery);
    if (command === "get_semantic_matching_diagnostics") return Promise.resolve(matching);
    return Promise.reject(new Error(`Unexpected command: ${command}`));
  });
}

function copyRecoveryReport() {
  return structuredClone(recoveryReport);
}

describe("FirstRunDoctor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does nothing until an explicit keyboard activation, then uses only read-only diagnostics", async () => {
    const user = userEvent.setup();
    respondWithChecks();
    render(<FirstRunDoctor />);

    const checkButton = screen.getByRole("button", { name: "Check this device" });
    expect(mockInvoke).not.toHaveBeenCalled();
    checkButton.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith("get_local_recovery_report");
      expect(mockInvoke).toHaveBeenCalledWith("get_semantic_matching_diagnostics");
    });
    expect(mockInvoke).toHaveBeenCalledTimes(2);
    expect(screen.getByText("Storage:").parentElement).toHaveTextContent("Storage:Looks good");
    expect(screen.getByText("Vault:").parentElement).toHaveTextContent("Vault:Optional improvement");
    expect(screen.getByText("Permissions:").parentElement).toHaveTextContent("Permissions:Needs attention");
    expect(screen.getByText("Browser Import:").parentElement).toHaveTextContent("Browser Import:Looks good");
    expect(screen.getByText("Source permissions:").parentElement).toHaveTextContent("Source permissions:Looks good");
    expect(screen.getByText("Local models:").parentElement).toHaveTextContent("Local models:Optional download");
    expect(screen.getByText(/does not contact job sources/i)).toBeInTheDocument();
    expect(screen.queryByText("Private detail omitted from this test.")).not.toBeInTheDocument();
  });

  it("shows a paused source review without claiming source connectivity", async () => {
    const user = userEvent.setup();
    const pausedReport = copyRecoveryReport();
    const sourceCheck = pausedReport.privacy_doctor.checks.find(({ id }) => id === "sources");
    if (!sourceCheck) throw new Error("Source review fixture is missing.");
    sourceCheck.state = "paused_for_safety";
    respondWithChecks(pausedReport);
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));

    expect((await screen.findByText("Source permissions:")).parentElement).toHaveTextContent(
      "Source permissions:Paused for safety",
    );
    expect(screen.getByText(/does not contact job sources/i)).toBeInTheDocument();
  });

  it("shows empty permission results as not checked", async () => {
    const user = userEvent.setup();
    const incompleteReport = copyRecoveryReport();
    incompleteReport.platform_health.permissions = [];
    respondWithChecks(incompleteReport);
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));

    expect((await screen.findByText("Permissions:")).parentElement).toHaveTextContent(
      "Permissions:Not checked",
    );
  });

  it.each([
    ["duplicate permission area", (report: ReturnType<typeof copyRecoveryReport>) => {
      report.platform_health.permissions[2] = report.platform_health.permissions[0];
    }],
    ["missing permission area", (report: ReturnType<typeof copyRecoveryReport>) => {
      report.platform_health.permissions = report.platform_health.permissions.slice(0, 2);
    }],
    ["duplicate privacy identifier", (report: ReturnType<typeof copyRecoveryReport>) => {
      report.privacy_doctor.checks[2] = { ...report.privacy_doctor.checks[2], id: "browser_import" };
    }],
  ])("rejects a %s response instead of reporting a false-ready state", async (_name, change) => {
    const user = userEvent.setup();
    const malformedReport = copyRecoveryReport();
    change(malformedReport);
    respondWithChecks(malformedReport);
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This device check could not finish. Setup can continue.",
    );
  });

  it("keeps setup optional and lets the user retry malformed diagnostics", async () => {
    const user = userEvent.setup();
    mockInvoke.mockImplementation((command) => command === "get_local_recovery_report"
      ? Promise.resolve(recoveryReport)
      : Promise.resolve({ ...matchingDiagnostics, runtime_status: "unknown" }));
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));
    expect(await screen.findByRole("status")).toHaveTextContent(
      "This device check could not finish. Setup can continue.",
    );
    expect(screen.getByRole("button", { name: "Try device check again" })).toBeEnabled();

    respondWithChecks();
    await user.click(screen.getByRole("button", { name: "Try device check again" }));
    expect((await screen.findByText("Storage:")).parentElement).toHaveTextContent("Storage:Looks good");
    expect(mockInvoke).toHaveBeenCalledTimes(4);
  });

  it("leaves setup usable when a read-only diagnostic fails", async () => {
    const user = userEvent.setup();
    mockInvoke.mockRejectedValue(new Error("unavailable"));
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This device check could not finish. Setup can continue.",
    );
    expect(screen.getByRole("button", { name: "Try device check again" })).toBeEnabled();
  });

  it.each([
    ["privacy report schema", (report: ReturnType<typeof copyRecoveryReport>) => {
      report.privacy_doctor.schema_version = 2;
    }],
    ["platform report schema", (report: ReturnType<typeof copyRecoveryReport>) => {
      report.platform_health.schema_version = 2;
    }],
    ["disabled model status in an enabled build", (_report: ReturnType<typeof copyRecoveryReport>) => undefined, {
      ...matchingDiagnostics,
      runtime_status: "disabled_in_this_build",
    }],
  ])("rejects an unreadable %s contract", async (_name, change, diagnostics = matchingDiagnostics) => {
    const user = userEvent.setup();
    const malformedReport = copyRecoveryReport();
    change(malformedReport);
    respondWithChecks(malformedReport, diagnostics);
    render(<FirstRunDoctor />);

    await user.click(screen.getByRole("button", { name: "Check this device" }));

    expect(await screen.findByRole("status")).toHaveTextContent(
      "This device check could not finish. Setup can continue.",
    );
  });
});
