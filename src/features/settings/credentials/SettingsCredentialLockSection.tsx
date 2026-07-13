import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../../ui/Button";
import { HelpIcon } from "../../../ui/HelpIcon";
import { useToast } from "../../../shared/toast/useToast";
import { logError } from "../../../utils/errorUtils";
import {
  disableCredentialPassphrase,
  enableCredentialPassphrase,
  getCredentialUnlockStatus,
  unlockCredentialVault,
  type CredentialUnlockStatus,
} from "../config/SettingsConfig";

type CredentialLockAction = "enable" | "unlock" | "disable" | "refresh";
type CredentialLockLoadState = "loading" | "ready" | "error";

const MIN_PASSPHRASE_CHARS = 12;

export function SettingsCredentialLockSection() {
  const {
    error: toastError,
    success: toastSuccess,
    warning: toastWarning,
  } = useToast();
  const [status, setStatus] = useState<CredentialUnlockStatus | null>(null);
  const [loadState, setLoadState] =
    useState<CredentialLockLoadState>("loading");
  const [activeAction, setActiveAction] = useState<CredentialLockAction | null>(
    null,
  );
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [currentPassphrase, setCurrentPassphrase] = useState("");

  const loadStatus = useCallback(
    async (action: "initial" | "refresh" = "initial") => {
      if (action === "refresh") {
        setActiveAction("refresh");
      }
      setLoadState("loading");

      try {
        const nextStatus = await getCredentialUnlockStatus();
        setStatus(nextStatus);
        setLoadState("ready");
      } catch (error) {
        logError("Failed to load credential lock status:", error);
        setStatus(null);
        setLoadState("error");
        if (action === "refresh") {
          toastWarning(
            "Saved details lock status unavailable",
            "Try again after saving or unlocking saved details.",
          );
        }
      } finally {
        if (action === "refresh") {
          setActiveAction(null);
        }
      }
    },
    [toastWarning],
  );

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  const enableError = useMemo(() => {
    if (!newPassphrase && !confirmPassphrase) return null;
    if (newPassphrase.trim().length < MIN_PASSPHRASE_CHARS) {
      return "Use at least 12 non-space characters.";
    }
    if (confirmPassphrase && newPassphrase !== confirmPassphrase) {
      return "The two passphrases do not match.";
    }
    return null;
  }, [confirmPassphrase, newPassphrase]);

  const handleEnable = useCallback(async () => {
    const validationError =
      enableError ??
      (newPassphrase === confirmPassphrase
        ? null
        : "The two passphrases do not match.");
    if (validationError) {
      toastError("Passphrase lock was not changed", validationError);
      return;
    }

    try {
      setActiveAction("enable");
      await enableCredentialPassphrase(newPassphrase);
      setNewPassphrase("");
      setConfirmPassphrase("");
      await loadStatus();
      toastSuccess(
        "Passphrase lock enabled",
        "Saved details will need this passphrase after app start.",
      );
    } catch (error) {
      logError("Failed to enable credential passphrase lock:", error);
      toastError(
        "Could not enable passphrase lock",
        getPassphraseActionMessage(error),
      );
    } finally {
      setActiveAction(null);
    }
  }, [
    confirmPassphrase,
    enableError,
    loadStatus,
    newPassphrase,
    toastError,
    toastSuccess,
  ]);

  const handleUnlock = useCallback(async () => {
    if (!currentPassphrase) {
      toastError("Saved details were not unlocked", "Enter the passphrase.");
      return;
    }

    try {
      setActiveAction("unlock");
      await unlockCredentialVault(currentPassphrase);
      setCurrentPassphrase("");
      await loadStatus();
      toastSuccess(
        "Saved details unlocked",
        "Saved details can be used during this app session.",
      );
    } catch (error) {
      logError("Failed to unlock credential vault:", error);
      toastError(
        "Saved details were not unlocked",
        getPassphraseActionMessage(error),
      );
    } finally {
      setActiveAction(null);
    }
  }, [currentPassphrase, loadStatus, toastError, toastSuccess]);

  const handleDisable = useCallback(async () => {
    if (!currentPassphrase) {
      toastError("System lock was not restored", "Enter the passphrase.");
      return;
    }

    try {
      setActiveAction("disable");
      await disableCredentialPassphrase(currentPassphrase);
      setCurrentPassphrase("");
      await loadStatus();
      toastSuccess(
        "System lock restored",
        "Saved details now use this computer's password store.",
      );
    } catch (error) {
      logError("Failed to disable credential passphrase lock:", error);
      toastError(
        "System lock was not restored",
        getPassphraseActionMessage(error),
      );
    } finally {
      setActiveAction(null);
    }
  }, [currentPassphrase, loadStatus, toastError, toastSuccess]);

  const isBusy = activeAction !== null;
  const isPassphraseMode = status?.mode === "passphrase" && status.configured;
  const canEnable =
    loadState === "ready" &&
    !isPassphraseMode &&
    newPassphrase.length > 0 &&
    confirmPassphrase.length > 0 &&
    !enableError &&
    !isBusy;

  return (
    <section
      className="mb-6"
      aria-labelledby="settings-credential-lock-heading"
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3
          id="settings-credential-lock-heading"
          className="flex items-center gap-2 font-medium text-surface-800 dark:text-surface-200"
        >
          Saved Details Lock
          <HelpIcon text="Choose how saved alert and source details unlock on this computer." />
        </h3>
        <Button
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto"
          onClick={() => void loadStatus("refresh")}
          loading={activeAction === "refresh"}
          loadingText="Checking..."
        >
          Refresh
        </Button>
      </div>

      <div className="rounded-lg border border-surface-200 bg-surface-50 p-4 dark:border-surface-700 dark:bg-surface-800/60">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-surface-800 dark:text-surface-100">
              {getStatusTitle(loadState, status)}
            </p>
            <p className="mt-1 max-w-2xl text-sm text-surface-600 dark:text-surface-300">
              {getStatusBody(loadState, status)}
            </p>
          </div>
          <span
            className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium ${getStatusBadgeClass(loadState, status)}`}
          >
            {getStatusBadge(loadState, status)}
          </span>
        </div>

        {!isPassphraseMode && loadState !== "error" && (
          <form
            className="mt-4 grid gap-3 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              void handleEnable();
            }}
          >
            <PasswordField
              id="credential-lock-new-passphrase"
              label="New passphrase"
              value={newPassphrase}
              autoComplete="new-password"
              disabled={isBusy}
              onChange={setNewPassphrase}
            />
            <PasswordField
              id="credential-lock-confirm-passphrase"
              label="Confirm passphrase"
              value={confirmPassphrase}
              autoComplete="new-password"
              disabled={isBusy}
              onChange={setConfirmPassphrase}
            />
            <p className="text-xs text-surface-500 dark:text-surface-400 md:col-span-2">
              If this passphrase is lost, saved connection details cannot be
              recovered.
            </p>
            {enableError && (
              <p className="text-xs text-red-700 dark:text-red-300 md:col-span-2">
                {enableError}
              </p>
            )}
            <div className="md:col-span-2">
              <Button
                type="submit"
                size="sm"
                loading={activeAction === "enable"}
                loadingText="Enabling..."
                disabled={!canEnable}
              >
                Use Passphrase Lock
              </Button>
            </div>
          </form>
        )}

        {isPassphraseMode && (
          <form
            className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
            onSubmit={(event) => {
              event.preventDefault();
              if (status?.unlocked) {
                void handleDisable();
              } else {
                void handleUnlock();
              }
            }}
          >
            <PasswordField
              id="credential-lock-current-passphrase"
              label="Current passphrase"
              value={currentPassphrase}
              autoComplete="current-password"
              disabled={isBusy}
              onChange={setCurrentPassphrase}
            />
            <div className="flex flex-col gap-2 sm:flex-row md:items-end">
              {!status.unlocked && (
                <Button
                  type="button"
                  size="sm"
                  loading={activeAction === "unlock"}
                  loadingText="Unlocking..."
                  disabled={!currentPassphrase || isBusy}
                  onClick={() => void handleUnlock()}
                >
                  Unlock Saved Details
                </Button>
              )}
              <Button
                type={status.unlocked ? "submit" : "button"}
                variant="secondary"
                size="sm"
                loading={activeAction === "disable"}
                loadingText="Restoring..."
                disabled={!currentPassphrase || isBusy}
                onClick={
                  status.unlocked ? undefined : () => void handleDisable()
                }
              >
                Use System Lock
              </Button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  disabled: boolean;
  onChange: (value: string) => void;
}

function PasswordField({
  id,
  label,
  value,
  autoComplete,
  disabled,
  onChange,
}: PasswordFieldProps) {
  return (
    <label
      htmlFor={id}
      className="block text-sm font-medium text-surface-700 dark:text-surface-300"
    >
      {label}
      <input
        id={id}
        type="password"
        value={value}
        autoComplete={autoComplete}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-surface-300 bg-white px-3 py-2 text-sm text-surface-900 shadow-sm focus:border-sentinel-500 focus:outline-none focus:ring-2 focus:ring-sentinel-500/20 disabled:bg-surface-100 disabled:text-surface-500 dark:border-surface-600 dark:bg-surface-900 dark:text-surface-100 dark:disabled:bg-surface-800"
      />
    </label>
  );
}

function getStatusTitle(
  loadState: CredentialLockLoadState,
  status: CredentialUnlockStatus | null,
): string {
  if (loadState === "loading") return "Checking saved details lock";
  if (loadState === "error" || !status) return "Saved details lock unavailable";
  if (status.mode === "passphrase" && !status.unlocked) {
    return "Passphrase lock is on";
  }
  if (status.mode === "passphrase") return "Passphrase lock is unlocked";
  return "System lock is active";
}

function getStatusBody(
  loadState: CredentialLockLoadState,
  status: CredentialUnlockStatus | null,
): string {
  if (loadState === "loading") {
    return "Checking local lock status without opening saved details.";
  }
  if (loadState === "error" || !status) {
    return "Saved details were not opened. Try refresh, then unlock or save again if needed.";
  }
  if (status.mode === "passphrase" && !status.unlocked) {
    return "Unlock saved details before alerts or USAJobs checks use saved connection details.";
  }
  if (status.mode === "passphrase") {
    return "Saved details can be used during this app session.";
  }
  return "Saved details use this computer's password store by default.";
}

function getStatusBadge(
  loadState: CredentialLockLoadState,
  status: CredentialUnlockStatus | null,
): string {
  if (loadState === "loading") return "Checking";
  if (loadState === "error" || !status) return "Unavailable";
  if (status.mode === "passphrase" && !status.unlocked) return "Needs unlock";
  if (status.mode === "passphrase") return "Unlocked";
  return "System";
}

function getStatusBadgeClass(
  loadState: CredentialLockLoadState,
  status: CredentialUnlockStatus | null,
): string {
  if (loadState === "loading") {
    return "bg-surface-100 text-surface-700 dark:bg-surface-700 dark:text-surface-200";
  }
  if (loadState === "error" || !status) {
    return "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200";
  }
  if (status.mode === "passphrase" && !status.unlocked) {
    return "bg-alert-100 text-alert-900 dark:bg-alert-900/40 dark:text-alert-100";
  }
  if (status.mode === "passphrase") {
    return "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-100";
  }
  return "bg-sentinel-100 text-sentinel-800 dark:bg-sentinel-900/40 dark:text-sentinel-100";
}

function getPassphraseActionMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("12 non-space characters") ||
    message.includes("could not unlock") ||
    message.includes("already enabled") ||
    message.includes("not enabled")
  ) {
    return message;
  }
  return "Try again. Saved details were not changed.";
}
