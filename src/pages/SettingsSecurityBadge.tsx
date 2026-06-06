import type { CredentialStatusValue } from "./SettingsConfig";

export function SecurityBadge({ status }: { status?: CredentialStatusValue }) {
  if (status && !status.available) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
        <LockIcon />
        Saved details unavailable
      </span>
    );
  }

  if (status?.exists) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
        <LockIcon />
        Saved securely on this computer
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-xs text-surface-500 dark:text-surface-400">
      <LockIcon />
      Will be saved securely on this computer
    </span>
  );
}

function LockIcon() {
  return (
    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}
