import { invoke } from "@tauri-apps/api/core";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Badge } from "../components/Badge";
import { Button } from "../components/Button";
import { HelpIcon } from "../components/HelpIcon";
import { Input } from "../components/Input";
import { NotificationPreferences } from "../components/NotificationPreferences";
import { useToast } from "../contexts";
import {
  isValidDiscordWebhook,
  isValidEmail,
  isValidSlackWebhook,
  isValidTeamsWebhook,
  type Config,
  type CredentialKey,
  type Credentials,
} from "./SettingsConfig";
import { SettingsDesktopAlertsSection } from "./SettingsDesktopAlertsSection";
import { EmailIcon, SettingsSymbol } from "./SettingsIcons";
import { SecurityBadge } from "./SettingsSecurityBadge";

type EmailProvider = "custom" | "gmail" | "outlook" | "yahoo";

const emailProviderTemplates: Record<
  EmailProvider,
  { server: string; port: number; starttls: boolean; hint: string }
> = {
  gmail: {
    server: "smtp.gmail.com",
    port: 587,
    starttls: true,
    hint: "Use an app password from Google Account Security",
  },
  outlook: {
    server: "smtp-mail.outlook.com",
    port: 587,
    starttls: true,
    hint: "Use an app password if Outlook asks for one",
  },
  yahoo: {
    server: "smtp.mail.yahoo.com",
    port: 587,
    starttls: true,
    hint: "Use an app password from Yahoo Account Security",
  },
  custom: {
    server: "",
    port: 587,
    starttls: true,
    hint: "Leave these alone unless your email service gave you these details.",
  },
};

interface SettingsNotificationsSectionProps {
  config: Config;
  credentialStatus: Record<CredentialKey, boolean>;
  credentials: Credentials;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
}

