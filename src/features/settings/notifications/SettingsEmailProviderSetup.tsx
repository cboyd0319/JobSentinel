import {
  EMAIL_PROVIDER_TEMPLATES,
  type EmailProvider,
} from "./SettingsEmailProviderTemplates";

const EMAIL_PROVIDERS: EmailProvider[] = [
  "gmail",
  "outlook",
  "yahoo",
  "custom",
];

function formatEmailProviderLabel(provider: EmailProvider): string {
  if (provider === "gmail") return "Gmail";
  if (provider === "outlook") return "Outlook";
  if (provider === "yahoo") return "Yahoo";
  return "Other";
}

interface SettingsEmailProviderSetupProps {
  emailProvider: EmailProvider;
  onProviderSelect: (provider: EmailProvider) => void;
}

export function SettingsEmailProviderSetup({
  emailProvider,
  onProviderSelect,
}: SettingsEmailProviderSetupProps) {
  return (
    <>
      <div className="flex items-center gap-2 -mt-1 mb-2">
        <span className="text-sm text-surface-600 dark:text-surface-400">
          Optional setup:
        </span>
        <div className="flex gap-1">
          {EMAIL_PROVIDERS.map((provider) => (
            <button
              key={provider}
              type="button"
              onClick={() => onProviderSelect(provider)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                emailProvider === provider
                  ? "bg-sentinel-500 text-white"
                  : "bg-surface-100 dark:bg-surface-700 text-surface-600 dark:text-surface-300 hover:bg-surface-200 dark:hover:bg-surface-600"
              }`}
            >
              {formatEmailProviderLabel(provider)}
            </button>
          ))}
        </div>
      </div>
      <p className="text-sm text-surface-500 dark:text-surface-400 -mt-1">
        {EMAIL_PROVIDER_TEMPLATES[emailProvider].hint}
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
    </>
  );
}
