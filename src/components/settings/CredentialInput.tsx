import { useState, ReactNode } from "react";
import { Input, Button } from "..";

interface SecurityBadgeProps {
  stored: boolean;
}

function SecurityBadge({ stored }: SecurityBadgeProps) {
  const platform = navigator.platform.toLowerCase();
  const keychain = platform.includes("mac")
    ? "macOS Keychain"
    : platform.includes("win")
    ? "Windows Credential Manager"
    : "System Keyring";

  if (stored) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
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
}

interface CredentialInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  stored: boolean;
  placeholder?: string;
  storedPlaceholder?: string;
  hint?: string;
  error?: string;
  onTest?: () => Promise<void>;
  testButtonLabel?: string;
  testingLabel?: string;
  icon?: ReactNode;
  testId?: string;
}

export function CredentialInput({
  label,
  value,
  onChange,
  stored,
  placeholder = "Enter credential",
  storedPlaceholder = "Enter new value to update",
  hint,
  error,
  onTest,
  testButtonLabel = "Test",
  testingLabel = "Testing...",
  icon,
  testId,
}: CredentialInputProps) {
  const [testing, setTesting] = useState(false);

  const handleTest = async () => {
    if (!onTest) return;
    setTesting(true);
    try {
      await onTest();
    } finally {
      setTesting(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1 flex items-center gap-2">
        {icon}
        {label}
        <SecurityBadge stored={stored} />
      </label>
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            type="password"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={stored ? storedPlaceholder : placeholder}
            error={error}
            hint={hint}
            data-testid={testId}
          />
        </div>
        {onTest && (value || stored) && (
          <Button
            variant="secondary"
            disabled={testing}
            onClick={handleTest}
            className="whitespace-nowrap"
          >
            {testing ? testingLabel : testButtonLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
