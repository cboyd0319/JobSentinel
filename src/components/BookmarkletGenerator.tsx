import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Button } from "./Button";
import { Card } from "./Card";
import { Badge } from "./Badge";
import { HelpIcon } from "./HelpIcon";
import { recordBrowserAssistLearningSignalIfEnabled } from "../shared/browserAssistLearning";
import { RESTRICTED_JOB_SOURCE_WARNING } from "../shared/restrictedSourceTaxonomy";
import { logError } from "../utils/errorUtils";

interface BookmarkletConfig {
  port: number;
  enabled: boolean;
}

interface PendingBookmarkletImport {
  id: string;
  title: string;
  company: string;
  url: string;
  location: string | null;
  description_preview: string | null;
  remote: boolean;
  received_at: string;
}

interface BookmarkletImportConfirmResult {
  imported: number;
  skipped: number;
}

interface DiscardBookmarkletImportsResponse {
  discarded: number;
}

const DEFAULT_BOOKMARKLET_CONFIG: BookmarkletConfig = {
  port: 4321,
  enabled: false,
};

const MIN_BOOKMARKLET_PORT = 1024;
const MAX_BOOKMARKLET_PORT = 65535;

function isBookmarkletConfig(value: unknown): value is BookmarkletConfig {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as BookmarkletConfig).port === "number" &&
    typeof (value as BookmarkletConfig).enabled === "boolean"
  );
}

function isPendingBookmarkletImport(value: unknown): value is PendingBookmarkletImport {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const item = value as PendingBookmarkletImport;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.company === "string" &&
    typeof item.url === "string" &&
    (item.location === null || typeof item.location === "string") &&
    (item.description_preview === null || typeof item.description_preview === "string") &&
    typeof item.remote === "boolean" &&
    typeof item.received_at === "string"
  );
}

function isPendingBookmarkletImportList(value: unknown): value is PendingBookmarkletImport[] {
  return Array.isArray(value) && value.every(isPendingBookmarkletImport);
}

function pendingActionKey(action: "save" | "skip", ids: string[]) {
  return `${action}:${ids.join(",")}`;
}

