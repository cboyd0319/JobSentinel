import { useEffect, useState } from "react";
import {
  clearExternalAiRequestLog,
  readExternalAiRequestLog,
} from "../services/externalAiRequestLog";
import type { ExternalAiRequestLog } from "../services/aiGatewayTypes";

function formatTimestamp(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return timestamp;
  return parsed.toLocaleString();
}

export function SettingsExternalAiRequestHistory() {
  const [entries, setEntries] = useState<ExternalAiRequestLog[]>([]);

  useEffect(() => {
    setEntries(readExternalAiRequestLog());
  }, []);

  const handleClear = () => {
    clearExternalAiRequestLog();
    setEntries([]);
  };

  return (
    <section
      className="rounded-lg border border-surface-200 bg-white p-3 dark:border-surface-700 dark:bg-surface-900"
      aria-labelledby="external-ai-history-heading"
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4
            id="external-ai-history-heading"
            className="text-sm font-medium text-surface-900 dark:text-surface-100"
          >
            Recent outside AI requests
          </h4>
          <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">
            History stores only provider, feature, labels, detail types, and
            time. It does not store the details you sent.
          </p>
        </div>
        <button
          type="button"
          onClick={handleClear}
          disabled={entries.length === 0}
          className="self-start rounded border border-surface-300 px-2 py-1 text-xs font-medium text-surface-700 disabled:opacity-50 dark:border-surface-600 dark:text-surface-200"
        >
          Clear history
        </button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-surface-500 dark:text-surface-400">
          No outside AI request history on this device.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-surface-100 dark:divide-surface-800">
          {entries.map((entry) => (
            <li
              key={`${entry.timestamp}-${entry.provider}-${entry.feature}`}
              className="py-2 text-sm text-surface-700 dark:text-surface-200"
            >
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <span className="font-medium text-surface-900 dark:text-surface-100">
                  {entry.feature}
                </span>
                <span className="text-xs text-surface-500 dark:text-surface-400">
                  {formatTimestamp(entry.timestamp)}
                </span>
              </div>
              <p className="mt-1 text-xs text-surface-600 dark:text-surface-300">
                {entry.provider} · {entry.labels.join(", ")} ·{" "}
                {entry.dataCategories.join(", ")}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
