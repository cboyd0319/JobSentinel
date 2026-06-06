import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ToastContextType } from "../contexts/toastContextDef";
import { logError } from "../utils/errorUtils";
import {
  getCredentialStatusEntries,
  hasCredential,
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "./SettingsConfig";

export interface CredentialSaveEntry {
  key: CredentialKey;
  value: string;
}

const CREDENTIAL_KEYS: CredentialKey[] = [
  "slack_webhook",
  "smtp_password",
  "discord_webhook",
  "teams_webhook",
  "telegram_bot_token",
  "usajobs_api_key",
];

function createEmptyCredentials(): Credentials {
  return {
    slack_webhook: "",
    smtp_password: "",
    discord_webhook: "",
    teams_webhook: "",
    telegram_bot_token: "",
    usajobs_api_key: "",
  };
}

function createCredentialStatusValue(exists = false, available = true) {
  return { exists, available };
}

function createEmptyCredentialStatus(): CredentialStatusMap {
  return {
    slack_webhook: createCredentialStatusValue(),
    smtp_password: createCredentialStatusValue(),
    discord_webhook: createCredentialStatusValue(),
    teams_webhook: createCredentialStatusValue(),
    telegram_bot_token: createCredentialStatusValue(),
    usajobs_api_key: createCredentialStatusValue(),
  };
}

function createCredentialStatusFromEntries(
  entries: Awaited<ReturnType<typeof getCredentialStatusEntries>>,
): CredentialStatusMap {
  const status = createEmptyCredentialStatus();
  entries.forEach((entry) => {
    status[entry.key] = {
      exists: entry.exists,
      available: entry.available ?? true,
    };
  });
  return status;
}

export function useSettingsCredentials(toast: ToastContextType) {
  const [credentials, setCredentials] = useState<Credentials>(
    createEmptyCredentials,
  );
  const [dirtyCredentialKeys, setDirtyCredentialKeys] = useState<
    Set<CredentialKey>
  >(() => new Set());
  const [credentialStatus, setCredentialStatus] = useState<
    CredentialStatusMap
  >(createEmptyCredentialStatus);

  const initializeCredentialStatus = useCallback((_config: Config) => {
    void getCredentialStatusEntries()
      .then((entries) => {
        setCredentialStatus(
          Array.isArray(entries)
            ? createCredentialStatusFromEntries(entries)
            : createEmptyCredentialStatus(),
        );
      })
      .catch((error) => {
        logError("Could not load saved connection status:", error);
        setCredentialStatus((previousStatus) => {
          const nextStatus = { ...previousStatus };
          CREDENTIAL_KEYS.forEach((key) => {
            nextStatus[key] = { exists: false, available: false };
          });
          return nextStatus;
        });
        toast.warning(
          "Saved connection details unavailable",
          "Unlock your system password manager if needed, then try again.",
        );
      });
  }, [toast]);

  const handleCredentialsChange = useCallback<
    Dispatch<SetStateAction<Credentials>>
  >((updater) => {
    setCredentials((previousCredentials) => {
      const nextCredentials =
        typeof updater === "function" ? updater(previousCredentials) : updater;
      const changedKeys = CREDENTIAL_KEYS.filter(
        (key) => nextCredentials[key] !== previousCredentials[key],
      );

      if (changedKeys.length > 0) {
        setDirtyCredentialKeys((previousDirtyKeys) => {
          const nextDirtyKeys = new Set(previousDirtyKeys);
          changedKeys.forEach((key) => nextDirtyKeys.add(key));
          return nextDirtyKeys;
        });
      }

      return nextCredentials;
    });
  }, []);

  const checkCredentialStatus = useCallback(
    async (key: CredentialKey): Promise<boolean> => {
      try {
        const exists = await hasCredential(key);
        setCredentialStatus((previousStatus) => ({
          ...previousStatus,
          [key]: { exists, available: true },
        }));
        return exists;
      } catch (error) {
        logError("Could not check saved connection detail:", error);
        setCredentialStatus((previousStatus) => ({
          ...previousStatus,
          [key]: { exists: false, available: false },
        }));
        toast.warning(
          "Saved connection detail unavailable",
          "Unlock your system password manager if needed, then try again.",
        );
        return false;
      }
    },
    [toast],
  );

  const getCredentialSaveEntries = useCallback(
    (): CredentialSaveEntry[] =>
      CREDENTIAL_KEYS.filter(
        (key) => dirtyCredentialKeys.has(key) && credentials[key].trim(),
      ).map((key) => ({ key, value: credentials[key] })),
    [credentials, dirtyCredentialKeys],
  );

  const markCredentialsSaved = useCallback(
    (successfulCredentialKeys: CredentialKey[]) => {
      if (successfulCredentialKeys.length === 0) return;

      setCredentials((previousCredentials) => {
        const nextCredentials = { ...previousCredentials };
        successfulCredentialKeys.forEach((key) => {
          nextCredentials[key] = "";
        });
        return nextCredentials;
      });
      setCredentialStatus((previousStatus) => {
        const nextStatus = { ...previousStatus };
        successfulCredentialKeys.forEach((key) => {
          nextStatus[key] = { exists: true, available: true };
        });
        return nextStatus;
      });
      setDirtyCredentialKeys((previousDirtyKeys) => {
        const nextDirtyKeys = new Set(previousDirtyKeys);
        successfulCredentialKeys.forEach((key) => nextDirtyKeys.delete(key));
        return nextDirtyKeys;
      });
    },
    [],
  );

  return {
    credentials,
    credentialStatus,
    checkCredentialStatus,
    getCredentialSaveEntries,
    initializeCredentialStatus,
    markCredentialsSaved,
    setCredentials: handleCredentialsChange,
  };
}