export function BookmarkletGenerator() {
  const [config, setConfig] = useState<BookmarkletConfig>(DEFAULT_BOOKMARKLET_CONFIG);
  const [portInput, setPortInput] = useState(String(DEFAULT_BOOKMARKLET_CONFIG.port));
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [restrictedSiteAcknowledged, setRestrictedSiteAcknowledged] = useState(false);
  const [pendingImports, setPendingImports] = useState<PendingBookmarkletImport[]>([]);
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const parsedPort = Number(portInput);
  const portChanged = portInput !== String(config.port);
  const portInputError =
    portChanged &&
    (!Number.isInteger(parsedPort) ||
      parsedPort < MIN_BOOKMARKLET_PORT ||
      parsedPort > MAX_BOOKMARKLET_PORT)
      ? `Use a number from ${MIN_BOOKMARKLET_PORT} to ${MAX_BOOKMARKLET_PORT}.`
      : null;

  const loadPendingImports = useCallback(async () => {
    try {
      setPendingLoading(true);
      const result = await invoke<unknown>("get_pending_bookmarklet_imports");
      setPendingImports(isPendingBookmarkletImportList(result) ? result : []);
      setPendingError(null);
    } catch (err) {
      logError("Failed to load pending browser imports:", err);
      setPendingError("Could not load jobs waiting for review. Click Refresh Review List or reopen Settings.");
    } finally {
      setPendingLoading(false);
    }
  }, []);

  const loadConfig = useCallback(async () => {
    try {
      setLoading(true);
      const cfg = await invoke<BookmarkletConfig>("get_bookmarklet_config");
      const nextConfig = isBookmarkletConfig(cfg) ? cfg : DEFAULT_BOOKMARKLET_CONFIG;
      setConfig(nextConfig);
      setPortInput(String(nextConfig.port));
      setError(null);
    } catch (err) {
      logError("Failed to load bookmarklet config:", err);
      setError("Browser Import could not load. Close and reopen Settings. If this keeps happening, copy or save a safe support report from Settings.");
    } finally {
      setHasLoaded(true);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  useEffect(() => {
    if (!hasLoaded) {
      return;
    }

    void loadPendingImports();

    if (!config.enabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadPendingImports();
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [config.enabled, hasLoaded, loadPendingImports]);

  const toggleServer = async () => {
    try {
      setLoading(true);
      if (config.enabled) {
        await invoke("stop_bookmarklet_server");
        setConfig({ ...config, enabled: false });
      } else {
        if (!restrictedSiteAcknowledged) {
          setError("Review the restricted-site warning and check the box if you want to turn on Browser Import.");
          return;
        }
        await invoke("start_bookmarklet_server", { port: config.port });
        setConfig({ ...config, enabled: true });
      }
      setError(null);
    } catch (err) {
      logError("Failed to toggle bookmarklet server:", err);
      setError("Browser Import could not be changed. Try again. If this keeps happening, copy or save a safe support report from Settings.");
    } finally {
      setLoading(false);
    }
  };

  const updatePort = async () => {
    if (portInputError || !portChanged) {
      return;
    }

    try {
      setLoading(true);
      await invoke("set_bookmarklet_port", { port: parsedPort });
      setConfig({ ...config, port: parsedPort });
      setPortInput(String(parsedPort));
      setError(null);
    } catch (err) {
      logError("Failed to update bookmarklet port:", err);
      setError("That browser button number could not be saved. Leave it unchanged unless JobSentinel help instructions give you a different number.");
    } finally {
      setLoading(false);
    }
  };

  const copyBookmarklet = async () => {
    if (!restrictedSiteAcknowledged) {
      setError("Review the restricted-site warning and check the box before copying the Browser Button.");
      return;
    }

    try {
      await invoke("copy_bookmarklet_code");
      setCopied(true);
      setError(null);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logError("Could not copy browser import button:", err);
      setCopied(false);
      setError("Could not copy Browser Button. Allow clipboard access, then click Copy Browser Button again. If this keeps happening, copy or save a safe support report from Settings.");
    }
  };

  const savePendingImports = async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const actionKey = pendingActionKey("save", ids);
    try {
      setPendingAction(actionKey);
      setPendingError(null);
      const selectedImports = pendingImports.filter((item) => ids.includes(item.id));
      const result = await invoke<BookmarkletImportConfirmResult>(
        "confirm_pending_bookmarklet_imports",
        { ids },
      );
      if (result.imported + result.skipped > 0) {
        for (const item of selectedImports) {
          recordBrowserAssistLearningSignalIfEnabled({
            source: "browser-import",
            action: "import_saved",
            title: item.title,
            company: item.company,
            recordedAt: new Date().toISOString(),
          });
        }
      }
      setPendingImports((current) => current.filter((item) => !ids.includes(item.id)));
      const savedLabel = result.imported === 1 ? "browser import" : "browser imports";
      const skippedCopy = result.skipped > 0 ? ` ${result.skipped} already existed.` : "";
      setPendingMessage(`Saved ${result.imported} ${savedLabel}.${skippedCopy}`);
    } catch (err) {
      logError("Could not save pending browser imports:", err);
      setPendingError("Could not save this browser import. Try again, or copy a safe support report from Settings.");
    } finally {
      setPendingAction(null);
    }
  };

  const skipPendingImports = async (ids: string[]) => {
    if (ids.length === 0) {
      return;
    }

    const actionKey = pendingActionKey("skip", ids);
    try {
      setPendingAction(actionKey);
      setPendingError(null);
      const result = await invoke<DiscardBookmarkletImportsResponse>(
        "discard_pending_bookmarklet_imports",
        { ids },
      );
      setPendingImports((current) => current.filter((item) => !ids.includes(item.id)));
      const skippedLabel = result.discarded === 1 ? "browser import" : "browser imports";
      setPendingMessage(`Skipped ${result.discarded} ${skippedLabel}.`);
    } catch (err) {
      logError("Could not skip pending browser imports:", err);
      setPendingError("Could not skip this browser import. Try again, or copy a safe support report from Settings.");
    } finally {
      setPendingAction(null);
    }
  };

  if (loading && !hasLoaded) {
    return (
      <Card className="p-6" aria-busy="true">
        <div className="text-center text-gray-400">Loading Browser Import...</div>
      </Card>
    );
  }

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">Install Browser Button</h3>
          <p className="text-sm text-gray-400">
            Review jobs found from pages you choose, then save them locally
          </p>
        </div>
        <HelpIcon
          text="The browser import button finds job details on the page you are viewing and sends them to a local review list. You choose what to save. All processing stays on your computer."
          position="left"
        />
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Browser Import
            </label>
            <div className="flex items-center gap-3">
              <Badge variant={config.enabled ? "success" : "surface"}>
                {config.enabled ? "On" : "Off"}
              </Badge>
              <Button
                onClick={toggleServer}
                disabled={loading}
                variant={config.enabled ? "danger" : "primary"}
                size="sm"
              >
                {config.enabled ? "Turn Off" : "Turn On"}
              </Button>
            </div>
          </div>
        </div>

        {(pendingMessage || pendingError || pendingImports.length > 0) && (
          <div className="rounded-lg border border-sentinel-500/30 bg-sentinel-500/10 p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h4 className="text-sm font-semibold text-sentinel-100">
                  Jobs waiting for review
                </h4>
                <p className="mt-1 text-sm text-sentinel-50/90">
                  These jobs are not saved yet. Check the details, then save or skip them.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={loadPendingImports}
                  size="sm"
                  variant="secondary"
                  disabled={pendingLoading || pendingAction !== null}
                >
                  {pendingLoading ? "Refreshing..." : "Refresh Review List"}
                </Button>
                {pendingImports.length > 1 && (
                  <>
                    <Button
                      onClick={() => savePendingImports(pendingImports.map((item) => item.id))}
                      size="sm"
                      variant="primary"
                      disabled={pendingAction !== null}
                    >
                      Save All
                    </Button>
                    <Button
                      onClick={() => skipPendingImports(pendingImports.map((item) => item.id))}
                      size="sm"
                      variant="ghost"
                      disabled={pendingAction !== null}
                    >
                      Skip All
                    </Button>
                  </>
                )}
              </div>
            </div>

            {pendingMessage && (
              <p role="status" className="mb-3 text-sm text-green-200">
                {pendingMessage}
              </p>
            )}
            {pendingError && (
              <p role="alert" className="mb-3 text-sm text-red-200">
                {pendingError}
              </p>
            )}

            {pendingImports.length > 0 && (
              <div className="space-y-3">
                {pendingImports.map((item) => {
                  const saveKey = pendingActionKey("save", [item.id]);
                  const skipKey = pendingActionKey("skip", [item.id]);
                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border border-white/10 bg-gray-900/60 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white">{item.title}</p>
                          <p className="text-sm text-gray-300">
                            {item.company}
                            {item.location ? ` · ${item.location}` : ""}
                            {item.remote ? " · Remote" : ""}
                          </p>
                          {item.description_preview && (
                            <p className="mt-2 text-xs leading-5 text-gray-400">
                              {item.description_preview}
                            </p>
                          )}
                          <p className="mt-2 break-all text-xs text-gray-500">{item.url}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Button
                            onClick={() => savePendingImports([item.id])}
                            size="sm"
                            variant="primary"
                            disabled={pendingAction !== null}
                            aria-label={`Save ${item.title}`}
                          >
                            {pendingAction === saveKey ? "Saving..." : "Save Job"}
                          </Button>
                          <Button
                            onClick={() => skipPendingImports([item.id])}
                            size="sm"
                            variant="ghost"
                            disabled={pendingAction !== null}
                            aria-label={`Skip ${item.title}`}
                          >
                            {pendingAction === skipKey ? "Skipping..." : "Skip"}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <div>
          <button
            type="button"
            onClick={() => setShowAdvanced((current) => !current)}
            className="text-sm text-gray-400 hover:text-white underline"
            aria-expanded={showAdvanced}
          >
            Optional browser button setting
          </button>
          {showAdvanced && (
            <div className="mt-3 rounded-lg border border-gray-700 p-4">
              <label htmlFor="bookmarklet-port" className="block text-sm font-medium text-gray-300 mb-2">
                Button setup number
              </label>
              <div className="flex flex-wrap items-start gap-3">
                <input
                  id="bookmarklet-port"
                  type="number"
                  value={portInput}
                  onChange={(e) => setPortInput(e.target.value)}
                  disabled={config.enabled || loading}
                  aria-invalid={Boolean(portInputError)}
                  aria-describedby={portInputError ? "bookmarklet-port-error" : "bookmarklet-port-help"}
                  className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  min={MIN_BOOKMARKLET_PORT}
                  max={MAX_BOOKMARKLET_PORT}
                />
                <Button
                  onClick={updatePort}
                  size="sm"
                  variant="secondary"
                  disabled={config.enabled || loading || !portChanged || Boolean(portInputError)}
                >
                  Save Number
                </Button>
              </div>
              {portInputError && (
                <p id="bookmarklet-port-error" className="text-xs text-red-400 mt-1">
                  {portInputError}
                </p>
              )}
              <p id="bookmarklet-port-help" className="text-xs text-gray-500 mt-1">
                Leave this number unchanged unless JobSentinel help instructions
                tell you otherwise.
              </p>
            </div>
          )}
        </div>

        <div className="border-t border-gray-700 pt-4">
          <h4 className="text-sm font-medium text-gray-300 mb-3">Set Up Browser Button</h4>

          <div className="space-y-3">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-gray-400">Browser button</span>
                <Button
                  onClick={copyBookmarklet}
                  size="sm"
                  variant="ghost"
                  disabled={!config.enabled || !restrictedSiteAcknowledged}
                >
                  {copied ? "Copied!" : "Copy Browser Button"}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                For your safety, copy a fresh browser button after each import, after
                about one hour, or if JobSentinel was closed and reopened.
              </p>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-blue-400 mb-2">Choose How to Save Jobs:</h5>
              <p className="text-sm text-gray-300 mb-3">
                Recommended: use the browser button on a job page or supported
                jobs list. It adds the page or visible job cards you choose to a
                review list in JobSentinel. Paste a link only when the browser
                button cannot read the page.
              </p>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Turn on Browser Import above</li>
                <li>Copy the browser button using the button above</li>
                <li>Use your browser's Add Bookmark option</li>
                <li>Name it "Import to JobSentinel"</li>
                <li>Paste the copied text into the bookmark link field</li>
                <li>Save the bookmark to your bookmarks bar</li>
                <li>Copy the browser button again after each import, after about one hour, or if JobSentinel was closed and reopened</li>
              </ol>
            </div>

            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-green-400 mb-2">How to Use:</h5>
              <ol className="text-sm text-gray-300 space-y-2 list-decimal list-inside">
                <li>Open an individual job page or a supported jobs list.</li>
                <li>Use the saved "Import to JobSentinel" item in your bookmarks bar.</li>
                <li>JobSentinel adds the current posting or visible job cards it can read to your review list</li>
                <li>Return here, check the details, then save the job.</li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-4">
              <h5 className="text-sm font-medium text-yellow-400 mb-2">Where It Works Best:</h5>
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
                <div>
                  <p className="font-medium">Official sources:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>Company career pages</li>
                    <li>Company application pages</li>
                    <li>Public pages with full job details</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium">Best page shape:</p>
                  <ul className="list-disc list-inside text-xs space-y-1 mt-1">
                    <li>Career pages with job details on the page</li>
                    <li>Supported job lists with visible cards</li>
                    <li>Pages opened by you in your browser</li>
                  </ul>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Some large job boards do not let JobSentinel read saved pages. JobSentinel
                respects those controls. If a job appears with missing details, edit it after saving or use
                JobSentinel's search link for that site.
              </p>
            </div>

            <div className="bg-amber-500/15 border-2 border-amber-400/60 rounded-lg p-5">
              <h5 className="text-base font-semibold text-amber-200 mb-2">
                Restricted Site Warning
              </h5>
              <p className="text-sm leading-6 text-amber-50">
                {RESTRICTED_JOB_SOURCE_WARNING} Use Browser Import only on pages
                you choose, and verify the saved details before using them.
              </p>
              <label className="mt-4 flex items-start gap-3 text-sm font-medium text-amber-50">
                <input
                  type="checkbox"
                  className="mt-0.5 h-5 w-5 rounded border-amber-300 bg-gray-900 text-amber-400 focus:ring-amber-400"
                  checked={restrictedSiteAcknowledged}
                  onChange={(event) => setRestrictedSiteAcknowledged(event.target.checked)}
                />
                <span>I understand this risk and want to use Browser Import on pages I choose.</span>
              </label>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
