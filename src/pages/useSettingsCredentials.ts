import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { ToastContextType } from "../contexts/toastContextDef";
import {
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type CredentialStatusState,
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

function createCredentialStatusValue(
  state: CredentialStatusState = "empty",
) {
  return {
    exists: state === "saved" || state === "needs_attention",
    available: state !== "expected" && state !== "needs_attention",
    state,
  };
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

function markExpectedCredential(
  status: CredentialStatusMap,
  key: CredentialKey,
) {
  status[key] = createCredentialStatusValue("expected");
}

function createCredentialStatusFromConfig(config: Config): CredentialStatusMap {
  const status = createEmptyCredentialStatus();

  if (config.alerts.slack?.enabled) {
    markExpectedCredential(status, "slack_webhook");
  }
  if (config.alerts.email?.enabled) {
    markExpectedCredential(status, "smtp_password");
  }
  if (config.alerts.discord?.enabled) {
    markExpectedCredential(status, "discord_webhook");
  }
  if (config.alerts.teams?.enabled) {
    markExpectedCredential(status, "teams_webhook");
  }
  if (config.alerts.telegram?.enabled) {
    markExpectedCredential(status, "telegram_bot_token");
  }
  if (config.usajobs?.enabled) {
    markExpectedCredential(status, "usajobs_api_key");
  }

  return status;
}

export function useSettingsCredentials(_toast: ToastContextType) {
  const [credentials, setCredentials] = useState<Credentials>(
    createEmptyCredentials,
  );
  const [credentialStatus, setCredentialStatus] = useState<
    CredentialStatusMap
  >(createEmptyCredentialStatus);

  const initializeCredentialStatus = useCallback((config: Config) => {
    setCredentialStatus(createCredentialStatusFromConfig(config));
  }, []);

  const handleCredentialsChange = useCallback<
    Dispatch<SetStateAction<Credentials>>
  >((updater) => {
    setCredentials(updater);
  }, []);

  const getCredentialSaveEntries = useCallback(
    (): CredentialSaveEntry[] =>
      CREDENTIAL_KEYS.filter(
        (key) => credentials[key].trim(),
      ).map((key) => ({ key, value: credentials[key] })),
    [credentials],
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
          nextStatus[key] = createCredentialStatusValue("saved");
        });
        return nextStatus;
      });
    },
    [],
  );

  const markCredentialNeedsAttention = useCallback((key: CredentialKey) => {
    setCredentialStatus((previousStatus) => ({
      ...previousStatus,
      [key]: createCredentialStatusValue("needs_attention"),
    }));
  }, []);

  return {
    credentials,
    credentialStatus,
    getCredentialSaveEntries,
    initializeCredentialStatus,
    markCredentialNeedsAttention,
    markCredentialsSaved,
    setCredentials: handleCredentialsChange,
  };
}