export function SettingsNotificationsSection({
  config,
  credentialStatus,
  credentials,
  setConfig,
  setCredentials,
}: SettingsNotificationsSectionProps) {
  const [emailProvider, setEmailProvider] = useState<EmailProvider>("custom");
  const [testingSlack, setTestingSlack] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const toast = useToast();

  const isValidFromEmail = isValidEmail(config.alerts.email?.from_email ?? "");
  const hasValidToEmails = (config.alerts.email?.to_emails ?? []).every(
    isValidEmail,
  );

  const applyEmailProvider = (provider: EmailProvider) => {
    setEmailProvider(provider);
    if (provider !== "custom") {
      const template = emailProviderTemplates[provider];
      setConfig({
        ...config,
        alerts: {
          ...config.alerts,
          email: {
            ...config.alerts.email,
            smtp_server: template.server,
            smtp_port: template.port,
            use_starttls: template.starttls,
          },
        },
      });
    }
  };

  const handleWebhookAlertToggle = (
    channel: "slack" | "discord" | "teams",
    label: "Slack" | "Discord" | "Teams",
    credentialKey: "slack_webhook" | "discord_webhook" | "teams_webhook",
    value: string,
    validator: (value: string) => boolean,
    enabled: boolean,
  ) => {
    const trimmed = value.trim();
    if (enabled && !credentialStatus[credentialKey] && !trimmed) {
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
        [channel]: {
          ...config.alerts[channel],
          enabled,
        },
      },
    });
  };

  const handleTelegramAlertToggle = (enabled: boolean) => {
    const alertCode = credentials.telegram_bot_token.trim();
    const destination = config.alerts.telegram?.chat_id?.trim() ?? "";
    if (
      enabled &&
      ((!credentialStatus.telegram_bot_token && !alertCode) || !destination)
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
        telegram: {
          ...config.alerts.telegram,
          enabled,
        },
      },
    });
  };

  return (
    <>
      {/* Notifications */}
      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Get Notified
          <HelpIcon text="Receive alerts when new jobs match your criteria. Desktop alerts are the easiest option; email and chat alerts are optional." />
        </h3>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          Start with desktop alerts if you want the simplest setup.
          Email gives you an inbox copy. Chat alerts are optional for
          people who already use those tools.
        </p>
        <p className="mb-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
          Email and chat alerts are sent through the service you choose.
          They can include job title, company, location, pay, remote
          status, fit label, source, and job link. Resume text,
          private notes, application history, and local match reasons
          stay in JobSentinel.
        </p>

        <SettingsDesktopAlertsSection config={config} setConfig={setConfig} />

        {/* Email */}
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <EmailIcon className="w-5 h-5 text-blue-500" />
              <span className="font-medium text-surface-800 dark:text-surface-200">
                Email Alerts
              </span>
              <HelpIcon text="Email alerts are optional. Leave this off unless your email service gives you an app password or sending settings." />
            </div>
            <label
              className="relative inline-flex items-center cursor-pointer"
              data-testid="email-alerts-toggle"
            >
              <input
                type="checkbox"
                aria-label="Enable email alerts"
                checked={config.alerts.email?.enabled ?? false}
                onChange={(e) =>
                  setConfig({
                    ...config,
                    alerts: {
                      ...config.alerts,
                      email: {
                        ...config.alerts.email,
                        enabled: e.target.checked,
                      },
                    },
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
            </label>
          </div>

          {config.alerts.email?.enabled && (
            <div className="space-y-3">
              {/* Email service quick setup */}
              <div className="flex items-center gap-2 -mt-1 mb-2">
                <span className="text-sm text-surface-600 dark:text-surface-400">
                  Optional setup:
                </span>
                <div className="flex gap-1">
                  {(
                    ["gmail", "outlook", "yahoo", "custom"] as const
                  ).map((provider) => (
                    <button
                      key={provider}
                      type="button"
                      onClick={() => applyEmailProvider(provider)}
                      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                        emailProvider === provider
                          ? "bg-sentinel-500 text-white"
                          : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
                      }`}
                    >
                      {provider === "gmail"
                        ? "Gmail"
                        : provider === "outlook"
                          ? "Outlook"
                          : provider === "yahoo"
                            ? "Yahoo"
                            : "Other"}
                    </button>
                  ))}
                </div>
              </div>
              <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
                {emailProviderTemplates[emailProvider].hint}
                {emailProvider === "gmail" && (
                  <>
                    {" "}
                    —{" "}
                    <a
                      href="https://myaccount.google.com/apppasswords"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sentinel-500 hover:underline"
                    >
                      Create App Password
                    </a>
                  </>
                )}
                {emailProvider === "yahoo" && (
                  <>
                    {" "}
                    —{" "}
                    <a
                      href="https://login.yahoo.com/account/security"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sentinel-500 hover:underline"
                    >
                      Yahoo Security Settings
                    </a>
                  </>
                )}
              </p>
              <div className="flex items-center justify-between -mt-1 mb-3">
                <span></span>
                {config.alerts.email?.smtp_server &&
                  config.alerts.email?.smtp_username &&
                  (credentials.smtp_password ||
                    credentialStatus.smtp_password) &&
                  config.alerts.email?.from_email &&
                  isValidFromEmail &&
                  config.alerts.email?.to_emails?.length > 0 &&
                  hasValidToEmails && (
                    <Button
                      variant="secondary"
                      disabled={testingEmail}
                      onClick={async () => {
                        setTestingEmail(true);
                        try {
                          if (
                            !credentials.smtp_password &&
                            !credentialStatus.smtp_password
                          ) {
                            toast.error(
                              "App password needed",
                              "Enter the app password from your email service.",
                            );
                            return;
                          }
                          await invoke("test_email_notification", {
                            emailConfig: {
                              smtp_server:
                                config.alerts.email.smtp_server,
                              smtp_port: config.alerts.email.smtp_port,
                              smtp_username:
                                config.alerts.email.smtp_username,
                              smtp_password: credentials.smtp_password,
                              from_email:
                                config.alerts.email.from_email,
                              to_emails: config.alerts.email.to_emails,
                              use_starttls:
                                config.alerts.email.use_starttls ??
                                true,
                            },
                          });
                          toast.success(
                            "Test sent!",
                            "Check your email inbox",
                          );
                        } catch {
                          toast.error(
                            "Could not send test",
                            "Check the email account, app password, and recipient addresses.",
                          );
                        } finally {
                          setTestingEmail(false);
                        }
                      }}
                      className="whitespace-nowrap"
                    >
                      {testingEmail ? "Testing..." : "Test"}
                    </Button>
                  )}
              </div>
              <details className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
                <summary className="cursor-pointer text-sm font-medium text-surface-700 dark:text-surface-300">
                  Only if your email service gave you these details
                </summary>
                <div className="grid grid-cols-2 gap-3 mt-3">
                  <Input
                    label="Email sending service"
                    value={config.alerts.email?.smtp_server ?? ""}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        alerts: {
                          ...config.alerts,
                          email: {
                            ...config.alerts.email,
                            smtp_server: e.target.value,
                          },
                        },
                      })
                    }
                    placeholder="smtp.gmail.com"
                    hint="Use this only if your email service gave you this detail."
                  />
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        label="Number from email service"
                        type="number"
                        value={config.alerts.email?.smtp_port ?? 587}
                        onChange={(e) =>
                          setConfig({
                            ...config,
                            alerts: {
                              ...config.alerts,
                              email: {
                                ...config.alerts.email,
                                smtp_port:
                                  parseInt(e.target.value) || 587,
                              },
                            },
                          })
                        }
                        hint="Use this only if your email service gave you this detail."
                      />
                    </div>
                    <div className="flex items-end pb-2">
                      <div className="space-y-1">
                        <label
                          className="flex items-center gap-2 cursor-pointer"
                          title="Enable secure connection (recommended)"
                        >
                          <input
                            type="checkbox"
                            checked={
                              config.alerts.email?.use_starttls ?? true
                            }
                            onChange={(e) =>
                              setConfig({
                                ...config,
                                alerts: {
                                  ...config.alerts,
                                  email: {
                                    ...config.alerts.email,
                                    use_starttls: e.target.checked,
                                  },
                                },
                              })
                            }
                            className="w-4 h-4 rounded border-surface-300 text-sentinel-500 focus-visible:ring-sentinel-500"
                          />
                          <span className="text-sm text-surface-700 dark:text-surface-300">
                            Use secure email connection (recommended)
                          </span>
                        </label>
                        <p className="text-xs text-surface-500 dark:text-surface-400">
                          Leave this on unless your email service says to turn it off.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </details>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email address"
                  value={config.alerts.email?.smtp_username ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      alerts: {
                        ...config.alerts,
                        email: {
                          ...config.alerts.email,
                          smtp_username: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="your@gmail.com"
                  hint="The email account to send from"
                  autoComplete="email"
                />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                      App Password
                    </span>
                    <SecurityBadge
                      stored={credentialStatus.smtp_password}
                    />
                  </div>
                  <Input
                    type="password"
                    value={credentials.smtp_password}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        smtp_password: e.target.value,
                      }))
                    }
                    placeholder={
                      credentialStatus.smtp_password
                        ? "Enter new app password to update"
                        : "App password from your email service"
                    }
                    autoComplete="current-password"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Send From"
                  value={config.alerts.email?.from_email ?? ""}
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      alerts: {
                        ...config.alerts,
                        email: {
                          ...config.alerts.email,
                          from_email: e.target.value,
                        },
                      },
                    })
                  }
                  placeholder="your@gmail.com"
                  hint="Usually same as your email address"
                  error={
                    !isValidFromEmail
                      ? "Use an email address like user@example.com."
                      : undefined
                  }
                  autoComplete="email"
                />
                <Input
                  label="Send To"
                  value={
                    config.alerts.email?.to_emails?.join(", ") ?? ""
                  }
                  onChange={(e) =>
                    setConfig({
                      ...config,
                      alerts: {
                        ...config.alerts,
                        email: {
                          ...config.alerts.email,
                          to_emails: e.target.value
                            .split(",")
                            .map((s) => s.trim())
                            .filter(Boolean),
                        },
                      },
                    })
                  }
                  placeholder="you@email.com"
                  hint="Where to receive alerts (can be the same email)"
                  error={
                    !hasValidToEmails
                      ? "Use an email address like user@example.com."
                      : undefined
                  }
                  autoComplete="email"
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-3">
          <h4 className="text-sm font-medium text-surface-700 dark:text-surface-300">
            Optional chat alerts
          </h4>
          <p className="text-xs text-surface-500 dark:text-surface-400">
            Use these only if Slack, Discord, Teams, or Telegram are
            already part of your routine.
          </p>
        </div>

        {/* Slack */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
            Slack Notifications
            <HelpIcon
              text="Get job alerts in a Slack channel. In Slack, add the app that creates channel connection links, choose a channel, then copy the link."
              position="right"
            />
            <SecurityBadge stored={credentialStatus.slack_webhook} />
          </label>
          <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Send alerts to Slack
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
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
            <div className="mt-3 flex gap-2">
              <div className="flex-1">
                <Input
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
                    credentialStatus.slack_webhook
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
                  autoComplete="off"
                />
              </div>
              {(credentials.slack_webhook ||
                credentialStatus.slack_webhook) && (
                <Button
                  variant="secondary"
                  disabled={testingSlack}
                  onClick={async () => {
                    setTestingSlack(true);
                    try {
                      if (
                        !credentials.slack_webhook &&
                        !credentialStatus.slack_webhook
                      ) {
                        toast.error(
                          "No Slack link",
                          "Paste a Slack connection link first.",
                        );
                        return;
                      }
                      await invoke("validate_slack_webhook", {
                        webhookUrl: credentials.slack_webhook,
                      });
                      toast.success(
                        "Test sent!",
                        "Check your Slack channel",
                      );
                    } catch {
                      toast.error(
                        "Could not send test",
                        "Check that the Slack connection link is correct and try again",
                      );
                    } finally {
                      setTestingSlack(false);
                    }
                  }}
                  className="whitespace-nowrap"
                >
                  {testingSlack ? "Testing..." : "Test"}
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Discord */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
            Discord Notifications
            <HelpIcon
              text="Get job alerts in a Discord channel. In Discord, create a channel connection link, then paste it here."
              position="right"
            />
          </label>
          <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="chat" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Send alerts to Discord
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
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
              !credentialStatus.discord_webhook ||
              credentials.discord_webhook) && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Connection link
                  </span>
                  <SecurityBadge
                    stored={credentialStatus.discord_webhook}
                  />
                </div>
                <Input
                  type="password"
                  value={credentials.discord_webhook}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      discord_webhook: e.target.value,
                    }))
                  }
                  placeholder={
                    credentialStatus.discord_webhook
                      ? "Enter new Discord connection link"
                      : "Paste Discord connection link"
                  }
                  error={
                    credentials.discord_webhook &&
                    !isValidDiscordWebhook(
                      credentials.discord_webhook,
                    )
                      ? "This doesn't look like a Discord connection link"
                      : undefined
                  }
                  hint="In Discord, copy a channel connection link. Skip this if you do not already use Discord alerts."
                  autoComplete="off"
                />
              </div>
            )}
          </div>
        </div>

        {/* Microsoft Teams */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
            Microsoft Teams Notifications
            <HelpIcon
              text="Get job alerts in a Teams channel. Create a channel connection link in Teams, then paste it here."
              position="right"
            />
          </label>
          <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="users" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Send alerts to Teams
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
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
              !credentialStatus.teams_webhook ||
              credentials.teams_webhook) && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-surface-600 dark:text-surface-400">
                    Connection link
                  </span>
                  <SecurityBadge
                    stored={credentialStatus.teams_webhook}
                  />
                </div>
                <Input
                  type="password"
                  value={credentials.teams_webhook}
                  onChange={(e) =>
                    setCredentials((prev) => ({
                      ...prev,
                      teams_webhook: e.target.value,
                    }))
                  }
                  placeholder={
                    credentialStatus.teams_webhook
                      ? "Enter new Teams connection link"
                      : "Paste Teams connection link"
                  }
                  error={
                    credentials.teams_webhook &&
                    !isValidTeamsWebhook(credentials.teams_webhook)
                      ? "This doesn't look like a Teams connection link"
                      : undefined
                  }
                  autoComplete="off"
                  hint="In Teams, copy a channel connection link. Skip this if you do not already use Teams alerts."
                />
              </div>
            )}
          </div>
        </div>

        {/* Telegram */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
            Telegram Notifications
            <Badge variant="surface" size="sm">Optional chat alert</Badge>
            <HelpIcon
              text="Use desktop or email alerts unless Telegram is already part of your alert routine."
              position="right"
            />
          </label>
          <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-3">
            <p className="text-xs text-surface-500 dark:text-surface-400 mb-3">
              Use desktop or email alerts unless Telegram is already
              part of your alert routine. Telegram needs two details
              from Telegram before it can receive JobSentinel alerts.
            </p>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <SettingsSymbol icon="send" className="h-5 w-5 text-surface-500 dark:text-surface-400" />
                <span className="text-sm text-surface-600 dark:text-surface-300">
                  Send alerts to Telegram
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  aria-label="Enable Telegram alerts"
                  checked={config.alerts.telegram?.enabled ?? false}
                  onChange={(e) =>
                    handleTelegramAlertToggle(e.target.checked)
                  }
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-surface-200 peer-focus:outline-none peer-focus-visible:ring-4 peer-focus-visible:ring-sentinel-300 dark:peer-focus-visible:ring-sentinel-800 rounded-full peer dark:bg-surface-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-surface-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-surface-600 peer-checked:bg-sentinel-500"></div>
              </label>
            </div>
            {(config.alerts.telegram?.enabled ||
              Boolean(credentials.telegram_bot_token) ||
              (credentialStatus.telegram_bot_token &&
                Boolean((config.alerts.telegram?.chat_id ?? "").trim()))) && (
              <div className="mt-3 space-y-3">
                <div className="p-3 bg-surface-50 dark:bg-surface-900/50 border border-surface-200 dark:border-surface-700 rounded-lg">
                  <p className="text-sm font-medium text-surface-700 dark:text-surface-300">
                    Optional Telegram alert setup
                  </p>
                  <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
                    Continue only if you already use Telegram for phone
                    alerts or want a private job-alert chat.
                  </p>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-surface-600 dark:text-surface-400">
                      Telegram setup code
                    </span>
                    <SecurityBadge
                      stored={credentialStatus.telegram_bot_token}
                    />
                  </div>
                  <Input
                    type="password"
                    value={credentials.telegram_bot_token}
                    onChange={(e) =>
                      setCredentials((prev) => ({
                        ...prev,
                        telegram_bot_token: e.target.value,
                      }))
                    }
                    placeholder={
                      credentialStatus.telegram_bot_token
                        ? "Enter new Telegram setup code"
                        : "Paste Telegram setup code"
                    }
                    hint="Use Telegram's own setup flow first, then paste the code it shows."
                  />
                </div>
                <div>
                  <span className="text-sm text-surface-600 dark:text-surface-400 mb-1 block">
                    Telegram destination
                  </span>
                  <Input
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

      </section>

      {/* Notification Preferences by Source */}
      <section className="mb-6">
        <NotificationPreferences />
      </section>
    </>
  );
}
