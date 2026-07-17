import { invoke } from "../../../platform/tauri";
import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { Button } from "../../../ui/Button";
import { HelpIcon } from "../../../ui/HelpIcon";
import { Input } from "../../../ui/Input";
import { useToast } from "../../../shared/toast/useToast";
import {
  isValidEmail,
  type Config,
} from "../config/SettingsConfig";
import {
  credentialExists,
  credentialIsExpected,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "../credentials/SettingsCredentials";
import { SettingsEmailProviderSetup } from "./SettingsEmailProviderSetup";
import {
  EMAIL_PROVIDER_TEMPLATES,
  type EmailProvider,
} from "./SettingsEmailProviderTemplates";
import { EmailIcon } from "../shared/SettingsIcons";
import { SecurityBadge } from "../shared/SettingsSecurityBadge";

interface SettingsEmailAlertsSectionProps {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  markCredentialNeedsAttention: (key: CredentialKey) => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
}

export function SettingsEmailAlertsSection({
  config,
  credentialStatus,
  credentials,
  markCredentialNeedsAttention,
  setConfig,
  setCredentials,
}: SettingsEmailAlertsSectionProps) {
  const [emailProvider, setEmailProvider] = useState<EmailProvider>("custom");
  const [testingEmail, setTestingEmail] = useState(false);
  const toast = useToast();

  const isValidFromEmail = isValidEmail(config.alerts.email?.from_email ?? "");
  const hasValidToEmails = (config.alerts.email?.to_emails ?? []).every(
    isValidEmail,
  );
  const hasConfirmedCredential = (key: CredentialKey) =>
    credentialExists(credentialStatus, key);
  const hasConfiguredCredential = (key: CredentialKey) =>
    hasConfirmedCredential(key) || credentialIsExpected(credentialStatus, key);
  const canSendTestEmail =
    config.alerts.email?.smtp_server &&
    config.alerts.email?.smtp_username &&
    (credentials.smtp_password || hasConfirmedCredential("smtp_password")) &&
    config.alerts.email?.from_email &&
    isValidFromEmail &&
    config.alerts.email?.to_emails?.length > 0 &&
    hasValidToEmails;

  const applyEmailProvider = (provider: EmailProvider) => {
    setEmailProvider(provider);
    if (provider !== "custom") {
      const template = EMAIL_PROVIDER_TEMPLATES[provider];
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

  return (
    <div className="border border-surface-200 dark:border-surface-700 rounded-lg p-4">
      <div className="flex flex-col gap-3 mb-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <EmailIcon className="w-5 h-5 text-blue-500" />
          <span className="font-medium text-surface-800 dark:text-surface-200">
            Email Alerts
          </span>
          <HelpIcon text="Email alerts are optional. Leave this off unless your email service gives you an app password or sending settings." />
        </div>
        <label
          className="relative inline-flex flex-shrink-0 items-center cursor-pointer"
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
          <SettingsEmailProviderSetup
            emailProvider={emailProvider}
            onProviderSelect={applyEmailProvider}
          />
          <div className="flex flex-col items-start gap-2 -mt-1 mb-3 sm:flex-row sm:items-center sm:justify-between">
            <span></span>
            {canSendTestEmail && (
              <Button
                variant="secondary"
                disabled={testingEmail}
                onClick={async () => {
                  setTestingEmail(true);
                  try {
                    if (
                      !credentials.smtp_password &&
                      !hasConfirmedCredential("smtp_password")
                    ) {
                      toast.error(
                        "App password needed",
                        "Enter the app password from your email service.",
                      );
                      return;
                    }
                    await invoke("test_email_notification", {
                      emailConfig: {
                        smtp_server: config.alerts.email.smtp_server,
                        smtp_port: config.alerts.email.smtp_port,
                        smtp_username: config.alerts.email.smtp_username,
                        smtp_password: credentials.smtp_password,
                        from_email: config.alerts.email.from_email,
                        to_emails: config.alerts.email.to_emails,
                        use_starttls: config.alerts.email.use_starttls ?? true,
                      },
                    });
                    toast.success("Test sent!", "Check your email inbox");
                  } catch {
                    if (!credentials.smtp_password) {
                      markCredentialNeedsAttention("smtp_password");
                    }
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
                {testingEmail ? "Sending..." : "Send test email"}
              </Button>
            )}
          </div>
          {canSendTestEmail && (
            <p className="text-xs text-surface-500 dark:text-surface-400">
              Sends one test email to the recipients you entered.
            </p>
          )}
          <details className="rounded-lg border border-surface-200 dark:border-surface-700 p-3">
            <summary className="cursor-pointer text-sm font-medium text-surface-700 dark:text-surface-300">
              Only if your email service gave you these details
            </summary>
            <div className="grid grid-cols-1 gap-3 mt-3 sm:grid-cols-2">
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
                            smtp_port: parseInt(e.target.value) || 587,
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
                        checked={config.alerts.email?.use_starttls ?? true}
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
                      Leave this on unless your email service says to turn it
                      off.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </details>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                <SecurityBadge status={credentialStatus.smtp_password} />
              </div>
              <Input
                label="App Password"
                hideLabel
                type="password"
                value={credentials.smtp_password}
                onChange={(e) =>
                  setCredentials((prev) => ({
                    ...prev,
                    smtp_password: e.target.value,
                  }))
                }
                placeholder={
                  hasConfiguredCredential("smtp_password")
                    ? "Enter new app password to update"
                    : "App password from your email service"
                }
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
              value={config.alerts.email?.to_emails?.join(", ") ?? ""}
              onChange={(e) =>
                setConfig({
                  ...config,
                  alerts: {
                    ...config.alerts,
                    email: {
                      ...config.alerts.email,
                      to_emails: e.target.value
                        .split(",")
                        .map((value) => value.trim())
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
  );
}
