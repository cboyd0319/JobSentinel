import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ToastContextType } from "../contexts/toastContextDef";
import { logError } from "../utils/errorUtils";
import {
  hasCredential,
  type Config,
  type CredentialKey,
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

function createEmptyCredentialStatus(): Record<CredentialKey, boolean> {
  return {
    slack_webhook: false,
    smtp_password: false,
    discord_webhook: false,
    teams_webhook: false,
    telegram_bot_token: false,
    usajobs_api_key: false,
  };
}

function createCredentialStatusFromConfig(
  config: Config,
): Record<CredentialKey, boolean> {
  return {
    slack_webhook: config.alerts.slack?.enabled ?? false,
    smtp_password:
      Boolean(config.alerts.email?.enabled) &&
      Boolean(
        config.alerts.email?.smtp_username?.trim() ||
          config.alerts.email?.smtp_server?.trim(),
      ),
    discord_webhook: config.alerts.discord?.enabled ?? false,
    teams_webhook: config.alerts.teams?.enabled ?? false,
    telegram_bot_token:
      Boolean(config.alerts.telegram?.enabled) &&
      Boolean(config.alerts.telegram?.chat_id?.trim()),
    usajobs_api_key:
      Boolean(config.usajobs?.enabled) && Boolean(config.usajobs?.email?.trim()),
  };
}

export function useSettingsCredentials(toast: ToastContextType) {
  const [credentials, setCredentials] = useState<Credentials>(
    createEmptyCredentials,
  );
  const [dirtyCredentialKeys, setDirtyCredentialKeys] = useState<
    Set<CredentialKey>
  >(() => new Set());
  const [credentialStatus, setCredentialStatus] = useState<
    Record<CredentialKey, boolean>
  >(createEmptyCredentialStatus);

  const initializeCredentialStatus = useCallback((config: Config) => {
    setCredentialStatus(createCredentialStatusFromConfig(config));
  }, []);

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
          [key]: exists,
        }));
        return exists;
      } catch (error) {
        logError("Could not check saved connection detail:", error);
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
          nextStatus[key] = true;
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
