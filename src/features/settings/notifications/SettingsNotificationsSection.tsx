import type { Dispatch, SetStateAction } from "react";
import { HelpIcon } from "../../../components/HelpIcon";
import { NotificationPreferences } from "./NotificationPreferences";
import {
  type Config,
  type CredentialKey,
  type CredentialStatusMap,
  type Credentials,
} from "../config/SettingsConfig";
import { SettingsDesktopAlertsSection } from "./SettingsDesktopAlertsSection";
import { SettingsEmailAlertsSection } from "./SettingsEmailAlertsSection";
import { SettingsChatAlertsSection } from "./SettingsChatAlertsSection";

interface SettingsNotificationsSectionProps {
  config: Config;
  credentialStatus: CredentialStatusMap;
  credentials: Credentials;
  markCredentialNeedsAttention: (key: CredentialKey) => void;
  setConfig: Dispatch<SetStateAction<Config | null>>;
  setCredentials: Dispatch<SetStateAction<Credentials>>;
}

export function SettingsNotificationsSection({
  config,
  credentialStatus,
  credentials,
  markCredentialNeedsAttention,
  setConfig,
  setCredentials,
}: SettingsNotificationsSectionProps) {
  return (
    <>
      {/* Notifications */}
      <section className="mb-6">
        <h3 className="font-medium text-surface-800 dark:text-surface-200 mb-3 flex items-center gap-2">
          Get Notified
          <HelpIcon text="Receive alerts when new jobs match your criteria. Desktop alerts are the easiest option; email and chat alerts are optional." />
        </h3>
        <p className="mb-4 text-sm text-surface-500 dark:text-surface-400">
          Start with desktop alerts if you want the simplest setup. Email gives
          you an inbox copy. Chat alerts are optional for people who already use
          those tools.
        </p>
        <p className="mb-4 rounded-lg border border-surface-200 bg-surface-50 p-3 text-xs text-surface-600 dark:border-surface-700 dark:bg-surface-800 dark:text-surface-300">
          Email and chat alerts are sent through the service you choose. They
          can include job title, company, location, pay, remote status, fit
          label, source, and job link. Resume text, private notes, application
          history, and local match reasons stay in JobSentinel.
        </p>

        <SettingsDesktopAlertsSection config={config} setConfig={setConfig} />

        <SettingsEmailAlertsSection
          config={config}
          credentialStatus={credentialStatus}
          credentials={credentials}
          markCredentialNeedsAttention={markCredentialNeedsAttention}
          setConfig={setConfig}
          setCredentials={setCredentials}
        />

        <SettingsChatAlertsSection
          config={config}
          credentialStatus={credentialStatus}
          credentials={credentials}
          markCredentialNeedsAttention={markCredentialNeedsAttention}
          setConfig={setConfig}
          setCredentials={setCredentials}
        />
      </section>

      {/* Notification Preferences by Source */}
      <section className="mb-6">
        <NotificationPreferences />
      </section>
    </>
  );
}
