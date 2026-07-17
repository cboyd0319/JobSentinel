import type { Dispatch, SetStateAction } from "react";
import { Badge } from "../../../ui/Badge";
import { Button } from "../../../ui/Button";
import { HelpIcon } from "../../../ui/HelpIcon";
import { Input } from "../../../ui/Input";
import type { Config } from "../config/SettingsConfig";
import {
  isValidDiscordWebhook,
  isValidSlackWebhook,
  isValidTeamsWebhook,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "../credentials/SettingsCredentials";
import { SettingsSymbol } from "../shared/SettingsIcons";
import { SecurityBadge } from "../shared/SettingsSecurityBadge";
import { useSettingsChatAlerts } from "./useSettingsChatAlerts";

interface SettingsChatAlertsSectionProps {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  markCredentialNeedsAttention: (key: CredentialKey) => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
}

export function SettingsChatAlertsSection({
  config,
  credentialStatus,
  credentials,
  markCredentialNeedsAttention,
  setConfig,
  setCredentials,
}: SettingsChatAlertsSectionProps) {
  const {
    handleSendSlackTest,
    handleTelegramAlertToggle,
    handleWebhookAlertToggle,
    hasConfiguredCredential,
    hasConfirmedCredential,
    testingSlack,
  } = useSettingsChatAlerts({
    config,
    credentialStatus,
    credentials,
    markCredentialNeedsAttention,
    setConfig,
  });

  return (
    <>
      <div className="mb-3">
        <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
          Optional chat alerts
        </h4>
        <p className="text-xs text-surface-500 dark:text-surface-400">
          Use these only if Slack, Discord, Teams, or Telegram are already part
          of your routine.
        </p>
      </div>

      {/* Slack */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex flex-wrap items-center gap-2">
          Slack Notifications
          <HelpIcon
            text="Get job alerts in a Slack channel. In Slack, add the app that creates channel connection links, choose a channel, then copy the link."
            position="right"
          />
          <SecurityBadge status={credentialStatus.slack_webhook} />
        </label>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="chat"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="text-sm text-surface-600 dark:text-surface-300">
                Send alerts to Slack
              </span>
            </div>
            <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Enable Slack alerts"
                checked={config.alerts.slack?.enabled ?? false}
                onChange={(e) =>
                  handleWebhookAlertToggle(
                    "slack",
                    "Slack",
                    "slack_webhook",
                    credentials.slack_webhook,
                    isValidSlackWebhook,
                    e.target.checked,
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <div className="flex-1">
              <Input
                label="Slack connection link"
                hideLabel
                type="password"
                value={credentials.slack_webhook}
                onChange={(e) => {
                  const value = e.target.value;
                  setCredentials((prev) => ({
                    ...prev,
                    slack_webhook: value,
                  }));
                }}
                placeholder={
                  hasConfiguredCredential("slack_webhook")
                    ? "Enter new Slack connection link"
                    : "Paste Slack connection link, then turn Slack alerts on"
                }
                error={
                  credentials.slack_webhook &&
                  !isValidSlackWebhook(credentials.slack_webhook)
                    ? "This doesn't look like a Slack connection link"
                    : undefined
                }
                hint="Saved securely on this computer"
                autoComplete="new-password"
              />
            </div>
            {(credentials.slack_webhook ||
              hasConfirmedCredential("slack_webhook")) && (
              <Button
                variant="secondary"
                disabled={testingSlack}
                onClick={handleSendSlackTest}
                className="whitespace-nowrap"
              >
                {testingSlack ? "Sending..." : "Send test Slack message"}
              </Button>
            )}
          </div>
          {(credentials.slack_webhook ||
            hasConfirmedCredential("slack_webhook")) && (
            <p className="mt-2 text-xs text-surface-500 dark:text-surface-400">
              Sends one test message to the Slack channel for this connection.
            </p>
          )}
        </div>
      </div>

      {/* Discord */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex flex-wrap items-center gap-2">
          Discord Notifications
          <HelpIcon
            text="Get job alerts in a Discord channel. In Discord, create a channel connection link, then paste it here."
            position="right"
          />
        </label>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="chat"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="text-sm text-surface-600 dark:text-surface-300">
                Send alerts to Discord
              </span>
            </div>
            <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Enable Discord alerts"
                checked={config.alerts.discord?.enabled ?? false}
                onChange={(e) =>
                  handleWebhookAlertToggle(
                    "discord",
                    "Discord",
                    "discord_webhook",
                    credentials.discord_webhook,
                    isValidDiscordWebhook,
                    e.target.checked,
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          {(config.alerts.discord?.enabled ||
            !hasConfiguredCredential("discord_webhook") ||
            credentials.discord_webhook) && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  Connection link
                </span>
                <SecurityBadge status={credentialStatus.discord_webhook} />
              </div>
              <Input
                label="Discord connection link"
                hideLabel
                type="password"
                value={credentials.discord_webhook}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    discord_webhook: e.target.value,
                  }))
                }
                placeholder={
                  hasConfiguredCredential("discord_webhook")
                    ? "Enter new Discord connection link"
                    : "Paste Discord connection link"
                }
                error={
                  credentials.discord_webhook &&
                  !isValidDiscordWebhook(credentials.discord_webhook)
                    ? "This doesn't look like a Discord connection link"
                    : undefined
                }
                hint="In Discord, copy a channel connection link. Skip this if you do not already use Discord alerts."
                autoComplete="new-password"
              />
            </div>
          )}
        </div>
      </div>

      {/* Microsoft Teams */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex flex-wrap items-center gap-2">
          Microsoft Teams Notifications
          <HelpIcon
            text="Get job alerts in a Teams channel. Create a channel connection link in Teams, then paste it here."
            position="right"
          />
        </label>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="users"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="text-sm text-surface-600 dark:text-surface-300">
                Send alerts to Teams
              </span>
            </div>
            <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Enable Teams alerts"
                checked={config.alerts.teams?.enabled ?? false}
                onChange={(e) =>
                  handleWebhookAlertToggle(
                    "teams",
                    "Teams",
                    "teams_webhook",
                    credentials.teams_webhook,
                    isValidTeamsWebhook,
                    e.target.checked,
                  )
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          {(config.alerts.teams?.enabled ||
            !hasConfiguredCredential("teams_webhook") ||
            credentials.teams_webhook) && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  Connection link
                </span>
                <SecurityBadge status={credentialStatus.teams_webhook} />
              </div>
              <Input
                label="Teams connection link"
                hideLabel
                type="password"
                value={credentials.teams_webhook}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    teams_webhook: e.target.value,
                  }))
                }
                placeholder={
                  hasConfiguredCredential("teams_webhook")
                    ? "Enter new Teams connection link"
                    : "Paste Teams connection link"
                }
                error={
                  credentials.teams_webhook &&
                  !isValidTeamsWebhook(credentials.teams_webhook)
                    ? "This doesn't look like a Teams connection link"
                    : undefined
                }
                autoComplete="new-password"
                hint="In Teams, copy a channel connection link. Skip this if you do not already use Teams alerts."
              />
            </div>
          )}
        </div>
      </div>

      {/* Telegram */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex flex-wrap items-center gap-2">
          Telegram Notifications
          <Badge variant="surface" size="sm">
            Optional chat alert
          </Badge>
          <HelpIcon
            text="Use desktop or email alerts unless Telegram is already part of your alert routine."
            position="right"
          />
        </label>
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
          <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
            Use desktop or email alerts unless Telegram is already part of your
            alert routine. Telegram needs two details from Telegram before it
            can receive JobSentinel alerts.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <SettingsSymbol
                icon="send"
                className="h-5 w-5 text-surface-500 dark:text-surface-400"
              />
              <span className="text-sm text-surface-600 dark:text-surface-300">
                Send alerts to Telegram
              </span>
            </div>
            <label className="relative inline-flex flex-shrink-0 items-center cursor-pointer">
              <input
                type="checkbox"
                aria-label="Enable Telegram alerts"
                checked={config.alerts.telegram?.enabled ?? false}
                onChange={(e) => handleTelegramAlertToggle(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>
          {(config.alerts.telegram?.enabled ||
            Boolean(credentials.telegram_bot_token) ||
            (hasConfiguredCredential("telegram_bot_token") &&
              Boolean((config.alerts.telegram?.chat_id ?? "").trim()))) && (
            <div className="mt-3 space-y-3">
              <div className="p-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg">
                <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                  Optional Telegram alert setup
                </p>
                <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                  Continue only if you already use Telegram for phone alerts or
                  want a private job-alert chat.
                </p>
              </div>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Telegram setup code
                  </span>
                  <SecurityBadge status={credentialStatus.telegram_bot_token} />
                </div>
                <Input
                  label="Telegram setup code"
                  hideLabel
                  type="password"
                  value={credentials.telegram_bot_token}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      telegram_bot_token: e.target.value,
                    }))
                  }
                  placeholder={
                    hasConfiguredCredential("telegram_bot_token")
                      ? "Enter new Telegram setup code"
                      : "Paste Telegram setup code"
                  }
                  hint="Use Telegram's own setup flow first, then paste the code it shows."
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Input
                  label="Telegram destination"
                  placeholder="Detail shown by Telegram"
                  value={config.alerts.telegram?.chat_id ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      alerts: {
                        ...config.alerts,
                        telegram: {
                          ...config.alerts.telegram,
                          enabled: true,
                          chat_id: e.target.value,
                        },
                      },
                    })
                  }
                  hint="Paste the destination Telegram shows for where alerts should go."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
