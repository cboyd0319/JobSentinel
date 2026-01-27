import { memo, useState } from "react";
import { SystemInfo, ConfigSummary, DebugEvent } from "../../services/feedbackService";

interface DebugInfoPreviewProps {
  systemInfo: SystemInfo | null;
  configSummary: ConfigSummary | null;
  debugEvents: DebugEvent[];
  included: boolean;
  onToggle: (included: boolean) => void;
}

export const DebugInfoPreview = memo(function DebugInfoPreview({
  systemInfo,
  configSummary,
  debugEvents,
  included,
  onToggle,
}: DebugInfoPreviewProps) {
  const [expanded, setExpanded] = useState(false);

  if (!systemInfo || !configSummary) {
    return (
      <div className="p-4 bg-surface-50 dark:bg-surface-900 rounded-lg border border-surface-200 dark:border-surface-700">
        <p className="text-sm text-surface-500 dark:text-surface-400">
          Loading debug information...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id="include-debug-info"
          checked={included}
          onChange={(e) => onToggle(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-surface-300 dark:border-surface-600 text-sentinel-500 focus:ring-sentinel-500 focus:ring-offset-0"
        />
        <div className="flex-1">
          <label
            htmlFor="include-debug-info"
            className="block text-sm font-medium text-surface-700 dark:text-surface-300 cursor-pointer"
          >
            Include debug information
          </label>
          <p className="text-xs text-surface-500 dark:text-surface-400 mt-1">
            Helps us diagnose issues faster. All data is anonymized - no personal info is included.
          </p>
        </div>
      </div>

      {included && (
        <div className="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden">
          {/* Header */}
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="w-full px-4 py-3 bg-surface-50 dark:bg-surface-800 flex items-center justify-between hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <ShieldIcon className="w-5 h-5 text-success" />
              <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                Anonymized Debug Information
              </span>
            </div>
            <ChevronIcon className={`w-5 h-5 text-surface-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>

          {/* Preview */}
          {expanded && (
            <div className="p-4 bg-white dark:bg-surface-900 border-t border-surface-200 dark:border-surface-700">
              <div className="space-y-4 text-xs font-mono">
                {/* System Info */}
                <Section title="System Information">
                  <InfoRow label="App Version" value={systemInfo.app_version} />
                  <InfoRow label="Platform" value={systemInfo.platform} />
                  <InfoRow label="OS Version" value={systemInfo.os_version} />
                  <InfoRow label="Architecture" value={systemInfo.arch} />
                </Section>

                {/* Config Summary */}
                <Section title="Configuration Summary">
                  <InfoRow label="Scrapers enabled" value={configSummary.scrapers_enabled} />
                  <InfoRow label="Search keywords" value={`${configSummary.keywords_count} configured`} />
                  <InfoRow label="Location prefs" value={configSummary.has_location_prefs ? "configured" : "not configured"} />
                  <InfoRow label="Salary prefs" value={configSummary.has_salary_prefs ? "configured" : "not configured"} />
                  <InfoRow label="Company blocklist" value={configSummary.has_company_blocklist ? "configured" : "not configured"} />
                  <InfoRow label="Company allowlist" value={configSummary.has_company_allowlist ? "configured" : "not configured"} />
                  <InfoRow label="Notifications" value={`${configSummary.notifications_configured} configured`} />
                  <InfoRow label="Resume" value={configSummary.has_resume ? "uploaded" : "not uploaded"} />
                </Section>

                {/* Recent Activity */}
                {debugEvents.length > 0 && (
                  <Section title="Recent Activity">
                    <div className="space-y-1">
                      {debugEvents.slice(0, 10).map((event, idx) => (
                        <div
                          key={idx}
                          className="text-surface-600 dark:text-surface-400"
                        >
                          <span className="text-surface-500 dark:text-surface-500">[{event.time}]</span>{" "}
                          {event.event}
                          {event.details && (
                            <span className="text-surface-500 dark:text-surface-500">
                              {" "}- {JSON.stringify(event.details)}
                            </span>
                          )}
                        </div>
                      ))}
                      {debugEvents.length > 10 && (
                        <div className="text-surface-500 dark:text-surface-500 italic">
                          ... and {debugEvents.length - 10} more events
                        </div>
                      )}
                    </div>
                  </Section>
                )}
              </div>

              <div className="mt-4 p-3 bg-success/10 dark:bg-success/20 rounded border border-success/20 dark:border-success/30">
                <div className="flex items-start gap-2">
                  <ShieldIcon className="w-4 h-4 text-success mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-success dark:text-success">
                    <strong>Privacy guaranteed:</strong> All user-identifiable data has been removed.
                    No job titles, company names, keywords, or personal information is included.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-surface-500 dark:text-surface-400 font-semibold mb-2">
        {title}
      </h4>
      <div className="space-y-1 pl-2">
        {children}
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex gap-2">
      <span className="text-surface-500 dark:text-surface-500">{label}:</span>
      <span className="text-surface-700 dark:text-surface-300">{value}</span>
    </div>
  );
}

function ShieldIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
      />
    </svg>
  );
}

function ChevronIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
}
