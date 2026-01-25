import { memo } from "react";
import { Input } from "..";

interface SecureCredentialInputProps {
  label: string;
  helpText?: string;
  stored: boolean;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "password";
  testId?: string;
}

/**
 * Security trust indicator - shows platform-specific secure storage info
 */
const SecurityBadge = memo(function SecurityBadge({ stored }: { stored: boolean }) {
  const platform = navigator.platform.toLowerCase();
  const keychain = platform.includes("mac")
    ? "macOS Keychain"
    : platform.includes("win")
    ? "Windows Credential Manager"
    : "System Keyring";

  if (stored) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
        Stored in {keychain}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
          clipRule="evenodd"
        />
      </svg>
      Will store in {keychain}
    </span>
  );
});

/**
 * Reusable component for credential input fields with security badge.
 * Used for webhooks, API keys, passwords, tokens - any credential stored in OS keyring.
 */
export const SecureCredentialInput = memo(function SecureCredentialInput({
  label,
  helpText,
  stored,
  value,
  onChange,
  placeholder,
  type = "password",
  testId,
}: SecureCredentialInputProps) {
  const defaultPlaceholder = stored
    ? `Enter new ${label.toLowerCase()} to update`
    : `Paste your ${label.toLowerCase()}`;

  return (
    <div className="mt-3 space-y-2" data-testid={testId}>
      <div className="flex items-center gap-2">
        <span className="text-sm text-surface-600 dark:text-surface-400">
          {label}
        </span>
        <SecurityBadge stored={stored} />
      </div>
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? defaultPlaceholder}
        hint={helpText}
      />
    </div>
  );
});
