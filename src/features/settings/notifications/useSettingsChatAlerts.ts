import { useState, type Dispatch, type SetStateAction } from "react";
import { invoke } from "../../../platform/tauri";
import { useToast } from "../../../shared/toast/useToast";
import {
  credentialExists,
  credentialIsExpected,
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "../config/SettingsConfig";

interface UseSettingsChatAlertsOptions {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  markCredentialNeedsAttention: (key: CredentialKey) => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
}

export function useSettingsChatAlerts({
  config,
  credentialStatus,
  credentials,
  markCredentialNeedsAttention,
  setConfig,
}: UseSettingsChatAlertsOptions) {
  const [testingSlack, setTestingSlack] = useState(false);
  const toast = useToast();

  const hasConfirmedCredential = (key: CredentialKey) =>
    credentialExists(credentialStatus, key);
  const hasConfiguredCredential = (key: CredentialKey) =>
    hasConfirmedCredential(key) || credentialIsExpected(credentialStatus, key);

  const handleWebhookAlertToggle = (
    channel: "slack" | "discord" | "teams",
    label: "Slack" | "Discord" | "Teams",
    credentialKey: "slack_webhook" | "discord_webhook" | "teams_webhook",
    value: string,
    validator: (value: string) => boolean,
    enabled: boolean,
  ) => {
    const trimmed = value.trim();
    const hasSavedCredential = hasConfirmedCredential(credentialKey);
    if (enabled && !hasSavedCredential && !trimmed) {
      toast.info(
        `Paste ${label} connection link first`,
        `Then turn ${label} alerts on.`,
      );
      return;
    }
    if (enabled && trimmed && !validator(trimmed)) {
      toast.error(
        `Check ${label} connection link`,
        `Paste the full ${label} connection link, then turn alerts on.`,
      );
      return;
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        [channel]: { ...config.alerts[channel], enabled },
      },
    });
  };

  const handleTelegramAlertToggle = (enabled: boolean) => {
    const alertCode = credentials.telegram_bot_token.trim();
    const destination = config.alerts.telegram?.chat_id?.trim() ?? "";
    if (
      enabled &&
      ((!hasConfirmedCredential("telegram_bot_token") && !alertCode) ||
        !destination)
    ) {
      toast.info(
        "Telegram setup opened",
        "Add the Telegram details before saving alerts.",
      );
    }

    setConfig({
      ...config,
      alerts: {
        ...config.alerts,
        telegram: { ...config.alerts.telegram, enabled },
      },
    });
  };

  const handleSendSlackTest = async () => {
    setTestingSlack(true);
    try {
      if (
        !credentials.slack_webhook &&
        !hasConfirmedCredential("slack_webhook")
      ) {
        toast.error("No Slack link", "Paste a Slack connection link first.");
        return;
      }
      await invoke("validate_slack_webhook", {
        webhookUrl: credentials.slack_webhook,
      });
      toast.success("Test sent!", "Check your Slack channel");
    } catch {
      if (!credentials.slack_webhook) {
        markCredentialNeedsAttention("slack_webhook");
      }
      toast.error(
        "Could not send test",
        "Check that the Slack connection link is correct and try again",
      );
    } finally {
      setTestingSlack(false);
    }
  };

  return {
    handleSendSlackTest,
    handleTelegramAlertToggle,
    handleWebhookAlertToggle,
    hasConfiguredCredential,
    hasConfirmedCredential,
    testingSlack,
  };
}
